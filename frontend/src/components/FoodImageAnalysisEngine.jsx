import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Upload, Camera, Image as ImageIcon, Sparkles, AlertTriangle,
  CheckCircle2, AlertCircle, RefreshCw, Zap, Shield, ArrowRight,
  TrendingDown, Layers, Eye, Download, Link as LinkIcon, Database,
  Sliders, Info, Check, X, ShieldAlert, Thermometer, Droplets, FileText
} from 'lucide-react';
import { generateFreshnessPdfReport } from '../utils/generatePdfReport';

const CATEGORY_COLORS = {
  'Fresh': {
    badge: 'bg-emerald-500/10 text-emerald-700 border-emerald-300 ring-emerald-400',
    radial: '#10b981',
    glow: 'rgba(16, 185, 129, 0.25)',
    bar: 'bg-emerald-500'
  },
  'Good': {
    badge: 'bg-blue-500/10 text-blue-700 border-blue-300 ring-blue-400',
    radial: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.25)',
    bar: 'bg-blue-500'
  },
  'Acceptable': {
    badge: 'bg-amber-500/10 text-amber-700 border-amber-300 ring-amber-400',
    radial: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.25)',
    bar: 'bg-amber-500'
  },
  'Near Spoilage': {
    badge: 'bg-orange-500/10 text-orange-700 border-orange-300 ring-orange-400',
    radial: '#f97316',
    glow: 'rgba(249, 115, 22, 0.25)',
    bar: 'bg-orange-500'
  },
  'Spoiled': {
    badge: 'bg-rose-500/10 text-rose-700 border-rose-300 ring-rose-400',
    radial: '#f43f5e',
    glow: 'rgba(244, 63, 94, 0.25)',
    bar: 'bg-rose-500'
  }
};

export const FoodImageAnalysisEngine = ({ onInventoryUpdated }) => {
  const { token, API_BASE_URL, user } = useAuth();

  // Mode: 'upload' | 'camera'
  const [inputMode, setInputMode] = useState('upload');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  
  // Custom upload state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [foodCategory, setFoodCategory] = useState('Fruits');
  const [customFoodName, setCustomFoodName] = useState('');

  // Camera capture state
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // Analysis result state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);

  // Visual Overlay view: 'overlay' | 'original' | 'side-by-side'
  const [overlayView, setOverlayView] = useState('overlay');

  // Inventory sync state
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [syncSuccess, setSyncSuccess] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // History state
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load inventory items and scan history
  useEffect(() => {
    fetchInventory();
    fetchHistory();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/inventory`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInventoryItems(data);
      }
    } catch (e) {
      console.error('Failed to load inventory for linking', e);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/analysis/history?limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  };

  // Auto-infer category & human-readable produce name from filename
  const inferCategoryAndName = (filename) => {
    const rawName = filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim();
    const lower = rawName.toLowerCase();
    
    // Vegetable detection keywords
    const vegKeywords = [
      'cucumber', 'tomato', 'potato', 'onion', 'carrot', 'broccoli', 'spinach',
      'cabbage', 'pepper', 'capsicum', 'garlic', 'ginger', 'lettuce', 'pea',
      'corn', 'cauliflower', 'eggplant', 'brinjal', 'radish', 'beet', 'zucchini',
      'celery', 'mushroom', 'chilli', 'chili', 'beans', 'gourd'
    ];
    // Fruit detection keywords
    const fruitKeywords = [
      'apple', 'banana', 'orange', 'mango', 'grape', 'berry', 'strawberry',
      'lemon', 'lime', 'peach', 'pear', 'plum', 'pineapple', 'watermelon',
      'melon', 'papaya', 'avocado', 'cherry', 'kiwi', 'fig', 'guava', 'pomegranate'
    ];
    
    let inferredCat = foodCategory || 'Fruits';
    if (vegKeywords.some(k => lower.includes(k))) {
      inferredCat = 'Vegetables';
    } else if (fruitKeywords.some(k => lower.includes(k))) {
      inferredCat = 'Fruits';
    }
    
    return { name: rawName, category: inferredCat };
  };

  // Run image analysis pipeline with explicit fresh parameters to prevent React stale closure bugs
  const runAnalysis = async ({ benchmark_id, file, foodName, category }) => {
    setAnalyzing(true);
    setAnalysisError(null);
    setSyncSuccess(null);

    const activeFoodName = foodName !== undefined ? foodName : customFoodName;
    const activeCategory = category !== undefined ? category : foodCategory;

    const formData = new FormData();
    if (file) {
      formData.append('file', file);
      formData.append('food_category', activeCategory || 'Fruits');
      if (activeFoodName) {
        formData.append('food_name', activeFoodName);
      }
    } else if (benchmark_id) {
      formData.append('benchmark_id', benchmark_id);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/analysis/inspect`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Analysis pipeline failed');
      }

      const data = await res.json();
      if (activeFoodName) {
        data.detected_food_name = activeFoodName;
      }
      if (activeCategory) {
        data.food_category = activeCategory;
      }
      setAnalysisResult(data);
      fetchHistory();
    } catch (err) {
      setAnalysisError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  // Handle new file upload or change: immediately sets new name, category, and starts analysis
  const handleNewFileSelected = (file, customNameOverride = null) => {
    setUploadedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setAnalysisResult(null); // Clear previous result immediately so old image name & scores don't linger
    
    const { name, category } = inferCategoryAndName(file.name);
    const finalName = customNameOverride || name;
    
    setCustomFoodName(finalName);
    setFoodCategory(category);
    
    runAnalysis({
      file,
      foodName: finalName,
      category: category
    });
  };

  // Clear uploaded file
  const handleClearFile = () => {
    setUploadedFile(null);
    setPreviewUrl(null);
    setCustomFoodName('');
    setAnalysisResult(null);
    setAnalysisError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Trigger manual re-analysis on current file
  const handleAnalyzeClick = () => {
    if (uploadedFile) {
      runAnalysis({ file: uploadedFile, foodName: customFoodName, category: foodCategory });
    }
  };

  // Handle live user changes to produce label
  const handleCustomFoodNameChange = (newName) => {
    setCustomFoodName(newName);
    if (analysisResult) {
      setAnalysisResult(prev => prev ? { ...prev, detected_food_name: newName } : prev);
    }
  };

  // Handle live user changes to category hint
  const handleCategoryChange = (newCat) => {
    setFoodCategory(newCat);
    if (analysisResult) {
      setAnalysisResult(prev => prev ? { ...prev, food_category: newCat } : prev);
    }
  };

  // Handle File Input
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleNewFileSelected(file);
    }
  };

  // Handle Drag & Drop
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleNewFileSelected(file);
    }
  };

  // Webcam Controls
  const startCamera = async () => {
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert('Camera access denied or unavailable: ' + err.message);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const captureFrame = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      const file = new File([blob], `live_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
      stopCamera();
      handleNewFileSelected(file, 'Live Captured Produce');
    }, 'image/jpeg', 0.95);
  };

  // Link / Sync Inspection Results to Inventory Item
  const handleSyncToInventory = async () => {
    if (!selectedInventoryId || !analysisResult) return;
    setSyncing(true);
    setSyncSuccess(null);
    try {
      const res = await fetch(`${API_BASE_URL}/analysis/sync-inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          food_item_id: parseInt(selectedInventoryId),
          freshness_score: analysisResult.freshness_score,
          freshness_category: analysisResult.freshness_category,
          estimated_shelf_life_days: analysisResult.estimated_shelf_life_days,
          notes: `Inspected via AI Vision Engine. Grade: ${analysisResult.quality_grade}`
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to sync inventory');
      }

      const data = await res.json();
      setSyncSuccess(data.message);
      if (onInventoryUpdated) onInventoryUpdated();
    } catch (err) {
      alert(err.message);
    } finally {
      setSyncing(false);
    }
  };

  // Export PDF inspection certificate
  const handleExportPdf = () => {
    if (!analysisResult) return;
    setGeneratingPdf(true);
    try {
      generateFreshnessPdfReport(analysisResult, user);
    } catch (err) {
      console.error("Failed to generate PDF report:", err);
      alert("Error generating PDF report. Please try again.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Export inspection audit
  const handleExportAudit = () => {
    if (!analysisResult) return;
    const exportDoc = {
      platform: "FreshGuard AI Food Freshness Platform",
      engine: "Computer Vision & Freshness Assessment Engine",
      timestamp: new Date().toISOString(),
      primary_database: "PostgreSQL (Record ID: " + (analysisResult.id || 'N/A') + ")",
      secondary_database: "MongoDB (Telemetry ID: " + (analysisResult.mongo_telemetry_id || 'N/A') + ")",
      summary: {
        food_name: analysisResult.detected_food_name,
        category: analysisResult.food_category,
        freshness_score: analysisResult.freshness_score,
        freshness_category: analysisResult.freshness_category,
        quality_grade: analysisResult.quality_grade,
        spoilage_probability: `${analysisResult.spoilage_probability}%`,
        estimated_shelf_life_days: analysisResult.estimated_shelf_life_days,
        recommendation: analysisResult.recommendation
      },
      image_features: analysisResult.features,
      shelf_life_trend_projection: analysisResult.trend_projection
    };
    const blob = new Blob([JSON.stringify(exportDoc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `food_freshness_inspection_${Date.now()}.json`;
    a.click();
  };

  const currentCategory = analysisResult?.freshness_category || 'Fresh';
  const theme = CATEGORY_COLORS[currentCategory] || CATEGORY_COLORS['Fresh'];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner - Matches App Signature Navy Blue (#001f5e to #0047AB) & Warm Gold Theme */}
      <div className="bg-gradient-to-r from-[#001f5e] via-[#003882] to-[#0047AB] rounded-2xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden border border-blue-900/40">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0 border border-white/20">
              <Sparkles className="w-5 h-5 text-[#FFC700]" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Produce Freshness <span className="text-[#FFC700]">Scanner</span></span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {analysisResult && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPdf}
                  disabled={generatingPdf}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FFC700] hover:bg-[#e6b300] text-[#003882] font-black text-xs transition cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                  title="Download Official PDF Freshness Certificate"
                >
                  <FileText className="w-4 h-4 text-[#003882]" />
                  <span>{generatingPdf ? 'Generating PDF...' : 'Download PDF Report'}</span>
                </button>
                <button
                  onClick={handleExportAudit}
                  className="p-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-semibold transition border border-white/20 cursor-pointer active:scale-95"
                  title="Export Raw JSON Data"
                >
                  <Download className="w-4 h-4 text-white" />
                </button>
              </div>
            )}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Layers className="w-4 h-4 text-[#FFC700]" />
              <span>{showHistory ? 'Hide History' : 'Recent Scans'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Scans Drawer */}
      {showHistory && (
        <div className="light-card p-5 rounded-2xl bg-white border border-[#0047AB]/20 space-y-4 shadow-sm border-t-2 border-t-[#FFC700]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#0047AB]" />
              <span>Recent Scans</span>
            </h3>
            <span className="text-xs text-slate-400">{history.length} items</span>
          </div>
          {history.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">No recent scans yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {history.map((h) => {
                const hTheme = CATEGORY_COLORS[h.freshness_category] || CATEGORY_COLORS['Fresh'];
                return (
                  <div key={h.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 truncate">{h.detected_food_name}</span>
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${hTheme.badge}`}>
                        {h.freshness_category}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>Freshness: <strong className="text-slate-700">{h.freshness_score}%</strong></span>
                      <span>Shelf Life: <strong className="text-slate-700">{h.estimated_shelf_life_days}d</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Ingestion & Selection Hub */}
      <div className="light-card p-6 rounded-3xl bg-white border border-[#0047AB]/20 space-y-6 shadow-sm border-t-2 border-t-[#FFC700]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Upload Produce Image</h3>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => { setInputMode('upload'); stopCamera(); }}
              className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                inputMode === 'upload' ? 'bg-gradient-to-r from-[#0047AB] to-[#003882] text-white shadow-xs border-b-2 border-[#FFC700]' : 'text-slate-700 hover:text-[#0047AB]'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-[#FFC700]" />
              <span>Upload Image</span>
            </button>
            <button
              onClick={() => { setInputMode('camera'); startCamera(); }}
              className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                inputMode === 'camera' ? 'bg-gradient-to-r from-[#0047AB] to-[#003882] text-white shadow-xs border-b-2 border-[#FFC700]' : 'text-slate-700 hover:text-[#0047AB]'
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-[#FFC700]" />
              <span>Live Camera</span>
            </button>
          </div>
        </div>

        {/* Mode 1: File Upload */}
        {inputMode === 'upload' && (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {previewUrl ? (
              /* Selected Image Preview & Actions */
              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0 shadow-xs">
                  <img
                    src={previewUrl}
                    alt="Uploaded preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 text-center sm:text-left space-y-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="text-xs font-bold text-slate-800 truncate max-w-xs">
                      {uploadedFile?.name || 'Selected Food Image'}
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                      Loaded
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {uploadedFile ? `${(uploadedFile.size / 1024).toFixed(1)} KB` : ''} • Ready to analyze
                  </p>
                  <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <button
                      onClick={handleAnalyzeClick}
                      disabled={analyzing}
                      className="px-4 py-2 bg-[#0047AB] hover:bg-[#003785] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#FFC700]" />
                      <span>{analyzing ? 'Analyzing...' : 'Re-analyze Freshness'}</span>
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>Change Photo</span>
                    </button>
                    <button
                      onClick={handleClearFile}
                      className="px-3 py-2 text-slate-500 hover:text-rose-600 rounded-xl text-xs font-semibold transition"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Drag & Drop Box with Rich Dual Yellow and Royal Blue Accents */
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#0047AB]/30 hover:border-[#FFC700] rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 bg-gradient-to-b from-blue-50/40 via-amber-50/20 to-white hover:bg-amber-50/40 group shadow-xs hover:shadow-md"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0047AB] to-[#003882] group-hover:from-[#FFC700] group-hover:to-[#FFB800] border-2 border-[#FFC700] group-hover:border-[#0047AB] text-[#FFC700] group-hover:text-[#0047AB] flex items-center justify-center mx-auto mb-2.5 transition-all duration-300 shadow-md">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  Drag & Drop Food Image or <span className="text-[#0047AB] group-hover:text-amber-600 underline font-bold">Browse Files</span>
                </h4>
              </div>
            )}

            {/* Optional Metadata Hints */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Food Category Hint</label>
                <select
                  value={foodCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-[#0047AB] focus:outline-hidden"
                >
                  {['Fruits', 'Vegetables', 'Meat & Poultry', 'Seafood', 'Dairy Products', 'Bakery Products', 'Packaged Foods', 'Beverages'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Product / Item Label (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Honeycrisp Apple, Tomato, Banana"
                  value={customFoodName}
                  onChange={(e) => handleCustomFoodNameChange(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-[#0047AB] focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        )}

        {/* Mode 2: Live Camera Capture */}
        {inputMode === 'camera' && (
          <div className="space-y-4 text-center">
            <div className="relative mx-auto max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 aspect-video flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Camera className="w-8 h-8" />
                  <span className="text-xs">Camera is inactive</span>
                </div>
              )}
            </div>
            <div className="flex justify-center gap-3">
              {cameraActive ? (
                <>
                  <button
                    onClick={captureFrame}
                    className="px-5 py-2.5 bg-[#0047AB] hover:bg-[#003785] text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture Photo</span>
                  </button>
                  <button
                    onClick={stopCamera}
                    className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>Stop Camera</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={startCamera}
                  className="px-5 py-2.5 bg-[#0047AB] hover:bg-[#003785] text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Camera Stream</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>


      {/* Loading State */}
      {analyzing && (
        <div className="light-card p-12 rounded-2xl bg-white/95 border-t-4 border-t-[#0047AB] border-b-2 border-b-[#FFC700] border-x border-slate-200 text-center space-y-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0047AB] via-[#FFC700] to-[#0047AB]"></div>
          <RefreshCw className="w-10 h-10 animate-spin text-[#0047AB] mx-auto" />
          <div>
            <h4 className="text-base font-bold text-slate-900">Analyzing your image...</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Checking color, texture, mold, bruising, and computing a freshness score. This usually takes a few seconds.
            </p>
          </div>
        </div>
      )}

      {analysisError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-medium flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{analysisError}</span>
        </div>
      )}

      {/* MAIN INSPECTION DASHBOARD */}
      {analysisResult && !analyzing && (
        <div className="space-y-8 animate-fadeIn">
          {/* Top Freshness Assessment Card */}
          <div className="light-card p-6 sm:p-8 rounded-2xl bg-white border-t-4 border-t-[#0047AB] border-b-2 border-b-[#FFC700] border-x border-slate-200 shadow-md relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0047AB] via-[#FFC700] to-[#0047AB]"></div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Radial Freshness Meter */}
              <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-50/40 via-amber-50/20 to-white border-2 border-amber-200/80 rounded-2xl relative shadow-xs">
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="10"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke={theme.radial}
                      strokeWidth="10"
                      strokeDasharray="314.159"
                      strokeDashoffset={314.159 - (314.159 * analysisResult.freshness_score) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                      {Math.round(analysisResult.freshness_score)}
                      <span className="text-xl font-bold text-slate-400">%</span>
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                      Freshness Score
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-col items-center gap-1.5">
                  <span className={`px-4 py-1 rounded-full text-xs font-extrabold tracking-wide border shadow-2xs ${theme.badge}`}>
                    {analysisResult.freshness_category}
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {analysisResult.quality_grade}
                  </span>
                </div>
              </div>

              {/* Assessment Engine Breakdown & Metrics */}
              <div className="lg:col-span-8 space-y-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 capitalize">
                      {customFoodName || analysisResult.detected_food_name}
                    </h3>
                    <span className="text-xs px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded-md font-semibold text-slate-600">
                      {foodCategory || analysisResult.food_category}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 bg-blue-50 border border-[#0047AB]/20 rounded-md font-semibold text-[#0047AB]">
                      {analysisResult.dataset_reference === 'Live Image Upload' ? 'Uploaded Image' : (analysisResult.dataset_reference || 'Uploaded Image')}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {analysisResult.recommendation}
                  </p>
                </div>

                {/* Key Quick Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
                      <span>Spoilage Risk</span>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <div className="text-lg font-black text-slate-900">
                      {analysisResult.spoilage_probability}%
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${analysisResult.spoilage_probability > 50 ? 'bg-rose-500' : 'bg-amber-500'}`}
                        style={{ width: `${analysisResult.spoilage_probability}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
                      <span>Estimated Shelf Life</span>
                      <Thermometer className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <div className="text-lg font-black text-slate-900">
                      ~{analysisResult.estimated_shelf_life_days} <span className="text-xs font-semibold text-slate-500">days</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Refrigerated (3–4°C)</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 col-span-2 sm:col-span-1">
                    <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
                      <span>Quality Grade</span>
                      <Shield className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <div className="text-lg font-black text-slate-900">
                      {analysisResult.quality_grade?.split(' - ')[0] || analysisResult.quality_grade}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {analysisResult.quality_grade?.split(' - ')[1] || 'Standard'}
                    </p>
                  </div>
                </div>

                {/* Inventory Linker */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Update Inventory Batch</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                      value={selectedInventoryId}
                      onChange={(e) => setSelectedInventoryId(e.target.value)}
                      className="text-xs p-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-800"
                    >
                      <option value="">Select Batch...</option>
                      {inventoryItems.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.batch_number} - {item.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleSyncToInventory}
                      disabled={!selectedInventoryId || syncing}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition shrink-0"
                    >
                      {syncing ? 'Syncing...' : 'Sync'}
                    </button>
                  </div>
                </div>
                {syncSuccess && (
                  <p className="text-xs text-emerald-700 font-bold flex items-center gap-1.5 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{syncSuccess}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Visual Defect Overlay Viewer */}
          <div className="light-card p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-600" />
                  <span>Visual Defect Detection</span>
                </h3>
              </div>

              {/* Viewer Mode Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  onClick={() => setOverlayView('overlay')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    overlayView === 'overlay' ? 'bg-[#0047AB] text-white shadow-xs' : 'text-slate-600 hover:text-[#0047AB]'
                  }`}
                >
                  AI Defect Overlay
                </button>
                <button
                  onClick={() => setOverlayView('original')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    overlayView === 'original' ? 'bg-[#0047AB] text-white shadow-xs' : 'text-slate-600 hover:text-[#0047AB]'
                  }`}
                >
                  Original Photo
                </button>
                <button
                  onClick={() => setOverlayView('side-by-side')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    overlayView === 'side-by-side' ? 'bg-[#0047AB] text-white shadow-xs' : 'text-slate-600 hover:text-[#0047AB]'
                  }`}
                >
                  Side-by-Side
                </button>
              </div>
            </div>

            {/* Visual Display Container */}
            <div className="space-y-3">
              {overlayView === 'side-by-side' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 text-center space-y-2 p-2">
                    <img
                      src={analysisResult.visual_overlays.original_image_base64}
                      alt="Original capture"
                      className="w-full max-h-[360px] object-contain rounded-lg mx-auto bg-white"
                    />
                    <span className="text-xs font-bold text-slate-600 block">Original Input</span>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 text-center space-y-2 p-2">
                    <img
                      src={analysisResult.visual_overlays.diagnostic_overlay_base64}
                      alt="AI Diagnostic defect overlay"
                      className="w-full max-h-[360px] object-contain rounded-lg mx-auto bg-white"
                    />
                    <span className="text-xs font-bold text-emerald-700 block">AI Defect Overlay</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900/5 p-4 text-center">
                  <img
                    src={
                      overlayView === 'overlay'
                        ? analysisResult.visual_overlays.diagnostic_overlay_base64
                        : analysisResult.visual_overlays.original_image_base64
                    }
                    alt="Inspection render"
                    className="max-h-[420px] object-contain mx-auto rounded-xl shadow-xs bg-white"
                  />
                </div>
              )}

              {/* Defect Map Legend */}
              <div className="flex flex-wrap items-center justify-center gap-6 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span>Mold Spores</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-400" />
                  <span>Bruising</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-cyan-400" />
                  <span>Cuts & Cracks</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span>Produce Boundary</span>
                </div>
              </div>
            </div>
          </div>

          {/* Clean Quality & Defect Breakdown (Straightforward 4-Indicator Grid) */}
          <div className="space-y-3">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-base font-bold text-slate-800">
                Quality & Defect Breakdown
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Indicator 1: Color & Browning */}
              <div className="light-card p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Color & Browning</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    analysisResult.features.color_analysis.color_degradation_pct > 30
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {analysisResult.features.color_analysis.color_degradation_pct > 30 ? 'Browning' : 'Normal'}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${analysisResult.features.color_analysis.color_degradation_pct > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, analysisResult.features.color_analysis.color_degradation_pct)}%` }}
                  />
                </div>
              </div>

              {/* Indicator 2: Texture & Hydration */}
              <div className="light-card p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Surface Texture</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    analysisResult.features.texture_analysis.texture_degradation_pct > 30
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {analysisResult.features.texture_analysis.texture_degradation_pct > 30 ? 'Wrinkling' : 'Firm'}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${analysisResult.features.texture_analysis.texture_degradation_pct > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, analysisResult.features.texture_analysis.texture_degradation_pct)}%` }}
                  />
                </div>
              </div>

              {/* Indicator 3: Mold Spores */}
              <div className="light-card p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Mold & Fungi</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    analysisResult.features.mold_detection.mold_detected
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {analysisResult.features.mold_detection.mold_detected ? 'Spores Found' : 'Clean'}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${analysisResult.features.mold_detection.mold_detected ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${analysisResult.features.mold_detection.mold_detected ? 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Indicator 4: Bruising & Cuts */}
              <div className="light-card p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Bruises & Damage</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    analysisResult.features.bruise_detection.bruise_detected || analysisResult.features.physical_damage_detection.damage_detected
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {analysisResult.features.bruise_detection.bruise_detected || analysisResult.features.physical_damage_detection.damage_detected
                      ? 'Defects Found'
                      : 'Intact'}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      analysisResult.features.bruise_detection.bruise_detected || analysisResult.features.physical_damage_detection.damage_detected
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.max(analysisResult.features.bruise_detection.bruise_severity_pct, analysisResult.features.physical_damage_detection.damage_severity_pct))}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
