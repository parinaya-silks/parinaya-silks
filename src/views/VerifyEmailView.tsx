import { demoEnabled } from '../config/runtime.ts';
import { FeatureNotice } from '../components/FeatureUnavailable.tsx';
import React, { useState, useEffect } from 'react';

interface VerifyEmailViewProps {
  initialEmail?: string;
  onNavigate: (path: string) => void;
}

export const VerifyEmailView: React.FC<VerifyEmailViewProps> = ({
  initialEmail = '',
  onNavigate,
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [previewState, setPreviewState] = useState<1 | 2 | 3 | 4>(1);
  const [countdown, setCountdown] = useState(45);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCheckVerification = () => {
    if (!demoEnabled) return;
    setPreviewState(2);
    setTimeout(() => {
      // Simulate verified return
      setPreviewState(4);
      showToast('Email verified successfully!');
    }, 1500);
  };

  const handleResend = () => {
    if (!demoEnabled) return;
    if (countdown > 0) {
      showToast(`Please wait ${countdown}s before requesting another verification email.`);
      return;
    }
    setCountdown(45);
    showToast('A fresh verification link has been sent to your email.');
  };

  const handleChangeEmail = () => {
    if (!demoEnabled) return;
    const updated = prompt('Enter updated email address:', email);
    if (updated && updated.includes('@') && updated !== email) {
      setEmail(updated);
      setCountdown(45);
      showToast('Email updated! New verification dispatched.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF7F0] flex flex-col justify-between pb-12">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#231919] text-white px-4 py-2.5 rounded-lg shadow-xl text-[13px] font-sans border border-[#B88A44]/30">
          {toastMsg}
        </div>
      )}

      {/* Interactive Toolbar */}


      {!demoEnabled && <FeatureNotice>Customer email verification is not connected. No verification email has been sent and no email status can be confirmed.</FeatureNotice>}
      {/* Main Content */}
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

        {/* ICON SECTION */}
        <div className="flex justify-center mb-6">
          {previewState === 4 ? (
            <div className="w-24 h-24 rounded-full bg-[#EBF7EE] border-2 border-[#228646] flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[#1F7A3E] text-[50px] fill">
                check_circle
              </span>
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full bg-[#F4EEE5] border border-[#E8DDD6] flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[#780D24] text-[44px]">mail</span>
            </div>
          )}
        </div>

        {/* HEADINGS */}
        <div className="text-center mb-6">
          <h1 className="font-serif text-[26px] sm:text-[28px] font-semibold text-[#780D24] leading-tight mb-2">
            {previewState === 4 ? 'Email verified' : 'Verify your email'}
          </h1>
          <p className="text-[15px] text-[#5F5552] leading-relaxed max-w-[320px] mx-auto">
            {previewState === 4
              ? 'Your email address has been successfully verified. You can now access all features of your Parinaya account.'
              : demoEnabled ? 'Open the verification link in your email, then return here.' : 'Email verification is unavailable until customer authentication is connected.'}
          </p>
        </div>

        {/* NOT VERIFIED ALERT (State 3) */}
        {previewState === 3 && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-900 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[20px] shrink-0 text-red-700 mt-0.5">
              error_outline
            </span>
            <p className="text-[13px] leading-snug">
              Your email hasn&apos;t been verified yet. Open the link in your inbox and try again.
            </p>
          </div>
        )}

        {/* EMAIL CHIP (States 1, 2, 3) */}
        {previewState !== 4 && (
          <div className="mb-6 bg-white border border-[#E8DDD6] rounded-lg p-3.5 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <span className="material-symbols-outlined text-[#780D24] text-[20px] shrink-0">
                mark_email_unread
              </span>
              <span className="text-[14px] sm:text-[15px] font-medium text-[#231919] truncate">
                {email}
              </span>
            </div>
            <button
              disabled={!demoEnabled} onClick={handleChangeEmail}
              className="shrink-0 ml-2 text-[13px] font-semibold text-[#780D24] hover:underline"
              type="button"
            >
              Change Email
            </button>
          </div>
        )}

        {/* ACTIONS */}
        {previewState === 4 ? (
          <div className="space-y-3">
            <button
              onClick={() => onNavigate('/account')}
              className="w-full h-12 bg-[#780D24] hover:bg-[#5E091B] text-white font-sans text-[15px] font-semibold rounded-lg flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
            >
              <span>Continue to Account</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            <button
              onClick={handleCheckVerification}
              disabled={!demoEnabled || previewState === 2}
              className="w-full h-12 bg-[#780D24] hover:bg-[#5E091B] text-white font-sans text-[15px] font-semibold rounded-lg flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
            >
              {previewState === 2 ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Checking Status...</span>
                </>
              ) : (
                <span>Check Verification</span>
              )}
            </button>

            <button
              disabled={!demoEnabled} onClick={handleResend}
              type="button"
              className="w-full h-12 bg-white border border-[#B88A44] hover:bg-[#F4EEE5] text-[#780D24] font-sans text-[14px] font-semibold rounded-lg flex items-center justify-center gap-2 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">forward_to_inbox</span>
              <span>Resend Email</span>
              {countdown > 0 && (
                <span className="text-[11px] font-normal px-2 py-0.5 rounded bg-[#F4EEE5] text-[#780D24] border border-[#E8DDD6]">
                  Resend in {countdown}s
                </span>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                onClick={() => onNavigate('/login')}
                className="text-[14px] text-[#231919] hover:text-[#780D24] underline underline-offset-4"
              >
                Sign in with another account
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
