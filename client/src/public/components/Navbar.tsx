import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Sprout, Sun, Moon, Menu, X, Globe, LogIn, LayoutDashboard } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleLanguage = () => {
    const nextLng = i18n.language.startsWith('hi') ? 'en' : 'hi';
    i18n.changeLanguage(nextLng);
  };

  const navLinks = [
    { to: '/', label: t('nav.home') },
    { to: '/about', label: t('nav.about') },
    { to: '/products', label: t('nav.products') },
    { to: '/gallery', label: t('nav.gallery') },
    { to: '/contact', label: t('nav.contact') },
  ];

  return (
    <header className="sticky top-0 z-50 bg-earth-50/90 dark:bg-stone-950/90 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-brand-500 rounded-lg p-1">
            <img
              src="/logo/deep-root-farms-mark.svg"
              alt="Deep Root Farms"
              className="w-12 h-12 rounded-xl object-contain shadow-md group-hover:scale-105 transition-transform"
            />
            <div>
              <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-brand-950 dark:text-stone-100 block">
                Deep Root Farms
              </span>
              <span className="text-[10px] tracking-widest uppercase font-semibold text-brand-600 dark:text-brand-400 block -mt-1">
                Horticultural Nursery <span className="text-amber-600 dark:text-amber-400 font-bold">[SAMPLE DATA]</span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`text-sm font-medium tracking-wide transition-colors relative py-1 ${
                    isActive
                      ? 'text-brand-800 dark:text-brand-300 font-semibold'
                      : 'text-stone-600 dark:text-stone-400 hover:text-brand-700 dark:hover:text-stone-200'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-600 dark:bg-brand-400 rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Controls: Theme, Language, ONE Login button */}
          <div className="hidden md:flex items-center gap-4">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-850 text-stone-700 dark:text-stone-300 transition-colors"
              title="Toggle English / Hindi"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{i18n.language.startsWith('hi') ? 'English' : 'हिंदी'}</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-850 transition-colors"
              title="Toggle Light/Dark Theme"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-brand-800" />}
            </button>

            {/* ONE Login / Portal Button */}
            {user ? (
              <Link
                to="/app"
                className="flex items-center gap-2 bg-brand-800 hover:bg-brand-900 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-transform active:scale-95"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Nursery Portal</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-transform active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                <span>{t('nav.login')}</span>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 text-stone-600 dark:text-stone-300"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-stone-700 dark:text-stone-200 focus:outline-none"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 dark:border-stone-800 bg-earth-50 dark:bg-stone-950 px-4 pt-3 pb-6 space-y-3">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-base font-medium text-stone-700 dark:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 text-sm font-semibold text-stone-600 dark:text-stone-300"
            >
              <Globe className="w-4 h-4" />
              <span>{i18n.language.startsWith('hi') ? 'Switch to English' : 'हिंदी में बदलें'}</span>
            </button>

            {user ? (
              <Link
                to="/app"
                onClick={() => setMobileMenuOpen(false)}
                className="bg-brand-800 text-white text-sm font-semibold px-4 py-2 rounded-lg"
              >
                Portal
              </Link>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-sm font-semibold px-4 py-2 rounded-lg"
              >
                {t('nav.login')}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;

