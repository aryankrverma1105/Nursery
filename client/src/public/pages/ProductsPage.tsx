import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import SeoHead from '../components/SeoHead';
import { Search, Filter, CheckCircle2, AlertCircle, HelpCircle, ArrowRight, XCircle } from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentCategory = searchParams.get('category') || 'all';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  // 1. Fetch Categories
  const { data: catData } = useQuery({
    queryKey: ['public-categories'],
    queryFn: async () => {
      const res = await api.get('/public/categories');
      return res.data.categories;
    },
  });

  // 2. Fetch Products with search, filter, and pagination
  const { data: prodData, isLoading } = useQuery({
    queryKey: ['public-products', currentCategory, currentPage, searchParams.get('search')],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentCategory !== 'all') params.set('category', currentCategory);
      if (searchParams.get('search')) params.set('search', searchParams.get('search')!);
      params.set('page', String(currentPage));
      params.set('limit', '9');

      const res = await api.get(`/public/products?${params.toString()}`);
      return res.data;
    },
  });

  const handleCategorySelect = (slug: string) => {
    const next = new URLSearchParams(searchParams);
    if (slug === 'all') {
      next.delete('category');
    } else {
      next.set('category', slug);
    }
    next.set('page', '1');
    setSearchParams(next);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (searchTerm.trim()) {
      next.set('search', searchTerm.trim());
    } else {
      next.delete('search');
    }
    next.set('page', '1');
    setSearchParams(next);
  };

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(newPage));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const categories = catData || [];
  const products = prodData?.products || [];
  const pagination = prodData?.pagination || { totalPages: 1, page: 1, total: 0 };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <SeoHead
        title="Botanical Catalogue | Deep Root Farms"
        description="Explore our certified grafted fruit saplings, high-density varieties, and disease-resistant rootstocks with verifiable lineage."
      />

      {/* Header */}
      <div className="space-y-4 max-w-3xl">
        <span className="text-xs font-bold uppercase tracking-widest text-brand-700 dark:text-brand-400">
          Authenticated Horticultural Catalogue
        </span>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold tracking-tight text-brand-950 dark:text-stone-50">
          Cultivars & Sapling Stock
        </h1>
        <p className="text-stone-600 dark:text-stone-300 text-base sm:text-lg leading-relaxed">
          Every variety listed is propagated from indexed donor orchards with verified union healings. Availability is dynamically computed from our hardened ready-for-sale batches.
        </p>
      </div>

      {/* Search Bar & Category Filters */}
      <div className="space-y-6">
        <form onSubmit={handleSearchSubmit} className="flex gap-3 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by variety name (e.g. Kesar, Guava, Rootstock)..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm focus:border-brand-500 shadow-sm"
            />
          </div>
          <button
            type="submit"
            className="bg-brand-800 hover:bg-brand-900 text-white font-semibold px-5 py-3 rounded-xl text-sm transition-transform active:scale-95 shadow-sm"
          >
            Search
          </button>
        </form>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <button
            onClick={() => handleCategorySelect('all')}
            className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
              currentCategory === 'all'
                ? 'bg-brand-800 text-white shadow-md'
                : 'bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-brand-500'
            }`}
          >
            All Plants
          </button>
          {categories.map((c: any) => (
            <button
              key={c.id}
              onClick={() => handleCategorySelect(c.slug)}
              className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
                currentCategory === c.slug
                  ? 'bg-brand-800 text-white shadow-md'
                  : 'bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-brand-500'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {isLoading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="py-24 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-8 space-y-4">
          <XCircle className="w-12 h-12 text-stone-400 mx-auto" />
          <h3 className="font-serif text-2xl font-bold text-stone-800 dark:text-stone-200">
            No matching cultivars found
          </h3>
          <p className="text-sm text-stone-500 max-w-md mx-auto">
            Try adjusting your search query or selecting a different botanical category.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSearchParams(new URLSearchParams());
            }}
            className="text-xs font-semibold text-brand-800 dark:text-brand-400 uppercase tracking-wider underline"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((prod: any) => {
            const image = prod.images?.[0] || 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=600&q=80';

            return (
              <div
                key={prod.id}
                className="bg-white dark:bg-stone-900 rounded-3xl overflow-hidden border border-stone-200 dark:border-stone-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                {/* Product Image & Badges */}
                <div className="relative aspect-[4/3] overflow-hidden bg-stone-100 dark:bg-stone-800">
                  <img
                    src={image}
                    alt={prod.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  {/* Availability Badge */}
                  <div className="absolute top-4 left-4">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-sm ${
                        prod.availability === 'In Stock'
                          ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-600'
                          : prod.availability === 'Limited Stock'
                          ? 'bg-amber-950/80 text-amber-200 border border-amber-600'
                          : prod.availability === 'Coming Soon'
                          ? 'bg-blue-950/80 text-blue-200 border border-blue-600'
                          : 'bg-rose-950/80 text-rose-200 border border-rose-600'
                      }`}
                    >
                      {prod.availability === 'In Stock' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {prod.availability === 'Limited Stock' && <AlertCircle className="w-3.5 h-3.5" />}
                      {prod.availability === 'Coming Soon' && <HelpCircle className="w-3.5 h-3.5" />}
                      <span>{prod.availability}</span>
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-400">
                      {prod.category_name || 'Horticulture'}
                    </div>
                    <Link to={`/products/${prod.slug}`}>
                      <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100 hover:text-brand-700 dark:hover:text-brand-300 transition-colors">
                        {prod.name}
                      </h3>
                    </Link>
                    <p className="text-sm text-stone-500 dark:text-stone-400 line-clamp-2">
                      {prod.short_description}
                    </p>
                  </div>

                  {/* Price & Action */}
                  <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                    <div>
                      {prod.is_price_on_request || prod.price === null ? (
                        <span className="text-sm font-bold text-brand-800 dark:text-brand-300">
                          Price on Request
                        </span>
                      ) : (
                        <span className="text-lg font-bold text-stone-900 dark:text-stone-100 font-serif">
                          ₹{prod.price.toFixed(2)}{' '}
                          <span className="text-xs font-normal text-stone-500">/ sapling</span>
                        </span>
                      )}
                    </div>

                    <Link
                      to={`/products/${prod.slug}`}
                      className="bg-brand-800 hover:bg-brand-900 text-white text-xs font-semibold uppercase tracking-wider px-4 py-2.5 rounded-lg transition-transform active:scale-95 shadow-sm"
                    >
                      View Specs
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-8">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => handlePageChange(p)}
              className={`w-10 h-10 rounded-xl font-semibold text-sm transition-all ${
                p === pagination.page
                  ? 'bg-brand-800 text-white shadow-md'
                  : 'bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductsPage;

