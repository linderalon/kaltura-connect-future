/**
 * Word-for-word avatar script for every state transition and reaction.
 *
 * All audience-facing text lives here so copy can be revised without
 * touching component logic. Use `interpolate(line, name)` to substitute
 * [NAME] at render time.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Replace every [NAME] token with the visitor's actual name (or "friend"). */
export function interpolate(line: string, name: string): string {
  return line.replace(/\[NAME\]/g, name?.trim() || "friend");
}

/** Rough speaking duration in ms (≈ 140 words/minute with pauses). */
export function estimateDuration(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(2500, Math.round((words / 2.5) * 1000));
}

// ---------------------------------------------------------------------------
// Script lines
// ---------------------------------------------------------------------------

export const SCRIPT = {
  // ─── State: INTRO ────────────────────────────────────────────────────────
  INTRO: `Ah. There you are. I've been looking forward to meeting you.
I'm the Kaltura Future Teller — and I've already seen a few things about your 2026 that I think you'll want to know.
But first — I have six questions.
Answer honestly. The future responds well to honesty.`,

  // ─── State: QUESTIONING ──────────────────────────────────────────────────
  Q1: `Before I can show you what's coming — I need to know who I'm talking to.
Not your job title. Not your company.
Just your name. The one people actually call you.`,

  Q1_RESPONSE: `[NAME]. I like that. Your future is already getting clearer, [NAME].
Let's keep going.`,

  Q2: `Now [NAME] — let's start with the truth.
What is your single biggest video or learning challenge right now?
Don't hold back. I've heard it all.`,

  Q3: `[NAME], picture this.
It's December 2026. Everything went exactly the way you hoped.
What does success look like for you and your team?`,

  Q4: `When your team pushes back on a new technology — what do you do?
A — You show them the data.
B — You tell them a story.
C — You implement it and apologize later.`,

  Q4_ANALYST: `Data first. The Future Teller respects this.`,

  Q4_STORYTELLER: `A storyteller. That explains a lot, [NAME].`,

  Q4_MAVERICK: `Implement and apologize. Bold.
The Future Teller has seen this work. Eventually.`,

  Q5: `On a scale of one to five —
where one is "I just want to survive Q1"
and five is "I am going to completely transform how my company learns" —
where do you honestly land right now?`,

  Q5_HIGH: `Five. Of course it's five.
I expected nothing less from you, [NAME].`,

  Q5_MID: `Honest. The Future Teller appreciates honesty more than ambition.`,

  Q5_LOW: `One. Survival mode. Noted.
The Future Teller has plans for you anyway.`,

  Q6: `Last question, [NAME]. And this one matters.
Would you rather lead a team that moves fast and breaks things —
or moves thoughtfully and builds things that last?`,

  // ─── State: PROCESSING ───────────────────────────────────────────────────
  PROCESSING: `Interesting. Very interesting.
I'm processing everything you've shared with me, [NAME]...
Your challenges... your vision... how you lead...
The signals are strong...
Your 2026 is coming into focus...
Yes. I see it now.
And [NAME] — it's going to be quite a year.`,

  // ─── State: PREDICTION ───────────────────────────────────────────────────
  PREDICTION_OPENER: `[NAME], based on everything you've shared with me —
I can now tell you exactly what kind of year 2026 is going to be.
And more importantly — exactly who you're going to be in it.`,

  // ─── State: COMPLETE ─────────────────────────────────────────────────────
  COMPLETE: `Your future has been recorded, [NAME].
The Kaltura team has your prediction card ready.
And if you want to actually make this future happen?
They are right here.
The future does not build itself.
Although — with Kaltura — it gets considerably easier.`,
} as const;

// ---------------------------------------------------------------------------
// Selector — returns the exact line to speak for a given state / context
// ---------------------------------------------------------------------------

export type ScriptContext = {
  state: string;
  question?: number;
  /** Used for Q1_RESPONSE, Q4 reactions, Q5 reactions */
  answerKey?: string;
  answerValue?: string | number | null;
  name?: string;
};

/** Returns the interpolated line to speak, or null if there's nothing to say. */
export function getScriptLine(ctx: ScriptContext): string | null {
  const name = ctx.name ?? "friend";

  switch (ctx.state) {
    case "INTRO":
      return interpolate(SCRIPT.INTRO, name);

    case "QUESTIONING": {
      switch (ctx.question) {
        case 1:  return interpolate(SCRIPT.Q1, name);
        case 2:  return interpolate(SCRIPT.Q2, name);
        case 3:  return interpolate(SCRIPT.Q3, name);
        case 4:  return SCRIPT.Q4;
        case 5:  return SCRIPT.Q5;
        case 6:  return interpolate(SCRIPT.Q6, name);
        default: return null;
      }
    }

    // Response lines after the visitor submits an answer
    case "ANSWER_REACTION": {
      if (ctx.answerKey === "visitorName") {
        return interpolate(SCRIPT.Q1_RESPONSE, name);
      }
      if (ctx.answerKey === "personalityChoice") {
        const reactions: Record<string, string> = {
          analyst:     SCRIPT.Q4_ANALYST,
          storyteller: interpolate(SCRIPT.Q4_STORYTELLER, name),
          maverick:    SCRIPT.Q4_MAVERICK,
        };
        return reactions[String(ctx.answerValue)] ?? null;
      }
      if (ctx.answerKey === "ambitionLevel") {
        const level = Number(ctx.answerValue);
        if (level >= 4) return interpolate(SCRIPT.Q5_HIGH, name);
        if (level <= 1) return SCRIPT.Q5_LOW;
        return SCRIPT.Q5_MID;
      }
      return null;
    }

    case "PROCESSING":
      return interpolate(SCRIPT.PROCESSING, name);

    case "PREDICTION":
      return interpolate(SCRIPT.PREDICTION_OPENER, name);

    case "COMPLETE":
      return interpolate(SCRIPT.COMPLETE, name);

    default:
      return null;
  }
}
