import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: profile } = await authClient.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'listings';
    
    const supabase = createAdminClient();
    
    let table = 'listings';
    if (type === 'blogs') table = 'blogs';
    if (type === 'communities') table = 'communities';

    let query = supabase
      .from(table)
      .select('*')
      .eq('moderation', 'pending')

    if (type === 'listings') {
      query = query.neq('status', 'removed')
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    
    return NextResponse.json({ data, error: null })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json(
      { data: null, error: { message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
