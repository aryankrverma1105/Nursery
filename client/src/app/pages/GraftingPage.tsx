import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  Scissors,
  Plus,
  CheckCircle,
  AlertCircle,
  Calendar,
  User,
  ShieldCheck,
  ArrowRight,
  Layers,
  Sprout,
  HeartPulse
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface EligibleBatch {
  id: number;
  serial_number: string;
  batch_type: string;
  plant_variety: string;
  current_quantity: number;
  status: string;
  stage: string;
  location: string;
  created_at: string;
}

interface GraftRecord {
  id: number;
  serial_number: string;
  plant_variety: string;
  initial_quantity: number;
  current_quantity: number;
  status: string;
  stage: string;
  created_at: string;
  technician_name?: string;
  grafting_date?: string;
  rootstock?: any;
  scion?: any;
}

export const GraftingPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Eligible batches
  const [rootstocks, setRootstocks] = useState<EligibleBatch[]>([]);
  const [scions, setScions] = useState<EligibleBatch[]>([]);
  const [loadingEligible, setLoadingEligible] = useState(true);

  // Selected parents
  const [selectedRootstockId, setSelectedRootstockId] = useState<number | ''>('');
  const [selectedScionId, setSelectedScionId] = useState<number | ''>('');

  // Form inputs
  const [graftDate, setGraftDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [quantityGrafted, setQuantityGrafted] = useState<number>(50);
  const [technicianName, setTechnicianName] = useState<string>('Master Grafter Suresh');
  const [graftingMethod, setGraftingMethod] = useState<string>('Wedge / Cleft Grafting');
  const [notes, setNotes] = useState<string>('High-vigor graft union with parafilm wrapping');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; batch?: any } | null>(null);

  // List of existing graft runs
  const [graftRuns, setGraftRuns] = useState<GraftRecord[]>([]);
  const [loadingGrafts, setLoadingGrafts] = useState(true);

  const fetchEligible = async () => {
    try {
      setLoadingEligible(true);
      const res = await axios.get('/api/inventory/grafting/eligible-batches');
      const rs = res.data.rootstocks || [];
      const sc = res.data.scions || [];
      setRootstocks(rs);
      setScions(sc);

      if (rs.length > 0 && !selectedRootstockId) {
        setSelectedRootstockId(rs[0].id);
      }
      if (sc.length > 0 && !selectedScionId) {
        setSelectedScionId(sc[0].id);
      }
    } catch (err) {
      console.error('Failed to load eligible batches:', err);
    } finally {
      setLoadingEligible(false);
    }
  };

  const fetchGraftRuns = async () => {
    try {
      setLoadingGrafts(true);
      const res = await axios.get('/api/inventory/grafting');
      setGraftRuns(res.data.grafts || []);
    } catch (err) {
      console.error('Failed to load graft runs:', err);
    } finally {
      setLoadingGrafts(false);
    }
  };

  useEffect(() => {
    fetchEligible();
    fetchGraftRuns();
  }, []);

  const selectedRootstock = rootstocks.find((r) => r.id === selectedRootstockId);
  const selectedScion = scions.find((s) => s.id === selectedScionId);

  const maxPossible = Math.min(
    selectedRootstock?.current_quantity || 0,
    selectedScion?.current_quantity || 0
  );

  const handleCreateGraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!selectedRootstockId || !selectedScionId) {
      setFeedback({ type: 'error', message: 'Please select both a Rootstock batch and a Scion batch.' });
      return;
    }

    if (quantityGrafted <= 0) {
      setFeedback({ type: 'error', message: 'Quantity of grafts attempted must be greater than zero.' });
      return;
    }

    if (selectedRootstock && quantityGrafted > selectedRootstock.current_quantity) {
      setFeedback({
        type: 'error',
        message: `Quantity (${quantityGrafted}) exceeds Rootstock balance (${selectedRootstock.current_quantity}).`,
      });
      return;
    }

    if (selectedScion && quantityGrafted > selectedScion.current_quantity) {
      setFeedback({
        type: 'error',
        message: `Quantity (${quantityGrafted}) exceeds Scion balance (${selectedScion.current_quantity}).`,
      });
      return;
    }

    try {
      setSaving(true);
      const res = await axios.post('/api/inventory/grafting', {
        rootstock_batch_id: Number(selectedRootstockId),
        scion_batch_id: Number(selectedScionId),
        quantity_grafted: Number(quantityGrafted),
        grafting_date: graftDate,
        technician_name: technicianName,
        grafting_method: graftingMethod,
        notes,
      });

      const newBatch = res.data.batch;
      setFeedback({
        type: 'success',
        message: `Grafting successful! Deducted ${quantityGrafted} from both parents and created Graft Batch ${newBatch.serial_number}.`,
        batch: newBatch,
      });

      // Refresh data
      fetchEligible();
      fetchGraftRuns();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to create graft batch.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
          <Scissors className="w-3.5 h-3.5" />
          Phase D: Grafting Operations
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100">
          Create Grafted Batch
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Select eligible Rootstock & Scion batches. Atomic deduction from both parents links pedigree permanently and creates a new Grafted Batch (GRAFT-YYYY-XXXX).
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

          {feedback.batch && (
            <div className="mt-2 p-3 bg-white dark:bg-stone-900 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs">
              <span className="font-bold text-emerald-600">New Grafted Batch: </span>
              <strong className="font-mono text-stone-900 dark:text-stone-100 text-sm ml-1">
                {feedback.batch.serial_number}
              </strong>
              <div className="text-stone-500 mt-0.5">
                {feedback.batch.plant_variety} — Initial quantity: <strong>{feedback.batch.quantity}</strong> (Status: CURING)
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE GRAFT FORM */}
      <form onSubmit={handleCreateGraft} className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-stone-100 dark:border-stone-800">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          1. Select Parent Batches
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ROOTSTOCK SELECTOR */}
          <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Sprout className="w-4 h-4" />
                Rootstock Parent Batch *
              </label>
              <span className="text-[10px] font-bold text-emerald-600">
                {rootstocks.length} available
              </span>
            </div>

            <select
              value={selectedRootstockId}
              onChange={(e) => setSelectedRootstockId(Number(e.target.value) || '')}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-sm font-semibold outline-none"
            >
              <option value="">-- Choose Rootstock Batch --</option>
              {rootstocks.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.serial_number} — {r.plant_variety} (Avail: {r.current_quantity})
                </option>
              ))}
            </select>

            {selectedRootstock && (
              <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-emerald-200/80 dark:border-emerald-800 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                    {selectedRootstock.serial_number}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                    {selectedRootstock.status}
                  </span>
                </div>
                <div className="text-stone-600 dark:text-stone-300 font-semibold">{selectedRootstock.plant_variety}</div>
                <div className="text-stone-500 flex items-center justify-between pt-1">
                  <span>Available stock:</span>
                  <strong className="text-emerald-600 text-sm">{selectedRootstock.current_quantity} plants</strong>
                </div>
              </div>
            )}
          </div>

          {/* SCION SELECTOR */}
          <div className="p-4 rounded-2xl bg-teal-50/40 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                Scion Parent Batch *
              </label>
              <span className="text-[10px] font-bold text-teal-600">
                {scions.length} available
              </span>
            </div>

            <select
              value={selectedScionId}
              onChange={(e) => setSelectedScionId(Number(e.target.value) || '')}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-sm font-semibold outline-none"
            >
              <option value="">-- Choose Scion Batch --</option>
              {scions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.serial_number} — {s.plant_variety} (Avail: {s.current_quantity})
                </option>
              ))}
            </select>

            {selectedScion && (
              <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-teal-200/80 dark:border-teal-800 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                    {selectedScion.serial_number}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold text-[10px]">
                    {selectedScion.status}
                  </span>
                </div>
                <div className="text-stone-600 dark:text-stone-300 font-semibold">{selectedScion.plant_variety}</div>
                <div className="text-stone-500 flex items-center justify-between pt-1">
                  <span>Available stock:</span>
                  <strong className="text-teal-600 text-sm">{selectedScion.current_quantity} plants</strong>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* GRAFT RUN PARAMETERS */}
        <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider flex items-center gap-2 pt-4 border-t border-stone-100 dark:border-stone-800">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          2. Graft Run Details & Quantities
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-stone-400" />
              Grafting Date *
            </label>
            <input
              type="date"
              value={graftDate}
              onChange={(e) => setGraftDate(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-sm outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                Grafts Attempted *
              </label>
              <span className="text-[10px] text-stone-400 font-semibold">Max: {maxPossible}</span>
            </div>
            <input
              type="number"
              min="1"
              max={maxPossible || 9999}
              value={quantityGrafted}
              onChange={(e) => setQuantityGrafted(parseInt(e.target.value) || 0)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-sm font-bold outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User className="w-4 h-4 text-stone-400" />
              Technician / Worker *
            </label>
            <input
              type="text"
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
              required
              placeholder="e.g. Master Grafter Suresh"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-sm outline-none font-semibold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5">
              Grafting Method
            </label>
            <select
              value={graftingMethod}
              onChange={(e) => setGraftingMethod(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-sm font-semibold outline-none"
            >
              <option value="Wedge / Cleft Grafting">Wedge / Cleft Grafting</option>
              <option value="Veneer Grafting">Veneer Grafting</option>
              <option value="Side Tongue Grafting">Side Tongue Grafting</option>
              <option value="Epicotyl / Stone Grafting">Epicotyl / Stone Grafting</option>
              <option value="Budding (T-Budding / Patch)">Budding (T-Budding / Patch)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Union tied with biodegradable stretch tape"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-sm outline-none"
            />
          </div>
        </div>

        {/* ATOMIC DEDUCTION PREVIEW BANNER */}
        <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs flex items-center justify-between">
          <div>
            <span className="font-bold text-amber-900 dark:text-amber-200">Atomic Stock Deduction:</span>
            <div className="text-stone-600 dark:text-stone-400 text-[11px] mt-0.5">
              {quantityGrafted} plants will be deducted from Rootstock ({selectedRootstock?.serial_number || 'ROOT'}) and {quantityGrafted} from Scion ({selectedScion?.serial_number || 'SCION'}).
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-stone-400 uppercase">Target Result</span>
            <div className="font-serif font-bold text-amber-700 dark:text-amber-300 text-sm">
              +{quantityGrafted} Grafts (Curing)
            </div>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving || !selectedRootstockId || !selectedScionId}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            <Scissors className="w-4 h-4" />
            <span>{saving ? 'Processing Graft Run...' : 'Save Graft & Deduct Parents'}</span>
          </button>
        </div>
      </form>

      {/* GRAFTED BATCHES LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            Grafted Batches Under Curing
          </h2>
          <span className="text-xs text-stone-500 font-semibold">{graftRuns.length} graft runs recorded</span>
        </div>

        {loadingGrafts ? (
          <div className="p-8 text-center text-stone-400">Loading grafted batches...</div>
        ) : graftRuns.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 text-stone-500 text-sm">
            No grafted batches created yet. Complete the form above to record your first graft run.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {graftRuns.map((g) => (
              <div
                key={g.id}
                className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      GRAFTED BATCH
                    </span>
                    <span className="text-xs text-stone-400 font-mono">
                      {g.grafting_date || new Date(g.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="font-mono text-base font-bold text-stone-900 dark:text-stone-100">
                    {g.serial_number}
                  </div>
                  <div className="text-sm font-bold text-stone-800 dark:text-stone-200 mt-0.5">
                    {g.plant_variety}
                  </div>

                  {/* Parents lineage tags */}
                  <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-stone-100 dark:border-stone-800 text-xs">
                    {g.rootstock && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono text-[11px]">
                        ROOT: {g.rootstock.serial_number}
                      </span>
                    )}
                    {g.scion && (
                      <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-mono text-[11px]">
                        SCION: {g.scion.serial_number}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-stone-500">
                    <div>
                      Grafts Attempted: <strong className="text-stone-800 dark:text-stone-200">{g.initial_quantity}</strong>
                    </div>
                    <div>
                      Surviving: <strong className="text-amber-600 dark:text-amber-400">{g.current_quantity}</strong>
                    </div>
                    <div className="col-span-2">
                      Technician: <span className="font-semibold">{g.technician_name || 'Horticulture Team'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                    Status: {g.status}
                  </span>
                  <a
                    href="/app/curing"
                    className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <span>Track Survival</span>
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

export default GraftingPage;
