import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { InventoryManager } from './InventoryManager';
import { FoodImageAnalysisEngine } from './FoodImageAnalysisEngine';
import { ShelfLifePredictorModal, ShelfLifePredictorInline } from './ShelfLifePredictorModal';
import { StorageMonitoringView } from './StorageMonitoringView';
import { RecommendationEngineView } from './RecommendationEngineView';
import { FreshnessAnalyticsDashboard } from './FreshnessAnalyticsDashboard';
import { NotificationCenterModal } from './NotificationCenterModal';
import { EnvironmentalAnalyticsView } from './EnvironmentalAnalyticsView';
import { RetailInventoryQualityView } from './RetailInventoryQualityView';
import { AdminPlatformAnalytics } from './AdminPlatformAnalytics';
import { AdminSystemMonitoring } from './AdminSystemMonitoring';
import { AdminReportingManagement } from './AdminReportingManagement';
import { 
  ShoppingBag, Store, Warehouse, ShieldCheck, UserCheck, 
  Activity, AlertTriangle, TrendingUp, CheckCircle, Clock, 
  Thermometer, Droplets, Database, Sparkles, RefreshCw,
  FileText, Search, Filter, ShieldAlert, BarChart3, PieChart, LineChart, 
  Users, Settings, Download, LayoutDashboard, Package, Trash2, Edit3, 
  Plus, Shield, Info, Check, X, ArrowUpRight, Zap, Lightbulb, Camera,
  TrendingDown, Leaf, RotateCcw, Bell, Layers
} from 'lucide-react';

export const Dashboard = () => {
  const { user, token, API_BASE_URL } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    if (user?.role === 'Consumer') return 'freshness-reports';
    if (user?.role === 'Retail Manager') return 'retail-freshness';
    if (user?.role === 'Warehouse Operator') return 'warehouse-storage-compliance';
    if (user?.role === 'Administrator' || user?.role === 'Food Quality Inspector') return 'admin-user-management';
    return 'dashboard';
  });
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);

  // Admin User Management State
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  // New User Form State
  const [newUser, setNewUser] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'Consumer'
  });

  // Environmental Simulator State (Warehouse)
  const [simTemp, setSimTemp] = useState(3.8);
  const [simHumidity, setSimHumidity] = useState(88);
  const [tempAlert, setTempAlert] = useState(false);

  const currentRole = user?.role || 'Consumer';

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load dashboard statistics');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (user?.role !== 'Administrator' && user?.role !== 'Food Quality Inspector') return;
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchUnreadNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/notifications?unread_only=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadAlertsCount(data.length);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user?.role === 'Consumer' && activeTab === 'dashboard') {
      setActiveTab('freshness-reports');
    } else if (user?.role === 'Retail Manager' && activeTab === 'dashboard') {
      setActiveTab('retail-freshness');
    } else if (user?.role === 'Warehouse Operator' && activeTab === 'dashboard') {
      setActiveTab('warehouse-storage-compliance');
    } else if ((user?.role === 'Administrator' || user?.role === 'Food Quality Inspector') && activeTab === 'dashboard') {
      setActiveTab('admin-user-management');
    }
    fetchStats();
    fetchUnreadNotifications();
    if (user?.role === 'Administrator' || user?.role === 'Food Quality Inspector') {
      fetchUsers();
    }
  }, [user, token]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to create user');
      }
      setShowAddUserModal(false);
      setNewUser({ full_name: '', email: '', password: '', role: 'Consumer' });
      fetchUsers();
      fetchStats();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateRole = async (userId, newRole, isActive = true) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole, is_active: isActive })
      });
      if (!res.ok) throw new Error('Failed to update user');
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to delete user');
      }
      fetchUsers();
      fetchStats();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleExportReport = (format) => {
    const reportData = {
      timestamp: new Date().toISOString(),
      platform: "FreshGuard AI Food Freshness Engine",
      role: currentRole,
      summary_stats: stats,
      system_users_count: users.length
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `freshguard_report_${Date.now()}.json`;
      a.click();
    } else {
      const csvContent = "data:text/csv;charset=utf-8," 
        + "Metric,Value\n"
        + `Tracked Items,${stats?.items_tracked || 0}\n`
        + `Fresh Items,${stats?.fresh_items || 0}\n`
        + `Expiring Soon,${stats?.expiring_soon || 0}\n`
        + `Expired,${stats?.spoiled_warning || 0}\n`
        + `Store Freshness Index,${stats?.store_freshness_index || '94%'}\n`
        + `Cold Storage Temp,${simTemp} C\n`
        + `Humidity,${simHumidity}%\n`;
      const encodedUri = encodeURI(csvContent);
      const a = document.createElement('a');
      a.href = encodedUri;
      a.download = `freshguard_audit_${Date.now()}.csv`;
      a.click();
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-slate-500 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-sm font-semibold">Loading FreshGuard Ecosystem...</p>
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Banner with Vibrant Fresh Market Artwork & Dual Yellow/Blue Theme */}
      <div className="relative rounded-3xl overflow-hidden border-2 border-[#FFC700]/80 shadow-xl min-h-[175px] flex flex-col justify-between">
        {/* Top Dual Yellow & Blue Accent Stripe */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#0047AB] via-[#FFC700] to-[#0047AB] relative z-20" />

        {/* Full Vibrant Produce Banner Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-[1.01]"
          style={{ backgroundImage: 'url(/theme-banner.png)' }}
        />

        {/* Soft vignette so artwork on sides is crisp & colorful */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/10 pointer-events-none" />

        <div className="relative z-10 w-full p-6 sm:p-7 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Floating Frosted Glass Card for Welcome Info */}
          <div className="space-y-2 max-w-xl bg-white/92 backdrop-blur-md p-5 rounded-2xl border border-white/90 shadow-lg border-l-4 border-l-[#0047AB] border-t-2 border-t-[#FFC700]">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-[#0047AB] to-[#003882] text-white rounded-full text-xs font-black shadow-sm border border-[#FFC700]/50">
              <Sparkles className="w-3.5 h-3.5 text-[#FFC700]" />
              <span>Fresh Market Intelligence</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Welcome back, <span className="text-[#0047AB]">{user?.full_name}</span>
            </h2>
            <p className="text-slate-600 font-medium text-xs sm:text-sm">
              Role: <strong className="text-[#0047AB] bg-amber-50 px-2 py-0.5 rounded-md border border-[#FFC700]/40 font-bold">{user?.role}</strong>
            </p>
          </div>

          {/* Navigation Controls in Frosted Glass Widget */}
          <div className="flex flex-wrap items-center gap-3 z-10 w-full lg:w-auto">

            {/* Main Tabs */}
            <div className="flex items-center gap-1.5 bg-white/92 p-1.5 rounded-2xl border-2 border-[#FFC700]/50 shadow-md backdrop-blur-md flex-wrap">
              {/* For Consumer: Explicitly display their 4 sections in the tabs bar */}
              {user?.role === 'Consumer' ? (
                <>
                  <button
                    onClick={() => setActiveTab('freshness-reports')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                      activeTab === 'freshness-reports'
                        ? 'bg-gradient-to-r from-[#0047AB] to-[#003882] text-white shadow-md border-b-2 border-[#FFC700]'
                        : 'text-slate-700 hover:text-[#0047AB] hover:bg-amber-50/60'
                    }`}
                  >
                    <PieChart className="w-4 h-4 text-[#FFC700]" />
                    <span>Freshness reports</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('shelflife-estimates')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                      activeTab === 'shelflife-estimates'
                        ? 'bg-gradient-to-r from-[#0047AB] to-[#003882] text-white shadow-md border-b-2 border-[#FFC700]'
                        : 'text-slate-700 hover:text-[#0047AB] hover:bg-amber-50/60'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-[#FFC700]" />
                    <span>Shelf-life estimates</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('storage-recommendations')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                      activeTab === 'storage-recommendations'
                        ? 'bg-gradient-to-r from-[#0047AB] to-[#003882] text-white shadow-md border-b-2 border-[#FFC700]'
                        : 'text-slate-700 hover:text-[#0047AB] hover:bg-amber-50/60'
                    }`}
                  >
                    <Lightbulb className="w-4 h-4 text-[#FFC700]" />
                    <span>Storage recommendations</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('food-inventory-overview')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                      activeTab === 'food-inventory-overview'
                        ? 'bg-gradient-to-r from-[#0047AB] to-[#003882] text-white shadow-md border-b-2 border-[#FFC700]'
                        : 'text-slate-700 hover:text-[#0047AB] hover:bg-amber-50/60'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4 text-[#FFC700]" />
                    <span>Food inventory overview</span>
                  </button>
                </>
              ) : user?.role === 'Retail Manager' ? (
                <>
                  <button
                    onClick={() => setActiveTab('retail-freshness')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                      activeTab === 'retail-freshness'
                        ? 'bg-gradient-to-r from-[#0047AB] to-[#003882] text-white shadow-md border-b-2 border-[#FFC700]'
                        : 'text-slate-700 hover:text-[#0047AB] hover:bg-amber-50/60'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 text-[#FFC700]" />
                    <span>Product freshness analytics</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('retail-inventory-quality')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                      activeTab === 'retail-inventory-quality'
                        ? 'bg-gradient-to-r from-[#0047AB] to-[#003882] text-white shadow-md border-b-2 border-[#FFC700]'
                        : 'text-slate-700 hover:text-[#0047AB] hover:bg-amber-50/60'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 text-[#FFC700]" />
                    <span>Inventory quality monitoring</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('retail-shelflife-alerts')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                      activeTab === 'retail-shelflife-alerts'
                        ? 'bg-gradient-to-r from-[#0047AB] to-[#003882] text-white shadow-md border-b-2 border-[#FFC700]'
                        : 'text-slate-700 hover:text-[#0047AB] hover:bg-amber-50/60'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4 text-[#FFC700]" />
                    <span>Shelf-life alerts</span>
                  </button>
                </>
              ) : user?.role === 'Warehouse Operator' ? (
                <>
                  <button
                    onClick={() => setActiveTab('warehouse-storage-compliance')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                      activeTab === 'warehouse-storage-compliance'
                        ? 'bg-gradient-to-r from-[#0047AB] to-[#003882] text-white shadow-md border-b-2 border-[#FFC700]'
                        : 'text-slate-700 hover:text-[#0047AB] hover:bg-amber-50/60'
                    }`}
                  >
                    <Activity className="w-4 h-4 text-[#FFC700]" />
                    <span>Storage compliance monitoring</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('warehouse-inventory-health')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                      activeTab === 'warehouse-inventory-health'
                        ? 'bg-gradient-to-r from-[#0047AB] to-[#003882] text-white shadow-md border-b-2 border-[#FFC700]'
                        : 'text-slate-700 hover:text-[#0047AB] hover:bg-amber-50/60'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 text-[#FFC700]" />
                    <span>Inventory health tracking</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('warehouse-batch-reports')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                      activeTab === 'warehouse-batch-reports'
                        ? 'bg-gradient-to-r from-[#0047AB] to-[#003882] text-white shadow-md border-b-2 border-[#FFC700]'
                        : 'text-slate-700 hover:text-[#0047AB] hover:bg-amber-50/60'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-[#FFC700]" />
                    <span>Batch freshness reports</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('warehouse-environmental-analytics')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                      activeTab === 'warehouse-environmental-analytics'
                        ? 'bg-gradient-to-r from-[#0047AB] to-[#003882] text-white shadow-md border-b-2 border-[#FFC700]'
                        : 'text-slate-700 hover:text-[#0047AB] hover:bg-amber-50/60'
                    }`}
                  >
                    <Thermometer className="w-4 h-4 text-[#FFC700]" />
                    <span>Environmental analytics</span>
                  </button>
                </>
              ) : (user?.role === 'Administrator' || user?.role === 'Food Quality Inspector') ? (
                <>
                  <button
                    onClick={() => setActiveTab('admin-user-management')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                      activeTab === 'admin-user-management'
                        ? 'bg-gradient-to-r from-[#0047AB] to-[#003882] text-white shadow-md border-b-2 border-[#FFC700]'
                        : 'text-slate-700 hover:text-[#0047AB] hover:bg-amber-50/60'
                    }`}
                  >
                    <Users className="w-4 h-4 text-[#FFC700]" />
                    <span>User management</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('admin-platform-analytics')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                      activeTab === 'admin-platform-analytics'
                        ? 'bg-gradient-to-r from-[#0047AB] to-[#003882] text-white shadow-md border-b-2 border-[#FFC700]'
                        : 'text-slate-700 hover:text-[#0047AB] hover:bg-amber-50/60'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 text-[#FFC700]" />
                    <span>Platform analytics</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('admin-system-monitoring')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                      activeTab === 'admin-system-monitoring'
                        ? 'bg-gradient-to-r from-[#0047AB] to-[#003882] text-white shadow-md border-b-2 border-[#FFC700]'
                        : 'text-slate-700 hover:text-[#0047AB] hover:bg-amber-50/60'
                    }`}
                  >
                    <Database className="w-4 h-4 text-[#FFC700]" />
                    <span>System monitoring</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('admin-reporting-management')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                      activeTab === 'admin-reporting-management'
                        ? 'bg-gradient-to-r from-[#0047AB] to-[#003882] text-white shadow-md border-b-2 border-[#FFC700]'
                        : 'text-slate-700 hover:text-[#0047AB] hover:bg-amber-50/60'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-[#FFC700]" />
                    <span>Reporting management</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                    activeTab === 'dashboard'
                      ? 'bg-gradient-to-r from-[#0047AB] to-[#003882] text-white shadow-md border-b-2 border-[#FFC700]'
                      : 'text-slate-700 hover:text-[#0047AB] hover:bg-amber-50/60'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-[#FFC700]" />
                  <span>Dashboard</span>
                </button>
              )}

              {/* Operational & Platform tabs only available to other roles if any */}
              {user?.role !== 'Consumer' && user?.role !== 'Retail Manager' && user?.role !== 'Warehouse Operator' && user?.role !== 'Administrator' && user?.role !== 'Food Quality Inspector' && (
                <>
                  <button
                    onClick={() => setActiveTab('inventory')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                      activeTab === 'inventory'
                        ? 'bg-gradient-to-r from-[#0047AB] to-[#003882] text-white shadow-md border-b-2 border-[#FFC700]'
                        : 'text-slate-700 hover:text-[#0047AB] hover:bg-amber-50/60'
                    }`}
                  >
                    <Package className="w-4 h-4 text-[#FFC700]" />
                    <span>Food Inventory</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('vision')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                      activeTab === 'vision'
                        ? 'bg-gradient-to-r from-[#0047AB] to-[#003882] text-white shadow-md border-b-2 border-[#FFC700]'
                        : 'text-slate-700 hover:text-[#0047AB] hover:bg-amber-50/60'
                    }`}
                  >
                    <Camera className="w-4 h-4 text-[#FFC700]" />
                    <span>Freshness Scanner</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('shelflife')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                      activeTab === 'shelflife'
                        ? 'bg-gradient-to-r from-[#0047AB] to-[#003882] text-white shadow-md border-b-2 border-[#FFC700]'
                        : 'text-slate-700 hover:text-[#0047AB] hover:bg-amber-50/60'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4 text-[#FFC700]" />
                    <span>Shelf-Life</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('storage')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                      activeTab === 'storage'
                        ? 'bg-gradient-to-r from-[#0047AB] to-[#003882] text-white shadow-md border-b-2 border-[#FFC700]'
                        : 'text-slate-700 hover:text-[#0047AB] hover:bg-amber-50/60'
                    }`}
                  >
                    <Thermometer className="w-4 h-4 text-[#FFC700]" />
                    <span>Storage Condition Monitoring</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('recommendations')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                      activeTab === 'recommendations'
                        ? 'bg-gradient-to-r from-[#0047AB] to-[#003882] text-white shadow-md border-b-2 border-[#FFC700]'
                        : 'text-slate-700 hover:text-[#0047AB] hover:bg-amber-50/60'
                    }`}
                  >
                    <Zap className="w-4 h-4 text-[#FFC700]" />
                    <span>AI Recommendations</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                      activeTab === 'analytics'
                        ? 'bg-gradient-to-r from-[#0047AB] to-[#003882] text-white shadow-md border-b-2 border-[#FFC700]'
                        : 'text-slate-700 hover:text-[#0047AB] hover:bg-amber-50/60'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 text-[#FFC700]" />
                    <span>Analytics</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('reports')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                      activeTab === 'reports'
                        ? 'bg-gradient-to-r from-[#0047AB] to-[#003882] text-white shadow-md border-b-2 border-[#FFC700]'
                        : 'text-slate-700 hover:text-[#0047AB] hover:bg-amber-50/60'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-[#FFC700]" />
                    <span>Reports & Export</span>
                  </button>
                </>
              )}

              {/* Notification Bell Button */}
              <button
                onClick={() => setShowNotificationModal(true)}
                className="relative p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-[#0047AB] border border-[#FFC700]/60 transition cursor-pointer flex items-center justify-center ml-1 shadow-xs"
                title="Open Notification & Alert Center"
              >
                <Bell className="w-4 h-4 text-[#0047AB]" />
                {unreadAlertsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[10px] font-black shadow-xs animate-pulse">
                    {unreadAlertsCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-medium">
          {error}
        </div>
      )}

      {/* OPERATIONAL TABS: Available for other roles if any */}
      {user?.role !== 'Consumer' && user?.role !== 'Retail Manager' && user?.role !== 'Warehouse Operator' && user?.role !== 'Administrator' && user?.role !== 'Food Quality Inspector' && (
        <>
          {/* TAB 1: FOOD INVENTORY MANAGEMENT */}
          {activeTab === 'inventory' && (
            <InventoryManager />
          )}

          {/* TAB 2: AI VISION ENGINE & FRESHNESS ANALYSIS */}
          {activeTab === 'vision' && (
            <FoodImageAnalysisEngine onInventoryUpdated={fetchStats} />
          )}

          {/* TAB 3: SHELF-LIFE PREDICTOR */}
          {activeTab === 'shelflife' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-700 to-indigo-700 rounded-2xl p-5 text-white flex items-center gap-3 shadow-md">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <TrendingDown className="w-5 h-5 text-[#FFC700]" />
                </div>
                <div>
                  <h2 className="text-lg font-black">Shelf-Life Predictor</h2>
                  <p className="text-blue-100 text-xs">Estimate food freshness and expected shelf-life based on storage conditions.</p>
                </div>
              </div>
              <ShelfLifePredictorInline token={token} API_BASE_URL={API_BASE_URL} />
            </div>
          )}

          {/* TAB 4: STORAGE MONITORING */}
          {activeTab === 'storage' && (
            <StorageMonitoringView />
          )}

          {/* TAB 5: RECOMMENDATION ENGINE */}
          {activeTab === 'recommendations' && (
            <RecommendationEngineView />
          )}

          {/* TAB 6: FRESHNESS ANALYTICS DASHBOARD */}
          {activeTab === 'analytics' && (
            <FreshnessAnalyticsDashboard />
          )}

          {/* TAB 7: REPORTS & EXPORT CENTER (PDF & EXCEL) */}
          {activeTab === 'reports' && (
            <ReportsAndExportCenter token={token} API_BASE_URL={API_BASE_URL} />
          )}
        </>
      )}

      {/* CONSUMER ROLE VIEW: Explicitly renders the implemented view for each clicked tab */}
      {user?.role === 'Consumer' && (
        <div className="space-y-6">
          {/* TAB 1: FRESHNESS REPORTS & FRESHNESS ASSESSMENT ENGINE */}
          {activeTab === 'freshness-reports' && (
            <div>
              {/* Freshness Assessment Engine (Vision & AI Assessment) */}
              <FoodImageAnalysisEngine onInventoryUpdated={fetchStats} />
            </div>
          )}

          {/* TAB 2: SHELF-LIFE ESTIMATES */}
          {activeTab === 'shelflife-estimates' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-700 to-indigo-700 rounded-2xl p-5 text-white flex items-center gap-3 shadow-md">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <TrendingDown className="w-5 h-5 text-[#FFC700]" />
                </div>
                <div>
                  <h3 className="text-base font-black">Shelf-Life Predictor Engine</h3>
                  <p className="text-blue-100 text-xs">Estimate food freshness and expected shelf-life based on storage conditions.</p>
                </div>
              </div>
              <ShelfLifePredictorInline token={token} API_BASE_URL={API_BASE_URL} />
            </div>
          )}

          {/* TAB 3: STORAGE RECOMMENDATIONS */}
          {activeTab === 'storage-recommendations' && (
            <div className="space-y-6">
              <RecommendationEngineView />
            </div>
          )}

          {/* TAB 4: FOOD INVENTORY OVERVIEW */}
          {activeTab === 'food-inventory-overview' && (
            <div className="space-y-4">
              <InventoryManager />
            </div>
          )}
        </div>
      )}

      {/* RETAIL MANAGER ROLE VIEW: Explicitly renders the implemented view for each clicked tab */}
      {user?.role === 'Retail Manager' && (
        <div className="space-y-6">
          {/* TAB 1: PRODUCT FRESHNESS ANALYTICS */}
          {activeTab === 'retail-freshness' && (
            <div className="space-y-6">
              <FreshnessAnalyticsDashboard />
            </div>
          )}

          {/* TAB 2: INVENTORY QUALITY MONITORING */}
          {activeTab === 'retail-inventory-quality' && (
            <RetailInventoryQualityView />
          )}

          {/* TAB 3: SHELF-LIFE ALERTS */}
          {activeTab === 'retail-shelflife-alerts' && (
            <div className="space-y-6">

              {/* Shelf-Life Predictor Engine also provided for reference */}
              <div className="bg-gradient-to-r from-blue-700 to-indigo-700 rounded-2xl p-5 text-white flex items-center gap-3 shadow-md">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <TrendingDown className="w-5 h-5 text-[#FFC700]" />
                </div>
                <div>
                  <h3 className="text-base font-black">Shelf-Life Predictor Engine</h3>
                  <p className="text-blue-100 text-xs">Estimate food freshness and expected shelf-life based on retail storage conditions.</p>
                </div>
              </div>
              <ShelfLifePredictorInline token={token} API_BASE_URL={API_BASE_URL} />
            </div>
          )}

        </div>
      )}

      {/* WAREHOUSE OPERATOR ROLE VIEW: Explicitly renders the implemented view for each clicked tab */}
      {user?.role === 'Warehouse Operator' && (
        <div className="space-y-6">
          {/* TAB 1: STORAGE COMPLIANCE MONITORING */}
          {activeTab === 'warehouse-storage-compliance' && (
            <div className="space-y-6">
              {/* Storage Monitoring View */}
              <StorageMonitoringView />
            </div>
          )}

          {/* TAB 2: INVENTORY HEALTH TRACKING */}
          {activeTab === 'warehouse-inventory-health' && (
            <div className="space-y-4">
              <InventoryManager 
                title="Inventory Health Tracking"
              />
            </div>
          )}

          {/* TAB 3: BATCH FRESHNESS REPORTS */}
          {activeTab === 'warehouse-batch-reports' && (
            <div className="space-y-6">
              <FreshnessAnalyticsDashboard />
            </div>
          )}

          {/* TAB 4: ENVIRONMENTAL ANALYTICS */}
          {activeTab === 'warehouse-environmental-analytics' && (
            <div className="space-y-6">
              <EnvironmentalAnalyticsView />
            </div>
          )}
        </div>
      )}

      {/* ================= 4. ADMIN DASHBOARD TABS (Administrator & Inspector) ================= */}
      {(user?.role === 'Administrator' || user?.role === 'Food Quality Inspector') && (
        <div className="space-y-6">
          {/* TAB 1: USER MANAGEMENT */}
          {activeTab === 'admin-user-management' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-700 to-indigo-700 rounded-2xl p-5 text-white flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-[#FFC700]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black">User management</h2>
                    <p className="text-blue-100 text-xs">Manage registered users, update permissions, or toggle account status.</p>
                  </div>
                </div>
                <div className="text-xs font-bold px-3 py-1 bg-white/10 rounded-lg border border-white/20">
                  {users.length} Total Users
                </div>
              </div>

              {/* User management Section */}
              <div className="light-card p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <Users className="w-5 h-5 text-emerald-600" />
                      Platform Users Directory
                    </h3>
                    <p className="text-xs text-slate-500">Manage platform users, create new roles, or toggle account access privileges.</p>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Search users..."
                        className="light-input w-full pl-9 pr-3 py-2 rounded-xl text-xs"
                      />
                    </div>
                    {user?.role === 'Administrator' && (
                      <button
                        onClick={() => setShowAddUserModal(true)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition shadow-xs cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Add User
                      </button>
                    )}
                  </div>
                </div>

                {/* Users Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                        <th className="p-3">User ID</th>
                        <th className="p-3">Full Name</th>
                        <th className="p-3">Email Address</th>
                        <th className="p-3">Assigned Role</th>
                        <th className="p-3">Account Status</th>
                        {user?.role === 'Administrator' && <th className="p-3 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-mono text-slate-500">#{u.id}</td>
                          <td className="p-3 font-bold text-slate-900">{u.full_name}</td>
                          <td className="p-3 text-slate-600">{u.email}</td>
                          <td className="p-3">
                            <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-full font-bold text-slate-700">
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${u.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {u.is_active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          {user?.role === 'Administrator' && (
                            <td className="p-3 text-right space-x-2">
                              <select
                                value={u.role}
                                onChange={(e) => handleUpdateRole(u.id, e.target.value, u.is_active)}
                                className="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-[11px] font-semibold"
                              >
                                <option value="Consumer">Consumer</option>
                                <option value="Retail Manager">Retail Manager</option>
                                <option value="Warehouse Operator">Warehouse Operator</option>
                                <option value="Food Quality Inspector">Food Quality Inspector</option>
                                <option value="Administrator">Administrator</option>
                              </select>
                              {u.id !== user.id && (
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="p-1 text-rose-600 hover:bg-rose-50 rounded transition inline-block cursor-pointer"
                                  title="Delete user"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PLATFORM ANALYTICS */}
          {activeTab === 'admin-platform-analytics' && (
            <AdminPlatformAnalytics />
          )}

          {/* TAB 3: SYSTEM MONITORING */}
          {activeTab === 'admin-system-monitoring' && (
            <AdminSystemMonitoring />
          )}

          {/* TAB 4: REPORTING MANAGEMENT */}
          {activeTab === 'admin-reporting-management' && (
            <AdminReportingManagement />
          )}
        </div>
      )}

      {/* CREATE USER MODAL */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-slate-900">Add New System User</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="light-input w-full p-2.5 rounded-xl"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="light-input w-full p-2.5 rounded-xl"
                  placeholder="user@organization.com"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="light-input w-full p-2.5 rounded-xl"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Assign System Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="light-input w-full p-2.5 rounded-xl font-bold"
                >
                  <option value="Consumer">Consumer</option>
                  <option value="Retail Manager">Retail Manager</option>
                  <option value="Warehouse Operator">Warehouse Operator</option>
                  <option value="Food Quality Inspector">Food Quality Inspector</option>
                  <option value="Administrator">Administrator</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl shadow-xs"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification Center Modal */}
      <NotificationCenterModal
        isOpen={showNotificationModal}
        onClose={() => {
          setShowNotificationModal(false);
          fetchUnreadNotifications();
        }}
        token={token}
        user={user}
        API_BASE_URL={API_BASE_URL}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

    </div>
  );
};


const colorMap = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  teal: 'bg-teal-50 text-teal-700 border-teal-300',
  amber: 'bg-amber-50 text-amber-800 border-amber-300',
  rose: 'bg-rose-50 text-rose-700 border-rose-300',
  blue: 'bg-blue-50 text-[#0047AB] border-blue-300',
  purple: 'bg-purple-50 text-purple-700 border-purple-300',
};

const StatCard = ({ icon: Icon, label, value, color, subtext }) => (
  <div className="light-card p-5 rounded-2xl bg-white/95 border border-[#0047AB]/15 flex items-center gap-4 shadow-sm hover:shadow-md transition hover:-translate-y-0.5 border-t-2 border-t-[#FFC700]">
    <div className={`p-3.5 rounded-xl border ${colorMap[color] || colorMap.blue} shadow-2xs`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-black text-slate-900 mt-0.5">{value}</p>
      {subtext && <p className="text-xs text-slate-400 mt-0.5 font-medium">{subtext}</p>}
    </div>
  </div>
);
