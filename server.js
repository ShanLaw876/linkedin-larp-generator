import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const port = Number(process.env.PORT || 8787)
const model = process.env.FEATHERLESS_MODEL || 'Qwen/Qwen3-8B'
const featherlessUrl = 'https://api.featherless.ai/v1/chat/completions'
const publicDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist')

const toneInstructions = {
  professional:
    'Write a serious, credible, useful post. Use a calm professional voice, a concrete lesson, and no jokes, fake metrics, dramatic claims, or corporate parody.',
  humblebrag:
    'Write a mostly credible post with light self-aware humor. Keep the accomplishment and lesson useful, but allow one modestly playful line or gentle exaggeration. Do not become absurd.',
  unhinged:
    'Write an intentionally ridiculous LinkedIn parody. Use wildly overconfident corporate language, dramatic framing, and absurd but harmless comparisons while keeping the real accomplishment recognizable. Make the joke obvious.',
}

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}

function sendJson(response, status, payload) {
  response.writeHead(status, jsonHeaders)
  response.end(JSON.stringify(payload))
}

function sanitizeUpstreamError(body) {
  return body
    .replace(/Bearer\s+[^\s"',}]+/gi, 'Bearer [redacted]')
    .replace(/(["']?(?:api[_-]?key|authorization|access[_-]?token|refresh[_-]?token|token)["']?\s*[:=]\s*["']?)[^"',}\s]+/gi, '$1[redacted]')
    .slice(0, 2_000)
}

function logUpstreamFailure(status, body) {
  console.error('[Featherless] request failed', {
    status,
    response: sanitizeUpstreamError(body),
  })
}

async function serveFrontend(pathname, response) {
  const filePath = pathname === '/' ? '/index.html' : pathname
  const safePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, '')
  const absolutePath = path.join(publicDirectory, safePath)
  const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
  }

  try {
    const content = await readFile(absolutePath)
    response.writeHead(200, {
      'Content-Type': contentTypes[path.extname(absolutePath)] || 'application/octet-stream',
    })
    response.end(content)
  } catch (error) {
    if (error.code !== 'ENOENT') {
      sendJson(response, 500, { error: 'Unable to serve the frontend.' })
      return
    }

    const index = await readFile(path.join(publicDirectory, 'index.html'))
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    response.end(index)
  }
}

function extractJson(content) {
  const withoutThinking = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  const fenced = withoutThinking.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  const candidate = fenced ? fenced[1] : withoutThinking
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')

  if (start === -1 || end <= start) {
    return null
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1))
  } catch {
    return null
  }
}

function postFromPlainText(content) {
  const cleanContent = content
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```(?:text|markdown)?/gi, '')
    .replace(/```/g, '')
    .trim()
  const paragraphs = cleanContent.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean)

  if (!cleanContent || paragraphs.length === 0) {
    throw new Error('The AI response was empty.')
  }

  return {
    hook: paragraphs[0].slice(0, 180),
    body: paragraphs.slice(1, -1).join('\n\n') || paragraphs[0],
    lesson: 'A practical reminder: consistent progress is easier to sustain when the next step is clear.',
    close: paragraphs.at(-1),
    hashtags: ['ProfessionalGrowth', 'LearningInPublic'],
  }
}

function validatePost(post) {
  const fields = ['hook', 'body', 'lesson', 'close']
  if (!post || fields.some((field) => typeof post[field] !== 'string' || !post[field].trim())) {
    throw new Error('The AI response was missing required post sections.')
  }

  if (
    !Array.isArray(post.hashtags) ||
    post.hashtags.length < 2 ||
    post.hashtags.length > 4 ||
    post.hashtags.some((hashtag) => typeof hashtag !== 'string' || !hashtag.trim())
  ) {
    throw new Error('The AI response contained invalid hashtags.')
  }

  return {
    hook: post.hook.trim(),
    body: post.body.trim(),
    lesson: post.lesson.trim(),
    close: post.close.trim(),
    hashtags: post.hashtags.map((hashtag) => hashtag.replace(/^#/, '').trim()),
  }
}

async function readBody(request) {
  let body = ''
  for await (const chunk of request) {
    body += chunk
    if (body.length > 10_000) {
      throw new Error('Request is too large.')
    }
  }
  return JSON.parse(body)
}

async function generatePost(input) {
  if (!process.env.FEATHERLESS_API_KEY) {
    const error = new Error('AI generation is currently unavailable. Please try Classic LARP.')
    error.status = 503
    throw error
  }

  const prompt = [
    'Create a credible LinkedIn post from the supplied information.',
    'Keep it under 180 words and return JSON only with these keys:',
    'hook, body, lesson, close, hashtags.',
    'The hook should be a concise opening. The body should describe the real accomplishment.',
    'The lesson should be practical and specific. The close should be a natural ending or question.',
    'Hashtags must be an array of 2 to 4 short strings without the # character.',
    'Do not invent metrics, employers, customers, awards, or outcomes.',
    `Tone direction: ${toneInstructions[input.tone]}`,
    `Tone: ${input.tone}.`,
    `Name: ${input.name}`,
    `Role: ${input.role}`,
    `Accomplishment: ${input.win}`,
  ].join('\n')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)

  try {
    const apiResponse = await fetch(featherlessUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.FEATHERLESS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a LinkedIn writing assistant. Follow the requested tone precisely.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 500,
        response_format: { type: 'json_object' },
        chat_template_kwargs: { enable_thinking: false },
      }),
      signal: controller.signal,
    })

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text()
      logUpstreamFailure(apiResponse.status, errorBody)
      const error = new Error('AI generation is currently unavailable. Please try Classic LARP.')
      error.status = apiResponse.status === 429 ? 429 : 502
      throw error
    }

    const data = await apiResponse.json()
    const message = data.choices?.[0]?.message
    const content =
      typeof message?.content === 'string'
        ? message.content
        : Array.isArray(message?.content)
          ? message.content
              .filter((part) => part && part.type === 'text')
              .map((part) => part.text)
              .join('\n')
          : ''
    if (!content.trim()) {
      throw new Error('Featherless returned an empty response.')
    }

    const parsedPost = extractJson(content) || postFromPlainText(content)
    return validatePost(parsedPost)
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Featherless took too long to respond.')
      timeoutError.status = 504
      throw timeoutError
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', 'http://localhost')
  const pathname = requestUrl.pathname

  if (request.method === 'GET' && pathname === '/api/health') {
    sendJson(response, 200, { ok: true })
    return
  }

  if (request.method === 'GET' && !pathname.startsWith('/api/')) {
    await serveFrontend(pathname, response)
    return
  }

  if (request.method !== 'POST' || pathname !== '/api/generate') {
    sendJson(response, 404, { error: 'Not found.' })
    return
  }

  try {
    const input = await readBody(request)
    const requiredFields = ['name', 'role', 'win', 'tone']
    if (
      requiredFields.some((field) => typeof input[field] !== 'string' || !input[field].trim()) ||
      !['professional', 'humblebrag', 'unhinged'].includes(input.tone)
    ) {
      sendJson(response, 400, { error: 'Name, role, accomplishment, and a valid tone are required.' })
      return
    }

    const post = await generatePost({
      name: input.name.trim().slice(0, 120),
      role: input.role.trim().slice(0, 120),
      win: input.win.trim().slice(0, 500),
      tone: input.tone,
    })
    sendJson(response, 200, { post })
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 502
    sendJson(response, status, { error: error.message || 'AI generation failed.' })
  }
})

server.listen(port, () => {
  console.log(`AI LARP API listening on http://localhost:${port}`)
})
