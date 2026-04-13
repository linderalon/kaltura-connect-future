"use client";

/**
 * KalturaAvatar — conversational iframe embed.
 *
 * Two key auto-detections:
 *
 * 1. PERSONA — scans every incoming postMessage for persona keywords and
 *    structured `visual.type = "persona_reveal"` payloads (output by the
 *    avatar when it follows the JSON response-format instruction in the KB).
 *    Calls `onPersonaDetected(persona, name)` as soon as a match is found.
 *
 * 2. SESSION END — catches leaveRoomBtn click via a wide set of leave-type
 *    event names and via the iframe re-navigating (second onLoad).
 *    Calls `onSessionEnd()`.
 *
 * All unrecognised messages are logged: open DevTools → console to see the
 * exact event names the platform sends so they can be added to the sets.
 */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Persona } from "@/lib/personaEngine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AvatarStatus = "connecting" | "ready" | "speaking" | "listening" | "idle" | "error";

export interface KalturaAvatarHandle {
  status: AvatarStatus;
  transcript: string;
}

interface KalturaAvatarProps {
  className?: string;
  /** Set to true while a visitor conversation is in progress.
   *  This arms the iframe-reload detection so leaveRoomBtn reliably triggers the card. */
  active?: boolean;
  /** Fires as soon as persona keywords or a structured visual payload appear
   *  in any postMessage from the iframe. */
  onPersonaDetected?: (persona: Persona, name: string) => void;
  /** Fires when the visitor clicks leaveRoomBtn (or the iframe re-navigates).
   *  Receives the full conversation transcript accumulated during the session. */
  onSessionEnd?: (transcript: string) => void;
}

// ---------------------------------------------------------------------------
// Persona detection — two methods, both feed the same state
//
//  A) Keyword name scan: look for "video visionary", "fast forward", etc.
//     Fires once when the avatar explicitly announces the persona.
//
//  B) Transcript scoring: scan EVERY message payload for answer keywords
//     (same logic as personaEngine.ts) and accumulate a running score.
//     Fires whenever the leading persona changes with enough confidence.
//     This works even if the platform never names the persona explicitly.
// ---------------------------------------------------------------------------

const PERSONA_NAME_PATTERNS: Array<[string, Persona]> = [
  ["video visionary",    "VIDEO_VISIONARY"],
  ["signal in the noise","SIGNAL_IN_THE_NOISE"],
  ["fast forward",       "THE_FAST_FORWARD"],
  ["human amplifier",    "HUMAN_AMPLIFIER"],
  ["one-person studio",  "ONE_PERSON_STUDIO"],
  ["one person studio",  "ONE_PERSON_STUDIO"],
  ["knowledge builder",  "KNOWLEDGE_BUILDER"],
];

function extractPersonaName(raw: unknown): Persona | null {
  const text = JSON.stringify(raw).toLowerCase();
  for (const [pattern, persona] of PERSONA_NAME_PATTERNS) {
    if (text.includes(pattern)) return persona;
  }
  return null;
}

function extractName(raw: unknown): string {
  try {
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
    const data = obj?.visual?.data ?? obj?.data;
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    if (parsed?.visitorName) return String(parsed.visitorName);
    if (obj?.visitorName)    return String(obj.visitorName);
    if (obj?.name)           return String(obj.name);
  } catch { /* not parseable */ }
  return "";
}

function extractText(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && raw !== null) {
    const r = raw as Record<string, unknown>;
    for (const k of ["content", "text", "message", "body", "transcript", "speech", "data"]) {
      if (typeof r[k] === "string" && (r[k] as string).length > 4) return r[k] as string;
    }
  }
  return JSON.stringify(raw);
}

/** Tiebreaker priority (mirrors personaEngine STABLE_ORDER + AMBITION_AFFINITY). */
const PERSONA_PRIORITY: Persona[] = [
  "VIDEO_VISIONARY", "SIGNAL_IN_THE_NOISE", "THE_FAST_FORWARD",
  "HUMAN_AMPLIFIER", "ONE_PERSON_STUDIO",  "KNOWLEDGE_BUILDER",
];

/** Minimum accumulated score before we trust the result. */
const SCORE_THRESHOLD = 4;

type PersonaScoreMap = Record<Persona, number>;

function emptyScores(): PersonaScoreMap {
  return {
    VIDEO_VISIONARY:    0,
    SIGNAL_IN_THE_NOISE: 0,
    THE_FAST_FORWARD:   0,
    HUMAN_AMPLIFIER:    0,
    ONE_PERSON_STUDIO:  0,
    KNOWLEDGE_BUILDER:  0,
  };
}

function addPts(scores: PersonaScoreMap, key: Persona, pts: number) {
  scores[key] = (scores[key] ?? 0) + pts;
}

function scoreText(text: string, scores: PersonaScoreMap) {
  const t = text.toLowerCase();

  // ── Personality-style signals ────────────────────────────────────────────
  if (/\b(data|analytics|metrics|roi|analyst|evidence|numbers)\b/.test(t)) {
    addPts(scores, "SIGNAL_IN_THE_NOISE", 2); addPts(scores, "ONE_PERSON_STUDIO", 2);
  }
  if (/\b(story|storytell|narrative|emotional|human|people|empathy)\b/.test(t)) {
    addPts(scores, "VIDEO_VISIONARY", 2); addPts(scores, "HUMAN_AMPLIFIER", 2);
  }
  if (/\b(implement|apologize|maverick|just do|forgiveness)\b/.test(t)) {
    addPts(scores, "THE_FAST_FORWARD", 3);
  }

  // ── Risk tolerance ───────────────────────────────────────────────────────
  if (/move fast|break things|fast and break/.test(t)) {
    addPts(scores, "THE_FAST_FORWARD", 3); addPts(scores, "VIDEO_VISIONARY", 1);
  }
  if (/thoughtfully?|build things that last|last\b/.test(t)) {
    addPts(scores, "KNOWLEDGE_BUILDER", 3); addPts(scores, "SIGNAL_IN_THE_NOISE", 2);
  }

  // ── Ambition level ───────────────────────────────────────────────────────
  if (/\b(five|5|transform|revolutionize|completely)\b/.test(t)) {
    addPts(scores, "VIDEO_VISIONARY", 2); addPts(scores, "THE_FAST_FORWARD", 1);
  }
  if (/\b(one|1|survive|just get through|just want)\b/.test(t)) {
    addPts(scores, "SIGNAL_IN_THE_NOISE", 2);
  }
  if (/\b(two|three|2|3|honest)\b/.test(t)) {
    addPts(scores, "HUMAN_AMPLIFIER", 1); addPts(scores, "KNOWLEDGE_BUILDER", 1);
  }

  // ── Challenge keywords ───────────────────────────────────────────────────
  if (/\b(training|onboarding|learning|courses|skills|upskill)\b/.test(t)) {
    addPts(scores, "KNOWLEDGE_BUILDER", 3); addPts(scores, "HUMAN_AMPLIFIER", 1);
  }
  if (/\b(scale|content|production|create|studio|produce)\b/.test(t)) {
    addPts(scores, "ONE_PERSON_STUDIO", 3); addPts(scores, "VIDEO_VISIONARY", 1);
  }
  if (/\b(measure|data|analytics|roi|metrics|reporting|kpi)\b/.test(t)) {
    addPts(scores, "SIGNAL_IN_THE_NOISE", 2);
  }
  if (/\b(engagement|team|culture|community|buy.in)\b/.test(t)) {
    addPts(scores, "HUMAN_AMPLIFIER", 2);
  }
  if (/\b(video|visual|film|camera|production|studio)\b/.test(t)) {
    addPts(scores, "VIDEO_VISIONARY", 1); addPts(scores, "ONE_PERSON_STUDIO", 1);
  }
}

function leadingPersona(scores: PersonaScoreMap): Persona | null {
  const max = Math.max(...Object.values(scores));
  if (max < SCORE_THRESHOLD) return null;
  const tied = PERSONA_PRIORITY.filter((p) => scores[p] === max);
  return tied[0] ?? null;
}

// ---------------------------------------------------------------------------
// Event type sets
// ---------------------------------------------------------------------------

const READY_TYPES  = new Set(["ready", "connected", "loaded", "joined", "started"]);
const SPEAK_TYPES  = new Set(["speaking", "response", "agent_speaking", "ai_speaking"]);
const LISTEN_TYPES = new Set(["listening", "listening_start", "input", "user_speaking"]);
// "stopped"/"done" removed — fire during normal speech turns
const IDLE_TYPES   = new Set(["idle", "waiting", "agent_idle"]);
// Wide net — include every known variant of leaveRoomBtn + Kaltura session-end events
const LEAVE_TYPES  = new Set([
  // button-id variants
  "leaveroombtn", "leave_room_btn", "leavebtn",
  // generic leave
  "leave", "leave_room", "leaveroom", "room_left", "userleave",
  // hangup
  "hangup", "hang_up",
  // disconnect
  "disconnect", "disconnected",
  // session / call end
  "session_ended", "session_end", "sessionend", "sessionended",
  "call_ended", "call_end", "callended", "callend",
  "meeting_ended", "meetingended",
  // participant signals
  "local_left", "peer_left", "user_left", "participant_left",
  // Kaltura-specific
  "roomclosed", "room_closed", "end_session",
]);

// ---------------------------------------------------------------------------
// Status dot
// ---------------------------------------------------------------------------

const DOT: Record<AvatarStatus, { color: string; label: string; pulse: boolean }> = {
  connecting: { color: "#FFB020", label: "Connecting",  pulse: true  },
  ready:      { color: "#22C55E", label: "Ready",       pulse: false },
  speaking:   { color: "#60A5FA", label: "Speaking",    pulse: true  },
  listening:  { color: "#A78BFA", label: "Listening",   pulse: true  },
  idle:       { color: "#4ADE80", label: "Standby",     pulse: false },
  error:      { color: "#5BC686", label: "Offline",     pulse: false },
};

function StatusDot({ status }: { status: AvatarStatus }) {
  const d = DOT[status];
  return (
    <div
      className="absolute bottom-3 right-3 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
    >
      <motion.div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: d.color }}
        animate={d.pulse ? { opacity: [1, 0.25, 1], scale: [1, 1.4, 1] } : { opacity: 1 }}
        transition={d.pulse ? { duration: 1.1, repeat: Infinity } : {}}
      />
      <span className="text-xs font-mono uppercase tracking-normal" style={{ color: "rgba(255,255,255,0.6)" }}>
        {d.label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading overlay
// ---------------------------------------------------------------------------

function LoadingOverlay({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 rounded-2xl"
          style={{ backgroundColor: "#090F1E" }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.span
            className="select-none"
            style={{ fontSize: "clamp(5rem, 10vw, 8rem)" }}
            animate={{ scale: [1, 1.07, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            🎭
          </motion.span>
          <p className="text-2xl font-mono uppercase tracking-[0.3em]" style={{ color: "rgba(255,255,255,0.3)" }}>
            The oracle is awakening
          </p>
          <div className="flex gap-3">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: "#5BC686" }}
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.22 }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AVATAR_URL =
  process.env.NEXT_PUBLIC_KALTURA_AVATAR_URL ??
  "https://meet.avatar.us.kaltura.ai/695cd19880ea19bd1b816a08/talk-to-agent?aiclid=EttXcIcr&flow_id=agent-90";

const LOAD_SAFETY_MS = 3_000;

export const KalturaAvatar = forwardRef<KalturaAvatarHandle, KalturaAvatarProps>(
  function KalturaAvatar({ className = "", active = false, onPersonaDetected, onSessionEnd }, ref) {
    const [status, setStatus]   = useState<AvatarStatus>("connecting");
    const [loading, setLoading] = useState(true);

    // Stable refs
    const onPersonaRef          = useRef(onPersonaDetected);
    const onSessionRef          = useRef(onSessionEnd);
    const loadCountRef          = useRef(0);
    const personaFiredRef       = useRef(false);
    const iframeRef             = useRef<HTMLIFrameElement>(null);
    const isReloadingRef        = useRef(false);
    /** Set to true the first time status enters "speaking" or "listening".
     *  Used to distinguish startup reloads (before any conversation) from
     *  post-goodbye navigation (after the conversation ended). */
    const conversationStarted   = useRef(false);
    // Transcript-based scoring — accumulates across the whole conversation
    const txScoresRef           = useRef<PersonaScoreMap>(emptyScores());
    const lastInferredRef       = useRef<Persona | null>(null);
    // Full conversation transcript for AI prediction
    const transcriptRef         = useRef<string[]>([]);
    // Guard: prevent both postMessage path AND handleLoad path from both firing
    const sessionEndFiredRef    = useRef(false);

    onPersonaRef.current = onPersonaDetected;
    onSessionRef.current = onSessionEnd;

    /** Reload the iframe in the background so it's warm for the next visitor. */
    function scheduleBackgroundReload(delayMs = 1500) {
      setTimeout(() => {
        if (!iframeRef.current) return;
        isReloadingRef.current      = true;
        loadCountRef.current        = 0;
        personaFiredRef.current     = false;
        conversationStarted.current = false;
        txScoresRef.current         = emptyScores();
        lastInferredRef.current     = null;
        transcriptRef.current       = [];
        sessionEndFiredRef.current  = false;
        setLoading(true);
        setStatus("connecting");
        iframeRef.current.src = AVATAR_URL;
      }, delayMs);
    }

    function normalise(raw: unknown): string {
      if (typeof raw === "string") return raw.toLowerCase().replace(/^avatar:/, "");
      if (typeof raw === "object" && raw !== null) {
        const r = raw as Record<string, unknown>;
        // Top-level type fields
        const top = r.type ?? r.action ?? r.event ?? r.name ?? r.status ?? "";
        if (top) return String(top).toLowerCase().replace(/^avatar:/, "");
        // Nested inside data/payload/message
        for (const key of ["data", "payload", "message", "detail"]) {
          const nested = r[key];
          if (typeof nested === "object" && nested !== null) {
            const n = nested as Record<string, unknown>;
            const t = n.type ?? n.action ?? n.event ?? n.name ?? "";
            if (t) return String(t).toLowerCase().replace(/^avatar:/, "");
          }
          if (typeof nested === "string" && nested.length > 0) {
            return nested.toLowerCase().replace(/^avatar:/, "");
          }
        }
      }
      return "";
    }

    useEffect(() => {
      function onMessage(evt: MessageEvent) {
        const type = normalise(evt.data);

        // ── Status updates ──────────────────────────────────────────────────
        if (READY_TYPES.has(type))  { setStatus("ready");     setLoading(false); }
        else if (SPEAK_TYPES.has(type))  { setStatus("speaking");  setLoading(false); conversationStarted.current = true; }
        else if (LISTEN_TYPES.has(type)) { setStatus("listening"); setLoading(false); conversationStarted.current = true; }
        else if (IDLE_TYPES.has(type))   { setStatus("idle");      setLoading(false); }
        else if (type === "error" || type === "failed") { setStatus("error"); }

        // ── Session end (leaveRoomBtn) — type-matched ───────────────────────
        else if (LEAVE_TYPES.has(type)) {
          if (!sessionEndFiredRef.current) {
            sessionEndFiredRef.current = true;
            const transcript = transcriptRef.current.join("\n");
            setStatus("idle");
            onSessionRef.current?.(transcript);
            scheduleBackgroundReload();
          }
          return;
        }

        // ── Session end — keyword scan fallback (catches any naming variant) ─
        if (!sessionEndFiredRef.current && conversationStarted.current) {
          const raw = JSON.stringify(evt.data).toLowerCase();
          const leaveHints = [
            "leaveroombtn", "leave_room", "leaveroom",
            "call_end", "callend", "call_ended", "callended",
            "session_end", "sessionend", "session_ended", "sessionended",
            "room_left", "roomleft", "room_closed", "roomclosed",
            "hangup", "hang_up", "disconnected", "meeting_ended",
            "user_left", "userleft", "participant_left",
          ];
          if (leaveHints.some(h => raw.includes(h))) {
            sessionEndFiredRef.current = true;
            const transcript = transcriptRef.current.join("\n");
            setStatus("idle");
            onSessionRef.current?.(transcript);
            scheduleBackgroundReload();
            return;
          }
        }

        // ── Persona detection (runs for every message) ─────────────────────

        // A. Structured visual payload — highest confidence
        {
          const raw = evt.data;
          let structuredPersona: Persona | null = null;
          let structuredName = "";
          try {
            const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
            const visual = obj?.visual ?? obj;
            if (visual?.type === "persona_reveal" || visual?.type === "prediction") {
              const data = typeof visual.data === "string"
                ? JSON.parse(visual.data) : visual.data;
              if (data?.persona) {
                structuredPersona = data.persona as Persona;
                structuredName    = data.visitorName ?? data.name ?? "";
              }
            }
          } catch { /* not JSON */ }

          if (structuredPersona) {
            console.log("[KalturaAvatar] Persona from visual payload →", structuredPersona);
            personaFiredRef.current = true;
            lastInferredRef.current = structuredPersona;
            onPersonaRef.current?.(structuredPersona, structuredName);
          }
        }

        // B. Explicit persona name mentioned — high confidence
        if (!personaFiredRef.current) {
          const named = extractPersonaName(evt.data);
          if (named) {
            const nameHint = extractName(evt.data);
            console.log("[KalturaAvatar] Persona from name mention →", named);
            personaFiredRef.current = true;
            lastInferredRef.current = named;
            onPersonaRef.current?.(named, nameHint);
          }
        }

        // C. Transcript keyword scoring — fires whenever the leading persona
        //    changes, even before the avatar explicitly names it
        {
          const text = extractText(evt.data);
          if (text.length > 6) {
            // Accumulate for full transcript-based prediction
            if (text.length > 20 && !READY_TYPES.has(type) && !IDLE_TYPES.has(type)) {
              transcriptRef.current.push(text);
            }
            scoreText(text, txScoresRef.current);
            const winner = leadingPersona(txScoresRef.current);
            if (winner && winner !== lastInferredRef.current) {
              lastInferredRef.current = winner;
              console.log("[KalturaAvatar] Persona from transcript scoring →", winner, txScoresRef.current);
              onPersonaRef.current?.(winner, "");
            }
          }
        }

        // Log unrecognised type for debugging
        if (type && !READY_TYPES.has(type) && !SPEAK_TYPES.has(type) &&
            !LISTEN_TYPES.has(type) && !IDLE_TYPES.has(type) && !LEAVE_TYPES.has(type)) {
          console.log("[KalturaAvatar] unrecognised →", type, evt.data);
        }
      }

      window.addEventListener("message", onMessage);
      return () => window.removeEventListener("message", onMessage);
    }, []);

    // Safety-net: dismiss loading if onLoad never fires
    useEffect(() => {
      const t = setTimeout(() => setLoading(false), LOAD_SAFETY_MS);
      return () => clearTimeout(t);
    }, []);

    // Reset persona-fired flag when the component mounts (new session)
    useEffect(() => {
      personaFiredRef.current = false;
    }, []);

    // When the booth goes active, arm the iframe-reload detection
    useEffect(() => {
      if (active) {
        conversationStarted.current = true;
        sessionEndFiredRef.current  = false;
        console.log("[KalturaAvatar] Conversation armed — iframe reload will trigger session end");
      }
    }, [active]);

    useImperativeHandle(ref, () => ({
      status,
      get transcript() { return transcriptRef.current.join("\n"); },
    }), [status]);

    function handleLoad() {
      loadCountRef.current += 1;

      // Our own background reload — ignore
      if (isReloadingRef.current) {
        isReloadingRef.current = false;
        setLoading(false);
        setStatus("idle");
        return;
      }

      if (loadCountRef.current === 1) {
        // Initial startup load
        setLoading(false);
        setStatus((prev) => (prev === "connecting" ? "idle" : prev));
        return;
      }

      // Reload #2+ while conversation was active = leaveRoomBtn navigated away
      if (conversationStarted.current && !sessionEndFiredRef.current) {
        sessionEndFiredRef.current  = true;
        conversationStarted.current = false;
        const transcript = transcriptRef.current.join("\n");
        console.log("[KalturaAvatar] iframe navigation → session end, transcript lines:", transcriptRef.current.length);
        setStatus("idle");
        onSessionRef.current?.(transcript);
        scheduleBackgroundReload();
      } else {
        setLoading(false);
        setStatus((prev) => (prev === "connecting" ? "idle" : prev));
      }
    }

    return (
      <div
        className={`relative overflow-hidden ${className}`}
        style={{ backgroundColor: "#090F1E", width: "100%", height: "100%" }}
      >
        <iframe
          ref={iframeRef}
          src={AVATAR_URL}
          className="absolute inset-0 w-full h-full border-0"
          allow="camera; microphone; autoplay; fullscreen; display-capture; clipboard-write"
          allowFullScreen
          title="Kaltura Future Teller"
          style={{ zIndex: 1 }}
          onLoad={handleLoad}
        />

        <LoadingOverlay visible={loading} />

        <motion.div
          className="absolute inset-0 pointer-events-none rounded-2xl"
          style={{
            border: `2px solid rgba(91,198,134,${status === "speaking" || status === "listening" ? 0.85 : 0.35})`,
            zIndex: 30,
          }}
          animate={{
            opacity: status === "speaking" || status === "listening" ? [0.6, 1, 0.6] : [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: status === "speaking" || status === "listening" ? 1.2 : 2.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <StatusDot status={status} />
      </div>
    );
  }
);

KalturaAvatar.displayName = "KalturaAvatar";
