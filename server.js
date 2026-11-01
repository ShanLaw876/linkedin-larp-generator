import { createServer } from 'node:http'

const port = Number(process.env.PORT || 8787)
const model = process.env.FEATHERLESS_MODEL || 'meta-llama/Meta-Llama-3.1-8B-Instruct'
const featherlessUrl = 'https://api.featherless.ai/v1/chat/completions'

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}

function sendJson(response, status, payload) {
  response.writeHead(status, jsonHeaders)
  response.end(JSON.stringify(payload))
}

function extractJson(content) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  const candidate = fenced ? fenced[1] : content
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')

  if (start === -1 || end <= start) {
    throw new Error('The AI response did not contain a JSON post.')
  }

  return JSON.parse(candidate.slice(start, end + 1))
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
    const error = new Error('FEATHERLESS_API_KEY is not configured on the server.')
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
            content: 'You are a thoughtful LinkedIn writing assistant with a sense of humor.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 350,
      }),
      signal: controller.signal,
    })

    if (!apiResponse.ok) {
      const error = new Error(`Featherless returned HTTP ${apiResponse.status}.`)
      error.status = apiResponse.status === 429 ? 429 : 502
      throw error
    }

    const data = await apiResponse.json()
    const content = data.choices?.[0]?.message?.content
    if (typeof content !== 'string') {
      throw new Error('Featherless returned an empty response.')
    }

    return validatePost(extractJson(content))
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
  if (request.method === 'GET' && request.url === '/api/health') {
    sendJson(response, 200, { ok: true })
    return
  }

  if (request.method !== 'POST' || request.url !== '/api/generate') {
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
