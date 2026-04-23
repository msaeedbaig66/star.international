import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { Avatar } from '@/components/ui/avatar'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

type SearchParams = {
  thread?: string
}

export default async function AdminChatsPage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  const supabase = createAdminClient()
  if (!supabase) return <div>Missing Admin Client Configuration</div>

  const [{ data: threads }, { count: totalMessages }] = await Promise.all([
    supabase
      .from('message_threads')
      .select('id, listing_id, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(200),
    supabase.from('messages').select('*', { count: 'exact', head: true }),
  ])

  const threadRows = threads || []
  const threadIds = threadRows.map((t) => t.id)

  const [{ data: participants }, { data: listings }] = await Promise.all([
    threadIds.length
      ? supabase
          .from('thread_participants')
          .select('thread_id, user_id')
          .in('thread_id', threadIds)
      : Promise.resolve({ data: [] as { thread_id: string; user_id: string }[] }),
    (() => {
      const listingIds = threadRows.map((t) => t.listing_id).filter(Boolean) as string[]
      if (!listingIds.length) {
        return Promise.resolve({ data: [] as { id: string; title: string }[] })
      }
      return supabase.from('listings').select('id, title').in('id', listingIds)
    })(),
  ])

  const userIds = Array.from(new Set((participants || []).map((p) => p.user_id)))
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', userIds)
    : { data: [] as { id: string; username: string | null; full_name: string | null; avatar_url: string | null }[] }

  const participantsByThread = new Map<string, string[]>()
  for (const p of participants || []) {
    const curr = participantsByThread.get(p.thread_id) || []
    curr.push(p.user_id)
    participantsByThread.set(p.thread_id, curr)
  }

  const profileById = new Map((profiles || []).map((p) => [p.id, p]))
  const listingById = new Map((listings || []).map((l) => [l.id, l]))

  const selectedThreadId =
    searchParams?.thread && threadIds.includes(searchParams.thread)
      ? searchParams.thread
      : threadIds[0] || null

  const selectedParticipantIds = selectedThreadId ? participantsByThread.get(selectedThreadId) || [] : []
  const selectedParticipants = selectedParticipantIds.map((id) => profileById.get(id)).filter(Boolean)
  const leftUserId = selectedParticipantIds[0] || null

  const { data: selectedMessages } = selectedThreadId
    ? await supabase
        .from('messages')
        .select('id, thread_id, sender_id, content, created_at, is_read')
        .eq('thread_id', selectedThreadId)
        .order('created_at', { ascending: true })
        .limit(500)
    : { data: [] as any[] }

  return (
    <div className="h-[calc(100vh-8.5rem)] min-h-[620px] flex flex-col gap-6 overflow-hidden">
      <header className="flex-shrink-0 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Admin Security</p>
          <h1 className="text-4xl font-black tracking-tight text-text-primary">User Chats Monitor</h1>
          <p className="text-text-secondary mt-2 max-w-2xl">
            Read-only surveillance panel for user-to-user conversations. No reply or message actions are available here.
          </p>
        </div>
        <div className="bg-white border border-border rounded-2xl px-5 py-4 grid grid-cols-2 gap-6 min-w-[320px]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">Total Threads</p>
            <p className="text-2xl font-black text-text-primary mt-1">{threadRows.length}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">Total Messages</p>
            <p className="text-2xl font-black text-text-primary mt-1">{totalMessages || 0}</p>
          </div>
        </div>
      </header>

      <div className="flex-shrink-0 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-amber-900 text-sm">
        Security mode enabled: conversations are visible for moderation review only.
      </div>

      <div className="min-h-0 grid grid-cols-1 xl:grid-cols-[380px,1fr] gap-6">
        <aside className="min-h-0 bg-white border border-border rounded-3xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-lg font-black text-text-primary">Conversations</h2>
            <p className="text-xs text-text-secondary mt-1">Newest activity first</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {threadRows.length === 0 && (
              <div className="p-8 text-center text-text-secondary text-sm">No user conversations found.</div>
            )}
            {threadRows.map((thread) => {
              const pids = participantsByThread.get(thread.id) || []
              const users = pids.map((id) => profileById.get(id)).filter(Boolean)
              const participantNames = users
                .map((u) => u?.full_name || u?.username || 'Unknown User')
                .join(' • ')
              const firstAvatar = users[0]?.avatar_url || null
              const listingTitle = thread.listing_id ? listingById.get(thread.listing_id)?.title : null
              const isActive = selectedThreadId === thread.id

              return (
                <Link
                  key={thread.id}
                  href={`/admin/chats?thread=${thread.id}`}
                  className={cn(
                    'block px-5 py-4 border-l-4 transition-colors',
                    isActive
                      ? 'border-primary bg-primary-light/40'
                      : 'border-transparent hover:bg-surface'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Avatar src={firstAvatar} fallback={participantNames} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-text-primary truncate">{participantNames || 'Unknown participants'}</p>
                      {listingTitle && (
                        <p className="text-xs text-primary truncate mt-0.5">Listing: {listingTitle}</p>
                      )}
                      <p className="text-[11px] text-text-muted mt-1">Updated {formatRelativeTime(thread.updated_at)}</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </aside>

        <section className="min-h-0 bg-white border border-border rounded-3xl overflow-hidden flex flex-col">
          {!selectedThreadId ? (
            <div className="flex-1 flex items-center justify-center text-center px-6">
              <div>
                <p className="text-lg font-bold text-text-primary">No conversation selected</p>
                <p className="text-sm text-text-secondary mt-1">Choose a thread from the left side to inspect messages.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-border bg-surface/60">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Conversation Details</p>
                <h3 className="text-xl font-black text-text-primary mt-1">
                  {selectedParticipants
                    .map((u) => u?.full_name || u?.username || 'Unknown User')
                    .join(' • ')}
                </h3>
                <p className="text-xs text-text-secondary mt-1">
                  Thread ID: <span className="font-mono">{selectedThreadId}</span>
                </p>
              </div>

              <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 bg-surface/30">
                {(selectedMessages || []).length === 0 && (
                  <div className="h-full flex items-center justify-center text-sm text-text-secondary">
                    No messages in this thread yet.
                  </div>
                )}
                <div className="space-y-3">
                {(selectedMessages || []).map((msg) => {
                  const sender = profileById.get(msg.sender_id)
                  const isLeft = !leftUserId || msg.sender_id === leftUserId
                  return (
                    <div key={msg.id} className={cn('flex items-end gap-2', isLeft ? 'justify-start' : 'justify-end')}>
                      {isLeft && (
                        <Avatar src={sender?.avatar_url} fallback={sender?.full_name || sender?.username || '?'} size="xs" />
                      )}
                      <div className={cn('max-w-[82%] sm:max-w-[70%]', isLeft ? 'items-start' : 'items-end')}>
                        <p className={cn('text-[11px] mb-1', isLeft ? 'text-text-muted' : 'text-text-secondary text-right')}>
                          {sender?.full_name || sender?.username || 'Unknown User'}
                        </p>
                        <div
                          className={cn(
                            'px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words shadow-sm',
                            isLeft
                              ? 'bg-white border border-border text-text-primary rounded-bl-md'
                              : 'bg-primary text-white rounded-br-md'
                          )}
                        >
                          {msg.content}
                        </div>
                        <p className={cn('text-[10px] mt-1', isLeft ? 'text-text-muted' : 'text-primary/80 text-right')}>
                          {formatDate(msg.created_at)} • {formatRelativeTime(msg.created_at)}
                        </p>
                      </div>
                      {!isLeft && (
                        <Avatar src={sender?.avatar_url} fallback={sender?.full_name || sender?.username || '?'} size="xs" />
                      )}
                    </div>
                  )
                })}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
