import { defineComponent } from 'vue'
import styles from './home.module.css'

export default defineComponent({
  setup() {
    return () => (
      <div class={styles.page}>
        <h1 class={styles.welcome}>Activity</h1>
        <p class={styles.subtitle}>Your recent activity will appear here.</p>
      </div>
    )
  },
})
