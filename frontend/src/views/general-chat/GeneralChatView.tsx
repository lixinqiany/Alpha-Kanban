import { defineComponent, computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import GeneralChatLayout from '@/components/GeneralChatLayout'
import SidebarHeader from './sidebar/SidebarHeader'
import ConversationList from './sidebar/ConversationList'
import MessageArea from './main/MessageArea'
import ChatInput from './main/ChatInput'
import SvgIcon from '@/components/SvgIcon'
import RobotIcon from '@/assets/icons/robot.svg?component'
import { useChat } from './hooks/useChat'
import styles from './general-chat-view.module.css'

export default defineComponent({
  name: 'GeneralChatView',
  setup() {
    const route = useRoute()
    const activeFeature = computed(() => (route.params.id ? null : 'newChat'))

    const {
      conversations,
      activeConversationId,
      currentMessages,
      isStreaming,
      availableModels,
      currentModel,
      streamingContent,
      streamingThinking,
      hasMoreConversations,
      conversationsLoading,
      conversationLoadError,
      init,
      selectConversation,
      startNewChat,
      sendMessage,
      changeModel,
      loadMoreConversations,
    } = useChat()

    const chatInputHeight = ref(0)

    onMounted(init)

    return () => (
      <GeneralChatLayout sidebarWidth={260}>
        {{
          'sidebar-header': () => (
            <SidebarHeader activeFeature={activeFeature.value} onNewChat={startNewChat} />
          ),
          'sidebar-body': () => (
            <ConversationList
              conversations={conversations.value}
              activeConversationId={activeConversationId.value}
              hasMore={hasMoreConversations.value}
              loading={conversationsLoading.value}
              error={conversationLoadError.value}
              onSelect={selectConversation}
              onLoadMore={loadMoreConversations}
            />
          ),
          default: () =>
            currentMessages.value.length === 0 && !isStreaming.value ? (
              <div class={styles.contentEmpty}>
                <SvgIcon icon={RobotIcon} size={48} color="#656d76" />
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
                  inputHeight={chatInputHeight.value}
                />
                <div class={styles.chatInputWrapper}>
                  <ChatInput
                    models={availableModels.value}
                    currentModel={currentModel.value}
                    disabled={isStreaming.value}
                    dropdownPlacement="top-left"
                    onSend={sendMessage}
                    onResize={(h: number) => (chatInputHeight.value = h + 40)}
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
