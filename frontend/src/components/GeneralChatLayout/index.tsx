import { defineComponent, type PropType } from 'vue'
import styles from './general-chat-layout.module.css'

export default defineComponent({
  name: 'GeneralChatLayout',
  props: {
    sidebarWidth: { type: Number as PropType<number>, default: 260 },
  },
  setup(props, { slots }) {
    return () => (
      <div class={styles.layout}>
        <aside class={styles.sidebar} style={{ width: `${props.sidebarWidth}px` }}>
          {slots.sidebar ? (
            slots.sidebar()
          ) : (
            <>
              {slots['sidebar-header'] && (
                <div class={styles.sidebarHeader}>{slots['sidebar-header']()}</div>
              )}
              <div class={styles.sidebarBody}>{slots['sidebar-body']?.()}</div>
              {slots['sidebar-footer'] && (
                <div class={styles.sidebarFooter}>{slots['sidebar-footer']()}</div>
              )}
            </>
          )}
        </aside>
        <main class={styles.main}>{slots.default?.()}</main>
      </div>
    )
  },
})
