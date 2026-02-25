import { defineComponent, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Conversation } from '@/api/chat'
import InfiniteScrollList from '@/components/InfiniteScrollList'
import styles from './ConversationList.module.css'

export default defineComponent({
  name: 'ConversationList',
  props: {
    conversations: { type: Array as PropType<Conversation[]>, required: true },
    activeConversationId: { type: String as PropType<string | null>, default: null },
    hasMore: { type: Boolean, required: true },
    loading: { type: Boolean, required: true },
    error: { type: String as PropType<string | null>, default: null },
  },
  emits: ['select', 'loadMore'],
  setup(props, { emit }) {
    const { t } = useI18n()

    return () => (
      <div class={styles.list}>
        <InfiniteScrollList
          hasMore={props.hasMore}
          loading={props.loading}
          error={props.error}
          onLoadMore={() => emit('loadMore')}
          onRetry={() => emit('loadMore')}
        >
          {{
            default: () =>
              props.conversations.map((conv) => (
                <button
                  key={conv.id}
                  class={[styles.item, conv.id === props.activeConversationId && styles.active]}
                  onClick={() => emit('select', conv.id)}
                  title={conv.title}
                >
                  {conv.title}
                </button>
              )),
            empty: () => <div class={styles.empty}>{t('chat.noConversations')}</div>,
          }}
        </InfiniteScrollList>
      </div>
    )
  },
})
