import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
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
  FileText,
  ListTodo,
  UserCog,
  Clock
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

interface TaskMetrics {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  urgent: number;
  myPending: number;
}

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [taskMetrics, setTaskMetrics] = useState<TaskMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const [invRes, taskRes] = await Promise.all([
        axios.get('/api/inventory/dashboard-metrics'),
        axios.get('/api/tasks/metrics').catch(() => ({ data: { metrics: null } }))
      ]);
      setMetrics(invRes.data.metrics);
      if (taskRes?.data?.metrics) {
        setTaskMetrics(taskRes.data.metrics);
      }
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
    { id: 'growth', label: '2. Plant Growth', count: metrics?.stageCounts?.growing ?? 0, path: '/app/plant-growth', icon: Layers, color: 'text-lime-500 bg-lime-50 dark:bg-lime-950/40 border-lime-300 dark:border-lime-800' },
    { id: 'grafting', label: '3. Grafting', count: metrics?.stageCounts?.grafted ?? 0, path: '/app/grafting', icon: Scissors, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800' },
    { id: 'curing', label: '4. Curing', count: metrics?.stageCounts?.curing ?? 0, path: '/app/curing', icon: HeartPulse, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800' },
    { id: 'ready', label: '5. Ready for Sale', count: metrics?.stageCounts?.readyForSale ?? 0, path: '/app/ready-for-sale', icon: CheckCircle2, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800' },
    { id: 'selling', label: '6. Selling', count: metrics?.stageCounts?.sold ?? 0, path: '/app/selling', icon: ShoppingBag, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-gradient-to-r from-brand-900 via-brand-850 to-stone-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-brand-800/40">
        <div>
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-brand-800/90 text-brand-200 text-xs sm:text-sm font-black uppercase tracking-wider mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Farm Operations
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Nursery Workflow Hub
          </h1>
          <p className="text-stone-200 text-sm sm:text-base lg:text-lg font-medium mt-2 max-w-2xl">
            Complete lifecycle management: Sowing to Plant Growth, Grafting, Curing &amp; Plant Sales.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 text-white text-sm sm:text-base font-bold transition-all shadow-sm"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/app/sowing"
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-sm sm:text-base font-black shadow-lg transition-all"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>+ New Sowing</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-sm font-bold flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 6-STAGE WORKFLOW PIPELINE */}
      <div className="bg-white dark:bg-stone-900 p-6 sm:p-7 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100 uppercase tracking-wide flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full bg-brand-600 dark:bg-brand-400" />
              Farm Workflow Pipeline
            </h2>
            <p className="text-sm sm:text-base font-semibold text-stone-600 dark:text-stone-400 mt-0.5">
              Tap any stage to view live batches and execute actions
            </p>
          </div>
          <span className="self-start sm:self-auto text-xs sm:text-sm font-black text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/80 px-4 py-1.5 rounded-full border border-brand-200 dark:border-brand-800">
            6 Sequential Phases
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 pt-2">
          {pipelineStages.map((st, idx) => {
            const Icon = st.icon;
            return (
              <Link
                key={st.id}
                to={st.path}
                className="group relative flex flex-col p-4 rounded-2xl border-2 transition-all hover:shadow-lg hover:-translate-y-1 bg-stone-50 dark:bg-stone-850 border-stone-200 dark:border-stone-800 hover:border-brand-500 dark:hover:border-brand-400"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center border-2 ${st.color}`}>
                    <Icon className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <span className="text-xs sm:text-sm font-black text-stone-700 dark:text-stone-300 bg-stone-200/80 dark:bg-stone-700/80 px-2 py-0.5 rounded-md">
                    Step {idx + 1}
                  </span>
                </div>
                <div className="font-black text-sm sm:text-base text-stone-900 dark:text-stone-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  {st.label}
                </div>
                <div className="text-2xl sm:text-3xl font-black font-sans text-stone-900 dark:text-stone-100 mt-2 flex items-baseline gap-1.5">
                  {loading ? '...' : st.count}
                  <span className="text-xs sm:text-sm font-bold text-stone-500 dark:text-stone-400">
                    batches
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 8 CRITICAL SUMMARY METRICS CARDS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 uppercase tracking-wide">
            Operational Summary Metrics
          </h2>
          <span className="text-xs sm:text-sm font-bold text-stone-500 dark:text-stone-400">
            Live totals from farm ledger
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* 1. Total Seeds Sown */}
          <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="text-xs sm:text-sm font-black text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                1. Total Seeds Sown
              </div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black font-sans tracking-tight text-stone-900 dark:text-stone-100 mt-2">
                {loading ? '...' : (metrics?.totalSeedsSown ?? 0).toLocaleString()}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-stone-600 dark:text-stone-400 mt-2">
                Across Rootstock & Scions
              </div>
            </div>
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-100/70 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center flex-shrink-0">
              <Sprout className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2]" />
            </div>
          </div>


          {/* 2. Rootstock Available */}
          <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="text-xs sm:text-sm font-black text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                2. Rootstock Available
              </div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black font-sans tracking-tight text-stone-900 dark:text-stone-100 mt-2">
                {loading ? '...' : (metrics?.rootstockAvailable ?? 0).toLocaleString()}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-stone-600 dark:text-stone-400 mt-2">
                Ready or active for grafting
              </div>
            </div>
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-lime-100/70 dark:bg-lime-950/80 text-lime-700 dark:text-lime-300 flex items-center justify-center flex-shrink-0">
              <Layers className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2]" />
            </div>
          </div>

          {/* 3. Scions Available */}
          <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="text-xs sm:text-sm font-black text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                3. Scions Available
              </div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black font-sans tracking-tight text-stone-900 dark:text-stone-100 mt-2">
                {loading ? '...' : (metrics?.scionAvailable ?? 0).toLocaleString()}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-stone-600 dark:text-stone-400 mt-2">
                Cultivar cuttings balance
              </div>
            </div>
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-green-100/70 dark:bg-green-950/80 text-green-700 dark:text-green-300 flex items-center justify-center flex-shrink-0">
              <Layers className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2]" />
            </div>
          </div>

          {/* 4. Total Grafts Attempted */}
          <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="text-xs sm:text-sm font-black text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                4. Grafts Attempted
              </div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black font-sans tracking-tight text-stone-900 dark:text-stone-100 mt-2">
                {loading ? '...' : (metrics?.totalGraftsAttempted ?? 0).toLocaleString()}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-stone-600 dark:text-stone-400 mt-2">
                Total union operations
              </div>
            </div>
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-100/70 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 flex items-center justify-center flex-shrink-0">
              <Scissors className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2]" />
            </div>
          </div>

          {/* 5. Plants in Curing */}
          <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="text-xs sm:text-sm font-black text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                5. Plants in Curing
              </div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black font-sans tracking-tight text-stone-900 dark:text-stone-100 mt-2">
                {loading ? '...' : (metrics?.plantsInCuring ?? 0).toLocaleString()}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-stone-600 dark:text-stone-400 mt-2">
                Chamber acclimatization
              </div>
            </div>
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-indigo-100/70 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center flex-shrink-0">
              <HeartPulse className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2]" />
            </div>
          </div>

          {/* 6. Curing Survival Rate */}
          <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="text-xs sm:text-sm font-black text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                6. Curing Survival Rate
              </div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black font-sans tracking-tight text-stone-900 dark:text-stone-100 mt-2">
                {loading ? '...' : `${metrics?.curingSurvivalRate ?? 0}%`}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-stone-600 dark:text-stone-400 mt-2">
                Post-graft healing ratio
              </div>
            </div>
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-100/70 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2]" />
            </div>
          </div>

          {/* 7. Ready for Sale Plants */}
          <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="text-xs sm:text-sm font-black text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                7. Ready for Sale Plants
              </div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black font-sans tracking-tight text-emerald-600 dark:text-emerald-400 mt-2">
                {loading ? '...' : (metrics?.readyForSalePlants ?? 0).toLocaleString()}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-stone-600 dark:text-stone-400 mt-2">
                Saleable stock on hand
              </div>
            </div>
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-100/70 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2]" />
            </div>
          </div>

          {/* 8. Total Plants Sold */}
          <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="text-xs sm:text-sm font-black text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                8. Total Plants Sold
              </div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black font-sans tracking-tight text-purple-600 dark:text-purple-400 mt-2">
                {loading ? '...' : (metrics?.totalPlantsSold ?? 0).toLocaleString()}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-stone-600 dark:text-stone-400 mt-2">
                Fulfilled orders delivered
              </div>
            </div>
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-purple-100/70 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2]" />
            </div>
          </div>
        </div>
      </div>

      {/* STAFF TASK & ACCESS MANAGEMENT BANNER */}
      <div className="bg-gradient-to-r from-stone-900 to-stone-850 text-white p-6 sm:p-7 rounded-3xl border border-stone-800 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <ListTodo className="w-5 h-5" />
              </span>
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-400">
                Staff Operations & Task Hub
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Daily Operational Tasks & Assignments
            </h2>
            <p className="text-sm text-stone-300 max-w-2xl font-medium">
              Admin &amp; Supervisors assign nursery jobs with stages and priorities; Supervisors and Workers execute and update completion logs in real time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {taskMetrics && (
              <div className="flex items-center gap-2 bg-stone-800/90 px-4 py-2.5 rounded-2xl border border-stone-700 text-stone-200 text-sm font-bold">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>
                  {user?.role === 'ADMIN' || user?.role === 'SUPERVISOR'
                    ? `${taskMetrics.pending + taskMetrics.inProgress} Active Tasks`
                    : `${taskMetrics.myPending} Tasks Assigned to You`}
                </span>
                {taskMetrics.urgent > 0 && (
                  <span className="ml-1 px-2 py-0.5 rounded-md bg-rose-500 text-white text-xs font-black">
                    {taskMetrics.urgent} Urgent
                  </span>
                )}
              </div>
            )}

            <Link
              to="/app/tasks"
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black text-sm sm:text-base transition-all shadow-md"
            >
              <ListTodo className="w-5 h-5" />
              <span>Open Task Hub</span>
            </Link>

            {user?.role === 'ADMIN' && (
              <Link
                to="/app/users"
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-stone-700 hover:bg-stone-600 active:scale-95 text-white font-black text-sm sm:text-base transition-all shadow-md border border-stone-600"
              >
                <UserCog className="w-5 h-5 text-brand-300" />
                <span>Staff & Access</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* QUICK WORKFLOW LAUNCHERS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <Link
          to="/app/sowing"
          className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all shadow-sm hover:shadow-md group"
        >
          <div className="flex items-center justify-between">
            <span className="p-3.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              <Sprout className="w-7 h-7 stroke-[2.2]" />
            </span>
            <ArrowRight className="w-6 h-6 text-stone-400 group-hover:translate-x-1 group-hover:text-emerald-500 transition-all" />
          </div>
          <h3 className="font-black text-lg sm:text-xl mt-4 text-stone-900 dark:text-stone-100">Record Sowing</h3>
          <p className="text-sm font-medium text-stone-600 dark:text-stone-400 mt-2 leading-relaxed">
            Register Rootstock, Scion, or both with auto batch tags
          </p>
        </Link>

        <Link
          to="/app/grafting"
          className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-amber-500 dark:hover:border-amber-500 transition-all shadow-sm hover:shadow-md group"
        >
          <div className="flex items-center justify-between">
            <span className="p-3.5 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
              <Scissors className="w-7 h-7 stroke-[2.2]" />
            </span>
            <ArrowRight className="w-6 h-6 text-stone-400 group-hover:translate-x-1 group-hover:text-amber-500 transition-all" />
          </div>
          <h3 className="font-black text-lg sm:text-xl mt-4 text-stone-900 dark:text-stone-100">Create Graft Run</h3>
          <p className="text-sm font-medium text-stone-600 dark:text-stone-400 mt-2 leading-relaxed">
            Link Rootstock + Scion with atomic deduction & lineage
          </p>
        </Link>

        <Link
          to="/app/selling"
          className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-purple-500 dark:hover:border-purple-500 transition-all shadow-sm hover:shadow-md group"
        >
          <div className="flex items-center justify-between">
            <span className="p-3.5 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
              <ShoppingBag className="w-7 h-7 stroke-[2.2]" />
            </span>
            <ArrowRight className="w-6 h-6 text-stone-400 group-hover:translate-x-1 group-hover:text-purple-500 transition-all" />
          </div>
          <h3 className="font-black text-lg sm:text-xl mt-4 text-stone-900 dark:text-stone-100">Record Plant Sale</h3>
          <p className="text-sm font-medium text-stone-600 dark:text-stone-400 mt-2 leading-relaxed">
            Issue customer invoice with auto stock reduction
          </p>
        </Link>

        <Link
          to="/app/trace"
          className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-sm hover:shadow-md group"
        >
          <div className="flex items-center justify-between">
            <span className="p-3.5 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              <Search className="w-7 h-7 stroke-[2.2]" />
            </span>
            <ArrowRight className="w-6 h-6 text-stone-400 group-hover:translate-x-1 group-hover:text-blue-500 transition-all" />
          </div>
          <h3 className="font-black text-lg sm:text-xl mt-4 text-stone-900 dark:text-stone-100">Trace Pedigree</h3>
          <p className="text-sm font-medium text-stone-600 dark:text-stone-400 mt-2 leading-relaxed">
            Backtrack sold plant to its exact Rootstock and Scion origin
          </p>
        </Link>
      </div>
    </div>
  );
};

export default DashboardPage;
