'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, MinusCircle, Archive, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Motion, Vote } from '@/lib/types';

interface MotionHistoryProps {
  motions: Motion[];
  votes: Vote[];
}

export default function MotionHistory({ motions, votes }: MotionHistoryProps) {
  const closed = motions.filter((m) => ['passed', 'failed', 'withdrawn', 'ignored'].includes(m.status)).sort(
    (a, b) => new Date(b.closed_at || b.created_at).getTime() - new Date(a.closed_at || a.created_at).getTime()
  );

  if (closed.length === 0) {
    return (
      <div
        className="rounded-2xl p-5 text-center"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <Archive size={24} className="mx-auto mb-2 opacity-20" />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No closed motions yet</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          History will appear here after motions are resolved
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {closed.map((m, i) => (
          <MotionHistoryCard key={m.id} motion={m} votes={votes.filter((v) => v.motion_id === m.id)} index={i} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function MotionHistoryCard({ motion: m, votes, index }: { motion: Motion; votes: Vote[]; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const forVotes = votes.filter((v) => v.vote === 'for');
  const againstVotes = votes.filter((v) => v.vote === 'against');
  const abstainVotes = votes.filter((v) => v.vote === 'abstain');

  const statusConfig = {
    passed: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)', label: 'Passed', icon: CheckCircle },
    failed: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', label: 'Failed', icon: XCircle },
    withdrawn: { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)', label: 'Withdrawn', icon: MinusCircle },
    ignored: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', label: 'Ignored', icon: MinusCircle },
  };

  const cfg = statusConfig[m.status as keyof typeof statusConfig] || statusConfig.withdrawn;
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
        >
          <Icon size={14} style={{ color: cfg.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: cfg.color }}
            >
              {cfg.label}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              · {forVotes.length}✓ {againstVotes.length}✗ {abstainVotes.length}−
            </span>
          </div>
          <p className="text-sm font-medium truncate">{m.title}</p>
        </div>
        {expanded ? (
          <ChevronUp size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        ) : (
          <ChevronDown size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--border)' }}>
              {m.description && (
                <p className="text-sm mt-3 mb-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {m.description}
                </p>
              )}

              {votes.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {[
                    { label: 'In Favour', list: forVotes, color: '#22c55e' },
                    { label: 'Against', list: againstVotes, color: '#ef4444' },
                    { label: 'Abstained', list: abstainVotes, color: '#6b7280' },
                  ].map(({ label, list, color }) =>
                    list.length > 0 ? (
                      <div key={label}>
                        <p className="text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color }}>
                          {label} ({list.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {list.map((v) => (
                            <span
                              key={v.id}
                              className="text-xs px-2 py-0.5 rounded"
                              style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}
                            >
                              {v.country_name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              ) : (
                <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>No votes recorded</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
