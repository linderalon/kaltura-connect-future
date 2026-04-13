/**
 * Client-side Gemini prediction — used for the static GitHub Pages build.
 * Calls the Gemini API directly from the browser using NEXT_PUBLIC_GEMINI_API_KEY.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
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

Output format: You will always respond with exactly these sections in order, delimited by the exact markers shown. Do not add any text outside the markers.

[PERSONA]
...one key: VIDEO_VISIONARY | SIGNAL_IN_THE_NOISE | THE_FAST_FORWARD | HUMAN_AMPLIFIER | ONE_PERSON_STUDIO | KNOWLEDGE_BUILDER...
[/PERSONA]

[PREDICTION]
...180 words max...
[/PREDICTION]

[CARD_SUMMARY]
...20 words max...
[/CARD_SUMMARY]

[LINKEDIN_CAPTION]
...2–3 lines + hashtags...
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
    return `Create a personalized oracle prediction for this visitor based on their REAL conversation with the oracle.

VISITOR NAME: ${visitorName}

ACTUAL CONVERSATION TRANSCRIPT:
${transcript}

PERSONA ARCHETYPES — choose the single best fit for this visitor based on the transcript:
- VIDEO_VISIONARY: visual storytelling, video production, creative media, film
- SIGNAL_IN_THE_NOISE: data analytics, measurement, ROI, evidence-based decisions
- THE_FAST_FORWARD: speed, execution, implementation, action-oriented, ship fast
- HUMAN_AMPLIFIER: people leadership, team culture, engagement, warmth, coaching
- ONE_PERSON_STUDIO: solo content creator, scaling production, self-sufficient creator
- KNOWLEDGE_BUILDER: learning & development, training, long-term infrastructure, education

Instructions — output ALL four sections, no extra text outside them:
1. [PERSONA] — Exactly one key from the list above that best matches this visitor's conversation. No explanation, just the key.
2. [PREDICTION] — Write a warm, theatrical, specific prediction grounded in what ${visitorName} actually said. Reference their specific words, challenges, and aspirations. Use ${visitorName}'s name 2–3 times. End with an earned Kaltura tie-in. 180 words max.
3. [CARD_SUMMARY] — One punchy sentence (20 words max) that captures their unique destiny.
4. [LINKEDIN_CAPTION] — Written in first person as ${visitorName}. 2–3 lines + 3–4 hashtags. Authentic, not cringe.`;
  }

  return `Create a personalized oracle prediction for this visitor.

VISITOR NAME: ${visitorName}
PERSONA: ${details.name} — "${details.tagline}"

BASE PREDICTION TEMPLATE:
${baseTemplate}

Instructions — output ALL four sections:
1. [PERSONA] — The persona key that best fits this visitor.
2. [PREDICTION] — Personalize using the visitor name. 180 words max.
3. [CARD_SUMMARY] — One punchy sentence (20 words max).
4. [LINKEDIN_CAPTION] — First person, 2–3 lines + hashtags.`;
}

export async function generatePrediction(
  visitorName: string,
  persona: Persona,
  transcript: string,
): Promise<{ prediction: string; detectedPersona: Persona }> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "";
  const modelName = process.env.NEXT_PUBLIC_GEMINI_MODEL ?? "gemini-2.0-flash";

  const genAI  = new GoogleGenerativeAI(apiKey);
  const model  = genAI.getGenerativeModel({ model: modelName, systemInstruction: SYSTEM_PROMPT });
  const prompt = buildPrompt(visitorName, persona, transcript);

  const result = await model.generateContent(prompt);
  const text   = result.response.text();

  const prediction  = parseSection(text, "PREDICTION") || getPersonaDetails(persona).fullPrediction.replace(/\[NAME\]/g, visitorName);
  const rawPersona  = parseSection(text, "PERSONA").trim().toUpperCase().replace(/\s+/g, "_");
  const detectedPersona: Persona = VALID_PERSONAS.includes(rawPersona as Persona)
    ? (rawPersona as Persona)
    : persona;

  return { prediction, detectedPersona };
}
