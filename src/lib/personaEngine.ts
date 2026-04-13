// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Persona =
  | "VIDEO_VISIONARY"
  | "SIGNAL_IN_THE_NOISE"
  | "THE_FAST_FORWARD"
  | "HUMAN_AMPLIFIER"
  | "ONE_PERSON_STUDIO"
  | "KNOWLEDGE_BUILDER";

export type PersonalityChoice = "analyst" | "storyteller" | "maverick";
export type RiskTolerance = "fast" | "thoughtful";

/** The subset of session answers the scoring engine requires. */
export interface ScoringInput {
  personalityChoice: PersonalityChoice | null;
  ambitionLevel: number | null; // 1–5
  riskTolerance: RiskTolerance | null;
  painPoint: string;
}

/** Per-persona running score during calculation. */
export type PersonaScores = Record<Persona, number>;

export interface PersonaDetails {
  persona: Persona;
  name: string;
  emoji: string;
  tagline: string;
  /** ≤ 20 words — used on the shareable prediction card. */
  shortSummary: string;
  /** 150–200 words, funny + flattering + Kaltura-relevant. [NAME] is the placeholder. */
  fullPrediction: string;
}

// ---------------------------------------------------------------------------
// Keyword groups for painPoint scoring
// ---------------------------------------------------------------------------

const KEYWORD_GROUPS: Array<{
  keywords: string[];
  scores: Partial<PersonaScores>;
}> = [
  {
    keywords: ["training", "onboarding", "learning", "courses", "skills"],
    scores: { KNOWLEDGE_BUILDER: 2, HUMAN_AMPLIFIER: 1 },
  },
  {
    keywords: ["scale", "content", "production", "create", "studio"],
    scores: { ONE_PERSON_STUDIO: 2, VIDEO_VISIONARY: 1 },
  },
  {
    keywords: ["measure", "data", "analytics", "roi", "metrics"],
    scores: { SIGNAL_IN_THE_NOISE: 2 },
  },
  {
    keywords: ["engagement", "people", "team", "culture"],
    scores: { HUMAN_AMPLIFIER: 2 },
  },
];

// ---------------------------------------------------------------------------
// Tiebreaker: each persona has an "ambition affinity" (1 = reserved, 5 = bold)
// When scores are tied, pick the persona whose affinity is closest to the
// visitor's ambitionLevel (defaulting to 3 when null).
// ---------------------------------------------------------------------------

const AMBITION_AFFINITY: Record<Persona, number> = {
  VIDEO_VISIONARY: 5,
  THE_FAST_FORWARD: 4,
  ONE_PERSON_STUDIO: 3,
  HUMAN_AMPLIFIER: 3,
  KNOWLEDGE_BUILDER: 2,
  SIGNAL_IN_THE_NOISE: 1,
};

// Stable sort order used as final tiebreaker if affinity distances are equal.
const STABLE_ORDER: Persona[] = [
  "VIDEO_VISIONARY",
  "SIGNAL_IN_THE_NOISE",
  "THE_FAST_FORWARD",
  "HUMAN_AMPLIFIER",
  "ONE_PERSON_STUDIO",
  "KNOWLEDGE_BUILDER",
];

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function emptyScores(): PersonaScores {
  return {
    VIDEO_VISIONARY: 0,
    SIGNAL_IN_THE_NOISE: 0,
    THE_FAST_FORWARD: 0,
    HUMAN_AMPLIFIER: 0,
    ONE_PERSON_STUDIO: 0,
    KNOWLEDGE_BUILDER: 0,
  };
}

function addScore(
  scores: PersonaScores,
  delta: Partial<PersonaScores>
): void {
  for (const [key, pts] of Object.entries(delta) as Array<
    [Persona, number]
  >) {
    scores[key] += pts;
  }
}

/**
 * Calculates persona scores from the visitor's answers and returns the
 * winning Persona key.
 */
export function calculatePersona(input: ScoringInput): Persona {
  const scores = emptyScores();

  // --- personalityChoice ---
  if (input.personalityChoice === "storyteller") {
    addScore(scores, { VIDEO_VISIONARY: 2, HUMAN_AMPLIFIER: 2 });
  } else if (input.personalityChoice === "analyst") {
    addScore(scores, { SIGNAL_IN_THE_NOISE: 2, ONE_PERSON_STUDIO: 2 });
  } else if (input.personalityChoice === "maverick") {
    addScore(scores, { THE_FAST_FORWARD: 2 });
  }

  // --- ambitionLevel ---
  const ambition = input.ambitionLevel ?? null;
  if (ambition !== null) {
    if (ambition >= 4) {
      addScore(scores, { VIDEO_VISIONARY: 2, THE_FAST_FORWARD: 1 });
    } else if (ambition >= 2) {
      addScore(scores, { HUMAN_AMPLIFIER: 2, KNOWLEDGE_BUILDER: 2 });
    } else {
      // ambition === 1
      addScore(scores, { SIGNAL_IN_THE_NOISE: 2 });
    }
  }

  // --- riskTolerance ---
  if (input.riskTolerance === "fast") {
    addScore(scores, { THE_FAST_FORWARD: 2, VIDEO_VISIONARY: 1 });
  } else if (input.riskTolerance === "thoughtful") {
    addScore(scores, { KNOWLEDGE_BUILDER: 2, SIGNAL_IN_THE_NOISE: 2 });
  }

  // --- painPoint keyword detection (case-insensitive) ---
  const lowerPain = input.painPoint.toLowerCase();
  for (const group of KEYWORD_GROUPS) {
    if (group.keywords.some((kw) => lowerPain.includes(kw))) {
      addScore(scores, group.scores as Partial<PersonaScores>);
    }
  }

  // --- Find winner, with tiebreaker ---
  const maxScore = Math.max(...Object.values(scores));
  const tied = STABLE_ORDER.filter((p) => scores[p] === maxScore);

  if (tied.length === 1) return tied[0];

  // Tiebreaker: closest ambition affinity to the visitor's ambitionLevel.
  const level = ambition ?? 3;
  tied.sort((a, b) => {
    const distA = Math.abs(AMBITION_AFFINITY[a] - level);
    const distB = Math.abs(AMBITION_AFFINITY[b] - level);
    if (distA !== distB) return distA - distB;
    // Final stable tiebreaker: index in STABLE_ORDER.
    return STABLE_ORDER.indexOf(a) - STABLE_ORDER.indexOf(b);
  });

  return tied[0];
}

// ---------------------------------------------------------------------------
// Persona details
// ---------------------------------------------------------------------------

const PERSONA_DETAILS: Record<Persona, Omit<PersonaDetails, "persona">> = {
  VIDEO_VISIONARY: {
    name: "The Video Visionary",
    emoji: "🎬",
    tagline: "You see the whole story before anyone else does.",
    shortSummary:
      "You think in narratives, move at the speed of culture, and make video the strategy — not the tactic.",
    fullPrediction: `The oracle has spoken, [NAME], and the verdict is in: you are basically the Spielberg of enterprise learning — except your budget meetings are marginally less dramatic. In 2026, you will do something remarkable: convince an entire leadership team that the most important asset in their all-hands is a video. You'll be right. The numbers will prove it. The executives will take credit. You'll be fine with that, because you already have the next three campaigns mapped out in your head while everyone else is still admiring the last one.

Kaltura's AI Studio will feel like someone built it specifically for you — and honestly, we're not saying they did, but the suspicion is warranted. Your prediction: the phrase "engagement rate" will become your most-used words, your production quality will quietly embarrass your marketing colleagues (again), and at least one person will ask if you hired an external agency. You didn't. You never do. You just cared enough to make it excellent, and excellence, it turns out, is your default setting.`,
  },

  SIGNAL_IN_THE_NOISE: {
    name: "Signal in the Noise",
    emoji: "📡",
    tagline: "You find the truth where others see static.",
    shortSummary:
      "Your superpower is turning engagement data into the story everyone else completely missed.",
    fullPrediction: `The oracle has peered into the data, [NAME], and what it found is unsettling only to mediocre analysts: you are the person in every meeting who says "but what does the data actually say?" — and then answers your own question before anyone else can open a tab.

In 2026, your obsession with measurement will stop being a personality quirk and start being a competitive advantage. While colleagues debate whether learners liked the course, you'll already know watch-time by segment, drop-off curves, re-watch rate, and which forty-seven-second moment made people pause and take notes. Kaltura's analytics will become your morning ritual — more useful than coffee, fewer burnt fingertips.

You will build a reporting deck so clear that leadership will actually read it in full. This will be a first. Your prediction: at least one stakeholder will describe your ROI analysis as "frankly a little scary," someone will nominate you for a data literacy recognition, and you will respond by quietly checking whether there's a metric for award nominations. There isn't yet. You'll build one.`,
  },

  THE_FAST_FORWARD: {
    name: "The Fast Forward",
    emoji: "⚡",
    tagline: "Others ask for permission. You ask for forgiveness.",
    shortSummary:
      "You ship first, optimize second, and somehow it always works out exactly right.",
    fullPrediction: `[NAME], the oracle has seen your future, and it is moving very fast — which is appropriate, because you would have grown impatient with a slow future anyway.

In 2026, you will implement something significant before the committee formed to discuss implementing it has held its first alignment meeting. Twice. You will ask for forgiveness approximately four times, receive it approximately four times, and remain completely, cheerfully unrepentant. You are not reckless — you are calibrated. You have a sense for which risks are real and which are just organizational anxiety wearing a risk-management hat.

Kaltura's AI Studio will remove the last remaining friction from your workflow, which, if we're being honest, was the only reason you occasionally had to slow down. Your prediction: you will ship a complete video learning initiative in less time than it takes your org to align on thumbnail guidelines, someone will formalize your instincts into a process document (which you won't read), and at year-end, when everyone agrees the speed was right all along, you will resist — barely — the urge to say you told them so. You earned it. Say it.`,
  },

  HUMAN_AMPLIFIER: {
    name: "The Human Amplifier",
    emoji: "🫶",
    tagline: "You make every person around you measurably better.",
    shortSummary:
      "You use video and learning not to talk at people, but to genuinely, permanently change them.",
    fullPrediction: `The oracle sees you clearly, [NAME]: you are the person who remembers names, asks follow-up questions two weeks later, and somehow makes every individual on your team feel like the most important person in the room. Insufferably warm. Devastatingly effective.

In 2026, you will do what you always do — but now you'll have video working as hard as you do. Every piece of learning you build will feel like a conversation, not a broadcast, because that's simply how your brain works. The resistant team members? They'll come around. Not because of a mandate. Not because of the data. Because you made it human, and humans respond to humans first.

Kaltura's tools will help you scale that warmth in ways you'll find almost suspicious. Your prediction: at least three people will tell you that something you created changed how they think about their work, you will deflect every compliment and redirect credit to the team, and the team will quietly tell someone else it was entirely your idea. It was. They know. You know. The oracle definitely knows.`,
  },

  ONE_PERSON_STUDIO: {
    name: "The One-Person Studio",
    emoji: "🎙️",
    tagline: "A production team of one. A reach of thousands.",
    shortSummary:
      "You've cracked the code on doing more with less — and somehow making it look completely effortless.",
    fullPrediction: `[NAME], the oracle is genuinely a little in awe of you. You are running a media operation that would require a full department at any other organization, and you are doing it on what appears to be determination, cleverness, and one suspiciously good microphone.

In 2026, the gap between what you're producing and what people assume a single person can produce will become so wide that someone — probably a VP, almost certainly in a large meeting — will ask if you've outsourced it. You haven't. You've optimized everything.

Kaltura's AI Studio will feel less like a new tool and more like someone finally built the workflow you'd already invented in your head. Your prediction: you will produce more content this year than the combined output of three of your closest competitors' content teams, someone will request "your production process" as if it fits on a slide, and you will create a deck about your process that is, itself, a quiet masterclass in exactly how you do what you do. People will screenshot it. You will have already moved on to the next thing.`,
  },

  KNOWLEDGE_BUILDER: {
    name: "The Knowledge Builder",
    emoji: "🧱",
    tagline: "You're not just sharing knowledge. You're building infrastructure.",
    shortSummary:
      "While others chase trends, you're laying the foundations that will quietly outlast them all.",
    fullPrediction: `[NAME], you are playing a different game than almost everyone else in the room, and the oracle respects it deeply. While your peers optimize for this quarter, you are building for this decade. Every learning experience you create, you're not just asking whether people will complete it — you're asking whether it will still matter in three years, five years, in an organization twice its current size.

In 2026, the infrastructure you've been quietly, patiently constructing will start to surface. Others will notice that their learners can actually find things, actually remember things, actually apply things — and they'll ask what you did differently. What you did differently was think before you built.

Kaltura's platform will become the foundation layer that makes your architecture sing. Your prediction: something you built eighteen months ago will resurface as exactly the solution the business urgently needs right now, someone will call you "ahead of your time" with genuine amazement, you will silently note that the timing was entirely predictable if you simply looked far enough ahead, and you will already be eighteen months ahead of the next thing. You always are.`,
  },
};

/**
 * Returns display details for a given persona, including the full prediction
 * text with the `[NAME]` placeholder intact.
 */
export function getPersonaDetails(persona: Persona): PersonaDetails {
  return { persona, ...PERSONA_DETAILS[persona] };
}
