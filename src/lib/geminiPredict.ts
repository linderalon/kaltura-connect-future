/**
 * Client-side Gemini prediction using the REST API directly (no SDK).
 * The SDK has Node.js compatibility issues in static browser bundles.
 * Plain fetch works in every browser and avoids all CORS/bundling issues.
 */
import { getPersonaDetails } from "./personaEngine";
import type { Persona } from "./personaEngine";

const VALID_PERSONAS: Persona[] = [
  "VIDEO_VISIONARY", "SIGNAL_IN_THE_NOISE", "THE_FAST_FORWARD",
  "HUMAN_AMPLIFIER", "ONE_PERSON_STUDIO", "KNOWLEDGE_BUILDER",
];

const SYSTEM_PROMPT = `You are the Kaltura Future Teller — an oracle who reveals the professional destiny of video and learning leaders at Kaltura Connect 2026.

Tone: warm, theatrical, funny, flattering. Never embarrassing, never condescending, never generic.

Domain: You are deeply knowledgeable about video technology, AI-powered learning, enterprise content management, digital transformation, and Kaltura's platform.

Voice rules:
- Speak DIRECTLY to the visitor — use "you" and their name naturally (2–3 times in the prediction)
- Reference their EXACT words from their answers — make it feel like genuine prophecy
- Humor should be warm and self-aware, never at the visitor's expense
- End with a Kaltura tie-in that feels EARNED through the narrative, never forced or salesy

Output format: respond with EXACTLY these four sections, delimited by the markers. No text outside the markers.

[PERSONA]
VIDEO_VISIONARY or SIGNAL_IN_THE_NOISE or THE_FAST_FORWARD or HUMAN_AMPLIFIER or ONE_PERSON_STUDIO or KNOWLEDGE_BUILDER
[/PERSONA]

[PREDICTION]
180 words max
[/PREDICTION]

[CARD_SUMMARY]
20 words max
[/CARD_SUMMARY]

[LINKEDIN_CAPTION]
2-3 lines + hashtags
[/LINKEDIN_CAPTION]`;

function parseSection(text: string, tag: string): string {
  const open  = `[${tag}]`;
  const close = `[/${tag}]`;
  const start = text.indexOf(open);
  const end   = text.indexOf(close);
  if (start === -1 || end === -1) return "";
  return text.slice(start + open.length, end).trim();
}

function buildPrompt(visitorName: string, persona: Persona, transcript: string): string {
  const details      = getPersonaDetails(persona);
  const baseTemplate = details.fullPrediction.replace(/\[NAME\]/g, visitorName);

  if (transcript?.trim() && transcript.trim().length > 50) {
    return `Create a personalized oracle prediction based on this REAL conversation.

VISITOR NAME: ${visitorName}

CONVERSATION TRANSCRIPT:
${transcript}

PERSONA CHOICES (pick the ONE that best fits what this visitor said):
- VIDEO_VISIONARY: visual storytelling, video production, creative media
- SIGNAL_IN_THE_NOISE: data analytics, measurement, ROI, evidence
- THE_FAST_FORWARD: speed, execution, ship fast, action-oriented
- HUMAN_AMPLIFIER: people, team culture, engagement, warmth
- ONE_PERSON_STUDIO: solo content creator, scaling production
- KNOWLEDGE_BUILDER: learning & development, training, infrastructure

Output the four sections using the exact markers from your instructions.`;
  }

  return `Create a personalized oracle prediction.

VISITOR NAME: ${visitorName}
CONTEXT: ${details.name} — "${details.tagline}"

BASE TEMPLATE:
${baseTemplate}

Output the four sections using the exact markers from your instructions. Choose the PERSONA that genuinely fits this visitor best.`;
}

function detectPersona(text: string, fallback: Persona): Persona {
  const rawSection = parseSection(text, "PERSONA").trim().toUpperCase().replace(/[\s-]+/g, "_");

  // 1. Exact match from [PERSONA] section
  if (VALID_PERSONAS.includes(rawSection as Persona)) return rawSection as Persona;

  // 2. Partial key match (e.g. "FAST_FORWARD" → "THE_FAST_FORWARD")
  const partial = VALID_PERSONAS.find(p =>
    p.includes(rawSection) || (rawSection && rawSection.includes(p.replace(/^THE_/, "")))
  );
  if (partial) return partial;

  // 3. Scan full response for any exact persona key
  const upper = text.toUpperCase();
  const scanMatch = VALID_PERSONAS.find(p => upper.includes(p));
  if (scanMatch) return scanMatch;

  // 4. Readable name scan ("video visionary", "fast forward", etc.)
  const lower = text.toLowerCase();
  const readableMap: [string, Persona][] = [
    ["video visionary",    "VIDEO_VISIONARY"],
    ["signal in the noise","SIGNAL_IN_THE_NOISE"],
    ["fast forward",       "THE_FAST_FORWARD"],
    ["human amplifier",    "HUMAN_AMPLIFIER"],
    ["one person studio",  "ONE_PERSON_STUDIO"],
    ["one-person studio",  "ONE_PERSON_STUDIO"],
    ["knowledge builder",  "KNOWLEDGE_BUILDER"],
  ];
  for (const [name, p] of readableMap) {
    if (lower.includes(name)) return p;
  }

  return fallback;
}

export async function generatePrediction(
  visitorName: string,
  persona: Persona,
  transcript: string,
): Promise<{ prediction: string; detectedPersona: Persona }> {
  const apiKey    = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "";
  const modelName = process.env.NEXT_PUBLIC_GEMINI_MODEL ?? "gemini-2.0-flash";
  const prompt    = buildPrompt(visitorName, persona, transcript);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents:           [{ parts: [{ text: prompt }] }],
        generationConfig:   { temperature: 0.85, maxOutputTokens: 1200 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Gemini ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text  = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? "") as string;

  const prediction     = parseSection(text, "PREDICTION") || getPersonaDetails(persona).fullPrediction.replace(/\[NAME\]/g, visitorName);
  const detectedPersona = detectPersona(text, persona);

  return { prediction, detectedPersona };
}
