import React, { useState } from 'react';
import { Mail, Lock, KeyRound, CheckCircle, AlertCircle, X, ArrowRight, RefreshCw } from 'lucide-react';

export const ForgotPasswordModal = ({ isOpen, onClose, API_BASE_URL }) => {
  const [step, setStep] = useState(1); // 1: Request Code, 2: Reset Password, 3: Success
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [demoCodeNotice, setDemoCodeNotice] = useState('');

  if (!isOpen) return null;

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setDemoCodeNotice('');

    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to request reset code');

      if (data.reset_code) {
        setResetCode(data.reset_code);
        setDemoCodeNotice(`Verification Code Sent! Demo Code: ${data.reset_code}`);
      }
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          reset_code: resetCode,
          new_password: newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to reset password');

      setSuccessMsg(data.message || 'Password reset successfully!');
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setEmail('');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccessMsg('');
    setDemoCodeNotice('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="light-card w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl relative border border-[#0047AB]/15 overflow-hidden">
        {/* Decorative ambient background */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#FFC700]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#0047AB]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={resetForm}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-gradient-to-br from-[#FFC700] to-[#FFB800] rounded-2xl shadow-xs text-[#0047AB] mb-3">
            <KeyRound className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900">
            {step === 1 && 'Reset Password'}
            {step === 2 && 'Verify Code & Set Password'}
            {step === 3 && 'Password Reset Complete'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {step === 1 && 'Enter your registered email to receive a recovery reset code.'}
            {step === 2 && 'Enter the 6-digit code and your new secure password.'}
            {step === 3 && 'Your account security has been updated.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {demoCodeNotice && step === 2 && (
          <div className="mb-4 p-3.5 bg-blue-50 border border-[#0047AB]/30 rounded-xl flex items-start gap-2.5 text-[#0047AB] text-xs font-semibold">
            <CheckCircle className="w-4 h-4 text-[#0047AB] shrink-0 mt-0.5" />
            <span>{demoCodeNotice}</span>
          </div>
        )}

        {/* STEP 1: Request Code */}
        {step === 1 && (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Registered Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="light-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#0047AB]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[#0047AB] hover:bg-[#003882] text-white font-bold rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-md shadow-[#0047AB]/25 text-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <span>Send Reset Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Enter Code and New Password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Verification Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                placeholder="123456"
                className="light-input w-full px-4 py-2.5 rounded-xl text-center text-lg font-mono tracking-widest focus:ring-2 focus:ring-[#0047AB]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="light-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#0047AB]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="light-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-[#0047AB]"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] py-2.5 px-4 bg-[#0047AB] hover:bg-[#003882] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-[#0047AB]/25 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Success */}
        {step === 3 && (
          <div className="text-center space-y-4 py-2">
            <div className="p-3 bg-blue-50 text-[#0047AB] rounded-full w-14 h-14 mx-auto flex items-center justify-center border border-[#0047AB]/20">
              <CheckCircle className="w-8 h-8" />
            </div>
            <p className="text-sm font-semibold text-slate-800">{successMsg}</p>
            <button
              onClick={resetForm}
              className="w-full py-3 px-4 bg-[#0047AB] hover:bg-[#003882] text-white font-bold rounded-xl transition text-sm shadow-md shadow-[#0047AB]/25 cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
