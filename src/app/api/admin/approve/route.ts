import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { deliverTargetedNotifications } from '@/lib/notification-delivery';
import { z } from 'zod';

const approveBodySchema = z.object({
  id: z.string().min(1),
  type: z.enum(['listing', 'blog', 'community', 'advertisement']),
});

export async function POST(req: Request) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: profile } = await authClient.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const parsed = approveBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }
    const { id, type } = parsed.data;

    const supabase = createAdminClient();

    let table = '';
    if (type === 'listing') table = 'listings';
    else if (type === 'blog') table = 'blogs';
    else if (type === 'community') table = 'communities';
    else if (type === 'advertisement') table = 'advertisements';
    else return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    const payload: Record<string, any> = { updated_at: new Date().toISOString() }
    if (type !== 'advertisement') {
      payload.moderation = 'approved'
      payload.rejection_note = null
    }

    const { error } = await supabase
      .from(table)
      .update(payload)
      .eq('id', id);

    if (error) throw error;

    if (type === 'blog') {
      const { data: blog } = await supabase
        .from('blogs')
        .select('id, title, author_id')
        .eq('id', id)
        .maybeSingle()

      if (blog?.author_id) {
        // Notify Author
        await supabase.from('notifications').insert({
          user_id: blog.author_id,
          type: 'blog_approved',
          message: `Your blog "${blog.title}" has been approved.`,
          blog_id: blog.id
        })

        // Broadcast to followers
        await deliverTargetedNotifications({
          actorId: blog.author_id,
          authorId: blog.author_id,
          type: 'blog_update',
          message: `New blog published: ${blog.title}`,
          blogId: blog.id
        }).catch(err => console.error('Broadcast failed:', err))
      }
    }

    if (type === 'listing') {
      const { data: listing } = await supabase
        .from('listings')
        .select('id, title, seller_id')
        .eq('id', id)
        .maybeSingle()

      if (listing?.seller_id) {
        await supabase.from('notifications').insert({
          user_id: listing.seller_id,
          type: 'listing_approved',
          message: `Your listing "${listing.title}" has been approved and is now live.`,
          listing_id: listing.id
        })
      }
    }

    if (type === 'community') {
      const { data: community } = await supabase
        .from('communities')
        .select('id, name, owner_id')
        .eq('id', id)
        .maybeSingle()

      if (community?.owner_id) {
        await supabase.from('notifications').insert({
          user_id: community.owner_id,
          type: 'community_approved',
          message: `Your Nexus Hub "${community.name}" has been approved.`,
          community_id: community.id
        })
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Approve Error Details:', error);
    return NextResponse.json({ 
      error: 'Failed to process approval',
      debug: error.message 
    }, { status: 500 });
  }
}
