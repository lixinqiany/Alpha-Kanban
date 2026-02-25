import { defineComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import SvgIcon from '@/components/SvgIcon'
import NewChatIcon from '@/assets/icons/new-chat.svg?component'
import styles from './SidebarHeader.module.css'

export default defineComponent({
  name: 'SidebarHeader',
  props: {
    isNewChatActive: { type: Boolean, required: true },
  },
  emits: ['newChat'],
  setup(props, { emit }) {
    const { t } = useI18n()

    return () => (
      <div class={styles.header}>
        <button
          class={[styles.sidebarItem, props.isNewChatActive && styles.active]}
          onClick={() => emit('newChat')}
        >
          <SvgIcon icon={NewChatIcon} size={20} />
          <span>{t('chat.newChat')}</span>
        </button>
      </div>
    )
  },
})
