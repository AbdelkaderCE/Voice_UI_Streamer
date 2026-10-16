// Turns a finished spoken phrase into a list of canvas actions.
// Pure functions only, so it is easy to test and to extend with new commands.

export const MAX_CARDS = 24

const NUMBER_WORDS = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  // Common mishearings when the word sits right before "cards".
  to: 2, too: 2, for: 4,
}

const NUM = `(\\d+|${Object.keys(NUMBER_WORDS).join('|')})`

function toNumber(token) {
  const t = token.toLowerCase()
  if (/^\d+$/.test(t)) return parseInt(t, 10)
  return NUMBER_WORDS[t] ?? null
}

function titleCase(text) {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
    .slice(0, 60)
}

const COMMAND_VERBS = 'show|give|display|spawn|make|create|add|put|clear|reset|wipe|switch|remove|delete'

// Each rule: a global regex plus a function that builds an action from a match.
const RULES = [
  {
    // "clear screen", "clear the canvas", "reset everything"
    regex: /\b(?:clear|reset|wipe|empty)\s+(?:the\s+|my\s+)?(?:screen|canvas|board|cards|everything)\b/gi,
    build: () => ({ type: 'CLEAR' }),
  },
  {
    // "remove the last card"
    regex: /\b(?:remove|delete)\s+(?:the\s+)?last\s+card\b/gi,
    build: () => ({ type: 'REMOVE_LAST' }),
  },
  {
    // "create a card titled Strategy"
    regex: new RegExp(
      '\\b(?:create|add|make|new)\\s+(?:a\\s+|another\\s+)?(?:new\\s+)?card\\s+(?:titled|called|named)\\s+(.+?)' +
        `(?=[.,!?;]|\\s+(?:and\\s+then|and|then)\\s+(?:${COMMAND_VERBS})\\b|$)`,
      'gi',
    ),
    build: (m) => {
      const title = titleCase(m[1])
      return title ? { type: 'ADD_TITLED', title } : null
    },
  },
  {
    // "show 3 cards", "give me five cards", "add 2 cards"
    regex: new RegExp(
      `\\b(show|give|display|spawn|make|create|add|put)(?:\\s+me)?(?:\\s+up)?\\s+(?:another\\s+)?${NUM}\\s+(?:new\\s+)?cards?\\b(?!\\s+(?:titled|called|named))`,
      'gi',
    ),
    build: (m) => {
      const count = toNumber(m[2])
      if (!count) return null
      const clamped = Math.min(count, MAX_CARDS)
      // "add" appends; the other verbs set the total number of cards.
      return m[1].toLowerCase() === 'add'
        ? { type: 'ADD_CARDS', count: clamped }
        : { type: 'SET_COUNT', count: clamped }
    },
  },
  {
    // "switch to grid view", "list layout"
    regex: /\b(grid|list)\s+(?:view|layout|mode)\b/gi,
    build: (m) => ({ type: 'SET_LAYOUT', layout: m[1].toLowerCase() }),
  },
]

/** Returns the actions found in `text`, in the order they were spoken. */
export function parseCommands(text) {
  if (!text) return []
  const found = []
  for (const rule of RULES) {
    for (const match of text.matchAll(rule.regex)) {
      const action = rule.build(match)
      if (action) found.push({ index: match.index, action })
    }
  }
  return found.sort((a, b) => a.index - b.index).map((f) => f.action)
}

/** Short human-readable label shown in the "last command" chip. */
export function describeAction(action) {
  switch (action.type) {
    case 'CLEAR':
      return 'Cleared the canvas'
    case 'REMOVE_LAST':
      return 'Removed the last card'
    case 'ADD_TITLED':
      return `Added card "${action.title}"`
    case 'ADD_CARDS':
      return `Added ${action.count} card${action.count === 1 ? '' : 's'}`
    case 'SET_COUNT':
      return `Showing ${action.count} card${action.count === 1 ? '' : 's'}`
    case 'SET_LAYOUT':
      return `Switched to ${action.layout} view`
    default:
      return ''
  }
}
