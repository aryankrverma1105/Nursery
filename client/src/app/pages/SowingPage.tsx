import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';
import {
  Sprout,
  Plus,
  CheckCircle,
  AlertCircle,
  Calendar,
  MapPin,
  Building,
  ArrowRight,
  Layers,
  Scissors,
  Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface BatchRecord {
  id: number;
  serial_number: string;
  batch_type: string;
  designation?: string;
  seed_name?: string;
  plant_variety: string;
  initial_quantity: number;
  current_quantity: number;
  consumed_as_rootstock?: number;
  consumed_as_scion?: number;
  status: string;
  stage: string;
  location: string;
  created_at: string;
  seeds_sown?: number;
  sowing_date?: string;
  seed_source?: string;
  sowing_designation?: string;
}

export const SowingPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  // 1. Seed Name (Actual seed or variety name)
  const [seedName, setSeedName] = useState<string>('Desi Brinjal (Solanum melongena)');

  // 2. What will this seed be used for? (Designation: Scion, Rootstock, or Both)
  const [useScion, setUseScion] = useState<boolean>(true);
  const [useRootstock, setUseRootstock] = useState<boolean>(true);

  // 3. Number of seeds sown (Single physical quantity without duplication)
  const [seedsSown, setSeedsSown] = useState<number>(100);

  // 4. Sowing date
  const [sowingDate, setSowingDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // 5. Seed supplier/source
  const [seedSource, setSeedSource] = useState<string>('National Seed Corporation / ICAR Verified Seed Lot');

  // 6. Nursery location / bed / tray
  const [location, setLocation] = useState<string>('Polyhouse Bay 1 - Germination Tray Rack A');

  // 7. Notes
  const [notes, setNotes] = useState<string>('Seed treated with Trichoderma, sown in sterile cocopeat matrix.');

  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    batch?: any;
    batches?: any[];
  } | null>(null);

  // Existing batches list
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [loadingBatches, setLoadingBatches] = useState<boolean>(true);

  const fetchBatches = async () => {
    try {
      setLoadingBatches(true);
      const res = await api.get('/inventory/sowing');
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

    if (!seedName.trim()) {
      setFeedback({ type: 'error', message: 'Please enter the seed name / variety.' });
      return;
    }

    if (!useScion && !useRootstock) {
      setFeedback({
        type: 'error',
        message: 'Please specify what this seed will be used for: Scion, Rootstock, or Both.',
      });
      return;
    }

    if (!seedsSown || seedsSown <= 0) {
      setFeedback({ type: 'error', message: 'Please enter a valid number of seeds sown (> 0).' });
      return;
    }

    let designation: 'SCION' | 'ROOTSTOCK' | 'BOTH' = 'BOTH';
    if (useScion && useRootstock) designation = 'BOTH';
    else if (useScion) designation = 'SCION';
    else if (useRootstock) designation = 'ROOTSTOCK';

    try {
      setSaving(true);
      const payload = {
        seed_name: seedName.trim(),
        variety: seedName.trim(),
        designation,
        seeds_sown: Number(seedsSown),
        sowing_date: sowingDate,
        seed_source: seedSource.trim(),
        location: location.trim(),
        notes: notes.trim(),
      };

      const res = await api.post('/inventory/sowing', payload);
      const created = res.data.batch || (res.data.batches && res.data.batches[0]);

      setFeedback({
        type: 'success',
        message: `Successfully created sowing batch ${created.serial_number} for ${seedName}!`,
        batch: created,
        batches: [created],
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
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-black uppercase tracking-wider mb-2.5">
          <Sprout className="w-4 h-4" />
          Phase A: Sowing & Seed Origin
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-black text-stone-900 dark:text-stone-100 tracking-tight">
          Sowing Registration
        </h1>
        <p className="text-sm sm:text-base font-medium text-stone-600 dark:text-stone-400 mt-1 max-w-3xl">
          Register seed sowing batches. Rootstock and Scion are <strong>intended-use designations</strong> for
          the resulting plants. Single physical seed quantities are preserved without double counting.
        </p>
      </div>

      {/* FEEDBACK ALERT */}
      {feedback && (
        <div
          className={`p-6 rounded-3xl border-2 flex flex-col gap-3 shadow-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-3 font-bold text-base">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>

          {feedback.batch && (
            <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1">
              <div>
                <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  NEW PHYSICAL BATCH GENERATED
                </div>
                <div className="font-mono text-xl font-black text-stone-900 dark:text-stone-100 mt-0.5">
                  {feedback.batch.serial_number}
                </div>
                <div className="text-sm text-stone-600 dark:text-stone-300 mt-1">
                  Seed: <strong>{feedback.batch.seed_name || feedback.batch.plant_variety}</strong> (
                  {feedback.batch.seeds_sown || feedback.batch.current_quantity} seeds sown)
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 text-xs sm:text-sm font-black uppercase tracking-wider border border-purple-300 dark:border-purple-800">
                  Designation: {feedback.batch.designation || 'BOTH'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* NEW SOWING REGISTRATION FORM */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-stone-900 p-6 sm:p-8 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-7"
      >
        {/* 1. SEED NAME */}
        <div>
          <label className="block text-sm sm:text-base font-black text-stone-900 dark:text-stone-100 uppercase tracking-wider mb-2">
            1. Seed Name *
          </label>
          <input
            type="text"
            value={seedName}
            onChange={(e) => setSeedName(e.target.value)}
            required
            placeholder="e.g. Brinjal, Tomato, Desi Mango, Solanum torvum"
            className="w-full min-h-[50px] px-4 py-3 rounded-2xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-base font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <p className="text-xs sm:text-sm text-stone-500 mt-1.5">
            The actual botanical seed or variety name. This seed species is stored independently from its intended
            grafting use.
          </p>
        </div>

        {/* 2. WHAT WILL THIS SEED BE USED FOR? */}
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
          <label className="block text-sm sm:text-base font-black text-stone-900 dark:text-stone-100 uppercase tracking-wider mb-2.5">
            2. What will this seed be used for? *
          </label>
          <p className="text-xs sm:text-sm text-stone-500 mb-3">
            Select Scion, Rootstock, or Both. If both are selected, plants from this batch can be allocated to either
            role during grafting up to the total physical quantity.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Scion Checkbox Card */}
            <label
              className={`flex items-start gap-3.5 p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                useScion
                  ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 shadow-xs'
                  : 'border-stone-200 dark:border-stone-800 hover:border-stone-300'
              }`}
            >
              <input
                type="checkbox"
                checked={useScion}
                onChange={(e) => setUseScion(e.target.checked)}
                className="w-5 h-5 mt-1 accent-teal-600 rounded cursor-pointer"
              />
              <div>
                <div className="font-black text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  <span>Scion</span>
                </div>
                <div className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                  Used for top shoots, scion budwood, or cultivar fruit/flower donor plants.
                </div>
              </div>
            </label>

            {/* Rootstock Checkbox Card */}
            <label
              className={`flex items-start gap-3.5 p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                useRootstock
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 shadow-xs'
                  : 'border-stone-200 dark:border-stone-800 hover:border-stone-300'
              }`}
            >
              <input
                type="checkbox"
                checked={useRootstock}
                onChange={(e) => setUseRootstock(e.target.checked)}
                className="w-5 h-5 mt-1 accent-emerald-600 rounded cursor-pointer"
              />
              <div>
                <div className="font-black text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Sprout className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>Rootstock</span>
                </div>
                <div className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                  Used for hardy root system base, disease resistance, and soil foundation.
                </div>
              </div>
            </label>
          </div>

          {useScion && useRootstock && (
            <div className="mt-3.5 text-xs sm:text-sm font-semibold text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 p-3.5 rounded-2xl border border-purple-200 dark:border-purple-800 flex items-center gap-2.5">
              <Check className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
              <span>
                <strong>"Both" selected:</strong> A single physical batch will be maintained. In grafting, its
                plants can be consumed as Rootstock, Scion, or both without double-counting physical stock.
              </span>
            </div>
          )}
        </div>

        {/* 3. NUMBER OF SEEDS SOWN */}
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
          <label className="block text-sm sm:text-base font-black text-stone-900 dark:text-stone-100 uppercase tracking-wider mb-2">
            3. Number of Seeds Sown *
          </label>
          <input
            type="number"
            min="1"
            value={seedsSown}
            onChange={(e) => setSeedsSown(parseInt(e.target.value) || 0)}
            required
            className="w-full sm:w-72 min-h-[50px] px-4 py-3 rounded-2xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-lg font-black focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <p className="text-xs sm:text-sm text-stone-500 mt-1.5">
            Total physical seed count sown into trays/beds.
          </p>
        </div>

        {/* 4. SOWING DATE, 5. SUPPLIER, 6. LOCATION */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-2 border-t border-stone-100 dark:border-stone-800">
          {/* 4. Sowing Date */}
          <div>
            <label className="block text-xs sm:text-sm font-black text-stone-800 dark:text-stone-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-stone-500" />
              4. Sowing Date *
            </label>
            <input
              type="date"
              value={sowingDate}
              onChange={(e) => setSowingDate(e.target.value)}
              required
              className="w-full min-h-[50px] px-4 py-3 rounded-2xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-base focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* 5. Seed Supplier / Source */}
          <div>
            <label className="block text-xs sm:text-sm font-black text-stone-800 dark:text-stone-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-stone-500" />
              5. Seed Supplier / Source *
            </label>
            <input
              type="text"
              value={seedSource}
              onChange={(e) => setSeedSource(e.target.value)}
              required
              placeholder="e.g. National Seed Corporation"
              className="w-full min-h-[50px] px-4 py-3 rounded-2xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-base focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* 6. Nursery Location / Bed / Tray */}
          <div>
            <label className="block text-xs sm:text-sm font-black text-stone-800 dark:text-stone-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-stone-500" />
              6. Nursery Location / Bed / Tray
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Polyhouse Bed A-1, Tray Rack 2"
              className="w-full min-h-[50px] px-4 py-3 rounded-2xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-base focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* 7. NOTES & CREATED BY */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-stone-100 dark:border-stone-800">
          <div>
            <label className="block text-xs sm:text-sm font-black text-stone-800 dark:text-stone-200 uppercase tracking-wider mb-2">
              7. Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Pre-soak treatment, germination medium, moisture levels"
              className="w-full min-h-[50px] px-4 py-3 rounded-2xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-base focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-black text-stone-800 dark:text-stone-200 uppercase tracking-wider mb-2">
              Created By (Technician)
            </label>
            <input
              type="text"
              disabled
              value={`${user?.fullName || 'Active Horticulturist'} (${user?.role || 'STAFF'})`}
              className="w-full min-h-[50px] px-4 py-3 rounded-2xl border-2 border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-base font-bold cursor-not-allowed"
            />
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-base shadow-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>{saving ? 'Creating Batch...' : 'Save & Generate Sowing Batch'}</span>
          </button>
        </div>
      </form>

      {/* SOWING BATCHES LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100 uppercase tracking-wider flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            Active Sowing Batches
          </h2>
          <span className="text-xs sm:text-sm text-stone-500 font-bold">
            {batches.length} total batch records
          </span>
        </div>

        {loadingBatches ? (
          <div className="p-8 text-center text-stone-400 font-semibold">Loading sowing batches...</div>
        ) : batches.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 text-stone-500 text-sm font-semibold">
            No sowing batches recorded yet. Fill out the form above to record your first sowing.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {batches.map((b) => {
              const des = (b.designation || b.sowing_designation || b.batch_type || 'BOTH').toUpperCase();
              return (
                <div
                  key={b.id}
                  className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                          des === 'ROOTSTOCK'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : des === 'SCION'
                            ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                        }`}
                      >
                        {des === 'BOTH' ? 'Designation: Scion & Rootstock' : `Designation: ${des}`}
                      </span>
                      <span className="text-xs text-stone-400 font-semibold">
                        {new Date(b.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="font-mono text-lg font-black text-stone-900 dark:text-stone-100">
                      {b.serial_number}
                    </div>
                    <div className="text-base font-black text-stone-900 dark:text-stone-100 mt-1">
                      {b.seed_name || b.plant_variety}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 mt-3.5 text-xs sm:text-sm text-stone-600 dark:text-stone-400">
                      <div>
                        Seeds Sown:{' '}
                        <strong className="text-stone-900 dark:text-stone-100 font-black">
                          {b.seeds_sown || b.initial_quantity}
                        </strong>
                      </div>
                      <div>
                        Viable Stock:{' '}
                        <strong className="text-emerald-700 dark:text-emerald-300 font-black">
                          {b.current_quantity} plants
                        </strong>
                      </div>
                      <div className="col-span-2 truncate">
                        Location: <span className="font-semibold">{b.location || 'Nursery Bed'}</span>
                      </div>
                      {(b.consumed_as_rootstock || 0) > 0 && (
                        <div className="text-emerald-700 dark:text-emerald-400 font-semibold">
                          Used as Rootstock: {b.consumed_as_rootstock}
                        </div>
                      )}
                      {(b.consumed_as_scion || 0) > 0 && (
                        <div className="text-teal-700 dark:text-teal-400 font-semibold">
                          Used as Scion: {b.consumed_as_scion}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3.5 mt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                      Stage: {b.stage || b.status}
                    </span>
                    <a
                      href={`/app/germination`}
                      className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5"
                    >
                      <span>Track Germination</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SowingPage;
