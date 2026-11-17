import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import { Plus, Edit2, Link as LinkIcon, Check, FileText } from 'lucide-react';

export const CmsProductsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [shortDesc, setShortDesc] = useState('');
  const [fullDesc, setFullDesc] = useState('');
  const [price, setPrice] = useState<number>(180);
  const [priceOnRequest, setPriceOnRequest] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [selectedBatchIds, setSelectedBatchIds] = useState<number[]>([]);

  const { data: products, isLoading } = useQuery({
    queryKey: ['cms-products'],
    queryFn: async () => {
      const res = await api.get('/cms/products');
      return res.data.products;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['cms-categories'],
    queryFn: async () => {
      const res = await api.get('/public/categories');
      return res.data.categories;
    },
  });

  const { data: readyBatches } = useQuery({
    queryKey: ['cms-ready-batches'],
    queryFn: async () => {
      const res = await api.get('/inventory/batches?type=READY_FOR_SALE');
      return res.data.batches;
    },
  });

  const openCreate = () => {
    setEditingProduct(null);
    setName('');
    setCategoryId(categories?.[0]?.id || null);
    setShortDesc('');
    setFullDesc('');
    setPrice(180);
    setPriceOnRequest(false);
    setIsFeatured(false);
    setIsPublished(true);
    setImageUrl('https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=800&q=80');
    setSelectedBatchIds([]);
    setModalOpen(true);
  };

  const openEdit = (p: any) => {
    setEditingProduct(p);
    setName(p.name);
    setCategoryId(p.category_id);
    setShortDesc(p.short_description || '');
    setFullDesc(p.full_description || '');
    setPrice(p.price || 0);
    setPriceOnRequest(Boolean(p.is_price_on_request));
    setIsFeatured(Boolean(p.is_featured));
    setIsPublished(Boolean(p.is_published));
    setImageUrl(p.images?.[0] || '');
    setSelectedBatchIds(p.linkedBatches?.map((b: any) => b.id) || []);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        category_id: categoryId,
        short_description: shortDesc,
        full_description: fullDesc,
        price,
        is_price_on_request: priceOnRequest,
        is_featured: isFeatured,
        is_published: isPublished,
        images: imageUrl ? [imageUrl] : [],
        linkedBatchIds: selectedBatchIds,
      };

      if (editingProduct) {
        await api.put(`/cms/products/${editingProduct.id}`, payload);
      } else {
        await api.post('/cms/products', payload);
      }

      queryClient.invalidateQueries({ queryKey: ['cms-products'] });
      setModalOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save product');
    }
  };

  const toggleBatchLink = (batchId: number) => {
    setSelectedBatchIds((prev) =>
      prev.includes(batchId) ? prev.filter((id) => id !== batchId) : [...prev, batchId]
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
            Product Catalogue Manager
          </h1>
          <p className="text-xs text-stone-500">
            Create public catalogue listings and link them to live Ready-for-Sale batches for derived availability.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 bg-brand-800 text-white font-bold px-4 py-2 rounded-xl text-xs sm:text-sm active:scale-95 shadow"
        >
          <Plus className="w-4 h-4" />
          <span>New Product</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-stone-500">Loading catalogue...</div>
      ) : (
        <div className="space-y-3">
          {(products || []).map((prod: any) => (
            <div
              key={prod.id}
              className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase text-brand-700 bg-brand-50 dark:bg-brand-950 px-2.5 py-0.5 rounded">
                    {prod.category_name || 'General'}
                  </span>
                  {prod.is_featured && (
                    <span className="text-[10px] font-bold uppercase text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                      Featured
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      prod.is_published
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    {prod.is_published ? 'PUBLISHED' : 'DRAFT'}
                  </span>
                </div>
                <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
                  {prod.name}
                </h3>
                <div className="text-xs text-stone-500 flex items-center gap-2">
                  <span>
                    Linked Batches: <strong>{prod.linkedBatches?.length || 0} batches</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Quotation:{' '}
                    <strong>{prod.is_price_on_request ? 'Price on Request' : `₹${prod.price}`}</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => openEdit(prod)}
                  className="px-3.5 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-800 dark:text-stone-200 text-xs font-bold rounded-xl border border-stone-300 dark:border-stone-700 active:scale-95 flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5 text-brand-600" />
                  <span>Edit Product</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Edit / Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-stone-900 max-w-xl w-full rounded-3xl p-6 sm:p-8 border border-stone-200 dark:border-stone-800 shadow-2xl space-y-4 my-8">
            <h3 className="font-serif text-xl font-bold">
              {editingProduct ? 'Edit Catalogue Product' : 'Create Catalogue Product'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Product Cultivar Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Gir Kesar Mango Grafted Sapling"
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-sm font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Category</label>
                  <select
                    value={categoryId || ''}
                    onChange={(e) => setCategoryId(parseInt(e.target.value, 10) || null)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-xs font-bold"
                  >
                    {(categories || []).map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Price (₹)</label>
                  <input
                    type="number"
                    disabled={priceOnRequest}
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-xs font-bold disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-bold">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={priceOnRequest}
                    onChange={(e) => setPriceOnRequest(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600"
                  />
                  <span>Price on Request</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600"
                  />
                  <span>Featured on Homepage</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600"
                  />
                  <span>Published Live</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Short Description</label>
                <textarea
                  rows={2}
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Primary Image URL</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-xs"
                />
              </div>

              {/* LINK INVENTORY BATCHES (DERIVED AVAILABILITY) */}
              <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-2">
                <div className="text-xs font-bold uppercase text-stone-500">
                  Link Eligible Ready-for-Sale Batches (Derives Stock Availability)
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1.5 border border-stone-200 dark:border-stone-800 p-2 rounded-xl">
                  {(readyBatches || []).map((b: any) => {
                    const isLinked = selectedBatchIds.includes(b.id);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => toggleBatchLink(b.id)}
                        className={`w-full p-2 rounded-lg text-left text-xs flex items-center justify-between border ${
                          isLinked
                            ? 'bg-brand-50 dark:bg-brand-950 border-brand-500 font-bold'
                            : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800'
                        }`}
                      >
                        <div>
                          <span className="font-mono">{b.serial_number}</span> • {b.plant_variety} (
                          {b.current_quantity} ready)
                        </div>
                        {isLinked && <Check className="w-4 h-4 text-brand-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-brand-800 text-white text-xs font-bold shadow"
                >
                  Save & Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CmsProductsPage;

