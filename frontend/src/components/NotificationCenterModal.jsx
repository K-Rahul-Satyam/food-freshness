import React, { useState, useEffect } from 'react';
import { 
  Bell, AlertTriangle, ShieldAlert, Sparkles, Check, CheckCheck, 
  Trash2, RefreshCw, X, Thermometer, Clock, ShieldCheck, Info
} from 'lucide-react';

export const NotificationCenterModal = ({ isOpen, onClose, token, user, API_BASE_URL, onNavigateTab }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [scanning, setScanning] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && token) {
      fetchNotifications();
    }
  }, [isOpen, token]);

  const handleTriggerScan = async () => {
    setScanning(true);
    setStatusMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/trigger-scan`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStatusMsg(data.message);
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/mark-read/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const filteredList = notifications.filter(n => {
    if (filterType === 'all') return true;
    if (filterType === 'unread') return !n.is_read;
    return n.alert_type === filterType;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'critical':
        return <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-full bg-rose-100 text-rose-800 border border-rose-200">Critical</span>;
      case 'warning':
        return <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-full bg-amber-100 text-amber-800 border border-amber-200">Warning</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-full bg-blue-100 text-blue-800 border border-blue-200">Notice</span>;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'storage_recommendations':
      case 'warehouse_storage_compliance':
      case 'storage':
        return <Thermometer className="w-4 h-4 text-amber-500" />;
      case 'shelflife_estimates':
      case 'retail_shelflife_alerts':
      case 'shelf_life':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'food_inventory_overview':
      case 'retail_inventory_quality':
      case 'warehouse_inventory_health':
      case 'admin_user_management':
        return <ShieldCheck className="w-4 h-4 text-indigo-500" />;
      case 'freshness_reports':
      case 'retail_freshness':
      case 'warehouse_batch_reports':
      case 'freshness':
        return <Sparkles className="w-4 h-4 text-emerald-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  // Build role-specific category filters
  const getRoleFilterTabs = () => {
    const baseTabs = [
      { id: 'all', label: 'All Alerts' },
      { id: 'unread', label: `Unread (${unreadCount})` }
    ];

    if (user?.role === 'Consumer') {
      return [
        ...baseTabs,
        { id: 'freshness_reports', label: 'Freshness reports' },
        { id: 'shelflife_estimates', label: 'Shelf-life estimates' },
        { id: 'storage_recommendations', label: 'Storage recommendations' },
        { id: 'food_inventory_overview', label: 'Food inventory overview' }
      ];
    } else if (user?.role === 'Retail Manager') {
      return [
        ...baseTabs,
        { id: 'retail_freshness', label: 'Product freshness analytics' },
        { id: 'retail_inventory_quality', label: 'Inventory quality monitoring' },
        { id: 'retail_shelflife_alerts', label: 'Shelf-life alerts' }
      ];
    } else if (user?.role === 'Warehouse Operator') {
      return [
        ...baseTabs,
        { id: 'warehouse_storage_compliance', label: 'Storage compliance monitoring' },
        { id: 'warehouse_inventory_health', label: 'Inventory health tracking' },
        { id: 'warehouse_batch_reports', label: 'Batch freshness reports' },
        { id: 'warehouse_environmental_analytics', label: 'Environmental analytics' }
      ];
    } else {
      // Administrator / Food Quality Inspector
      return [
        ...baseTabs,
        { id: 'admin_user_management', label: 'User management' },
        { id: 'admin_platform_analytics', label: 'Platform analytics' },
        { id: 'admin_system_monitoring', label: 'System monitoring' },
        { id: 'admin_reporting_management', label: 'Reporting management' }
      ];
    }
  };

  const getDeepLink = (n) => {
    if (!onNavigateTab) return null;

    // Consumer Tabs
    if (n.alert_type === 'freshness_reports') {
      return { tab: 'freshness-reports', label: 'View Freshness Reports →' };
    }
    if (n.alert_type === 'shelflife_estimates') {
      return { tab: 'shelflife-estimates', label: 'Open Shelf-Life Estimates →' };
    }
    if (n.alert_type === 'storage_recommendations') {
      return { tab: 'storage-recommendations', label: 'View Storage Tips →' };
    }
    if (n.alert_type === 'food_inventory_overview') {
      return { tab: 'food-inventory-overview', label: 'Open Food Inventory →' };
    }

    // Retail Manager Tabs
    if (n.alert_type === 'retail_freshness') {
      return { tab: 'retail-freshness', label: 'View Freshness Analytics →' };
    }
    if (n.alert_type === 'retail_inventory_quality') {
      return { tab: 'retail-inventory-quality', label: 'Open Quality Monitoring →' };
    }
    if (n.alert_type === 'retail_shelflife_alerts') {
      return { tab: 'retail-shelflife-alerts', label: 'Manage Shelf-Life Alerts →' };
    }

    // Warehouse Operator Tabs
    if (n.alert_type === 'warehouse_storage_compliance') {
      return { tab: 'warehouse-storage-compliance', label: 'View Storage Compliance →' };
    }
    if (n.alert_type === 'warehouse_inventory_health') {
      return { tab: 'warehouse-inventory-health', label: 'Track Pallet Health →' };
    }
    if (n.alert_type === 'warehouse_batch_reports') {
      return { tab: 'warehouse-batch-reports', label: 'View Batch Reports →' };
    }
    if (n.alert_type === 'warehouse_environmental_analytics') {
      return { tab: 'warehouse-environmental-analytics', label: 'Open Environmental Analytics →' };
    }

    // Administrator Tabs
    if (n.alert_type === 'admin_user_management') {
      return { tab: 'admin-user-management', label: 'Manage Users →' };
    }
    if (n.alert_type === 'admin_platform_analytics') {
      return { tab: 'admin-platform-analytics', label: 'View Platform Analytics →' };
    }
    if (n.alert_type === 'admin_system_monitoring') {
      return { tab: 'admin-system-monitoring', label: 'Check System Status →' };
    }
    if (n.alert_type === 'admin_reporting_management') {
      return { tab: 'admin-reporting-management', label: 'View Compliance Reports →' };
    }

    return null;
  };

  const roleSubtitle = user?.role ? `${user.role} Dashboard Notifications` : 'Real-time account alerts';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header - Clean, Simple Navy Header */}
        <div className="bg-[#0047AB] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Bell className="w-4 h-4 text-[#FFC700]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[11px] font-bold">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-100">{roleSubtitle}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition cursor-pointer text-white/80 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Controls & Filter Pills */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2">
          {/* Top action bar */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500">Filter alerts:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleTriggerScan}
                disabled={scanning}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${scanning ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="px-2.5 py-1 bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                >
                  <CheckCheck className="w-3 h-3 text-emerald-600" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {getRoleFilterTabs().map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  filterType === tab.id
                    ? 'bg-[#0047AB] text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {statusMsg && (
          <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-700 text-xs font-medium">
            {statusMsg}
          </div>
        )}

        {/* Notifications List - Simple, Clean Cards */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0047AB]" />
              Loading notifications...
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-700 text-sm">No notifications</p>
              <p className="text-xs text-slate-400">Everything is operating safely within target ranges.</p>
            </div>
          ) : (
            filteredList.map(n => {
              const deepLink = getDeepLink(n);
              return (
                <div 
                  key={n.id}
                  className={`p-3.5 rounded-xl border transition flex items-start justify-between gap-3 ${
                    n.is_read 
                      ? 'bg-slate-50/70 border-slate-200 text-slate-600' 
                      : n.severity === 'critical'
                        ? 'bg-rose-50/60 border-rose-200 shadow-xs'
                        : n.severity === 'warning'
                          ? 'bg-amber-50/60 border-amber-200 shadow-xs'
                          : 'bg-blue-50/50 border-blue-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                      n.severity === 'critical' ? 'bg-rose-100' : n.severity === 'warning' ? 'bg-amber-100' : 'bg-blue-100'
                    }`}>
                      {getTypeIcon(n.alert_type)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900">{n.title}</h4>
                        {getSeverityBadge(n.severity)}
                        <span className="text-[10px] text-slate-400">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-normal">{n.message}</p>
                      
                      {/* Deep Link Navigation */}
                      {deepLink && (
                        <div className="pt-1">
                          <button 
                            onClick={() => { onNavigateTab(deepLink.tab); onClose(); }}
                            className="text-xs text-[#0047AB] font-semibold hover:underline inline-flex items-center gap-1"
                          >
                            {deepLink.label}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    {!n.is_read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        title="Mark as read"
                        className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(n.id)}
                      title="Dismiss"
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
          <span>Updates automatically based on real-time data.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
