import { defineComponent, type PropType, ref, watch, nextTick, onMounted } from 'vue'
import ChatMessage from '@/components/ChatMessage'
import type { Message } from '@/api/chat'
import styles from './MessageArea.module.css'

export default defineComponent({
  name: 'MessageArea',
  props: {
    messages: { type: Array as PropType<Message[]>, required: true },
    streamingContent: { type: String, default: '' },
    streamingThinking: { type: String, default: '' },
    isStreaming: { type: Boolean, default: false },
  },
  setup(props) {
    const bottomAnchorRef = ref<HTMLElement>()

    const scrollToBottom = () => {
      nextTick(() => {
        bottomAnchorRef.value?.scrollIntoView({ behavior: 'instant', block: 'end' })
      })
    }

    // 新消息到达时滚动
    watch(() => props.messages.length, scrollToBottom)

    // 流式内容更新时持续滚动
    watch(() => props.streamingContent, scrollToBottom)

    // 首次渲染滚动到底部
    onMounted(scrollToBottom)

    return () => (
      <div class={styles.area}>
        <div class={styles.messageList}>
          {props.messages.map((msg) => (
            <div key={msg.id} class={styles.messageRow}>
              <ChatMessage
                content={msg.content}
                align={msg.role === 'user' ? 'right' : 'left'}
                mode={msg.role === 'user' ? 'bubble' : 'flat'}
              />
            </div>
          ))}
          {/* 流式中的助手消息 */}
          {props.isStreaming && props.streamingContent && (
            <div class={styles.messageRow}>
              <ChatMessage content={props.streamingContent} align="left" mode="flat" streaming />
            </div>
          )}
        </div>
        {/* 底部锚点，滚动目标 */}
        <div ref={bottomAnchorRef} class={styles.bottomAnchor} />
      </div>
    )
  },
})
