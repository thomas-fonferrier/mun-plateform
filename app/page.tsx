'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, LogIn, Plus, Shield, Users, Zap, ChevronRight, Lock } from 'lucide-react';
import { hashToken, generateToken } from '@/lib/utils';

type Mode = 'home' | 'create' | 'join';

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('home');

  const [createName, setCreateName] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const [joinId, setJoinId] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || !createPassword.trim()) return;
    setCreateLoading(true);
    setCreateError('');

    try {
      const adminToken = await hashToken(createPassword);
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createName.trim(), adminToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      localStorage.setItem(`admin_token_${data.session.id}`, adminToken);
      localStorage.setItem(`admin_password_${data.session.id}`, createPassword);
      router.push(`/session/${data.session.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = joinId.trim();
    if (!id) return;
    setJoinLoading(true);
    setJoinError('');

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data, error } = await supabase
        .from('sessions')
        .select('id, name')
        .eq('id', id)
        .single();

      if (error || !data) throw new Error('Session not found. Check the session ID and try again.');

      router.push(`/session/${id}`);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Session not found');
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #c9a227 0%, transparent 70%)' }}
        />
        <div
          className="absolute top-1/3 -left-1/4 w-[600px] h-[600px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 right-0 w-[500px] h-[500px] opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #c9a227 0%, transparent 70%)' }}
        />
        {/* Grid lines */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--gold-dim)', border: '1px solid rgba(201,162,39,0.3)' }}>
            <Globe size={18} style={{ color: 'var(--gold)' }} />
          </div>
          <span className="font-semibold text-sm tracking-wide" style={{ color: 'var(--text-secondary)' }}>
            MUN Platform
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-gold">
            <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
            Live
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12">
        <AnimatePresence mode="wait">
          {mode === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="text-center max-w-2xl w-full"
            >
              {/* UN Emblem */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="flex justify-center mb-8"
              >
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center pulse-ring"
                  style={{
                    background: 'linear-gradient(135deg, rgba(201,162,39,0.2) 0%, rgba(201,162,39,0.05) 100%)',
                    border: '1px solid rgba(201,162,39,0.4)',
                  }}
                >
                  <Globe size={38} style={{ color: 'var(--gold)' }} />
                </div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-5xl font-bold mb-4 tracking-tight"
              >
                Model{' '}
                <span className="gold-text">United Nations</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-lg mb-12"
                style={{ color: 'var(--text-secondary)' }}
              >
                Real-time diplomatic sessions with live voting, speaker timers, and motion tracking.
              </motion.p>

              {/* Feature pills */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap justify-center gap-3 mb-12"
              >
                {[
                  { icon: Zap, label: 'Real-time updates' },
                  { icon: Users, label: '193 countries' },
                  { icon: Shield, label: 'Admin controls' },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <Icon size={14} />
                    {label}
                  </div>
                ))}
              </motion.div>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <button
                  onClick={() => setMode('create')}
                  className="btn btn-gold text-base px-8 py-3"
                >
                  <Plus size={18} />
                  Create Session
                </button>
                <button
                  onClick={() => setMode('join')}
                  className="btn btn-ghost text-base px-8 py-3"
                >
                  <LogIn size={18} />
                  Join Session
                </button>
              </motion.div>
            </motion.div>
          )}

          {mode === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-md"
            >
              <div
                className="rounded-2xl p-8"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--gold-dim)', border: '1px solid rgba(201,162,39,0.3)' }}
                  >
                    <Plus size={18} style={{ color: 'var(--gold)' }} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">New Session</h2>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      You&apos;ll be the administrator
                    </p>
                  </div>
                </div>

                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="label">Session Name</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="e.g. UNSC Emergency Meeting 2026"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">
                      <span className="flex items-center gap-1.5">
                        <Lock size={10} />
                        Admin Password
                      </span>
                    </label>
                    <input
                      className="input"
                      type="password"
                      placeholder="Set a strong password"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      required
                    />
                    <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                      You&apos;ll need this to access admin controls.
                    </p>
                  </div>

                  {createError && (
                    <p className="text-sm text-red-400 px-3 py-2 rounded-lg bg-red-400/10 border border-red-400/20">
                      {createError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={createLoading || !createName.trim() || !createPassword.trim()}
                    className="btn btn-gold w-full py-3"
                  >
                    {createLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Creating...
                      </span>
                    ) : (
                      <>
                        Create Session
                        <ChevronRight size={16} />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('home')}
                    className="btn btn-ghost w-full"
                  >
                    Back
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {mode === 'join' && (
            <motion.div
              key="join"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-md"
            >
              <div
                className="rounded-2xl p-8"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}
                  >
                    <LogIn size={18} style={{ color: '#60a5fa' }} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Join Session</h2>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Enter the session ID shared by the admin
                    </p>
                  </div>
                </div>

                <form onSubmit={handleJoin} className="space-y-4">
                  <div>
                    <label className="label">Session ID</label>
                    <input
                      className="input font-mono text-sm"
                      type="text"
                      placeholder="Paste session ID here"
                      value={joinId}
                      onChange={(e) => setJoinId(e.target.value)}
                      required
                    />
                  </div>

                  {joinError && (
                    <p className="text-sm text-red-400 px-3 py-2 rounded-lg bg-red-400/10 border border-red-400/20">
                      {joinError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={joinLoading || !joinId.trim()}
                    className="btn btn-gold w-full py-3"
                  >
                    {joinLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Joining...
                      </span>
                    ) : (
                      <>
                        Join Session
                        <ChevronRight size={16} />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('home')}
                    className="btn btn-ghost w-full"
                  >
                    Back
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 px-4">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Model United Nations Platform — Real-time diplomatic simulation
        </p>
      </footer>
    </div>
  );
}
