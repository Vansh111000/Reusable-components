/**
 * lib/ai/askAi.js
 *
 * CLIENT-SAFE. This is the function you actually import and call.
 * It holds no API keys — it just POSTs to your own /api/ask-ai route,
 * which does the real work server-side.
 *
 * ─────────────────────────────────────────────────────────────────
 * Basic usage:
 *
 *   import { askAi } from "@/lib/ai/askAi";
 *
 *   const result = await askAi("Write a haiku about the ocean");
 *   console.log(result); // -> plain string reply
 *
 * With a system context/persona:
 *
 *   const result = await askAi("Summarize this article: ...", {
 *     context: "You are a terse assistant. Reply in 2 sentences max.",
 *   });
 *
 * Choosing / switching the model per call:
 *
 *   const result = await askAi("Explain quicksort", {
 *     provider: "groq",                    // "gemini" | "groq"
 *     model: "llama-3.1-8b-instant",        // any model that provider supports
 *   });
 *
 * Getting the full response (provider/model used, not just the text):
 *
 *   const result = await askAi("Hi", { raw: true });
 *   // result -> { text, provider, model }
 * ─────────────────────────────────────────────────────────────────
 *
 * @param {string} prompt   The user's message / question.
 * @param {object|string} [options]
 *   @param {string}  [options.context]     System prompt / persona / extra context.
 *   @param {"gemini"|"groq"} [options.provider]  Defaults to server config (config.js).
 *   @param {string}  [options.model]       Defaults to that provider's default model.
 *   @param {number}  [options.temperature] 0-2, model creativity. Default 0.7.
 *   @param {number}  [options.maxTokens]   Max reply length. Default 1024.
 *   @param {boolean} [options.raw]         If true, resolves to { text, provider, model }
 *                                          instead of just the text string.
 *   @param {string}  [options.endpoint]    Override the API route path. Default "/api/ask-ai".
 *
 *   Shorthand: if `options` is a plain string, it's treated as `context`.
 *   i.e. askAi(prompt, "You are a pirate") === askAi(prompt, { context: "You are a pirate" })
 *
 * @returns {Promise<string|{text: string, provider: string, model: string}>}
 * @throws {Error} if the request fails or the API returns an error.
 */
export async function askAi(prompt, options = {}) {
  if (!prompt || typeof prompt !== "string") {
    throw new Error("askAi: `prompt` must be a non-empty string.");
  }

  const opts = typeof options === "string" ? { context: options } : options;

  const {
    context,
    provider,
    model,
    temperature,
    maxTokens,
    raw = false,
    endpoint = "/api/ask-ai",
  } = opts;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, context, provider, model, temperature, maxTokens }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || `askAi request failed with status ${res.status}`);
  }

  return raw ? data : data.text;
}
