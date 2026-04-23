import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthorizedAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

export const dynamic = 'force-dynamic';

async function ensureAdmin() {
  try {
    const admin = await getAuthorizedAdminClient()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { user: null, admin: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    }

    return { user, admin, error: null }
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : 403
    return { user: null, admin: null, error: NextResponse.json({ error: error.message }, { status }) }
  }
}

type BroadcastKind = 'announcement' | 'launch' | 'advertisement' | 'message'

const broadcastBodySchema = z.object({
  kind: z.enum(['announcement', 'launch', 'advertisement', 'message']).default('announcement'),
  title: z.string().trim().min(3).max(200),
  message: z.string().trim().min(8).max(5000),
  cta_url: z
    .string()
    .trim()
    .url()
    .refine((value) => /^https?:\/\//i.test(value), 'CTA URL must start with http:// or https://')
    .optional()
    .or(z.literal('')),
})

function composeBroadcastMessage(kind: BroadcastKind, title: string, body: string, ctaUrl?: string | null) {
  const kindLabel = kind.toUpperCase()
  const lines = [`[BROADCAST] [${kindLabel}] ${title.trim()}`, body.trim()]
  if (ctaUrl) lines.push(`Learn more: ${ctaUrl.trim()}`)
  return lines.join('\n')
}

export async function GET() {
  try {
    const authResult = await ensureAdmin()
    if (authResult.error) return authResult.error
    const user = authResult.user!
    const admin = authResult.admin!

    const [{ count: audienceCount }, { data: rows }] = await Promise.all([
      admin
        .from('profiles')
        .select('id', { head: true, count: 'exact' })
        .in('role', ['user', 'moderator']),
      admin
        .from('notifications')
        .select('message, created_at')
        .eq('actor_id', user.id)
        .eq('type', 'message')
        .ilike('message', '[BROADCAST]%')
        .order('created_at', { ascending: false })
        .limit(5000),
    ])

    const grouped = new Map<string, { message: string; created_at: string; delivered: number }>()
    for (const row of rows || []) {
      const key = `${row.created_at}::${row.message}`
      const existing = grouped.get(key)
      if (existing) {
        existing.delivered += 1
      } else {
        grouped.set(key, {
          message: row.message || '',
          created_at: row.created_at,
          delivered: 1,
        })
      }
    }

    const history = Array.from(grouped.values()).slice(0, 20)
    const sentToday = history.filter((entry) => {
      const d = new Date(entry.created_at)
      const now = new Date()
      return (
        d.getUTCFullYear() === now.getUTCFullYear() &&
        d.getUTCMonth() === now.getUTCMonth() &&
        d.getUTCDate() === now.getUTCDate()
      )
    }).length

    return NextResponse.json({
      data: {
        audienceCount: audienceCount || 0,
        sentToday,
        history,
      },
      error: null,
    })
  } catch (error: any) {
    console.error('admin broadcast GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch broadcast data' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await ensureAdmin()
    if (authResult.error) return authResult.error
    const user = authResult.user!
    const admin = authResult.admin!

    const body = await req.json().catch(() => ({}))
    const parsed = broadcastBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 })
    }
    const kind = parsed.data.kind as BroadcastKind
    const title = parsed.data.title
    const message = parsed.data.message
    const ctaUrl = (parsed.data.cta_url || '').trim()

    const { data: recipients, error: recipientErr } = await admin
      .from('profiles')
      .select('id')
      .in('role', ['user', 'moderator'])

    if (recipientErr) throw recipientErr
    if (!recipients?.length) {
      return NextResponse.json({ data: { delivered: 0 }, error: null })
    }

    const nowIso = new Date().toISOString()
    const composed = composeBroadcastMessage(kind, title, message, ctaUrl || null)
    const rows = recipients.map((r) => ({
      user_id: r.id,
      type: 'message' as const,
      actor_id: user.id,
      message: composed,
      is_read: false,
      created_at: nowIso,
    }))

    const chunkSize = 500
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize)
      const { error } = await admin.from('notifications').insert(chunk)
      if (error) throw error
    }

    return NextResponse.json({
      data: {
        delivered: rows.length,
        created_at: nowIso,
        message: composed,
      },
      error: null,
    })
  } catch (error: any) {
    console.error('admin broadcast POST error:', error)
    return NextResponse.json({ error: 'Failed to send broadcast notifications' }, { status: 500 })
  }
}
