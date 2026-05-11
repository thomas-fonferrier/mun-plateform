'use client';

import { useRef, useState } from 'react';
import { Paperclip, Send } from 'lucide-react';
import { Participant } from '@/lib/types';

interface MotionProposalPanelProps {
  participant: Participant | null;
  hasActiveMotion: boolean;
  onPropose: (
    title: string,
    description: string,
    motionType: 'set_agenda' | 'set_speaking_time' | 'moderated_caucus' | 'unmoderated_caucus',
    attachment: File | null
  ) => Promise<void>;
  loading: boolean;
}

const MOTION_OPTIONS = [
  {
    value: 'set_agenda',
    label: 'Motion to set the Agenda',
    descriptionPlaceholder: 'e.g. Which agenda item you want to open first, or any context for the Chair.',
  },
  {
    value: 'set_speaking_time',
    label: 'Motion to set the Speaking Time',
    descriptionPlaceholder: 'e.g. Propose 60, 90, or 120 seconds per speech, and why.',
  },
  {
    value: 'moderated_caucus',
    label: 'Motion for a Moderated Caucus',
    descriptionPlaceholder: 'e.g. Sub-topic (e.g. environmental impact), total time, and time per intervention if known.',
  },
  {
    value: 'unmoderated_caucus',
    label: 'Motion for an Unmoderated Caucus',
    descriptionPlaceholder: 'e.g. Requested duration and what you want delegates to achieve during the caucus.',
  },
] as const;

export default function MotionProposalPanel({ participant, hasActiveMotion, onPropose, loading }: MotionProposalPanelProps) {
  const [selectedMotionType, setSelectedMotionType] = useState<(typeof MOTION_OPTIONS)[number]['value']>('set_agenda');
  const [details, setDetails] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!participant) return null;

  const selected = MOTION_OPTIONS.find((option) => option.value === selectedMotionType)!;

  const handleSubmit = async () => {
    const description = details.trim();
    await onPropose(selected.label, description, selectedMotionType, attachment);
    setDetails('');
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="rounded-2xl p-4 sm:p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="mb-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Propose a Motion</h3>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Your proposal is sent to the Chair for consideration.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="label">Motion Type</label>
          <select
            className="input"
            value={selectedMotionType}
            onChange={(e) => setSelectedMotionType(e.target.value as (typeof MOTION_OPTIONS)[number]['value'])}
          >
            {MOTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Description</label>
          <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Explain your motion to the Chair (agenda details, timing, caucus topic, duration, etc.). Optional but recommended.
          </p>
          <textarea
            className="input resize-none"
            rows={4}
            placeholder={selected.descriptionPlaceholder}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            aria-label="Motion description for the Chair"
          />
        </div>

        <div>
          <label className="label">Attachment</label>
          <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Optional PDF or Word document (.pdf, .docx, .doc), max 10 MB.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="text-xs w-full file:mr-2 file:rounded-lg file:border-0 file:px-2 file:py-1.5 file:text-xs"
              style={{ color: 'var(--text-secondary)' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                setAttachment(f ?? null);
              }}
            />
            {attachment && (
              <button
                type="button"
                className="btn btn-ghost text-xs py-1.5 flex-shrink-0"
                onClick={() => {
                  setAttachment(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                Remove file
              </button>
            )}
          </div>
          {attachment && (
            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <Paperclip size={12} /> {attachment.name}
            </p>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || hasActiveMotion}
          className="btn btn-gold w-full"
          title={hasActiveMotion ? 'Wait for the current vote to close first.' : 'Send proposal to chair'}
        >
          <Send size={14} />
          {loading ? 'Sending...' : 'Send Motion to Chair'}
        </button>
      </div>
    </div>
  );
}
