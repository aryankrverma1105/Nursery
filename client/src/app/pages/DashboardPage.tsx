import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import StatusBadge from '../components/StatusBadge';
import {
  Sprout,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  ArrowRight,
  TrendingUp,
  Package,
  ShieldAlert,
  Search,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [quickCode, setQuickCode] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const res = await api.get('/reports/dashboard');
      return res.data;
    },
  });

  const handleTraceLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickCode.trim()) {
      navigate(`/app/trace?code=${encodeURIComponent(quickCode.trim().toUpperCase())}`);
    }
  };

  const liveCounts = data?.liveCounts || [];
  const lowStock = data?.lowStockAlerts || [];
  const quarantined = data?.quarantinedBatches || [];
  const salesMetrics = data?.salesMetrics || { totalRevenue: 0, totalOrders: 0 };

  const totalLivePlants = liveCounts.reduce(
    (sum: number, item: any) => sum + parseInt(item.total_quantity || '0', 10),
    0
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Welcome Banner */}
      <div className="bg-brand-900 text-white p-6 sm:p-8 rounded-3xl shadow-lg border border-brand-800 space-y-2">
        <div className="text-xs uppercase font-bold tracking-wider text-brand-300">
          Horticulture Operations Desk
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold">
          Namaste, {user?.fullName}!
        </h1>
        <p className="text-sm text-stone-300">
          {user?.role === 'ADMIN'
            ? 'Complete nursery oversight, CMS publishing & inventory audit.'
            : user?.role === 'SUPERVISOR'
            ? 'Batch scheduling, grafting supervisions, and commercial dispatches.'
            : 'Field record logging: sowing, grafting, and plant mortality checks.'}
        </p>
      </div>

      {/* QUICK ENTRY: FIND BY CODE (Traceability shortcut) */}
      <form
        onSubmit={handleTraceLookup}
        className="bg-white dark:bg-stone-900 p-4 rounded-2xl border-2 border-brand-500 shadow-md flex items-center gap-3"
      >
        <QrCode className="w-6 h-6 text-brand-700 dark:text-brand-400 shrink-0" />
        <input
          type="text"
          value={quickCode}
          onChange={(e) => setQuickCode(e.target.value)}
          placeholder="Find Batch by Serial / Code (e.g. GR-2026-00001)..."
          className="flex-1 bg-transparent text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 placeholder:font-normal placeholder:text-stone-400 focus:outline-none uppercase"
        />
        <button
          type="submit"
          className="bg-brand-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm uppercase tracking-wider shrink-0 active:scale-95 shadow"
        >
          Trace
        </button>
      </form>

      {/* ALERTS (Quarantine & Low Stock) */}
      {quarantined.length > 0 && (
        <div className="bg-rose-100 dark:bg-rose-950/80 border-2 border-rose-300 dark:border-rose-800 p-4 rounded-2xl text-rose-900 dark:text-rose-200 flex items-start gap-3">
          <ShieldAlert className="w-6 h-6 text-rose-700 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <div className="font-bold">
              ATTENTION: {quarantined.length} Batch(es) Quarantined!
            </div>
            <div className="text-xs">
              Sale and dispatch are blocked for: {quarantined.map((b: any) => b.serial_number).join(', ')}.
            </div>
            <Link to="/app/trace" className="text-xs font-bold underline block mt-1">
              Review affected batches in Traceability
            </Link>
          </div>
        </div>
      )}

      {lowStock.length > 0 && (
        <div className="bg-amber-100 dark:bg-amber-950/80 border-2 border-amber-300 dark:border-amber-800 p-4 rounded-2xl text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <div className="font-bold">Low Stock Alert ({lowStock.length} cultivars)</div>
            <div className="text-xs">
              Less than 25 ready units remaining for:{' '}
              {lowStock.map((b: any) => `${b.plant_variety} (${b.current_quantity} left)`).join(', ')}.
            </div>
          </div>
        </div>
      )}

      {/* 3-4 BIG ACTION BUTTONS (Designed for Low-Literacy / Fast Tap) */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">
          Fast Data-Entry Actions
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Link
            to="/app/wizard/sowing"
            className="min-h-[96px] bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-850 p-4 rounded-3xl border-2 border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-base text-stone-900 dark:text-stone-100">Record Sowing</div>
              <div className="text-xs text-stone-500">New rootstocks</div>
            </div>
          </Link>

          <Link
            to="/app/wizard/grafting"
            className="min-h-[96px] bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-850 p-4 rounded-3xl border-2 border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold">
              <GitBranch className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-base text-stone-900 dark:text-stone-100">Record Grafting</div>
              <div className="text-xs text-stone-500">Union take log</div>
            </div>
          </Link>

          <Link
            to="/app/wizard/mortality"
            className="min-h-[96px] bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-850 p-4 rounded-3xl border-2 border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-base text-stone-900 dark:text-stone-100">Log Losses</div>
              <div className="text-xs text-stone-500">Curing mortality</div>
            </div>
          </Link>

          <Link
            to="/app/wizard/sale"
            className="min-h-[96px] bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-850 p-4 rounded-3xl border-2 border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-base text-stone-900 dark:text-stone-100">Record Sale</div>
              <div className="text-xs text-stone-500">Invoice creation</div>
            </div>
          </Link>
        </div>
      </div>

      {/* NUMBERS & SUMMARY CARDS */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">
          Live Nursery Balance (Ledger-Verified)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
            <div className="text-xs text-stone-500 font-semibold uppercase">Total Plants</div>
            <div className="text-2xl font-bold font-serif text-brand-900 dark:text-brand-300 mt-1">
              {totalLivePlants}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">Across all beds</div>
          </div>

          <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
            <div className="text-xs text-stone-500 font-semibold uppercase">Ready for Sale</div>
            <div className="text-2xl font-bold font-serif text-emerald-700 dark:text-emerald-400 mt-1">
              {liveCounts.find((c: any) => c.batch_type === 'READY_FOR_SALE')?.total_quantity || 0}
            </div>
            <div className="text-[10px] text-emerald-600 mt-0.5">Saleable stock</div>
          </div>

          <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
            <div className="text-xs text-stone-500 font-semibold uppercase">In Curing (21d)</div>
            <div className="text-2xl font-bold font-serif text-amber-700 dark:text-amber-400 mt-1">
              {liveCounts.find((c: any) => c.batch_type === 'GRAFTED')?.total_quantity || 0}
            </div>
            <div className="text-[10px] text-amber-600 mt-0.5">Acclimatizing</div>
          </div>

          <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
            <div className="text-xs text-stone-500 font-semibold uppercase">Total Revenue</div>
            <div className="text-2xl font-bold font-serif text-stone-900 dark:text-stone-100 mt-1">
              ₹{salesMetrics.totalRevenue.toFixed(0)}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">{salesMetrics.totalOrders} Invoices</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

