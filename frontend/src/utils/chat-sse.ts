/**
 * SSE 事件协议 v1 — 事件枚举 + payload 类型 + EventMap
 */

export enum ChatSSEEvent {
  ConversationStart = 'conversation.start',
  MessageStarted = 'message.started',
  ThinkingDelta = 'thinking.delta',
  TextDelta = 'text.delta',
  MessageDone = 'message.done',
  ConversationDone = 'conversation.done',
  Error = 'error',
}

export interface ConversationStartPayload {
  conversation_id: string
  is_new: boolean
  title?: string
}

export interface MessageStartedPayload {
  message_id: string
}

export interface DeltaPayload {
  delta: string
}

export interface MessageDonePayload {
  message_id: string
  content: string
  thinking: string | null
}

// TODO: 后续增加 usage 字段（TokenUsage）

export interface ConversationDonePayload {
  conversation_id: string
}

export interface ErrorPayload {
  type: string
  message: string
}

export type ChatSSEEventMap = {
  [ChatSSEEvent.ConversationStart]: ConversationStartPayload
  [ChatSSEEvent.MessageStarted]: MessageStartedPayload
  [ChatSSEEvent.ThinkingDelta]: DeltaPayload
  [ChatSSEEvent.TextDelta]: DeltaPayload
  [ChatSSEEvent.MessageDone]: MessageDonePayload
  [ChatSSEEvent.ConversationDone]: ConversationDonePayload
  [ChatSSEEvent.Error]: ErrorPayload
}
