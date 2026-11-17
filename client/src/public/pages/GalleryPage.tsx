import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import SeoHead from '../components/SeoHead';
import { ZoomIn, X } from 'lucide-react';

export const GalleryPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [lightboxImage, setLightboxImage] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['public-gallery', activeCategory],
    queryFn: async () => {
      const url = activeCategory === 'all' ? '/public/gallery' : `/public/gallery?category=${activeCategory}`;
      const res = await api.get(url);
      return res.data.gallery;
    },
  });

  const categories = ['all', 'Infrastructure', 'Mother Trees', 'Rootstocks', 'Dispatch'];
  const items = data || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <SeoHead
        title="Propagation Gallery | Deep Root Farms"
        description="Visual evidence of our shade houses, mother orchards, rootstock beds, and dispatched fruit cultivars."
      />

      <div className="max-w-3xl space-y-4">
        <span className="text-xs font-bold uppercase tracking-widest text-brand-700 dark:text-brand-400">
          Visual Evidence
        </span>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold tracking-tight text-brand-950 dark:text-stone-50">
          Propagation in Action
        </h1>
        <p className="text-stone-600 dark:text-stone-300 text-base sm:text-lg leading-relaxed">
          Explore our propagation mist chambers, scion donor blocks, and hardened saplings ready for commercial dispatch.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
              activeCategory === cat
                ? 'bg-brand-800 text-white shadow-md'
                : 'bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-brand-500'
            }`}
          >
            {cat === 'all' ? 'All Images' : cat}
          </button>
        ))}
      </div>

      {/* Gallery Grid */}
      {isLoading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item: any) => (
            <div
              key={item.id}
              onClick={() => setLightboxImage(item)}
              className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800 cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6 text-white">
                <div className="text-xs uppercase font-bold tracking-wider text-brand-300 mb-1">
                  {item.category}
                </div>
                <h3 className="font-serif text-lg font-bold">{item.title}</h3>
                <p className="text-xs text-stone-200 mt-1 line-clamp-2">{item.caption}</p>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-white/80 font-semibold">
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>Click to expand</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-stone-900 rounded-3xl overflow-hidden shadow-2xl border border-stone-800"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="aspect-[16/10] bg-black">
              <img
                src={lightboxImage.image_url}
                alt={lightboxImage.title}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="p-6 text-white space-y-1 bg-stone-950">
              <div className="text-xs uppercase font-bold text-brand-400">{lightboxImage.category}</div>
              <h3 className="font-serif text-xl font-bold">{lightboxImage.title}</h3>
              <p className="text-sm text-stone-400">{lightboxImage.caption}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryPage;

