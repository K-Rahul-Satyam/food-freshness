import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Leaf, Lock, Mail, User, Shield, ArrowRight, AlertCircle } from 'lucide-react';

const ROLES = [
  { id: 'Consumer', title: 'Consumer', desc: 'Personal freshness reports, shelf life, & storage recommendations' },
  { id: 'Retail Manager', title: 'Retail Manager', desc: 'Product freshness analytics, shelf-life alerts & waste insights' },
  { id: 'Warehouse Operator', title: 'Warehouse Operator', desc: 'Storage compliance monitoring & environmental analytics' },
  { id: 'Food Quality Inspector', title: 'Food Quality Inspector', desc: 'Spoilage detection, quality scoring & audit logs' },
  { id: 'Administrator', title: 'Administrator', desc: 'User management, platform analytics & system monitoring' },
];

export const Register = ({ onSwitchToLogin }) => {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Consumer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(fullName, email, password, role);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 my-8 relative overflow-hidden">
      {/* Background artwork blur */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-15 pointer-events-none"
        style={{ backgroundImage: 'url(/theme-banner.png)' }}
      />

      <div className="light-card w-full max-w-xl p-8 rounded-3xl shadow-xl relative overflow-hidden bg-white/95 border border-[#0047AB]/15 backdrop-blur-md z-10">
        {/* Top Dual Yellow & Blue Accent Stripe */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0047AB] via-[#FFC700] to-[#0047AB]" />

        {/* Ambient glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#FFC700]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#0047AB]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-gradient-to-br from-[#FFC700] to-[#FFB800] rounded-2xl shadow-xs text-[#0047AB] mb-3">
            <Leaf className="w-8 h-8 fill-[#0047AB]" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Create Your Account</h2>
          <p className="text-xs font-semibold text-slate-500 mt-1">Select your role to register in the FreshGuard network</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Full Name
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                className="light-input w-full pl-11 pr-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-[#0047AB]"
              />
            </div>
          </div>

          {/* Email */}
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
                placeholder="jane@organization.com"
                className="light-input w-full pl-11 pr-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-[#0047AB]"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="light-input w-full pl-11 pr-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-[#0047AB]"
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#0047AB]" />
              Select Role-Based Workspace
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
              {ROLES.map((r) => {
                const isSelected = role === r.id;
                return (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-50/80 border-[#0047AB] ring-2 ring-[#0047AB]/20 shadow-xs'
                        : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-bold ${isSelected ? 'text-[#0047AB]' : 'text-slate-800'}`}>
                        {r.title}
                      </span>
                      {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-[#0047AB]" />}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-[#0047AB] to-[#003882] hover:from-[#003882] hover:to-[#002860] border border-[#FFC700]/50 text-white font-bold rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-md shadow-[#0047AB]/25 disabled:opacity-50 mt-4 cursor-pointer"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-600">
            Already registered?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-[#0047AB] font-bold hover:text-[#003882] underline underline-offset-4 transition cursor-pointer"
            >
              Sign In Here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
