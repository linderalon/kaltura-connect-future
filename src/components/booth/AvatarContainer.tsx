"use client";

import { motion, AnimatePresence } from "framer-motion";

interface AvatarContainerProps {
  /** Caption shown below the avatar area. Animates when it changes. */
  caption?: string;
  /** Fill parent container height instead of enforcing 16:9 via padding trick. */
  fill?: boolean;
  className?: string;
}

export function AvatarContainer({
  caption,
  fill = false,
  className = "",
}: AvatarContainerProps) {
  const inner = (
    <motion.div
      className="absolute inset-0 rounded-2xl flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: "#090F1E" }}
      animate={{
        boxShadow: [
          "0 0 30px 0px rgba(91,198,134,0.2), inset 0 0 40px 0px rgba(91,198,134,0.04)",
          "0 0 70px 10px rgba(91,198,134,0.55), inset 0 0 70px 0px rgba(91,198,134,0.10)",
          "0 0 30px 0px rgba(91,198,134,0.2), inset 0 0 40px 0px rgba(91,198,134,0.04)",
        ],
      }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Pulsing border ring */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{ border: "2px solid rgba(91,198,134,0.45)" }}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Orb glow behind avatar icon */}
      <div
        className="absolute w-64 h-64 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(91,198,134,0.12) 0%, transparent 70%)",
        }}
      />

      {/* Placeholder content */}
      <div className="relative z-10 text-center select-none">
        <motion.div
          className="text-8xl mb-4 leading-none"
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        >
          🎭
        </motion.div>
        <p
          className="text-2xl font-mono uppercase tracking-[0.35em]"
          style={{ color: "rgba(255,255,255,0.2)" }}
        >
          AVATAR STREAM
        </p>
      </div>
    </motion.div>
  );

  return (
    <div className={`flex flex-col ${className}`}>
      {fill ? (
        <div className="relative flex-1 rounded-2xl overflow-hidden">{inner}</div>
      ) : (
        /* 16:9 via padding-bottom trick */
        <div className="relative w-full rounded-2xl overflow-hidden" style={{ paddingBottom: "56.25%" }}>
          {inner}
        </div>
      )}

      {/* Caption */}
      <AnimatePresence mode="wait">
        {caption && (
          <motion.div
            key={caption}
            className="mt-4 px-6 py-3 rounded-xl text-center"
            style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35 }}
          >
            <p
              className="text-3xl italic leading-snug"
              style={{ color: "rgba(255,255,255,0.75)" }}
            >
              &ldquo;{caption}&rdquo;
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
