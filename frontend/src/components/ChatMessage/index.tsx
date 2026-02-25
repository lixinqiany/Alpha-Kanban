import { defineComponent, type PropType } from 'vue'
import StreamingMarkdown from '../StreamingMarkdown'
import styles from './chat-message.module.css'

export default defineComponent({
  name: 'ChatMessage',
  props: {
    content: { type: String, required: true },
    align: { type: String as PropType<'left' | 'right'>, default: 'left' },
    mode: { type: String as PropType<'flat' | 'bubble'>, default: 'flat' },
    streaming: { type: Boolean, default: false },
  },
  setup(props) {
    return () => (
      <div
        class={[
          styles.message,
          props.align === 'right' ? styles.alignRight : styles.alignLeft,
          props.mode === 'bubble' ? styles.bubble : styles.flat,
        ]}
      >
        <div class={styles.content}>
          <StreamingMarkdown content={props.content} streaming={props.streaming} />
        </div>
      </div>
    )
  },
})
