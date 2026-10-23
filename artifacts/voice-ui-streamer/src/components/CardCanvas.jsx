import { AnimatePresence, motion } from 'framer-motion'

const ACCENT_COLORS = [
  '#a78bfa', // violet
  '#38bdf8', // sky
  '#34d399', // emerald
  '#fbbf24', // amber
  '#fb7185', // rose
  '#e879f9', // fuchsia
]

const EXAMPLES = [
  'Create 4 cards',
  'Add a card titled Strategy',
  'Switch to list view',
  'Switch to grid view',
  'Remove the last card',
  'Clear screen',
]

function EmptyState() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      padding: '48px 24px',
      textAlign: 'center',
    }}>
      <p style={{ color: '#cccccc', margin: 0, fontSize: '0.95rem' }}>
        Try saying one of these:
      </p>
      <ul style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '8px',
        listStyle: 'none',
        padding: 0,
        margin: 0,
      }}>
        {EXAMPLES.map((phrase) => (
          <li key={phrase} style={{
            padding: '6px 14px',
            borderRadius: '999px',
            border: '1px solid #e5e7eb',
            fontSize: '0.85rem',
            color: '#6b7280',
            background: '#f9fafb',
          }}>
            "{phrase}"
          </li>
        ))}
      </ul>
    </div>
  )
}

function Card({ card, index, layout }) {
  const accentColor = ACCENT_COLORS[index % ACCENT_COLORS.length]
  const isList = layout === 'list'

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 32, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.88 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24, delay: Math.min(index, 8) * 0.05 }}
      style={{
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        background: '#ffffff',
        boxShadow: '0 1px 8px rgba(0,0,0,0.07)',
        overflow: 'hidden',
        width: isList ? '100%' : undefined,
      }}
    >
      {/* Accent bar */}
      <div style={{ height: '4px', background: accentColor }} />
      <div style={{ padding: isList ? '14px 20px' : '20px', display: 'flex', alignItems: isList ? 'center' : 'flex-start', gap: '10px' }}>
        <span style={{
          fontSize: '0.7rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: accentColor,
          whiteSpace: 'nowrap',
        }}>
          {index + 1}
        </span>
        <div>
          <h3 style={{
            margin: 0,
            fontSize: isList ? '1rem' : '1.15rem',
            fontWeight: 600,
            color: '#111111',
            lineHeight: 1.3,
          }}>
            {card.title ?? `Card ${index + 1}`}
          </h3>
          {!card.title && !isList && (
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#aaaaaa' }}>
              Say "create a card titled…" to name it
            </p>
          )}
        </div>
      </div>
    </motion.article>
  )
}

export default function CardCanvas({ cards, layout, listening }) {
  const isGrid = layout !== 'list'

  return (
    <div style={{ width: '100%' }}>
      <AnimatePresence mode="popLayout">
        {cards.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <EmptyState listening={listening} />
          </motion.div>
        ) : (
          <motion.div
            key="cards"
            layout
            style={{
              display: 'grid',
              gap: '12px',
              gridTemplateColumns: isGrid
                ? 'repeat(auto-fill, minmax(220px, 1fr))'
                : '1fr',
            }}
          >
            <AnimatePresence mode="popLayout">
              {cards.map((card, index) => (
                <Card key={card.id} card={card} index={index} layout={layout} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
