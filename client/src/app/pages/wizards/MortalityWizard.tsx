import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import WizardContainer from '../../components/WizardContainer';
import Stepper from '../../components/Stepper';
import { AlertTriangle, Check } from 'lucide-react';

export const MortalityWizard: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [batchId, setBatchId] = useState<number | null>(null);
  const [mortalityCount, setMortalityCount] = useState(5);
  const [cause, setCause] = useState('Graft union desiccation / dry out');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: batches } = useQuery({
    queryKey: ['active-batches-for-mortality'],
    queryFn: async () => {
      const res = await api.get('/inventory/batches');
      return res.data.batches.filter((b: any) => b.current_quantity > 0 && b.status !== 'QUARANTINED');
    },
  });

  const selectedBatch = batches?.find((b: any) => b.id === batchId);

  const handleSubmit = async () => {
    if (!batchId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/inventory/mortality', {
        batch_id: batchId,
        mortality_count: mortalityCount,
        cause_of_death: cause,
        notes,
      });
      alert(res.data.message);
      navigate('/app/stock');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to record mortality.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <WizardContainer
      title={
        step === 1
          ? 'Step 1: Select Plant Batch'
          : step === 2
          ? 'Step 2: Number of Losses'
          : step === 3
          ? 'Step 3: Primary Cause'
          : 'Step 4: Confirm Deduction'
      }
      step={step}
      totalSteps={4}
      onBack={() => {
        if (step > 1) setStep(step - 1);
        else navigate('/app/add');
      }}
      onNext={() => {
        if (step === 1 && mortalityCount > (selectedBatch?.current_quantity || 1)) {
          setMortalityCount(Math.min(5, selectedBatch?.current_quantity || 1));
        }
        setStep(step + 1);
      }}
      onSubmit={handleSubmit}
      isNextDisabled={step === 1 && !batchId}
      isLoading={loading}
      error={error}
    >
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-xs text-stone-500 mb-2">Tap the batch where mortality was observed:</p>
          {(batches || []).map((b: any) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBatchId(b.id)}
              className={`w-full p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] flex items-center justify-between ${
                batchId === b.id
                  ? 'border-brand-600 bg-brand-50/60 dark:bg-brand-950/40 shadow-sm'
                  : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900'
              }`}
            >
              <div>
                <span className="font-mono text-xs font-bold text-stone-800 dark:text-stone-200 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded">
                  {b.serial_number}
                </span>
                <div className="font-bold text-base text-stone-900 dark:text-stone-100 mt-1">
                  {b.plant_variety}
                </div>
                <div className="text-xs text-stone-500 mt-0.5">
                  Balance: <strong>{b.current_quantity} plants</strong> • Status: {b.status}
                </div>
              </div>
              {batchId === b.id && (
                <div className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 py-4">
          <div className="p-3 bg-stone-100 dark:bg-stone-800 rounded-2xl text-xs text-stone-600 dark:text-stone-300">
            Selected Batch Balance: <strong>{selectedBatch?.current_quantity} plants</strong>.
          </div>
          <Stepper
            value={mortalityCount}
            onChange={setMortalityCount}
            min={1}
            max={selectedBatch?.current_quantity || 100}
            step={1}
            label="Discarded / Dead Plants Count"
          />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 py-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
            Observed Primary Cause
          </label>
          <div className="space-y-2">
            {[
              'Graft union desiccation / dry out',
              'Fungal pathogen / root rot',
              'Stem borer / insect damage',
              'Transplant shock / sunburn',
              'Mechanical breakage during handling',
            ].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCause(option)}
                className={`w-full p-3.5 rounded-2xl border-2 text-left font-bold text-sm active:scale-[0.99] ${
                  cause === option
                    ? 'border-brand-600 bg-brand-50 dark:bg-brand-950 text-brand-900 dark:text-brand-200'
                    : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="pt-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
              Field Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Occurred after intense hot dry spell..."
              className="w-full p-3 rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm"
            />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="p-6 bg-white dark:bg-stone-900 rounded-3xl border-2 border-stone-200 dark:border-stone-800 space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div className="text-center">
            <h3 className="font-serif text-xl font-bold">Confirm Mortality Deduction</h3>
            <p className="text-xs text-stone-500">
              The balance will be deducted immediately in the inventory ledger.
            </p>
          </div>

          <div className="space-y-3 pt-2 text-sm border-t border-stone-100 dark:border-stone-800">
            <div className="flex justify-between">
              <span className="text-stone-500">Batch Code:</span>
              <span className="font-mono font-bold">{selectedBatch?.serial_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Variety:</span>
              <span className="font-bold">{selectedBatch?.plant_variety}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Mortality Losses:</span>
              <span className="font-bold text-rose-700 text-base">-{mortalityCount} units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Remaining Balance:</span>
              <span className="font-bold text-emerald-700 text-base">
                {(selectedBatch?.current_quantity || 0) - mortalityCount} plants
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Cause:</span>
              <span className="font-bold text-xs truncate max-w-xs">{cause}</span>
            </div>
          </div>
        </div>
      )}
    </WizardContainer>
  );
};

export default MortalityWizard;

