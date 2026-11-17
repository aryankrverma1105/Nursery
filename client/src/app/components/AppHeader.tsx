import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { Sprout, Globe, Sun, Moon, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AppHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const { i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language.startsWith('hi') ? 'en' : 'hi');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="md:hidden sticky top-0 z-40 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-4 py-3 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-brand-800 text-white flex items-center justify-center font-bold">
          <Sprout className="w-5 h-5 text-brand-300" />
        </div>
        <div>
          <div className="font-serif font-bold text-base text-stone-900 dark:text-stone-100 leading-tight">
            NurseryOps
          </div>
          <div className="text-[10px] font-bold text-brand-700 dark:text-brand-400 uppercase tracking-wider">
            {user?.role} • {user?.fullName.split(' ')[0]}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleLanguage}
          className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-bold uppercase tracking-wider"
        >
          {i18n.language.startsWith('hi') ? 'EN' : 'हिं'}
        </button>

        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={handleLogout}
          className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export default AppHeader;

