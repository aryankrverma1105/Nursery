import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, MessageSquare, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

interface FooterProps {
  settings?: Record<string, string>;
}

export const Footer: React.FC<FooterProps> = ({ settings: propSettings }) => {
  const { t } = useTranslation();

  // If settings not passed as prop, fetch live public settings
  const { data: fetchedSettings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: async () => {
      const res = await api.get('/public/settings');
      return res.data.settings;
    },
    enabled: !propSettings,
  });

  const settings = propSettings || fetchedSettings || {};

  const rawSiteName = settings.site_name || 'Deep Root Farms';
  const siteName = rawSiteName.replace(/\[SAMPLE DATA\]/gi, '').trim() || 'Deep Root Farms';
  const logoMark = settings.site_logo_mark || '/logo/deep-root-farms-mark.svg';
  const phone = settings.contact_phone || '+91 98765 43210';
  const whatsapp = settings.contact_whatsapp || '919876543210';
  const email = settings.contact_email || 'info@deeprootfarms.local';
  const rawAddress = settings.contact_address || 'Survey No. 108, Riverside Highway, Agri Zone';
  const address = rawAddress.replace(/\[SAMPLE DATA\]/gi, '').trim() || 'Survey No. 108, Riverside Highway, Agri Zone';
  
  const footerAbout = settings.footer_about || 'Specialized scientific propagation of commercial grafted fruit cultivars, virus-indexed mother trees, and vigorous rootstocks with individual batch pedigree traceability.';
  const footerBadge = settings.footer_badge || 'Certified Horticultural Lineage';
  const whatsappBtnText = settings.contact_whatsapp_text || 'Inquire via WhatsApp';
  const whatsappMsg = settings.contact_whatsapp_msg || 'Hello Deep Root Farms, I am inquiring about sapling availability.';

  const defaultSpecialties = [
    'Grafted Kesar & Alphonso Mango',
    'Taiwan Pink Guava Hybrids',
    'Wilt-Resistant Desi Rootstocks',
    'High-Density Meadow Planting',
    'Contract Custom Graft Allocations',
    'Acclimatized Fruit Saplings',
  ];

  const specialties = settings.footer_specialties
    ? settings.footer_specialties.split('\n').map((s: string) => s.trim()).filter(Boolean)
    : defaultSpecialties;

  const currentYear = new Date().getFullYear();
  const rawCopyright = settings.footer_copyright || `© ${currentYear} ${siteName}. All rights reserved. Public Catalogue Only — No Online Checkout.`;
  const copyrightText = rawCopyright
    .replace(/\{YEAR\}/gi, String(currentYear))
    .replace(/\{SITE_NAME\}/gi, siteName);

  const footerNotice = settings.footer_notice?.trim();

  return (
    <footer className="bg-stone-900 text-stone-300 dark:bg-black dark:text-stone-400 border-t border-stone-800 transition-colors pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Col 1: Brand & Philosophy */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={logoMark}
                alt={siteName}
                className="w-11 h-11 rounded-xl object-contain shadow-sm"
              />
              <span className="font-serif text-xl font-bold tracking-tight text-white block">
                {siteName}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-stone-400">
              {footerAbout}
            </p>
            {footerBadge && (
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-400 bg-brand-950/60 border border-brand-800 px-3 py-1.5 rounded-full">
                <ShieldCheck className="w-4 h-4 text-brand-400" />
                <span>{footerBadge}</span>
              </div>
            )}
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
              {specialties.map((item: string, idx: number) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500/70 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
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
              href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(whatsappMsg)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-semibold uppercase tracking-wider px-4 py-2.5 rounded-lg transition-transform active:scale-95 shadow-md mt-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{whatsappBtnText}</span>
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-stone-800 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <div>{copyrightText}</div>
          {footerNotice && (
            <div className="text-amber-500/90 font-mono text-[11px] bg-stone-950/80 px-3 py-1 rounded-md border border-stone-800">
              {footerNotice}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;

