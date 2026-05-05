'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Participant } from '@/lib/types';

interface MotionProposalPanelProps {
  participant: Participant | null;
  hasActiveMotion: boolean;
  onPropose: (title: string, description: string, motionType: 'set_agenda' | 'set_speaking_time' | 'moderated_caucus' | 'unmoderated_caucus') => Promise<void>;
  loading: boolean;
}

const MOTION_OPTIONS = [
  {
    value: 'set_agenda',
    label: 'Motion to set the Agenda',
    defaultDescription: 'To officially start the discussion on the chosen topic.',
  },
  {
    value: 'set_speaking_time',
    label: 'Motion to set the Speaking Time',
    defaultDescription: 'To decide if speeches last 60, 90, or 120 seconds.',
  },
  {
    value: 'moderated_caucus',
    label: 'Motion for a Moderated Caucus',
    defaultDescription: 'To have a faster debate on a specific sub-topic. The Chair picks speakers as they raise hands.',
  },
  {
    value: 'unmoderated_caucus',
    label: 'Motion for an Unmoderated Caucus',
    defaultDescription: 'To pause formal rules so delegates can move, negotiate, and draft resolution text.',
  },
] as const;

export default function MotionProposalPanel({ participant, hasActiveMotion, onPropose, loading }: MotionProposalPanelProps) {
  const [selectedMotionType, setSelectedMotionType] = useState<(typeof MOTION_OPTIONS)[number]['value']>('set_agenda');
  const [details, setDetails] = useState('');

  if (!participant) return null;

  const selected = MOTION_OPTIONS.find((option) => option.value === selectedMotionType)!;

  const handleSubmit = async () => {
    const description = details.trim() || selected.defaultDescription;
    await onPropose(selected.label, description, selectedMotionType);
    setDetails('');
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
          <label className="label">Context <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder={selected.defaultDescription}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
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
