import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const { sessionId, title, description, adminToken } = await req.json();

  if (!sessionId || !title || !adminToken) {
    return NextResponse.json({ error: 'Session ID, title, and admin token are required' }, { status: 400 });
  }

  const { data: session } = await supabase
    .from('sessions')
    .select('admin_token')
    .eq('id', sessionId)
    .single();

  if (!session || session.admin_token !== adminToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('motions')
    .insert({ session_id: sessionId, title, description: description || null })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ motion: data });
}

export async function PATCH(req: NextRequest) {
  const { motionId, status, adminToken, sessionId } = await req.json();

  if (!motionId || !status || !adminToken || !sessionId) {
    return NextResponse.json({ error: 'All fields required' }, { status: 400 });
  }

  const { data: session } = await supabase
    .from('sessions')
    .select('admin_token')
    .eq('id', sessionId)
    .single();

  if (!session || session.admin_token !== adminToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('motions')
    .update({ status, closed_at: new Date().toISOString() })
    .eq('id', motionId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ motion: data });
}
