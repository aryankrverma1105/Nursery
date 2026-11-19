import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  ListTodo,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Calendar,
  User,
  CheckCircle,
  AlertCircle,
  X,
  Search,
  Filter,
  RefreshCw,
  ArrowRight,
  MessageSquare,
  Trash2,
  Edit2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface FarmTask {
  id: number;
  title: string;
  description?: string;
  assigned_to_user_id: number;
  created_by_user_id?: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  stage: 'SOWING' | 'GROWTH' | 'GRAFTING' | 'CURING' | 'READY_FOR_SALE' | 'SELLING' | 'GENERAL';
  due_date?: string;
  completed_at?: string;
  completion_notes?: string;
  assignee_name?: string;
  assignee_email?: string;
  assignee_role?: string;
  assignee_designation?: string;
  creator_name?: string;
  creator_role?: string;
  created_at: string;
}

interface StaffOption {
  id: number;
  full_name: string;
  email: string;
  role: string;
  designation?: string;
}

interface TaskMetrics {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  urgent: number;
  myPending: number;
}

export const TasksPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const isManager = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';

  const [tasks, setTasks] = useState<FarmTask[]>([]);
  const [metrics, setMetrics] = useState<TaskMetrics | null>(null);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<'ALL' | 'MY_TASKS' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedTaskForComplete, setSelectedTaskForComplete] = useState<FarmTask | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');

  // Create Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [assignedToId, setAssignedToId] = useState<number | ''>('');
  const [taskPriority, setTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [taskStage, setTaskStage] = useState<'SOWING' | 'GROWTH' | 'GRAFTING' | 'CURING' | 'READY_FOR_SALE' | 'SELLING' | 'GENERAL'>('GENERAL');
  const [taskDueDate, setTaskDueDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const [tasksRes, metricsRes] = await Promise.all([
        axios.get('/api/tasks'),
        axios.get('/api/tasks/metrics'),
      ]);
      setTasks(tasksRes.data.tasks || []);
      setMetrics(metricsRes.data.metrics || null);
    } catch (err: any) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffList = async () => {
    try {
      const res = await axios.get('/api/users?status=active');
      setStaffList(res.data.users || []);
    } catch (err) {
      console.error('Failed to load staff list:', err);
    }
  };

  useEffect(() => {
    fetchTasks();
    if (isManager) {
      fetchStaffList();
    }
  }, [isManager]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedToId) {
      setFeedback({ type: 'error', message: 'Please select a staff member to assign this task.' });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      const res = await axios.post('/api/tasks', {
        title: taskTitle.trim(),
        description: taskDesc.trim() || undefined,
        assigned_to_user_id: Number(assignedToId),
        priority: taskPriority,
        stage: taskStage,
        due_date: taskDueDate || undefined,
      });

      setFeedback({ type: 'success', message: res.data.message || 'Task assigned successfully.' });
      setShowCreateModal(false);
      resetCreateForm();
      fetchTasks();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to assign task.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickStatus = async (taskId: number, newStatus: string, notes?: string) => {
    try {
      const res = await axios.patch(`/api/tasks/${taskId}/status`, {
        status: newStatus,
        completion_notes: notes || undefined,
      });
      setFeedback({ type: 'success', message: res.data.message || 'Status updated.' });
      if (showCompleteModal) {
        setShowCompleteModal(false);
        setSelectedTaskForComplete(null);
        setCompletionNotes('');
      }
      fetchTasks();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update task status.');
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await axios.delete(`/api/tasks/${taskId}`);
      fetchTasks();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete task.');
    }
  };

  const resetCreateForm = () => {
    setTaskTitle('');
    setTaskDesc('');
    setAssignedToId('');
    setTaskPriority('MEDIUM');
    setTaskStage('GENERAL');
    setTaskDueDate(new Date().toISOString().split('T')[0]);
  };

  const filteredTasks = tasks.filter((t) => {
    if (activeTab === 'MY_TASKS' && t.assigned_to_user_id !== user?.id) return false;
    if (activeTab === 'PENDING' && t.status !== 'PENDING') return false;
    if (activeTab === 'IN_PROGRESS' && t.status !== 'IN_PROGRESS') return false;
    if (activeTab === 'COMPLETED' && t.status !== 'COMPLETED') return false;

    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    if (stageFilter !== 'ALL' && t.stage !== stageFilter) return false;

    if (search) {
      const s = search.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(s);
      const matchDesc = t.description?.toLowerCase().includes(s);
      const matchAssignee = t.assignee_name?.toLowerCase().includes(s);
      if (!matchTitle && !matchDesc && !matchAssignee) return false;
    }

    return true;
  });

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border border-rose-300 dark:border-rose-800 animate-pulse">
            <Flame className="w-3.5 h-3.5 text-rose-600" />
            URGENT
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            HIGH
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
            LOW
          </span>
        );
      case 'MEDIUM':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
            MEDIUM
          </span>
        );
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            COMPLETED
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 border border-blue-300">
            <Clock className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            IN PROGRESS
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            PENDING
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-gradient-to-r from-brand-900 via-brand-850 to-stone-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-brand-800/40">
        <div>
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-brand-800/90 text-brand-200 text-xs sm:text-sm font-black uppercase tracking-wider mb-3">
            <ListTodo className="w-4 h-4 text-emerald-400" />
            Task Management &amp; Delegation
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Task Assignment Hub
          </h1>
          <p className="text-stone-200 text-sm sm:text-base lg:text-lg font-medium mt-2 max-w-2xl">
            {isManager
              ? 'Assign specific operational tasks to Supervisors and Workers with deadlines and priorities.'
              : 'View and track your assigned nursery tasks, update status, and log completion notes.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTasks}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 text-white text-sm sm:text-base font-bold transition-all shadow-sm"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          {isManager && (
            <button
              onClick={() => {
                resetCreateForm();
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-sm sm:text-base font-black shadow-lg transition-all"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span>+ Assign Task</span>
            </button>
          )}
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div
          className={`p-5 rounded-2xl border flex items-center justify-between gap-3 text-sm sm:text-base font-bold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-6 h-6 text-rose-600 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-75">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* SUMMARY STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="text-xs font-black uppercase text-stone-500">Total Tasks</div>
          <div className="text-3xl font-black text-stone-900 dark:text-stone-100 mt-1">
            {metrics?.total ?? 0}
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-amber-200 dark:border-amber-900/40 shadow-sm">
          <div className="text-xs font-black uppercase text-amber-700 dark:text-amber-400">Pending Action</div>
          <div className="text-3xl font-black text-amber-700 dark:text-amber-300 mt-1">
            {metrics?.pending ?? 0}
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-blue-200 dark:border-blue-900/40 shadow-sm">
          <div className="text-xs font-black uppercase text-blue-700 dark:text-blue-400">In Progress</div>
          <div className="text-3xl font-black text-blue-700 dark:text-blue-300 mt-1">
            {metrics?.inProgress ?? 0}
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-emerald-200 dark:border-emerald-900/40 shadow-sm">
          <div className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-400">Completed</div>
          <div className="text-3xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
            {metrics?.completed ?? 0}
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-rose-200 dark:border-rose-900/40 shadow-sm col-span-2 sm:col-span-1">
          <div className="text-xs font-black uppercase text-rose-700 dark:text-rose-400 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" /> Urgent Attention
          </div>
          <div className="text-3xl font-black text-rose-700 dark:text-rose-300 mt-1">
            {metrics?.urgent ?? 0}
          </div>
        </div>
      </div>

      {/* TABS, FILTERS & SEARCH */}
      <div className="bg-white dark:bg-stone-900 p-6 sm:p-7 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Main Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'All Tasks' },
              { id: 'MY_TASKS', label: `Assigned to Me (${tasks.filter((t) => t.assigned_to_user_id === user?.id).length})` },
              { id: 'PENDING', label: 'Pending' },
              { id: 'IN_PROGRESS', label: 'In Progress' },
              { id: 'COMPLETED', label: 'Completed' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-brand-700 text-white shadow-md'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[260px]">
            <Search className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks or assignee..."
              className="w-full pl-12 pr-4 py-2.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Priority & Stage Dropdowns */}
        <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-stone-500">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 text-xs font-bold text-stone-800 dark:text-stone-200"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-stone-500">Stage:</span>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 text-xs font-bold text-stone-800 dark:text-stone-200"
            >
              <option value="ALL">All Stages</option>
              <option value="SOWING">1. Sowing</option>
              <option value="GROWTH">2. Plant Growth</option>
              <option value="GRAFTING">3. Grafting</option>
              <option value="CURING">4. Curing / Survival</option>
              <option value="READY_FOR_SALE">5. Ready for Sale</option>
              <option value="SELLING">6. Selling</option>
              <option value="GENERAL">General Maintenance</option>
            </select>
          </div>
        </div>

        {/* TASK CARDS LIST */}
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-stone-50 dark:bg-stone-850 border border-dashed border-stone-200 dark:border-stone-800 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-stone-400 mx-auto stroke-[1.5]" />
            <div className="text-lg font-black text-stone-900 dark:text-stone-100">No tasks found</div>
            <p className="text-sm font-semibold text-stone-500 max-w-md mx-auto">
              {isManager
                ? 'Click "+ Assign Task" above to delegate operational work to supervisors and workers.'
                : 'You have no assigned tasks matching this filter. Good job!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            {filteredTasks.map((t) => {
              const isAssignedToMe = t.assigned_to_user_id === user?.id;
              const isPastDue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'COMPLETED';

              return (
                <div
                  key={t.id}
                  className={`p-6 rounded-3xl border-2 flex flex-col justify-between transition-all ${
                    t.status === 'COMPLETED'
                      ? 'bg-stone-50/60 dark:bg-stone-900/40 border-stone-200 dark:border-stone-800'
                      : isAssignedToMe
                      ? 'bg-white dark:bg-stone-900 border-brand-500/80 shadow-md ring-2 ring-brand-500/10'
                      : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header Chips */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {getPriorityBadge(t.priority)}
                        <span className="text-[11px] font-black px-2.5 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 uppercase">
                          {t.stage}
                        </span>
                      </div>
                      {getStatusBadge(t.status)}
                    </div>

                    {/* Task Title & Description */}
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100 leading-snug">
                        {t.title}
                      </h3>
                      {t.description && (
                        <p className="text-sm font-medium text-stone-600 dark:text-stone-300 mt-2 leading-relaxed bg-stone-50 dark:bg-stone-850 p-3.5 rounded-2xl border border-stone-100 dark:border-stone-800">
                          {t.description}
                        </p>
                      )}
                    </div>

                    {/* Assignee & Creator Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs sm:text-sm">
                      <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-100 dark:border-stone-800">
                        <div className="w-8 h-8 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold flex-shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <div className="text-[10px] uppercase font-black text-stone-400">Assigned To</div>
                          <div className="font-bold text-stone-900 dark:text-stone-100 truncate">
                            {t.assignee_name || 'Staff Member'}
                          </div>
                          <div className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                            {t.assignee_designation || t.assignee_role}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-100 dark:border-stone-800">
                        <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold flex-shrink-0">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-black text-stone-400">Deadline</div>
                          <div className={`font-bold ${isPastDue ? 'text-rose-600 dark:text-rose-400' : 'text-stone-900 dark:text-stone-100'}`}>
                            {t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No date set'}
                          </div>
                          {isPastDue && <div className="text-[10px] font-black text-rose-500 uppercase">Overdue!</div>}
                        </div>
                      </div>
                    </div>

                    {/* Completion Notes display */}
                    {t.status === 'COMPLETED' && t.completion_notes && (
                      <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">
                        <div className="font-black flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 uppercase text-[10px]">
                          <CheckCircle className="w-3.5 h-3.5" /> Completed Feedback
                        </div>
                        <div className="mt-1 font-medium italic">"{t.completion_notes}"</div>
                      </div>
                    )}
                  </div>

                  {/* ACTION CONTROLS */}
                  <div className="pt-4 mt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-xs text-stone-400 font-medium">
                      Assigned by: <strong>{t.creator_name || 'Admin'}</strong>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Worker Action: Start Working */}
                      {t.status === 'PENDING' && (isAssignedToMe || isManager) && (
                        <button
                          onClick={() => handleQuickStatus(t.id, 'IN_PROGRESS')}
                          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Start Working</span>
                        </button>
                      )}

                      {/* Worker Action: Mark Completed */}
                      {t.status !== 'COMPLETED' && (isAssignedToMe || isManager) && (
                        <button
                          onClick={() => {
                            setSelectedTaskForComplete(t);
                            setCompletionNotes('');
                            setShowCompleteModal(true);
                          }}
                          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Mark Done</span>
                        </button>
                      )}

                      {/* Reopen if completed (Managers) */}
                      {t.status === 'COMPLETED' && isManager && (
                        <button
                          onClick={() => handleQuickStatus(t.id, 'IN_PROGRESS')}
                          className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-xs"
                        >
                          Reopen
                        </button>
                      )}

                      {/* Delete Task (Manager) */}
                      {isManager && (
                        <button
                          onClick={() => handleDeleteTask(t.id)}
                          className="p-2.5 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ASSIGN TASK MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-stone-900 w-full max-w-xl rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl p-6 sm:p-8 space-y-6 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <ListTodo className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
                    Assign Operational Task
                  </h2>
                  <p className="text-xs sm:text-sm font-semibold text-stone-500">
                    Delegate farm responsibilities to supervisors or workers
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-500 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              {/* Assignee Selection */}
              <div>
                <label className="block text-xs font-black uppercase text-stone-700 dark:text-stone-300 mb-1.5">
                  Assign To (Supervisor / Worker) *
                </label>
                <select
                  required
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(Number(e.target.value))}
                  className="w-full px-4 py-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-sm font-black"
                >
                  <option value="">-- Choose staff member --</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.role === 'ADMIN' ? '👑' : s.role === 'SUPERVISOR' ? '🛡️' : '👷'} {s.full_name} ({s.designation || s.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Task Title */}
              <div>
                <label className="block text-xs font-black uppercase text-stone-700 dark:text-stone-300 mb-1.5">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Graft 100 Desi Mango rootstocks with Kesar scions"
                  className="w-full px-4 py-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-sm font-semibold"
                />
              </div>

              {/* Priority & Stage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-stone-700 dark:text-stone-300 mb-1.5">
                    Priority Level *
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-sm font-semibold"
                  >
                    <option value="LOW">Low Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">🔥 URGENT (Immediate Action)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-stone-700 dark:text-stone-300 mb-1.5">
                    Workflow Stage *
                  </label>
                  <select
                    value={taskStage}
                    onChange={(e) => setTaskStage(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-sm font-semibold"
                  >
                    <option value="GENERAL">General Maintenance</option>
                    <option value="SOWING">1. Sowing</option>
                    <option value="GROWTH">2. Plant Growth</option>
                    <option value="GRAFTING">3. Grafting</option>
                    <option value="CURING">4. Curing / Survival</option>
                    <option value="READY_FOR_SALE">5. Ready for Sale</option>
                    <option value="SELLING">6. Selling</option>
                  </select>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-xs font-black uppercase text-stone-700 dark:text-stone-300 mb-1.5">
                  Due Date
                </label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-sm font-semibold"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-black uppercase text-stone-700 dark:text-stone-300 mb-1.5">
                  Instructions / Description
                </label>
                <textarea
                  rows={3}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Provide detailed instructions, bay numbers, or batch requirements..."
                  className="w-full px-4 py-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-sm font-semibold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-3 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-md transition-all disabled:opacity-50"
                >
                  {submitting ? 'Assigning...' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MARK DONE / COMPLETION NOTES MODAL */}
      {showCompleteModal && selectedTaskForComplete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-stone-900 dark:text-stone-100">Complete Task</h3>
                  <p className="text-xs font-semibold text-stone-500 truncate max-w-[220px]">
                    {selectedTaskForComplete.title}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowCompleteModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-stone-700 dark:text-stone-300 mb-1.5">
                  Completion Notes / Field Report (Optional)
                </label>
                <textarea
                  rows={3}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="e.g. Completed 100 grafts successfully. Watered all rows in Polyhouse 2."
                  className="w-full px-4 py-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-sm font-semibold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickStatus(selectedTaskForComplete.id, 'COMPLETED', completionNotes)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md"
                >
                  Confirm &amp; Mark Completed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksPage;
