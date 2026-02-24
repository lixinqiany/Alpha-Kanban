import { defineComponent } from 'vue'
import { useRouter } from 'vue-router'
import type { TagItem } from '../../components/FeatureCard'
import FeatureCard from '../../components/FeatureCard'
import styles from './home.module.css'

export default defineComponent({
  setup() {
    const router = useRouter()

    const handleChatClick = () => {
      // TODO: 导航到 AI Chat 页面
      router.push('/chat')
    }

    return () => (
      <div class={styles.page}>
        <h1 class={styles.welcome}>Welcome to Alpha-Kanban</h1>
        <p class={styles.subtitle}>
          Your all-in-one platform for task management, AI chat, and financial analysis.
        </p>

        <div class={styles.grid}>
          <FeatureCard
            icon={<span>💬</span>}
            title="General AI Chat"
            description="Chat with AI models to get help with your work and brainstorming."
            tags={
              [
                { label: 'ChatGPT', variant: 'green' },
                { label: 'Anthropic', variant: 'orange' },
              ] as TagItem[]
            }
            onClick={handleChatClick}
          />
        </div>
      </div>
    )
  },
})
