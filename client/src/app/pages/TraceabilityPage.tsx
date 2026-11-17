import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Calendar,
  User,
  ShieldAlert,
  Sprout,
  Scissors,
  Layers,
  HeartPulse,
  ShoppingBag,
  ArrowDown,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const TraceabilityPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const codeParam = searchParams.get('code') || '';

  const [searchCode, setSearchCode] = useState<string>(codeParam || 'SALE-2026-0001');
  const [loading, setLoading] = useState<boolean>(false);
  const [traceData, setTraceData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Quarantine Action State
  const [quarantineReason, setQuarantineReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const isSupervisor = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchCode.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setActionFeedback(null);
      const res = await axios.get(`/api/trace/${encodeURIComponent(searchCode.trim())}`);
      setTraceData(res.data);
    } catch (err: any) {
      console.error('Trace error:', err);
      const msg = err.response?.data?.error || err.message || 'Identifier not found in registry.';
      setError(msg);
      setTraceData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (codeParam) {
      setSearchCode(codeParam);
      handleSearch();
    }
  }, [codeParam]);

  const handleQuarantine = async (batchId: number) => {
    if (!quarantineReason.trim()) {
      alert('Please provide a justification for quarantine.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await axios.post('/api/trace/quarantine', {
        batch_id: batchId,
        reason: quarantineReason,
      });
      setActionFeedback(res.data.message);
      setQuarantineReason('');
      handleSearch();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to quarantine batch.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRelease = async (batchId: number) => {
    const reason = prompt('Enter justification to release batch from quarantine:');
    if (!reason) return;

    try {
      setActionLoading(true);
      const res = await axios.post('/api/trace/release', {
        batch_id: batchId,
        reason,
      });
      setActionFeedback(res.data.message);
      handleSearch();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to release batch.');
    } finally {
      setActionLoading(false);
    }
  };

  const timeline = traceData?.workflowTimeline;
  const targetBatch = traceData?.batch || timeline?.searchedBatch;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-2">
          <Search className="w-3.5 h-3.5" />
          Phase H: Full Lineage & Backtracking
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100">
          Traceability & Pedigree Search
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Backtrack from any Sale Invoice, Ready batch, Grafted batch, or Sowing lot back to its exact germination and seed source origin.
        </p>
      </div>

      {/* SEARCH BAR */}
      <form onSubmit={handleSearch} className="bg-white dark:bg-stone-900 p-4 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            placeholder="Enter any code: SALE-2026-0001, RFS-2026-0001, GRAFT-2026-0001, ROOT-..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-850 text-stone-900 dark:text-stone-100 font-mono text-sm uppercase font-bold outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Search className="w-4 h-4" />
          <span>{loading ? 'Searching...' : 'Trace Batch'}</span>
        </button>
      </form>

      {/* ERROR NOTICE */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* ACTION FEEDBACK */}
      {actionFeedback && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* TRACE RESULTS */}
      {traceData && (
        <div className="space-y-6">
          {/* QUARANTINE WARNING IF APPLICABLE */}
          {targetBatch?.status === 'QUARANTINED' && (
            <div className="p-5 rounded-3xl bg-rose-600 text-white shadow-lg space-y-2">
              <div className="flex items-center gap-2 font-bold text-base">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
                <span>QUARANTINE ALERT: THIS BATCH IS UNDER BIO-SECURITY HOLD</span>
              </div>
              <p className="text-xs text-rose-100">
                Reason: {targetBatch.quarantine_reason || 'Under inspection. Blocked from public sale.'}
              </p>
              {isSupervisor && (
                <button
                  onClick={() => handleRelease(targetBatch.id)}
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-xl bg-white text-rose-700 font-bold text-xs shadow-sm hover:bg-rose-50 transition-all mt-2"
                >
                  Release Quarantine
                </button>
              )}
            </div>
          )}

          {/* PRINTABLE LABEL & QUARANTINE CONTROLS */}
          {targetBatch && (
            <div className="bg-white dark:bg-stone-900 p-4 rounded-3xl border border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                  <Printer className="w-5 h-5" />
                </span>
                <div>
                  <div className="font-bold text-sm text-stone-900 dark:text-stone-100 font-mono">
                    {targetBatch.serial_number}
                  </div>
                  <div className="text-xs text-stone-500">
                    {targetBatch.plant_variety} — Status: <strong>{targetBatch.status}</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`/api/trace/label/${encodeURIComponent(targetBatch.serial_number)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 text-xs font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Label Tag</span>
                </a>

                {isSupervisor && targetBatch.status !== 'QUARANTINED' && (
                  <button
                    onClick={() => {
                      const r = prompt('Reason for initiating quarantine on batch and all its descendants:');
                      if (r) {
                        setQuarantineReason(r);
                        handleQuarantine(targetBatch.id);
                      }
                    }}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold"
                  >
                    Quarantine Batch
                  </button>
                )}
              </div>
            </div>
          )}

          {/* BACKTRACKING TIMELINE (7 PHASES) */}
          <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              Complete Backtracking Timeline
            </h2>

            {/* STAGE 1: SOLD PLANT & SALE INVOICES */}
            {timeline?.salesRecords && timeline.salesRecords.length > 0 && (
              <div className="relative pl-8 pb-6 border-l-2 border-purple-300 dark:border-purple-800 space-y-2">
                <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs border-2 border-purple-400">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-purple-700 dark:text-purple-400 uppercase tracking-wider">
                    Stage 1: Plant Sales & Invoices ({timeline.salesRecords.length} recorded)
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  {timeline.salesRecords.map((sale: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/60 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="font-mono text-purple-900 dark:text-purple-300">
                          {sale.invoice_number}
                        </strong>
                        <span className="text-stone-400">{sale.order_date}</span>
                      </div>
                      <div className="text-stone-700 dark:text-stone-300">
                        Buyer: <strong>{sale.customer_name}</strong> ({sale.customer_phone})
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-purple-100 dark:border-purple-900/40 text-stone-600 dark:text-stone-400">
                        <span>Quantity: <strong>{sale.sold_quantity} plants</strong></span>
                        <span className="font-bold text-purple-800 dark:text-purple-300 font-serif">₹{sale.total_price}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STAGE 2: READY FOR SALE BATCH */}
            {timeline?.readyForSale && (
              <div className="relative pl-8 pb-6 border-l-2 border-blue-300 dark:border-blue-800 space-y-2">
                <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs border-2 border-blue-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="font-bold text-sm text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                  Stage 2: Ready for Sale Batch
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/60 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base font-bold text-blue-900 dark:text-blue-200">
                      {timeline.readyForSale.batch.serial_number}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                      {timeline.readyForSale.batch.status}
                    </span>
                  </div>
                  <div className="text-stone-600 dark:text-stone-300 font-semibold">
                    {timeline.readyForSale.batch.plant_variety}
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-stone-500">
                    <div>Initial Promoted: <strong>{timeline.readyForSale.quantity_ready} plants</strong></div>
                    <div>Remaining Available: <strong>{timeline.readyForSale.quantity_available} plants</strong></div>
                    <div>Promotion Date: {timeline.readyForSale.ready_date}</div>
                    <div>Location: {timeline.readyForSale.batch.location}</div>
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 3: GRAFTED BATCH & CURING HISTORY */}
            {timeline?.grafting && (
              <div className="relative pl-8 pb-6 border-l-2 border-amber-300 dark:border-amber-800 space-y-2">
                <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xs border-2 border-amber-400">
                  <Scissors className="w-4 h-4" />
                </div>
                <div className="font-bold text-sm text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                  Stage 3: Grafting & Curing Acclimatization
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base font-bold text-amber-900 dark:text-amber-200">
                      {timeline.grafting.batch.serial_number}
                    </span>
                    <span className="text-stone-400">{timeline.grafting.grafting_date}</span>
                  </div>
                  <div className="text-stone-700 dark:text-stone-300 font-semibold">
                    {timeline.grafting.batch.plant_variety}
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-stone-600 dark:text-stone-400">
                    <div>Technician: <strong>{timeline.grafting.technician}</strong></div>
                    <div>Method: <strong>{timeline.grafting.grafting_method}</strong></div>
                    <div>Grafts Attempted: <strong>{timeline.grafting.attempts_count}</strong></div>
                  </div>

                  {/* Curing Observations */}
                  {timeline.curingObservations && timeline.curingObservations.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-amber-200/60 dark:border-amber-900/40 space-y-1.5">
                      <div className="font-bold text-[11px] text-amber-800 dark:text-amber-300 uppercase">
                        Curing Survival Observations ({timeline.curingObservations.length} checkups):
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {timeline.curingObservations.map((obs: any, idx: number) => (
                          <div key={idx} className="p-2 rounded-xl bg-white dark:bg-stone-900 border border-amber-200/40 text-[11px]">
                            <div className="flex justify-between font-bold">
                              <span>Checkup on {obs.observation_date}</span>
                              <span className="text-emerald-600">{obs.survival_rate}% survival</span>
                            </div>
                            <div className="text-stone-500 mt-0.5">
                              {obs.healed_count} healed, {obs.failed_count || obs.dead_count} failed
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STAGE 4: DUAL PARENT ORIGIN (ROOTSTOCK + SCION SOWING) */}
            <div className="relative pl-8 space-y-3">
              <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs border-2 border-emerald-400">
                <Sprout className="w-4 h-4" />
              </div>
              <div className="font-bold text-sm text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Stage 4: Dual Parent Seed & Sowing Origin
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ROOTSTOCK ORIGIN */}
                {timeline?.rootstockOrigin ? (
                  <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold uppercase text-[10px]">
                        ROOTSTOCK ORIGIN
                      </span>
                      <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                        {timeline.rootstockOrigin.batch.serial_number}
                      </span>
                    </div>

                    <div className="font-bold text-sm text-stone-800 dark:text-stone-200">
                      {timeline.rootstockOrigin.sowing.variety}
                    </div>

                    <div className="space-y-1 text-stone-600 dark:text-stone-400 pt-1">
                      <div>Sowing Date: <strong>{timeline.rootstockOrigin.sowing.sowing_date}</strong></div>
                      <div>Seed Supplier: <strong>{timeline.rootstockOrigin.sowing.seed_source}</strong></div>
                      <div>Seeds Sown: <strong>{timeline.rootstockOrigin.sowing.seeds_sown}</strong></div>
                      <div>Germination Rate: <strong className="text-emerald-600">{timeline.rootstockOrigin.germinationRate}%</strong></div>
                      <div>Viable Seedlings: <strong>{timeline.rootstockOrigin.remainingViable}</strong></div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200 text-xs text-stone-400">
                    No Rootstock parent lineage linked.
                  </div>
                )}

                {/* SCION ORIGIN */}
                {timeline?.scionOrigin ? (
                  <div className="p-4 rounded-2xl bg-teal-50/40 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-bold uppercase text-[10px]">
                        SCION ORIGIN
                      </span>
                      <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                        {timeline.scionOrigin.batch.serial_number}
                      </span>
                    </div>

                    <div className="font-bold text-sm text-stone-800 dark:text-stone-200">
                      {timeline.scionOrigin.sowing.variety}
                    </div>

                    <div className="space-y-1 text-stone-600 dark:text-stone-400 pt-1">
                      <div>Sowing Date: <strong>{timeline.scionOrigin.sowing.sowing_date}</strong></div>
                      <div>Seed / Mother Source: <strong>{timeline.scionOrigin.sowing.seed_source}</strong></div>
                      <div>Seeds Sown: <strong>{timeline.scionOrigin.sowing.seeds_sown}</strong></div>
                      <div>Germination Rate: <strong className="text-teal-600">{timeline.scionOrigin.germinationRate}%</strong></div>
                      <div>Viable Seedlings: <strong>{timeline.scionOrigin.remainingViable}</strong></div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200 text-xs text-stone-400">
                    No Scion parent lineage linked.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TraceabilityPage;
