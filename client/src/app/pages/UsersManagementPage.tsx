import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  Users,
  UserPlus,
  Shield,
  Briefcase,
  KeyRound,
  CheckCircle,
  AlertCircle,
  X,
  Search,
  RefreshCw,
  Phone,
  Mail,
  Calendar,
  Lock,
  UserCheck,
  UserX,
  Edit2,
  ListTodo
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface StaffUser {
  id: number;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'WORKER';
  designation?: string;
  phone?: string;
  is_active: boolean;
  force_password_change: boolean;
  permissions: string[];
  pending_tasks_count?: number;
  created_at: string;
}

export const UsersManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'SUPERVISOR' | 'WORKER'>('ALL');

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);

  // Form States - Create
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'SUPERVISOR' | 'WORKER'>('WORKER');
  const [designation, setDesignation] = useState('');
  const [phone, setPhone] = useState('');
  const [forcePasswordChange, setForcePasswordChange] = useState(false);

  // Form States - Reset Password
  const [newPassword, setNewPassword] = useState('');

  // Feedback & Loading
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/users');
      setUsers(res.data.users || []);
    } catch (err: any) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setFeedback(null);

      const res = await axios.post('/api/users', {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        designation: designation.trim() || undefined,
        phone: phone.trim() || undefined,
        force_password_change: forcePasswordChange,
      });

      setFeedback({ type: 'success', message: res.data.message || 'Staff ID created successfully.' });
      setShowCreateModal(false);
      resetCreateForm();
      fetchUsers();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to create staff account.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setSubmitting(true);
      setFeedback(null);

      const res = await axios.put(`/api/users/${selectedUser.id}`, {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        role,
        designation: designation.trim() || undefined,
        phone: phone.trim() || undefined,
        is_active: selectedUser.is_active,
      });

      setFeedback({ type: 'success', message: res.data.message || 'Staff details updated.' });
      setShowEditModal(false);
      fetchUsers();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to update user.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setSubmitting(true);
      setFeedback(null);

      const res = await axios.put(`/api/users/${selectedUser.id}/password`, {
        new_password: newPassword,
      });

      setFeedback({ type: 'success', message: res.data.message || 'Password reset successfully.' });
      setShowResetModal(false);
      setNewPassword('');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to reset password.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (u: StaffUser) => {
    if (u.id === currentUser?.id) {
      alert('You cannot deactivate your own account.');
      return;
    }

    const actionText = u.is_active ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${actionText} ${u.full_name}'s account?`)) return;

    try {
      await axios.put(`/api/users/${u.id}`, {
        is_active: !u.is_active,
      });
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to toggle account status.');
    }
  };

  const openEditModal = (u: StaffUser) => {
    setSelectedUser(u);
    setFullName(u.full_name);
    setEmail(u.email);
    setRole(u.role);
    setDesignation(u.designation || u.role);
    setPhone(u.phone || '');
    setShowEditModal(true);
  };

  const openResetModal = (u: StaffUser) => {
    setSelectedUser(u);
    setNewPassword('');
    setShowResetModal(true);
  };

  const resetCreateForm = () => {
    setFullName('');
    setEmail('');
    setPassword('');
    setRole('WORKER');
    setDesignation('');
    setPhone('');
    setForcePasswordChange(false);
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.designation && u.designation.toLowerCase().includes(search.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  const getRoleBadge = (r: string) => {
    switch (r) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            👑 Admin
          </span>
        );
      case 'SUPERVISOR':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            🛡️ Supervisor
          </span>
        );
      case 'WORKER':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            👷 Worker
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-gradient-to-r from-stone-900 via-stone-850 to-brand-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-stone-800">
        <div>
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-stone-800/90 text-stone-300 text-xs sm:text-sm font-black uppercase tracking-wider mb-3">
            <Shield className="w-4 h-4 text-brand-400" />
            Security &amp; RBAC Control
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Staff &amp; Access Control
          </h1>
          <p className="text-stone-300 text-sm sm:text-base lg:text-lg font-medium mt-2 max-w-2xl">
            Create and manage staff IDs across Admin, Supervisor, and Worker designations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-sm sm:text-base font-bold transition-all"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => {
              resetCreateForm();
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-500 active:scale-95 text-white text-sm sm:text-base font-black shadow-lg transition-all"
          >
            <UserPlus className="w-5 h-5 stroke-[2.5]" />
            <span>+ Create Staff ID</span>
          </button>
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

      {/* STATS STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="text-xs font-black uppercase text-stone-500">Total Staff Accounts</div>
          <div className="text-3xl font-black text-stone-900 dark:text-stone-100 mt-1">{users.length}</div>
        </div>
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="text-xs font-black uppercase text-purple-600 dark:text-purple-400">👑 Admins</div>
          <div className="text-3xl font-black text-stone-900 dark:text-stone-100 mt-1">
            {users.filter((u) => u.role === 'ADMIN').length}
          </div>
        </div>
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="text-xs font-black uppercase text-blue-600 dark:text-blue-400">🛡️ Supervisors</div>
          <div className="text-3xl font-black text-stone-900 dark:text-stone-100 mt-1">
            {users.filter((u) => u.role === 'SUPERVISOR').length}
          </div>
        </div>
        <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400">👷 Workers</div>
          <div className="text-3xl font-black text-stone-900 dark:text-stone-100 mt-1">
            {users.filter((u) => u.role === 'WORKER').length}
          </div>
        </div>
      </div>

      {/* SEARCH & FILTERS */}
      <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by staff name, email, or designation..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {(['ALL', 'ADMIN', 'SUPERVISOR', 'WORKER'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
                  roleFilter === r
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                {r === 'ALL' ? 'All Roles' : r}
              </button>
            ))}
          </div>
        </div>

        {/* STAFF USERS LIST */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
          {filteredUsers.map((u) => (
            <div
              key={u.id}
              className={`p-6 rounded-3xl border-2 flex flex-col justify-between transition-all ${
                u.is_active
                  ? 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 shadow-sm hover:shadow-md'
                  : 'bg-stone-100 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    {getRoleBadge(u.role)}
                    <div className="text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100 mt-2">
                      {u.full_name}
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-stone-500 dark:text-stone-400">
                      {u.designation || u.role}
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      u.is_active
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                    }`}
                  >
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-2 mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 text-xs sm:text-sm text-stone-600 dark:text-stone-300">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-stone-400 flex-shrink-0" />
                    <span className="font-semibold truncate">{u.email}</span>
                  </div>
                  {u.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-stone-400 flex-shrink-0" />
                      <span className="font-semibold">{u.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-stone-400 flex-shrink-0" />
                    <span>Joined: {new Date(u.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-brand-500 flex-shrink-0" />
                    <span className="font-bold text-brand-700 dark:text-brand-300">
                      {u.pending_tasks_count || 0} active assigned task(s)
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-4 mt-4 border-t border-stone-100 dark:border-stone-800">
                <button
                  onClick={() => openEditModal(u)}
                  className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  onClick={() => openResetModal(u)}
                  className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Pass</span>
                </button>

                <button
                  onClick={() => handleToggleActive(u)}
                  disabled={u.id === currentUser?.id}
                  className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    u.is_active
                      ? 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                      : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                  <span>{u.is_active ? 'Disable' : 'Enable'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CREATE STAFF ID MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-stone-900 w-full max-w-xl rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl p-6 sm:p-8 space-y-6 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 flex items-center justify-center">
                  <UserPlus className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
                    Create New Staff ID
                  </h2>
                  <p className="text-xs sm:text-sm font-semibold text-stone-500">
                    Assign role designation and system credentials
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-500 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-5">
              {/* Designation / Role Choice */}
              <div>
                <label className="block text-xs font-black uppercase text-stone-700 dark:text-stone-300 mb-2">
                  Staff Designation / System Role *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'ADMIN', label: 'Admin', icon: '👑', desc: 'Full farm & user control' },
                    { id: 'SUPERVISOR', label: 'Supervisor', icon: '🛡️', desc: 'Delegation & approvals' },
                    { id: 'WORKER', label: 'Worker', icon: '👷', desc: 'Daily crop & field tasks' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setRole(r.id as any);
                        if (!designation) setDesignation(r.label);
                      }}
                      className={`p-3.5 rounded-2xl border-2 text-left transition-all ${
                        role === r.id
                          ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/80'
                          : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850'
                      }`}
                    >
                      <div className="text-2xl">{r.icon}</div>
                      <div className="font-black text-sm text-stone-900 dark:text-stone-100 mt-1">{r.label}</div>
                      <div className="text-[11px] font-medium text-stone-500 mt-0.5">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Full Name & Designation Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-stone-700 dark:text-stone-300 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ramesh Patil"
                    className="w-full px-4 py-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-sm font-semibold focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-stone-700 dark:text-stone-300 mb-1.5">
                    Job Title / Designation
                  </label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Grafting Master"
                    className="w-full px-4 py-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-sm font-semibold focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-stone-700 dark:text-stone-300 mb-1.5">
                    Staff Email (Login ID) *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. ramesh@farm.local"
                    className="w-full px-4 py-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-sm font-semibold focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-stone-700 dark:text-stone-300 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-sm font-semibold focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Initial Password */}
              <div>
                <label className="block text-xs font-black uppercase text-stone-700 dark:text-stone-300 mb-1.5">
                  Initial Password (minimum 6 characters) *
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password..."
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-sm font-semibold focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="forceChange"
                  checked={forcePasswordChange}
                  onChange={(e) => setForcePasswordChange(e.target.checked)}
                  className="w-5 h-5 rounded-md text-brand-600 focus:ring-brand-500 border-stone-300"
                />
                <label htmlFor="forceChange" className="text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300">
                  Force staff member to change password upon first login
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-black text-sm shadow-md transition-all disabled:opacity-50"
                >
                  {submitting ? 'Creating ID...' : 'Save & Issue Staff ID'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STAFF MODAL */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center">
                  <Edit2 className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-stone-900 dark:text-stone-100">Edit Staff Details</h2>
                  <p className="text-xs font-semibold text-stone-500">{selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-500 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-stone-700 dark:text-stone-300 mb-1.5">
                  Role / Designation *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  disabled={selectedUser.id === currentUser?.id}
                  className="w-full px-4 py-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-sm font-semibold"
                >
                  <option value="ADMIN">👑 Admin (Full Access)</option>
                  <option value="SUPERVISOR">🛡️ Supervisor (Delegation &amp; Operations)</option>
                  <option value="WORKER">👷 Worker (Daily Task Execution)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-stone-700 dark:text-stone-300 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-stone-700 dark:text-stone-300 mb-1.5">
                  Designation / Subtitle
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-stone-700 dark:text-stone-300 mb-1.5">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-stone-700 dark:text-stone-300 mb-1.5">
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-sm font-semibold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2.5 rounded-2xl bg-stone-100 dark:bg-stone-800 font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-black text-sm shadow-md"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {showResetModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-700 flex items-center justify-center">
                  <KeyRound className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-stone-900 dark:text-stone-100">Reset Staff Password</h3>
                  <p className="text-xs font-semibold text-stone-500">{selectedUser.full_name}</p>
                </div>
              </div>
              <button onClick={() => setShowResetModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-stone-700 dark:text-stone-300 mb-1.5">
                  New Password (minimum 6 characters) *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new temporary password..."
                  className="w-full px-4 py-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 text-stone-900 dark:text-stone-100 text-sm font-semibold"
                />
              </div>

              <div className="text-xs font-medium text-stone-500 bg-stone-50 dark:bg-stone-850 p-3 rounded-xl border border-stone-200 dark:border-stone-800">
                Staff member will be prompted to change this temporary password upon logging in.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs shadow-md"
                >
                  {submitting ? 'Updating...' : 'Set New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagementPage;
