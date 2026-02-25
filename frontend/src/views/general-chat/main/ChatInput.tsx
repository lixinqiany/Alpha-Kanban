import { defineComponent, ref, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import SvgIcon from '@/components/SvgIcon'
import Dropdown from '@/components/Dropdown'
import SendIcon from '@/assets/icons/send.svg?component'
import type { ModelGroup } from '@/api/chat'
import styles from './ChatInput.module.css'

export default defineComponent({
  name: 'ChatInput',
  props: {
    models: { type: Array as PropType<ModelGroup[]>, required: true },
    currentModel: { type: String as PropType<string | null>, default: null },
    disabled: { type: Boolean, default: false },
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
      for (const group of props.models) {
        const found = group.models.find((m) => m.name === props.currentModel)
        if (found) return found.display_name
      }
      return props.currentModel || t('chat.selectModel')
    }

    return () => (
      <div class={styles.wrapper}>
        <div class={[styles.inputBox, props.disabled && styles.disabled]}>
          <textarea
            class={styles.textarea}
            rows={1}
            placeholder={t('chat.placeholder')}
            value={inputText.value}
            disabled={props.disabled}
            onInput={(e) => (inputText.value = (e.target as HTMLTextAreaElement).value)}
            onKeydown={handleKeydown}
          />
          <div class={styles.toolbar}>
            <Dropdown placement="top-left" offset={8}>
              {{
                trigger: () => (
                  <button class={styles.modelSelector} type="button">
                    {getCurrentModelLabel()}
                  </button>
                ),
                default: () => (
                  <div class={styles.modelMenu}>
                    {props.models.map((group) => (
                      <div key={group.manufacturer}>
                        <div class={styles.modelGroupLabel}>{group.manufacturer_label}</div>
                        {group.models.map((m) => (
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
            <button
              class={styles.sendBtn}
              disabled={!inputText.value.trim() || props.disabled}
              onClick={handleSend}
            >
              <SvgIcon icon={SendIcon} size={18} />
            </button>
          </div>
        </div>
      </div>
    )
  },
})
