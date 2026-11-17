import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import WizardContainer from '../../components/WizardContainer';
import Stepper from '../../components/Stepper';
import { Sparkles, Check } from 'lucide-react';

export const ScionWizard: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [motherTreeId, setMotherTreeId] = useState<number | null>(null);
  const [cuttings, setCuttings] = useState(150);
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0]);
  const [technician, setTechnician] = useState('Technician Ramesh');
  const [location, setLocation] = useState('Mist Cooler 1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: trees } = useQuery({
    queryKey: ['mother-trees'],
    queryFn: async () => {
      const res = await api.get('/inventory/mother-trees');
      return res.data.motherTrees;
    },
  });

  const selectedTree = trees?.find((t: any) => t.id === motherTreeId);

  const handleSubmit = async () => {
    if (!motherTreeId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/inventory/scion-harvest', {
        mother_tree_id: motherTreeId,
        cuttings_harvested: cuttings,
        harvest_date: harvestDate,
        technician_name: technician,
        location,
      });
      alert(res.data.message);
      navigate('/app/stock');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to record scion harvest.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <WizardContainer
      title={
        step === 1
          ? 'Select Mother Tree Donor'
          : step === 2
          ? 'Cuttings Harvested'
          : step === 3
          ? 'Technician & Cold Mist Storage'
          : 'Confirm Scion Harvest'
      }
      step={step}
      totalSteps={4}
      onBack={() => {
        if (step > 1) setStep(step - 1);
        else navigate('/app/add');
      }}
      onNext={() => setStep(step + 1)}
      onSubmit={handleSubmit}
      isNextDisabled={step === 1 && !motherTreeId}
      isLoading={loading}
      error={error}
    >
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-xs text-stone-500 mb-2">Tap a registered donor mother tree:</p>
          {(trees || []).map((tree: any) => (
            <button
              key={tree.id}
              type="button"
              onClick={() => setMotherTreeId(tree.id)}
              className={`w-full p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] flex items-center justify-between ${
                motherTreeId === tree.id
                  ? 'border-brand-600 bg-brand-50/60 dark:bg-brand-950/40 shadow-sm'
                  : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900'
              }`}
            >
              <div>
                <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded">
                  {tree.tree_code}
                </span>
                <div className="font-bold text-base text-stone-900 dark:text-stone-100 mt-1">
                  {tree.plant_variety}
                </div>
                <div className="text-xs text-stone-500 mt-0.5">
                  Loc: {tree.location_block} • Age: {tree.age_years} yrs
                </div>
              </div>
              {motherTreeId === tree.id && (
                <div className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="py-4">
          <Stepper
            value={cuttings}
            onChange={setCuttings}
            min={1}
            max={5000}
            step={25}
            label="Total Budwood Stems Harvested"
          />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 py-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
              Harvest Date
            </label>
            <input
              type="date"
              value={harvestDate}
              onChange={(e) => setHarvestDate(e.target.value)}
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
              Cool Mist Storage Location
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

      {step === 4 && (
        <div className="p-6 bg-white dark:bg-stone-900 rounded-3xl border-2 border-stone-200 dark:border-stone-800 space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7" />
          </div>

          <div className="text-center">
            <h3 className="font-serif text-xl font-bold">Review Harvest Details</h3>
            <p className="text-xs text-stone-500">
              A new SCION batch with serial number will be issued.
            </p>
          </div>

          <div className="space-y-3 pt-2 text-sm border-t border-stone-100 dark:border-stone-800">
            <div className="flex justify-between">
              <span className="text-stone-500">Mother Tree:</span>
              <span className="font-bold font-mono">{selectedTree?.tree_code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Variety:</span>
              <span className="font-bold">{selectedTree?.plant_variety}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Cuttings Count:</span>
              <span className="font-bold text-amber-700 text-base">{cuttings} stems</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Technician:</span>
              <span className="font-bold">{technician}</span>
            </div>
          </div>
        </div>
      )}
    </WizardContainer>
  );
};

export default ScionWizard;

