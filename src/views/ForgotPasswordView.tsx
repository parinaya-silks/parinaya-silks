import { demoEnabled } from '../config/runtime.ts';
import { FeatureNotice } from '../components/FeatureUnavailable.tsx';
import React, { useState } from 'react';

interface ForgotPasswordViewProps {
  onNavigate: (path: string) => void;
}

export const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'default' | 'loading' | 'validation' | 'network' | 'sent' | 'cooldown'>('default');
  const [cooldown, setCooldown] = useState(45);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoEnabled) return;
    if (!email.includes('@')) {
      setState('validation');
      return;
    }
    setState('loading');
    setTimeout(() => {
      setState('sent');
    }, 1200);
  };

  const handleResend = () => {
    setState('cooldown');
    setCooldown(45);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setState('sent');
          return 45;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#FBF7F0] flex flex-col justify-between pb-12">
      {/* Interactive States Switcher Ribbon */}


      {/* Main Container */}
      <main className="w-full max-w-md mx-auto px-5 sm:px-6 pt-6 pb-6 font-sans flex-1">
        {/* Header Back/Close Controls */}
        <div className="flex items-center justify-between pb-6">
          <button
            onClick={() => onNavigate('/login')}
            className="w-11 h-11 flex items-center justify-center text-[#231919] hover:text-[#780D24] active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#780D24] text-[#F2BE72] font-serif flex items-center justify-center text-[12px] font-bold">
              PS
            </span>
            <span className="font-serif text-[17px] font-semibold text-[#780D24] tracking-[0.12em] uppercase">
              PARINAYA SILKS
            </span>
          </div>
          <button
            onClick={() => onNavigate('/')}
            className="w-11 h-11 flex items-center justify-center text-[#231919] hover:text-[#780D24] active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        {/* Network Error Alert */}
        {state === 'network' && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-lg text-left flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[#BA1A1A] text-[20px] shrink-0">wifi_off</span>
            <p className="font-sans text-[13px] text-red-900 leading-snug">
              Network error. Please try again.
            </p>
          </div>
        )}

        {/* STATE A: Form Entry */}
        {state !== 'sent' && state !== 'cooldown' ? (
          <div className="w-full max-w-sm mx-auto flex flex-col">
            <div className="text-center mb-6">
              <h1 className="font-serif text-[30px] font-medium text-[#780D24] tracking-tight mb-2">
                Reset your password
              </h1>
              <p className="font-sans text-[14px] text-[#5F5552]">
                Enter your email to request a reset link.
              </p>
            </div>

            {!demoEnabled && <FeatureNotice>Customer sign-in, registration and account recovery are not connected yet. This form is unavailable; no account changes or emails will be sent.</FeatureNotice>}
        <form onSubmit={handleSubmit} className="space-y-5">
              <div className="text-left space-y-1.5">
                <label className="block font-sans text-[11px] uppercase tracking-wider font-bold text-[#780D24]">
                  Email Address
                </label>
                <div className="relative">
                  <input disabled={!demoEnabled}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className={`w-full h-12 px-3.5 bg-white text-[#231919] font-sans text-[16px] border rounded-lg placeholder:text-stone-400 focus:outline-none ${
                      state === 'validation' ? 'border-[#BA1A1A] bg-red-50/20' : 'border-[#E8DDD6] focus:border-[#780D24]'
                    }`}
                    required
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#5F5552]">
                    <span className="material-symbols-outlined text-[20px]">mail</span>
                  </div>
                </div>
                {state === 'validation' && (
                  <p className="text-xs text-[#BA1A1A] font-sans flex items-center gap-1 pt-0.5">
                    <span className="material-symbols-outlined text-sm">error</span>
                    <span>Please enter a valid email address</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!demoEnabled || state === 'loading'}
                className="w-full min-h-[48px] py-3.5 px-4 bg-[#780D24] hover:bg-[#5E091B] text-white font-sans text-[14px] font-semibold tracking-wide rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
              >
                {state === 'loading' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Send Reset Link</span>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <button
                onClick={() => onNavigate('/login')}
                className="inline-flex items-center gap-1.5 font-sans text-[14px] font-medium text-[#780D24] hover:underline"
              >
                <span>← Back to Sign In</span>
              </button>
            </div>
          </div>
        ) : (
          /* STATE B: Confirmation */
          <div className="w-full max-w-sm mx-auto flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-[#F4EEE5] border border-[#B88A44] flex items-center justify-center mb-5 shadow-sm">
              <div className="w-11 h-11 rounded-full bg-[#780D24] flex items-center justify-center text-[#F2BE72]">
                <span className="material-symbols-outlined text-[24px]">mark_email_read</span>
              </div>
            </div>

            <h2 className="font-serif text-[28px] font-medium text-[#780D24] tracking-tight mb-2">
              Check your email
            </h2>
            <p className="font-sans text-[14px] text-[#231919] leading-relaxed max-w-xs mb-3">
              If an account exists for this email, you&apos;ll receive a password reset link.
            </p>
            <p className="font-sans text-[12px] text-[#5F5552] leading-relaxed max-w-xs mb-8">
              Don&apos;t see it? Check your spam or promotions folder.
            </p>

            <div className="w-full space-y-3">
              <button
                type="button"
                onClick={handleResend}
                disabled={state === 'cooldown'}
                className={`w-full min-h-[46px] py-3 px-4 border rounded-lg font-sans text-[14px] font-semibold tracking-wide transition-colors ${
                  state === 'cooldown'
                    ? 'border-stone-400 text-stone-500 opacity-60 cursor-not-allowed bg-stone-100'
                    : 'border-[#780D24] text-[#780D24] hover:bg-[#F4EEE5]'
                }`}
              >
                {state === 'cooldown' ? `Resend in ${cooldown}s` : 'Resend Email'}
              </button>
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={() => onNavigate('/login')}
                className="inline-flex items-center gap-1.5 font-sans text-[14px] font-medium text-[#780D24] hover:underline"
              >
                <span>← Back to Sign In</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
