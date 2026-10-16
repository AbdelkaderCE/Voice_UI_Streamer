import { useReducer } from 'react'
import { MAX_CARDS } from '../lib/commandParser'

const initialState = { cards: [], layout: 'grid', nextId: 1 }

function makeCards(count, startId, title = null) {
  return Array.from({ length: count }, (_, i) => ({ id: startId + i, title }))
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_COUNT': {
      const target = Math.min(action.count, MAX_CARDS)
      if (target <= state.cards.length) {
        return { ...state, cards: state.cards.slice(0, target) }
      }
      const missing = target - state.cards.length
      return {
        ...state,
        cards: [...state.cards, ...makeCards(missing, state.nextId)],
        nextId: state.nextId + missing,
      }
    }
    case 'ADD_CARDS': {
      const room = MAX_CARDS - state.cards.length
      const count = Math.min(action.count, room)
      if (count <= 0) return state
      return {
        ...state,
        cards: [...state.cards, ...makeCards(count, state.nextId)],
        nextId: state.nextId + count,
      }
    }
    case 'ADD_TITLED': {
      if (state.cards.length >= MAX_CARDS) return state
      return {
        ...state,
        cards: [...state.cards, ...makeCards(1, state.nextId, action.title)],
        nextId: state.nextId + 1,
      }
    }
    case 'REMOVE_LAST':
      return { ...state, cards: state.cards.slice(0, -1) }
    case 'REMOVE_AT': {
      // `position` is 1-based, the way people say it ("remove the 5th card").
      const index = action.position - 1
      if (index < 0 || index >= state.cards.length) return state
      return { ...state, cards: state.cards.filter((_, i) => i !== index) }
    }
    case 'CLEAR':
      return { ...state, cards: [] }
    case 'SET_LAYOUT':
      return { ...state, layout: action.layout }
    default:
      return state
  }
}

/** Holds the cards and layout that voice commands change. */
export function useCanvas() {
  const [state, dispatch] = useReducer(reducer, initialState)
  return { cards: state.cards, layout: state.layout, dispatch }
}
