import { defineComponent, h, type Component, type CSSProperties, type PropType } from 'vue'
import styles from './SvgIcon.module.css'

export default defineComponent({
  name: 'SvgIcon',
  props: {
    icon: {
      type: Object as PropType<Component>,
      required: true,
    },
    size: {
      type: Number,
    },
    width: {
      type: Number,
    },
    height: {
      type: Number,
    },
    color: {
      type: String,
    },
  },
  setup(props) {
    return () => {
      const w = props.width ?? props.size
      const ht = props.height ?? props.size

      const style: CSSProperties = {}
      if (w !== null && w !== undefined) style.width = `${w}px`
      if (ht !== null && ht !== undefined) style.height = `${ht}px`
      if (props.color) style.color = props.color

      return (
        <span class={styles.icon} style={style}>
          {h(props.icon!)}
        </span>
      )
    }
  },
})
