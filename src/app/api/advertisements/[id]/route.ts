import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const httpUrlSchema = z
 .string()
 .trim()
 .url()
 .refine((value) => /^https?:\/\//i.test(value), 'Must be an http(s) URL');

const updateAdvertisementSchema = z
 .object({
 title: z.string().trim().min(1).max(200).optional(),
 image_url: httpUrlSchema.or(z.literal('')).nullable().optional(),
 link_url: httpUrlSchema.or(z.literal('')).nullable().optional(),
 is_active: z.boolean().optional(),
 display_order: z.coerce.number().int().nonnegative().optional(),
 meta: z.record(z.string(), z.unknown()).optional(),
 })
 .refine((value) => Object.keys(value).length > 0, {
 message: 'At least one field is required',
 });

function isMissingMetaColumn(error: any) {
 const message = String(error?.message || '').toLowerCase();
 return message.includes("could not find the 'meta' column") || message.includes('column "meta"');
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {

 try {
 const authClient = await createClient();
 const { data: { user } } = await authClient.auth.getUser();
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 const { data: profile } = await authClient.from('profiles').select('role').eq('id', user.id).single();
 if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

 const { id } = params;
 const body = await req.json().catch(() => ({}));
 const parsed = updateAdvertisementSchema.safeParse(body);
 if (!parsed.success) {
 return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
 }

 const bodyData = parsed.data;
 const payload: Record<string, any> = {}
 if (bodyData.title !== undefined) payload.title = bodyData.title
 if (bodyData.image_url !== undefined) payload.image_url = bodyData.image_url
 if (bodyData.link_url !== undefined) payload.link_url = bodyData.link_url || null
 if (bodyData.is_active !== undefined) payload.is_active = bodyData.is_active
 if (bodyData.display_order !== undefined) payload.display_order = bodyData.display_order
 if (bodyData.meta !== undefined) payload.meta = bodyData.meta

 const supabase = createAdminClient();

 let { data, error } = await supabase
 .from('advertisements')
 .update(payload)
 .eq('id', id)
 .select()
 .single();

 // Backward compatibility: retry without `meta` if that column doesn't exist.
 if (error && payload.meta !== undefined && isMissingMetaColumn(error)) {
 const { meta: _ignored, ...fallbackPayload } = payload;
 const retry = await supabase
 .from('advertisements')
 .update(fallbackPayload)
 .eq('id', id)
 .select()
 .single();
 data = retry.data;
 error = retry.error;
 }

 if (error) throw error;

 return NextResponse.json({ success: true, data });
 } catch (error: any) {
 console.error('Update Ad Error:', error);
 return NextResponse.json({ error: 'Failed to process advertisement' }, { status: 500 });
 }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {

 try {
 const authClient = await createClient();
 const { data: { user } } = await authClient.auth.getUser();
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 const { data: profile } = await authClient.from('profiles').select('role').eq('id', user.id).single();
 if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

 const { id } = params;

 const supabase = createAdminClient();

 const { error } = await supabase
 .from('advertisements')
 .delete()
 .eq('id', id);

 if (error) throw error;

 return NextResponse.json({ success: true });
 } catch (error: any) {
 console.error('Delete Ad Error:', error);
 return NextResponse.json({ error: 'Failed to process advertisement' }, { status: 500 });
 }
}
