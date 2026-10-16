import { useCallback, useEffect, useRef, useState } from 'react'

const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : undefined

/**
 * Wraps the browser Web Speech API.
 *
 * - Continuous English recognition with interim results
 * - Auto-restarts when Chrome ends the session on its own (silence, timeouts)
 * - `onFinalResult(text)` fires once per finished phrase (hook point for the Phase 2 command parser)
 */
export function useSpeechRecognition({ lang = 'en-US', onFinalResult } = {}) {
  const [listening, setListening] = useState(false)
  const [finalText, setFinalText] = useState('')
  const [interimText, setInterimText] = useState('')
  const [error, setError] = useState(null)

  const recognitionRef = useRef(null)
  const wantListeningRef = useRef(false) // what the user asked for, vs. what the engine is doing
  const networkFailuresRef = useRef(0) // consecutive "network" errors with no speech result in between
  const onFinalRef = useRef(onFinalResult)

  useEffect(() => {
    onFinalRef.current = onFinalResult
  }, [onFinalResult])

  const supported = Boolean(SpeechRecognition)

  useEffect(() => {
    if (!supported) return undefined

    const recognition = new SpeechRecognition()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => setListening(true)

    recognition.onresult = (event) => {
      // Getting results again means any earlier connection problem is over.
      networkFailuresRef.current = 0
      setError(null)
      let interim = ''
      let finalChunk = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const transcript = result[0].transcript
        if (result.isFinal) finalChunk += transcript
        else interim += transcript
      }
      setInterimText(interim)
      if (finalChunk.trim()) {
        const phrase = finalChunk.trim()
        setFinalText((prev) => (prev ? `${prev} ${phrase}` : phrase))
        onFinalRef.current?.(phrase)
      }
    }

    recognition.onerror = (event) => {
      // "no-speech" and "aborted" are routine; the auto-restart in onend handles them.
      if (event.error === 'no-speech' || event.error === 'aborted') return
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        wantListeningRef.current = false
        setError('Microphone access was blocked. Allow it in the browser address bar and try again.')
      } else if (event.error === 'network') {
        networkFailuresRef.current += 1
        setError('Speech recognition needs an internet connection in Chrome.')
        // Give up after a few failures in a row instead of retrying forever.
        if (networkFailuresRef.current >= 5) wantListeningRef.current = false
      } else if (event.error === 'audio-capture') {
        wantListeningRef.current = false
        setError('No microphone was found.')
      } else {
        setError(`Speech recognition error: ${event.error}`)
      }
    }

    recognition.onend = () => {
      setInterimText('')
      if (wantListeningRef.current) {
        // The engine stopped by itself; start it again after a short pause.
        setTimeout(() => {
          if (!wantListeningRef.current) return
          try {
            recognition.start()
          } catch {
            /* already started */
          }
        }, 250)
      } else {
        setListening(false)
      }
    }

    recognitionRef.current = recognition

    return () => {
      wantListeningRef.current = false
      recognition.onend = null
      recognition.abort()
    }
  }, [lang, supported])

  const start = useCallback(() => {
    if (!recognitionRef.current) return
    setError(null)
    networkFailuresRef.current = 0
    wantListeningRef.current = true
    try {
      recognitionRef.current.start()
    } catch {
      /* already running */
    }
  }, [])

  const stop = useCallback(() => {
    wantListeningRef.current = false
    recognitionRef.current?.stop()
  }, [])

  const reset = useCallback(() => {
    setFinalText('')
    setInterimText('')
  }, [])

  return { supported, listening, finalText, interimText, error, start, stop, reset }
}
