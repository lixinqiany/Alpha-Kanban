import { defineComponent, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import GeneralChatLayout from '@/components/GeneralChatLayout'
import SidebarHeader from './sidebar/SidebarHeader'
import type { SidebarFeature } from './sidebar/SidebarHeader'
import ConversationList from './sidebar/ConversationList'
import MessageArea from './main/MessageArea'
import ChatInput from './main/ChatInput'
import { useChat } from './hooks/useChat'
import styles from './general-chat-view.module.css'

export default defineComponent({
  name: 'GeneralChatView',
  setup() {
    const { t } = useI18n()
    const activeFeature = ref<SidebarFeature | null>('newChat')

    const {
      conversations,
      activeConversationId,
      currentMessages,
      isStreaming,
      availableModels,
      currentModel,
      streamingContent,
      streamingThinking,
      init,
      selectConversation: selectConversationRaw,
      startNewChat: startNewChatRaw,
      sendMessage,
      changeModel,
    } = useChat({
      onConversationCreated: () => {
        activeFeature.value = null
      },
      onConversationDeleted: () => {
        activeFeature.value = 'newChat'
      },
    })

    function handleNewChat() {
      startNewChatRaw()
      activeFeature.value = 'newChat'
    }

    function handleSelectConversation(id: string) {
      selectConversationRaw(id)
      activeFeature.value = null
    }

    onMounted(init)

    return () => (
      <GeneralChatLayout sidebarWidth={260}>
        {{
          'sidebar-header': () => (
            <SidebarHeader activeFeature={activeFeature.value} onNewChat={handleNewChat} />
          ),
          'sidebar-body': () => (
            <ConversationList
              conversations={conversations.value}
              activeConversationId={activeConversationId.value}
              onSelect={handleSelectConversation}
            />
          ),
          default: () =>
            currentMessages.value.length === 0 && !isStreaming.value ? (
              <div class={styles.contentEmpty}>
                <h2 class={styles.emptyTitle}>{t('chat.emptyTitle')}</h2>
                <p class={styles.emptySubtitle}>{t('chat.emptySubtitle')}</p>
                <ChatInput
                  models={availableModels.value}
                  currentModel={currentModel.value}
                  onSend={sendMessage}
                  {...{ 'onUpdate:model': changeModel }}
                />
              </div>
            ) : (
              <div class={styles.contentWithMessages}>
                <MessageArea
                  messages={currentMessages.value}
                  streamingContent={streamingContent.value}
                  streamingThinking={streamingThinking.value}
                  isStreaming={isStreaming.value}
                />
                <div class={styles.chatInputWrapper}>
                  <ChatInput
                    models={availableModels.value}
                    currentModel={currentModel.value}
                    disabled={isStreaming.value}
                    onSend={sendMessage}
                    {...{ 'onUpdate:model': changeModel }}
                  />
                </div>
              </div>
            ),
        }}
      </GeneralChatLayout>
    )
  },
})
