# LinkedIn LARP Generator

A frontend-only React/Vite hackathon project that turns a real accomplishment into a polished LinkedIn post with just enough self-awareness.

## Features

- Name, job title, and accomplishment inputs
- Professional, humblebrag, and absolutely unhinged tones
- 11 varied post templates with practical lessons and tone-specific hashtags
- Randomized fictional engagement stats
- Responsive LinkedIn-style result card
- Copy-to-clipboard support
- Classic LARP fallback when AI is unavailable
- Optional Featherless AI generation through a server-side API

## Run locally

```bash
npm install
npm run api
```

In a second terminal, run the Vite frontend:

```bash
npm run dev
```

Classic LARP works without environment variables. To enable AI LARP locally, set the API
variables before starting the API server:

```bash
FEATHERLESS_API_KEY=your-key \
FEATHERLESS_MODEL=meta-llama/Meta-Llama-3.1-8B-Instruct \
npm run api
```

## Validate and build

```bash
npm run lint
npm run build
```

The app can be deployed as a Render web service. Use `npm run build` as the build command and
`npm run start` as the start command. The Node server serves both the built frontend and the
`/api` endpoint.

## AI LARP mode

Classic LARP remains the default, deterministic generator and fallback. AI LARP uses Featherless
AI's OpenAI-compatible chat-completions API to turn the same inputs into a more personalized
LinkedIn post.

### Planned architecture

```text
React static frontend
        |
        | POST /api/generate
        v
Render web service / server function
        |
        | Authorization: Bearer $FEATHERLESS_API_KEY
        v
Featherless AI
```

- The browser will never receive `FEATHERLESS_API_KEY`.
- The server will call `https://api.featherless.ai/v1/chat/completions`.
- The initial model target will be `meta-llama/Meta-Llama-3.1-8B-Instruct`, subject to
  confirmation that it is enabled for the LARPHacks account. The model should be configurable
  with `FEATHERLESS_MODEL` so it can be changed without a code update.
- The server will send the user's accomplishment, role, selected tone, and optional classic
  template style as structured prompt data.
- The prompt will require a credible post under 180 words, one specific takeaway, and 2–4
  relevant hashtags. It will forbid invented metrics, employers, customers, awards, or outcomes.
- Timeouts, non-2xx responses, malformed model output, missing configuration, and rate limits will
  return explicit errors. The frontend will offer Classic LARP instead of a success-shaped AI
  fallback.

Implemented locally:

- `POST /api/generate` validates input, calls Featherless, and validates the structured response.
- The React app includes Classic LARP and AI LARP modes using the same result card.
- AI loading and error states are explicit, with a one-click Classic LARP fallback.
- API timeouts, missing configuration, rate limits, non-2xx responses, and malformed output are
  reported without exposing the Featherless key.

For Render, create a web service using:

- Build command: `npm run build`
- Start command: `npm run start`
- Environment variable: `FEATHERLESS_API_KEY`
- Optional environment variable: `FEATHERLESS_MODEL`

Do not use the old static-site publish directory setup for AI mode; static hosting cannot run the
server-side Featherless proxy.

Required Render environment variables:

```text
FEATHERLESS_API_KEY=your-key
FEATHERLESS_MODEL=meta-llama/Meta-Llama-3.1-8B-Instruct
```
