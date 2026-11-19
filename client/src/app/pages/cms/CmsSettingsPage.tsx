import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import {
  Settings,
  Save,
  QrCode,
  Globe,
  Phone,
  MessageSquare,
  ShieldCheck,
  FileText,
  MapPin,
  Mail,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { ImageDropzone } from '../../components/ImageDropzone';

export const CmsSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [savedSuccess, setSavedSuccess] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['cms-settings'],
    queryFn: async () => {
      const res = await api.get('/cms/settings');
      return res.data.settings;
    },
  });

  useEffect(() => {
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((s: any) => {
        map[s.key] = s.value;
      });
      setFormValues(map);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async (settings: Record<string, string>) => {
      await api.put('/cms/settings', { settings });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-settings'] });
      queryClient.invalidateQueries({ queryKey: ['public-settings'] });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    },
  });

  const handleChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formValues);
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-stone-500 font-medium">
        Loading nursery &amp; website settings...
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-brand-600 dark:text-brand-400" />
            <span>Website Details &amp; Settings</span>
          </h1>
          <p className="text-sm font-semibold text-stone-500 dark:text-stone-400 mt-1">
            Update farm branding, website footer, specialties, contact details, and serial identifiers.
          </p>
        </div>

        {savedSuccess ? (
          <div className="inline-flex items-center gap-2 text-sm font-black text-emerald-700 bg-emerald-100/90 dark:bg-emerald-950/80 dark:text-emerald-300 px-4 py-2.5 rounded-2xl border border-emerald-300 dark:border-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
            <span>Changes Saved &amp; Live!</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-sm transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>{updateMutation.isPending ? 'Saving...' : 'Save All Settings'}</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* SECTION 1: PUBLIC BRANDING & IDENTITY */}
        <div className="bg-white dark:bg-stone-900 p-6 sm:p-8 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-6">
          <div className="border-b border-stone-200 dark:border-stone-800 pb-3">
            <h2 className="font-serif text-xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
              <Globe className="w-6 h-6 text-brand-600 dark:text-brand-400" />
              <span>Public Nursery Branding &amp; Logos</span>
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              Primary brand name and official visual logos displayed in navigation and headers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                Farm / Website Name
              </label>
              <input
                type="text"
                value={formValues.site_name || ''}
                onChange={(e) => handleChange('site_name', e.target.value)}
                placeholder="Deep Root Farms"
                className="w-full p-3.5 rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-950 text-base font-black text-stone-900 dark:text-stone-100 focus:border-brand-500"
              />
              <span className="text-[11px] text-stone-400 mt-1 block">
                Official name shown in browser title, navbar, footer, invoices, and certificates.
              </span>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                Farm Tagline / Header Subtitle
              </label>
              <input
                type="text"
                value={formValues.site_tagline || ''}
                onChange={(e) => handleChange('site_tagline', e.target.value)}
                placeholder="Horticultural Nursery & Certified Fruit Cultivars"
                className="w-full p-3.5 rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-950 text-sm font-bold text-stone-900 dark:text-stone-100 focus:border-brand-500"
              />
              <span className="text-[11px] text-stone-400 mt-1 block">
                Shown below the brand title in top navigation.
              </span>
            </div>
          </div>

          {/* Logo Uploads */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
            <div>
              <ImageDropzone
                label="Official Seal Mark / Favicon (Circular)"
                value={formValues.site_logo_mark || '/logo/deep-root-farms-mark.svg'}
                onChange={(url) => handleChange('site_logo_mark', url)}
                aspectRatio="square"
                placeholderText="Drop mark / icon here"
              />
              <span className="text-[11px] text-stone-400 mt-1 block">
                Used in navbar, app sidebar, mobile header, and invoices.
              </span>
            </div>

            <div>
              <ImageDropzone
                label="Primary Horizontal Brand Logo"
                value={formValues.site_logo || '/logo/deep-root-farms-logo-horizontal.svg'}
                onChange={(url) => handleChange('site_logo', url)}
                aspectRatio="video"
                placeholderText="Drop horizontal logo here"
              />
              <span className="text-[11px] text-stone-400 mt-1 block">
                Used for banners and horizontal brand presentation.
              </span>
            </div>

            <div>
              <ImageDropzone
                label="Stacked Brand Logo"
                value={formValues.site_logo_stacked || '/logo/deep-root-farms-logo-stacked.svg'}
                onChange={(url) => handleChange('site_logo_stacked', url)}
                aspectRatio="video"
                placeholderText="Drop stacked logo here"
              />
              <span className="text-[11px] text-stone-400 mt-1 block">
                Used for reports, documents, and splash screens.
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 2: WEBSITE FOOTER & SPECIALTIES */}
        <div className="bg-white dark:bg-stone-900 p-6 sm:p-8 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-6">
          <div className="border-b border-stone-200 dark:border-stone-800 pb-3">
            <h2 className="font-serif text-xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
              <FileText className="w-6 h-6 text-brand-600 dark:text-brand-400" />
              <span>Website Footer Content &amp; Specialties</span>
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              Customize the nursery philosophy, trust badge, specialties list, and copyright notice in the public footer.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                Nursery Philosophy / Brand Summary (Footer Column 1)
              </label>
              <textarea
                rows={3}
                value={
                  formValues.footer_about !== undefined
                    ? formValues.footer_about
                    : 'Specialized scientific propagation of commercial grafted fruit cultivars, virus-indexed mother trees, and vigorous rootstocks with individual batch pedigree traceability.'
                }
                onChange={(e) => handleChange('footer_about', e.target.value)}
                placeholder="Enter description of your farm's mission and nursery standards..."
                className="w-full p-3.5 rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-950 text-sm font-medium text-stone-900 dark:text-stone-100 focus:border-brand-500 leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-brand-600" />
                  <span>Trust / Certification Badge Tag</span>
                </label>
                <input
                  type="text"
                  value={
                    formValues.footer_badge !== undefined
                      ? formValues.footer_badge
                      : 'Certified Horticultural Lineage'
                  }
                  onChange={(e) => handleChange('footer_badge', e.target.value)}
                  placeholder="e.g. Certified Horticultural Lineage"
                  className="w-full p-3.5 rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-950 text-sm font-bold text-stone-900 dark:text-stone-100 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                  Copyright Notice Line
                </label>
                <input
                  type="text"
                  value={
                    formValues.footer_copyright !== undefined
                      ? formValues.footer_copyright
                      : '© {YEAR} {SITE_NAME}. All rights reserved. Public Catalogue Only — No Online Checkout.'
                  }
                  onChange={(e) => handleChange('footer_copyright', e.target.value)}
                  placeholder="© {YEAR} {SITE_NAME}. All rights reserved."
                  className="w-full p-3.5 rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-950 text-sm font-medium text-stone-900 dark:text-stone-100 focus:border-brand-500"
                />
                <span className="text-[11px] text-stone-400 mt-1 block">
                  Tip: {'{YEAR}'} and {'{SITE_NAME}'} are automatically replaced with current year and farm name.
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5 flex items-center justify-between">
                <span>Farm Specialties List (Footer Column 3)</span>
                <span className="text-stone-400 font-semibold normal-case text-xs">Enter one specialty per line</span>
              </label>
              <textarea
                rows={6}
                value={
                  formValues.footer_specialties !== undefined
                    ? formValues.footer_specialties
                    : "Grafted Kesar & Alphonso Mango\nTaiwan Pink Guava Hybrids\nWilt-Resistant Desi Rootstocks\nHigh-Density Meadow Planting\nContract Custom Graft Allocations\nAcclimatized Fruit Saplings"
                }
                onChange={(e) => handleChange('footer_specialties', e.target.value)}
                placeholder="Grafted Kesar & Alphonso Mango&#10;Taiwan Pink Guava Hybrids&#10;Wilt-Resistant Desi Rootstocks"
                className="w-full p-3.5 rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-950 text-sm font-semibold text-stone-900 dark:text-stone-100 focus:border-brand-500 font-mono leading-relaxed"
              />
              <span className="text-[11px] text-stone-400 mt-1 block">
                Each line appears as a bullet point under the "Specialties" column in the footer.
              </span>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                Bottom Disclaimer / Notice (Optional)
              </label>
              <input
                type="text"
                value={formValues.footer_notice || ''}
                onChange={(e) => handleChange('footer_notice', e.target.value)}
                placeholder="Leave blank to hide, or enter custom regulatory / compliance note"
                className="w-full p-3.5 rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-950 text-xs font-medium text-stone-900 dark:text-stone-100 focus:border-brand-500"
              />
              <span className="text-[11px] text-stone-400 mt-1 block">
                Optional badge shown on the bottom right of the footer. Leave empty to hide.
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 3: DIRECT INQUIRIES & CONTACT DETAILS */}
        <div className="bg-white dark:bg-stone-900 p-6 sm:p-8 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-6">
          <div className="border-b border-stone-200 dark:border-stone-800 pb-3">
            <h2 className="font-serif text-xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
              <Phone className="w-6 h-6 text-brand-600 dark:text-brand-400" />
              <span>Direct Inquiries, Contact &amp; WhatsApp Integration</span>
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              Contact channels displayed in footer (Column 4), contact page, and WhatsApp click-to-chat button.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-brand-600" />
                <span>Physical Nursery Location / Address</span>
              </label>
              <input
                type="text"
                value={formValues.contact_address || ''}
                onChange={(e) => handleChange('contact_address', e.target.value)}
                placeholder="Survey No. 108, Riverside Highway, Agri Zone"
                className="w-full p-3.5 rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-950 text-sm font-bold text-stone-900 dark:text-stone-100 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-brand-600" />
                <span>Official Contact Phone</span>
              </label>
              <input
                type="text"
                value={formValues.contact_phone || ''}
                onChange={(e) => handleChange('contact_phone', e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full p-3.5 rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-950 text-sm font-bold text-stone-900 dark:text-stone-100 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-brand-600" />
                <span>Public Contact Email</span>
              </label>
              <input
                type="email"
                value={formValues.contact_email || ''}
                onChange={(e) => handleChange('contact_email', e.target.value)}
                placeholder="info@deeprootfarms.local"
                className="w-full p-3.5 rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-950 text-sm font-bold text-stone-900 dark:text-stone-100 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>Public WhatsApp Number (Digits with Country Code)</span>
              </label>
              <input
                type="text"
                value={formValues.contact_whatsapp || ''}
                onChange={(e) => handleChange('contact_whatsapp', e.target.value)}
                placeholder="e.g. 919876543210 (no + or spaces)"
                className="w-full p-3.5 rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-950 text-sm font-bold text-stone-900 dark:text-stone-100 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                WhatsApp Button CTA Text
              </label>
              <input
                type="text"
                value={
                  formValues.contact_whatsapp_text !== undefined
                    ? formValues.contact_whatsapp_text
                    : 'Inquire via WhatsApp'
                }
                onChange={(e) => handleChange('contact_whatsapp_text', e.target.value)}
                placeholder="Inquire via WhatsApp"
                className="w-full p-3.5 rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-950 text-sm font-bold text-stone-900 dark:text-stone-100 focus:border-brand-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                WhatsApp Pre-filled Customer Message
              </label>
              <input
                type="text"
                value={
                  formValues.contact_whatsapp_msg !== undefined
                    ? formValues.contact_whatsapp_msg
                    : 'Hello Deep Root Farms, I am inquiring about sapling availability.'
                }
                onChange={(e) => handleChange('contact_whatsapp_msg', e.target.value)}
                placeholder="Hello Deep Root Farms, I am inquiring about sapling availability."
                className="w-full p-3.5 rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-950 text-sm font-medium text-stone-900 dark:text-stone-100 focus:border-brand-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                Google Maps Embed URL
              </label>
              <input
                type="text"
                value={formValues.contact_maps_embed || ''}
                onChange={(e) => handleChange('contact_maps_embed', e.target.value)}
                placeholder="https://www.google.com/maps/embed?pb=..."
                className="w-full p-3.5 rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-950 text-xs font-mono text-stone-900 dark:text-stone-100 focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: PLUGGABLE IDENTIFIER CONFIGURATION */}
        <div className="bg-white dark:bg-stone-900 p-6 sm:p-8 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
            <div>
              <h2 className="font-serif text-xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
                <QrCode className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                <span>Pluggable Identifier &amp; Batch Prefix Strategy</span>
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
                Configure auto-generated batch serials, QR modes, and entity tags.
              </p>
            </div>
            <span className="text-xs font-black text-brand-700 bg-brand-50 dark:bg-brand-950/80 px-3 py-1.5 rounded-xl border border-brand-200 dark:border-brand-800">
              Active Strategy: {formValues.identifier_active_scheme || 'SERIAL'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                Active Identification Mode
              </label>
              <select
                value={formValues.identifier_active_scheme || 'SERIAL'}
                onChange={(e) => handleChange('identifier_active_scheme', e.target.value)}
                className="w-full p-3.5 rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-950 text-sm font-black text-stone-900 dark:text-stone-100 focus:border-brand-500 cursor-pointer"
              >
                <option value="SERIAL">SERIAL (Active Standard)</option>
                <option value="QR">QR (Pluggable Strategy)</option>
                <option value="BARCODE">BARCODE (Pluggable Strategy)</option>
              </select>
              <span className="text-[11px] text-stone-400 mt-1 block">
                Existing batch IDs remain permanently traceable after switching schemes.
              </span>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                Serial Template String
              </label>
              <input
                type="text"
                value={formValues.identifier_serial_template || '{PREFIX}-{YYYY}-{SEQ:4}'}
                onChange={(e) => handleChange('identifier_serial_template', e.target.value)}
                className="w-full p-3.5 rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-950 text-sm font-mono font-bold text-stone-900 dark:text-stone-100 focus:border-brand-500"
              />
              <span className="text-[11px] text-stone-400 mt-1 block">
                Supported tokens: {'{PREFIX}'}, {'{YYYY}'}, {'{SEQ:4}'}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-3">
              Entity Batch Prefixes
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-200 dark:border-stone-800">
                <span className="text-[11px] text-stone-400 block font-black uppercase mb-1">Rootstocks</span>
                <input
                  type="text"
                  value={formValues.identifier_prefix_rootstock || 'ROOT'}
                  onChange={(e) => handleChange('identifier_prefix_rootstock', e.target.value)}
                  className="w-full p-2 rounded-xl border border-stone-300 dark:border-stone-700 font-mono font-black uppercase text-sm"
                />
              </div>

              <div className="p-3 bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-200 dark:border-stone-800">
                <span className="text-[11px] text-stone-400 block font-black uppercase mb-1">Scions</span>
                <input
                  type="text"
                  value={formValues.identifier_prefix_scion || 'SCION'}
                  onChange={(e) => handleChange('identifier_prefix_scion', e.target.value)}
                  className="w-full p-2 rounded-xl border border-stone-300 dark:border-stone-700 font-mono font-black uppercase text-sm"
                />
              </div>

              <div className="p-3 bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-200 dark:border-stone-800">
                <span className="text-[11px] text-stone-400 block font-black uppercase mb-1">Grafts</span>
                <input
                  type="text"
                  value={formValues.identifier_prefix_grafted || 'GRAFT'}
                  onChange={(e) => handleChange('identifier_prefix_grafted', e.target.value)}
                  className="w-full p-2 rounded-xl border border-stone-300 dark:border-stone-700 font-mono font-black uppercase text-sm"
                />
              </div>

              <div className="p-3 bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-200 dark:border-stone-800">
                <span className="text-[11px] text-stone-400 block font-black uppercase mb-1">Ready for Sale</span>
                <input
                  type="text"
                  value={formValues.identifier_prefix_ready_for_sale || 'RFS'}
                  onChange={(e) => handleChange('identifier_prefix_ready_for_sale', e.target.value)}
                  className="w-full p-2 rounded-xl border border-stone-300 dark:border-stone-700 font-mono font-black uppercase text-sm"
                />
              </div>

              <div className="p-3 bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-200 dark:border-stone-800">
                <span className="text-[11px] text-stone-400 block font-black uppercase mb-1">Seed Lots</span>
                <input
                  type="text"
                  value={formValues.identifier_prefix_seed_lot || 'SEED'}
                  onChange={(e) => handleChange('identifier_prefix_seed_lot', e.target.value)}
                  className="w-full p-2 rounded-xl border border-stone-300 dark:border-stone-700 font-mono font-black uppercase text-sm"
                />
              </div>

              <div className="p-3 bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-200 dark:border-stone-800">
                <span className="text-[11px] text-stone-400 block font-black uppercase mb-1">Invoices</span>
                <input
                  type="text"
                  value={formValues.identifier_prefix_order || 'SALE'}
                  onChange={(e) => handleChange('identifier_prefix_order', e.target.value)}
                  className="w-full p-2 rounded-xl border border-stone-300 dark:border-stone-700 font-mono font-black uppercase text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Floating / Sticky Save Action */}
        <div className="sticky bottom-6 z-20 flex justify-end">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-base transition-all shadow-2xl cursor-pointer disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>{updateMutation.isPending ? 'Saving All Settings...' : 'Save All Settings & Publish Live'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default CmsSettingsPage;
