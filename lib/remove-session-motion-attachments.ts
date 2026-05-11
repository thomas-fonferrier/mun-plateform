import { getServiceSupabaseClient } from '@/lib/supabase-server';
import { MOTION_ATTACHMENTS_BUCKET } from '@/lib/motion-attachment';

/** Best-effort cleanup of Storage objects under sessionId/ before the session row is deleted. */
export async function removeMotionAttachmentsForSession(sessionId: string): Promise<void> {
  const service = getServiceSupabaseClient();
  if (!service) return;

  const { data: files, error } = await service.storage.from(MOTION_ATTACHMENTS_BUCKET).list(sessionId, {
    limit: 1000,
  });
  if (error || !files?.length) return;

  const paths = files.map((f) => `${sessionId}/${f.name}`);
  await service.storage.from(MOTION_ATTACHMENTS_BUCKET).remove(paths);
}
