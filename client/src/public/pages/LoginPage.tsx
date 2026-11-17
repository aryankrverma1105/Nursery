import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import SeoHead from '../components/SeoHead';
import { Sprout, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forced password change state
  const [forceChangeUser, setForceChangeUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const from = (location.state as any)?.from?.pathname || '/app';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login({ email, password });
      if (user.forcePasswordChange) {
        setForceChangeUser(user);
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForcedPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      // Import api directly to call change-password
      const { default: api } = await import('../../services/api');
      await api.post('/auth/change-password', {
        newPassword,
      });
      navigate('/app', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setError('');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <SeoHead title="Staff Login | Deep Root Farms" description="Nursery Management System Staff Portal" />

      <div className="max-w-md w-full space-y-8 bg-white dark:bg-stone-900 p-8 sm:p-10 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xl">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-brand-800 text-brand-100 flex items-center justify-center shadow-md">
            <Sprout className="w-7 h-7 text-brand-300" />
          </div>
          <h2 className="font-serif text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Nursery Staff Portal
          </h2>
          <p className="text-xs text-stone-500 max-w-xs mx-auto">
            Authorized access for inventory managers, supervisors, and field technicians.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {forceChangeUser ? (
          // Forced Password Change Form
          <form onSubmit={handleForcedPasswordSubmit} className="space-y-4">
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 text-xs">
              <KeyRound className="w-4 h-4 inline mr-1" />
              <strong>Password Reset Required:</strong> You must create a new password for your account before entering the portal.
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">New Secure Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-800 hover:bg-brand-900 text-white font-semibold py-3 rounded-xl shadow text-sm transition-transform active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Set New Password & Enter Portal'}
            </button>
          </form>
        ) : (
          // Standard Login Form
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@nursery.local"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 text-sm focus:border-brand-500 shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 text-sm focus:border-brand-500 shadow-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-800 hover:bg-brand-900 text-white font-semibold py-3 rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Demo Accounts Box for Rapid Testing */}
        <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
            <span>Quick Demo Accounts (Tap to fill):</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillDemo('admin@nursery.local', 'Admin@12345')}
              className="p-2 bg-stone-100 dark:bg-stone-800 hover:bg-brand-100 dark:hover:bg-brand-950 text-left rounded-lg text-xs transition-colors"
            >
              <div className="font-bold text-stone-800 dark:text-stone-200">Admin</div>
              <div className="text-[10px] text-stone-500">Full Access</div>
            </button>

            <button
              type="button"
              onClick={() => fillDemo('supervisor@nursery.local', 'Supervisor@12345')}
              className="p-2 bg-stone-100 dark:bg-stone-800 hover:bg-brand-100 dark:hover:bg-brand-950 text-left rounded-lg text-xs transition-colors"
            >
              <div className="font-bold text-stone-800 dark:text-stone-200">Supervisor</div>
              <div className="text-[10px] text-stone-500">Inventory/Sales</div>
            </button>

            <button
              type="button"
              onClick={() => fillDemo('worker@nursery.local', 'Worker@12345')}
              className="p-2 bg-stone-100 dark:bg-stone-800 hover:bg-brand-100 dark:hover:bg-brand-950 text-left rounded-lg text-xs transition-colors"
            >
              <div className="font-bold text-stone-800 dark:text-stone-200">Technician</div>
              <div className="text-[10px] text-stone-500">Field Logs</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

