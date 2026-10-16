import { Trash2 } from 'lucide-react'
import MicButton from './components/MicButton'
import Teleprompter from './components/Teleprompter'
import { useSpeechRecognition } from './hooks/useSpeechRecognition'

export default function App() {
  const { supported, listening, finalText, interimText, error, start, stop, reset } =
    useSpeechRecognition({
      lang: 'en-US',
      // Phase 2: pass each finished phrase to the command parser here.
      onFinalResult: (phrase) => console.debug('[final]', phrase),
    })

  return (
    <div className="mx-auto flex min-h-svh max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Voice UI Streamer</h1>
          <p className="text-sm text-white/50">Speak, and watch it appear.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={reset}
            disabled={!finalText && !interimText}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-3 text-sm text-white/70 transition-colors hover:bg-white/5 disabled:opacity-30"
          >
            <Trash2 size={16} /> Clear
          </button>
          <MicButton listening={listening} onStart={start} onStop={stop} disabled={!supported} />
        </div>
      </header>

      {!supported && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
          This browser doesn&apos;t support the Web Speech API. Open the app in Chrome or Edge.
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      <main className="min-h-0 flex-1" style={{ minHeight: '55vh' }}>
        <Teleprompter finalText={finalText} interimText={interimText} listening={listening} />
      </main>
    </div>
  )
}
