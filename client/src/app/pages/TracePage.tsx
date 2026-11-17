import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  QrCode,
  GitBranch,
  ShieldAlert,
  Printer,
  Trees,
  CheckCircle2,
  Calendar,
  User,
  AlertTriangle,
  ArrowRight,
  Package,
} from 'lucide-react';

export const TracePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  const [inputCode, setInputCode] = useState(initialCode);
  const [searchCode, setSearchCode] = useState(initialCode);

  const { user } = useAuth();
  const isSupervisor = user?.role === 'SUPERVISOR' || user?.role === 'ADMIN';

  // Quarantine modal states
  const [quarantineOpen, setQuarantineOpen] = useState(false);
  const [quarantineReason, setQuarantineReason] = useState('');
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [releaseReason, setReleaseReason] = useState('');

  // Printable tag state
  const [labelData, setLabelData] = useState<any | null>(null);

  useEffect(() => {
    if (initialCode) {
      setInputCode(initialCode);
      setSearchCode(initialCode);
    }
  }, [initialCode]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['trace-lookup', searchCode],
    queryFn: async () => {
      if (!searchCode.trim()) return null;
      const res = await api.get(`/trace/${encodeURIComponent(searchCode.trim().toUpperCase())}`);
      return res.data;
    },
    enabled: Boolean(searchCode.trim()),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim()) {
      setSearchCode(inputCode.trim().toUpperCase());
      setSearchParams({ code: inputCode.trim().toUpperCase() });
    }
  };

  const handleQuarantine = async () => {
    if (!quarantineReason.trim()) return;
    try {
      await api.post('/trace/quarantine', {
        batch_id: data.batch.id,
        reason: quarantineReason,
      });
      setQuarantineOpen(false);
      setQuarantineReason('');
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to quarantine batch.');
    }
  };

  const handleRelease = async () => {
    if (!releaseReason.trim()) return;
    try {
      await api.post('/trace/release', {
        batch_id: data.batch.id,
        reason: releaseReason,
      });
      setReleaseOpen(false);
      setReleaseReason('');
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to release quarantine.');
    }
  };

  const handlePrintTag = async () => {
    try {
      const res = await api.get(`/trace/label/${data.batch.serial_number}`);
      setLabelData(res.data.label);
    } catch {
      alert('Failed to generate printable label.');
    }
  };

  const batch = data?.batch;
  const parents = data?.parents || [];
  const children = data?.children || [];
  const grafting = data?.graftingRecord;
  const sowing = data?.sowingRecord;
  const scion = data?.scionRecord;
  const sales = data?.salesItems || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
          Pedigree & Traceability Lookup
        </h1>
        <p className="text-xs text-stone-500">
          Enter any serial identifier to inspect full botanical lineage, donor mother trees, and descendants.
        </p>
      </div>

      {/* Code Search Input */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <QrCode className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="Enter batch serial (e.g. GR-2026-00001, RS-2026-00001)..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-bold uppercase text-sm sm:text-base focus:border-brand-600 shadow-sm"
          />
        </div>
        <button
          type="submit"
          className="bg-brand-800 hover:bg-brand-900 text-white font-bold px-6 py-3 rounded-2xl text-sm uppercase tracking-wider shrink-0 shadow-md active:scale-95"
        >
          Trace
        </button>
      </form>

      {/* Lookup Content */}
      {isLoading ? (
        <div className="py-20 text-center text-stone-500">Resolving pedigree lineage...</div>
      ) : error ? (
        <div className="p-6 bg-rose-50 dark:bg-rose-950/60 rounded-3xl border-2 border-rose-200 dark:border-rose-800 text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
          <div className="font-bold text-rose-900 dark:text-rose-200">Identifier Not Found</div>
          <p className="text-xs text-rose-700 dark:text-rose-300">
            No active or historical nursery record matches "{searchCode}".
          </p>
        </div>
      ) : batch ? (
        <div className="space-y-6">
          {/* Main Batch Overview Card */}
          <div
            className={`p-6 rounded-3xl bg-white dark:bg-stone-900 border-2 shadow-sm space-y-4 ${
              batch.status === 'QUARANTINED'
                ? 'border-rose-400 bg-rose-50/20'
                : 'border-stone-200 dark:border-stone-800'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xl font-bold bg-stone-100 dark:bg-stone-800 px-3 py-1 rounded-lg">
                    {batch.serial_number}
                  </span>
                  <StatusBadge status={batch.status} size="md" />
                </div>
                <h2 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100 mt-2">
                  {batch.plant_variety}
                </h2>
                <div className="text-xs text-stone-500 mt-1">
                  Type: <strong>{batch.batch_type}</strong> • Location: <strong>{batch.location || 'N/A'}</strong>
                </div>
              </div>

              {/* Actions: Printable Label & Quarantine */}
              <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
                <button
                  onClick={handlePrintTag}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-bold border border-stone-300 dark:border-stone-700 active:scale-95 shadow-xs"
                >
                  <Printer className="w-4 h-4 text-brand-600" />
                  <span>Print Batch Tag</span>
                </button>

                {isSupervisor && (
                  batch.status === 'QUARANTINED' ? (
                    <button
                      onClick={() => setReleaseOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold shadow active:scale-95"
                    >
                      Release Quarantine
                    </button>
                  ) : (
                    <button
                      onClick={() => setQuarantineOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-rose-700 text-white text-xs font-bold shadow active:scale-95"
                    >
                      Quarantine Batch
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Quarantine alert if active */}
            {batch.status === 'QUARANTINED' && (
              <div className="p-3 bg-rose-100 dark:bg-rose-950/80 rounded-xl text-rose-900 dark:text-rose-200 text-xs font-bold border border-rose-300 dark:border-rose-800">
                ⚠️ THIS BATCH IS UNDER QUARANTINE: {batch.quarantine_reason}
              </div>
            )}

            {/* Live Count */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 border-t border-stone-100 dark:border-stone-800 text-sm">
              <div>
                <span className="text-xs text-stone-400 block uppercase font-bold">Current Live Balance</span>
                <span className="text-2xl font-bold font-serif text-brand-900 dark:text-brand-300">
                  {batch.current_quantity} plants
                </span>
              </div>
              <div>
                <span className="text-xs text-stone-400 block uppercase font-bold">Initial Batch Size</span>
                <span className="text-lg font-bold text-stone-700 dark:text-stone-300">
                  {batch.initial_quantity} plants
                </span>
              </div>
              <div>
                <span className="text-xs text-stone-400 block uppercase font-bold">Date Issued</span>
                <span className="text-sm font-medium text-stone-600 dark:text-stone-400">
                  {new Date(batch.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* PARENT LINEAGE (ASCENDANTS) */}
          <div className="space-y-3">
            <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-brand-600" />
              <span>Direct Parent Batches (Lineage)</span>
            </h3>

            {parents.length === 0 ? (
              <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 text-xs text-stone-500">
                Foundational batch (sown directly from certified seed lot or wild selection).
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {parents.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setInputCode(p.serial_number);
                      setSearchCode(p.serial_number);
                      setSearchParams({ code: p.serial_number });
                    }}
                    className="p-4 rounded-2xl bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-800 hover:border-brand-500 text-left transition-all active:scale-[0.99] shadow-xs"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-brand-600 mb-1">
                      {p.relationship_type.replace('_', ' ')}
                    </div>
                    <div className="font-mono font-bold text-sm text-stone-900 dark:text-stone-100">
                      {p.serial_number}
                    </div>
                    <div className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                      {p.plant_variety}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* AGRONOMY ORIGIN: Mother Tree & Technician details */}
          {(grafting || scion || sowing) && (
            <div className="p-6 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 space-y-4">
              <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Trees className="w-5 h-5 text-emerald-600" />
                <span>Agronomic Verification Details</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {grafting && (
                  <div className="p-3 bg-stone-50 dark:bg-stone-850 rounded-xl space-y-1">
                    <div className="font-bold text-stone-700 dark:text-stone-300">Grafting Record</div>
                    <div>Technician: <strong>{grafting.technician_name}</strong></div>
                    <div>Graft Date: <strong>{grafting.grafting_date}</strong></div>
                    <div>Curing Duration: <strong>{grafting.curing_days} days</strong></div>
                  </div>
                )}

                {sowing && (
                  <div className="p-3 bg-stone-50 dark:bg-stone-850 rounded-xl space-y-1">
                    <div className="font-bold text-stone-700 dark:text-stone-300">Seed Lot Origin</div>
                    <div>Seed Lot Code: <strong>{sowing.lot_code}</strong></div>
                    <div>Supplier: <strong>{sowing.supplier_name || 'Certified Farm'}</strong></div>
                    <div>Tested Germination: <strong>{sowing.germination_percent || 95}%</strong></div>
                  </div>
                )}

                {scion && (
                  <div className="p-3 bg-stone-50 dark:bg-stone-850 rounded-xl space-y-1">
                    <div className="font-bold text-stone-700 dark:text-stone-300">Mother Tree Donor</div>
                    <div>Tree ID: <strong>{scion.tree_code}</strong></div>
                    <div>Location: <strong>{scion.location_block}</strong></div>
                    <div>Tree Age: <strong>{scion.age_years} years</strong></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DESCENDANTS & SALES (DOWNSTREAM) */}
          <div className="space-y-3">
            <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              <span>Downstream Descendants & Dispatches</span>
            </h3>

            {children.length === 0 && sales.length === 0 ? (
              <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 text-xs text-stone-500">
                No downstream splits or commercial sales logged from this batch yet.
              </div>
            ) : (
              <div className="space-y-2">
                {children.map((ch: any) => (
                  <div
                    key={ch.id}
                    className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold">{ch.serial_number}</span> •{' '}
                      <span className="text-stone-500">{ch.batch_type}</span>
                    </div>
                    <button
                      onClick={() => {
                        setInputCode(ch.serial_number);
                        setSearchCode(ch.serial_number);
                        setSearchParams({ code: ch.serial_number });
                      }}
                      className="font-bold text-brand-700 underline"
                    >
                      Inspect Child
                    </button>
                  </div>
                ))}

                {sales.map((s: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 flex items-center justify-between text-xs"
                  >
                    <div>
                      Invoice <strong className="font-mono">{s.invoice_number}</strong> • Buyer:{' '}
                      <strong>{s.customer_name}</strong>
                    </div>
                    <div className="font-bold text-blue-800 dark:text-blue-300">
                      {s.quantity} plants sold
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Quarantine Confirmation Modal */}
      {quarantineOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 max-w-md w-full rounded-3xl p-6 border-2 border-rose-500 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-700">
              <ShieldAlert className="w-8 h-8" />
              <h3 className="font-serif text-xl font-bold">Quarantine Batch</h3>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              Quarantining batch <strong>{batch?.serial_number}</strong> will automatically block sales of all its descendant batches and remove linked products from public catalogue availability.
            </p>
            <div>
              <label className="block text-xs font-bold mb-1">Reason for Quarantine *</label>
              <textarea
                required
                rows={3}
                value={quarantineReason}
                onChange={(e) => setQuarantineReason(e.target.value)}
                placeholder="e.g. Suspected fungal rot or mosaic virus symptoms..."
                className="w-full p-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-xs"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setQuarantineOpen(false)}
                className="px-4 py-2 text-xs font-bold text-stone-500"
              >
                Cancel
              </button>
              <button
                onClick={handleQuarantine}
                className="px-5 py-2.5 rounded-xl bg-rose-700 text-white text-xs font-bold shadow active:scale-95"
              >
                Confirm Quarantine
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Release Quarantine Modal */}
      {releaseOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 max-w-md w-full rounded-3xl p-6 border-2 border-emerald-500 shadow-2xl space-y-4">
            <h3 className="font-serif text-xl font-bold text-emerald-800 dark:text-emerald-300">
              Release from Quarantine
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              Provide justification for releasing batch <strong>{batch?.serial_number}</strong> back to active status.
            </p>
            <div>
              <label className="block text-xs font-bold mb-1">Release Justification *</label>
              <textarea
                required
                rows={3}
                value={releaseReason}
                onChange={(e) => setReleaseReason(e.target.value)}
                placeholder="e.g. Pathology lab tested negative, cleared for dispatch..."
                className="w-full p-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-xs"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setReleaseOpen(false)}
                className="px-4 py-2 text-xs font-bold text-stone-500"
              >
                Cancel
              </button>
              <button
                onClick={handleRelease}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold shadow active:scale-95"
              >
                Confirm Release
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Tag Modal */}
      {labelData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 max-w-md w-full rounded-3xl p-6 border border-stone-200 dark:border-stone-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold">Printable Nursery Tag</h3>
              <button onClick={() => setLabelData(null)} className="text-stone-400 font-bold">✕</button>
            </div>

            <div
              className="bg-white p-4 rounded-xl border-2 border-dashed border-stone-300 text-stone-900"
              dangerouslySetInnerHTML={{ __html: labelData.printableHtml }}
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setLabelData(null)}
                className="px-4 py-2 text-xs font-bold text-stone-500"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const printWin = window.open('', '_blank', 'width=450,height=600');
                  if (printWin && labelData) {
                    printWin.document.write(`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <title>Print Label</title>
                          <style>
                            body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #fff; }
                            @media print { body { display: block; margin: 0; } .no-print { display: none !important; } }
                          </style>
                        </head>
                        <body>
                          <div class="no-print" style="position: fixed; top: 10px; right: 10px;">
                            <button onclick="window.print()" style="padding: 8px 16px; background: #244930; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">Print Label</button>
                          </div>
                          <div>${labelData.printableHtml}</div>
                          <script>
                            window.onload = function() {
                              setTimeout(function() { window.print(); }, 300);
                            };
                          </script>
                        </body>
                      </html>
                    `);
                    printWin.document.close();
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-brand-800 text-white text-xs font-bold shadow active:scale-95 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Label</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TracePage;

