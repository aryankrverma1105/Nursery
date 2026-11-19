import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  Plus,
  ShoppingBag,
  Calendar,
  MapPin,
  CheckCircle,
  AlertCircle,
  X,
  ArrowRight,
  TrendingUp,
  Tag
} from 'lucide-react';

interface ReadyBatch {
  id: number;
  serial_number: string;
  plant_variety: string;
  initial_quantity: number;
  current_quantity: number;
  status: string;
  stage: string;
  location: string;
  created_at: string;
  promotion_date?: string;
  grafted_batch_id?: number;
  graft_serial?: string;
  total_sold?: number;
}

interface CuringBatchEligible {
  id: number;
  serial_number: string;
  plant_variety: string;
  current_quantity: number;
  status: string;
}

export const ReadyForSalePage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const promoteParamId = searchParams.get('promoteBatchId');

  const [batches, setBatches] = useState<ReadyBatch[]>([]);
  const [curingBatches, setCuringBatches] = useState<CuringBatchEligible[]>([]);
  const [loading, setLoading] = useState(true);

  // Promotion Modal
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedGraftId, setSelectedGraftId] = useState<number | ''>('');
  const [promoteQty, setPromoteQty] = useState<number>(50);
  const [promoDate, setPromoDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [promoLocation, setPromoLocation] = useState('Retail Sales Yard - Canopy 1');
  const [promoNotes, setPromoNotes] = useState('Vigorous graft unions approved for sale');

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; batch?: any } | null>(null);

  const fetchReadyBatches = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/ready-for-sale');
      const list = res.data.readyBatches || res.data.batches || [];
      setBatches(list);
    } catch (err) {
      console.error('Failed to load ready for sale batches:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCuringEligible = async () => {
    try {
      const res = await api.get('/inventory/curing');
      const eligible = (res.data.batches || [])
        .filter((b: any) => b.surviving_plants > 0 || b.current_quantity > 0)
        .map((b: any) => ({
          id: b.id,
          serial_number: b.serial_number,
          plant_variety: b.plant_variety,
          current_quantity: b.surviving_plants || b.current_quantity,
          status: b.status,
        }));
      setCuringBatches(eligible);

      if (promoteParamId) {
        const match = eligible.find((b: any) => String(b.id) === promoteParamId);
        if (match) {
          setSelectedGraftId(match.id);
          setPromoteQty(match.current_quantity);
          setShowPromoteModal(true);
        }
      } else if (eligible.length > 0 && !selectedGraftId) {
        setSelectedGraftId(eligible[0].id);
        setPromoteQty(eligible[0].current_quantity);
      }
    } catch (err) {
      console.error('Failed to load curing eligible batches:', err);
    }
  };

  useEffect(() => {
    fetchReadyBatches();
    fetchCuringEligible();
  }, []);

  const selectedCuring = curingBatches.find((c) => c.id === selectedGraftId);

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGraftId) return;

    if (promoteQty <= 0) {
      setFeedback({ type: 'error', message: 'Quantity to promote must be greater than zero.' });
      return;
    }

    if (selectedCuring && promoteQty > selectedCuring.current_quantity) {
      setFeedback({
        type: 'error',
        message: `Quantity (${promoteQty}) exceeds surviving graft balance (${selectedCuring.current_quantity}).`,
      });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      const res = await api.post('/inventory/ready-for-sale/promote', {
        grafted_batch_id: Number(selectedGraftId),
        quantity: Number(promoteQty),
        promotion_date: promoDate,
        location: promoLocation,
        notes: promoNotes,
      });

      const newBatch = res.data.batch;
      setFeedback({
        type: 'success',
        message: `Promotion successful! Batch ${newBatch.serial_number} created with ${promoteQty} saleable plants.`,
        batch: newBatch,
      });

      fetchReadyBatches();
      fetchCuringEligible();
      setTimeout(() => setShowPromoteModal(false), 1200);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to promote batch.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Phase F: Ready for Sale Inventory
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100">
            Saleable Plant Inventory
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Approved cured grafts promoted into ready sale inventory (RFS-YYYY-XXXX). Derived stock availability for retail and commercial buyers.
          </p>
        </div>

        <button
          onClick={() => {
            setShowPromoteModal(true);
            setFeedback(null);
          }}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Promote from Curing</span>
        </button>
      </div>

      {/* FEEDBACK ALERT */}
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

      {/* BATCHES LIST */}
      {loading ? (
        <div className="p-12 text-center text-stone-400">Loading ready for sale batches...</div>
      ) : batches.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 text-stone-500 text-sm">
          No ready for sale batches yet. Click "Promote from Curing" above to approve your first cured graft batch for sale.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {batches.map((b) => {
            const isSoldOut = b.current_quantity === 0 || b.status === 'SOLD_OUT';
            return (
              <div
                key={b.id}
                className={`bg-white dark:bg-stone-900 p-6 rounded-3xl border-2 shadow-sm flex flex-col justify-between hover:shadow-md transition-all ${
                  isSoldOut
                    ? 'border-stone-200 dark:border-stone-800 opacity-70'
                    : 'border-blue-300 dark:border-blue-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                        isSoldOut
                          ? 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                          : 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200'
                      }`}
                    >
                      {isSoldOut ? 'SOLD OUT' : 'READY FOR SALE'}
                    </span>
                    <span className="text-xs sm:text-sm font-bold font-mono text-stone-500 dark:text-stone-400">
                      {b.promotion_date || new Date(b.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="font-mono text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100">
                    {b.serial_number}
                  </div>
                  <div className="text-base sm:text-lg font-black text-stone-800 dark:text-stone-200 mt-1">
                    {b.plant_variety}
                  </div>

                  {b.graft_serial && (
                    <div className="mt-2 text-xs sm:text-sm text-stone-600 dark:text-stone-400 font-mono">
                      Promoted from Graft: <strong>{b.graft_serial}</strong>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                    <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-800">
                      <div className="text-stone-500 dark:text-stone-400 text-xs uppercase font-black tracking-wider">Initial Ready</div>
                      <div className="text-lg sm:text-xl font-black text-stone-800 dark:text-stone-200 mt-1">
                        {b.initial_quantity}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                      <div className="text-blue-900 dark:text-blue-300 text-xs uppercase font-black tracking-wider">
                        Available Stock
                      </div>
                      <div className="text-xl sm:text-2xl font-black font-sans text-blue-700 dark:text-blue-300 mt-1">
                        {b.current_quantity} plants
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 text-xs sm:text-sm text-stone-600 dark:text-stone-400 truncate flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-stone-400 flex-shrink-0" />
                    <span className="font-semibold">{b.location || 'Retail Sales Yard'}</span>
                  </div>
                </div>

                {/* Sell Action */}
                <div className="pt-4 mt-4 border-t border-stone-200 dark:border-stone-800">
                  {!isSoldOut ? (
                    <Link
                      to={`/app/selling?batchId=${b.id}`}
                      className="w-full py-3.5 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-md transition-all"
                    >
                      <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
                      <span>Record Plant Sale</span>
                    </Link>
                  ) : (
                    <div className="text-center py-2.5 text-xs sm:text-sm font-bold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-850 rounded-2xl">
                      All units sold out
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: PROMOTE FROM CURING */}
      {showPromoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Promote Cured Grafts
                </span>
                <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                  Move To Ready for Sale
                </h3>
              </div>
              <button
                onClick={() => setShowPromoteModal(false)}
                className="p-2 rounded-xl text-stone-400 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePromote} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase mb-1">
                  Select Grafted Batch (from Curing) *
                </label>
                <select
                  value={selectedGraftId}
                  onChange={(e) => {
                    const id = Number(e.target.value) || '';
                    setSelectedGraftId(id);
                    const match = curingBatches.find((c) => c.id === id);
                    if (match) setPromoteQty(match.current_quantity);
                  }}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-sm font-semibold outline-none"
                >
                  <option value="">-- Choose Cured Graft Batch --</option>
                  {curingBatches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.serial_number} — {c.plant_variety} (Surviving: {c.current_quantity})
                    </option>
                  ))}
                </select>
              </div>

              {selectedCuring && (
                <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs">
                  <span className="text-stone-500">Surviving Cured Balance: </span>
                  <strong className="text-blue-700 dark:text-blue-300 font-bold ml-1">
                    {selectedCuring.current_quantity} plants
                  </strong>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase mb-1">
                    Quantity to Promote *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedCuring?.current_quantity || 9999}
                    value={promoteQty}
                    onChange={(e) => setPromoteQty(parseInt(e.target.value) || 0)}
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-blue-600 font-bold text-base outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase mb-1">
                    Promotion Date *
                  </label>
                  <input
                    type="date"
                    value={promoDate}
                    onChange={(e) => setPromoDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase mb-1">
                  Sales Yard Location
                </label>
                <input
                  type="text"
                  value={promoLocation}
                  onChange={(e) => setPromoLocation(e.target.value)}
                  placeholder="e.g. Retail Canopy Zone 1"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={promoNotes}
                  onChange={(e) => setPromoNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-sm outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPromoteModal(false)}
                  className="px-4 py-2.5 rounded-xl border text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedGraftId}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  {submitting ? 'Promoting...' : 'Confirm Promotion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadyForSalePage;

