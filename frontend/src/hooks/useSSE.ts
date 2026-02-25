import { ref, readonly } from 'vue'

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
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal: abortController.signal,
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`HTTP ${response.status}: ${text}`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        // 保留最后一个不完整的行
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue
          try {
            const data = JSON.parse(trimmed.slice(6)) as T
            options.onMessage(data)
          } catch {
            // 忽略解析失败的行
          }
        }
      }

      // 处理 buffer 中剩余数据
      if (buffer.trim().startsWith('data: ')) {
        try {
          const data = JSON.parse(buffer.trim().slice(6)) as T
          options.onMessage(data)
        } catch {
          // 忽略
        }
      }

      options.onComplete?.()
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
