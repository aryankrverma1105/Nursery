import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import { ImageDropzone } from '../../components/ImageDropzone';
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  Check,
  X,
  Filter,
} from 'lucide-react';

export const CmsGalleryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    caption: '',
    category: 'Infrastructure',
    image_url: '',
    display_order: 0,
    is_active: true,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['cms-gallery'],
    queryFn: async () => {
      const res = await api.get('/cms/gallery');
      return res.data.items || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingItem?.id) {
        return api.put(`/cms/gallery/${editingItem.id}`, payload);
      }
      return api.post('/cms/gallery', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-gallery'] });
      queryClient.invalidateQueries({ queryKey: ['public-bootstrap'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/cms/gallery/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-gallery'] });
      queryClient.invalidateQueries({ queryKey: ['public-bootstrap'] });
    },
  });

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      caption: '',
      category: 'Infrastructure',
      image_url: '',
      display_order: (data?.length || 0) + 1,
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      caption: item.caption || '',
      category: item.category || 'Infrastructure',
      image_url: item.image_url,
      display_order: item.display_order || 0,
      is_active: Boolean(item.is_active),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.image_url.trim()) {
      alert('Please provide a title and upload an image.');
      return;
    }
    saveMutation.mutate(formData);
  };

  const galleryItems = data || [];
  const categories = ['ALL', 'Infrastructure', 'Mother Trees', 'Rootstocks', 'Dispatch', 'General'];

  const filteredItems = galleryItems.filter((item: any) => {
    if (selectedCategory === 'ALL') return true;
    return item.category?.toLowerCase() === selectedCategory.toLowerCase();
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <ImageIcon className="w-6 h-6 text-brand-700 dark:text-brand-400" />
            <span>Farm Gallery Manager</span>
          </h1>
          <p className="text-xs text-stone-500">
            Upload and update photos shown on the public farm gallery and homepage showcase.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="bg-brand-800 hover:bg-brand-900 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Photo</span>
        </button>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-brand-800 text-white shadow-xs'
                : 'bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 text-stone-700 dark:text-stone-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Gallery Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-stone-500">Loading gallery photos...</div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-8 space-y-3">
          <ImageIcon className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="font-serif text-lg font-bold text-stone-800 dark:text-stone-200">
            No Photos Found
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Upload new photos with drag & drop to display your propagation facilities, mist chambers, and mother orchards.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-2 px-4 py-2 bg-brand-800 text-white text-xs font-bold rounded-xl"
          >
            + Add First Photo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {filteredItems.map((item: any) => (
            <div
              key={item.id}
              className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs group flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-4/3 bg-stone-100 dark:bg-stone-950 overflow-hidden">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                      {item.category || 'General'}
                    </span>
                    {!item.is_active && (
                      <span className="bg-rose-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                        Hidden
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-1">
                  <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 line-clamp-1">
                    {item.title}
                  </h3>
                  {item.caption && (
                    <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2">
                      {item.caption}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="px-4 py-3 bg-stone-50 dark:bg-stone-950 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-xs">
                <span className="text-[11px] font-mono text-stone-400">Order: {item.display_order}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-1.5 text-stone-600 dark:text-stone-300 hover:text-brand-700 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
                    title="Edit Photo"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete gallery image "${item.title}"?`)) {
                        deleteMutation.mutate(item.id);
                      }
                    }}
                    className="p-1.5 text-rose-600 hover:text-rose-700 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                    title="Delete Photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-stone-900 max-w-lg w-full rounded-3xl p-6 border border-stone-200 dark:border-stone-800 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b pb-3 border-stone-200 dark:border-stone-800">
              <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                {editingItem ? 'Edit Gallery Photo' : 'Upload Gallery Photo'}
              </h3>
              <button onClick={closeModal} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Drag and Drop Image Dropzone */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Photo (Drag & Drop or Browse) *
                </label>
                <ImageDropzone
                  value={formData.image_url}
                  onChange={(url) => setFormData({ ...formData, image_url: url })}
                  placeholderText="Drop image file here or click to browse"
                  aspectRatio="video"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Photo Title / Headline *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Modern Mist Chambers & Curing Tunnel"
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Caption / Description
                </label>
                <textarea
                  rows={2}
                  value={formData.caption}
                  onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                  placeholder="Short description of what is shown in the image..."
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-xs font-bold"
                  >
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Mother Trees">Mother Trees</option>
                    <option value="Rootstocks">Rootstocks</option>
                    <option value="Dispatch">Dispatch & Nursery Beds</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) =>
                      setFormData({ ...formData, display_order: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="galleryActive"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-brand-700 focus:ring-brand-500"
                />
                <label htmlFor="galleryActive" className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Visible on public website gallery
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-bold text-stone-500 hover:text-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending || !formData.image_url}
                  className="px-5 py-2.5 rounded-xl bg-brand-800 hover:bg-brand-900 text-white text-xs font-bold shadow active:scale-95 disabled:opacity-50 transition-all"
                >
                  {saveMutation.isPending ? 'Saving...' : editingItem ? 'Save Changes' : 'Upload to Gallery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CmsGalleryPage;
