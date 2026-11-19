import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';
import {
  Layers,
  TrendingUp,
  AlertTriangle,
  History,
  CheckCircle,
  AlertCircle,
  X,
  Calendar,
  ArrowRight,
  Filter,
  RefreshCw
} from 'lucide-react';

interface GrowthBatch {
  id: number;
  serial_number: string;
  batch_type: string;
  plant_variety: string;
  seed_name?: string;
  designation?: 'ROOTSTOCK' | 'SCION' | 'BOTH' | string;
  sowing_designation?: 'ROOTSTOCK' | 'SCION' | 'BOTH' | string;
  initial_quantity: number;
  current_quantity: number;
  consumed_as_rootstock?: number;
  consumed_as_scion?: number;
  status: string;
  stage: string;
  location: string;
  created_at: string;
  updated_at: string;
  sowing_record?: any;
  latest_germination?: any;
}

const GROWTH_STATUSES = [
  'GERMINATED',
  'GROWING',
  'READY_FOR_GRAFTING',
  'PARTIALLY_USED',
  'FULLY_USED',
  'COMPLETED'
];

export const PlantGrowthPage: React.FC = () => {
  const { t } = useTranslation();
  const [batches, setBatches] = useState<GrowthBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');

  // Modal: Update Status
  const [statusBatch, setStatusBatch] = useState<GrowthBatch | null>(null);
  const [newStatus, setNewStatus] = useState<string>('READY_FOR_GRAFTING');
  const [statusDate, setStatusDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [statusNotes, setStatusNotes] = useState('');
  const [submittingStatus, setSubmittingStatus] = useState(false);

  // Modal: Record Loss / Mortality
  const [lossBatch, setLossBatch] = useState<GrowthBatch | null>(null);
  const [lossQty, setLossQty] = useState<number>(5);
  const [lossReason, setLossReason] = useState<string>('Stunted seedling cull / mortality');
  const [lossDate, setLossDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [lossNotes, setLossNotes] = useState('');
  const [submittingLoss, setSubmittingLoss] = useState(false);

  // Modal: View Growth Logs History
  const [historyBatch, setHistoryBatch] = useState<GrowthBatch | null>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/growth');
      setBatches(res.data.batches || []);
    } catch (err) {
      console.error('Failed to load growth batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusBatch) return;

    try {
      setSubmittingStatus(true);
      setFeedback(null);
      await api.post(`/inventory/growth/${statusBatch.id}/status`, {
        new_status: newStatus,
        log_date: statusDate,
        notes: statusNotes,
      });

      setFeedback({ type: 'success', message: `Batch ${statusBatch.serial_number} updated to "${newStatus}"!` });
      fetchBatches();
      setTimeout(() => setStatusBatch(null), 1000);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to update status.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSubmittingStatus(false);
    }
  };

  const handleRecordLoss = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lossBatch) return;

    if (lossQty <= 0 || lossQty > lossBatch.current_quantity) {
      setFeedback({
        type: 'error',
        message: `Loss quantity must be between 1 and available balance (${lossBatch.current_quantity}).`,
      });
      return;
    }

    try {
      setSubmittingLoss(true);
      setFeedback(null);
      await api.post(`/inventory/growth/${lossBatch.id}/loss`, {
        loss_quantity: Number(lossQty),
        reason: lossReason,
        log_date: lossDate,
        notes: lossNotes,
      });

      setFeedback({ type: 'success', message: `Recorded loss of ${lossQty} plants for ${lossBatch.serial_number}.` });
      fetchBatches();
      setTimeout(() => setLossBatch(null), 1000);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to record mortality loss.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSubmittingLoss(false);
    }
  };

  const openHistory = async (batch: GrowthBatch) => {
    setHistoryBatch(batch);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/inventory/growth/${batch.id}/history`);
      setHistoryLogs(res.data.history || []);
    } catch (err) {
      console.error('Failed to load growth history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const filteredBatches = batches.filter((b) => {
    if (filterType === 'ALL') return true;
    return b.batch_type === filterType;
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-100 dark:bg-lime-950/60 text-lime-800 dark:text-lime-300 text-xs font-bold uppercase tracking-wider mb-2">
          <Layers className="w-3.5 h-3.5" />
          Phase C: Plant Growth Management
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100">
          Plant Growth & Readiness
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Rootstock and Scion batches develop post-germination. Advance statuses, cull damaged seedlings, and qualify batches for grafting.
        </p>
      </div>

      {/* FILTER BUTTONS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-stone-400" />
          <span className="text-xs font-bold text-stone-700 dark:text-stone-300">Filter By Type:</span>
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'ROOTSTOCK', 'SCION', 'BOTH'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
                filterType === type
                  ? 'bg-lime-600 text-white shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
              }`}
            >
              {type === 'ALL' ? 'All Batches' : type === 'BOTH' ? 'Both (Dual)' : `${type}s`}
            </button>
          ))}
          <button
            onClick={fetchBatches}
            className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 text-stone-400"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* FEEDBACK NOTIFICATION */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* BATCHES CARDS */}
      {loading ? (
        <div className="p-12 text-center text-stone-400">Loading plant growth records...</div>
      ) : filteredBatches.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 text-stone-500 text-sm">
          No batches found matching filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBatches.map((b) => {
            const isReadyForGrafting =
              b.status === 'READY_FOR_GRAFTING' || b.status === 'Ready for Grafting';
            return (
              <div
                key={b.id}
                className={`bg-white dark:bg-stone-900 p-5 rounded-3xl border shadow-xs flex flex-col justify-between ${
                  isReadyForGrafting
                    ? 'border-lime-400/80 dark:border-lime-700/80 ring-1 ring-lime-400/30'
                    : 'border-stone-200 dark:border-stone-800'
                }`}
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
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        isReadyForGrafting
                          ? 'bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-300 animate-pulse'
                          : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>

                  <div className="font-mono text-base font-bold text-stone-900 dark:text-stone-100">
                    {b.serial_number}
                  </div>
                  <div className="text-base font-black text-stone-900 dark:text-stone-100 mt-0.5">
                    {b.seed_name || b.plant_variety}
                  </div>

                  {/* Quantity Stats */}
                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                    <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-100 dark:border-stone-800">
                      <div className="text-stone-400 text-[10px] uppercase font-bold">Initial Sown</div>
                      <div className="text-base font-bold text-stone-800 dark:text-stone-200 mt-0.5">
                        {b.initial_quantity}
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-lime-50/60 dark:bg-lime-950/30 border border-lime-200 dark:border-lime-900/60">
                      <div className="text-lime-800 dark:text-lime-300 text-[10px] uppercase font-bold">
                        Available Balance
                      </div>
                      <div className="text-base font-serif font-bold text-lime-700 dark:text-lime-400 mt-0.5">
                        {b.current_quantity} plants
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-stone-500 truncate">
                    Location: <span className="font-semibold">{b.location || 'Nursery Polyhouse'}</span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-4 mt-4 border-t border-stone-100 dark:border-stone-800 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setStatusBatch(b);
                      setNewStatus(b.status === 'READY_FOR_GRAFTING' ? 'GROWING' : 'READY_FOR_GRAFTING');
                      setStatusNotes('');
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-lime-600 hover:bg-lime-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs transition-all"
                  >
                    <span>Update Status</span>
                  </button>

                  <button
                    onClick={() => {
                      setLossBatch(b);
                      setLossQty(Math.min(5, b.current_quantity));
                      setLossNotes('');
                    }}
                    title="Record Loss / Cull"
                    className="py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 font-bold text-xs transition-all"
                  >
                    <span>Record Loss</span>
                  </button>

                  <button
                    onClick={() => openHistory(b)}
                    title="Growth History Logs"
                    className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 text-stone-500"
                  >
                    <History className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: UPDATE STATUS */}
      {statusBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-lime-600">
                  Advance Plant Growth Stage
                </span>
                <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                  {statusBatch.serial_number}
                </h3>
              </div>
              <button
                onClick={() => setStatusBatch(null)}
                className="p-2 rounded-xl text-stone-400 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase mb-1">
                  Select New Status *
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-sm font-semibold outline-none"
                >
                  {GROWTH_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <div className="text-[11px] text-stone-500 mt-1">
                  Note: Only batches set to <strong>READY_FOR_GRAFTING</strong> will be eligible in Create Graft.
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase mb-1">
                  Date of Status Change
                </label>
                <input
                  type="date"
                  value={statusDate}
                  onChange={(e) => setStatusDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="e.g. Stem diameter reached 8mm; healthy leaves"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-sm outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStatusBatch(null)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStatus}
                  className="px-5 py-2 rounded-xl bg-lime-600 hover:bg-lime-700 text-white font-bold text-xs"
                >
                  {submittingStatus ? 'Updating...' : 'Confirm Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD LOSS / MORTALITY */}
      {lossBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                  Record Loss / Mortality
                </span>
                <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                  {lossBatch.serial_number}
                </h3>
                <div className="text-xs text-stone-500 font-semibold">Available: {lossBatch.current_quantity} plants</div>
              </div>
              <button
                onClick={() => setLossBatch(null)}
                className="p-2 rounded-xl text-stone-400 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordLoss} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase mb-1">
                  Quantity Lost / Culled *
                </label>
                <input
                  type="number"
                  min="1"
                  max={lossBatch.current_quantity}
                  value={lossQty}
                  onChange={(e) => setLossQty(parseInt(e.target.value) || 0)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-rose-600 font-bold text-base outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase mb-1">
                  Reason for Loss *
                </label>
                <select
                  value={lossReason}
                  onChange={(e) => setLossReason(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-sm outline-none font-semibold"
                >
                  <option value="Stunted seedling cull / mortality">Stunted seedling cull</option>
                  <option value="Damping off / fungal infection">Damping off / fungal infection</option>
                  <option value="Insect / stem pest damage">Insect / stem pest damage</option>
                  <option value="Root rot / overwatering">Root rot / overwatering</option>
                  <option value="Physical handling damage">Physical handling damage</option>
                  <option value="Other cull">Other cull</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={lossDate}
                  onChange={(e) => setLossDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-sm outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setLossBatch(null)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLoss}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                >
                  {submittingLoss ? 'Deducting...' : 'Deduct Loss'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GROWTH HISTORY LOGS */}
      {historyBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 w-full max-w-xl rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-lime-600">
                  Dated Growth Logs & Loss Audit
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
                <div className="p-8 text-center text-stone-400">Loading growth logs...</div>
              ) : historyLogs.length === 0 ? (
                <div className="p-6 text-center text-stone-500 text-sm">
                  No status advancements or losses recorded yet.
                </div>
              ) : (
                historyLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200/60 dark:border-stone-800 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-800 dark:text-stone-200">
                        {log.reason || 'Status update'}
                      </span>
                      <span className="text-stone-400">{log.log_date}</span>
                    </div>
                    <div className="flex items-center justify-between text-stone-500">
                      <span>
                        Status: <strong>{log.previous_status}</strong> → <strong className="text-lime-600">{log.new_status}</strong>
                      </span>
                      {log.quantity_change !== 0 && (
                        <span className="font-bold text-rose-500">
                          {log.quantity_change} plants
                        </span>
                      )}
                    </div>
                    {log.notes && <div className="text-stone-400 italic">"{log.notes}"</div>}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setHistoryBatch(null)}
                className="px-5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 font-bold text-xs"
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

export default PlantGrowthPage;

