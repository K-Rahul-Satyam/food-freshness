import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Thermometer, Droplets, Package, Wind, Sun, TrendingDown,
  RefreshCw, AlertTriangle, CheckCircle, Clock, Zap, ChevronDown,
  BarChart3, Target, Info, Play, Upload, Image as ImageIcon, X
} from 'lucide-react';

const FOOD_CATEGORIES = [
  'Fruits', 'Vegetables', 'Dairy Products', 'Meat & Poultry',
  'Seafood', 'Bakery Products', 'Packaged Foods', 'Beverages'
];

const PACKAGING_OPTIONS = [
  'Vacuum Sealed', 'Modified Atmosphere (MAP)', 'Airtight Plastic',
  'Hermetically Sealed Can', 'Cardboard Box', 'Open Basket', 'Plastic Wrap', 'Glass Jar'
];

const AIR_OPTIONS = ['None / Stagnant', 'Low', 'Medium', 'High'];
const LIGHT_OPTIONS = ['Dark', 'Indirect Light', 'Fluorescent', 'Direct Sunlight'];

const CATEGORY_STORAGE_DEFAULTS = {
  'Fruits': { temp: 4.0, humidity: 90 },
  'Vegetables': { temp: 3.0, humidity: 95 },
  'Dairy Products': { temp: 3.0, humidity: 70 },
  'Meat & Poultry': { temp: 1.0, humidity: 80 },
  'Seafood': { temp: 0.0, humidity: 85 },
  'Bakery Products': { temp: 20.0, humidity: 55 },
  'Packaged Foods': { temp: 18.0, humidity: 50 },
  'Beverages': { temp: 4.0, humidity: 60 },
};

const RISK_COLORS = {
  'Spoiled': { bg: 'bg-red-500', text: 'text-red-600', border: 'border-red-300', light: 'bg-red-50' },
  'Critical Spoilage': { bg: 'bg-orange-500', text: 'text-orange-600', border: 'border-orange-300', light: 'bg-orange-50' },
  'Elevated Risk': { bg: 'bg-yellow-500', text: 'text-yellow-600', border: 'border-yellow-300', light: 'bg-yellow-50' },
  'Moderate Risk': { bg: 'bg-lime-500', text: 'text-lime-600', border: 'border-lime-300', light: 'bg-lime-50' },
  'Low Risk': { bg: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-300', light: 'bg-emerald-50' },
};

const CanvasDecayChart = ({ trendData }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!trendData || trendData.length === 0) return null;

  const dataLen = trendData.length;
  const W = 680;
  const H = 250;
  const pad = { top: 32, right: 40, bottom: 42, left: 45 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const getX = (i) => pad.left + (i / Math.max(1, dataLen - 1)) * chartW;
  const getY = (v) => pad.top + chartH * (1 - Math.max(0, Math.min(100, v)) / 100);

  // Build SVG path
  const points = trendData.map((pt, i) => ({
    x: getX(i),
    y: getY(pt.quality_score),
    score: pt.quality_score,
    day: pt.day,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${(pad.top + chartH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(pad.top + chartH).toFixed(1)} Z`;

  const initialScore = trendData[0]?.quality_score || 0;
  const finalScore = trendData[trendData.length - 1]?.quality_score || 0;
  const totalDays = trendData.length > 1 ? trendData.length - 1 : 1;

  return (
    <div className="space-y-3.5 select-none">
      {/* Light Theme Interactive SVG Chart Canvas */}
      <div className="relative w-full overflow-hidden rounded-2xl bg-white border border-slate-200/90 shadow-sm p-2.5">
        {/* Soft background ambient light gradients */}
        <div className="absolute top-0 right-1/4 w-48 h-32 bg-blue-50/70 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-48 h-32 bg-amber-50/60 rounded-full blur-3xl pointer-events-none" />

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible">
          <defs>
            {/* Area Fill Gradient in Crisp Light Theme */}
            <linearGradient id="lightDecayArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.22" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
            </linearGradient>

            {/* Vibrant Multi-stop Trajectory Stroke */}
            <linearGradient id="lightDecayStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0047AB" />
              <stop offset="45%" stopColor="#0284c7" />
              <stop offset="85%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Soft Drop Shadow for Curve */}
            <filter id="lightCurveShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0284c7" floodOpacity="0.25" />
            </filter>

            {/* Bubble Badge Shadow */}
            <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#0f172a" floodOpacity="0.12" />
            </filter>
          </defs>

          {/* 3 Pastel Quality Zones with Distinct Labels */}
          {/* 1. Prime Fresh Zone (70% - 100%) */}
          <rect
            x={pad.left}
            y={pad.top}
            width={chartW}
            height={chartH * 0.3}
            fill="#10b981"
            fillOpacity="0.06"
            rx="4"
          />
          <text
            x={pad.left + chartW - 8}
            y={pad.top + 14}
            textAnchor="end"
            fill="#059669"
            fontSize="9.5"
            fontWeight="700"
            className="tracking-wider uppercase"
          >
            Optimal Quality Zone
          </text>

          {/* 2. Acceptable / Aging Zone (40% - 70%) */}
          <rect
            x={pad.left}
            y={pad.top + chartH * 0.3}
            width={chartW}
            height={chartH * 0.3}
            fill="#f59e0b"
            fillOpacity="0.04"
          />
          <text
            x={pad.left + chartW - 8}
            y={pad.top + chartH * 0.3 + 14}
            textAnchor="end"
            fill="#d97706"
            fontSize="9.5"
            fontWeight="700"
            className="tracking-wider uppercase"
          >
            Degradation Threshold
          </text>

          {/* 3. Spoilage Zone (0% - 40%) */}
          <rect
            x={pad.left}
            y={pad.top + chartH * 0.6}
            width={chartW}
            height={chartH * 0.4}
            fill="#f43f5e"
            fillOpacity="0.05"
            rx="4"
          />
          <text
            x={pad.left + chartW - 8}
            y={pad.top + chartH * 0.6 + 14}
            textAnchor="end"
            fill="#e11d48"
            fontSize="9.5"
            fontWeight="700"
            className="tracking-wider uppercase"
          >
            Spoilage / Discard Horizon
          </text>

          {/* Horizontal Guidelines & Percentage Markers */}
          {[100, 75, 50, 25, 0].map((val) => {
            const y = getY(val);
            return (
              <g key={val}>
                <line
                  x1={pad.left}
                  y1={y}
                  x2={pad.left + chartW}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray={val === 0 || val === 100 ? '0' : '4 4'}
                  strokeWidth={val === 0 || val === 100 ? '1.5' : '1'}
                />
                <text
                  x={pad.left - 10}
                  y={y + 3.5}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="10"
                  fontWeight="700"
                >
                  {val}%
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={areaD} fill="url(#lightDecayArea)" />

          {/* Trajectory Stroke Curve */}
          <path
            d={pathD}
            fill="none"
            stroke="url(#lightDecayStroke)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#lightCurveShadow)"
          />

          {/* Key Milestone Nodes & Floating Value Pills */}
          {points.map((pt, i) => {
            const isMilestone = i === 0 || i === points.length - 1 || i % Math.max(1, Math.floor(dataLen / 4)) === 0;
            if (!isMilestone) return null;

            const isHovered = hoveredIdx === i;
            const nodeColor = pt.score >= 60 ? '#10b981' : pt.score >= 30 ? '#f59e0b' : '#ef4444';

            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer transition-transform duration-200"
              >
                {/* Soft Outer Pulse Halo */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 13 : 9}
                  fill={nodeColor}
                  fillOpacity="0.18"
                />
                {/* Core Dot */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6.5 : 5}
                  fill={nodeColor}
                  stroke="#ffffff"
                  strokeWidth="2.5"
                />

                {/* Score Floating Badge with Drop Shadow */}
                <g transform={`translate(${pt.x}, ${pt.y - 25})`} filter="url(#badgeShadow)">
                  <rect
                    x="-23"
                    y="-10"
                    width="46"
                    height="20"
                    rx="10"
                    fill="#ffffff"
                    stroke={nodeColor}
                    strokeWidth="1.5"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill="#0f172a"
                    fontSize="11"
                    fontWeight="800"
                  >
                    {Math.round(pt.score)}%
                  </text>
                </g>

                {/* Day Label on X-Axis */}
                <text
                  x={pt.x}
                  y={H - 12}
                  textAnchor="middle"
                  fill="#475569"
                  fontSize="11"
                  fontWeight="700"
                >
                  {pt.day}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Bottom Legend / Quality Phase Badges */}
        <div className="flex items-center justify-between px-3 pt-2 text-[11px] font-bold text-slate-600 border-t border-slate-100 bg-slate-50/60 rounded-xl mt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-2xs" />
            <span className="text-slate-700">Optimal (100–70%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-2xs" />
            <span className="text-slate-700">Usable (70–40%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-2xs" />
            <span className="text-slate-700">Spoiled (&lt;40%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ShelfLifePredictorModal = ({ onClose }) => {
  const { token, API_BASE_URL } = useAuth();
  const [form, setForm] = useState({
    food_category: 'Fruits',
    current_temp_c: 4.0,
    current_humidity_pct: 90,
    packaging_type: 'Cardboard Box',
    storage_duration_days: 0,
    air_circulation: 'Medium',
    light_exposure: 'Dark',
    visual_freshness_score: null,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [profiles, setProfiles] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleCategoryChange = (newCat) => {
    const d = CATEGORY_STORAGE_DEFAULTS[newCat] || { temp: 4.0, humidity: 90 };
    setForm(prev => ({
      ...prev,
      food_category: newCat,
      current_temp_c: d.temp,
      current_humidity_pct: d.humidity
    }));
  };

  useEffect(() => {
    fetch(`${API_BASE_URL}/shelf-life/profiles`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json()).then(setProfiles).catch(() => {});
  }, []);

  const runPrediction = async () => {
    if (!uploadedImage) {
      setError('Please upload a food image to run shelf-life prediction.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = { ...form };
      const res = await fetch(`${API_BASE_URL}/shelf-life/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Prediction failed');
      }
      setResult(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const risk = result ? (RISK_COLORS[result.risk_level] || RISK_COLORS['Low Risk']) : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto border border-slate-200">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">Shelf-Life Predictor</h2>
                <p className="text-blue-100 text-xs mt-0.5">Freshness & expiry estimation</p>
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-lg font-bold transition cursor-pointer">×</button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Controls */}
          <div className="space-y-4">
            <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" /> Prediction Inputs
            </h3>

            {/* 1. Food Image Upload */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                  Food Image <span className="text-rose-500">*</span>
                </span>
                {uploadedImage && (
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedImage(null);
                      update('visual_freshness_score', null);
                      setResult(null);
                      setError(null);
                    }}
                    className="text-[10px] text-red-500 hover:underline flex items-center gap-0.5 cursor-pointer font-semibold"
                  >
                    <X className="w-3 h-3" /> Remove
                  </button>
                )}
              </label>

              {uploadedImage ? (
                <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-emerald-200 bg-emerald-50/20">
                  <img src={uploadedImage.preview} alt="Upload preview" className="w-12 h-12 rounded-lg object-cover border" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{uploadedImage.name}</p>
                    <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-500" /> Freshness: {form.visual_freshness_score}%
                    </p>
                  </div>
                </div>
              ) : (
                <label className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/30 hover:bg-blue-50/60 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition text-center group">
                  <Upload className="w-6 h-6 text-blue-500 group-hover:scale-110 mb-1.5 transition" />
                  <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600">
                    Upload Food Image
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    PNG, JPG, or WEBP
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const preview = URL.createObjectURL(file);
                      setUploadedImage({ name: file.name, preview });
                      setError(null);
                      
                      try {
                        const fd = new FormData();
                        fd.append('file', file);
                        fd.append('food_category', form.food_category);
                        const res = await fetch(`${API_BASE_URL}/analysis/inspect`, {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${token}` },
                          body: fd
                        });
                        if (res.ok) {
                          const data = await res.json();
                          const score = data.freshness_score != null ? Math.round(data.freshness_score) : 85;
                          update('visual_freshness_score', score);
                        } else {
                          update('visual_freshness_score', 85);
                        }
                      } catch (err) {
                        update('visual_freshness_score', 85);
                      }
                    }}
                  />
                </label>
              )}
            </div>

            {/* 2. Product Type */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">Product Type</label>
              <div className="relative">
                <select
                  value={form.food_category}
                  onChange={e => handleCategoryChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {FOOD_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* 3. Storage Temperature */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                <span><Thermometer className="w-3.5 h-3.5 inline mr-1 text-red-500" />Storage Temperature</span>
                <span className="text-blue-600 font-black">{form.current_temp_c}°C</span>
              </label>
              <input
                type="range" min="-25" max="35" step="0.5"
                value={form.current_temp_c}
                onChange={e => update('current_temp_c', parseFloat(e.target.value))}
                className="w-full h-2 rounded-full appearance-none bg-gradient-to-r from-blue-400 to-red-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>−25°C Freezer</span><span>0°C Cold</span><span>+35°C Ambient</span>
              </div>
            </div>

            {/* 4. Humidity */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                <span><Droplets className="w-3.5 h-3.5 inline mr-1 text-blue-500" />Humidity</span>
                <span className="text-blue-600 font-black">{form.current_humidity_pct}% RH</span>
              </label>
              <input
                type="range" min="20" max="99" step="1"
                value={form.current_humidity_pct}
                onChange={e => update('current_humidity_pct', parseInt(e.target.value))}
                className="w-full h-2 rounded-full appearance-none bg-gradient-to-r from-yellow-300 to-blue-500 cursor-pointer"
              />
            </div>

            {/* 5. Storage Duration */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                <span><Clock className="w-3.5 h-3.5 inline mr-1 text-purple-500" />Storage Duration (Elapsed)</span>
                <span className="text-blue-600 font-black">{form.storage_duration_days} days</span>
              </label>
              <input
                type="range" min="0" max="60" step="0.5"
                value={form.storage_duration_days}
                onChange={e => update('storage_duration_days', parseFloat(e.target.value))}
                className="w-full h-2 rounded-full appearance-none bg-gradient-to-r from-purple-300 to-purple-600 cursor-pointer"
              />
            </div>

            {/* 6. Packaging Type */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-amber-500" /> Packaging Type
              </label>
              <div className="relative">
                <select
                  value={form.packaging_type}
                  onChange={e => update('packaging_type', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {PACKAGING_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <button
              onClick={runPrediction}
              disabled={loading || !uploadedImage}
              className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer ${
                !uploadedImage
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Predicting...</span>
                </>
              ) : !uploadedImage ? (
                <>
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span>Upload Food Image to Predict</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Run Prediction</span>
                </>
              )}
            </button>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold">
                {error}
              </div>
            )}
          </div>

          {/* RIGHT: Results */}
          <div className="space-y-4">
            {!uploadedImage ? (
              <div className="h-full min-h-[350px] flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-2.5 text-blue-500">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-700 mb-1">
                  Upload Food Image
                </h4>
                <p className="text-xs text-slate-400">
                  Select an image on the left to predict shelf life.
                </p>
              </div>
            ) : !result ? (
              <div className="h-full min-h-[350px] flex flex-col items-center justify-center text-center p-8 bg-blue-50/30 rounded-2xl border border-blue-100">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-2.5 text-blue-600">
                  <Play className="w-5 h-5 ml-0.5" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">
                  Ready to Predict
                </h4>
                <p className="text-xs text-slate-500 mb-4">
                  Click Run Prediction to estimate remaining shelf life.
                </p>
                <button
                  onClick={runPrediction}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition cursor-pointer"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  Run Prediction
                </button>
              </div>
            ) : (
              <>
                {/* Risk Banner */}
                <div className={`rounded-2xl p-4 border-2 ${risk.border} ${risk.light} flex items-center justify-between`}>
                  <div>
                    <div className={`text-xs font-black uppercase tracking-widest mb-1 ${risk.text}`}>{result.risk_level}</div>
                    <div className="text-3xl font-black text-slate-900">{result.remaining_shelf_life_days} <span className="text-lg font-bold text-slate-500">days</span></div>
                    <div className="text-xs text-slate-500 mt-0.5">{result.remaining_shelf_life_hours}h remaining</div>
                  </div>
                  <div className={`w-14 h-14 rounded-2xl ${risk.bg} flex items-center justify-center shadow-md`}>
                    {result.risk_level === 'Low Risk' ? <CheckCircle className="w-7 h-7 text-white" /> : <AlertTriangle className="w-7 h-7 text-white" />}
                  </div>
                </div>

                {/* Projected Expiry */}
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                  <div className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" /> Projected Expiry
                  </div>
                  <div className="text-xs font-black text-blue-900">
                    {new Date(result.projected_expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>

                {/* Decay Trend Chart */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#0047AB] flex items-center justify-center">
                        <BarChart3 className="w-3.5 h-3.5" />
                      </div>
                      <span>Quality Decay Trajectory</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      Predictive Model
                    </span>
                  </div>
                  <CanvasDecayChart trendData={result.trend_projection} />
                </div>

                {/* Storage Condition Impact */}
                {result.condition_analysis?.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="text-xs font-black text-slate-800 flex items-center gap-2">
                      <Target className="w-4 h-4 text-[#0047AB]" />
                      <span>Storage Status</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {result.condition_analysis.map((c, i) => {
                        const isOpt = c.status === 'optimal';
                        const isWarn = c.status === 'warning';
                        return (
                          <div
                            key={i}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition shadow-xs ${
                              isOpt
                                ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-50/50 to-white border-emerald-200'
                                : isWarn
                                ? 'bg-gradient-to-r from-amber-500/10 via-amber-50/50 to-white border-amber-200'
                                : 'bg-gradient-to-r from-blue-500/10 via-blue-50/50 to-white border-blue-200'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                isOpt ? 'bg-emerald-100 text-emerald-700' :
                                isWarn ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-[#0047AB]'
                              }`}>
                                {isOpt ? <CheckCircle className="w-4 h-4" /> :
                                 isWarn ? <AlertTriangle className="w-4 h-4" /> :
                                 <Info className="w-4 h-4" />}
                              </div>
                              <div>
                                <span className="font-black text-slate-900 text-xs block">{c.factor}</span>
                                <span className="text-slate-600 text-xs leading-snug">{c.message}</span>
                              </div>
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${
                              isOpt ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                              isWarn ? 'bg-amber-100 text-amber-800 border-amber-300' :
                              'bg-blue-100 text-blue-800 border-blue-300'
                            }`}>
                              {isOpt ? 'Optimal' : isWarn ? 'Attention' : 'Standard'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// INLINE VERSION — embedded directly in a tab (no modal overlay)
// ─────────────────────────────────────────────────────────────────────────────
export const ShelfLifePredictorInline = () => {
  const { token, API_BASE_URL } = useAuth();
  const [form, setForm] = useState({
    food_category: 'Fruits',
    current_temp_c: 4.0,
    current_humidity_pct: 90,
    packaging_type: 'Cardboard Box',
    storage_duration_days: 0,
    air_circulation: 'Medium',
    light_exposure: 'Dark',
    visual_freshness_score: null,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleCategoryChange = (newCat) => {
    const d = CATEGORY_STORAGE_DEFAULTS[newCat] || { temp: 4.0, humidity: 90 };
    setForm(prev => ({
      ...prev,
      food_category: newCat,
      current_temp_c: d.temp,
      current_humidity_pct: d.humidity
    }));
  };

  const runPrediction = async () => {
    if (!uploadedImage) {
      setError('Please upload a food image to run shelf-life prediction.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = { ...form };
      const res = await fetch(`${API_BASE_URL}/shelf-life/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Prediction failed');
      }
      setResult(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const risk = result ? (RISK_COLORS[result.risk_level] || RISK_COLORS['Low Risk']) : null;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Controls */}
        <div className="space-y-4">
          <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-600" /> Prediction Inputs
          </h3>

          {/* 1. Food Image Upload */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                Food Image <span className="text-rose-500">*</span>
              </span>
              {uploadedImage && (
                <button
                  type="button"
                  onClick={() => {
                    setUploadedImage(null);
                    update('visual_freshness_score', null);
                    setResult(null);
                    setError(null);
                  }}
                  className="text-[10px] text-red-500 hover:underline flex items-center gap-0.5 cursor-pointer font-semibold"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              )}
            </label>

            {uploadedImage ? (
              <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-emerald-200 bg-emerald-50/20">
                <img src={uploadedImage.preview} alt="Upload preview" className="w-12 h-12 rounded-lg object-cover border" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{uploadedImage.name}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-500" /> Freshness: {form.visual_freshness_score}%
                  </p>
                </div>
              </div>
            ) : (
              <label className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/30 hover:bg-blue-50/60 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition text-center group">
                <Upload className="w-6 h-6 text-blue-500 group-hover:scale-110 mb-1.5 transition" />
                <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600">
                  Upload Food Image
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  PNG, JPG, or WEBP
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const preview = URL.createObjectURL(file);
                    setUploadedImage({ name: file.name, preview });
                    setError(null);
                    
                    try {
                      const fd = new FormData();
                      fd.append('file', file);
                      fd.append('food_category', form.food_category);
                      const res = await fetch(`${API_BASE_URL}/analysis/inspect`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` },
                        body: fd
                      });
                      if (res.ok) {
                        const data = await res.json();
                        const score = data.freshness_score != null ? Math.round(data.freshness_score) : 85;
                        update('visual_freshness_score', score);
                      } else {
                        update('visual_freshness_score', 85);
                      }
                    } catch (err) {
                      update('visual_freshness_score', 85);
                    }
                  }}
                />
              </label>
            )}
          </div>

          {/* 2. Product Type */}
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">Product Type</label>
            <div className="relative">
              <select
                value={form.food_category}
                onChange={e => handleCategoryChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {FOOD_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* 3. Storage Temperature */}
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 flex items-center justify-between">
              <span><Thermometer className="w-3.5 h-3.5 inline mr-1 text-red-500" />Storage Temperature</span>
              <span className="text-blue-600 font-black">{form.current_temp_c}°C</span>
            </label>
            <input
              type="range" min="-25" max="35" step="0.5"
              value={form.current_temp_c}
              onChange={e => update('current_temp_c', parseFloat(e.target.value))}
              className="w-full h-2 rounded-full appearance-none bg-gradient-to-r from-blue-400 to-red-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>−25°C Freezer</span><span>0°C Cold</span><span>+35°C Ambient</span>
            </div>
          </div>

          {/* 4. Humidity */}
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 flex items-center justify-between">
              <span><Droplets className="w-3.5 h-3.5 inline mr-1 text-blue-500" />Humidity</span>
              <span className="text-blue-600 font-black">{form.current_humidity_pct}% RH</span>
            </label>
            <input
              type="range" min="20" max="99" step="1"
              value={form.current_humidity_pct}
              onChange={e => update('current_humidity_pct', parseInt(e.target.value))}
              className="w-full h-2 rounded-full appearance-none bg-gradient-to-r from-yellow-300 to-blue-500 cursor-pointer"
            />
          </div>

          {/* 5. Storage Duration */}
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 flex items-center justify-between">
              <span><Clock className="w-3.5 h-3.5 inline mr-1 text-purple-500" />Storage Duration (Elapsed)</span>
              <span className="text-blue-600 font-black">{form.storage_duration_days} days</span>
            </label>
            <input
              type="range" min="0" max="60" step="0.5"
              value={form.storage_duration_days}
              onChange={e => update('storage_duration_days', parseFloat(e.target.value))}
              className="w-full h-2 rounded-full appearance-none bg-gradient-to-r from-purple-300 to-purple-600 cursor-pointer"
            />
          </div>

          {/* 6. Packaging Type */}
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-amber-500" /> Packaging Type
            </label>
            <div className="relative">
              <select
                value={form.packaging_type}
                onChange={e => update('packaging_type', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {PACKAGING_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <button
            onClick={runPrediction}
            disabled={loading || !uploadedImage}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer ${
              !uploadedImage
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Predicting...</span>
              </>
            ) : !uploadedImage ? (
              <>
                <Upload className="w-4 h-4 text-slate-400" />
                <span>Upload Food Image to Predict</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Run Prediction</span>
              </>
            )}
          </button>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold">
              {error}
            </div>
          )}
        </div>

        {/* RIGHT: Results */}
        <div className="space-y-4">
          {!uploadedImage ? (
            <div className="h-full min-h-[350px] flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-2.5 text-blue-500">
                <ImageIcon className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-700 mb-1">
                Upload Food Image
              </h4>
              <p className="text-xs text-slate-400">
                Select an image on the left to predict shelf life.
              </p>
            </div>
          ) : !result ? (
            <div className="h-full min-h-[350px] flex flex-col items-center justify-center text-center p-8 bg-blue-50/30 rounded-2xl border border-blue-100">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-2.5 text-blue-600">
                <Play className="w-5 h-5 ml-0.5" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">
                Ready to Predict
              </h4>
              <p className="text-xs text-slate-500 mb-4">
                Click Run Prediction to estimate remaining shelf life.
              </p>
              <button
                onClick={runPrediction}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition cursor-pointer"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Run Prediction
              </button>
            </div>
          ) : (
            <>
              {/* Risk Banner */}
              <div className={`rounded-2xl p-4 border-2 ${risk.border} ${risk.light} flex items-center justify-between`}>
                <div>
                  <div className={`text-xs font-black uppercase tracking-widest mb-1 ${risk.text}`}>{result.risk_level}</div>
                  <div className="text-3xl font-black text-slate-900">{result.remaining_shelf_life_days} <span className="text-lg font-bold text-slate-500">days</span></div>
                  <div className="text-xs text-slate-500 mt-0.5">{result.remaining_shelf_life_hours}h remaining</div>
                </div>
                <div className={`w-14 h-14 rounded-2xl ${risk.bg} flex items-center justify-center shadow-md`}>
                  {result.risk_level === 'Low Risk' ? <CheckCircle className="w-7 h-7 text-white" /> : <AlertTriangle className="w-7 h-7 text-white" />}
                </div>
              </div>

              {/* Projected Expiry */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                <div className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" /> Projected Expiry
                </div>
                <div className="text-xs font-black text-blue-900">
                  {new Date(result.projected_expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>

              {/* Decay Trend Chart */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#0047AB] flex items-center justify-center">
                      <BarChart3 className="w-3.5 h-3.5" />
                    </div>
                    <span>Quality Decay Trajectory</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Predictive Model
                  </span>
                </div>
                <CanvasDecayChart trendData={result.trend_projection} />
              </div>

              {/* Storage Condition Impact */}
              {result.condition_analysis?.length > 0 && (
                <div className="space-y-2.5">
                  <div className="text-xs font-black text-slate-800 flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#0047AB]" />
                    <span>Storage Status</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {result.condition_analysis.map((c, i) => {
                      const isOpt = c.status === 'optimal';
                      const isWarn = c.status === 'warning';
                      return (
                        <div
                          key={i}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition shadow-xs ${
                            isOpt
                              ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-50/50 to-white border-emerald-200'
                              : isWarn
                              ? 'bg-gradient-to-r from-amber-500/10 via-amber-50/50 to-white border-amber-200'
                              : 'bg-gradient-to-r from-blue-500/10 via-blue-50/50 to-white border-blue-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              isOpt ? 'bg-emerald-100 text-emerald-700' :
                              isWarn ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-[#0047AB]'
                            }`}>
                              {isOpt ? <CheckCircle className="w-4 h-4" /> :
                               isWarn ? <AlertTriangle className="w-4 h-4" /> :
                               <Info className="w-4 h-4" />}
                            </div>
                            <div>
                              <span className="font-black text-slate-900 text-xs block">{c.factor}</span>
                              <span className="text-slate-600 text-xs leading-snug">{c.message}</span>
                            </div>
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${
                            isOpt ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                            isWarn ? 'bg-amber-100 text-amber-800 border-amber-300' :
                            'bg-blue-100 text-blue-800 border-blue-300'
                          }`}>
                            {isOpt ? 'Optimal' : isWarn ? 'Attention' : 'Standard'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
