import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const httpUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => /^https?:\/\//i.test(value), 'Must be an http(s) URL');

const createAdvertisementSchema = z.object({
  title: z.string().trim().min(1).max(200),
  image_url: httpUrlSchema.or(z.literal('')).nullable().optional(),
  link_url: httpUrlSchema.or(z.literal('')).nullable().optional(),
  is_active: z.boolean().optional(),
  display_order: z.coerce.number().int().nonnegative().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

function isMissingMetaColumn(error: any) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes("could not find the 'meta' column") || message.includes('column "meta"');
}

export async function POST(req: Request) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: profile } = await authClient.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const parsed = createAdvertisementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }
    const supabase = createAdminClient();

    // Get max display order
    const { data: maxAd } = await supabase
      .from('advertisements')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxAd?.display_order || 0) + 1;
    const requestedOrder = parsed.data.display_order;
    const displayOrder =
      typeof requestedOrder === 'number' && Number.isFinite(requestedOrder) && requestedOrder >= 0
        ? requestedOrder
        : nextOrder;

    let { data, error } = await supabase
      .from('advertisements')
      .insert({
        title: parsed.data.title,
        image_url: parsed.data.image_url,
        link_url: parsed.data.link_url ?? null,
        is_active: parsed.data.is_active ?? true,
        display_order: displayOrder,
        meta: parsed.data.meta ?? {},
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    // Backward compatibility: some DBs don't have `meta` on advertisements.
    if (error && isMissingMetaColumn(error)) {
      const retry = await supabase
        .from('advertisements')
        .insert({
          title: parsed.data.title,
          image_url: parsed.data.image_url ?? '',
          link_url: parsed.data.link_url ?? null,
          is_active: parsed.data.is_active ?? true,
          display_order: displayOrder,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Create Ad Error:', error);
    return NextResponse.json({ error: 'Failed to process advertisement' }, { status: 500 });
  }
}
