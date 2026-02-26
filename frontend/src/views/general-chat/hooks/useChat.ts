import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSSE } from '@/hooks/useSSE'
import {
  listConversations,
  getConversationMessages,
  deleteConversation as apiDeleteConversation,
  getAvailableModels,
  buildNewChatRequest,
  buildContinueChatRequest,
  type Conversation,
  type Message,
  type AvailableModelsByManufacturer,
} from '@/api/chat'
import {
  ChatSSEEvent,
  type ChatSSEEventMap,
  type ConversationStartPayload,
  type DeltaPayload,
  type MessageDonePayload,
  type ConversationDonePayload,
  type ErrorPayload,
} from '@/utils/chat-sse'

export function useChat() {
  const router = useRouter()
  const route = useRoute()

  // ── 状态 ──
  const conversations = ref<Conversation[]>([])
  const activeConversationId = ref<string | null>(null)
  const messages = ref<Message[]>([])
  const streamingContent = ref('')
  const streamingThinking = ref('')
  const messageLoadError = ref<string | null>(null)
  const availableModels = ref<AvailableModelsByManufacturer>({})
  const currentModel = ref<string | null>(null)

  // 会话列表分页
  const conversationPage = ref(0)
  const hasMoreConversations = ref(true)
  const conversationsLoading = ref(false)
  const conversationLoadError = ref<string | null>(null)
  const PAGE_SIZE = 20

  const { isStreaming, start: startSSE, abort: abortSSE } = useSSE<ChatSSEEventMap>()

  // ── 计算属性 ──
  const currentMessages = computed(() => messages.value)

  // ── 路由驱动状态 ──
  watch(
    () => route.params.id as string | undefined,
    async (id) => {
      if (id) {
        // 如果是当前正在流式的会话（conversation.start 导致的路由切换），不中止也不重新加载
        if (id === activeConversationId.value && isStreaming.value) {
          return
        }
        // 切换到其他会话时，中止当前流
        if (isStreaming.value) {
          abortSSE()
        }
        activeConversationId.value = id
        await loadMessages(id)
      } else {
        // 新对话模式
        if (isStreaming.value) {
          abortSSE()
        }
        activeConversationId.value = null
        messages.value = []
        streamingContent.value = ''
        streamingThinking.value = ''
      }
    },
    { immediate: true },
  )

  // ── 生命周期 ──
  async function init() {
    await loadAvailableModels()
  }

  async function loadMoreConversations() {
    if (conversationsLoading.value || !hasMoreConversations.value) return

    const page = conversationPage.value + 1
    conversationLoadError.value = null
    conversationsLoading.value = true

    try {
      const { data } = await listConversations(page, PAGE_SIZE)
      const mapped = data.items.map((c) => ({
        ...c,
        title: c.title || c.id,
      }))

      // 去重：新会话本地插入会导致服务端分页偏移，下一页可能包含已有项
      const existingIds = new Set(conversations.value.map((c) => c.id))
      const newItems = mapped.filter((c) => !existingIds.has(c.id))
      conversations.value = [...conversations.value, ...newItems]
      conversationPage.value = page
      hasMoreConversations.value = data.page < data.total_pages
    } catch (err) {
      console.error('加载会话列表失败', err)
      conversationLoadError.value = '加载失败'
    } finally {
      conversationsLoading.value = false
    }
  }

  async function loadAvailableModels() {
    try {
      const { data } = await getAvailableModels()
      availableModels.value = data
      // 默认选第一个厂商的第一个模型
      const firstKey = Object.keys(data)[0]
      const firstGroup = firstKey ? data[firstKey] : undefined
      if (!currentModel.value && firstGroup && firstGroup.length > 0) {
        currentModel.value = firstGroup[0]!.name
      }
    } catch (err) {
      console.error('加载可用模型失败', err)
    }
  }

  async function loadMessages(conversationId: string) {
    messages.value = []
    messageLoadError.value = null
    try {
      const { data } = await getConversationMessages(conversationId)
      messages.value = data
    } catch (err: unknown) {
      console.error('加载消息失败', err)
      // 无效 ID（404）时回退到新对话
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 404) {
        router.replace({ name: 'GeneralChat' })
        return
      }
      messageLoadError.value = '消息加载失败，请重试'
    }
  }

  // ── 操作 ──
  function selectConversation(id: string) {
    if (id === activeConversationId.value) return
    router.push({ name: 'GeneralChatConversation', params: { id } })
  }

  function startNewChat() {
    router.push({ name: 'GeneralChat' })
  }

  async function sendMessage(content: string) {
    if (!currentModel.value || isStreaming.value) return

    // 先在本地添加用户消息
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      model: null,
      status: 'completed',
      thinking: null,
      order: messages.value.length + 1,
      created_at: new Date().toISOString(),
    }
    messages.value = [...messages.value, tempUserMsg]
    streamingContent.value = ''
    streamingThinking.value = ''
    // 构建请求
    const isNew = activeConversationId.value === null
    const { url, body } = isNew
      ? buildNewChatRequest(currentModel.value, content, 'general_chat')
      : buildContinueChatRequest(activeConversationId.value!, currentModel.value, content)

    await startSSE(url, body, {
      onMessage: (event, data) => handleSSEEvent(event, data),
      onError: (err) => console.error('SSE 错误', err),
    })
  }

  function handleSSEEvent<E extends keyof ChatSSEEventMap>(event: E, data: ChatSSEEventMap[E]) {
    switch (event) {
      case ChatSSEEvent.ConversationStart: {
        const payload = data as ConversationStartPayload
        if (payload.is_new) {
          const newConv: Conversation = {
            id: payload.conversation_id,
            source: 'general_chat',
            title: payload.title || '',
            last_model: currentModel.value!,
            last_chat_time: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          conversations.value = [newConv, ...conversations.value]
          activeConversationId.value = payload.conversation_id
          // 用 replace 使浏览器后退跳过空白过渡态
          router.replace({
            name: 'GeneralChatConversation',
            params: { id: payload.conversation_id },
          })
        }
        break
      }

      case ChatSSEEvent.MessageStarted: {
        // message_id 已在 message.done 中获取，此处可扩展
        break
      }

      case ChatSSEEvent.ThinkingDelta: {
        const payload = data as DeltaPayload
        streamingThinking.value += payload.delta
        break
      }

      case ChatSSEEvent.TextDelta: {
        const payload = data as DeltaPayload
        streamingContent.value += payload.delta
        break
      }

      case ChatSSEEvent.MessageDone: {
        const payload = data as MessageDonePayload
        // 将流式消息转为正式消息
        const assistantMsg: Message = {
          id: payload.message_id,
          role: 'assistant',
          content: payload.content,
          model: currentModel.value,
          status: 'completed',
          thinking: payload.thinking,
          order: messages.value.length + 1,
          created_at: new Date().toISOString(),
        }
        messages.value = [...messages.value, assistantMsg]
        streamingContent.value = ''
        streamingThinking.value = ''
        break
      }

      case ChatSSEEvent.ConversationDone: {
        // 本轮结束，usage 可选展示（当前忽略）
        const _payload = data as ConversationDonePayload
        void _payload
        break
      }

      case ChatSSEEvent.Error: {
        const payload = data as ErrorPayload
        console.error('服务端错误:', payload.type, payload.message)
        streamingContent.value = ''
        streamingThinking.value = ''
        break
      }
    }
  }

  async function deleteConversation(id: string) {
    try {
      await apiDeleteConversation(id)
      conversations.value = conversations.value.filter((c) => c.id !== id)
      if (activeConversationId.value === id) {
        router.push({ name: 'GeneralChat' })
      }
    } catch (err) {
      console.error('删除会话失败', err)
    }
  }

  function changeModel(modelName: string) {
    currentModel.value = modelName
  }

  return {
    // 状态
    conversations,
    activeConversationId,
    currentMessages,
    messageLoadError,
    isStreaming,
    availableModels,
    currentModel,
    streamingContent,
    streamingThinking,
    // 会话列表分页状态
    hasMoreConversations,
    conversationsLoading,
    conversationLoadError,
    // 操作
    init,
    selectConversation,
    startNewChat,
    sendMessage,
    deleteConversation,
    changeModel,
    abortSSE,
    loadMoreConversations,
  }
}
