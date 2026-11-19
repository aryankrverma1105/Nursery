import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import {
  ShieldCheck,
  User,
  Search,
  Download,
  RefreshCw,
  Filter,
  Calendar,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Activity,
  Sprout,
  Scissors,
  HeartPulse,
  CheckCircle2,
  ShoppingBag,
  AlertTriangle,
  Globe,
  UserCog,
  KeyRound,
  FileClock,
  Layers,
  Database
} from 'lucide-react';

interface AuditLog {
  id: number;
  user_id?: number | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  old_values?: string | null;
  new_values?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  author_name?: string | null;
  author_email?: string | null;
}

const CATEGORIES = [
  { id: 'ALL', label: 'All Logs' },
  { id: 'INVENTORY', label: 'Farm & Crop Lifecycle' },
  { id: 'SALES', label: 'Sales & Orders' },
  { id: 'AUTH', label: 'Logins & Security' },
  { id: 'CMS', label: 'Website CMS' },
  { id: 'USERS', label: 'Staff & Roles' },
  { id: 'TASKS', label: 'Tasks' },
];

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  return date.toLocaleDateString();
}

function getActionBadgeStyle(action: string, entityType: string) {
  const act = (action + ' ' + entityType).toUpperCase();

  if (act.includes('LOGIN') || act.includes('LOGOUT') || act.includes('AUTH')) {
    return {
      bg: 'bg-indigo-100 dark:bg-indigo-950/80',
      text: 'text-indigo-800 dark:text-indigo-300',
      border: 'border-indigo-200 dark:border-indigo-800',
      icon: KeyRound,
      category: 'AUTH',
    };
  }
  if (act.includes('SOW') || act.includes('SEED')) {
    return {
      bg: 'bg-emerald-100 dark:bg-emerald-950/80',
      text: 'text-emerald-800 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800',
      icon: Sprout,
      category: 'INVENTORY',
    };
  }
  if (act.includes('GROWTH') || act.includes('PLANT')) {
    return {
      bg: 'bg-teal-100 dark:bg-teal-950/80',
      text: 'text-teal-800 dark:text-teal-300',
      border: 'border-teal-200 dark:border-teal-800',
      icon: Layers,
      category: 'INVENTORY',
    };
  }
  if (act.includes('GRAFT')) {
    return {
      bg: 'bg-amber-100 dark:bg-amber-950/80',
      text: 'text-amber-800 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
      icon: Scissors,
      category: 'INVENTORY',
    };
  }
  if (act.includes('CURING') || act.includes('SURVIVAL')) {
    return {
      bg: 'bg-sky-100 dark:bg-sky-950/80',
      text: 'text-sky-800 dark:text-sky-300',
      border: 'border-sky-200 dark:border-sky-800',
      icon: HeartPulse,
      category: 'INVENTORY',
    };
  }
  if (act.includes('READY') || act.includes('SALEABLE')) {
    return {
      bg: 'bg-green-100 dark:bg-green-950/80',
      text: 'text-green-800 dark:text-green-300',
      border: 'border-green-200 dark:border-green-800',
      icon: CheckCircle2,
      category: 'INVENTORY',
    };
  }
  if (act.includes('ORDER') || act.includes('SALE') || act.includes('INVOICE')) {
    return {
      bg: 'bg-purple-100 dark:bg-purple-950/80',
      text: 'text-purple-800 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800',
      icon: ShoppingBag,
      category: 'SALES',
    };
  }
  if (act.includes('CMS') || act.includes('SECTION') || act.includes('BANNER') || act.includes('GALLERY') || act.includes('SETTING')) {
    return {
      bg: 'bg-blue-100 dark:bg-blue-950/80',
      text: 'text-blue-800 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
      icon: Globe,
      category: 'CMS',
    };
  }
  if (act.includes('USER') || act.includes('ROLE') || act.includes('ACCESS')) {
    return {
      bg: 'bg-stone-200 dark:bg-stone-800',
      text: 'text-stone-800 dark:text-stone-200',
      border: 'border-stone-300 dark:border-stone-700',
      icon: UserCog,
      category: 'USERS',
    };
  }
  if (act.includes('QUARANTINE') || act.includes('LOSS') || act.includes('MORTALITY') || act.includes('DELETE')) {
    return {
      bg: 'bg-rose-100 dark:bg-rose-950/80',
      text: 'text-rose-800 dark:text-rose-300',
      border: 'border-rose-200 dark:border-rose-800',
      icon: AlertTriangle,
      category: 'INVENTORY',
    };
  }

  return {
    bg: 'bg-stone-100 dark:bg-stone-850',
    text: 'text-stone-800 dark:text-stone-300',
    border: 'border-stone-200 dark:border-stone-800',
    icon: Activity,
    category: 'INVENTORY',
  };
}

export const AuditLogsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [limit, setLimit] = useState(250);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['historical-audit-logs', limit],
    queryFn: async () => {
      const res = await api.get(`/reports/audit-logs?limit=${limit}`);
      return (res.data.logs || []) as AuditLog[];
    },
    staleTime: 10000,
  });

  const rawLogs = data || [];

  // Filter logs locally for instantaneous response
  const filteredLogs = useMemo(() => {
    return rawLogs.filter((log) => {
      const badge = getActionBadgeStyle(log.action, log.entity_type);
      if (selectedCategory !== 'ALL' && badge.category !== selectedCategory) {
        return false;
      }

      if (!searchTerm.trim()) return true;

      const term = searchTerm.toLowerCase();
      const matchAction = log.action.toLowerCase().includes(term);
      const matchEntity = log.entity_type.toLowerCase().includes(term);
      const matchEntityId = log.entity_id ? log.entity_id.toLowerCase().includes(term) : false;
      const matchAuthor = log.author_name ? log.author_name.toLowerCase().includes(term) : false;
      const matchEmail = log.author_email ? log.author_email.toLowerCase().includes(term) : false;
      const matchIp = log.ip_address ? log.ip_address.toLowerCase().includes(term) : false;
      const matchNewVal = log.new_values ? log.new_values.toLowerCase().includes(term) : false;
      const matchOldVal = log.old_values ? log.old_values.toLowerCase().includes(term) : false;

      return (
        matchAction ||
        matchEntity ||
        matchEntityId ||
        matchAuthor ||
        matchEmail ||
        matchIp ||
        matchNewVal ||
        matchOldVal
      );
    });
  }, [rawLogs, selectedCategory, searchTerm]);

  // Copy JSON payload
  const handleCopy = (id: number, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export CSV handler
  const handleDownloadCsv = async () => {
    try {
      setIsExporting(true);
      const response = await api.get('/reports/audit-logs?format=csv', {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nursery_historical_logs_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to export CSV', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Metrics summary
  const totalCount = rawLogs.length;
  const uniqueActors = new Set(rawLogs.map((l) => l.author_name || l.author_email || 'System')).size;
  const todayCount = rawLogs.filter((l) => {
    const today = new Date().toDateString();
    return new Date(l.created_at).toDateString() === today;
  }).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header & Meta */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-brand-600 text-white shadow-md">
              <FileClock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100">
                Historical Audit & Activity Logs
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-stone-600 dark:text-stone-300 mt-0.5">
                Permanent immutable chronological audit trail of all nursery operations, logins, inventory moves, and CMS changes.
              </p>
            </div>
          </div>
        </div>

        {/* Global actions: Refresh and Export */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-brand-600' : 'text-stone-500'}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleDownloadCsv}
            disabled={isExporting}
            className="px-4 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            Loaded Events
          </div>
          <div className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
            {totalCount.toLocaleString()}
          </div>
          <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400 mt-0.5">
            Showing latest {Math.min(limit, totalCount)} entries
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            Today's Events
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {todayCount.toLocaleString()}
          </div>
          <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400 mt-0.5">
            Events logged since midnight
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            Active Actors
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {uniqueActors}
          </div>
          <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400 mt-0.5">
            Staff & system accounts
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            Filtered Match
          </div>
          <div className="text-2xl font-black text-brand-600 dark:text-brand-400 mt-1">
            {filteredLogs.length.toLocaleString()}
          </div>
          <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400 mt-0.5">
            Matching current filters
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Category Chips */}
      <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by action, user, entity ID, IP, or payload details..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Row limit picker */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400 whitespace-nowrap">
              Show:
            </span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              aria-label="Filter logs by limit"
              className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-xs font-bold focus:ring-2 focus:ring-brand-500 cursor-pointer"
            >
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
              <option value={250}>250 rows</option>
              <option value={500}>500 rows</option>
              <option value={1000}>1000 rows</option>
            </select>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <Filter className="w-3.5 h-3.5 text-stone-400 flex-shrink-0 mr-1" />
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-brand-700 text-white shadow-xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Logs List */}
      {isLoading ? (
        <div className="py-24 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800">
          <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
          <div className="text-sm font-bold text-stone-700 dark:text-stone-300">
            Fetching Historical Audit Logs...
          </div>
          <p className="text-xs text-stone-500 mt-1">Retrieving database audit ledger</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6">
          <Database className="w-12 h-12 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
          <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
            No Historical Logs Found
          </h3>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-md mx-auto mt-1">
            {searchTerm
              ? `No records match your search query "${searchTerm}". Try adjusting your keywords or clearing the filter.`
              : 'There are no log entries recorded in this category yet.'}
          </p>
          {(searchTerm || selectedCategory !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('ALL');
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const badge = getActionBadgeStyle(log.action, log.entity_type);
            const Icon = badge.icon;
            const isExpanded = expandedLogId === log.id;
            const hasDetails = Boolean(log.new_values || log.old_values);

            return (
              <div
                key={log.id}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs hover:border-brand-500/50 transition-all space-y-3"
              >
                {/* Header row: Action badge, entity, timestamp */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1.5 font-mono font-black uppercase text-[11px] px-2.5 py-1 rounded-lg border ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{log.action}</span>
                    </span>

                    <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      Entity: <strong className="text-stone-900 dark:text-stone-100">{log.entity_type}</strong>
                      {log.entity_id && (
                        <span className="ml-1 px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-mono text-[10px]">
                          #{log.entity_id}
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400 text-xs">
                    <span className="font-semibold text-stone-700 dark:text-stone-300">
                      {formatTimeAgo(log.created_at)}
                    </span>
                    <span className="text-stone-300 dark:text-stone-700">•</span>
                    <span className="font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Author & Context row */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stone-600 dark:text-stone-300">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-stone-400" />
                    <span className="font-bold text-stone-900 dark:text-stone-100">
                      {log.author_name || 'System / Auto'}
                    </span>
                    {log.author_email && (
                      <span className="text-stone-500 dark:text-stone-400">({log.author_email})</span>
                    )}
                  </div>

                  {log.ip_address && (
                    <div className="flex items-center gap-1 text-stone-500 dark:text-stone-400 font-mono text-[11px]">
                      <span>IP:</span>
                      <span>{log.ip_address}</span>
                    </div>
                  )}

                  {log.user_agent && (
                    <div
                      className="text-stone-400 truncate max-w-xs text-[10px]"
                      title={log.user_agent}
                    >
                      UA: {log.user_agent.split(' ')[0]}
                    </div>
                  )}
                </div>

                {/* Change Details accordion */}
                {hasDetails && (
                  <div>
                    <button
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors cursor-pointer"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          <span>Hide Change Details</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          <span>View Change Details (Payload & Values)</span>
                        </>
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-2.5 p-3.5 bg-stone-50 dark:bg-stone-850 rounded-xl border border-stone-200 dark:border-stone-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                            Recorded JSON Diff
                          </span>

                          <button
                            onClick={() =>
                              handleCopy(
                                log.id,
                                JSON.stringify(
                                  {
                                    old: log.old_values ? JSON.parse(log.old_values) : null,
                                    new: log.new_values ? JSON.parse(log.new_values) : null,
                                  },
                                  null,
                                  2
                                )
                              )
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-600 dark:text-stone-300 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer"
                          >
                            {copiedId === log.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span className="text-emerald-500">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy JSON</span>
                              </>
                            )}
                          </button>
                        </div>

                        {log.old_values && (
                          <div>
                            <div className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 mb-1">
                              Previous Values (Old):
                            </div>
                            <pre className="p-2.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-[11px] font-mono text-stone-800 dark:text-stone-200 overflow-x-auto whitespace-pre-wrap">
                              {(() => {
                                try {
                                  return JSON.stringify(JSON.parse(log.old_values), null, 2);
                                } catch {
                                  return log.old_values;
                                }
                              })()}
                            </pre>
                          </div>
                        )}

                        {log.new_values && (
                          <div>
                            <div className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 mb-1">
                              Applied Values (New / State):
                            </div>
                            <pre className="p-2.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-[11px] font-mono text-stone-800 dark:text-stone-200 overflow-x-auto whitespace-pre-wrap">
                              {(() => {
                                try {
                                  return JSON.stringify(JSON.parse(log.new_values), null, 2);
                                } catch {
                                  return log.new_values;
                                }
                              })()}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AuditLogsPage;
