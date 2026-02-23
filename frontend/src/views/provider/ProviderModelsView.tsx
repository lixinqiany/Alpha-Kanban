import { defineComponent, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  fetchProvider,
  fetchModels,
  createModel,
  updateModel,
  deleteModel,
  type Provider,
  type ProviderModel,
  type ModelCreateData,
  type ModelUpdateData,
} from '../../api/provider'
import DataTable, { type Column } from '../../components/DataTable'
import styles from './provider.module.css'

export default defineComponent({
  setup() {
    const route = useRoute()
    const router = useRouter()
    const providerId = route.params.id as string

    const provider = ref<Provider | null>(null)
    const models = ref<ProviderModel[]>([])
    const loading = ref(false)
    const error = ref('')
    const total = ref(0)
    const page = ref(1)
    const pageSize = ref(10)

    // Modal 状态
    const showFormModal = ref(false)
    const editingModel = ref<ProviderModel | null>(null)
    const formName = ref('')
    const formDisplayName = ref('')
    const formEnabled = ref(true)
    const formError = ref('')
    const formLoading = ref(false)

    // 删除确认
    const showDeleteModal = ref(false)
    const deletingModel = ref<ProviderModel | null>(null)
    const deleteLoading = ref(false)

    async function loadModels() {
      loading.value = true
      error.value = ''
      try {
        const res = await fetchModels(providerId, page.value, pageSize.value)
        models.value = res.items
        total.value = res.total
      } catch {
        error.value = '加载模型列表失败'
      } finally {
        loading.value = false
      }
    }

    async function loadData() {
      loading.value = true
      error.value = ''
      try {
        const [p, m] = await Promise.all([
          fetchProvider(providerId),
          fetchModels(providerId, page.value, pageSize.value),
        ])
        provider.value = p
        models.value = m.items
        total.value = m.total
      } catch {
        error.value = '加载数据失败'
      } finally {
        loading.value = false
      }
    }

    onMounted(loadData)

    function onPageChange(p: number) {
      page.value = p
      loadModels()
    }

    function onPageSizeChange(size: number) {
      pageSize.value = size
      page.value = 1
      loadModels()
    }

    function openCreate() {
      editingModel.value = null
      formName.value = ''
      formDisplayName.value = ''
      formEnabled.value = true
      formError.value = ''
      showFormModal.value = true
    }

    function openEdit(m: ProviderModel) {
      editingModel.value = m
      formName.value = m.name
      formDisplayName.value = m.display_name
      formEnabled.value = m.is_enabled
      formError.value = ''
      showFormModal.value = true
    }

    async function handleFormSubmit(e: Event) {
      e.preventDefault()
      formError.value = ''
      formLoading.value = true
      try {
        if (editingModel.value) {
          const payload: ModelUpdateData = {}
          if (formName.value !== editingModel.value.name) payload.name = formName.value
          if (formDisplayName.value !== editingModel.value.display_name) payload.display_name = formDisplayName.value
          payload.is_enabled = formEnabled.value
          await updateModel(editingModel.value.id, payload)
        } else {
          if (!formName.value || !formDisplayName.value) {
            formError.value = '模型名称和显示名称为必填项'
            formLoading.value = false
            return
          }
          const payload: ModelCreateData = {
            name: formName.value,
            display_name: formDisplayName.value,
            is_enabled: formEnabled.value,
          }
          await createModel(providerId, payload)
        }
        showFormModal.value = false
        await loadModels()
      } catch (e: any) {
        formError.value = e.response?.data?.detail || '操作失败'
      } finally {
        formLoading.value = false
      }
    }

    function openDelete(m: ProviderModel) {
      deletingModel.value = m
      showDeleteModal.value = true
    }

    async function handleDelete() {
      if (!deletingModel.value) return
      deleteLoading.value = true
      try {
        await deleteModel(deletingModel.value.id)
        showDeleteModal.value = false
        await loadModels()
      } catch {
        // 静默处理
      } finally {
        deleteLoading.value = false
      }
    }

    const columns: Column<ProviderModel>[] = [
      { key: 'name', title: 'Model Name' },
      { key: 'display_name', title: 'Display Name' },
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
            <button class={styles.btnDanger} onClick={() => openDelete(row)}>Delete</button>
          </div>
        ),
      },
    ]

    return () => (
      <div class={styles.page}>
        {/* 面包屑 */}
        <div class={styles.breadcrumb}>
          <span class={styles.breadcrumbLink} onClick={() => router.push({ name: 'AdminProviderManagement' })}>Providers</span>
          <span class={styles.breadcrumbSep}>/</span>
          <span>{provider.value?.name || '...'}</span>
        </div>

        {/* 供应商摘要 */}
        {provider.value && (
          <div class={styles.summaryCard}>
            <h2 class={styles.summaryName}>{provider.value.name}</h2>
            <div class={styles.summaryMeta}>
              {provider.value.base_url || 'No base URL set'}
              {' · '}
              <span class={[styles.status, provider.value.is_enabled ? styles.statusEnabled : styles.statusDisabled]}>
                <span class={styles.statusDot}></span>
                {provider.value.is_enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        )}

        <div class={styles.header}>
          <h1 class={styles.title}>Models</h1>
          <button class={styles.btnPrimary} onClick={openCreate}>New model</button>
        </div>

        {error.value && <div class={styles.error}>{error.value}</div>}

        <DataTable
          columns={columns}
          items={models.value}
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
                <h2 class={styles.modalTitle}>{editingModel.value ? 'Edit model' : 'New model'}</h2>
                <button class={styles.modalClose} onClick={() => showFormModal.value = false}>&times;</button>
              </div>
              <form onSubmit={handleFormSubmit}>
                <div class={styles.modalBody}>
                  {formError.value && <div class={styles.error}>{formError.value}</div>}

                  <div class={styles.formGroup}>
                    <label class={styles.formLabel}>Model Name</label>
                    <input
                      class={styles.formInput}
                      type="text"
                      placeholder="gpt-4o"
                      value={formName.value}
                      onInput={(e) => formName.value = (e.target as HTMLInputElement).value}
                    />
                  </div>

                  <div class={styles.formGroup}>
                    <label class={styles.formLabel}>Display Name</label>
                    <input
                      class={styles.formInput}
                      type="text"
                      placeholder="GPT-4o"
                      value={formDisplayName.value}
                      onInput={(e) => formDisplayName.value = (e.target as HTMLInputElement).value}
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
        {showDeleteModal.value && deletingModel.value && (
          <div class={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) showDeleteModal.value = false }}>
            <div class={styles.modal}>
              <div class={styles.modalHeader}>
                <h2 class={styles.modalTitle}>Delete model</h2>
                <button class={styles.modalClose} onClick={() => showDeleteModal.value = false}>&times;</button>
              </div>
              <div class={styles.modalBody}>
                <p class={styles.confirmText}>
                  Are you sure you want to delete model <strong>{deletingModel.value.display_name}</strong>? This action cannot be undone.
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
