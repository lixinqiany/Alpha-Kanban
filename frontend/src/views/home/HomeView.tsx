import { defineComponent } from 'vue'
import styles from './home.module.css'

const features = [
  {
    icon: '\u{1F4CB}',
    title: 'Kanban Board',
    description: 'Organize your tasks with a visual drag-and-drop kanban board.',
    tag: 'Coming soon',
    tagClass: 'tagSoon',
  },
  {
    icon: '\u{1F4AC}',
    title: 'AI Chat',
    description: 'Chat with AI models to get help with your work and brainstorming.',
    tag: 'Coming soon',
    tagClass: 'tagSoon',
  },
  {
    icon: '\u{1F4C8}',
    title: 'Financial Analysis',
    description: 'AI-powered financial market analysis and insights.',
    tag: 'Coming soon',
    tagClass: 'tagSoon',
  },
]

export default defineComponent({
  setup() {
    return () => (
      <div class={styles.page}>
        <h1 class={styles.welcome}>Welcome to Alpha-Kanban</h1>
        <p class={styles.subtitle}>Your all-in-one platform for task management, AI chat, and financial analysis.</p>

        <div class={styles.grid}>
          {features.map((f) => (
            <div class={styles.card} key={f.title}>
              <div class={styles.cardIcon}>{f.icon}</div>
              <h3 class={styles.cardTitle}>{f.title}</h3>
              <p class={styles.cardDesc}>{f.description}</p>
              <span class={[styles.cardTag, styles[f.tagClass]]}>{f.tag}</span>
            </div>
          ))}
        </div>
      </div>
    )
  },
})
