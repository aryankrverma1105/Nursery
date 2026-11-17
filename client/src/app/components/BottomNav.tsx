import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, PlusCircle, Package, MoreHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const BottomNav: React.FC = () => {
  const { t } = useTranslation();

  const items = [
    { to: '/app', label: t('appNav.home'), icon: <Home className="w-6 h-6 stroke-[2.2]" />, end: true },
    { to: '/app/add', label: t('appNav.add'), icon: <PlusCircle className="w-6 h-6 stroke-[2.2]" />, end: false },
    { to: '/app/stock', label: t('appNav.stock'), icon: <Package className="w-6 h-6 stroke-[2.2]" />, end: false },
    { to: '/app/more', label: t('appNav.more'), icon: <MoreHorizontal className="w-6 h-6 stroke-[2.2]" />, end: false },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t-2 border-stone-200 dark:border-stone-800 pb-safe">
      <div className="grid grid-cols-4 h-18">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `min-h-[56px] flex flex-col items-center justify-center gap-1 font-bold text-xs transition-colors ${
                isActive
                  ? 'text-brand-800 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-950/40'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-800'
              }`
            }
          >
            {item.icon}
            <span className="tracking-tight">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;

