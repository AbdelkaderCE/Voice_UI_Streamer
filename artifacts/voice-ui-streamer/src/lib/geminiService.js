const REQUEST_TIMEOUT_MS = 25_000

export async function parseWithGemini(transcript) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch('/api/gemini/parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transcript }),
      signal: controller.signal,
    })

    if (!res.ok) {
      let errMsg = `Gemini API server returned HTTP ${res.status}.`
      try {
        const errData = await res.json()
        if (errData && errData.error) {
          errMsg = errData.error
        }
      } catch {}
      throw new Error(errMsg)
    }

    const data = await res.json()
    return data
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('The API server did not respond within 25 seconds.')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
