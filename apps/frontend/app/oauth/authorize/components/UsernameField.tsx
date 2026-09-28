'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, Loader2, AtSign } from 'lucide-react';

interface UsernameFieldProps {
  value: string;
  onChange: (username: string) => void;
  fullName?: string;
  disabled?: boolean;
}

export const UsernameField: React.FC<UsernameFieldProps> = ({
  value,
  onChange,
  fullName,
  disabled = false,
}) => {
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [message, setMessage] = useState<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-generate username from fullName on first load or when blank
  useEffect(() => {
    if (!value && fullName && fullName.trim().length >= 2) {
      const generated = fullName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 15);
      if (generated.length >= 3) {
        onChange(generated);
      }
    }
  }, [fullName]);

  // Debounced check against API
  useEffect(() => {
    if (!value) {
      setStatus('idle');
      setMessage('');
      return;
    }

    const clean = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (clean.length < 3) {
      setStatus('invalid');
      setMessage('At least 3 characters (letters, numbers, underscore)');
      return;
    }

    setStatus('checking');
    setMessage('Checking availability...');

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/oauth/check-username?username=${encodeURIComponent(clean)}`);
        const data = await res.json();

        if (data.available) {
          setStatus('available');
          setMessage('Handle is available');
        } else {
          setStatus('taken');
          setMessage(data.message || 'Already taken');
        }
      } catch (e) {
        // Fallback heuristic if offline
        setStatus('available');
        setMessage('Handle looks good');
      }
    }, 400);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
    onChange(raw);
  };

  return (
    <div className="w-full space-y-1.5">
      <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
        Your 180 Handle
      </label>
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-zinc-400 pointer-events-none flex items-center">
          <AtSign className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={`w-full pl-9 pr-10 py-2.5 bg-zinc-900/90 border rounded-xl text-white text-sm transition-all duration-200 outline-none
            ${
              status === 'available'
                ? 'border-emerald-500/80 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20'
                : status === 'taken' || status === 'invalid'
                ? 'border-rose-500/80 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20'
                : 'border-white/10 hover:border-white/20 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
            }
            disabled:opacity-50`}
        />
        <div className="absolute right-3 flex items-center pointer-events-none">
          {status === 'checking' && (
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          )}
          {status === 'available' && (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          {(status === 'taken' || status === 'invalid') && (
            <XCircle className="w-4 h-4 text-rose-400" />
          )}
        </div>
      </div>

      {message && (
        <p
          className={`text-xs transition-opacity duration-200 ${
            status === 'available'
              ? 'text-emerald-400'
              : status === 'taken' || status === 'invalid'
              ? 'text-rose-400'
              : 'text-zinc-400'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
};
