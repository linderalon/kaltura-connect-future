"use client";

import { useState } from "react";

const OPERATOR_PASSWORD = "kaltura2026";

export default function OperatorPage() {
  const [input, setInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input === OPERATOR_PASSWORD) {
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
      setInput("");
    }
  }

  if (!unlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-73px)] px-8">
        <div
          className="w-full max-w-sm rounded-xl p-8"
          style={{ backgroundColor: "#16213E", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <h2 className="text-2xl font-bold mb-2 text-center">Operator Access</h2>
          <p className="text-white/50 text-sm text-center mb-6">
            Staff only — enter the control panel password
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Password"
              autoFocus
              className="w-full rounded-lg px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2"
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                border: error ? "1px solid #5BC686" : "1px solid rgba(255,255,255,0.12)",
                "--tw-ring-color": "#FFD700",
              } as React.CSSProperties}
            />
            {error && (
              <p className="text-sm text-center" style={{ color: "#5BC686" }}>
                Incorrect password. Try again.
              </p>
            )}
            <button
              type="submit"
              className="w-full py-3 rounded-lg font-semibold tracking-normal transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: "#5BC686" }}
            >
              Unlock
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-73px)] px-8">
      <div
        className="w-full max-w-3xl rounded-xl p-10"
        style={{ backgroundColor: "#16213E", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">
            Operator{" "}
            <span style={{ color: "#FFD700" }}>Control Panel</span>
          </h1>
          <span
            className="text-xs px-3 py-1 rounded-full tracking-tight font-medium"
            style={{ backgroundColor: "rgba(91,198,134,0.15)", color: "#5BC686", border: "1px solid #5BC686" }}
          >
            Staff Only
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Active Sessions", value: "—", hint: "Live visitors" },
            { label: "Predictions Generated", value: "—", hint: "All time" },
            { label: "Shares", value: "—", hint: "Cards shared today" },
            { label: "Queue Length", value: "—", hint: "Waiting" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg p-6"
              style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p className="text-white/40 text-xs tracking-tight mb-1">{stat.hint}</p>
              <p className="text-2xl font-bold mb-0.5" style={{ color: "#FFD700" }}>
                {stat.value}
              </p>
              <p className="text-sm text-white/70">{stat.label}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs text-white/30 tracking-tight text-center">
          Route: <code className="text-white/50">/operator</code> — Staff Control Panel
        </p>
      </div>
    </div>
  );
}
