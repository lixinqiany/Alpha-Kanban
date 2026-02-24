import { defineComponent } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { TagItem } from '../../components/FeatureCard'
import FeatureCard from '../../components/FeatureCard'
import styles from './home.module.css'

export default defineComponent({
  setup() {
    const router = useRouter()
    const { t } = useI18n()

    const handleChatClick = () => {
      router.push('/chat')
    }

    return () => (
      <div class={styles.page}>
        <h1 class={styles.welcome}>{t('home.welcome')}</h1>
        <p class={styles.subtitle}>{t('home.subtitle')}</p>

        <div class={styles.grid}>
          <FeatureCard
            icon={<span>💬</span>}
            title={t('home.aiChat')}
            description={t('home.aiChatDesc')}
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
