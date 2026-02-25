import { ref, readonly } from 'vue'
import { fetchEventSource } from '@microsoft/fetch-event-source'

export interface UseSSEOptions<T> {
  onMessage: (event: T) => void
  onError?: (error: Error) => void
  onComplete?: () => void
}

export function useSSE<T>() {
  const isStreaming = ref(false)
  let abortController: AbortController | null = null

  async function start(url: string, body: object, options: UseSSEOptions<T>) {
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
        // 不自动重连，流结束即关闭
        openWhenHidden: true,

        onopen: async (response) => {
          if (!response.ok) {
            const text = await response.text()
            throw new Error(`HTTP ${response.status}: ${text}`)
          }
        },

        onmessage: (ev) => {
          try {
            const data = JSON.parse(ev.data) as T
            options.onMessage(data)
          } catch {
            // 忽略解析失败的事件
          }
        },

        onerror: (err) => {
          // 抛出错误以阻止自动重连
          throw err
        },

        onclose: () => {
          options.onComplete?.()
        },
      })
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        options.onError?.(err as Error)
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
