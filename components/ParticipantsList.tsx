'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Users } from 'lucide-react';
import { Participant } from '@/lib/types';
import { getCountryByCode } from '@/lib/countries';

interface ParticipantsListProps {
  participants: Participant[];
  speakingCountryCode?: string;
}

export default function ParticipantsList({ participants, speakingCountryCode }: ParticipantsListProps) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="px-4 py-3.5 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
        <Users size={15} style={{ color: 'var(--text-muted)' }} />
        <span className="text-sm font-medium">Delegations</span>
        <span
          className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--text-secondary)' }}
        >
          {participants.length}
        </span>
      </div>

      <div className="p-2 max-h-80 overflow-y-auto">
        {participants.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
            <Users size={24} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs">No delegations yet</p>
          </div>
        ) : (
          <AnimatePresence>
            {participants.map((p, i) => {
              const country = getCountryByCode(p.country_code);
              const isSpeaking = p.country_code === speakingCountryCode;
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-2.5 px-2 py-2 rounded-lg"
                  style={{
                    background: isSpeaking ? 'rgba(201,162,39,0.08)' : 'transparent',
                    border: isSpeaking ? '1px solid rgba(201,162,39,0.2)' : '1px solid transparent',
                    marginBottom: '2px',
                  }}
                >
                  <span className="text-xl leading-none flex-shrink-0">
                    {country?.flag || '🏳'}
                  </span>
                  <span className="text-sm truncate flex-1" style={{ color: isSpeaking ? 'var(--gold-light)' : 'var(--text-secondary)' }}>
                    {p.country_name}
                  </span>
                  {isSpeaking && (
                    <span className="flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: 'var(--gold)' }} />
                    </span>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
