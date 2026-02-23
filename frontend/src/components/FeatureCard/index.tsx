import { defineComponent, type PropType, type VNode } from 'vue'
import styles from './FeatureCard.module.css'

export default defineComponent({
  name: 'FeatureCard',
  props: {
    icon: {
      type: Object as PropType<VNode>,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    tag: {
      type: String,
    },
    tagVariant: {
      type: String as PropType<'success' | 'warning'>,
      default: 'warning',
    },
  },
  emits: ['click'],
  setup(props, { slots, emit, attrs }) {
    const hasClickListener = () => 'onClick' in attrs

    return () => {
      const iconNode = props.icon ?? slots.icon?.()

      const tagVariantClass = props.tagVariant === 'success'
        ? styles.tagSuccess
        : styles.tagWarning

      return (
        <div
          class={[styles.card, hasClickListener() && styles.clickable]}
          onClick={() => emit('click')}
        >
          {iconNode && <div class={styles.cardIcon}>{iconNode}</div>}
          <h3 class={styles.cardTitle}>{props.title}</h3>
          <p class={styles.cardDesc}>{props.description}</p>
          {props.tag && (
            <span class={[styles.cardTag, tagVariantClass]}>{props.tag}</span>
          )}
        </div>
      )
    }
  },
})
