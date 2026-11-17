import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  HeartPulse,
  Plus,
  History,
  Calendar,
  AlertCircle,
  CheckCircle,
  X,
  TrendingUp,
  ArrowRight,
  ShieldAlert,
  Sprout,
  Scissors
} from 'lucide-react';

interface CuringBatch {
  id: number;
  serial_number: string;
  plant_variety: string;
  status: string;
  stage: string;
  location: string;
  created_at: string;
  grafting_date?: string;
  total_grafts_attempted: number;
  healed_count: number;
  failed_count: number;
  dead_count: number;
  surviving_plants: number;
  survival_rate: number;
  observation_count: number;
  rootstock_parent?: any;
  scion_parent?: any;
  latest_observation?: any;
}

export const CuringSurvivalPage: React.FC = () => {
  const { t } = useTranslation();
  const [batches, setBatches] = useState<CuringBatch[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal: Record Curing Observation
  const [selectedBatch, setSelectedBatch] = useState<CuringBatch | null>(null);
  const [obsDate, setObsDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [healedCount, setHealedCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [deadCount, setDeadCount] = useState<number>(0);
  const [obsNotes, setObsNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal: View Curing History Logs
  const [historyBatch, setHistoryBatch] = useState<CuringBatch | null>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/inventory/curing');
      setBatches(res.data.batches || []);
    } catch (err) {
      console.error('Failed to load curing batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const openObservationModal = (b: CuringBatch) => {
    setSelectedBatch(b);
    setObsDate(new Date().toISOString().split('T')[0]);
    const currentSurv = b.surviving_plants || b.total_grafts_attempted;
    setHealedCount(currentSurv);
    setFailedCount(Math.max(0, b.total_grafts_attempted - currentSurv));
    setDeadCount(Math.max(0, b.total_grafts_attempted - currentSurv));
    setObsNotes('');
    setFeedback(null);
  };

  const handleRecordObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;

    if (healedCount > selectedBatch.total_grafts_attempted) {
      setFeedback({
        type: 'error',
        message: `Healed count (${healedCount}) cannot exceed total attempted grafts (${selectedBatch.total_grafts_attempted}).`,
      });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      await axios.post(`/api/inventory/curing/${selectedBatch.id}/observation`, {
        observation_date: obsDate,
        healed_count: Number(healedCount),
        failed_count: Number(failedCount),
        dead_count: Number(deadCount),
        notes: obsNotes,
      });

      setFeedback({
        type: 'success',
        message: `Curing progress updated! Surviving plants: ${healedCount}.`,
      });

      fetchBatches();
      setTimeout(() => setSelectedBatch(null), 1200);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to record observation.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const openHistory = async (b: CuringBatch) => {
    setHistoryBatch(b);
    setLoadingHistory(true);
    try {
      const res = await axios.get(`/api/inventory/curing/${b.id}/history`);
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
          <HeartPulse className="w-3.5 h-3.5" />
          Phase E: Curing & Acclimatization
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100">
          Curing & Graft Survival Tracking
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Every grafted batch automatically enters Curing. Record dated observations on healing and mortality without overwriting historical checkups.
        </p>
      </div>

      {/* BATCHES CARDS */}
      {loading ? (
        <div className="p-12 text-center text-stone-400">Loading curing batches...</div>
      ) : batches.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 text-stone-500 text-sm">
          No grafted batches currently under curing. Create a graft run in the Grafting section to populate this stage.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {batches.map((b) => {
            const rate = b.survival_rate || 0;
            return (
              <div
                key={b.id}
                className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                      CURING BATCH
                    </span>
                    <span className="text-xs font-semibold text-stone-400 font-mono">
                      {b.grafting_date || new Date(b.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="font-mono text-base font-bold text-stone-900 dark:text-stone-100">
                    {b.serial_number}
                  </div>
                  <div className="text-sm font-bold text-stone-800 dark:text-stone-200 mt-0.5">
                    {b.plant_variety}
                  </div>

                  {/* Parent Lineage tags */}
                  <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-stone-100 dark:border-stone-800 text-xs">
                    {b.rootstock_parent && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono text-[10px]">
                        ROOT: {b.rootstock_parent.serial_number}
                      </span>
                    )}
                    {b.scion_parent && (
                      <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-mono text-[10px]">
                        SCION: {b.scion_parent.serial_number}
                      </span>
                    )}
                  </div>

                  {/* Survival bar */}
                  <div className="mt-4 p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200/60 dark:border-stone-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-stone-600 dark:text-stone-400">Graft Survival Rate</span>
                      <span className="text-indigo-600 dark:text-indigo-400 text-sm font-serif">
                        {rate}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-rose-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, rate)}%` }}
                      />
                    </div>
                  </div>

                  {/* Quantitative Metrics */}
                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                    <div className="p-2.5 rounded-xl bg-stone-50/70 dark:bg-stone-850/70 border border-stone-100 dark:border-stone-800">
                      <div className="text-stone-400 text-[10px] uppercase font-bold">Attempted</div>
                      <div className="text-sm font-bold text-stone-800 dark:text-stone-200 mt-0.5">
                        {b.total_grafts_attempted}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40">
                      <div className="text-indigo-800 dark:text-indigo-300 text-[10px] uppercase font-bold">
                        Surviving Healed
                      </div>
                      <div className="text-sm font-serif font-bold text-indigo-700 dark:text-indigo-300 mt-0.5">
                        {b.surviving_plants} plants
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 mt-4 border-t border-stone-100 dark:border-stone-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openObservationModal(b)}
                      className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Update Survival</span>
                    </button>

                    <button
                      onClick={() => openHistory(b)}
                      title="Observation History"
                      className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 text-stone-600 dark:text-stone-300"
                    >
                      <History className="w-4 h-4" />
                    </button>
                  </div>

                  {b.surviving_plants > 0 && (
                    <a
                      href={`/app/ready-for-sale?promoteBatchId=${b.id}`}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs flex items-center justify-center gap-1 transition-all"
                    >
                      <span>Promote to Ready for Sale</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  )}
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
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  New Curing Survival Observation
                </span>
                <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                  {selectedBatch.serial_number}
                </h3>
                <div className="text-xs text-stone-500 font-semibold">{selectedBatch.plant_variety}</div>
              </div>
              <button
                onClick={() => setSelectedBatch(null)}
                className="p-2 rounded-xl text-stone-400 hover:bg-stone-100"
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
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase mb-1">
                    Total Grafts Attempted
                  </label>
                  <input
                    type="number"
                    disabled
                    value={selectedBatch.total_grafts_attempted}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-800 text-stone-500 text-sm font-bold cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase mb-1">
                    Healed / Surviving *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={selectedBatch.total_grafts_attempted}
                    value={healedCount}
                    onChange={(e) => {
                      const h = parseInt(e.target.value) || 0;
                      setHealedCount(h);
                      const f = Math.max(0, selectedBatch.total_grafts_attempted - h);
                      setFailedCount(f);
                      setDeadCount(f);
                    }}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-indigo-600 text-sm font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase mb-1">
                    Failed Grafts
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={failedCount}
                    onChange={(e) => setFailedCount(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase mb-1">
                    Dead Grafts
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={deadCount}
                    onChange={(e) => setDeadCount(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-rose-600 text-sm font-bold outline-none"
                  />
                </div>
              </div>

              {/* Survival rate preview */}
              <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 text-xs flex items-center justify-between">
                <div>
                  <div className="text-indigo-800 dark:text-indigo-300 font-bold">Computed Survival Rate:</div>
                  <div className="text-[11px] text-stone-500">
                    ({healedCount} / {selectedBatch.total_grafts_attempted}) × 100
                  </div>
                </div>
                <div className="text-lg font-serif font-bold text-indigo-700 dark:text-indigo-300">
                  {selectedBatch.total_grafts_attempted > 0
                    ? ((healedCount / selectedBatch.total_grafts_attempted) * 100).toFixed(1)
                    : 0}
                  %
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={obsNotes}
                  onChange={(e) => setObsNotes(e.target.value)}
                  placeholder="e.g. Callus fully formed across graft seam; plastic tape unwrapped"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-sm outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBatch(null)}
                  className="px-4 py-2.5 rounded-xl border text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Observation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: OBSERVATION HISTORY */}
      {historyBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 w-full max-w-2xl rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                  Curing History & Survival Observations
                </span>
                <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                  {historyBatch.serial_number}
                </h3>
              </div>
              <button
                onClick={() => setHistoryBatch(null)}
                className="p-2 rounded-xl text-stone-400 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {loadingHistory ? (
                <div className="p-8 text-center text-stone-400">Loading history logs...</div>
              ) : historyLogs.length === 0 ? (
                <div className="p-6 text-center text-stone-500 text-sm">
                  No observation history recorded yet.
                </div>
              ) : (
                historyLogs.map((log, idx) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200/60 dark:border-stone-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                        Checkup #{idx + 1}
                      </span>
                      <span className="text-stone-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {log.observation_date}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-1">
                      <div>
                        <div className="text-stone-400 text-[10px]">Attempted</div>
                        <div className="font-bold text-stone-700 dark:text-stone-200">{log.total_grafts_attempted}</div>
                      </div>
                      <div>
                        <div className="text-stone-400 text-[10px]">Healed</div>
                        <div className="font-bold text-indigo-600">{log.healed_count}</div>
                      </div>
                      <div>
                        <div className="text-stone-400 text-[10px]">Failed / Dead</div>
                        <div className="font-bold text-rose-500">{log.dead_count || log.failed_count}</div>
                      </div>
                      <div>
                        <div className="text-stone-400 text-[10px]">Survival Rate</div>
                        <div className="font-bold text-emerald-600 font-serif">{log.survival_rate}%</div>
                      </div>
                    </div>

                    {log.notes && (
                      <div className="text-stone-500 italic pt-1 border-t border-stone-200/40">
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
                className="px-5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 font-bold text-xs"
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

export default CuringSurvivalPage;

