import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout, GitBranch, AlertTriangle, TrendingUp, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AddHubPage: React.FC = () => {
  const { user } = useAuth();
  const isSupervisor = user?.role === 'SUPERVISOR' || user?.role === 'ADMIN';

  const wizards = [
    {
      to: '/app/wizard/sowing',
      title: '1. Record Sowing',
      subtitle: 'Sow new seeds to create Rootstock batch',
      icon: <Sprout className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />,
      bg: 'border-emerald-200 dark:border-emerald-900',
    },
    {
      to: '/app/wizard/scion',
      title: '2. Harvest Scion Cuttings',
      subtitle: 'Harvest budwood from verified Mother Tree',
      icon: <Sparkles className="w-8 h-8 text-amber-600 dark:text-amber-400" />,
      bg: 'border-amber-200 dark:border-amber-900',
    },
    {
      to: '/app/wizard/grafting',
      title: '3. Record Grafting',
      subtitle: 'Join rootstock + scion into Grafted batch',
      icon: <GitBranch className="w-8 h-8 text-brand-600 dark:text-brand-400" />,
      bg: 'border-brand-200 dark:border-brand-900',
    },
    {
      to: '/app/wizard/mortality',
      title: '4. Log Mortality / Curing Loss',
      subtitle: 'Deduct dead or desiccated grafts from balance',
      icon: <AlertTriangle className="w-8 h-8 text-rose-600 dark:text-rose-400" />,
      bg: 'border-rose-200 dark:border-rose-900',
    },
    {
      to: '/app/wizard/promote',
      title: '5. Promote to Ready-for-Sale',
      subtitle: 'Move healed 21-day cured grafts to dispatch yard',
      icon: <CheckCircle2 className="w-8 h-8 text-teal-600 dark:text-teal-400" />,
      bg: 'border-teal-200 dark:border-teal-900',
    },
  ];

  if (isSupervisor) {
    wizards.push({
      to: '/app/wizard/sale',
      title: '6. Record Plant Sale & Invoice',
      subtitle: 'Issue plants to buyer and record offline payment note',
      icon: <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />,
      bg: 'border-blue-200 dark:border-blue-900',
    });
  }

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-12">
      <div>
        <h1 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
          Record Field Operations
        </h1>
        <p className="text-xs text-stone-500">
          Choose a wizard step to enter authenticated nursery movements.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {wizards.map((wiz, idx) => (
          <Link
            key={idx}
            to={wiz.to}
            className={`min-h-[84px] bg-white dark:bg-stone-900 p-5 rounded-3xl border-2 shadow-xs hover:shadow-md transition-all active:scale-[0.99] flex items-center gap-4 ${wiz.bg}`}
          >
            <div className="w-14 h-14 rounded-2xl bg-stone-50 dark:bg-stone-800 flex items-center justify-center shrink-0 shadow-inner">
              {wiz.icon}
            </div>
            <div>
              <div className="font-bold text-base text-stone-900 dark:text-stone-100">
                {wiz.title}
              </div>
              <div className="text-xs text-stone-500 mt-0.5">{wiz.subtitle}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AddHubPage;

