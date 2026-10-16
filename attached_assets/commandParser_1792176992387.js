// Turns a finished spoken phrase into a list of canvas actions.
// Pure functions only, so it is easy to test and to extend with new commands.

export const MAX_CARDS = 24

const STRICT_NUMBERS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
}

const NUMBER_WORDS = {
  ...STRICT_NUMBERS,
  a: 1, an: 1,
  // Common mishearings when the word sits right before "cards".
  to: 2, too: 2, for: 4,
}

const ORDINALS = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8,
  ninth: 9, tenth: 10, eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14,
  fifteenth: 15, sixteenth: 16, seventeenth: 17, eighteenth: 18, nineteenth: 19, twentieth: 20,
}

// The recognizer often hears "card" as "cart" or "car".
const CARD_NOUN = '(?:card|cart|car)s?'
const NUM = `(\\d+|${Object.keys(NUMBER_WORDS).join('|')})`
const STRICT_NUM = `(\\d+|${Object.keys(STRICT_NUMBERS).join('|')})`
const ORD = `(\\d+(?:st|nd|rd|th)|${Object.keys(ORDINALS).join('|')})`
// "titled" is often heard as "title", "entitled" or even "name".
const TITLED = '(?:titled|title|entitled|called|named|name)'

function toNumber(token) {
  const t = token.toLowerCase()
  if (/^\d+$/.test(t)) return parseInt(t, 10)
  return NUMBER_WORDS[t] ?? null
}

function ordinalToNumber(token) {
  const t = token.toLowerCase()
  const digits = t.match(/^(\d+)(?:st|nd|rd|th)$/)
  if (digits) return parseInt(digits[1], 10)
  return ORDINALS[t] ?? null
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
    regex: new RegExp(`\\b(?:remove|delete)\\s+(?:the\\s+)?last\\s+${CARD_NOUN}\\b`, 'gi'),
    build: () => ({ type: 'REMOVE_LAST' }),
  },
  {
    // "remove the 5th card", "delete the first card"
    regex: new RegExp(`\\b(?:remove|delete)\\s+(?:the\\s+)?${ORD}\\s+${CARD_NOUN}\\b`, 'gi'),
    build: (m) => {
      const position = ordinalToNumber(m[1])
      return position ? { type: 'REMOVE_AT', position } : null
    },
  },
  {
    // "remove card 3", "delete card number two"
    regex: new RegExp(`\\b(?:remove|delete)\\s+(?:the\\s+)?(?:card|cart)\\s+(?:number\\s+)?${STRICT_NUM}\\b`, 'gi'),
    build: (m) => {
      const position = toNumber(m[1])
      return position ? { type: 'REMOVE_AT', position } : null
    },
  },
  {
    // "create a card titled Strategy"
    regex: new RegExp(
      `\\b(?:create|add|make|new)\\s+(?:a\\s+|another\\s+)?(?:new\\s+)?${CARD_NOUN.replace('s?', '')}\\s+${TITLED}\\s+(.+?)` +
        `(?=[.,!?;]|\\s+(?:and\\s+then|and|then)\\s+(?:${COMMAND_VERBS})\\b|$)`,
      'gi',
    ),
    build: (m) => {
      const title = titleCase(m[1])
      return title ? { type: 'ADD_TITLED', title } : null
    },
  },
  {
    // "show 3 cards", "give me five cards", "add 2 cards", "add card"
    regex: new RegExp(
      `\\b(show|give|display|spawn|make|create|add|put)(?:\\s+me)?(?:\\s+up)?\\s+(?:another\\s+)?(?:${NUM}\\s+)?(?:new\\s+)?(${CARD_NOUN})\\b(?!\\s+${TITLED})`,
      'gi',
    ),
    build: (m) => {
      const verb = m[1].toLowerCase()
      const noun = m[3].toLowerCase()
      // "car" is only accepted as a mishearing of "card" after a real number ("create 6 cars"),
      // never after "a" or on its own, so "make a car" in normal talking is ignored.
      if (/^cars?$/.test(noun) && !(m[2] && !/^(?:a|an)$/i.test(m[2]))) return null
      let count
      if (m[2]) {
        count = toNumber(m[2])
      } else {
        // No number said: only "add/create/make card" means one card, and only if
        // the word really was card/cart (a bare "car" is probably just talking).
        if (!['add', 'create', 'make'].includes(verb)) return null
        if (!/^(?:card|cart)$/.test(noun)) return null
        count = 1
      }
      if (!count) return null
      const clamped = Math.min(count, MAX_CARDS)
      // "add", "a card" and a bare "card" append one or more; "show/give/create N cards"
      // sets the total number of cards.
      const isArticle = /^(?:a|an)$/i.test(m[2] ?? '')
      return verb === 'add' || !m[2] || isArticle
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
export function describeAction(action, { cardCount = null } = {}) {
  switch (action.type) {
    case 'CLEAR':
      return 'Cleared the canvas'
    case 'REMOVE_LAST':
      return cardCount === 0 ? 'No cards to remove' : 'Removed the last card'
    case 'REMOVE_AT':
      return cardCount !== null && action.position > cardCount
        ? `There is no card ${action.position}`
        : `Removed card ${action.position}`
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
