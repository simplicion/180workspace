'use client';

import React, { useRef, useState, useEffect } from 'react';
import { RotateCw, CheckCircle2 } from 'lucide-react';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (otp: string) => void;
  onComplete?: (otp: string) => void;
  onResend?: () => Promise<void> | void;
  isSubmitting?: boolean;
  channelName?: string; // 'WhatsApp' or 'Email'
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChange,
  onComplete,
  onResend,
  isSubmitting = false,
  channelName = 'WhatsApp',
}) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [cooldown, setCooldown] = useState(60);
  const [isResending, setIsResending] = useState(false);

  // Timer cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) {
      const newOtp = value.split('');
      newOtp[index] = '';
      onChange(newOtp.join(''));
      return;
    }

    const char = val.slice(-1);
    const otpArr = value.padEnd(length, ' ').split('');
    otpArr[index] = char;
    const newOtp = otpArr.join('').trimEnd();
    onChange(newOtp);

    // Focus next box
    if (index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }

    if (newOtp.length === length && onComplete) {
      onComplete(newOtp);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;

    onChange(pasted);
    const targetIdx = Math.min(pasted.length, length - 1);
    inputsRef.current[targetIdx]?.focus();

    if (pasted.length === length && onComplete) {
      onComplete(pasted);
    }
  };

  const handleResendClick = async () => {
    if (cooldown > 0 || isResending || !onResend) return;
    try {
      setIsResending(true);
      await onResend();
      setCooldown(60);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center space-y-4">
      {/* 6-box input */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 w-full">
        {Array.from({ length }).map((_, idx) => {
          const char = value[idx] || '';
          return (
            <input
              key={idx}
              ref={(el) => {
                inputsRef.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={char}
              disabled={isSubmitting}
              onChange={(e) => handleChange(e, idx)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              onPaste={handlePaste}
              className={`w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold font-mono rounded-xl border bg-zinc-900/90 text-white transition-all duration-200 outline-none
                ${
                  char
                    ? 'border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.25)]'
                    : 'border-white/10 hover:border-white/20'
                }
                focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50`}
            />
          );
        })}
      </div>

      {/* Resend and Countdown */}
      <div className="flex items-center justify-between w-full text-xs text-zinc-400 pt-1">
        <span>Sent via {channelName}</span>
        {cooldown > 0 ? (
          <span className="text-zinc-500 font-mono">
            Resend in {cooldown}s
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResendClick}
            disabled={isResending}
            className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-medium transition-colors cursor-pointer disabled:opacity-50 py-1"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
            Resend code
          </button>
        )}
      </div>
    </div>
  );
};
