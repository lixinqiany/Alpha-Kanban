import { defineComponent, ref } from 'vue'
import { login } from '../../api/user'
import AuthLayout from '../../components/AuthLayout'
import styles from './auth.module.css'

export default defineComponent({
  setup() {
    const username = ref('')
    const password = ref('')
    const error = ref('')
    const loading = ref(false)

    async function handleSubmit(e: Event) {
      e.preventDefault()
      error.value = ''

      if (!username.value || !password.value) {
        error.value = 'Please fill in all fields.'
        return
      }

      loading.value = true
      try {
        await login(username.value, password.value)
        console.log('login success')
      } catch (e: any) {
        const status = e.response?.status
        if (status === 401) {
          error.value = 'Incorrect username or password.'
        } else {
          error.value = e.response?.data?.detail || 'Login failed. Please try again.'
        }
      } finally {
        loading.value = false
      }
    }

    return () => (
      <AuthLayout
        title="Sign in to Alpha-Kanban"
        footerText="New here?"
        footerLinkText="Create an account"
        footerLinkTo="/register"
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
            autocomplete="current-password"
            value={password.value}
            onInput={(e) => (password.value = (e.target as HTMLInputElement).value)}
          />

          <button class={styles.button} type="submit" disabled={loading.value}>
            {loading.value ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </AuthLayout>
    )
  },
})
