"use client";

/**
 * Kaltura Future Teller — Booth Display
 *
 * Full-screen magical experience. Covers the global header via `fixed inset-0`.
 * The avatar iframe is persistent (never remounts); only its opacity changes.
 *
 * Flow:  IDLE → ACTIVE → SELECTING → CARD → (auto-reset) → IDLE
 *
 *  IDLE       — Magical attract screen with floating orb
 *  ACTIVE     — Avatar full-screen, handles the entire voice conversation
 *  SELECTING  — Operator picks which persona the oracle revealed + visitor name
 *  CARD       — Dramatic tarot card reveal with full prediction
 */

import { useMemo, useRef, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ParticleField } from "@/components/booth/ParticleField";
import { KalturaAvatar } from "@/components/KalturaAvatar";
import type { KalturaAvatarHandle } from "@/components/KalturaAvatar";
import { getPersonaDetails } from "@/lib/personaEngine";
import type { Persona } from "@/lib/personaEngine";

type Stage = "idle" | "active" | "card";

const ALL_PERSONAS: Persona[] = [
  "VIDEO_VISIONARY",
  "SIGNAL_IN_THE_NOISE",
  "THE_FAST_FORWARD",
  "HUMAN_AMPLIFIER",
  "ONE_PERSON_STUDIO",
  "KNOWLEDGE_BUILDER",
];

// Kaltura brand accent per persona — mirrors their people-tile color system
const PERSONA_COLORS: Record<Persona, string> = {
  VIDEO_VISIONARY:    "#1C6FD8",  // Kaltura blue  — visual storytelling
  SIGNAL_IN_THE_NOISE:"#0FBBCC",  // Kaltura teal  — data clarity
  THE_FAST_FORWARD:  "#5BC686",  // Kaltura green — speed & action
  HUMAN_AMPLIFIER:   "#F05A4E",  // coral         — warmth & people
  ONE_PERSON_STUDIO: "#22A86E",  // green         — content production
  KNOWLEDGE_BUILDER: "#6E50D8",  // indigo        — infrastructure & depth
};

// Persona card images — local, with Centra typography already baked in
const PERSONA_IMAGES: Record<Persona, string> = {
  VIDEO_VISIONARY:     "/images/personas/video-visionary.png",
  SIGNAL_IN_THE_NOISE: "/images/personas/signal-noise.png",
  THE_FAST_FORWARD:    "/images/personas/fast-forward.png",
  HUMAN_AMPLIFIER:     "/images/personas/human-amplifier.png",
  ONE_PERSON_STUDIO:   "/images/personas/one-person-studio.png",
  KNOWLEDGE_BUILDER:   "/images/personas/knowledge-builder.png",
};

// ─────────────────────────────────────────────────────────────────────────────
// BACKGROUND — star field + nebula gradients
// ─────────────────────────────────────────────────────────────────────────────

// Kaltura brand color palette (from style guide)
const KALTURA_COLORS = {
  blue:       "#006EFA",
  green:      "#5BC686",
  pink:       "#FF9DFF",
  yellow:     "#FFD357",
  red:        "#FF3D23",
  teal:       "#00D2D8",
  lightBlue:  "#B6D7FF",
  lightGreen: "#CEEEDB",
  lightPink:  "#FFE2FF",
};

// Star color distribution — Kaltura brand palette
const STAR_COLORS = [
  "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", // 5/10 white
  KALTURA_COLORS.lightBlue,                              // 1/10 light blue
  KALTURA_COLORS.teal,                                   // 1/10 teal
  KALTURA_COLORS.green,                                  // 1/10 green
  KALTURA_COLORS.lightPink,                              // 1/10 light pink
  KALTURA_COLORS.lightGreen,                             // 1/10 light green
];

function StarField() {
  const stars = useMemo(
    () =>
      Array.from({ length: 180 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() < 0.12 ? Math.random() * 2.5 + 1.5 : Math.random() * 1.2 + 0.3,
        opacity: Math.random() * 0.65 + 0.1,
        duration: Math.random() * 6 + 3,
        delay:    -(Math.random() * 9),
        color:    STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {stars.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, backgroundColor: s.color }}
          animate={{ opacity: [s.opacity, s.opacity * 0.1, s.opacity] }}
          transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function MagicBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Kaltura dark midnight base */}
      <div className="absolute inset-0" style={{ backgroundColor: "#07101F" }} />

      {/* ── BRIGHT TEAL/CYAN ORB — top-right (mirrors the brand gradient screenshot) ── */}
      <motion.div
        className="absolute"
        style={{
          top: "-5%", right: "-5%", width: "55%", height: "60%",
          background: "radial-gradient(ellipse, rgba(0,210,215,0.80) 0%, rgba(0,160,200,0.40) 35%, transparent 65%)",
        }}
        animate={{ opacity: [0.75, 1, 0.75], scale: [1, 1.06, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Bright white highlight next to teal */}
      <motion.div
        className="absolute"
        style={{
          top: "-2%", right: "2%", width: "22%", height: "28%",
          background: "radial-gradient(ellipse, rgba(200,255,255,0.28) 0%, transparent 60%)",
        }}
        animate={{ opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      {/* ── BLUE HAZE — center-left ── */}
      <motion.div
        className="absolute"
        style={{
          top: "25%", left: "-5%", width: "65%", height: "65%",
          background: "radial-gradient(ellipse, rgba(0,90,210,0.50) 0%, rgba(0,60,160,0.20) 50%, transparent 75%)",
        }}
        animate={{ opacity: [0.55, 0.85, 0.55] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />

      {/* Kaltura green accent — bottom */}
      <motion.div
        className="absolute"
        style={{
          bottom: "-10%", left: "20%", width: "40%", height: "45%",
          background: "radial-gradient(ellipse, rgba(91,198,134,0.12) 0%, transparent 65%)",
        }}
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 6 }}
      />

      {/* Deep indigo base layer */}
      <motion.div
        className="absolute"
        style={{
          top: "40%", left: "30%", width: "50%", height: "50%",
          background: "radial-gradient(ellipse, rgba(40,0,120,0.25) 0%, transparent 70%)",
        }}
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 9 }}
      />

      <StarField />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SPARKLE — 4-pointed star decoration
// ─────────────────────────────────────────────────────────────────────────────

function Sparkle({
  size = 80,
  color = "#5BC686",
  opacity = 1,
  delay = 0,
  rotate = 0,
}: {
  size?: number;
  color?: string;
  opacity?: number;
  delay?: number;
  rotate?: number;
}) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{
        fill: color,
        transform: `rotate(${rotate}deg)`,
        filter: `drop-shadow(0 0 ${Math.round(size * 0.18)}px ${color})`,
        opacity,
      }}
      animate={{
        scale: [1, 1.14, 1],
        opacity: [opacity * 0.6, opacity, opacity * 0.6],
      }}
      transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay }}
    >
      {/* smooth 4-pointed star via quadratic bezier */}
      <path d="M50,2 Q57,43 98,50 Q57,57 50,98 Q43,57 2,50 Q43,43 50,2 Z" />
    </motion.svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// IDLE — attract screen
// ─────────────────────────────────────────────────────────────────────────────

function IdleView({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center booth-no-select"
      style={{ zIndex: 20 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Orb — static, textured */}
      <div className="mb-10 select-none">
        <motion.div
          className="w-80 h-80 rounded-full flex items-center justify-center"
          style={{
            position: "relative",
            overflow: "hidden",
            // Multi-layer background: specular highlight + depth shadow + base glow
            background: [
              "radial-gradient(circle at 36% 28%, rgba(160,255,240,0.18) 0%, transparent 42%)",
              "radial-gradient(circle at 68% 72%, rgba(0,20,90,0.55) 0%, transparent 48%)",
              "radial-gradient(circle, rgba(0,210,215,0.55) 0%, rgba(0,90,200,0.35) 45%, rgba(7,16,31,0.92) 75%, transparent 100%)",
            ].join(", "),
          }}
          animate={{
            boxShadow: [
              "0 0 60px 12px rgba(0,210,215,0.45), 0 0 140px 30px rgba(0,110,250,0.18)",
              "0 0 100px 22px rgba(0,210,215,0.70), 0 0 220px 50px rgba(0,110,250,0.28)",
              "0 0 60px 12px rgba(0,210,215,0.45), 0 0 140px 30px rgba(0,110,250,0.18)",
            ],
          }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Film-grain noise */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            opacity: 0.09,
            mixBlendMode: "overlay",
            pointerEvents: "none",
          }} />

          {/* Inner rim — depth + curvature */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            boxShadow: "inset 0 0 40px 8px rgba(0,0,60,0.55), inset 3px 4px 18px rgba(160,255,240,0.12)",
            pointerEvents: "none",
          }} />

          {/* Slow-pulse caustic shimmer */}
          <motion.div style={{
            position: "absolute", width: "55%", height: "38%",
            top: "14%", left: "18%", borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(200,255,245,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
            animate={{ opacity: [0.4, 0.9, 0.4], scale: [1, 1.08, 1] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Green swirl 1 — clockwise, wavy-displaced */}
          <motion.div style={{ position: "absolute", inset: 0, pointerEvents: "none", filter: "url(#wavy-orb)" }}
            animate={{ rotate: [0, 360] }} transition={{ duration: 7, repeat: Infinity, ease: "linear" }}>
            <div style={{ width: "100%", height: "100%",
              background: "conic-gradient(from 0deg, transparent 0%, rgba(91,198,134,0.0) 8%, rgba(91,198,134,0.45) 20%, rgba(180,255,210,0.55) 30%, transparent 46%, transparent 100%)" }} />
          </motion.div>
          {/* Green swirl 2 — counter-clockwise, wavy-displaced */}
          <motion.div style={{ position: "absolute", inset: 0, pointerEvents: "none", filter: "url(#wavy-orb)" }}
            animate={{ rotate: [220, -140] }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}>
            <div style={{ width: "100%", height: "100%",
              background: "conic-gradient(from 0deg, transparent 0%, transparent 50%, rgba(60,190,110,0.35) 65%, rgba(140,245,175,0.45) 76%, transparent 90%, transparent 100%)" }} />
          </motion.div>
          {/* Green swirl 3 — slow accent, wavy-displaced */}
          <motion.div style={{ position: "absolute", inset: 0, pointerEvents: "none", filter: "url(#wavy-orb)" }}
            animate={{ rotate: [90, 450] }} transition={{ duration: 14, repeat: Infinity, ease: "linear" }}>
            <div style={{ width: "100%", height: "100%",
              background: "conic-gradient(from 0deg, transparent 0%, transparent 78%, rgba(200,255,220,0.3) 86%, transparent 94%, transparent 100%)" }} />
          </motion.div>
          {/* Pink swirl 1 — clockwise, shiny rose */}
          <motion.div style={{ position: "absolute", inset: 0, pointerEvents: "none", filter: "url(#wavy-orb)" }}
            animate={{ rotate: [45, 405] }} transition={{ duration: 9, repeat: Infinity, ease: "linear" }}>
            <div style={{ width: "100%", height: "100%",
              background: "conic-gradient(from 0deg, transparent 0%, transparent 30%, rgba(255,100,180,0.0) 38%, rgba(255,120,200,0.38) 48%, rgba(255,180,230,0.45) 55%, transparent 66%, transparent 100%)" }} />
          </motion.div>
          {/* Pink swirl 2 — counter, magenta accent */}
          <motion.div style={{ position: "absolute", inset: 0, pointerEvents: "none", filter: "url(#wavy-orb)" }}
            animate={{ rotate: [270, -90] }} transition={{ duration: 13, repeat: Infinity, ease: "linear" }}>
            <div style={{ width: "100%", height: "100%",
              background: "conic-gradient(from 0deg, transparent 0%, transparent 62%, rgba(220,60,180,0.0) 68%, rgba(230,80,200,0.3) 76%, rgba(255,140,220,0.35) 82%, transparent 92%, transparent 100%)" }} />
          </motion.div>
        </motion.div>
      </div>

      {/* Title */}
      <motion.h1
        className="font-bold tracking-tight text-center leading-none mb-6"
        style={{ fontSize: "clamp(4rem, 8vw, 7.5rem)", fontFamily: "var(--font-centra)", fontWeight: 700 }}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.7 }}
      >
        <span className="text-white">Your </span>
        <motion.span
          className="green-gradient-text"
          animate={{
            filter: [
              "drop-shadow(0 0 18px rgba(91,198,134,0.55))",
              "drop-shadow(0 0 55px rgba(91,198,134,0.95)) drop-shadow(0 0 90px rgba(46,191,120,0.45))",
              "drop-shadow(0 0 18px rgba(91,198,134,0.55))",
            ],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          2026
        </motion.span>
        <span className="text-white"> Awaits</span>
      </motion.h1>

      <motion.p
        className="text-4xl text-center max-w-3xl mb-14 leading-snug"
        style={{ color: "rgba(255,255,255,0.55)", fontFamily: "var(--font-centra)", fontWeight: 400 }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        Step forward. The oracle is ready.
      </motion.p>

      {/* CTA */}
      <motion.button
        onClick={onStart}
        className="green-grain px-20 py-7 text-3xl font-bold tracking-tight rounded-2xl text-white"
        style={{ color: "#fff" }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{
          opacity: 1,
          scale: 1,
          boxShadow: [
            "0 0 30px rgba(91,198,134,0.4), 0 8px 24px rgba(0,0,0,0.6)",
            "0 0 70px rgba(91,198,134,0.9), 0 8px 40px rgba(0,0,0,0.6)",
            "0 0 30px rgba(91,198,134,0.4), 0 8px 24px rgba(0,0,0,0.6)",
          ],
        }}
        transition={{
          opacity: { delay: 0.7, duration: 0.6 },
          scale: { delay: 0.7, duration: 0.6 },
          boxShadow: { duration: 2.4, repeat: Infinity, delay: 0.7 },
        }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
      >
        Reveal My Future
      </motion.button>

      {/* Decorative sparkles */}
      <div className="absolute inset-0 pointer-events-none">
        {/* top-left — medium */}
        <div className="absolute" style={{ top: "20%", left: "8%" }}>
          <Sparkle size={72} delay={0} rotate={12} />
        </div>
        {/* bottom-left — large */}
        <div className="absolute" style={{ bottom: "14%", left: "5%" }}>
          <Sparkle size={114} delay={0.9} rotate={-8} />
        </div>
        {/* bottom-right — large */}
        <div className="absolute" style={{ bottom: "12%", right: "6%" }}>
          <Sparkle size={104} delay={1.5} rotate={10} />
        </div>
        {/* mid-right — small */}
        <div className="absolute" style={{ top: "36%", right: "11%" }}>
          <Sparkle size={44} opacity={0.6} delay={0.5} rotate={-18} />
        </div>
        {/* top-center-right — tiny */}
        <div className="absolute" style={{ top: "9%", left: "58%" }}>
          <Sparkle size={28} opacity={0.45} delay={1.2} rotate={25} />
        </div>
      </div>

      {/* Branding */}
      <motion.div
        className="absolute bottom-8 flex items-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/kaltura-logo.png"
          alt="Kaltura"
          style={{ height: "70px", width: "auto" }}
        />
        <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
        <span className="text-lg tracking-tight" style={{ color: "rgba(255,255,255,0.3)" }}>
          Future Teller · Connect 2026
        </span>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVE — avatar conversation overlay
// ─────────────────────────────────────────────────────────────────────────────

function ActiveView({
  visitorName,
  onNameChange,
}: {
  visitorName: string;
  onNameChange: (n: string) => void;
}) {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-end pb-8 booth-no-select pointer-events-none"
      style={{ zIndex: 20 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Top branding */}
      <motion.div
        className="absolute top-5 left-7 flex items-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/kaltura-logo.png"
          alt="Kaltura"
          style={{ height: "55px", width: "auto" }}
        />
        <span style={{ color: "rgba(255,255,255,0.18)" }}>|</span>
        <span className="text-sm tracking-tight" style={{ color: "rgba(255,255,255,0.3)" }}>
          Future Teller · Connect 2026
        </span>
      </motion.div>

      {/* "Listening" pulse */}
      <motion.div
        className="absolute bottom-20 left-1/2 flex items-center gap-3"
        style={{ transform: "translateX(-50%)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
      >
        <motion.div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: "#A78BFA" }}
          animate={{ scale: [1, 1.6, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
        <span className="text-xl tracking-tight" style={{ color: "rgba(255,255,255,0.35)" }}>
          The oracle is listening
        </span>
      </motion.div>

      {/* Decorative sparkles around the iframe */}
      <div className="absolute inset-0 pointer-events-none">
        {/* top-left of iframe */}
        <motion.div
          className="absolute"
          style={{ top: "4%", left: "14%" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          <Sparkle size={92} color="#C084FC" delay={0} rotate={10} />
        </motion.div>
        {/* bottom-right of iframe */}
        <motion.div
          className="absolute"
          style={{ bottom: "22%", right: "8%" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.8 }}
        >
          <Sparkle size={58} color="#A78BFA" opacity={0.75} delay={0.9} rotate={-15} />
        </motion.div>
        {/* top-right — tiny accent */}
        <motion.div
          className="absolute"
          style={{ top: "8%", right: "17%" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.8 }}
        >
          <Sparkle size={32} color="#E0AAFF" opacity={0.5} delay={1.4} rotate={20} />
        </motion.div>
      </div>

      {/* Operator name input — bottom left, fill in while conversation plays */}
      <motion.div
        className="pointer-events-auto absolute bottom-6 left-8 flex items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3 }}
      >
        <label className="text-xs tracking-tight" style={{ color: "rgba(255,255,255,0.25)" }}>
          Name:
        </label>
        <input
          value={visitorName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="visitor's name…"
          className="rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/20 outline-none"
          style={{
            backgroundColor: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            caretColor: "#0FBBCC",
            width: "160px",
          }}
        />
      </motion.div>

    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SELECTING — operator picks the revealed persona + visitor name
// ─────────────────────────────────────────────────────────────────────────────

function SelectingView({
  onSelect,
}: {
  onSelect: (persona: Persona, name: string) => void;
}) {
  const [name, setName] = useState("");
  const [hovered, setHovered] = useState<Persona | null>(null);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center gap-8 px-12 booth-no-select"
      style={{ zIndex: 20 }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.45 }}
    >
      {/* Heading */}
      <div className="text-center">
        <p className="text-2xl tracking-tight mb-2" style={{ color: "rgba(255,215,0,0.7)" }}>
          The oracle has spoken
        </p>
        <h2 className="text-5xl font-bold text-white">
          Which destiny was revealed?
        </h2>
      </div>

      {/* Name input */}
      <div className="flex items-center gap-4">
        <label className="text-xl tracking-tight" style={{ color: "rgba(255,255,255,0.4)" }}>
          Visitor:
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="First name..."
          className="rounded-xl px-5 py-3 text-2xl text-white placeholder-white/25 outline-none"
          style={{
            backgroundColor: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.15)",
            caretColor: "#0FBBCC",
            minWidth: "260px",
          }}
          autoFocus
        />
      </div>

      {/* 6 persona tiles */}
      <div className="grid grid-cols-3 gap-5 w-full max-w-4xl">
        {ALL_PERSONAS.map((p) => {
          const d = getPersonaDetails(p);
          return (
            <motion.button
              key={p}
              onClick={() => onSelect(p, name)}
              onHoverStart={() => setHovered(p)}
              onHoverEnd={() => setHovered(null)}
              className="flex flex-col items-center gap-3 py-6 px-4 rounded-2xl"
              style={{
                backgroundColor:
                  hovered === p
                    ? "rgba(255,215,0,0.1)"
                    : "rgba(255,255,255,0.05)",
                border:
                  hovered === p
                    ? "1px solid rgba(255,215,0,0.45)"
                    : "1px solid rgba(255,255,255,0.08)",
              }}
              animate={hovered === p ? { scale: 1.04 } : { scale: 1 }}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.15 }}
            >
              <span style={{ fontSize: "3rem" }}>{d.emoji}</span>
              <span className="text-lg font-bold text-white text-center leading-tight">
                {d.name}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAROT CARD — the beautiful final reveal
// ─────────────────────────────────────────────────────────────────────────────

const COUNTDOWN = 45;

/** L-shaped corner bracket — pure CSS, takes a brand color */
function Corner({ pos, color = "rgba(255,255,255,0.4)" }: { pos: "tl" | "tr" | "bl" | "br"; color?: string }) {
  const isTop  = pos === "tl" || pos === "tr";
  const isLeft = pos === "tl" || pos === "bl";
  const c = color + "90"; // slight transparency
  return (
    <div
      style={{
        position: "absolute",
        top:    isTop  ? "12px"  : undefined,
        bottom: !isTop ? "12px" : undefined,
        left:   isLeft ? "12px"  : undefined,
        right:  !isLeft ? "12px" : undefined,
        width: "22px",
        height: "22px",
        borderTop:    isTop  ? `1.5px solid ${c}` : undefined,
        borderBottom: !isTop ? `1.5px solid ${c}` : undefined,
        borderLeft:   isLeft  ? `1.5px solid ${c}` : undefined,
        borderRight:  !isLeft ? `1.5px solid ${c}` : undefined,
        pointerEvents: "none",
      }}
    />
  );
}

function TarotCardView({
  persona,
  visitorName,
  transcript,
  onReset,
}: {
  persona: Persona;
  visitorName: string;
  transcript: string;
  onReset: () => void;
}) {
  // null until Gemini returns — prevents any default persona showing
  const [cardPersona,     setCardPersona]     = useState<Persona | null>(null);
  const [countdown,       setCountdown]       = useState(COUNTDOWN);
  const [burst,           setBurst]           = useState(false);
  const [predictionText,  setPredictionText]  = useState("");
  const [predictionReady, setPredictionReady] = useState(false);
  const [downloading,     setDownloading]     = useState(false);
  const cardRef  = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);

  // Safe derivations — image only shown when persona is known
  const details  = getPersonaDetails(cardPersona ?? "VIDEO_VISIONARY");
  const imgSrc   = cardPersona ? PERSONA_IMAGES[cardPersona] : null;
  const name     = visitorName.trim();

  // ── Stream prediction; reveal card only on complete ──────────────────────
  useEffect(() => {
    abortRef.current = false;
    async function stream() {
      try {
        const res = await fetch("/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ persona, visitorName: name || "Guest", answers: {}, transcript }),
        });
        if (!res.body) throw new Error("No body");
        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!abortRef.current) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          for (const part of parts) {
            const line = part.startsWith("data: ") ? part.slice(6) : part;
            if (!line.trim()) continue;
            try {
              const evt = JSON.parse(line);
              if (evt.type === "complete") {
                if (evt.prediction) setPredictionText(evt.prediction);
                if (evt.persona)    setCardPersona(evt.persona as Persona);
                setPredictionReady(true); // ← triggers card reveal
              }
            } catch { /* skip */ }
          }
        }
      } catch {
        const fallback = getPersonaDetails(persona);
        setCardPersona(persona);
        setPredictionText(fallback.fullPrediction.replace(/\[NAME\]/g, name || "Guest"));
        setPredictionReady(true);
      }
    }
    stream();
    return () => { abortRef.current = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Burst particles after card appears
  useEffect(() => {
    if (!predictionReady) return;
    const t = setTimeout(() => setBurst(true), 500);
    return () => clearTimeout(t);
  }, [predictionReady]);

  // Countdown starts only after card is revealed
  useEffect(() => {
    if (!predictionReady) return;
    const interval = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) { clearInterval(interval); onReset(); return 0; }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predictionReady]);

  // ── Download ─────────────────────────────────────────────────────────────
  async function downloadCard() {
    if (!cardRef.current || downloading) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null, scale: 2, useCORS: true, allowTaint: true,
      });
      const link = document.createElement("a");
      link.download = `kaltura-${(name || "future").toLowerCase().replace(/\s+/g, "-")}-2026.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setDownloading(false);
    }
  }

  const pct = ((COUNTDOWN - countdown) / COUNTDOWN) * 100;

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center booth-no-select"
      style={{ zIndex: 20 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(7,16,31,0.82)", backdropFilter: "blur(12px)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      />

      {burst && (
        <div className="absolute inset-0 pointer-events-none">
          <ParticleField count={100} burst />
        </div>
      )}

      <AnimatePresence mode="wait">

        {/* ── LOADING: crystal ball swirl ─────────────────────────────────── */}
        {!predictionReady && (
          <motion.div
            key="loading"
            className="flex flex-col items-center"
            style={{ gap: "2rem", position: "relative", zIndex: 1 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4 }}
          >
            <div style={{ position: "relative", width: "160px", height: "160px" }}>
              {/* ── CSS crystal sphere ── */}
              <div style={{
                position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden",
                background: [
                  "radial-gradient(circle at 37% 30%, rgba(160,255,210,0.22) 0%, transparent 38%)",
                  "radial-gradient(circle at 66% 68%, rgba(0,40,30,0.6) 0%, transparent 46%)",
                  "radial-gradient(circle, rgba(20,140,75,0.35) 0%, rgba(0,70,45,0.5) 40%, rgba(0,15,30,0.92) 75%, transparent 100%)",
                ].join(", "),
              }}>
                {/* Green swirl 1 — clockwise, wavy */}
                <motion.div style={{ position: "absolute", inset: 0, filter: "url(#wavy-orb)" }}
                  animate={{ rotate: [0, 360] }} transition={{ duration: 5, repeat: Infinity, ease: "linear" }}>
                  <div style={{ width: "100%", height: "100%",
                    background: "conic-gradient(from 0deg, transparent 0%, rgba(91,198,134,0.0) 6%, rgba(91,198,134,0.5) 18%, rgba(180,255,210,0.6) 28%, transparent 44%, transparent 100%)" }} />
                </motion.div>
                {/* Green swirl 2 — counter-clockwise, wavy */}
                <motion.div style={{ position: "absolute", inset: 0, filter: "url(#wavy-orb)" }}
                  animate={{ rotate: [200, -160] }} transition={{ duration: 7.5, repeat: Infinity, ease: "linear" }}>
                  <div style={{ width: "100%", height: "100%",
                    background: "conic-gradient(from 0deg, transparent 0%, transparent 52%, rgba(50,185,105,0.4) 66%, rgba(130,240,165,0.5) 76%, transparent 90%, transparent 100%)" }} />
                </motion.div>
                {/* Pink swirl 1 — shiny rose */}
                <motion.div style={{ position: "absolute", inset: 0, filter: "url(#wavy-orb)" }}
                  animate={{ rotate: [45, 405] }} transition={{ duration: 6.5, repeat: Infinity, ease: "linear" }}>
                  <div style={{ width: "100%", height: "100%",
                    background: "conic-gradient(from 0deg, transparent 0%, transparent 30%, rgba(255,100,180,0.0) 38%, rgba(255,120,200,0.42) 48%, rgba(255,180,230,0.5) 55%, transparent 66%, transparent 100%)" }} />
                </motion.div>
                {/* Pink swirl 2 — magenta counter */}
                <motion.div style={{ position: "absolute", inset: 0, filter: "url(#wavy-orb)" }}
                  animate={{ rotate: [270, -90] }} transition={{ duration: 9.5, repeat: Infinity, ease: "linear" }}>
                  <div style={{ width: "100%", height: "100%",
                    background: "conic-gradient(from 0deg, transparent 0%, transparent 62%, rgba(220,60,180,0.0) 68%, rgba(230,80,200,0.32) 76%, rgba(255,140,220,0.38) 82%, transparent 92%, transparent 100%)" }} />
                </motion.div>
                {/* Inner depth shadow */}
                <div style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  boxShadow: "inset 0 0 28px 6px rgba(0,0,20,0.7), inset -2px -3px 14px rgba(0,25,15,0.5)",
                }} />
              </div>
              {/* Green spin rings */}
              <motion.div style={{
                position: "absolute", inset: -10, borderRadius: "50%",
                border: "2.5px solid transparent",
                borderTopColor: "rgba(91,198,134,0.95)",
                borderRightColor: "rgba(45,160,90,0.45)",
              }} animate={{ rotate: 360 }} transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }} />
              <motion.div style={{
                position: "absolute", inset: -22, borderRadius: "50%",
                border: "1.5px solid transparent",
                borderBottomColor: "rgba(60,180,100,0.75)",
                borderLeftColor: "rgba(30,130,70,0.3)",
              }} animate={{ rotate: -360 }} transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }} />
              <motion.div style={{
                position: "absolute", inset: -36, borderRadius: "50%",
                border: "1px solid transparent",
                borderTopColor: "rgba(150,240,180,0.45)",
                borderRightColor: "rgba(100,210,140,0.18)",
              }} animate={{ rotate: 360 }} transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }} />
            </div>
            <motion.p
              style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.4rem", fontFamily: "var(--font-centra)", margin: 0 }}
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{ duration: 2.2, repeat: Infinity }}
            >
              The oracle is reading your future…
            </motion.p>
          </motion.div>
        )}

        {/* ── CARD: landscape layout ──────────────────────────────────────── */}
        {predictionReady && (
          <motion.div
            key="card"
            className="flex flex-col items-center"
            style={{ gap: "20px", position: "relative", zIndex: 1 }}
            initial={{ opacity: 0, scale: 0.9, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* ── THE CARD ── */}
            <div
              ref={cardRef}
              style={{
                width: "1200px", height: "700px",
                borderRadius: "28px",
                display: "flex",
                overflow: "hidden",
                border: "1.5px solid rgba(160,0,220,0.55)",
                boxShadow: [
                  "0 0 0 3px rgba(140,0,200,0.15)",
                  "0 0 40px rgba(160,0,220,0.5)",
                  "0 0 90px rgba(130,0,200,0.3)",
                  "0 60px 120px rgba(0,0,0,0.95)",
                ].join(", "),
                position: "relative",
              }}
            >
              <Corner pos="tl" color="rgba(180,0,240,0.9)" />
              <Corner pos="tr" color="rgba(180,0,240,0.9)" />
              <Corner pos="bl" color="rgba(180,0,240,0.9)" />
              <Corner pos="br" color="rgba(180,0,240,0.9)" />

              {/* LEFT — persona image (blank until AI returns persona) */}
              <div style={{ width: "488px", position: "relative", overflow: "hidden", flexShrink: 0,
                background: "linear-gradient(160deg, #09080F 0%, #0E0A1C 55%, #1C0830 100%)" }}>
                {imgSrc && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgSrc}
                      alt={details.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", display: "block", position: "absolute", inset: 0 }}
                      loading="eager"
                    />
                    {/* Gradient blends image into the right panel */}
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, transparent 55%, rgba(43,4,64,0.85) 100%)" }} />
                    {/* Top/bottom darkening */}
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 30%, transparent 65%, rgba(0,0,0,0.5) 100%)" }} />
                  </>
                )}
                {/* Top accent bar */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, transparent 5%, rgba(180,0,240,0.9) 30%, rgba(200,80,255,1) 50%, rgba(180,0,240,0.9) 70%, transparent 95%)" }} />
                {/* Bottom sparkle ornament */}
                <div style={{ position: "absolute", bottom: "18px", right: "18px" }}>
                  <Sparkle size={26} color="#fff" opacity={0.45} delay={0} rotate={5} />
                </div>
              </div>

              {/* RIGHT — gradient text panel */}
              <div style={{
                flex: 1,
                background: "linear-gradient(145deg, #2B0440 0%, #650D6C 45%, #B81E6E 100%)",
                padding: "40px 50px",
                display: "flex", flexDirection: "column", gap: "18px",
                justifyContent: "center",
                position: "relative", overflow: "hidden",
              }}>
                {/* Sparkle decorations */}
                <div style={{ position: "absolute", top: "18px", right: "22px" }}>
                  <Sparkle size={36} color="#fff" opacity={0.5} delay={0.3} rotate={12} />
                </div>
                <div style={{ position: "absolute", bottom: "60px", right: "28px" }}>
                  <Sparkle size={22} color="#fff" opacity={0.35} delay={0.9} rotate={-10} />
                </div>
                <div style={{ position: "absolute", bottom: "100px", left: "18px" }}>
                  <Sparkle size={16} color="#fff" opacity={0.25} delay={1.4} rotate={22} />
                </div>

                {/* Visitor name */}
                {name && (
                  <p style={{
                    fontSize: "2.8rem", fontFamily: "var(--font-centra)", fontWeight: 700,
                    color: "#fff", margin: 0, lineHeight: 1.05, letterSpacing: "-0.01em", flexShrink: 0,
                    textAlign: "center",
                  }}>
                    {name}
                  </p>
                )}

                {/* Prediction text */}
                <p style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.92)", margin: 0, lineHeight: 1.7, textAlign: "center" }}>
                  {predictionText}
                </p>

                {/* Footer */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/kaltura-logo.png" alt="Kaltura" style={{ height: "33px", width: "auto", opacity: 0.7 }} />
                  <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.88rem", letterSpacing: "0.05em" }}>Connect 2026</span>
                </div>

                {/* Bottom accent */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, transparent 5%, rgba(180,0,240,0.9) 30%, rgba(200,80,255,1) 50%, rgba(180,0,240,0.9) 70%, transparent 95%)" }} />
              </div>
            </div>

            {/* ── Actions + countdown ── */}
            <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
              {/* Download button */}
              <motion.button
                onClick={downloadCard}
                disabled={downloading}
                className="flex items-center gap-2 px-7 py-3 rounded-xl font-bold text-white"
                style={{
                  background: downloading ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg, #7EE8A2 0%, #3DBB78 50%, #279A60 100%)",
                  border: "none", cursor: downloading ? "not-allowed" : "pointer",
                  fontSize: "1rem", letterSpacing: "-0.01em", opacity: downloading ? 0.6 : 1,
                }}
                whileHover={downloading ? {} : { scale: 1.05 }}
                whileTap={downloading ? {} : { scale: 0.96 }}
              >
                {downloading ? "Saving…" : "⬇ Download Card"}
              </motion.button>

              {/* Countdown bar */}
              <div style={{ display: "flex", flexDirection: "column", gap: "5px", width: "240px" }}>
                <div style={{ width: "100%", height: "3px", borderRadius: "2px", backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <motion.div style={{ height: "100%", borderRadius: "2px", backgroundColor: "rgba(91,198,134,0.5)" }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
                </div>
                <p style={{ fontSize: "0.85rem", letterSpacing: "0.04em", color: "rgba(255,255,255,0.2)", margin: 0, textAlign: "center" }}>
                  Next visitor in {countdown}s
                </p>
              </div>
            </div>

          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE ROOT
// ─────────────────────────────────────────────────────────────────────────────

export default function BoothPage() {
  const [stage, setStage]           = useState<Stage>("idle");
  const [persona, setPersona]       = useState<Persona | null>(null);
  const [visitorName, setVisitorName] = useState("");
  const [transcript, setTranscript] = useState("");
  const avatarRef = useRef<KalturaAvatarHandle>(null);

  const avatarActive = stage === "active";

  // Called by KalturaAvatar as soon as it detects a persona keyword or
  // structured visual payload in any postMessage from the iframe.
  function handlePersonaDetected(p: Persona, nameHint: string) {
    setPersona(p);
    // Only overwrite the name if the operator hasn't typed one yet
    if (nameHint && !visitorName.trim()) setVisitorName(nameHint);
  }

  // Called when leaveRoomBtn fires — collect transcript and show the card.
  function handleSessionEnd(tx: string) {
    setTranscript(tx);
    setStage("card");
  }

  function handleReset() {
    setStage("idle");
    setPersona(null);
    setVisitorName("");
    setTranscript("");
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden booth-no-select"
      style={{ zIndex: 50, backgroundColor: "#07101F" }}
    >
      {/* SVG filter — wavy displacement used by crystal ball swirls */}
      <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
        <defs>
          <filter id="wavy-orb" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence type="turbulence" baseFrequency="0.013 0.019" numOctaves="2" seed="4" result="noise"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" xChannelSelector="R" yChannelSelector="G" scale="24"/>
          </filter>
        </defs>
      </svg>

      <MagicBackground />

      {/* ── PERSISTENT AVATAR IFRAME ── visible during active + card (reloads in bg) */}
      <div
        className="absolute"
        style={{
          left:   "20vw",
          width:  "60vw",
          height: "33.75vw",
          top:    "calc(50vh - 16.875vw)",
          opacity: (stage === "active" || stage === "card") ? 1 : 0,
          pointerEvents: stage === "active" ? "auto" : "none",
          transition: "opacity 0.6s ease",
          zIndex: 10,
        }}
      >
        {avatarActive && (
          <motion.div
            className="absolute rounded-2xl pointer-events-none"
            style={{
              inset: "-6px",
              border: "1px solid rgba(160,0,200,0.25)",
              boxShadow: "0 0 40px rgba(160,0,200,0.2), 0 0 80px rgba(130,0,180,0.1)",
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        )}
        <KalturaAvatar
          ref={avatarRef}
          active={avatarActive}
          className="rounded-2xl overflow-hidden"
          onPersonaDetected={handlePersonaDetected}
          onSessionEnd={handleSessionEnd}
        />
      </div>

      {/* ── STAGE UI ── */}
      <AnimatePresence mode="wait">
        {stage === "idle" && (
          <IdleView key="idle" onStart={() => setStage("active")} />
        )}

        {stage === "active" && (
          <ActiveView
            key="active"
            visitorName={visitorName}
            onNameChange={setVisitorName}
          />
        )}

        {stage === "card" && (
          <TarotCardView
            key="card"
            persona={persona ?? "VIDEO_VISIONARY"}
            visitorName={visitorName}
            transcript={transcript}
            onReset={handleReset}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
