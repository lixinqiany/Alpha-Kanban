import { defineComponent, ref } from 'vue'
import { RouterView, RouterLink, useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getCurrentUser, isAdmin } from '../../utils/token'
import { setLocale, getLocale } from '../../utils/locale'
import type { SupportedLocale } from '../../utils/locale'
import Dropdown from '../Dropdown'
import SvgIcon from '../SvgIcon'
import TranslateIcon from '../../assets/icons/translate.svg?component'
import styles from './AppLayout.module.css'

interface TabItem {
  labelKey: string
  to: string
}

export default defineComponent({
  setup() {
    const router = useRouter()
    const route = useRoute()
    const { t } = useI18n()
    const showSidebar = ref(false)

    const user = getCurrentUser()
    const initial = user?.sub?.charAt(0)?.toUpperCase() || '?'

    function handleSignOut() {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      router.push({ name: 'Login' })
    }

    function handleAdmin() {
      router.push({ name: 'AdminProviderManagement' })
    }

    function toggleSidebar() {
      showSidebar.value = !showSidebar.value
    }

    function closeSidebar() {
      showSidebar.value = false
    }

    return () => {
      const tabs = route.meta.tabs as TabItem[] | undefined

      return (
        <div class={styles.wrapper}>
          {/* 当侧边栏抽屉显示时，显示遮罩层 */}
          {showSidebar.value && <div class={styles.overlay} onClick={closeSidebar} />}
          {/* 侧边栏抽屉 */}
          <aside class={[styles.sidebar, showSidebar.value && styles.sidebarOpen]}>
            <div class={styles.sidebarHeader}>
              <span class={styles.sidebarUser}>{user?.sub || 'User'}</span>
              <button class={styles.sidebarClose} onClick={closeSidebar}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
                </svg>
              </button>
            </div>
            {/* 分割线 */}
            <div class={styles.sidebarDivider} />
            <nav class={styles.sidebarNav}>
              <RouterLink to={{ name: 'Home' }} class={styles.sidebarLink} onClick={closeSidebar}>
                {t('nav.home')}
              </RouterLink>
              {isAdmin() && (
                <RouterLink
                  to={{ name: 'AdminProviderManagement' }}
                  class={styles.sidebarLink}
                  onClick={closeSidebar}
                >
                  {t('nav.admin')}
                </RouterLink>
              )}
            </nav>
            <div class={styles.sidebarFooter}>
              <button
                class={styles.sidebarLink}
                onClick={() => {
                  closeSidebar()
                  handleSignOut()
                }}
              >
                {t('nav.signOut')}
              </button>
            </div>
          </aside>

          {/* 顶部导航栏 */}
          <nav class={[styles.navbar, tabs && styles.navbarNoBottomBorder]}>
            <div class={styles.navLeft}>
              <button class={styles.hamburger} onClick={toggleSidebar}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M1 2.75A.75.75 0 011.75 2h12.5a.75.75 0 010 1.5H1.75A.75.75 0 011 2.75zm0 5A.75.75 0 011.75 7h12.5a.75.75 0 010 1.5H1.75A.75.75 0 011 7.75zM1.75 12h12.5a.75.75 0 010 1.5H1.75a.75.75 0 010-1.5z" />
                </svg>
              </button>
              <RouterLink to={{ name: 'Home' }} class={styles.logoLink}>
                <svg
                  class={styles.logo}
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect x="2" y="4" width="7" height="18" rx="2" fill="#0969da" />
                  <rect x="12.5" y="4" width="7" height="13" rx="2" fill="#1a7f37" />
                  <rect x="23" y="4" width="7" height="22" rx="2" fill="#8250df" />
                </svg>
                <span class={styles.logoText}>Alpha-Kanban</span>
              </RouterLink>
            </div>

            <div class={styles.navRight}>
              <Dropdown placement="bottom-right" classes={{ dropdown: styles.langDropdown }}>
                {{
                  trigger: () => (
                    <button class={styles.langBtn} title="Language">
                      <SvgIcon icon={TranslateIcon} size={16} />
                    </button>
                  ),
                  default: () => (
                    <>
                      {(
                        [
                          { locale: 'zh-CN' as SupportedLocale, label: '简体中文' },
                          { locale: 'en-US' as SupportedLocale, label: 'English' },
                        ] as const
                      ).map((item) => (
                        <button
                          class={[
                            styles.dropdownItem,
                            styles.langOption,
                            getLocale() === item.locale && styles.langOptionActive,
                          ]}
                          onClick={() => setLocale(item.locale)}
                        >
                          {item.label}
                          {getLocale() === item.locale && (
                            <svg
                              class={styles.langCheck}
                              width="14"
                              height="14"
                              viewBox="0 0 16 16"
                              fill="currentColor"
                            >
                              <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </>
                  ),
                }}
              </Dropdown>
              <Dropdown placement="bottom-right">
                {{
                  trigger: () => <button class={styles.avatarBtn}>{initial}</button>,
                  default: () => (
                    <>
                      <div class={styles.dropdownHeader}>{user?.sub || 'User'}</div>
                      <div class={styles.dropdownDivider}></div>
                      {isAdmin() && (
                        <>
                          <button class={styles.dropdownItem} onClick={handleAdmin}>
                            {t('nav.admin')}
                          </button>
                          <div class={styles.dropdownDivider}></div>
                        </>
                      )}
                      <button class={styles.dropdownItem} onClick={handleSignOut}>
                        {t('nav.signOut')}
                      </button>
                    </>
                  ),
                }}
              </Dropdown>
            </div>
          </nav>

          {/* 选项卡导航 */}
          {tabs && (
            <div class={styles.tabBar}>
              <div class={styles.tabList}>
                {tabs.map((tab) => (
                  <RouterLink
                    to={tab.to}
                    class={[styles.tabItem, route.path === tab.to && styles.tabItemActive]}
                  >
                    {t(tab.labelKey)}
                  </RouterLink>
                ))}
              </div>
            </div>
          )}

          <main class={styles.content}>
            <RouterView />
          </main>
        </div>
      )
    }
  },
})
