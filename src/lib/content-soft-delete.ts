export type SoftDeleteEntity = 'listing' | 'blog' | 'community'
export type SoftDeleteActorRole = 'admin' | 'owner'

export interface SoftDeleteMeta {
  entity: SoftDeleteEntity
  deletedById: string
  deletedByRole: SoftDeleteActorRole
  deletedAt: string
  undoUntil: string
  prevModeration?: string | null
  prevStatus?: string | null
  prevRejectionNote?: string | null
}

const PREFIX = '__SOFT_DELETE__'

function encodeBase64(text: string) {
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(unescape(encodeURIComponent(text)))
  }
  return Buffer.from(text, 'utf8').toString('base64')
}

function decodeBase64(encoded: string) {
  if (typeof globalThis.atob === 'function') {
    return decodeURIComponent(escape(globalThis.atob(encoded)))
  }
  return Buffer.from(encoded, 'base64').toString('utf8')
}

export function encodeSoftDeleteNote(meta: SoftDeleteMeta, visibleMessage?: string) {
  const payload = encodeBase64(JSON.stringify(meta))
  const humanMessage = (visibleMessage || 'Content was deleted and can be restored within 2 days.').trim()
  return `${PREFIX}${payload}\n${humanMessage}`
}

export function parseSoftDeleteNote(note?: string | null): SoftDeleteMeta | null {
  if (!note || !note.startsWith(PREFIX)) return null
  const end = note.indexOf('\n')
  const encoded = end >= 0 ? note.slice(PREFIX.length, end) : note.slice(PREFIX.length)
  try {
    const decoded = decodeBase64(encoded)
    return JSON.parse(decoded) as SoftDeleteMeta
  } catch {
    return null
  }
}

export function isSoftDeleteRecoverable(meta?: SoftDeleteMeta | null) {
  if (!meta?.undoUntil) return false
  return new Date(meta.undoUntil).getTime() > Date.now()
}

export function getSoftDeleteVisibleMessage(note?: string | null) {
  if (!note || !note.startsWith(PREFIX)) return null
  const end = note.indexOf('\n')
  if (end < 0) return null
  const message = note.slice(end + 1).trim()
  return message || null
}

