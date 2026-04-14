// Netlify serverless function — calls Gemini server-side.
// The API key stays in Netlify env vars, never in the browser bundle.
// Add GEMINI_API_KEY to Netlify: Site settings → Environment variables

const VALID_PERSONAS = [
  "VIDEO_VISIONARY","SIGNAL_IN_THE_NOISE","THE_FAST_FORWARD",
  "HUMAN_AMPLIFIER","ONE_PERSON_STUDIO","KNOWLEDGE_BUILDER",
];

const SYSTEM_PROMPT = `You are the Kaltura Future Teller — an oracle who reveals the professional destiny of video and learning leaders at Kaltura Connect 2026.

Tone: warm, theatrical, funny, flattering. Never embarrassing, never condescending, never generic.

Output format: respond with EXACTLY these sections using the exact markers. No text outside the markers.

[NAME]
The visitor's first name — extract from the transcript, or use the provided name
[/NAME]

[PERSONA]
One of: VIDEO_VISIONARY | SIGNAL_IN_THE_NOISE | THE_FAST_FORWARD | HUMAN_AMPLIFIER | ONE_PERSON_STUDIO | KNOWLEDGE_BUILDER
[/PERSONA]

[PREDICTION]
180 words max — warm, specific, references what the visitor actually said. Use their name 2-3 times.
[/PREDICTION]

[CARD_SUMMARY]
One punchy sentence, 20 words max.
[/CARD_SUMMARY]

[LINKEDIN_CAPTION]
2-3 lines + 3-4 hashtags. First person as the visitor.
[/LINKEDIN_CAPTION]`;

function parseSection(text, tag) {
  const open  = `[${tag}]`;
  const close = `[/${tag}]`;
  const start = text.indexOf(open);
  const end   = text.indexOf(close);
  if (start === -1 || end === -1) return "";
  return text.slice(start + open.length, end).trim();
}

function detectPersona(text, fallback) {
  // Only look inside the [PERSONA] section — never scan the full text
  // (full-text scan picks up persona names from the prediction itself)
  const section = parseSection(text, "PERSONA").toUpperCase().replace(/[\s-]+/g,"_");

  // Exact match
  if (VALID_PERSONAS.includes(section)) return section;

  // Partial match (e.g. "FAST_FORWARD" → "THE_FAST_FORWARD")
  const partial = VALID_PERSONAS.find(p =>
    p.includes(section) || (section && section.includes(p.replace(/^THE_/,"")))
  );
  if (partial) return partial;

  // Readable name inside the section only
  const lower = section.toLowerCase();
  const map = [
    ["video visionary","VIDEO_VISIONARY"],["signal in the noise","SIGNAL_IN_THE_NOISE"],
    ["fast forward","THE_FAST_FORWARD"],["human amplifier","HUMAN_AMPLIFIER"],
    ["one person studio","ONE_PERSON_STUDIO"],["one-person studio","ONE_PERSON_STUDIO"],
    ["knowledge builder","KNOWLEDGE_BUILDER"],
  ];
  for (const [name, p] of map) { if (lower.includes(name)) return p; }

  return fallback;
}

function buildPrompt(visitorName, persona, transcript) {
  if (transcript && transcript.trim().length > 50) {
    return `Create a personalized oracle prediction based on this REAL conversation.

VISITOR NAME: ${visitorName}

CONVERSATION TRANSCRIPT:
${transcript}

PERSONA ARCHETYPES — choose the ONE that best matches what this visitor said:
- VIDEO_VISIONARY: visual storytelling, video production, creative media, film
- SIGNAL_IN_THE_NOISE: data analytics, measurement, ROI, evidence-based decisions
- THE_FAST_FORWARD: speed, execution, ship fast, action-oriented
- HUMAN_AMPLIFIER: people, team culture, engagement, warmth, coaching
- ONE_PERSON_STUDIO: solo content creator, scaling production
- KNOWLEDGE_BUILDER: learning & development, training, infrastructure, education

Use the exact section markers from your instructions. Pick the persona based ONLY on what was discussed.`;
  }

  return `Create a personalized oracle prediction for ${visitorName}.
Choose the PERSONA that genuinely best fits a professional in video/learning technology.
Use the exact section markers from your instructions.`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const { visitorName, persona, transcript } = JSON.parse(event.body || "{}");
    const apiKey    = process.env.GEMINI_API_KEY || "";
    const modelName = process.env.GEMINI_MODEL   || "gemini-2.0-flash";

    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "GEMINI_API_KEY not set" }) };
    }

    const prompt = buildPrompt(visitorName || "Guest", persona || "VIDEO_VISIONARY", transcript || "");

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
      const errText = await res.text();
      return { statusCode: res.status, headers, body: JSON.stringify({ error: errText }) };
    }

    const data            = await res.json();
    const text            = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const prediction      = parseSection(text, "PREDICTION") || `The oracle sees great things ahead for you, ${visitorName}.`;
    const detectedPersona = detectPersona(text, persona || "VIDEO_VISIONARY");
    const extractedName   = parseSection(text, "NAME").trim() || visitorName || "Guest";

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ prediction, detectedPersona, extractedName }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
