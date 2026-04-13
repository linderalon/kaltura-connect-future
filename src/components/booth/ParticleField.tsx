"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
  dx: number;
  dy: number;
}

interface ParticleFieldProps {
  count?: number;
  /** When true, particles burst outward once (for PROCESSING dramatic moment). */
  burst?: boolean;
}

export function ParticleField({ count = 55, burst = false }: ParticleFieldProps) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i): Particle => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        // Mix of red, gold, and a warm orange midpoint
        color: i % 3 === 0 ? "#FFD700" : i % 3 === 1 ? "#5BC686" : "#FF5722",
        size: Math.random() * 4 + 2,
        duration: Math.random() * 18 + 10,
        delay: -(Math.random() * 18),
        dx: (Math.random() - 0.5) * 45,
        dy: (Math.random() - 0.5) * 45,
      })),
    [count]
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
          }}
          animate={
            burst
              ? {
                  x: (Math.random() - 0.5) * 600,
                  y: (Math.random() - 0.5) * 600,
                  opacity: [0.9, 0],
                  scale: [1, 3],
                }
              : {
                  x: [0, p.dx, -p.dx * 0.6, 0],
                  y: [0, p.dy, -p.dy * 0.6, 0],
                  opacity: [0.12, 0.5, 0.18, 0.12],
                  scale: [1, 1.6, 0.7, 1],
                }
          }
          transition={{
            duration: burst ? 1.8 : p.duration,
            delay: burst ? Math.random() * 0.4 : p.delay,
            repeat: burst ? 0 : Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
