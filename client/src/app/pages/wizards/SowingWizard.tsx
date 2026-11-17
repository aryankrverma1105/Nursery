import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import WizardContainer from '../../components/WizardContainer';
import Stepper from '../../components/Stepper';
import { Check, Sprout } from 'lucide-react';

export const SowingWizard: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [seedLotId, setSeedLotId] = useState<number | null>(null);
  const [seedsSown, setSeedsSown] = useState(100);
  const [sowingDate, setSowingDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('Poly-tunnel Rootstock Bed 1');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: seedLots } = useQuery({
    queryKey: ['seed-lots'],
    queryFn: async () => {
      const res = await api.get('/inventory/seed-lots');
      return res.data.seedLots;
    },
  });

  const selectedLot = seedLots?.find((l: any) => l.id === seedLotId);

  const handleSubmit = async () => {
    if (!seedLotId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/inventory/sowing', {
        seed_lot_id: seedLotId,
        seeds_sown: seedsSown,
        sowing_date: sowingDate,
        location,
        notes,
      });
      alert(res.data.message);
      navigate('/app/stock');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to record sowing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <WizardContainer
      title={
        step === 1
          ? 'Select Certified Seed Lot'
          : step === 2
          ? 'How many seeds sown?'
          : step === 3
          ? 'Bed Location & Date'
          : 'Confirm Sowing Record'
      }
      step={step}
      totalSteps={4}
      onBack={() => {
        if (step > 1) setStep(step - 1);
        else navigate('/app/add');
      }}
      onNext={() => setStep(step + 1)}
      onSubmit={handleSubmit}
      isNextDisabled={step === 1 && !seedLotId}
      isLoading={loading}
      error={error}
    >
      {/* STEP 1: PICK SEED LOT */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-xs text-stone-500 mb-2">Tap a seed lot to select donor variety:</p>
          {(seedLots || []).map((lot: any) => (
            <button
              key={lot.id}
              type="button"
              onClick={() => setSeedLotId(lot.id)}
              className={`w-full p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] flex items-center justify-between ${
                seedLotId === lot.id
                  ? 'border-brand-600 bg-brand-50/60 dark:bg-brand-950/40 shadow-sm'
                  : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900'
              }`}
            >
              <div>
                <span className="font-mono text-xs font-bold text-brand-700 dark:text-brand-400 bg-brand-100 dark:bg-brand-900/60 px-2 py-0.5 rounded">
                  {lot.lot_code}
                </span>
                <div className="font-bold text-base text-stone-900 dark:text-stone-100 mt-1">
                  {lot.plant_variety}
                </div>
                <div className="text-xs text-stone-500 mt-0.5">
                  Supplier: {lot.supplier_name || 'In-House'} • Germ: {lot.germination_rate_tested}%
                </div>
              </div>
              {seedLotId === lot.id && (
                <div className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* STEP 2: NUMBER STEPPER */}
      {step === 2 && (
        <div className="space-y-4 py-4">
          <Stepper
            value={seedsSown}
            onChange={setSeedsSown}
            min={1}
            max={50000}
            step={50}
            label="Total Seeds Placed in Nursery Bed"
          />
        </div>
      )}

      {/* STEP 3: LOCATION & DATE */}
      {step === 3 && (
        <div className="space-y-4 py-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
              Sowing Date
            </label>
            <input
              type="date"
              value={sowingDate}
              onChange={(e) => setSowingDate(e.target.value)}
              className="w-full p-3.5 rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-base font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
              Poly-tunnel Bed Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Polyhouse 3, Bed Row A"
              className="w-full p-3.5 rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-base font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
              Notes / Soil Mix (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cocopeat + vermicompost 50:50 ratio"
              className="w-full p-3 rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm"
            />
          </div>
        </div>
      )}

      {/* STEP 4: CONFIRMATION SCREEN */}
      {step === 4 && (
        <div className="p-6 bg-white dark:bg-stone-900 rounded-3xl border-2 border-stone-200 dark:border-stone-800 space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-800 flex items-center justify-center mx-auto">
            <Sprout className="w-7 h-7" />
          </div>

          <div className="text-center">
            <h3 className="font-serif text-xl font-bold">Review Sowing Details</h3>
            <p className="text-xs text-stone-500">
              A new ROOTSTOCK batch and ledger movement will be permanently created.
            </p>
          </div>

          <div className="space-y-3 pt-2 text-sm border-t border-stone-100 dark:border-stone-800">
            <div className="flex justify-between">
              <span className="text-stone-500">Seed Lot:</span>
              <span className="font-bold font-mono">{selectedLot?.lot_code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Variety:</span>
              <span className="font-bold">{selectedLot?.plant_variety}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Quantity Sown:</span>
              <span className="font-bold text-brand-700 text-base">{seedsSown} seeds</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Location:</span>
              <span className="font-bold">{location}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Date:</span>
              <span className="font-bold">{sowingDate}</span>
            </div>
          </div>
        </div>
      )}
    </WizardContainer>
  );
};

export default SowingWizard;

