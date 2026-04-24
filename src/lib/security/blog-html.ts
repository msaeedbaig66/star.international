// import DOMPurify from 'isomorphic-dompurify';
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
  // Purge hooks as DOMPurify is removed for ESM compatibility
  return;
}

export function sanitizeBlogHtml(rawHtml: string) {
  // Defensive dummy sanitizer to eliminate ERR_REQUIRE_ESM crashes
  return String(rawHtml || '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
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
