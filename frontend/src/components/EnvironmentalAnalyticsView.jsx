import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Thermometer, Droplets, Wind, Sun, Clock, CheckCircle2, AlertTriangle,
  RefreshCw, ShieldCheck, Activity, BarChart3, TrendingUp, TrendingDown,
  Layers, MapPin, Zap, ArrowUpRight, ArrowDownRight, Compass, Filter
} from 'lucide-react';

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

export const EnvironmentalAnalyticsView = () => {
  const { token, API_BASE_URL } = useAuth();
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedZoneName, setSelectedZoneName] = useState('');
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [timeRangeHours, setTimeRangeHours] = useState(24);
  const [activeMetric, setActiveMetric] = useState('both'); // 'temp', 'humidity', 'both'

  // Fetch telemetry zones from storage engine
  const fetchZones = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/storage/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.zones || [];
        setZones(list);
        if (list.length > 0 && !selectedZoneName) {
          setSelectedZoneName(list[0].zone_name);
        }
      }
    } catch (err) {
      console.error('Failed to load zones for analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [token, API_BASE_URL, selectedZoneName]);

  // Fetch historical environmental data for chosen zone
  const fetchHistory = useCallback(async (zoneName, hours) => {
    if (!zoneName) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/storage/rooms/${encodeURIComponent(zoneName)}/history?hours=${hours}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryData(data.history || []);
      }
    } catch (err) {
      console.error('Failed to load zone history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [token, API_BASE_URL]);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  useEffect(() => {
    if (selectedZoneName) {
      fetchHistory(selectedZoneName, timeRangeHours);
    }
  }, [selectedZoneName, timeRangeHours, fetchHistory]);

  const selectedZone = zones.find(z => z.zone_name === selectedZoneName) || zones[0];
  const primaryCat = (selectedZone?.categories || [])[0] || 'Fruits';
  const meta = CATEGORY_META[primaryCat] || CATEGORY_META['Fruits'];

  // Global warehouse analytics computations
  const totalZones = zones.length;
  const compliantZones = zones.filter(z => z.compliance?.status === 'Compliant').length;
  const complianceRate = totalZones > 0 ? Math.round((compliantZones / totalZones) * 100) : 100;
  
  const temps = zones.map(z => z.sensor_data?.temperature_c).filter(t => typeof t === 'number');
  const humidities = zones.map(z => z.sensor_data?.humidity_pct).filter(h => typeof h === 'number');

  const avgTemp = temps.length > 0 ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : '4.0';
  const minTemp = temps.length > 0 ? Math.min(...temps).toFixed(1) : '0.0';
  const maxTemp = temps.length > 0 ? Math.max(...temps).toFixed(1) : '10.0';

  const avgHum = humidities.length > 0 ? Math.round(humidities.reduce((a, b) => a + b, 0) / humidities.length) : 85;
  const minHum = humidities.length > 0 ? Math.round(Math.min(...humidities)) : 60;
  const maxHum = humidities.length > 0 ? Math.round(Math.max(...humidities)) : 95;

  // Selected Zone History Analytics
  const histTemps = historyData.map(h => h.temperature_c);
  const histHums = historyData.map(h => h.humidity_pct);

  const histMinT = histTemps.length > 0 ? Math.min(...histTemps) : 0;
  const histMaxT = histTemps.length > 0 ? Math.max(...histTemps) : 10;
  const histAvgT = histTemps.length > 0 ? (histTemps.reduce((a, b) => a + b, 0) / histTemps.length).toFixed(1) : 4.0;

  const histMinH = histHums.length > 0 ? Math.min(...histHums) : 40;
  const histMaxH = histHums.length > 0 ? Math.max(...histHums) : 95;
  const histAvgH = histHums.length > 0 ? Math.round(histHums.reduce((a, b) => a + b, 0) / histHums.length) : 85;

  // Chart SVG bounds & coordinates
  const svgWidth = 800;
  const svgHeight = 220;
  const paddingX = 45;
  const paddingY = 25;

  const tRange = Math.max(0.1, histMaxT - histMinT);
  const hRange = Math.max(0.1, histMaxH - histMinH);

  const pointsCount = historyData.length;
  const getX = (index) => paddingX + (index / Math.max(1, pointsCount - 1)) * (svgWidth - 2 * paddingX);
  const getYTemp = (val) => svgHeight - paddingY - ((val - histMinT) / tRange) * (svgHeight - 2 * paddingY);
  const getYHum = (val) => svgHeight - paddingY - ((val - histMinH) / hRange) * (svgHeight - 2 * paddingY);

  const tempPath = historyData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getYTemp(d.temperature_c).toFixed(1)}`).join(' ');
  const humPath = historyData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getYHum(d.humidity_pct).toFixed(1)}`).join(' ');

  const tempArea = historyData.length > 0
    ? `${tempPath} L ${getX(pointsCount - 1).toFixed(1)} ${svgHeight - paddingY} L ${getX(0).toFixed(1)} ${svgHeight - paddingY} Z`
    : '';

  const humArea = historyData.length > 0
    ? `${humPath} L ${getX(pointsCount - 1).toFixed(1)} ${svgHeight - paddingY} L ${getX(0).toFixed(1)} ${svgHeight - paddingY} Z`
    : '';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ─── 1. HEADER BANNER: Clean, Attractive Signature Navy ─── */}
      <div className="bg-gradient-to-r from-[#001f5e] via-[#003882] to-[#0047AB] rounded-2xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden border border-blue-900/40">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0 border border-white/20">
              <Activity className="w-5 h-5 text-[#FFC700]" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Environmental Analytics <span className="text-[#FFC700]">& Tracking</span></span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchZones(); if (selectedZoneName) fetchHistory(selectedZoneName, timeRangeHours); }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition cursor-pointer border border-white/20"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#FFC700]" />
              <span>Refresh Analytics</span>
            </button>
          </div>
        </div>
      </div>


      {/* ─── 3. HISTORICAL TIME-SERIES ENVIRONMENTAL CHART ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        {/* Chart Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0047AB] to-blue-500 text-white flex items-center justify-center shadow-xs">
              <BarChart3 className="w-5 h-5 text-[#FFC700]" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Environmental Telemetry History</h3>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Storage Area Picker */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold">
              <span className="text-slate-400">Area:</span>
              <select
                value={selectedZoneName}
                onChange={(e) => setSelectedZoneName(e.target.value)}
                className="bg-transparent font-black text-[#0047AB] outline-none cursor-pointer"
              >
                {zones.map(z => (
                  <option key={z.zone_name} value={z.zone_name}>{z.zone_name}</option>
                ))}
              </select>
            </div>

            {/* Timeframe Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {[
                { hours: 12, label: '12h' },
                { hours: 24, label: '24h' },
                { hours: 48, label: '48h' },
                { hours: 72, label: '72h' }
              ].map(t => (
                <button
                  key={t.hours}
                  onClick={() => setTimeRangeHours(t.hours)}
                  className={`px-2.5 py-1 text-xs font-black rounded-lg transition cursor-pointer ${
                    timeRangeHours === t.hours
                      ? 'bg-white text-[#0047AB] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Metric Mode Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {[
                { id: 'both', label: 'All' },
                { id: 'temp', label: 'Temp' },
                { id: 'humidity', label: 'Humidity' }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setActiveMetric(m.id)}
                  className={`px-2.5 py-1 text-xs font-black rounded-lg transition cursor-pointer ${
                    activeMetric === m.id
                      ? 'bg-[#0047AB] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SVG Interactive Chart Canvas */}
        <div className="relative w-full overflow-x-auto">
          {historyLoading ? (
            <div className="py-24 text-center text-slate-400 text-xs font-bold">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#0047AB] mb-2" />
              Loading {selectedZoneName} historical tracking telemetry...
            </div>
          ) : historyData.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs font-semibold">
              No telemetry recordings available for this zone.
            </div>
          ) : (
            <div className="min-w-[650px]">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-56 select-none overflow-visible">
                <defs>
                  {/* Temperature Gradient */}
                  <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                  </linearGradient>
                  {/* Humidity Gradient */}
                  <linearGradient id="humGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Guide Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                  const y = paddingY + pct * (svgHeight - 2 * paddingY);
                  return (
                    <g key={idx}>
                      <line
                        x1={paddingX}
                        y1={y}
                        x2={svgWidth - paddingX}
                        y2={y}
                        stroke="#e2e8f0"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                    </g>
                  );
                })}

                {/* Humidity Shaded Area & Line */}
                {(activeMetric === 'both' || activeMetric === 'humidity') && (
                  <>
                    <path d={humArea} fill="url(#humGrad)" />
                    <path
                      d={humPath}
                      fill="none"
                      stroke="#0ea5e9"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                )}

                {/* Temperature Shaded Area & Line */}
                {(activeMetric === 'both' || activeMetric === 'temp') && (
                  <>
                    <path d={tempArea} fill="url(#tempGrad)" />
                    <path
                      d={tempPath}
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                )}

                {/* Data Points */}
                {historyData.map((d, i) => {
                  if (i % Math.ceil(pointsCount / 12) !== 0 && i !== pointsCount - 1) return null;
                  const x = getX(i);
                  const yT = getYTemp(d.temperature_c);
                  const yH = getYHum(d.humidity_pct);

                  return (
                    <g key={i}>
                      {(activeMetric === 'both' || activeMetric === 'temp') && (
                        <circle cx={x} cy={yT} r="4" fill="#f43f5e" stroke="#ffffff" strokeWidth="2" />
                      )}
                      {(activeMetric === 'both' || activeMetric === 'humidity') && (
                        <circle cx={x} cy={yH} r="4" fill="#0ea5e9" stroke="#ffffff" strokeWidth="2" />
                      )}
                      {/* X-Axis Hour Label */}
                      <text
                        x={x}
                        y={svgHeight - 5}
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="10"
                        fontWeight="600"
                      >
                        {d.hour_label}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Chart Legend */}
              <div className="flex items-center justify-center gap-6 mt-3 text-xs font-bold">
                {(activeMetric === 'both' || activeMetric === 'temp') && (
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-rose-500 border border-white shadow-xs" />
                    <span className="text-slate-700">Temperature (°C)</span>
                  </div>
                )}
                {(activeMetric === 'both' || activeMetric === 'humidity') && (
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-sky-500 border border-white shadow-xs" />
                    <span className="text-slate-700">Relative Humidity (% RH)</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── 4. ZONE ENVIRONMENTAL ANALYTICS MATRIX ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-[#0047AB]" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Warehouse Zones Environmental Diagnostics
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500">{zones.length} Zones Tracked</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-black uppercase text-[10.5px]">
              <tr>
                <th className="py-3 px-3.5">Storage Zone</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Live Temp</th>
                <th className="py-3 px-3">Live Humidity</th>
                <th className="py-3 px-3">Airflow</th>
                <th className="py-3 px-3">Light</th>
                <th className="py-3 px-3">Compliance Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {zones.map((zone) => {
                const s = zone.sensor_data || {};
                const c = (zone.categories || [])[0] || 'Fruits';
                const catMeta = CATEGORY_META[c] || CATEGORY_META['Fruits'];
                const isCompliant = zone.compliance?.status === 'Compliant';

                return (
                  <tr 
                    key={zone.zone_name}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      selectedZoneName === zone.zone_name ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <td className="py-3 px-3.5 font-black text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{zone.zone_name}</span>
                        {selectedZoneName === zone.zone_name && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-[#0047AB] text-white">
                            Selected
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${catMeta.bg} ${catMeta.text} ${catMeta.border}`}>
                        <span>{catMeta.icon}</span>
                        <span>{c}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-rose-600">
                      {s.temperature_c ?? 4}°C
                    </td>
                    <td className="py-3 px-3 font-bold text-sky-600">
                      {s.humidity_pct ?? 85}% RH
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700">
                      {s.air_circulation || 'Medium'}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700">
                      {s.light_exposure || 'Dark'}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${
                        isCompliant 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isCompliant ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        {isCompliant ? 'Compliant' : 'Adjustment Needed'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedZoneName(zone.zone_name)}
                        className="px-2.5 py-1 text-xs font-bold text-[#0047AB] hover:text-blue-800 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                      >
                        Inspect Analytics &rarr;
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
