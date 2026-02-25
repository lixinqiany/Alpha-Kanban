import { defineComponent, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Conversation } from '@/api/chat'
import styles from './ConversationList.module.css'

export default defineComponent({
  name: 'ConversationList',
  props: {
    conversations: { type: Array as PropType<Conversation[]>, required: true },
    activeConversationId: { type: String as PropType<string | null>, default: null },
  },
  emits: ['select'],
  setup(props, { emit }) {
    const { t } = useI18n()

    return () => (
      <div class={styles.list}>
        {props.conversations.length === 0 ? (
          <div class={styles.empty}>{t('chat.noConversations')}</div>
        ) : (
          props.conversations.map((conv) => (
            <button
              key={conv.id}
              class={[styles.item, conv.id === props.activeConversationId && styles.active]}
              onClick={() => emit('select', conv.id)}
              title={conv.title}
            >
              {conv.title}
            </button>
          ))
        )}
      </div>
    )
  },
})
