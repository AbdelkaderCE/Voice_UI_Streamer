import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

/** Live transcript: finished text in white, in-progress words highlighted. */
export default function Teleprompter({ finalText, interimText, listening }) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [finalText, interimText])

  const isEmpty = !finalText && !interimText

  return (
    <div className="relative h-full overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-10">
      {isEmpty ? (
        <p className="text-xl text-white/35 sm:text-2xl">
          {listening ? 'Listening… start speaking.' : 'Press Start Listening and speak. Your words will appear here.'}
        </p>
      ) : (
        <p className="text-2xl leading-relaxed sm:text-4xl sm:leading-snug">
          <span className="text-white">{finalText}</span>{' '}
          {interimText && (
            <motion.span
              key={interimText.length}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
              className="rounded bg-violet-500/20 px-1 text-violet-200"
            >
              {interimText}
            </motion.span>
          )}
        </p>
      )}
      <div ref={endRef} />
    </div>
  )
}
