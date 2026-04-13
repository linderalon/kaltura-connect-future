import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getPersonaDetails } from "@/lib/personaEngine";
import type { Persona } from "@/lib/personaEngine";
import type { SessionAnswers } from "@/context/FutureTellerContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PredictRequest {
  answers: SessionAnswers;
  persona: Persona;
  visitorName: string;
  /** Full conversation transcript from the avatar session — used as primary
   *  prediction context when available. */
  transcript?: string;
}

// ---------------------------------------------------------------------------
// Gemini client
// Model: gemini-2.0-flash — fast, high-quality, ideal for real-time booth use.
// Change GEMINI_MODEL in .env.local to override (e.g. gemini-1.5-pro).
// ---------------------------------------------------------------------------

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

// ---------------------------------------------------------------------------
// Prompts  (identical logic to the previous Anthropic version)
// ---------------------------------------------------------------------------

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

const PERSONALITY_LABELS: Record<string, string> = {
  analyst:     "The Analyst — shows data, leads with evidence",
  storyteller: "The Storyteller — leads with narrative and emotion",
  maverick:    "The Maverick — ships first, apologizes later",
};

const RISK_LABELS: Record<string, string> = {
  fast:       "move fast and break things",
  thoughtful: "move thoughtfully and build things that last",
};

function buildUserPrompt(
  visitorName: string,
  persona: Persona,
  answers: SessionAnswers,
  transcript?: string,
): string {
  const details      = getPersonaDetails(persona);
  const baseTemplate = details.fullPrediction.replace(/\[NAME\]/g, visitorName);

  // When a real conversation transcript is available, use it as the primary source
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

  // Fallback: questionnaire answers
  const painPoint    = answers.painPoint?.trim()  || "unlocking their team's full potential";
  const vision       = answers.vision?.trim()     || "transforming how their organization learns";
  const personality  = answers.personalityChoice
    ? (PERSONALITY_LABELS[answers.personalityChoice] ?? answers.personalityChoice)
    : "undefined";
  const risk      = answers.riskTolerance
    ? (RISK_LABELS[answers.riskTolerance] ?? answers.riskTolerance)
    : "balanced";
  const ambition  = answers.ambitionLevel ?? 3;

  return `Create a personalized oracle prediction for this visitor.

VISITOR NAME: ${visitorName}
PERSONA: ${details.name} — "${details.tagline}"

BASE PREDICTION TEMPLATE (use as the backbone, but personalize with their actual answers):
${baseTemplate}

THEIR ACTUAL ANSWERS:
- Biggest challenge: "${painPoint}"
- Vision for 2026: "${vision}"
- Personality style: ${personality}
- Ambition level: ${ambition}/5
- Risk tolerance: ${risk}

Instructions:
1. [PREDICTION] — Personalize the base template using their exact words from the challenge and vision. Use ${visitorName}'s name 2–3 times. End with an earned Kaltura reference. 180 words max.
2. [CARD_SUMMARY] — One punchy sentence (20 words max) for the physical prediction card they take home.
3. [LINKEDIN_CAPTION] — Written in first person as ${visitorName}. 2–3 lines + 3–4 hashtags. Authentic, shareable, not cringe.`;
}

// ---------------------------------------------------------------------------
// Fallback — used when the API call fails
// ---------------------------------------------------------------------------

function buildFallback(
  visitorName: string,
  persona: Persona
): { prediction: string; cardSummary: string; linkedInCaption: string } {
  const details = getPersonaDetails(persona);
  return {
    prediction:      details.fullPrediction.replace(/\[NAME\]/g, visitorName),
    cardSummary:     details.shortSummary,
    linkedInCaption: `Just had my future revealed at #KalturaConnect 2026. The oracle says I'm ${details.name}. "${details.tagline}" I'm choosing to take this as a compliment.\n\n#FutureTeller #VideoStrategy #DigitalTransformation #KalturaConnect`,
  };
}

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

const encoder = new TextEncoder();

function sseEvent(
  controller: ReadableStreamDefaultController,
  data: Record<string, unknown>
): void {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

// ---------------------------------------------------------------------------
// Section parser
// ---------------------------------------------------------------------------

function parseSection(text: string, tag: string): string {
  const open  = `[${tag}]`;
  const close = `[/${tag}]`;
  const start = text.indexOf(open);
  const end   = text.indexOf(close);
  if (start === -1 || end === -1) return "";
  return text.slice(start + open.length, end).trim();
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<Response> {
  let body: PredictRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON in request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { answers, persona, visitorName, transcript } = body;

  if (!persona || !visitorName?.trim()) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: persona, visitorName" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        const userPrompt = buildUserPrompt(visitorName, persona, answers, transcript);

        // Initialise Gemini client on each request (stateless)
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
        const model = genAI.getGenerativeModel({
          model: MODEL,
          systemInstruction: SYSTEM_PROMPT,
        });

        const result = await model.generateContentStream(userPrompt);

        // Accumulate full response; stream only the [PREDICTION] section live.
        let fullText         = "";
        let predictionStart  = -1;  // index just after [PREDICTION] tag
        let predictionEnd    = -1;  // index at start of [/PREDICTION] tag
        let streamedUpTo     = 0;

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (!text) continue;

          fullText += text;

          // Detect PREDICTION opening
          if (predictionStart === -1) {
            const tagIdx = fullText.indexOf("[PREDICTION]");
            if (tagIdx !== -1) {
              predictionStart = tagIdx + "[PREDICTION]".length;
              streamedUpTo    = predictionStart;
            }
          }

          // Stream PREDICTION content until closing tag
          if (predictionStart !== -1 && predictionEnd === -1) {
            const closeIdx = fullText.indexOf("[/PREDICTION]");
            if (closeIdx !== -1) {
              predictionEnd = closeIdx;
              const remaining = fullText.slice(streamedUpTo, predictionEnd);
              if (remaining) sseEvent(controller, { type: "delta", text: remaining });
              streamedUpTo = predictionEnd;
            } else {
              const newText = fullText.slice(streamedUpTo);
              if (newText) {
                sseEvent(controller, { type: "delta", text: newText });
                streamedUpTo = fullText.length;
              }
            }
          }
        }

        // Parse all sections from the complete response
        const prediction      = parseSection(fullText, "PREDICTION")      || buildFallback(visitorName, persona).prediction;
        const cardSummary     = parseSection(fullText, "CARD_SUMMARY")     || buildFallback(visitorName, persona).cardSummary;
        const linkedInCaption = parseSection(fullText, "LINKEDIN_CAPTION") || buildFallback(visitorName, persona).linkedInCaption;

        // Persona determined by Gemini from transcript (or fall back to the passed-in one)
        const VALID_PERSONAS: Persona[] = [
          "VIDEO_VISIONARY", "SIGNAL_IN_THE_NOISE", "THE_FAST_FORWARD",
          "HUMAN_AMPLIFIER", "ONE_PERSON_STUDIO", "KNOWLEDGE_BUILDER",
        ];
        const rawPersona    = parseSection(fullText, "PERSONA").trim().toUpperCase().replace(/\s+/g, "_");
        const detectedPersona: Persona = (VALID_PERSONAS.includes(rawPersona as Persona)
          ? rawPersona as Persona
          : persona);

        sseEvent(controller, { type: "complete", prediction, cardSummary, linkedInCaption, persona: detectedPersona });
        controller.close();

      } catch (err) {
        // API failure — stream the base persona prediction as graceful fallback
        const fallback = buildFallback(visitorName, persona);
        sseEvent(controller, { type: "delta",    text: fallback.prediction });
        sseEvent(controller, { type: "complete", ...fallback, persona });
        controller.close();
        console.error("[/api/predict] Gemini call failed:", err);
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
