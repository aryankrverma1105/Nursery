import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import { Mail, Phone, Clock, CheckCircle2 } from 'lucide-react';

export const CmsEnquiriesPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: enquiries, isLoading } = useQuery({
    queryKey: ['cms-enquiries'],
    queryFn: async () => {
      const res = await api.get('/cms/enquiries');
      return res.data.enquiries;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await api.patch(`/cms/enquiries/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-enquiries'] });
    },
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
          Customer Inquiries & Leads
        </h1>
        <p className="text-xs text-stone-500">
          Enquiries received from the public website consultation form. Protected by honeypot anti-spam.
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-stone-500">Loading inquiries...</div>
      ) : (enquiries || []).length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-8 text-sm text-stone-500">
          No inquiries received yet.
        </div>
      ) : (
        <div className="space-y-3">
          {(enquiries || []).map((e: any) => (
            <div
              key={e.id}
              className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
                    {e.name}
                  </h3>
                  <div className="text-xs text-stone-500 flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-brand-600" />
                      {e.phone}
                    </span>
                    {e.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-stone-400" />
                        {e.email}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={e.status}
                    onChange={(ev) =>
                      updateStatusMutation.mutate({ id: e.id, status: ev.target.value })
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                      e.status === 'NEW'
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : e.status === 'IN_PROGRESS'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : e.status === 'RESOLVED'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    <option value="NEW">NEW</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="SPAM">SPAM</option>
                  </select>
                </div>
              </div>

              <div className="bg-earth-50/60 dark:bg-stone-950 p-3.5 rounded-2xl text-xs text-stone-700 dark:text-stone-300 leading-relaxed border border-stone-100 dark:border-stone-800">
                <div className="font-bold text-stone-900 dark:text-stone-100 mb-1">
                  Subject: {e.subject || 'General Enquiry'}
                </div>
                {e.message}
              </div>

              <div className="text-[10px] text-stone-400">
                Submitted on {new Date(e.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CmsEnquiriesPage;

