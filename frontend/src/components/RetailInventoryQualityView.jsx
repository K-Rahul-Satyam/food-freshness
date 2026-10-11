import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle, AlertTriangle, AlertOctagon, Package,
  Search, RefreshCw, Thermometer, Droplets,
  TrendingDown, Check, X, ShieldAlert, Eye
} from 'lucide-react';

const CATEGORY_COLORS = {
  Fruits: 'bg-orange-50 text-orange-700 border-orange-200',
  Vegetables: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Dairy: 'bg-blue-50 text-blue-700 border-blue-200',
  'Meat & Poultry': 'bg-rose-50 text-rose-700 border-rose-200',
  Seafood: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  Bakery: 'bg-amber-50 text-amber-700 border-amber-200',
  Packaged: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Other: 'bg-slate-50 text-slate-700 border-slate-200',
};

export const RetailInventoryQualityView = () => {
  const { token, API_BASE_URL } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortBy, setSortBy] = useState('days_asc');

  const [inspectedBatch, setInspectedBatch] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/insights`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to load inventory quality insights:', err);
      setError('Unable to load inventory data.');
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const items = useMemo(() => {
    if (!data?.batch_freshness_details) return [];
    let list = [...data.batch_freshness_details];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.name?.toLowerCase().includes(q) ||
          i.batch_number?.toLowerCase().includes(q) ||
          i.storage_location?.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== 'All') {
      list = list.filter((i) => i.category === selectedCategory);
    }

    if (selectedStatus !== 'All') {
      list = list.filter((i) => {
        if (selectedStatus === 'Optimal') return (i.overall_food_health_score || 0) >= 75 && !i.is_expired;
        if (selectedStatus === 'Degrading') return (i.overall_food_health_score || 0) >= 40 && (i.overall_food_health_score || 0) < 75 && !i.is_expired;
        if (selectedStatus === 'At Risk') return (i.overall_food_health_score || 0) < 40 || i.is_expired;
        return true;
      });
    }

    list.sort((a, b) => {
      if (sortBy === 'days_asc') return (a.days_remaining || 0) - (b.days_remaining || 0);
      if (sortBy === 'days_desc') return (b.days_remaining || 0) - (a.days_remaining || 0);
      if (sortBy === 'score_desc') return (b.overall_food_health_score || 0) - (a.overall_food_health_score || 0);
      if (sortBy === 'score_asc') return (a.overall_food_health_score || 0) - (b.overall_food_health_score || 0);
      return 0;
    });

    return list;
  }, [data, searchQuery, selectedCategory, selectedStatus, sortBy]);

  const categories = useMemo(() => {
    if (!data?.batch_freshness_details) return ['All'];
    const set = new Set(data.batch_freshness_details.map((i) => i.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [data]);

  const kpis = data?.summary_kpis || {};

  return (
    <div className="space-y-4">
      {/* Simple Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <h2 className="text-lg font-black text-slate-900 tracking-tight">
          Inventory Quality Monitoring
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

      {/* Filter / Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items or batches…"
            className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-[#0047AB] transition text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Optimal">Optimal (≥75%)</option>
            <option value="Degrading">Degrading (40–74%)</option>
            <option value="At Risk">At Risk (&lt;40%)</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none"
          >
            <option value="days_asc">Expiry: Soonest</option>
            <option value="score_desc">Quality: Highest</option>
            <option value="score_asc">Quality: Lowest</option>
          </select>
        </div>
      </div>

      {/* Main Table / Grid */}
      {loading ? (
        <div className="p-12 bg-white border border-slate-200 rounded-xl text-center space-y-2 shadow-2xs">
          <RefreshCw className="w-6 h-6 text-[#0047AB] animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Loading…</p>
        </div>
      ) : error ? (
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-2">
          <AlertOctagon className="w-6 h-6 text-rose-600 mx-auto" />
          <p className="text-xs font-bold text-rose-900">{error}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 bg-white border border-slate-200 rounded-xl text-center space-y-1 shadow-2xs">
          <Package className="w-6 h-6 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-600">No items found</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-black uppercase">
                  <th className="py-2.5 px-3.5">Item</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Batch</th>
                  <th className="py-2.5 px-3">Stock</th>
                  <th className="py-2.5 px-3">Storage</th>
                  <th className="py-2.5 px-3">Shelf Life</th>
                  <th className="py-2.5 px-3 text-center">Quality</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {items.map((item) => {
                  const score = Math.round(item.overall_food_health_score || 0);
                  const isHigh = score >= 75 && !item.is_expired;
                  const isMid = score >= 40 && score < 75 && !item.is_expired;

                  const categoryStyle = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Other;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3.5">
                        <span className="font-black text-slate-900">{item.name}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${categoryStyle}`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                        {item.batch_number}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900">{item.quantity}</span> {item.unit}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {item.temperature_c}°C · {item.humidity_pct}%
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-black ${
                            item.days_remaining <= 1
                              ? 'text-rose-600'
                              : item.days_remaining <= 3
                              ? 'text-amber-700'
                              : 'text-slate-700'
                          }`}
                        >
                          {item.days_remaining <= 0 ? 'Expired' : `${item.days_remaining}d`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-black ${
                            isHigh
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isMid
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {score}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setInspectedBatch(item)}
                          className="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-[#0047AB] rounded-md text-[11px] font-bold transition cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Simple Details Modal */}
      {inspectedBatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-sm w-full overflow-hidden">
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-xs font-black text-white">{inspectedBatch.name}</h3>
              <button
                onClick={() => setInspectedBatch(null)}
                className="w-6 h-6 rounded-md hover:bg-white/10 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Batch</span>
                  <span className="font-mono font-bold text-slate-800">{inspectedBatch.batch_number}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Location</span>
                  <span className="font-bold text-slate-800">{inspectedBatch.storage_location}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Score</span>
                  <span className="font-black text-slate-800">{Math.round(inspectedBatch.overall_food_health_score || 0)}%</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Shelf Life</span>
                  <span className="font-black text-slate-800">{inspectedBatch.days_remaining}d</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex justify-between text-[11px] font-bold text-slate-600">
                  <span>Visual Condition</span>
                  <span>{Math.round(inspectedBatch.visual_condition_score || 0)}%</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold text-slate-600">
                  <span>Storage Environment</span>
                  <span>{Math.round(inspectedBatch.storage_condition_score || 0)}%</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold text-slate-600">
                  <span>Shelf-Life Window</span>
                  <span>{Math.round(inspectedBatch.shelf_life_score || 0)}%</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setInspectedBatch(null)}
                className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
