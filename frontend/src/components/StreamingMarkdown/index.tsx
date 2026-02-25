import { defineComponent, type PropType } from 'vue'
import markdownIt, { type Options, type PluginWithParams } from 'markdown-it'
import hljs from 'highlight.js'
import DOMPurify from 'dompurify'
import { useVNode } from './hooks/useVNode'
import styles from './streaming-markdown.module.css'

interface PluginConfig {
  plugin: PluginWithParams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export default defineComponent({
  name: 'StreamingMarkdown',
  props: {
    content: { type: String, required: true },
    streaming: { type: Boolean, default: false },
    sanitize: { type: Boolean, default: true },
    plugins: {
      type: Array as PropType<PluginConfig[]>,
      default: () => [],
    },
    markdownOptions: {
      type: Object as PropType<Options>,
      default: () => ({}),
    },
  },
  setup(props) {
    const { htmlToVNodes } = useVNode()

    const md: markdownIt = markdownIt({
      html: true,
      linkify: true,
      breaks: true,
      highlight(str: string, lang: string): string {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return `<pre class="${styles.codeBlock}"><code class="hljs language-${lang}">${hljs.highlight(str, { language: lang }).value}</code></pre>`
          } catch {
            // 忽略高亮失败
          }
        }
        return `<pre class="${styles.codeBlock}"><code class="hljs">${escapeHtml(str)}</code></pre>`
      },
      ...props.markdownOptions,
    })

    props.plugins.forEach(({ plugin, options }) => {
      md.use(plugin, options)
    })

    return () => {
      const rawHtml = md.render(props.content)
      const html = props.sanitize ? DOMPurify.sanitize(rawHtml) : rawHtml

      return (
        <div class={styles.markdownBody}>
          {htmlToVNodes(html)}
          {props.streaming && <span class={styles.cursor}>▊</span>}
        </div>
      )
    }
  },
})
