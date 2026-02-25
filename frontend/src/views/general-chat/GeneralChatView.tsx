import { defineComponent, onMounted, ref } from 'vue'
import GeneralChatLayout from '@/components/GeneralChatLayout'
import SidebarHeader from './sidebar/SidebarHeader'
import type { SidebarFeature } from './sidebar/SidebarHeader'
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

    const chatInputHeight = ref(0)

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
