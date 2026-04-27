import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const supabase = getServerSupabaseClient();
  const { name, adminToken } = await req.json();

  if (!name || !adminToken) {
    return NextResponse.json({ error: 'Name and admin token are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('sessions')
    .insert({ name, admin_token: adminToken })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session: data });
}
