import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import SeoHead from '../components/SeoHead';
import {
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  ChevronRight,
  Send,
  Sprout,
  ArrowLeft,
} from 'lucide-react';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Enquiry Modal state
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [formState, setFormState] = useState({ name: '', phone: '', email: '', message: '', botField: '' });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-product-detail', slug],
    queryFn: async () => {
      const res = await api.get(`/public/products/${slug}`);
      return res.data.product;
    },
  });

  const handleEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api.post('/public/enquiry', {
        ...formState,
        subject: `Enquiry for ${data?.name}`,
      });
      setFormSubmitted(true);
    } catch {
    } finally {
      setFormLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto py-24 px-4 text-center space-y-4">
        <h2 className="font-serif text-3xl font-bold text-stone-900 dark:text-stone-100">Cultivar Not Found</h2>
        <p className="text-stone-500 text-sm">The requested product could not be located in our nursery registry.</p>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-brand-800 dark:text-brand-300 font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Catalogue</span>
        </Link>
      </div>
    );
  }

  const images = Array.isArray(data.images) && data.images.length > 0
    ? data.images
    : ['https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=800&q=80'];

  const specs = data.specs || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      <SeoHead
        title={`${data.name} | Deep Root Farms`}
        description={data.short_description || 'Certified grafted fruit cultivar with verified parent lineage.'}
        image={images[0]}
        schemaType="Product"
        schemaData={{
          name: data.name,
          description: data.full_description || data.short_description,
          price: data.price,
          availability: data.availability,
          images: images,
        }}
      />

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-stone-500 uppercase tracking-wider">
        <Link to="/" className="hover:text-brand-700">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/products" className="hover:text-brand-700">Catalogue</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-brand-900 dark:text-brand-300 truncate max-w-xs">{data.name}</span>
      </nav>

      {/* Main Product Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left: Image Gallery */}
        <div className="lg:col-span-7 space-y-4">
          <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-lg">
            <img
              src={images[activeImageIndex]}
              alt={data.name}
              className="w-full h-full object-cover transition-all duration-300"
            />
          </div>

          {images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {images.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                    idx === activeImageIndex
                      ? 'border-brand-600 scale-95 shadow-md'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Lineage Verification Notice */}
          <div className="bg-brand-50/60 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-900 p-5 rounded-2xl flex items-start gap-4">
            <ShieldCheck className="w-6 h-6 text-brand-700 dark:text-brand-400 shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <div className="font-semibold text-brand-950 dark:text-brand-200">
                100% Traceable Plant Material
              </div>
              <p className="text-stone-600 dark:text-stone-400 text-xs leading-relaxed">
                Every sapling of this variety maps to tagged donor mother trees. Our staff can verify rootstock and scion batch serials upon nursery inspection.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Info, Price, Availability, WhatsApp & Enquiry Actions */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-400">
              {data.category_name || 'Commercial Variety'}
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {data.name}
            </h1>
          </div>

          {/* Derived Availability Badge */}
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-sm ${
                data.availability === 'In Stock'
                  ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-600'
                  : data.availability === 'Limited Stock'
                  ? 'bg-amber-950/80 text-amber-200 border border-amber-600'
                  : data.availability === 'Coming Soon'
                  ? 'bg-blue-950/80 text-blue-200 border border-blue-600'
                  : 'bg-rose-950/80 text-rose-200 border border-rose-600'
              }`}
            >
              {data.availability === 'In Stock' && <CheckCircle2 className="w-4 h-4" />}
              {data.availability === 'Limited Stock' && <AlertCircle className="w-4 h-4" />}
              {data.availability === 'Coming Soon' && <HelpCircle className="w-4 h-4" />}
              <span>{data.availability}</span>
            </span>

            {data.availableQuantity > 0 && (
              <span className="text-xs font-medium text-stone-500">
                (~{data.availableQuantity} units ready for orchard transplant)
              </span>
            )}
          </div>

          {/* Price Box */}
          <div className="bg-earth-100/70 dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-2">
            <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Nursery Catalogue Quotation
            </div>
            <div>
              {data.is_price_on_request || data.price === null ? (
                <div className="text-2xl font-bold font-serif text-brand-800 dark:text-brand-300">
                  Price on Request
                </div>
              ) : (
                <div className="text-3xl font-bold font-serif text-stone-900 dark:text-stone-100">
                  ₹{data.price.toFixed(2)}{' '}
                  <span className="text-sm font-sans font-normal text-stone-500">/ individual sapling</span>
                </div>
              )}
            </div>
            <p className="text-xs text-stone-500 leading-relaxed">
              * Volume rates applicable for orders exceeding 100 units. Certified delivery with phytosanitary gate pass.
            </p>
          </div>

          {/* WhatsApp & Consultation Action Buttons */}
          <div className="space-y-3 pt-2">
            <a
              href={data.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-semibold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2.5 shadow-md transition-transform active:scale-[0.99] text-sm uppercase tracking-wider"
            >
              <MessageSquare className="w-5 h-5" />
              <span>Inquire on WhatsApp</span>
            </a>

            <button
              onClick={() => setEnquiryOpen(true)}
              className="w-full bg-brand-800 hover:bg-brand-900 text-white font-semibold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-[0.99] shadow-sm text-sm"
            >
              <Send className="w-4 h-4" />
              <span>Send Plant Consultation Request</span>
            </button>
          </div>

          {/* Short Description */}
          <div className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed pt-2">
            {data.short_description}
          </div>
        </div>
      </div>

      {/* Technical Specifications & Full Agronomy Description */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-8 border-t border-stone-200 dark:border-stone-800">
        <div className="lg:col-span-7 space-y-4">
          <h2 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
            Agronomic Profile & Characteristics
          </h2>
          <div className="text-stone-600 dark:text-stone-300 leading-relaxed space-y-4 text-base">
            <p>{data.full_description || data.short_description}</p>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <h2 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
            Technical Specifications
          </h2>
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
            <table className="w-full text-sm text-left">
              <tbody>
                {Object.entries(specs).map(([k, v], idx) => (
                  <tr
                    key={idx}
                    className="border-b border-stone-100 dark:border-stone-800 last:border-none"
                  >
                    <td className="px-5 py-3 font-semibold text-stone-500 dark:text-stone-400 bg-stone-50/50 dark:bg-stone-950/50 w-1/2">
                      {k}
                    </td>
                    <td className="px-5 py-3 text-stone-900 dark:text-stone-100 font-medium">
                      {String(v)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Enquiry Modal */}
      {enquiryOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 max-w-lg w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                  Enquire About {data.name}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">We respond within 2-4 business hours.</p>
              </div>
              <button
                onClick={() => setEnquiryOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {formSubmitted ? (
              <div className="text-center py-8 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h4 className="font-serif text-xl font-bold">Request Transmitted</h4>
                <p className="text-xs text-stone-500">
                  Our nursery manager will follow up with quotation and availability dates.
                </p>
                <button
                  onClick={() => {
                    setFormSubmitted(false);
                    setEnquiryOpen(false);
                  }}
                  className="bg-brand-800 text-white text-xs font-semibold px-4 py-2 rounded-lg mt-2"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleEnquiry} className="space-y-4">
                <div className="hidden" aria-hidden="true">
                  <input
                    type="text"
                    value={formState.botField}
                    onChange={(e) => setFormState({ ...formState, botField: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-900 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Phone / WhatsApp Number *</label>
                  <input
                    type="tel"
                    required
                    value={formState.phone}
                    onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-900 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Orchard Details & Planting Date *</label>
                  <textarea
                    required
                    rows={3}
                    value={formState.message}
                    onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                    placeholder="Specify number of saplings, location, and preferred month..."
                    className="w-full px-4 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-900 text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEnquiryOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-stone-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="bg-brand-800 hover:bg-brand-900 text-white text-xs font-semibold uppercase tracking-wider px-5 py-2.5 rounded-lg disabled:opacity-50"
                  >
                    {formLoading ? 'Submitting...' : 'Send Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;

