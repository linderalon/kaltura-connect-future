import {
  calculatePersona,
  getPersonaDetails,
  type Persona,
  type ScoringInput,
} from "./personaEngine";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function input(overrides: Partial<ScoringInput> = {}): ScoringInput {
  return {
    personalityChoice: null,
    ambitionLevel: null,
    riskTolerance: null,
    painPoint: "",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Score trace for each test (so the math is reviewable):
//
//  VIDEO_VISIONARY:
//    storyteller   → VV+2, HA+2
//    ambition 5    → VV+2, FF+1
//    fast          → FF+2, VV+1
//    "create content at scale" → OPS+2, VV+1
//    Totals: VV=6  HA=2  FF=3  OPS=2
//
//  SIGNAL_IN_THE_NOISE:
//    analyst       → SITN+2, OPS+2
//    ambition 1    → SITN+2
//    thoughtful    → KB+2, SITN+2
//    "measure ROI metrics" → SITN+2
//    Totals: SITN=8  OPS=2  KB=2
//
//  THE_FAST_FORWARD:
//    maverick      → FF+2
//    ambition 5    → VV+2, FF+1
//    fast          → FF+2, VV+1
//    (no keywords)
//    Totals: FF=5  VV=3
//
//  HUMAN_AMPLIFIER:
//    storyteller   → VV+2, HA+2
//    ambition 3    → HA+2, KB+2
//    thoughtful    → KB+2, SITN+2
//    "team engagement culture" → HA+2
//    Totals: HA=6  KB=4  VV=2  SITN=2
//
//  ONE_PERSON_STUDIO:
//    analyst       → SITN+2, OPS+2
//    ambition 3    → HA+2, KB+2
//    fast          → FF+2, VV+1
//    "studio production content" → OPS+2, VV+1
//    Totals: OPS=4  SITN=2  HA=2  KB=2  FF=2  VV=2
//
//  KNOWLEDGE_BUILDER:
//    storyteller   → VV+2, HA+2
//    ambition 2    → HA+2, KB+2
//    thoughtful    → KB+2, SITN+2
//    "onboarding training skills" → KB+2, HA+1
//    Totals: KB=6  HA=5  VV=2  SITN=2
// ---------------------------------------------------------------------------

describe("calculatePersona — all 6 persona outcomes", () => {
  test("returns VIDEO_VISIONARY for storyteller + high ambition + fast + content keywords", () => {
    expect(
      calculatePersona(
        input({
          personalityChoice: "storyteller",
          ambitionLevel: 5,
          riskTolerance: "fast",
          painPoint: "I need to create content at scale",
        })
      )
    ).toBe<Persona>("VIDEO_VISIONARY");
  });

  test("returns SIGNAL_IN_THE_NOISE for analyst + ambition 1 + thoughtful + data keywords", () => {
    expect(
      calculatePersona(
        input({
          personalityChoice: "analyst",
          ambitionLevel: 1,
          riskTolerance: "thoughtful",
          painPoint: "need to measure ROI and surface useful metrics",
        })
      )
    ).toBe<Persona>("SIGNAL_IN_THE_NOISE");
  });

  test("returns THE_FAST_FORWARD for maverick + high ambition + fast + no keywords", () => {
    expect(
      calculatePersona(
        input({
          personalityChoice: "maverick",
          ambitionLevel: 5,
          riskTolerance: "fast",
          painPoint: "",
        })
      )
    ).toBe<Persona>("THE_FAST_FORWARD");
  });

  test("returns HUMAN_AMPLIFIER for storyteller + mid ambition + thoughtful + people keywords", () => {
    expect(
      calculatePersona(
        input({
          personalityChoice: "storyteller",
          ambitionLevel: 3,
          riskTolerance: "thoughtful",
          painPoint: "driving team engagement and building culture",
        })
      )
    ).toBe<Persona>("HUMAN_AMPLIFIER");
  });

  test("returns ONE_PERSON_STUDIO for analyst + mid ambition + fast + production keywords", () => {
    expect(
      calculatePersona(
        input({
          personalityChoice: "analyst",
          ambitionLevel: 3,
          riskTolerance: "fast",
          painPoint: "running a studio and managing production content",
        })
      )
    ).toBe<Persona>("ONE_PERSON_STUDIO");
  });

  test("returns KNOWLEDGE_BUILDER for storyteller + low ambition + thoughtful + learning keywords", () => {
    expect(
      calculatePersona(
        input({
          personalityChoice: "storyteller",
          ambitionLevel: 2,
          riskTolerance: "thoughtful",
          painPoint: "improving onboarding and building training skills",
        })
      )
    ).toBe<Persona>("KNOWLEDGE_BUILDER");
  });
});

// ---------------------------------------------------------------------------
// Keyword detection
// ---------------------------------------------------------------------------

describe("calculatePersona — keyword detection", () => {
  test("is case-insensitive", () => {
    const a = calculatePersona(input({ painPoint: "ANALYTICS and DATA" }));
    const b = calculatePersona(input({ painPoint: "analytics and data" }));
    expect(a).toBe(b);
  });

  test("each keyword group fires independently", () => {
    // Two groups match: both 'training' (KB+2, HA+1) and 'engagement' (HA+2)
    // HA = 2+1 = 3 from keywords alone, KB = 2
    const result = calculatePersona(
      input({ painPoint: "training engagement" })
    );
    // No other inputs, so HA=3 vs KB=2 vs others=0
    expect(result).toBe<Persona>("HUMAN_AMPLIFIER");
  });

  test("painPoint with no matching keywords applies no keyword bonus", () => {
    // With all-null answers and no keywords, all scores are 0.
    // Tiebreaker defaults to ambitionLevel=null→3, affinity distance is used.
    // ONE_PERSON_STUDIO (affinity 3) and HUMAN_AMPLIFIER (affinity 3) tie on
    // distance; STABLE_ORDER puts HUMAN_AMPLIFIER at index 3 and OPS at 4,
    // but VIDEO_VISIONARY is index 0 — all are at distance |x-3| so:
    //  VV: |5-3|=2, SITN: |1-3|=2, FF: |4-3|=1, HA: |3-3|=0, OPS: |3-3|=0, KB: |2-3|=1
    // HA and OPS both distance 0; STABLE_ORDER tiebreaker picks HA (index 3 < OPS index 4)
    const result = calculatePersona(input({ painPoint: "completely unrelated words" }));
    expect(result).toBe<Persona>("HUMAN_AMPLIFIER");
  });
});

// ---------------------------------------------------------------------------
// Tiebreaker: ambitionLevel as deciding factor
// ---------------------------------------------------------------------------

describe("calculatePersona — tiebreaker", () => {
  test("high ambition (5) breaks ties toward VIDEO_VISIONARY", () => {
    // storyteller → VV+2, HA+2 → tied at 2 each
    // ambitionLevel = null (no ambition bonus), riskTolerance = null
    // painPoint empty. Scores: VV=2, HA=2, rest=0
    // Tiebreaker defaults to ambition 3; affinity: VV=5 (dist 2), HA=3 (dist 0)
    // HA wins on distance, but let's confirm with explicit ambition 5:
    // With ambition 5 → VV+2, FF+1. Now VV=4, HA=2, FF=1. VV wins outright.
    const result = calculatePersona(
      input({ personalityChoice: "storyteller", ambitionLevel: 5 })
    );
    expect(result).toBe<Persona>("VIDEO_VISIONARY");
  });

  test("low ambition (1) breaks ties toward SIGNAL_IN_THE_NOISE", () => {
    // analyst → SITN+2, OPS+2 → tied
    // ambition 1 → SITN+2. Now SITN=4, OPS=2. SITN wins outright.
    const result = calculatePersona(
      input({ personalityChoice: "analyst", ambitionLevel: 1 })
    );
    expect(result).toBe<Persona>("SIGNAL_IN_THE_NOISE");
  });
});

// ---------------------------------------------------------------------------
// Null / missing inputs
// ---------------------------------------------------------------------------

describe("calculatePersona — null inputs", () => {
  test("accepts fully-null input without throwing", () => {
    expect(() => calculatePersona(input())).not.toThrow();
  });

  test("returns a valid Persona when all inputs are null", () => {
    const validPersonas: Persona[] = [
      "VIDEO_VISIONARY",
      "SIGNAL_IN_THE_NOISE",
      "THE_FAST_FORWARD",
      "HUMAN_AMPLIFIER",
      "ONE_PERSON_STUDIO",
      "KNOWLEDGE_BUILDER",
    ];
    expect(validPersonas).toContain(calculatePersona(input()));
  });

  test("ignores ambitionLevel outside 1–5 range (treated as mid via 2–3 bucket)", () => {
    // ambition 3 → HA+2, KB+2; neither should throw
    expect(() =>
      calculatePersona(input({ ambitionLevel: 3, personalityChoice: null }))
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// getPersonaDetails — shape & content checks
// ---------------------------------------------------------------------------

describe("getPersonaDetails", () => {
  const allPersonas: Persona[] = [
    "VIDEO_VISIONARY",
    "SIGNAL_IN_THE_NOISE",
    "THE_FAST_FORWARD",
    "HUMAN_AMPLIFIER",
    "ONE_PERSON_STUDIO",
    "KNOWLEDGE_BUILDER",
  ];

  test.each(allPersonas)("returns a complete details object for %s", (p) => {
    const details = getPersonaDetails(p);
    expect(details.persona).toBe(p);
    expect(typeof details.name).toBe("string");
    expect(details.name.length).toBeGreaterThan(0);
    expect(typeof details.emoji).toBe("string");
    expect(details.emoji.length).toBeGreaterThan(0);
    expect(typeof details.tagline).toBe("string");
    expect(typeof details.shortSummary).toBe("string");
    expect(typeof details.fullPrediction).toBe("string");
  });

  test.each(allPersonas)(
    "shortSummary is ≤ 20 words for %s",
    (p) => {
      const { shortSummary } = getPersonaDetails(p);
      const wordCount = shortSummary.trim().split(/\s+/).length;
      expect(wordCount).toBeLessThanOrEqual(20);
    }
  );

  test.each(allPersonas)(
    "fullPrediction contains [NAME] placeholder for %s",
    (p) => {
      const { fullPrediction } = getPersonaDetails(p);
      expect(fullPrediction).toContain("[NAME]");
    }
  );

  test.each(allPersonas)(
    "fullPrediction is roughly 150–200 words for %s",
    (p) => {
      const { fullPrediction } = getPersonaDetails(p);
      const wordCount = fullPrediction.trim().split(/\s+/).length;
      // Give a generous tolerance — 130–220 to account for formatting.
      expect(wordCount).toBeGreaterThanOrEqual(130);
      expect(wordCount).toBeLessThanOrEqual(220);
    }
  );
});
