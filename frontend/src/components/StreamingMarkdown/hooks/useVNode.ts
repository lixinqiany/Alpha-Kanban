import { h, createTextVNode, type VNode } from 'vue'

/**
 * HTML 字符串 → Vue VNode 转换
 */
export function useVNode() {
  const htmlToVNodes = (html: string): VNode[] => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    const transform = (node: Node, index: number): VNode | null => {
      if (node.nodeType === Node.TEXT_NODE) {
        const vnode = createTextVNode(node.textContent || '')
        vnode.key = index
        return vnode
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element
        const props: Record<string, unknown> = { key: index }

        ;[...element.attributes].forEach((attr) => {
          props[attr.name] = attr.value
        })

        const children: VNode[] = []
        element.childNodes.forEach((child, childIndex) => {
          const result = transform(child, childIndex)
          if (result !== null) {
            children.push(result)
          }
        })

        return h(element.tagName.toLowerCase(), props, children)
      }

      return null
    }

    return Array.from(doc.body.childNodes)
      .map((node, i) => transform(node, i))
      .filter((n): n is VNode => n !== null)
  }

  return { htmlToVNodes }
}
