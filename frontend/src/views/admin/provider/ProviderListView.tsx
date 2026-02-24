import { defineComponent, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  fetchProviders,
  createProvider,
  updateProvider,
  deleteProvider,
  type Provider,
  type ProviderCreateData,
  type ProviderUpdateData,
} from '../../../api/provider'
import DataTable, { type Column } from '../../../components/DataTable'
import styles from './provider.module.css'

export default defineComponent({
  setup() {
    const { t } = useI18n()
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
    const MANUFACTURERS = ['openai', 'anthropic']
    const formBaseUrlEntries = ref<{ manufacturer: string; url: string }[]>([])
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
        error.value = t('provider.loadFailed')
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
      formBaseUrlEntries.value = []
      formEnabled.value = true
      formError.value = ''
      showFormModal.value = true
    }

    function openEdit(p: Provider) {
      editingProvider.value = p
      formName.value = p.name
      formApiKey.value = ''
      formBaseUrlEntries.value = Object.entries(p.base_url_map || {}).map(([k, v]) => ({
        manufacturer: k,
        url: v,
      }))
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
          const payload: ProviderUpdateData = {}
          if (formName.value !== editingProvider.value.name) payload.name = formName.value
          if (formApiKey.value) payload.api_key = formApiKey.value
          const urlMap: Record<string, string> = {}
          for (const entry of formBaseUrlEntries.value) {
            if (entry.manufacturer && entry.url) urlMap[entry.manufacturer] = entry.url
          }
          payload.base_url_map = urlMap
          payload.is_enabled = formEnabled.value
          await updateProvider(editingProvider.value.id, payload)
        } else {
          if (!formName.value || !formApiKey.value) {
            formError.value = t('provider.nameAndKeyRequired')
            formLoading.value = false
            return
          }
          const urlMap: Record<string, string> = {}
          for (const entry of formBaseUrlEntries.value) {
            if (entry.manufacturer && entry.url) urlMap[entry.manufacturer] = entry.url
          }
          const payload: ProviderCreateData = {
            name: formName.value,
            api_key: formApiKey.value,
            base_url_map: urlMap,
            is_enabled: formEnabled.value,
          }
          await createProvider(payload)
        }
        showFormModal.value = false
        await loadProviders()
      } catch (e: any) {
        formError.value = e.response?.data?.detail || t('common.operationFailed')
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

    return () => {
      const columns: Column<Provider>[] = [
        { key: 'name', title: t('provider.name') },
        {
          key: 'base_url_map',
          title: t('provider.baseUrlMap'),
          render: (row) => {
            const entries = Object.entries(row.base_url_map || {})
            if (entries.length === 0) return '—'
            return entries.map(([k, v]) => `${k}: ${v}`).join(', ')
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
            <h1 class={styles.title}>{t('provider.title')}</h1>
            <button class={styles.btnPrimary} onClick={openCreate}>
              {t('provider.newProvider')}
            </button>
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
            <div
              class={styles.overlay}
              onClick={(e) => {
                if (e.target === e.currentTarget) showFormModal.value = false
              }}
            >
              <div class={styles.modal}>
                <div class={styles.modalHeader}>
                  <h2 class={styles.modalTitle}>
                    {editingProvider.value ? t('provider.editProvider') : t('provider.newProvider')}
                  </h2>
                  <button class={styles.modalClose} onClick={() => (showFormModal.value = false)}>
                    &times;
                  </button>
                </div>
                <form onSubmit={handleFormSubmit}>
                  <div class={styles.modalBody}>
                    {formError.value && <div class={styles.error}>{formError.value}</div>}

                    <div class={styles.formGroup}>
                      <label class={styles.formLabel}>{t('provider.name')}</label>
                      <input
                        class={styles.formInput}
                        type="text"
                        value={formName.value}
                        onInput={(e) => (formName.value = (e.target as HTMLInputElement).value)}
                      />
                    </div>

                    <div class={styles.formGroup}>
                      <label class={styles.formLabel}>
                        {t('provider.apiKey')}{' '}
                        {editingProvider.value && (
                          <span style={{ fontWeight: 'normal', color: '#656d76' }}>
                            {t('provider.apiKeyHint')}
                          </span>
                        )}
                      </label>
                      <input
                        class={styles.formInput}
                        type="password"
                        value={formApiKey.value}
                        onInput={(e) => (formApiKey.value = (e.target as HTMLInputElement).value)}
                      />
                    </div>

                    <div class={styles.formGroup}>
                      <label class={styles.formLabel}>{t('provider.baseUrlMap')}</label>
                      {formBaseUrlEntries.value.map((entry, idx) => (
                        <div key={idx} class={styles.baseUrlRow}>
                          <select
                            class={styles.baseUrlSelect}
                            value={entry.manufacturer}
                            onChange={(e) => {
                              formBaseUrlEntries.value[idx].manufacturer = (
                                e.target as HTMLSelectElement
                              ).value
                            }}
                          >
                            {MANUFACTURERS.map((m) => (
                              <option
                                key={m}
                                value={m}
                                disabled={
                                  m !== entry.manufacturer &&
                                  formBaseUrlEntries.value.some((e) => e.manufacturer === m)
                                }
                              >
                                {m}
                              </option>
                            ))}
                          </select>
                          <input
                            class={styles.baseUrlInput}
                            type="text"
                            placeholder="https://..."
                            value={entry.url}
                            onInput={(e) => {
                              formBaseUrlEntries.value[idx].url = (
                                e.target as HTMLInputElement
                              ).value
                            }}
                          />
                          <button
                            type="button"
                            class={styles.baseUrlRemove}
                            onClick={() => formBaseUrlEntries.value.splice(idx, 1)}
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                      {formBaseUrlEntries.value.length < MANUFACTURERS.length && (
                        <button
                          type="button"
                          class={styles.btnSecondary}
                          onClick={() => {
                            const used = new Set(
                              formBaseUrlEntries.value.map((e) => e.manufacturer),
                            )
                            const next = MANUFACTURERS.find((m) => !used.has(m)) || MANUFACTURERS[0]
                            formBaseUrlEntries.value.push({ manufacturer: next, url: '' })
                          }}
                        >
                          + {t('provider.addBaseUrl')}
                        </button>
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
          {showDeleteModal.value && deletingProvider.value && (
            <div
              class={styles.overlay}
              onClick={(e) => {
                if (e.target === e.currentTarget) showDeleteModal.value = false
              }}
            >
              <div class={styles.modal}>
                <div class={styles.modalHeader}>
                  <h2 class={styles.modalTitle}>{t('provider.deleteProvider')}</h2>
                  <button class={styles.modalClose} onClick={() => (showDeleteModal.value = false)}>
                    &times;
                  </button>
                </div>
                <div class={styles.modalBody}>
                  <p class={styles.confirmText}>
                    {t('provider.deleteConfirm')} <strong>{deletingProvider.value.name}</strong>
                    {t('provider.deleteProviderWarning')}
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
