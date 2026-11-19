import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  Plus,
  History,
  Calendar,
  AlertCircle,
  CheckCircle,
  X,
  TrendingUp,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

interface GerminationBatch {
  id: number;
  serial_number: string;
  batch_type: string;
  plant_variety: string;
  seed_name?: string;
  designation?: 'ROOTSTOCK' | 'SCION' | 'BOTH' | string;
  sowing_designation?: 'ROOTSTOCK' | 'SCION' | 'BOTH' | string;
  status: string;
  stage: string;
  total_seeds: number;
  germinated_quantity: number;
  remaining_viable_seedlings: number;
  germination_percentage: number;
  observation_count: number;
  location: string;
  created_at: string;
  sowing_date?: string;
  latest_observation?: any;
}

export const GerminationPage: React.FC = () => {
  const { t } = useTranslation();
  const [batches, setBatches] = useState<GerminationBatch[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal for new observation
  const [selectedBatch, setSelectedBatch] = useState<GerminationBatch | null>(null);
  const [obsDate, setObsDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [germinatedCount, setGerminatedCount] = useState<number>(0);
  const [nonGerminatedCount, setNonGerminatedCount] = useState<number>(0);
  const [damagedDeadCount, setDamagedDeadCount] = useState<number>(0);
  const [obsNotes, setObsNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal for viewing history
  const [historyBatch, setHistoryBatch] = useState<GerminationBatch | null>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/germination');
      setBatches(res.data.batches || []);
    } catch (err) {
      console.error('Failed to load germination batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const openObservationModal = (batch: GerminationBatch) => {
    setSelectedBatch(batch);
    setObsDate(new Date().toISOString().split('T')[0]);
    // Pre-fill with sensible counts based on latest observation or total seeds
    const prevGerm = batch.germinated_quantity || Math.round(batch.total_seeds * 0.8);
    setGerminatedCount(prevGerm);
    setNonGerminatedCount(Math.max(0, batch.total_seeds - prevGerm));
    setDamagedDeadCount(0);
    setObsNotes('');
    setFeedback(null);
  };

  const handleRecordObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;

    if (germinatedCount > selectedBatch.total_seeds) {
      setFeedback({
        type: 'error',
        message: `Germinated quantity (${germinatedCount}) cannot exceed total seeds sown (${selectedBatch.total_seeds}).`,
      });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      await api.post(`/inventory/germination/${selectedBatch.id}`, {
        observation_date: obsDate,
        total_seeds_sown: selectedBatch.total_seeds,
        germinated_count: Number(germinatedCount),
        non_germinated_count: Number(nonGerminatedCount),
        damaged_dead_count: Number(damagedDeadCount),
        notes: obsNotes,
      });

      setFeedback({
        type: 'success',
        message: `Dated observation saved! Viable seedlings: ${germinatedCount - damagedDeadCount}.`,
      });

      // Refresh batches
      fetchBatches();
      setTimeout(() => {
        setSelectedBatch(null);
      }, 1200);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to record observation.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const openHistoryModal = async (batch: GerminationBatch) => {
    setHistoryBatch(batch);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/inventory/germination/${batch.id}/history`);
      setHistoryLogs(res.data.history || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 text-xs font-bold uppercase tracking-wider mb-2">
          <Activity className="w-3.5 h-3.5" />
          Phase B: Germination Tracking
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100">
          Germination Observation & Sprout Rate
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Every sowing batch appears here. Record dated sprout counts over time without overwriting history. Germination rate is auto-calculated.
        </p>
      </div>

      {/* BATCHES GRID */}
      {loading ? (
        <div className="p-12 text-center text-stone-400">Loading germination records...</div>
      ) : batches.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 text-stone-500 text-sm">
          No sowing batches available for germination tracking. Please register a batch in Sowing first.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {batches.map((b) => {
            const rate = b.germination_percentage || 0;
            return (
              <div
                key={b.id}
                className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                        (b.designation || b.sowing_designation || b.batch_type) === 'ROOTSTOCK'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : (b.designation || b.sowing_designation || b.batch_type) === 'SCION'
                          ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                      }`}
                    >
                      {(b.designation || b.sowing_designation || b.batch_type) === 'BOTH'
                        ? 'Scion & Rootstock'
                        : `Designation: ${b.designation || b.sowing_designation || b.batch_type}`}
                    </span>
                    <span className="text-xs font-semibold text-stone-400">
                      {b.observation_count} observation(s)
                    </span>
                  </div>

                  <div className="font-mono text-base font-bold text-stone-900 dark:text-stone-100">
                    {b.serial_number}
                  </div>
                  <div className="text-sm font-bold text-stone-800 dark:text-stone-200 mt-0.5">
                    {b.seed_name || b.plant_variety}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4 p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200/60 dark:border-stone-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-stone-600 dark:text-stone-400">Germination Rate</span>
                      <span className="text-teal-600 dark:text-teal-400 text-sm font-serif">
                        {rate}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, rate)}%` }}
                      />
                    </div>
                  </div>

                  {/* Metrics details */}
                  <div className="grid grid-cols-2 gap-2.5 mt-4 text-sm">
                    <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800">
                      <div className="text-stone-500 dark:text-stone-400 text-xs uppercase font-black">Total Seeds</div>
                      <div className="text-lg font-black font-sans text-stone-900 dark:text-stone-100 mt-1">
                        {b.total_seeds}
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800">
                      <div className="text-teal-700 dark:text-teal-300 text-xs uppercase font-black">Germinated</div>
                      <div className="text-lg font-black font-sans text-teal-600 dark:text-teal-400 mt-1">
                        {b.germinated_quantity}
                      </div>
                    </div>

                    <div className="col-span-2 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between">
                      <div>
                        <div className="text-emerald-800 dark:text-emerald-200 text-xs uppercase font-black">
                          Remaining Viable Seedlings
                        </div>
                        <div className="text-xl font-black font-sans text-emerald-800 dark:text-emerald-200 mt-1">
                          {b.remaining_viable_seedlings} plants
                        </div>
                      </div>
                      <span className="text-xs font-black px-3 py-1 rounded-lg bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 uppercase tracking-wider">
                        {b.stage || b.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 mt-4 border-t border-stone-200 dark:border-stone-800 flex items-center gap-2.5">
                  <button
                    onClick={() => openObservationModal(b)}
                    className="flex-1 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Record Observation</span>
                  </button>

                  <button
                    onClick={() => openHistoryModal(b)}
                    title="View Observation History"
                    className="p-3 rounded-xl border-2 border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-all"
                  >
                    <History className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: RECORD OBSERVATION */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                  New Dated Germination Log
                </span>
                <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                  {selectedBatch.serial_number}
                </h3>
                <div className="text-xs text-stone-500 font-semibold">{selectedBatch.plant_variety}</div>
              </div>
              <button
                onClick={() => setSelectedBatch(null)}
                className="p-2 rounded-xl text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleRecordObservation} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase mb-1">
                    Observation Date *
                  </label>
                  <input
                    type="date"
                    value={obsDate}
                    onChange={(e) => setObsDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase mb-1">
                    Total Seeds Sown
                  </label>
                  <input
                    type="number"
                    disabled
                    value={selectedBatch.total_seeds}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-800 text-stone-500 text-sm font-bold cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase mb-1">
                    Germinated *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={selectedBatch.total_seeds}
                    value={germinatedCount}
                    onChange={(e) => {
                      const g = parseInt(e.target.value) || 0;
                      setGerminatedCount(g);
                      setNonGerminatedCount(Math.max(0, selectedBatch.total_seeds - g));
                    }}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-teal-600 dark:text-teal-400 text-sm font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase mb-1">
                    Non-Germinated
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={nonGerminatedCount}
                    onChange={(e) => setNonGerminatedCount(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-700 dark:text-stone-300 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase mb-1">
                    Damaged / Dead
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={damagedDeadCount}
                    onChange={(e) => setDamagedDeadCount(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-rose-600 text-sm font-bold outline-none"
                  />
                </div>
              </div>

              {/* Realtime Rate Calculation Preview */}
              <div className="p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900 text-xs flex items-center justify-between">
                <div>
                  <div className="text-teal-800 dark:text-teal-300 font-bold">Auto Computed Rate:</div>
                  <div className="text-[11px] text-stone-500">
                    ({germinatedCount} / {selectedBatch.total_seeds}) × 100
                  </div>
                </div>
                <div className="text-lg font-serif font-bold text-teal-700 dark:text-teal-300">
                  {selectedBatch.total_seeds > 0
                    ? ((germinatedCount / selectedBatch.total_seeds) * 100).toFixed(1)
                    : 0}
                  %
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase mb-1">
                  Observation Notes
                </label>
                <input
                  type="text"
                  value={obsNotes}
                  onChange={(e) => setObsNotes(e.target.value)}
                  placeholder="e.g. Uniform emergence, first true leaves forming"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-sm outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBatch(null)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Observation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DATED OBSERVATION HISTORY */}
      {historyBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 w-full max-w-2xl rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600">
                  Germination Observation History (Append-Only)
                </span>
                <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                  {historyBatch.serial_number}
                </h3>
                <div className="text-xs text-stone-500 font-semibold">{historyBatch.plant_variety}</div>
              </div>
              <button
                onClick={() => setHistoryBatch(null)}
                className="p-2 rounded-xl text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {loadingHistory ? (
                <div className="p-8 text-center text-stone-400">Loading history logs...</div>
              ) : historyLogs.length === 0 ? (
                <div className="p-6 text-center text-stone-500 text-sm">
                  No observation history recorded yet for this batch.
                </div>
              ) : (
                historyLogs.map((log, idx) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200/60 dark:border-stone-800 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                        Observation #{idx + 1}
                      </span>
                      <span className="text-stone-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {log.observation_date}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-xs pt-1">
                      <div>
                        <div className="text-stone-400 text-[10px]">Germinated</div>
                        <div className="font-bold text-teal-600">{log.germinated_count}</div>
                      </div>
                      <div>
                        <div className="text-stone-400 text-[10px]">Non-Germ</div>
                        <div className="font-bold text-stone-600 dark:text-stone-300">{log.non_germinated_count}</div>
                      </div>
                      <div>
                        <div className="text-stone-400 text-[10px]">Dead / Loss</div>
                        <div className="font-bold text-rose-500">{log.damaged_dead_count}</div>
                      </div>
                      <div>
                        <div className="text-stone-400 text-[10px]">Sprout Rate</div>
                        <div className="font-bold text-emerald-600 font-serif">{log.germination_rate}%</div>
                      </div>
                    </div>

                    {log.notes && (
                      <div className="text-xs text-stone-500 italic pt-1 border-t border-stone-200/40 dark:border-stone-700/40">
                        "{log.notes}"
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setHistoryBatch(null)}
                className="px-5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GerminationPage;

