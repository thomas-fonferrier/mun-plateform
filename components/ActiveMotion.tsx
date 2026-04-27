'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Vote, CheckCircle, XCircle, MinusCircle, FileText } from 'lucide-react';
import { Motion, Vote as VoteType, Participant } from '@/lib/types';

interface ActiveMotionProps {
  motion: Motion | null;
  votes: VoteType[];
  myParticipant: Participant | null;
  onVote: (motionId: string, vote: 'for' | 'against' | 'abstain') => void;
  votingLoading: boolean;
}

export default function ActiveMotion({
  motion: currentMotion,
  votes,
  myParticipant,
  onVote,
  votingLoading,
}: ActiveMotionProps) {
  if (!currentMotion) {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}
          >
            <FileText size={20} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div>
            <p className="font-medium text-sm" style={{ color: 'var(--text-secondary)' }}>
              No active motion
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Awaiting the Chair to introduce a motion
            </p>
          </div>
        </div>
      </div>
    );
  }

  const forVotes = votes.filter((v) => v.vote === 'for');
  const againstVotes = votes.filter((v) => v.vote === 'against');
  const abstainVotes = votes.filter((v) => v.vote === 'abstain');
  const totalVotes = votes.length;

  const myVote = myParticipant
    ? votes.find((v) => v.participant_id === myParticipant.id)?.vote
    : null;

  const pct = (n: number) => (totalVotes > 0 ? Math.round((n / totalVotes) * 100) : 0);

  return (
    <motion.div
      key={currentMotion.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid rgba(201,162,39,0.2)',
        boxShadow: '0 0 30px rgba(201,162,39,0.05)',
      }}
    >
      {/* Header */}
      <div className="px-4 sm:px-6 pt-5 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: 'var(--gold-dim)', border: '1px solid rgba(201,162,39,0.3)' }}
          >
            <Vote size={16} style={{ color: 'var(--gold)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="badge badge-gold">
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse inline-block" />
                Open for Vote
              </span>
            </div>
            <h3 className="font-semibold text-base leading-snug">{currentMotion.title}</h3>
            {currentMotion.description && (
              <p className="text-sm mt-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {currentMotion.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Vote results */}
      <div className="px-4 sm:px-6 py-4">
        <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
          Current Results — {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} cast
        </p>
        <div className="space-y-3">
          <VoteBar label="In Favour" count={forVotes.length} pct={pct(forVotes.length)} color="#22c55e" colorBg="rgba(34,197,94,0.1)" />
          <VoteBar label="Against" count={againstVotes.length} pct={pct(againstVotes.length)} color="#ef4444" colorBg="rgba(239,68,68,0.1)" />
          <VoteBar label="Abstain" count={abstainVotes.length} pct={pct(abstainVotes.length)} color="#6b7280" colorBg="rgba(107,114,128,0.1)" />
        </div>
      </div>

      {/* Voting buttons for participants */}
      {myParticipant && (
        <div className="px-4 sm:px-6 pb-5">
          <div
            className="rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
          >
            <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              Cast Your Vote — {myParticipant.country_name}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {([
                { value: 'for', label: 'In Favour', icon: CheckCircle, className: 'btn-success' },
                { value: 'against', label: 'Against', icon: XCircle, className: 'btn-danger' },
                { value: 'abstain', label: 'Abstain', icon: MinusCircle, className: 'btn-ghost' },
              ] as const).map(({ value, label, icon: Icon, className }) => (
                <motion.button
                  key={value}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onVote(currentMotion.id, value)}
                  disabled={votingLoading}
                  className={`btn ${className} py-2.5 sm:py-2.5 flex-row sm:flex-col justify-center gap-2 sm:gap-1.5 h-auto`}
                  style={
                    myVote === value
                      ? {
                          outline: '2px solid',
                          outlineColor:
                            value === 'for' ? '#22c55e' : value === 'against' ? '#ef4444' : '#6b7280',
                          outlineOffset: '2px',
                        }
                      : {}
                  }
                >
                  <Icon size={16} />
                  <span className="text-xs sm:text-xs">{label}</span>
                </motion.button>
              ))}
            </div>
            {myVote && (
              <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
                You voted: <span style={{ color: myVote === 'for' ? '#22c55e' : myVote === 'against' ? '#ef4444' : '#9ca3af' }}>
                  {myVote === 'for' ? 'In Favour' : myVote === 'against' ? 'Against' : 'Abstain'}
                </span>
                {' '}· You can change your vote
              </p>
            )}
          </div>
        </div>
      )}

      {/* Country vote list */}
      {votes.length > 0 && (
        <div className="px-4 sm:px-6 pb-5">
          <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
            Delegation Votes
          </p>
          <div className="flex flex-wrap gap-1.5">
            {votes.map((v) => (
              <span
                key={v.id}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md"
                style={{
                  background:
                    v.vote === 'for' ? 'rgba(34,197,94,0.1)' : v.vote === 'against' ? 'rgba(239,68,68,0.1)' : 'rgba(107,114,128,0.1)',
                  color: v.vote === 'for' ? '#4ade80' : v.vote === 'against' ? '#f87171' : '#9ca3af',
                  border: `1px solid ${v.vote === 'for' ? 'rgba(34,197,94,0.2)' : v.vote === 'against' ? 'rgba(239,68,68,0.2)' : 'rgba(107,114,128,0.2)'}`,
                }}
              >
                {v.vote === 'for' ? '✓' : v.vote === 'against' ? '✗' : '−'} {v.country_name}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function VoteBar({ label, count, pct, color, colorBg }: { label: string; count: number; pct: number; color: string; colorBg: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span className="text-sm font-semibold tabular-nums" style={{ color }}>
          {count} <span className="text-xs font-normal opacity-60">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${color}60` }}
        />
      </div>
    </div>
  );
}
