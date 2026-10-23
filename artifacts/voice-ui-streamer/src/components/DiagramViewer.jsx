import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { motion } from 'framer-motion'

mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  themeVariables: {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    primaryColor: '#ffffff',
    primaryTextColor: '#111827',
    primaryBorderColor: '#e5e7eb',
    lineColor: '#4b5563',
    secondaryColor: '#f9fafb',
    tertiaryColor: '#f3f4f6',
    nodeBorder: '#e5e7eb',
    mainBkg: '#ffffff',
  },
})

export default function DiagramViewer({ code, explanation }) {
  const containerRef = useRef(null)
  const [svgHtml, setSvgHtml] = useState('')
  const [renderError, setRenderError] = useState(null)

  useEffect(() => {
    let isMounted = true

    if (!code) {
      setSvgHtml('')
      return
    }

    const renderDiagram = async () => {
      try {
        setRenderError(null)
        const id = `mermaid-svg-${Date.now()}`
        const cleanCode = code
          .replace(/^```mermaid\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```$/i, '')
          .trim()

        const { svg } = await mermaid.render(id, cleanCode)
        if (isMounted) {
          setSvgHtml(svg)
        }
      } catch (err) {
        if (isMounted) {
          console.error('Mermaid render error:', err)
          setRenderError('Could not render diagram. Showing raw outline instead.')
        }
      }
    }

    renderDiagram()

    return () => {
      isMounted = false
    }
  }, [code])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        padding: '24px 0',
      }}
    >
      {/* Diagram Canvas */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          maxWidth: '850px',
          minHeight: '200px',
          maxHeight: '55vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'auto',
          padding: '16px',
        }}
      >
        {renderError ? (
          <div style={{ color: '#ef4444', fontSize: '0.9rem', textAlign: 'center' }}>
            {renderError}
            <pre style={{
              marginTop: '10px',
              padding: '12px',
              background: '#f9fafb',
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: '#374151',
              textAlign: 'left',
              overflowX: 'auto',
            }}>
              {code}
            </pre>
          </div>
        ) : (
          <div
            dangerouslySetInnerHTML={{ __html: svgHtml }}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
            }}
          />
        )}
      </div>

      {/* Explanation text directly underneath */}
      {explanation && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          style={{
            maxWidth: '680px',
            margin: '0 auto',
            fontSize: '1.05rem',
            lineHeight: 1.6,
            color: '#374151',
            textAlign: 'center',
            fontWeight: 400,
          }}
        >
          {explanation}
        </motion.p>
      )}
    </motion.div>
  )
}
