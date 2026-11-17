import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import {
  Home,
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
  LogOut,
  Globe,
  Sun,
  Moon,
  ShieldAlert,
  Users,
  FileSpreadsheet,
  Image as ImageIcon
} from 'lucide-react';

export const Sidebar: React.FC = () => {
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

  const navItems = [
    { to: '/app', label: t('workflow.dashboard', '1. Dashboard'), icon: Home, end: true },
    { to: '/app/sowing', label: t('workflow.sowing', '2. Sowing'), icon: Sprout },
    { to: '/app/germination', label: t('workflow.germination', '3. Germination'), icon: Activity },
    { to: '/app/plant-growth', label: t('workflow.plantGrowth', '4. Plant Growth'), icon: Layers },
    { to: '/app/grafting', label: t('workflow.grafting', '5. Grafting'), icon: Scissors },
    { to: '/app/curing', label: t('workflow.curing', '6. Curing / Survival'), icon: HeartPulse },
    { to: '/app/ready-for-sale', label: t('workflow.readyForSale', '7. Ready for Sale'), icon: CheckCircle2 },
    { to: '/app/selling', label: t('workflow.selling', '8. Selling'), icon: ShoppingBag },
    { to: '/app/trace', label: t('workflow.traceability', '9. Traceability'), icon: Search },
    { to: '/app/reports', label: t('workflow.reports', '10. Reports'), icon: FileText },
  ];

  return (
    <aside className="hidden md:flex flex-col w-72 bg-stone-900 text-stone-200 border-r border-stone-800 h-screen sticky top-0 p-4 justify-between overflow-y-auto">
      <div className="space-y-4">
        {/* App Portal Brand */}
        <Link to="/app" className="flex items-center gap-3 px-2 py-2">
          <div className="w-11 h-11 rounded-2xl bg-brand-700 text-white flex items-center justify-center font-black shadow-md">
            <Sprout className="w-7 h-7 text-brand-300" />
          </div>
          <div>
            <div className="font-serif font-black text-lg text-white tracking-tight">Deep Root Farms</div>
            <div className="text-xs font-black text-brand-400 uppercase tracking-wider">
              {user?.role} PORTAL
            </div>
          </div>
        </Link>

        {/* 10 Operational Navigation Sections */}
        <nav className="space-y-1.5">
          <div className="px-3 text-xs font-black uppercase tracking-wider text-stone-400 mb-1.5">
            Farm Workflow (10 Steps)
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-brand-800 text-white shadow-sm'
                      : 'hover:bg-stone-800 text-stone-300 hover:text-white'
                  }`
                }
              >
                <Icon className="w-5 h-5 text-brand-400 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}

          {/* CMS Admin Section */}
          {isAdmin && (
            <div className="pt-3 mt-3 border-t border-stone-800 space-y-1.5">
              <div className="px-3 text-xs font-black uppercase tracking-wider text-stone-400 mb-1.5">
                Admin Website CMS
              </div>

              <NavLink
                to="/app/cms/sections"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-bold transition-colors ${
                    isActive ? 'bg-brand-800 text-white' : 'hover:bg-stone-800 text-stone-300'
                  }`
                }
              >
                <LayoutDashboard className="w-5 h-5 text-brand-400" />
                <span>Homepage Editor</span>
              </NavLink>

              <NavLink
                to="/app/cms/products"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-bold transition-colors ${
                    isActive ? 'bg-brand-800 text-white' : 'hover:bg-stone-800 text-stone-300'
                  }`
                }
              >
                <FileSpreadsheet className="w-5 h-5 text-brand-400" />
                <span>Catalogue Manager</span>
              </NavLink>

              <NavLink
                to="/app/cms/banners"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-bold transition-colors ${
                    isActive ? 'bg-brand-800 text-white' : 'hover:bg-stone-800 text-stone-300'
                  }`
                }
              >
                <ShieldAlert className="w-5 h-5 text-brand-400" />
                <span>Banners & Offers</span>
              </NavLink>

              <NavLink
                to="/app/cms/gallery"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-bold transition-colors ${
                    isActive ? 'bg-brand-800 text-white' : 'hover:bg-stone-800 text-stone-300'
                  }`
                }
              >
                <ImageIcon className="w-5 h-5 text-brand-400" />
                <span>Gallery Manager</span>
              </NavLink>

              <NavLink
                to="/app/cms/enquiries"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-bold transition-colors ${
                    isActive ? 'bg-brand-800 text-white' : 'hover:bg-stone-800 text-stone-300'
                  }`
                }
              >
                <Users className="w-5 h-5 text-brand-400" />
                <span>Customer Inquiries</span>
              </NavLink>

              <NavLink
                to="/app/cms/settings"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-bold transition-colors ${
                    isActive ? 'bg-brand-800 text-white' : 'hover:bg-stone-800 text-stone-300'
                  }`
                }
              >
                <Settings className="w-5 h-5 text-brand-400" />
                <span>Site & ID Settings</span>
              </NavLink>
            </div>
          )}
        </nav>
      </div>

      {/* Footer Controls: Language, Theme, User, Logout */}
      <div className="pt-3 border-t border-stone-800 space-y-2 mt-4">
        <div className="flex items-center justify-between px-2 text-sm">
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 font-bold uppercase hover:text-white text-stone-300 cursor-pointer"
          >
            <Globe className="w-4 h-4" />
            <span>{i18n.language.startsWith('hi') ? 'English' : 'हिंदी'}</span>
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-stone-800 text-stone-300 hover:text-white cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <div className="bg-stone-850 p-3 rounded-2xl flex items-center justify-between">
          <div className="truncate pr-2">
            <div className="text-sm font-bold text-white truncate">{user?.fullName}</div>
            <div className="text-xs text-stone-400 truncate">{user?.email}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-2 rounded-xl text-rose-400 hover:bg-stone-800 cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
