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
              {/* header/footer：未传入插槽时整个容器 div 不渲染，避免空 div 占位 */}
              {slots['sidebar-header'] && (
                <div class={styles.sidebarHeader}>{slots['sidebar-header']()}</div>
              )}
              {/* body：容器始终渲染以保持 flex 布局结构，?.() 防止未传插槽时调用 undefined 报错 */}
              <div class={styles.sidebarBody}>{slots['sidebar-body']?.()}</div>
              {/* footer：未传入插槽时整个容器 div 不渲染，避免空 div 占位 */}
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
