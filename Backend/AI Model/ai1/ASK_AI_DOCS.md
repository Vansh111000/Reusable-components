# `askAi()` — drop-in AI helper for Next.js (Gemini + Groq, free tiers)

A small, provider-agnostic AI helper for Next.js (App Router). Call
`askAi(prompt)` from any client or server component and get back the
model's reply as a plain string. Swap between **Gemini** (free tier) and
**Groq** (free tier) — or between models within either provider — without
changing your calling code.

---

## 1. Why it's split into multiple files

Gemini and Groq both require a secret API key. That key can **never** be
sent to the browser, so the work is split in two:

| Layer | Runs where | Job |
|---|---|---|
| `lib/ai/askAi.js` | Client **or** server | The function you actually call. Sends a `fetch` to your own API route. No secrets here — safe to import anywhere. |
| `app/api/ask-ai/route.js` | Server only | Receives that request, picks a provider, calls it, returns the reply. |
| `lib/ai/providers/gemini.js`, `lib/ai/providers/groq.js` | Server only | The actual `fetch` calls to Google/Groq, using your API keys from `process.env`. |
| `lib/ai/config.js` | Server only | Lists available models per provider and the app-wide default. |

If you called Gemini/Groq directly from a component, your free-tier API
key would ship inside the JS bundle to every visitor. This structure
keeps the keys server-side while still giving you a one-line client call.

---

## 2. Where each file goes in your project

Drop these into a Next.js **App Router** project at these exact paths
(create the folders if they don't exist):

```
your-app/
├─ app/
│  └─ api/
│     └─ ask-ai/
│        └─ route.js          ← the API route
├─ lib/
│  └─ ai/
│     ├─ askAi.js              ← import THIS in your components
│     ├─ config.js             ← model/provider defaults
│     └─ providers/
│        ├─ gemini.js
│        └─ groq.js
└─ .env.local                  ← your real API keys (from .env.local.example)
```

If your project doesn't use the `@/` import alias, either add it in
`jsconfig.json` / `tsconfig.json`:

```json
{ "compilerOptions": { "paths": { "@/*": ["./*"] } } }
```

...or change the imports in `route.js` to relative paths
(`../../../lib/ai/providers/gemini`, etc).

**Using the Pages Router instead?** Move `route.js`'s logic into
`pages/api/ask-ai.js`, replacing `export async function POST(request)` /
`NextResponse.json(...)` with the standard `export default function handler(req, res)` /
`res.status(200).json(...)` pattern. `askAi.js` and the provider files
need no changes either way.

---

## 3. Setup

1. **Get free API keys**
   - Gemini: https://aistudio.google.com/app/apikey (Google account, no card)
   - Groq: https://console.groq.com/keys (no card)
2. Copy `.env.local.example` → `.env.local` and paste your keys in.
3. Restart `next dev` so the new env vars are picked up.

That's it — no npm packages required (both providers are called with
plain `fetch`, which Next.js's server runtime supports natively).

---

## 4. Usage

```jsx
"use client";
import { useState } from "react";
import { askAi } from "@/lib/ai/askAi";

export default function AskAiBox() {
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAsk() {
    setLoading(true);
    try {
      const result = await askAi("Give me 3 startup name ideas for a coffee app");
      setReply(result); // result is a plain string
    } catch (err) {
      setReply(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={handleAsk} disabled={loading}>
        {loading ? "Asking..." : "Ask AI"}
      </button>
      <p>{reply}</p>
    </div>
  );
}
```

This also works the same way in a Server Component / Server Action —
`askAi()` just needs `fetch` and a reachable `/api/ask-ai` route.

---

## 5. API reference

### `askAi(prompt, options?)`

| Param | Type | Required | Description |
|---|---|---|---|
| `prompt` | `string` | ✅ | The message/question to send. |
| `options.context` | `string` | – | System prompt / persona / extra instructions. |
| `options.provider` | `"gemini" \| "groq"` | – | Defaults to `AI_DEFAULT_PROVIDER` in `config.js`/`.env`. |
| `options.model` | `string` | – | Defaults to that provider's `defaultModel` in `config.js`. |
| `options.temperature` | `number` | – | Default `0.7`. |
| `options.maxTokens` | `number` | – | Default `1024`. |
| `options.raw` | `boolean` | – | If `true`, resolves with the full object instead of just text. |
| `options.endpoint` | `string` | – | Override the route path. Default `"/api/ask-ai"`. |

Shorthand: `askAi(prompt, "some context string")` is the same as
`askAi(prompt, { context: "some context string" })`.

### Return value

- **Default** (`raw` not set, or `false`): resolves to a **plain string** —
  the model's reply text. This is what `const result = await askAi(...)`
  gives you.
- **With `{ raw: true }`**: resolves to an object:
  ```js
  {
    text: "the model's reply",
    provider: "gemini",     // which provider actually answered
    model: "gemini-2.5-flash" // which model actually answered
  }
  ```
- **On failure**: throws an `Error` (network failure, missing API key,
  provider error, rate limit, etc). Always wrap calls in `try/catch`.

---

## 6. Switching models

Three ways, from broadest to most specific:

1. **Change the app-wide default** — edit `.env.local`:
   ```
   AI_DEFAULT_PROVIDER=groq
   AI_DEFAULT_MODEL=llama-3.1-8b-instant
   ```
2. **Change the code default** — edit `lib/ai/config.js`'s `defaultModel`
   per provider.
3. **Override per call**:
   ```js
   await askAi("Hello", { provider: "groq", model: "llama-3.1-8b-instant" });
   ```

Currently wired-up free-tier models (edit `config.js` to adjust as
providers change their free lineups):

| Provider | Default model | Also available |
|---|---|---|
| Gemini | `gemini-2.5-flash` | `gemini-2.5-flash-lite`, `gemini-2.0-flash-lite`, `gemini-1.5-flash` |
| Groq | `llama-3.3-70b-versatile` | `llama-3.1-8b-instant`, `gemma2-9b-it`, `mixtral-8x7b-32768` |

> Both providers' free-tier lineups and rate limits change fairly often —
> if a model in the list starts erroring, check
> [Google AI Studio](https://aistudio.google.com/) or
> [console.groq.com](https://console.groq.com/) for the current free list.

---

## 7. Notes & gotchas

- **Rate limits**: Free tiers are limited per minute/day (both providers
  return a normal HTTP error when you hit them — `askAi` will throw with
  that message, so catch it and show the user something friendly).
- **No streaming**: This version waits for the full reply. If you want
  token-by-token streaming later, the route handler can be changed to
  return a `ReadableStream` and `askAi` to read it — ask if you'd like
  that version.
- **Context/system prompt**: Gemini uses `systemInstruction`, Groq uses a
  `system` chat message — `askAi`'s `context` option maps to whichever
  is correct for the chosen provider, so you don't need to think about it.
- **Security**: Only `lib/ai/askAi.js` is safe to import into client
  components. Never import `lib/ai/providers/*` or read
  `GEMINI_API_KEY`/`GROQ_API_KEY` from client code.
