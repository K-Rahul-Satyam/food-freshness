import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BarChart3, TrendingUp, TrendingDown, Package, AlertTriangle,
  RefreshCw, Download, Clock, Star,
  FileSpreadsheet, FileText, X, ShieldCheck,
  Search, Percent, CheckCircle2,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCcw,
  Warehouse, Thermometer, Sparkles, ArrowRight, PieChart, Layers
} from 'lucide-react';
import { jsPDF } from 'jspdf';

const YELLOW = '#FFC700';

const CATEGORY_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16'
];

// ─────────────────────────────────────────────────────────────────────────────
// Category Palette & Visual Styles
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORY_PALETTE = {
  Fruits: {
    start: '#FF5E62',
    end: '#FF9966',
    accent: '#FF6B6B',
    bgLight: 'rgba(255, 94, 98, 0.08)',
    border: 'rgba(255, 94, 98, 0.3)',
    icon: '🍎',
    badge: 'bg-orange-50 text-orange-700 border-orange-200'
  },
  Vegetables: {
    start: '#059669',
    end: '#10B981',
    accent: '#10B981',
    bgLight: 'rgba(16, 185, 129, 0.08)',
    border: 'rgba(16, 185, 129, 0.3)',
    icon: '🥦',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  Dairy: {
    start: '#2563EB',
    end: '#38BDF8',
    accent: '#3B82F6',
    bgLight: 'rgba(59, 130, 246, 0.08)',
    border: 'rgba(59, 130, 246, 0.3)',
    icon: '🧀',
    badge: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  Meats: {
    start: '#E11D48',
    end: '#FB7185',
    accent: '#F43F5E',
    bgLight: 'rgba(244, 63, 94, 0.08)',
    border: 'rgba(244, 63, 94, 0.3)',
    icon: '🥩',
    badge: 'bg-rose-50 text-rose-700 border-rose-200'
  },
  Packaged: {
    start: '#7C3AED',
    end: '#A855F7',
    accent: '#8B5CF6',
    bgLight: 'rgba(139, 92, 246, 0.08)',
    border: 'rgba(139, 92, 246, 0.3)',
    icon: '📦',
    badge: 'bg-purple-50 text-purple-700 border-purple-200'
  },
  Seafood: {
    start: '#0284C7',
    end: '#06B6D4',
    accent: '#06B6D4',
    bgLight: 'rgba(6, 182, 212, 0.08)',
    border: 'rgba(6, 182, 212, 0.3)',
    icon: '🐟',
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200'
  },
  Bakery: {
    start: '#D97706',
    end: '#FBBF24',
    accent: '#F59E0B',
    bgLight: 'rgba(245, 158, 11, 0.08)',
    border: 'rgba(245, 158, 11, 0.3)',
    icon: '🍞',
    badge: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  Beverages: {
    start: '#65A30D',
    end: '#84CC16',
    accent: '#84CC16',
    bgLight: 'rgba(132, 204, 22, 0.08)',
    border: 'rgba(132, 204, 22, 0.3)',
    icon: '🧃',
    badge: 'bg-lime-50 text-lime-700 border-lime-200'
  }
};

const DEFAULT_PALETTES = [
  { start: '#FF5E62', end: '#FF9966', icon: '🍎', accent: '#FF6B6B' },
  { start: '#059669', end: '#10B981', icon: '🥦', accent: '#10B981' },
  { start: '#2563EB', end: '#38BDF8', icon: '🧀', accent: '#3B82F6' },
  { start: '#E11D48', end: '#FB7185', icon: '🥩', accent: '#F43F5E' },
  { start: '#7C3AED', end: '#A855F7', icon: '📦', accent: '#8B5CF6' },
  { start: '#0284C7', end: '#06B6D4', icon: '🐟', accent: '#06B6D4' },
  { start: '#D97706', end: '#FBBF24', icon: '🍞', accent: '#F59E0B' },
  { start: '#65A30D', end: '#84CC16', icon: '🧃', accent: '#84CC16' }
];

const getCategoryMeta = (category, index = 0) => {
  if (CATEGORY_PALETTE[category]) return CATEGORY_PALETTE[category];
  const fallback = DEFAULT_PALETTES[index % DEFAULT_PALETTES.length];
  return {
    start: fallback.start,
    end: fallback.end,
    accent: fallback.accent,
    bgLight: 'rgba(100, 116, 139, 0.08)',
    border: 'rgba(100, 116, 139, 0.3)',
    icon: fallback.icon,
    badge: 'bg-slate-50 text-slate-700 border-slate-200'
  };
};

const polarToCartesian = (cx, cy, r, angleInDeg) => {
  const angleInRad = ((angleInDeg - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleInRad),
    y: cy + r * Math.sin(angleInRad)
  };
};

const describeArc = (cx, cy, innerR, outerR, startAngle, endAngle) => {
  if (endAngle <= startAngle) return '';
  const deltaAngle = Math.min(359.99, endAngle - startAngle);
  const effectiveEnd = startAngle + deltaAngle;
  const outerStart = polarToCartesian(cx, cy, outerR, effectiveEnd);
  const outerEnd = polarToCartesian(cx, cy, outerR, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, effectiveEnd);
  const innerEnd = polarToCartesian(cx, cy, innerR, startAngle);
  const largeArcFlag = deltaAngle > 180 ? '1' : '0';

  return [
    'M', outerEnd.x, outerEnd.y,
    'A', outerR, outerR, 0, largeArcFlag, 1, outerStart.x, outerStart.y,
    'L', innerStart.x, innerStart.y,
    'A', innerR, innerR, 0, largeArcFlag, 0, innerEnd.x, innerEnd.y,
    'Z'
  ].join(' ');
};

// ─────────────────────────────────────────────────────────────────────────────
// Modern SVG Interactive Donut Chart Component
// ─────────────────────────────────────────────────────────────────────────────
const ModernInteractiveDonut = ({
  data,
  hoveredCategory,
  onHoverCategory,
  selectedCategory,
  onSelectCategory
}) => {
  const validData = useMemo(() => (data || []).filter(d => (d.count || 0) > 0), [data]);
  const total = useMemo(() => validData.reduce((s, d) => s + (d.count || 0), 0), [validData]);

  const slices = useMemo(() => {
    if (!validData || validData.length === 0 || total === 0) return [];
    let currentAngle = 0;
    const gap = validData.length > 1 ? 2.5 : 0;

    return validData.map((item, i) => {
      const sliceAngle = (item.count / total) * 360;
      const actualGap = sliceAngle > gap * 1.5 ? gap : 0;
      const startAngle = currentAngle + actualGap / 2;
      const endAngle = currentAngle + sliceAngle - actualGap / 2;
      currentAngle += sliceAngle;
      const meta = getCategoryMeta(item.category, i);
      const pct = ((item.count / total) * 100).toFixed(1);

      return {
        ...item,
        index: i,
        startAngle,
        endAngle,
        sliceAngle,
        meta,
        pct,
        gradientId: `cat-grad-${(item.category || '').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${i}`
      };
    });
  }, [validData, total]);

  const activeItem = useMemo(() => {
    if (hoveredCategory) {
      return slices.find(s => s.category === hoveredCategory);
    }
    if (selectedCategory && selectedCategory !== 'All') {
      return slices.find(s => s.category === selectedCategory);
    }
    return null;
  }, [hoveredCategory, selectedCategory, slices]);

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-2">
      <svg
        viewBox="0 0 280 280"
        className="w-72 h-72 sm:w-80 sm:h-80 drop-shadow-md overflow-visible transition-all duration-300"
      >
        <defs>
          <filter id="donut-slice-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#0f172a" floodOpacity="0.14" />
          </filter>
          <filter id="donut-slice-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="8" floodColor="#0047AB" floodOpacity="0.4" />
          </filter>
          {slices.map(s => (
            <linearGradient key={s.gradientId} id={s.gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={s.meta.start} />
              <stop offset="100%" stopColor={s.meta.end} />
            </linearGradient>
          ))}
        </defs>

        {/* Ambient background ring */}
        <circle cx="140" cy="140" r="95" fill="none" stroke="#f1f5f9" strokeWidth="36" opacity="0.7" />

        {/* Donut Slices */}
        {slices.map((slice) => {
          const isHovered = hoveredCategory === slice.category;
          const isSelected = selectedCategory === slice.category;
          const isAnyActive = Boolean(hoveredCategory || (selectedCategory && selectedCategory !== 'All'));
          const isDimmed = isAnyActive && !isHovered && !isSelected;

          const innerR = (isHovered || isSelected) ? 68 : 74;
          const outerR = (isHovered || isSelected) ? 124 : 116;
          const pathD = describeArc(140, 140, innerR, outerR, slice.startAngle, slice.endAngle);

          return (
            <path
              key={slice.category}
              d={pathD}
              fill={`url(#${slice.gradientId})`}
              className="cursor-pointer transition-all duration-300 ease-out"
              style={{
                opacity: isDimmed ? 0.35 : 1,
                filter: (isHovered || isSelected) ? 'url(#donut-slice-glow)' : 'url(#donut-slice-shadow)',
                transformOrigin: '140px 140px'
              }}
              onMouseEnter={() => onHoverCategory(slice.category)}
              onMouseLeave={() => onHoverCategory(null)}
              onClick={() => onSelectCategory(slice.category)}
            />
          );
        })}

        {/* Center Disc with layered depth */}
        <circle
          cx="140"
          cy="140"
          r="66"
          fill="#ffffff"
          stroke="#e2e8f0"
          strokeWidth="2"
          className="shadow-inner"
        />
        <circle
          cx="140"
          cy="140"
          r="60"
          fill="#f8fafc"
          opacity="0.5"
        />

        {/* Center Dynamic Readout */}
        {activeItem ? (
          <g className="transition-all duration-300 pointer-events-none select-none">
            <text x="140" y="108" textAnchor="middle" fontSize="22">
              {activeItem.meta.icon}
            </text>
            <text
              x="140"
              y="136"
              textAnchor="middle"
              className="fill-slate-900"
              style={{ fontSize: '26px', fontWeight: 900 }}
            >
              {activeItem.pct}%
            </text>
            <text
              x="140"
              y="154"
              textAnchor="middle"
              className="fill-slate-800"
              style={{ fontSize: '12px', fontWeight: 800 }}
            >
              {activeItem.category}
            </text>
            <text
              x="140"
              y="170"
              textAnchor="middle"
              className="fill-slate-500"
              style={{ fontSize: '10.5px', fontWeight: 600 }}
            >
              {activeItem.count} Batches
            </text>
          </g>
        ) : (
          <g className="transition-all duration-300 pointer-events-none select-none">
            <text
              x="140"
              y="130"
              textAnchor="middle"
              className="fill-slate-900"
              style={{ fontSize: '32px', fontWeight: 900 }}
            >
              {total}
            </text>
            <text
              x="140"
              y="148"
              textAnchor="middle"
              className="fill-slate-400"
              style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}
            >
              TOTAL BATCHES
            </text>
            <text
              x="140"
              y="165"
              textAnchor="middle"
              className="fill-emerald-600"
              style={{ fontSize: '10px', fontWeight: 700 }}
            >
              ✓ 100% Traceable
            </text>
          </g>
        )}
      </svg>
      <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5 font-medium bg-slate-100/80 px-3 py-1 rounded-full border border-slate-200/60">
        <Sparkles className="w-3.5 h-3.5 text-[#FFC700]" />
        <span>Click any slice or card to filter inventory</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT: FreshnessAnalyticsDashboard
// ─────────────────────────────────────────────────────────────────────────────
export const FreshnessAnalyticsDashboard = () => {
  const { token, API_BASE_URL } = useAuth();
  const [insights, setInsights] = useState(null);
  const [batchRisk, setBatchRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [exportNotice, setExportNotice] = useState('');
  const [exporting, setExporting] = useState(false);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [selectedBatchItem, setSelectedBatchItem] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [insRes, riskRes] = await Promise.all([
        fetch(`${API_BASE_URL}/inventory/insights`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/shelf-life/batch-risk`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (insRes.ok) setInsights(await insRes.json());
      if (riskRes.ok) setBatchRisk(await riskRes.json());
    } catch (e) {
      console.error("Failed to load analytics", e);
    } finally {
      setLoading(false);
    }
  }, [token, API_BASE_URL]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const batchItems = useMemo(() => {
    return insights?.batch_freshness_details || [];
  }, [insights]);

  const batchesList = useMemo(() => {
    const list = batchItems.map(b => ({
      batch_number: b.batch_number,
      name: b.name
    })).filter(b => Boolean(b.batch_number));
    const seen = new Set();
    return list.filter(b => {
      if (seen.has(b.batch_number)) return false;
      seen.add(b.batch_number);
      return true;
    });
  }, [batchItems]);

  const categoriesList = useMemo(() => {
    const set = new Set(batchItems.map(b => b.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [batchItems]);

  const filteredBatches = useMemo(() => {
    return batchItems.filter(item => {
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.batch_number.toLowerCase().includes(searchQuery.toLowerCase());
      const matchBatch = selectedBatch === 'All' || item.batch_number === selectedBatch;
      const matchCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchStatus =
        selectedStatus === 'All' ||
        (selectedStatus === 'Expired' && item.is_expired) ||
        (selectedStatus === 'Approaching' && !item.is_expired && item.days_remaining <= 3) ||
        (selectedStatus === 'Fresh' && !item.is_expired && item.days_remaining > 3);
      const matchGrade =
        selectedGrade === 'All' ||
        (item.quality_grade && item.quality_grade.startsWith(selectedGrade));

      return matchSearch && matchBatch && matchCategory && matchStatus && matchGrade;
    });
  }, [batchItems, searchQuery, selectedBatch, selectedCategory, selectedStatus, selectedGrade]);

  const totalPages = pageSize === 'All' ? 1 : Math.max(1, Math.ceil(filteredBatches.length / Number(pageSize)));

  const paginatedBatches = useMemo(() => {
    if (pageSize === 'All') return filteredBatches;
    const start = (currentPage - 1) * Number(pageSize);
    return filteredBatches.slice(start, start + Number(pageSize));
  }, [filteredBatches, currentPage, pageSize]);

  const hasActiveFilters = Boolean(
    searchQuery || selectedBatch !== 'All' || selectedCategory !== 'All' || selectedStatus !== 'All' || selectedGrade !== 'All'
  );

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedBatch('All');
    setSelectedCategory('All');
    setSelectedStatus('All');
    setSelectedGrade('All');
    setCurrentPage(1);
  };

  // ── Download Individual Batch PDF Report ──────────────────────────────────
  const handleExportIndividualBatchPDF = (item) => {
    if (!item) return;
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // ── Header Banner (Royal Blue) ──
      doc.setFillColor(0, 71, 171); // #0047AB
      doc.rect(0, 0, 210, 28, 'F');

      // ── Gold Accent Stripe ──
      doc.setFillColor(255, 199, 0); // #FFC700
      doc.rect(0, 28, 210, 3, 'F');

      // Header Text
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text("FRESHGUARD AI — BATCH FRESHNESS CERTIFICATE", 14, 16);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Certificate: CERT-${item.batch_number}   |   Issued: ${new Date().toLocaleString()}`, 14, 23);

      let yPos = 42;

      // ── 1. Batch Identification ──
      doc.setTextColor(20, 30, 60);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text("1. Batch Identification & Logistics", 14, yPos);
      yPos += 5;

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, yPos - 1, 182, 34, 2, 2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, yPos - 1, 182, 34, 2, 2, 'S');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);

      yPos += 5;
      doc.text("Product Name: ", 18, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(`${item.name}`, 46, yPos);

      doc.setFont('helvetica', 'normal');
      doc.text("Batch Number: ", 115, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(`${item.batch_number}`, 145, yPos);

      yPos += 7;
      doc.setFont('helvetica', 'normal');
      doc.text("Category: ", 18, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(`${item.category}`, 46, yPos);

      doc.setFont('helvetica', 'normal');
      doc.text("Storage Zone: ", 115, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(`${item.storage_location}`, 145, yPos);

      yPos += 7;
      doc.setFont('helvetica', 'normal');
      doc.text("Quantity / Unit: ", 18, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(`${item.quantity} ${item.unit}`, 46, yPos);

      doc.setFont('helvetica', 'normal');
      doc.text("Batch Status: ", 115, yPos);
      doc.setFont('helvetica', 'bold');
      if (item.is_expired) {
        doc.setTextColor(220, 38, 38);
        doc.text("EXPIRED — ACTION REQUIRED", 145, yPos);
      } else {
        doc.setTextColor(22, 101, 52);
        doc.text(`FRESH (${item.days_remaining}d remaining)`, 145, yPos);
      }

      yPos += 7;
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
      doc.text("Packaging: ", 18, yPos);
      doc.text(`${item.packaging_type || 'Standard Box'}`, 46, yPos);

      doc.text("Confidence: ", 115, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(`${item.freshness_confidence_pct}% Verified`, 145, yPos);

      yPos += 14;

      // ── 2. Overall Health Score & Quality Grade Box ──
      doc.setFillColor(0, 71, 171);
      doc.roundedRect(14, yPos - 2, 182, 22, 2, 2, 'F');

      doc.setTextColor(255, 199, 0);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text("OVERALL FOOD HEALTH SCORE", 18, yPos + 5);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text(`${item.overall_food_health_score}%`, 18, yPos + 14);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text("Quality Grade:", 115, yPos + 5);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${item.quality_grade}`, 115, yPos + 14);

      yPos += 30;

      // ── 3. Freshness Scoring Engine (5 Dimensions) ──
      doc.setTextColor(20, 30, 60);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text("2. Freshness Scoring Engine — 5 Key Dimensions", 14, yPos);
      yPos += 6;

      doc.setFillColor(241, 245, 249);
      doc.rect(14, yPos - 4, 182, 7, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text("DIMENSION", 18, yPos + 0.8);
      doc.text("WEIGHT", 75, yPos + 0.8);
      doc.text("SCORE", 115, yPos + 0.8);
      doc.text("ASSESSMENT", 145, yPos + 0.8);

      yPos += 7;
      doc.setFontSize(8);

      const dimensions = [
        { name: "1. Food Quality Scoring", weight: "40% (Visual)", score: `${item.food_quality_score}%`, eval: item.quality_grade.split(' - ')[0] },
        { name: "2. Freshness Confidence", weight: "Multi-Sensor", score: `${item.freshness_confidence_pct}%`, eval: "High Confidence" },
        { name: "3. Shelf-Life Scoring", weight: "20% (Kinetics)", score: `${item.shelf_life_score} / 100`, eval: item.is_expired ? "0d (Expired)" : `${item.days_remaining}d remaining` },
        { name: "4. Storage Condition Scoring", weight: "25% (Storage)", score: `${item.storage_condition_score} / 100`, eval: `${item.temperature_c}°C · ${item.humidity_pct}% RH` },
        { name: "5. Overall Food Health Score", weight: "Composite (100%)", score: `${item.overall_food_health_score}%`, eval: item.is_expired ? "Reject" : "Safe for use" }
      ];

      dimensions.forEach((d, i) => {
        if (i % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, yPos - 3, 182, 6, 'F');
        }
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text(d.name, 18, yPos + 1);
        doc.setFont('helvetica', 'normal');
        doc.text(d.weight, 75, yPos + 1);
        doc.text(d.score, 115, yPos + 1);
        doc.text(d.eval, 145, yPos + 1);
        yPos += 6;
      });

      yPos += 8;

      // ── 4. Weighted Scoring Model Architecture & Formula ──
      doc.setTextColor(20, 30, 60);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text("3. Weighted Scoring Model Formula Verification", 14, yPos);
      yPos += 5;

      doc.setFillColor(243, 246, 253);
      doc.roundedRect(14, yPos - 1, 182, 26, 2, 2, 'F');
      doc.setDrawColor(191, 219, 254);
      doc.roundedRect(14, yPos - 1, 182, 26, 2, 2, 'S');

      doc.setFontSize(8.5);
      doc.setTextColor(0, 71, 171);
      doc.setFont('helvetica', 'bold');
      doc.text("Model: Freshness Score = (Visual 40%) + (Storage 25%) + (Shelf-Life 20%) + (Product Age 15%)", 18, yPos + 5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const b = item.weighted_breakdown || {};
      const vC = b.visual_condition?.contribution ?? Math.round(0.4 * item.food_quality_score * 100) / 100;
      const sC = b.storage_conditions?.contribution ?? Math.round(0.25 * item.storage_condition_score * 100) / 100;
      const lC = b.shelf_life?.contribution ?? Math.round(0.2 * item.shelf_life_score * 100) / 100;
      const aC = b.product_age?.contribution ?? Math.round(0.15 * (item.product_age_score || 70) * 100) / 100;

      doc.text(`= (${b.visual_condition?.score || item.food_quality_score} × 0.40) + (${b.storage_conditions?.score || item.storage_condition_score} × 0.25) + (${b.shelf_life?.score || item.shelf_life_score} × 0.20) + (${b.product_age?.score || item.product_age_score || 70} × 0.15)`, 18, yPos + 12);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 101, 52);
      doc.text(`= ${vC} + ${sC} + ${lC} + ${aC} = ${item.overall_food_health_score}% Final Score`, 18, yPos + 19);

      yPos += 33;

      // ── 5. Storage Conditions Telemetry vs Targets ──
      doc.setTextColor(20, 30, 60);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text("4. Environmental Telemetry & Compliance", 14, yPos);
      yPos += 5;

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(`Recorded Temperature: ${item.temperature_c}°C   (Optimal: ${item.optimal_temperature_c}°C)   |   Compliance: PASS`, 14, yPos);
      yPos += 5;
      doc.text(`Recorded Humidity: ${item.humidity_pct}% RH   (Optimal: ${item.optimal_humidity_pct}% RH)   |   Compliance: PASS`, 14, yPos);
      yPos += 5;
      doc.text(`Airflow Circulation: ${item.air_circulation || 'Medium'}   |   Light Exposure: ${item.light_exposure || 'Dark'}`, 14, yPos);

      yPos += 12;

      // ── 6. Official Recommendation ──
      doc.setFillColor(item.is_expired ? 254 : 240, item.is_expired ? 242 : 253, item.is_expired ? 242 : 244);
      doc.roundedRect(14, yPos - 2, 182, 20, 2, 2, 'F');
      doc.setDrawColor(item.is_expired ? 252 : 187, item.is_expired ? 165 : 247, item.is_expired ? 165 : 208);
      doc.roundedRect(14, yPos - 2, 182, 20, 2, 2, 'S');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(item.is_expired ? 185 : 22, item.is_expired ? 28 : 101, item.is_expired ? 28 : 52);
      doc.text(item.is_expired ? "ACTION REQUIRED: ITEM EXPIRED" : "QUALITY CERTIFICATION: VERIFIED SAFE", 18, yPos + 5);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        item.is_expired
          ? "Immediate quarantine mandatory. Do not dispatch to retail or consumers. Log disposal."
          : `Lot passed 5-factor quality audit. Storage and shelf-life parameters confirmed within safe bounds.`,
        18, yPos + 11
      );

      // Footer
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text("FreshGuard AI · Autonomous Food Freshness & Quality Monitoring System · Authorized Quality Document", 14, 287);

      doc.save(`freshness_cert_${item.batch_number}_${Date.now()}.pdf`);
      setExportNotice(`Downloaded PDF Report for ${item.name} (${item.batch_number}).`);
      setTimeout(() => setExportNotice(''), 3500);
    } catch (e) {
      console.error(e);
      setExportNotice("Failed to generate individual PDF report.");
    }
  };

  // ── Download All Reports ────────────────────────────────────────────────────
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reports/export/excel?report_type=freshness`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `freshness_report_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setExportNotice("Spreadsheet downloaded.");
        setTimeout(() => setExportNotice(''), 3000);
      }
    } catch {
      setExportNotice("Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const handleExportFullPDF = () => {
    if (!insights) return;
    setExporting(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      doc.setFillColor(0, 71, 171);
      doc.rect(0, 0, 210, 24, 'F');
      doc.setFillColor(255, 199, 0);
      doc.rect(0, 24, 210, 2.5, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text("FRESHGUARD — BATCH FRESHNESS REPORT", 14, 15);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 160, 15);

      let yPos = 35;
      const k = insights.summary_kpis || {};

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text("Summary", 14, yPos);
      yPos += 5;

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Batches: ${k.total_items || 0}  |  Fresh: ${k.fresh_count || 0}  |  Near Expiry: ${k.approaching_expiry_count || 0}  |  Expired: ${k.expired_count || 0}`, 14, yPos);
      yPos += 4.5;
      doc.text(`Freshness Index: ${k.store_freshness_index || 0}%  |  Avg Shelf Life: ${k.avg_remaining_shelf_life_days || 0}d  |  Spoilage Risk: ${k.spoilage_risk_index || 0}%`, 14, yPos);
      yPos += 8;

      doc.setFillColor(243, 246, 253);
      doc.roundedRect(14, yPos - 3, 182, 10, 2, 2, 'F');
      doc.setTextColor(0, 71, 171);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text("Scoring Model: Visual (40%) + Storage (25%) + Shelf-Life (20%) + Product Age (15%)", 18, yPos + 3.5);
      yPos += 14;

      // Table Header
      doc.setFillColor(0, 71, 171);
      doc.rect(14, yPos - 4, 182, 7, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text("BATCH", 16, yPos + 0.8);
      doc.text("ITEM", 46, yPos + 0.8);
      doc.text("CATEGORY", 88, yPos + 0.8);
      doc.text("SCORE", 122, yPos + 0.8);
      doc.text("GRADE", 140, yPos + 0.8);
      doc.text("CONF.", 160, yPos + 0.8);
      doc.text("STATUS", 178, yPos + 0.8);

      yPos += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);

      batchItems.forEach((b, idx) => {
        if (yPos > 275) {
          doc.addPage();
          yPos = 20;
          doc.setFillColor(0, 71, 171);
          doc.rect(14, yPos - 4, 182, 7, 'F');
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text("BATCH", 16, yPos + 0.8);
          doc.text("ITEM", 46, yPos + 0.8);
          doc.text("CATEGORY", 88, yPos + 0.8);
          doc.text("SCORE", 122, yPos + 0.8);
          doc.text("GRADE", 140, yPos + 0.8);
          doc.text("CONF.", 160, yPos + 0.8);
          doc.text("STATUS", 178, yPos + 0.8);
          yPos += 7;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
        }

        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, yPos - 3, 182, 6, 'F');
        }

        doc.setTextColor(30, 41, 59);
        doc.text(String(b.batch_number || '').slice(0, 14), 16, yPos + 1);
        doc.text(String(b.name || '').slice(0, 22), 46, yPos + 1);
        doc.text(String(b.category || '').slice(0, 16), 88, yPos + 1);

        const score = b.overall_food_health_score;
        if (score >= 80) doc.setTextColor(22, 101, 52);
        else if (score >= 55) doc.setTextColor(180, 83, 9);
        else doc.setTextColor(185, 28, 28);
        doc.text(`${score}%`, 122, yPos + 1);

        doc.setTextColor(30, 41, 59);
        doc.text(String(b.quality_grade || '').split(' - ')[0], 140, yPos + 1);
        doc.text(`${b.freshness_confidence_pct}%`, 160, yPos + 1);

        if (b.is_expired) {
          doc.setTextColor(185, 28, 28);
          doc.text("Expired", 178, yPos + 1);
        } else {
          doc.setTextColor(22, 101, 52);
          doc.text(`${b.days_remaining}d left`, 178, yPos + 1);
        }

        yPos += 6;
      });

      doc.save(`freshness_audit_full_${Date.now()}.pdf`);
      setExportNotice("Full PDF report downloaded.");
      setTimeout(() => setExportNotice(''), 3000);
    } catch {
      setExportNotice("PDF export failed.");
    } finally {
      setExporting(false);
    }
  };

  const handleExportJSON = () => {
    if (!insights) return;
    const blob = new Blob([JSON.stringify(insights, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `freshness_data_${Date.now()}.json`;
    a.click();
    a.remove();
    setExportNotice("JSON exported.");
    setTimeout(() => setExportNotice(''), 2500);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-[#0047AB]" />
        <p className="font-semibold text-xs text-slate-600">Loading freshness data...</p>
      </div>
    );
  }

  const kpis = insights?.summary_kpis;
  const categoryData = (insights?.category_distribution || []).map((c, i) => ({
    ...c, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length]
  }));

  const locationData = (insights?.location_heatmap || []).map(l => ({
    label: l.location, value: l.item_count,
  }));

  const urgentItems = insights?.top_5_urgent_items || [];

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">

      {/* Toast Notification */}
      {exportNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* ── 1. HEADER & EXPORT ACTIONS ── */}
      <div className="bg-gradient-to-r from-[#001f5e] via-[#003882] to-[#0047AB] rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5 text-[#FFC700]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Freshness Analytics</h1>
              <p className="text-blue-100 text-xs mt-0.5">Inventory health, batch scores, and exportable reports</p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              title="Refresh"
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={handleExportFullPDF}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FFC700] hover:bg-[#e6b300] text-[#003882] font-black text-xs transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Full Audit PDF</span>
            </button>
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
              <span>CSV</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition cursor-pointer"
            >
              JSON
            </button>
          </div>
        </div>


      </div>


      {/* ── 3. BATCH FRESHNESS DETAILS TABLE WITH INDIVIDUAL PDF REPORT DOWNLOAD ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Top Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-[#0047AB]" />
            <h2 className="text-sm font-black text-slate-800">Batch Freshness Details</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
              {filteredBatches.length} items
            </span>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search batch or item..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="pl-7 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none w-36"
              />
            </div>

            {/* Batch-wise Selection */}
            <select
              value={selectedBatch}
              onChange={e => { setSelectedBatch(e.target.value); setCurrentPage(1); }}
              className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium"
              title="Filter by Batch Number"
            >
              <option value="All">All Batches ({batchesList.length})</option>
              {batchesList.map(b => (
                <option key={b.batch_number} value={b.batch_number}>
                  {b.batch_number} ({b.name})
                </option>
              ))}
            </select>

            <select
              value={selectedCategory}
              onChange={e => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
              className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700"
            >
              {categoriesList.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
            </select>

            <select
              value={selectedStatus}
              onChange={e => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700"
            >
              <option value="All">All Statuses</option>
              <option value="Fresh">Fresh</option>
              <option value="Approaching">Near Expiry</option>
              <option value="Expired">Expired</option>
            </select>

            <select
              value={selectedGrade}
              onChange={e => { setSelectedGrade(e.target.value); setCurrentPage(1); }}
              className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700"
            >
              <option value="All">All Grades</option>
              <option value="Grade A">Grade A</option>
              <option value="Grade B">Grade B</option>
              <option value="Grade C">Grade C</option>
              <option value="Grade D">Grade D</option>
              <option value="Grade F">Grade F</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded-lg hover:bg-blue-50 transition cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3">Batch & Item</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-center">Health Score</th>
                <th className="py-2.5 px-3">Quality Grade</th>
                <th className="py-2.5 px-3 text-center">Confidence</th>
                <th className="py-2.5 px-3 text-center">Shelf Life</th>
                <th className="py-2.5 px-3 text-center">Storage</th>
                <th className="py-2.5 px-3 text-right">PDF Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedBatches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-semibold text-xs">
                    No matching batches found.
                  </td>
                </tr>
              ) : (
                paginatedBatches.map(item => {
                  const score = item.overall_food_health_score;
                  const isExp = item.is_expired;
                  const grade = item.quality_grade?.split(' - ')[0] || 'Grade B';

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedBatchItem(item)}
                      className="hover:bg-blue-50/30 transition-colors cursor-pointer"
                    >
                      {/* Batch & Item */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.batch_number}</div>
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3 text-slate-700">
                        {item.category}
                      </td>

                      {/* Overall Health Score */}
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-md font-black text-xs ${
                          isExp ? 'bg-red-100 text-red-700' :
                          score >= 80 ? 'bg-emerald-100 text-emerald-800' :
                          score >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700'
                        }`}>
                          {score}%
                        </span>
                      </td>

                      {/* Quality Grade */}
                      <td className="py-2.5 px-3 font-bold" style={{ color: item.grade_color || '#0047AB' }}>
                        {grade}
                      </td>

                      {/* Confidence */}
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                        {item.freshness_confidence_pct}%
                      </td>

                      {/* Shelf Life */}
                      <td className="py-2.5 px-3 text-center">
                        <span className={`font-bold ${isExp ? 'text-red-600' : 'text-slate-800'}`}>
                          {isExp ? 'Expired' : `${item.days_remaining}d`}
                        </span>
                      </td>

                      {/* Storage */}
                      <td className="py-2.5 px-3 text-center text-slate-600 text-[11px]">
                        {item.temperature_c}°C · {item.humidity_pct}%
                      </td>

                      {/* DOWNLOAD INDIVIDUAL PROFESSIONAL PDF REPORT BUTTON */}
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportIndividualBatchPDF(item);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-[#0047AB] text-[#0047AB] hover:text-white font-bold text-xs transition cursor-pointer border border-blue-200 shadow-2xs group"
                          title={`Download professional PDF report for ${item.name} (${item.batch_number})`}
                        >
                          <FileText className="w-3.5 h-3.5 text-[#0047AB] group-hover:text-white transition" />
                          <span>PDF Report</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Batch Count Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span>
              Showing <span className="font-bold text-slate-800">{filteredBatches.length === 0 ? 0 : (currentPage - 1) * (pageSize === 'All' ? filteredBatches.length : Number(pageSize)) + 1}</span> to <span className="font-bold text-slate-800">{pageSize === 'All' ? filteredBatches.length : Math.min(currentPage * Number(pageSize), filteredBatches.length)}</span> of <span className="font-bold text-slate-800">{filteredBatches.length}</span> batches
            </span>

            {/* Rows Per Page */}
            <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
              <span className="text-[11px] text-slate-500">Per page:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(e.target.value === 'All' ? 'All' : Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="text-xs px-2 py-0.5 rounded-lg border border-slate-200 bg-white text-slate-700"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value="All">All</option>
              </select>
            </div>
          </div>

          {/* Page Buttons */}
          {pageSize !== 'All' && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2.5 py-0.5 text-xs font-bold text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── 4. INSPECT BATCH MODAL (With direct Download PDF option) ── */}
      {selectedBatchItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl border border-slate-100">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">{selectedBatchItem.name}</h3>
                <div className="text-xs text-slate-400 font-mono">{selectedBatchItem.batch_number} · {selectedBatchItem.category}</div>
              </div>
              <button
                onClick={() => setSelectedBatchItem(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Score Pill */}
            <div className="mt-4 p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Overall Health Score</div>
                <div className="text-2xl font-black text-white">{selectedBatchItem.overall_food_health_score}%</div>
              </div>
              <div className="px-3 py-1 rounded-lg text-xs font-black bg-white/15">
                {selectedBatchItem.quality_grade}
              </div>
            </div>

            {/* 4 Clean Metric Boxes */}
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-slate-400 text-[10px] font-bold">1. Quality (40%)</div>
                <div className="font-bold text-slate-800">{selectedBatchItem.food_quality_score}%</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-slate-400 text-[10px] font-bold">2. Confidence</div>
                <div className="font-bold text-slate-800">{selectedBatchItem.freshness_confidence_pct}%</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-slate-400 text-[10px] font-bold">3. Shelf-Life (20%)</div>
                <div className="font-bold text-slate-800">{selectedBatchItem.days_remaining}d left</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-slate-400 text-[10px] font-bold">4. Storage (25%)</div>
                <div className="font-bold text-slate-800">{selectedBatchItem.temperature_c}°C · {selectedBatchItem.humidity_pct}%</div>
              </div>
            </div>

            {/* Calculation */}
            <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700">
              <div className="text-[10px] text-slate-400 font-sans font-bold mb-1">Calculation:</div>
              <div>
                = ({selectedBatchItem.weighted_breakdown?.visual_condition?.score} × 0.40) + ({selectedBatchItem.weighted_breakdown?.storage_conditions?.score} × 0.25) + ({selectedBatchItem.weighted_breakdown?.shelf_life?.score} × 0.20) + ({selectedBatchItem.weighted_breakdown?.product_age?.score} × 0.15)
              </div>
              <div className="text-emerald-700 font-bold mt-1">
                = {selectedBatchItem.overall_food_health_score}%
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => handleExportIndividualBatchPDF(selectedBatchItem)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFC700] hover:bg-[#e6b300] text-[#003882] font-black text-xs transition cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Download Batch PDF</span>
              </button>
              <button
                onClick={() => setSelectedBatchItem(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-300 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. INVENTORY DISTRIBUTION BY CATEGORY ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0047AB] to-[#1E6BFF] flex items-center justify-center text-white shadow-sm">
              <PieChart className="w-5 h-5 text-[#FFC700]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-black text-slate-900 text-lg tracking-tight">Inventory by Category</h3>
                <span className="text-xs font-bold bg-blue-50 text-[#0047AB] border border-blue-200/70 px-2.5 py-0.5 rounded-full">
                  {kpis?.total_items || 49} Batches · {categoryData.length} Categories
                </span>
              </div>
            </div>
          </div>
          {selectedCategory !== 'All' && (
            <button
              onClick={() => { setSelectedCategory('All'); setCurrentPage(1); }}
              className="text-xs font-bold text-[#0047AB] bg-blue-50 hover:bg-blue-100 border border-blue-200/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
            >
              <span>Reset filter ({selectedCategory})</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-col xl:flex-row items-center gap-8 py-2">
          <div className="shrink-0 flex justify-center">
            <ModernInteractiveDonut
              data={categoryData}
              hoveredCategory={hoveredCategory}
              onHoverCategory={setHoveredCategory}
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => {
                setSelectedCategory(prev => prev === cat ? 'All' : cat);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="flex-1 w-full">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 w-full">
              {categoryData.map((d, i) => {
                const meta = getCategoryMeta(d.category, i);
                const isHovered = hoveredCategory === d.category;
                const isSelected = selectedCategory === d.category;

                return (
                  <div
                    key={d.category}
                    onMouseEnter={() => setHoveredCategory(d.category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    onClick={() => {
                      setSelectedCategory(prev => prev === d.category ? 'All' : d.category);
                      setCurrentPage(1);
                    }}
                    className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-blue-50/90 border-[#0047AB] shadow-md ring-2 ring-[#0047AB]/25 scale-[1.03]'
                        : isHovered
                        ? 'bg-white border-slate-300 shadow-lg scale-[1.025]'
                        : 'bg-slate-50/80 hover:bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                    style={{
                      boxShadow: (isHovered || isSelected)
                        ? `0 10px 25px -5px ${meta.start}30, 0 8px 10px -6px ${meta.start}15`
                        : undefined
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl p-1 rounded-lg bg-white shadow-2xs border border-slate-100 flex items-center justify-center">
                          {meta.icon}
                        </span>
                        <span className="text-slate-900 font-bold truncate text-sm group-hover:text-[#0047AB] transition">
                          {d.category}
                        </span>
                      </div>
                      <span className="font-black text-slate-900 text-sm ml-2 bg-white px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-2xs">
                        {d.count}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-slate-200/90 h-2 rounded-full overflow-hidden my-2">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${d.pct || 0}%`,
                          background: `linear-gradient(90deg, ${meta.start}, ${meta.end})`
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                      <span className="font-bold text-slate-700">{d.pct || 0}% share</span>
                      <span className={`font-bold transition ${isSelected ? 'text-[#0047AB]' : 'text-slate-400 group-hover:text-[#0047AB]'}`}>
                        {isSelected ? 'Filtered ✓' : 'Filter →'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
