import { defineComponent, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  fetchProviders,
  createProvider,
  updateProvider,
  deleteProvider,
  type Provider,
  type ProviderCreateData,
  type ProviderUpdateData,
} from '../../api/provider'
import DataTable, { type Column } from '../../components/DataTable'
import styles from './provider.module.css'

export default defineComponent({
  setup() {
    const router = useRouter()
    const providers = ref<Provider[]>([])
    const loading = ref(false)
    const error = ref('')
    const total = ref(0)
    const page = ref(1)
    const pageSize = ref(10)

    // Modal 状态
    const showFormModal = ref(false)
    const editingProvider = ref<Provider | null>(null)
    const formName = ref('')
    const formApiKey = ref('')
    const formBaseUrl = ref('')
    const formEnabled = ref(true)
    const formError = ref('')
    const formLoading = ref(false)

    // 删除确认
    const showDeleteModal = ref(false)
    const deletingProvider = ref<Provider | null>(null)
    const deleteLoading = ref(false)

    async function loadProviders() {
      loading.value = true
      error.value = ''
      try {
        const res = await fetchProviders(page.value, pageSize.value)
        providers.value = res.items
        total.value = res.total
      } catch {
        error.value = '加载供应商列表失败'
      } finally {
        loading.value = false
      }
    }

    onMounted(loadProviders)

    function onPageChange(p: number) {
      page.value = p
      loadProviders()
    }

    function onPageSizeChange(size: number) {
      pageSize.value = size
      page.value = 1
      loadProviders()
    }

    function openCreate() {
      editingProvider.value = null
      formName.value = ''
      formApiKey.value = ''
      formBaseUrl.value = ''
      formEnabled.value = true
      formError.value = ''
      showFormModal.value = true
    }

    function openEdit(p: Provider) {
      editingProvider.value = p
      formName.value = p.name
      formApiKey.value = ''
      formBaseUrl.value = p.base_url || ''
      formEnabled.value = p.is_enabled
      formError.value = ''
      showFormModal.value = true
    }

    async function handleFormSubmit(e: Event) {
      e.preventDefault()
      formError.value = ''
      formLoading.value = true
      try {
        if (editingProvider.value) {
          // 更新
          const payload: ProviderUpdateData = {}
          if (formName.value !== editingProvider.value.name) payload.name = formName.value
          if (formApiKey.value) payload.api_key = formApiKey.value
          payload.base_url = formBaseUrl.value || null
          payload.is_enabled = formEnabled.value
          await updateProvider(editingProvider.value.id, payload)
        } else {
          // 创建
          if (!formName.value || !formApiKey.value) {
            formError.value = '名称和 API Key 为必填项'
            formLoading.value = false
            return
          }
          const payload: ProviderCreateData = {
            name: formName.value,
            api_key: formApiKey.value,
            base_url: formBaseUrl.value || null,
            is_enabled: formEnabled.value,
          }
          await createProvider(payload)
        }
        showFormModal.value = false
        await loadProviders()
      } catch (e: any) {
        formError.value = e.response?.data?.detail || '操作失败'
      } finally {
        formLoading.value = false
      }
    }

    function openDelete(p: Provider) {
      deletingProvider.value = p
      showDeleteModal.value = true
    }

    async function handleDelete() {
      if (!deletingProvider.value) return
      deleteLoading.value = true
      try {
        await deleteProvider(deletingProvider.value.id)
        showDeleteModal.value = false
        await loadProviders()
      } catch {
        // 静默处理
      } finally {
        deleteLoading.value = false
      }
    }

    const columns: Column<Provider>[] = [
      { key: 'name', title: 'Name' },
      {
        key: 'base_url',
        title: 'Base URL',
        render: (row) => row.base_url || '—',
      },
      {
        key: 'is_enabled',
        title: 'Status',
        render: (row) => (
          <span class={[styles.status, row.is_enabled ? styles.statusEnabled : styles.statusDisabled]}>
            <span class={styles.statusDot}></span>
            {row.is_enabled ? 'Enabled' : 'Disabled'}
          </span>
        ),
      },
      {
        key: 'actions',
        title: 'Actions',
        render: (row) => (
          <div class={styles.btnGroup}>
            <button class={styles.btnSecondary} onClick={() => openEdit(row)}>Edit</button>
            <button class={styles.btnSecondary} onClick={() => router.push(`/providers/${row.id}/models`)}>Models</button>
            <button class={styles.btnDanger} onClick={() => openDelete(row)}>Delete</button>
          </div>
        ),
      },
    ]

    return () => (
      <div class={styles.page}>
        <div class={styles.header}>
          <h1 class={styles.title}>Providers</h1>
          <button class={styles.btnPrimary} onClick={openCreate}>New provider</button>
        </div>

        {error.value && <div class={styles.error}>{error.value}</div>}

        <DataTable
          columns={columns}
          items={providers.value}
          total={total.value}
          page={page.value}
          pageSize={pageSize.value}
          loading={loading.value}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />

        {/* 创建/编辑 Modal */}
        {showFormModal.value && (
          <div class={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) showFormModal.value = false }}>
            <div class={styles.modal}>
              <div class={styles.modalHeader}>
                <h2 class={styles.modalTitle}>{editingProvider.value ? 'Edit provider' : 'New provider'}</h2>
                <button class={styles.modalClose} onClick={() => showFormModal.value = false}>&times;</button>
              </div>
              <form onSubmit={handleFormSubmit}>
                <div class={styles.modalBody}>
                  {formError.value && <div class={styles.error}>{formError.value}</div>}

                  <div class={styles.formGroup}>
                    <label class={styles.formLabel}>Name</label>
                    <input
                      class={styles.formInput}
                      type="text"
                      value={formName.value}
                      onInput={(e) => formName.value = (e.target as HTMLInputElement).value}
                    />
                  </div>

                  <div class={styles.formGroup}>
                    <label class={styles.formLabel}>
                      API Key {editingProvider.value && <span style={{ fontWeight: 'normal', color: '#656d76' }}>(leave blank to keep current)</span>}
                    </label>
                    <input
                      class={styles.formInput}
                      type="password"
                      value={formApiKey.value}
                      onInput={(e) => formApiKey.value = (e.target as HTMLInputElement).value}
                    />
                  </div>

                  <div class={styles.formGroup}>
                    <label class={styles.formLabel}>Base URL</label>
                    <input
                      class={styles.formInput}
                      type="text"
                      placeholder="https://api.openai.com/v1"
                      value={formBaseUrl.value}
                      onInput={(e) => formBaseUrl.value = (e.target as HTMLInputElement).value}
                    />
                  </div>

                  <div class={styles.formGroup}>
                    <label class={styles.formCheckbox}>
                      <input
                        type="checkbox"
                        checked={formEnabled.value}
                        onChange={(e) => formEnabled.value = (e.target as HTMLInputElement).checked}
                      />
                      Enabled
                    </label>
                  </div>
                </div>
                <div class={styles.modalFooter}>
                  <button type="button" class={styles.btnSecondary} onClick={() => showFormModal.value = false}>Cancel</button>
                  <button type="submit" class={styles.btnPrimary} disabled={formLoading.value}>
                    {formLoading.value ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 删除确认 Modal */}
        {showDeleteModal.value && deletingProvider.value && (
          <div class={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) showDeleteModal.value = false }}>
            <div class={styles.modal}>
              <div class={styles.modalHeader}>
                <h2 class={styles.modalTitle}>Delete provider</h2>
                <button class={styles.modalClose} onClick={() => showDeleteModal.value = false}>&times;</button>
              </div>
              <div class={styles.modalBody}>
                <p class={styles.confirmText}>
                  Are you sure you want to delete <strong>{deletingProvider.value.name}</strong>? This will also delete all associated models. This action cannot be undone.
                </p>
              </div>
              <div class={styles.modalFooter}>
                <button class={styles.btnSecondary} onClick={() => showDeleteModal.value = false}>Cancel</button>
                <button class={styles.btnDanger} onClick={handleDelete} disabled={deleteLoading.value}>
                  {deleteLoading.value ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  },
})
