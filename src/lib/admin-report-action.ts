export type AdminModerationAction = 'freeze' | 'remove' | 'warn'

export interface AdminActionMeta {
 reportId: string
 action: AdminModerationAction
 adminMessage: string
 createdAt: string
 undoUntil: string
 prevModeration?: string | null
 prevStatus?: string | null
 prevRejectionNote?: string | null
}

const PREFIX = '__ADMIN_ACTION__'

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

export function encodeAdminActionNote(meta: AdminActionMeta): string {
 const payload = encodeBase64(JSON.stringify(meta))
 return `${PREFIX}${payload}\n${meta.adminMessage}`.trim()
}

export function parseAdminActionNote(note?: string | null): AdminActionMeta | null {
 if (!note || !note.startsWith(PREFIX)) return null
 const end = note.indexOf('\n')
 const encoded = end >= 0 ? note.slice(PREFIX.length, end) : note.slice(PREFIX.length)
 try {
 const json = decodeBase64(encoded)
 return JSON.parse(json) as AdminActionMeta
 } catch {
 return null
 }
}

export function getAdminVisibleMessage(note?: string | null): string | null {
 if (!note) return null
 if (!note.startsWith(PREFIX)) return note
 const end = note.indexOf('\n')
 if (end < 0) return null
 const msg = note.slice(end + 1).trim()
 return msg || null
}

export function isUndoWindowOpen(meta?: AdminActionMeta | null) {
 if (!meta?.undoUntil) return false
 return new Date(meta.undoUntil).getTime() > Date.now()
}
