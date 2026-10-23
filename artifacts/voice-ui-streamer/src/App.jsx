import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import CardCanvas from './components/CardCanvas'
import DiagramViewer from './components/DiagramViewer'
import MicButton from './components/MicButton'
import { useSpeechRecognition } from './hooks/useSpeechRecognition'
import { useCanvas } from './hooks/useCanvas'
import { describeAction, MAX_CARDS, parseCommands } from './lib/commandParser'
import { parseWithGemini } from './lib/geminiService'

/* ── icons ── */
function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1" width="6" height="6" rx="1.5" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" />
    </svg>
  )
}
function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="2" width="14" height="3" rx="1.5" />
      <rect x="1" y="7" width="14" height="3" rx="1.5" />
      <rect x="1" y="12" width="14" height="3" rx="1.5" />
    </svg>
  )
}

function LayoutBtn({ active, onClick, children, label }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        background: active ? '#111111' : 'transparent',
        color: active ? '#ffffff' : '#aaaaaa',
        border: 'none',
        borderRadius: '8px',
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'background 0.18s, color 0.18s',
      }}
    >
      {children}
    </button>
  )
}

export default function App() {
  const { cards, layout, dispatch } = useCanvas()
  const [activeDiagram, setActiveDiagram] = useState(null) // { code, explanation }
  const [lastAction, setLastAction] = useState(null)
  const [aiPending, setAiPending] = useState(0)
  const [geminiError, setGeminiError] = useState(null)

  const executeActions = useCallback(
    (actions) => {
      if (actions.length === 0) return
      actions.forEach((a) => dispatch(a))
      setLastAction({
        id: Date.now(),
        text: actions.map((a) => describeAction(a, { cardCount: cards.length })).join(' · '),
      })
    },
    [dispatch, cards.length],
  )

  const executeGeminiAction = useCallback(
    (result) => {
      if (result.action === 'DRAW_DIAGRAM' && result.diagramCode) {
        setActiveDiagram({
          code: result.diagramCode,
          explanation: result.explanation,
        })
        setLastAction({
          id: Date.now(),
          text: 'Visual diagram rendered',
        })
        return
      }

      if (result.action === 'CLEAR_SCREEN') {
        dispatch({ type: 'CLEAR' })
        setActiveDiagram(null)
        setLastAction({ id: Date.now(), text: 'Cleared the screen' })
        return
      }

      const actions = []
      const slots = Math.max(0, MAX_CARDS - cards.length)
      switch (result.action) {
        case 'SPAWN_CARDS': {
          const count = Math.min(slots, Math.max(result.count, result.titles.length))
          result.titles.slice(0, count).forEach((t) => actions.push({ type: 'ADD_TITLED', title: t }))
          const untitled = count - result.titles.slice(0, count).length
          if (untitled > 0) actions.push({ type: 'ADD_CARDS', count: untitled })
          break
        }
        case 'REMOVE_CARDS': {
          const count = Math.min(cards.length, Math.max(1, result.count))
          for (let i = 0; i < count; i++) actions.push({ type: 'REMOVE_LAST' })
          break
        }
        case 'CHANGE_LAYOUT':
          actions.push({ type: 'SET_LAYOUT', layout: result.layout })
          break
        default:
          break
      }
      executeActions(actions)
    },
    [cards.length, executeActions, dispatch],
  )

  const handlePhrase = useCallback(
    (phrase) => {
      const actions = parseCommands(phrase)
      if (actions.length > 0) {
        setGeminiError(null)
        executeActions(actions)
        return
      }

      setGeminiError(null)
      setAiPending((p) => p + 1)
      void parseWithGemini(phrase)
        .then((result) => {
          if (result.action === 'NONE') {
            setGeminiError('No command recognised. Try "draw a diagram of..." or "create 3 cards".')
            return
          }
          setGeminiError(null)
          executeGeminiAction(result)
        })
        .catch((err) => setGeminiError(err instanceof Error ? err.message : 'AI request failed.'))
        .finally(() => setAiPending((p) => Math.max(0, p - 1)))
    },
    [executeActions, executeGeminiAction],
  )

  const { supported, listening, finalText, interimText, error, start, stop, reset } =
    useSpeechRecognition({ lang: 'en-US', onFinalResult: handlePhrase })

  const hasCards = cards.length > 0
  const hasDiagram = !!activeDiagram
  const hasContent = hasCards || hasDiagram
  const isEmpty = !finalText && !interimText

  const clearAll = () => {
    dispatch({ type: 'CLEAR' })
    setActiveDiagram(null)
    reset()
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '#ffffff',
      boxSizing: 'border-box',
    }}>

      {/* ── Top bar: layout toggles & clear button ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '16px 24px',
        gap: '12px',
        minHeight: '56px',
      }}>
        {hasCards && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            background: '#f3f4f6',
            borderRadius: '10px',
            padding: '3px',
          }}>
            <LayoutBtn
              active={layout === 'grid'}
              onClick={() => dispatch({ type: 'SET_LAYOUT', layout: 'grid' })}
              label="Grid view"
            >
              <GridIcon />
            </LayoutBtn>
            <LayoutBtn
              active={layout === 'list'}
              onClick={() => dispatch({ type: 'SET_LAYOUT', layout: 'list' })}
              label="List view"
            >
              <ListIcon />
            </LayoutBtn>
          </div>
        )}

        {hasContent && (
          <button
            type="button"
            onClick={clearAll}
            style={{
              background: 'none',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '0.82rem',
              color: '#6b7280',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#111'; e.currentTarget.style.borderColor = '#111' }}
            onMouseOut={(e) => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.borderColor = '#e5e7eb' }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* ── Main Viewport ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: hasContent ? 'flex-start' : 'center',
        padding: '0 24px',
        transition: 'justify-content 0.3s ease',
      }}>

        {/* 1. Diagrams if any */}
        {hasDiagram && (
          <DiagramViewer
            code={activeDiagram.code}
            explanation={activeDiagram.explanation}
          />
        )}

        {/* 2. Cards if any */}
        {hasCards && (
          <div style={{ width: '100%', maxWidth: '960px', paddingBottom: '24px' }}>
            <CardCanvas cards={cards} layout={layout} listening={listening} />
          </div>
        )}

        {/* 3. Live Words / Spoken Transcript */}
        <AnimatePresence mode="wait">
          {isEmpty && !hasContent ? (
            <motion.p
              key="hint"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                fontSize: 'clamp(1.3rem, 3vw, 2.2rem)',
                fontWeight: 300,
                color: '#cccccc',
                textAlign: 'center',
                margin: 0,
                letterSpacing: '0.01em',
              }}
            >
              {listening ? 'Listening…' : 'Tap the mic and speak'}
            </motion.p>
          ) : (
            <motion.p
              key="words"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                fontSize: hasContent
                  ? 'clamp(0.95rem, 2vw, 1.25rem)'
                  : 'clamp(2rem, 6vw, 4.5rem)',
                fontWeight: hasContent ? 400 : 700,
                color: hasContent ? '#6b7280' : '#111111',
                textAlign: 'center',
                margin: hasContent ? '12px 0' : 0,
                lineHeight: 1.3,
                letterSpacing: hasContent ? '0' : '-0.02em',
                maxWidth: '820px',
                transition: 'font-size 0.3s ease, color 0.3s ease',
              }}
            >
              <span>{finalText}</span>
              {finalText && interimText && ' '}
              {interimText && (
                <motion.span
                  key={interimText}
                  initial={{ opacity: 0.2 }}
                  animate={{ opacity: 1 }}
                  style={{ color: '#aaaaaa' }}
                >
                  {interimText}
                </motion.span>
              )}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom Controls ── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        padding: '16px 24px 40px',
      }}>
        {(!supported || error || geminiError) && (
          <p style={{ color: '#ef4444', fontSize: '0.82rem', margin: 0, textAlign: 'center', maxWidth: '380px' }}>
            {!supported
              ? 'Web Speech API not supported — use Chrome or Edge.'
              : error || geminiError}
          </p>
        )}

        {aiPending > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ color: '#9ca3af', fontSize: '0.82rem', margin: 0 }}
          >
            Analyzing & drawing…
          </motion.p>
        )}

        <AnimatePresence mode="wait">
          {lastAction && (
            <motion.p
              key={lastAction.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ color: '#9ca3af', fontSize: '0.82rem', margin: 0 }}
            >
              ✦ {lastAction.text}
            </motion.p>
          )}
        </AnimatePresence>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '4px' }}>
          {!isEmpty && (
            <button
              type="button"
              onClick={reset}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                color: '#bbbbbb',
                padding: '8px 14px',
                borderRadius: '999px',
                transition: 'color 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.color = '#333')}
              onMouseOut={(e) => (e.currentTarget.style.color = '#bbbbbb')}
            >
              Clear text
            </button>
          )}
          <MicButton listening={listening} onStart={start} onStop={stop} disabled={!supported} />
        </div>
      </div>
    </div>
  )
}
