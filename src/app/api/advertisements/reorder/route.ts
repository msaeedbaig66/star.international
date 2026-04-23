import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const advertisementReorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      display_order: z.number().int().nonnegative(),
    })
  ).min(1),
});

export async function POST(req: Request) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: profile } = await authClient.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = advertisementReorderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const { items } = parsed.data;
    const supabase = createAdminClient();

    const updates = items.map((item) => ({
      id: item.id,
      display_order: item.display_order
    }));

    const { error } = await supabase
      .from('advertisements')
      .upsert(updates, { onConflict: 'id' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Reorder Ad Error:', error);
    return NextResponse.json({ error: 'Failed to reorder advertisements' }, { status: 500 });
  }
}
