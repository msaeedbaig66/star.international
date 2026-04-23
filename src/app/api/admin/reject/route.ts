import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const rejectBodySchema = z.object({
 id: z.string().min(1),
 type: z.enum(['listing', 'blog', 'community']),
 reason: z.string().trim().min(1).max(400),
 message: z.string().trim().max(2000).optional(),
});

export async function POST(req: Request) {
 try {
 const authClient = await createClient();
 const { data: { user } } = await authClient.auth.getUser();
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 const { data: profile } = await authClient.from('profiles').select('role').eq('id', user.id).single();
 if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

 const body = await req.json().catch(() => ({}));
 const parsed = rejectBodySchema.safeParse(body);
 if (!parsed.success) {
 return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
 }
 const { id, type, reason, message } = parsed.data;

 const supabase = createAdminClient();

 let table = '';
 if (type === 'listing') table = 'listings';
 else if (type === 'blog') table = 'blogs';
 else if (type === 'community') table = 'communities';
 else return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

 const fullNote = message ? `${reason}: ${message}` : reason;

 const { error } = await supabase
 .from(table)
 .update({ 
 moderation: 'rejected', 
 rejection_note: fullNote,
 updated_at: new Date().toISOString() 
 })
 .eq('id', id);

 if (error) throw error;

 // Send notification to user about rejection
 if (type === 'listing') {
 const { data: listing } = await supabase.from('listings').select('title, seller_id').eq('id', id).maybeSingle()
 if (listing?.seller_id) {
 await supabase.from('notifications').insert({
 user_id: listing.seller_id,
 type: 'listing_rejected',
 message: `Your listing "${listing.title}" was rejected. Reason: ${reason}`,
 listing_id: id
 })
 }
 } else if (type === 'blog') {
 const { data: blog } = await supabase.from('blogs').select('title, author_id').eq('id', id).maybeSingle()
 if (blog?.author_id) {
 await supabase.from('notifications').insert({
 user_id: blog.author_id,
 type: 'blog_rejected',
 message: `Your blog "${blog.title}" was rejected. Reason: ${reason}`,
 blog_id: id
 })
 }
 } else if (type === 'community') {
 const { data: community } = await supabase.from('communities').select('name, owner_id').eq('id', id).maybeSingle()
 if (community?.owner_id) {
 await supabase.from('notifications').insert({
 user_id: community.owner_id,
 type: 'community_rejected',
 message: `Your Nexus Hub "${community.name}" was rejected. Reason: ${reason}`,
 community_id: id
 })
 }
 }

 return NextResponse.json({ success: true });
 } catch (error: any) {
 console.error('Reject Error Details:', error);
 return NextResponse.json({ 
 error: 'Failed to process rejection',
 debug: error.message 
 }, { status: 500 });
 }
}
