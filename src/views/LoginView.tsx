import React, { useState } from 'react';

interface LoginViewProps {
  onNavigate: (path: string) => void;
  onLoginSuccess: (email: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onNavigate, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [simState, setSimState] = useState<'empty' | 'filled' | 'validation' | 'credentials' | 'network' | 'loading'>('empty');
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const handleStateChange = (state: 'empty' | 'filled' | 'validation' | 'credentials' | 'network' | 'loading') => {
    setSimState(state);
    setEmailError(false);
    setPasswordError(false);

    if (state === 'empty') {
      setEmail('');
      setPassword('');
    } else if (state === 'filled') {
      setEmail('ananya.rao@example.com');
      setPassword('SilkPatron2025!');
    } else if (state === 'validation') {
      setEmail('ananya.rao');
      setPassword('');
      setEmailError(true);
      setPasswordError(true);
    } else if (state === 'credentials') {
      setEmail('ananya.rao@example.com');
      setPassword('wrongpassword');
    } else if (state === 'network') {
      setEmail('ananya.rao@example.com');
      setPassword('SilkPatron2025!');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setEmailError(true);
      return;
    }
    if (!password) {
      setPasswordError(true);
      return;
    }

    setSimState('loading');
    setTimeout(() => {
      onLoginSuccess(email);
      onNavigate('/account');
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#FBF7F0] flex flex-col justify-between pb-12">
      {/* Interactive Prototype Preview Ribbon */}
      <aside
        aria-label="Login Prototype State Switcher"
        className="w-full bg-[#1F1918] text-white border-b border-[#352B28] px-3 py-2 z-50 text-xs"
      >
        <div className="max-w-md mx-auto flex items-center justify-between pb-1">
          <span className="text-[10px] tracking-widest uppercase font-semibold text-[#D4AF37] flex items-center gap-1 font-sans">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
            Preview States
          </span>
          <span className="text-[10px] text-stone-400 font-sans">Interactive Demo</span>
        </div>
        <div className="max-w-md mx-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar font-sans text-[11px]">
          <button
            type="button"
            onClick={() => handleStateChange('empty')}
            className={`px-2.5 py-1 rounded border transition-colors ${
              simState === 'empty' ? 'bg-[#780D24] text-white border-[#780D24]' : 'border-stone-600 bg-stone-800 text-stone-200'
            }`}
          >
            Default Empty
          </button>
          <button
            type="button"
            onClick={() => handleStateChange('filled')}
            className={`px-2.5 py-1 rounded border transition-colors ${
              simState === 'filled' ? 'bg-[#780D24] text-white border-[#780D24]' : 'border-stone-600 bg-stone-800 text-stone-200'
            }`}
          >
            Completed
          </button>
          <button
            type="button"
            onClick={() => handleStateChange('validation')}
            className={`px-2.5 py-1 rounded border transition-colors ${
              simState === 'validation' ? 'bg-[#780D24] text-white border-[#780D24]' : 'border-stone-600 bg-stone-800 text-stone-200'
            }`}
          >
            Validation Error
          </button>
          <button
            type="button"
            onClick={() => handleStateChange('credentials')}
            className={`px-2.5 py-1 rounded border transition-colors ${
              simState === 'credentials' ? 'bg-[#780D24] text-white border-[#780D24]' : 'border-stone-600 bg-stone-800 text-stone-200'
            }`}
          >
            Wrong Credentials
          </button>
          <button
            type="button"
            onClick={() => handleStateChange('network')}
            className={`px-2.5 py-1 rounded border transition-colors ${
              simState === 'network' ? 'bg-[#780D24] text-white border-[#780D24]' : 'border-stone-600 bg-stone-800 text-stone-200'
            }`}
          >
            Connection Error
          </button>
        </div>
      </aside>

      {/* Main Form Canvas Container */}
      <main className="w-full max-w-md mx-auto px-5 sm:px-6 pt-8 pb-6 font-sans flex-1">
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

        {/* Heading */}
        <div className="mb-6">
          <h1 className="font-serif text-[30px] sm:text-[32px] text-[#780D24] tracking-tight leading-tight font-medium">
            Welcome back
          </h1>
          <p className="font-sans text-[14px] text-[#5F5552] mt-1.5">
            Sign in to your Parinaya account.
          </p>
        </div>

        {/* Incorrect Credentials Alert */}
        {simState === 'credentials' && (
          <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-[#9B1C1C] flex items-start gap-2.5 text-[13px] leading-snug">
            <span className="material-symbols-outlined text-[#9B1C1C] text-[20px] shrink-0">error</span>
            <div>
              <p className="font-semibold text-red-800">Authentication Failed</p>
              <p className="text-[12.5px] mt-0.5">Incorrect email or password. Please try again.</p>
            </div>
          </div>
        )}

        {/* Network Error Alert */}
        {simState === 'network' && (
          <div className="mb-5 p-3.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-2.5 text-[13px] leading-snug">
            <span className="material-symbols-outlined text-amber-700 text-[20px] shrink-0">wifi_off</span>
            <div>
              <p className="font-semibold text-amber-900">Connection Error</p>
              <p className="text-[12.5px] mt-0.5">Network connection error. Please try again.</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold text-[#231919] tracking-wider uppercase">
                Email Address
              </label>
              {emailError && (
                <span className="text-[#BA1A1A] font-medium text-[11px] flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[13px]">error</span> Enter a valid email
                </span>
              )}
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(false);
              }}
              placeholder="name@domain.com"
              className={`w-full h-12 bg-white border rounded-lg px-3.5 text-[#231919] text-[16px] focus:outline-none transition-colors ${
                emailError ? 'border-[#BA1A1A] bg-red-50/20' : 'border-[#E8DDD6] focus:border-[#780D24]'
              }`}
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <label className="block text-[11px] font-bold text-[#231919] tracking-wider uppercase">
                  Password
                </label>
                {passwordError && (
                  <span className="text-[#BA1A1A] font-medium text-[11px] flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[13px]">error</span> Password required
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/forgot-password')}
                className="text-[12px] font-medium text-[#780D24] hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError(false);
                }}
                placeholder="••••••••"
                className={`w-full h-12 bg-white border rounded-lg pl-3.5 pr-12 text-[#231919] text-[16px] focus:outline-none transition-colors ${
                  passwordError ? 'border-[#BA1A1A] bg-red-50/20' : 'border-[#E8DDD6] focus:border-[#780D24]'
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
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={simState === 'loading'}
              className="w-full h-12 bg-[#780D24] hover:bg-[#5E091B] text-white font-sans text-[14px] font-semibold uppercase tracking-wider rounded-lg shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              {simState === 'loading' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </div>

          <div className="relative py-2 flex items-center justify-center">
            <div className="border-t border-[#E8DDD6] w-full" />
            <span className="bg-[#FBF7F0] px-3 font-sans text-[11px] text-[#5F5552] uppercase tracking-wider relative">
              or
            </span>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('/register')}
            className="w-full h-12 bg-white text-[#231919] border border-[#E8DDD6] hover:border-[#780D24] hover:text-[#780D24] rounded-lg font-sans text-[13px] font-semibold tracking-wide flex items-center justify-center transition-colors active:scale-95"
          >
            New to Parinaya? Create Account
          </button>

          <div className="text-center pt-3 pb-1">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="inline-flex items-center gap-1.5 font-sans text-[13px] font-medium text-[#780D24] hover:underline"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Continue Shopping</span>
            </button>
          </div>
        </form>
      </main>

      <div className="text-center text-[11px] text-[#5F5552] uppercase tracking-widest font-sans">
        © PARINAYA SILKS
      </div>
    </div>
  );
};
