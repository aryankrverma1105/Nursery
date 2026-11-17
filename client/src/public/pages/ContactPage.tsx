import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import SeoHead from '../components/SeoHead';
import { MapPin, Phone, Mail, MessageSquare, Send, CheckCircle2 } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const { data } = useQuery({
    queryKey: ['public-settings'],
    queryFn: async () => {
      const res = await api.get('/public/settings');
      return res.data.settings;
    },
  });

  const settings = data || {};
  const mapsEmbed =
    settings.contact_maps_embed ||
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d115000!2d77.2!3d28.6!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjjCsDM2JzAwLjAiTiA3N8KwMTInMDAuMCJF!5e0!3m2!1sen!2sin!4v1600000000000!5m2!1sen!2sin';

  const [formState, setFormState] = useState({ name: '', phone: '', email: '', subject: '', message: '', botField: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/public/enquiry', formState);
      setSubmitted(true);
      setFormState({ name: '', phone: '', email: '', subject: '', message: '', botField: '' });
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      <SeoHead
        title="Contact & Location | Deep Root Farms"
        description="Connect with our horticulture center for orchard sapling inquiries, bulk allocations, and farm visits."
      />

      <div className="max-w-3xl space-y-4">
        <span className="text-xs font-bold uppercase tracking-widest text-brand-700 dark:text-brand-400">
          Propagation Center
        </span>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold tracking-tight text-brand-950 dark:text-stone-50">
          Visit or Enquire
        </h1>
        <p className="text-stone-600 dark:text-stone-300 text-base sm:text-lg leading-relaxed">
          Our nursery is open for commercial grower inspections. Book an appointment with our head plant propagator or submit a seasonal inquiry below.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Contact Info & WhatsApp */}
        <div className="lg:col-span-5 space-y-8">
          <div className="bg-white dark:bg-stone-900 p-8 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-6">
            <h2 className="font-serif text-2xl font-bold">Nursery Coordinates</h2>

            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-brand-700 dark:text-brand-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-stone-900 dark:text-stone-100">Physical Nursery</div>
                  <div className="text-stone-500 mt-0.5">
                    {settings.contact_address || 'Survey No. 108, Riverside Highway, Agri Zone [SAMPLE DATA]'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-brand-700 dark:text-brand-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-stone-900 dark:text-stone-100">Telephone Consultation</div>
                  <div className="text-stone-500 mt-0.5">{settings.contact_phone || '+91 98765 43210'}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-brand-700 dark:text-brand-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-stone-900 dark:text-stone-100">Electronic Mail</div>
                  <div className="text-stone-500 mt-0.5">{settings.contact_email || 'info@greenvalleynursery.local'}</div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 dark:border-stone-800">
              <a
                href={`https://wa.me/${settings.contact_whatsapp || '919876543210'}?text=Hello%20Green%20Valley%20Nursery,%20I%20would%20like%20to%20plan%20a%20nursery%20visit.`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-semibold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2.5 shadow-md transition-transform active:scale-[0.99] text-sm"
              >
                <MessageSquare className="w-5 h-5" />
                <span>Message Head Propagator</span>
              </a>
            </div>
          </div>

          {/* Google Maps Embed */}
          <div className="rounded-3xl overflow-hidden border border-stone-200 dark:border-stone-800 shadow-sm aspect-[16/10] bg-stone-200 dark:bg-stone-800">
            <iframe
              src={mapsEmbed}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Nursery Map Location"
            />
          </div>
        </div>

        {/* Enquiry Form */}
        <div className="lg:col-span-7 bg-white dark:bg-stone-900 p-8 sm:p-12 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm">
          <h2 className="font-serif text-2xl font-bold mb-2">Send Consultation Message</h2>
          <p className="text-xs text-stone-500 mb-6">
            Inquiries are stored directly in our customer relations database and assigned to area agronomists.
          </p>

          {submitted ? (
            <div className="py-12 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="font-serif text-2xl font-bold">Message Sent</h3>
              <p className="text-sm text-stone-500 max-w-sm mx-auto">
                Thank you for contacting us. We will reach back via phone or email within 1 business day.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="text-xs font-semibold text-brand-800 dark:text-brand-400 uppercase tracking-wider underline mt-4"
              >
                Send another enquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="hidden" aria-hidden="true">
                <input
                  type="text"
                  value={formState.botField}
                  onChange={(e) => setFormState({ ...formState, botField: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formState.phone}
                    onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={formState.email}
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Subject</label>
                <input
                  type="text"
                  value={formState.subject}
                  onChange={(e) => setFormState({ ...formState, subject: e.target.value })}
                  placeholder="e.g. 500 Kesar mango booking"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Message *</label>
                <textarea
                  required
                  rows={4}
                  value={formState.message}
                  onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                  placeholder="Tell us about your soil type, irrigation, and expected delivery date..."
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-800 hover:bg-brand-900 text-white font-semibold py-3.5 rounded-xl shadow transition-all active:scale-[0.99] flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? 'Sending...' : 'Transmit Enquiry'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactPage;

