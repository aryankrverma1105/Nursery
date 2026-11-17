import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import WizardContainer from '../../components/WizardContainer';
import Stepper from '../../components/Stepper';
import { CheckCircle2, Check } from 'lucide-react';

export const PromoteWizard: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [graftedId, setGraftedId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(25);
  const [location, setLocation] = useState('Dispatch Yard Bed 1');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: batches } = useQuery({
    queryKey: ['grafted-batches-to-promote'],
    queryFn: async () => {
      const res = await api.get('/inventory/batches?type=GRAFTED');
      return res.data.batches.filter((b: any) => b.current_quantity > 0 && b.status !== 'QUARANTINED');
    },
  });

  const selectedBatch = batches?.find((b: any) => b.id === graftedId);

  const handleSubmit = async () => {
    if (!graftedId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/inventory/promote-ready', {
        grafted_batch_id: graftedId,
        quantity,
        location,
        notes,
      });
      alert(res.data.message);
      navigate('/app/stock');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to promote batch.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <WizardContainer
      title={
        step === 1
          ? 'Step 1: Pick Cured Graft Batch'
          : step === 2
          ? 'Step 2: Number of Hardened Plants'
          : step === 3
          ? 'Step 3: Dispatch Yard Location'
          : 'Step 4: Confirm Promotion'
      }
      step={step}
      totalSteps={4}
      onBack={() => {
        if (step > 1) setStep(step - 1);
        else navigate('/app/add');
      }}
      onNext={() => {
        if (step === 1 && quantity > (selectedBatch?.current_quantity || 1)) {
          setQuantity(selectedBatch?.current_quantity || 1);
        }
        setStep(step + 1);
      }}
      onSubmit={handleSubmit}
      isNextDisabled={step === 1 && !graftedId}
      isLoading={loading}
      error={error}
    >
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-xs text-stone-500 mb-2">Tap a grafted batch that has cured and hardened:</p>
          {(batches || []).map((b: any) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setGraftedId(b.id)}
              className={`w-full p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] flex items-center justify-between ${
                graftedId === b.id
                  ? 'border-brand-600 bg-brand-50/60 dark:bg-brand-950/40 shadow-sm'
                  : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900'
              }`}
            >
              <div>
                <span className="font-mono text-xs font-bold text-teal-700 bg-teal-100 dark:bg-teal-950 px-2 py-0.5 rounded">
                  {b.serial_number}
                </span>
                <div className="font-bold text-base text-stone-900 dark:text-stone-100 mt-1">
                  {b.plant_variety}
                </div>
                <div className="text-xs text-stone-500 mt-0.5">
                  Available in Curing: <strong>{b.current_quantity} plants</strong>
                </div>
              </div>
              {graftedId === b.id && (
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
            Available in {selectedBatch?.serial_number}: <strong>{selectedBatch?.current_quantity} plants</strong>.
          </div>
          <Stepper
            value={quantity}
            onChange={setQuantity}
            min={1}
            max={selectedBatch?.current_quantity || 100}
            step={10}
            label="Plants Ready for Dispatch"
          />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 py-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
              Dispatch Yard Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full p-3.5 rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-base font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
              Acclimatization Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 30 days sun hardened, vigorous terminal flush"
              className="w-full p-3 rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm"
            />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="p-6 bg-white dark:bg-stone-900 rounded-3xl border-2 border-stone-200 dark:border-stone-800 space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div className="text-center">
            <h3 className="font-serif text-xl font-bold">Confirm Ready for Sale</h3>
            <p className="text-xs text-stone-500">
              A new RFS batch will be created and made eligible for commercial sale and catalogue availability.
            </p>
          </div>

          <div className="space-y-3 pt-2 text-sm border-t border-stone-100 dark:border-stone-800">
            <div className="flex justify-between">
              <span className="text-stone-500">Source Graft Batch:</span>
              <span className="font-mono font-bold">{selectedBatch?.serial_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Variety:</span>
              <span className="font-bold">{selectedBatch?.plant_variety}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Promoted Quantity:</span>
              <span className="font-bold text-teal-700 text-base">{quantity} plants</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Dispatch Location:</span>
              <span className="font-bold">{location}</span>
            </div>
          </div>
        </div>
      )}
    </WizardContainer>
  );
};

export default PromoteWizard;

