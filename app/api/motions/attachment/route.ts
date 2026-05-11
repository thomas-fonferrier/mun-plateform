import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient, getServiceSupabaseClient } from '@/lib/supabase-server';
import { MOTION_ATTACHMENTS_BUCKET } from '@/lib/motion-attachment';

/**
 * Returns a short-lived signed URL so the Chair can open a delegate's attachment.
 * POST JSON: { motionId, sessionId, adminToken }
 */
export async function POST(req: NextRequest) {
  const supabase = getServerSupabaseClient();
  const service = getServiceSupabaseClient();
  const { motionId, sessionId, adminToken } = await req.json();

  if (!motionId || !sessionId || !adminToken) {
    return NextResponse.json({ error: 'motionId, sessionId, and adminToken are required' }, { status: 400 });
  }

  if (!service) {
    return NextResponse.json(
      { error: 'Server is not configured for attachments (missing SUPABASE_SERVICE_ROLE_KEY).' },
      { status: 503 }
    );
  }

  const { data: session } = await supabase
    .from('sessions')
    .select('admin_token')
    .eq('id', sessionId)
    .single();

  if (!session || session.admin_token !== adminToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: motion, error } = await supabase
    .from('motions')
    .select('id, attachment_storage_path, attachment_filename')
    .eq('id', motionId)
    .eq('session_id', sessionId)
    .single();

  if (error || !motion?.attachment_storage_path) {
    return NextResponse.json({ error: 'Motion or attachment not found' }, { status: 404 });
  }

  const { data: signed, error: signError } = await service.storage
    .from(MOTION_ATTACHMENTS_BUCKET)
    .createSignedUrl(motion.attachment_storage_path, 120);

  if (signError || !signed?.signedUrl) {
    return NextResponse.json({ error: signError?.message || 'Could not create download link' }, { status: 500 });
  }

  return NextResponse.json({
    url: signed.signedUrl,
    filename: motion.attachment_filename || 'attachment',
  });
}
