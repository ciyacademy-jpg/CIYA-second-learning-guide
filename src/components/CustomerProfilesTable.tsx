import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  Download, 
  X, 
  CheckCircle2, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  Clock, 
  HeartHandshake, 
  Sparkles, 
  ShieldCheck, 
  ShoppingBag, 
  Users, 
  FileText, 
  RotateCcw,
  LayoutGrid,
  List,
  Copy,
  Check
} from 'lucide-react';
import { UserProfileData } from '../types';
import { PLACEHOLDER_CUSTOMER_PROFILES } from '../data/placeholderUsers';

interface CustomerProfilesTableProps {
  onSelectCustomer?: (customer: UserProfileData) => void;
}

type ViewMode = 'grid' | 'table';
type SortField = 'fullName' | 'completedAt' | 'ordersCount' | 'totalSpent' | 'state';
type SortDirection = 'asc' | 'desc';

export default function CustomerProfilesTable({ onSelectCustomer }: CustomerProfilesTableProps) {
  const [profiles] = useState<UserProfileData[]>(() => {
    try {
      const stored = localStorage.getItem('freshbasket_admin_all_profiles');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length >= 30) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return PLACEHOLDER_CUSTOMER_PROFILES;
  });

  // Presentation View Mode
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState<string>('All');
  const [selectedDietary, setSelectedDietary] = useState<string>('All');
  const [selectedWindow, setSelectedWindow] = useState<string>('All');
  const [selectedTier, setSelectedTier] = useState<string>('All');

  // Quick Cohort Preset Filter
  const [activeCohort, setActiveCohort] = useState<string>('all');

  // Sorting State
  const [sortField, setSortField] = useState<SortField>('completedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(24);

  // Selected Profile for Detail Modal & Inline Row Expansion
  const [inspectingProfile, setInspectingProfile] = useState<UserProfileData | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Copy Feedback Tracking
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(prev => (prev === key ? null : prev));
    }, 2000);
  };

  const toggleRowExpansion = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRows(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Available unique filter values derived from data
  const stateOptions = useMemo(() => {
    const states = Array.from(new Set(profiles.map(p => p.state))).filter(Boolean);
    return ['All', ...states.sort()];
  }, [profiles]);

  const dietaryOptions = useMemo(() => {
    const options = Array.from(new Set(profiles.map(p => p.dietaryPreference))).filter(Boolean);
    return ['All', ...options.sort()];
  }, [profiles]);

  const windowOptions = useMemo(() => {
    const options = Array.from(new Set(profiles.map(p => p.favoriteCategory))).filter(Boolean);
    return ['All', ...options.sort()];
  }, [profiles]);

  const tierOptions = useMemo(() => {
    const options = Array.from(new Set(profiles.map(p => p.membershipTier))).filter(Boolean) as string[];
    return ['All', ...options.sort()];
  }, [profiles]);

  // Handle Quick Cohort Filter Click
  const handleSelectCohort = (cohort: string) => {
    setActiveCohort(cohort);
    setCurrentPage(1);
    switch (cohort) {
      case 'all':
        setSelectedState('All');
        setSelectedDietary('All');
        setSelectedWindow('All');
        setSelectedTier('All');
        break;
      case 'lagos':
        setSelectedState('Lagos State');
        setSelectedDietary('All');
        setSelectedWindow('All');
        setSelectedTier('All');
        break;
      case 'abuja':
        setSelectedState('Abuja FCT');
        setSelectedDietary('All');
        setSelectedWindow('All');
        setSelectedTier('All');
        break;
      case 'rivers':
        setSelectedState('Rivers State');
        setSelectedDietary('All');
        setSelectedWindow('All');
        setSelectedTier('All');
        break;
      case 'oyo':
        setSelectedState('Oyo State');
        setSelectedDietary('All');
        setSelectedWindow('All');
        setSelectedTier('All');
        break;
      case 'vip':
        setSelectedTier('Gold VIP');
        setSelectedState('All');
        setSelectedDietary('All');
        setSelectedWindow('All');
        break;
      case 'organic':
        setSelectedDietary('Farm-Fresh Organic & Zero Preservatives');
        setSelectedState('All');
        setSelectedWindow('All');
        setSelectedTier('All');
        break;
      case 'morning':
        setSelectedWindow('Morning Priority (8:00 AM - 12:00 PM)');
        setSelectedState('All');
        setSelectedDietary('All');
        setSelectedTier('All');
        break;
      default:
        break;
    }
  };

  // Handle Sort Toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Filter & Search Logic
  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => {
      // Search matching across all questionnaire fields
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.fullName.toLowerCase().includes(q);
        const matchesEmail = p.email.toLowerCase().includes(q);
        const matchesPhone = p.phoneNumber.toLowerCase().includes(q);
        const matchesCity = p.cityArea.toLowerCase().includes(q);
        const matchesState = p.state.toLowerCase().includes(q);
        const matchesStreet = p.streetAddress.toLowerCase().includes(q);
        const matchesNotes = p.deliveryNotes?.toLowerCase().includes(q) || false;
        const matchesDiet = p.dietaryPreference.toLowerCase().includes(q);
        const matchesWindow = p.favoriteCategory.toLowerCase().includes(q);
        const matchesTier = p.membershipTier?.toLowerCase().includes(q) || false;

        if (!matchesName && !matchesEmail && !matchesPhone && !matchesCity && !matchesState && !matchesStreet && !matchesNotes && !matchesDiet && !matchesWindow && !matchesTier) {
          return false;
        }
      }

      // State Filter
      if (selectedState !== 'All' && p.state !== selectedState) {
        return false;
      }

      // Dietary Filter
      if (selectedDietary !== 'All' && p.dietaryPreference !== selectedDietary) {
        return false;
      }

      // Delivery Window Filter
      if (selectedWindow !== 'All' && p.favoriteCategory !== selectedWindow) {
        return false;
      }

      // Membership Tier Filter
      if (selectedTier !== 'All' && p.membershipTier !== selectedTier) {
        return false;
      }

      return true;
    });
  }, [profiles, searchQuery, selectedState, selectedDietary, selectedWindow, selectedTier]);

  // Sort Logic
  const sortedProfiles = useMemo(() => {
    const sorted = [...filteredProfiles];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'fullName':
          comparison = a.fullName.localeCompare(b.fullName);
          break;
        case 'state':
          comparison = (a.state + a.cityArea).localeCompare(b.state + b.cityArea);
          break;
        case 'ordersCount':
          comparison = (a.ordersCount || 0) - (b.ordersCount || 0);
          break;
        case 'totalSpent':
          comparison = (a.totalSpent || 0) - (b.totalSpent || 0);
          break;
        case 'completedAt':
        default:
          comparison = new Date(a.updatedAt || a.completedAt).getTime() - new Date(b.updatedAt || b.completedAt).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [filteredProfiles, sortField, sortDirection]);

  // Pagination calculations
  const totalItems = sortedProfiles.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  
  const paginatedProfiles = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    return sortedProfiles.slice(startIndex, startIndex + pageSize);
  }, [sortedProfiles, safePage, pageSize]);

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedState('All');
    setSelectedDietary('All');
    setSelectedWindow('All');
    setSelectedTier('All');
    setActiveCohort('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery !== '' || selectedState !== 'All' || selectedDietary !== 'All' || selectedWindow !== 'All' || selectedTier !== 'All';

  // Export filtered dataset to CSV
  const handleExportCSV = () => {
    const headers = [
      'User ID',
      'Full Name',
      'Email',
      'Phone Number',
      'State',
      'City / Area',
      'Street Address',
      'Delivery Notes / Security Clearance',
      'Dietary Sourcing Focus',
      'Preferred Delivery Window',
      'Membership Tier',
      'Orders Count',
      'Total Spent (NGN)',
      'Questionnaire Completed At'
    ];

    const rows = sortedProfiles.map(p => [
      `"${p.userId}"`,
      `"${p.fullName.replace(/"/g, '""')}"`,
      `"${p.email}"`,
      `"${p.phoneNumber}"`,
      `"${p.state}"`,
      `"${p.cityArea}"`,
      `"${p.streetAddress.replace(/"/g, '""')}"`,
      `"${(p.deliveryNotes || '').replace(/"/g, '""')}"`,
      `"${p.dietaryPreference.replace(/"/g, '""')}"`,
      `"${p.favoriteCategory.replace(/"/g, '""')}"`,
      `"${p.membershipTier || 'Verified Shopper'}"`,
      p.ordersCount || 0,
      p.totalSpent || 0,
      `"${p.completedAt}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `freshbasket_customer_questionnaires_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // High-level summary metrics
  const totalRevenue = useMemo(() => profiles.reduce((sum, p) => sum + (p.totalSpent || 0), 0), [profiles]);
  const totalOrders = useMemo(() => profiles.reduce((sum, p) => sum + (p.ordersCount || 0), 0), [profiles]);
  const vipCount = useMemo(() => profiles.filter(p => p.membershipTier === 'Gold VIP').length, [profiles]);

  return (
    <div className="w-full p-5 sm:p-7 flex flex-col space-y-6 text-white pb-16">
      
      {/* Super Admin Section Header Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/15 via-[#0d2a1a] to-[#071d11] border border-amber-500/35 p-5 sm:p-6 rounded-3xl shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/25 text-amber-300 border border-amber-500/40">
              Super Admin Control
            </span>
            <span className="text-xs text-amber-200/80 font-semibold">• 30 Verified Customer Questionnaires</span>
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> 100% Onboarded
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
            <Users className="h-6 w-6 text-amber-400 shrink-0" />
            <span>Customer Profiles & Questionnaire Directory</span>
          </h2>
          <p className="text-xs sm:text-sm text-white/80 max-w-3xl leading-relaxed">
            Administrative registry of all 30 consumer profiles created from the delivery onboarding questionnaire. Inspect verified addresses, gate security instructions, dietary preferences, and dispatch schedules.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {/* View Mode Switcher Toggle */}
          <div className="flex items-center bg-black/40 border border-white/15 rounded-2xl p-1 shadow-inner">
            <button
              onClick={() => {
                setViewMode('grid');
                setPageSize(12);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-amber-500 text-black shadow'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              title="Rich Grid Cards View (Best for readability)"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Cards View</span>
            </button>
            <button
              onClick={() => {
                setViewMode('table');
                setPageSize(10);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-amber-500 text-black shadow'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              title="Dense Data Table View with inline row expander"
            >
              <List className="h-3.5 w-3.5" />
              <span>Table View</span>
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-2 shadow-lg transition cursor-pointer"
            title="Download customer questionnaire responses as a spreadsheet"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV ({filteredProfiles.length})</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-1 hover:bg-white/[0.07] transition shadow-md">
          <span className="text-[11px] text-white/50 font-bold uppercase tracking-wider block">Customer Base</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{profiles.length}</span>
            <span className="text-[11px] text-emerald-400 font-bold">Profiles</span>
          </div>
          <span className="text-[10px] text-white/40 block">Across 4 Nigerian States</span>
        </div>

        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-1 hover:bg-white/[0.07] transition shadow-md">
          <span className="text-[11px] text-white/50 font-bold uppercase tracking-wider block">Cumulative Spend</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">₦{totalRevenue.toLocaleString()}</span>
          </div>
          <span className="text-[10px] text-emerald-300/70 block">Direct Farm Dispatches</span>
        </div>

        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-1 hover:bg-white/[0.07] transition shadow-md">
          <span className="text-[11px] text-white/50 font-bold uppercase tracking-wider block">Total Orders</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{totalOrders}</span>
            <span className="text-[11px] text-white/50 font-medium">Baskets</span>
          </div>
          <span className="text-[10px] text-white/40 block">Avg. {(totalOrders / profiles.length).toFixed(1)} orders / customer</span>
        </div>

        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-1 hover:bg-white/[0.07] transition shadow-md">
          <span className="text-[11px] text-white/50 font-bold uppercase tracking-wider block">Gold VIP Cohort</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-300">{vipCount}</span>
            <span className="text-[11px] text-amber-200/70 font-semibold">Priority</span>
          </div>
          <span className="text-[10px] text-white/40 block">Highest frequency shoppers</span>
        </div>
      </div>

      {/* Quick Cohort Preset Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-white/40 font-bold text-[11px] uppercase tracking-wider mr-1 shrink-0">Quick Filter:</span>
        <button
          onClick={() => handleSelectCohort('all')}
          className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition cursor-pointer border ${
            activeCohort === 'all'
              ? 'bg-amber-500 text-black border-amber-400 shadow'
              : 'bg-white/5 text-white/70 hover:text-white border-white/10 hover:bg-white/10'
          }`}
        >
          All (30)
        </button>
        <button
          onClick={() => handleSelectCohort('lagos')}
          className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition cursor-pointer border ${
            activeCohort === 'lagos'
              ? 'bg-amber-500 text-black border-amber-400 shadow'
              : 'bg-white/5 text-white/70 hover:text-white border-white/10 hover:bg-white/10'
          }`}
        >
          📍 Lagos State ({profiles.filter(p => p.state === 'Lagos State').length})
        </button>
        <button
          onClick={() => handleSelectCohort('abuja')}
          className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition cursor-pointer border ${
            activeCohort === 'abuja'
              ? 'bg-amber-500 text-black border-amber-400 shadow'
              : 'bg-white/5 text-white/70 hover:text-white border-white/10 hover:bg-white/10'
          }`}
        >
          📍 Abuja FCT ({profiles.filter(p => p.state === 'Abuja FCT').length})
        </button>
        <button
          onClick={() => handleSelectCohort('rivers')}
          className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition cursor-pointer border ${
            activeCohort === 'rivers'
              ? 'bg-amber-500 text-black border-amber-400 shadow'
              : 'bg-white/5 text-white/70 hover:text-white border-white/10 hover:bg-white/10'
          }`}
        >
          📍 Rivers State ({profiles.filter(p => p.state === 'Rivers State').length})
        </button>
        <button
          onClick={() => handleSelectCohort('oyo')}
          className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition cursor-pointer border ${
            activeCohort === 'oyo'
              ? 'bg-amber-500 text-black border-amber-400 shadow'
              : 'bg-white/5 text-white/70 hover:text-white border-white/10 hover:bg-white/10'
          }`}
        >
          📍 Oyo State ({profiles.filter(p => p.state === 'Oyo State').length})
        </button>
        <button
          onClick={() => handleSelectCohort('vip')}
          className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition cursor-pointer border ${
            activeCohort === 'vip'
              ? 'bg-amber-500 text-black border-amber-400 shadow'
              : 'bg-white/5 text-white/70 hover:text-white border-white/10 hover:bg-white/10'
          }`}
        >
          👑 Gold VIP ({vipCount})
        </button>
        <button
          onClick={() => handleSelectCohort('organic')}
          className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition cursor-pointer border ${
            activeCohort === 'organic'
              ? 'bg-amber-500 text-black border-amber-400 shadow'
              : 'bg-white/5 text-white/70 hover:text-white border-white/10 hover:bg-white/10'
          }`}
        >
          🌿 Farm Organic ({profiles.filter(p => p.dietaryPreference.includes('Organic')).length})
        </button>
        <button
          onClick={() => handleSelectCohort('morning')}
          className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition cursor-pointer border ${
            activeCohort === 'morning'
              ? 'bg-amber-500 text-black border-amber-400 shadow'
              : 'bg-white/5 text-white/70 hover:text-white border-white/10 hover:bg-white/10'
          }`}
        >
          ⏰ Morning Window ({profiles.filter(p => p.favoriteCategory.includes('Morning')).length})
        </button>
      </div>

      {/* Search & Filter Controls Bar */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-3xl space-y-4 shadow-lg">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Live Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Live search by name, email, phone, street, gate code, dietary preference, or notes..."
              className="w-full bg-stone-900/95 border border-white/15 rounded-2xl pl-11 pr-10 py-3 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1.5 rounded-lg hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-4 py-3 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shrink-0 shadow"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-3 border-t border-white/10">
          {/* State Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-white/70 block flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-amber-400" />
              <span>State / Region</span>
            </label>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setActiveCohort('custom');
                setCurrentPage(1);
              }}
              className="w-full bg-[#11271b] border border-white/15 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer shadow-sm"
            >
              {stateOptions.map(st => (
                <option key={st} value={st}>{st === 'All' ? 'All States (4 Regions)' : st}</option>
              ))}
            </select>
          </div>

          {/* Dietary Focus Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-white/70 block flex items-center gap-1.5">
              <HeartHandshake className="h-3.5 w-3.5 text-emerald-400" />
              <span>Dietary Sourcing Focus</span>
            </label>
            <select
              value={selectedDietary}
              onChange={(e) => {
                setSelectedDietary(e.target.value);
                setActiveCohort('custom');
                setCurrentPage(1);
              }}
              className="w-full bg-[#11271b] border border-white/15 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer shadow-sm"
            >
              {dietaryOptions.map(diet => (
                <option key={diet} value={diet}>{diet === 'All' ? 'All Dietary Focuses' : diet}</option>
              ))}
            </select>
          </div>

          {/* Preferred Delivery Window Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-white/70 block flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-blue-400" />
              <span>Preferred Delivery Window</span>
            </label>
            <select
              value={selectedWindow}
              onChange={(e) => {
                setSelectedWindow(e.target.value);
                setActiveCohort('custom');
                setCurrentPage(1);
              }}
              className="w-full bg-[#11271b] border border-white/15 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer shadow-sm"
            >
              {windowOptions.map(win => (
                <option key={win} value={win}>{win === 'All' ? 'All Time Windows' : win}</option>
              ))}
            </select>
          </div>

          {/* Membership Tier Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-white/70 block flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Membership Tier</span>
            </label>
            <select
              value={selectedTier}
              onChange={(e) => {
                setSelectedTier(e.target.value);
                setActiveCohort('custom');
                setCurrentPage(1);
              }}
              className="w-full bg-[#11271b] border border-white/15 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer shadow-sm"
            >
              {tierOptions.map(tier => (
                <option key={tier} value={tier}>{tier === 'All' ? 'All Membership Tiers' : tier}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Sorting & Result Count Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
        <div className="text-xs text-white/80">
          Displaying <b className="text-white font-mono text-sm">{filteredProfiles.length === 0 ? 0 : (safePage - 1) * pageSize + 1}</b> - <b className="text-white font-mono text-sm">{Math.min(safePage * pageSize, filteredProfiles.length)}</b> of <b className="text-amber-300 font-mono text-sm">{filteredProfiles.length}</b> customer profiles
          {hasActiveFilters && (
            <span className="ml-2 text-amber-300/90 font-medium">(filtered from {profiles.length} total)</span>
          )}
        </div>

        {/* Quick Sorting & Page Size Controls */}
        <div className="flex items-center gap-3 text-xs flex-wrap">
          {/* Quick Sort Dropdown */}
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-xl">
            <span className="text-white/50 text-[11px]">Sort:</span>
            <select
              value={`${sortField}-${sortDirection}`}
              onChange={(e) => {
                const [f, d] = e.target.value.split('-') as [SortField, SortDirection];
                setSortField(f);
                setSortDirection(d);
                setCurrentPage(1);
              }}
              className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer"
            >
              <option value="completedAt-desc" className="bg-stone-900">Newest First</option>
              <option value="completedAt-asc" className="bg-stone-900">Oldest First</option>
              <option value="fullName-asc" className="bg-stone-900">Name (A-Z)</option>
              <option value="fullName-desc" className="bg-stone-900">Name (Z-A)</option>
              <option value="totalSpent-desc" className="bg-stone-900">Spend: High to Low</option>
              <option value="totalSpent-asc" className="bg-stone-900">Spend: Low to High</option>
              <option value="ordersCount-desc" className="bg-stone-900">Orders: High to Low</option>
              <option value="state-asc" className="bg-stone-900">Region / State</option>
            </select>
          </div>

          {/* Rows per page */}
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-xl">
            <span className="text-white/50 text-[11px]">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer"
            >
              <option value={6} className="bg-stone-900">6</option>
              <option value={10} className="bg-stone-900">10</option>
              <option value={12} className="bg-stone-900">12</option>
              <option value={24} className="bg-stone-900">24</option>
              <option value={30} className="bg-stone-900">All 30</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. RICH GRID CARDS VIEW (Elevated, Spacious, Easy-to-read Layout) */}
      {/* ========================================================================= */}
      {viewMode === 'grid' && (
        <>
          {paginatedProfiles.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center text-white/60 space-y-3">
              <FileText className="h-12 w-12 text-white/20 mx-auto" />
              <p className="font-bold text-base text-white">No customer profiles match your search criteria.</p>
              <p className="text-xs text-white/50">Try clearing keywords or resetting active filter selections.</p>
              <button
                onClick={resetFilters}
                className="mt-2 px-5 py-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-xs inline-flex items-center gap-2 hover:bg-amber-500/30 transition cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset All Filters</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginatedProfiles.map((p) => {
                const initials = p.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                const isVip = p.membershipTier === 'Gold VIP';

                return (
                  <div
                    key={p.userId}
                    onClick={() => {
                      setInspectingProfile(p);
                      if (onSelectCustomer) onSelectCustomer(p);
                    }}
                    className={`group relative bg-[#091b11]/90 hover:bg-[#0d2618] border transition-all duration-200 rounded-3xl p-5 shadow-xl flex flex-col justify-between cursor-pointer space-y-4 ${
                      isVip
                        ? 'border-amber-500/40 hover:border-amber-400'
                        : 'border-white/10 hover:border-emerald-500/40'
                    }`}
                  >
                    {/* Top Row: Avatar, Name, Tier Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-md shrink-0 border ${
                          isVip 
                            ? 'bg-gradient-to-br from-amber-500 to-amber-700 border-amber-300/40 text-black' 
                            : 'bg-gradient-to-br from-emerald-600 to-teal-800 border-emerald-400/30'
                        }`}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-extrabold text-sm sm:text-base text-white group-hover:text-amber-300 transition-colors truncate">
                              {p.fullName}
                            </h3>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" title="Verified Questionnaire" />
                          </div>
                          <span className="text-[10px] font-mono text-white/50 block truncate">
                            ID: {p.userId}
                          </span>
                        </div>
                      </div>

                      {/* Tier Pill */}
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 border ${
                        isVip
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : p.membershipTier === 'Silver Member'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : 'bg-white/10 text-white/70 border-white/20'
                      }`}>
                        {p.membershipTier || 'Shopper'}
                      </span>
                    </div>

                    {/* Contact Info with One-Click Copy */}
                    <div className="space-y-1.5 bg-black/25 p-3 rounded-2xl border border-white/5 text-xs font-mono">
                      <div className="flex items-center justify-between gap-2 text-white/80 group/mail">
                        <div className="flex items-center gap-2 truncate">
                          <Mail className="h-3.5 w-3.5 text-white/40 shrink-0" />
                          <span className="truncate">{p.email}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleCopy(p.email, `mail-${p.userId}`, e)}
                          className="p-1 text-white/40 hover:text-amber-300 hover:bg-white/10 rounded-md transition cursor-pointer shrink-0"
                          title="Copy Email"
                        >
                          {copiedKey === `mail-${p.userId}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-emerald-300/90 group/phone">
                        <div className="flex items-center gap-2 truncate">
                          <Phone className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate font-semibold">{p.phoneNumber}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleCopy(p.phoneNumber, `phone-${p.userId}`, e)}
                          className="p-1 text-white/40 hover:text-emerald-300 hover:bg-white/10 rounded-md transition cursor-pointer shrink-0"
                          title="Copy Phone"
                        >
                          {copiedKey === `phone-${p.userId}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>

                    {/* Delivery Location Section */}
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-white">
                        <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span>{p.cityArea}, {p.state}</span>
                      </div>
                      <p className="text-[11px] text-white/60 leading-relaxed pl-5 line-clamp-2">
                        {p.streetAddress}
                      </p>
                    </div>

                    {/* Prominent Gate & Security Clearance Callout */}
                    {p.deliveryNotes && (
                      <div className="bg-amber-950/30 border border-amber-500/25 p-3 rounded-2xl space-y-1">
                        <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[10px] uppercase tracking-wide">
                          <ShieldCheck className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          <span>Gate & Security Instructions</span>
                        </div>
                        <p className="text-[11px] text-amber-100/90 italic leading-snug line-clamp-2">
                          &quot;{p.deliveryNotes}&quot;
                        </p>
                      </div>
                    )}

                    {/* Questionnaire Sourcing & Dispatch Preferences */}
                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Dietary:</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 truncate">
                          {p.dietaryPreference}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Dispatch:</span>
                        <span className="text-[10px] font-semibold text-amber-200/90 flex items-center gap-1 truncate">
                          <Clock className="h-3 w-3 text-amber-400 shrink-0" />
                          <span className="truncate">{p.favoriteCategory}</span>
                        </span>
                      </div>
                    </div>

                    {/* Commercial Snapshot & Inspect Button */}
                    <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-black text-emerald-400 font-mono">
                          ₦{(p.totalSpent || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-white/50">
                          {p.ordersCount || 0} orders placed
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectingProfile(p);
                          if (onSelectCustomer) onSelectCustomer(p);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-amber-500 hover:text-black text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 border border-white/15"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Inspect Dossier</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* 2. DENSE DATA TABLE VIEW (Auditing, Compact Rows, Inline Expansion) */}
      {/* ========================================================================= */}
      {viewMode === 'table' && (
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white/90">
              <thead className="bg-[#0b2416] text-white font-bold uppercase tracking-wider text-[10px] border-b border-white/10 select-none">
                <tr>
                  <th className="p-4 w-10"></th>
                  
                  {/* Full Name / Customer Header with Sorting */}
                  <th className="p-4 cursor-pointer hover:bg-white/5 transition" onClick={() => handleSort('fullName')}>
                    <div className="flex items-center gap-1.5">
                      <span>Customer & Contact</span>
                      {sortField === 'fullName' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-amber-400" /> : <ArrowDown className="h-3 w-3 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-white/30" />
                      )}
                    </div>
                  </th>

                  {/* Location Header with Sorting */}
                  <th className="p-4 cursor-pointer hover:bg-white/5 transition" onClick={() => handleSort('state')}>
                    <div className="flex items-center gap-1.5">
                      <span>Delivery Location</span>
                      {sortField === 'state' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-amber-400" /> : <ArrowDown className="h-3 w-3 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-white/30" />
                      )}
                    </div>
                  </th>

                  {/* Questionnaire Preferences */}
                  <th className="p-4">
                    <span>Questionnaire Preferences</span>
                  </th>

                  {/* Activity & Spend with Sorting */}
                  <th className="p-4 cursor-pointer hover:bg-white/5 transition" onClick={() => handleSort('totalSpent')}>
                    <div className="flex items-center gap-1.5">
                      <span>Spend & Activity</span>
                      {sortField === 'totalSpent' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-amber-400" /> : <ArrowDown className="h-3 w-3 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-white/30" />
                      )}
                    </div>
                  </th>

                  {/* Date Completed with Sorting */}
                  <th className="p-4 cursor-pointer hover:bg-white/5 transition" onClick={() => handleSort('completedAt')}>
                    <div className="flex items-center gap-1.5">
                      <span>Onboard Date</span>
                      {sortField === 'completedAt' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-amber-400" /> : <ArrowDown className="h-3 w-3 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-white/30" />
                      )}
                    </div>
                  </th>

                  {/* Action */}
                  <th className="p-4 text-right">
                    <span>Action</span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {paginatedProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-white/60 space-y-3">
                      <FileText className="h-10 w-10 text-white/20 mx-auto" />
                      <p className="font-semibold text-sm">No customer profiles match your criteria.</p>
                      <p className="text-xs text-white/40">Try adjusting your search keywords or resetting active filters.</p>
                      <button
                        onClick={resetFilters}
                        className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-xs inline-flex items-center gap-1.5 hover:bg-amber-500/30 transition cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Clear All Filters</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  paginatedProfiles.map((p) => {
                    const initials = p.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                    const isExpanded = !!expandedRows[p.userId];

                    return (
                      <React.Fragment key={p.userId}>
                        <tr 
                          className={`hover:bg-white/[0.07] transition-colors cursor-pointer group ${
                            isExpanded ? 'bg-white/[0.04]' : ''
                          }`}
                          onClick={() => setInspectingProfile(p)}
                        >
                          {/* Column 0: Expand / Collapse Toggle */}
                          <td className="p-4 text-center">
                            <button
                              type="button"
                              onClick={(e) => toggleRowExpansion(p.userId, e)}
                              className="p-1 rounded-lg text-white/40 hover:text-amber-300 hover:bg-white/10 transition"
                              title={isExpanded ? "Collapse inline preview" : "Expand inline preview"}
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4 text-amber-400" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          </td>

                          {/* Column 1: Customer & Contact */}
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 border border-white/20 flex items-center justify-center text-white font-bold text-xs shadow-md shrink-0">
                                {initials}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white group-hover:text-amber-300 transition-colors">
                                    {p.fullName}
                                  </span>
                                  {p.membershipTier === 'Gold VIP' && (
                                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                      VIP
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-white/60 flex items-center gap-1 mt-0.5 font-mono">
                                  <Mail className="h-3 w-3 text-white/40" />
                                  <span>{p.email}</span>
                                </div>
                                <div className="text-[11px] text-emerald-300/80 flex items-center gap-1 mt-0.5 font-mono">
                                  <Phone className="h-3 w-3 text-emerald-400" />
                                  <span>{p.phoneNumber}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Column 2: Delivery Location */}
                          <td className="p-4 max-w-[220px]">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 font-semibold text-white">
                                <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                <span className="truncate">{p.cityArea}</span>
                              </div>
                              <p className="text-[11px] text-white/50">{p.state}</p>
                              <p className="text-[10px] text-white/40 truncate font-mono" title={p.streetAddress}>
                                {p.streetAddress}
                              </p>
                            </div>
                          </td>

                          {/* Column 3: Questionnaire Preferences */}
                          <td className="p-4 max-w-[240px]">
                            <div className="space-y-1.5">
                              <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-500/30 truncate max-w-full">
                                {p.dietaryPreference}
                              </span>
                              <div className="flex items-center gap-1 text-[11px] text-white/60">
                                <Clock className="h-3 w-3 text-amber-400 shrink-0" />
                                <span className="truncate">{p.favoriteCategory}</span>
                              </div>
                            </div>
                          </td>

                          {/* Column 4: Spend & Activity */}
                          <td className="p-4">
                            <div className="space-y-1">
                              <div className="font-bold text-emerald-400 font-mono text-sm">
                                ₦{(p.totalSpent || 0).toLocaleString()}
                              </div>
                              <div className="text-[11px] text-white/60 flex items-center gap-1.5">
                                <ShoppingBag className="h-3 w-3 text-white/40" />
                                <span>{p.ordersCount || 0} orders</span>
                              </div>
                              <span className="text-[9px] uppercase font-bold text-white/40 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 inline-block">
                                {p.membershipTier || 'Verified Shopper'}
                              </span>
                            </div>
                          </td>

                          {/* Column 5: Questionnaire Date */}
                          <td className="p-4">
                            <div className="space-y-1 text-white/60 text-[11px]">
                              <div className="flex items-center gap-1 text-white/80">
                                <Calendar className="h-3 w-3 text-amber-400/80" />
                                <span>{p.completedAt}</span>
                              </div>
                              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Verified Form
                              </span>
                            </div>
                          </td>

                          {/* Column 6: Actions */}
                          <td className="p-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectingProfile(p);
                                if (onSelectCustomer) onSelectCustomer(p);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-amber-500 hover:text-black text-white font-semibold text-xs inline-flex items-center gap-1.5 transition cursor-pointer border border-white/15"
                            >
                              <Eye className="h-3.5 w-3.5 text-amber-300 group-hover:text-black" />
                              <span>View Dossier</span>
                            </button>
                          </td>
                        </tr>

                        {/* Inline Expandable Detail Drawer */}
                        {isExpanded && (
                          <tr className="bg-black/40 border-b border-white/10">
                            <td colSpan={7} className="p-5">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl space-y-1.5">
                                  <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                                    Full Delivery Address
                                  </span>
                                  <p className="text-white font-medium">{p.streetAddress}</p>
                                  <p className="text-white/60">{p.cityArea}, {p.state}</p>
                                </div>

                                <div className="bg-amber-950/40 border border-amber-500/30 p-3.5 rounded-2xl space-y-1.5">
                                  <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    <span>Gate & Security Clearance</span>
                                  </span>
                                  <p className="text-amber-100 italic">
                                    {p.deliveryNotes ? `"${p.deliveryNotes}"` : 'Standard residential access; no special gate instructions.'}
                                  </p>
                                </div>

                                <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl space-y-1.5">
                                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                                    Questionnaire Sourcing Specs
                                  </span>
                                  <p className="text-white"><b>Diet:</b> {p.dietaryPreference}</p>
                                  <p className="text-white"><b>Window:</b> {p.favoriteCategory}</p>
                                  <p className="text-white/50 text-[10px]">Onboarding ID: {p.userId}</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Bar */}
      <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div className="text-xs text-white/70">
          Showing page <span className="font-bold text-white">{safePage}</span> of <span className="font-bold text-white">{totalPages}</span> ({filteredProfiles.length} total records)
        </div>

        <div className="flex items-center gap-2">
          {/* Previous button */}
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={safePage <= 1}
            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-white/10 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
              if (totalPages > 7) {
                if (pageNum !== 1 && pageNum !== totalPages && Math.abs(pageNum - safePage) > 1) {
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return <span key={pageNum} className="text-white/30 px-1 text-xs">...</span>;
                  }
                  return null;
                }
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition cursor-pointer ${
                    safePage === pageNum
                      ? 'bg-amber-500 text-black shadow-md'
                      : 'bg-white/5 hover:bg-white/15 text-white'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Next button */}
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={safePage >= totalPages}
            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-white/10 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. COMPREHENSIVE CUSTOMER QUESTIONNAIRE DOSSIER MODAL */}
      {/* ========================================================================= */}
      {inspectingProfile && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setInspectingProfile(null)}
        >
          <div 
            className="bg-[#0c1c13] border border-amber-500/40 w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-stone-900 to-[#0a2315]">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-black flex items-center justify-center font-black text-lg shadow-lg">
                  {inspectingProfile.fullName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">{inspectingProfile.fullName}</h3>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {inspectingProfile.membershipTier || 'Verified Member'}
                    </span>
                  </div>
                  <p className="text-xs text-white/60 font-mono mt-0.5">{inspectingProfile.email}</p>
                </div>
              </div>

              <button
                onClick={() => setInspectingProfile(null)}
                className="p-2 text-white/60 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Questionnaire Submission Status Banner */}
              <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="font-bold text-white">Questionnaire Completed & Verified</h4>
                    <p className="text-[11px] text-emerald-200/80">Submitted on {inspectingProfile.completedAt}</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/30">
                  ID: {inspectingProfile.userId}
                </span>
              </div>

              {/* 1. Contact & Identification Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2">
                  <Users className="h-4 w-4" />
                  <span>1. Contact & Member Identification</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-1">
                    <span className="text-[10px] text-white/50 uppercase font-bold">Full Legal / Order Name</span>
                    <p className="text-xs font-bold text-white">{inspectingProfile.fullName}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-1">
                    <span className="text-[10px] text-white/50 uppercase font-bold">Registered Account Email</span>
                    <p className="text-xs font-mono text-white truncate">{inspectingProfile.email}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-1">
                    <span className="text-[10px] text-white/50 uppercase font-bold">Rider Dispatch Phone</span>
                    <p className="text-xs font-mono text-emerald-300 font-bold">{inspectingProfile.phoneNumber}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-1">
                    <span className="text-[10px] text-white/50 uppercase font-bold">Account Tier & Frequency</span>
                    <p className="text-xs font-bold text-amber-300">{inspectingProfile.membershipTier} • {inspectingProfile.status}</p>
                  </div>
                </div>
              </div>

              {/* 2. Delivery Address & Logistics Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2">
                  <MapPin className="h-4 w-4" />
                  <span>2. Delivery Address & Gate Logistics</span>
                </h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-1">
                      <span className="text-[10px] text-white/50 uppercase font-bold">Destination State</span>
                      <p className="text-xs font-bold text-white">{inspectingProfile.state}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-1">
                      <span className="text-[10px] text-white/50 uppercase font-bold">Area / Neighborhood</span>
                      <p className="text-xs font-bold text-white">{inspectingProfile.cityArea}</p>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-1">
                    <span className="text-[10px] text-white/50 uppercase font-bold">Detailed Street Address</span>
                    <p className="text-xs text-white leading-relaxed">{inspectingProfile.streetAddress}</p>
                  </div>

                  {inspectingProfile.deliveryNotes && (
                    <div className="bg-amber-950/40 border border-amber-500/35 p-4 rounded-2xl space-y-1.5">
                      <span className="text-[10px] text-amber-300 uppercase font-bold flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-amber-400" />
                        <span>Security Post & Gate Clearance Instructions</span>
                      </span>
                      <p className="text-xs text-amber-100 italic leading-relaxed">
                        &quot;{inspectingProfile.deliveryNotes}&quot;
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Sourcing Preferences & Dispatch Windows */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2">
                  <HeartHandshake className="h-4 w-4" />
                  <span>3. Sourcing & Dispatch Preferences</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white/5 border border-white/10 p-3.5 rounded-xl space-y-1.5">
                    <span className="text-[10px] text-white/50 uppercase font-bold flex items-center gap-1">
                      <HeartHandshake className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Grocery Sourcing Focus</span>
                    </span>
                    <p className="text-xs font-bold text-emerald-300">{inspectingProfile.dietaryPreference}</p>
                    <p className="text-[10px] text-white/50">Shapes automated farm harvest bundles and stock recommendations.</p>
                  </div>

                  <div className="bg-white/5 border border-white/10 p-3.5 rounded-xl space-y-1.5">
                    <span className="text-[10px] text-white/50 uppercase font-bold flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-amber-400" />
                      <span>Preferred Delivery Window</span>
                    </span>
                    <p className="text-xs font-bold text-amber-200">{inspectingProfile.favoriteCategory}</p>
                    <p className="text-[10px] text-white/50">Prioritizes dispatch route assignment for delivery riders.</p>
                  </div>
                </div>
              </div>

              {/* 4. Commercial Profile Summary */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2">
                  <ShoppingBag className="h-4 w-4" />
                  <span>4. Commercial Activity & Value</span>
                </h4>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                    <span className="text-[10px] text-white/50 uppercase block">Total Orders</span>
                    <span className="text-base font-black text-white font-mono">{inspectingProfile.ordersCount || 0}</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                    <span className="text-[10px] text-white/50 uppercase block">Lifetime Spend</span>
                    <span className="text-base font-black text-emerald-400 font-mono">₦{(inspectingProfile.totalSpent || 0).toLocaleString()}</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                    <span className="text-[10px] text-white/50 uppercase block">Avg. Basket</span>
                    <span className="text-base font-black text-amber-300 font-mono">
                      ₦{inspectingProfile.ordersCount ? Math.round((inspectingProfile.totalSpent || 0) / inspectingProfile.ordersCount).toLocaleString() : 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  const dataStr = `FreshBasket Customer Questionnaire Dossier\n=========================================\nCustomer Name: ${inspectingProfile.fullName}\nAccount Email: ${inspectingProfile.email}\nRider Phone: ${inspectingProfile.phoneNumber}\nTier: ${inspectingProfile.membershipTier}\nState: ${inspectingProfile.state}\nCity/Area: ${inspectingProfile.cityArea}\nStreet Address: ${inspectingProfile.streetAddress}\nGate Clearance: ${inspectingProfile.deliveryNotes || 'None'}\nDietary Focus: ${inspectingProfile.dietaryPreference}\nDelivery Window: ${inspectingProfile.favoriteCategory}\nTotal Spend: ₦${(inspectingProfile.totalSpent || 0).toLocaleString()} (${inspectingProfile.ordersCount || 0} orders)\nCompleted: ${inspectingProfile.completedAt}`;
                  navigator.clipboard.writeText(dataStr);
                  setCopiedKey('modal-dossier');
                  setTimeout(() => setCopiedKey(null), 2000);
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                {copiedKey === 'modal-dossier' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedKey === 'modal-dossier' ? '✓ Dossier Copied!' : 'Copy Dossier'}</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectingProfile(null)}
                className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
