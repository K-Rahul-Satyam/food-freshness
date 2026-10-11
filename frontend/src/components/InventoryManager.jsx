import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, Search, Filter, Calendar, Package, AlertTriangle, 
  CheckCircle, Trash2, Edit3, X, Apple, Carrot, Milk, 
  Fish, Drumstick, Cookie, Box, Coffee, Tag, MapPin, RefreshCw
} from 'lucide-react';

const CATEGORIES = [
  { 
    id: 'All', 
    label: 'All Items', 
    icon: Package,
    activeClass: 'bg-[#0047AB] text-white border-[#0047AB] shadow-md shadow-[#0047AB]/25',
    pillClass: 'bg-white text-slate-700 border-slate-200 hover:border-[#0047AB] hover:text-[#0047AB]'
  },
  { 
    id: 'Fruits', 
    label: 'Fruits', 
    icon: Apple,
    activeClass: 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/25',
    pillClass: 'bg-rose-50/70 text-rose-700 border-rose-200 hover:bg-rose-100 hover:border-rose-400',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    avatarBg: 'bg-rose-100 text-rose-600'
  },
  { 
    id: 'Vegetables', 
    label: 'Vegetables', 
    icon: Carrot,
    activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/25',
    pillClass: 'bg-emerald-50/70 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-400',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    avatarBg: 'bg-emerald-100 text-emerald-600'
  },
  { 
    id: 'Dairy Products', 
    label: 'Dairy Products', 
    icon: Milk,
    activeClass: 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-600/25',
    pillClass: 'bg-sky-50/70 text-sky-700 border-sky-200 hover:bg-sky-100 hover:border-sky-400',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    avatarBg: 'bg-sky-100 text-sky-600'
  },
  { 
    id: 'Meat & Poultry', 
    label: 'Meat & Poultry', 
    icon: Drumstick,
    activeClass: 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/25',
    pillClass: 'bg-red-50/70 text-red-700 border-red-200 hover:bg-red-100 hover:border-red-400',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    avatarBg: 'bg-red-100 text-red-600'
  },
  { 
    id: 'Seafood', 
    label: 'Seafood', 
    icon: Fish,
    activeClass: 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/25',
    pillClass: 'bg-teal-50/70 text-teal-700 border-teal-200 hover:bg-teal-100 hover:border-teal-400',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    avatarBg: 'bg-teal-100 text-teal-600'
  },
  { 
    id: 'Bakery Products', 
    label: 'Bakery Products', 
    icon: Cookie,
    activeClass: 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/25',
    pillClass: 'bg-amber-50/70 text-amber-800 border-amber-200 hover:bg-amber-100 hover:border-amber-400',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    avatarBg: 'bg-amber-100 text-amber-700'
  },
  { 
    id: 'Packaged Foods', 
    label: 'Packaged Foods', 
    icon: Box,
    activeClass: 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/25',
    pillClass: 'bg-purple-50/70 text-purple-700 border-purple-200 hover:bg-purple-100 hover:border-purple-400',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    avatarBg: 'bg-purple-100 text-purple-600'
  },
  { 
    id: 'Beverages', 
    label: 'Beverages', 
    icon: Coffee,
    activeClass: 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-600/25',
    pillClass: 'bg-orange-50/70 text-orange-800 border-orange-200 hover:bg-orange-100 hover:border-orange-400',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
    avatarBg: 'bg-orange-100 text-orange-600'
  },
];

const getCategoryMeta = (catName) => {
  return CATEGORIES.find(c => c.id === catName) || {
    icon: Package,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    avatarBg: 'bg-slate-100 text-slate-600'
  };
};

export const InventoryManager = ({ 
  title = "Food Inventory Management",
  subtitle = "Register items, track batch numbers, categorize foods, & manage shelf-life expiries",
  showWarehouseBadges = false
}) => {
  const { token, API_BASE_URL } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    batch_number: '',
    category: 'Fruits',
    quantity: 10,
    unit: 'units',
    storage_location: 'Zone A - Cold Storage',
    expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const fetchInventory = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/inventory?`;
      if (selectedCategory !== 'All') url += `category=${encodeURIComponent(selectedCategory)}&`;
      if (selectedStatus !== 'All') url += `status=${encodeURIComponent(selectedStatus)}&`;
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [selectedCategory, selectedStatus, searchQuery]);

  const handleGenerateBatch = () => {
    const randomCode = Math.floor(100 + Math.random() * 900);
    setFormData(prev => ({
      ...prev,
      batch_number: `BATCH-${prev.category.slice(0, 2).toUpperCase()}-${randomCode}`
    }));
  };

  const handleOpenModal = (itemToEdit = null) => {
    if (itemToEdit) {
      setEditingItem(itemToEdit);
      setFormData({
        name: itemToEdit.name,
        batch_number: itemToEdit.batch_number,
        category: itemToEdit.category,
        quantity: itemToEdit.quantity,
        unit: itemToEdit.unit,
        storage_location: itemToEdit.storage_location,
        expiry_date: new Date(itemToEdit.expiry_date).toISOString().split('T')[0]
      });
    } else {
      setEditingItem(null);
      const defaultCat = selectedCategory === 'All' ? 'Fruits' : selectedCategory;
      setFormData({
        name: '',
        batch_number: `BATCH-${defaultCat.slice(0, 2).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
        category: defaultCat,
        quantity: 10,
        unit: 'kg',
        storage_location: 'Zone A - Cold Storage',
        expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        quantity: parseFloat(formData.quantity),
        expiry_date: new Date(formData.expiry_date).toISOString()
      };

      const url = editingItem 
        ? `${API_BASE_URL}/inventory/${editingItem.id}` 
        : `${API_BASE_URL}/inventory`;
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchInventory();
      } else {
        const errorData = await res.json();
        alert(errorData.detail || 'Failed to save food item');
      }
    } catch (err) {
      console.error('Error submitting form:', err);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to remove this item from food inventory?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchInventory();
      }
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  const getDaysUntilExpiry = (expiryDateStr) => {
    const diffTime = new Date(expiryDateStr) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Expiry alert counters
  const approachingExpiryCount = items.filter(i => i.status === 'Approaching Expiry').length;
  const expiredCount = items.filter(i => i.status === 'Expired').length;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-2xl p-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20 shadow-xs">
            <Package className="w-6 h-6 text-[#FFC700]" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-white">{title}</h2>
          </div>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-5 py-2.5 bg-[#FFC700] hover:bg-amber-400 text-[#0047AB] rounded-xl font-black text-xs shadow-md border-2 border-amber-300 flex items-center gap-2 transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-[#0047AB]" />
          <span>Register Food Item</span>
        </button>
      </div>

      {/* Dynamic Visual KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="light-card p-4 rounded-2xl bg-gradient-to-br from-blue-500/15 via-white to-blue-500/5 border border-blue-200/80 shadow-xs flex items-center justify-between border-t-4 border-t-[#0047AB]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Total Registered</p>
            <h4 className="text-2xl font-black text-slate-900 mt-0.5">{items.length}</h4>
            <span className="text-[11px] text-slate-500 font-medium">Food items in inventory</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#0047AB] text-[#FFC700] border border-[#FFC700]/50 flex items-center justify-center shadow-md shadow-[#0047AB]/25 shrink-0">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="light-card p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-white to-emerald-500/5 border border-emerald-200/80 shadow-xs flex items-center justify-between border-t-4 border-t-emerald-500">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Prime Fresh</p>
            <h4 className="text-2xl font-black text-emerald-700 mt-0.5">
              {items.filter(i => i.status === 'Fresh').length}
            </h4>
            <span className="text-[11px] text-emerald-600/80 font-medium">Optimal shelf quality</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/25 shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="light-card p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 via-white to-[#FFC700]/10 border border-amber-300 shadow-xs flex items-center justify-between border-t-4 border-t-[#FFC700]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Expiring Soon</p>
            <h4 className="text-2xl font-black text-amber-700 mt-0.5">{approachingExpiryCount}</h4>
            <span className="text-[11px] text-amber-700/80 font-medium">&le; 3 days remaining</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#FFC700] text-slate-900 border border-amber-400 flex items-center justify-center shadow-md shadow-amber-500/25 shrink-0 font-black">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="light-card p-4 rounded-2xl bg-gradient-to-br from-rose-500/15 via-white to-rose-500/5 border border-rose-200/80 shadow-xs flex items-center justify-between border-t-4 border-t-rose-500">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Critical Spoilage</p>
            <h4 className="text-2xl font-black text-rose-700 mt-0.5">{expiredCount}</h4>
            <span className="text-[11px] text-rose-600/80 font-medium">Immediate quarantine</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/25 shrink-0">
            <Trash2 className="w-6 h-6" />
          </div>
        </div>
      </div>



      {/* Food Categories Selector Bar */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-2 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap transition-all shadow-xs cursor-pointer ${
                  isSelected ? cat.activeClass : cat.pillClass
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="light-card p-4 rounded-2xl bg-white border border-[#0047AB]/20 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm border-t-2 border-t-[#FFC700]">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0047AB]" />
          <input
            type="text"
            placeholder="Search item, batch #, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs border border-slate-200 bg-slate-50/70 focus:bg-white focus:ring-2 focus:ring-[#0047AB] focus:border-transparent outline-none transition"
          />
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          <span className="text-xs font-black text-slate-600 flex items-center gap-1.5 mr-1">
            <Filter className="w-3.5 h-3.5 text-[#0047AB]" /> Quality Filter:
          </span>
          {[
            { id: 'All', label: 'All', active: 'bg-[#0047AB] text-white shadow-xs border-b-2 border-[#FFC700]', inactive: 'bg-slate-100 text-slate-700 hover:bg-slate-200' },
            { id: 'Fresh', label: 'Fresh', active: 'bg-emerald-600 text-white shadow-xs', inactive: 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' },
            { id: 'Approaching Expiry', label: 'Approaching Expiry', active: 'bg-[#FFC700] text-slate-900 border border-amber-400 shadow-xs font-black', inactive: 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100' },
            { id: 'Expired', label: 'Expired', active: 'bg-rose-600 text-white shadow-xs', inactive: 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100' },
          ].map((st) => {
            const isSelected = selectedStatus === st.id;
            return (
              <button
                key={st.id}
                onClick={() => setSelectedStatus(st.id)}
                className={`px-3.5 py-1.5 rounded-xl border text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
                  isSelected ? st.active : st.inactive
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Inventory & Batch Tracking Table */}
      <div className="light-card rounded-3xl bg-white border border-[#0047AB]/20 overflow-hidden shadow-md">
        <div className="w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gradient-to-r from-slate-900 via-[#003882] to-slate-900 text-white font-black tracking-wider text-[11px] uppercase border-b-2 border-[#FFC700]">
              <tr>
                <th className="py-3.5 px-3 text-amber-300 w-[23%]">Food Item</th>
                <th className="py-3.5 px-2 text-blue-200 w-[11%]">Batch Code</th>
                <th className="py-3.5 px-2 text-amber-300 w-[13%]">Category</th>
                <th className="py-3.5 px-2 text-blue-200 w-[9%]">Stock Qty</th>
                <th className="py-3.5 px-2 text-blue-200 w-[14%]">Storage Zone</th>
                <th className="py-3.5 px-2 text-amber-300 w-[14%]">Expiry Countdown</th>
                <th className="py-3.5 px-2 text-blue-200 w-[11%]">Freshness State</th>
                <th className="py-3.5 px-3 text-right text-white w-[5%]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#0047AB] mb-2" />
                    Loading food inventory...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No food items found. Click <strong>"Register Food Item"</strong> to add items.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const daysLeft = getDaysUntilExpiry(item.expiry_date);
                  const catMeta = getCategoryMeta(item.category);
                  const CatIcon = catMeta.icon;

                  return (
                    <tr key={item.id} className="hover:bg-blue-50/40 transition-colors">
                      {/* Item Name + Vibrant Icon Avatar */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${catMeta.avatarBg} border-current/20 shadow-2xs`}>
                            <CatIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 block leading-tight truncate">{item.name}</span>
                            <span className="text-[10px] text-slate-400 font-medium block">Verified SKU</span>
                          </div>
                        </div>
                      </td>

                      {/* Batch Number */}
                      <td className="py-3 px-2 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[10px] font-bold inline-block">
                          {item.batch_number}
                        </span>
                      </td>

                      {/* Category Badge */}
                      <td className="py-3 px-2 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-extrabold whitespace-nowrap leading-none ${catMeta.badgeClass}`}>
                          {item.category}
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="py-3 px-2 whitespace-nowrap">
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs font-black text-slate-900">{item.quantity}</span>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1 py-0.2 rounded">
                            {item.unit}
                          </span>
                        </div>
                      </td>

                      {/* Storage Location */}
                      <td className="py-3 px-2 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-slate-700 font-semibold text-xs">
                          <MapPin className="w-3.5 h-3.5 text-[#0047AB] shrink-0" />
                          <span className="truncate">{item.storage_location}</span>
                        </div>
                      </td>

                      {/* Expiry Date & Countdown */}
                      <td className="py-3 px-2 whitespace-nowrap">
                        <div>
                          <p className="font-bold text-slate-800 text-xs leading-tight">{new Date(item.expiry_date).toLocaleDateString()}</p>
                          <p className="text-[10px] font-extrabold mt-0.5 leading-tight">
                            {daysLeft < 0 ? (
                               <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200 inline-block whitespace-nowrap">
                                Expired ({Math.abs(daysLeft)}d ago)
                              </span>
                            ) : daysLeft <= 3 ? (
                              <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200 inline-block whitespace-nowrap">
                                {daysLeft} day(s) left
                              </span>
                            ) : (
                              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200 inline-block whitespace-nowrap">
                                {daysLeft} day(s) left
                              </span>
                            )}
                          </p>
                        </div>
                      </td>

                      {/* Quality Status Pill */}
                      <td className="py-3 px-2 whitespace-nowrap">
                        {item.status === 'Fresh' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100/80 text-emerald-800 border border-emerald-300 shadow-2xs whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Fresh
                          </span>
                        )}
                        {item.status === 'Approaching Expiry' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100/90 text-amber-800 border border-amber-300 shadow-2xs whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Approaching Expiry
                          </span>
                        )}
                        {item.status === 'Expired' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100/90 text-rose-800 border border-rose-300 shadow-2xs whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Expired
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenModal(item)}
                            className="p-1.5 hover:bg-blue-50 text-[#0047AB] rounded-lg transition border border-transparent hover:border-blue-200 cursor-pointer"
                            title="Edit Item"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition border border-transparent hover:border-rose-200 cursor-pointer"
                            title="Delete Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REGISTRATION & EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="light-card w-full max-w-lg p-6 rounded-2xl bg-white border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" />
                {editingItem ? 'Edit Food Item & Batch' : 'Food Item Registration'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Item Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Food Item Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Organic Gala Apples"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="light-input w-full px-3.5 py-2.5 rounded-xl text-xs"
                />
              </div>

              {/* Batch Number & Generate Button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Batch / Lot Number
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateBatch}
                    className="text-[11px] font-bold text-emerald-600 hover:underline"
                  >
                    Auto-Generate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. BATCH-FR-901"
                  value={formData.batch_number}
                  onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                  className="light-input w-full px-3.5 py-2.5 rounded-xl text-xs font-mono"
                />
              </div>

              {/* Product Categorization */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Food Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="light-input w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold"
                  >
                    {CATEGORIES.filter(c => c.id !== 'All').map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Storage Location
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Zone A - Cold Storage"
                    value={formData.storage_location}
                    onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                    className="light-input w-full px-3.5 py-2.5 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Quantity & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="light-input w-full px-3.5 py-2.5 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="light-input w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold"
                  >
                    <option value="kg">kg (Kilograms)</option>
                    <option value="lbs">lbs (Pounds)</option>
                    <option value="units">units (Items)</option>
                    <option value="liters">liters (Volume)</option>
                    <option value="packs">packs (Packages)</option>
                    <option value="bottles">bottles</option>
                  </select>
                </div>
              </div>

              {/* Expiry Date Management */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  className="light-input w-full px-3.5 py-2.5 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0047AB] hover:bg-[#003785] text-white rounded-xl text-xs font-bold shadow-md shadow-[#0047AB]/20"
                >
                  {editingItem ? 'Save Changes' : 'Register Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
