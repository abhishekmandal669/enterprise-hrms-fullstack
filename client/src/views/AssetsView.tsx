import React, { useState, useEffect } from 'react';
import {
  Laptop,
  Monitor,
  Smartphone,
  Headphones,
  Armchair,
  Box,
  Plus,
  Search,
  CheckCircle2,
  Wrench,
  Archive,
  UserCheck,
  RotateCcw,
  Loader2,
  X
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { PaginationControls } from '../components/PaginationControls';
import { CustomSelect } from '../components/CustomSelect';

interface Asset {
  id: string;
  assetCode: string;
  name: string;
  category: string;
  brand?: string;
  modelNumber?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  warrantyExpiry?: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'UNDER_REPAIR' | 'RETIRED';
  condition: 'NEW' | 'GOOD' | 'FAIR' | 'DAMAGED';
  assignments?: {
    id: string;
    assignedDate: string;
    conditionOnAssign: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      employeeCode: string;
      designation: string;
      department?: { name: string };
    };
  }[];
}

interface Stats {
  total: number;
  available: number;
  assigned: number;
  underRepair: number;
  retired: number;
}

export const AssetsView: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useSocket();

  const isManagerOrAdmin = ['ADMIN', 'HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(user?.role || '');
  const isAdmin = ['ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'].includes(user?.role || '');

  // Main Data States
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, available: 0, assigned: 0, underRepair: 0, retired: 0 });
  const [loading, setLoading] = useState(false);
  const [myAssets, setMyAssets] = useState<any[]>([]);

  // Filter & Pagination States
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalEntries, setTotalEntries] = useState<number>(0);

  // Active Tab: All Assets (Admins) vs My Assigned Assets (Employees/Managers)
  const [activeTab, setActiveTab] = useState<'ALL_ASSETS' | 'MY_ASSETS'>(isAdmin ? 'ALL_ASSETS' : 'MY_ASSETS');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Eligible Users for Assignment
  const [employees, setEmployees] = useState<any[]>([]);

  // Form States
  const [newAsset, setNewAsset] = useState({
    name: '',
    category: 'LAPTOP',
    brand: '',
    modelNumber: '',
    serialNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseCost: '',
    warrantyExpiry: '',
    condition: 'NEW',
    status: 'AVAILABLE'
  });
  const [submittingAsset, setSubmittingAsset] = useState(false);

  const [assignData, setAssignData] = useState({
    userId: '',
    assignedDate: new Date().toISOString().split('T')[0],
    conditionOnAssign: 'GOOD',
    notes: ''
  });
  const [submittingAssign, setSubmittingAssign] = useState(false);

  const [returnData, setReturnData] = useState({
    returnDate: new Date().toISOString().split('T')[0],
    conditionOnReturn: 'GOOD',
    notes: ''
  });
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Fetch Assets
  const fetchAssets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());

      const res = await api.get(`/assets?${params.toString()}`);
      if (res.data.success) {
        setAssets(res.data.data);
        setTotalEntries(res.data.pagination.total);
      }
    } catch (err: any) {
      console.error('Error fetching assets:', err);
      addToast('Failed to load asset directory.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Stats
  const fetchStats = async () => {
    try {
      const res = await api.get('/assets/stats');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching asset stats:', err);
    }
  };

  // Fetch My Assigned Assets
  const fetchMyAssets = async () => {
    try {
      const res = await api.get('/assets/my-assets');
      if (res.data.success) {
        setMyAssets(res.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching my assets:', err);
    }
  };

  // Fetch Employees for assignment
  const fetchEmployees = async () => {
    try {
      const res = await api.get('/master/employees');
      if (res.data.success) {
        setEmployees(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
      fetchEmployees();
    }
    fetchMyAssets();
  }, [isAdmin]);

  useEffect(() => {
    if (activeTab === 'ALL_ASSETS' && isAdmin) {
      fetchAssets();
    }
  }, [selectedCategory, selectedStatus, page, pageSize, activeTab, isAdmin]);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'ALL_ASSETS' && isAdmin) {
        setPage(1);
        fetchAssets();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, isAdmin]);

  // Create Asset
  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.name.trim()) {
      addToast('Asset name is required.', 'error');
      return;
    }
    try {
      setSubmittingAsset(true);
      const res = await api.post('/assets', newAsset);
      if (res.data.success) {
        addToast('Asset created successfully in inventory.', 'success');
        setIsAddModalOpen(false);
        setNewAsset({
          name: '',
          category: 'LAPTOP',
          brand: '',
          modelNumber: '',
          serialNumber: '',
          purchaseDate: new Date().toISOString().split('T')[0],
          purchaseCost: '',
          warrantyExpiry: '',
          condition: 'NEW',
          status: 'AVAILABLE'
        });
        fetchAssets();
        fetchStats();
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to create asset.', 'error');
    } finally {
      setSubmittingAsset(false);
    }
  };

  // Assign Asset
  const handleAssignAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !assignData.userId) {
      addToast('Please select an employee.', 'error');
      return;
    }
    try {
      setSubmittingAssign(true);
      const res = await api.post(`/assets/${selectedAsset.id}/assign`, assignData);
      if (res.data.success) {
        addToast(`Asset ${selectedAsset.assetCode} assigned successfully.`, 'success');
        setIsAssignModalOpen(false);
        setSelectedAsset(null);
        setAssignData({
          userId: '',
          assignedDate: new Date().toISOString().split('T')[0],
          conditionOnAssign: 'GOOD',
          notes: ''
        });
        fetchAssets();
        fetchStats();
        fetchMyAssets();
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to assign asset.', 'error');
    } finally {
      setSubmittingAssign(false);
    }
  };

  // Return Asset
  const handleReturnAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    try {
      setSubmittingReturn(true);
      const res = await api.post(`/assets/${selectedAsset.id}/return`, returnData);
      if (res.data.success) {
        addToast(res.data.message || 'Asset returned successfully.', 'success');
        setIsReturnModalOpen(false);
        setSelectedAsset(null);
        setReturnData({
          returnDate: new Date().toISOString().split('T')[0],
          conditionOnReturn: 'GOOD',
          notes: ''
        });
        fetchAssets();
        fetchStats();
        fetchMyAssets();
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to return asset.', 'error');
    } finally {
      setSubmittingReturn(false);
    }
  };

  // Helper for Category Icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'LAPTOP':
        return <Laptop className="w-4 h-4 text-blue-500" />;
      case 'MONITOR':
        return <Monitor className="w-4 h-4 text-indigo-500" />;
      case 'MOBILE_PHONE':
        return <Smartphone className="w-4 h-4 text-emerald-500" />;
      case 'ACCESSORY':
        return <Headphones className="w-4 h-4 text-purple-500" />;
      case 'FURNITURE':
        return <Armchair className="w-4 h-4 text-amber-500" />;
      default:
        return <Box className="w-4 h-4 text-slate-400" />;
    }
  };

  // Helper for Status Badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> In Stock
          </span>
        );
      case 'ASSIGNED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
            <UserCheck className="w-3 h-3" /> Allocated
          </span>
        );
      case 'UNDER_REPAIR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <Wrench className="w-3 h-3" /> In Repair
          </span>
        );
      case 'RETIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <Archive className="w-3 h-3" /> Retired
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {isAdmin ? 'Asset Management & Hardware Registry' : 'My Company Assets'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isAdmin
              ? 'Track company hardware inventory, employee allocations, lifecycle condition, and return status.'
              : 'View official company laptops, monitors, and equipment allocated to you.'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-500/20 transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add New Asset
          </button>
        )}
      </div>

      {/* KPI Stats Cards - Admin Only */}
      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Registry</span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <Box className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono-num text-slate-800 dark:text-slate-100">{stats.total}</span>
              <span className="text-[11px] text-slate-400">Hardware units</span>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Allocations</span>
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono-num text-indigo-600 dark:text-indigo-400">{stats.assigned}</span>
              <span className="text-[11px] text-slate-400">Assigned to staff</span>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Available in Stock</span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono-num text-emerald-600 dark:text-emerald-400">{stats.available}</span>
              <span className="text-[11px] text-slate-400">Ready to deploy</span>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Maintenance / Repair</span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                <Wrench className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono-num text-amber-600 dark:text-amber-400">{stats.underRepair}</span>
              <span className="text-[11px] text-slate-400">Under service</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab Switcher - Only shown if Admin */}
      {isAdmin && (
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('ALL_ASSETS')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'ALL_ASSETS'
                ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Company Hardware Directory ({stats.total})
          </button>

          <button
            onClick={() => setActiveTab('MY_ASSETS')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'MY_ASSETS'
                ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            My Allocated Assets ({myAssets.length})
          </button>
        </div>
      )}

      {activeTab === 'ALL_ASSETS' ? (
        <div className="space-y-4">
          {/* Controls Bar: Search & Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search code, asset name, serial, brand..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {/* Category Filter */}
              <div className="w-[155px]">
                <CustomSelect
                  value={selectedCategory}
                  onChange={(val) => {
                    setSelectedCategory(val);
                    setPage(1);
                  }}
                  size="sm"
                  options={[
                    { value: 'ALL', label: 'All Categories' },
                    { value: 'LAPTOP', label: 'Laptops' },
                    { value: 'MONITOR', label: 'Monitors' },
                    { value: 'MOBILE_PHONE', label: 'Mobile Phones' },
                    { value: 'ACCESSORY', label: 'Accessories' },
                    { value: 'FURNITURE', label: 'Furniture' },
                    { value: 'OTHER', label: 'Other Equipment' },
                  ]}
                />
              </div>

              {/* Status Filter */}
              <div className="w-[155px]">
                <CustomSelect
                  value={selectedStatus}
                  onChange={(val) => {
                    setSelectedStatus(val);
                    setPage(1);
                  }}
                  size="sm"
                  options={[
                    { value: 'ALL', label: 'All Statuses' },
                    { value: 'AVAILABLE', label: 'Available (In Stock)' },
                    { value: 'ASSIGNED', label: 'Assigned (Allocated)' },
                    { value: 'MAINTENANCE', label: 'In Maintenance' },
                    { value: 'RETIRED', label: 'Retired (Archived)' },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Asset Code & Item</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Brand / Serial No</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Condition</th>
                    <th className="py-3 px-4">Allocated To</th>
                    {isManagerOrAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                        Loading assets registry...
                      </td>
                    </tr>
                  ) : assets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No company assets found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    assets.map((asset) => {
                      const activeAssignment = asset.assignments?.[0];
                      return (
                        <tr key={asset.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {getCategoryIcon(asset.category)}
                              </div>
                              <div>
                                <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block">
                                  {asset.assetCode}
                                </span>
                                <strong className="font-semibold text-slate-800 dark:text-slate-100">
                                  {asset.name}
                                </strong>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                            {asset.category.replace('_', ' ')}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-slate-700 dark:text-slate-200 font-medium">
                              {asset.brand || '—'} {asset.modelNumber ? `(${asset.modelNumber})` : ''}
                            </div>
                            <span className="font-mono text-[10px] text-slate-400">
                              SN: {asset.serialNumber || 'N/A'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            {getStatusBadge(asset.status)}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {asset.condition}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            {activeAssignment ? (
                              <div>
                                <strong className="font-semibold text-slate-800 dark:text-slate-100 block">
                                  {activeAssignment.user.firstName} {activeAssignment.user.lastName}
                                </strong>
                                <span className="text-[10px] text-slate-400">
                                  {activeAssignment.user.employeeCode} · {activeAssignment.user.department?.name || 'Staff'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Unassigned (In Pool)</span>
                            )}
                          </td>

                          {isManagerOrAdmin && (
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {asset.status === 'AVAILABLE' && (
                                  <button
                                    onClick={() => {
                                      setSelectedAsset(asset);
                                      setIsAssignModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 rounded-lg transition"
                                  >
                                    Assign
                                  </button>
                                )}

                                {asset.status === 'ASSIGNED' && (
                                  <button
                                    onClick={() => {
                                      setSelectedAsset(asset);
                                      setIsReturnModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 text-xs font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 rounded-lg transition"
                                  >
                                    Return
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (10, 25, 50, 100) */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800">
              <PaginationControls
                currentPage={page}
                pageSize={pageSize}
                totalEntries={totalEntries}
                onPageChange={(newPage) => setPage(newPage)}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setPage(1);
                }}
                pageSizeOptions={[10, 25, 50, 100]}
              />
            </div>
          </div>
        </div>
      ) : (
        /* My Assigned Assets Tab */
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Company Assets Assigned to You
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              You are officially responsible for the care and security of the following hardware and peripherals.
            </p>

            {myAssets.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <Box className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No company assets assigned to your profile.</p>
                <span className="text-xs text-slate-400">If you have received physical equipment, please notify IT/HR to allocate it in registry.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myAssets.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                          {getCategoryIcon(item.asset.category)}
                        </div>
                        <div>
                          <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block">
                            {item.asset.assetCode}
                          </span>
                          <strong className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                            {item.asset.name}
                          </strong>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
                        Allocated
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Brand / Model:</span>
                        <span>{item.asset.brand || 'Standard'} {item.asset.modelNumber || ''}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Serial Number:</span>
                        <span className="font-mono text-[11px]">{item.asset.serialNumber || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Allocated On:</span>
                        <span>{item.assignedDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Handover Condition:</span>
                        <span>{item.conditionOnAssign}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1. Modal: Add New Asset */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Hardware Asset</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Register new equipment in the central corporate inventory.</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Asset Name / Description *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MacBook Pro 16 M2 Max, Dell 27 4K Monitor"
                    value={newAsset.name}
                    onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={newAsset.category}
                    onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="LAPTOP">Laptop</option>
                    <option value="MONITOR">Monitor</option>
                    <option value="MOBILE_PHONE">Mobile Phone</option>
                    <option value="ACCESSORY">Accessory / Peripherals</option>
                    <option value="FURNITURE">Office Furniture</option>
                    <option value="OTHER">Other Equipment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Brand / Manufacturer
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Apple, Dell, Lenovo, LG"
                    value={newAsset.brand}
                    onChange={(e) => setNewAsset({ ...newAsset, brand: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Model Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. A2780, U2723QE"
                    value={newAsset.modelNumber}
                    onChange={(e) => setNewAsset({ ...newAsset, modelNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. C02G89XMD6T5"
                    value={newAsset.serialNumber}
                    onChange={(e) => setNewAsset({ ...newAsset, serialNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Purchase Cost (₹ INR)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 150000"
                    value={newAsset.purchaseCost}
                    onChange={(e) => setNewAsset({ ...newAsset, purchaseCost: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Condition
                  </label>
                  <select
                    value={newAsset.condition}
                    onChange={(e) => setNewAsset({ ...newAsset, condition: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="NEW">Brand New</option>
                    <option value="GOOD">Good / Tested</option>
                    <option value="FAIR">Fair / Minor Wear</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAsset}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-500/20 transition disabled:opacity-50"
                >
                  {submittingAsset ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Assign Asset */}
      {isAssignModalOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Allocate Asset</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Assign <span className="font-mono text-indigo-600 font-bold">{selectedAsset.assetCode}</span> to staff member.
                </p>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignAsset} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Employee *
                </label>
                <select
                  required
                  value={assignData.userId}
                  onChange={(e) => setAssignData({ ...assignData, userId: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode} - {emp.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Handover Date *
                </label>
                <input
                  type="date"
                  required
                  value={assignData.assignedDate}
                  onChange={(e) => setAssignData({ ...assignData, assignedDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Condition at Handover
                </label>
                <select
                  value={assignData.conditionOnAssign}
                  onChange={(e) => setAssignData({ ...assignData, conditionOnAssign: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none"
                >
                  <option value="NEW">Brand New (Sealed)</option>
                  <option value="GOOD">Good / Clean Working</option>
                  <option value="FAIR">Fair (Minor cosmetic wear)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Handover Notes / Accessories Provided
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Includes charger, USB-C adapter, laptop sleeve..."
                  value={assignData.notes}
                  onChange={(e) => setAssignData({ ...assignData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAssign}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-500/20 transition disabled:opacity-50"
                >
                  {submittingAssign ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  Confirm Handover
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Return Asset */}
      {isReturnModalOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Process Asset Return</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Receive equipment <span className="font-mono text-indigo-600 font-bold">{selectedAsset.assetCode}</span> back into pool.
                </p>
              </div>
              <button
                onClick={() => setIsReturnModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReturnAsset} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Return Date *
                </label>
                <input
                  type="date"
                  required
                  value={returnData.returnDate}
                  onChange={(e) => setReturnData({ ...returnData, returnDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Condition at Return *
                </label>
                <select
                  value={returnData.conditionOnReturn}
                  onChange={(e) => setReturnData({ ...returnData, conditionOnReturn: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none"
                >
                  <option value="GOOD">Good / Fully Functional</option>
                  <option value="FAIR">Fair / Minor Scratches</option>
                  <option value="DAMAGED">Damaged / Requires Repair (Send to Service)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Inspection Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Inspected, screen intact, charger received, wiped clean..."
                  value={returnData.notes}
                  onChange={(e) => setReturnData({ ...returnData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReturn}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm shadow-amber-500/20 transition disabled:opacity-50"
                >
                  {submittingReturn ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  Complete Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
