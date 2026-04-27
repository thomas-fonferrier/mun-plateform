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

export async function DELETE(req: NextRequest) {
  const supabase = getServerSupabaseClient();
  const { sessionId, adminToken } = await req.json();

  if (!sessionId || !adminToken) {
    return NextResponse.json({ error: 'Session ID and admin token are required' }, { status: 400 });
  }

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id, admin_token')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (session.admin_token !== adminToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase.from('sessions').delete().eq('id', sessionId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
