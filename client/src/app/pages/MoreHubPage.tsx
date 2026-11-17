import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import {
  Sprout,
  Activity,
  Layers,
  Scissors,
  HeartPulse,
  CheckCircle2,
  ShoppingBag,
  Search,
  FileText,
  LayoutDashboard,
  Settings,
  Globe,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Image as ImageIcon,
  Users,
  FileSpreadsheet
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

  const workflowItems = [
    { to: '/app/sowing', title: '1. Sowing Registration', desc: 'Rootstock & Scion batch origin', icon: Sprout, color: 'text-emerald-500' },
    { to: '/app/germination', title: '2. Germination Tracking', desc: 'Dated sprout rate observations', icon: Activity, color: 'text-teal-500' },
    { to: '/app/plant-growth', title: '3. Plant Growth', desc: 'Growth readiness & dated loss logs', icon: Layers, color: 'text-lime-500' },
    { to: '/app/grafting', title: '4. Grafting Operations', desc: 'Dual-parent union & deduction', icon: Scissors, color: 'text-amber-500' },
    { to: '/app/curing', title: '5. Curing & Survival', desc: 'Healing & survival rate checkups', icon: HeartPulse, color: 'text-indigo-500' },
    { to: '/app/ready-for-sale', title: '6. Ready for Sale', desc: 'Saleable approved stock balance', icon: CheckCircle2, color: 'text-blue-500' },
    { to: '/app/selling', title: '7. Plant Sales & Billing', desc: 'Issue tax invoices with stock deduction', icon: ShoppingBag, color: 'text-purple-500' },
    { to: '/app/trace', title: '8. Traceability Search', desc: 'Pedigree backtracking to sowing seed', icon: Search, color: 'text-blue-600' },
    { to: '/app/reports', title: '9. Yield & Sales Reports', desc: 'Aggregated farm analytics & exports', icon: FileText, color: 'text-stone-600' },
  ];

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-16">
      <div>
        <h1 className="font-serif text-3xl font-black text-stone-900 dark:text-stone-100">
          Nursery Sections & Hub
        </h1>
        <p className="text-sm font-semibold text-stone-600 dark:text-stone-400 mt-1">
          Access all farm workflow sections, language options and profile
        </p>
      </div>

      {/* User Status Card */}
      <div className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-stone-200 dark:border-stone-800 flex items-center justify-between shadow-sm">
        <div>
          <div className="font-black text-lg text-stone-900 dark:text-stone-100">{user?.fullName}</div>
          <div className="text-sm font-medium text-stone-500">{user?.email}</div>
          <div className="inline-block mt-1.5 text-xs font-black px-3 py-1 rounded-lg bg-brand-100 dark:bg-brand-950 text-brand-800 dark:text-brand-300 uppercase tracking-wider">
            {user?.role} ROLE
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm font-bold text-rose-600 dark:text-rose-400 px-3.5 py-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/60 flex items-center gap-1.5 cursor-pointer border border-rose-200 dark:border-rose-900"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>

      {/* Quick Theme & Language Toggles */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <button
          onClick={toggleLanguage}
          className="p-4 rounded-2xl bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-800 flex items-center justify-center gap-2.5 text-sm font-bold text-stone-800 dark:text-stone-200 hover:border-brand-500 cursor-pointer shadow-xs"
        >
          <Globe className="w-5 h-5 text-brand-600" />
          <span>{i18n.language.startsWith('hi') ? 'Switch to English' : 'हिंदी में बदलें'}</span>
        </button>

        <button
          onClick={toggleTheme}
          className="p-4 rounded-2xl bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-800 flex items-center justify-center gap-2.5 text-sm font-bold text-stone-800 dark:text-stone-200 hover:border-brand-500 cursor-pointer shadow-xs"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-stone-600" />}
          <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
        </button>
      </div>

      {/* Farm Workflow List */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 overflow-hidden divide-y divide-stone-100 dark:divide-stone-800 shadow-sm">
        <div className="p-4 bg-stone-50 dark:bg-stone-850 text-xs font-black text-stone-500 dark:text-stone-400 uppercase tracking-wider">
          Complete Operational Workflow
        </div>

        {workflowItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="p-4 sm:p-5 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-850 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center flex-shrink-0">
                  <Icon className={`w-6 h-6 stroke-[2.2] ${item.color}`} />
                </div>
                <div>
                  <div className="font-bold text-base text-stone-900 dark:text-stone-100">{item.title}</div>
                  <div className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 font-medium mt-0.5">{item.desc}</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-stone-400" />
            </Link>
          );
        })}
      </div>

      {/* Admin CMS Links */}
      {isAdmin && (
        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 overflow-hidden divide-y divide-stone-100 dark:divide-stone-800 shadow-sm">
          <div className="p-4 bg-stone-50 dark:bg-stone-850 text-xs font-black text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            Website & CMS Administration
          </div>

          <Link
            to="/app/cms/sections"
            className="p-4 sm:p-5 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-850"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950 flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
              <span className="font-bold text-base text-stone-900 dark:text-stone-100">Homepage Sections</span>
            </div>
            <ChevronRight className="w-5 h-5 text-stone-400" />
          </Link>

          <Link
            to="/app/cms/products"
            className="p-4 sm:p-5 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-850"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
              <span className="font-bold text-base text-stone-900 dark:text-stone-100">Catalogue Products</span>
            </div>
            <ChevronRight className="w-5 h-5 text-stone-400" />
          </Link>

          <Link
            to="/app/cms/gallery"
            className="p-4 sm:p-5 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-850"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
              <span className="font-bold text-base text-stone-900 dark:text-stone-100">Gallery Media</span>
            </div>
            <ChevronRight className="w-5 h-5 text-stone-400" />
          </Link>

          <Link
            to="/app/cms/settings"
            className="p-4 sm:p-5 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-850"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950 flex items-center justify-center">
                <Settings className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
              <span className="font-bold text-base text-stone-900 dark:text-stone-100">Branding & ID Settings</span>
            </div>
            <ChevronRight className="w-5 h-5 text-stone-400" />
          </Link>
        </div>
      )}
    </div>
  );
};

export default MoreHubPage;
