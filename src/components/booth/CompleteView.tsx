"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { getPersonaDetails } from "@/lib/personaEngine";
import type { Persona } from "@/lib/personaEngine";
import { ParticleField } from "./ParticleField";

const AUTO_RESET_SECONDS = 45;

interface CompleteViewProps {
  persona: Persona | null;
  visitorName: string;
  cardSummary: string;
  linkedInCaption: string;
  onReset: () => void;
}

export function CompleteView({
  persona,
  visitorName,
  cardSummary,
  onReset,
}: CompleteViewProps) {
  const [countdown, setCountdown] = useState(AUTO_RESET_SECONDS);
  const details = persona ? getPersonaDetails(persona) : null;

  // Countdown and auto-reset
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onReset();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetPct = ((AUTO_RESET_SECONDS - countdown) / AUTO_RESET_SECONDS) * 100;

  return (
    <div
      className="relative flex flex-col items-center justify-center booth-no-select overflow-hidden"
      style={{ height: "calc(100vh - 73px)" }}
    >
      {/* Subtle background particles */}
      <ParticleField count={30} />

      {/* Center glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 55% 55% at 50% 50%, rgba(255,215,0,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center gap-8 px-16 max-w-4xl w-full">

        {/* "Your future has been recorded" */}
        <motion.p
          className="text-3xl tracking-tight"
          style={{ color: "rgba(255,255,255,0.45)" }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Your future has been recorded,{" "}
          <span style={{ color: "rgba(255,215,0,0.8)" }}>{visitorName}</span>
        </motion.p>

        {/* ── Persona card ── */}
        <motion.div
          className="w-full rounded-3xl overflow-hidden"
          style={{
            backgroundColor: "#16213E",
            border: "1px solid rgba(255,215,0,0.25)",
          }}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25, duration: 0.6, ease: "easeOut" }}
        >
          {/* Card header band */}
          <div
            className="px-10 py-6"
            style={{
              background:
                "linear-gradient(135deg, rgba(91,198,134,0.9) 0%, rgba(22,33,62,0.95) 100%)",
            }}
          >
            <p
              className="text-xl tracking-[0.3em] mb-1"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              Kaltura Future Teller · Connect 2026
            </p>
            <p className="text-3xl font-bold tracking-tight text-white">
              Your Prediction Card
            </p>
          </div>

          {/* Card body */}
          <div className="px-10 py-8 flex gap-8 items-start">
            {/* Left: emoji + names */}
            <div className="flex flex-col items-center gap-4 shrink-0">
              <motion.span
                className="text-8xl leading-none select-none"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                {details?.emoji ?? "🔮"}
              </motion.span>

              {/* QR placeholder */}
              <div
                className="w-28 h-28 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: "rgba(255,255,255,0.06)",
                  border: "2px dashed rgba(255,255,255,0.15)",
                }}
              >
                <p
                  className="text-xs tracking-tight text-center leading-snug"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  QR
                  <br />
                  CODE
                </p>
              </div>
            </div>

            {/* Right: content */}
            <div className="flex flex-col gap-4 flex-1 text-left">
              <div>
                <p
                  className="text-xl tracking-tight mb-1"
                  style={{ color: "rgba(255,215,0,0.65)" }}
                >
                  Visitor
                </p>
                <h2 className="text-5xl font-bold text-white leading-none">
                  {visitorName}
                </h2>
              </div>

              <div>
                <p
                  className="text-xl tracking-tight mb-1"
                  style={{ color: "rgba(255,215,0,0.65)" }}
                >
                  Oracle&rsquo;s Verdict
                </p>
                <h3
                  className="text-3xl font-bold text-white leading-snug"
                >
                  {details?.name ?? "Future Revealed"}
                </h3>
                {details && (
                  <p
                    className="text-xl mt-1 italic"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    &ldquo;{details.tagline}&rdquo;
                  </p>
                )}
              </div>

              {/* Card summary */}
              <AnimatePresence>
                {cardSummary && (
                  <motion.div
                    className="rounded-xl px-5 py-4"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <p
                      className="text-2xl leading-snug"
                      style={{ color: "rgba(255,255,255,0.85)" }}
                    >
                      {cardSummary}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* CTAs */}
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <p
            className="text-3xl font-semibold"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            Collect your prediction card at the booth →
          </p>
          <p
            className="text-2xl px-8 py-4 rounded-xl"
            style={{
              color: "rgba(255,215,0,0.9)",
              backgroundColor: "rgba(255,215,0,0.07)",
              border: "1px solid rgba(255,215,0,0.2)",
            }}
          >
            Ready to make this future real? Talk to the Kaltura team.
          </p>
        </motion.div>

        {/* Auto-reset countdown */}
        <motion.div
          className="flex flex-col items-center gap-3 w-full max-w-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
        >
          <div
            className="w-full rounded-full overflow-hidden"
            style={{ height: "4px", backgroundColor: "rgba(255,255,255,0.08)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: "rgba(91,198,134,0.5)" }}
              animate={{ width: `${resetPct}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p
            className="text-xl tracking-tight"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            Next visitor in {countdown}s
          </p>
        </motion.div>
      </div>
    </div>
  );
}
