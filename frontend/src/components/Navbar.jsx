import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Leaf, LogOut, ShieldCheck, UserCheck, Warehouse, Store, ShoppingBag, Sparkles } from 'lucide-react';

const roleColors = {
  'Consumer': 'bg-emerald-50 text-emerald-700 border-emerald-300',
  'Retail Manager': 'bg-blue-50 text-[#0047AB] border-blue-300',
  'Warehouse Operator': 'bg-amber-50 text-amber-800 border-amber-300',
  'Food Quality Inspector': 'bg-indigo-50 text-indigo-700 border-indigo-300',
  'Administrator': 'bg-rose-50 text-rose-700 border-rose-300',
};

const roleIcons = {
  'Consumer': ShoppingBag,
  'Retail Manager': Store,
  'Warehouse Operator': Warehouse,
  'Food Quality Inspector': ShieldCheck,
  'Administrator': UserCheck,
};

export const Navbar = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const RoleIcon = roleIcons[user.role] || Leaf;

  return (
    <header className="bg-white/95 border-b border-[#0047AB]/20 sticky top-0 z-50 backdrop-blur-md shadow-sm">
      {/* Top Dual Yellow & Blue Accent Stripe */}
      <div className="h-1 w-full bg-gradient-to-r from-[#0047AB] via-[#FFC700] to-[#0047AB]" />
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
        {/* Brand Logo with Sunshine & Royal Blue Theme */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFC700] to-[#FFB800] p-0.5 shadow-xs flex items-center justify-center">
            <div className="w-full h-full bg-[#0047AB] rounded-[10px] flex items-center justify-center text-[#FFC700]">
              <Leaf className="w-5 h-5 fill-[#FFC700]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-black text-[#0047AB] tracking-tight">
                Fresh<span className="text-amber-500">Guard</span>
              </h1>
              <span className="text-[10px] font-black bg-[#FFC700] text-slate-900 px-1.5 py-0.5 rounded-md uppercase tracking-wider shadow-2xs">
                AI
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-semibold tracking-tight">Produce Freshness & Spoilage Monitor</p>
          </div>
        </div>

        {/* User Info & Role Badge */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-bold text-slate-900">{user.full_name}</span>
            <span className="text-[11px] text-slate-500">{user.email}</span>
          </div>

          {/* Role Badge */}
          <div className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 shadow-2xs ${roleColors[user.role] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
            <RoleIcon className="w-3.5 h-3.5" />
            <span>{user.role}</span>
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 transition flex items-center gap-1.5 text-xs font-bold"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
