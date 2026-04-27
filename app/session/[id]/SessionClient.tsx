'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Copy, Check, LogOut, Shield, Lock, Unlock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { generateToken, hashToken } from '@/lib/utils';
import { Participant, SpeakerTimer, Motion, Vote } from '@/lib/types';
import { COUNTRIES } from '@/lib/countries';
import CountryPicker from '@/components/CountryPicker';
import LiveTimer from '@/components/LiveTimer';
import ActiveMotion from '@/components/ActiveMotion';
import MotionHistory from '@/components/MotionHistory';
import ParticipantsList from '@/components/ParticipantsList';
import AdminPanel from '@/components/AdminPanel';
import QRCode from 'qrcode';

interface SessionClientProps {
  sessionId: string;
}

export default function SessionClient({ sessionId }: SessionClientProps) {
  const [session, setSession] = useState<{ id: string; name: string; created_at: string } | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activeTimer, setActiveTimer] = useState<SpeakerTimer | null>(null);
  const [motions, setMotions] = useState<Motion[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);

  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [joiningLoading, setJoiningLoading] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminToken, setAdminToken] = useState('');
  const [adminError, setAdminError] = useState('');

  const [copied, setCopied] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [votingLoading, setVotingLoading] = useState(false);
  const [timerLoading, setTimerLoading] = useState(false);
  const [motionLoading, setMotionLoading] = useState(false);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const activeMotion = motions.find((m) => m.status === 'voting') || null;
  const motionVotes = activeMotion ? votes.filter((v) => v.motion_id === activeMotion.id) : [];
  const allVotes = votes;

  // Load initial data
  const loadData = useCallback(async () => {
    if (!session) return;
    const [{ data: parts }, { data: timers }, { data: mots }, { data: vs }] = await Promise.all([
      supabase.from('participants').select('*').eq('session_id', session.id).order('joined_at'),
      supabase.from('speaker_timers').select('*').eq('session_id', session.id).eq('is_active', true).order('started_at', { ascending: false }).limit(1),
      supabase.from('motions').select('*').eq('session_id', session.id).order('created_at'),
      supabase.from('votes').select('*'),
    ]);

    if (parts) setParticipants(parts);
    if (timers && timers.length > 0) setActiveTimer(timers[0]);
    if (mots) setMotions(mots);
    if (vs) {
      // Filter to only relevant votes
      const motionIds = (mots || []).map((m: Motion) => m.id);
      setVotes(vs.filter((v: Vote) => motionIds.includes(v.motion_id)));
    }
  }, [session]);

  useEffect(() => {
    const loadSession = async () => {
      setSessionLoading(true);
      const { data, error } = await supabase
        .from('sessions')
        .select('id, name, created_at')
        .eq('id', sessionId)
        .single();

      if (error || !data) {
        setSessionError('Session not found or unavailable.');
        setSession(null);
      } else {
        setSession(data);
        setSessionError('');
      }

      setSessionLoading(false);
    };

    loadSession();
  }, [sessionId]);

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session, loadData]);

  // Restore session from localStorage
  useEffect(() => {
    if (!session) return;
    const storedToken = localStorage.getItem(`participant_token_${session.id}`);
    const storedAdminToken = localStorage.getItem(`admin_token_${session.id}`);

    if (storedToken) {
      supabase
        .from('participants')
        .select('*')
        .eq('token', storedToken)
        .eq('session_id', session.id)
        .single()
        .then(({ data }) => {
          if (data) setParticipant(data);
          else {
            localStorage.removeItem(`participant_token_${session.id}`);
            setShowCountryPicker(false);
          }
        });
    }

    if (storedAdminToken) {
      setAdminToken(storedAdminToken);
      setIsAdmin(true);
    }
  }, [session]);

  // Realtime subscriptions
  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel(`session:${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `session_id=eq.${session.id}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setParticipants((prev) => [...prev.filter((p) => p.id !== (payload.new as Participant).id), payload.new as Participant]);
        } else if (payload.eventType === 'DELETE') {
          setParticipants((prev) => prev.filter((p) => p.id !== (payload.old as Participant).id));
        } else if (payload.eventType === 'UPDATE') {
          setParticipants((prev) => prev.map((p) => (p.id === (payload.new as Participant).id ? (payload.new as Participant) : p)));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'speaker_timers', filter: `session_id=eq.${session.id}` }, (payload) => {
        if (payload.eventType === 'INSERT' && (payload.new as SpeakerTimer).is_active) {
          setActiveTimer(payload.new as SpeakerTimer);
        } else if (payload.eventType === 'UPDATE') {
          const t = payload.new as SpeakerTimer;
          if (!t.is_active) setActiveTimer((prev) => (prev?.id === t.id ? null : prev));
          else setActiveTimer(t);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'motions', filter: `session_id=eq.${session.id}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setMotions((prev) => [...prev, payload.new as Motion]);
        } else if (payload.eventType === 'UPDATE') {
          setMotions((prev) => prev.map((m) => (m.id === (payload.new as Motion).id ? (payload.new as Motion) : m)));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setVotes((prev) => [...prev.filter((v) => v.id !== (payload.new as Vote).id), payload.new as Vote]);
        } else if (payload.eventType === 'UPDATE') {
          setVotes((prev) => prev.map((v) => (v.id === (payload.new as Vote).id ? (payload.new as Vote) : v)));
        }
      })
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [session]);

  useEffect(() => {
    const generateQrCode = async () => {
      if (!session) {
        setQrCodeDataUrl('');
        return;
      }

      try {
        const joinUrl = `${window.location.origin}/session/${session.id}`;
        const dataUrl = await QRCode.toDataURL(joinUrl, {
          width: 256,
          margin: 1,
          color: { dark: '#f0f4ff', light: '#0000' },
        });
        setQrCodeDataUrl(dataUrl);
      } catch {
        setQrCodeDataUrl('');
      }
    };

    generateQrCode();
  }, [session]);

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session || sessionError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="rounded-2xl p-6 text-center max-w-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="text-lg font-semibold mb-2">Unable to load session</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {sessionError || 'Please check the session link and try again.'}
          </p>
        </div>
      </div>
    );
  }


  const handleCountrySelect = async (country: { code: string; name: string; flag: string }) => {
    setJoiningLoading(true);
    try {
      const token = generateToken();
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, countryCode: country.code, countryName: country.name, token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem(`participant_token_${session.id}`, token);
      setParticipant(data.participant);
      setShowCountryPicker(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to join');
    } finally {
      setJoiningLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    try {
      const hashed = await hashToken(adminPassword);
      const { data } = await supabase.from('sessions').select('admin_token').eq('id', session.id).single();
      if (!data || data.admin_token !== hashed) {
        setAdminError('Incorrect password');
        return;
      }
      setAdminToken(hashed);
      setIsAdmin(true);
      localStorage.setItem(`admin_token_${session.id}`, hashed);
      setShowAdminLogin(false);
      setAdminPassword('');
    } catch {
      setAdminError('Authentication failed');
    }
  };

  const handleVote = async (motionId: string, vote: 'for' | 'against' | 'abstain') => {
    const token = localStorage.getItem(`participant_token_${session.id}`);
    if (!token) return;
    setVotingLoading(true);
    try {
      await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motionId, participantToken: token, vote }),
      });
    } finally {
      setVotingLoading(false);
    }
  };

  const handleTimerStart = async (countryCode: string, countryName: string, seconds: number) => {
    setTimerLoading(true);
    try {
      await fetch('/api/timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, countryCode, countryName, durationSeconds: seconds, adminToken }),
      });
    } finally {
      setTimerLoading(false);
    }
  };

  const handleTimerStop = async () => {
    setTimerLoading(true);
    try {
      await fetch('/api/timer', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, adminToken }),
      });
      setActiveTimer(null);
    } finally {
      setTimerLoading(false);
    }
  };

  const handleMotionCreate = async (title: string, description: string) => {
    setMotionLoading(true);
    try {
      await fetch('/api/motions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, title, description, adminToken }),
      });
    } finally {
      setMotionLoading(false);
    }
  };

  const handleMotionClose = async (motionId: string, status: 'passed' | 'failed' | 'withdrawn') => {
    setMotionLoading(true);
    try {
      await fetch('/api/motions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motionId, status, adminToken, sessionId: session.id }),
      });
    } finally {
      setMotionLoading(false);
    }
  };

  const handleLeave = () => {
    localStorage.removeItem(`participant_token_${session.id}`);
    setParticipant(null);
    setShowCountryPicker(false);
  };

  const handleAdminLogout = () => {
    localStorage.removeItem(`admin_token_${session.id}`);
    setIsAdmin(false);
    setAdminToken('');
  };

  const copySessionId = () => {
    navigator.clipboard.writeText(session.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const takenCodes = participants.map((p) => p.country_code);

  return (
    <>
      {/* Country picker modal */}
      <AnimatePresence>
        {showCountryPicker && (
          <CountryPicker
            takenCodes={takenCodes}
            onSelect={handleCountrySelect}
            loading={joiningLoading}
          />
        )}
      </AnimatePresence>

      {/* Admin login modal */}
      <AnimatePresence>
        {showAdminLogin && (
          <div className="modal-overlay" style={{ zIndex: 100 }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl p-6"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--gold-dim)', border: '1px solid rgba(201,162,39,0.3)' }}>
                  <Shield size={16} style={{ color: 'var(--gold)' }} />
                </div>
                <div>
                  <h3 className="font-semibold">Chair Authentication</h3>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Enter the admin password</p>
                </div>
              </div>
              <form onSubmit={handleAdminLogin} className="space-y-3">
                <input
                  className="input"
                  type="password"
                  placeholder="Admin password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  autoFocus
                />
                {adminError && <p className="text-sm text-red-400">{adminError}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowAdminLogin(false)} className="btn btn-ghost flex-1">Cancel</button>
                  <button type="submit" className="btn btn-gold flex-1">
                    <Lock size={14} /> Sign In
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="min-h-screen flex flex-col pb-4 sm:pb-0">
        {/* Header */}
        <header
          className="sticky top-0 z-20 flex flex-wrap items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3 border-b"
          style={{
            background: 'rgba(8,13,26,0.9)',
            backdropFilter: 'blur(20px)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--gold-dim)', border: '1px solid rgba(201,162,39,0.3)' }}>
              <Globe size={14} style={{ color: 'var(--gold)' }} />
            </div>
            <h1 className="font-semibold text-sm truncate max-w-[52vw] sm:max-w-none">{session.name}</h1>
            {isAdmin && (
              <span className="badge badge-gold flex-shrink-0">
                <Shield size={9} /> Chair
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto flex-shrink-0">
            {/* Session ID copy */}
            <button
              onClick={copySessionId}
              className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              title="Copy session ID"
            >
              {copied ? <Check size={12} style={{ color: 'var(--gold)' }} /> : <Copy size={12} />}
              <span className="font-mono">{session.id.slice(0, 8)}...</span>
            </button>

            {/* Admin controls */}
            {isAdmin ? (
              <button onClick={handleAdminLogout} className="btn btn-ghost text-[11px] sm:text-xs px-2 py-1.5" title="Exit admin mode">
                <Unlock size={13} /> <span className="hidden sm:inline">Admin</span>
              </button>
            ) : (
              <button onClick={() => setShowAdminLogin(true)} className="btn btn-ghost text-[11px] sm:text-xs px-2 py-1.5" title="Admin login">
                <Lock size={13} />
                <span className="hidden sm:inline">Chair Login</span>
              </button>
            )}

            {/* Participant info / leave */}
            {participant && (
              <div className="flex items-center gap-2">
                <div
                  className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  {COUNTRIES.find((c) => c.code === participant.country_code)?.flag}
                  <span>{participant.country_name}</span>
                </div>
                <button onClick={handleLeave} className="btn btn-ghost text-[11px] sm:text-xs px-2 py-1.5" title="Leave session">
                  <LogOut size={13} />
                </button>
              </div>
            )}

            {!participant && !showCountryPicker && (
              <button onClick={() => setShowCountryPicker(true)} className="btn btn-gold text-[11px] sm:text-xs px-2.5 sm:px-3 py-1.5">
                <Globe size={13} /> <span className="hidden sm:inline">Join as Country</span><span className="sm:hidden">Join</span>
              </button>
            )}
          </div>
        </header>

        {/* Main grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 p-3 sm:p-6 max-w-7xl mx-auto w-full">
          {/* Left column */}
          <div className="space-y-4 min-w-0">
            {/* Session info banner */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl px-4 sm:px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4"
              style={{
                background: 'linear-gradient(135deg, rgba(20,30,53,0.8) 0%, rgba(15,22,40,0.8) 100%)',
                border: '1px solid var(--border)',
              }}
            >
              <div>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--gold)', fontWeight: 600 }}>
                  Session in Progress
                </p>
                <h2 className="text-lg sm:text-xl font-bold">{session.name}</h2>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {participants.length} delegation{participants.length !== 1 ? 's' : ''} present
                </p>
              </div>
              <button onClick={copySessionId} className="w-full sm:w-auto flex-shrink-0 flex flex-col items-start sm:items-end gap-1">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Session ID</span>
                <span
                  className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-lg transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border)',
                    color: copied ? 'var(--gold)' : 'var(--text-secondary)',
                  }}
                >
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {session.id.slice(0, 12)}...
                </span>
              </button>
            </motion.div>

            {/* Speaker timer */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <LiveTimer timer={activeTimer} />
            </motion.div>

            {/* Active motion */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <ActiveMotion
                motion={activeMotion}
                votes={motionVotes}
                myParticipant={participant}
                onVote={handleVote}
                votingLoading={votingLoading}
              />
            </motion.div>

            {/* Motion history */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Motion History
                </h3>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}
                >
                  {motions.filter((m) => m.status !== 'voting').length}
                </span>
              </div>
              <MotionHistory motions={motions} votes={allVotes} />
            </motion.div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Admin panel */}
            <AnimatePresence>
              {isAdmin && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <AdminPanel
                    participants={participants}
                    activeMotion={activeMotion}
                    onTimerStart={handleTimerStart}
                    onTimerStop={handleTimerStop}
                    onMotionCreate={handleMotionCreate}
                    onMotionClose={handleMotionClose}
                    timerLoading={timerLoading}
                    motionLoading={motionLoading}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Participants list */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <ParticipantsList
                participants={participants}
                speakingCountryCode={activeTimer?.is_active ? activeTimer.country_code : undefined}
              />
            </motion.div>

            {/* Invite card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl p-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Invite delegations
              </p>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                Share this session ID with participants:
              </p>
              <button
                onClick={copySessionId}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-mono transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border)',
                  color: copied ? 'var(--gold)' : 'var(--text-secondary)',
                }}
              >
                <span className="truncate">{session.id}</span>
                {copied ? <Check size={12} /> : <Copy size={12} className="flex-shrink-0" />}
              </button>

              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                  Or scan this QR code to open the session
                </p>
                <div className="flex justify-center">
                  {qrCodeDataUrl ? (
                    <div
                      className="rounded-xl p-2"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrCodeDataUrl} alt="QR code to join this session" className="w-36 h-36" />
                    </div>
                  ) : (
                    <div
                      className="w-36 h-36 rounded-xl flex items-center justify-center text-xs"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                    >
                      Generating QR...
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}
