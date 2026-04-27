import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const { sessionId, countryCode, countryName, durationSeconds, adminToken } = await req.json();

  if (!sessionId || !countryCode || !countryName || !durationSeconds || !adminToken) {
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

  await supabase
    .from('speaker_timers')
    .update({ is_active: false })
    .eq('session_id', sessionId)
    .eq('is_active', true);

  const expiresAt = new Date(Date.now() + durationSeconds * 1000).toISOString();

  const { data, error } = await supabase
    .from('speaker_timers')
    .insert({
      session_id: sessionId,
      country_code: countryCode,
      country_name: countryName,
      duration_seconds: durationSeconds,
      expires_at: expiresAt,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ timer: data });
}

export async function DELETE(req: NextRequest) {
  const { sessionId, adminToken } = await req.json();

  const { data: session } = await supabase
    .from('sessions')
    .select('admin_token')
    .eq('id', sessionId)
    .single();

  if (!session || session.admin_token !== adminToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await supabase
    .from('speaker_timers')
    .update({ is_active: false })
    .eq('session_id', sessionId)
    .eq('is_active', true);

  return NextResponse.json({ success: true });
}
