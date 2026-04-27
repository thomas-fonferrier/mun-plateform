import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const supabase = getServerSupabaseClient();
  const { sessionId, countryCode, countryName, token } = await req.json();

  if (!sessionId || !countryCode || !countryName || !token) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from('participants')
    .select('id')
    .eq('session_id', sessionId)
    .eq('country_code', countryCode)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'This country has already joined this session' }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('participants')
    .insert({ session_id: sessionId, country_code: countryCode, country_name: countryName, token })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ participant: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = getServerSupabaseClient();
  const { participantId, token } = await req.json();

  const { error } = await supabase
    .from('participants')
    .delete()
    .eq('id', participantId)
    .eq('token', token);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
