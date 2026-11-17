import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import {
  QrCode,
  ShoppingCart,
  Download,
  LayoutDashboard,
  Settings,
  Globe,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  ShieldCheck,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';

export const MoreHubPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language.startsWith('hi') ? 'en' : 'hi');
  };

  const isAdmin = user?.role === 'ADMIN';
  const isSupervisor = user?.role === 'SUPERVISOR' || isAdmin;

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-12">
      <div>
        <h1 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
          More Operations
        </h1>
        <p className="text-xs text-stone-500">Traceability, reports, settings and system profile</p>
      </div>

      {/* User Status Card */}
      <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 flex items-center justify-between shadow-xs">
        <div>
          <div className="font-bold text-base text-stone-900 dark:text-stone-100">{user?.fullName}</div>
          <div className="text-xs text-stone-500">{user?.email}</div>
          <div className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-brand-100 dark:bg-brand-950 text-brand-800 dark:text-brand-300 uppercase">
            {user?.role} ROLE
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs font-bold text-rose-600 dark:text-rose-400 p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 flex items-center gap-1"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>

      {/* Quick Links List */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 overflow-hidden divide-y divide-stone-100 dark:divide-stone-800 shadow-xs">
        <Link
          to="/app/trace"
          className="p-4 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-850"
        >
          <div className="flex items-center gap-3">
            <QrCode className="w-5 h-5 text-brand-600" />
            <span className="font-bold text-sm text-stone-800 dark:text-stone-200">
              Traceability & Code Lookup
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-400" />
        </Link>

        {isSupervisor && (
          <Link
            to="/app/sales"
            className="p-4 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-850"
          >
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              <span className="font-bold text-sm text-stone-800 dark:text-stone-200">
                Sales & Tax Invoices
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400" />
          </Link>
        )}

        {isSupervisor && (
          <a
            href="/api/reports/export?type=inventory"
            download
            className="p-4 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-850"
          >
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-emerald-600" />
              <span className="font-bold text-sm text-stone-800 dark:text-stone-200">
                Export Inventory CSV
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400" />
          </a>
        )}

        {isAdmin && (
          <>
            <Link
              to="/app/cms/sections"
              className="p-4 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-850"
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className="w-5 h-5 text-purple-600" />
                <span className="font-bold text-sm text-stone-800 dark:text-stone-200">
                  Homepage Section Editor (CMS)
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </Link>

            <Link
              to="/app/cms/gallery"
              className="p-4 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-850"
            >
              <div className="flex items-center gap-3">
                <ImageIcon className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-sm text-stone-800 dark:text-stone-200">
                  Farm Gallery Manager (Photos)
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </Link>

            <Link
              to="/app/cms/products"
              className="p-4 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-850"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span className="font-bold text-sm text-stone-800 dark:text-stone-200">
                  Catalogue Product Manager
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </Link>

            <Link
              to="/app/cms/settings"
              className="p-4 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-850"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-stone-600" />
                <span className="font-bold text-sm text-stone-800 dark:text-stone-200">
                  Website & Identifier Settings
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </Link>

            <Link
              to="/app/cms/audit"
              className="p-4 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-850"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                <span className="font-bold text-sm text-stone-800 dark:text-stone-200">
                  Audit Logs Viewer
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </Link>
          </>
        )}
      </div>

      {/* Device & Language Settings */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-4 border border-stone-200 dark:border-stone-800 space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-stone-500">
          Preferences
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-stone-800 dark:text-stone-200">
            <Globe className="w-4 h-4 text-brand-600" />
            <span>Language / भाषा</span>
          </div>
          <button
            onClick={toggleLanguage}
            className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-bold"
          >
            {i18n.language.startsWith('hi') ? 'Switch to English' : 'हिंदी में बदलें'}
          </button>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2 text-sm font-bold text-stone-800 dark:text-stone-200">
            {theme === 'dark' ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
            <span>Color Theme</span>
          </div>
          <button
            onClick={toggleTheme}
            className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-bold"
          >
            {theme === 'dark' ? 'Dark Theme' : 'Light Theme'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoreHubPage;

