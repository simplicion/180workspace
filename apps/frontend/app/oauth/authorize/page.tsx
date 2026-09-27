'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  Lock,
  Mail,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Sparkles,
  User,
  KeyRound,
} from 'lucide-react';
import { OtpInput } from './components/OtpInput';
import { UsernameField } from './components/UsernameField';
import { ConsentScreen } from './components/ConsentScreen';

type AuthStep =
  | 'VALIDATING'
  | 'LOGIN'
  | 'SIGNUP_CONTACT'
  | 'SIGNUP_OTP'
  | 'SIGNUP_PASSWORD'
  | 'SIGNUP_PROFILE'
  | 'FORGOT_PASSWORD'
  | 'RESET_OTP'
  | 'RESET_PASSWORD'
  | 'GOOGLE_CONTINUATION'
  | 'CONSENT'
  | 'SUCCESS'
  | 'ERROR';

function OAuthAuthorizeContent() {
  const searchParams = useSearchParams();

  // Query Params
  const clientId = searchParams.get('client_id') || '';
  const redirectUri = searchParams.get('redirect_uri') || '';
  const scope = searchParams.get('scope') || 'openid identity:read';
  const state = searchParams.get('state') || '';
  const responseType = searchParams.get('response_type') || 'code';
  const uxMode = (searchParams.get('ux_mode') || 'popup').toLowerCase();
  const codeChallenge = searchParams.get('code_challenge') || '';
  const codeChallengeMethod = searchParams.get('code_challenge_method') || 'S256';
  const nonce = searchParams.get('nonce') || '';

  // Master State Machine
  const [step, setStep] = useState<AuthStep>('VALIDATING');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // OAuth Context State
  const [appInfo, setAppInfo] = useState<any>(null);
  const [scopesList, setScopesList] = useState<string[]>([]);
  const [targetOrigin, setTargetOrigin] = useState<string>('*');

  // Active Authenticated User
  const [activeUser, setActiveUser] = useState<any>(null);
  const [authToken, setAuthToken] = useState<string>('');

  // Form Fields: Login
  const [loginCredential, setLoginCredential] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields: Signup
  const [signupChannel, setSignupChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [signupContact, setSignupContact] = useState('');
  const [signupOtp, setSignupOtp] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupHeadline, setSignupHeadline] = useState('');

  // Form Fields: Forgot & Reset Password
  const [resetCredential, setResetCredential] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Form Fields: Google Continuation
  const [googleData, setGoogleData] = useState<{
    tokenId?: string;
    email?: string;
    name?: string;
    avatar?: string;
  }>({});

  // Location State (HTML5 Geolocation)
  const [userLocation, setUserLocation] = useState<{
    latitude?: number;
    longitude?: number;
    city?: string;
    country?: string;
    formatted?: string;
  }>({});
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Result state for success view
  const [authResult, setAuthResult] = useState<{
    code?: string;
    state?: string;
    redirectUri?: string;
  }>({});

  // 1. Initial Validation on Mount
  useEffect(() => {
    if (!clientId) {
      setErrorMessage('Missing required parameter: client_id');
      setStep('ERROR');
      return;
    }

    // Capture opener origin for postMessage
    if (typeof window !== 'undefined' && window.opener) {
      try {
        if (document.referrer) {
          setTargetOrigin(new URL(document.referrer).origin);
        }
      } catch (e) {}
    }

    validateOAuthRequest();
    captureGeolocation();
  }, [clientId]);

  // Capture HTML5 Location Silently
  const captureGeolocation = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setDetectingLocation(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const res = await fetch('/api/oauth/resolve-location', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ latitude, longitude }),
            });
            const data = await res.json();
            if (data.success && data.location) {
              setUserLocation(data.location);
            } else {
              setUserLocation({ latitude, longitude, formatted: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}` });
            }
          } catch (e) {
            setUserLocation({ latitude, longitude, formatted: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}` });
          } finally {
            setDetectingLocation(false);
          }
        },
        () => {
          setDetectingLocation(false);
        },
        { timeout: 8000 }
      );
    }
  };

  // Validate OAuth application with backend
  const validateOAuthRequest = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope,
        state,
        response_type: responseType,
        ux_mode: uxMode,
      });

      const res = await fetch(`/api/oauth/authorize/validate?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error_description || data.error || 'Invalid OAuth client');
        setStep('ERROR');
        return;
      }

      setAppInfo(data.app);
      setScopesList(data.scopes || ['identity:read']);

      // Check if session token exists in localStorage
      const localToken = typeof window !== 'undefined' ? localStorage.getItem('platform_auth_token') : null;
      if (data.isAuthenticated && data.user) {
        setActiveUser(data.user);
        if (data.hasConsented) {
          // If already consented, auto-approve immediately
          executeConsentSubmission(data.user.id, 'allow', localToken || '');
          return;
        } else {
          setStep('CONSENT');
          return;
        }
      }

      // Check if we have a valid token locally to restore user
      if (localToken) {
        try {
          const userRes = await fetch('/api/oauth/userinfo', {
            headers: { Authorization: `Bearer ${localToken}` },
          });
          if (userRes.ok) {
            const userInfo = await userRes.json();
            setActiveUser(userInfo);
            setAuthToken(localToken);
            setStep('CONSENT');
            return;
          }
        } catch (e) {}
      }

      // No active session -> show login
      setStep('LOGIN');
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to connect to 180 Identity server');
      setStep('ERROR');
    } finally {
      setLoading(false);
    }
  };

  // Execute Consent Submission
  const executeConsentSubmission = async (userId: string, action: 'allow' | 'deny', tokenOverride?: string) => {
    try {
      setLoading(true);
      const token = tokenOverride || authToken || (typeof window !== 'undefined' ? localStorage.getItem('platform_auth_token') : '');

      const res = await fetch('/api/oauth/authorize/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          client_id: clientId,
          redirect_uri: redirectUri,
          scope: scopesList,
          state,
          action,
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod,
          nonce,
          ux_mode: uxMode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error_description || 'Consent processing failed');
        setStep('ERROR');
        return;
      }

      setAuthResult({
        code: data.code,
        state: data.state,
        redirectUri: data.redirectUri,
      });

      // Handle Success
      handleAuthSuccess(data.code, data.state, data.redirectUri);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error granting consent');
      setStep('ERROR');
    } finally {
      setLoading(false);
    }
  };

  // Successful Handshake Handler
  const handleAuthSuccess = (code: string, returnedState: string, targetRedirectUri?: string) => {
    setStep('SUCCESS');

    // Cross-window postMessage handshake for popups
    if (uxMode === 'popup' && typeof window !== 'undefined' && window.opener) {
      try {
        window.opener.postMessage(
          {
            type: '180_IDENTITY_SUCCESS',
            code,
            state: returnedState,
          },
          targetOrigin || '*'
        );
      } catch (err) {
        console.error('[180 Identity] postMessage failed:', err);
      }

      // Auto-close popup after smooth visual feedback
      setTimeout(() => {
        try {
          window.close();
        } catch (e) {}
      }, 700);
      return;
    }

    // Redirect mode fallback
    if (targetRedirectUri) {
      setTimeout(() => {
        window.location.href = targetRedirectUri;
      }, 500);
    }
  };

  // ─── LOGIN SUBMIT ───────────────────────────────────────────────────────────
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginCredential || !loginPassword) return;

    try {
      setLoading(true);
      setErrorMessage('');

      const res = await fetch('/api/oauth/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrPhone: loginCredential,
          password: loginPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Invalid credentials');
        return;
      }

      // Store token
      localStorage.setItem('platform_auth_token', data.token);
      document.cookie = `platform_auth_token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}`;
      setAuthToken(data.token);
      setActiveUser(data.user);

      // Move to Consent
      setStep('CONSENT');
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // ─── SIGNUP STEP 1: SEND OTP ────────────────────────────────────────────────
  const handleSendSignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupContact) return;

    try {
      setLoading(true);
      setErrorMessage('');

      if (signupChannel === 'whatsapp') {
        const res = await fetch('/api/oauth/otp/send-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: signupContact }),
        });
        const data = await res.json();
        if (!data.success) {
          setErrorMessage(data.message || 'Failed to dispatch WhatsApp OTP');
          return;
        }
      } else {
        // Email OTP
        const res = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: signupContact }),
        });
        const data = await res.json();
        if (data.success === false) {
          setErrorMessage(data.message || 'Failed to send OTP to email');
          return;
        }
      }

      setStep('SIGNUP_OTP');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  // ─── SIGNUP STEP 2: VERIFY OTP ──────────────────────────────────────────────
  const handleVerifySignupOtp = async (otpCode: string) => {
    try {
      setLoading(true);
      setErrorMessage('');

      if (signupChannel === 'whatsapp') {
        const res = await fetch('/api/oauth/otp/verify-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: signupContact, otp: otpCode }),
        });
        const data = await res.json();
        if (!data.valid) {
          setErrorMessage(data.error || 'Invalid or expired OTP');
          return;
        }
      } else {
        const res = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: signupContact, otp: otpCode }),
        });
        const data = await res.json();
        if (data.success === false) {
          setErrorMessage(data.message || 'Invalid or expired OTP');
          return;
        }
      }

      setStep('SIGNUP_PASSWORD');
    } catch (err: any) {
      setErrorMessage(err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  // ─── SIGNUP STEP 3: SUBMIT PASSWORD ─────────────────────────────────────────
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }
    setErrorMessage('');
    setStep('SIGNUP_PROFILE');
  };

  // ─── SIGNUP STEP 4: COMPLETE PROFILE & REGISTER ─────────────────────────────
  const handleRegisterProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName || !signupUsername) {
      setErrorMessage('Full name and @username are required');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');

      const isEmail = signupChannel === 'email';
      const res = await fetch('/api/oauth/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName,
          email: isEmail ? signupContact : '',
          phone: !isEmail ? signupContact : '',
          password: signupPassword,
          username: signupUsername,
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          city: userLocation.city,
          country: userLocation.country,
          headline: signupHeadline,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Registration failed');
        return;
      }

      // Save token
      localStorage.setItem('platform_auth_token', data.token);
      document.cookie = `platform_auth_token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}`;
      setAuthToken(data.token);
      setActiveUser(data.user);

      // Move to Consent
      setStep('CONSENT');
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // ─── FORGOT PASSWORD: SEND RESET OTP ────────────────────────────────────────
  const handleSendForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCredential) return;

    try {
      setLoading(true);
      setErrorMessage('');

      const res = await fetch('/api/oauth/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrPhone: resetCredential }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Failed to dispatch reset code');
        return;
      }

      setStep('RESET_OTP');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error requesting password reset');
    } finally {
      setLoading(false);
    }
  };

  // ─── RESET PASSWORD: SUBMIT NEW PASSWORD ────────────────────────────────────
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetOtp || !newPassword) return;

    try {
      setLoading(true);
      setErrorMessage('');

      const res = await fetch('/api/oauth/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrPhone: resetCredential,
          otp: resetOtp,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Failed to reset password');
        return;
      }

      // Set user and proceed to consent
      localStorage.setItem('platform_auth_token', data.token);
      document.cookie = `platform_auth_token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}`;
      setAuthToken(data.token);
      setActiveUser(data.user);

      setStep('CONSENT');
    } catch (err: any) {
      setErrorMessage(err.message || 'Reset password failed');
    } finally {
      setLoading(false);
    }
  };

  // ─── GOOGLE CONTINUATION SUBMIT ─────────────────────────────────────────────
  const handleGoogleContinueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupUsername) return;

    try {
      setLoading(true);
      setErrorMessage('');

      const res = await fetch('/api/oauth/auth/google-continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId: googleData.tokenId,
          email: googleData.email,
          name: googleData.name,
          avatar: googleData.avatar,
          username: signupUsername,
          password: signupPassword,
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          city: userLocation.city,
          country: userLocation.country,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Google continuation failed');
        return;
      }

      localStorage.setItem('platform_auth_token', data.token);
      document.cookie = `platform_auth_token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}`;
      setAuthToken(data.token);
      setActiveUser(data.user);

      setStep('CONSENT');
    } catch (err: any) {
      setErrorMessage(err.message || 'Continuation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[440px] bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 transition-all duration-300">
      {/* Platform Brand Header */}
      <div className="flex items-center justify-between pb-5 border-b border-slate-800/80 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="font-black text-white text-sm">180</span>
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              180 Identity
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Single Sign-On Engine</div>
          </div>
        </div>

        {userLocation.city && (
          <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/50">
            <MapPin className="w-3 h-3 text-indigo-400" />
            <span className="truncate max-w-[120px]">{userLocation.city}</span>
          </div>
        )}
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{errorMessage}</span>
        </div>
      )}

      {/* ─── STATE 1: VALIDATING ───────────────────────────────────────────── */}
      {step === 'VALIDATING' && (
        <div className="py-12 flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-white">Connecting to 180 Identity...</div>
            <div className="text-xs text-slate-400 mt-1">Verifying cryptographic handshake</div>
          </div>
        </div>
      )}

      {/* ─── STATE 2: LOGIN VIEW ───────────────────────────────────────────── */}
      {step === 'LOGIN' && (
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="text-left">
            <h1 className="text-lg font-bold text-white">Sign in to continue</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Access {appInfo?.name || 'this app'} with your unified 180 Profile
            </p>
          </div>

          <div className="space-y-3 pt-1">
            <div className="space-y-1 text-left">
              <label className="text-xs font-semibold text-slate-300">Email or WhatsApp Phone</label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={loginCredential}
                  onChange={(e) => setLoginCredential(e.target.value)}
                  placeholder="name@email.com or +919876543210"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-900/80 border border-slate-800 focus:border-indigo-500 rounded-xl text-white text-sm outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1 text-left">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('');
                    setStep('FORGOT_PASSWORD');
                  }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-900/80 border border-slate-800 focus:border-indigo-500 rounded-xl text-white text-sm outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue'}
          </button>

          {/* Divider */}
          <div className="relative my-4 flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[11px] text-slate-500 uppercase tracking-wider shrink-0">
              or
            </span>
          </div>

          {/* Create Profile CTA */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => {
                setErrorMessage('');
                setStep('SIGNUP_CONTACT');
              }}
              className="text-xs text-slate-300 hover:text-white font-medium flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800/80 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Create 180 Profile</span>
            </button>
          </div>
        </form>
      )}

      {/* ─── STATE 3: SIGNUP CONTACT (WHATSAPP OR EMAIL) ──────────────────── */}
      {step === 'SIGNUP_CONTACT' && (
        <form onSubmit={handleSendSignupOtp} className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep('LOGIN')}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-left">
              <h2 className="text-base font-bold text-white">Create 180 Profile</h2>
              <p className="text-xs text-slate-400">Step 1 of 4: Verification Method</p>
            </div>
          </div>

          {/* Channel Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setSignupChannel('whatsapp');
                setSignupContact('');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                signupChannel === 'whatsapp'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>WhatsApp OTP</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSignupChannel('email');
                setSignupContact('');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                signupChannel === 'email'
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Address</span>
            </button>
          </div>

          <div className="space-y-1 text-left">
            <label className="text-xs font-semibold text-slate-300">
              {signupChannel === 'whatsapp' ? 'WhatsApp Mobile Number' : 'Your Email Address'}
            </label>
            <input
              type={signupChannel === 'whatsapp' ? 'tel' : 'email'}
              required
              value={signupContact}
              onChange={(e) => setSignupContact(e.target.value)}
              placeholder={signupChannel === 'whatsapp' ? '+919876543210' : 'alex@example.com'}
              className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-800 focus:border-indigo-500 rounded-xl text-white text-sm outline-none transition-colors"
            />
            {signupChannel === 'whatsapp' && (
              <p className="text-[11px] text-slate-400">
                A 6-digit verification code will be dispatched via WhatsApp.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Verification Code'}
          </button>
        </form>
      )}

      {/* ─── STATE 4: SIGNUP OTP VERIFICATION ─────────────────────────────── */}
      {step === 'SIGNUP_OTP' && (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep('SIGNUP_CONTACT')}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-left">
              <h2 className="text-base font-bold text-white">Enter 6-Digit Code</h2>
              <p className="text-xs text-slate-400">Step 2 of 4: Sent to {signupContact}</p>
            </div>
          </div>

          <OtpInput
            value={signupOtp}
            onChange={setSignupOtp}
            channelName={signupChannel === 'whatsapp' ? 'WhatsApp' : 'Email'}
            onComplete={handleVerifySignupOtp}
            onResend={() => handleSendSignupOtp({ preventDefault: () => {} } as any)}
            isSubmitting={loading}
          />

          <button
            type="button"
            disabled={signupOtp.length < 6 || loading}
            onClick={() => handleVerifySignupOtp(signupOtp)}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Continue'}
          </button>
        </div>
      )}

      {/* ─── STATE 5: SIGNUP PASSWORD SETUP ───────────────────────────────── */}
      {step === 'SIGNUP_PASSWORD' && (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="text-left">
            <h2 className="text-base font-bold text-white">Set Your Password</h2>
            <p className="text-xs text-slate-400">Step 3 of 4: Create a secure password</p>
          </div>

          <div className="space-y-1 text-left">
            <label className="text-xs font-semibold text-slate-300">Password</label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-900/80 border border-slate-800 focus:border-indigo-500 rounded-xl text-white text-sm outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Visual Strength Meter */}
            <div className="flex gap-1 pt-1">
              <div className={`h-1 flex-1 rounded-full ${signupPassword.length >= 6 ? 'bg-indigo-500' : 'bg-slate-800'}`} />
              <div className={`h-1 flex-1 rounded-full ${signupPassword.length >= 8 ? 'bg-indigo-500' : 'bg-slate-800'}`} />
              <div className={`h-1 flex-1 rounded-full ${/[A-Z]/.test(signupPassword) && /\d/.test(signupPassword) ? 'bg-emerald-500' : 'bg-slate-800'}`} />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Next: Complete Profile</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* ─── STATE 6: SIGNUP PROFILE (NAME, USERNAME, LOCATION) ─────────────── */}
      {step === 'SIGNUP_PROFILE' && (
        <form onSubmit={handleRegisterProfile} className="space-y-4">
          <div className="text-left">
            <h2 className="text-base font-bold text-white">Complete Your 180 Profile</h2>
            <p className="text-xs text-slate-400">Step 4 of 4: Your global ecosystem handle</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1 text-left">
              <label className="text-xs font-semibold text-slate-300">Full Name</label>
              <input
                type="text"
                required
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-800 focus:border-indigo-500 rounded-xl text-white text-sm outline-none transition-colors"
              />
            </div>

            {/* Debounced Unique Username */}
            <UsernameField
              value={signupUsername}
              onChange={setSignupUsername}
              fullName={signupName}
            />

            {/* Location Pill */}
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Location</span>
              </div>
              <div className="text-slate-400 truncate max-w-[180px]">
                {detectingLocation ? '📍 Locating you...' : userLocation.formatted || 'Auto-detected'}
              </div>
            </div>

            {/* Optional Headline */}
            <div className="space-y-1 text-left">
              <label className="text-xs font-semibold text-slate-300">Professional Headline (Optional)</label>
              <input
                type="text"
                value={signupHeadline}
                onChange={(e) => setSignupHeadline(e.target.value)}
                placeholder="e.g. Founder, Designer, Engineer"
                className="w-full px-3 py-2 bg-slate-900/80 border border-slate-800 focus:border-indigo-500 rounded-xl text-white text-xs outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !signupUsername}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create 180 Profile & Continue'}
          </button>
        </form>
      )}

      {/* ─── STATE 7: FORGOT PASSWORD ───────────────────────────────────────── */}
      {step === 'FORGOT_PASSWORD' && (
        <form onSubmit={handleSendForgotOtp} className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep('LOGIN')}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-left">
              <h2 className="text-base font-bold text-white">Reset Password</h2>
              <p className="text-xs text-slate-400">Enter your email or WhatsApp number</p>
            </div>
          </div>

          <div className="space-y-1 text-left">
            <label className="text-xs font-semibold text-slate-300">Email or WhatsApp Phone</label>
            <input
              type="text"
              required
              value={resetCredential}
              onChange={(e) => setResetCredential(e.target.value)}
              placeholder="name@email.com or +919876543210"
              className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-800 focus:border-indigo-500 rounded-xl text-white text-sm outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Code'}
          </button>
        </form>
      )}

      {/* ─── STATE 8: RESET OTP ─────────────────────────────────────────────── */}
      {step === 'RESET_OTP' && (
        <div className="space-y-5">
          <div className="text-left">
            <h2 className="text-base font-bold text-white">Verification Code</h2>
            <p className="text-xs text-slate-400">Enter the code sent to {resetCredential}</p>
          </div>

          <OtpInput
            value={resetOtp}
            onChange={setResetOtp}
            onComplete={() => setStep('RESET_PASSWORD')}
            isSubmitting={loading}
          />

          <button
            type="button"
            disabled={resetOtp.length < 6}
            onClick={() => setStep('RESET_PASSWORD')}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      )}

      {/* ─── STATE 9: RESET PASSWORD ────────────────────────────────────────── */}
      {step === 'RESET_PASSWORD' && (
        <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
          <div className="text-left">
            <h2 className="text-base font-bold text-white">Choose New Password</h2>
            <p className="text-xs text-slate-400">Set a new password for your account</p>
          </div>

          <div className="space-y-1 text-left">
            <label className="text-xs font-semibold text-slate-300">New Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-800 focus:border-indigo-500 rounded-xl text-white text-sm outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading || newPassword.length < 6}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password & Sign In'}
          </button>
        </form>
      )}

      {/* ─── STATE 10: GOOGLE CONTINUATION ─────────────────────────────────── */}
      {step === 'GOOGLE_CONTINUATION' && (
        <form onSubmit={handleGoogleContinueSubmit} className="space-y-4">
          <div className="text-left">
            <h2 className="text-base font-bold text-white">Confirm Your 180 Profile</h2>
            <p className="text-xs text-slate-400">Connected via Google: {googleData.email}</p>
          </div>

          <UsernameField
            value={signupUsername}
            onChange={setSignupUsername}
            fullName={googleData.name}
          />

          <div className="space-y-1 text-left">
            <label className="text-xs font-semibold text-slate-300">Account Password (Optional Fallback)</label>
            <input
              type="password"
              value={signupPassword}
              onChange={(e) => setSignupPassword(e.target.value)}
              placeholder="Set a password for direct login"
              className="w-full px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-white text-xs outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !signupUsername}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Continue'}
          </button>
        </form>
      )}

      {/* ─── STATE 11: CONSENT SCREEN ───────────────────────────────────────── */}
      {step === 'CONSENT' && appInfo && activeUser && (
        <ConsentScreen
          app={appInfo}
          user={activeUser}
          scopes={scopesList}
          isSubmitting={loading}
          onApprove={() => executeConsentSubmission(activeUser.id, 'allow')}
          onCancel={() => executeConsentSubmission(activeUser.id, 'deny')}
          onSwitchAccount={() => {
            localStorage.removeItem('platform_auth_token');
            setActiveUser(null);
            setAuthToken('');
            setStep('LOGIN');
          }}
        />
      )}

      {/* ─── STATE 12: SUCCESS VIEW ─────────────────────────────────────────── */}
      {step === 'SUCCESS' && (
        <div className="py-8 flex flex-col items-center justify-center space-y-4 animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="text-center">
            <h3 className="text-base font-bold text-white">Authenticated!</h3>
            <p className="text-xs text-slate-400 mt-1">
              Returning to {appInfo?.name || 'application'}...
            </p>
          </div>
        </div>
      )}

      {/* ─── STATE 13: ERROR VIEW ───────────────────────────────────────────── */}
      {step === 'ERROR' && (
        <div className="py-6 flex flex-col items-center justify-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="text-center">
            <h3 className="text-base font-bold text-white">Authorization Error</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => validateOAuthRequest()}
            className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}
    </div>
  );
}

export default function OAuthAuthorizePage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <span className="text-xs text-slate-400">Loading 180 Identity...</span>
        </div>
      }
    >
      <OAuthAuthorizeContent />
    </Suspense>
  );
}
