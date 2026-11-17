import React from 'react';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface WizardContainerProps {
  title: string;
  step: number;
  totalSteps: number;
  onBack: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  nextLabel?: string;
  isNextDisabled?: boolean;
  isLoading?: boolean;
  error?: string;
  children: React.ReactNode;
}

export const WizardContainer: React.FC<WizardContainerProps> = ({
  title,
  step,
  totalSteps,
  onBack,
  onNext,
  onSubmit,
  nextLabel = 'Next Step',
  isNextDisabled = false,
  isLoading = false,
  error,
  children,
}) => {
  const { t } = useTranslation();
  const progressPercent = Math.round((step / totalSteps) * 100);

  return (
    <div className="max-w-md mx-auto min-h-[80vh] flex flex-col justify-between py-4 px-3 sm:px-0">
      {/* Top Header: Back & Step Indicator */}
      <div className="space-y-3 pb-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-stone-700 dark:text-stone-300 font-bold p-2 -ml-2 rounded-xl active:bg-stone-100 dark:active:bg-stone-800"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            <span className="text-sm">{t('common.back')}</span>
          </button>

          <div className="text-xs font-bold uppercase tracking-wider text-stone-500">
            {t('wizards.step')} {step} {t('wizards.of')} {totalSteps}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-stone-200 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-brand-600 h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <h1 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100 pt-1">
          {title}
        </h1>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-rose-100 dark:bg-rose-950/70 border-2 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-sm font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Wizard Step Content */}
      <div className="flex-1 py-2">{children}</div>

      {/* Bottom Action Button (Minimum 56px touch target) */}
      <div className="pt-6 pb-2">
        {step < totalSteps ? (
          <button
            type="button"
            onClick={onNext}
            disabled={isNextDisabled || isLoading}
            className="w-full min-h-[56px] bg-brand-800 hover:bg-brand-900 active:scale-[0.98] text-white font-bold text-lg rounded-2xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none transition-all"
          >
            <span>{nextLabel}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={isNextDisabled || isLoading}
            className="w-full min-h-[56px] bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-bold text-lg rounded-2xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none transition-all"
          >
            <Check className="w-6 h-6 stroke-[3]" />
            <span>{isLoading ? 'Saving...' : 'Confirm & Save to Nursery Ledger'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default WizardContainer;

