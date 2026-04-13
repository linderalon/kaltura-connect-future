"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SessionState =
  | "IDLE"
  | "INTRO"
  | "QUESTIONING"
  | "PROCESSING"
  | "PREDICTION"
  | "COMPLETE";

export type PersonalityChoice = "analyst" | "storyteller" | "maverick";
export type RiskTolerance = "fast" | "thoughtful";

export interface SessionAnswers {
  visitorName: string;
  painPoint: string;
  vision: string;
  personalityChoice: PersonalityChoice | null;
  ambitionLevel: number | null; // 1–5
  riskTolerance: RiskTolerance | null;
}

// ---------------------------------------------------------------------------
// State machine order & constants
// ---------------------------------------------------------------------------

export const TOTAL_QUESTIONS = 6;

/**
 * Linear progression through states.
 * advanceState() walks this list; QUESTIONING stays here while Q1–Q6 are
 * collected, then moves to PROCESSING on Q6's advance.
 */
const STATE_ORDER: readonly SessionState[] = [
  "IDLE",
  "INTRO",
  "QUESTIONING",
  "PROCESSING",
  "PREDICTION",
  "COMPLETE",
] as const;

// ---------------------------------------------------------------------------
// Internal reducer state
// ---------------------------------------------------------------------------

interface StoreState {
  currentState: SessionState;
  /** 1-indexed. Relevant only while currentState === 'QUESTIONING'. */
  currentQuestion: number;
  answers: SessionAnswers;
  sessionStartTime: Date | null;
}

const EMPTY_ANSWERS: SessionAnswers = {
  visitorName: "",
  painPoint: "",
  vision: "",
  personalityChoice: null,
  ambitionLevel: null,
  riskTolerance: null,
};

const INITIAL_STORE: StoreState = {
  currentState: "IDLE",
  currentQuestion: 1,
  answers: EMPTY_ANSWERS,
  sessionStartTime: null,
};

// ---------------------------------------------------------------------------
// Actions — discriminated union keeps SET_ANSWER fully type-safe
// ---------------------------------------------------------------------------

type SetAnswerAction = {
  [K in keyof SessionAnswers]: {
    type: "SET_ANSWER";
    key: K;
    value: SessionAnswers[K];
  };
}[keyof SessionAnswers];

type Action = { type: "ADVANCE_STATE" } | SetAnswerAction | { type: "RESET" };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case "ADVANCE_STATE": {
      const { currentState, currentQuestion } = state;

      // While questioning: walk Q1 → Q6 before advancing the outer state.
      if (currentState === "QUESTIONING") {
        if (currentQuestion < TOTAL_QUESTIONS) {
          return { ...state, currentQuestion: currentQuestion + 1 };
        }
        // Q6 done — fall through to PROCESSING.
        return { ...state, currentState: "PROCESSING" };
      }

      const idx = STATE_ORDER.indexOf(currentState);
      const nextState: SessionState =
        idx === -1 || idx === STATE_ORDER.length - 1
          ? "IDLE"
          : STATE_ORDER[idx + 1];

      return {
        ...state,
        currentState: nextState,
        // Stamp start time exactly once, when leaving IDLE.
        sessionStartTime:
          currentState === "IDLE" ? new Date() : state.sessionStartTime,
      };
    }

    case "SET_ANSWER":
      return {
        ...state,
        answers: { ...state.answers, [action.key]: action.value },
      };

    case "RESET":
      return { ...INITIAL_STORE };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context value shape
// ---------------------------------------------------------------------------

export interface FutureTellerContextValue {
  /** The current macro state of the session. */
  currentState: SessionState;
  /** Which question is active (1–6). Only meaningful during QUESTIONING. */
  currentQuestion: number;
  /** All collected answers. */
  answers: SessionAnswers;
  /** Convenience alias for answers.visitorName. */
  visitorName: string;
  /** When the session started (null before first advance from IDLE). */
  sessionStartTime: Date | null;
  /** Advance to the next state (or next question during QUESTIONING). */
  advanceState: () => void;
  /** Store a single answer; fully typed — value type is inferred from key. */
  setAnswer: <K extends keyof SessionAnswers>(
    key: K,
    value: SessionAnswers[K]
  ) => void;
  /** Hard-reset everything back to IDLE with empty answers. */
  resetSession: () => void;
}

// ---------------------------------------------------------------------------
// Context + Provider
// ---------------------------------------------------------------------------

const FutureTellerContext = createContext<FutureTellerContextValue | null>(
  null
);
FutureTellerContext.displayName = "FutureTellerContext";

export function FutureTellerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [store, dispatch] = useReducer(reducer, INITIAL_STORE);

  const advanceState = useCallback(
    () => dispatch({ type: "ADVANCE_STATE" }),
    []
  );

  const setAnswer = useCallback(
    <K extends keyof SessionAnswers>(key: K, value: SessionAnswers[K]) => {
      dispatch({ type: "SET_ANSWER", key, value } as SetAnswerAction);
    },
    []
  );

  const resetSession = useCallback(() => dispatch({ type: "RESET" }), []);

  const value: FutureTellerContextValue = {
    currentState: store.currentState,
    currentQuestion: store.currentQuestion,
    answers: store.answers,
    visitorName: store.answers.visitorName,
    sessionStartTime: store.sessionStartTime,
    advanceState,
    setAnswer,
    resetSession,
  };

  return (
    <FutureTellerContext.Provider value={value}>
      {children}
    </FutureTellerContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFutureTeller(): FutureTellerContextValue {
  const ctx = useContext(FutureTellerContext);
  if (!ctx) {
    throw new Error(
      "useFutureTeller must be called inside a <FutureTellerProvider>."
    );
  }
  return ctx;
}
