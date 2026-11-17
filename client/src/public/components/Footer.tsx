import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout, Phone, Mail, MapPin, MessageSquare, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FooterProps {
  settings?: Record<string, string>;
}

export const Footer: React.FC<FooterProps> = ({ settings }) => {
  const { t } = useTranslation();

  const siteName = settings?.site_name || '[SAMPLE DATA] Deep Root Farms';
  const phone = settings?.contact_phone || '+91 98765 43210';
  const whatsapp = settings?.contact_whatsapp || '919876543210';
  const email = settings?.contact_email || 'info@deeprootfarms.local';
  const address = settings?.contact_address || 'Survey No. 108, Riverside Highway, Agri Zone [SAMPLE DATA]';

  return (
    <footer className="bg-stone-900 text-stone-300 dark:bg-black dark:text-stone-400 border-t border-stone-800 transition-colors pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Col 1: Brand & Philosophy */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-700 text-brand-100 flex items-center justify-center">
                <Sprout className="w-6 h-6 text-brand-300" />
              </div>
              <span className="font-serif text-xl font-bold tracking-tight text-white block">
                {siteName}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-stone-400">
              Specialized scientific propagation of commercial grafted fruit cultivars, virus-indexed mother trees, and vigorous rootstocks with individual batch pedigree traceability.
            </p>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-400 bg-brand-950/60 border border-brand-800 px-3 py-1.5 rounded-full">
              <ShieldCheck className="w-4 h-4 text-brand-400" />
              <span>Certified Horticultural Lineage</span>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold tracking-wider uppercase text-white font-sans">
              Navigation
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/" className="hover:text-brand-400 transition-colors">
                  {t('nav.home')}
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-brand-400 transition-colors">
                  {t('nav.about')}
                </Link>
              </li>
              <li>
                <Link to="/products" className="hover:text-brand-400 transition-colors">
                  {t('nav.products')}
                </Link>
              </li>
              <li>
                <Link to="/gallery" className="hover:text-brand-400 transition-colors">
                  {t('nav.gallery')}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-brand-400 transition-colors">
                  {t('nav.contact')}
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-brand-400 transition-colors text-stone-400">
                  {t('nav.login')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Specialties */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold tracking-wider uppercase text-white font-sans">
              Specialties
            </h4>
            <ul className="space-y-2 text-sm text-stone-400">
              <li>Grafted Kesar & Alphonso Mango</li>
              <li>Taiwan Pink Guava Hybrids</li>
              <li>Wilt-Resistant Desi Rootstocks</li>
              <li>High-Density Meadow Planting</li>
              <li>Contract Custom Graft Allocations</li>
              <li>Acclimatized Fruit Saplings</li>
            </ul>
          </div>

          {/* Col 4: Contact & Direct WhatsApp */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold tracking-wider uppercase text-white font-sans">
              Direct Inquiries
            </h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-brand-400 shrink-0 mt-1" />
                <span>{address}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-brand-400 shrink-0" />
                <span>{phone}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-brand-400 shrink-0" />
                <span>{email}</span>
              </div>
            </div>

            <a
              href={`https://wa.me/${whatsapp}?text=${encodeURIComponent('Hello Deep Root Farms, I am inquiring about sapling availability.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-semibold uppercase tracking-wider px-4 py-2.5 rounded-lg transition-transform active:scale-95 shadow-md mt-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Inquire via WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-stone-800 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <div>
            &copy; {new Date().getFullYear()} {siteName}. All rights reserved. Public Catalogue Only — No Online Checkout.
          </div>
          <div className="text-amber-500/80 font-mono text-[11px]">
            DEMO MODE: Sample data active. Never represents live commercial inventory.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

