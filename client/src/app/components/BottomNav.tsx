import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Sprout, Scissors, MoreHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const BottomNav: React.FC = () => {
  const { t } = useTranslation();

  const items = [
    { to: '/app', label: t('appNav.home', 'Home'), icon: <Home className="w-5 h-5 stroke-[2.2]" />, end: true },
    { to: '/app/sowing', label: t('workflow.sowing', 'Sowing'), icon: <Sprout className="w-5 h-5 stroke-[2.2]" />, end: false },
    { to: '/app/grafting', label: t('workflow.grafting', 'Grafting'), icon: <Scissors className="w-5 h-5 stroke-[2.2]" />, end: false },
    { to: '/app/more', label: t('appNav.more', 'More'), icon: <MoreHorizontal className="w-5 h-5 stroke-[2.2]" />, end: false },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 pb-safe">
      <div className="grid grid-cols-4 h-16">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `min-h-[52px] flex flex-col items-center justify-center gap-1 font-bold text-[11px] transition-colors ${
                isActive
                  ? 'text-brand-800 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-950/40'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-800'
              }`
            }
          >
            {item.icon}
            <span className="tracking-tight truncate px-1">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
