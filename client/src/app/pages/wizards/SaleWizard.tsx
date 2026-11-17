import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import WizardContainer from '../../components/WizardContainer';
import Stepper from '../../components/Stepper';
import { TrendingUp, Check, UserPlus } from 'lucide-react';

export const SaleWizard: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [batchId, setBatchId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(10);
  const [unitPrice, setUnitPrice] = useState(180);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT'>('UPI');
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'PENDING' | 'PARTIAL'>('PAID');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Quick new customer modal state
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  const { data: customers, refetch: refetchCustomers } = useQuery({
    queryKey: ['sales-customers'],
    queryFn: async () => {
      const res = await api.get('/sales/customers');
      return res.data.customers;
    },
  });

  const { data: readyBatches } = useQuery({
    queryKey: ['ready-batches-for-sale'],
    queryFn: async () => {
      const res = await api.get('/inventory/batches?type=READY_FOR_SALE&status=READY');
      return res.data.batches.filter((b: any) => b.current_quantity > 0 && b.status !== 'QUARANTINED');
    },
  });

  const selectedCustomer = customers?.find((c: any) => c.id === customerId);
  const selectedBatch = readyBatches?.find((b: any) => b.id === batchId);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    try {
      const res = await api.post('/sales/customers', {
        name: newCustName,
        phone: newCustPhone,
      });
      await refetchCustomers();
      setCustomerId(res.data.customer.id);
      setNewCustomerOpen(false);
      setNewCustName('');
      setNewCustPhone('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create customer');
    }
  };

  const handleSubmit = async () => {
    if (!customerId || !batchId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/sales/orders', {
        customer_id: customerId,
        order_date: new Date().toISOString().split('T')[0],
        payment_mode: paymentMode,
        payment_status: paymentStatus,
        payment_notes: paymentNotes,
        items: [
          {
            batch_id: batchId,
            quantity,
            unit_price: unitPrice,
          },
        ],
      });
      alert(res.data.message);
      navigate('/app/sales');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create sale.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <WizardContainer
      title={
        step === 1
          ? 'Step 1: Select Buyer / Customer'
          : step === 2
          ? 'Step 2: Select Ready Batch'
          : step === 3
          ? 'Step 3: Quantity & Rate'
          : step === 4
          ? 'Step 4: Offline Payment Note'
          : 'Step 5: Confirm & Issue Invoice'
      }
      step={step}
      totalSteps={5}
      onBack={() => {
        if (step > 1) setStep(step - 1);
        else navigate('/app/add');
      }}
      onNext={() => {
        if (step === 2 && quantity > (selectedBatch?.current_quantity || 1)) {
          setQuantity(selectedBatch?.current_quantity || 1);
        }
        setStep(step + 1);
      }}
      onSubmit={handleSubmit}
      isNextDisabled={
        (step === 1 && !customerId) ||
        (step === 2 && !batchId) ||
        (step === 3 && (quantity < 1 || quantity > (selectedBatch?.current_quantity || 1)))
      }
      isLoading={loading}
      error={error}
    >
      {/* STEP 1: PICK CUSTOMER */}
      {step === 1 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-500">Select registered buyer:</span>
            <button
              type="button"
              onClick={() => setNewCustomerOpen(true)}
              className="text-xs font-bold text-brand-700 dark:text-brand-400 flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Quick Add Buyer</span>
            </button>
          </div>

          {(customers || []).map((c: any) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCustomerId(c.id)}
              className={`w-full p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] flex items-center justify-between ${
                customerId === c.id
                  ? 'border-brand-600 bg-brand-50/60 dark:bg-brand-950/40 shadow-sm'
                  : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900'
              }`}
            >
              <div>
                <div className="font-bold text-base text-stone-900 dark:text-stone-100">
                  {c.name}
                </div>
                <div className="text-xs text-stone-500 mt-0.5">
                  Phone: {c.phone || 'N/A'} {c.company_name ? `• ${c.company_name}` : ''}
                </div>
              </div>
              {customerId === c.id && (
                <div className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              )}
            </button>
          ))}

          {/* Quick Add Buyer Modal */}
          {newCustomerOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-stone-900 max-w-sm w-full p-6 rounded-3xl border border-stone-200 dark:border-stone-800 space-y-4 shadow-xl">
                <h3 className="font-serif text-lg font-bold">New Buyer Account</h3>
                <div>
                  <label className="block text-xs font-bold mb-1">Customer / Farm Name *</label>
                  <input
                    type="text"
                    required
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    placeholder="e.g. Ramesh Agro Farms"
                    className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="+91 98000 00000"
                    className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setNewCustomerOpen(false)}
                    className="px-3 py-1.5 text-xs font-bold text-stone-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateCustomer}
                    className="px-4 py-2 bg-brand-800 text-white font-bold text-xs rounded-xl"
                  >
                    Save & Select
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: PICK READY BATCH */}
      {step === 2 && (
        <div className="space-y-3">
          <p className="text-xs text-stone-500 mb-2">Tap available Ready-for-Sale batch:</p>
          {(readyBatches || []).length === 0 ? (
            <div className="p-4 bg-amber-50 rounded-2xl text-xs text-amber-800">
              No Ready-for-Sale batches currently available. Please promote cured grafts first.
            </div>
          ) : (
            (readyBatches || []).map((b: any) => (
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
                  <span className="font-mono text-xs font-bold text-teal-700 bg-teal-100 dark:bg-teal-950 px-2 py-0.5 rounded">
                    {b.serial_number}
                  </span>
                  <div className="font-bold text-base text-stone-900 dark:text-stone-100 mt-1">
                    {b.plant_variety}
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    Available: <strong className="text-emerald-700">{b.current_quantity} plants</strong>
                  </div>
                </div>
                {batchId === b.id && (
                  <div className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      )}

      {/* STEP 3: QUANTITY & PRICE */}
      {step === 3 && (
        <div className="space-y-6 py-2">
          <div className="p-3 bg-stone-100 dark:bg-stone-800 rounded-2xl text-xs text-stone-600 dark:text-stone-300">
            Available in {selectedBatch?.serial_number}: <strong>{selectedBatch?.current_quantity} plants</strong>.
          </div>

          <Stepper
            value={quantity}
            onChange={setQuantity}
            min={1}
            max={selectedBatch?.current_quantity || 100}
            step={5}
            label="Quantity to Sell"
          />

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
              Unit Rate per Sapling (₹)
            </label>
            <input
              type="number"
              min={1}
              value={unitPrice}
              onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
              className="w-full p-3.5 rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xl font-bold font-serif text-brand-900 dark:text-brand-300"
            />
          </div>

          <div className="p-4 bg-brand-50/60 dark:bg-brand-950/40 rounded-2xl flex items-center justify-between border border-brand-200 dark:border-brand-900">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Calculated Total:
            </span>
            <span className="text-2xl font-bold font-serif text-brand-900 dark:text-brand-200">
              ₹{(quantity * unitPrice).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* STEP 4: PAYMENT RECORDING (NO PAYMENT GATEWAY) */}
      {step === 4 && (
        <div className="space-y-4 py-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
              Payment Method (Offline Verified)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={`p-3 rounded-xl border-2 font-bold text-xs active:scale-[0.99] ${
                    paymentMode === mode
                      ? 'border-brand-600 bg-brand-50 dark:bg-brand-950 text-brand-900 dark:text-brand-200'
                      : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
              Payment Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['PAID', 'PENDING', 'PARTIAL'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setPaymentStatus(status)}
                  className={`p-3 rounded-xl border-2 font-bold text-xs active:scale-[0.99] ${
                    paymentStatus === status
                      ? 'border-brand-600 bg-brand-50 dark:bg-brand-950 text-brand-900 dark:text-brand-200'
                      : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
              Reference / Transaction ID Note
            </label>
            <input
              type="text"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="e.g. Bank Ref #UTR123456 or Receipt Slip 402"
              className="w-full p-3.5 rounded-2xl border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-bold"
            />
          </div>
        </div>
      )}

      {/* STEP 5: REVIEW CONFIRMATION */}
      {step === 5 && (
        <div className="p-6 bg-white dark:bg-stone-900 rounded-3xl border-2 border-stone-200 dark:border-stone-800 space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center mx-auto">
            <TrendingUp className="w-7 h-7" />
          </div>

          <div className="text-center">
            <h3 className="font-serif text-xl font-bold">Confirm Sale & Invoice</h3>
            <p className="text-xs text-stone-500">
              A sequential tax invoice will be generated and {quantity} plants will be deducted in the ledger.
            </p>
          </div>

          <div className="space-y-3 pt-2 text-sm border-t border-stone-100 dark:border-stone-800">
            <div className="flex justify-between">
              <span className="text-stone-500">Customer:</span>
              <span className="font-bold">{selectedCustomer?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Cultivar Batch:</span>
              <span className="font-mono font-bold">{selectedBatch?.serial_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Quantity Sold:</span>
              <span className="font-bold text-base">{quantity} plants</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Payment:</span>
              <span className="font-bold">{paymentMode} ({paymentStatus})</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-stone-100 dark:border-stone-800">
              <span className="text-stone-500 font-bold">Total Invoice Amount:</span>
              <span className="text-xl font-bold font-serif text-brand-900 dark:text-brand-300">
                ₹{(quantity * unitPrice).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </WizardContainer>
  );
};

export default SaleWizard;

