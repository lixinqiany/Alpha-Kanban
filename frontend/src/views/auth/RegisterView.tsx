import { defineComponent, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { register } from '../../api/user'
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

    function validate(): string | null {
      if (!username.value || !password.value) {
        return t('auth.fillAllFields')
      }
      if (username.value.length < 2 || username.value.length > 50) {
        return t('auth.usernameLengthError')
      }
      if (password.value.length < 6) {
        return t('auth.passwordLengthError')
      }
      return null
    }

    async function handleSubmit(e: Event) {
      e.preventDefault()
      error.value = ''

      const validationError = validate()
      if (validationError) {
        error.value = validationError
        return
      }

      loading.value = true
      try {
        await register(username.value, password.value)
        router.push({ name: 'Login' })
      } catch (e: any) {
        const status = e.response?.status
        if (status === 409) {
          error.value = t('auth.usernameExists')
        } else {
          error.value = e.response?.data?.detail || t('auth.registerFailed')
        }
      } finally {
        loading.value = false
      }
    }

    return () => (
      <AuthLayout
        title={t('auth.signUpTitle')}
        footerText={t('auth.alreadyHaveAccount')}
        footerLinkText={t('auth.signIn')}
        footerLinkTo={{ name: 'Login' }}
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
            autocomplete="new-password"
            value={password.value}
            onInput={(e) => (password.value = (e.target as HTMLInputElement).value)}
          />

          <button class={styles.button} type="submit" disabled={loading.value}>
            {loading.value ? t('auth.creatingAccount') : t('auth.createAccount')}
          </button>
        </form>
      </AuthLayout>
    )
  },
})
