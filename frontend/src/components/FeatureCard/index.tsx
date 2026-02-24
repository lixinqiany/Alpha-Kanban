import { defineComponent, type PropType, type VNode } from 'vue'
import styles from './FeatureCard.module.css'

export type TagVariant = 'blue' | 'green' | 'orange' | 'purple' | 'red'

export interface TagItem {
  label: string
  variant?: TagVariant
}

const variantClassMap: Record<TagVariant, string | undefined> = {
  blue: styles.tagBlue,
  green: styles.tagGreen,
  orange: styles.tagOrange,
  purple: styles.tagPurple,
  red: styles.tagRed,
}

export default defineComponent({
  name: 'FeatureCard',
  props: {
    icon: {
      type: Object as PropType<VNode>,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    tags: {
      type: Array as PropType<TagItem[]>,
      default: () => [],
    },
  },
  emits: ['click'],
  setup(props, { slots, emit, attrs }) {
    const hasClickListener = () => 'onClick' in attrs

    return () => {
      const iconNode = props.icon ?? slots.icon?.()

      return (
        <div
          class={[styles.card, hasClickListener() && styles.clickable]}
          onClick={() => emit('click')}
        >
          {iconNode && <div class={styles.cardIcon}>{iconNode}</div>}
          <h3 class={styles.cardTitle}>{props.title}</h3>
          <p class={styles.cardDesc}>{props.description}</p>
          {props.tags.length > 0 && (
            <div class={styles.cardTags}>
              {props.tags.map((tag) => (
                <span
                  key={tag.label}
                  class={[styles.cardTag, variantClassMap[tag.variant ?? 'blue']]}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}
        </div>
      )
    }
  },
})
