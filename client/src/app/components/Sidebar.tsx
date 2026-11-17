import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import {
  Home,
  PlusCircle,
  Package,
  ShoppingCart,
  QrCode,
  LayoutDashboard,
  Settings,
  LogOut,
  Globe,
  Sun,
  Moon,
  ShieldAlert,
  Sprout,
  Users,
  FileSpreadsheet,
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

  return (
    <aside className="hidden md:flex flex-col w-64 bg-stone-900 text-stone-200 border-r border-stone-800 h-screen sticky top-0 p-4 justify-between">
      <div className="space-y-6">
        {/* App Portal Brand */}
        <Link to="/app" className="flex items-center gap-3 px-2 py-2">
          <div className="w-10 h-10 rounded-xl bg-brand-700 text-white flex items-center justify-center font-bold">
            <Sprout className="w-6 h-6 text-brand-300" />
          </div>
          <div>
            <div className="font-serif font-bold text-lg text-white">Nursery Portal</div>
            <div className="text-[10px] font-bold text-brand-400 uppercase tracking-wider">
              {user?.role} ACCESS
            </div>
          </div>
        </Link>

        {/* Navigation Section */}
        <nav className="space-y-1">
          <NavLink
            to="/app"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                isActive ? 'bg-brand-800 text-white shadow-sm' : 'hover:bg-stone-800 text-stone-300'
              }`
            }
          >
            <Home className="w-5 h-5 text-brand-400" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/app/add"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                isActive ? 'bg-brand-800 text-white shadow-sm' : 'hover:bg-stone-800 text-stone-300'
              }`
            }
          >
            <PlusCircle className="w-5 h-5 text-brand-400" />
            <span>Record Operations</span>
          </NavLink>

          <NavLink
            to="/app/stock"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                isActive ? 'bg-brand-800 text-white shadow-sm' : 'hover:bg-stone-800 text-stone-300'
              }`
            }
          >
            <Package className="w-5 h-5 text-brand-400" />
            <span>Stock Inventory</span>
          </NavLink>

          {isSupervisor && (
            <NavLink
              to="/app/sales"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isActive ? 'bg-brand-800 text-white shadow-sm' : 'hover:bg-stone-800 text-stone-300'
                }`
              }
            >
              <ShoppingCart className="w-5 h-5 text-brand-400" />
              <span>Plant Sales</span>
            </NavLink>
          )}

          <NavLink
            to="/app/trace"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                isActive ? 'bg-brand-800 text-white shadow-sm' : 'hover:bg-stone-800 text-stone-300'
              }`
            }
          >
            <QrCode className="w-5 h-5 text-brand-400" />
            <span>Traceability / Lookup</span>
          </NavLink>

          {/* CMS Admin Section */}
          {isAdmin && (
            <div className="pt-4 mt-4 border-t border-stone-800 space-y-1">
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                Website Management
              </div>

              <NavLink
                to="/app/cms/sections"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    isActive ? 'bg-brand-800 text-white' : 'hover:bg-stone-800 text-stone-300'
                  }`
                }
              >
                <LayoutDashboard className="w-4 h-4 text-brand-400" />
                <span>Homepage Editor</span>
              </NavLink>

              <NavLink
                to="/app/cms/products"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    isActive ? 'bg-brand-800 text-white' : 'hover:bg-stone-800 text-stone-300'
                  }`
                }
              >
                <FileSpreadsheet className="w-4 h-4 text-brand-400" />
                <span>Catalogue Manager</span>
              </NavLink>

              <NavLink
                to="/app/cms/banners"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    isActive ? 'bg-brand-800 text-white' : 'hover:bg-stone-800 text-stone-300'
                  }`
                }
              >
                <ShieldAlert className="w-4 h-4 text-brand-400" />
                <span>Banners & Offers</span>
              </NavLink>

              <NavLink
                to="/app/cms/enquiries"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    isActive ? 'bg-brand-800 text-white' : 'hover:bg-stone-800 text-stone-300'
                  }`
                }
              >
                <Users className="w-4 h-4 text-brand-400" />
                <span>Customer Inquiries</span>
              </NavLink>

              <NavLink
                to="/app/cms/settings"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    isActive ? 'bg-brand-800 text-white' : 'hover:bg-stone-800 text-stone-300'
                  }`
                }
              >
                <Settings className="w-4 h-4 text-brand-400" />
                <span>Site & ID Settings</span>
              </NavLink>
            </div>
          )}
        </nav>
      </div>

      {/* Footer Controls: Language, Theme, User, Logout */}
      <div className="pt-4 border-t border-stone-800 space-y-3">
        <div className="flex items-center justify-between px-2 text-xs">
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 font-bold uppercase hover:text-white text-stone-400"
          >
            <Globe className="w-4 h-4" />
            <span>{i18n.language.startsWith('hi') ? 'English' : 'हिंदी'}</span>
          </button>

          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        <div className="bg-stone-850 p-2.5 rounded-xl flex items-center justify-between">
          <div className="truncate pr-2">
            <div className="text-xs font-bold text-white truncate">{user?.fullName}</div>
            <div className="text-[10px] text-stone-400 truncate">{user?.email}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 rounded-lg text-rose-400 hover:bg-stone-800"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

