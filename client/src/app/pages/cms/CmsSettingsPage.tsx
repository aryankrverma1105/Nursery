import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import { Settings, Save, QrCode } from 'lucide-react';

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
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    },
  });

  const handleChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formValues);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
            Nursery & Identifier Settings
          </h1>
          <p className="text-xs text-stone-500">
            Admin configuration for public branding, contact info, and pluggable identification strategies.
          </p>
        </div>

        {savedSuccess && (
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            ✓ Settings Saved
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* SECTION 1: PUBLIC BRANDING & CONTACT */}
        <div className="bg-white dark:bg-stone-900 p-6 sm:p-8 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
          <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-brand-600" />
            <span>Public Nursery Branding</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
                Farm Name (with dev marker)
              </label>
              <input
                type="text"
                value={formValues.site_name || ''}
                onChange={(e) => handleChange('site_name', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-sm font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
                Public WhatsApp Number (for wa.me)
              </label>
              <input
                type="text"
                value={formValues.contact_whatsapp || ''}
                onChange={(e) => handleChange('contact_whatsapp', e.target.value)}
                placeholder="e.g. 919876543210 (digits with country code)"
                className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-sm font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={formValues.contact_phone || ''}
                onChange={(e) => handleChange('contact_phone', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={formValues.contact_email || ''}
                onChange={(e) => handleChange('contact_email', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
              Physical Location / Address
            </label>
            <input
              type="text"
              value={formValues.contact_address || ''}
              onChange={(e) => handleChange('contact_address', e.target.value)}
              className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-sm"
            />
          </div>
        </div>

        {/* SECTION 2: IDENTIFIER SERVICE CONFIGURATION */}
        <div className="bg-white dark:bg-stone-900 p-6 sm:p-8 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-brand-600" />
              <span>Pluggable Identifier Configuration</span>
            </h2>
            <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg">
              Active Strategy: {formValues.identifier_active_scheme || 'SERIAL'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
                Active Identification Mode
              </label>
              <select
                value={formValues.identifier_active_scheme || 'SERIAL'}
                onChange={(e) => handleChange('identifier_active_scheme', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-xs font-bold"
              >
                <option value="SERIAL">SERIAL (Active Default)</option>
                <option value="QR">QR (Pluggable Strategy)</option>
                <option value="BARCODE">BARCODE (Pluggable Strategy)</option>
              </select>
              <div className="text-[10px] text-stone-400 mt-1">
                Old serials remain fully valid and lookable after switching schemes.
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
                Serial Template String
              </label>
              <input
                type="text"
                value={formValues.identifier_serial_template || '{PREFIX}-{YYYY}-{SEQ:5}'}
                onChange={(e) => handleChange('identifier_serial_template', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-xs font-mono font-bold"
              />
              <div className="text-[10px] text-stone-400 mt-1">
                Supported tokens: {'{PREFIX}'}, {'{YYYY}'}, {'{SEQ:5}'}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
              Configurable Entity Prefixes
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-stone-400 block font-bold">Rootstocks</span>
                <input
                  type="text"
                  value={formValues.identifier_prefix_rootstock || 'RS'}
                  onChange={(e) => handleChange('identifier_prefix_rootstock', e.target.value)}
                  className="w-full p-2 rounded-lg border font-mono font-bold uppercase"
                />
              </div>
              <div>
                <span className="text-[10px] text-stone-400 block font-bold">Scions</span>
                <input
                  type="text"
                  value={formValues.identifier_prefix_scion || 'SC'}
                  onChange={(e) => handleChange('identifier_prefix_scion', e.target.value)}
                  className="w-full p-2 rounded-lg border font-mono font-bold uppercase"
                />
              </div>
              <div>
                <span className="text-[10px] text-stone-400 block font-bold">Grafts</span>
                <input
                  type="text"
                  value={formValues.identifier_prefix_grafted || 'GR'}
                  onChange={(e) => handleChange('identifier_prefix_grafted', e.target.value)}
                  className="w-full p-2 rounded-lg border font-mono font-bold uppercase"
                />
              </div>
              <div>
                <span className="text-[10px] text-stone-400 block font-bold">Ready for Sale</span>
                <input
                  type="text"
                  value={formValues.identifier_prefix_ready_for_sale || 'RFS'}
                  onChange={(e) => handleChange('identifier_prefix_ready_for_sale', e.target.value)}
                  className="w-full p-2 rounded-lg border font-mono font-bold uppercase"
                />
              </div>
              <div>
                <span className="text-[10px] text-stone-400 block font-bold">Seed Lots</span>
                <input
                  type="text"
                  value={formValues.identifier_prefix_seed_lot || 'SEED'}
                  onChange={(e) => handleChange('identifier_prefix_seed_lot', e.target.value)}
                  className="w-full p-2 rounded-lg border font-mono font-bold uppercase"
                />
              </div>
              <div>
                <span className="text-[10px] text-stone-400 block font-bold">Sales Invoices</span>
                <input
                  type="text"
                  value={formValues.identifier_prefix_order || 'SALE'}
                  onChange={(e) => handleChange('identifier_prefix_order', e.target.value)}
                  className="w-full p-2 rounded-lg border font-mono font-bold uppercase"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-brand-800 hover:bg-brand-900 text-white font-bold py-3.5 rounded-2xl shadow flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          <Save className="w-4 h-4" />
          <span>Save System Settings</span>
        </button>
      </form>
    </div>
  );
};

export default CmsSettingsPage;

