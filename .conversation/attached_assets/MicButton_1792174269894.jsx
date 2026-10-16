import { Mic, Square } from 'lucide-react'
import { motion } from 'framer-motion'

/** Start/stop toggle with a pulsing ring while the mic is live. */
export default function MicButton({ listening, onStart, onStop, disabled }) {
  return (
    <button
      type="button"
      onClick={listening ? onStop : onStart}
      disabled={disabled}
      className={`relative inline-flex items-center gap-3 rounded-full px-6 py-3 text-base font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        listening ? 'bg-rose-500 hover:bg-rose-400' : 'bg-violet-500 hover:bg-violet-400'
      }`}
    >
      {listening && (
        <motion.span
          className="absolute inset-0 rounded-full bg-rose-500"
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 1.35, opacity: 0 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
      <span className="relative inline-flex items-center gap-3">
        {listening ? <Square size={18} fill="currentColor" /> : <Mic size={18} />}
        {listening ? 'Stop Listening' : 'Start Listening'}
      </span>
    </button>
  )
}
