import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-server';

const ALLOWED_MOTION_TYPES = ['set_agenda', 'set_speaking_time', 'moderated_caucus', 'unmoderated_caucus'];

export async function POST(req: NextRequest) {
  const supabase = getServerSupabaseClient();
  const { sessionId, title, description, adminToken, participantToken, motionType } = await req.json();

  if (!sessionId || !title) {
    return NextResponse.json({ error: 'Session ID and title are required' }, { status: 400 });
  }

  if (adminToken) {
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
      .insert({
        session_id: sessionId,
        title,
        description: description || null,
        status: 'voting',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ motion: data });
  }

  if (!participantToken || !motionType) {
    return NextResponse.json({ error: 'Participant token and motion type are required' }, { status: 400 });
  }

  if (!ALLOWED_MOTION_TYPES.includes(motionType)) {
    return NextResponse.json({ error: 'Invalid motion type' }, { status: 400 });
  }

  const { data: participant } = await supabase
    .from('participants')
    .select('id, session_id, country_code, country_name')
    .eq('token', participantToken)
    .single();

  if (!participant || participant.session_id !== sessionId) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('motions')
    .insert({
      session_id: sessionId,
      title,
      description: description || null,
      status: 'proposed',
      motion_type: motionType,
      proposer_participant_id: participant.id,
      proposer_country_code: participant.country_code,
      proposer_country_name: participant.country_name,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ motion: data });
}

export async function PATCH(req: NextRequest) {
  const supabase = getServerSupabaseClient();
  const { motionId, status, adminToken, sessionId, decision } = await req.json();

  if (!motionId || !adminToken || !sessionId) {
    return NextResponse.json({ error: 'Motion ID, session ID, and admin token are required' }, { status: 400 });
  }

  const { data: session } = await supabase
    .from('sessions')
    .select('admin_token')
    .eq('id', sessionId)
    .single();

  if (!session || session.admin_token !== adminToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (decision) {
    if (!['consider', 'ignore'].includes(decision)) {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
    }

    const { data: motion } = await supabase
      .from('motions')
      .select('id, status')
      .eq('id', motionId)
      .eq('session_id', sessionId)
      .single();

    if (!motion || motion.status !== 'proposed') {
      return NextResponse.json({ error: 'Motion is no longer pending' }, { status: 400 });
    }

    if (decision === 'consider') {
      const { data: existingVoting } = await supabase
        .from('motions')
        .select('id')
        .eq('session_id', sessionId)
        .eq('status', 'voting')
        .limit(1);

      if (existingVoting && existingVoting.length > 0) {
        return NextResponse.json({ error: 'Close the current vote before considering a new motion' }, { status: 400 });
      }
    }

    const nextStatus = decision === 'consider' ? 'voting' : 'ignored';
    const payload =
      nextStatus === 'ignored'
        ? { status: nextStatus, closed_at: new Date().toISOString() }
        : { status: nextStatus, closed_at: null };

    const { data, error } = await supabase
      .from('motions')
      .update(payload)
      .eq('id', motionId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ motion: data });
  }

  if (!status) {
    return NextResponse.json({ error: 'Status is required when no decision is provided' }, { status: 400 });
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
