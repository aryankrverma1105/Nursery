import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Download,
  Printer,
  TrendingUp,
  Sprout,
  Activity,
  Scissors,
  HeartPulse,
  CheckCircle2,
  ShoppingBag,
  RefreshCw,
  BarChart2
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      const [metricsRes, ordersRes] = await Promise.all([
        axios.get('/api/inventory/dashboard-metrics'),
        axios.get('/api/sales/orders'),
      ]);
      setMetrics(metricsRes.data.metrics);
      setOrders(ordersRes.data.orders || []);
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  const totalRevenue = orders.reduce((sum, ord) => sum + (ord.total_amount || 0), 0);
  const totalDiscount = orders.reduce((sum, ord) => sum + (ord.discount || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-bold uppercase tracking-wider mb-2">
            <FileText className="w-3.5 h-3.5" />
            Phase 10: Farm Operations Reports
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100">
            Horticultural Yield & Sales Reports
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Aggregated lifecycle data: Sowing viability, grafting success ratios, inventory balances, and commercial sales breakdown.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 text-stone-700 dark:text-stone-200 text-xs font-bold transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
          <a
            href="/api/reports/export?type=inventory"
            download
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-800 hover:bg-brand-900 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-xs font-bold text-stone-500 uppercase">Seeds Sown Volume</div>
          <div className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mt-1">
            {metrics?.totalSeedsSown ?? 0}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">
            {metrics?.totalGerminated ?? 0} germinated sprouts
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-xs font-bold text-stone-500 uppercase">Grafting Operations</div>
          <div className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mt-1">
            {metrics?.totalGraftsAttempted ?? 0}
          </div>
          <div className="text-[11px] text-amber-600 font-semibold mt-1">
            {metrics?.curingSurvivalRate ?? 0}% survival rate
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-xs font-bold text-stone-500 uppercase">Ready-for-Sale Stock</div>
          <div className="text-2xl font-serif font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {metrics?.readyForSalePlants ?? 0}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Active inventory on hand</div>
        </div>

        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-xs font-bold text-stone-500 uppercase">Total Sales Revenue</div>
          <div className="text-2xl font-serif font-bold text-purple-700 dark:text-purple-300 mt-1">
            ₹{totalRevenue.toLocaleString()}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Across {orders.length} tax invoice(s)</div>
        </div>
      </div>

      {/* PIPELINE BREAKDOWN TABLE */}
      <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-brand-600" />
          Lifecycle Stage Distribution
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-400 uppercase">
                <th className="py-3 px-3">Workflow Phase</th>
                <th className="py-3 px-3">Key Activity</th>
                <th className="py-3 px-3">Active Batches</th>
                <th className="py-3 px-3 text-right">Batch Conversion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              <tr>
                <td className="py-3.5 px-3 font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <Sprout className="w-4 h-4" />
                  1. Sowing Phase
                </td>
                <td className="py-3.5 px-3 text-stone-600 dark:text-stone-300">
                  Dual Origin: Rootstock & Scion seed trays
                </td>
                <td className="py-3.5 px-3 font-bold">{metrics?.stageCounts?.sown ?? 0} batches</td>
                <td className="py-3.5 px-3 text-right font-serif font-bold text-emerald-600">100% Seed Origin</td>
              </tr>

              <tr>
                <td className="py-3.5 px-3 font-bold text-teal-700 dark:text-teal-300 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  2. Germination Phase
                </td>
                <td className="py-3.5 px-3 text-stone-600 dark:text-stone-300">
                  Viable sprout observations & loss culling
                </td>
                <td className="py-3.5 px-3 font-bold">{metrics?.stageCounts?.germinated ?? 0} batches</td>
                <td className="py-3.5 px-3 text-right font-serif font-bold text-teal-600">
                  {metrics?.totalSeedsSown > 0
                    ? ((metrics.totalGerminated / metrics.totalSeedsSown) * 100).toFixed(1)
                    : 0}
                  % Germination
                </td>
              </tr>

              <tr>
                <td className="py-3.5 px-3 font-bold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                  <Scissors className="w-4 h-4" />
                  3. Grafting Run
                </td>
                <td className="py-3.5 px-3 text-stone-600 dark:text-stone-300">
                  Wedge / Cleft graft union of Rootstock + Scion
                </td>
                <td className="py-3.5 px-3 font-bold">{metrics?.stageCounts?.grafted ?? 0} batches</td>
                <td className="py-3.5 px-3 text-right font-serif font-bold text-amber-600">
                  {metrics?.totalGraftsAttempted ?? 0} Attempted
                </td>
              </tr>

              <tr>
                <td className="py-3.5 px-3 font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                  <HeartPulse className="w-4 h-4" />
                  4. Curing & Acclimatization
                </td>
                <td className="py-3.5 px-3 text-stone-600 dark:text-stone-300">
                  Chamber healing & progressive callus formation
                </td>
                <td className="py-3.5 px-3 font-bold">{metrics?.stageCounts?.curing ?? 0} batches</td>
                <td className="py-3.5 px-3 text-right font-serif font-bold text-indigo-600">
                  {metrics?.curingSurvivalRate ?? 0}% Survival
                </td>
              </tr>

              <tr>
                <td className="py-3.5 px-3 font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  5. Ready for Sale
                </td>
                <td className="py-3.5 px-3 text-stone-600 dark:text-stone-300">
                  Retail canopy & dispatch inventory
                </td>
                <td className="py-3.5 px-3 font-bold">{metrics?.stageCounts?.readyForSale ?? 0} batches</td>
                <td className="py-3.5 px-3 text-right font-serif font-bold text-blue-600">
                  {metrics?.readyForSalePlants ?? 0} Available
                </td>
              </tr>

              <tr>
                <td className="py-3.5 px-3 font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  6. Commercial Sales
                </td>
                <td className="py-3.5 px-3 text-stone-600 dark:text-stone-300">
                  Farmer orchard deliveries with tax invoicing
                </td>
                <td className="py-3.5 px-3 font-bold">{metrics?.totalPlantsSold ?? 0} plants sold</td>
                <td className="py-3.5 px-3 text-right font-serif font-bold text-purple-600">
                  ₹{totalRevenue.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
