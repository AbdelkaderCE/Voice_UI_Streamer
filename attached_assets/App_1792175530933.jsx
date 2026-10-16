import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LayoutGrid, List, Send, Sparkles, Trash2 } from 'lucide-react'
import CardCanvas from './components/CardCanvas'
import MicButton from './components/MicButton'
import Teleprompter from './components/Teleprompter'
import { useCanvas } from './hooks/useCanvas'
import { useSpeechRecognition } from './hooks/useSpeechRecognition'
import { describeAction, parseCommands } from './lib/commandParser'

export default function App() {
  const { cards, layout, dispatch } = useCanvas()
  const [lastAction, setLastAction] = useState(null)
  const [typed, setTyped] = useState('')

  // Every finished phrase (spoken or typed) goes through the command parser.
  const handlePhrase = useCallback(
    (phrase) => {
      const actions = parseCommands(phrase)
      if (actions.length === 0) return
      actions.forEach((action) => dispatch(action))
      setLastAction({ id: Date.now(), text: actions.map(describeAction).join(' · ') })
    },
    [dispatch],
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
          <p className="text-sm text-white/50">Speak, and watch it appear.</p>
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
