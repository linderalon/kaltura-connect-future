/**
 * Prediction client — calls the Netlify serverless function in production,
 * falls back to direct Gemini REST call on localhost.
 */
import { getPersonaDetails } from "./personaEngine";
import type { Persona } from "./personaEngine";

const VALID_PERSONAS: Persona[] = [
  "VIDEO_VISIONARY", "SIGNAL_IN_THE_NOISE", "THE_FAST_FORWARD",
  "HUMAN_AMPLIFIER", "ONE_PERSON_STUDIO", "KNOWLEDGE_BUILDER",
];

export async function generatePrediction(
  visitorName: string,
  persona: Persona,
  transcript: string,
): Promise<{ prediction: string; detectedPersona: Persona }> {

  // ── Production: call the Netlify serverless function ──────────────────────
  // The function keeps the API key server-side and handles persona detection.
  const isLocalhost = typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  if (!isLocalhost) {
    try {
      console.log("[predict] calling /.netlify/functions/predict");
      const res = await fetch("/.netlify/functions/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorName, persona, transcript }),
      });

      console.log("[predict] function status:", res.status);

      if (res.ok) {
        const data = await res.json() as { prediction: string; detectedPersona: string };
        console.log("[predict] success, persona:", data.detectedPersona);
        const detectedPersona = VALID_PERSONAS.includes(data.detectedPersona as Persona)
          ? (data.detectedPersona as Persona)
          : persona;
        return { prediction: data.prediction, detectedPersona };
      } else {
        const errBody = await res.text();
        console.error("[predict] function error:", res.status, errBody);
      }
    } catch (e) {
      console.error("[predict] fetch failed:", e);
    }
  }

  // ── Local dev: call Gemini REST directly ───────────────────────────────────
  const apiKey    = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "";
  const modelName = process.env.NEXT_PUBLIC_GEMINI_MODEL   ?? "gemini-2.0-flash";

  const SYSTEM = `You are the Kaltura Future Teller — an oracle at Kaltura Connect 2026.
Output EXACTLY these sections using the exact markers, no text outside them:
[PERSONA]VIDEO_VISIONARY or SIGNAL_IN_THE_NOISE or THE_FAST_FORWARD or HUMAN_AMPLIFIER or ONE_PERSON_STUDIO or KNOWLEDGE_BUILDER[/PERSONA]
[PREDICTION]180 words max[/PREDICTION]
[CARD_SUMMARY]20 words max[/CARD_SUMMARY]
[LINKEDIN_CAPTION]2-3 lines + hashtags[/LINKEDIN_CAPTION]`;

  const prompt = transcript?.trim().length > 50
    ? `Visitor: ${visitorName}. Transcript: ${transcript}. Pick the best persona and write the prediction.`
    : `Visitor: ${visitorName}. Write a warm oracle prediction and pick the best persona.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM }] },
        contents:           [{ parts: [{ text: prompt }] }],
        generationConfig:   { temperature: 0.85, maxOutputTokens: 1200 },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini ${res.status}`);

  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? "") as string;

  const parseSection = (t: string, tag: string) => {
    const s = t.indexOf(`[${tag}]`), e = t.indexOf(`[/${tag}]`);
    return s === -1 || e === -1 ? "" : t.slice(s + tag.length + 2, e).trim();
  };

  const prediction     = parseSection(text, "PREDICTION") || getPersonaDetails(persona).fullPrediction.replace(/\[NAME\]/g, visitorName);
  const rawSection     = parseSection(text, "PERSONA").toUpperCase().replace(/[\s-]+/g, "_");
  const detectedPersona: Persona = VALID_PERSONAS.includes(rawSection as Persona)
    ? (rawSection as Persona) : persona;

  return { prediction, detectedPersona };
}
