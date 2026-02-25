# General Chat 全栈开发计划

## 一、目标

将现有 `/chat` 模块重构为 **General Chat**，前后端完整打通，实现可用的 AI 聊天功能。
抽象通用组件供后续金融分析等聊天场景复用。

---

## 二、架构总览

### 分层架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GeneralChatView                             │
│                    （纯组装，~80 行，无业务逻辑）                      │
├─────────────────────────────────────────────────────────────────────┤
│  useChat composable                                                 │
│  （聊天状态管理：会话 CRUD、流式处理、状态机、模型选择）                │
├──────────────────────┬──────────────────────────────────────────────┤
│  api/chat.ts         │  hooks/useSSE.ts                             │
│  （HTTP 接口封装）     │  （POST SSE 流处理工具）                      │
├──────────────────────┴──────────────────────────────────────────────┤
│                        Backend API                                  │
│  chat:         POST /api/chat/conversations              (新建对话，SSE)│
│                POST /api/chat/conversations/{id}/messages (继续对话，SSE)│
│  general_chat: GET  /api/general-chat/conversations      (会话列表)    │
│                GET  /api/general-chat/conversations/{id}/messages (消息)│
│                DELETE /api/general-chat/conversations/{id} (删除)       │
│  model:        GET  /api/model/available                  (可用模型)   │
└─────────────────────────────────────────────────────────────────────┘
```

### 组件依赖关系

```
GeneralChatView
├── useChat()                      ← composable，管理所有状态
│   ├── api/chat.ts                ← HTTP 接口
│   └── hooks/useSSE.ts            ← SSE 流处理
├── GeneralChatLayout              ← components/，通用布局
│   ├── sidebar-header → SidebarHeader    ← views/ 业务子组件
│   ├── sidebar-body   → ConversationList ← views/ 业务子组件
│   └── default        → MessageArea      ← views/ 业务子组件
│                         ├── ChatMessage  ← components/，通用消息
│                         │   └── StreamingMarkdown ← components/，通用 MD
│                         └── ChatInput    ← views/ 业务子组件
└── (无其他直接依赖)

components/（通用，零业务逻辑，可跨场景复用）：
  GeneralChatLayout, ChatMessage, StreamingMarkdown, Dropdown, SvgIcon

views/general-chat/（业务组件，含业务逻辑）：
  GeneralChatView, SidebarHeader, ConversationList, MessageArea, ChatInput
```

---

## 三、后端改动

### 3.1 chat 模块精简（只保留核心聊天）

**现有 chat 模块**需要迁出会话管理逻辑，只保留 SSE 流式对话：

```
modules/chat/（改动后）
├── router.py       # 只保留 2 个 POST 端点
├── service.py      # 只保留 stream_chat + 内部方法
├── schema.py       # 只保留 NewChatRequest / ContinueChatRequest
└── dependencies.py # get_user_conversation（chat 和 general_chat 都会用）
```

迁出的内容：
- `GET /api/chat/conversations` → 迁到 general_chat
- `DELETE /api/chat/conversations/{id}` → 迁到 general_chat
- `list_conversations()` / `delete_conversation()` → 迁到 general_chat/service.py
- `ConversationResponse` → 迁到 general_chat/schema.py

### 3.2 新建 general_chat 模块

**位置**：`backend/modules/general_chat/`

General Chat 业务层，管理会话和消息的查询/删除。

```
backend/modules/general_chat/
├── router.py       # 会话列表 + 消息历史 + 删除会话
├── service.py      # 会话/消息查询逻辑
└── schema.py       # ConversationResponse + MessageResponse
```

**端点**：

| 端点 | 说明 |
|------|------|
| `GET /api/general-chat/conversations` | 会话列表（分页，按 last_chat_time 降序） |
| `GET /api/general-chat/conversations/{id}/messages` | 某会话的消息列表（按 order 升序） |
| `DELETE /api/general-chat/conversations/{id}` | 删除会话（级联删除消息） |

鉴权：全部 `get_current_user`，校验会话归属。

**消息列表响应**：
```json
{
  "items": [
    {
      "id": "uuid",
      "role": "user",
      "content": "Hello!",
      "model": null,
      "status": "completed",
      "thinking": null,
      "order": 1,
      "created_at": "2026-02-25T10:00:00Z"
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "Hi there!",
      "model": "gpt-4o",
      "status": "completed",
      "thinking": null,
      "order": 2,
      "created_at": "2026-02-25T10:00:01Z"
    }
  ]
}
```

### 3.3 新建 model 通用模块

**位置**：`backend/modules/model/`

为普通用户提供模型查询接口（区别于 admin 的 model_management）。

```
backend/modules/model/
├── router.py       # GET /api/model/available
├── service.py      # 查询启用的模型 + 供应商组合
└── schema.py       # 响应类型定义
```

**端点**：`GET /api/model/available`

- 鉴权：`get_current_user`（普通用户可用）
- 返回所有启用的模型，按 manufacturer 分组

```json
{
  "groups": [
    {
      "manufacturer": "openai",
      "manufacturer_label": "OpenAI",
      "models": [
        { "name": "gpt-4o", "display_name": "GPT-4o" },
        { "name": "gpt-4o-mini", "display_name": "GPT-4o Mini" }
      ]
    },
    {
      "manufacturer": "anthropic",
      "manufacturer_label": "Anthropic",
      "models": [
        { "name": "claude-3-5-sonnet", "display_name": "Claude 3.5 Sonnet" }
      ]
    }
  ]
}
```

**查询逻辑**：
```sql
SELECT DISTINCT m.name, m.display_name, m.manufacturer
FROM models m
JOIN model_provider_links mpl ON mpl.model_id = m.id
JOIN providers p ON p.id = mpl.provider_id
WHERE m.is_enabled = true
  AND mpl.is_enabled = true
  AND p.is_enabled = true
ORDER BY m.manufacturer, m.display_name
```

### 3.4 注册路由

`app.py` 中注册新模块：
```python
from modules.general_chat.router import router as general_chat_router
from modules.model.router import router as model_router
app.include_router(general_chat_router)
app.include_router(model_router)
```

---

## 四、前端 — API 层

### 4.1 api/chat.ts

```ts
// 类型定义
interface Conversation {
  id: string
  title: string | null
  last_model: string
  last_chat_time: string
  created_at: string
  updated_at: string
}

interface Message {
  id: string
  role: 'system' | 'user' | 'assistant'
  content: string
  model: string | null
  status: 'generating' | 'completed' | 'aborted'
  thinking: string | null
  order: number
  created_at: string
}

interface ModelGroup {
  manufacturer: string
  manufacturer_label: string
  models: { name: string; display_name: string }[]
}

// SSE 事件类型
type ChatSSEEvent =
  | { type: 'conversation_created'; conversation_id: string }
  | { type: 'thinking'; content: string }
  | { type: 'chunk'; content: string }
  | { type: 'done'; message_id: string; full_content: string; thinking: string | null }
  | { type: 'title'; title: string }
  | { type: 'error'; detail: string }

// API 函数 — general_chat 业务
listConversations(page, pageSize)        → PaginatedResponse<Conversation>
getConversationMessages(conversationId)  → { items: Message[] }
deleteConversation(conversationId)       → void

// API 函数 — model 业务
getAvailableModels()                     → { groups: ModelGroup[] }

// SSE 流 — chat 核心（返回 URL + body，交给 useSSE 处理）
createChat(model, content, thinkingEnabled)                  → SSE stream
continueChat(conversationId, model, content, thinkingEnabled) → SSE stream
```

### 4.2 hooks/useSSE.ts

通用 POST SSE 流处理 hook。后端用 POST 返回 `text/event-stream`，
浏览器原生 `EventSource` 只支持 GET，所以需要 `fetch` + `ReadableStream`。

```ts
interface UseSSEOptions<T> {
  onMessage: (event: T) => void
  onError?: (error: Error) => void
  onComplete?: () => void
}

function useSSE<T>() {
  const isStreaming = ref(false)

  async function start(url: string, body: object, options: UseSSEOptions<T>) {
    isStreaming.value = true
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    // 逐行解析 SSE: "data: {...}\n\n"
    // 每解析到一个完整事件 → 调用 onMessage
    // 流结束 → 调用 onComplete
    // 异常 → 调用 onError
  }

  function abort() { /* AbortController */ }

  return { isStreaming: readonly(isStreaming), start, abort }
}
```

**放置位置**：`frontend/src/hooks/useSSE.ts`（通用工具 hook，不属于任何组件）

---

## 五、前端 — Hooks

### 5.1 hooks/useChat.ts

聊天状态管理 composable，`GeneralChatView` 的唯一数据源。

```ts
function useChat() {
  // ── 状态 ──
  const conversations = ref<Conversation[]>([])
  const activeConversationId = ref<string | null>(null)
  const isNewChatActive = ref(true)          // 页面初始 = new chat 模式
  const messages = ref<Message[]>([])
  const streamingContent = ref('')           // 流式中的部分内容
  const streamingThinking = ref('')          // 流式中的 thinking
  const isStreaming = ref(false)
  const availableModels = ref<ModelGroup[]>([])
  const currentModel = ref<string | null>(null)

  // ── 计算属性 ──
  const currentMessages = computed(...)       // messages + 流式中的临时消息

  // ── 生命周期 ──
  async function init()                       // onMounted: 加载会话列表 + 可用模型
  async function loadConversations()          // 获取会话列表
  async function loadMessages(convId)         // 获取某会话的消息

  // ── 操作 ──
  async function selectConversation(id)       // 切换会话
  function startNewChat()                     // 进入 new chat 模式
  async function sendMessage(content)         // 发送消息（新建或继续）
  async function deleteConversation(id)       // 删除会话
  function changeModel(modelName)             // 切换模型

  // ── 内部：SSE 流处理 ──
  // onMessage handler 处理 6 种事件类型：
  //   conversation_created → 记录新会话 ID
  //   thinking             → 追加 streamingThinking
  //   chunk                → 追加 streamingContent
  //   done                 → 消息完成，更新 messages，清空 streaming 状态
  //   title                → 更新会话标题，new chat active → false
  //   error                → 错误处理

  return {
    // 状态（只读）
    conversations: readonly(conversations),
    activeConversationId: readonly(activeConversationId),
    isNewChatActive: readonly(isNewChatActive),
    currentMessages,
    isStreaming: readonly(isStreaming),
    availableModels: readonly(availableModels),
    currentModel: readonly(currentModel),
    streamingContent: readonly(streamingContent),
    // 操作
    init,
    selectConversation,
    startNewChat,
    sendMessage,
    deleteConversation,
    changeModel,
  }
}
```

**状态机（sendMessage 内部）**：

```
sendMessage(content)
│
├─ isNewChatActive == true?
│  ├─ YES → POST /api/chat/conversations（新建）
│  │         SSE 事件处理：
│  │         conversation_created → 记录 convId
│  │         chunk → 追加内容
│  │         done → 消息入 messages
│  │         title → 更新 title, isNewChatActive=false,
│  │                  新会话插入 conversations 列表顶部
│  │                  activeConversationId = convId
│  │
│  └─ NO → POST /api/chat/conversations/{id}/messages（继续）
│           SSE 事件处理同上（无 conversation_created）
│
└─ 流式过程中 isStreaming=true，UI 禁用输入
```

**放置位置**：`frontend/src/views/general-chat/hooks/useChat.ts`（业务 hook，属于 general-chat）

---

## 六、前端 — 通用组件（components/）

### 6.1 GeneralChatLayout

混合模式布局组件（详细设计见前文，此处不重复）。

```
┌───────────────┬──────────────────────────────────────────────┐
│  Sidebar      │           slot: default                      │
│ ┌───────────┐ │                                              │
│ │ HEADER    │ │      调用方自由控制右侧全部内容                │
│ ├───────────┤ │                                              │
│ │ BODY      │ │                                              │
│ │ flex:1    │ │                                              │
│ │ 可滚动     │ │                                              │
│ ├───────────┤ │                                              │
│ │ FOOTER    │ │                                              │
│ └───────────┘ │                                              │
├───────────────┴──────────────────────────────────────────────┤
│  双模式：slots.sidebar → 完全自定义 / 否则 → 三段式             │
│  props: sidebarWidth?: number (默认 260)                      │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 ChatMessage

通用消息组件，mode × align 四种组合。

```
Props:
  content: string                     // 消息文本
  align: 'left' | 'right'            // 容器定位（文字始终 text-align: left）
  mode: 'flat' | 'bubble'            // 显示模式
  streaming?: boolean                 // 流式中（传给 StreamingMarkdown）
  toolbarActions?: ChatMessageAction[] // hover 时显示的工具按钮

内部使用 StreamingMarkdown 渲染 content。
```

### 6.3 StreamingMarkdown

基于现有 `streaming-markdown` 改进重构，保留 VNode diff 核心。

```
Props:
  content: string          // Markdown 文本
  streaming?: boolean      // 流式中（显示光标 ▊）
  sanitize?: boolean       // DOMPurify 防 XSS（默认 true）
  plugins?: PluginConfig[] // markdown-it 插件
  markdownOptions?: Options

内部流程：
  content → markdown-it.render(highlight.js) → DOMPurify → useVNode → Vue VDOM diff

目录结构：
  components/StreamingMarkdown/
  ├── index.tsx
  ├── streaming-markdown.module.css   （完整 MD 排版样式）
  ├── hooks/useVNode.ts               （HTML → VNode 转换）
  └── plugins/katex.ts                （KaTeX 插件，现有保留）

KaTeX 样式：import '@/assets/katex.css'（现有字体文件保留不动）
```

---

## 七、前端 — 业务组件（views/general-chat/）

### 7.1 SidebarHeader

```
Props: isNewChatActive: boolean
Emit: new-chat

功能按钮行：SvgIcon(new-chat.svg) + 文字
hover/active: 灰色背景(#f6f8fa) + 左侧蓝色竖条(3px, #0969da)
```

### 7.2 ConversationList

```
Props: conversations: Conversation[], activeConversationId: string | null
Emit: select(id: string)

hover/active 样式与 SidebarHeader 一致。
```

### 7.3 MessageArea

```
Props: messages, streamingContent, streamingThinking, isStreaming

消息列表容器（overflow-y: auto），内部渲染 ChatMessage 组件。
padding-bottom 为 ChatInput 腾出空间。
```

### 7.4 ChatInput

```
Props: models: ModelGroup[], currentModel: string | null, disabled?: boolean
Emit: send(content: string), update:model(modelName: string)

布局：圆角矩形内含 textarea + 底部工具栏（Dropdown 模型选择器 | send.svg 按钮）
流式中 disabled=true 禁止输入。
```

### 7.5 GeneralChatView（组装层）

```tsx
export default defineComponent({
  setup() {
    const {
      conversations, activeConversationId, isNewChatActive,
      currentMessages, isStreaming, availableModels, currentModel,
      streamingContent,
      init, selectConversation, startNewChat, sendMessage, changeModel,
    } = useChat()

    onMounted(init)

    return () => (
      <GeneralChatLayout sidebarWidth={260}>
        {{
          'sidebar-header': () => (
            <SidebarHeader isNewChatActive={isNewChatActive.value} onNewChat={startNewChat} />
          ),
          'sidebar-body': () => (
            <ConversationList
              conversations={conversations.value}
              activeConversationId={activeConversationId.value}
              onSelect={selectConversation}
            />
          ),
          default: () =>
            currentMessages.value.length === 0 && !isStreaming.value ? (
              <div class={styles.contentEmpty}>
                <ChatInput models={availableModels.value} currentModel={currentModel.value}
                  onSend={sendMessage} onUpdate:model={changeModel} />
              </div>
            ) : (
              <div class={styles.contentWithMessages}>
                <MessageArea messages={currentMessages.value}
                  streamingContent={streamingContent.value} isStreaming={isStreaming.value} />
                <div class={styles.chatInputWrapper}>
                  <ChatInput models={availableModels.value} currentModel={currentModel.value}
                    disabled={isStreaming.value} onSend={sendMessage} onUpdate:model={changeModel} />
                </div>
              </div>
            ),
        }}
      </GeneralChatLayout>
    )
  },
})
```

---

## 八、右侧叠层布局

```
有消息时：
  .contentWithMessages (position: relative; height: 100%; overflow: hidden)
  ├── MessageArea (height: 100%; overflow-y: auto; padding-bottom: ~120px)
  └── .chatInputWrapper (position: absolute; bottom: 0; background: transparent)
       └── ChatInput（白底圆角矩形）

  .chatInputWrapper { pointer-events: none; }
  .chatInputWrapper > * { pointer-events: auto; }

  滚动时消息从 ChatInput 后面经过，从圆角缝隙和两侧间距处自然露出。
```

---

## 九、文件结构总览

### 后端

```
backend/
├── modules/
│   ├── chat/                           # 精简：只保留 SSE 流式对话
│   │   ├── router.py                   # 移除 GET/DELETE，只保留 2 个 POST
│   │   ├── service.py                  # 移除 list/delete，只保留 stream_chat
│   │   ├── schema.py                   # 移除 ConversationResponse
│   │   └── dependencies.py            # get_user_conversation（共用）
│   ├── general_chat/                   # 新建：会话管理业务
│   │   ├── router.py                   # GET conversations + GET messages + DELETE
│   │   ├── service.py                  # list_conversations + get_messages + delete
│   │   └── schema.py                   # ConversationResponse + MessageResponse
│   └── model/                          # 新建：通用模型查询
│       ├── router.py                   # GET /api/model/available
│       ├── service.py                  # 查询可用模型
│       └── schema.py                   # 响应类型
└── app.py                              # 注册 general_chat + model 路由
```

### 前端新增

```
frontend/src/
├── api/
│   └── chat.ts                         # Chat + Model API 接口 + 类型
├── hooks/
│   └── useSSE.ts                       # 通用 POST SSE 流处理
├── components/
│   ├── GeneralChatLayout/
│   │   ├── index.tsx
│   │   └── general-chat-layout.module.css
│   ├── ChatMessage/
│   │   ├── index.tsx
│   │   └── chat-message.module.css
│   └── StreamingMarkdown/
│       ├── index.tsx
│       ├── streaming-markdown.module.css
│       ├── hooks/useVNode.ts
│       └── plugins/katex.ts
└── views/
    └── general-chat/
        ├── GeneralChatView.tsx
        ├── hooks/
        │   └── useChat.ts              # 聊天状态管理 composable
        ├── sidebar/
        │   ├── SidebarHeader.tsx
        │   ├── SidebarHeader.module.css
        │   ├── ConversationList.tsx
        │   └── ConversationList.module.css
        └── main/
            ├── MessageArea.tsx
            ├── MessageArea.module.css
            ├── ChatInput.tsx
            └── ChatInput.module.css
```

### 前端删除

```
frontend/src/views/chat/                        # 旧 chat 模块
frontend/src/components/streaming-markdown/      # 重构为 StreamingMarkdown/
frontend/src/useVNode.ts                         # 迁入 StreamingMarkdown/hooks/
```

### 前端修改

```
frontend/src/router/index.ts                    # /chat → GeneralChatView
frontend/src/views/home/OverviewContent.tsx      # 确认跳转路径
frontend/src/i18n/locales/zh-CN/chat.ts          # 补充翻译 key
frontend/src/i18n/locales/en-US/chat.ts          # 补充翻译 key
```

---

## 十、依赖管理

### 前端新增依赖

```bash
cd frontend

# dependencies
yarn add markdown-it highlight.js dompurify

# devDependencies（类型定义）
yarn add -D @types/markdown-it @types/dompurify
```

### 后端

无新增依赖（使用现有 SQLAlchemy + FastAPI）。

---

## 十一、实施步骤

### Phase 1：基础设施

**Step 1**：安装前端依赖
**Step 2**：后端精简 chat 模块（迁出会话管理逻辑）
**Step 3**：后端新建 general_chat 模块（会话列表 + 消息历史 + 删除）
**Step 4**：后端新建 model 通用模块（`GET /api/model/available`）

### Phase 2：前端通用组件

**Step 5**：重构 StreamingMarkdown 组件
**Step 6**：创建 GeneralChatLayout 组件
**Step 7**：创建 ChatMessage 组件

### Phase 3：前端业务层

**Step 8**：创建 `hooks/useSSE.ts`
**Step 9**：创建 `api/chat.ts`
**Step 10**：创建侧边栏子组件（SidebarHeader + ConversationList）
**Step 11**：创建主内容区子组件（MessageArea + ChatInput）
**Step 12**：创建 `views/general-chat/hooks/useChat.ts`
**Step 13**：创建 GeneralChatView 组装页面

### Phase 4：集成 & 清理

**Step 14**：删除旧模块 & 清理
**Step 15**：更新路由和导航
**Step 16**：更新 i18n
**Step 17**：Lint & 端到端验证

---

## 十二、后续规划（本次不做）

- [ ] 会话重命名 / 置顶
- [ ] 消息重新生成（regenerate）
- [ ] thinking 展示（折叠/展开）
- [ ] 会话搜索
