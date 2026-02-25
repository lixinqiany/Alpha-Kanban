import { defineComponent, ref, onMounted, onBeforeUnmount, watch, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import styles from './InfiniteScrollList.module.css'

export default defineComponent({
  name: 'InfiniteScrollList',
  props: {
    hasMore: { type: Boolean, required: true },
    loading: { type: Boolean, required: true },
    error: { type: String as PropType<string | null>, default: null },
  },
  emits: ['loadMore', 'retry'],
  setup(props, { emit, slots }) {
    const { t } = useI18n()
    const sentinelRef = ref<HTMLDivElement | null>(null)
    let observer: IntersectionObserver | null = null
    // 记录哨兵是否处于可见状态，用于在 props 变化时补发请求
    let sentinelVisible = false

    function tryLoadMore() {
      if (sentinelVisible && !props.loading && props.hasMore && !props.error) {
        emit('loadMore')
      }
    }

    onMounted(() => {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0]
          if (!entry) return
          sentinelVisible = entry.isIntersecting
          if (entry.isIntersecting) {
            tryLoadMore()
          }
        },
        { threshold: 0 },
      )
      if (sentinelRef.value) {
        observer.observe(sentinelRef.value)
      }
    })

    // loading 结束后，如果哨兵仍可见（内容不够撑满），继续加载
    watch(
      () => props.loading,
      (loading) => {
        if (!loading) tryLoadMore()
      },
    )

    onBeforeUnmount(() => {
      observer?.disconnect()
      observer = null
    })

    return () => {
      const children = slots.default?.()
      const isEmpty = !children || (Array.isArray(children) && children.length === 0)

      return (
        <>
          {isEmpty && !props.loading ? slots.empty?.() : children}
          {/* 底部状态 */}
          {props.loading ? (
            <div class={styles.footer}>
              <span class={styles.spinner} />
              {t('common.loading')}
            </div>
          ) : props.error ? (
            <div class={styles.footer}>
              <span>{props.error}</span>
              <button class={styles.retryBtn} onClick={() => emit('retry')}>
                {t('common.retry')}
              </button>
            </div>
          ) : !props.hasMore && !isEmpty ? (
            <div class={styles.footer}>{t('common.noMore')}</div>
          ) : null}
          {/* 哨兵元素 */}
          <div ref={sentinelRef} class={styles.sentinel} />
        </>
      )
    }
  },
})
