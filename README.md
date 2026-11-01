# LinkedIn LARP Generator

Turn a real accomplishment into a polished LinkedIn post with just enough self-awareness.
Classic LARP uses local templates; AI LARP uses Featherless AI for more personalized writing.

## Features

- Name, job title, accomplishment, and tone inputs
- Professional, humblebrag, and absolutely unhinged tones
- Classic LARP mode with 11 deterministic templates
- AI LARP mode powered by Featherless AI
- Practical takeaways and tone-specific hashtags
- Fictional engagement stats and LinkedIn-style preview
- Copy post to clipboard
- Download the generated preview as a crisp `linkedin-larp-post.png`
- Explicit AI loading/error states with one-click Classic LARP fallback

## Local development

Install dependencies:

```bash
npm install
```

Classic LARP works without environment variables. Start the API server:

```bash
npm run api
```

In a second terminal, start the Vite development server:

```bash
npm run dev
```

To enable AI LARP locally, configure Featherless before starting the API:

```bash
FEATHERLESS_API_KEY=your-key \
FEATHERLESS_MODEL=Qwen/Qwen3-8B \
npm run api
```

The browser never receives the Featherless API key.

## Validation and production build

```bash
npm run lint
npm run build
```

The production server serves both the built React app and the API:

```bash
npm run start
```

Useful endpoints:

- `GET /` — built React application
- `GET /api/health` — API health check
- `POST /api/generate` — Featherless AI generation

## AI LARP architecture

```text
React frontend
      |
      | POST /api/generate
      v
Node.js server
      |
      | Bearer token from FEATHERLESS_API_KEY
      v
Featherless AI
```

The server calls Featherless's OpenAI-compatible endpoint:

```text
https://api.featherless.ai/v1/chat/completions
```

The default model is `Qwen/Qwen3-8B`, configurable with `FEATHERLESS_MODEL`. The server validates
inputs, applies the selected tone direction, normalizes JSON or plain-text model responses, and
returns a consistent post shape. It also handles timeouts, rate limits, non-2xx responses,
malformed output, and missing configuration without exposing credentials.

Tone behavior:

- **Professional:** serious, credible, and useful
- **Humblebrag:** mostly credible with light self-aware humor
- **Absolutely unhinged:** intentionally absurd LinkedIn parody

## Deploy on Render

Create a **Web Service**, not a Static Site:

- Build command: `npm run build`
- Start command: `npm run start`
- Environment variable: `FEATHERLESS_API_KEY`
- Optional environment variable: `FEATHERLESS_MODEL`

Recommended model variable:

```text
FEATHERLESS_MODEL=Qwen/Qwen3-8B
```

Keep the API key only in Render's environment settings.
