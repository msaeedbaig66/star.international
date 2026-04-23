import DOMPurify from 'isomorphic-dompurify'
import { isSafeUrl } from './url-security'

const BLOG_ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'u',
  's',
  'blockquote',
  'pre',
  'code',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'a',
  'img',
  'hr',
  'span',
  'div',
  'figure',
  'figcaption',
  'iframe',
] as const

const BLOG_ALLOWED_ATTR = [
  'href',
  'target',
  'rel',
  'src',
  'alt',
  'title',
  'width',
  'height',
  'class',
  'loading',
  'decoding',
  'referrerpolicy',
  'allow',
  'allowfullscreen',
  'frameborder',
] as const

const YOUTUBE_EMBED_PATTERN = /^https:\/\/(?:www\.)?(?:youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)[A-Za-z0-9_-]{11}(?:[?&][^"'<>]*)?$/i

let hooksConfigured = false

function configureSanitizerHooks() {
  if (hooksConfigured) return
  hooksConfigured = true

  DOMPurify.addHook('afterSanitizeAttributes', (node: any) => {
    const nodeName = String(node?.nodeName || '').toLowerCase()

    if (nodeName === 'a') {
      const href = node.getAttribute?.('href')
      if (!isSafeUrl(href)) {
        node.removeAttribute?.('href')
      } else if (node.getAttribute?.('target') === '_blank') {
        node.setAttribute?.('rel', 'noopener noreferrer nofollow')
      }
    }

    if (nodeName === 'img') {
      const src = node.getAttribute?.('src')
      if (!isSafeUrl(src, true)) {
        node.remove()
        return
      }
      node.setAttribute?.('loading', 'lazy')
      node.setAttribute?.('decoding', 'async')
      node.setAttribute?.('referrerpolicy', 'no-referrer')
    }

    if (nodeName === 'iframe') {
      const src = node.getAttribute?.('src')
      if (!YOUTUBE_EMBED_PATTERN.test(String(src || ''))) {
        node.remove()
        return
      }
      node.setAttribute?.('loading', 'lazy')
      node.setAttribute?.('referrerpolicy', 'strict-origin-when-cross-origin')
      node.setAttribute?.('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share')
      node.setAttribute?.('allowfullscreen', 'true')
    }
  })
}

export function sanitizeBlogHtml(rawHtml: string) {
  configureSanitizerHooks()
  return DOMPurify.sanitize(String(rawHtml || ''), {
    ALLOWED_TAGS: [...BLOG_ALLOWED_TAGS],
    ALLOWED_ATTR: [...BLOG_ALLOWED_ATTR],
    FORBID_TAGS: [
      'script',
      'style',
      'link',
      'meta',
      'base',
      'object',
      'embed',
      'svg',
      'math',
      'form',
      'input',
      'button',
      'textarea',
      'select',
      'option',
      'noscript',
    ],
    FORBID_ATTR: ['srcset'],
    ALLOW_DATA_ATTR: false,
  })
}

export function stripHtmlToText(input: string) {
  return String(input || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildBlogExcerpt(excerpt: string | null | undefined, sanitizedContent: string, maxLength = 150) {
  const source = excerpt ? sanitizeBlogHtml(excerpt) : sanitizedContent
  const plain = stripHtmlToText(source)
  if (!plain) return ''
  if (plain.length <= maxLength) return plain
  return `${plain.slice(0, maxLength).trimEnd()}...`
}
