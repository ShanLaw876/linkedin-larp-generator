import { useMemo, useState } from 'react'
import './App.css'

const templates = {
  professional: [
    {
      label: 'The practical lesson',
      hook: 'A small operational change made a noticeable difference today.',
      body: (name, role, win) =>
        `While working as a ${role.toLowerCase()}, I focused on one concrete priority: ${win.toLowerCase()}.`,
      lesson:
        'The lesson was simple: progress becomes repeatable when we turn good intentions into specific actions.',
      close: 'What small process has helped your team make better progress?',
    },
    {
      label: 'The reflection',
      hook: 'A useful reminder from today: momentum is built, not found.',
      body: (name, role, win) =>
        `As a ${role.toLowerCase()}, I am learning to value the unglamorous work behind the result. Today, that meant ${win.toLowerCase()}.`,
      lesson:
        'The best systems make the right action easier to repeat, especially on busy days.',
      close: 'Curious what routines have made the biggest difference for you.',
    },
    {
      label: 'The team win',
      hook: 'The most useful wins are often the ones that make future work easier.',
      body: (name, role, win) =>
        `Today, I made time for ${win.toLowerCase()}. It was a small step, but it created more clarity for the work ahead.`,
      lesson:
        'Sustainable progress is less about heroic effort and more about removing friction for the next person.',
      close: 'A good reminder to invest in the work that compounds.',
    },
    {
      label: 'The honest update',
      hook: 'Not every milestone needs to be dramatic to be worth sharing.',
      body: (name, role, win) =>
        `One meaningful step from my week as a ${role.toLowerCase()}: ${win.toLowerCase()}.`,
      lesson:
        'Small improvements are still improvements. Naming them helps us see where momentum is actually coming from.',
      close: 'On to the next iteration.',
    },
  ],
  humblebrag: [
    {
      label: 'The useful share',
      hook: 'Sharing a small win in case it is useful to someone else.',
      body: (name, role, win) =>
        `I finally got around to ${win.toLowerCase()} after putting it off for longer than I would like to admit.`,
      lesson:
        'The fix was not complicated: make the first step smaller, then make it part of the routine.',
      close: 'Sometimes the boring answer is the one that works.',
    },
    {
      label: 'The quiet progress',
      hook: 'A quiet win from this week that I am choosing to notice.',
      body: (name, role, win) =>
        `I made progress on ${win.toLowerCase()} without waiting for the perfect plan or the perfect day.`,
      lesson:
        'Consistency is easy to underestimate because it rarely arrives with a dramatic before-and-after.',
      close: 'What is one small thing you are making progress on right now?',
    },
    {
      label: 'The honest lesson',
      hook: 'A reminder I needed today: done is data.',
      body: (name, role, win) =>
        `I used to overthink work like ${win.toLowerCase()}. Today I tried a simpler approach and learned more by doing.`,
      lesson:
        'A first attempt gives you something a perfect plan never can: information about what to improve next.',
      close: 'Still learning, still iterating.',
    },
  ],
  unhinged: [
    {
      label: 'The industry disruptor',
      hook: 'I challenged the status quo today.',
      body: (name, role, win) =>
        `The old way said to ignore ${win.toLowerCase()}. I chose a more radical path: dealing with it.`,
      lesson:
        'The real disruption was discovering that basic follow-through is still a competitive advantage.',
      close: 'The future is surprisingly well organized.',
    },
    {
      label: 'The founder lesson',
      hook: 'No big announcement. Just one decision that moved the work forward.',
      body: (name, role, win) =>
        `As a ${role.toLowerCase()}, I made the boldest move in business today: ${win.toLowerCase()}.`,
      lesson:
        'Vision matters. So does opening the document, sending the message, and doing the next useful thing.',
      close: 'Build boldly. Check your calendar first.',
    },
    {
      label: 'The origin story',
      hook: 'At 6:04 AM, I made a choice that changed everything.',
      body: (name, role, win) =>
        `No team. No budget. Just ${name}, a ${role.toLowerCase()}, and the audacity to attempt ${win.toLowerCase()}.`,
      lesson:
        'You do not need permission to become the case study.',
      close: 'The industry may never recover.',
    },
    {
      label: 'The plot twist',
      hook: 'Plot twist: the breakthrough was doing the obvious thing consistently.',
      body: (name, role, win) =>
        `I expected a complicated answer. Instead, I spent part of today on ${win.toLowerCase()}.`,
      lesson:
        'Sometimes the most disruptive strategy is reducing the number of tabs, steps, and excuses.',
      close: 'Revolutionary? No. Effective? Also yes.',
    },
  ],
}

const hashtagsByTone = {
  professional: ['Leadership', 'ContinuousImprovement', 'WorkplaceLearning'],
  humblebrag: ['ProfessionalGrowth', 'LearningInPublic', 'Progress'],
  unhinged: ['Leadership', 'Innovation', 'Disruption'],
}

const toneOptions = [
  { id: 'professional', label: 'Professional', emoji: '💼', hint: 'Boardroom ready' },
  { id: 'humblebrag', label: 'Humblebrag', emoji: '🤝', hint: 'Casually impressive' },
  { id: 'unhinged', label: 'Absolutely unhinged', emoji: '🚀', hint: 'Founder mode' },
]

const starterForm = {
  name: '',
  role: '',
  win: '',
  tone: 'professional',
}

function makeStats(tone, seed) {
  const multipliers = { professional: 1, humblebrag: 1.4, unhinged: 2.2 }
  const multiplier = multipliers[tone]
  const offset = seed % 7

  return {
    impressions: Math.round((3200 + offset * 317) * multiplier).toLocaleString(),
    reactions: Math.round((94 + offset * 13) * multiplier).toLocaleString(),
    comments: Math.round((18 + offset * 4) * multiplier).toLocaleString(),
    reposts: Math.round((7 + offset) * multiplier).toLocaleString(),
  }
}

function App() {
  const [form, setForm] = useState(starterForm)
  const [post, setPost] = useState(null)
  const [copyStatus, setCopyStatus] = useState('Copy post')
  const [error, setError] = useState('')
  const [mode, setMode] = useState('classic')
  const [isGenerating, setIsGenerating] = useState(false)

  const selectedTone = toneOptions.find((tone) => tone.id === form.tone)
  const initials = useMemo(
    () =>
      form.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('') || 'YOU',
    [form.name],
  )

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setError('')
  }

  function createClassicPost(name, role, win) {
    const options = templates[form.tone]
    const template = options[Math.floor(Math.random() * options.length)]
    const seed = name.length + role.length + win.length + Date.now()

    return {
      ...template,
      name,
      role,
      win,
      hashtags: hashtagsByTone[form.tone],
      stats: makeStats(form.tone, seed),
      generatedAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      source: 'classic',
    }
  }

  async function generateAiPost(name, role, win) {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role, win, tone: form.tone }),
    })
    const responseText = await response.text()
    let data = {}

    if (responseText.trim()) {
      try {
        data = JSON.parse(responseText)
      } catch {
        throw new Error('The AI service returned an invalid response. Please try Classic LARP.')
      }
    }

    if (!response.ok) {
      throw new Error(data.error || 'AI generation failed. Classic LARP is still available.')
    }

    const generated = data.post
    if (!generated || typeof generated !== 'object') {
      throw new Error('The AI service returned an incomplete response. Please try Classic LARP.')
    }

    return {
      ...generated,
      name,
      role,
      win,
      body: () => generated.body,
      stats: makeStats(form.tone, Date.now()),
      generatedAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      source: 'ai',
    }
  }

  async function generatePost(event) {
    event.preventDefault()
    const name = form.name.trim()
    const role = form.role.trim()
    const win = form.win.trim()

    if (!name || !role || !win) {
      setError('Your personal brand needs all three fields before it can scale.')
      return
    }

    setError('')
    setIsGenerating(true)

    try {
      const generatedPost =
        mode === 'ai'
          ? await generateAiPost(name, role, win)
          : createClassicPost(name, role, win)
      setPost(generatedPost)
      setCopyStatus('Copy post')
    } catch (generationError) {
      setError(generationError.message)
      setPost(null)
    } finally {
      setIsGenerating(false)
    }
  }

  function useClassicFallback() {
    setMode('classic')
    setError('')
    if (form.name.trim() && form.role.trim() && form.win.trim()) {
      setPost(createClassicPost(form.name.trim(), form.role.trim(), form.win.trim()))
      setCopyStatus('Copy post')
    }
  }

  async function copyPost() {
    if (!post) return

    const text = `${post.hook}\n\n${post.body(post.name, post.role, post.win)}\n\n${post.lesson}\n\n${post.close}\n\n${post.hashtags.map((hashtag) => `#${hashtag}`).join(' ')}`

    try {
      await navigator.clipboard.writeText(text)
      setCopyStatus('Copied to clipboard ✓')
      window.setTimeout(() => setCopyStatus('Copy post'), 2200)
    } catch {
      setCopyStatus('Copy failed — try again')
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="LinkedIn LARP Generator home">
          <span className="brand-mark">✦</span>
          <span>LinkedIn <strong>LARP</strong></span>
        </a>
        <span className="header-note">For people who are open to being perceived as innovative.</span>
      </header>

      <section className="intro">
        <p className="eyebrow">PERSONAL BRANDING, BUT MAKE IT FICTION</p>
        <h1>Turn a tiny win into a <span>big announcement.</span></h1>
        <p className="intro-copy">
          Generate the LinkedIn post your accomplishment deserves. Or at least the one your
          network will politely clap for.
        </p>
      </section>

      <section className="workspace">
        <form className="generator-panel" onSubmit={generatePost}>
          <div className="panel-heading">
            <div>
              <p className="section-kicker">01 / YOUR LORE</p>
              <h2>Set the scene</h2>
            </div>
            <span className="required-note">* required</span>
          </div>

          <div className="mode-toggle" aria-label="Generation mode">
            <button
              className={mode === 'classic' ? 'active' : ''}
              type="button"
              onClick={() => { setMode('classic'); setError('') }}
            >
              Classic LARP
            </button>
            <button
              className={mode === 'ai' ? 'active' : ''}
              type="button"
              onClick={() => { setMode('ai'); setError('') }}
            >
              AI LARP <span>beta</span>
            </button>
          </div>

          <label>
            Your name *
            <input name="name" value={form.name} onChange={updateField} placeholder="Alex Founder" />
          </label>
          <label>
            Your job title *
            <input
              name="role"
              value={form.role}
              onChange={updateField}
              placeholder="Chief Vibes Officer"
            />
          </label>
          <label>
            The tiny thing you did *
            <textarea
              name="win"
              value={form.win}
              onChange={updateField}
              placeholder="Finally replied to an email from Tuesday"
              rows="3"
            />
          </label>

          <div className="tone-group">
            <div className="tone-heading">
              <span>Choose your tone</span>
              <span className="tone-value">{selectedTone.label}</span>
            </div>
            <div className="tone-options">
              {toneOptions.map((tone) => (
                <label className={`tone-option ${form.tone === tone.id ? 'selected' : ''}`} key={tone.id}>
                  <input
                    type="radio"
                    name="tone"
                    value={tone.id}
                    checked={form.tone === tone.id}
                    onChange={updateField}
                  />
                  <span className="tone-emoji">{tone.emoji}</span>
                  <span>
                    <strong>{tone.label}</strong>
                    <small>{tone.hint}</small>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="form-error" role="alert">
              <p>{error}</p>
              {mode === 'ai' && (
                <button type="button" onClick={useClassicFallback}>Use Classic LARP instead</button>
              )}
            </div>
          )}
          <button className="generate-button" type="submit" disabled={isGenerating}>
            {isGenerating ? 'Consulting the personal brand...' : mode === 'ai' ? 'Generate with Featherless AI' : 'Generate thought leadership'}
            <span>→</span>
          </button>
          <p className="fine-print">
            {mode === 'ai' ? 'AI-powered writing. Your key stays server-side.' : 'Template-powered writing. No data storage. Just confidence.'}
          </p>
        </form>

        <div className="result-area">
          <div className="result-heading">
            <div>
              <p className="section-kicker">02 / THE LARP</p>
              <h2>Your viral moment</h2>
            </div>
            {post && <span className="live-pill"><i /> {post.source === 'ai' ? 'Featherless AI' : 'Classic LARP'}</span>}
          </div>

          {post ? (
            <article className="post-card">
              <div className="post-topline">
                <div className="avatar">{initials}</div>
                <div className="profile-info">
                  <strong>{post.name}</strong>
                  <span>{post.role} · 1st</span>
                  <small>{post.generatedAt} · <span aria-label="Visible to everyone">🌐</span></small>
                </div>
                <button className="more-button" type="button" aria-label="More options">•••</button>
              </div>
              <div className="post-content">
                <p className="post-hook">{post.hook}</p>
                <p>{post.body(post.name, post.role, post.win)}</p>
                <p>{post.lesson}</p>
                <p>{post.close}</p>
                <p className="hashtags">{post.hashtags.map((hashtag) => `#${hashtag}`).join(' ')}</p>
              </div>
              <div className="engagement-summary">
                <span><b>●</b> <b>♥</b> {post.stats.reactions} reactions</span>
                <span>{post.stats.comments} comments · {post.stats.reposts} reposts</span>
              </div>
              <div className="engagement-actions">
                <span>♡ Like</span>
                <span>▱ Comment</span>
                <span>↗ Repost</span>
                <span>✈ Send</span>
              </div>
              <div className="reach-meter">
                <span>Thought leadership density</span>
                <strong>{post.stats.impressions} impressions</strong>
                <div><i /></div>
              </div>
              <button className="copy-button" type="button" onClick={copyPost}>{copyStatus}</button>
            </article>
          ) : (
            <div className="empty-card">
              <span className="empty-icon">✦</span>
              <h3>Your audience is waiting.</h3>
              <p>Fill out the lore on the left and we’ll turn your mundane achievement into a movement.</p>
              <span className="empty-caption">* Results may be emotionally accurate.</span>
            </div>
          )}
        </div>
      </section>

      <footer>
        <span>LinkedIn LARP Generator</span>
        <span>Built for the chronically online <b>✦</b></span>
      </footer>
    </main>
  )
}

export default App
