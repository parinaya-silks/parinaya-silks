import { demoEnabled } from '../config/runtime.ts';
import { FeatureNotice } from '../components/FeatureUnavailable.tsx';
import React, { useState } from 'react';

interface RegisterViewProps {
  onNavigate: (path: string) => void;
  onRegisterSuccess: (name: string, email: string) => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ onNavigate, onRegisterSuccess }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [whatsappMarketing, setWhatsappMarketing] = useState(false);
  const [simState, setSimState] = useState<'default' | 'validation' | 'registered' | 'loading' | 'offline'>('default');

  const handleSimState = (state: 'default' | 'validation' | 'registered' | 'loading' | 'offline') => {
    setSimState(state);
    if (state === 'validation') {
      setEmail('priyanka.reddy');
      setPassword('short');
    } else if (state === 'registered') {
      setEmail('priyanka@example.com');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoEnabled) return;
    if (!email.includes('@')) {
      setSimState('validation');
      return;
    }
    if (password.length < 8) {
      setSimState('validation');
      return;
    }

    setSimState('loading');
    setTimeout(() => {
      onRegisterSuccess(fullName.trim(), email);
      onNavigate('/verify-email?email=' + encodeURIComponent(email));
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#FBF7F0] flex flex-col justify-between pb-12">
      {/* Interactive Prototype States Ribbon */}
      {demoEnabled && <aside
        aria-label="Register Prototype State Switcher"
        className="w-full bg-[#231919] text-[#F3E7C4] px-3 py-2 z-50 text-xs shadow-md"
      >
        <div className="max-w-md mx-auto flex items-center justify-between pb-1">
          <span className="font-bold tracking-wider uppercase text-[10px] text-white flex items-center gap-1 font-sans">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
            Prototype States:
          </span>
          <span className="text-[10px] opacity-75 font-mono capitalize">{simState}</span>
        </div>
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1 text-[10px] font-sans">
          <button
            type="button"
            onClick={() => handleSimState('default')}
            className={`py-1 rounded text-center truncate ${
              simState === 'default' ? 'bg-[#780D24] text-white font-bold' : 'bg-black/40 text-stone-300'
            }`}
          >
            Default
          </button>
          <button
            type="button"
            onClick={() => handleSimState('validation')}
            className={`py-1 rounded text-center truncate ${
              simState === 'validation' ? 'bg-[#780D24] text-white font-bold' : 'bg-black/40 text-stone-300'
            }`}
          >
            Errors
          </button>
          <button
            type="button"
            onClick={() => handleSimState('registered')}
            className={`py-1 rounded text-center truncate ${
              simState === 'registered' ? 'bg-[#780D24] text-white font-bold' : 'bg-black/40 text-stone-300'
            }`}
          >
            Registered
          </button>
          <button
            type="button"
            onClick={() => handleSimState('loading')}
            className={`py-1 rounded text-center truncate ${
              simState === 'loading' ? 'bg-[#780D24] text-white font-bold' : 'bg-black/40 text-stone-300'
            }`}
          >
            Loading
          </button>
          <button
            type="button"
            onClick={() => handleSimState('offline')}
            className={`py-1 rounded text-center truncate ${
              simState === 'offline' ? 'bg-[#780D24] text-white font-bold' : 'bg-black/40 text-stone-300'
            }`}
          >
            Offline
          </button>
        </div>
      </aside>}

      {/* Main Canvas */}
      <main className="w-full max-w-md mx-auto px-5 sm:px-6 pt-6 pb-6 font-sans flex-1">
        {/* Header Back/Close Controls */}
        <div className="flex items-center justify-between pb-6">
          <button
            onClick={() => onNavigate('/')}
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

        {/* Offline banner */}
        {simState === 'offline' && (
          <div className="mb-4 bg-amber-900/90 text-amber-50 px-4 py-2.5 text-xs rounded-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-300 text-base">cloud_off</span>
            <span className="flex-1 font-medium">Unable to connect. Please check your internet connection.</span>
          </div>
        )}

        {/* Already registered banner */}
        {simState === 'registered' && (
          <div className="mb-4 bg-red-50 border border-red-200 text-[#BA1A1A] px-4 py-3 text-xs rounded-lg flex items-start gap-2">
            <span className="material-symbols-outlined text-base mt-0.5 shrink-0">info</span>
            <div className="flex-1">
              <span className="font-medium text-[13px] block">An account with this email already exists.</span>
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="font-semibold underline hover:text-[#780D24] text-[13px] mt-0.5 inline-block"
              >
                Sign In to your account →
              </button>
            </div>
          </div>
        )}

        {/* Header text */}
        <section className="mb-6">
          <h1 className="font-serif text-[28px] sm:text-[30px] leading-tight text-[#780D24] font-medium tracking-tight mb-1.5">
            Create your account
          </h1>
          <p className="font-sans text-[14px] text-[#5F5552]">
            Save favourites, track orders and manage your details.
          </p>
        </section>

        {/* Form */}
        {!demoEnabled && <FeatureNotice>Customer sign-in, registration and account recovery are not connected yet. This form is unavailable; no account changes or emails will be sent.</FeatureNotice>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#231919] mb-1">
              Full Name *
            </label>
            <input disabled={!demoEnabled}
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Priyanka Reddy"
              className="w-full h-12 px-3.5 bg-white border border-[#E8DDD6] rounded-md text-[#231919] text-[16px] focus:outline-none focus:border-[#780D24]"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#231919] mb-1">
              Email Address *
            </label>
            <input disabled={!demoEnabled}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="priyanka@example.com"
              className={`w-full h-12 px-3.5 bg-white border rounded-md text-[#231919] text-[16px] focus:outline-none ${
                simState === 'validation' ? 'border-[#BA1A1A] bg-red-50/20' : 'border-[#E8DDD6] focus:border-[#780D24]'
              }`}
              required
            />
            {simState === 'validation' && (
              <p className="text-xs text-[#BA1A1A] font-medium mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">error</span> Please enter a valid email address
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#231919] mb-1">
              Mobile Number (For dispatch updates)
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 border border-r-0 border-[#E8DDD6] bg-[#F4EEE5] text-[#231919] text-[14px] font-bold rounded-l-md select-none">
                🇮🇳 +91
              </span>
              <input disabled={!demoEnabled}
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                placeholder="98765 43210"
                className="w-full h-12 px-3.5 bg-white border border-[#E8DDD6] rounded-r-md text-[#231919] text-[16px] focus:outline-none focus:border-[#780D24]"
              />
            </div>
            <p className="text-[12px] text-[#5F5552] mt-1 leading-tight">
              Profile information for dispatch and delivery tracking
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#231919] mb-1">
              Create Password *
            </label>
            <div className="relative flex items-center">
              <input disabled={!demoEnabled}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={`w-full h-12 pl-3.5 pr-12 bg-white border rounded-md text-[#231919] text-[16px] focus:outline-none ${
                  simState === 'validation' ? 'border-[#BA1A1A] bg-red-50/20' : 'border-[#E8DDD6] focus:border-[#780D24]'
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="w-11 h-11 absolute right-0 flex items-center justify-center text-[#5F5552] hover:text-[#231919]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            <p className="text-[12px] text-[#5F5552] mt-1 leading-tight">
              At least 8 characters with letters &amp; numbers
            </p>
          </div>

          <div className="pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input disabled={!demoEnabled}
                type="checkbox"
                checked={whatsappMarketing}
                onChange={(e) => setWhatsappMarketing(e.target.checked)}
                className="mt-0.5 rounded text-[#780D24] focus:ring-[#780D24] accent-[#780D24]"
              />
              <span className="text-[13px] text-[#5F5552] leading-snug">
                Send me offers and new arrivals on WhatsApp.
              </span>
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!demoEnabled || simState === 'loading'}
              className="w-full h-12 bg-[#780D24] hover:bg-[#5E091B] text-white font-sans text-[14px] font-semibold tracking-wider uppercase rounded-md shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              {simState === 'loading' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>
          </div>

          <div className="text-center pt-2">
            <p className="text-[14px] text-[#231919]">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="font-semibold text-[#780D24] underline hover:text-[#5E091B] ml-1"
              >
                Sign In
              </button>
            </p>
          </div>

          <div className="text-center px-2 pt-2">
            <p className="text-[12px] text-[#5F5552] leading-normal">
              By creating an account, you agree to Parinaya&apos;s{' '}
              <button
                type="button"
                onClick={() => onNavigate('/policies?tab=terms')}
                className="underline hover:text-[#231919]"
              >
                Terms of Service
              </button>{' '}
              and{' '}
              <button
                type="button"
                onClick={() => onNavigate('/policies?tab=privacy')}
                className="underline hover:text-[#231919]"
              >
                Privacy Policy
              </button>.
            </p>
          </div>
        </form>
      </main>
    </div>
  );
};
