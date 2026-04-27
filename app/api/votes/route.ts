import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const { motionId, participantToken, vote } = await req.json();

  if (!motionId || !participantToken || !vote) {
    return NextResponse.json({ error: 'All fields required' }, { status: 400 });
  }

  if (!['for', 'against', 'abstain'].includes(vote)) {
    return NextResponse.json({ error: 'Invalid vote value' }, { status: 400 });
  }

  const { data: participant } = await supabase
    .from('participants')
    .select('id, country_code, country_name')
    .eq('token', participantToken)
    .single();

  if (!participant) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
  }

  const { data: motion } = await supabase
    .from('motions')
    .select('status')
    .eq('id', motionId)
    .single();

  if (!motion || motion.status !== 'voting') {
    return NextResponse.json({ error: 'Motion is not open for voting' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('votes')
    .upsert(
      {
        motion_id: motionId,
        participant_id: participant.id,
        country_code: participant.country_code,
        country_name: participant.country_name,
        vote,
      },
      { onConflict: 'motion_id,participant_id' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ vote: data });
}
