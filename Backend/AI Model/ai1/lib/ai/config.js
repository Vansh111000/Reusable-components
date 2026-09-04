/**
 * lib/ai/config.js
 *
 * Single place to configure which providers/models askAi() knows about.
 * Change the `defaultModel` values here (or the AI_DEFAULT_* env vars) to
 * switch models globally without touching any component that calls askAi().
 */

export const AI_PROVIDERS = {
  gemini: {
    label: "Google Gemini",
    // Free-tier default (Google AI Studio key, no billing required).
    defaultModel: "gemini-3.6-flash",
    // Other free-tier Gemini models you can pass as `model` instead:
    models: [
      "gemini-3.6-flash",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.0-flash-lite",
      "gemini-1.5-flash",
    ],
  },
  groq: {
    label: "Groq",
    // Free-tier default (no credit card required).
    defaultModel: "openai/gpt-oss-20b",
    // Other free-tier Groq models you can pass as `model` instead:
    models: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "gemma2-9b-it",
      "mixtral-8x7b-32768",
    ],
  },
};

// Used by the API route when the caller doesn't specify a provider/model.
// Override with env vars so you can change the default per-environment
// (e.g. groq in dev, gemini in prod) without a code change.
export const DEFAULT_PROVIDER = process.env.AI_DEFAULT_PROVIDER || "gemini";

export const DEFAULT_MODEL =
  process.env.AI_DEFAULT_MODEL ||
  AI_PROVIDERS[DEFAULT_PROVIDER]?.defaultModel;
