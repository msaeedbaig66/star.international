import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateSlug } from '@/lib/utils';

const officialCommunitySchema = z.object({
  id: z.string().min(1),
  is_official: z.boolean(),
});

const createOfficialCommunitySchema = z.object({
  action: z.literal('create'),
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().max(1000).optional(),
  type: z.enum(['field', 'project']),
  field: z.string().trim().max(120).optional(),
  avatar_url: z.string().url().optional().or(z.literal('')),
  banner_url: z.string().url().optional().or(z.literal('')),
  rules: z.string().trim().max(2000).optional(),
});

async function resolveUniqueCommunitySlug(
  supabase: ReturnType<typeof createAdminClient>,
  baseName: string
) {
  const baseSlug = generateSlug(baseName) || 'official-community'
  for (let i = 0; i < 40; i += 1) {
    const candidate = i === 0 ? baseSlug : `${baseSlug}-${i}`
    const { data, error } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()
    if (error) throw error
    if (!data) return candidate
  }
  return `${baseSlug}-${Date.now().toString().slice(-4)}`
}

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
    const createParsed = createOfficialCommunitySchema.safeParse(body);
    const toggleParsed = officialCommunitySchema.safeParse(body);
    if (!createParsed.success && !toggleParsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: toggleParsed.error.format() },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    if (createParsed.success) {
      const { name, description, type, field, avatar_url, banner_url, rules } = createParsed.data
      const slug = await resolveUniqueCommunitySlug(supabase, name)

      const { data: created, error: createError } = await supabase
        .from('communities')
        .insert({
          owner_id: user.id,
          name,
          slug,
          description: description || null,
          type,
          field: field || null,
          avatar_url: avatar_url || null,
          banner_url: banner_url || null,
          rules: rules || null,
          is_official: true,
          moderation: 'approved',
          member_count: 1,
          post_count: 0,
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single()

      if (createError) throw createError

      const { error: memberError } = await supabase
        .from('community_members')
        .insert({ community_id: created.id, user_id: user.id, role: 'admin' })
      if (memberError && String((memberError as any).code || '') !== '23505') {
        throw memberError
      }

      const { data: owner, error: ownerError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, university')
        .eq('id', user.id)
        .maybeSingle()
      if (ownerError) throw ownerError

      return NextResponse.json({ success: true, data: { ...created, owner: owner || null } }, { status: 201 })
    }

    if (!toggleParsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: toggleParsed.error.format() }, { status: 400 })
    }

    const { id, is_official } = toggleParsed.data
    const { error } = await supabase
      .from('communities')
      .update({ is_official, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Official Toggle Error:', error);
    return NextResponse.json({ error: 'Failed to process community action' }, { status: 500 });
  }
}
