import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient, getServiceSupabaseClient } from '@/lib/supabase-server';
import {
  MOTION_ATTACHMENTS_BUCKET,
  safeAttachmentBasename,
  validateMotionAttachmentFile,
} from '@/lib/motion-attachment';

const ALLOWED_MOTION_TYPES = ['set_agenda', 'set_speaking_time', 'moderated_caucus', 'unmoderated_caucus'];

export async function POST(req: NextRequest) {
  const supabase = getServerSupabaseClient();
  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    return handleParticipantProposalMultipart(req, supabase);
  }

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

async function handleParticipantProposalMultipart(
  req: NextRequest,
  supabase: ReturnType<typeof getServerSupabaseClient>
) {
  let uploadedPath: string | null = null;
  const service = getServiceSupabaseClient();

  try {
    const form = await req.formData();
    const sessionId = String(form.get('sessionId') || '').trim();
    const title = String(form.get('title') || '').trim();
    const descriptionRaw = form.get('description');
    const description =
      typeof descriptionRaw === 'string' && descriptionRaw.trim() ? descriptionRaw.trim() : null;
    const participantToken = String(form.get('participantToken') || '').trim();
    const motionType = String(form.get('motionType') || '').trim();
    const attachmentField = form.get('attachment');

    if (!sessionId || !title) {
      return NextResponse.json({ error: 'Session ID and title are required' }, { status: 400 });
    }
    if (!participantToken || !motionType) {
      return NextResponse.json({ error: 'Participant token and motion type are required' }, { status: 400 });
    }
    if (!ALLOWED_MOTION_TYPES.includes(motionType)) {
      return NextResponse.json({ error: 'Invalid motion type' }, { status: 400 });
    }

    let attachment_storage_path: string | null = null;
    let attachment_filename: string | null = null;
    let attachment_mime: string | null = null;

    if (attachmentField instanceof File && attachmentField.size > 0) {
      const check = validateMotionAttachmentFile(attachmentField);
      if (!check.ok) {
        return NextResponse.json({ error: check.error }, { status: 400 });
      }
      if (!service) {
        return NextResponse.json(
          { error: 'File uploads require SUPABASE_SERVICE_ROLE_KEY on the server and a motion-attachments bucket.' },
          { status: 503 }
        );
      }
      const safeName = safeAttachmentBasename(attachmentField.name);
      const objectPath = `${sessionId}/${randomUUID()}_${safeName}`;
      const bytes = new Uint8Array(await attachmentField.arrayBuffer());
      const { error: upErr } = await service.storage.from(MOTION_ATTACHMENTS_BUCKET).upload(objectPath, bytes, {
        contentType: attachmentField.type || 'application/octet-stream',
        upsert: false,
      });
      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }
      uploadedPath = objectPath;
      attachment_storage_path = objectPath;
      attachment_filename = attachmentField.name.slice(0, 255) || safeName;
      attachment_mime = attachmentField.type || null;
    }

    const { data: participant } = await supabase
      .from('participants')
      .select('id, session_id, country_code, country_name')
      .eq('token', participantToken)
      .single();

    if (!participant || participant.session_id !== sessionId) {
      if (uploadedPath && service) {
        await service.storage.from(MOTION_ATTACHMENTS_BUCKET).remove([uploadedPath]);
      }
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('motions')
      .insert({
        session_id: sessionId,
        title,
        description,
        status: 'proposed',
        motion_type: motionType,
        proposer_participant_id: participant.id,
        proposer_country_code: participant.country_code,
        proposer_country_name: participant.country_name,
        attachment_storage_path,
        attachment_filename,
        attachment_mime,
      })
      .select()
      .single();

    if (error) {
      if (uploadedPath && service) {
        await service.storage.from(MOTION_ATTACHMENTS_BUCKET).remove([uploadedPath]);
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ motion: data });
  } catch (e) {
    const svc = getServiceSupabaseClient();
    if (uploadedPath && svc) {
      await svc.storage.from(MOTION_ATTACHMENTS_BUCKET).remove([uploadedPath]);
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to process motion proposal' },
      { status: 500 }
    );
  }
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
      .select('id, status, attachment_storage_path')
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

    if (decision === 'ignore' && motion.attachment_storage_path) {
      const svc = getServiceSupabaseClient();
      if (svc) {
        await svc.storage.from(MOTION_ATTACHMENTS_BUCKET).remove([motion.attachment_storage_path]);
      }
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
