import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, Clock, ShieldAlert, Sparkles } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const norm = (status || '').toUpperCase();

  let config = {
    bg: 'bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700',
    icon: <Clock className="w-4 h-4" />,
    label: status,
  };

  if (norm === 'READY' || norm === 'ACTIVE' || norm === 'CONFIRMED' || norm === 'DELIVERED' || norm === 'PAID') {
    config = {
      bg: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />,
      label: norm === 'READY' ? 'Ready for Sale' : norm === 'ACTIVE' ? 'Active' : norm === 'CONFIRMED' ? 'Confirmed' : norm === 'DELIVERED' ? 'Delivered' : 'Paid',
    };
  } else if (norm === 'CURING' || norm === 'PENDING' || norm === 'PARTIAL' || norm === 'IN_PROGRESS') {
    config = {
      bg: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800',
      icon: <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400" />,
      label: norm === 'CURING' ? 'In Curing (21d)' : norm === 'PENDING' ? 'Pending' : norm === 'PARTIAL' ? 'Partial Payment' : 'In Progress',
    };
  } else if (norm === 'QUARANTINED' || norm === 'SOLD_OUT' || norm === 'CANCELLED' || norm === 'SPAM') {
    config = {
      bg: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800',
      icon: <ShieldAlert className="w-4 h-4 text-rose-700 dark:text-rose-400" />,
      label: norm === 'QUARANTINED' ? 'Quarantined (Blocked)' : norm === 'SOLD_OUT' ? 'Sold Out' : 'Cancelled',
    };
  }

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs gap-1'
      : size === 'lg'
      ? 'px-4 py-2 text-base gap-2 font-bold'
      : 'px-2.5 py-1 text-xs gap-1.5 font-semibold';

  return (
    <span
      className={`inline-flex items-center rounded-lg border font-medium ${config.bg} ${sizeClasses}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};

export default StatusBadge;

