import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Thermometer, Droplets, Wind, Sun, Clock, CheckCircle2, AlertTriangle,
  RefreshCw, ShieldCheck, Plus, Trash2, X, Check, XCircle, SlidersHorizontal, ArrowRight, Sparkles
} from 'lucide-react';

const FOOD_CATEGORIES = [
  'Fruits',
  'Vegetables',
  'Dairy Products',
  'Meat & Poultry',
  'Seafood',
  'Bakery Products',
  'Packaged Foods',
  'Beverages'
];

const CATEGORY_META = {
  'Fruits': { icon: '🍎', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', barBg: 'bg-emerald-500' },
  'Vegetables': { icon: '🥦', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', barBg: 'bg-green-500' },
  'Dairy Products': { icon: '🥛', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', barBg: 'bg-blue-500' },
  'Meat & Poultry': { icon: '🥩', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', barBg: 'bg-rose-500' },
  'Seafood': { icon: '🐟', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', barBg: 'bg-cyan-500' },
  'Bakery Products': { icon: '🍞', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', barBg: 'bg-amber-500' },
  'Packaged Foods': { icon: '📦', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', barBg: 'bg-purple-500' },
  'Beverages': { icon: '🥤', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', barBg: 'bg-sky-500' },
};

const CATEGORY_LIMITS = {
  'Fruits': { minTemp: 0, maxTemp: 10, minHum: 80, maxHum: 95, air: 'Medium', light: 'Dark', maxHours: 168 },
  'Vegetables': { minTemp: 0, maxTemp: 8, minHum: 85, maxHum: 98, air: 'Medium', light: 'Dark', maxHours: 120 },
  'Dairy Products': { minTemp: 1, maxTemp: 4, minHum: 60, maxHum: 80, air: 'Low', light: 'Dark', maxHours: 168 },
  'Meat & Poultry': { minTemp: -2, maxTemp: 3, minHum: 75, maxHum: 85, air: 'Low', light: 'Dark', maxHours: 72 },
  'Seafood': { minTemp: -2, maxTemp: 2, minHum: 80, maxHum: 90, air: 'Low', light: 'Dark', maxHours: 48 },
  'Bakery Products': { minTemp: 15, maxTemp: 22, minHum: 45, maxHum: 65, air: 'Medium', light: 'Indirect Light', maxHours: 72 },
  'Packaged Foods': { minTemp: 10, maxTemp: 25, minHum: 40, maxHum: 60, air: 'Low', light: 'Indirect Light', maxHours: 720 },
  'Beverages': { minTemp: 4, maxTemp: 18, minHum: 50, maxHum: 75, air: 'Low', light: 'Dark', maxHours: 720 },
};

export const StorageMonitoringView = () => {
  const { token, API_BASE_URL } = useAuth();
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(null);
  const [scanIntervalMinutes, setScanIntervalMinutes] = useState(0); // 0 = manual only

  // Add Storage Area Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newArea, setNewArea] = useState({
    zone_name: '',
    category: 'Fruits',
    design_temp_c: 4.0,
    design_humidity_pct: 85,
    design_air: 'Medium',
    design_light: 'Dark',
    current_duration_hours: 24,
  });
  const [savingArea, setSavingArea] = useState(false);
  const [areaToDelete, setAreaToDelete] = useState(null);
  const [deletingArea, setDeletingArea] = useState(false);

  // Selected Area for quick recommendation
  const [selectedZone, setSelectedZone] = useState(null);

  // Storage Compliance Validation Form (The 5 Parameters)
  const [validationForm, setValidationForm] = useState({
    food_category: 'Fruits',
    temp_c: 4.0,
    humidity_pct: 85,
    air_circulation: 'Medium',
    light_exposure: 'Dark',
    storage_duration_hours: 48,
  });
  const [validationResult, setValidationResult] = useState(null);
  const [validating, setValidating] = useState(false);

  // Fetch stable storage areas (no random fluctuations)
  const fetchZones = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/storage/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.zones || [];
        setZones(list);
        if (!lastScanTime) {
          setLastScanTime(new Date());
        }
        if (!selectedZone && list.length > 0) {
          setSelectedZone(list[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load storage areas:', err);
    } finally {
      setLoading(false);
    }
  }, [token, API_BASE_URL, selectedZone, lastScanTime]);

  // Regular controlled scan
  const runScan = async () => {
    setScanning(true);
    try {
      const res = await fetch(`${API_BASE_URL}/storage/rooms/scan`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setZones(data.zones || []);
        setLastScanTime(new Date());
      }
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    fetchZones();
    if (scanIntervalMinutes > 0) {
      const intervalMs = scanIntervalMinutes * 60 * 1000;
      const timer = setInterval(runScan, intervalMs);
      return () => clearInterval(timer);
    }
  }, [fetchZones, scanIntervalMinutes]);

  // Add new storage area
  const handleAddArea = async (e) => {
    e.preventDefault();
    if (!newArea.zone_name.trim()) return;
    setSavingArea(true);
    try {
      const res = await fetch(`${API_BASE_URL}/storage/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          zone_name: newArea.zone_name.trim(),
          categories: [newArea.category],
          design_temp_c: parseFloat(newArea.design_temp_c),
          design_humidity_pct: parseFloat(newArea.design_humidity_pct),
          design_air: newArea.design_air,
          design_light: newArea.design_light,
          current_duration_hours: parseFloat(newArea.current_duration_hours),
          zone_type: 'Storage Room',
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewArea({
          zone_name: '',
          category: 'Fruits',
          design_temp_c: 4.0,
          design_humidity_pct: 85,
          design_air: 'Medium',
          design_light: 'Dark',
          current_duration_hours: 24,
        });
        await fetchZones();
      }
    } catch (err) {
      console.error('Failed to add area:', err);
    } finally {
      setSavingArea(false);
    }
  };

  // Confirm delete storage area
  const confirmDeleteArea = async () => {
    if (!areaToDelete) return;
    setDeletingArea(true);
    try {
      const res = await fetch(`${API_BASE_URL}/storage/rooms/${encodeURIComponent(areaToDelete)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setZones(prev => prev.filter(z => z.zone_name !== areaToDelete));
        if (selectedZone?.zone_name === areaToDelete) {
          setSelectedZone(null);
        }
        setAreaToDelete(null);
      }
    } catch (err) {
      console.error('Failed to remove area:', err);
    } finally {
      setDeletingArea(false);
    }
  };

  // Validate compliance
  const runValidation = async () => {
    setValidating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/storage/monitor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(validationForm),
      });
      if (res.ok) {
        setValidationResult(await res.json());
      }
    } catch (err) {
      console.error('Validation error:', err);
    } finally {
      setValidating(false);
    }
  };

  // Live limits for currently selected category
  const activeLimits = CATEGORY_LIMITS[validationForm.food_category] || CATEGORY_LIMITS['Fruits'];
  const isTempSafe = validationForm.temp_c >= activeLimits.minTemp && validationForm.temp_c <= activeLimits.maxTemp;
  const isHumSafe = validationForm.humidity_pct >= activeLimits.minHum && validationForm.humidity_pct <= activeLimits.maxHum;
  const isDurSafe = validationForm.storage_duration_hours <= activeLimits.maxHours;
  const isDurWarning = validationForm.storage_duration_hours > activeLimits.maxHours * 0.8 && isDurSafe;

  const totalZones = zones.length;
  const safeZonesCount = zones.filter(z => z.compliance?.status === 'Compliant').length;
  const reviewZonesCount = totalZones - safeZonesCount;
  const selectedPrimaryCategory = (selectedZone?.categories || [])[0] || 'Fruits';
  const selectedCategoryMeta = CATEGORY_META[selectedPrimaryCategory] || CATEGORY_META['Fruits'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─────────────────────────────────────────────────────────────
          TOP CONTROL BAR: Modern, Attractive & Professional
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Subtle top indicator line */}
        <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-teal-400 absolute top-0 left-0" />

        {/* Title & Status Info */}
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0 border border-blue-400/30">
            <Thermometer className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Storage Condition Monitoring
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap relative z-10">
          {/* Scan schedule */}
          <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-white/90 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-semibold text-slate-500 text-[11px]">Scan:</span>
            <select
              value={scanIntervalMinutes}
              onChange={(e) => setScanIntervalMinutes(parseInt(e.target.value))}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer text-xs"
            >
              <option value={0}>Manual Only</option>
              <option value={15}>Every 15 min</option>
              <option value={30}>Every 30 min</option>
              <option value={60}>Every 1 hr</option>
            </select>
          </div>

          {/* Scan button */}
          <button
            onClick={runScan}
            disabled={scanning}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-md shadow-blue-500/25 active:scale-95 disabled:opacity-50"
            title="Scan sensor readings now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? 'Scanning...' : 'Scan Now'}</span>
          </button>

          {/* Add Area */}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-md shadow-emerald-500/25 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Storage Area</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: ENVIRONMENTAL TRACKING (Storage Areas)
          ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Environmental Tracking</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-[#0047AB] border border-blue-200">
              {zones.length} Areas
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="bg-white/80 rounded-3xl border-2 border-slate-200 p-12 text-center text-slate-500 text-xs font-bold shadow-md">
            <RefreshCw className="w-6 h-6 animate-spin text-[#0047AB] mx-auto mb-2" />
            Loading environmental telemetry...
          </div>
        ) : zones.length === 0 ? (
          <div className="bg-white/90 rounded-3xl border-2 border-dashed border-[#FFC700] p-10 text-center space-y-3 shadow-md">
            <p className="text-sm font-bold text-slate-600">No storage areas monitored yet.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-[#0047AB] to-[#003882] text-white rounded-xl text-xs font-black border-b-2 border-[#FFC700]"
            >
              + Add Storage Area
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {zones.map((zone) => {
              const isSelected = selectedZone?.zone_name === zone.zone_name;
              const isSafe = zone.compliance?.status === 'Compliant';
              const sensor = zone.sensor_data || {};
              const targets = zone.design_targets || {};
              const primaryCat = (zone.categories || [])[0] || 'Fruits';
              const meta = CATEGORY_META[primaryCat] || CATEGORY_META['Fruits'];

              return (
                <div
                  key={zone.zone_name}
                  onClick={() => setSelectedZone(zone)}
                  className={`bg-white/95 backdrop-blur-md rounded-2xl border-2 p-4 cursor-pointer transition-all duration-200 relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 ${
                    isSelected
                      ? 'border-[#0047AB] shadow-lg shadow-blue-500/15 ring-4 ring-[#0047AB]/10'
                      : 'border-slate-200/90 hover:border-[#0047AB]/40'
                  }`}
                >
                  {/* Subtle top indicator bar */}
                  <div className={`h-1.5 w-full absolute top-0 left-0 ${
                    isSafe ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-amber-500 to-[#FFC700]'
                  }`} />

                  {/* Header: Icon, Name & Status Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl ${meta.bg} ${meta.border} border-2 flex items-center justify-center text-lg shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}>
                        {meta.icon}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm tracking-tight truncate">
                          {zone.zone_name}
                        </h3>
                        <span className="text-[11px] text-slate-400 block truncate">
                          {(zone.categories || []).join(', ')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 shadow-2xs ${
                        isSafe
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isSafe ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
                        {isSafe ? 'Safe' : 'Review'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAreaToDelete(zone.zone_name);
                        }}
                        className="text-slate-300 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                        title="Remove area"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Dual Metric Tiles: Temperature & Humidity */}
                  <div className="grid grid-cols-2 gap-2 mb-2.5">
                    {/* Temperature Tile */}
                    <div className="bg-gradient-to-br from-rose-50/70 via-amber-50/30 to-white rounded-xl p-2.5 border border-rose-100/90 shadow-2xs">
                      <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
                        <span className="flex items-center gap-1 text-slate-800">
                          <Thermometer className="w-3.5 h-3.5 text-rose-500" /> Temp
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">Tgt: {targets.temperature_c}°C</span>
                      </div>
                      <div className="text-lg font-bold text-slate-900 mt-0.5">
                        {sensor.temperature_c}°C
                      </div>
                    </div>

                    {/* Humidity Tile */}
                    <div className="bg-gradient-to-br from-sky-50/70 via-blue-50/30 to-white rounded-xl p-2.5 border border-sky-100/90 shadow-2xs">
                      <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
                        <span className="flex items-center gap-1 text-slate-800">
                          <Droplets className="w-3.5 h-3.5 text-sky-500" /> Humidity
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">Tgt: {targets.humidity_pct}%</span>
                      </div>
                      <div className="text-lg font-bold text-slate-900 mt-0.5">
                        {sensor.humidity_pct}%
                      </div>
                    </div>
                  </div>

                  {/* Environmental Parameters Strip */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-100 font-medium">
                    <span className="flex items-center gap-1" title="Airflow">
                      <Wind className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-600 font-medium">{sensor.air_circulation}</span>
                    </span>
                    <span className="flex items-center gap-1" title="Light Exposure">
                      <Sun className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-600 font-medium">{sensor.light_exposure}</span>
                    </span>
                    <span className="flex items-center gap-1" title="Storage Duration">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-600 font-medium">{sensor.storage_duration_hours || 24}h</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Selected Area Intelligence Ribbon */}
        {selectedZone && (
          <div className="p-3.5 px-4 bg-gradient-to-r from-[#0047AB] via-[#003882] to-slate-900 text-white rounded-2xl shadow-xl border-2 border-[#FFC700]/60 flex flex-col md:flex-row md:items-center justify-between gap-3.5 relative overflow-hidden">
            <div className="flex items-center gap-3 relative z-10 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-[#FFC700]/40 flex items-center justify-center shrink-0 text-lg shadow-inner">
                {selectedCategoryMeta.icon || '❄️'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <strong className="text-white font-bold text-sm">{selectedZone.zone_name}</strong>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-400/20 text-blue-200 border border-blue-400/30">
                    {(selectedZone.categories || []).join(', ')}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedZone.compliance?.status === 'Compliant'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {selectedZone.compliance?.status === 'Compliant' ? 'Safe Storage' : 'Adjustment Needed'}
                  </span>
                  <span className="text-[11px] font-bold text-white/90 bg-white/10 px-2 py-0.5 rounded-lg border border-white/15 flex items-center gap-1">
                    <Thermometer className="w-3.5 h-3.5 text-rose-300" />
                    {selectedZone.sensor_data?.temperature_c ?? 4}°C
                  </span>
                  <span className="text-[11px] font-bold text-white/90 bg-white/10 px-2 py-0.5 rounded-lg border border-white/15 flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-sky-300" />
                    {selectedZone.sensor_data?.humidity_pct ?? 85}%
                  </span>
                </div>
                {selectedZone.compliance?.status !== 'Compliant' && ((selectedZone.optimizations?.[0]?.detail) || (selectedZone.compliance?.recommendations?.[0])) && (
                  <p className="text-xs text-amber-200 mt-1 leading-relaxed">
                    {(selectedZone.optimizations?.[0]?.detail) || (selectedZone.compliance?.recommendations?.[0])}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                const primaryCat = (selectedZone.categories || [])[0] || 'Fruits';
                const s = selectedZone.sensor_data || {};
                setValidationForm({
                  food_category: primaryCat,
                  temp_c: s.temperature_c ?? 4,
                  humidity_pct: s.humidity_pct ?? 85,
                  air_circulation: s.air_circulation ?? 'Medium',
                  light_exposure: s.light_exposure ?? 'Dark',
                  storage_duration_hours: s.storage_duration_hours ?? 24,
                });
                setValidationResult(null);
                const el = document.getElementById('compliance-studio');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="relative z-10 shrink-0 px-4 py-2 rounded-xl text-xs font-bold bg-[#FFC700] hover:bg-amber-400 text-slate-900 border-b-2 border-[#0047AB] shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#0047AB]" />
              <span>Audit in Validator ↓</span>
            </button>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: STORAGE COMPLIANCE VALIDATION STUDIO
          ───────────────────────────────────────────────────────────── */}
      <div id="compliance-studio" className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">

        {/* Studio Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0047AB] to-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#FFC700]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Storage Compliance Validation
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0 font-bold">
            <span>Food:</span>
            <strong className="text-[#0047AB]">{validationForm.food_category}</strong>
          </div>
        </div>

        {/* The 5 Parameters Inputs with Clear Targets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Category */}
          <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80">
            <label className="text-xs font-bold text-slate-800 block mb-1.5">
              Food Category
            </label>
            <select
              value={validationForm.food_category}
              onChange={(e) => {
                const cat = e.target.value;
                const d = CATEGORY_LIMITS[cat];
                setValidationForm(p => ({
                  ...p,
                  food_category: cat,
                  temp_c: d ? Math.round((d.minTemp + d.maxTemp) / 2) : p.temp_c,
                  humidity_pct: d ? Math.round((d.minHum + d.maxHum) / 2) : p.humidity_pct,
                  air_circulation: d?.air || 'Medium',
                  light_exposure: d?.light || 'Dark',
                  storage_duration_hours: Math.min(p.storage_duration_hours, d?.maxHours || 168)
                }));
                setValidationResult(null);
              }}
              className="w-full text-xs font-medium text-slate-800 border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-blue-500"
            >
              {FOOD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* 1. Temperature */}
          <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80">
            <div className="flex justify-between items-center text-xs font-bold mb-1.5">
              <span className="text-slate-900 font-bold text-xs">1. Temperature</span>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isTempSafe ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'}`}>
                  {isTempSafe ? 'Safe' : 'Deviates'}
                </span>
                <span className={`font-bold text-sm ${isTempSafe ? 'text-blue-700' : 'text-rose-600'}`}>
                  {validationForm.temp_c}°C
                </span>
              </div>
            </div>
            <input
              type="range" min="-25" max="35" step="0.5"
              value={validationForm.temp_c}
              onChange={(e) => setValidationForm(p => ({ ...p, temp_c: parseFloat(e.target.value) }))}
              className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-[#0047AB]"
            />
          </div>

          {/* 2. Humidity */}
          <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80">
            <div className="flex justify-between items-center text-xs font-bold mb-1.5">
              <span className="text-slate-900 font-bold text-xs">2. Humidity</span>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isHumSafe ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'}`}>
                  {isHumSafe ? 'Safe' : 'Deviates'}
                </span>
                <span className={`font-bold text-sm ${isHumSafe ? 'text-blue-700' : 'text-rose-600'}`}>
                  {validationForm.humidity_pct}%
                </span>
              </div>
            </div>
            <input
              type="range" min="20" max="99" step="1"
              value={validationForm.humidity_pct}
              onChange={(e) => setValidationForm(p => ({ ...p, humidity_pct: parseInt(e.target.value) }))}
              className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-[#0047AB]"
            />
          </div>

          {/* 3. Air Circulation */}
          <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80">
            <div className="flex justify-between items-center text-xs font-bold mb-1.5">
              <span className="text-slate-900 font-bold text-xs">3. Airflow</span>
              <span className="text-[10px] text-slate-400 font-normal">Target: {activeLimits.air}</span>
            </div>
            <select
              value={validationForm.air_circulation}
              onChange={(e) => setValidationForm(p => ({ ...p, air_circulation: e.target.value }))}
              className="w-full text-xs font-medium text-slate-800 border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-blue-500"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="None / Stagnant">None / Stagnant</option>
            </select>
          </div>

          {/* 4. Light Exposure */}
          <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80">
            <div className="flex justify-between items-center text-xs font-bold mb-1.5">
              <span className="text-slate-900 font-bold text-xs">4. Light</span>
              <span className="text-[10px] text-slate-400 font-normal">Target: {activeLimits.light}</span>
            </div>
            <select
              value={validationForm.light_exposure}
              onChange={(e) => setValidationForm(p => ({ ...p, light_exposure: e.target.value }))}
              className="w-full text-xs font-medium text-slate-800 border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-blue-500"
            >
              <option value="Dark">Dark</option>
              <option value="Indirect Light">Indirect Light</option>
              <option value="Fluorescent">Fluorescent</option>
              <option value="Direct Sunlight">Direct Sunlight</option>
            </select>
          </div>

          {/* 5. Storage Duration */}
          <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80">
            <div className="flex justify-between items-center text-xs font-bold mb-1.5">
              <span className="text-slate-900 font-bold text-xs">5. Duration</span>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${!isDurSafe ? 'bg-rose-100 text-rose-800 border border-rose-300' : isDurWarning ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'}`}>
                  Max: {activeLimits.maxHours}h
                </span>
                <span className="font-bold text-sm text-blue-700">
                  {validationForm.storage_duration_hours}h
                </span>
              </div>
            </div>
            <input
              type="range" min="1" max={activeLimits.maxHours > 168 ? activeLimits.maxHours : 168} step="1"
              value={validationForm.storage_duration_hours}
              onChange={(e) => setValidationForm(p => ({ ...p, storage_duration_hours: parseInt(e.target.value) }))}
              className="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-[#0047AB]"
            />
          </div>
        </div>

        {/* Validate Button */}
        <button
          onClick={runValidation}
          disabled={validating}
          className="w-full py-3.5 px-6 bg-gradient-to-r from-[#0047AB] via-blue-600 to-[#003882] hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-600/30 border-b-2 border-[#FFC700] active:scale-[0.99] disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4 text-[#FFC700]" />
          <span>{validating ? 'Verifying Safe Regulatory Limits...' : 'Check Compliance Now'}</span>
        </button>

        {/* ─────────────────────────────────────────────────────────────
            CLEAR, DETAILED 5-PARAMETER COMPLIANCE RESULT
            ───────────────────────────────────────────────────────────── */}
        {validationResult && (
          <div className="p-5 rounded-2xl border-2 border-slate-200 bg-white shadow-lg space-y-4">
            {/* Status Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {validationResult.overall_compliance_status === 'Compliant' ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                ) : validationResult.overall_compliance_status === 'Warning' ? (
                  <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
                )}
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  validationResult.overall_compliance_status === 'Compliant'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : validationResult.overall_compliance_status === 'Warning'
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-rose-100 text-rose-900 border-rose-300'
                }`}>
                  {validationResult.overall_compliance_status === 'Compliant'
                    ? 'Compliant (All 5 Parameters Safe)'
                    : validationResult.overall_compliance_status === 'Warning'
                    ? 'Advisory Warning (Near Threshold)'
                    : 'Non-Compliant (Adjustment Needed)'}
                </span>
              </div>
              <span className="text-xs text-slate-500 font-bold">
                Category: <strong className="text-slate-900">{validationResult.food_category}</strong>
              </span>
            </div>

            {/* 5 Storage Parameters Breakdown Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
              {Object.entries(validationResult.parameters || {}).map(([key, item]) => {
                const labelMap = {
                  temperature: '1. Temperature',
                  humidity: '2. Humidity',
                  air_circulation: '3. Airflow',
                  light_exposure: '4. Light',
                  storage_duration_hours: '5. Duration'
                };
                const isPass = item.status === 'compliant' || item.status === 'ok';
                const isWarn = item.status === 'warning';
                return (
                  <div key={key} className={`bg-white border-2 rounded-2xl p-3 text-xs shadow-2xs relative overflow-hidden ${
                    isPass ? 'border-emerald-200' : isWarn ? 'border-amber-200' : 'border-rose-200'
                  }`}>
                    <div className={`h-1 w-full absolute top-0 left-0 ${
                      isPass ? 'bg-emerald-500' : isWarn ? 'bg-amber-500' : 'bg-rose-500'
                    }`} />
                    <div className="text-[10px] text-slate-400 font-normal mb-0.5">
                      {labelMap[key] || key}
                    </div>
                    <div className="font-bold text-slate-900 text-sm">
                      {item.value} {item.unit || ''}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate" title={`Target: ${item.range}`}>
                      Target: {item.range}
                    </div>
                    <div className="mt-2">
                      <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        isPass
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isWarn
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {isPass ? 'Pass ✓' : isWarn ? 'Near Limit ⚠️' : 'Fail ✕'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recommendations Section */}
            <div className="pt-3 border-t border-slate-200">
              {validationResult.overall_compliance_status === 'Compliant' ? (
                <div className="p-3.5 bg-emerald-50 border-2 border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-black text-emerald-950 block text-xs uppercase tracking-wide">
                      Optimal Storage Verified
                    </span>
                    <span className="font-semibold">All 5 storage parameters meet recommended safety limits. Continue current storage settings.</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <SlidersHorizontal className="w-4 h-4 text-slate-700" />
                      <span className="text-xs font-bold text-slate-900">
                        Recommended Actions for You:
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 border border-slate-300">
                      {validationResult.recommendations?.length || 0} adjustment{(validationResult.recommendations?.length || 0) > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {(validationResult.recommendations || []).map((rec, i) => {
                      const lowerRec = rec.toLowerCase();
                      let paramType = 'General';
                      let Icon = ArrowRight;
                      let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';

                      if (lowerRec.includes('temperature') || lowerRec.includes('temp')) {
                        paramType = 'Temperature';
                        Icon = Thermometer;
                        badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';
                      } else if (lowerRec.includes('humidity')) {
                        paramType = 'Humidity';
                        Icon = Droplets;
                        badgeStyle = 'bg-sky-50 text-sky-700 border-sky-200';
                      } else if (lowerRec.includes('air') || lowerRec.includes('circulation') || lowerRec.includes('ventilation')) {
                        paramType = 'Airflow';
                        Icon = Wind;
                        badgeStyle = 'bg-teal-50 text-teal-700 border-teal-200';
                      } else if (lowerRec.includes('light') || lowerRec.includes('dark')) {
                        paramType = 'Light';
                        Icon = Sun;
                        badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
                      } else if (lowerRec.includes('duration') || lowerRec.includes('consumption') || lowerRec.includes('dispatch') || lowerRec.includes('stock')) {
                        paramType = 'Stock Action';
                        Icon = Clock;
                        badgeStyle = 'bg-purple-50 text-purple-700 border-purple-200';
                      }

                      return (
                        <div
                          key={i}
                          className="p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-2xs flex items-center justify-between gap-3 hover:border-slate-300 transition"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                              <Icon className="w-4 h-4 text-slate-700" />
                            </div>
                            <span className="text-xs font-normal text-slate-700 leading-snug">
                              {rec}
                            </span>
                          </div>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-lg border shrink-0 ${badgeStyle}`}>
                            {paramType}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ADD NEW STORAGE AREA
          ───────────────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border-2 border-[#FFC700]/70 space-y-4 relative overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-[#0047AB] via-[#FFC700] to-emerald-500 absolute top-0 left-0" />

            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-black">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Add Storage Area</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Register a new room for environmental tracking</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddArea} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-600 block mb-1">Area / Room Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Produce Cold Room B, Kitchen Fridge"
                  value={newArea.zone_name}
                  onChange={e => setNewArea(p => ({ ...p, zone_name: e.target.value }))}
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 bg-slate-50/70 font-semibold text-slate-900 focus:outline-none focus:border-[#0047AB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-medium text-slate-600 block mb-1">Primary Category</label>
                  <select
                    value={newArea.category}
                    onChange={e => setNewArea(p => ({ ...p, category: e.target.value }))}
                    className="w-full border-2 border-slate-200 rounded-xl px-2.5 py-2 bg-slate-50/70 font-bold text-slate-900 focus:outline-none focus:border-[#0047AB]"
                  >
                    {FOOD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="font-medium text-slate-600 block mb-1">Temperature (°C)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newArea.design_temp_c}
                    onChange={e => setNewArea(p => ({ ...p, design_temp_c: e.target.value }))}
                    className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 bg-slate-50/70 font-bold text-slate-900 focus:outline-none focus:border-[#0047AB]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-medium text-slate-600 block mb-1">Humidity (%)</label>
                  <input
                    type="number"
                    step="1"
                    min="10"
                    max="99"
                    value={newArea.design_humidity_pct}
                    onChange={e => setNewArea(p => ({ ...p, design_humidity_pct: e.target.value }))}
                    className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 bg-slate-50/70 font-bold text-slate-900 focus:outline-none focus:border-[#0047AB]"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-600 block mb-1">Storage Duration (hrs)</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={newArea.current_duration_hours}
                    onChange={e => setNewArea(p => ({ ...p, current_duration_hours: e.target.value }))}
                    className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 bg-slate-50/70 font-bold text-slate-900 focus:outline-none focus:border-[#0047AB]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-medium text-slate-600 block mb-1">Air Circulation</label>
                  <select
                    value={newArea.design_air}
                    onChange={e => setNewArea(p => ({ ...p, design_air: e.target.value }))}
                    className="w-full border-2 border-slate-200 rounded-xl px-2.5 py-2 bg-slate-50/70 font-bold text-slate-900 focus:outline-none focus:border-[#0047AB]"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="None / Stagnant">None</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-slate-600 block mb-1">Light Exposure</label>
                  <select
                    value={newArea.design_light}
                    onChange={e => setNewArea(p => ({ ...p, design_light: e.target.value }))}
                    className="w-full border-2 border-slate-200 rounded-xl px-2.5 py-2 bg-slate-50/70 font-bold text-slate-900 focus:outline-none focus:border-[#0047AB]"
                  >
                    <option value="Dark">Dark</option>
                    <option value="Indirect Light">Indirect Light</option>
                    <option value="Fluorescent">Fluorescent</option>
                    <option value="Direct Sunlight">Direct Sunlight</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingArea}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl font-semibold cursor-pointer shadow-sm shadow-emerald-500/20 border-b-2 border-emerald-400 transition active:scale-95 disabled:opacity-50"
                >
                  {savingArea ? 'Saving Area...' : 'Save Area'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: CONFIRM REMOVE STORAGE AREA
          ───────────────────────────────────────────────────────────── */}
      {areaToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-sm">Remove Storage Area?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Are you sure you want to remove <strong className="text-slate-800">"{areaToDelete}"</strong>? It will no longer be monitored.
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setAreaToDelete(null)}
                disabled={deletingArea}
                className="flex-1 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteArea}
                disabled={deletingArea}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-sm"
              >
                {deletingArea ? 'Removing...' : 'Remove Area'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
