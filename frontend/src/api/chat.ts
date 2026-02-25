import { authClient } from './client'

// ── 类型定义 ──

export interface Conversation {
  id: string
  title: string
  last_model: string
  last_chat_time: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  role: 'system' | 'user' | 'assistant'
  content: string
  model: string | null
  status: 'generating' | 'completed' | 'aborted'
  thinking: string | null
  order: number
  created_at: string
}

export interface AvailableModel {
  name: string
  display_name: string
}

// 按厂商分组：{ "OpenAI": [model, ...], "Anthropic": [...] }
export type AvailableModelsByManufacturer = Record<string, AvailableModel[]>

export type ChatSSEEvent =
  | { type: 'conversation_created'; conversation_id: string }
  | { type: 'thinking'; content: string }
  | { type: 'chunk'; content: string }
  | { type: 'done'; message_id: string; full_content: string; thinking: string | null }
  | { type: 'title'; title: string }
  | { type: 'error'; detail: string }

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// ── General Chat API ──

export function listConversations(page = 1, pageSize = 20) {
  return authClient.get<PaginatedResponse<Conversation>>('/general-chat/conversations', {
    params: { page, page_size: pageSize },
  })
}

export function getConversationMessages(conversationId: string) {
  return authClient.get<Message[]>(`/general-chat/conversations/${conversationId}/messages`)
}

export function deleteConversation(conversationId: string) {
  return authClient.delete(`/general-chat/conversations/${conversationId}`)
}

// ── Model API ──

export function getAvailableModels() {
  return authClient.get<AvailableModelsByManufacturer>('/model/available/byManufacturer')
}

// ── SSE 流参数构建（交给 useSSE 发起） ──

export function buildNewChatRequest(model: string, content: string, thinkingEnabled = false) {
  return {
    url: '/api/chat/conversations',
    body: { model, content, thinking_enabled: thinkingEnabled },
  }
}

export function buildContinueChatRequest(
  conversationId: string,
  model: string,
  content: string,
  thinkingEnabled = false,
) {
  return {
    url: `/api/chat/conversations/${conversationId}/messages`,
    body: { model, content, thinking_enabled: thinkingEnabled },
  }
}
