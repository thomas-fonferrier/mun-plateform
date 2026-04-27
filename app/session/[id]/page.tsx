import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import SessionClient from './SessionClient';

export const dynamic = 'force-dynamic';

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: session, error } = await supabase
    .from('sessions')
    .select('id, name, created_at')
    .eq('id', id)
    .single();

  if (error || !session) {
    notFound();
  }

  return <SessionClient session={session} />;
}
