import { ref, readonly } from 'vue'
import { fetchEventSource } from '@microsoft/fetch-event-source'

export interface UseSSECallbacks<TEventMap extends Record<string, unknown>> {
  onMessage: <E extends keyof TEventMap & string>(event: E, data: TEventMap[E]) => void
  onError?: (error: Error) => void
  onComplete?: () => void
}

export function useSSE<TEventMap extends Record<string, unknown>>() {
  const isStreaming = ref(false)
  let abortController: AbortController | null = null

  async function start(url: string, body: object, callbacks: UseSSECallbacks<TEventMap>) {
    isStreaming.value = true
    abortController = new AbortController()

    try {
      const token = localStorage.getItem('access_token')

      await fetchEventSource(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal: abortController.signal,
        openWhenHidden: true,

        onopen: async (response) => {
          if (!response.ok) {
            const text = await response.text()
            throw new Error(`HTTP ${response.status}: ${text}`)
          }
        },

        onmessage: (ev) => {
          if (!ev.event || !ev.data) return
          try {
            const data = JSON.parse(ev.data) as TEventMap[keyof TEventMap]
            callbacks.onMessage(ev.event as keyof TEventMap & string, data)
          } catch (e) {
            console.warn('[SSE] 解析失败:', ev.data, e)
          }
        },

        onerror: (err) => {
          // 抛出错误以阻止自动重连
          throw err
        },

        onclose: () => {
          callbacks.onComplete?.()
        },
      })
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        callbacks.onError?.(err as Error)
      }
    } finally {
      isStreaming.value = false
      abortController = null
    }
  }

  function abort() {
    abortController?.abort()
  }

  return { isStreaming: readonly(isStreaming), start, abort }
}
