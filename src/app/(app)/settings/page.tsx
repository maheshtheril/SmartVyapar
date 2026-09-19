'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Building2, 
  Users, 
  ShieldCheck, 
  Image as ImageIcon, 
  Save, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  QrCode, 
  Lock, 
  Mail, 
  Phone, 
  User, 
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  SlidersHorizontal,
  BadgeCheck
} from 'lucide-react';
import { getStateFromGstin } from '@/lib/schemas/register';

function SettingsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'users' ? 'USERS' : 'PROFILE';
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'USERS'>(initialTab);

  // Profile Form State
  const [profile, setProfile] = useState({
    businessName: '',
    legalName: '',
    logoUrl: '',
    gstin: '',
    phone: '',
    email: '',
    address: '',
    pincode: '',
    upiId: '',
    isComposition: false,
    subscriptionTier: 'FREE',
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Users / Team State
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>('STAFF');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Add User Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'STAFF' | 'MANAGER' | 'OWNER'>('STAFF');
  const [addingUser, setAddingUser] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  // Load tenant profile & permissions
  const loadProfile = async () => {
    setLoadingProfile(true);
    try {
      const res = await fetch('/api/tenant');
      const data = await res.json();
      if (data.success && data.tenant) {
        setProfile({
          businessName: data.tenant.businessName || '',
          legalName: data.tenant.legalName || '',
          logoUrl: data.tenant.logoUrl || '',
          gstin: data.tenant.gstin || '',
          phone: data.tenant.phone || '',
          email: data.tenant.email || '',
          address: data.tenant.address || '',
          pincode: data.tenant.pincode || '',
          upiId: data.tenant.upiId || '',
          isComposition: !!data.tenant.isComposition,
          subscriptionTier: data.tenant.subscriptionTier || 'FREE',
        });
      }
      if (data.user) {
        setCurrentUserRole(data.user.role);
        setCurrentUserId(data.user.id);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Load team members
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (activeTab === 'USERS') {
      loadUsers();
    }
  }, [activeTab]);

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);

    try {
      const res = await fetch('/api/tenant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setProfileMsg({ type: 'success', text: 'Company profile and logo updated successfully!' });
      setTimeout(() => setProfileMsg(null), 4000);
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Error updating profile' });
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Add New User
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingUser(true);
    setUserError(null);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail || undefined,
          phone: newUserPhone,
          password: newUserPassword,
          role: newUserRole,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add user');
      }

      // Reset form & reload
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPhone('');
      setNewUserPassword('');
      setNewUserRole('STAFF');
      setShowAddUserModal(false);
      loadUsers();
    } catch (err: any) {
      setUserError(err.message || 'Error creating user');
    } finally {
      setAddingUser(false);
    }
  };

  // Handle User Status Toggle
  const handleToggleUserStatus = async (user: any) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        loadUsers();
      } else {
        alert(data.error || 'Failed to update status');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle User Deletion
  const handleDeleteUser = async (user: any) => {
    if (!confirm(`Are you sure you want to remove team member "${user.name}"?`)) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        loadUsers();
      } else {
        alert(data.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const detectedState = profile.gstin && profile.gstin.length >= 2 
    ? getStateFromGstin(profile.gstin) 
    : null;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Building2 className="h-6 w-6 text-indigo-600" />
            <span>Settings & Team Administration</span>
          </h1>
          <p className="text-xs text-slate-500">Configure company branding, logo, GST registration, and user access levels</p>
        </div>

        {/* Plan Badge */}
        <div className="flex items-center space-x-2 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl">
          <BadgeCheck className="h-4 w-4 text-indigo-600" />
          <span className="text-xs font-bold text-indigo-900">Plan: {profile.subscriptionTier}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('PROFILE')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'PROFILE'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Company Profile & Logo</span>
        </button>

        <button
          onClick={() => setActiveTab('USERS')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'USERS'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Team & Permissions (RBAC)</span>
        </button>
      </div>

      {/* TAB 1: Company Profile & Logo */}
      {activeTab === 'PROFILE' && (
        <div className="space-y-6">
          {profileMsg && (
            <div className={`p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
              profileMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {profileMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              <span>{profileMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Logo Section */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <ImageIcon className="h-4 w-4 text-indigo-600" />
                <span>Company Logo & Visual Identity</span>
              </h2>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                {/* Logo Preview */}
                <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                  {profile.logoUrl ? (
                    <img 
                      src={profile.logoUrl} 
                      alt="Company Logo" 
                      className="h-full w-full object-contain p-1"
                      onError={(e: any) => { e.target.src = '/icon.svg'; }}
                    />
                  ) : (
                    <div className="text-center p-2">
                      <ImageIcon className="h-7 w-7 text-slate-400 mx-auto" />
                      <span className="text-[10px] text-slate-400 font-semibold block mt-1">No Logo</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2 w-full">
                  <label className="block text-xs font-bold text-slate-700">
                    Logo Image URL (PNG, JPG, or SVG)
                  </label>
                  <input
                    type="url"
                    value={profile.logoUrl}
                    onChange={(e) => setProfile({ ...profile, logoUrl: e.target.value })}
                    placeholder="https://your-domain.com/logo.png or image CDN link"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500">
                    Your logo will be printed at the top of tax invoices, thermal billing receipts, and POS receipts.
                  </p>
                </div>
              </div>
            </div>

            {/* Business Details */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-indigo-600" />
                <span>Business & Legal Information</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Trade / Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={profile.businessName}
                    onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-indigo-600 focus:outline-none font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Legal Entity Name (As on GST / MCA)
                  </label>
                  <input
                    type="text"
                    value={profile.legalName}
                    onChange={(e) => setProfile({ ...profile, legalName: e.target.value })}
                    placeholder="e.g. Apex Auto Spares Pvt Ltd"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    GSTIN (15-Digit Goods & Services Tax Number)
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={profile.gstin}
                    onChange={(e) => setProfile({ ...profile, gstin: e.target.value.toUpperCase() })}
                    placeholder="32AAAAA0000A1Z5"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-indigo-600 focus:outline-none font-mono uppercase font-bold text-slate-900"
                  />
                  {detectedState && (
                    <span className="inline-block mt-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      State detected: {detectedState.stateName} (Code {detectedState.stateCode})
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Primary Phone / Mobile *
                  </label>
                  <input
                    type="tel"
                    required
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-indigo-600 focus:outline-none font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Official Business Email
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    placeholder="billing@yourbusiness.com"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    UPI VPA ID (For Instant Dynamic QR on Bills) *
                  </label>
                  <div className="relative">
                    <QrCode className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={profile.upiId}
                      onChange={(e) => setProfile({ ...profile, upiId: e.target.value })}
                      placeholder="business@okaxis or 9876543210@upi"
                      className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs focus:border-indigo-600 focus:outline-none font-mono font-semibold"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Physical Store / Workshop Address
                  </label>
                  <input
                    type="text"
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    placeholder="Shop No. 4, Main Highway Road, Industrial Estate"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Postal Pincode
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={profile.pincode}
                    onChange={(e) => setProfile({ ...profile, pincode: e.target.value })}
                    placeholder="682001"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-indigo-600 focus:outline-none font-mono"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center space-x-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.isComposition}
                      onChange={(e) => setProfile({ ...profile, isComposition: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span>Registered under GST Composition Scheme (No Tax Collection)</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition flex items-center space-x-2 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: Team Members & Permissions (RBAC) */}
      {activeTab === 'USERS' && (
        <div className="space-y-6">
          {/* Permission Levels Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4 space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="rounded-lg bg-purple-600 p-1.5 text-white">
                  <ShieldAlert className="h-4 w-4" />
                </span>
                <span className="font-bold text-xs text-purple-950">Owner Level</span>
              </div>
              <p className="text-[11px] text-purple-800 leading-relaxed">
                Full master authority. Can invite/delete staff, update company GST & bank details, delete records, view statutory audit logs, and manage subscription.
              </p>
            </div>

            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="rounded-lg bg-indigo-600 p-1.5 text-white">
                  <SlidersHorizontal className="h-4 w-4" />
                </span>
                <span className="font-bold text-xs text-indigo-950">Manager Level</span>
              </div>
              <p className="text-[11px] text-indigo-800 leading-relaxed">
                Operations lead. Can add products, approve purchase bills, change inventory selling prices, manage customer Khata, and view daily sales reports.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="rounded-lg bg-emerald-600 p-1.5 text-white">
                  <BadgeCheck className="h-4 w-4" />
                </span>
                <span className="font-bold text-xs text-emerald-950">Staff / Cashier Level</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Counter billing only. Can create POS bills, look up stock, print thermal receipts, and register customers. Blocked from ledgers and profit margins.
              </p>
            </div>
          </div>

          {/* Team Table Header */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Users className="h-4 w-4 text-indigo-600" />
                  <span>Authorized Team Members ({users.length})</span>
                </h2>
                <p className="text-xs text-slate-500">Manage user accounts, roles, and login credentials</p>
              </div>

              {currentUserRole === 'OWNER' && (
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition flex items-center space-x-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ Add Team Member</span>
                </button>
              )}
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-y border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Role & Permissions</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const isSelf = u.id === currentUserId;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 flex items-center space-x-2">
                            <span>{u.name}</span>
                            {isSelf && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.2 rounded">You</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">{u.email || 'No email registered'}</div>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.role === 'OWNER'
                              ? 'bg-purple-100 text-purple-800'
                              : u.role === 'MANAGER'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {u.role}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-700 font-medium">
                          {u.phone}
                        </td>

                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            disabled={isSelf || currentUserRole !== 'OWNER'}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition disabled:opacity-50 ${
                              u.isActive
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                            }`}
                            title={isSelf ? "Cannot deactivate yourself" : "Click to toggle status"}
                          >
                            {u.isActive ? 'Active' : 'Disabled'}
                          </button>
                        </td>

                        <td className="py-3 px-4 text-right">
                          {!isSelf && currentUserRole === 'OWNER' && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete user"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add User Modal */}
          {showAddUserModal && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <User className="h-4 w-4 text-indigo-600" />
                    <span>Add New Team Member</span>
                  </h3>
                  <button
                    onClick={() => setShowAddUserModal(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>

                {userError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                    {userError}
                  </div>
                )}

                <form onSubmit={handleAddUser} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Login Email Address</label>
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="rahul@yourbusiness.com"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      value={newUserPhone}
                      onChange={(e) => setNewUserPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Login Password * (Min 6 chars)</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Role & Permissions Level *</label>
                    <select
                      value={newUserRole}
                      onChange={(e: any) => setNewUserRole(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none font-bold"
                    >
                      <option value="STAFF">🏷️ STAFF — Counter Billing Only</option>
                      <option value="MANAGER">💼 MANAGER — Inventory & Pricing Access</option>
                      <option value="OWNER">👑 OWNER — Full Administrative Control</option>
                    </select>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowAddUserModal(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addingUser}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition disabled:opacity-50"
                    >
                      {addingUser ? 'Creating...' : 'Create Account'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      }
    >
      <SettingsContent />
    </React.Suspense>
  );
}
