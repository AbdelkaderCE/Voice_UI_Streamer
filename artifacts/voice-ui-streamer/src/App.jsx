import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LayoutGrid, List, Send, Sparkles, Trash2 } from 'lucide-react'
import CardCanvas from './components/CardCanvas'
import MicButton from './components/MicButton'
import Teleprompter from './components/Teleprompter'
import { useCanvas } from './hooks/useCanvas'
import { useSpeechRecognition } from './hooks/useSpeechRecognition'
import { describeAction, MAX_CARDS, parseCommands } from './lib/commandParser'
import { parseWithGemini } from './lib/geminiService'

export default function App() {
  const { cards, layout, dispatch } = useCanvas()
  const [lastAction, setLastAction] = useState(null)
  const [typed, setTyped] = useState('')
  const [aiPending, setAiPending] = useState(0)
  const [geminiError, setGeminiError] = useState(null)

  const executeActions = useCallback(
    (actions) => {
      if (actions.length === 0) return
      actions.forEach((action) => dispatch(action))
      setLastAction({
        id: Date.now(),
        text: actions.map((action) => describeAction(action, { cardCount: cards.length })).join(' · '),
      })
    },
    [dispatch, cards.length],
  )

  const executeGeminiAction = useCallback(
    (result) => {
      const actions = []
      const availableSlots = Math.max(0, MAX_CARDS - cards.length)

      switch (result.action) {
        case 'SPAWN_CARDS': {
          const count = Math.min(
            availableSlots,
            Math.max(result.count, result.titles.length),
          )
          const titles = result.titles.slice(0, count)
          titles.forEach((title) => actions.push({ type: 'ADD_TITLED', title }))
          const untitledCount = count - titles.length
          if (untitledCount > 0) actions.push({ type: 'ADD_CARDS', count: untitledCount })
          break
        }
        case 'REMOVE_CARDS': {
          const count = Math.min(cards.length, Math.max(1, result.count))
          for (let i = 0; i < count; i += 1) actions.push({ type: 'REMOVE_LAST' })
          break
        }
        case 'CHANGE_LAYOUT':
          actions.push({ type: 'SET_LAYOUT', layout: result.layout })
          break
        case 'CLEAR_SCREEN':
          actions.push({ type: 'CLEAR' })
          break
        case 'NONE':
        default:
          break
      }

      executeActions(actions)
    },
    [cards.length, executeActions],
  )

  // The local regex parser stays on the immediate path; Gemini only sees misses.
  const handlePhrase = useCallback(
    (phrase) => {
      const actions = parseCommands(phrase)
      if (actions.length > 0) {
        console.info('[Command parser] Matched regex actions', { count: actions.length })
        setGeminiError(null)
        executeActions(actions)
        return
      }

      console.info('[Command parser] No match; using Gemini fallback', {
        transcriptCharacters: phrase.length,
      })
      setGeminiError(null)
      setAiPending((pending) => pending + 1)
      const startedAt = Date.now()
      console.info('[Gemini fallback] Request started')
      void parseWithGemini(phrase)
        .then((result) => {
          const elapsedMs = Date.now() - startedAt
          if (result.action === 'NONE') {
            console.info('[Gemini fallback] Completed without a canvas action', { elapsedMs })
            setGeminiError(
              'AI analyzed the phrase but did not find a canvas command. Try: “Create 3 cards about growth, strategy, and marketing.”',
            )
            return
          }
          console.info('[Gemini fallback] Completed', { action: result.action, elapsedMs })
          setGeminiError(null)
          executeGeminiAction(result)
        })
        .catch((error) => {
          const message =
            error instanceof Error
              ? error.message
              : 'Gemini fallback failed. Check the key restrictions and internet connection.'
          console.error('[Gemini fallback] Failed', {
            elapsedMs: Date.now() - startedAt,
            message,
          })
          setGeminiError(message)
        })
        .finally(() => setAiPending((pending) => Math.max(0, pending - 1)))
    },
    [executeActions, executeGeminiAction],
  )

  const { supported, listening, finalText, interimText, error, start, stop, reset } =
    useSpeechRecognition({ lang: 'en-US', onFinalResult: handlePhrase })

  const submitTyped = (event) => {
    event.preventDefault()
    if (!typed.trim()) return
    handlePhrase(typed)
    setTyped('')
  }

  const layoutButton = (name, Icon) => (
    <button
      type="button"
      aria-label={`${name} view`}
      onClick={() => dispatch({ type: 'SET_LAYOUT', layout: name })}
      className={`rounded-full p-2.5 transition-colors ${
        layout === name ? 'bg-white/15 text-white' : 'text-white/50 hover:bg-white/5'
      }`}
    >
      <Icon size={16} />
    </button>
  )

  return (
    <div className="mx-auto flex min-h-svh max-w-6xl flex-col gap-5 p-4 sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Voice UI Streamer</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-sm text-white/50">Speak, and watch it appear.</p>
            {aiPending > 0 && (
              <span
                role="status"
                aria-live="polite"
                className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 text-xs text-violet-200"
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-300" />
                AI Analyzing...
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-full border border-white/15 p-0.5">
            {layoutButton('grid', LayoutGrid)}
            {layoutButton('list', List)}
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: 'CLEAR' })}
            disabled={cards.length === 0}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-3 text-sm text-white/70 transition-colors hover:bg-white/5 disabled:opacity-30"
          >
            <Trash2 size={16} /> Clear cards
          </button>
          <MicButton listening={listening} onStart={start} onStop={stop} disabled={!supported} />
        </div>
      </header>

      {!supported && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
          This browser doesn&apos;t support the Web Speech API. Open the app in Chrome or Edge.
          You can still test commands with the box at the bottom.
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}
      {geminiError && (
        <div role="alert" className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
          {geminiError}
        </div>
      )}

      <section aria-label="Live transcript" className="relative h-40 sm:h-44">
        <Teleprompter finalText={finalText} interimText={interimText} listening={listening} compact />
        {(finalText || interimText) && (
          <button
            type="button"
            onClick={reset}
            className="absolute right-3 top-3 rounded-full bg-black/40 px-3 py-1 text-xs text-white/60 transition-colors hover:text-white"
          >
            Clear text
          </button>
        )}
      </section>

      <div className="h-8">
        <AnimatePresence mode="wait">
          {lastAction && (
            <motion.div
              key={lastAction.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-sm text-violet-200"
            >
              <Sparkles size={14} /> {lastAction.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <main className="flex-1">
        <CardCanvas cards={cards} layout={layout} listening={listening} />
      </main>

      <form onSubmit={submitTyped} className="flex items-center gap-2">
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder='Test a command without speaking, e.g. "show 3 cards"'
          className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-violet-400/60 focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Run command"
          className="rounded-full bg-white/10 p-3 text-white/80 transition-colors hover:bg-white/20"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
