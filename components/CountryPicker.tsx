'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Globe, X, Check } from 'lucide-react';
import { COUNTRIES } from '@/lib/countries';
import { Country } from '@/lib/types';

interface CountryPickerProps {
  takenCodes: string[];
  onSelect: (country: Country) => void;
  loading?: boolean;
}

export default function CountryPicker({ takenCodes, onSelect, loading }: CountryPickerProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Country | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }, [search]);

  const available = filtered.filter((c) => !takenCodes.includes(c.code));

  return (
    <div className="modal-overlay" style={{ zIndex: 100 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--gold-dim)', border: '1px solid rgba(201,162,39,0.3)' }}
            >
              <Globe size={18} style={{ color: 'var(--gold)' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Select Your Country</h2>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Choose the delegation you will represent in this session
              </p>
            </div>
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              className="input pl-9"
              placeholder="Search countries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* Country grid */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: '55vh' }}>
          {available.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
              <Globe size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No countries found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {available.map((country) => {
                const isSel = selected?.code === country.code;
                return (
                  <motion.button
                    key={country.code}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelected(country)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all"
                    style={{
                      background: isSel
                        ? 'rgba(201,162,39,0.15)'
                        : 'rgba(255,255,255,0.03)',
                      border: isSel
                        ? '1px solid rgba(201,162,39,0.4)'
                        : '1px solid var(--border)',
                    }}
                  >
                    <span className="text-2xl leading-none flex-shrink-0">{country.flag}</span>
                    <span className="text-sm font-medium truncate flex-1" style={{ color: isSel ? 'var(--gold-light)' : 'var(--text-primary)' }}>
                      {country.name}
                    </span>
                    {isSel && <Check size={14} style={{ color: 'var(--gold)', flexShrink: 0 }} />}
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Taken countries note */}
          {takenCodes.length > 0 && (
            <p className="text-xs mt-4 text-center" style={{ color: 'var(--text-muted)' }}>
              {takenCodes.length} {takenCodes.length === 1 ? 'country' : 'countries'} already claimed
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between gap-4" style={{ borderColor: 'var(--border)' }}>
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2"
              >
                <span className="text-xl">{selected.flag}</span>
                <span className="text-sm font-medium">{selected.name}</span>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex gap-2 ml-auto">
            <button
              disabled={!selected || loading}
              onClick={() => selected && onSelect(selected)}
              className="btn btn-gold px-6"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                'Represent this country'
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
