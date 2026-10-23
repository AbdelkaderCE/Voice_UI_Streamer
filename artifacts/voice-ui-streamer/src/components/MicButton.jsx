import { Mic, Square } from 'lucide-react'
import { motion } from 'framer-motion'

export default function MicButton({ listening, onStart, onStop, disabled }) {
  return (
    <button
      type="button"
      onClick={listening ? onStop : onStart}
      disabled={disabled}
      style={{
        position: 'relative',
        width: '68px',
        height: '68px',
        borderRadius: '50%',
        backgroundColor: '#000000',
        color: '#ffffff',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseOver={(e) => { if (!disabled) e.currentTarget.style.transform = 'scale(1.07)' }}
      onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      {/* Pulse ring while listening */}
      {listening && (
        <motion.span
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            backgroundColor: '#000000',
          }}
          initial={{ scale: 1, opacity: 0.35 }}
          animate={{ scale: 1.8, opacity: 0 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
      <span style={{ position: 'relative', display: 'flex' }}>
        {listening ? <Square size={24} fill="currentColor" /> : <Mic size={24} />}
      </span>
    </button>
  )
}
