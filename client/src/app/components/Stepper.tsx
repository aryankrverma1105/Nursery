import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface StepperProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  value,
  onChange,
  min = 1,
  max = 100000,
  step = 1,
  label = 'Quantity',
}) => {
  const increment = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {label && (
        <div className="text-sm font-bold text-stone-700 dark:text-stone-300">
          {label}
        </div>
      )}

      {/* Main +/- Stepper */}
      <div className="flex items-center justify-between gap-3 bg-stone-100 dark:bg-stone-850 p-2 rounded-2xl border-2 border-stone-300 dark:border-stone-700">
        <button
          type="button"
          onClick={() => increment(-step)}
          disabled={value <= min}
          aria-label="Decrease quantity"
          className="w-16 h-16 rounded-xl bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 flex items-center justify-center shadow-md active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-2xl font-bold"
        >
          <Minus className="w-8 h-8 stroke-[3]" />
        </button>

        <div className="flex-1 text-center">
          <input
            type="number"
            min={min}
            max={max}
            value={value}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) onChange(Math.max(min, Math.min(max, val)));
            }}
            className="w-full text-center font-bold text-3xl sm:text-4xl bg-transparent text-stone-900 dark:text-stone-100 focus:outline-none"
          />
          <div className="text-xs text-stone-500 uppercase tracking-wider font-semibold">plants / units</div>
        </div>

        <button
          type="button"
          onClick={() => increment(step)}
          disabled={value >= max}
          aria-label="Increase quantity"
          className="w-16 h-16 rounded-xl bg-brand-800 text-white flex items-center justify-center shadow-md active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-2xl font-bold"
        >
          <Plus className="w-8 h-8 stroke-[3]" />
        </button>
      </div>

      {/* Quick Tap Boosters for Large Batches (+10, +50, +100) */}
      <div className="grid grid-cols-4 gap-2 pt-1">
        {[5, 10, 50, 100].map((delta) => (
          <button
            key={delta}
            type="button"
            onClick={() => increment(delta)}
            className="py-3 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 text-sm font-bold active:scale-95 transition-transform"
          >
            +{delta}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Stepper;

