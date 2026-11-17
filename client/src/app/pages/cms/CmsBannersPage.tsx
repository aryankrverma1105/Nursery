import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import { Plus, ShieldAlert, Trash2, Calendar } from 'lucide-react';
import { ImageDropzone } from '../../components/ImageDropzone';

export const CmsBannersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [badgeText, setBadgeText] = useState('Advance Booking');
  const [linkUrl, setLinkUrl] = useState('/products');
  const [imageUrl, setImageUrl] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  const { data: banners, isLoading } = useQuery({
    queryKey: ['cms-banners'],
    queryFn: async () => {
      const res = await api.get('/cms/banners');
      return res.data.banners;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      await api.post('/cms/banners', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-banners'] });
      setModalOpen(false);
      setTitle('');
      setSubtitle('');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/cms/banners/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-banners'] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      title,
      subtitle,
      badge_text: badgeText,
      link_url: linkUrl,
      image_url: imageUrl,
      start_date: startDate,
      expiry_date: expiryDate,
      is_active: true,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
            Banners & Promotional Notices
          </h1>
          <p className="text-xs text-stone-500">
            Configure seasonal graft booking banners. Expired banners are automatically suppressed from the public site.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 bg-brand-800 text-white font-bold px-4 py-2 rounded-xl text-xs sm:text-sm active:scale-95 shadow"
        >
          <Plus className="w-4 h-4" />
          <span>New Banner</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-stone-500">Loading banners...</div>
      ) : (
        <div className="space-y-3">
          {(banners || []).map((b: any) => {
            const isExpired = b.expiry_date && new Date(b.expiry_date) < new Date();

            return (
              <div
                key={b.id}
                className={`p-5 rounded-3xl bg-white dark:bg-stone-900 border-2 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isExpired || b.is_archived
                    ? 'border-dashed border-stone-300 dark:border-stone-800 opacity-60'
                    : 'border-stone-200 dark:border-stone-800'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase text-brand-700 bg-brand-100 px-2 py-0.5 rounded">
                      {b.badge_text || 'NOTICE'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isExpired
                          ? 'bg-rose-100 text-rose-800'
                          : b.is_active
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {isExpired ? 'EXPIRED' : b.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
                    {b.title}
                  </h3>
                  <p className="text-xs text-stone-500">{b.subtitle}</p>
                  <div className="text-[11px] text-stone-400 flex items-center gap-3 pt-1">
                    <span>Active: {b.start_date || 'Immediate'} → {b.expiry_date || 'Never'}</span>
                    <span>• Link: {b.link_url}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!b.is_archived && (
                    <button
                      onClick={() => archiveMutation.mutate(b.id)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Archive</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Banner Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 max-w-md w-full rounded-3xl p-6 border border-stone-200 dark:border-stone-800 shadow-2xl space-y-4">
            <h3 className="font-serif text-xl font-bold">New Promotional Banner</h3>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Banner Headline *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Monsoon 2026 Advance Booking"
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Subtitle</label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. Reserve certified Kesar mango grafts"
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-xs"
                />
              </div>

              <div>
                <ImageDropzone
                  label="Banner Graphic / Background Image (Drag & Drop or Browse)"
                  value={imageUrl}
                  onChange={setImageUrl}
                  aspectRatio="banner"
                  placeholderText="Drop banner image here, or click to browse"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
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
                  Create Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CmsBannersPage;

