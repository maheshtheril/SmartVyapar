'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Printer, 
  Settings2, 
  Check, 
  Save, 
  Plus, 
  Trash2, 
  Star, 
  ChevronRight, 
  Eye, 
  Sliders, 
  Palette, 
  LayoutTemplate, 
  FileText, 
  RefreshCw, 
  Sparkles, 
  QrCode, 
  Share2, 
  Wrench, 
  ArrowLeft,
  Copy,
  Layers,
  HelpCircle,
  Building2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  PrintDocType, 
  PaperSize, 
  TemplateBrand, 
  TemplateSections, 
  TemplateAutomation, 
  DOC_TYPE_METADATA, 
  COLOR_PALETTES, 
  BUILT_IN_PRESETS,
  PrintTemplatePreset
} from '@/lib/print/template-presets';
import QrCodeCanvas from '@/components/QrCodeCanvas';
import BarcodeSvg from '@/components/BarcodeSvg';

function PrintStudioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDocType = (searchParams.get('doc') as PrintDocType) || 'sale_bill';

  const [activeDocType, setActiveDocType] = useState<PrintDocType>(initialDocType);
  const [templatesByDoc, setTemplatesByDoc] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Active Template State for Editing
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [paperSize, setPaperSize] = useState<PaperSize>('a4');
  const [brand, setBrand] = useState<TemplateBrand>({
    primaryColor: '#1e3a8a',
    accentColor: '#3b82f6',
    headerBg: '#1e3a8a',
    headerText: '#ffffff',
    fontFamily: 'sans',
    logoPosition: 'left',
    logoSize: 70,
  });
  const [sections, setSections] = useState<TemplateSections>({
    showLogo: true,
    showBusinessName: true,
    showLegalName: true,
    showAddress: true,
    showPhone: true,
    showEmail: true,
    showGstin: true,
    showStateCode: true,
    showCustomerDetails: true,
    showVehicleDetails: false,
    showDueDate: true,
    showHsnColumn: true,
    showBatchColumn: false,
    showUnitColumn: true,
    showDiscountColumn: true,
    showTaxBreakup: true,
    showSavingsBadge: true,
    showBankDetails: true,
    showUpiQr: true,
    showTerms: true,
    showSignatures: true,
  });
  const [automation, setAutomation] = useState<TemplateAutomation>({
    autoPrint: false,
    previewBeforePrint: true,
    whatsappOnSave: false,
    copies: 1,
    actionAfterSave: 'success_screen',
  });
  const [isDefault, setIsDefault] = useState(false);

  // Active Studio Tab
  const [studioTab, setStudioTab] = useState<'design' | 'sections' | 'automation'>('design');

  // Business Profile
  const [business, setBusiness] = useState({
    businessName: 'Ziona Tech & Electricals',
    legalName: 'Ziona Technologies LLP',
    logoUrl: '',
    gstin: '32AAAAA0000A1Z5',
    phone: '+91 98765 43210',
    email: 'billing@zionatech.in',
    address: 'Building 4, Industrial Area, Thrissur, Kerala',
    pincode: '680001',
    stateCode: '32',
    upiId: 'zionabusiness@icici',
  });

  // Load Templates & Business Info
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const [tplRes, tenantRes] = await Promise.all([
        fetch('/api/print-settings').then((r) => r.json()),
        fetch('/api/tenant').then((r) => r.json()),
      ]);

      if (tplRes.success && tplRes.templates) {
        setTemplatesByDoc(tplRes.templates);
        const currentList = tplRes.templates[activeDocType] || [];
        const defaultTpl = currentList.find((t: any) => t.isDefault) || currentList[0];
        if (defaultTpl) {
          selectTemplateForEdit(defaultTpl);
        }
      }

      if (tenantRes.success && tenantRes.tenant) {
        setBusiness({
          businessName: tenantRes.tenant.businessName || 'Ziona Tech & Electricals',
          legalName: tenantRes.tenant.legalName || 'Ziona Technologies LLP',
          logoUrl: tenantRes.tenant.logoUrl || '',
          gstin: tenantRes.tenant.gstin || '32AAAAA0000A1Z5',
          phone: tenantRes.tenant.phone || '+91 98765 43210',
          email: tenantRes.tenant.email || 'billing@zionatech.in',
          address: tenantRes.tenant.address || 'Building 4, Industrial Area, Thrissur, Kerala',
          pincode: tenantRes.tenant.pincode || '680001',
          stateCode: tenantRes.tenant.stateCode || '32',
          upiId: tenantRes.tenant.upiId || 'zionabusiness@icici',
        });
      }
    } catch (err) {
      console.error('Error loading print settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // When changing docType, update selection
  useEffect(() => {
    const list = templatesByDoc[activeDocType] || [];
    const defaultTpl = list.find((t: any) => t.isDefault) || list[0];
    if (defaultTpl) {
      selectTemplateForEdit(defaultTpl);
    } else {
      // Load preset for this docType
      const matchingPreset = BUILT_IN_PRESETS.find((p) => p.docType === activeDocType) || BUILT_IN_PRESETS[0];
      applyPreset(matchingPreset);
    }
  }, [activeDocType, templatesByDoc]);

  const selectTemplateForEdit = (tpl: any) => {
    setSelectedTemplate(tpl);
    setTemplateName(tpl.name || '');
    setPaperSize(tpl.paperSize || 'a4');
    setBrand(tpl.brand || {
      primaryColor: '#1e3a8a',
      accentColor: '#3b82f6',
      headerBg: '#1e3a8a',
      headerText: '#ffffff',
      fontFamily: 'sans',
      logoPosition: 'left',
      logoSize: 70,
    });
    setSections(tpl.sections || {});
    setAutomation(tpl.automation || {
      autoPrint: false,
      previewBeforePrint: true,
      whatsappOnSave: false,
      copies: 1,
      actionAfterSave: 'success_screen',
    });
    setIsDefault(Boolean(tpl.isDefault));
  };

  const applyPreset = (preset: PrintTemplatePreset) => {
    setSelectedTemplate(null);
    setTemplateName(preset.name);
    setPaperSize(preset.paperSize);
    setBrand({ ...preset.brand });
    setSections({ ...preset.sections });
    setAutomation({ ...preset.automation });
    setIsDefault(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccessMsg(null);
    try {
      if (selectedTemplate?.id) {
        // Update existing template
        const res = await fetch(`/api/print-settings/${selectedTemplate.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: templateName,
            paperSize,
            brand,
            sections,
            automation,
            isDefault,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSaveSuccessMsg('Print template saved successfully!');
          await loadTemplates();
        }
      } else {
        // Create new template
        const res = await fetch('/api/print-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: templateName,
            docType: activeDocType,
            paperSize,
            brand,
            sections,
            automation,
            isDefault,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSaveSuccessMsg('New template created successfully!');
          await loadTemplates();
        }
      }
    } catch (err) {
      console.error('Error saving template:', err);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    }
  };

  const handleSetDefault = async (tplId: string) => {
    try {
      const res = await fetch(`/api/print-settings/${tplId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });
      const data = await res.json();
      if (data.success) {
        await loadTemplates();
      }
    } catch (err) {
      console.error('Error setting default:', err);
    }
  };

  const handleTestPrint = () => {
    window.print();
  };

  const currentDocMeta = DOC_TYPE_METADATA[activeDocType];
  const currentTemplates = templatesByDoc[activeDocType] || [];
  const isNarrowPaper = paperSize === 'roll80' || paperSize === 'roll58';
  const previewWidth = paperSize === 'roll58' ? '240px' : paperSize === 'roll80' ? '320px' : paperSize === 'a5' ? '460px' : '620px';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-3">
          <Link
            href="/settings"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 flex items-center space-x-2">
              <Printer className="h-6 w-6 text-indigo-600" />
              <span>Print Configuration Studio</span>
            </h1>
            <p className="text-xs text-slate-500">
              Visual bill designer, document templates, paper formats, and auto-print automation
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleTestPrint}
            className="flex items-center space-x-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <Printer className="h-4 w-4 text-slate-600" />
            <span>Test Print</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-indigo-700 transition disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save Template'}</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="flex items-center space-x-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Document Type Horizontal Nav Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 gap-2 pb-1 scrollbar-none">
        {(Object.keys(DOC_TYPE_METADATA) as PrintDocType[]).map((docKey) => {
          const meta = DOC_TYPE_METADATA[docKey];
          const isActive = activeDocType === docKey;
          const count = (templatesByDoc[docKey] || []).length;
          return (
            <button
              key={docKey}
              onClick={() => {
                setActiveDocType(docKey);
                router.push(`/settings/print?doc=${docKey}`);
              }}
              className={`flex items-center space-x-2 rounded-xl px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span className="text-base">{meta.emoji}</span>
              <span>{meta.label}</span>
              {count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Studio Grid: Left Configuration Tabs + Right Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Studio Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Active Template Switcher / Header Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{currentDocMeta.emoji}</span>
                <div>
                  <h2 className="text-sm font-black text-slate-900">{currentDocMeta.label}</h2>
                  <p className="text-[11px] text-slate-500">{currentDocMeta.description}</p>
                </div>
              </div>
              {isDefault && (
                <span className="flex items-center space-x-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  <Star className="h-3 w-3 fill-emerald-600 text-emerald-600" />
                  <span>Default</span>
                </span>
              )}
            </div>

            {/* Template Selector Pill List */}
            {currentTemplates.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                {currentTemplates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => selectTemplateForEdit(t)}
                    className={`flex items-center space-x-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      selectedTemplate?.id === t.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{t.name}</span>
                    {t.isDefault && <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sub-Tab Navigation for Controls */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => setStudioTab('design')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                studioTab === 'design' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🎨 Design & Brand
            </button>
            <button
              onClick={() => setStudioTab('sections')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                studioTab === 'sections' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📋 Section Toggles
            </button>
            <button
              onClick={() => setStudioTab('automation')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                studioTab === 'automation' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⚙️ Auto-Print
            </button>
          </div>

          {/* Tab 1: Design & Brand Controls */}
          {studioTab === 'design' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              {/* Template Name */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase">Template Name</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none"
                  placeholder="e.g. Standard GST Tax Invoice"
                />
              </div>

              {/* Paper Format */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase">Paper Format</label>
                <div className="mt-1.5 grid grid-cols-4 gap-2">
                  {[
                    { id: 'a4', label: 'A4 Full', desc: '210×297mm' },
                    { id: 'a5', label: 'A5 Half', desc: '148×210mm' },
                    { id: 'roll80', label: '80mm Roll', desc: '3-inch POS' },
                    { id: 'roll58', label: '58mm Roll', desc: '2-inch POS' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPaperSize(p.id as PaperSize)}
                      className={`rounded-xl border p-2 text-center transition ${
                        paperSize === p.id
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-black">{p.label}</div>
                      <div className="text-[9px] text-slate-400">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Palettes Swatches */}
              {!isNarrowPaper && (
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Brand Color Palette</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {COLOR_PALETTES.map((cp) => (
                      <button
                        key={cp.id}
                        type="button"
                        onClick={() =>
                          setBrand({
                            ...brand,
                            primaryColor: cp.primary,
                            accentColor: cp.accent,
                            headerBg: cp.headerBg,
                            headerText: cp.headerText,
                          })
                        }
                        className={`flex items-center space-x-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold transition ${
                          brand.primaryColor === cp.primary
                            ? 'border-indigo-600 bg-slate-50 ring-2 ring-indigo-600/20'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className="h-3 w-3 rounded-full border border-black/10"
                          style={{ backgroundColor: cp.primary }}
                        />
                        <span>{cp.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Typography / Font Family */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase">Typography</label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {[
                    { id: 'sans', label: 'Clean Sans', desc: 'Modern & crisp' },
                    { id: 'serif', label: 'Formal Serif', desc: 'Traditional' },
                    { id: 'mono', label: 'Mono Courier', desc: 'POS thermal style' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setBrand({ ...brand, fontFamily: f.id as any })}
                      className={`rounded-xl border p-2 text-center transition ${
                        brand.fontFamily === f.id
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold">{f.label}</div>
                      <div className="text-[9px] text-slate-400">{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Logo Settings */}
              <div className="border-t border-slate-100 pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Logo Alignment</label>
                  <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                    {(['left', 'center', 'right', 'hidden'] as const).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setBrand({ ...brand, logoPosition: pos })}
                        className={`px-2 py-0.5 text-[10px] font-bold capitalize rounded ${
                          brand.logoPosition === pos
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>

                {brand.logoPosition !== 'hidden' && (
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-600 font-bold mb-1">
                      <span>Logo Size</span>
                      <span>{brand.logoSize || 70}px</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="120"
                      value={brand.logoSize || 70}
                      onChange={(e) => setBrand({ ...brand, logoSize: Number(e.target.value) })}
                      className="w-full accent-indigo-600"
                    />
                  </div>
                )}
              </div>

              {/* Set as Active Default Toggle */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 p-3">
                <div>
                  <div className="text-xs font-bold text-slate-800">Set as Active Default</div>
                  <div className="text-[10px] text-slate-500">Auto-applied when printing {currentDocMeta.label}</div>
                </div>
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>

            </div>
          )}

          {/* Tab 2: Section Toggles */}
          {studioTab === 'sections' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <p className="text-xs text-slate-500">
                Turn bill elements and columns on or off to match your store preferences:
              </p>

              {/* Header Group */}
              <div className="space-y-2">
                <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider">🏢 Store Header</div>
                {[
                  { key: 'showLogo', label: 'Company Logo' },
                  { key: 'showBusinessName', label: 'Business Trade Name' },
                  { key: 'showLegalName', label: 'Legal Registered Entity Name' },
                  { key: 'showAddress', label: 'Physical Store Address' },
                  { key: 'showPhone', label: 'Contact Phone Number' },
                  { key: 'showEmail', label: 'Official Email ID' },
                  { key: 'showGstin', label: 'GSTIN Registration Number' },
                  { key: 'showStateCode', label: 'State & Place of Supply Code' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0 text-xs font-bold text-slate-700 cursor-pointer">
                    <span>{item.label}</span>
                    <input
                      type="checkbox"
                      checked={(sections as any)[item.key] ?? true}
                      onChange={(e) => setSections({ ...sections, [item.key]: e.target.checked })}
                      className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                ))}
              </div>

              {/* Metadata & Vehicle Group */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider">👤 Customer & Vehicle Meta</div>
                {[
                  { key: 'showCustomerDetails', label: 'Customer Name & Phone' },
                  { key: 'showVehicleDetails', label: 'Vehicle Plate, Odometer & Mechanic (Workshop)' },
                  { key: 'showDueDate', label: 'Payment Due Date / Credit Terms' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0 text-xs font-bold text-slate-700 cursor-pointer">
                    <span>{item.label}</span>
                    <input
                      type="checkbox"
                      checked={(sections as any)[item.key] ?? false}
                      onChange={(e) => setSections({ ...sections, [item.key]: e.target.checked })}
                      className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                ))}
              </div>

              {/* Table Columns Group */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider">📋 Table Columns</div>
                {[
                  { key: 'showHsnColumn', label: 'HSN / SAC Code Column' },
                  { key: 'showBatchColumn', label: 'Batch No & Expiry Date' },
                  { key: 'showUnitColumn', label: 'Unit of Measure (UOM: Pcs, Kg, Ltr)' },
                  { key: 'showDiscountColumn', label: 'Discount % Column' },
                  { key: 'showTaxBreakup', label: 'GST Tax Rate & Breakup' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0 text-xs font-bold text-slate-700 cursor-pointer">
                    <span>{item.label}</span>
                    <input
                      type="checkbox"
                      checked={(sections as any)[item.key] ?? true}
                      onChange={(e) => setSections({ ...sections, [item.key]: e.target.checked })}
                      className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                ))}
              </div>

              {/* Footer & Compliance Group */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider">📌 Footer & Payments</div>
                {[
                  { key: 'showSavingsBadge', label: 'Highlight Total Savings on MRP' },
                  { key: 'showUpiQr', label: 'Dynamic UPI QR Code (GPay, PhonePe, Paytm)' },
                  { key: 'showBankDetails', label: 'Bank Account & IFSC for NEFT/RTGS' },
                  { key: 'showTerms', label: 'Statutory Terms & Return Policy' },
                  { key: 'showSignatures', label: 'Authorized Signatory Signature Line' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0 text-xs font-bold text-slate-700 cursor-pointer">
                    <span>{item.label}</span>
                    <input
                      type="checkbox"
                      checked={(sections as any)[item.key] ?? true}
                      onChange={(e) => setSections({ ...sections, [item.key]: e.target.checked })}
                      className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                ))}
              </div>

            </div>
          )}

          {/* Tab 3: Automation & Hardware Settings */}
          {studioTab === 'automation' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <p className="text-xs text-slate-500">
                Configure automated printer triggers, copies, and instant notifications:
              </p>

              {/* Auto Print Toggle */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 p-3.5">
                <div>
                  <div className="text-xs font-bold text-slate-900">Auto-Print on Save</div>
                  <div className="text-[10px] text-slate-500">Automatically open printer dialog when bill is finalized</div>
                </div>
                <input
                  type="checkbox"
                  checked={automation.autoPrint}
                  onChange={(e) => setAutomation({ ...automation, autoPrint: e.target.checked })}
                  className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              {/* Number of Copies */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase">Print Copies</label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {[
                    { copies: 1, label: '1 Copy', desc: 'Original' },
                    { copies: 2, label: '2 Copies', desc: 'Original + Duplicate' },
                    { copies: 3, label: '3 Copies', desc: 'Triplicate GST' },
                  ].map((c) => (
                    <button
                      key={c.copies}
                      type="button"
                      onClick={() => setAutomation({ ...automation, copies: c.copies })}
                      className={`rounded-xl border p-2 text-center transition ${
                        automation.copies === c.copies
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-black">{c.label}</div>
                      <div className="text-[9px] text-slate-400">{c.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* WhatsApp Share on Save */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 p-3.5">
                <div>
                  <div className="text-xs font-bold text-slate-900">WhatsApp Instant Share</div>
                  <div className="text-[10px] text-slate-500">Auto-compose WhatsApp bill message on customer checkout</div>
                </div>
                <input
                  type="checkbox"
                  checked={automation.whatsappOnSave}
                  onChange={(e) => setAutomation({ ...automation, whatsappOnSave: e.target.checked })}
                  className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              {/* Action after Save */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase">Action After Checkout</label>
                <select
                  value={automation.actionAfterSave}
                  onChange={(e) => setAutomation({ ...automation, actionAfterSave: e.target.value as any })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="success_screen">Show Bill Summary Screen</option>
                  <option value="new_bill">Immediately Reset for Next Customer (F9)</option>
                  <option value="print">Trigger Print Dialog Only</option>
                </select>
              </div>

            </div>
          )}

        </div>

        {/* Right Column: Live Interactive WYSIWYG Bill Renderer (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          {/* Header Banner */}
          <div className="w-full flex items-center justify-between mb-2 px-1 text-xs text-slate-500">
            <span className="font-bold flex items-center space-x-1.5">
              <Eye className="h-3.5 w-3.5 text-indigo-600" />
              <span>Real-Time Live Print Preview</span>
            </span>
            <span className="text-[10px] bg-slate-100 rounded-lg px-2 py-0.5 border border-slate-200">
              Format: {paperSize.toUpperCase()} · {isNarrowPaper ? 'Thermal Roll' : 'Standard Sheet'}
            </span>
          </div>

          {/* Paper Bill Container */}
          <div className="w-full flex justify-center bg-slate-200/80 rounded-3xl p-4 md:p-8 border border-slate-300 overflow-x-auto shadow-inner">
            <div
              id="smartvyapar-bill-preview"
              style={{
                width: previewWidth,
                fontFamily:
                  brand.fontFamily === 'serif'
                    ? 'Georgia, Times, serif'
                    : brand.fontFamily === 'mono'
                    ? 'Courier New, monospace'
                    : 'ui-sans-serif, system-ui, -apple-system, sans-serif',
              }}
              className={`bg-white text-slate-900 shadow-2xl transition-all duration-300 select-none ${
                isNarrowPaper
                  ? 'rounded-lg p-4 text-[11px] leading-snug border border-slate-300'
                  : 'rounded-xl p-6 md:p-8 text-xs leading-relaxed'
              }`}
            >
              {/* Header Bar */}
              <div
                style={{
                  backgroundColor: isNarrowPaper ? 'transparent' : brand.headerBg,
                  color: isNarrowPaper ? '#0f172a' : brand.headerText,
                }}
                className={`rounded-xl mb-4 ${
                  isNarrowPaper
                    ? 'text-center border-b border-dashed border-slate-400 pb-2 space-y-1'
                    : 'p-5 flex items-center justify-between gap-4'
                }`}
              >
                {/* Logo & Info */}
                <div
                  className={`flex ${
                    brand.logoPosition === 'center' || isNarrowPaper
                      ? 'flex-col items-center text-center'
                      : brand.logoPosition === 'right'
                      ? 'flex-row-reverse justify-between w-full'
                      : 'items-center space-x-4'
                  }`}
                >
                  {sections.showLogo && business.logoUrl && brand.logoPosition !== 'hidden' && (
                    <div className="flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={business.logoUrl}
                        alt="Logo"
                        style={{ maxHeight: `${brand.logoSize || 70}px` }}
                        className="object-contain"
                      />
                    </div>
                  )}

                  <div>
                    {sections.showBusinessName && (
                      <h2 className="text-base md:text-lg font-black tracking-tight uppercase">
                        {business.businessName}
                      </h2>
                    )}
                    {sections.showLegalName && !isNarrowPaper && (
                      <p className="text-[10px] opacity-80">{business.legalName}</p>
                    )}
                    {sections.showAddress && (
                      <p className="text-[10px] opacity-85 mt-0.5">{business.address}</p>
                    )}
                    <div className="flex flex-wrap gap-x-2 text-[10px] opacity-85 mt-0.5 justify-center md:justify-start">
                      {sections.showPhone && <span>Ph: {business.phone}</span>}
                      {sections.showEmail && !isNarrowPaper && <span>· {business.email}</span>}
                    </div>
                    {sections.showGstin && (
                      <p className="text-[10px] font-bold mt-0.5">
                        GSTIN: {business.gstin} {sections.showStateCode && `(State: ${business.stateCode})`}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Title Block (A4/A5 only) */}
                {!isNarrowPaper && (
                  <div className="text-right flex-shrink-0">
                    <div
                      style={{ color: brand.headerText }}
                      className="text-sm font-black uppercase tracking-wider"
                    >
                      {activeDocType === 'auto_workshop'
                        ? 'Job Card & Tax Invoice'
                        : activeDocType === 'credit_note'
                        ? 'GST Credit Note'
                        : 'Tax Invoice'}
                    </div>
                    <div className="text-[11px] opacity-90 mt-1 font-bold">INV-2026-0042</div>
                    <div className="text-[10px] opacity-75">Date: {new Date().toLocaleDateString('en-IN')}</div>
                  </div>
                )}
              </div>

              {/* Thermal Subheader */}
              {isNarrowPaper && (
                <div className="text-center py-1 border-b border-dashed border-slate-400 space-y-0.5 text-[10px]">
                  <div className="font-bold uppercase tracking-wider">
                    {activeDocType === 'kot' ? 'KITCHEN ORDER TICKET (KOT)' : 'TAX INVOICE / CASH MEMO'}
                  </div>
                  <div className="flex justify-between">
                    <span>Bill: <strong>#INV-0042</strong></span>
                    <span>{new Date().toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
              )}

              {/* Customer & Vehicle Metadata */}
              {(sections.showCustomerDetails || sections.showVehicleDetails) && (
                <div
                  className={`py-2 text-[10px] md:text-xs ${
                    isNarrowPaper
                      ? 'border-b border-dashed border-slate-400 space-y-0.5'
                      : 'mb-4 grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3'
                  }`}
                >
                  {sections.showCustomerDetails && (
                    <div>
                      <span className="font-bold text-slate-500 uppercase text-[9px] block">Customer Details</span>
                      <strong className="text-slate-900">Dr. Rahul Sharma</strong>
                      <div className="text-slate-600">+91 94471 23456</div>
                    </div>
                  )}

                  {/* Automobile Workshop Specific Fields */}
                  {sections.showVehicleDetails && (
                    <div className={isNarrowPaper ? 'pt-1' : ''}>
                      <span className="font-bold text-amber-700 uppercase text-[9px] block">🚗 Vehicle Job-Card Details</span>
                      <div>Plate: <strong>KL-08-BQ-2035</strong> (Hyundai Creta)</div>
                      <div className="text-slate-600">Odo: 42,500 KM · Tech: Master Santhosh</div>
                    </div>
                  )}
                </div>
              )}

              {/* Items Table */}
              <div className="my-3 overflow-x-auto">
                <table className="w-full text-left border-collapse text-[10px] md:text-xs">
                  <thead>
                    <tr
                      style={{
                        backgroundColor: isNarrowPaper ? 'transparent' : `${brand.primaryColor}15`,
                        color: brand.primaryColor,
                        borderBottom: isNarrowPaper ? '1px dashed #000' : 'none',
                      }}
                      className="text-[9px] md:text-[10px] font-black uppercase tracking-wider"
                    >
                      <th className="py-1.5 px-2">Item</th>
                      {sections.showHsnColumn && !isNarrowPaper && <th className="py-1.5 px-1 text-center">HSN/SAC</th>}
                      {sections.showUnitColumn && !isNarrowPaper && <th className="py-1.5 px-1 text-center">Unit</th>}
                      <th className="py-1.5 px-1 text-right">Qty</th>
                      <th className="py-1.5 px-1 text-right">Rate</th>
                      {sections.showDiscountColumn && !isNarrowPaper && <th className="py-1.5 px-1 text-right">Disc</th>}
                      {sections.showTaxBreakup && !isNarrowPaper && <th className="py-1.5 px-1 text-right">GST</th>}
                      <th className="py-1.5 px-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        name: activeDocType === 'auto_workshop' ? 'Engine Oil Synthetic 5W30' : 'Philips 20W LED Bulb',
                        hsn: activeDocType === 'auto_workshop' ? '2710' : '8539',
                        unit: 'Ltr',
                        qty: 3,
                        rate: 650,
                        disc: '5%',
                        tax: '18%',
                        total: 1852.5,
                      },
                      {
                        name: activeDocType === 'auto_workshop' ? 'Brake Pad Set (Front)' : 'Syska 16A Smart Plug',
                        hsn: activeDocType === 'auto_workshop' ? '8708' : '8536',
                        unit: 'Set',
                        qty: 1,
                        rate: 1400,
                        disc: '0%',
                        tax: '18%',
                        total: 1400,
                      },
                      {
                        name: activeDocType === 'auto_workshop' ? 'Wheel Alignment & Balancing (Labor)' : 'Polycab 2.5mm Wire (90m)',
                        hsn: activeDocType === 'auto_workshop' ? '998729' : '8544',
                        unit: 'Nos',
                        qty: 1,
                        rate: 550,
                        disc: '0%',
                        tax: '18%',
                        total: 550,
                      },
                    ].map((row, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-slate-100 ${
                          idx % 2 === 0 ? 'bg-slate-50/40' : 'bg-white'
                        }`}
                      >
                        <td className="py-1.5 px-2 font-bold">{row.name}</td>
                        {sections.showHsnColumn && !isNarrowPaper && <td className="py-1.5 px-1 text-center text-slate-500">{row.hsn}</td>}
                        {sections.showUnitColumn && !isNarrowPaper && <td className="py-1.5 px-1 text-center text-slate-500">{row.unit}</td>}
                        <td className="py-1.5 px-1 text-right">{row.qty}</td>
                        <td className="py-1.5 px-1 text-right">₹{row.rate.toFixed(2)}</td>
                        {sections.showDiscountColumn && !isNarrowPaper && <td className="py-1.5 px-1 text-right text-emerald-600">{row.disc}</td>}
                        {sections.showTaxBreakup && !isNarrowPaper && <td className="py-1.5 px-1 text-right text-slate-500">{row.tax}</td>}
                        <td className="py-1.5 px-2 text-right font-black">₹{row.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Section */}
              <div className="flex justify-end pt-2 border-t border-slate-200">
                <div className="w-56 space-y-1 text-right text-[11px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Subtotal:</span>
                    <span>₹3,222.45</span>
                  </div>
                  {sections.showTaxBreakup && (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>CGST (9%):</span>
                        <span>₹290.02</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>SGST (9%):</span>
                        <span>₹290.02</span>
                      </div>
                    </>
                  )}
                  <div
                    style={{ borderTop: `2px solid ${brand.primaryColor}` }}
                    className="flex justify-between pt-1.5 text-sm md:text-base font-black text-slate-900"
                  >
                    <span>Grand Total:</span>
                    <span style={{ color: brand.primaryColor }}>₹3,802.50</span>
                  </div>
                </div>
              </div>

              {/* Savings Highlight Badge */}
              {sections.showSavingsBadge && (
                <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-center text-[10px] font-bold text-emerald-800 flex items-center justify-center space-x-1">
                  <Sparkles className="h-3 w-3 text-emerald-600" />
                  <span>Customer Saved ₹240.00 on MRP!</span>
                </div>
              )}

              {/* Footer Elements: UPI QR + Bank Details + Signatures */}
              <div
                className={`mt-4 pt-3 border-t border-slate-200 ${
                  isNarrowPaper
                    ? 'text-center space-y-2'
                    : 'grid grid-cols-2 gap-4 items-end'
                }`}
              >
                {/* Left: Dynamic UPI QR & Bank */}
                <div>
                  {sections.showUpiQr && (
                    <div className="flex items-center space-x-2 text-[10px]">
                      <QrCodeCanvas
                        value={`upi://pay?pa=${business.upiId}&pn=${encodeURIComponent(business.businessName)}&am=3802.50&cu=INR`}
                        size={isNarrowPaper ? 85 : 95}
                      />
                      <div className="text-left text-[9px] text-slate-600 space-y-0.5">
                        <div className="font-bold text-slate-900">Scan to Pay via UPI</div>
                        <div>UPI: {business.upiId}</div>
                        <div className="text-slate-400">GPay · PhonePe · Paytm · BHIM</div>
                      </div>
                    </div>
                  )}

                  {sections.showBankDetails && !isNarrowPaper && (
                    <div className="mt-2 rounded-lg bg-slate-50 border border-slate-200 p-2 text-[9px] text-slate-600">
                      <div className="font-bold text-slate-900">Bank Details for NEFT/RTGS:</div>
                      <div>Bank: State Bank of India · A/C: 38920194821</div>
                      <div>IFSC: SBIN0004521 · Branch: Thrissur Round</div>
                    </div>
                  )}
                </div>

                {/* Right: Signatory & Terms */}
                <div className={isNarrowPaper ? 'text-center pt-2' : 'text-right'}>
                  {sections.showSignatures && (
                    <div className="inline-block text-center text-[9px] text-slate-600">
                      <div className="border-t border-slate-400 w-32 mb-1" />
                      <div>For {business.businessName}</div>
                      <div className="font-bold">Authorized Signatory</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Statutory Terms & Declaration */}
              {sections.showTerms && (
                <div className="mt-3 pt-2 border-t border-dashed border-slate-300 text-[8px] md:text-[9px] text-slate-500 text-center">
                  Terms: Goods once sold will be replaced within 7 days. Subject to local jurisdiction.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Print Specific CSS to target ONLY #smartvyapar-bill-preview when window.print() is clicked */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #smartvyapar-bill-preview,
          #smartvyapar-bill-preview * {
            visibility: visible !important;
          }
          #smartvyapar-bill-preview {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${isNarrowPaper ? (paperSize === 'roll58' ? '58mm' : '80mm') : '100%'} !important;
            margin: 0 !important;
            padding: 8px !important;
            box-shadow: none !important;
            border: none !important;
          }
          @page {
            size: ${isNarrowPaper ? (paperSize === 'roll58' ? '58mm' : '80mm') : paperSize} auto;
            margin: 0mm;
          }
        }
      `}</style>
    </div>
  );
}

export default function PrintStudioPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      }
    >
      <PrintStudioContent />
    </React.Suspense>
  );
}
