import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  ShieldCheck, 
  ShieldAlert,
  UserPlus, 
  Trash2, 
  Edit3, 
  Plus, 
  Check, 
  AlertTriangle, 
  Lock, 
  Crown, 
  Search, 
  RefreshCw, 
  Sparkles,
  Users,
  Package,
  Layers,
  CheckCircle2,
  Sliders,
  AlertCircle,
  Cloud,
  Database,
  ExternalLink,
  Share2,
  FileText,
  CheckCheck,
  TrendingUp,
  Calendar,
  Send,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Settings,
  UploadCloud,
  Play,
  Monitor,
  Save,
  Image as ImageIcon
} from 'lucide-react';
import { Product, AdminRole, AdminUser, AppSettings, PendingUpdate } from '../types';
import { 
  SUPER_ADMIN_EMAIL, 
  getAdminPermissions, 
  fetchAdminStaff, 
  addOrUpdateAdminStaff, 
  deleteAdminStaff, 
  isImmutableSuperAdmin,
  subscribeToAdminStaff,
  getStaffSessionEmail,
  setStaffSessionEmail,
  fetchPendingUpdates,
  approvePendingUpdate,
  rejectPendingUpdate,
  createPendingUpdate
} from '../lib/adminService';
import { HARVEST_CATEGORIES, deleteLiveProduct, syncAllProductsToFirestore } from '../lib/productService';
import { uploadToCloudinary } from '../lib/cloudinary';
import { fetchAppSettings, saveAppSettings } from '../lib/appSettingsService';
import { AdminProduceModal } from './AdminProduceModal';
import CustomerProfilesTable from './CustomerProfilesTable';
import { auth } from '../lib/firebase';
import { signInAnonymously } from 'firebase/auth';

interface AdminPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  currentRole: AdminRole | null;
  currentEmail: string | null;
  isSimulatingRole?: boolean;
  onSelectRoleForPreview?: (role: AdminRole | null, simulatedEmail?: string) => void;
  onRefreshProducts: () => void;
  onSaveProduct: (p: Product) => Promise<boolean | void> | boolean | void;
  onDeleteProduct: (id: string) => Promise<void>;
  onNavigateToAuth?: () => void;
  initialTab?: 'inventory' | 'staff' | 'customer_profiles' | 'settings' | 'approvals';
  appSettings: AppSettings | null;
  onSettingsUpdate: (settings: AppSettings) => void;
}

export const AdminPortalModal: React.FC<AdminPortalModalProps> = ({
  isOpen,
  onClose,
  products,
  currentRole,
  currentEmail,
  isSimulatingRole,
  onSelectRoleForPreview,
  onRefreshProducts,
  onSaveProduct,
  onDeleteProduct,
  onNavigateToAuth,
  initialTab,
  appSettings: externalAppSettings,
  onSettingsUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'staff' | 'customer_profiles' | 'settings' | 'approvals'>(initialTab || 'inventory');
  const [isCrudCardCollapsed, setIsCrudCardCollapsed] = useState(false);

  // Pending Updates State
  const [pendingUpdates, setPendingUpdates] = useState<PendingUpdate[]>([]);
  const [isResolvingUpdate, setIsResolvingUpdate] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && currentRole === 'super_admin') {
      const loadApprovals = async () => {
        const updates = await fetchPendingUpdates();
        setPendingUpdates(updates);
      };
      loadApprovals();
    }
  }, [isOpen, currentRole]);

  // Local edit state for the settings form
  const [localSettings, setLocalSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    if (externalAppSettings) {
      setLocalSettings(externalAppSettings);
    } else {
      setLocalSettings({
        id: 'global_config',
        heroHeading: '',
        heroSubheading: ''
      } as AppSettings);
    }
  }, [externalAppSettings, isOpen]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  const [adminStaffList, setAdminStaffList] = useState<AdminUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Harvest');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteStaffConfirmEmail, setDeleteStaffConfirmEmail] = useState<string | null>(null);
  const [isDeletingStaffEmail, setIsDeletingStaffEmail] = useState<string | null>(null);

  // Staff Table Filtering, Searching, Sorting & Pagination State
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState<'all' | AdminRole>('all');
  const [staffSortField, setStaffSortField] = useState<'name' | 'role' | 'addedAt'>('name');
  const [staffSortDirection, setStaffSortDirection] = useState<'asc' | 'desc'>('asc');
  const [staffCurrentPage, setStaffCurrentPage] = useState<number>(1);
  const [staffPageSize, setStaffPageSize] = useState<number>(5);

  // Supervisor Quality Hub State
  const [supervisorFilter, setSupervisorFilter] = useState<'all' | 'spoilage_risk' | 'low_stock' | 'organic'>('all');
  const [approvedBatches, setApprovedBatches] = useState<Record<string, boolean>>({});

  // Sales Rep Hub State
  const [selectedQuoteProductIds, setSelectedQuoteProductIds] = useState<string[]>([]);
  const [copiedQuoteMessage, setCopiedQuoteMessage] = useState(false);
  const [wholesaleClientName, setWholesaleClientName] = useState('');

  // New admin form state (Super Admin only)
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<AdminRole>('manager');
  const [staffActionStatus, setStaffActionStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isAddingStaff, setIsAddingStaff] = useState(false);

  // App Settings State
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [settingsStatus, setSettingsStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Pending assets for delayed upload
  const [pendingAssetFile, setPendingAssetFile] = useState<File | null>(null);
  const [assetPreviewUrl, setAssetPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    // Cleanup preview URL on unmount
    return () => {
      if (assetPreviewUrl) URL.revokeObjectURL(assetPreviewUrl);
    };
  }, [assetPreviewUrl]);

  const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const bgType = localSettings?.heroBgType || 'video';
    
    if (bgType === 'video' && !file.type.startsWith('video/')) {
      setSettingsStatus({ type: 'error', text: 'Please select a valid video file.' });
      return;
    }
    
    if (bgType === 'image' && !file.type.startsWith('image/')) {
      setSettingsStatus({ type: 'error', text: 'Please select a valid image file.' });
      return;
    }

    // Revoke old preview
    if (assetPreviewUrl) URL.revokeObjectURL(assetPreviewUrl);

    const localUrl = URL.createObjectURL(file);
    setAssetPreviewUrl(localUrl);
    setPendingAssetFile(file);
    setUploadProgress(0);
    setSettingsStatus({ type: 'success', text: `${bgType === 'video' ? 'Video' : 'Image'} preview ready! Click Apply to synchronize with the cloud.` });
  };

  const saveSettings = async () => {
    if (!localSettings) return;
    setIsSavingSettings(true);
    setSettingsStatus(null);
    setUploadProgress(0);

    try {
      let finalSettings = { ...localSettings };
      let assetToCleanup: PendingUpdate['assetToCleanup'];

      // Step 1: Upload to Cloudinary ONLY if there is a pending file
      if (pendingAssetFile) {
        setIsUploadingAsset(true);
        const bgType = finalSettings.heroBgType || 'video';
        
        // Enforce MB limits server-side via checking before upload (client-side enforcement for UX)
        const sizeMb = pendingAssetFile.size / (1024 * 1024);
        if (bgType === 'image') {
          const min = externalAppSettings?.minImageSizeMb || 0;
          const max = externalAppSettings?.maxImageSizeMb || 10;
          if (sizeMb < min || sizeMb > max) {
            throw new Error(`Image size must be between ${min}MB and ${max}MB. Current: ${sizeMb.toFixed(2)}MB`);
          }
        } else {
          const min = externalAppSettings?.minVideoSizeMb || 0;
          const max = externalAppSettings?.maxVideoSizeMb || 50;
          if (sizeMb < min || sizeMb > max) {
            throw new Error(`Video size must be between ${min}MB and ${max}MB. Current: ${sizeMb.toFixed(2)}MB`);
          }
        }

        try {
          const response = await uploadToCloudinary(
            pendingAssetFile, 
            bgType,
            (percent) => setUploadProgress(percent)
          );
          
          const uploadedAt = new Date().toISOString();
          if (bgType === 'video') {
            finalSettings = {
              ...finalSettings,
              heroVideoUrl: response.secure_url,
              heroVideoPublicId: response.public_id,
              heroMediaUploadedAt: uploadedAt
            };
            assetToCleanup = { publicId: response.public_id, resourceType: 'video' };
          } else {
            finalSettings = {
              ...finalSettings,
              heroImageUrl: response.secure_url,
              heroImagePublicId: response.public_id,
              heroMediaUploadedAt: uploadedAt
            };
            assetToCleanup = { publicId: response.public_id, resourceType: 'image' };
          }
          
          setSettingsStatus({ type: 'success', text: `Step 1: Asset uploaded! ${currentRole === 'manager' ? 'Queuing for approval...' : 'Finalizing...'}` });
        } catch (uploadErr: any) {
          throw new Error(`Upload failed: ${uploadErr.message}`);
        } finally {
          setIsUploadingAsset(false);
        }
      }

      // Step 2: Save logic based on Role
      if (currentRole === 'manager') {
        // Create a pending update
        await createPendingUpdate({
          type: 'settings',
          targetId: 'global_config',
          data: finalSettings,
          requestedBy: currentEmail || 'Manager',
          requestedByEmail: currentEmail || '',
          assetToCleanup
        });
        
        setSettingsStatus({ 
          type: 'success', 
          text: 'Update Request Submitted! Your changes have been sent to the Super Admin for approval. The hero asset will be permanently stored only if approved.' 
        });
        
        // Reset local changes for manager after submission
        setPendingAssetFile(null);
        if (assetPreviewUrl) {
          URL.revokeObjectURL(assetPreviewUrl);
          setAssetPreviewUrl(null);
        }
      } else {
        // Super Admin saves directly
        const result = await saveAppSettings(finalSettings);
        if (result.success) {
          setPendingAssetFile(null);
          if (assetPreviewUrl) {
            URL.revokeObjectURL(assetPreviewUrl);
            setAssetPreviewUrl(null);
          }
          onSettingsUpdate(finalSettings);
          setSettingsStatus({ type: 'success', text: 'Site assets successfully synchronized! Your changes are now live.' });
        } else {
          setSettingsStatus({ type: 'error', text: result.message });
        }
      }
    } catch (err: any) {
      setSettingsStatus({ type: 'error', text: err.message });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleApprove = async (update: PendingUpdate) => {
    setIsResolvingUpdate(update.id);
    try {
      if (update.type === 'settings') {
        const result = await saveAppSettings(update.data);
        if (result.success) {
          await approvePendingUpdate(update.id, currentEmail || SUPER_ADMIN_EMAIL);
          onSettingsUpdate(update.data);
        }
      } else if (update.type === 'product') {
        const result = await onSaveProduct(update.data);
        if (result !== false) {
          await approvePendingUpdate(update.id, currentEmail || SUPER_ADMIN_EMAIL);
          onRefreshProducts();
        }
      }
      
      // Refresh list
      const fresh = await fetchPendingUpdates();
      setPendingUpdates(fresh);
    } catch (err) {
      console.error('Approval error:', err);
    } finally {
      setIsResolvingUpdate(null);
    }
  };

  const handleReject = async (update: PendingUpdate) => {
    setIsResolvingUpdate(update.id);
    try {
      await rejectPendingUpdate(update.id, currentEmail || SUPER_ADMIN_EMAIL);
      
      // If there was an asset, we delete it from Cloudinary IMMEDIATELY
      if (update.assetToCleanup) {
        console.log('[Cloudinary] Immediate cleanup triggered for:', update.assetToCleanup.publicId);
        await fetch('/api/cloudinary/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            publicId: update.assetToCleanup.publicId,
            resourceType: update.assetToCleanup.resourceType 
          })
        }).catch(e => console.warn('Cloudinary cleanup request failed:', e));
      }

      // Refresh list
      const fresh = await fetchPendingUpdates();
      setPendingUpdates(fresh);
    } catch (err) {
      console.error('Rejection error:', err);
    } finally {
      setIsResolvingUpdate(null);
    }
  };

  const permissions = getAdminPermissions(currentRole);

  // Guard activeTab: ONLY super admin can access staff directory
  useEffect(() => {
    if (currentRole !== 'super_admin') {
      if (activeTab === 'staff') {
        setActiveTab('inventory');
      }
    }
  }, [currentRole, activeTab]);

  // Derived filtered, sorted, paginated staff list
  const filteredStaffList = useMemo(() => {
    return adminStaffList.filter(staff => {
      if (staffSearchQuery.trim()) {
        const q = staffSearchQuery.toLowerCase().trim();
        const matchesName = (staff.name || '').toLowerCase().includes(q);
        const matchesEmail = (staff.email || '').toLowerCase().includes(q);
        const matchesRole = (staff.role || '').toLowerCase().includes(q);
        const matchesAddedBy = (staff.addedBy || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesRole && !matchesAddedBy) {
          return false;
        }
      }
      if (staffRoleFilter !== 'all' && staff.role !== staffRoleFilter) {
        return false;
      }
      return true;
    });
  }, [adminStaffList, staffSearchQuery, staffRoleFilter]);

  const sortedStaffList = useMemo(() => {
    const list = [...filteredStaffList];
    list.sort((a, b) => {
      let cmp = 0;
      if (staffSortField === 'name') {
        cmp = (a.name || a.email).localeCompare(b.name || b.email);
      } else if (staffSortField === 'role') {
        cmp = (a.role || '').localeCompare(b.role || '');
      } else if (staffSortField === 'addedAt') {
        cmp = (a.addedAt || '').localeCompare(b.addedAt || '');
      }
      return staffSortDirection === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredStaffList, staffSortField, staffSortDirection]);

  const totalStaffPages = Math.ceil(sortedStaffList.length / staffPageSize) || 1;
  const safeStaffPage = Math.min(Math.max(1, staffCurrentPage), totalStaffPages);
  const paginatedStaffList = useMemo(() => {
    const start = (safeStaffPage - 1) * staffPageSize;
    return sortedStaffList.slice(start, start + staffPageSize);
  }, [sortedStaffList, safeStaffPage, staffPageSize]);

  const handleStaffSort = (field: 'name' | 'role' | 'addedAt') => {
    if (staffSortField === field) {
      setStaffSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setStaffSortField(field);
      setStaffSortDirection('asc');
    }
    setStaffCurrentPage(1);
  };

  useEffect(() => {
    if (isOpen) {
      const unsub = subscribeToAdminStaff((staff) => {
        setAdminStaffList(staff);
      });
      return () => unsub();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Access Restricted Screen for non-admin visitors / customers
  if (!currentRole) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
        <div className="bg-[#0f1712] border border-amber-500/40 w-full max-w-2xl rounded-3xl shadow-2xl p-6 sm:p-8 text-white space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Administrative Access Restricted</h2>
                <p className="text-xs text-amber-300/80">Role-Based Access Control (RBAC) Active</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-white/60 hover:text-white rounded-xl hover:bg-white/10 cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="text-sm text-white/80 leading-relaxed">
            The FreshBasket Administration Center is not accessible to standard visitors or customers. Each operational position is strictly defined and permissions are cryptographically verified.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <Crown className="h-4 w-4" />
                <span>Super Administrator</span>
              </div>
              <p className="text-white/60">Full system & produce authority (Create, Read, Update, Delete) + Staff governance.</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl space-y-1">
              <div className="flex items-center gap-2 font-bold text-blue-300">
                <ShieldCheck className="h-4 w-4" />
                <span>Operations Manager</span>
              </div>
              <p className="text-white/60">Produce stock updates, price adjustments, and catalog maintenance. Cannot create root products or manage staff.</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl space-y-1">
              <div className="flex items-center gap-2 font-bold text-purple-300">
                <ShieldCheck className="h-4 w-4" />
                <span>Quality Supervisor</span>
              </div>
              <p className="text-white/60">Quality inspection & removal of expired/damaged harvest items. Read & delete only.</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl space-y-1">
              <div className="flex items-center gap-2 font-bold text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
                <span>Sales Representative</span>
              </div>
              <p className="text-white/60">Real-time inventory stock and live pricing view only. Cannot edit, create, or delete items.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {onSelectRoleForPreview && (
              <button
                type="button"
                onClick={() => {
                  onSelectRoleForPreview('super_admin', SUPER_ADMIN_EMAIL);
                }}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 px-4 rounded-xl text-center text-xs transition cursor-pointer shadow flex items-center justify-center gap-1.5"
              >
                <Crown className="h-4 w-4 text-black" />
                <span>Activate Super Admin ({SUPER_ADMIN_EMAIL})</span>
              </button>
            )}
            {onNavigateToAuth && (
              <button
                onClick={onNavigateToAuth}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-center text-xs transition cursor-pointer"
              >
                Sign In with Other Staff Account
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Return to Storefront
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.localName && p.localName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All Harvest' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddNewProduce = () => {
    if (!permissions.canCreate) {
      setStaffActionStatus({ type: 'error', text: "Access Denied: Only the Super Admin can create new produce items." });
      return;
    }
    setEditingProduct(null);
    setIsEditorOpen(true);
  };

  const handleEditProduce = (prod: Product) => {
    if (!permissions.canUpdate) {
      setStaffActionStatus({ type: 'error', text: `Access Denied: Your role (${currentRole}) cannot update produce items.` });
      return;
    }
    setEditingProduct(prod);
    setIsEditorOpen(true);
  };

  const handleDeleteProduce = async (prodId: string) => {
    if (!permissions.canDelete) {
      setStaffActionStatus({ type: 'error', text: `Access Denied: Your role (${currentRole}) cannot delete produce.` });
      return;
    }
    try {
      await onDeleteProduct(prodId);
      setDeleteConfirmId(null);
      onRefreshProducts();
    } catch (err: any) {
      console.error('Delete produce error:', err);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.canManageAdmins) {
      setStaffActionStatus({
        type: 'error',
        text: 'Access Denied: Only the Super Admin can provision or update administrator accounts.'
      });
      return;
    }

    if (!newAdminEmail.trim()) {
      setStaffActionStatus({ type: 'error', text: 'Please enter a Gmail account.' });
      return;
    }

    setIsAddingStaff(true);
    setStaffActionStatus(null);

    const res = await addOrUpdateAdminStaff(
      newAdminEmail,
      newAdminName,
      newAdminRole,
      currentEmail || SUPER_ADMIN_EMAIL
    );

    setIsAddingStaff(false);
    if (res.success) {
      setStaffActionStatus({ type: 'success', text: res.message });
      setNewAdminEmail('');
      setNewAdminName('');
      setNewAdminRole('manager');
      const updated = await fetchAdminStaff();
      setAdminStaffList(updated);
    } else {
      setStaffActionStatus({ type: 'error', text: res.message });
    }
  };

  const handleDeleteStaff = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const isCallerSuperAdmin = currentRole === 'super_admin' || isImmutableSuperAdmin(currentEmail);
    if (!isCallerSuperAdmin) {
      setStaffActionStatus({ type: 'error', text: 'Access Denied: Only the Super Admin can manage admin staff.' });
      return;
    }

    if (isImmutableSuperAdmin(cleanEmail)) {
      setStaffActionStatus({ type: 'error', text: `Access Denied: ${cleanEmail} is an immutable Root Super Admin and cannot be removed.` });
      return;
    }

    setIsDeletingStaffEmail(cleanEmail);
    setDeleteStaffConfirmEmail(null);

    // If currently simulating, reset preview immediately
    if (isSimulatingRole) {
      onSelectRoleForPreview?.(null);
    }

    // Clear staff session if this browser was running as this staff member
    if (getStaffSessionEmail()?.toLowerCase() === cleanEmail) {
      setStaffSessionEmail(null);
    }

    // Optimistically update list so the UI responds immediately
    const prevList = [...adminStaffList];
    setAdminStaffList(prev => prev.filter(s => s.email.trim().toLowerCase() !== cleanEmail));

    try {
      const res = await deleteAdminStaff(cleanEmail, currentEmail || SUPER_ADMIN_EMAIL);
      if (res.success) {
        setStaffActionStatus({ 
          type: 'success', 
          text: `Admin access for ${cleanEmail} was completely revoked! That user's Admin Center has been terminated.` 
        });
        const updated = await fetchAdminStaff();
        if (updated && Array.isArray(updated)) {
          setAdminStaffList(updated);
        }
      } else {
        setStaffActionStatus({ type: 'error', text: res.message });
        setAdminStaffList(prevList);
      }
    } catch (err: any) {
      console.error('Delete staff error:', err);
      setStaffActionStatus({ type: 'error', text: err?.message || 'Failed to revoke admin position' });
      setAdminStaffList(prevList);
    } finally {
      setIsDeletingStaffEmail(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#0f1712] border border-emerald-500/30 w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden my-4 text-white flex flex-col h-[92vh] relative">
        
        {/* Scrollable Container: Top Header, Active Session, and Content all scroll together naturally */}
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0 relative">

          {/* Top Header Bar: Now scrollable inside the container so it scrolls UP out of view when scrolling down */}
          <div className="p-5 sm:p-6 border-b border-white/10 bg-gradient-to-r from-[#0a2315] to-[#122e1d] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shadow-inner">
                <ShieldCheck className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight text-white font-sans">
                    Farm Produce Administration Center
                  </h2>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-black uppercase px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    Live RBAC Engine
                  </span>
                </div>
                <p className="text-xs text-emerald-200/70 mt-0.5">
                  Role-Based Produce Management & Harvest Inventory Synchronization
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer self-end sm:self-auto"
              title="Close Administration Center"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* User Identity & Live Role Permissions Strip (Scrolls UP with content) */}
          <div className="bg-stone-900/95 border-b border-white/10 px-6 py-3 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-white/50 font-medium">Active Session:</span>
                <span className="font-mono font-bold text-white bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                  {currentEmail || 'Not Authenticated'}
                </span>
                {isImmutableSuperAdmin(currentEmail) ? (
                  <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-lg font-bold">
                    <Crown className="h-3.5 w-3.5 text-amber-400" />
                    Root Super Admin (Immutable)
                  </span>
                ) : currentRole ? (
                  <span className={`inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-lg border ${
                    currentRole === 'manager' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
                    currentRole === 'supervisor' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' :
                    'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}>
                    {currentRole.replace('_', ' ').toUpperCase()}
                  </span>
                ) : (
                  <span className="bg-white/10 text-white/70 px-2 py-0.5 rounded text-[11px]">Customer / Guest</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Granular Permissions Indicator */}
                {!isCrudCardCollapsed && (
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="text-white/40 font-sans mr-1">CRUD Matrix:</span>
                    <span className={`px-2 py-0.5 rounded ${permissions.canCreate ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-white/5 text-white/30'}`}>
                      Create {permissions.canCreate ? '✓' : '✗'}
                    </span>
                    <span className={`px-2 py-0.5 rounded ${permissions.canRead ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-white/5 text-white/30'}`}>
                      Read {permissions.canRead ? '✓' : '✗'}
                    </span>
                    <span className={`px-2 py-0.5 rounded ${permissions.canUpdate ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-white/5 text-white/30'}`}>
                      Update {permissions.canUpdate ? '✓' : '✗'}
                    </span>
                    <span className={`px-2 py-0.5 rounded ${permissions.canDelete ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-white/5 text-white/30'}`}>
                      Delete {permissions.canDelete ? '✓' : '✗'}
                    </span>
                    <span className={`px-2 py-0.5 rounded ${permissions.canManageAdmins ? 'bg-amber-950 text-amber-300 border border-amber-700' : 'bg-white/5 text-white/30'}`}>
                      Admins {permissions.canManageAdmins ? '✓' : '✗'}
                    </span>
                  </div>
                )}

                {/* Collapsible toggle button */}
                <button
                  type="button"
                  onClick={() => setIsCrudCardCollapsed(prev => !prev)}
                  className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition text-[10px] flex items-center gap-1 cursor-pointer border border-white/10"
                  title={isCrudCardCollapsed ? "Expand CRUD Matrix" : "Collapse CRUD Matrix"}
                >
                  {isCrudCardCollapsed ? <ChevronDown className="h-3 w-3 text-amber-400" /> : <ChevronUp className="h-3 w-3 text-white/40" />}
                  <span>{isCrudCardCollapsed ? "Show CRUD Matrix" : "Collapse"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live Simulation / Role Preview Alert Strip (ONLY shown when Super Admin is previewing another role) */}
          {isSimulatingRole && onSelectRoleForPreview && (
            <div className="bg-gradient-to-r from-purple-950/80 via-stone-900 to-purple-950/80 border-b border-purple-500/30 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center gap-2 text-purple-200">
                <ShieldCheck className="h-4 w-4 text-purple-400 shrink-0" />
                <span>
                  Operating in <b className="text-white uppercase font-black px-1.5 py-0.5 rounded bg-purple-500/30 border border-purple-400/40">{(currentRole || '').replace('_', ' ')}</b> preview mode.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSelectRoleForPreview('super_admin', SUPER_ADMIN_EMAIL)}
                  className="text-xs bg-amber-500 hover:bg-amber-400 text-black font-bold px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow"
                >
                  <Crown className="h-3.5 w-3.5" />
                  <span>Exit Preview (Back to Super Admin)</span>
                </button>
              </div>
            </div>
          )}

          {/* Navigation Tabs - No longer sticky so everything scrolls up together naturally as requested */}
          <div className="z-20 flex border-b border-white/10 bg-[#0a160f]/95 backdrop-blur-md px-6 gap-2 overflow-x-auto shrink-0 shadow-lg">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-2 px-4 py-3 font-semibold text-xs transition border-b-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'inventory'
                  ? 'border-emerald-500 text-emerald-400 bg-white/5'
                  : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Package className="h-4 w-4" />
              <span>Farm Produce Catalog ({products.length})</span>
            </button>

            {/* Admin Staff Directory: Strictly Super Admin Only */}
            {currentRole === 'super_admin' && (
              <button
                onClick={() => setActiveTab('staff')}
                className={`flex items-center gap-2 px-4 py-3 font-semibold text-xs transition border-b-2 cursor-pointer whitespace-nowrap ${
                  activeTab === 'staff'
                    ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                    : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Admin Staff Directory ({adminStaffList.length})</span>
              </button>
            )}

            {/* Pending Approvals: Strictly Super Admin Only */}
            {currentRole === 'super_admin' && (
              <button
                onClick={() => setActiveTab('approvals')}
                className={`flex items-center gap-2 px-4 py-3 font-semibold text-xs transition border-b-2 cursor-pointer whitespace-nowrap ${
                  activeTab === 'approvals'
                    ? 'border-amber-500 text-amber-400 bg-amber-500/10 font-bold'
                    : 'border-transparent text-amber-300/80 hover:text-white hover:bg-white/5'
                }`}
              >
                <ShieldCheck className="h-4 w-4 text-amber-400" />
                <span>Pending Approvals</span>
                <span className="text-[9px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/30">
                  New
                </span>
              </button>
            )}

            {/* Customer Profiles Directory: Always Accessible */}
            <button
              onClick={() => setActiveTab('customer_profiles')}
              className={`flex items-center gap-2 px-4 py-3 font-semibold text-xs transition border-b-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'customer_profiles'
                  ? 'border-amber-500 text-amber-400 bg-amber-500/10 font-bold'
                  : 'border-transparent text-amber-300/80 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="h-4 w-4 text-amber-400" />
              <span>Customer Profiles (30)</span>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/30">
                Directory
              </span>
            </button>

            {/* Site Configuration (Settings) - Super Admin & Manager only */}
            {(currentRole === 'manager' || currentRole === 'super_admin') && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 px-4 py-3 font-semibold text-xs transition border-b-2 cursor-pointer whitespace-nowrap ${
                  activeTab === 'settings'
                    ? 'border-emerald-500 text-emerald-400 bg-white/5 font-bold'
                    : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Settings className="h-4 w-4 text-emerald-400" />
                <span>Site Configuration</span>
              </button>
            )}
          </div>

        {/* Tab 1: Produce Inventory */}
        {activeTab === 'inventory' && (
          <div className="p-6 flex flex-col space-y-4">
            {/* Search & Actions Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
              <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search 20+ produce items..."
                    className="w-full bg-stone-800/80 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Category Select */}
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="bg-stone-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {HARVEST_CATEGORIES.map(c => (
                    <option key={c} value={c} className="bg-stone-800 text-white">{c}</option>
                  ))}
                </select>
              </div>

              {/* Add Produce Button */}
              {permissions.canCreate ? (
                <button
                  onClick={handleAddNewProduce}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow transition cursor-pointer flex-shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Farm Produce</span>
                </button>
              ) : (
                <div className="text-[11px] text-white/50 bg-white/5 px-3 py-2 rounded-xl border border-white/10 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-amber-400" />
                  <span>New produce creation is restricted to Super Admin</span>
                </div>
              )}
            </div>

            {/* Produce Grid / Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map(prod => {
                return (
                  <div
                    key={prod.id}
                    className="bg-white/5 rounded-2xl border border-white/10 hover:border-emerald-500/40 transition p-4 flex flex-col justify-between space-y-3 relative group"
                  >
                    <div className="flex gap-3">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 border border-white/10">
                        <img src={prod.imageUrls?.[0] || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=600'} alt={prod.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                            {prod.category}
                          </span>
                          <span className="text-[10px] text-white/50 font-mono">
                            Stock: {prod.stock}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white truncate mt-0.5">
                          {prod.name}
                        </h4>
                        {prod.localName && (
                          <p className="text-[11px] text-yellow-400/90 truncate italic">
                            "{prod.localName}"
                          </p>
                        )}
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-xs font-bold text-emerald-400 font-mono">
                            ₦{prod.price.toLocaleString()}
                          </span>
                          {prod.originalPrice && (
                            <span className="text-[10px] text-white/40 line-through font-mono">
                              ₦{prod.originalPrice.toLocaleString()}
                            </span>
                          )}
                          <span className="text-[10px] text-white/60 ml-auto">
                            {prod.size}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Freshness & Origin info */}
                    <div className="text-[10px] text-white/60 bg-black/30 p-2 rounded-xl border border-white/5 space-y-0.5">
                      <div className="flex justify-between">
                        <span>Quality Freshness:</span>
                        <span className="text-emerald-400 font-bold">{prod.freshnessScore}% Fresh</span>
                      </div>
                      <div className="truncate">
                        <span className="text-white/40">Origin: </span>
                        <span>{prod.origin}</span>
                      </div>
                    </div>

                    {/* Actions bar for this produce */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                      {/* Update Button (Super Admin & Manager) */}
                      {permissions.canUpdate && (
                        <button
                          onClick={() => handleEditProduce(prod)}
                          className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                      )}

                      {/* Delete Button (Super Admin, Manager & Quality Supervisor) */}
                      {permissions.canDelete && (
                        deleteConfirmId === prod.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteProduce(prod.id)}
                              className="bg-red-600 hover:bg-red-500 text-white px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="text-white/60 hover:text-white px-2 py-1 text-xs cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(prod.id)}
                            className="bg-red-500/15 hover:bg-red-500/30 text-red-300 border border-red-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        )
                      )}

                      {/* Sales Rep / Read-only state */}
                      {!permissions.canUpdate && !permissions.canDelete && (
                        <span className="text-[10px] text-white/50 font-mono bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                          Read Only
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab: Quality & Freshness Supervision Hub */}
        {activeTab === 'supervisor_hub' && (
          <div className="p-6 flex flex-col space-y-6">
            {/* Header Description */}
            <div className="bg-gradient-to-r from-purple-950/70 via-stone-900 to-purple-950/70 border border-purple-500/30 rounded-2xl p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 flex-shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Harvest Quality Control & Spoilage Purge Hub</span>
                      <span className="text-[10px] bg-purple-500/20 text-purple-300 font-black uppercase px-2 py-0.5 rounded border border-purple-500/30">
                        Supervisor Tier
                      </span>
                    </h3>
                    <p className="text-xs text-white/70 mt-0.5">
                      Monitor live produce freshness scores, track harvest shelf-life expiration dates, and discard spoiled or damaged inventory before customer delivery.
                    </p>
                  </div>
                </div>

                <button
                  onClick={onRefreshProducts}
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto border border-white/10"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-purple-400" />
                  <span>Refresh Batches</span>
                </button>
              </div>

              {/* Supervision KPI Stats Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="bg-black/30 border border-white/10 rounded-xl p-3">
                  <p className="text-[11px] text-white/50 font-medium">Monitored Items</p>
                  <p className="text-lg font-black text-white">{products.length}</p>
                </div>
                <div className="bg-black/30 border border-white/10 rounded-xl p-3">
                  <p className="text-[11px] text-emerald-400 font-medium">Prime Freshness (≥95%)</p>
                  <p className="text-lg font-black text-emerald-300">
                    {products.filter(p => (p.freshnessScore || 95) >= 95).length}
                  </p>
                </div>
                <div className="bg-black/30 border border-amber-500/20 rounded-xl p-3">
                  <p className="text-[11px] text-amber-400 font-medium">Attention Needed (&lt;95%)</p>
                  <p className="text-lg font-black text-amber-300">
                    {products.filter(p => (p.freshnessScore || 95) < 95).length}
                  </p>
                </div>
                <div className="bg-black/30 border border-red-500/20 rounded-xl p-3">
                  <p className="text-[11px] text-red-400 font-medium">Low Stock Batches (≤5)</p>
                  <p className="text-lg font-black text-red-300">
                    {products.filter(p => p.stock <= 5).length}
                  </p>
                </div>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSupervisorFilter('all')}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  supervisorFilter === 'all'
                    ? 'bg-purple-600 text-white shadow'
                    : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10'
                }`}
              >
                All Produce ({products.length})
              </button>
              <button
                onClick={() => setSupervisorFilter('spoilage_risk')}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  supervisorFilter === 'spoilage_risk'
                    ? 'bg-amber-600 text-white shadow'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Freshness Alert (&lt;95%)</span>
              </button>
              <button
                onClick={() => setSupervisorFilter('low_stock')}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  supervisorFilter === 'low_stock'
                    ? 'bg-red-600 text-white shadow'
                    : 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30'
                }`}
              >
                <Package className="h-3.5 w-3.5" />
                <span>Critical Stock (≤5)</span>
              </button>
              <button
                onClick={() => setSupervisorFilter('organic')}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  supervisorFilter === 'organic'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Certified Organic</span>
              </button>
            </div>

            {/* Produce Quality Inspection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products
                .filter(p => {
                  if (supervisorFilter === 'spoilage_risk') return (p.freshnessScore || 95) < 95;
                  if (supervisorFilter === 'low_stock') return p.stock <= 5;
                  if (supervisorFilter === 'organic') return Boolean(p.isOrganic);
                  return true;
                })
                .map(prod => {
                  const freshness = prod.freshnessScore || 95;
                  const isApproved = approvedBatches[prod.id];
                  const isCritical = prod.stock <= 5;

                  return (
                    <div
                      key={prod.id}
                      className={`p-4 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
                        freshness < 90
                          ? 'bg-red-950/20 border-red-500/40'
                          : freshness < 95
                          ? 'bg-amber-950/20 border-amber-500/30'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="w-14 h-14 rounded-xl object-cover bg-stone-900 border border-white/10"
                          />
                          <div>
                            <span className="text-[10px] text-white/50 uppercase font-mono">{prod.category}</span>
                            <h4 className="text-sm font-bold text-white line-clamp-1">{prod.name}</h4>
                            <p className="text-xs text-emerald-400 font-mono font-bold">₦{prod.price.toLocaleString()} / {prod.unit}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded border inline-block ${
                            isCritical ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'bg-white/10 text-white/80 border-white/15'
                          }`}>
                            {prod.stock} in stock
                          </span>
                          {prod.isOrganic && (
                            <span className="block text-[9px] text-emerald-300 font-bold mt-1">🌱 100% Organic</span>
                          )}
                        </div>
                      </div>

                      {/* Freshness Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/60 font-medium flex items-center gap-1">
                            Freshness Index:
                          </span>
                          <span className={`font-black font-mono ${
                            freshness >= 95 ? 'text-emerald-400' : freshness >= 90 ? 'text-amber-400' : 'text-red-400'
                          }`}>
                            {freshness}% {freshness >= 95 ? '(Grade A Fresh)' : freshness >= 90 ? '(Fair)' : '(Inspect)'}
                          </span>
                        </div>
                        <div className="w-full bg-stone-800 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              freshness >= 95 ? 'bg-emerald-500' : freshness >= 90 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${freshness}%` }}
                          />
                        </div>
                      </div>

                      {/* Dates & Supervision Tags */}
                      <div className="text-[11px] text-white/60 flex items-center justify-between border-t border-white/10 pt-2 font-mono">
                        <span>Harvest: {prod.harvestDate || 'Fresh Today'}</span>
                        <span>Expires: {prod.expiryDate || '5 Days Remaining'}</span>
                      </div>

                      {/* Supervisor Action Buttons */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          onClick={() => setApprovedBatches(prev => ({ ...prev, [prod.id]: !prev[prod.id] }))}
                          className={`text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer ${
                            isApproved
                              ? 'bg-emerald-600 text-white shadow'
                              : 'bg-white/10 hover:bg-white/20 text-white/90 border border-white/15'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5 text-emerald-300" />
                          <span>{isApproved ? 'Quality Certified ✓' : 'Approve Batch'}</span>
                        </button>

                        {/* Purge / Discard Produce (Supervisor is authorized to delete) */}
                        {deleteConfirmId === prod.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteProduce(prod.id)}
                              className="bg-red-600 hover:bg-red-500 text-white px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer"
                            >
                              Confirm Discard
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="text-white/60 hover:text-white px-2 py-1 text-xs cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(prod.id)}
                            className="bg-red-500/15 hover:bg-red-500/30 text-red-300 border border-red-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                            title="Discard / Purge Spoiled Batch"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Discard Spoiled</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Tab: Sales Operations & Wholesale Pricing Hub */}
        {activeTab === 'sales_hub' && (
          <div className="p-6 flex flex-col space-y-6">
            {/* Sales Rep Top Banner */}
            <div className="bg-gradient-to-r from-emerald-950/70 via-stone-900 to-emerald-950/70 border border-emerald-500/30 rounded-2xl p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 flex-shrink-0">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Sales Operations & Wholesale Quotation Hub</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-black uppercase px-2 py-0.5 rounded border border-emerald-500/30">
                        Sales Rep Tier
                      </span>
                    </h3>
                    <p className="text-xs text-white/70 mt-0.5">
                      Instant visibility into warehouse stock levels, wholesale bulk pricing matrices, and 1-click quotation generation for commercial buyers.
                    </p>
                  </div>
                </div>

                <div className="bg-emerald-900/40 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs text-emerald-300 font-bold self-start sm:self-auto">
                  Standard Wholesale Discount: 15% OFF
                </div>
              </div>

              {/* Wholesale Quotation Builder Bar */}
              <div className="bg-black/40 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="block text-[11px] text-white/60 mb-1 font-medium">Customer / Business Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Lagos Continental Hotel or Chef Amaka"
                      value={wholesaleClientName}
                      onChange={e => setWholesaleClientName(e.target.value)}
                      className="w-full bg-stone-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      onClick={() => {
                        const selectedItems = products.filter(p => selectedQuoteProductIds.includes(p.id));
                        if (selectedItems.length === 0) {
                          alert('Please select at least one produce item using the checkboxes below.');
                          return;
                        }

                        const client = wholesaleClientName.trim() || 'Valued Buyer';
                        let msg = `🛒 *FRESHBASKET NIGERIA — OFFICIAL WHOLESALE QUOTATION*\n`;
                        msg += `Client: ${client}\n`;
                        msg += `Date: ${new Date().toLocaleDateString('en-GB')}\n`;
                        msg += `Status: Available in Cold-Chain Warehouse\n\n`;
                        msg += `*Selected Produce Items:*\n`;

                        let totalRetail = 0;
                        selectedItems.forEach((item, idx) => {
                          const wholesalePrice = Math.round(item.price * 0.85);
                          totalRetail += item.price;
                          msg += `${idx + 1}. ${item.name} (${item.unit})\n`;
                          msg += `   - Retail: ₦${item.price.toLocaleString()}\n`;
                          msg += `   - Wholesale Rate (15% Bulk): ₦${wholesalePrice.toLocaleString()}\n`;
                          msg += `   - Available Stock: ${item.stock} ${item.unit}\n`;
                        });

                        const totalWholesale = Math.round(totalRetail * 0.85);
                        msg += `\n*Financial Summary:*\n`;
                        msg += `Total Catalog Price: ₦${totalRetail.toLocaleString()}\n`;
                        msg += `Wholesale Savings: ₦${(totalRetail - totalWholesale).toLocaleString()}\n`;
                        msg += `*Final Invoice Total: ₦${totalWholesale.toLocaleString()}*\n\n`;
                        msg += `Direct farm delivery available within 2-4 hours across Lagos.\nTo confirm dispatch, reply to this message.`;

                        navigator.clipboard.writeText(msg);
                        setCopiedQuoteMessage(true);
                        setTimeout(() => setCopiedQuoteMessage(false), 3500);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow"
                    >
                      {copiedQuoteMessage ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                      <span>{copiedQuoteMessage ? 'Quotation Copied!' : 'Copy WhatsApp / Email Quote'}</span>
                    </button>

                    {selectedQuoteProductIds.length > 0 && (
                      <button
                        onClick={() => setSelectedQuoteProductIds([])}
                        className="text-xs text-white/60 hover:text-white px-2 py-2"
                      >
                        Clear Selection
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-white/70 border-t border-white/10 pt-2">
                  <span>Selected Produce: <b>{selectedQuoteProductIds.length} items</b></span>
                  <span>
                    Wholesale Total:{' '}
                    <b className="text-emerald-300 font-mono text-sm">
                      ₦{Math.round(
                        products
                          .filter(p => selectedQuoteProductIds.includes(p.id))
                          .reduce((sum, p) => sum + p.price, 0) * 0.85
                      ).toLocaleString()}
                    </b>
                  </span>
                </div>
              </div>
            </div>

            {/* Produce Price & Availability Matrix */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Live Produce Inventory & Wholesale Rate Matrix ({products.length})
                </h4>
                <span className="text-[11px] text-white/50">Check boxes to add items to customer quote</span>
              </div>

              <div className="divide-y divide-white/10">
                {products.map(prod => {
                  const wholesalePrice = Math.round(prod.price * 0.85);
                  const isSelected = selectedQuoteProductIds.includes(prod.id);

                  return (
                    <div
                      key={prod.id}
                      onClick={() => {
                        setSelectedQuoteProductIds(prev =>
                          isSelected ? prev.filter(id => id !== prod.id) : [...prev, prod.id]
                        );
                      }}
                      className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer transition ${
                        isSelected ? 'bg-emerald-950/40' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-white/20 bg-stone-800"
                        />
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-12 h-12 rounded-xl object-cover bg-stone-900 border border-white/10"
                        />
                        <div>
                          <p className="text-sm font-bold text-white">{prod.name}</p>
                          <p className="text-[11px] text-white/50">{prod.category} • {prod.unit}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 sm:gap-8 text-right">
                        <div>
                          <p className="text-[10px] text-white/40 uppercase">Retail Price</p>
                          <p className="text-xs font-bold text-white/80 font-mono">₦{prod.price.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-emerald-400 uppercase font-bold">Wholesale (-15%)</p>
                          <p className="text-xs font-black text-emerald-300 font-mono">₦{wholesalePrice.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border inline-block ${
                            prod.stock > 10 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                            prod.stock > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                            'bg-red-500/20 text-red-300 border-red-500/30'
                          }`}>
                            {prod.stock > 0 ? `${prod.stock} In Stock` : 'Sold Out'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Admin Staff Directory (Strictly Super Admin Only) */}
        {currentRole === 'super_admin' && activeTab === 'staff' && (
          <div className="p-6 flex flex-col space-y-6">
            {/* Status notification */}
            {staffActionStatus && (
              <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 ${
                staffActionStatus.type === 'success' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' : 'bg-red-950/80 text-red-300 border border-red-800'
              }`}>
                <div className="flex items-center gap-2">
                  {staffActionStatus.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                  <span>{staffActionStatus.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStaffActionStatus(null)}
                  className="text-white/60 hover:text-white p-1 rounded-lg transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Provision New Admin Staff Form (Super Admin only) */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-emerald-400" />
                    <span>Appoint New Admin Position</span>
                  </h3>
                  <p className="text-xs text-white/60 mt-0.5">
                    Authorize a manager, supervisor, or sales representative using their Gmail account.
                  </p>
                </div>
                {permissions.canManageAdmins ? (
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2.5 py-1 rounded-full">
                    Authorized Super Admin Action
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-white/50 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Lock className="h-3 w-3 text-amber-400" /> Super Admin Only
                  </span>
                )}
              </div>

              {permissions.canManageAdmins ? (
                <form onSubmit={handleAddStaff} className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-semibold text-white/70 mb-1">Staff Gmail Account *</label>
                    <input
                      type="email"
                      value={newAdminEmail}
                      onChange={e => setNewAdminEmail(e.target.value)}
                      placeholder="e.g. manager.lekki@gmail.com"
                      className="w-full bg-stone-800 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-semibold text-white/70 mb-1">Staff Full Name</label>
                    <input
                      type="text"
                      value={newAdminName}
                      onChange={e => setNewAdminName(e.target.value)}
                      placeholder="e.g. Babatunde Adeyemi"
                      className="w-full bg-stone-800 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-white/70 mb-1">Assign Position *</label>
                    <select
                      value={newAdminRole}
                      onChange={e => setNewAdminRole(e.target.value as AdminRole)}
                      className="w-full bg-stone-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="manager">Manager (Update, Delete, Read)</option>
                      <option value="supervisor">Supervisor (Delete, Read)</option>
                      <option value="sales_rep">Sales Rep (Read Only)</option>
                      <option value="super_admin">Co-Super Admin (Full CRUD & Staff Mgmt)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-12 flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isAddingStaff}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow cursor-pointer transition disabled:opacity-50"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>{isAddingStaff ? 'Authorizing...' : 'Grant Admin Authorization'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white/60">
                  Staff appointment and privilege configuration are exclusively accessible to the immutable Super Admin ({SUPER_ADMIN_EMAIL}).
                </div>
              )}
            </div>

            {/* Current Staff Registry Table */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>Active Administrator Registry ({adminStaffList.length})</span>
                  </h3>
                  <p className="text-xs text-white/50">Manage assigned privileges and credentials for authorized operations personnel.</p>
                </div>

                {/* Reset Filters if active */}
                {(staffSearchQuery || staffRoleFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setStaffSearchQuery('');
                      setStaffRoleFilter('all');
                      setStaffCurrentPage(1);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Clear Filters</span>
                  </button>
                )}
              </div>

              {/* Staff Table Controls: Search & Role Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white/5 p-3 rounded-2xl border border-white/10">
                <div className="sm:col-span-8 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
                  <input
                    type="text"
                    value={staffSearchQuery}
                    onChange={(e) => {
                      setStaffSearchQuery(e.target.value);
                      setStaffCurrentPage(1);
                    }}
                    placeholder="Search staff by name, email, or provisioner..."
                    className="w-full bg-stone-900/90 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-amber-500 transition"
                  />
                  {staffSearchQuery && (
                    <button
                      onClick={() => {
                        setStaffSearchQuery('');
                        setStaffCurrentPage(1);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <div className="sm:col-span-4">
                  <select
                    value={staffRoleFilter}
                    onChange={(e) => {
                      setStaffRoleFilter(e.target.value as any);
                      setStaffCurrentPage(1);
                    }}
                    className="w-full bg-[#142319] border border-white/15 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="all">All Assigned Positions ({adminStaffList.length})</option>
                    <option value="super_admin">Super Admins</option>
                    <option value="manager">Managers</option>
                    <option value="supervisor">Supervisors</option>
                    <option value="sales_rep">Sales Representatives</option>
                  </select>
                </div>
              </div>

              {/* Table Results Count & Pagination Page Size */}
              <div className="flex items-center justify-between text-xs text-white/60 px-1">
                <span>
                  Showing {sortedStaffList.length === 0 ? 0 : (safeStaffPage - 1) * staffPageSize + 1} to {Math.min(safeStaffPage * staffPageSize, sortedStaffList.length)} of {sortedStaffList.length} staff
                </span>
                <div className="flex items-center gap-2">
                  <span>Rows:</span>
                  <select
                    value={staffPageSize}
                    onChange={(e) => {
                      setStaffPageSize(Number(e.target.value));
                      setStaffCurrentPage(1);
                    }}
                    className="bg-white/10 border border-white/20 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value={5} className="bg-stone-900">5</option>
                    <option value={10} className="bg-stone-900">10</option>
                    <option value={20} className="bg-stone-900">20</option>
                  </select>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs text-white">
                  <thead className="bg-black/50 text-white/60 border-b border-white/10 uppercase tracking-wider text-[10px] select-none">
                    <tr>
                      <th 
                        className="p-4 cursor-pointer hover:bg-white/5 transition"
                        onClick={() => handleStaffSort('name')}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Administrator / Email</span>
                          {staffSortField === 'name' ? (
                            staffSortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-amber-400" /> : <ArrowDown className="h-3 w-3 text-amber-400" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-white/30" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="p-4 cursor-pointer hover:bg-white/5 transition"
                        onClick={() => handleStaffSort('role')}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Assigned Position</span>
                          {staffSortField === 'role' ? (
                            staffSortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-amber-400" /> : <ArrowDown className="h-3 w-3 text-amber-400" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-white/30" />
                          )}
                        </div>
                      </th>
                      <th className="p-4">Permissions Scope</th>
                      <th 
                        className="p-4 cursor-pointer hover:bg-white/5 transition"
                        onClick={() => handleStaffSort('addedAt')}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Provisioned By</span>
                          {staffSortField === 'addedAt' ? (
                            staffSortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-amber-400" /> : <ArrowDown className="h-3 w-3 text-amber-400" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-white/30" />
                          )}
                        </div>
                      </th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {paginatedStaffList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-white/50">
                          No administrators match your search or filter.
                        </td>
                      </tr>
                    ) : (
                      paginatedStaffList.map(staff => {
                        const isRoot = isImmutableSuperAdmin(staff.email);
                        const staffPerms = getAdminPermissions(staff.role);

                        return (
                          <tr key={staff.email} className={`hover:bg-white/5 transition ${isRoot ? 'bg-amber-500/5' : ''}`}>
                            <td className="p-4">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                                  isRoot ? 'bg-amber-500 text-black' : 'bg-emerald-800 text-white'
                                }`}>
                                  {staff.name ? staff.name.charAt(0).toUpperCase() : staff.email.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-white flex items-center gap-1.5">
                                    <span>{staff.name}</span>
                                    {isRoot && (
                                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/40">
                                        ⭐ ROOT IMMUTABLE
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-white/60 font-mono">
                                    {staff.email}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                staff.role === 'super_admin' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                                staff.role === 'manager' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
                                staff.role === 'supervisor' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' :
                                'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              }`}>
                                {staff.role.replace('_', ' ')}
                              </span>
                            </td>

                            <td className="p-4 font-mono text-[10px] text-white/70">
                              {staff.role === 'super_admin' && 'Full CRUD + Staff Mgmt'}
                              {staff.role === 'manager' && 'Update, Delete, Read Produce'}
                              {staff.role === 'supervisor' && 'Delete, Read Produce Only'}
                              {staff.role === 'sales_rep' && 'Read Produce Only'}
                            </td>

                            <td className="p-4 text-[11px] text-white/60">
                              {staff.addedBy}
                            </td>

                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {isRoot ? (
                                  <span className="text-[10px] text-amber-400/80 font-bold bg-amber-950/40 px-2.5 py-1 rounded border border-amber-500/30 inline-block">
                                    Permanent Root
                                  </span>
                                ) : (permissions.canManageAdmins || currentRole === 'super_admin' || isImmutableSuperAdmin(currentEmail)) ? (
                                  deleteStaffConfirmEmail === staff.email ? (
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={() => handleDeleteStaff(staff.email)}
                                        disabled={isDeletingStaffEmail === staff.email}
                                        className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow"
                                        title="Confirm Revocation"
                                      >
                                        {isDeletingStaffEmail === staff.email ? (
                                          <>
                                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                            <span>Revoking...</span>
                                          </>
                                        ) : (
                                          <>
                                            <Trash2 className="h-3.5 w-3.5" />
                                            <span>Confirm Revoke</span>
                                          </>
                                        )}
                                      </button>
                                      <button
                                        onClick={() => setDeleteStaffConfirmEmail(null)}
                                        disabled={isDeletingStaffEmail === staff.email}
                                        className="text-white/60 hover:text-white px-2 py-1 text-xs cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setDeleteStaffConfirmEmail(staff.email)}
                                      className="text-red-400 hover:text-red-300 hover:bg-red-500/20 px-2.5 py-1.5 rounded-xl transition cursor-pointer border border-red-500/30 hover:border-red-500/60 flex items-center gap-1.5 text-xs font-semibold"
                                      title="Revoke admin position"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      <span>Revoke</span>
                                    </button>
                                  )
                                ) : (
                                  <span className="text-[10px] text-white/30 italic">Protected</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* Staff Pagination Controls */}
                {totalStaffPages > 1 && (
                  <div className="p-3 bg-white/5 border-t border-white/10 flex items-center justify-between">
                    <button
                      onClick={() => setStaffCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={safeStaffPage <= 1}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-xs font-bold transition cursor-pointer flex items-center gap-1 text-white"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>Prev</span>
                    </button>

                    <div className="text-xs text-white/70">
                      Page <span className="font-bold text-white">{safeStaffPage}</span> of <span className="font-bold text-white">{totalStaffPages}</span>
                    </div>

                    <button
                      onClick={() => setStaffCurrentPage(prev => Math.min(totalStaffPages, prev + 1))}
                      disabled={safeStaffPage >= totalStaffPages}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-xs font-bold transition cursor-pointer flex items-center gap-1 text-white"
                    >
                      <span>Next</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Customer Profiles & Questionnaires */}
        {activeTab === 'customer_profiles' && (
          <CustomerProfilesTable />
        )}

        {/* Tab: Pending Approvals (Super Admin Only) */}
        {currentRole === 'super_admin' && activeTab === 'approvals' && (
          <div className="p-6 space-y-6">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-amber-300 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Staged Update Approval Hub
                </h3>
                <p className="text-xs text-amber-200/70 mt-1">
                  Review and authorize changes proposed by managers and operations staff.
                </p>
              </div>
              <div className="bg-amber-500 text-black font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-tighter">
                {pendingUpdates.length} Pending Actions
              </div>
            </div>

            <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
              {pendingUpdates.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCheck className="h-8 w-8 text-white/20" />
                  </div>
                  <h4 className="text-sm font-bold text-white">System Synchronized</h4>
                  <p className="text-xs text-white/50 mt-1">There are no pending updates requiring your authorization.</p>
                </div>
              ) : (
                pendingUpdates.map(update => (
                  <div key={update.id} className="bg-stone-900 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                    <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                          update.type === 'product' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {update.type === 'product' ? <Package className="h-5 w-5" /> : <Settings className="h-5 w-5" />}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white capitalize">
                            {update.type} Update Request
                          </h4>
                          <p className="text-[10px] text-white/50">
                            Requested by {update.requestedByEmail} • {new Date(update.requestedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleReject(update)}
                          disabled={isResolvingUpdate === update.id}
                          className="px-4 py-1.5 rounded-lg text-[10px] font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition cursor-pointer disabled:opacity-50"
                        >
                          Disapproval
                        </button>
                        <button
                          onClick={() => handleApprove(update)}
                          disabled={isResolvingUpdate === update.id}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-6 py-1.5 rounded-lg shadow-lg shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                        >
                          {isResolvingUpdate === update.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          Approve Changes
                        </button>
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-white/40 uppercase">Change Detail</label>
                        <div className="bg-black/50 rounded-xl p-3 text-[11px] font-mono text-emerald-300 max-h-40 overflow-y-auto">
                          <pre className="whitespace-pre-wrap">{JSON.stringify(update.data, null, 2)}</pre>
                        </div>
                      </div>
                      {update.assetToCleanup && (
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black text-white/40 uppercase">Pending Cloudinary Asset</label>
                          <div className="aspect-video bg-black rounded-xl overflow-hidden border border-white/10 relative group">
                            {update.assetToCleanup.resourceType === 'image' ? (
                              <img 
                                src={update.data.heroImageUrl || update.data.imageUrls?.[0]} 
                                className="w-full h-full object-cover" 
                                alt="Pending Asset"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-emerald-950/20">
                                <Play className="h-8 w-8 text-emerald-400" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                              <span className="text-[10px] font-bold text-amber-300">Public ID: {update.assetToCleanup.publicId}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 6: Site Configuration */}
        {activeTab === 'settings' && (
          <div className="p-6">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-emerald-400" />
                    Hero Section Background
                  </h3>
                  <p className="text-xs text-white/50 mt-1">
                    Choose and upload a high-quality video or image for the hero banner.
                  </p>
                </div>
                <div className="flex bg-stone-900 border border-white/10 rounded-xl p-1">
                  <button
                    onClick={() => {
                      setLocalSettings(prev => ({ ...(prev || { id: 'global_config' }), heroBgType: 'video' } as AppSettings));
                      setPendingAssetFile(null);
                      setAssetPreviewUrl(null);
                    }}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition ${
                      (localSettings?.heroBgType || 'video') === 'video'
                        ? 'bg-emerald-500 text-emerald-950 shadow-lg shadow-emerald-500/20'
                        : 'text-white/40 hover:text-white/80'
                    }`}
                  >
                    Video
                  </button>
                  <button
                    onClick={() => {
                      setLocalSettings(prev => ({ ...(prev || { id: 'global_config' }), heroBgType: 'image' } as AppSettings));
                      setPendingAssetFile(null);
                      setAssetPreviewUrl(null);
                    }}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition ${
                      localSettings?.heroBgType === 'image'
                        ? 'bg-emerald-500 text-emerald-950 shadow-lg shadow-emerald-500/20'
                        : 'text-white/40 hover:text-white/80'
                    }`}
                  >
                    Image
                  </button>
                </div>
              </div>

              <div className="bg-stone-900/50 border border-white/10 rounded-3xl p-6 space-y-6">
                {settingsStatus && (
                  <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold ${
                    settingsStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {settingsStatus.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {settingsStatus.text}
                  </div>
                )}

                <div className="grid lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">
                        {(localSettings?.heroBgType || 'video') === 'video' ? 'Video Upload' : 'Image Upload'}
                      </label>
                      <div className="relative group">
                        <input
                          type="file"
                          id="hero-asset-upload"
                          className="hidden"
                          accept={(localSettings?.heroBgType || 'video') === 'video' ? 'video/*' : 'image/*'}
                          onChange={handleAssetUpload}
                          disabled={isUploadingAsset}
                        />
                        <label
                          htmlFor="hero-asset-upload"
                          className={`w-full aspect-video border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 transition cursor-pointer ${
                            isUploadingAsset 
                              ? 'bg-stone-800 border-white/5 opacity-50 cursor-not-allowed' 
                              : 'bg-stone-800/50 border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/5'
                          }`}
                        >
                          {isUploadingAsset ? (
                            <RefreshCw className="h-8 w-8 text-emerald-400 animate-spin" />
                          ) : (
                            <UploadCloud className="h-10 w-10 text-white/20 group-hover:text-emerald-400 transition" />
                          )}
                          <div className="text-center">
                            <span className="text-[11px] font-bold text-white/80 block">
                              {isUploadingAsset 
                                ? `Uploading ${localSettings?.heroBgType === 'image' ? 'Image' : 'Video'}...` 
                                : `Select ${(localSettings?.heroBgType || 'video') === 'video' ? 'Cinematic Video' : 'Background Image'}`}
                            </span>
                            <span className="text-[9px] text-white/40">
                              {(localSettings?.heroBgType || 'video') === 'video' 
                                ? 'MP4, WebM or MOV (Recommended 1920x1080)' 
                                : 'JPG, PNG or WebP (Recommended 1920x1080)'}
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5">Hero Heading</label>
                        <input
                          type="text"
                          value={localSettings?.heroHeading || ''}
                          onChange={e => setLocalSettings(prev => ({ ...(prev || { id: 'global_config' }), heroHeading: e.target.value } as AppSettings))}
                          placeholder="e.g., Fresh Groceries Delivered To Your Doorstep"
                          className="w-full bg-stone-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5">Hero Subheading</label>
                        <textarea
                          value={localSettings?.heroSubheading || ''}
                          onChange={e => setLocalSettings(prev => ({ ...(prev || { id: 'global_config' }), heroSubheading: e.target.value } as AppSettings))}
                          placeholder="e.g., Farm-fresh produce, trusted quality, same-day delivery..."
                          rows={3}
                          className="w-full bg-stone-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Live Preview</label>
                    <div className="aspect-video rounded-2xl bg-black border border-white/10 overflow-hidden relative shadow-inner flex items-center justify-center">
                      {(localSettings?.heroBgType === 'image' ? (assetPreviewUrl || localSettings?.heroImageUrl) : (assetPreviewUrl || localSettings?.heroVideoUrl)) ? (
                        (localSettings?.heroBgType === 'image') ? (
                          <img
                            src={assetPreviewUrl || localSettings?.heroImageUrl}
                            alt="Hero Background Preview"
                            className="w-full h-full object-cover opacity-60"
                          />
                        ) : (
                          <video
                            key={assetPreviewUrl || localSettings?.heroVideoUrl}
                            src={assetPreviewUrl || localSettings?.heroVideoUrl}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover opacity-60"
                          />
                        )
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-white/20">
                          {(localSettings?.heroBgType || 'video') === 'video' ? <Play className="h-10 w-10" /> : <ImageIcon className="h-10 w-10" />}
                          <span className="text-[10px] font-bold uppercase tracking-wider">No {(localSettings?.heroBgType || 'video') === 'video' ? 'Video' : 'Image'} Configured</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 to-transparent flex items-end p-4">
                        <div className="w-full">
                          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 w-1/3" />
                          </div>
                          <div className="mt-2 flex justify-between items-center text-[8px] font-bold text-white/40 uppercase">
                            <span>{ (localSettings?.heroBgType || 'video') === 'video' ? 'Cinematic' : 'Static' } Background Active</span>
                            <span>{ (localSettings?.heroBgType || 'video') === 'video' ? 'Video' : 'Image' } Preview</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {(localSettings?.heroBgType === 'image' ? (assetPreviewUrl || localSettings?.heroImageUrl) : (assetPreviewUrl || localSettings?.heroVideoUrl)) && (
                      <div className="p-3 bg-stone-800/80 rounded-xl border border-white/5">
                        <p className="text-[9px] font-mono text-emerald-400/80 break-all leading-relaxed">
                          <span className="text-white/40 block mb-1 uppercase">
                            {assetPreviewUrl ? 'Local Preview (Pending Upload)' : 'Cloudinary Asset URL'}
                          </span>
                          {(localSettings?.heroBgType === 'image') ? (assetPreviewUrl || localSettings?.heroImageUrl) : (assetPreviewUrl || localSettings?.heroVideoUrl)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* New Size & Lifecycle Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-3.5 w-3.5 text-emerald-400" />
                      <h5 className="text-[10px] font-black text-white/70 uppercase tracking-wider">Image Size Limits (MB)</h5>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <span className="text-[9px] text-white/40 block mb-1 font-bold">Min</span>
                        <input 
                          type="number" 
                          value={localSettings?.minImageSizeMb || 0} 
                          onChange={e => setLocalSettings(prev => ({ ...(prev || {}), minImageSizeMb: Number(e.target.value) } as AppSettings))}
                          className="w-full bg-stone-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-emerald-500/50 outline-none transition" 
                        />
                      </div>
                      <div className="flex-1">
                        <span className="text-[9px] text-white/40 block mb-1 font-bold">Max</span>
                        <input 
                          type="number" 
                          value={localSettings?.maxImageSizeMb || 10} 
                          onChange={e => setLocalSettings(prev => ({ ...(prev || {}), maxImageSizeMb: Number(e.target.value) } as AppSettings))}
                          className="w-full bg-stone-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-emerald-500/50 outline-none transition" 
                        />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                    <div className="flex items-center gap-2">
                      <Play className="h-3.5 w-3.5 text-emerald-400" />
                      <h5 className="text-[10px] font-black text-white/70 uppercase tracking-wider">Video Size Limits (MB)</h5>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <span className="text-[9px] text-white/40 block mb-1 font-bold">Min</span>
                        <input 
                          type="number" 
                          value={localSettings?.minVideoSizeMb || 0} 
                          onChange={e => setLocalSettings(prev => ({ ...(prev || {}), minVideoSizeMb: Number(e.target.value) } as AppSettings))}
                          className="w-full bg-stone-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-emerald-500/50 outline-none transition" 
                        />
                      </div>
                      <div className="flex-1">
                        <span className="text-[9px] text-white/40 block mb-1 font-bold">Max</span>
                        <input 
                          type="number" 
                          value={localSettings?.maxVideoSizeMb || 50} 
                          onChange={e => setLocalSettings(prev => ({ ...(prev || {}), maxVideoSizeMb: Number(e.target.value) } as AppSettings))}
                          className="w-full bg-stone-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-emerald-500/50 outline-none transition" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                      <h5 className="text-[10px] font-black text-white/70 uppercase tracking-wider">Cloudinary Lifecycle Management</h5>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] text-white/40 mb-1 font-bold uppercase tracking-tighter">Cleanup Cycle (Minutes)</label>
                        <input 
                          type="number" 
                          value={localSettings?.cloudinaryCleanupMinutes || 60} 
                          onChange={e => setLocalSettings(prev => ({ ...(prev || {}), cloudinaryCleanupMinutes: Number(e.target.value) } as AppSettings))}
                          className="w-full bg-stone-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:border-amber-500/50 outline-none transition" 
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-white/40 mb-1 font-bold uppercase tracking-tighter">Accepted Media</label>
                        <select 
                          value={localSettings?.acceptedMediaExtensions?.[0] || 'all'}
                          onChange={e => setLocalSettings(prev => ({ ...(prev || {}), acceptedMediaExtensions: e.target.value === 'all' ? ['mp4', 'jpg', 'png', 'webp'] : [e.target.value] } as AppSettings))}
                          className="w-full bg-stone-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500/50 transition appearance-none cursor-pointer"
                        >
                          <option value="all">ALL (MP4, JPG, PNG, WEBP)</option>
                          <option value="mp4">MP4 Video Only</option>
                          <option value="jpg">JPG Image Only</option>
                        </select>
                      </div>
                    </div>
                    <p className="text-[9px] text-white/30 italic">Automated cleanup will permanently purge orphaned or rejected Cloudinary assets based on this cycle.</p>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5 flex justify-end">
                  <button
                    onClick={saveSettings}
                    disabled={isSavingSettings || !localSettings}
                    className="rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-stone-700 disabled:text-white/20 px-8 py-3.5 text-xs font-black text-emerald-950 shadow-lg shadow-emerald-500/20 transition cursor-pointer flex items-center gap-2"
                  >
                    {isSavingSettings ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>
                          {isUploadingAsset ? `UPLOADING ${localSettings?.heroBgType === 'image' ? 'IMAGE' : 'VIDEO'} (${uploadProgress}%)...` : 'FINALIZING ASSETS...'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>APPLY SITE CONFIGURATION</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Embedded Produce Edit Modal */}
      {isEditorOpen && (
        <AdminProduceModal
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingProduct(null);
          }}
          product={editingProduct}
          operatorRole={currentRole}
          operatorEmail={currentEmail}
          onSave={async (saved) => {
            if (currentRole === 'manager') {
              await createPendingUpdate({
                type: 'product',
                targetId: saved.id || 'new_product',
                data: saved,
                requestedBy: currentEmail || 'Manager',
                requestedByEmail: currentEmail || ''
              });
              alert('Product update submitted for Super Admin approval.');
            } else {
              await onSaveProduct(saved);
            }
            setIsEditorOpen(false);
            setEditingProduct(null);
            onRefreshProducts();
          }}
        />
      )}
    </div>
  );
};
