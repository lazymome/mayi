import { marked } from 'marked'
import DOMPurify from 'dompurify'

const MARKDOWN_HTML_CACHE_LIMIT = 120
const markdownHtmlCache = new Map()

export const renderMarkdownHtml = (content) => {
  const raw = String(content || '')
  if (!raw) return ''
  const cached = markdownHtmlCache.get(raw)
  if (cached) return cached

  const sanitized = DOMPurify.sanitize(marked.parse(raw))
  const html = sanitized
    .replace(/<table/g, '<div class="markdown-table-scroll"><table')
    .replace(/<\/table>/g, '</table></div>')

  markdownHtmlCache.set(raw, html)
  if (markdownHtmlCache.size > MARKDOWN_HTML_CACHE_LIMIT) {
    const firstKey = markdownHtmlCache.keys().next().value
    markdownHtmlCache.delete(firstKey)
  }
  return html
}
