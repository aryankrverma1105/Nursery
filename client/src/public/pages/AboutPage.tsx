import React from 'react';
import SeoHead from '../components/SeoHead';
import { ShieldCheck, GitBranch, Award, Trees, CheckCircle2 } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      <SeoHead
        title="About Our Nursery | Deep Root Farms"
        description="Learn about our 45-acre horticulture propagation facility, virus-free mother orchards, and scientific grafting protocols."
      />

      <div className="max-w-3xl space-y-4">
        <span className="text-xs font-bold uppercase tracking-widest text-brand-700 dark:text-brand-400">
          Our Heritage & Ethos
        </span>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold tracking-tight text-brand-950 dark:text-stone-50">
          Pioneering Traceable Horticulture
        </h1>
        <p className="text-stone-600 dark:text-stone-300 text-base sm:text-lg leading-relaxed">
          Established with the conviction that commercial orchard longevity begins at the cellular level of the graft union, Deep Root Farms bridges botanical rigor with progressive field agronomy.
        </p>
      </div>

      {/* Grid: 3 Key Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white dark:bg-stone-900 p-8 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-700 dark:text-brand-300">
            <Trees className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-xl font-bold">Conserved Mother Orchards</h3>
          <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
            Our scion donor blocks house authenticated trees older than 15 years with documented yield histories, verified trueness-to-type, and zero systemic viral pathogens.
          </p>
        </div>

        <div className="bg-white dark:bg-stone-900 p-8 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-700 dark:text-brand-300">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-xl font-bold">Strict 21-Day Curing</h3>
          <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
            Newly grafted saplings spend three weeks in precision-regulated mist chambers to foster vascular cambium bridge formation before any outdoor hardening begins.
          </p>
        </div>

        <div className="bg-white dark:bg-stone-900 p-8 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-700 dark:text-brand-300">
            <GitBranch className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-xl font-bold">Immutable Pedigree Tracking</h3>
          <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
            Every batch generated inside our facility is tagged with a unique sequential identifier, permanently linking rootstock, scion, donor tree, technician, and curing history.
          </p>
        </div>
      </div>

      {/* Photographic Story Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pt-8">
        <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-xl border-4 border-white dark:border-stone-800">
          <img
            src="https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=1000&q=80"
            alt="Mature Mother Tree Block"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="space-y-6">
          <h2 className="font-serif text-3xl font-bold">The Seed-to-Orchard Journey</h2>
          <p className="text-stone-600 dark:text-stone-300 leading-relaxed text-sm sm:text-base">
            Commercial fruit growing involves years of capital outlay before commercial bearing begins. A flawed rootstock or mismatched scion cannot be undone once planted across 20 acres.
          </p>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 text-stone-800 dark:text-stone-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Native polyembryonic rootstock selection for alkaline & drought resilience.</span>
            </div>
            <div className="flex items-center gap-3 text-stone-800 dark:text-stone-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Parafilm seal technique preventing moisture loss during critical healing.</span>
            </div>
            <div className="flex items-center gap-3 text-stone-800 dark:text-stone-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Soil-tested media with zero weed seeds and trichoderma enrichment.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;

