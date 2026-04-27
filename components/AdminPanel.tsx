'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Timer, FilePlus, ChevronDown, StopCircle, CheckCircle, XCircle, MinusCircle, ChevronRight, Users } from 'lucide-react';
import { Motion, Participant } from '@/lib/types';
import { COUNTRIES } from '@/lib/countries';

interface AdminPanelProps {
  participants: Participant[];
  activeMotion: Motion | null;
  onTimerStart: (countryCode: string, countryName: string, seconds: number) => void;
  onTimerStop: () => void;
  onMotionCreate: (title: string, description: string) => void;
  onMotionClose: (motionId: string, status: 'passed' | 'failed' | 'withdrawn') => void;
  timerLoading: boolean;
  motionLoading: boolean;
}

const PRESET_TIMES = [30, 60, 90, 120, 180, 300];

export default function AdminPanel({
  participants,
  activeMotion,
  onTimerStart,
  onTimerStop,
  onMotionCreate,
  onMotionClose,
  timerLoading,
  motionLoading,
}: AdminPanelProps) {
  const [tab, setTab] = useState<'timer' | 'motion'>('timer');

  // Timer state
  const [selectedCountry, setSelectedCountry] = useState('');
  const [customTime, setCustomTime] = useState('60');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  // Motion state
  const [motionTitle, setMotionTitle] = useState('');
  const [motionDesc, setMotionDesc] = useState('');

  const allCountries = COUNTRIES;

  const handleTimerStart = () => {
    if (!selectedCountry) return;
    const country = allCountries.find((c) => c.code === selectedCountry);
    if (!country) return;
    const secs = parseInt(customTime) || 60;
    onTimerStart(selectedCountry, country.name, secs);
  };

  const handleMotionCreate = () => {
    if (!motionTitle.trim()) return;
    onMotionCreate(motionTitle.trim(), motionDesc.trim());
    setMotionTitle('');
    setMotionDesc('');
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid rgba(201,162,39,0.25)',
        boxShadow: '0 0 30px rgba(201,162,39,0.05)',
      }}
    >
      {/* Header */}
      <div className="px-4 sm:px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--border)' }}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--gold-dim)', border: '1px solid rgba(201,162,39,0.3)' }}
        >
          <Shield size={15} style={{ color: 'var(--gold)' }} />
        </div>
        <div>
          <span className="text-sm font-semibold">Chair Controls</span>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Administrator view</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
        {([['timer', Timer, 'Speaker Timer'], ['motion', FilePlus, 'Motion']] as const).map(([t, Icon, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors"
            style={{
              color: tab === t ? 'var(--gold-light)' : 'var(--text-secondary)',
              borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
              background: tab === t ? 'rgba(201,162,39,0.05)' : 'transparent',
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-5">
        <AnimatePresence mode="wait">
          {tab === 'timer' && (
            <motion.div
              key="timer"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Country selector */}
              <div>
                <label className="label">Delegate</label>
                <div className="relative">
                  <button
                    onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-left transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--border)',
                      color: selectedCountry ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    {selectedCountry ? (
                      <>
                        <span className="text-lg">{allCountries.find((c) => c.code === selectedCountry)?.flag}</span>
                        <span className="flex-1 truncate">{allCountries.find((c) => c.code === selectedCountry)?.name}</span>
                      </>
                    ) : (
                      <>
                        <Users size={14} />
                        <span className="flex-1">Select delegate...</span>
                      </>
                    )}
                    <ChevronDown size={14} className={showCountryDropdown ? 'rotate-180' : ''} style={{ transition: 'transform 0.2s' }} />
                  </button>

                  <AnimatePresence>
                    {showCountryDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-30"
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border)',
                          maxHeight: 220,
                          overflowY: 'auto',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        }}
                      >
                        {participants.length > 0 && (
                          <>
                            <div className="px-3 py-1.5 sticky top-0" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
                              <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                Active Delegations
                              </span>
                            </div>
                            {participants.map((p) => {
                              const c = allCountries.find((x) => x.code === p.country_code);
                              return (
                                <button
                                  key={p.id}
                                  onClick={() => { setSelectedCountry(p.country_code); setShowCountryDropdown(false); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-white/5 transition-colors"
                                  style={{ color: selectedCountry === p.country_code ? 'var(--gold-light)' : 'var(--text-secondary)' }}
                                >
                                  <span className="text-base">{c?.flag}</span>
                                  {p.country_name}
                                </button>
                              );
                            })}
                          </>
                        )}
                        <div className="px-3 py-1.5 sticky top-0" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
                          <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            All Countries
                          </span>
                        </div>
                        {allCountries
                          .filter((c) => !participants.some((p) => p.country_code === c.code))
                          .map((c) => (
                            <button
                              key={c.code}
                              onClick={() => { setSelectedCountry(c.code); setShowCountryDropdown(false); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-white/5 transition-colors"
                              style={{ color: selectedCountry === c.code ? 'var(--gold-light)' : 'var(--text-muted)' }}
                            >
                              <span className="text-base">{c.flag}</span>
                              {c.name}
                            </button>
                          ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Duration presets */}
              <div>
                <label className="label">Duration</label>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {PRESET_TIMES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setCustomTime(String(t))}
                      className="text-xs py-1.5 rounded-lg transition-all"
                      style={{
                        background: customTime === String(t) ? 'var(--gold-dim)' : 'rgba(255,255,255,0.04)',
                        border: customTime === String(t) ? '1px solid rgba(201,162,39,0.4)' : '1px solid var(--border)',
                        color: customTime === String(t) ? 'var(--gold-light)' : 'var(--text-secondary)',
                      }}
                    >
                      {t >= 60 ? `${t / 60}m` : `${t}s`}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    className="input flex-1"
                    type="number"
                    min={5}
                    max={600}
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    placeholder="Custom (seconds)"
                  />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>sec</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleTimerStart}
                  disabled={!selectedCountry || timerLoading}
                  className="btn btn-gold flex-1"
                >
                  <Timer size={15} />
                  {timerLoading ? 'Starting...' : 'Grant the Floor'}
                </button>
                <button
                  onClick={onTimerStop}
                  disabled={timerLoading}
                  className="btn btn-danger"
                  title="Stop current timer"
                >
                  <StopCircle size={15} />
                </button>
              </div>
            </motion.div>
          )}

          {tab === 'motion' && (
            <motion.div
              key="motion"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {activeMotion && (
                <div
                  className="rounded-xl p-3.5"
                  style={{ background: 'rgba(201,162,39,0.06)', border: '1px solid rgba(201,162,39,0.2)' }}
                >
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--gold)' }}>Active Motion</p>
                  <p className="text-sm font-medium mb-3">{activeMotion.title}</p>
                  <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Close this motion as:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ['passed', 'Passed', CheckCircle, '#22c55e', 'rgba(34,197,94,0.15)'],
                      ['failed', 'Failed', XCircle, '#ef4444', 'rgba(239,68,68,0.15)'],
                      ['withdrawn', 'Withdrawn', MinusCircle, '#6b7280', 'rgba(107,114,128,0.15)'],
                    ] as const).map(([status, label, Icon, color, bg]) => (
                      <button
                        key={status}
                        onClick={() => onMotionClose(activeMotion.id, status)}
                        disabled={motionLoading}
                        className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-medium transition-all"
                        style={{ background: bg, color, border: `1px solid ${color}30` }}
                      >
                        <Icon size={14} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!activeMotion && (
                <div className="space-y-3">
                  <div>
                    <label className="label">Motion Title</label>
                    <input
                      className="input"
                      placeholder="e.g. Resolution on climate action"
                      value={motionTitle}
                      onChange={(e) => setMotionTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Description <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
                    <textarea
                      className="input resize-none"
                      rows={3}
                      placeholder="Provide context or details..."
                      value={motionDesc}
                      onChange={(e) => setMotionDesc(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={handleMotionCreate}
                    disabled={!motionTitle.trim() || motionLoading}
                    className="btn btn-gold w-full"
                  >
                    <FilePlus size={15} />
                    {motionLoading ? 'Introducing...' : 'Introduce Motion'}
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
