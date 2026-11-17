import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import StatusBadge from '../components/StatusBadge';
import { Search, Filter, QrCode, Tag, ArrowRight, ShieldAlert } from 'lucide-react';

export const StockPage: React.FC = () => {
  const [selectedType, setSelectedType] = useState('ALL');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-batches', selectedType],
    queryFn: async () => {
      const url = selectedType === 'ALL' ? '/inventory/batches' : `/inventory/batches?type=${selectedType}`;
      const res = await api.get(url);
      return res.data.batches;
    },
  });

  const batches = data || [];
  const filtered = batches.filter((b: any) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return b.serial_number.toLowerCase().includes(term) || b.plant_variety.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
            Stock Inventory
          </h1>
          <p className="text-xs text-stone-500">Live ledger balances across all propagation stages</p>
        </div>

        <Link
          to="/app/add"
          className="bg-brand-800 text-white font-bold px-4 py-2 rounded-xl text-xs sm:text-sm active:scale-95 shadow"
        >
          + Add New
        </Link>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'ALL', label: 'All Batches' },
          { key: 'READY_FOR_SALE', label: 'Ready for Sale (RFS)' },
          { key: 'GRAFTED', label: 'In Curing (GR)' },
          { key: 'ROOTSTOCK', label: 'Rootstock (RS)' },
          { key: 'SCION', label: 'Scion Cuttings (SC)' },
        ].map((chip) => (
          <button
            key={chip.key}
            onClick={() => setSelectedType(chip.key)}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedType === chip.key
                ? 'bg-brand-800 text-white shadow-sm'
                : 'bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 text-stone-700 dark:text-stone-300'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by code or plant variety..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm focus:border-brand-500 shadow-xs"
        />
      </div>

      {/* Batches List */}
      {isLoading ? (
        <div className="py-16 text-center text-stone-500">Loading batch records...</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 text-sm text-stone-500">
          No batches found matching selected criteria.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((batch: any) => (
            <div
              key={batch.id}
              className={`p-4 rounded-2xl bg-white dark:bg-stone-900 border-2 shadow-xs transition-all ${
                batch.status === 'QUARANTINED'
                  ? 'border-rose-300 dark:border-rose-900 bg-rose-50/30'
                  : 'border-stone-200 dark:border-stone-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded text-stone-800 dark:text-stone-200">
                      {batch.serial_number}
                    </span>
                    <StatusBadge status={batch.status} size="sm" />
                  </div>
                  <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                    {batch.plant_variety}
                  </h3>
                  <div className="text-xs text-stone-500 flex items-center gap-2">
                    <span>Type: {batch.batch_type}</span>
                    <span>•</span>
                    <span>Loc: {batch.location || 'Yard Bed'}</span>
                  </div>
                </div>

                {/* Balance Count Badge */}
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold font-serif text-brand-900 dark:text-brand-300">
                    {batch.current_quantity}
                  </div>
                  <div className="text-[10px] text-stone-400 font-semibold uppercase">live units</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
                <span className="text-stone-400 text-[11px]">
                  Created {new Date(batch.created_at).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/app/trace?code=${batch.serial_number}`}
                    className="inline-flex items-center gap-1 font-bold text-brand-800 dark:text-brand-400 bg-brand-50 dark:bg-brand-950 px-2.5 py-1.5 rounded-lg active:scale-95"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Trace Pedigree</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StockPage;

