import { defineComponent, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import styles from './chat.module.css'

// 模拟会话列表
const mockConversations = [
  { id: '1', title: 'Project brainstorming' },
  { id: '2', title: 'Code review help' },
  { id: '3', title: 'API design discussion' },
]

// 模拟消息
const mockMessages = [
  { role: 'user', content: 'Hello, can you help me with my project?' },
  {
    role: 'assistant',
    content: "Of course! I'd be happy to help. What are you working on?",
  },
  { role: 'user', content: "I'm building a kanban board application." },
  {
    role: 'assistant',
    content:
      "That sounds like a great project! A kanban board is a wonderful way to visualize and manage workflow. What tech stack are you using? I can help with architecture decisions, implementation details, or any specific challenges you're facing.",
  },
]

export default defineComponent({
  setup() {
    const { t } = useI18n()
    const activeConversationId = ref('1')
    const inputText = ref('')

    return () => (
      <div class={styles.wrapper}>
        {/* 左侧会话列表侧边栏 */}
        <aside class={styles.sidebar}>
          <div class={styles.sidebarHeader}>
            <button class={styles.newChatButton}>{t('chat.newChat')}</button>
          </div>
          <div class={styles.conversationList}>
            {mockConversations.map((conv) => (
              <button
                key={conv.id}
                class={[
                  styles.conversationItem,
                  conv.id === activeConversationId.value && styles.conversationItemActive,
                ]}
                onClick={() => (activeConversationId.value = conv.id)}
              >
                {conv.title}
              </button>
            ))}
          </div>
        </aside>

        {/* 右侧聊天主区域 */}
        <div class={styles.main}>
          {/* 消息列表 */}
          <div class={styles.messageList}>
            {mockMessages.map((msg, idx) => (
              <div
                key={idx}
                class={[
                  styles.messageRow,
                  msg.role === 'user' ? styles.messageRowUser : styles.messageRowAssistant,
                ]}
              >
                <div
                  class={[
                    styles.avatar,
                    msg.role === 'user' ? styles.avatarUser : styles.avatarAssistant,
                  ]}
                >
                  {msg.role === 'user' ? 'U' : 'AI'}
                </div>
                <div
                  class={[
                    styles.bubble,
                    msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                  ]}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          {/* 输入区域 */}
          <div class={styles.inputArea}>
            <div class={styles.inputWrapper}>
              <textarea
                class={styles.textarea}
                rows={1}
                placeholder={t('chat.placeholder')}
                value={inputText.value}
                onInput={(e) => (inputText.value = (e.target as HTMLTextAreaElement).value)}
              />
              <button class={styles.sendButton} disabled={!inputText.value.trim()}>
                ▶
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  },
})
