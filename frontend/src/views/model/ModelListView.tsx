import { defineComponent, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  fetchModels,
  createModel,
  updateModel,
  deleteModel,
  type Model,
  type ModelCreateData,
  type ModelUpdateData,
} from '../../api/model'
import { fetchAllProviders, type Provider } from '../../api/provider'
import DataTable, { type Column } from '../../components/DataTable'
import styles from './model.module.css'

export default defineComponent({
  setup() {
    const { t } = useI18n()
    const models = ref<Model[]>([])
    const loading = ref(false)
    const error = ref('')
    const total = ref(0)
    const page = ref(1)
    const pageSize = ref(10)

    // 所有供应商（用于表单多选）
    const allProviders = ref<Provider[]>([])

    // Modal 状态
    const showFormModal = ref(false)
    const editingModel = ref<Model | null>(null)
    const formName = ref('')
    const formDisplayName = ref('')
    const formManufacturer = ref('openai')
    const formEnabled = ref(true)
    const formProviderIds = ref<string[]>([])
    const formError = ref('')
    const formLoading = ref(false)

    // 删除确认
    const showDeleteModal = ref(false)
    const deletingModel = ref<Model | null>(null)
    const deleteLoading = ref(false)

    async function loadModels() {
      loading.value = true
      error.value = ''
      try {
        const res = await fetchModels(page.value, pageSize.value)
        models.value = res.items
        total.value = res.total
      } catch {
        error.value = t('model.loadFailed')
      } finally {
        loading.value = false
      }
    }

    async function loadProviders() {
      try {
        allProviders.value = await fetchAllProviders()
      } catch {
        // 静默处理
      }
    }

    onMounted(() => {
      loadModels()
      loadProviders()
    })

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
      formManufacturer.value = 'openai'
      formEnabled.value = true
      formProviderIds.value = []
      formError.value = ''
      showFormModal.value = true
    }

    function openEdit(m: Model) {
      editingModel.value = m
      formName.value = m.name
      formDisplayName.value = m.display_name
      formManufacturer.value = m.manufacturer
      formEnabled.value = m.is_enabled
      formProviderIds.value = m.providers.map((p) => p.provider_id)
      formError.value = ''
      showFormModal.value = true
    }

    function toggleProvider(providerId: string) {
      const idx = formProviderIds.value.indexOf(providerId)
      if (idx >= 0) {
        formProviderIds.value.splice(idx, 1)
      } else {
        formProviderIds.value.push(providerId)
      }
    }

    async function handleFormSubmit(e: Event) {
      e.preventDefault()
      formError.value = ''
      formLoading.value = true
      try {
        if (editingModel.value) {
          const payload: ModelUpdateData = {}
          if (formName.value !== editingModel.value.name) payload.name = formName.value
          if (formDisplayName.value !== editingModel.value.display_name)
            payload.display_name = formDisplayName.value
          if (formManufacturer.value !== editingModel.value.manufacturer)
            payload.manufacturer = formManufacturer.value
          payload.is_enabled = formEnabled.value
          payload.provider_ids = formProviderIds.value
          await updateModel(editingModel.value.id, payload)
        } else {
          if (!formName.value || !formDisplayName.value) {
            formError.value = t('model.nameAndDisplayRequired')
            formLoading.value = false
            return
          }
          const payload: ModelCreateData = {
            name: formName.value,
            display_name: formDisplayName.value,
            manufacturer: formManufacturer.value,
            is_enabled: formEnabled.value,
            provider_ids: formProviderIds.value,
          }
          await createModel(payload)
        }
        showFormModal.value = false
        await loadModels()
      } catch (e: unknown) {
        const err = e as { response?: { data?: { detail?: string } } }
        formError.value = err.response?.data?.detail || t('common.operationFailed')
      } finally {
        formLoading.value = false
      }
    }

    function openDelete(m: Model) {
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

    return () => {
      const columns: Column<Model>[] = [
        { key: 'name', title: t('model.modelName') },
        { key: 'display_name', title: t('model.displayName') },
        { key: 'manufacturer', title: t('model.manufacturer') },
        {
          key: 'providers',
          title: t('model.providers'),
          render: (row) => {
            if (row.providers.length === 0)
              return <span style={{ color: '#656d76' }}>{t('model.noProviders')}</span>
            return row.providers.map((p) => p.provider_name).join(', ')
          },
        },
        {
          key: 'is_enabled',
          title: t('provider.status'),
          render: (row) => (
            <span
              class={[styles.status, row.is_enabled ? styles.statusEnabled : styles.statusDisabled]}
            >
              <span class={styles.statusDot}></span>
              {row.is_enabled ? t('common.enabled') : t('common.disabled')}
            </span>
          ),
        },
        {
          key: 'actions',
          title: t('provider.actions'),
          render: (row) => (
            <div class={styles.btnGroup}>
              <button class={styles.btnSecondary} onClick={() => openEdit(row)}>
                {t('common.edit')}
              </button>
              <button class={styles.btnDanger} onClick={() => openDelete(row)}>
                {t('common.delete')}
              </button>
            </div>
          ),
        },
      ]

      return (
        <div class={styles.page}>
          <div class={styles.header}>
            <h1 class={styles.title}>{t('model.title')}</h1>
            <button class={styles.btnPrimary} onClick={openCreate}>
              {t('model.newModel')}
            </button>
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
            <div
              class={styles.overlay}
              onClick={(e) => {
                if (e.target === e.currentTarget) showFormModal.value = false
              }}
            >
              <div class={styles.modal}>
                <div class={styles.modalHeader}>
                  <h2 class={styles.modalTitle}>
                    {editingModel.value ? t('model.editModel') : t('model.newModel')}
                  </h2>
                  <button class={styles.modalClose} onClick={() => (showFormModal.value = false)}>
                    &times;
                  </button>
                </div>
                <form onSubmit={handleFormSubmit}>
                  <div class={styles.modalBody}>
                    {formError.value && <div class={styles.error}>{formError.value}</div>}

                    <div class={styles.formGroup}>
                      <label class={styles.formLabel}>{t('model.modelName')}</label>
                      <input
                        class={styles.formInput}
                        type="text"
                        placeholder="gpt-4o"
                        value={formName.value}
                        onInput={(e) => (formName.value = (e.target as HTMLInputElement).value)}
                      />
                    </div>

                    <div class={styles.formGroup}>
                      <label class={styles.formLabel}>{t('model.displayName')}</label>
                      <input
                        class={styles.formInput}
                        type="text"
                        placeholder="GPT-4o"
                        value={formDisplayName.value}
                        onInput={(e) =>
                          (formDisplayName.value = (e.target as HTMLInputElement).value)
                        }
                      />
                    </div>

                    <div class={styles.formGroup}>
                      <label class={styles.formLabel}>{t('model.manufacturer')}</label>
                      <select
                        class={styles.formInput}
                        value={formManufacturer.value}
                        onChange={(e) =>
                          (formManufacturer.value = (e.target as HTMLSelectElement).value)
                        }
                      >
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                      </select>
                    </div>

                    <div class={styles.formGroup}>
                      <label class={styles.formLabel}>{t('model.selectProviders')}</label>
                      {allProviders.value.length === 0 ? (
                        <div class={styles.noProviders}>{t('model.noProviders')}</div>
                      ) : (
                        <div class={styles.checkboxGroup}>
                          {allProviders.value.map((p) => (
                            <label key={p.id} class={styles.formCheckbox}>
                              <input
                                type="checkbox"
                                checked={formProviderIds.value.includes(p.id)}
                                onChange={() => toggleProvider(p.id)}
                              />
                              {p.name}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <div class={styles.formGroup}>
                      <label class={styles.formCheckbox}>
                        <input
                          type="checkbox"
                          checked={formEnabled.value}
                          onChange={(e) =>
                            (formEnabled.value = (e.target as HTMLInputElement).checked)
                          }
                        />
                        {t('common.enabled')}
                      </label>
                    </div>
                  </div>
                  <div class={styles.modalFooter}>
                    <button
                      type="button"
                      class={styles.btnSecondary}
                      onClick={() => (showFormModal.value = false)}
                    >
                      {t('common.cancel')}
                    </button>
                    <button type="submit" class={styles.btnPrimary} disabled={formLoading.value}>
                      {formLoading.value ? t('common.saving') : t('common.save')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 删除确认 Modal */}
          {showDeleteModal.value && deletingModel.value && (
            <div
              class={styles.overlay}
              onClick={(e) => {
                if (e.target === e.currentTarget) showDeleteModal.value = false
              }}
            >
              <div class={styles.modal}>
                <div class={styles.modalHeader}>
                  <h2 class={styles.modalTitle}>{t('model.deleteModel')}</h2>
                  <button class={styles.modalClose} onClick={() => (showDeleteModal.value = false)}>
                    &times;
                  </button>
                </div>
                <div class={styles.modalBody}>
                  <p class={styles.confirmText}>
                    {t('model.deleteConfirm')} <strong>{deletingModel.value.display_name}</strong>
                    {t('model.deleteWarning')}
                  </p>
                </div>
                <div class={styles.modalFooter}>
                  <button
                    class={styles.btnSecondary}
                    onClick={() => (showDeleteModal.value = false)}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    class={styles.btnDanger}
                    onClick={handleDelete}
                    disabled={deleteLoading.value}
                  >
                    {deleteLoading.value ? t('common.deleting') : t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )
    }
  },
})
