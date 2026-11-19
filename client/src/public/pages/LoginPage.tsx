import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import SeoHead from '../components/SeoHead';
import { Lock, Mail, AlertCircle, ArrowRight, KeyRound } from 'lucide-react';

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

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <SeoHead title="Staff Login | Deep Root Farms" description="Nursery Management System Staff Portal" />

      <div className="max-w-md w-full space-y-8 bg-white dark:bg-stone-900 p-8 sm:p-10 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xl">
        {/* Header */}
        <div className="text-center space-y-3">
          <img
            src="/logo/deep-root-farms-mark.svg"
            alt="Deep Root Farms"
            className="mx-auto w-16 h-16 rounded-2xl object-contain shadow-lg"
          />
          <div>
            <h2 className="font-serif text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Deep Root Farms
            </h2>
            <div className="text-xs font-black uppercase tracking-wider text-brand-600 dark:text-brand-400 mt-1">
              Staff Portal &amp; Operations Login
            </div>
          </div>
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
                  placeholder="name@nursery.com"
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
      </div>
    </div>
  );
};

export default LoginPage;

