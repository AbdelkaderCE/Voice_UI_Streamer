import { AnimatePresence, motion } from 'framer-motion'

// Full class names (not built dynamically) so Tailwind can see them.
const ACCENTS = [
  'bg-violet-400',
  'bg-sky-400',
  'bg-emerald-400',
  'bg-amber-400',
  'bg-rose-400',
  'bg-fuchsia-400',
]

const EXAMPLES = [
  'Give me 4 cards',
  'Create a card titled Strategy',
  'Add 2 cards',
  'Switch to list view',
  'Remove the 2nd card',
  'Remove the last card',
  'Clear screen',
]

function EmptyState({ listening }) {
  return (
    <div className="flex h-full min-h-48 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/10 p-6 text-center">
      <p className="text-white/50">
        {listening ? 'Try saying one of these:' : 'Start listening, then try saying one of these:'}
      </p>
      <ul className="flex flex-wrap justify-center gap-2">
        {EXAMPLES.map((phrase) => (
          <li
            key={phrase}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white/70"
          >
            &ldquo;{phrase}&rdquo;
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function CardCanvas({ cards, layout, listening }) {
  if (cards.length === 0) return <EmptyState listening={listening} />

  const gridClass =
    layout === 'list'
      ? 'grid-cols-1'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'

  return (
    <div className={`grid gap-4 ${gridClass}`}>
      <AnimatePresence mode="popLayout">
        {cards.map((card, index) => (
          <motion.article
            key={card.id}
            layout
            initial={{ opacity: 0, y: 48, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24, delay: Math.min(index, 8) * 0.04 }}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]"
          >
            <div className={`h-1.5 ${ACCENTS[index % ACCENTS.length]}`} />
            <div className="p-5">
              <span className="text-xs font-medium uppercase tracking-wider text-white/40">
                Card {index + 1}
              </span>
              <h3 className="mt-2 text-xl font-semibold text-white">
                {card.title ?? `Card ${index + 1}`}
              </h3>
              {!card.title && (
                <p className="mt-1 text-sm text-white/35">
                  Say &ldquo;create a card titled&hellip;&rdquo; to name one.
                </p>
              )}
            </div>
          </motion.article>
        ))}
      </AnimatePresence>
    </div>
  )
}
