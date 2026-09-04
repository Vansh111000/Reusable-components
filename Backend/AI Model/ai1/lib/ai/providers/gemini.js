/**
 * lib/ai/providers/gemini.js
 *
 * SERVER-ONLY. Talks to Google's Gemini API (free tier via an
 * Google AI Studio key: https://aistudio.google.com/app/apikey).
 *
 * Never import this file from a client component — it reads
 * process.env.GEMINI_API_KEY, which must stay on the server.
 */

const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * @param {object} args
 * @param {string} args.prompt        The user's message.
 * @param {string} [args.context]     Optional system instruction / persona.
 * @param {string} args.model         e.g. "gemini-2.5-flash"
 * @param {number} [args.temperature] 0-2, default 0.7
 * @param {number} [args.maxTokens]   default 1024
 * @returns {Promise<{text: string, raw: object}>}
 */
export async function callGemini({
  prompt,
  context,
  model,
  temperature = 0.7,
  maxTokens = 1024,
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing GEMINI_API_KEY environment variable. Get a free key at https://aistudio.google.com/app/apikey"
    );
  }

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  };

  // Gemini's generateContent endpoint accepts an optional systemInstruction
  // instead of a "system" chat role.
  if (context) {
    body.systemInstruction = { parts: [{ text: context }] };
  }

  const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      `Gemini API error (${res.status}): ${
        data?.error?.message || "Unknown error"
      }`
    );
  }

  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";

  return { text, raw: data };
}
