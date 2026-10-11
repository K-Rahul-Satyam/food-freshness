import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Leaf, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { ForgotPasswordModal } from './ForgotPasswordModal';

export const Login = ({ onSwitchToRegister }) => {
  const { login, API_BASE_URL } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background artwork blur */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-15 pointer-events-none"
        style={{ backgroundImage: 'url(/theme-banner.png)' }}
      />

      <div className="light-card w-full max-w-md p-8 rounded-3xl shadow-xl relative overflow-hidden bg-white/95 border border-[#0047AB]/15 backdrop-blur-md z-10">
        {/* Top Dual Yellow & Blue Accent Stripe */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0047AB] via-[#FFC700] to-[#0047AB]" />

        {/* Soft sunshine glow */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-[#FFC700]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-[#0047AB]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-gradient-to-br from-[#FFC700] to-[#FFB800] rounded-2xl shadow-xs text-[#0047AB] mb-3">
            <Leaf className="w-8 h-8 fill-[#0047AB]" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Welcome to FreshGuard</h2>
          <p className="text-xs font-semibold text-slate-500 mt-1">Sign in to your produce freshness monitoring account</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@organization.com"
                className="light-input w-full pl-11 pr-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-[#0047AB]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs font-bold text-[#0047AB] hover:text-[#003882] hover:underline transition"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="light-input w-full pl-11 pr-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-[#0047AB]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-[#0047AB] to-[#003882] hover:from-[#003882] hover:to-[#002860] border border-[#FFC700]/50 text-white font-bold rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-md shadow-[#0047AB]/25 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>


        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-600">
            Don't have an account?{' '}
            <button
              onClick={onSwitchToRegister}
              className="text-[#0047AB] font-bold hover:underline underline-offset-4 transition cursor-pointer"
            >
              Create Account
            </button>
          </p>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        API_BASE_URL={API_BASE_URL}
      />
    </div>
  );
};
