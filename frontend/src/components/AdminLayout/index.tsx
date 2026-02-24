import { defineComponent } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import styles from './AdminLayout.module.css'

export default defineComponent({
  setup() {
    const route = useRoute()
    const { t } = useI18n()

    function isActive(prefix: string) {
      return route.path.startsWith(prefix)
    }

    return () => (
      <div class={styles.wrapper}>
        <aside class={styles.sidebar}>
          <div class={styles.sidebarTitle}>{t('admin.title')}</div>
          <RouterLink
            to={{ name: 'AdminProviderManagement' }}
            class={[styles.menuItem, isActive('/admin/providers') && styles.menuItemActive]}
          >
            {t('admin.providers')}
          </RouterLink>
        </aside>
        <div class={styles.content}>
          <RouterView />
        </div>
      </div>
    )
  },
})
