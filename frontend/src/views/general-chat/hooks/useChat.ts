import { ref, computed } from 'vue'
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
  type ModelGroup,
  type ChatSSEEvent,
} from '@/api/chat'

export interface UseChatOptions {
  onConversationCreated?: (id: string) => void
  onConversationDeleted?: () => void
}

export function useChat(options?: UseChatOptions) {
  // ── 状态 ──
  const conversations = ref<Conversation[]>([])
  const activeConversationId = ref<string | null>(null)
  const messages = ref<Message[]>([])
  const streamingContent = ref('')
  const streamingThinking = ref('')
  const availableModels = ref<ModelGroup[]>([])
  const currentModel = ref<string | null>(null)

  const { isStreaming, start: startSSE, abort: abortSSE } = useSSE<ChatSSEEvent>()

  // 流式过程中暂存用户首条消息内容（用于临时标题）
  let pendingUserContent: string = ''

  // ── 计算属性 ──
  const currentMessages = computed(() => messages.value)

  // ── 生命周期 ──
  async function init() {
    await Promise.all([loadConversations(), loadAvailableModels()])
  }

  async function loadConversations() {
    try {
      const { data } = await listConversations(1, 50)
      // 兜底：数据库中可能存在 title 为 null 的旧数据
      conversations.value = data.items.map((c) => ({
        ...c,
        title: c.title || c.id,
      }))
    } catch (err) {
      console.error('加载会话列表失败', err)
    }
  }

  async function loadAvailableModels() {
    try {
      const { data } = await getAvailableModels()
      availableModels.value = data.groups
      // 默认选第一个模型
      const firstGroup = data.groups[0]
      if (!currentModel.value && firstGroup && firstGroup.models.length > 0) {
        currentModel.value = firstGroup.models[0]!.name
      }
    } catch (err) {
      console.error('加载可用模型失败', err)
    }
  }

  async function loadMessages(conversationId: string) {
    try {
      const { data } = await getConversationMessages(conversationId)
      messages.value = data
    } catch (err) {
      console.error('加载消息失败', err)
    }
  }

  // ── 操作 ──
  async function selectConversation(id: string) {
    if (id === activeConversationId.value) return
    activeConversationId.value = id
    await loadMessages(id)
  }

  function startNewChat() {
    activeConversationId.value = null
    messages.value = []
    streamingContent.value = ''
    streamingThinking.value = ''
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
    pendingUserContent = content

    // 构建请求
    const isNew = activeConversationId.value === null
    const { url, body } = isNew
      ? buildNewChatRequest(currentModel.value, content)
      : buildContinueChatRequest(activeConversationId.value!, currentModel.value, content)

    await startSSE(url, body, {
      onMessage: (event) => handleSSEEvent(event),
      onError: (err) => console.error('SSE 错误', err),
    })
  }

  function handleSSEEvent(event: ChatSSEEvent) {
    switch (event.type) {
      case 'conversation_created': {
        // 立即用用户消息内容截取前 200 字符作为临时标题
        const tempTitle = pendingUserContent.slice(0, 200)
        const newConv: Conversation = {
          id: event.conversation_id,
          title: tempTitle,
          last_model: currentModel.value!,
          last_chat_time: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        conversations.value = [newConv, ...conversations.value]
        activeConversationId.value = event.conversation_id
        options?.onConversationCreated?.(event.conversation_id)
        break
      }

      case 'thinking':
        streamingThinking.value += event.content
        break

      case 'chunk':
        streamingContent.value += event.content
        break

      case 'done': {
        // 将流式消息转为正式消息
        const assistantMsg: Message = {
          id: event.message_id,
          role: 'assistant',
          content: event.full_content,
          model: currentModel.value,
          status: 'completed',
          thinking: event.thinking,
          order: messages.value.length + 1,
          created_at: new Date().toISOString(),
        }
        messages.value = [...messages.value, assistantMsg]
        streamingContent.value = ''
        streamingThinking.value = ''
        break
      }

      case 'title': {
        // 用 AI 生成的标题替换临时标题
        if (activeConversationId.value) {
          conversations.value = conversations.value.map((c) =>
            c.id === activeConversationId.value ? { ...c, title: event.title } : c,
          )
        }
        break
      }

      case 'error':
        console.error('服务端错误:', event.detail)
        streamingContent.value = ''
        streamingThinking.value = ''
        break
    }
  }

  async function deleteConversation(id: string) {
    try {
      await apiDeleteConversation(id)
      conversations.value = conversations.value.filter((c) => c.id !== id)
      if (activeConversationId.value === id) {
        startNewChat()
        options?.onConversationDeleted?.()
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
    isStreaming,
    availableModels,
    currentModel,
    streamingContent,
    streamingThinking,
    // 操作
    init,
    selectConversation,
    startNewChat,
    sendMessage,
    deleteConversation,
    changeModel,
    abortSSE,
  }
}
