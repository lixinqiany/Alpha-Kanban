import { defineComponent, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { login } from '../../api/user'
import AuthLayout from '../../components/AuthLayout'
import styles from './auth.module.css'

export default defineComponent({
  setup() {
    const router = useRouter()
    const { t } = useI18n()
    const username = ref('')
    const password = ref('')
    const error = ref('')
    const loading = ref(false)

    async function handleSubmit(e: Event) {
      e.preventDefault()
      error.value = ''

      if (!username.value || !password.value) {
        error.value = t('auth.fillAllFields')
        return
      }

      loading.value = true
      try {
        await login(username.value, password.value)
        router.push({ name: 'Home' })
      } catch (e: any) {
        const status = e.response?.status
        if (status === 401) {
          error.value = t('auth.incorrectCredentials')
        } else {
          error.value = e.response?.data?.detail || t('auth.loginFailed')
        }
      } finally {
        loading.value = false
      }
    }

    return () => (
      <AuthLayout
        title={t('auth.signInTitle')}
        footerText={t('auth.newHere')}
        footerLinkText={t('auth.createAnAccount')}
        footerLinkTo={{ name: 'Register' }}
      >
        <form class={styles.card} onSubmit={handleSubmit}>
          {error.value && <div class={styles.error}>{error.value}</div>}

          <label class={styles.label} for="username">
            {t('auth.username')}
          </label>
          <input
            id="username"
            class={styles.input}
            type="text"
            autocomplete="username"
            value={username.value}
            onInput={(e) => (username.value = (e.target as HTMLInputElement).value)}
          />

          <label class={styles.label} for="password">
            {t('auth.password')}
          </label>
          <input
            id="password"
            class={styles.input}
            type="password"
            autocomplete="current-password"
            value={password.value}
            onInput={(e) => (password.value = (e.target as HTMLInputElement).value)}
          />

          <button class={styles.button} type="submit" disabled={loading.value}>
            {loading.value ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>
      </AuthLayout>
    )
  },
})
