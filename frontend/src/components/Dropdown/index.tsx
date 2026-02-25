import {
  defineComponent,
  ref,
  onMounted,
  onUnmounted,
  computed,
  type PropType,
  type CSSProperties,
} from 'vue'
import styles from './Dropdown.module.css'

type Placement = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'

interface DropdownClasses {
  wrapper?: string
  trigger?: string
  dropdown?: string
}

export default defineComponent({
  props: {
    placement: {
      type: String as PropType<Placement>,
      default: 'bottom-right',
    },
    offset: {
      type: Number,
      default: 8,
    },
    classes: {
      type: Object as PropType<DropdownClasses>,
      default: () => ({}),
    },
  },
  setup(props, { slots }) {
    const visible = ref(false)
    const wrapperRef = ref<HTMLElement | null>(null)

    function toggle() {
      visible.value = !visible.value
    }

    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.value && !wrapperRef.value.contains(e.target as Node)) {
        visible.value = false
      }
    }

    onMounted(() => {
      document.addEventListener('click', handleClickOutside, true)
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside, true)
    })

    const positionStyle = computed<CSSProperties>(() => {
      const style: CSSProperties = {}
      const [vertical, horizontal] = props.placement.split('-') as [string, string]

      if (vertical === 'bottom') {
        style.top = `calc(100% + ${props.offset}px)`
      } else {
        style.bottom = `calc(100% + ${props.offset}px)`
      }

      if (horizontal === 'right') {
        style.right = '0'
      } else {
        style.left = '0'
      }

      return style
    })

    return () => (
      <div class={[styles.wrapper, props.classes.wrapper]} ref={wrapperRef}>
        <div class={props.classes.trigger} onClick={toggle}>
          {slots.trigger?.()}
        </div>
        {visible.value && (
          <div class={[styles.dropdown, props.classes.dropdown]} style={positionStyle.value}>
            {slots.default?.()}
          </div>
        )}
      </div>
    )
  },
})
