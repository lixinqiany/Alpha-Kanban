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
    const areaRef = ref<HTMLElement>()
    // 用户是否在底部附近（阈值 80px）
    const isNearBottom = ref(true)

    const checkNearBottom = () => {
      const el = areaRef.value
      if (!el) return true
      return el.scrollHeight - el.scrollTop - el.clientHeight < 80
    }

    const handleScroll = () => {
      isNearBottom.value = checkNearBottom()
    }

    const scrollToBottom = (force = false) => {
      if (!force && !isNearBottom.value) return
      nextTick(() => {
        bottomAnchorRef.value?.scrollIntoView({ behavior: 'instant', block: 'end' })
        isNearBottom.value = true
      })
    }

    // 新消息由用户发出时强制滚动到底部
    watch(
      () => props.messages.length,
      () => scrollToBottom(true),
    )

    // 开始流式响应时，若在底部则继续跟随
    watch(
      () => props.isStreaming,
      () => scrollToBottom(),
    )

    // 流式内容更新时，仅在底部附近才自动滚动
    watch(
      () => props.streamingContent,
      () => scrollToBottom(),
    )

    // 输入框高度变化时，仅在底部附近才保持滚动
    watch(
      () => props.inputHeight,
      () => scrollToBottom(),
    )

    // 首次渲染滚动到底部
    onMounted(() => scrollToBottom(true))

    return () => (
      <div ref={areaRef} class={styles.area} onScroll={handleScroll}>
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
