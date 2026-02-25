import { defineComponent, ref, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import SvgIcon from '@/components/SvgIcon'
import Dropdown from '@/components/Dropdown'
import SendIcon from '@/assets/icons/send.svg?component'
import ArrowDownIcon from '@/assets/icons/arrow-down.svg?component'
import type { AvailableModelsByManufacturer } from '@/api/chat'
import styles from './ChatInput.module.css'

export default defineComponent({
  name: 'ChatInput',
  props: {
    models: { type: Object as PropType<AvailableModelsByManufacturer>, required: true },
    currentModel: { type: String as PropType<string | null>, default: null },
    disabled: { type: Boolean, default: false },
    dropdownPlacement: {
      type: String as PropType<'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'>,
      default: 'bottom-right',
    },
  },
  emits: ['send', 'update:model'],
  setup(props, { emit }) {
    const { t } = useI18n()
    const inputText = ref('')

    const handleSend = () => {
      const content = inputText.value.trim()
      if (!content || props.disabled) return
      emit('send', content)
      inputText.value = ''
    }

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    }

    // 获取当前模型的显示名
    const getCurrentModelLabel = () => {
      for (const models of Object.values(props.models)) {
        const found = models.find((m) => m.name === props.currentModel)
        if (found) return found.display_name
      }
      return props.currentModel || t('chat.selectModel')
    }

    return () => (
      <div class={styles.wrapper}>
        <div class={[styles.inputBox, props.disabled && styles.disabled]}>
          <textarea
            class={styles.textarea}
            rows={2}
            placeholder={t('chat.placeholder')}
            value={inputText.value}
            disabled={props.disabled}
            onInput={(e) => (inputText.value = (e.target as HTMLTextAreaElement).value)}
            onKeydown={handleKeydown}
          />
          <div class={styles.toolbar}>
            <Dropdown placement={props.dropdownPlacement} offset={8}>
              {{
                trigger: () => (
                  <button class={styles.modelSelector} type="button">
                    {getCurrentModelLabel()}
                    <SvgIcon icon={ArrowDownIcon} size={12} />
                  </button>
                ),
                default: () => (
                  <div class={styles.modelMenu}>
                    {Object.entries(props.models).map(([manufacturer, models]) => (
                      <div key={manufacturer}>
                        <div class={styles.modelGroupLabel}>{manufacturer}</div>
                        {models.map((m) => (
                          <button
                            key={m.name}
                            class={[
                              styles.modelOption,
                              m.name === props.currentModel && styles.modelOptionActive,
                            ]}
                            onClick={() => emit('update:model', m.name)}
                          >
                            {m.display_name}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                ),
              }}
            </Dropdown>
            <span class={styles.divider} />
            <button
              class={styles.sendBtn}
              disabled={!inputText.value.trim() || props.disabled}
              onClick={handleSend}
            >
              <SvgIcon icon={SendIcon} size={20} />
            </button>
          </div>
        </div>
      </div>
    )
  },
})
