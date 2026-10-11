import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Thermometer, Utensils, RotateCcw, Leaf, Sparkles,
  RefreshCw, Search, Check, Layers, Zap, ChevronRight,
  ChevronLeft, ChevronsLeft, ChevronsRight, AlertTriangle, Lock, Trash2,
  Apple, Citrus, Salad, Carrot, Milk, Drumstick, Beef, Fish, Croissant, Wheat, CupSoda, Package
} from 'lucide-react';
import { ItemRecommendationChatbot } from './ItemRecommendationChatbot';

// ── Site brand colours (exact match to Dashboard / Navbar) ────────────────────
const ROYAL    = '#0047AB';
const ROYAL_D  = '#003882';
const ROYAL_DD = '#001f5e';
const YELLOW   = '#FFC700';
const YELLOW_D = '#e6b300';

// ── Section config ─────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'all',         title: 'All Tips',     icon: Layers      },
  { id: 'storage',     title: 'Storage',      icon: Thermometer },
  { id: 'consumption', title: 'When to Use',  icon: Utensils    },
  { id: 'rotation',    title: 'Rotation',     icon: RotateCcw   },
  { id: 'waste',       title: 'Reduce Waste', icon: Leaf        },
  { id: 'quality',     title: 'Quality',      icon: Sparkles    },
];

const SECTION_META = {
  storage:     { color: '#0369a1', bg: '#f0f9ff', border: 'rgba(0,71,171,0.12)', label: 'Storage Tips'   },
  consumption: { color: ROYAL,     bg: '#eff6ff', border: 'rgba(0,71,171,0.12)', label: 'When to Use'    },
  rotation:    { color: '#6d28d9', bg: '#faf5ff', border: 'rgba(0,71,171,0.12)', label: 'Shelf Rotation'  },
  waste:       { color: '#15803d', bg: '#f0fdf4', border: 'rgba(0,71,171,0.12)', label: 'Reduce Waste'    },
  quality:     { color: ROYAL_D,   bg: '#eff6ff', border: 'rgba(0,71,171,0.12)', label: 'Quality Tips'    },
};

// ── Food item visual config (professional Lucide icons & color accents) ───────
const getFoodItemMeta = (name = '', category = '') => {
  const t = `${name} ${category}`.toLowerCase();
  if (t.includes('citrus') || t.includes('orange') || t.includes('lemon') || t.includes('lime') || t.includes('grapefruit')) {
    return { Icon: Citrus, color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' };
  }
  if (t.includes('apple') || t.includes('berry') || t.includes('avocado') || t.includes('strawberry') || t.includes('banana') || t.includes('grape') || t.includes('fruit') || t.includes('pineapple') || t.includes('mango') || t.includes('peach')) {
    return { Icon: Apple, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
  }
  if (t.includes('spinach') || t.includes('lettuce') || t.includes('salad') || t.includes('green') || t.includes('cabbage') || t.includes('kale') || t.includes('herb')) {
    return { Icon: Salad, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' };
  }
  if (t.includes('carrot') || t.includes('vegetable') || t.includes('potato') || t.includes('tomato') || t.includes('onion') || t.includes('garlic') || t.includes('pepper') || t.includes('cucumber')) {
    return { Icon: Carrot, color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
  }
  if (t.includes('milk') || t.includes('dairy') || t.includes('yogurt') || t.includes('cheese') || t.includes('curd') || t.includes('butter') || t.includes('cream')) {
    return { Icon: Milk, color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' };
  }
  if (t.includes('chicken') || t.includes('poultry') || t.includes('drumstick') || t.includes('turkey') || t.includes('duck')) {
    return { Icon: Drumstick, color: '#b45309', bg: '#fffbeb', border: '#fde68a' };
  }
  if (t.includes('meat') || t.includes('beef') || t.includes('steak') || t.includes('pork') || t.includes('lamb') || t.includes('mutton')) {
    return { Icon: Beef, color: '#991b1b', bg: '#fef2f2', border: '#fecaca' };
  }
  if (t.includes('fish') || t.includes('salmon') || t.includes('seafood') || t.includes('tuna') || t.includes('shrimp') || t.includes('cod') || t.includes('crab')) {
    return { Icon: Fish, color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' };
  }
  if (t.includes('bread') || t.includes('bakery') || t.includes('croissant') || t.includes('sourdough') || t.includes('cake') || t.includes('pastry') || t.includes('bagel') || t.includes('bun')) {
    return { Icon: Croissant, color: '#b45309', bg: '#fffbeb', border: '#fde68a' };
  }
  if (t.includes('grain') || t.includes('wheat') || t.includes('flour') || t.includes('cereal') || t.includes('oat') || t.includes('rice') || t.includes('pasta')) {
    return { Icon: Wheat, color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
  }
  if (t.includes('water') || t.includes('beverage') || t.includes('juice') || t.includes('soda') || t.includes('drink') || t.includes('tea') || t.includes('coffee')) {
    return { Icon: CupSoda, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' };
  }
  return { Icon: Package, color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' };
};

// ── Tip row (matches site's card content style) ───────────────────────────────
const TipRow = ({ icon, title, description, color = ROYAL }) => (
  <div
    className="group flex items-start gap-3 rounded-xl px-3.5 py-2.5 transition-all duration-200 hover:shadow-sm cursor-default"
    style={{
      background: color + '08',
      border: `1px solid ${color}20`,
    }}
  >
    <span
      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base shadow-sm"
      style={{ background: color + '14', border: `1px solid ${color}25` }}
    >
      {icon}
    </span>
    <div className="flex-1 min-w-0">
      <span className="font-black text-[13px] text-slate-900">{title}: </span>
      <span className="text-[13px] text-slate-600 font-normal leading-snug">{description}</span>
    </div>
    <ChevronRight className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color }} />
  </div>
);

const EmptyTip = ({ text }) => (
  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
    <span className="w-6 h-6 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-sm shrink-0">✓</span>
    <p className="text-[13px] text-emerald-800 font-semibold">{text}</p>
  </div>
);

// ── Rec card (uses site's .light-card style) ──────────────────────────────────
const RecCard = ({ sectionId, itemName, children }) => {
  const m = SECTION_META[sectionId];
  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-md"
      style={{
        background: '#ffffff',
        border: `1px solid rgba(0,71,171,0.12)`,
        boxShadow: `0 10px 30px -5px rgba(0,71,171,0.06), 0 4px 14px -2px rgba(255,199,0,0.08)`,
      }}
    >
      {/* Top stripe — site's dual yellow/blue accent */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${ROYAL}, ${YELLOW}, ${ROYAL})` }} />
      {/* Card header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ background: m.bg, borderBottom: `1px solid rgba(0,71,171,0.1)` }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg"
          style={{ background: m.color + '14', border: `1.5px solid ${m.color}25` }}
        >
          {m.emoji}
        </div>
        <div>
          <h2 className="text-sm font-black text-slate-800 leading-none">{m.label}</h2>
          {itemName && (
            <p className="text-[10px] font-bold mt-0.5 truncate max-w-[220px]" style={{ color: ROYAL }}>
              for {itemName}
            </p>
          )}
        </div>
      </div>
      {/* Body */}
      <div className="p-3 space-y-2">{children}</div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

export const RecommendationEngineView = () => {
  const { token, API_BASE_URL } = useAuth();
  const [inventory, setInventory]       = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingRecs, setLoadingRecs]   = useState(false);
  const [recsData, setRecsData]         = useState(null);
  const [rotationData, setRotationData] = useState(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [currentPage, setCurrentPage]   = useState(1);
  const [pageSize, setPageSize]         = useState(8);

  const fetchInventory = useCallback(async () => {
    setLoadingItems(true);
    try {
      const res = await fetch(`${API_BASE_URL}/inventory`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const items = await res.json();
        setInventory(items);
        if (items.length > 0 && !selectedItem) setSelectedItem(items[0]);
      }
    } catch (e) { console.error(e); }
    finally { setLoadingItems(false); }
  }, [token, API_BASE_URL, selectedItem]);

  const fetchProductRecommendations = useCallback(async (item) => {
    if (!item) return;
    setLoadingRecs(true);
    try {
      let remainingDays = 5;
      if (item.expiry_date)
        remainingDays = Math.max(0, Math.round((new Date(item.expiry_date) - new Date()) / 86400000));
      let riskLevel = 'Low Risk';
      if (remainingDays <= 0 || item.status === 'Expired') riskLevel = 'Spoiled';
      else if (remainingDays <= 2) riskLevel = 'Critical Spoilage';
      else if (remainingDays <= 5) riskLevel = 'Elevated Risk';

      const recRes = await fetch(`${API_BASE_URL}/recommendations/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          food_item_id: item.id, food_category: item.category || 'Fruits', item_name: item.name,
          freshness_score: item.freshness_score || 80, storage_score: 80, shelf_life_score: 75, age_score: 75,
          remaining_days: remainingDays, risk_level: riskLevel,
          current_temp_c: item.current_temperature ?? 4.0, current_humidity_pct: item.current_humidity ?? 85,
          packaging_type: item.packaging_type || 'Cardboard Box', storage_location: item.storage_location || 'Cold Storage',
        }),
      });
      if (recRes.ok) { const d = await recRes.json(); setRecsData(d.recommendations || {}); }
      const rotRes = await fetch(`${API_BASE_URL}/inventory/rotation`, { headers: { Authorization: `Bearer ${token}` } });
      if (rotRes.ok) setRotationData(await rotRes.json());
    } catch (e) { console.error(e); }
    finally { setLoadingRecs(false); }
  }, [token, API_BASE_URL]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);
  useEffect(() => {
    if (!selectedItem) return;
    // Never fetch recommendations for an expired item
    const d = getDaysLeft(selectedItem);
    if (d !== null && d <= 0) { setRecsData(null); setLoadingRecs(false); return; }
    fetchProductRecommendations(selectedItem);
  }, [selectedItem, fetchProductRecommendations]);

  const getDaysLeft = (item) => {
    if (!item?.expiry_date) return null;
    return Math.round((new Date(item.expiry_date) - new Date()) / 86400000);
  };

  const daysLeft  = selectedItem ? getDaysLeft(selectedItem) : null;
  const isExpired = daysLeft !== null && daysLeft <= 0;
  const isUrgent  = daysLeft !== null && daysLeft > 0 && daysLeft <= 2;

  const categories = useMemo(() => {
    const s = new Set(inventory.map(i => i.category).filter(Boolean));
    return ['All', ...Array.from(s)];
  }, [inventory]);

  const filteredInventory = useMemo(() =>
    inventory.filter(item => {
      const ms = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.batch_number?.toLowerCase().includes(searchQuery.toLowerCase());
      return ms && (selectedCategory === 'All' || item.category === selectedCategory);
    }), [inventory, searchQuery, selectedCategory]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  const totalPages = pageSize === 'All' ? 1 : Math.max(1, Math.ceil(filteredInventory.length / Number(pageSize)));

  const paginatedInventory = useMemo(() => {
    if (pageSize === 'All') return filteredInventory;
    const start = (currentPage - 1) * Number(pageSize);
    return filteredInventory.slice(start, start + Number(pageSize));
  }, [filteredInventory, currentPage, pageSize]);

  const activeFoodMeta   = selectedItem ? getFoodItemMeta(selectedItem.name, selectedItem.category) : null;
  const selectedRotation = useMemo(() => {
    if (!rotationData?.fefo_rotation_matrix || !selectedItem) return null;
    return rotationData.fefo_rotation_matrix.find(r => r.item_id === selectedItem.id);
  }, [rotationData, selectedItem]);

  const show = (id) => activeFilter === 'all' || activeFilter === id;

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-12">

      {/* ── 1. HERO HEADER — clean and perfectly aligned ── */}
      <div className="bg-gradient-to-r from-[#001f5e] via-[#003882] to-[#0047AB] rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div
          className="absolute -top-10 -right-10 w-64 h-64 rounded-full pointer-events-none opacity-20"
          style={{ background: `radial-gradient(circle, ${YELLOW} 0%, transparent 70%)` }}
        />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left: Icon + Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0 shadow-xs border border-white/10">
              <Zap className="w-5 h-5 text-[#FFC700]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">
                AI Recommendations
              </h1>
              <p className="text-blue-100 text-xs mt-0.5">
                Proactive shelf-life optimization & dynamic action engine
              </p>
            </div>
          </div>

          {/* Right: Search + Refresh directly aligned without nested transparent container */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search food item…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3.5 py-2 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 bg-white shadow-xs border border-slate-200 outline-none w-52 sm:w-60 focus:ring-2 focus:ring-[#FFC700] transition"
              />
            </div>
            <button
              onClick={() => fetchProductRecommendations(selectedItem)}
              disabled={loadingRecs}
              className="px-3.5 py-2 rounded-xl text-xs font-black bg-[#FFC700] hover:bg-[#e6b300] active:scale-95 text-[#003882] shadow-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingRecs ? 'animate-spin' : ''}`} />
              <span>{loadingRecs ? 'Updating…' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. FOOD ITEM SHELF ──────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{
          background: '#ffffff',
          border: `1px solid rgba(0,71,171,0.12)`,
          boxShadow: `0 10px 30px -5px rgba(0,71,171,0.06), 0 4px 14px -2px rgba(255,199,0,0.08)`,
        }}
      >
        {/* Row: label + category pills */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {/* Left accent bar — same as site section headers */}
            <div className="w-1 h-5 rounded-full" style={{ background: `linear-gradient(to bottom, ${ROYAL}, ${YELLOW})` }} />
            <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Choose a Food Item</span>
          </div>
          {/* Category pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="px-2.5 py-1 rounded-xl text-[11px] font-extrabold transition cursor-pointer shrink-0 active:scale-95"
                style={
                  selectedCategory === cat
                    ? { background: `linear-gradient(135deg, ${ROYAL}, ${ROYAL_D})`, color: '#fff', borderBottom: `2px solid ${YELLOW}` }
                    : { color: '#64748b', background: 'transparent' }
                }
                onMouseEnter={e => { if (selectedCategory !== cat) { e.target.style.color = ROYAL; e.target.style.background = '#fffbeb70'; } }}
                onMouseLeave={e => { if (selectedCategory !== cat) { e.target.style.color = '#64748b'; e.target.style.background = 'transparent'; } }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Item grid */}
        {loadingItems ? (
          <div className="py-10 text-center text-xs text-slate-400">
            <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" style={{ color: ROYAL }} />
            Loading inventory…
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">No matching food items found.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              {paginatedInventory.map((item) => {
                const itemDays    = getDaysLeft(item);
                const itemExpired = itemDays !== null && itemDays <= 0;
                const itemUrgent  = itemDays !== null && itemDays > 0 && itemDays <= 2;
                const isSel       = selectedItem?.id === item.id;
                const meta        = getFoodItemMeta(item.name, item.category);

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="rounded-xl cursor-pointer flex flex-col overflow-hidden transition-all duration-200"
                    style={{
                      border: isSel
                        ? `2px solid ${ROYAL}`
                        : `1px solid rgba(0,71,171,0.15)`,
                      background: isSel ? '#eff6ff' : '#ffffff',
                      boxShadow: isSel
                        ? `0 0 0 3px ${YELLOW}40, 0 6px 18px -4px ${ROYAL}30`
                        : `0 2px 8px -2px rgba(0,71,171,0.06)`,
                      transform: isSel ? 'translateY(-2px)' : 'none',
                    }}
                  >
                    {/* Top strip */}
                    <div className="h-0.5" style={{
                      background: itemExpired ? '#dc2626'
                        : itemUrgent ? YELLOW
                        : `linear-gradient(90deg, ${ROYAL}, ${YELLOW})`
                    }} />
                    <div className="p-2.5 flex flex-col gap-1.5 flex-1">
                      <div className="flex items-center justify-between">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-transform duration-200"
                          style={{
                            background: meta.bg,
                            borderColor: meta.border,
                            color: meta.color
                          }}
                        >
                          <meta.Icon className="w-4 h-4" />
                        </div>
                        {isSel && (
                          <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: `linear-gradient(135deg, ${ROYAL}, ${ROYAL_D})` }}>
                            <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-[11px] truncate leading-tight">{item.name}</h3>
                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{item.quantity} {item.unit}</p>
                      </div>
                      <span
                        className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-md self-start"
                        style={
                          itemExpired ? { background: '#fee2e2', color: '#991b1b' }
                            : itemUrgent ? { background: '#fef3c7', color: '#92400e' }
                            : { background: '#dcfce7', color: '#166534' }
                        }
                      >
                        {itemExpired ? 'Expired' : `${itemDays}d left`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Numbered Pagination Controls */}
            {filteredInventory.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2 text-slate-500 font-medium">
                  <span>
                    Showing <strong className="text-slate-800 font-bold">{(currentPage - 1) * (pageSize === 'All' ? filteredInventory.length : Number(pageSize)) + 1}–{pageSize === 'All' ? filteredInventory.length : Math.min(currentPage * Number(pageSize), filteredInventory.length)}</strong> of <strong className="text-slate-800 font-bold">{filteredInventory.length}</strong> items
                  </span>
                  <div className="flex items-center gap-1 ml-2">
                    <span className="text-slate-400 text-[11px]">Show:</span>
                    {[8, 16, 24, 'All'].map(sz => (
                      <button
                        key={sz}
                        onClick={() => { setPageSize(sz); setCurrentPage(1); }}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                          pageSize === sz
                            ? 'bg-[#0047AB] text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Numbered page buttons */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-1 select-none">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      title="First page"
                      className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                    >
                      <ChevronsLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      title="Previous page"
                      className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    {/* Page numbers */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                          currentPage === pageNum
                            ? 'bg-[#0047AB] text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      title="Next page"
                      className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      title="Last page"
                      className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                    >
                      <ChevronsRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 3. SELECTED ITEM BANNER — frosted glass card, same as dashboard ── */}
      {selectedItem && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: '#ffffff',
            border: `2px solid ${YELLOW}80`,
            boxShadow: `0 10px 30px -5px rgba(0,71,171,0.1), 0 4px 14px -2px rgba(255,199,0,0.12)`,
          }}
        >
          {/* Stripe */}
          <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${ROYAL}, ${YELLOW}, ${ROYAL})` }} />

          <div
            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            style={{ background: `linear-gradient(135deg, ${ROYAL} 0%, ${ROYAL_D} 100%)` }}
          >
            <div className="flex items-center gap-3">
              {activeFoodMeta && (
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-md border"
                  style={{
                    background: activeFoodMeta.bg,
                    borderColor: activeFoodMeta.border,
                    color: activeFoodMeta.color
                  }}
                >
                  <activeFoodMeta.Icon className="w-6 h-6" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Site-style badge — blue bg + yellow accent */}
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border"
                    style={{ background: `${ROYAL_D}`, color: YELLOW, borderColor: `${YELLOW}50` }}
                  >
                    Tips for:
                  </span>
                  <h2 className="text-sm font-black text-white">{selectedItem.name}</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white/60"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                    #{selectedItem.batch_number}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-[11px] text-white/70 mt-1 flex-wrap font-medium">
                  <span>Location: <strong className="text-white font-semibold">{selectedItem.storage_location}</strong></span>
                  <span style={{ color: `${YELLOW}60` }}>·</span>
                  <span>Qty: <strong className="text-white font-semibold">{selectedItem.quantity} {selectedItem.unit}</strong></span>
                  <span style={{ color: `${YELLOW}60` }}>·</span>
                  <span>Expiry: <strong className="text-white font-semibold">{selectedItem.expiry_date ? selectedItem.expiry_date.split('T')[0] : 'N/A'}</strong></span>
                </div>
              </div>
            </div>

            {/* Status badge */}
            <span
              className="text-xs font-bold px-3.5 py-1.5 rounded-full shrink-0 tracking-wide"
              style={
                isExpired
                  ? { background: '#450a0a', color: '#fca5a5', border: '1.5px solid #991b1b' }
                  : isUrgent
                  ? { background: `${YELLOW}22`, color: YELLOW, border: `1.5px solid ${YELLOW}80` }
                  : { background: '#052e16', color: '#86efac', border: '1.5px solid #166534' }
              }
            >
              {isExpired ? 'Expired' : isUrgent ? `Use Soon (${daysLeft}d left)` : `${daysLeft} Days Remaining`}
            </span>
          </div>
        </div>
      )}

      {/* ── 4. EXPIRED NOTICE — compact & straight to the point ── */}
      {isExpired ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-300 flex items-center justify-center text-red-600 shrink-0 shadow-2xs">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-black text-red-950">
                {selectedItem?.name} Expired on {selectedItem?.expiry_date ? selectedItem.expiry_date.split('T')[0] : 'N/A'}
              </h3>
              <p className="text-xs font-semibold text-red-700 mt-0.5">
                Do not sell or consume. Quarantine crate and record disposal.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold shrink-0">
            <span className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-800 flex items-center gap-1.5 shadow-2xs">
              <Lock className="w-3.5 h-3.5 text-red-700" /> Quarantine
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-red-600 text-white flex items-center gap-1.5 shadow-2xs">
              <Trash2 className="w-3.5 h-3.5 text-white" /> Dispose
            </span>
          </div>
        </div>
      ) : (
        <ItemRecommendationChatbot selectedItem={selectedItem} daysLeft={daysLeft} />
      )}
    </div>
  );
};
