import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ShoppingBag,
  Plus,
  Printer,
  CheckCircle,
  AlertCircle,
  Calendar,
  User,
  Phone,
  Tag,
  CreditCard,
  FileText,
  DollarSign,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

interface ReadyBatchOption {
  id: number;
  serial_number: string;
  plant_variety: string;
  current_quantity: number;
  status: string;
}

interface OrderRecord {
  id: number;
  invoice_number: string;
  display_customer_name?: string;
  display_customer_phone?: string;
  customer_name?: string;
  customer_phone?: string;
  order_date: string;
  total_amount: number;
  discount: number;
  payment_mode: string;
  payment_status: string;
  status: string;
  created_at: string;
  items?: Array<{
    batch_code: string;
    variety: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

export const SellingPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const paramBatchId = searchParams.get('batchId');

  const [readyBatches, setReadyBatches] = useState<ReadyBatchOption[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedBatchId, setSelectedBatchId] = useState<number | ''>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(10);
  const [unitPrice, setUnitPrice] = useState<number>(200);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<string>('PAID');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; order?: any } | null>(null);

  const fetchReadyBatches = async () => {
    try {
      const res = await axios.get('/api/inventory/ready-for-sale');
      const available = (res.data.batches || []).filter(
        (b: any) => b.current_quantity > 0 && b.status !== 'QUARANTINED'
      );
      setReadyBatches(available);

      if (paramBatchId) {
        const found = available.find((b: any) => String(b.id) === paramBatchId);
        if (found) {
          setSelectedBatchId(found.id);
          setQuantity(Math.min(10, found.current_quantity));
        }
      } else if (available.length > 0 && !selectedBatchId) {
        setSelectedBatchId(available[0].id);
        setQuantity(Math.min(10, available[0].current_quantity));
      }
    } catch (err) {
      console.error('Failed to load ready batches:', err);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/sales/orders');
      setOrders(res.data.orders || []);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadyBatches();
    fetchOrders();
  }, []);

  const selectedBatch = readyBatches.find((b) => b.id === selectedBatchId);
  const subTotal = (quantity || 0) * (unitPrice || 0);
  const finalPrice = Math.max(0, subTotal - (discount || 0));

  const handleRecordSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!selectedBatchId) {
      setFeedback({ type: 'error', message: 'Please select a Ready for Sale batch.' });
      return;
    }

    if (!customerName.trim()) {
      setFeedback({ type: 'error', message: 'Please enter customer name.' });
      return;
    }

    if (quantity <= 0) {
      setFeedback({ type: 'error', message: 'Quantity to sell must be greater than zero.' });
      return;
    }

    if (selectedBatch && quantity > selectedBatch.current_quantity) {
      setFeedback({
        type: 'error',
        message: `Quantity requested (${quantity}) exceeds batch stock (${selectedBatch.current_quantity}).`,
      });
      return;
    }

    try {
      setSaving(true);
      const res = await axios.post('/api/sales/orders', {
        batch_id: Number(selectedBatchId),
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        quantity: Number(quantity),
        unit_price: Number(unitPrice),
        discount: Number(discount || 0),
        payment_mode: paymentMethod,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        order_date: saleDate,
        notes,
      });

      const orderData = res.data.order;
      setFeedback({
        type: 'success',
        message: `Sale completed! Invoice ${orderData.invoice_number} created for ₹${orderData.totalAmount}.`,
        order: orderData,
      });

      // Clear / Reset form
      setCustomerName('');
      setCustomerPhone('');
      setDiscount(0);
      setNotes('');

      fetchReadyBatches();
      fetchOrders();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to record plant sale.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 text-xs font-bold uppercase tracking-wider mb-2">
          <ShoppingBag className="w-3.5 h-3.5" />
          Phase G: Plant Sales & Invoicing
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100">
          Record Plant Sale
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Issue certified plant sales invoices. System validates stock in real-time, deducts inventory via the immutable ledger, and outputs printable tax invoices.
        </p>
      </div>

      {/* FEEDBACK & INVOICE LAUNCHER */}
      {feedback && (
        <div
          className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>

          {feedback.order && (
            <a
              href={`/api/sales/orders/${feedback.order.orderId}/invoice?print=true`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-brand-800 hover:bg-brand-900 active:scale-95 text-white font-black text-sm sm:text-base shadow-lg transition-all self-start sm:self-auto cursor-pointer"
            >
              <Printer className="w-5 h-5" />
              <span>Print / Save Tax Invoice</span>
            </a>
          )}
        </div>
      )}

      {/* SALES ENTRY FORM */}
      <form onSubmit={handleRecordSale} className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-stone-100 dark:border-stone-800">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          1. Batch & Customer Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5">
              Select Ready for Sale Batch *
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => {
                const id = Number(e.target.value) || '';
                setSelectedBatchId(id);
                const match = readyBatches.find((b) => b.id === id);
                if (match) setQuantity(Math.min(quantity, match.current_quantity));
              }}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-sm font-semibold outline-none"
            >
              <option value="">-- Choose Ready Batch --</option>
              {readyBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.serial_number} — {b.plant_variety} ({b.current_quantity} in stock)
                </option>
              ))}
            </select>
            {selectedBatch && (
              <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                Available Stock: <strong>{selectedBatch.current_quantity} plants</strong> ready for immediate dispatch.
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-stone-400" />
              Sale Date *
            </label>
            <input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-sm outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User className="w-4 h-4 text-stone-400" />
              Customer Name *
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              placeholder="e.g. Ramesh Patel / Kisan Orchard Farm"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-sm outline-none font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-stone-400" />
              Customer Phone Number
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-sm outline-none"
            />
          </div>
        </div>

        <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider flex items-center gap-2 pt-4 border-t border-stone-100 dark:border-stone-800">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          2. Pricing & Calculation
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5">
              Quantity to Sell *
            </label>
            <input
              type="number"
              min="1"
              max={selectedBatch?.current_quantity || 9999}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-sm font-bold outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5">
              Price Per Plant (₹) *
            </label>
            <input
              type="number"
              min="1"
              value={unitPrice}
              onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-sm font-bold outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5">
              Subtotal (Qty × Price)
            </label>
            <div className="px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-sm font-serif font-bold">
              ₹{subTotal.toFixed(2)}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5">
              Discount (₹)
            </label>
            <input
              type="number"
              min="0"
              value={discount}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-sm font-semibold outline-none"
            />
          </div>
        </div>

        {/* Realtime Final Price Preview Card */}
        <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider">
              Final Net Payable Amount:
            </span>
            <div className="text-[11px] text-stone-500 mt-0.5">
              Subtotal ₹{subTotal.toFixed(2)} {discount > 0 ? `- ₹${discount.toFixed(2)} discount` : ''}
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-purple-700 dark:text-purple-300">
            ₹{finalPrice.toFixed(2)}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5">
              Payment Method *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-sm font-semibold outline-none"
            >
              <option value="CASH">Cash Payment</option>
              <option value="UPI">UPI / QR Transfer</option>
              <option value="BANK_TRANSFER">Direct Bank Transfer (NEFT/RTGS)</option>
              <option value="CHEQUE">Cheque / Demand Draft</option>
              <option value="OTHER">Credit / Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5">
              Payment Status *
            </label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-sm font-semibold outline-none"
            >
              <option value="PAID">Full Payment Received (PAID)</option>
              <option value="PARTIAL">Partial Advance Paid</option>
              <option value="PENDING">Payment Pending</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5">
            Order / Delivery Notes
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Loaded onto tractor trolley #GJ-03-AA-1234; plant passports verified"
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-sm outline-none"
          />
        </div>

        {/* SUBMIT BUTTON */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving || !selectedBatchId}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{saving ? 'Processing Sale...' : 'Record Sale & Generate Invoice'}</span>
          </button>
        </div>
      </form>

      {/* SALES ORDERS HISTORY */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            Completed Sales & Invoices
          </h2>
          <span className="text-xs text-stone-500 font-semibold">{orders.length} order(s) recorded</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-stone-400">Loading sales records...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 text-stone-500 text-sm">
            No sales recorded yet. Record a plant sale above to generate your first invoice.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((ord) => {
              const custName = ord.display_customer_name || ord.customer_name || 'Walk-in Buyer';
              const custPhone = ord.display_customer_phone || ord.customer_phone;
              return (
                <div
                  key={ord.id}
                  className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-2.5 py-0.5 rounded-full">
                        {ord.invoice_number}
                      </span>
                      <span className="text-xs text-stone-400">{ord.order_date}</span>
                    </div>

                    <div className="font-bold text-base text-stone-900 dark:text-stone-100 mt-1">
                      {custName}
                    </div>
                    {custPhone && <div className="text-xs text-stone-500">{custPhone}</div>}

                    {/* Items Sold */}
                    {ord.items && ord.items.length > 0 && (
                      <div className="mt-3 p-2.5 rounded-xl bg-stone-50 dark:bg-stone-850 space-y-1 text-xs">
                        {ord.items.map((it, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-stone-700 dark:text-stone-300">
                              {it.variety} ({it.quantity} plants)
                            </span>
                            <span className="font-mono text-stone-500">{it.batch_code}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-100 dark:border-stone-800 text-xs">
                      <div>
                        Payment: <strong>{ord.payment_mode}</strong> ({ord.payment_status})
                      </div>
                      <div className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">
                        ₹{ord.total_amount.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-stone-100 dark:border-stone-800 flex justify-end">
                    <a
                      href={`/api/sales/orders/${ord.id}/invoice`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-5 py-2.5 rounded-xl bg-brand-850 hover:bg-brand-900 active:scale-95 text-white font-extrabold text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print / View Invoice</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellingPage;

