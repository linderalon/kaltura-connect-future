"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { getPersonaDetails } from "@/lib/personaEngine";
import type { Persona } from "@/lib/personaEngine";
import type { SessionAnswers } from "@/context/FutureTellerContext";

interface PredictionViewProps {
  persona: Persona | null;
  visitorName: string;
  answers: SessionAnswers;
  /** Called with (cardSummary, linkedInCaption) when streaming is done and
   *  the visitor taps "Collect Your Prediction Card". */
  onComplete: (cardSummary: string, linkedInCaption: string) => void;
}

export function PredictionView({
  persona,
  visitorName,
  answers,
  onComplete,
}: PredictionViewProps) {
  const [predictionText, setPredictionText] = useState("");
  const [cardSummary, setCardSummary] = useState("");
  const [linkedInCaption, setLinkedInCaption] = useState("");
  const [streamingDone, setStreamingDone] = useState(false);
  const [personaRevealed, setPersonaRevealed] = useState(false);
  const abortRef = useRef(false);
  const textRef = useRef<HTMLDivElement>(null);

  const details = persona ? getPersonaDetails(persona) : null;

  // Reveal persona card after a short delay
  useEffect(() => {
    const t = setTimeout(() => setPersonaRevealed(true), 600);
    return () => clearTimeout(t);
  }, []);

  // Start the API stream
  useEffect(() => {
    if (!persona) return;
    abortRef.current = false;

    async function stream() {
      try {
        const res = await fetch("/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers, persona, visitorName }),
        });

        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!abortRef.current) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Split on SSE event boundaries; keep incomplete final chunk
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            if (!part.startsWith("data: ")) continue;
            try {
              const evt = JSON.parse(part.slice(6)) as {
                type: string;
                text?: string;
                prediction?: string;
                cardSummary?: string;
                linkedInCaption?: string;
              };

              if (evt.type === "delta" && evt.text) {
                setPredictionText((prev) => prev + evt.text);
                // Keep the prediction box scrolled to the bottom
                requestAnimationFrame(() => {
                  if (textRef.current) {
                    textRef.current.scrollTop = textRef.current.scrollHeight;
                  }
                });
              }

              if (evt.type === "complete") {
                if (evt.prediction) setPredictionText(evt.prediction);
                if (evt.cardSummary) setCardSummary(evt.cardSummary);
                if (evt.linkedInCaption) setLinkedInCaption(evt.linkedInCaption);
                setStreamingDone(true);
              }
            } catch {
              // Malformed SSE line — skip
            }
          }
        }
      } catch {
        // API failed — use base persona prediction as fallback
        if (details && !abortRef.current) {
          const fallbackText = details.fullPrediction.replace(
            /\[NAME\]/g,
            visitorName
          );
          setPredictionText(fallbackText);
          setCardSummary(details.shortSummary);
          setLinkedInCaption(
            `Just had my future read at Kaltura Connect 2026 and I'm apparently ${details.name}. The oracle was not wrong.\n\n#KalturaConnect #FutureTeller #VideoStrategy #DigitalTransformation`
          );
          setStreamingDone(true);
        }
      }
    }

    stream();
    return () => {
      abortRef.current = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona]);

  // Words streamed so far (for progress indicator)
  const wordCount = predictionText.trim()
    ? predictionText.trim().split(/\s+/).length
    : 0;
  const estimatedTotal = 180;
  const progress = Math.min(wordCount / estimatedTotal, 1);

  return (
    <div
      className="flex booth-no-select"
      style={{ height: "calc(100vh - 73px)" }}
    >
      {/* ── Left 50%: Avatar spacer — page-level KalturaAvatar fills this ── */}
      <div className="shrink-0" style={{ width: "50%" }} aria-hidden />

      {/* ── Right 50%: Persona reveal + streaming text ── */}
      <div
        className="flex flex-col justify-center px-10 py-6 gap-5"
        style={{ width: "50%" }}
      >
        {/* Persona identity */}
        <AnimatePresence>
          {personaRevealed && details && (
            <motion.div
              className="flex items-center gap-5"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <motion.span
                className="text-7xl leading-none select-none"
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                {details.emoji}
              </motion.span>
              <div>
                <motion.p
                  className="text-2xl tracking-tight font-semibold mb-1"
                  style={{ color: "rgba(255,215,0,0.75)" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  You are
                </motion.p>
                <motion.h2
                  className="text-4xl font-bold text-white leading-tight"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                >
                  {details.name}
                </motion.h2>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Visitor name */}
        <AnimatePresence>
          {personaRevealed && (
            <motion.h1
              className="font-bold leading-none"
              style={{
                fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
                color: "#FFFFFF",
              }}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.5 }}
            >
              {visitorName}
            </motion.h1>
          )}
        </AnimatePresence>

        {/* Streaming prediction text */}
        <motion.div
          ref={textRef}
          className="rounded-2xl px-7 py-5 overflow-y-auto"
          style={{
            backgroundColor: "rgba(22,33,62,0.7)",
            border: "1px solid rgba(255,255,255,0.08)",
            maxHeight: "42vh",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <p
            className="text-white/90 leading-relaxed"
            style={{ fontSize: "clamp(1rem, 1.8vw, 1.5rem)" }}
          >
            {predictionText}
            {/* Blinking cursor while streaming */}
            {!streamingDone && (
              <motion.span
                className="inline-block w-[3px] h-[1.2em] ml-1 align-middle rounded-sm"
                style={{ backgroundColor: "#5BC686" }}
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.65, repeat: Infinity }}
              />
            )}
          </p>
        </motion.div>

        {/* Progress bar */}
        {!streamingDone && (
          <div className="flex items-center gap-4">
            <div
              className="flex-1 rounded-full overflow-hidden"
              style={{
                height: "4px",
                backgroundColor: "rgba(255,255,255,0.1)",
              }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: "#5BC686" }}
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p
              className="text-xl shrink-0 tracking-tight"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              Revealing...
            </p>
          </div>
        )}

        {/* Collect button — visible once streaming is done */}
        <AnimatePresence>
          {streamingDone && (
            <motion.button
              onClick={() => onComplete(cardSummary, linkedInCaption)}
              className="self-start px-12 py-5 rounded-xl text-white text-2xl font-bold tracking-tight mt-2"
              style={{ backgroundColor: "#5BC686" }}
              initial={{ opacity: 0, y: 15 }}
              animate={{
                opacity: 1,
                y: 0,
                boxShadow: [
                  "0 0 20px rgba(91,198,134,0.3)",
                  "0 0 40px rgba(91,198,134,0.7)",
                  "0 0 20px rgba(91,198,134,0.3)",
                ],
              }}
              transition={{
                opacity: { duration: 0.5 },
                y: { duration: 0.5 },
                boxShadow: { duration: 2, repeat: Infinity },
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
            >
              Collect Your Prediction Card →
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
