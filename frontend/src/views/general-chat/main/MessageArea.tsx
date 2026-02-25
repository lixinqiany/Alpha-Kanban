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
    inputHeight: { type: Number, default: 0 },
  },
  setup(props) {
    const bottomAnchorRef = ref<HTMLElement>()

    const scrollToBottom = () => {
      nextTick(() => {
        bottomAnchorRef.value?.scrollIntoView({ behavior: 'instant', block: 'end' })
      })
    }

    // 新消息到达或开始等待响应时滚动
    watch(() => props.messages.length, scrollToBottom)
    watch(() => props.isStreaming, scrollToBottom)

    // 流式内容更新时持续滚动
    watch(() => props.streamingContent, scrollToBottom)

    // 输入框高度变化时保持滚动到底部
    watch(() => props.inputHeight, scrollToBottom)

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
          {/* 流式中的助手消息（含等待光标） */}
          {props.isStreaming && (
            <div class={styles.messageRow}>
              <ChatMessage content={props.streamingContent} align="left" mode="flat" streaming />
            </div>
          )}
        </div>
        {/* 底部锚点，高度跟随输入框动态变化 */}
        <div
          ref={bottomAnchorRef}
          class={styles.bottomAnchor}
          style={{ height: props.inputHeight + 'px' }}
        />
      </div>
    )
  },
})
