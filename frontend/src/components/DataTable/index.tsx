import { defineComponent, type PropType, type VNode } from 'vue'
import styles from './DataTable.module.css'

export interface Column<T = any> {
  key: string
  title: string
  render?: (row: T) => VNode | string
}

export default defineComponent({
  name: 'DataTable',
  props: {
    columns: {
      type: Array as PropType<Column[]>,
      required: true,
    },
    items: {
      type: Array as PropType<any[]>,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    page: {
      type: Number,
      required: true,
    },
    pageSize: {
      type: Number,
      required: true,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    pageSizeOptions: {
      type: Array as PropType<number[]>,
      default: () => [10, 20, 50],
    },
  },
  emits: ['pageChange', 'pageSizeChange'],
  setup(props, { emit }) {
    const totalPages = () => Math.ceil(props.total / props.pageSize) || 1

    return () => (
      <div class={styles.tableWrap}>
        {props.loading ? (
          <div class={styles.loading}>Loading...</div>
        ) : props.items.length === 0 ? (
          <div class={styles.empty}>No data</div>
        ) : (
          <table class={styles.table}>
            <thead>
              <tr>
                {props.columns.map((col) => (
                  <th key={col.key}>{col.title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {props.items.map((row, idx) => (
                <tr key={row.id ?? idx}>
                  {props.columns.map((col) => (
                    <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 分页栏：有数据时始终显示 */}
        {props.total > 0 && (
          <div class={styles.pagination}>
            <div class={styles.paginationInfo}>
              <span>
                {(props.page - 1) * props.pageSize + 1}–
                {Math.min(props.page * props.pageSize, props.total)} of {props.total}
              </span>
              <select
                class={styles.pageSizeSelect}
                value={props.pageSize}
                onChange={(e) =>
                  emit('pageSizeChange', Number((e.target as HTMLSelectElement).value))
                }
              >
                {props.pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt} / page
                  </option>
                ))}
              </select>
            </div>
            <div class={styles.paginationControls}>
              <button
                class={styles.pageBtn}
                disabled={props.page <= 1}
                onClick={() => emit('pageChange', props.page - 1)}
              >
                Previous
              </button>
              <span>
                {props.page} / {totalPages()}
              </span>
              <button
                class={styles.pageBtn}
                disabled={props.page >= totalPages()}
                onClick={() => emit('pageChange', props.page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    )
  },
})
