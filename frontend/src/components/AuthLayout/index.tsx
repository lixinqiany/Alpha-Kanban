import { defineComponent, type PropType } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import styles from './AuthLayout.module.css'

export default defineComponent({
  props: {
    title: { type: String, required: true },
    footerText: { type: String, required: true },
    footerLinkText: { type: String, required: true },
    footerLinkTo: { type: [String, Object] as PropType<RouteLocationRaw>, required: true },
  },
  setup(props, { slots }) {
    return () => (
      <div class={styles.page}>
        <div class={styles.header}>
          <svg
            class={styles.logo}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* 左：红色阴线（跌） */}
            <line x1="10" y1="4" x2="10" y2="44" stroke="#cf222e" stroke-width="2" />
            <rect x="5" y="12" width="10" height="16" rx="1" fill="#cf222e" />
            {/* 中：绿色阳线（涨） */}
            <line x1="24" y1="8" x2="24" y2="40" stroke="#2da44e" stroke-width="2" />
            <rect x="19" y="16" width="10" height="14" rx="1" fill="#2da44e" />
            {/* 右：绿色阳线（涨） */}
            <line x1="38" y1="2" x2="38" y2="36" stroke="#2da44e" stroke-width="2" />
            <rect x="33" y="8" width="10" height="18" rx="1" fill="#2da44e" />
          </svg>
          <h1 class={styles.title}>{props.title}</h1>
        </div>

        {slots.default?.()}

        <div class={styles.footer}>
          <p>
            {props.footerText}{' '}
            <RouterLink to={props.footerLinkTo} class={styles.link}>
              {props.footerLinkText}
            </RouterLink>
            .
          </p>
        </div>
      </div>
    )
  },
})
