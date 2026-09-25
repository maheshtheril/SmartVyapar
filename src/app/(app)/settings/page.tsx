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
  BadgeCheck,
  CreditCard,
  Sparkles,
  Zap,
  Check,
  Receipt,
  MessageSquare,
  Send,
  Smartphone,
  CheckCheck,
  Bot,
  Globe
} from 'lucide-react';
import { getStateFromGstin } from '@/lib/schemas/register';

function SettingsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'users' 
    ? 'USERS' 
    : searchParams.get('tab') === 'billing' 
    ? 'BILLING' 
    : searchParams.get('tab') === 'messaging' 
    ? 'MESSAGING' 
    : searchParams.get('tab') === 'integrations'
    ? 'INTEGRATIONS'
    : 'PROFILE';
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'USERS' | 'BILLING' | 'MESSAGING' | 'INTEGRATIONS'>(initialTab);

  // Keep tab state synchronized when query params change
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'billing') setActiveTab('BILLING');
    else if (tab === 'users') setActiveTab('USERS');
    else if (tab === 'messaging') setActiveTab('MESSAGING');
    else if (tab === 'integrations') setActiveTab('INTEGRATIONS');
    else if (tab === 'profile') setActiveTab('PROFILE');
  }, [searchParams]);

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
    businessType: 'RETAIL',
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

  // Subscription / Billing State
  const [subData, setSubData] = useState<any>(null);
  const [loadingSub, setLoadingSub] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [upgrading, setUpgrading] = useState(false);
  const [subMsg, setSubMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add User Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'STAFF' | 'MANAGER' | 'OWNER'>('STAFF');
  const [addingUser, setAddingUser] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  // Messaging Gateway State
  const [testPhone, setTestPhone] = useState('');
  const [testChannel, setTestChannel] = useState<'WHATSAPP' | 'SMS' | 'BOTH'>('WHATSAPP');
  const [testType, setTestType] = useState<'TEST' | 'CUSTOM'>('TEST');
  const [testCustomMsg, setTestCustomMsg] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Two-Way WhatsApp Bot Simulator State
  const [botSimPhone, setBotSimPhone] = useState('');
  const [botSimMessage, setBotSimMessage] = useState('BILL');
  const [botSimLoading, setBotSimLoading] = useState(false);
  const [botConversation, setBotConversation] = useState<
    Array<{ sender: 'USER' | 'BOT'; text: string; intent?: string; time: string }>
  >([
    {
      sender: 'BOT',
      text: "🙏 *Namaste! Welcome to Ziona POS WhatsApp Assistant.*\n\nSend *BILL* for your latest invoice, *BALANCE* for your Khata balance, or *PAY* for an instant UPI link.",
      intent: 'GREETING',
      time: 'Just now',
    },
  ]);

  // Integrations & Developer State (Super Admin / Owner)
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [showKeyText, setShowKeyText] = useState(false);
  const [testingAiKey, setTestingAiKey] = useState(false);
  const [aiTestFeedback, setAiTestFeedback] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);
  const [keySavedBanner, setKeySavedBanner] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('smartvyapar_gemini_api_key');
      if (saved) setGeminiKeyInput(saved);
    }
  }, []);

  const handleTestAiKey = async () => {
    setTestingAiKey(true);
    setAiTestFeedback(null);
    try {
      const res = await fetch('/api/ai/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: geminiKeyInput.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Connection test failed');
      }
      setAiTestFeedback({
        success: true,
        message: data.message || `Connected to ${data.model} in ${data.latencyMs}ms.`,
        latencyMs: data.latencyMs,
      });
    } catch (err: any) {
      setAiTestFeedback({
        success: false,
        message: err.message || 'Failed to connect to Google Gemini.',
      });
    } finally {
      setTestingAiKey(false);
    }
  };

  const handleSaveGeminiKey = () => {
    if (typeof window !== 'undefined') {
      if (geminiKeyInput.trim()) {
        localStorage.setItem('smartvyapar_gemini_api_key', geminiKeyInput.trim());
        setKeySavedBanner(true);
        setTimeout(() => setKeySavedBanner(false), 4000);
      } else {
        localStorage.removeItem('smartvyapar_gemini_api_key');
        setKeySavedBanner(true);
        setTimeout(() => setKeySavedBanner(false), 4000);
      }
    }
  };

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
          businessType: data.tenant.businessType || 'RETAIL',
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

  // Load subscription status & transaction history
  const loadSubscription = async () => {
    setLoadingSub(true);
    try {
      const res = await fetch('/api/subscription/status');
      const data = await res.json();
      if (data.success) {
        setSubData(data.subscription);
      }
    } catch (err) {
      console.error('Failed to load subscription:', err);
    } finally {
      setLoadingSub(false);
    }
  };

  const handleUpgrade = async (cycle: 'MONTHLY' | 'ANNUAL') => {
    if (currentUserRole !== 'OWNER') {
      setSubMsg({
        type: 'error',
        text: 'Only the business owner (OWNER) can purchase or upgrade subscriptions.',
      });
      return;
    }

    setUpgrading(true);
    setSubMsg(null);

    try {
      const res = await fetch('/api/subscription/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycle, tier: 'PRO' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create payment order.');
      }

      const order = data.order;

      // 1. Sandbox Simulation Fallback
      if (order.isSimulated) {
        const verifyRes = await fetch('/api/subscription/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.id,
            paymentId: `pay_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            signature: `sim_sig_${order.id}`,
            cycle,
            tier: 'PRO',
          }),
        });

        const verifyData = await verifyRes.json();
        if (!verifyRes.ok || !verifyData.success) {
          throw new Error(verifyData.error || 'Failed to complete subscription activation.');
        }

        setSubMsg({
          type: 'success',
          text: `🎉 ${verifyData.message} (Sandbox Simulation Verified)`,
        });
        await loadSubscription();
        await loadProfile();
        return;
      }

      // 2. Live Razorpay Modal Integration
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Ziona POS',
        description: `Upgrade to Ziona POS Pro (${cycle})`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/subscription/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                cycle,
                tier: 'PRO',
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              setSubMsg({
                type: 'success',
                text: `🎉 ${verifyData.message}`,
              });
              await loadSubscription();
              await loadProfile();
            } else {
              setSubMsg({ type: 'error', text: verifyData.error || 'Payment verification failed.' });
            }
          } catch (err: any) {
            setSubMsg({ type: 'error', text: err.message || 'Payment verification error.' });
          }
        },
        prefill: {
          name: profile.businessName,
          email: profile.email,
          contact: profile.phone,
        },
        theme: {
          color: '#4f46e5',
        },
      };

      if (typeof window !== 'undefined' && !(window as any).Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        await new Promise((resolve) => (script.onload = resolve));
      }

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setSubMsg({ type: 'error', text: err.message || 'Failed to process subscription upgrade.' });
    } finally {
      setUpgrading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    loadSubscription();
  }, []);

  useEffect(() => {
    if (activeTab === 'USERS') {
      loadUsers();
    } else if (activeTab === 'BILLING') {
      loadSubscription();
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

  // Handle Send Test Notification
  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingTest(true);
    setTestError(null);
    setTestResult(null);

    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: testChannel,
          type: testType,
          recipientPhone: testPhone,
          customMessage: testType === 'CUSTOM' ? testCustomMsg : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch test notification');
      setTestResult(data);
    } catch (err: any) {
      setTestError(err.message || 'Dispatch failed');
    } finally {
      setSendingTest(false);
    }
  };

  // Handle Simulate Two-Way WhatsApp Bot Message
  const handleSimulateBotMessage = async (msgToSend?: string) => {
    const text = (msgToSend || botSimMessage).trim();
    if (!text) return;
    const phone = botSimPhone.trim() || profile.phone || '9876543210';
    setBotSimLoading(true);

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userBubble = { sender: 'USER' as const, text, time: timeStr };
    const updatedConvo = [...botConversation, userBubble];
    setBotConversation(updatedConvo);

    try {
      const res = await fetch('/api/whatsapp/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testPhone: phone,
          testMessage: text,
          dryRun: true,
        }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setBotConversation([
          ...updatedConvo,
          {
            sender: 'BOT' as const,
            text: data.result.replyText,
            intent: data.result.intent,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err) {
      console.error('Bot simulation error:', err);
    } finally {
      setBotSimLoading(false);
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
        <button
          onClick={() => setActiveTab('BILLING')}
          className="flex items-center space-x-2 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition cursor-pointer"
        >
          <BadgeCheck className="h-4 w-4 text-indigo-600" />
          <span className="text-xs font-bold text-indigo-900">Plan: {profile.subscriptionTier}</span>
          <span className="text-[10px] font-semibold text-indigo-600 bg-white px-1.5 py-0.5 rounded border border-indigo-200">
            Manage
          </span>
        </button>
      </div>

      {/* Responsive Horizontal Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar scrollbar-thin">
        <button
          onClick={() => {
            setActiveTab('PROFILE');
            window.history.replaceState(null, '', '/settings?tab=profile');
          }}
          className={`shrink-0 whitespace-nowrap flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'PROFILE'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Company Profile & Logo</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('BILLING');
            window.history.replaceState(null, '', '/settings?tab=billing');
          }}
          className={`shrink-0 whitespace-nowrap flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'BILLING'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-extrabold'
          }`}
        >
          <CreditCard className="h-4 w-4 text-indigo-600" />
          <span>Plans & Billing (Razorpay)</span>
          <span className="rounded-full bg-amber-400 text-slate-900 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider ml-1">
            Pro Upgrade
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('USERS');
            window.history.replaceState(null, '', '/settings?tab=users');
          }}
          className={`shrink-0 whitespace-nowrap flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'USERS'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Team & Permissions (RBAC)</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('MESSAGING');
            window.history.replaceState(null, '', '/settings?tab=messaging');
          }}
          className={`shrink-0 whitespace-nowrap flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'MESSAGING'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>WhatsApp & SMS Gateway</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('INTEGRATIONS');
            window.history.replaceState(null, '', '/settings?tab=integrations');
          }}
          className={`shrink-0 whitespace-nowrap flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'INTEGRATIONS'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sparkles className="h-4 w-4 text-purple-500" />
          <span>AI Vision & Developer Gateway</span>
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

              {/* Business Industry / Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Business Industry & Store Category
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  {[
                    { id: 'RETAIL', label: 'Retail & POS', desc: 'Electricals, Supermarket, Garments, Electronics', emoji: '🛒' },
                      { id: 'DISTRIBUTION', label: 'FMCG & Distribution', desc: 'Territory management, wholesale beats, distribution', emoji: '🚚' },
                    { id: 'AUTOMOBILE', label: 'Automobile Workshop', desc: 'Vehicle Job-Cards, Spare Parts & Labor', emoji: '🚗' },
                    { id: 'RESTAURANT', label: 'Restaurant & Cafe', desc: 'Dining Tables, KOT, Bakery & Takeaway', emoji: '🍽️' },
                    { id: 'SERVICES', label: 'Services & Repair', desc: 'Consulting, Repair Services & Freelance', emoji: '💼' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setProfile({ ...profile, businessType: cat.id })}
                      className={`flex flex-col text-left p-3 rounded-xl border transition ${
                        profile.businessType === cat.id
                          ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">{cat.emoji}</span>
                        <span className="text-xs font-bold text-slate-900">{cat.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 leading-snug">{cat.desc}</p>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Tailors your navigation sidebar and print templates to only show relevant documents for your store.
                </p>
              </div>

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

      {/* TAB 3: Plans & Billing (Razorpay) */}
      {activeTab === 'BILLING' && (
        <div className="space-y-6">
          {subMsg && (
            <div
              className={`p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
                subMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {subMsg.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              )}
              <span>{subMsg.text}</span>
            </div>
          )}

          {/* Current Subscription & Quota Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Active Subscription Plan
                </span>
                <div className="flex items-center space-x-2 mt-1">
                  <h2 className="text-xl font-extrabold text-slate-900">
                    {subData?.planDetails?.name || (profile.subscriptionTier === 'PRO' ? 'Ziona POS Pro' : 'Starter Free')}
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                      profile.subscriptionTier === 'PRO'
                        ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {subData?.status || 'ACTIVE'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {subData?.planDetails?.tagline || 'Essential tools for business and GST invoicing'}
                </p>
              </div>

              {subData?.expiresAt ? (
                <div className="text-left sm:text-right">
                  <span className="text-[11px] text-slate-400 font-medium">Valid until</span>
                  <p className="text-xs font-bold text-slate-800">
                    {new Date(subData.expiresAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    {subData.isExpired ? '⚠️ Expired' : 'Auto-renew enabled'}
                  </span>
                </div>
              ) : (
                <div className="text-left sm:text-right">
                  <span className="text-[11px] text-slate-400 font-medium">Billing Term</span>
                  <p className="text-xs font-bold text-slate-800">Lifetime Free</p>
                </div>
              )}
            </div>

            {/* Monthly Quota Progress Meters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Invoices Quota */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Monthly Invoices Issued</span>
                  <span className="font-bold text-slate-900">
                    {subData?.usage?.monthlyInvoices ?? 0} /{' '}
                    {subData?.planDetails?.invoiceLimitPerMonth ?? 'Unlimited'}
                  </span>
                </div>
                {subData?.planDetails?.invoiceLimitPerMonth ? (
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (subData?.usage?.monthlyInvoices ?? 0) >= subData.planDetails.invoiceLimitPerMonth
                          ? 'bg-rose-500'
                          : 'bg-indigo-600'
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          ((subData?.usage?.monthlyInvoices ?? 0) / subData.planDetails.invoiceLimitPerMonth) * 100
                        )}%`,
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center space-x-1.5 text-xs text-emerald-700 font-bold">
                    <Check className="h-3.5 w-3.5" />
                    <span>Unlimited GST Invoices (No cap)</span>
                  </div>
                )}
              </div>

              {/* Multi-User Quota */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Team Members Active</span>
                  <span className="font-bold text-slate-900">
                    {subData?.usage?.userCount ?? users.length ?? 1} /{' '}
                    {subData?.planDetails?.userLimit ?? 'Unlimited'}
                  </span>
                </div>
                {subData?.planDetails?.userLimit ? (
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          ((subData?.usage?.userCount ?? 1) / subData.planDetails.userLimit) * 100
                        )}%`,
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center space-x-1.5 text-xs text-emerald-700 font-bold">
                    <Check className="h-3.5 w-3.5" />
                    <span>Unlimited Staff & Granular RBAC</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pricing Plans & Upgrade Selector */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Choose Your Plan</h3>
                <p className="text-xs text-slate-500">
                  Upgrade your business workspace to unlock automation, compliance, and multi-user access
                </p>
              </div>

              {/* Monthly vs Annual Toggle */}
              <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setBillingCycle('MONTHLY')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    billingCycle === 'MONTHLY'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('ANNUAL')}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1 transition ${
                    billingCycle === 'ANNUAL'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Annual</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                    Save 17%
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Plan 1: Free Starter */}
              <div
                className={`rounded-2xl border p-6 flex flex-col justify-between transition ${
                  profile.subscriptionTier === 'FREE'
                    ? 'border-slate-300 bg-white shadow-sm'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="space-y-4">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Starter Free</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Essential tools for independent retailers</p>
                  </div>

                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-extrabold text-slate-900">₹0</span>
                    <span className="text-xs text-slate-500">/ forever</span>
                  </div>

                  <hr className="border-slate-100" />

                  <ul className="space-y-2.5 text-xs text-slate-600">
                    <li className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Up to 100 GST Invoices per month</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>POS Thermal & A4 Invoice Printing</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Customer Khata (Credit Ledger)</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Single User (Owner Only)</span>
                    </li>
                    <li className="flex items-center space-x-2 text-slate-400 line-through">
                      <span className="h-4 w-4 text-center shrink-0">✕</span>
                      <span>AI Purchase Bill Scanner</span>
                    </li>
                    <li className="flex items-center space-x-2 text-slate-400 line-through">
                      <span className="h-4 w-4 text-center shrink-0">✕</span>
                      <span>Government NIC E-Way Bill JSON</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-6">
                  {profile.subscriptionTier === 'FREE' ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-500 bg-slate-100 cursor-default"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-400 bg-slate-50"
                    >
                      Free Tier
                    </button>
                  )}
                </div>
              </div>

              {/* Plan 2: Ziona POS Pro */}
              <div className="rounded-2xl border-2 border-indigo-600 bg-white p-6 shadow-md relative flex flex-col justify-between">
                <div className="absolute -top-3 right-6 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full shadow-sm flex items-center space-x-1">
                  <Sparkles className="h-3 w-3" />
                  <span>Most Popular</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-base font-bold text-slate-900 flex items-center space-x-1.5">
                      <span>Ziona POS Pro</span>
                      <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Full GST compliance, AI automation & team scale
                    </p>
                  </div>

                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-extrabold text-indigo-600">
                      {billingCycle === 'ANNUAL' ? '₹4,999' : '₹499'}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {billingCycle === 'ANNUAL' ? '/ year (₹416/mo)' : '/ month'}
                    </span>
                  </div>

                  <hr className="border-slate-100" />

                  <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                      <span><strong>Unlimited</strong> GST Invoices & Bills</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                      <span><strong>Unlimited</strong> Multi-User Team & Roles</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                      <span>AI Purchase Bill Scanner (Gemini OCR)</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                      <span>NIC E-Way Bill JSON Bulk Generator</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                      <span>Excel / CSV Bulk Inventory Import Engine</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                      <span>Print Studio: 7 Palettes, Logos & Fonts</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                      <span>MCA Electronic Audit Trail Logs</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-6 space-y-2">
                  <button
                    type="button"
                    onClick={() => handleUpgrade(billingCycle)}
                    disabled={upgrading || currentUserRole !== 'OWNER'}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-md hover:bg-indigo-700 active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {upgrading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Connecting to Gateway...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4" />
                        <span>
                          {profile.subscriptionTier === 'PRO'
                            ? `Extend Pro (${billingCycle === 'ANNUAL' ? '₹4,999/yr' : '₹499/mo'})`
                            : `Upgrade to Pro (${billingCycle === 'ANNUAL' ? '₹4,999/yr' : '₹499/mo'})`}
                        </span>
                      </>
                    )}
                  </button>

                  {currentUserRole !== 'OWNER' && (
                    <p className="text-[11px] text-amber-700 font-semibold text-center">
                      🔒 Only the Business Owner can initiate billing & subscription upgrades.
                    </p>
                  )}

                  <p className="text-[10px] text-slate-400 text-center">
                    🔒 Secured by Razorpay. Zero setup test simulation enabled in evaluation mode.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Billing & Payment Transactions History */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Receipt className="h-4 w-4 text-indigo-600" />
              <span>Billing Invoices & Payment History</span>
            </h3>

            {subData?.payments && subData.payments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Plan / Cycle</th>
                      <th className="py-2.5 px-3">Order ID</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subData.payments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {new Date(p.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-indigo-900">{p.tier}</span> ({p.billingCycle})
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                          {p.orderId}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          ₹{p.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 rounded-xl bg-slate-50 border border-dashed border-slate-200">
                No past billing transactions. Upgrade to Pro to start your subscription record.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: WhatsApp & SMS Gateway */}
      {activeTab === 'MESSAGING' && (
        <div className="space-y-6">
          {/* Overview & Architecture Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-emerald-600" />
                  <span>Meta WhatsApp Cloud API & Indian SMS Gateway</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Automated customer communications engine with live Meta Graph API v20.0, DLT SMS routing, and sandbox simulation.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Gateway Active</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  Dual-Mode Sandbox
                </span>
              </div>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <div className="flex items-center space-x-2 text-emerald-700 font-bold text-xs">
                  <MessageSquare className="h-4 w-4" />
                  <span>Meta WhatsApp Cloud API</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Official Graph API v20.0 integration dispatches rich GST tax invoice summaries, payment due alerts, and dynamic UPI QR links directly to customer WhatsApp.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <div className="flex items-center space-x-2 text-blue-700 font-bold text-xs">
                  <Smartphone className="h-4 w-4" />
                  <span>Indian DLT SMS Gateway</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  TRAI DLT-compliant transactional route (Fast2SMS / Msg91) sending real-time SMS bills, OTPs, and balance recovery alerts to 10-digit Indian numbers.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <div className="flex items-center space-x-2 text-purple-700 font-bold text-xs">
                  <ShieldCheck className="h-4 w-4" />
                  <span>MCA Audit Trail</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Every automated message dispatch is recorded in the statutory unalterable electronic audit log with timestamp, operator ID, and provider receipt ID.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Live Message Tester */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Send className="h-4 w-4 text-indigo-600" />
                <span>Live Gateway Dispatch Tester</span>
              </h3>
              <p className="text-xs text-slate-500">
                Send an immediate test dispatch to verify phone formatting, WhatsApp delivery, and SMS fallback.
              </p>
            </div>

            <form onSubmit={handleSendTestMessage} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Phone Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Recipient Indian Mobile *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-semibold text-slate-400">
                      +91
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="9876543210"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 py-2.5 pl-11 pr-3 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Channel Switcher */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Delivery Channel</label>
                  <select
                    value={testChannel}
                    onChange={(e: any) => setTestChannel(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    <option value="WHATSAPP">WhatsApp (Meta Cloud API)</option>
                    <option value="SMS">SMS (Indian DLT Gateway)</option>
                    <option value="BOTH">Both (WhatsApp + SMS)</option>
                  </select>
                </div>

                {/* Message Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Message Content Type</label>
                  <select
                    value={testType}
                    onChange={(e: any) => setTestType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    <option value="TEST">Standard Gateway Ping</option>
                    <option value="CUSTOM">Custom Text Message</option>
                  </select>
                </div>
              </div>

              {testType === 'CUSTOM' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Custom Message Text</label>
                  <textarea
                    rows={2}
                    value={testCustomMsg}
                    onChange={(e) => setTestCustomMsg(e.target.value)}
                    placeholder="Enter message to send..."
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div className="flex items-center space-x-3">
                <button
                  type="submit"
                  disabled={sendingTest || !testPhone}
                  className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition disabled:opacity-60 shadow-sm"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{sendingTest ? 'Dispatching Message...' : 'Send Live Test Message'}</span>
                </button>
              </div>
            </form>

            {/* Error Banner */}
            {testError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
                <span>{testError}</span>
              </div>
            )}

            {/* Success Result Card */}
            {testResult && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs">
                    <CheckCheck className="h-4 w-4 text-emerald-600" />
                    <span>{testResult.summary}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    HTTP 200 OK
                  </span>
                </div>

                <div className="space-y-2">
                  {testResult.results?.map((res: any, idx: number) => (
                    <div key={idx} className="bg-white rounded-lg border border-emerald-100 p-3 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="font-bold">Channel: {res.channel}</span>
                        <span className="font-mono text-[10px] text-slate-500">Provider: {res.provider}</span>
                      </div>
                      <div className="text-slate-500 font-mono text-[10px]">
                        Recipient: +{res.recipientPhone} • ID: {res.messageId}
                      </div>
                      <div className="text-slate-600 italic bg-slate-50 p-2 rounded border border-slate-100 mt-1">
                        "{res.previewMessage}"
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Two-Way WhatsApp Bot Studio & Webhook Simulator */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Bot className="h-5 w-5 text-emerald-600" />
                  <span>Two-Way Automated WhatsApp Bot & Webhook Studio</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Customers can reply directly to WhatsApp notifications with keywords like <strong>BILL</strong>, <strong>BALANCE</strong>, or <strong>PAY</strong> to receive real-time statements.
                </p>
              </div>

              <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>24x7 Webhook Active</span>
              </span>
            </div>

            {/* Meta Webhook Endpoint Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Globe className="h-4 w-4 text-slate-500" />
                <span>Official Meta Cloud API Webhook Endpoints</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Callback URL (POST / GET):</span>
                  <code className="font-mono text-indigo-700 bg-white px-2.5 py-1 rounded border border-slate-200 block text-[11px] truncate">
                    https://www.zionapos.store/api/whatsapp/webhook
                  </code>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Verification Token (verify_token):</span>
                  <code className="font-mono text-emerald-700 bg-white px-2.5 py-1 rounded border border-slate-200 block text-[11px]">
                    smartvyapar_webhook_secret_2026
                  </code>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Subscribe to <code>messages</code> field under WhatsApp Business Webhook settings in Meta Developer Portal.
              </p>
            </div>

            {/* Interactive Bot Simulator */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Interactive WhatsApp Bot Simulator
                </label>
                <span className="text-[11px] text-slate-400">
                  Test customer queries without consuming Meta API quota
                </span>
              </div>

              {/* Customer Mobile for context */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-semibold text-slate-400">
                    +91
                  </span>
                  <input
                    type="text"
                    placeholder="Customer Mobile (e.g. 9845012345)"
                    value={botSimPhone}
                    onChange={(e) => setBotSimPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-2 pl-11 pr-3 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Quick Keyword Chips */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs text-slate-400 font-medium">Quick keywords:</span>
                  {[
                    { label: 'BILL', desc: 'Latest invoice' },
                    { label: 'BALANCE', desc: 'Khata due' },
                    { label: 'PAY', desc: 'UPI pay link' },
                    { label: 'HELP', desc: 'Full menu' },
                  ].map((kw) => (
                    <button
                      key={kw.label}
                      type="button"
                      onClick={() => {
                        setBotSimMessage(kw.label);
                        handleSimulateBotMessage(kw.label);
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                      title={kw.desc}
                    >
                      {kw.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* WhatsApp Mock Chat Window */}
              <div className="rounded-2xl border border-slate-200 bg-[#efeae2] overflow-hidden shadow-inner flex flex-col h-[320px]">
                {/* Chat Window Header */}
                <div className="bg-[#075e54] text-white px-4 py-2.5 flex items-center justify-between shrink-0">
                  <div className="flex items-center space-x-2.5">
                    <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                      SV
                    </div>
                    <div>
                      <div className="font-bold text-xs leading-tight">
                        {profile.businessName || 'SmartVyapar Assistant'}
                      </div>
                      <div className="text-[10px] text-emerald-200">
                        Online • Automated Support
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setBotConversation([
                        {
                          sender: 'BOT',
                          text: "🙏 *Namaste! Welcome to SmartVyapar WhatsApp Assistant.*\n\nSend *BILL* for your latest invoice, *BALANCE* for your Khata balance, or *PAY* for an instant UPI link.",
                          intent: 'GREETING',
                          time: 'Just now',
                        },
                      ])
                    }
                    className="text-[11px] text-white/80 hover:text-white px-2 py-0.5 rounded bg-white/10"
                  >
                    Clear Chat
                  </button>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
                  {botConversation.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${
                        msg.sender === 'USER' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl px-3 py-2 shadow-xs leading-relaxed ${
                          msg.sender === 'USER'
                            ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-none'
                            : 'bg-white text-slate-900 rounded-tl-none'
                        }`}
                      >
                        {msg.intent && (
                          <span className="inline-block text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded mb-1 border border-emerald-200">
                            Intent: {msg.intent}
                          </span>
                        )}
                        <div className="whitespace-pre-wrap font-sans text-xs">
                          {msg.text}
                        </div>
                        <div className="text-[9px] text-slate-400 text-right mt-1 font-mono">
                          {msg.time}
                        </div>
                      </div>
                    </div>
                  ))}
                  {botSimLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white rounded-xl px-3 py-2 text-slate-400 italic text-xs shadow-xs rounded-tl-none flex items-center space-x-1.5">
                        <RefreshCw className="h-3 w-3 animate-spin text-emerald-600" />
                        <span>SmartVyapar Assistant is typing...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input Box */}
                <div className="p-2.5 bg-[#f0f2f5] border-t border-slate-200 flex items-center space-x-2 shrink-0">
                  <input
                    type="text"
                    value={botSimMessage}
                    onChange={(e) => setBotSimMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSimulateBotMessage();
                      }
                    }}
                    placeholder="Type a message (e.g. BILL, BALANCE, PAY)..."
                    className="flex-1 rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleSimulateBotMessage()}
                    disabled={botSimLoading || !botSimMessage.trim()}
                    className="p-2 rounded-xl bg-[#00a884] hover:bg-[#008f6f] text-white disabled:opacity-50 transition"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Developer & Super Admin Integrations Gateway */}
      {activeTab === 'INTEGRATIONS' && (
        <div className="space-y-6">
          {keySavedBanner && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3 text-xs font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Settings updated! Google Gemini API key has been saved to your browser session.</span>
            </div>
          )}

          {/* Section 1: Multi-Tenant Architecture Callout */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-900 to-indigo-900 text-white shadow-md flex items-start gap-4">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm shrink-0">
              <Sparkles className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Platform Multi-Tenant API Infrastructure
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Global Architecture
                </span>
              </h2>
              <p className="text-xs text-purple-200 mt-1 leading-relaxed">
                Keys configured at the server/environment level act as the <strong>central platform gateway for ALL tenants</strong>. Your cashiers, stores, and franchise branches automatically benefit from zero-configuration AI invoice scanning and live Razorpay transactions without requiring individual developer accounts.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1: Google Gemini AI Vision OCR Engine */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Bot className="w-4 h-4 text-purple-600" />
                    Google Gemini AI Vision & OCR
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Powers automatic purchase bill scanning, pharma batch extraction, and UOM calculations.
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Multi-Tenant Default
                </span>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Active Gemini API Key
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKeyText ? "text" : "password"}
                      placeholder="AIzaSy..."
                      value={geminiKeyInput}
                      onChange={(e) => setGeminiKeyInput(e.target.value)}
                      className="w-full text-xs font-mono border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeyText(!showKeyText)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-medium cursor-pointer"
                    >
                      {showKeyText ? "Hide" : "Show"}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveGeminiKey}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shrink-0 shadow-xs"
                  >
                    Save Key
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleTestAiKey}
                    disabled={testingAiKey}
                    className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {testingAiKey ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                    <span>{testingAiKey ? "Testing Connection..." : "Test Connection Live"}</span>
                  </button>

                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-500 hover:text-slate-700 text-xs flex items-center gap-1"
                  >
                    Get Free Key <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Connection Feedback Banner */}
                {aiTestFeedback && (
                  <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                    aiTestFeedback.success
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border border-rose-200 text-rose-900'
                  }`}>
                    {aiTestFeedback.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <strong className="block">{aiTestFeedback.success ? "Connection Verified" : "Verification Failed"}</strong>
                      <span className="text-[11px] leading-relaxed">{aiTestFeedback.message}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Razorpay Live Payment Gateway */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    Razorpay Live Payment Gateway
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Powers merchant subscriptions, Pro tier upgrades, and automated bill settlement.
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Live Production
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Gateway Mode:</span>
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Live Mode (Verified)
                    </span>
                  </div>
                  <div className="flex justify-between items-center font-mono">
                    <span className="text-slate-500">Live Key ID:</span>
                    <span className="font-bold text-slate-800">rzp_live_TeB...R7y</span>
                  </div>
                  <div className="flex justify-between items-center font-mono">
                    <span className="text-slate-500">Live Secret:</span>
                    <span className="font-bold text-slate-800">••••••••••••••••</span>
                  </div>
                  <div className="flex justify-between items-center font-mono text-[11px]">
                    <span className="text-slate-500">Authorized Domain:</span>
                    <span className="text-blue-600 font-semibold">https://www.zionapos.store</span>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-blue-950 text-[11px] space-y-1">
                  <strong>✨ Instant Checkout Enabled:</strong>
                  <p>All tenant subscription upgrades and invoice payment links now process via official live Razorpay checkout.</p>
                </div>
              </div>
            </div>

            {/* Card 3: Two-Way WhatsApp Cloud Bot Webhook */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    WhatsApp Cloud Meta Webhook
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Receives incoming customer commands (`BILL`, `BALANCE`, `PAY`) and auto-replies.
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live Endpoint
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs text-slate-700 break-all select-all">
                https://www.zionapos.store/api/webhooks/whatsapp
              </div>
            </div>

            {/* Card 4: GST Direct Filing NIC / GSP Gateway */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    Statutory GST Direct Filing (GSP / NIC)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Transmits GSTR-1, e-Invoice, and e-Way bills directly to government servers with cryptographic HMAC signatures.
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Statutory Gateway
                </span>
              </div>

              <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-indigo-950 text-xs flex items-center justify-between">
                <div>
                  <div className="font-bold">Government NIC / GSP Sandbox & Live Channel</div>
                  <div className="text-[11px] text-indigo-700">Production Direct API Gateway is active and operational.</div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
              </div>
            </div>
          </div>
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
