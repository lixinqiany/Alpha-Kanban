import { defineComponent, ref } from 'vue'
import { useRouter } from 'vue-router'
import { register } from '../../api/user'
import AuthLayout from '../../components/AuthLayout'
import styles from './auth.module.css'

export default defineComponent({
  setup() {
    const router = useRouter()
    const username = ref('')
    const password = ref('')
    const error = ref('')
    const loading = ref(false)

    function validate(): string | null {
      if (!username.value || !password.value) {
        return 'Please fill in all fields.'
      }
      if (username.value.length < 2 || username.value.length > 50) {
        return 'Username must be between 2 and 50 characters.'
      }
      if (password.value.length < 6) {
        return 'Password must be at least 6 characters.'
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
          error.value = 'Username already exists.'
        } else {
          error.value = e.response?.data?.detail || 'Registration failed. Please try again.'
        }
      } finally {
        loading.value = false
      }
    }

    return () => (
      <AuthLayout
        title="Create your account"
        footerText="Already have an account?"
        footerLinkText="Sign in"
        footerLinkTo={{ name: 'Login' }}
      >
        <form class={styles.card} onSubmit={handleSubmit}>
          {error.value && <div class={styles.error}>{error.value}</div>}

          <label class={styles.label} for="username">Username</label>
          <input
            id="username"
            class={styles.input}
            type="text"
            autocomplete="username"
            value={username.value}
            onInput={(e) => (username.value = (e.target as HTMLInputElement).value)}
          />

          <label class={styles.label} for="password">Password</label>
          <input
            id="password"
            class={styles.input}
            type="password"
            autocomplete="new-password"
            value={password.value}
            onInput={(e) => (password.value = (e.target as HTMLInputElement).value)}
          />

          <button class={styles.button} type="submit" disabled={loading.value}>
            {loading.value ? 'Creating account...' : 'Create account'}
          </button>
        </form>
      </AuthLayout>
    )
  },
})
