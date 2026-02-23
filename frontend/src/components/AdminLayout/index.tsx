import { defineComponent } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import styles from './AdminLayout.module.css'

export default defineComponent({
  setup() {
    const route = useRoute()

    function isActive(prefix: string) {
      return route.path.startsWith(prefix)
    }

    return () => (
      <div class={styles.wrapper}>
        <aside class={styles.sidebar}>
          <div class={styles.sidebarTitle}>Admin</div>
          <RouterLink
            to={{ name: 'AdminProviderManagement' }}
            class={[styles.menuItem, isActive('/admin/providers') && styles.menuItemActive]}
          >
            Providers
          </RouterLink>
        </aside>
        <div class={styles.content}>
          <RouterView />
        </div>
      </div>
    )
  },
})
