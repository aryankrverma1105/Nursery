import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import SeoHead from '../components/SeoHead';
import {
  ArrowRight,
  GitBranch,
  ShieldCheck,
  Award,
  Trees,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Send,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['public-homepage'],
    queryFn: async () => {
      const res = await api.get('/public/homepage');
      return res.data;
    },
  });

  // Contact form submission state
  const [formState, setFormState] = useState({
    name: '',
    phone: '',
    email: '',
    subject: '',
    message: '',
    botField: '',
  });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      await api.post('/public/enquiry', formState);
      setFormSubmitted(true);
      setFormState({ name: '', phone: '', email: '', subject: '', message: '', botField: '' });
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to submit enquiry. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-earth-50 dark:bg-stone-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-stone-600 dark:text-stone-400">Loading nursery catalogue...</span>
        </div>
      </div>
    );
  }

  const sections = data?.sections || [];
  const banners = data?.banners || [];
  const categories = data?.categories || [];
  const featured = data?.featuredProducts || [];
  const testimonials = data?.testimonials || [];
  const gallery = data?.gallery || [];

  return (
    <div className="space-y-24 sm:space-y-32">
      <SeoHead
        title="Deep Root Farms | Certified Horticulture & Plant Pedigree"
        description="Certified grafted fruit varieties, robust rootstocks, and verified pedigree saplings for professional growers."
      />

      {/* Render sections in CMS order */}
      {sections.map((section: any) => {
        if (!section.is_enabled) return null;

        // SECTION: HERO
        if (section.section_key === 'hero') {
          const content = section.content || {};
          return (
            <section key={section.id} className="relative pt-8 sm:pt-16 pb-12 overflow-hidden">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
                  <div className="lg:col-span-7 space-y-6">
                    {content.heroBadge && (
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-100 dark:bg-brand-950/80 border border-brand-300 dark:border-brand-800 text-brand-800 dark:text-brand-300 text-xs font-semibold uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                        <span>{content.heroBadge}</span>
                      </div>
                    )}

                    <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-brand-950 dark:text-stone-50 leading-[1.15]">
                      {section.title || 'Cultivating Excellence from Seed to Orchard'}
                    </h1>

                    <p className="text-lg sm:text-xl text-stone-600 dark:text-stone-300 leading-relaxed max-w-2xl font-sans">
                      {section.subtitle ||
                        'Certified grafted fruit varieties, robust disease-resistant rootstocks, and verified pedigree saplings for professional growers.'}
                    </p>

                    <div className="pt-2 flex flex-wrap items-center gap-4">
                      <Link
                        to={content.primaryCtaLink || '/products'}
                        className="inline-flex items-center gap-2 bg-brand-800 hover:bg-brand-900 text-white font-semibold px-6 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 text-base"
                      >
                        <span>{content.primaryCtaText || 'Browse Catalogue'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>

                      <Link
                        to={content.secondaryCtaLink || '/about'}
                        className="inline-flex items-center gap-2 border border-stone-300 dark:border-stone-700 bg-white/80 dark:bg-stone-900/80 hover:bg-stone-100 dark:hover:bg-stone-850 text-stone-800 dark:text-stone-200 font-semibold px-6 py-3.5 rounded-xl transition-all text-base"
                      >
                        <span>{content.secondaryCtaText || 'Explore Lineage'}</span>
                      </Link>
                    </div>

                    <div className="pt-6 border-t border-stone-200 dark:border-stone-800 grid grid-cols-3 gap-6 text-left">
                      <div>
                        <div className="text-2xl font-bold font-serif text-brand-900 dark:text-brand-300">450+</div>
                        <div className="text-xs text-stone-500 uppercase tracking-wider mt-0.5">Mother Trees</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold font-serif text-brand-900 dark:text-brand-300">94.2%</div>
                        <div className="text-xs text-stone-500 uppercase tracking-wider mt-0.5">Take Rate</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold font-serif text-brand-900 dark:text-brand-300">100%</div>
                        <div className="text-xs text-stone-500 uppercase tracking-wider mt-0.5">Traceable</div>
                      </div>
                    </div>
                  </div>

                  {/* Hero Photography with Layered Badge */}
                  <div className="lg:col-span-5 relative">
                    <div className="relative mx-auto max-w-md lg:max-w-none">
                      <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-stone-800 bg-stone-200 dark:bg-stone-900">
                        <img
                          src={content.heroImage || 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=80'}
                          alt="Nursery shadehouse saplings"
                          className="w-full h-full object-cover"
                          loading="eager"
                        />
                      </div>
                      {/* Floating Verification Tag */}
                      <div className="absolute -bottom-6 -left-6 sm:-left-8 bg-white dark:bg-stone-900 p-4 rounded-2xl shadow-xl border border-stone-100 dark:border-stone-800 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-700 dark:text-brand-300">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-xs uppercase font-bold tracking-wider text-stone-400">Strict Protocol</div>
                          <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">21-Day Curing Certified</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        }

        // SECTION: ABOUT THE FARM
        if (section.section_key === 'about') {
          const content = section.content || {};
          return (
            <section key={section.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-earth-100/70 dark:bg-stone-900/60 rounded-3xl p-8 sm:p-14 border border-earth-200 dark:border-stone-800">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  <div className="space-y-5">
                    <span className="text-xs font-bold uppercase tracking-widest text-brand-700 dark:text-brand-400 block">
                      {content.badgeText || 'Scientific Propagation'}
                    </span>
                    <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-brand-950 dark:text-stone-100">
                      {section.title || 'Our Heritage & Philosophy'}
                    </h2>
                    <p className="text-stone-600 dark:text-stone-300 leading-relaxed font-sans text-base sm:text-lg">
                      {content.description ||
                        'Deep Root Farms operates across 45 acres of specialized acclimatization poly-houses, propagation mist chambers, and authenticated germplasm conservation blocks. Every sapling leaving our gates carries a distinct verifiable pedigree trace.'}
                    </p>
                    <div className="pt-2">
                      <Link
                        to="/about"
                        className="inline-flex items-center gap-2 text-brand-800 dark:text-brand-300 font-semibold hover:gap-3 transition-all"
                      >
                        <span>Learn about our mother orchards</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {(content.stats || [
                      { label: 'Verified Mother Trees', value: '450+' },
                      { label: 'Annual Grafting Success', value: '94.2%' },
                      { label: 'Certified Varieties', value: '60+' },
                      { label: 'Commercial Growers Served', value: '1,200+' },
                    ]).map((stat: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-white dark:bg-stone-950 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm"
                      >
                        <div className="font-serif text-3xl font-bold text-brand-800 dark:text-brand-300 mb-1">
                          {stat.value}
                        </div>
                        <div className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          );
        }

        // SECTION: BOTANICAL CATEGORIES
        if (section.section_key === 'categories') {
          return (
            <section key={section.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
              <div className="text-center max-w-2xl mx-auto space-y-3">
                <span className="text-xs font-bold uppercase tracking-widest text-brand-700 dark:text-brand-400">
                  Pedigree Collections
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-brand-950 dark:text-stone-100">
                  {section.title || 'Botanical Specialties'}
                </h2>
                <p className="text-stone-600 dark:text-stone-300 text-sm sm:text-base">
                  {section.subtitle ||
                    'Select from our verified propagation lineages suited for commercial cultivation and high-density planting.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((cat: any) => (
                  <Link
                    key={cat.id}
                    to={`/products?category=${cat.slug}`}
                    className="group relative overflow-hidden rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm hover:shadow-xl transition-all duration-300"
                  >
                    <div className="aspect-[16/10] overflow-hidden bg-stone-100 dark:bg-stone-800">
                      <img
                        src={cat.image_url || 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=600&q=80'}
                        alt={cat.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-6">
                      <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100 group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-sm text-stone-500 dark:text-stone-400 mt-2 line-clamp-2">
                        {cat.description}
                      </p>
                      <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-brand-800 dark:text-brand-300 uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                        <span>Explore Variety</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        }

        // SECTION: FEATURED CULTIVARS
        if (section.section_key === 'featured') {
          return (
            <section key={section.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-brand-700 dark:text-brand-400">
                    Ready for Orchard Dispatch
                  </span>
                  <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-brand-950 dark:text-stone-100">
                    {section.title || 'Featured Cultivars'}
                  </h2>
                </div>
                <Link
                  to="/products"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-800 dark:text-brand-300 hover:gap-2.5 transition-all"
                >
                  <span>View All Plants</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {featured.map((prod: any) => {
                  const image = prod.images?.[0] || 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=600&q=80';
                  const isOutOfStock = prod.availability === 'Out of Stock';

                  return (
                    <div
                      key={prod.id}
                      className="bg-white dark:bg-stone-900 rounded-3xl overflow-hidden border border-stone-200 dark:border-stone-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
                    >
                      {/* Image & Badges */}
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

                      {/* Product Content */}
                      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
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
            </section>
          );
        }

        // SECTION: WHY CHOOSE US
        if (section.section_key === 'why_us') {
          const content = section.content || {};
          const features = content.features || [
            {
              title: '100% Pedigree Lineage',
              description: 'Every grafted plant maps directly to tagged mother trees and authenticated scion harvesting batches.',
              icon: 'GitBranch',
            },
            {
              title: 'Controlled Curing Protocols',
              description: 'Strict 21-day acclimatization in monitored humidity chambers before release guarantees survival.',
              icon: 'ShieldCheck',
            },
            {
              title: 'Zero Unknown Germplasm',
              description: 'All seed lots and rootstocks undergo phytosanitary inspection and certified germination testing.',
              icon: 'Award',
            },
            {
              title: 'Scientific Root Pruning',
              description: 'Air-pot propagation develops dense fibrous root systems minimizing transplanting shock.',
              icon: 'Trees',
            },
          ];

          const iconMap: Record<string, React.ReactNode> = {
            GitBranch: <GitBranch className="w-6 h-6 text-brand-600 dark:text-brand-400" />,
            ShieldCheck: <ShieldCheck className="w-6 h-6 text-brand-600 dark:text-brand-400" />,
            Award: <Award className="w-6 h-6 text-brand-600 dark:text-brand-400" />,
            Trees: <Trees className="w-6 h-6 text-brand-600 dark:text-brand-400" />,
          };

          return (
            <section key={section.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
              <div className="text-center max-w-2xl mx-auto space-y-3">
                <span className="text-xs font-bold uppercase tracking-widest text-brand-700 dark:text-brand-400">
                  Commercial Agronomy Assurance
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-brand-950 dark:text-stone-100">
                  {section.title || 'The Deep Root Standard'}
                </h2>
                <p className="text-stone-600 dark:text-stone-300 text-sm sm:text-base">
                  {section.subtitle || 'Why progressive orchardists and commercial growers trust our plant material.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {features.map((feat: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-8 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm hover:shadow-md transition-shadow space-y-4"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/70 border border-brand-200 dark:border-brand-800 flex items-center justify-center">
                      {iconMap[feat.icon] || <CheckCircle2 className="w-6 h-6 text-brand-600" />}
                    </div>
                    <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
                      {feat.title}
                    </h3>
                    <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed font-sans">
                      {feat.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          );
        }

        // SECTION: PROMOTIONAL BANNERS
        if (section.section_key === 'banners' && banners.length > 0) {
          return (
            <section key={section.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="space-y-6">
                {banners.map((b: any) => (
                  <div
                    key={b.id}
                    className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-950 to-stone-900 text-white p-8 sm:p-12 shadow-xl border border-brand-800"
                  >
                    <div className="relative z-10 max-w-xl space-y-4">
                      {b.badge_text && (
                        <span className="inline-block px-3 py-1 bg-brand-700 text-brand-100 rounded-full text-xs font-bold uppercase tracking-wider">
                          {b.badge_text}
                        </span>
                      )}
                      <h3 className="font-serif text-2xl sm:text-3xl font-bold">{b.title}</h3>
                      <p className="text-stone-300 text-sm sm:text-base leading-relaxed">{b.subtitle}</p>
                      {b.link_url && (
                        <div className="pt-2">
                          <Link
                            to={b.link_url}
                            className="inline-flex items-center gap-2 bg-white text-brand-950 font-semibold px-5 py-2.5 rounded-xl text-sm shadow hover:bg-brand-50 transition-colors"
                          >
                            <span>Learn More & Reserve</span>
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        }

        // SECTION: GALLERY PREVIEW
        if (section.section_key === 'gallery' && gallery.length > 0) {
          return (
            <section key={section.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-brand-700 dark:text-brand-400">
                    Visual Evidence
                  </span>
                  <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-brand-950 dark:text-stone-100 mt-1">
                    {section.title || 'Propagation in Action'}
                  </h2>
                </div>
                <Link to="/gallery" className="text-sm font-semibold text-brand-800 dark:text-brand-300 hover:underline">
                  View Full Gallery
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {gallery.slice(0, 4).map((g: any) => (
                  <div key={g.id} className="group relative aspect-square rounded-2xl overflow-hidden bg-stone-200 shadow-sm">
                    <img
                      src={g.image_url}
                      alt={g.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end text-white">
                      <div className="text-xs font-bold text-brand-300 uppercase">{g.category}</div>
                      <div className="text-sm font-semibold">{g.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        }

        // SECTION: TESTIMONIALS
        if (section.section_key === 'testimonials' && testimonials.length > 0) {
          return (
            <section key={section.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
              <div className="text-center max-w-xl mx-auto space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-brand-700 dark:text-brand-400">
                  Grower Verifications
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-brand-950 dark:text-stone-100">
                  {section.title || 'Grower Experiences'}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {testimonials.map((t: any) => (
                  <div
                    key={t.id}
                    className="p-8 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4"
                  >
                    <p className="text-stone-600 dark:text-stone-300 italic font-serif text-base leading-relaxed">
                      "{t.content}"
                    </p>
                    <div className="flex items-center gap-3 pt-2">
                      <img
                        src={t.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80'}
                        alt={t.author_name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-brand-500"
                      />
                      <div>
                        <div className="font-bold text-stone-900 dark:text-stone-100 text-sm">{t.author_name}</div>
                        <div className="text-xs text-stone-500">{t.author_role}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        }

        // SECTION: CONTACT & ENQUIRY FORM
        if (section.section_key === 'contact') {
          return (
            <section key={section.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-earth-100/60 dark:bg-stone-900/60 rounded-3xl p-8 sm:p-14 border border-earth-200 dark:border-stone-800">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  <div className="lg:col-span-5 space-y-6">
                    <span className="text-xs font-bold uppercase tracking-widest text-brand-700 dark:text-brand-400 block">
                      Direct Agronomy Enquiry
                    </span>
                    <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-brand-950 dark:text-stone-100">
                      {section.title || 'Consult with Our Horticulturists'}
                    </h2>
                    <p className="text-stone-600 dark:text-stone-300 text-sm sm:text-base leading-relaxed">
                      {section.subtitle ||
                        'Have specific orchard layout questions or seeking bulk contract allocations? Connect directly with our lead propagators.'}
                    </p>

                    <div className="pt-4 space-y-3 text-sm text-stone-700 dark:text-stone-300">
                      <div>📍 Survey No. 108, Riverside Highway, Agri Zone [SAMPLE DATA]</div>
                      <div>📞 +91 98765 43210 (Official Line)</div>
                      <div>✉️ info@greenvalleynursery.local</div>
                    </div>

                    <div className="pt-4">
                      <a
                        href="https://wa.me/919876543210?text=Hello%20Green%20Valley%20Nursery,%20I%20have%20an%20enquiry%20regarding%20plant%20availability."
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-md transition-transform active:scale-95"
                      >
                        <MessageSquare className="w-5 h-5" />
                        <span>Chat Directly on WhatsApp</span>
                      </a>
                    </div>
                  </div>

                  {/* Enquiry Form with Spam Trap */}
                  <div className="lg:col-span-7 bg-white dark:bg-stone-950 p-8 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
                    {formSubmitted ? (
                      <div className="p-8 text-center space-y-3">
                        <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                        <h3 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
                          Enquiry Received
                        </h3>
                        <p className="text-sm text-stone-600 dark:text-stone-400 max-w-md mx-auto">
                          Thank you for consulting Deep Root Farms. Our agronomists will review your planting request and reply via phone/WhatsApp.
                        </p>
                        <button
                          onClick={() => setFormSubmitted(false)}
                          className="mt-4 text-xs font-semibold text-brand-800 dark:text-brand-400 uppercase tracking-wider underline"
                        >
                          Send another message
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleEnquirySubmit} className="space-y-4">
                        {formError && (
                          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs font-semibold border border-rose-200 dark:border-rose-800">
                            {formError}
                          </div>
                        )}

                        {/* Honeypot hidden input for bots */}
                        <div className="hidden" aria-hidden="true">
                          <label htmlFor="botField">Do not fill this</label>
                          <input
                            type="text"
                            id="botField"
                            value={formState.botField}
                            onChange={(e) => setFormState({ ...formState, botField: e.target.value })}
                            tabIndex={-1}
                            autoComplete="off"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                              Your Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={formState.name}
                              onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                              placeholder="e.g. Ramesh Patel"
                              className="w-full px-4 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm focus:border-brand-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                              Phone / WhatsApp *
                            </label>
                            <input
                              type="tel"
                              required
                              value={formState.phone}
                              onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                              placeholder="+91 98000 00000"
                              className="w-full px-4 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm focus:border-brand-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                            Email Address (Optional)
                          </label>
                          <input
                            type="email"
                            value={formState.email}
                            onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                            placeholder="grower@farm.local"
                            className="w-full px-4 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm focus:border-brand-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                            Plant Variety of Interest / Details *
                          </label>
                          <textarea
                            required
                            rows={3}
                            value={formState.message}
                            onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                            placeholder="Mention quantity, planting month, and rootstock preference..."
                            className="w-full px-4 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm focus:border-brand-500"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={formLoading}
                          className="w-full bg-brand-800 hover:bg-brand-900 text-white font-semibold py-3 rounded-xl transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                        >
                          <Send className="w-4 h-4" />
                          <span>{formLoading ? 'Submitting Enquiry...' : 'Submit Consultation Request'}</span>
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            </section>
          );
        }

        return null;
      })}
    </div>
  );
};

export default HomePage;

