/**
 * lib/ai/providers/groq.js
 *
 * SERVER-ONLY. Talks to Groq's OpenAI-compatible chat completions API
 * (free tier, no credit card: https://console.groq.com/keys).
 *
 * Never import this file from a client component — it reads
 * process.env.GROQ_API_KEY, which must stay on the server.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * @param {object} args
 * @param {string} args.prompt        The user's message.
 * @param {string} [args.context]     Optional system prompt / persona.
 * @param {string} args.model         e.g. "llama-3.3-70b-versatile"
 * @param {number} [args.temperature] 0-2, default 0.7
 * @param {number} [args.maxTokens]   default 1024
 * @returns {Promise<{text: string, raw: object}>}
 */
export async function callGroq({
  prompt,
  context,
  model,
  temperature = 0.7,
  maxTokens = 1024,
}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing GROQ_API_KEY environment variable. Get a free key at https://console.groq.com/keys"
    );
  }

  const messages = [];
  if (context) {
    messages.push({ role: "system", content: context });
  }
  messages.push({ role: "user", content: prompt });

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      `Groq API error (${res.status}): ${
        data?.error?.message || "Unknown error"
      }`
    );
  }

  const text = data?.choices?.[0]?.message?.content || "";

  return { text, raw: data };
}
