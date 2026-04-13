"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Question definitions
// ---------------------------------------------------------------------------

type QuestionType = "text" | "choice" | "slider";

interface ChoiceOption {
  label: string;
  text: string;
  value: string;
}

interface Question {
  id: number;
  text: string;
  type: QuestionType;
  placeholder?: string;
  options?: ChoiceOption[];
  leftLabel?: string;
  rightLabel?: string;
  answerKey: string;
  avatarCaption: string;
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    text: "What's your name, traveler?",
    type: "text",
    placeholder: "Your first name...",
    answerKey: "visitorName",
    avatarCaption: "Every prophecy begins with a name.",
  },
  {
    id: 2,
    text: "What's your biggest video or learning challenge right now?",
    type: "text",
    placeholder: "Be honest — the oracle sees all...",
    answerKey: "painPoint",
    avatarCaption: "Tell me where it hurts. The answer hides in the wound.",
  },
  {
    id: 3,
    text: "What does success look like for you in 2026?",
    type: "text",
    placeholder: "Paint me a picture of victory...",
    answerKey: "vision",
    avatarCaption: "Close your eyes. Describe what you see.",
  },
  {
    id: 4,
    text: "Your team resists a new initiative. What do you do?",
    type: "choice",
    options: [
      { label: "A", text: "Show them the data", value: "analyst" },
      { label: "B", text: "Tell them a story", value: "storyteller" },
      { label: "C", text: "Just implement it and apologize later", value: "maverick" },
    ],
    answerKey: "personalityChoice",
    avatarCaption: "This reveals much about your nature.",
  },
  {
    id: 5,
    text: "How ambitious are your 2026 goals?",
    type: "slider",
    leftLabel: "Survive Q1",
    rightLabel: "Revolutionize how my company learns",
    answerKey: "ambitionLevel",
    avatarCaption: "The higher you reach, the more the oracle sees.",
  },
  {
    id: 6,
    text: "Which philosophy guides you?",
    type: "choice",
    options: [
      { label: "A", text: "Move fast and break things", value: "fast" },
      { label: "B", text: "Move thoughtfully and build things that last", value: "thoughtful" },
    ],
    answerKey: "riskTolerance",
    avatarCaption: "Your final answer. Choose wisely.",
  },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface QuestioningViewProps {
  currentQuestion: number;
  visitorName: string;
  onAnswer: (key: string, value: string | number) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuestioningView({
  currentQuestion,
  visitorName,
  onAnswer,
}: QuestioningViewProps) {
  const question = QUESTIONS[currentQuestion - 1];
  const [textValue, setTextValue] = useState("");
  const [sliderValue, setSliderValue] = useState(3);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset local state on question change and focus the input
  useEffect(() => {
    setTextValue("");
    setSliderValue(3);
    if (question.type === "text") {
      const t = setTimeout(() => inputRef.current?.focus(), 350);
      return () => clearTimeout(t);
    }
  }, [currentQuestion, question.type]);

  const submitText = useCallback(() => {
    if (textValue.trim()) {
      onAnswer(question.answerKey, textValue.trim());
    }
  }, [textValue, question.answerKey, onAnswer]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      submitText();
    }
  }

  // Fraction of slider filled for gradient
  const sliderPct = ((sliderValue - 1) / 4) * 100;

  return (
    <div
      className="flex flex-col booth-no-select"
      style={{ height: "calc(100vh - 73px)" }}
    >
      {/* ── Top bar: question counter + visitor name ── */}
      <div className="flex items-center justify-between px-16 pt-5 pb-2 shrink-0">
        <motion.p
          key={currentQuestion}
          className="text-2xl tracking-tight"
          style={{ color: "rgba(255,255,255,0.3)" }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
        >
          Question {currentQuestion} of 6
        </motion.p>

        <AnimatePresence>
          {visitorName && currentQuestion > 1 && (
            <motion.p
              className="text-2xl font-semibold"
              style={{ color: "rgba(255,215,0,0.8)" }}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              ✨ {visitorName}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* ── Avatar spacer — the persistent page-level KalturaAvatar fills this area ── */}
      <div className="shrink-0" style={{ flex: "0 0 63%" }} aria-hidden />

      {/* ── Question + answer — remaining space ── */}
      <div className="flex-1 px-16 pb-6 flex flex-col justify-center min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            className="flex flex-col items-center gap-5"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.38, ease: "easeOut" }}
          >
            {/* Question text */}
            <h2
              className="font-bold text-white text-center leading-tight"
              style={{ fontSize: "clamp(1.75rem, 3vw, 2.75rem)" }}
            >
              {question.text}
            </h2>

            {/* ── Text input (Q1, Q2, Q3) ── */}
            {question.type === "text" && (
              <div className="flex flex-col items-center gap-3 w-full max-w-3xl">
                <input
                  ref={inputRef}
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={question.placeholder}
                  autoComplete="off"
                  className="w-full rounded-xl text-white text-4xl text-center py-5 px-8 outline-none transition-all placeholder-white/20"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.07)",
                    border: textValue.trim()
                      ? "2px solid rgba(91,198,134,0.7)"
                      : "2px solid rgba(255,255,255,0.12)",
                    caretColor: "#5BC686",
                  }}
                />
                <p
                  className="text-xl tracking-tight"
                  style={{ color: "rgba(255,255,255,0.28)" }}
                >
                  Press Enter to answer
                </p>
              </div>
            )}

            {/* ── Choice buttons (Q4 — 3 options, Q6 — 2 options) ── */}
            {question.type === "choice" && question.options && (
              <div
                className={`grid gap-4 w-full max-w-5xl ${
                  question.options.length === 2 ? "grid-cols-2" : "grid-cols-3"
                }`}
              >
                {question.options.map((opt) => (
                  <motion.button
                    key={opt.value}
                    onClick={() => onAnswer(question.answerKey, opt.value)}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl text-white font-semibold"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.06)",
                      border: "2px solid rgba(255,255,255,0.1)",
                    }}
                    whileHover={{
                      scale: 1.03,
                      backgroundColor: "rgba(91,198,134,0.18)",
                      borderColor: "rgba(91,198,134,0.8)",
                    }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                  >
                    <span
                      className="text-5xl font-bold leading-none"
                      style={{ color: "#5BC686" }}
                    >
                      {opt.label}
                    </span>
                    <span className="text-2xl text-center leading-snug">
                      {opt.text}
                    </span>
                  </motion.button>
                ))}
              </div>
            )}

            {/* ── Slider (Q5) ── */}
            {question.type === "slider" && (
              <div className="flex flex-col items-center gap-5 w-full max-w-4xl">
                {/* Large numeric value */}
                <motion.div
                  key={sliderValue}
                  className="text-9xl font-bold leading-none"
                  style={{ color: "#FFD700" }}
                  initial={{ scale: 1.25, opacity: 0.7 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.15 }}
                >
                  {sliderValue}
                </motion.div>

                {/* Slider track */}
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={sliderValue}
                  onChange={(e) => setSliderValue(Number(e.target.value))}
                  className="booth-slider w-full"
                  style={{
                    background: `linear-gradient(to right, #5BC686 0%, #FFD700 ${sliderPct}%, rgba(255,255,255,0.15) ${sliderPct}%, rgba(255,255,255,0.15) 100%)`,
                  }}
                />

                {/* Endpoint labels */}
                <div className="flex justify-between w-full">
                  <p className="text-xl" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {question.leftLabel}
                  </p>
                  <p className="text-xl" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {question.rightLabel}
                  </p>
                </div>

                {/* Confirm button */}
                <motion.button
                  onClick={() => onAnswer(question.answerKey, sliderValue)}
                  className="px-14 py-5 rounded-xl text-white text-2xl font-bold tracking-tight"
                  style={{ backgroundColor: "#5BC686" }}
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 0 35px rgba(91,198,134,0.6)",
                  }}
                  whileTap={{ scale: 0.96 }}
                >
                  Lock it in →
                </motion.button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
