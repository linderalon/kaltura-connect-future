"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import type { SessionData } from "@/lib/supabase";
import type { PersonaDetails } from "@/lib/personaEngine";

interface Props {
  session: SessionData;
  details: PersonaDetails;
  shareUrl: string;
}

// ---------------------------------------------------------------------------
// Action buttons
// ---------------------------------------------------------------------------

function ActionBar({
  session,
  details,
  shareUrl,
  onDownload,
  downloading,
}: Props & {
  onDownload: () => void;
  downloading: boolean;
}) {
  const [linkedInCopied, setLinkedInCopied] = useState(false);

  async function handleLinkedIn() {
    // Copy caption to clipboard, then open LinkedIn
    const caption = session.linkedin_caption ?? `Just had my 2026 future read at Kaltura Connect 2026. The oracle says I'm ${details.name}. ${details.tagline}\n\n#KalturaConnect #FutureTeller #VideoStrategy`;

    try {
      await navigator.clipboard.writeText(caption);
      setLinkedInCopied(true);
      setTimeout(() => setLinkedInCopied(false), 3000);
    } catch {
      // clipboard API blocked — still open LinkedIn
    }

    const linkedInUrl =
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(linkedInUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      className="flex flex-wrap justify-center gap-4 mt-8"
      data-print-hide="true"
    >
      {/* Download PNG */}
      <motion.button
        onClick={onDownload}
        disabled={downloading}
        className="flex items-center gap-3 px-6 py-4 rounded-xl font-semibold text-white text-lg transition-opacity"
        style={{
          backgroundColor: downloading
            ? "rgba(255,255,255,0.08)"
            : "#5BC686",
          border: "none",
          cursor: downloading ? "not-allowed" : "pointer",
          opacity: downloading ? 0.7 : 1,
        }}
        whileHover={downloading ? {} : { scale: 1.04, boxShadow: "0 0 24px rgba(91,198,134,0.5)" }}
        whileTap={downloading ? {} : { scale: 0.97 }}
      >
        <span>{downloading ? "⏳" : "⬇"}</span>
        {downloading ? "Generating…" : "Download My Prediction"}
      </motion.button>

      {/* LinkedIn */}
      <motion.button
        onClick={handleLinkedIn}
        className="flex items-center gap-3 px-6 py-4 rounded-xl font-semibold text-white text-lg"
        style={{
          backgroundColor: linkedInCopied
            ? "rgba(0,119,181,0.35)"
            : "rgba(0,119,181,0.2)",
          border: "1px solid rgba(0,119,181,0.6)",
          cursor: "pointer",
        }}
        whileHover={{ scale: 1.04, boxShadow: "0 0 20px rgba(0,119,181,0.4)" }}
        whileTap={{ scale: 0.97 }}
      >
        <span>🔗</span>
        {linkedInCopied ? "Caption copied! Opening LinkedIn…" : "Share on LinkedIn"}
      </motion.button>

      {/* Kaltura CTA */}
      <motion.a
        href="https://kaltura.com"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 px-6 py-4 rounded-xl font-semibold text-white text-lg"
        style={{
          backgroundColor: "rgba(255,215,0,0.1)",
          border: "1px solid rgba(255,215,0,0.3)",
          textDecoration: "none",
          cursor: "pointer",
        }}
        whileHover={{ scale: 1.04, boxShadow: "0 0 20px rgba(255,215,0,0.3)" }}
        whileTap={{ scale: 0.97 }}
      >
        <span>✨</span>
        See How Kaltura Can Make This Real
      </motion.a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PredictionCardClient({ session, details, shareUrl }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!cardRef.current || downloading) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: "#16213E",
        useCORS: true,
        logging: false,
        allowTaint: true,
      });
      const link = document.createElement("a");
      link.download = `kaltura-future-${session.visitor_name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  }

  const cardDate = new Date(session.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="min-h-screen py-12 px-6"
      style={{ backgroundColor: "#0A0A0A" }}
    >
      {/* ── HERO ── */}
      <header
        className="text-center mb-10 max-w-3xl mx-auto"
        data-print-hide="true"
      >
        <motion.p
          className="text-sm tracking-[0.4em] mb-3"
          style={{ color: "rgba(255,255,255,0.35)" }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Kaltura Connect 2026
        </motion.p>

        <motion.h1
          className="text-5xl font-bold tracking-tight leading-tight"
          style={{ color: "#FFFFFF" }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          The Kaltura{" "}
          <span style={{ color: "#5BC686" }}>Future Teller</span>
          <br />
          Has Spoken
        </motion.h1>

        {/* Event badge */}
        <motion.div
          className="inline-flex items-center gap-2 mt-4 px-5 py-2 rounded-full text-sm font-semibold tracking-tight"
          style={{
            backgroundColor: "rgba(255,215,0,0.08)",
            border: "1px solid rgba(255,215,0,0.25)",
            color: "#FFD700",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <span>🔮</span>
          Kaltura Connect 2026 · Oracle Prediction
        </motion.div>
      </header>

      {/* ── PREDICTION CARD ── */}
      <motion.div
        className="max-w-2xl mx-auto"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        {/* This div is captured by html2canvas */}
        <div
          ref={cardRef}
          id="prediction-card"
          data-print-card="true"
          className="rounded-3xl overflow-hidden"
          style={{
            backgroundColor: "#16213E",
            border: "1px solid rgba(255,215,0,0.2)",
            boxShadow:
              "0 0 60px rgba(91,198,134,0.12), 0 0 120px rgba(255,215,0,0.05)",
          }}
        >
          {/* Card header band */}
          <div
            className="px-10 py-7 text-center"
            style={{
              background:
                "linear-gradient(135deg, #5BC686 0%, rgba(22,33,62,0.95) 100%)",
            }}
          >
            <p
              className="text-xs tracking-[0.4em] mb-2"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Kaltura Connect 2026
            </p>
            <p className="text-2xl font-bold tracking-normal text-white">
              Oracle Prediction
            </p>
            <p
              className="text-sm mt-1"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              {cardDate}
            </p>
          </div>

          {/* Card body */}
          <div className="px-10 pt-9 pb-10 flex flex-col items-center text-center">
            {/* Visitor name */}
            <h2
              className="font-bold text-white leading-none mb-5"
              style={{ fontSize: "clamp(2.25rem, 6vw, 3.5rem)" }}
            >
              {session.visitor_name}
            </h2>

            {/* Persona emoji */}
            <motion.div
              className="text-8xl leading-none mb-4 select-none"
              animate={{ scale: [1, 1.07, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              {details.emoji}
            </motion.div>

            {/* Persona name */}
            <p
              className="text-2xl font-bold mb-6"
              style={{ color: "#FFD700" }}
            >
              {details.name}
            </p>

            {/* 20-word card summary — stylized */}
            {session.card_summary && (
              <div
                className="w-full rounded-2xl px-7 py-5 mb-7"
                style={{
                  backgroundColor: "rgba(255,215,0,0.06)",
                  border: "1px solid rgba(255,215,0,0.18)",
                }}
              >
                <p
                  className="text-xl font-semibold italic leading-snug"
                  style={{ color: "rgba(255,255,255,0.9)" }}
                >
                  &ldquo;{session.card_summary}&rdquo;
                </p>
              </div>
            )}

            {/* Divider */}
            <div
              className="w-full h-px mb-7"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,215,0,0.3), transparent)",
              }}
            />

            {/* Full prediction text */}
            <div className="text-left w-full">
              <p
                className="text-base leading-relaxed"
                style={{ color: "rgba(255,255,255,0.8)" }}
              >
                {session.prediction}
              </p>
            </div>

            {/* Signature */}
            <p
              className="mt-7 text-lg italic font-semibold self-end"
              style={{ color: "rgba(255,215,0,0.65)" }}
            >
              — The Kaltura Future Teller
            </p>
          </div>

          {/* Card footer bar — Kaltura branding */}
          <div
            className="px-10 py-5 flex items-center justify-between"
            style={{
              backgroundColor: "rgba(0,0,0,0.3)",
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/kaltura-logo.png"
              alt="Kaltura"
              style={{ height: "50px", width: "auto" }}
            />
            <span
              className="text-sm tracking-tight"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              Kaltura Connect 2026
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── ACTION BUTTONS ── */}
      <div className="max-w-2xl mx-auto">
        <ActionBar
          session={session}
          details={details}
          shareUrl={shareUrl}
          onDownload={handleDownload}
          downloading={downloading}
        />
      </div>

      {/* ── FOOTER ── */}
      <footer
        className="text-center mt-14 pb-6 max-w-2xl mx-auto"
        data-print-hide="true"
      >
        <div
          className="h-px w-32 mx-auto mb-7"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,215,0,0.3), transparent)",
          }}
        />
        <p
          className="text-base mb-4"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          Your future was revealed at Kaltura Connect 2026
        </p>
        <div className="flex items-center justify-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/kaltura-logo.png"
            alt="Kaltura"
            style={{ height: "70px", width: "auto" }}
          />
          <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
          <span
            className="text-sm tracking-tight"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            Future Teller
          </span>
        </div>
      </footer>
    </div>
  );
}
