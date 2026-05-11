export const MOTION_ATTACHMENTS_BUCKET = 'motion-attachments';

const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]);

const ALLOWED_EXT = new Set(['.pdf', '.docx', '.doc']);

export function safeAttachmentBasename(name: string): string {
  const base = name.replace(/^.*[/\\]/, '').trim();
  const cleaned = base.replace(/[^\w.\-+()\s[\]]/g, '_').replace(/\s+/g, ' ');
  return (cleaned.slice(0, 180) || 'attachment').replace(/^\.+/, '');
}

export function validateMotionAttachmentFile(file: File): { ok: true } | { ok: false; error: string } {
  if (file.size > MAX_BYTES) {
    return { ok: false, error: 'Attachment must be 10 MB or smaller.' };
  }
  if (file.size === 0) {
    return { ok: false, error: 'Attachment file is empty.' };
  }
  const lower = file.name.toLowerCase();
  const dot = lower.lastIndexOf('.');
  const ext = dot >= 0 ? lower.slice(dot) : '';
  if (!ALLOWED_EXT.has(ext)) {
    return { ok: false, error: 'Only PDF or Word documents (.pdf, .docx, .doc) are allowed.' };
  }
  const mime = (file.type || '').toLowerCase();
  if (mime && !ALLOWED_MIMES.has(mime)) {
    return { ok: false, error: 'Invalid file type. Use PDF or Word (.docx / .doc).' };
  }
  // Some browsers omit MIME for .docx; extension check above is authoritative.
  return { ok: true };
}
