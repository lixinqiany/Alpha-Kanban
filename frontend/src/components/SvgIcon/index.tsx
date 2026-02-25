import {
  createVNode,
  defineComponent,
  type Component,
  type CSSProperties,
  type PropType,
} from 'vue'
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
      default: undefined,
    },
    width: {
      type: Number,
      default: undefined,
    },
    height: {
      type: Number,
      default: undefined,
    },
    color: {
      type: String,
      default: undefined,
    },
  },
  setup(props) {
    return () => {
      const w = props.width ?? props.size
      const h = props.height ?? props.size

      const sizeStyle: CSSProperties = {
        ...(w !== undefined && { width: `${w}px` }),
        ...(h !== undefined && { height: `${h}px` }),
      }
      const wrapperStyle: CSSProperties = { ...sizeStyle }
      if (props.color) wrapperStyle.color = props.color

      return (
        <span class={styles.icon} style={wrapperStyle}>
          {createVNode(props.icon, { style: sizeStyle })}
        </span>
      )
    }
  },
})
