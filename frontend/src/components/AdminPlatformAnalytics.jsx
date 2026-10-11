import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Users, BarChart3, Clock, AlertTriangle, TrendingDown,
  RefreshCw, CheckCircle, Package, Layers, Activity,
  ArrowUpRight, ShieldCheck, Thermometer, Droplets
} from 'lucide-react';

export const AdminPlatformAnalytics = () => {
  const { token, API_BASE_URL } = useAuth();
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, insightsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/inventory/insights`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (insightsRes.ok) setInsights(await insightsRes.json());
    } catch (err) {
      console.error('Failed to load platform analytics:', err);
      setError('Unable to load analytics.');
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const kpis = insights?.summary_kpis || {};
  const totalUsers = stats?.total_users || 0;
  const roles = stats?.active_roles_breakdown || {};

  // Expiring soon items (<= 3 days)
  const nearingExpiryItems = useMemo(() => {
    const list = insights?.batch_freshness_details || [];
    return list
      .filter(i => (i.days_remaining != null && i.days_remaining <= 3 && !i.is_expired))
      .sort((a, b) => a.days_remaining - b.days_remaining);
  }, [insights]);

  // Categories distribution
  const categoryDist = insights?.category_distribution || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#0047AB]" />
          <span>Platform Analytics</span>
        </h2>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-3 py-1 bg-white border border-slate-200 hover:border-[#0047AB] text-slate-700 hover:text-[#0047AB] rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#0047AB]' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 1. Number of Users Tile Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-purple-600" />
            <span>Platform User Directory</span>
          </span>
          <span className="text-xs font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
            {totalUsers} Registered Accounts
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {Object.entries(roles).map(([roleName, count]) => (
            <div key={roleName} className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
              <span className="text-[10px] font-bold text-slate-500 uppercase block truncate">{roleName}</span>
              <div className="text-lg font-black text-slate-900 mt-0.5">{count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Food Freshness Trends */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Average Freshness Score</span>
          <div className="text-2xl font-black text-emerald-600">
            {kpis.store_freshness_index != null ? `${kpis.store_freshness_index}%` : '—'}
          </div>
          <div className="text-[11px] text-slate-500">
            Fresh batches: <strong className="text-emerald-700">{kpis.fresh_count ?? 0}</strong> of {kpis.total_items ?? 0}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase">FEFO Rotation Efficiency</span>
          <div className="text-2xl font-black text-[#0047AB]">
            {kpis.fefo_rotation_efficiency_pct != null ? `${kpis.fefo_rotation_efficiency_pct}%` : '—'}
          </div>
          <div className="text-[11px] text-slate-500">
            First-Expired, First-Out compliance
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Average Shelf-Life</span>
          <div className="text-2xl font-black text-slate-900">
            {kpis.avg_remaining_shelf_life_days ?? 0} Days
          </div>
          <div className="text-[11px] text-slate-500">
            Across active commercial stock
          </div>
        </div>
      </div>

      {/* Freshness by Category Breakdown */}
      {categoryDist.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2.5">
          <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
            Category Freshness Distribution
          </span>
          <div className="space-y-2">
            {categoryDist.map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>{cat.category}</span>
                  <span className="text-slate-500">{cat.count} batches ({cat.pct}%)</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0047AB] rounded-full"
                    style={{ width: `${Math.min(100, cat.pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Inventory Nearing Expiry Section */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="p-3.5 bg-amber-50/70 border-b border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-700" />
            <span className="text-xs font-black text-amber-900 uppercase tracking-wider">
              Inventory Nearing Expiry (≤ 3 Days Remaining)
            </span>
          </div>
          <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            {nearingExpiryItems.length} batches
          </span>
        </div>

        {nearingExpiryItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No items currently nearing expiry.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-black uppercase">
                  <th className="py-2.5 px-3.5">Batch</th>
                  <th className="py-2.5 px-3">Item</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Quantity</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Time Left</th>
                  <th className="py-2.5 px-3 text-right">Freshness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {nearingExpiryItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-500">{item.batch_number}</td>
                    <td className="py-2.5 px-3 font-black text-slate-900">{item.name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{item.category}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{item.quantity} {item.unit}</td>
                    <td className="py-2.5 px-3 text-slate-500">{item.storage_location}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {item.days_remaining}d left
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="font-black text-slate-900">
                        {Math.round(item.overall_food_health_score || 0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
