import { parseGeminiCommand } from '@workspace/api-client-react'
import { MAX_CARDS } from './commandParser'

const REQUEST_TIMEOUT_MS = 25_000
const ACTIONS = ['SPAWN_CARDS', 'REMOVE_CARDS', 'CHANGE_LAYOUT', 'CLEAR_SCREEN', 'NONE']

function validateAction(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    !ACTIONS.includes(value.action) ||
    !Number.isInteger(value.count) ||
    value.count < 0 ||
    !Array.isArray(value.titles) ||
    value.titles.some((title) => typeof title !== 'string') ||
    !['grid', 'list'].includes(value.layout)
  ) {
    throw new Error('The API server returned an invalid Gemini command.')
  }

  return {
    action: value.action,
    count: Math.min(value.count, MAX_CARDS),
    titles: value.titles
      .map((title) => title.trim().slice(0, 60))
      .filter(Boolean)
      .slice(0, MAX_CARDS),
    layout: value.layout,
  }
}

export async function parseWithGemini(transcript) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const result = await parseGeminiCommand(
      { transcript },
      { signal: controller.signal },
    )
    return validateAction(result)
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('The API server did not respond within 25 seconds.')
    }

    const serverMessage = error?.data?.error
    if (typeof serverMessage === 'string') {
      throw new Error(serverMessage)
    }

    if (typeof error?.status === 'number') {
      throw new Error(`Gemini API server returned HTTP ${error.status}.`)
    }

    throw new Error('Could not reach the Gemini API server. Check that it is running.')
  } finally {
    clearTimeout(timeout)
  }
}
