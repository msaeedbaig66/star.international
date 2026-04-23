import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cacheService } from '@/lib/cache-service'

const MAX_MESSAGE_LENGTH = 2000
const DEFAULT_MESSAGES_PAGE_SIZE = 50
const threadIdSchema = z.string().uuid()
const messageQuerySchema = z
  .object({
    before: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict()
const messageCreateSchema = z
  .object({
    content: z.string().trim().max(MAX_MESSAGE_LENGTH).optional(),
    attachment_url: z.string().url().optional(),
    parent_id: z.string().uuid().optional(),
    is_anonymous: z.boolean().optional().default(false),
  })
  .strict()
  .refine(data => data.content || data.attachment_url, {
    message: "Message must contain content or an attachment",
    path: ["content"]
  })

export async function GET(req: Request, { params }: { params: { threadId: string } }) {

  try {
    const parsedThreadId = threadIdSchema.safeParse(params.threadId)
    if (!parsedThreadId.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsedThreadId.error.format() }, { status: 400 })
    }
    const threadId = parsedThreadId.data
    const { searchParams } = new URL(req.url)
    const parsedQuery = messageQuerySchema.safeParse({
      before: searchParams.get('before') || undefined,
      limit: searchParams.get('limit') || undefined,
    })
    if (!parsedQuery.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsedQuery.error.format() }, { status: 400 })
    }
    const pageSize = parsedQuery.data.limit ?? DEFAULT_MESSAGES_PAGE_SIZE

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: participant, error: partError } = await supabase
      .from('thread_participants')
      .select('user_id')
      .eq('thread_id', threadId)
      .eq('user_id', user.id)
      .single();

    if (partError || !participant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let messagesQuery = supabase
      .from('messages')
      .select(`
        id, 
        thread_id, 
        sender_id, 
        content, 
        status, 
        is_read, 
        attachment_url, 
        parent_id,
        is_anonymous,
        reactions,
        created_at, 
        updated_at, 
        sender:profiles(username, avatar_url, full_name),
        parent:messages(id, content, is_anonymous, sender:profiles(username, full_name))
      `)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(pageSize)

    if (parsedQuery.data.before) {
      messagesQuery = messagesQuery.lt('created_at', parsedQuery.data.before)
    }

    const { data: messages, error } = await messagesQuery

    if (error) throw error;

    const normalizedMessages = (messages || []).map((message: any) => ({
      ...message,
      sender: Array.isArray(message.sender) ? (message.sender[0] ?? null) : (message.sender ?? null),
    }))
    const orderedMessages = [...normalizedMessages].reverse()
    const hasMore = (messages || []).length === pageSize

    return NextResponse.json({ data: orderedMessages, hasMore, error: null })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ data: null, error: { message: 'Internal server error' } }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { threadId: string } }) {

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 2. High-Speed Rate Limiting (Message Spam Protection)
    const rateLimitKey = `ratelimit:messages:${user.id}`
    const messageCount = await cacheService.get<number>(rateLimitKey) || 0
    if (messageCount > 10) {
      return NextResponse.json(
        { error: 'You are sending messages too fast. Please slow down.' },
        { status: 429 }
      )
    }
    await cacheService.set(rateLimitKey, messageCount + 1, 60)

    const parsedThreadId = threadIdSchema.safeParse(params.threadId)
    if (!parsedThreadId.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsedThreadId.error.format() }, { status: 400 })
    }
    const threadId = parsedThreadId.data

    const { data: participant, error: participantError } = await supabase
      .from('thread_participants')
      .select('user_id')
      .eq('thread_id', threadId)
      .eq('user_id', user.id)
      .single()

    if (participantError || !participant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: threadParticipants, error: threadParticipantsError } = await supabase
      .from('thread_participants')
      .select('user_id')
      .eq('thread_id', threadId)
    if (threadParticipantsError) throw threadParticipantsError

    const otherParticipant = (threadParticipants || []).find(
      (row: { user_id?: string | null }) => row.user_id && row.user_id !== user.id
    )
    if (!otherParticipant) {
      return NextResponse.json(
        { error: 'Recipient not found. This conversation may have been archived or deleted.' },
        { status: 404 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const parsed = messageCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 })
    }

    const { error: deliveredError } = await supabase
      .from('messages')
      .update({ status: 'delivered' })
      .eq('thread_id', threadId)
      .neq('sender_id', user.id)
      .eq('status', 'sent');
    if (deliveredError) {
      console.error('Failed to update delivered statuses:', deliveredError)
    }

    const { data: senderRoleProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isSenderAdmin = senderRoleProfile?.role === 'admin'
    const finalIsAnonymous = isSenderAdmin ? (parsed.data.is_anonymous || false) : false

    const { data: newMessage, error } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        sender_id: user.id,
        content: parsed.data.content || '',
        attachment_url: parsed.data.attachment_url,
        parent_id: parsed.data.parent_id,
        is_anonymous: finalIsAnonymous,
        status: 'sent'
      })
      .select(`
        id, 
        thread_id, 
        sender_id, 
        content, 
        status, 
        is_read, 
        attachment_url, 
        parent_id,
        is_anonymous,
        reactions,
        created_at, 
        updated_at, 
        sender:profiles(username, avatar_url, full_name),
        parent:messages(id, content, sender:profiles(username, full_name))
      `)
      .single();

    if (error) throw error;
    
    const { error: threadUpdateError } = await supabase
      .from('message_threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', threadId)
    if (threadUpdateError) {
      console.error('Failed to update thread timestamp:', threadUpdateError)
    }

    if (otherParticipant?.user_id) {
       const shortContent = parsed.data.content 
         ? `New message: "${parsed.data.content.substring(0, 50)}${parsed.data.content.length > 50 ? '...' : ''}"` 
         : "Sent you an attachment";
         
        const adminClient = createAdminClient();
        if (adminClient) {
           const { error: notifError } = await adminClient.from('notifications').insert({
             user_id: otherParticipant.user_id,
             actor_id: user.id,
             type: 'message',
             post_id: null,
             message: parsed.data.is_anonymous ? 'Sent you an anonymous message' : shortContent,
             is_read: false,
             is_anonymous: parsed.data.is_anonymous
           });
           if (notifError) console.error('Failed to notify message recipient', notifError);
        }
    }

    const normalizedMessage = {
      ...newMessage,
      sender: Array.isArray((newMessage as any).sender)
        ? ((newMessage as any).sender[0] ?? null)
        : ((newMessage as any).sender ?? null),
    }

    return NextResponse.json({ data: normalizedMessage, error: null })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ data: null, error: { message: 'Internal server error' } }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { threadId: string } }) {

  try {
    const parsedThreadId = threadIdSchema.safeParse(params.threadId)
    if (!parsedThreadId.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsedThreadId.error.format() }, { status: 400 })
    }
    const threadId = parsedThreadId.data

    const { searchParams } = new URL(req.url)
    const messageId = searchParams.get('messageId')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify participation in thread
    const { data: participant, error: partError } = await supabase
      .from('thread_participants')
      .select('user_id')
      .eq('thread_id', threadId)
      .eq('user_id', user.id)
      .single()

    if (partError || !participant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (messageId) {
      // Delete single message
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('id', messageId)
        .eq('thread_id', threadId)
        .single()

      if (messageError || !message) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 })
      }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      const isAdmin = profile?.role === 'admin'
      if (message.sender_id !== user.id && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)

      if (deleteError) throw deleteError
    } else {
      // Clear entire chat (Delete all messages in thread)
      // Note: In a production app, you might want to mark them 
      // as deleted per user, but here we'll delete the records.
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('thread_id', threadId)

      if (deleteError) throw deleteError
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { threadId: string } }) {

  try {
    const parsedThreadId = threadIdSchema.safeParse(params.threadId)
    if (!parsedThreadId.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsedThreadId.error.format() }, { status: 400 })
    }
    const threadId = parsedThreadId.data
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { messageId, emoji, action } = body
    if (!messageId || !emoji || !action) {
      return NextResponse.json({ error: 'Missing required fields: messageId, emoji, or action' }, { status: 400 })
    }

    // Fetch current reactions
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('reactions')
      .eq('id', messageId)
      .single()

    if (fetchError || !message) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

    let reactions = (message.reactions as Record<string, string[]>) || {}
    const users = reactions[emoji] || []

    if (action === 'add') {
      if (!users.includes(user.id)) {
        reactions[emoji] = [...users, user.id]
      }
    } else if (action === 'remove') {
      reactions[emoji] = users.filter(id => id !== user.id)
      if (reactions[emoji].length === 0) delete reactions[emoji]
    }

    const { error: updateError } = await supabase
      .from('messages')
      .update({ reactions })
      .eq('id', messageId)

    if (updateError) throw updateError

    return NextResponse.json({ data: reactions, success: true })
  } catch (error: any) {
    console.error('Admin comment action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
