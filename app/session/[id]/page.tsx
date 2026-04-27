import { notFound } from 'next/navigation';
import SessionClient from './SessionClient';
import { getServerSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = getServerSupabaseClient();

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
