import { defineComponent } from 'vue'
import FeatureCard from '../../components/FeatureCard'
import styles from './home.module.css'

const features = [
  {
    icon: <span>📋</span>,
    title: 'Kanban Board',
    description: 'Organize your tasks with a visual drag-and-drop kanban board.',
    tag: 'Coming soon',
    tagVariant: 'warning' as const,
  },
  {
    icon: <span>💬</span>,
    title: 'AI Chat',
    description: 'Chat with AI models to get help with your work and brainstorming.',
    tag: 'Coming soon',
    tagVariant: 'warning' as const,
  },
  {
    icon: <span>📈</span>,
    title: 'Financial Analysis',
    description: 'AI-powered financial market analysis and insights.',
    tag: 'Coming soon',
    tagVariant: 'warning' as const,
  },
]

export default defineComponent({
  setup() {
    return () => (
      <div class={styles.page}>
        <h1 class={styles.welcome}>Welcome to Alpha-Kanban</h1>
        <p class={styles.subtitle}>
          Your all-in-one platform for task management, AI chat, and financial analysis.
        </p>

        <div class={styles.grid}>
          {features.map((f) => (
            <FeatureCard
              key={f.title}
              icon={f.icon}
              title={f.title}
              description={f.description}
              tag={f.tag}
              tagVariant={f.tagVariant}
            />
          ))}
        </div>
      </div>
    )
  },
})
