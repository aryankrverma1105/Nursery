import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import StatusBadge from '../components/StatusBadge';
import { ShoppingCart, Plus, Printer, FileText } from 'lucide-react';

export const SalesPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['sales-orders'],
    queryFn: async () => {
      const res = await api.get('/sales/orders');
      return res.data.orders;
    },
  });

  const orders = data || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
            Plant Sales & Tax Invoices
          </h1>
          <p className="text-xs text-stone-500">Commercial buyer orders linked directly to batch ledger deductions</p>
        </div>

        <Link
          to="/app/wizard/sale"
          className="inline-flex items-center gap-1.5 bg-brand-800 text-white font-bold px-4 py-2 rounded-xl text-xs sm:text-sm active:scale-95 shadow"
        >
          <Plus className="w-4 h-4" />
          <span>New Sale</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-stone-500">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-8 space-y-3">
          <ShoppingCart className="w-12 h-12 text-stone-400 mx-auto" />
          <h3 className="font-serif text-xl font-bold">No sales recorded yet</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Use the Record Sale wizard to create your first batch-deducted customer invoice.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o: any) => (
            <div
              key={o.id}
              className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-base bg-stone-100 dark:bg-stone-800 px-2.5 py-0.5 rounded-lg text-stone-900 dark:text-stone-100">
                    {o.invoice_number}
                  </span>
                  <StatusBadge status={o.payment_status} size="sm" />
                </div>
                <div className="font-bold text-lg text-stone-900 dark:text-stone-100">
                  {o.customer_name}
                </div>
                <div className="text-xs text-stone-500 flex items-center gap-2">
                  <span>Date: {o.order_date}</span>
                  <span>•</span>
                  <span>Mode: {o.payment_mode}</span>
                  {o.payment_notes && <span>• Ref: {o.payment_notes}</span>}
                </div>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-stone-100 dark:border-stone-800">
                <div className="text-right">
                  <div className="text-2xl font-bold font-serif text-brand-900 dark:text-brand-300">
                    ₹{o.total_amount.toFixed(2)}
                  </div>
                </div>

                <a
                  href={`/api/sales/orders/${o.id}/invoice`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-800 dark:text-stone-200 font-bold px-3.5 py-2 rounded-xl text-xs border border-stone-300 dark:border-stone-700 shadow-xs active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5 text-brand-600" />
                  <span>Print Invoice</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SalesPage;

