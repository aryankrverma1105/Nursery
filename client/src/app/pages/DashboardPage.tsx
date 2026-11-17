import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  Sprout,
  Activity,
  Layers,
  Scissors,
  HeartPulse,
  ShoppingBag,
  TrendingUp,
  ArrowRight,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText
} from 'lucide-react';

interface DashboardMetrics {
  totalSeedsSown: number;
  totalGerminated: number;
  rootstockAvailable: number;
  scionAvailable: number;
  totalGraftsAttempted: number;
  plantsInCuring: number;
  curingSurvivalRate: number;
  readyForSalePlants: number;
  totalPlantsSold: number;
  stageCounts: {
    sown: number;
    germinated: number;
    growing: number;
    grafted: number;
    curing: number;
    readyForSale: number;
    sold: number;
  };
}

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('/api/inventory/dashboard-metrics');
      setMetrics(res.data.metrics);
    } catch (err: any) {
      console.error('Failed to load dashboard metrics:', err);
      setError('Could not load farm metrics. Showing cached figures.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const pipelineStages = [
    { id: 'sowing', label: '1. Sowing', count: metrics?.stageCounts?.sown ?? 0, path: '/app/sowing', icon: Sprout, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800' },
    { id: 'germination', label: '2. Germination', count: metrics?.stageCounts?.germinated ?? 0, path: '/app/germination', icon: Activity, color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-800' },
    { id: 'growth', label: '3. Plant Growth', count: metrics?.stageCounts?.growing ?? 0, path: '/app/plant-growth', icon: Layers, color: 'text-lime-500 bg-lime-50 dark:bg-lime-950/40 border-lime-300 dark:border-lime-800' },
    { id: 'grafting', label: '4. Grafting', count: metrics?.stageCounts?.grafted ?? 0, path: '/app/grafting', icon: Scissors, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800' },
    { id: 'curing', label: '5. Curing', count: metrics?.stageCounts?.curing ?? 0, path: '/app/curing', icon: HeartPulse, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800' },
    { id: 'ready', label: '6. Ready for Sale', count: metrics?.stageCounts?.readyForSale ?? 0, path: '/app/ready-for-sale', icon: CheckCircle2, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800' },
    { id: 'selling', label: '7. Selling', count: metrics?.stageCounts?.sold ?? 0, path: '/app/selling', icon: ShoppingBag, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-brand-900 via-brand-850 to-stone-900 text-white p-6 rounded-3xl shadow-lg border border-brand-800/40">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-800/80 text-brand-300 text-xs font-bold uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Farm Operations
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
            Nursery Workflow Hub
          </h1>
          <p className="text-stone-300 text-xs sm:text-sm mt-1">
            Complete lifecycle management: Sowing to Germination, Grafting, Curing & Plant Sales.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/app/sowing"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Sowing</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 7-STAGE WORKFLOW PIPELINE */}
      <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-600" />
              Farm Workflow Pipeline
            </h2>
            <p className="text-xs text-stone-500">Tap any stage to view live batches and execute actions</p>
          </div>
          <span className="text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950 px-3 py-1 rounded-full">
            7 Sequential Phases
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-2">
          {pipelineStages.map((st, idx) => {
            const Icon = st.icon;
            return (
              <Link
                key={st.id}
                to={st.path}
                className="group relative flex flex-col p-3.5 rounded-2xl border transition-all hover:shadow-md hover:-translate-y-0.5 bg-stone-50/60 dark:bg-stone-850/60 border-stone-200 dark:border-stone-800"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${st.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-stone-400">Step {idx + 1}</span>
                </div>
                <div className="font-bold text-xs text-stone-800 dark:text-stone-200 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  {st.label}
                </div>
                <div className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100 mt-1">
                  {loading ? '...' : st.count}
                  <span className="text-[10px] font-normal text-stone-400 ml-1">batches</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 9 CRITICAL SUMMARY METRICS CARDS */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
            Operational Summary Metrics
          </h2>
          <span className="text-xs text-stone-400">Live totals from farm ledger</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Total Seeds Sown */}
          <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-stone-500 uppercase">1. Total Seeds Sown</div>
              <div className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mt-1">
                {loading ? '...' : (metrics?.totalSeedsSown ?? 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-stone-400 mt-1">Across Rootstock & Scions</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <Sprout className="w-6 h-6" />
            </div>
          </div>

          {/* 2. Germinated Seedlings */}
          <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-stone-500 uppercase">2. Germinated Seedlings</div>
              <div className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mt-1">
                {loading ? '...' : (metrics?.totalGerminated ?? 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-stone-400 mt-1">Verified viable sprouts</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
          </div>

          {/* 3. Rootstock Available */}
          <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-stone-500 uppercase">3. Rootstock Available</div>
              <div className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mt-1">
                {loading ? '...' : (metrics?.rootstockAvailable ?? 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-stone-400 mt-1">Ready or active for grafting</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-lime-50 dark:bg-lime-950/60 text-lime-600 flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          {/* 4. Scions Available */}
          <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-stone-500 uppercase">4. Scions Available</div>
              <div className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mt-1">
                {loading ? '...' : (metrics?.scionAvailable ?? 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-stone-400 mt-1">Cultivar cuttings balance</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-950/60 text-green-600 flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          {/* 5. Total Grafts Attempted */}
          <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-stone-500 uppercase">5. Grafts Attempted</div>
              <div className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mt-1">
                {loading ? '...' : (metrics?.totalGraftsAttempted ?? 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-stone-400 mt-1">Total union operations</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <Scissors className="w-6 h-6" />
            </div>
          </div>

          {/* 6. Plants in Curing */}
          <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-stone-500 uppercase">6. Plants in Curing</div>
              <div className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mt-1">
                {loading ? '...' : (metrics?.plantsInCuring ?? 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-stone-400 mt-1">Chamber acclimatization</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
              <HeartPulse className="w-6 h-6" />
            </div>
          </div>

          {/* 7. Curing Survival Rate */}
          <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-stone-500 uppercase">7. Curing Survival Rate</div>
              <div className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mt-1">
                {loading ? '...' : `${metrics?.curingSurvivalRate ?? 0}%`}
              </div>
              <div className="text-[11px] text-stone-400 mt-1">Post-graft healing ratio</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          {/* 8. Ready for Sale Plants */}
          <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-stone-500 uppercase">8. Ready for Sale Plants</div>
              <div className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mt-1 text-emerald-600 dark:text-emerald-400">
                {loading ? '...' : (metrics?.readyForSalePlants ?? 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-stone-400 mt-1">Saleable stock on hand</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          {/* 9. Total Plants Sold */}
          <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-stone-500 uppercase">9. Total Plants Sold</div>
              <div className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mt-1 text-purple-600 dark:text-purple-400">
                {loading ? '...' : (metrics?.totalPlantsSold ?? 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-stone-400 mt-1">Fulfilled orders delivered</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* QUICK WORKFLOW LAUNCHERS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/app/sowing"
          className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-emerald-500 transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <span className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              <Sprout className="w-6 h-6" />
            </span>
            <ArrowRight className="w-5 h-5 text-stone-400 group-hover:translate-x-1 group-hover:text-emerald-500 transition-all" />
          </div>
          <h3 className="font-bold text-base mt-4 text-stone-900 dark:text-stone-100">Record Sowing</h3>
          <p className="text-xs text-stone-500 mt-1">Register Rootstock, Scion, or both with auto batch tags</p>
        </Link>

        <Link
          to="/app/grafting"
          className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-amber-500 transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <span className="p-3 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
              <Scissors className="w-6 h-6" />
            </span>
            <ArrowRight className="w-5 h-5 text-stone-400 group-hover:translate-x-1 group-hover:text-amber-500 transition-all" />
          </div>
          <h3 className="font-bold text-base mt-4 text-stone-900 dark:text-stone-100">Create Graft Run</h3>
          <p className="text-xs text-stone-500 mt-1">Link Rootstock + Scion with atomic deduction & lineage</p>
        </Link>

        <Link
          to="/app/selling"
          className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-purple-500 transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <span className="p-3 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
              <ShoppingBag className="w-6 h-6" />
            </span>
            <ArrowRight className="w-5 h-5 text-stone-400 group-hover:translate-x-1 group-hover:text-purple-500 transition-all" />
          </div>
          <h3 className="font-bold text-base mt-4 text-stone-900 dark:text-stone-100">Record Plant Sale</h3>
          <p className="text-xs text-stone-500 mt-1">Issue customer invoice with auto stock reduction</p>
        </Link>

        <Link
          to="/app/trace"
          className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-blue-500 transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <span className="p-3 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              <Search className="w-6 h-6" />
            </span>
            <ArrowRight className="w-5 h-5 text-stone-400 group-hover:translate-x-1 group-hover:text-blue-500 transition-all" />
          </div>
          <h3 className="font-bold text-base mt-4 text-stone-900 dark:text-stone-100">Trace Pedigree</h3>
          <p className="text-xs text-stone-500 mt-1">Backtrack sold plant to its exact Rootstock and Scion origin</p>
        </Link>
      </div>
    </div>
  );
};

export default DashboardPage;
