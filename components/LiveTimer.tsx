'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, MicOff } from 'lucide-react';
import { SpeakerTimer } from '@/lib/types';
import { getTimeRemaining, formatTime } from '@/lib/utils';
import { getCountryByCode } from '@/lib/countries';

interface LiveTimerProps {
  timer: SpeakerTimer | null;
}

export default function LiveTimer({ timer }: LiveTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  const updateTimer = useCallback(() => {
    if (!timer || !timer.is_active) {
      setSecondsLeft(0);
      return;
    }
    setSecondsLeft(getTimeRemaining(timer.expires_at));
  }, [timer]);

  useEffect(() => {
    updateTimer();
    const interval = setInterval(updateTimer, 250);
    return () => clearInterval(interval);
  }, [updateTimer]);

  const isActive = timer?.is_active && secondsLeft > 0;
  const progress = timer ? Math.max(0, secondsLeft / timer.duration_seconds) : 0;
  const country = timer ? getCountryByCode(timer.country_code) : null;

  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference * (1 - progress);

  const urgentColor = secondsLeft <= 10 && isActive ? '#ef4444' : secondsLeft <= 30 && isActive ? '#f59e0b' : '#c9a227';

  return (
    <AnimatePresence mode="wait">
      {isActive ? (
        <motion.div
          key="active"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl p-6 text-center"
          style={{
            background: 'var(--bg-card)',
            border: `1px solid ${urgentColor}40`,
            boxShadow: `0 0 40px ${urgentColor}15`,
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: urgentColor }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: urgentColor }}>
              Now Speaking
            </span>
          </div>

          {/* Country name */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {country && <span className="text-3xl">{country.flag}</span>}
            <h2 className="text-2xl font-bold">{timer?.country_name}</h2>
          </div>

          {/* Circular timer */}
          <div className="relative flex items-center justify-center mx-auto mb-4" style={{ width: 140, height: 140 }}>
            <svg width="140" height="140" className="absolute" style={{ transform: 'rotate(-90deg)' }}>
              {/* Track */}
              <circle
                cx="70"
                cy="70"
                r="54"
                fill="none"
                stroke="rgba(255,255,255,0.07)"
                strokeWidth="6"
              />
              {/* Progress */}
              <circle
                cx="70"
                cy="70"
                r="54"
                fill="none"
                stroke={urgentColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dashoffset 0.25s linear, stroke 0.3s ease' }}
              />
            </svg>
            <div className="relative text-center">
              <div
                className="text-4xl font-bold tabular-nums"
                style={{ color: urgentColor, transition: 'color 0.3s ease' }}
              >
                {formatTime(secondsLeft)}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                remaining
              </div>
            </div>
          </div>

          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {formatTime(timer!.duration_seconds)} total speaking time
          </p>
        </motion.div>
      ) : (
        <motion.div
          key="idle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="rounded-2xl p-6 text-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}
            >
              <MicOff size={20} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div>
              <p className="font-medium text-sm" style={{ color: 'var(--text-secondary)' }}>
                No speaker active
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Waiting for the floor to be yielded
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
