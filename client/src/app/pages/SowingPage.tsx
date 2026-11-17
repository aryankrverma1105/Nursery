import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  Sprout,
  Plus,
  CheckCircle,
  AlertCircle,
  Calendar,
  MapPin,
  Tag,
  FileText,
  Building,
  Hash,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface BatchRecord {
  id: number;
  serial_number: string;
  batch_type: string;
  plant_variety: string;
  initial_quantity: number;
  current_quantity: number;
  status: string;
  stage: string;
  location: string;
  created_at: string;
  sowing_record?: {
    seed_source: string;
    sowing_date: string;
  };
}

export const SowingPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Selection checkboxes
  const [selectRootstock, setSelectRootstock] = useState<boolean>(true);
  const [selectScion, setSelectScion] = useState<boolean>(false);

  // Common fields
  const [sowingDate, setSowingDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [seedSource, setSeedSource] = useState<string>('National Seed Corporation / Verified Mother Stock');
  const [location, setLocation] = useState<string>('Polyhouse Bed A-1');
  const [notes, setNotes] = useState<string>('');

  // Rootstock specific
  const [rootstockVariety, setRootstockVariety] = useState<string>('Desi Polyembryonic Mango (Vigorous Rootstock)');
  const [rootstockSeedsSown, setRootstockSeedsSown] = useState<number>(100);
  const [rootstockLocation, setRootstockLocation] = useState<string>('Polyhouse Bed A-1 (Rootstock Tray)');

  // Scion specific
  const [scionVariety, setScionVariety] = useState<string>('Gir Kesar Mango (Certified Scion Mother Line)');
  const [scionSeedsSown, setScionSeedsSown] = useState<number>(100);
  const [scionLocation, setScionLocation] = useState<string>('Polyhouse Bed B-1 (Scion Tray)');

  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; batches?: any[] } | null>(null);

  // Existing batches list
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [loadingBatches, setLoadingBatches] = useState<boolean>(true);

  const fetchBatches = async () => {
    try {
      setLoadingBatches(true);
      const res = await axios.get('/api/inventory/sowing');
      setBatches(res.data.batches || []);
    } catch (err) {
      console.error('Failed to load sowing batches:', err);
    } finally {
      setLoadingBatches(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const types: string[] = [];
    if (selectRootstock) types.push('ROOTSTOCK');
    if (selectScion) types.push('SCION');

    if (types.length === 0) {
      setFeedback({ type: 'error', message: 'Please select at least one plant type: Rootstock, Scion, or Both.' });
      return;
    }

    if (selectRootstock && (!rootstockVariety.trim() || rootstockSeedsSown <= 0)) {
      setFeedback({ type: 'error', message: 'Please enter valid variety and seed count (> 0) for Rootstock.' });
      return;
    }

    if (selectScion && (!scionVariety.trim() || scionSeedsSown <= 0)) {
      setFeedback({ type: 'error', message: 'Please enter valid variety and seed count (> 0) for Scion.' });
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        types,
        sowing_date: sowingDate,
        seed_source: seedSource,
        location,
        notes,
      };

      if (selectRootstock) {
        payload.rootstock = {
          variety: rootstockVariety.trim(),
          seeds_sown: Number(rootstockSeedsSown),
          location: rootstockLocation.trim() || location,
          notes,
        };
      }

      if (selectScion) {
        payload.scion = {
          variety: scionVariety.trim(),
          seeds_sown: Number(scionSeedsSown),
          location: scionLocation.trim() || location,
          notes,
        };
      }

      const res = await axios.post('/api/inventory/sowing', payload);
      const created = res.data.batches || (res.data.batch ? [res.data.batch] : []);

      setFeedback({
        type: 'success',
        message: `Successfully registered ${created.length} sowing batch(es)!`,
        batches: created,
      });

      // Refresh list
      fetchBatches();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to record sowing batch.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
          <Sprout className="w-3.5 h-3.5" />
          Phase A: Sowing & Seed Origin
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100">
          Sowing Registration
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Rootstock and Scion both originate here. Select one or both to spawn independent traceable batches with auto-generated serials.
        </p>
      </div>

      {/* FEEDBACK ALERT */}
      {feedback && (
        <div
          className={`p-5 rounded-2xl border flex flex-col gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>

          {feedback.batches && feedback.batches.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-800/60">
              {feedback.batches.map((b: any) => (
                <div
                  key={b.id || b.serial_number}
                  className="bg-white dark:bg-stone-900 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800"
                >
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {b.batch_type} BATCH CREATED
                  </div>
                  <div className="font-mono text-base font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                    {b.serial_number}
                  </div>
                  <div className="text-xs text-stone-600 dark:text-stone-300 mt-1">
                    Variety: <strong>{b.variety || b.plant_variety}</strong> ({b.seeds_sown || b.current_quantity} seeds)
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SOWING REGISTRATION FORM */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-stone-900 p-6 sm:p-8 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-6">
        {/* CHECKBOXES FOR PLANT TYPE SELECTION */}
        <div>
          <label className="block text-sm font-black text-stone-800 dark:text-stone-200 uppercase tracking-wider mb-2.5">
            Select Plant Material To Sow:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Rootstock Checkbox Card */}
            <label
              className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                selectRootstock
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                  : 'border-stone-200 dark:border-stone-800 hover:border-stone-300'
              }`}
            >
              <input
                type="checkbox"
                checked={selectRootstock}
                onChange={(e) => setSelectRootstock(e.target.checked)}
                className="w-5 h-5 mt-1 accent-emerald-600 rounded cursor-pointer"
              />
              <div>
                <div className="font-black text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <span>Rootstock</span>
                  <span className="text-xs bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-2.5 py-0.5 rounded-full font-mono font-bold">
                    ROOT-YYYY-XXXX
                  </span>
                </div>
                <div className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1">
                  Vigorous hardy base seedling sown for root graft foundation.
                </div>
              </div>
            </label>

            {/* Scion Checkbox Card */}
            <label
              className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                selectScion
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                  : 'border-stone-200 dark:border-stone-800 hover:border-stone-300'
              }`}
            >
              <input
                type="checkbox"
                checked={selectScion}
                onChange={(e) => setSelectScion(e.target.checked)}
                className="w-5 h-5 mt-1 accent-emerald-600 rounded cursor-pointer"
              />
              <div>
                <div className="font-black text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <span>Scion</span>
                  <span className="text-xs bg-teal-200 dark:bg-teal-900 text-teal-800 dark:text-teal-200 px-2.5 py-0.5 rounded-full font-mono font-bold">
                    SCION-YYYY-XXXX
                  </span>
                </div>
                <div className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1">
                  Top-cultivar seedling mother line for certified shoots & buds.
                </div>
              </div>
            </label>
          </div>

          {selectRootstock && selectScion && (
            <div className="mt-3 text-sm font-semibold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/60 p-3 rounded-2xl border border-brand-200 dark:border-brand-900 flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 flex-shrink-0 text-brand-600" />
              <span>
                <strong>"Both" selected:</strong> Two separate independent batches will be generated simultaneously with individual varieties and seed counts.
              </span>
            </div>
          )}
        </div>

        {/* COMMON FIELDS: Sowing Date, Seed Source, Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 border-t border-stone-100 dark:border-stone-800">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-stone-400" />
              Sowing Date *
            </label>
            <input
              type="date"
              value={sowingDate}
              onChange={(e) => setSowingDate(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-stone-400" />
              Seed Source / Supplier *
            </label>
            <input
              type="text"
              value={seedSource}
              onChange={(e) => setSeedSource(e.target.value)}
              required
              placeholder="e.g. National Horticulture Seed Board"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-stone-400" />
              Default Nursery Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Polyhouse Bay 1 - Tray Rack 3"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* ROOTSTOCK SECTION */}
        {selectRootstock && (
          <div className="p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <Sprout className="w-5 h-5" />
                Rootstock Sowing Details
              </div>
              <span className="text-xs sm:text-sm font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                Target Batch: ROOT-2026-XXXX
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs sm:text-sm font-black text-stone-700 dark:text-stone-300 uppercase mb-1.5">
                  Rootstock Variety *
                </label>
                <input
                  type="text"
                  value={rootstockVariety}
                  onChange={(e) => setRootstockVariety(e.target.value)}
                  required
                  placeholder="e.g. Desi Polyembryonic Mango"
                  className="w-full min-h-[48px] px-4 py-3 rounded-2xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-base focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-black text-stone-700 dark:text-stone-300 uppercase mb-1.5">
                  Seeds Sown Count *
                </label>
                <input
                  type="number"
                  min="1"
                  value={rootstockSeedsSown}
                  onChange={(e) => setRootstockSeedsSown(parseInt(e.target.value) || 0)}
                  required
                  className="w-full min-h-[48px] px-4 py-3 rounded-2xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-base font-black focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* SCION SECTION */}
        {selectScion && (
          <div className="p-5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/30 border-2 border-teal-300 dark:border-teal-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-black uppercase tracking-wider text-teal-800 dark:text-teal-300 flex items-center gap-2">
                <Sprout className="w-5 h-5" />
                Scion Sowing Details
              </div>
              <span className="text-xs sm:text-sm font-mono text-teal-700 dark:text-teal-400 font-bold">
                Target Batch: SCION-2026-XXXX
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs sm:text-sm font-black text-stone-700 dark:text-stone-300 uppercase mb-1.5">
                  Scion Cultivar / Variety *
                </label>
                <input
                  type="text"
                  value={scionVariety}
                  onChange={(e) => setScionVariety(e.target.value)}
                  required
                  placeholder="e.g. Ratnagiri Alphonso / Gir Kesar"
                  className="w-full min-h-[48px] px-4 py-3 rounded-2xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-base focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-black text-stone-700 dark:text-stone-300 uppercase mb-1.5">
                  Seeds Sown Count *
                </label>
                <input
                  type="number"
                  min="1"
                  value={scionSeedsSown}
                  onChange={(e) => setScionSeedsSown(parseInt(e.target.value) || 0)}
                  required
                  className="w-full min-h-[48px] px-4 py-3 rounded-2xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-base font-black focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* NOTES & CREATED BY */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5">
              Observation Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Fungicide treated, 100% Cocopeat medium"
              className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5">
              Created By (Technician)
            </label>
            <input
              type="text"
              disabled
              value={`${user?.fullName || 'Active Horticulturist'} (${user?.role || 'STAFF'})`}
              className="w-full px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-800 text-stone-500 text-sm font-semibold cursor-not-allowed"
            />
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{saving ? 'Creating Batches...' : 'Save & Generate Sowing Batches'}</span>
          </button>
        </div>
      </form>

      {/* SOWING BATCHES LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Active Sowing Batches
          </h2>
          <span className="text-xs text-stone-500 font-semibold">
            {batches.length} total batch records
          </span>
        </div>

        {loadingBatches ? (
          <div className="p-8 text-center text-stone-400">Loading sowing batches...</div>
        ) : batches.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 text-stone-500 text-sm">
            No sowing batches recorded yet. Fill out the form above to record your first sowing.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {batches.map((b) => (
              <div
                key={b.id}
                className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        b.batch_type === 'ROOTSTOCK'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                      }`}
                    >
                      {b.batch_type}
                    </span>
                    <span className="text-xs text-stone-400">
                      {new Date(b.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="font-mono text-base font-bold text-stone-900 dark:text-stone-100">
                    {b.serial_number}
                  </div>
                  <div className="text-sm font-bold text-stone-800 dark:text-stone-200 mt-1">
                    {b.plant_variety}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-stone-500">
                    <div>
                      Seeds Sown: <strong className="text-stone-800 dark:text-stone-200">{b.initial_quantity}</strong>
                    </div>
                    <div>
                      Viable Balance: <strong className="text-emerald-600 dark:text-emerald-400">{b.current_quantity}</strong>
                    </div>
                    <div className="col-span-2 truncate">
                      Location: {b.location || 'Nursery Bed'}
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                    Stage: {b.stage || b.status}
                  </span>
                  <a
                    href={`/app/germination`}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <span>Track Germination</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SowingPage;

