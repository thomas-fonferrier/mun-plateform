import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-server';
import { buildSessionMotionsSummaryPdf, sanitizeFilenameBase } from '@/lib/session-motions-pdf';
import { removeMotionAttachmentsForSession } from '@/lib/remove-session-motion-attachments';

const VOTED_MOTION_STATUSES = ['voting', 'passed', 'failed', 'withdrawn'] as const;

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
    .select('id, admin_token, name')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (session.admin_token !== adminToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: motions, error: motionsError } = await supabase
    .from('motions')
    .select(
      'id, title, description, status, motion_type, proposer_country_name, created_at, closed_at, attachment_filename'
    )
    .eq('session_id', sessionId)
    .in('status', [...VOTED_MOTION_STATUSES])
    .order('created_at', { ascending: true });

  if (motionsError) {
    return NextResponse.json({ error: motionsError.message }, { status: 500 });
  }

  const motionList = motions || [];
  const motionIds = motionList.map((m) => m.id);

  let votesRows: { motion_id: string; country_name: string; vote: 'for' | 'against' | 'abstain' }[] = [];
  if (motionIds.length > 0) {
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('motion_id, country_name, vote')
      .in('motion_id', motionIds);

    if (votesError) {
      return NextResponse.json({ error: votesError.message }, { status: 500 });
    }
    votesRows = (votes || []) as typeof votesRows;
  }

  const votesByMotionId: Record<string, { country_name: string; vote: 'for' | 'against' | 'abstain' }[]> = {};
  for (const v of votesRows) {
    if (!votesByMotionId[v.motion_id]) votesByMotionId[v.motion_id] = [];
    votesByMotionId[v.motion_id].push({ country_name: v.country_name, vote: v.vote });
  }

  const pdfBuffer = buildSessionMotionsSummaryPdf({
    sessionName: session.name,
    sessionId,
    endedAt: new Date(),
    motions: motionList,
    votesByMotionId,
  });

  await removeMotionAttachmentsForSession(sessionId);

  const { error } = await supabase.from('sessions').delete().eq('id', sessionId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const base = sanitizeFilenameBase(session.name);
  const filename = `${base}-motions-summary.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
