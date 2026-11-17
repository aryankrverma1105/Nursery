import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import WizardContainer from '../../components/WizardContainer';
import Stepper from '../../components/Stepper';
import { GitBranch, Check } from 'lucide-react';

export const GraftingWizard: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [rootstockId, setRootstockId] = useState<number | null>(null);
  const [scionId, setScionId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(50);
  const [graftingDate, setGraftingDate] = useState(new Date().toISOString().split('T')[0]);
  const [technician, setTechnician] = useState('Technician Ramesh');
  const [curingDays, setCuringDays] = useState(21);
  const [location, setLocation] = useState('Mist Chamber Curing Row B');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch active rootstock and scion batches
  const { data: rootstocks } = useQuery({
    queryKey: ['rootstock-batches'],
    queryFn: async () => {
      const res = await api.get('/inventory/batches?type=ROOTSTOCK&status=ACTIVE');
      return res.data.batches.filter((b: any) => b.current_quantity > 0);
    },
  });

  const { data: scions } = useQuery({
    queryKey: ['scion-batches'],
    queryFn: async () => {
      const res = await api.get('/inventory/batches?type=SCION&status=ACTIVE');
      return res.data.batches.filter((b: any) => b.current_quantity > 0);
    },
  });

  const selectedRootstock = rootstocks?.find((r: any) => r.id === rootstockId);
  const selectedScion = scions?.find((s: any) => s.id === scionId);

  const maxPossible = Math.min(
    selectedRootstock?.current_quantity || 1,
    selectedScion?.current_quantity || 1
  );

  const handleSubmit = async () => {
    if (!rootstockId || !scionId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/inventory/grafting', {
        rootstock_batch_id: rootstockId,
        scion_batch_id: scionId,
        quantity_grafted: quantity,
        grafting_date: graftingDate,
        technician_name: technician,
        curing_days: curingDays,
        location,
        notes,
      });
      alert(res.data.message);
      navigate('/app/stock');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Grafting operation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <WizardContainer
      title={
        step === 1
          ? 'Step 1: Pick Rootstock Batch'
          : step === 2
          ? 'Step 2: Pick Scion Donor Batch'
          : step === 3
          ? 'Step 3: Grafting Quantity'
          : step === 4
          ? 'Step 4: Technician & Curing Setup'
          : 'Step 5: Confirm Union Record'
      }
      step={step}
      totalSteps={5}
      onBack={() => {
        if (step > 1) setStep(step - 1);
        else navigate('/app/add');
      }}
      onNext={() => {
        if (step === 2 && quantity > maxPossible) {
          setQuantity(maxPossible);
        }
        setStep(step + 1);
      }}
      onSubmit={handleSubmit}
      isNextDisabled={
        (step === 1 && !rootstockId) ||
        (step === 2 && !scionId) ||
        (step === 3 && (quantity < 1 || quantity > maxPossible))
      }
      isLoading={loading}
      error={error}
    >
      {/* STEP 1: PICK ROOTSTOCK */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-xs text-stone-500 mb-2">Tap available rootstock seedlings:</p>
          {(rootstocks || []).length === 0 ? (
            <div className="p-4 bg-amber-50 rounded-2xl text-xs text-amber-800">
              No active rootstock batches with live stock available. Please record sowing first.
            </div>
          ) : (
            (rootstocks || []).map((b: any) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setRootstockId(b.id)}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] flex items-center justify-between ${
                  rootstockId === b.id
                    ? 'border-brand-600 bg-brand-50/60 dark:bg-brand-950/40 shadow-sm'
                    : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900'
                }`}
              >
                <div>
                  <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded">
                    {b.serial_number}
                  </span>
                  <div className="font-bold text-base text-stone-900 dark:text-stone-100 mt-1">
                    {b.plant_variety}
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    Available: <strong className="text-emerald-700">{b.current_quantity} plants</strong>
                  </div>
                </div>
                {rootstockId === b.id && (
                  <div className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      )}

      {/* STEP 2: PICK SCION */}
      {step === 2 && (
        <div className="space-y-3">
          <p className="text-xs text-stone-500 mb-2">Tap available scion donor cuttings:</p>
          {(scions || []).length === 0 ? (
            <div className="p-4 bg-amber-50 rounded-2xl text-xs text-amber-800">
              No active scion batches available. Please record scion harvest first.
            </div>
          ) : (
            (scions || []).map((s: any) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setScionId(s.id)}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] flex items-center justify-between ${
                  scionId === s.id
                    ? 'border-brand-600 bg-brand-50/60 dark:bg-brand-950/40 shadow-sm'
                    : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900'
                }`}
              >
                <div>
                  <span className="font-mono text-xs font-bold text-amber-700 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded">
                    {s.serial_number}
                  </span>
                  <div className="font-bold text-base text-stone-900 dark:text-stone-100 mt-1">
                    {s.plant_variety}
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    Available: <strong className="text-amber-700">{s.current_quantity} cuttings</strong>
                  </div>
                </div>
                {scionId === s.id && (
                  <div className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      )}

      {/* STEP 3: QUANTITY STEPPER */}
      {step === 3 && (
        <div className="space-y-4 py-4">
          <div className="p-3 bg-stone-100 dark:bg-stone-800 rounded-2xl text-xs text-stone-600 dark:text-stone-300">
            Available: Rootstock ({selectedRootstock?.current_quantity}) • Scions ({selectedScion?.current_quantity}).
            Max allowed graft batch: <strong>{maxPossible} units</strong>.
          </div>
          <Stepper
            value={quantity}
            onChange={setQuantity}
            min={1}
            max={maxPossible}
            step={10}
            label="Grafted Plants to Assemble"
          />
        </div>
      )}

      {/* STEP 4: TECHNICIAN & CURING SETUP */}
      {step === 4 && (
        <div className="space-y-4 py-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
              Grafting Date
            </label>
            <input
              type="date"
              value={graftingDate}
              onChange={(e) => setGraftingDate(e.target.value)}
              className="w-full p-3.5 rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-base font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
              Technician Name
            </label>
            <input
              type="text"
              value={technician}
              onChange={(e) => setTechnician(e.target.value)}
              className="w-full p-3.5 rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-base font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
              Mandatory Curing Period (Days)
            </label>
            <input
              type="number"
              value={curingDays}
              onChange={(e) => setCuringDays(parseInt(e.target.value, 10) || 21)}
              className="w-full p-3.5 rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-base font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
              Mist Chamber Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full p-3.5 rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-base font-bold"
            />
          </div>
        </div>
      )}

      {/* STEP 5: REVIEW CONFIRMATION */}
      {step === 5 && (
        <div className="p-6 bg-white dark:bg-stone-900 rounded-3xl border-2 border-stone-200 dark:border-stone-800 space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-800 flex items-center justify-center mx-auto">
            <GitBranch className="w-7 h-7" />
          </div>

          <div className="text-center">
            <h3 className="font-serif text-xl font-bold">Review Grafting Operation</h3>
            <p className="text-xs text-stone-500">
              A new GRAFTED batch will be issued in CURING status with permanent lineage links.
            </p>
          </div>

          <div className="space-y-3 pt-2 text-sm border-t border-stone-100 dark:border-stone-800">
            <div className="flex justify-between">
              <span className="text-stone-500">Rootstock Parent:</span>
              <span className="font-mono font-bold">{selectedRootstock?.serial_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Scion Parent:</span>
              <span className="font-mono font-bold">{selectedScion?.serial_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Total Grafted:</span>
              <span className="font-bold text-brand-700 text-base">{quantity} plants</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Technician:</span>
              <span className="font-bold">{technician}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Curing Time:</span>
              <span className="font-bold">{curingDays} Days</span>
            </div>
          </div>
        </div>
      )}
    </WizardContainer>
  );
};

export default GraftingWizard;

