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
    <header className="md:hidden sticky top-0 z-40 bg-white dark:bg-stone-900 border-b-2 border-stone-200 dark:border-stone-800 px-4 py-3.5 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <img
          src="/logo/deep-root-farms-mark.svg"
          alt="Deep Root Farms"
          className="w-10 h-10 rounded-xl object-contain shadow-sm"
        />
        <div>
          <div className="font-serif font-black text-lg text-stone-900 dark:text-stone-100 leading-tight">
            Deep Root Farms
          </div>
          <div className="text-xs font-black text-brand-700 dark:text-brand-400 uppercase tracking-wider">
            {user?.role} • {user?.fullName.split(' ')[0]}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          onClick={toggleLanguage}
          className="px-3 py-1.5 rounded-xl border-2 border-stone-300 dark:border-stone-700 text-xs sm:text-sm font-black uppercase tracking-wider hover:bg-stone-100 dark:hover:bg-stone-800"
        >
          {i18n.language.startsWith('hi') ? 'EN' : 'हिं'}
        </button>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400 stroke-[2.2]" /> : <Moon className="w-5 h-5 stroke-[2.2]" />}
        </button>

        <button
          onClick={handleLogout}
          className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50"
          title="Logout"
        >
          <LogOut className="w-5 h-5 stroke-[2.2]" />
        </button>
      </div>
    </header>
  );
};

export default AppHeader;

