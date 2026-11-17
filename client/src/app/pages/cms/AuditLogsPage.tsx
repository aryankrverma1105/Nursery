import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import { ShieldCheck, User } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['cms-audit-logs'],
    queryFn: async () => {
      const res = await api.get('/reports/audit-logs');
      return res.data.logs;
    },
  });

  const logs = data || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
          Security & Operations Audit Trail
        </h1>
        <p className="text-xs text-stone-500">
          Permanent immutable log of logins, CMS publishes, inventory writes, sales transactions, and quarantine events.
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-stone-500">Loading audit trail...</div>
      ) : (
        <div className="space-y-3">
          {logs.map((log: any) => (
            <div
              key={log.id}
              className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-2 text-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold uppercase text-[10px] px-2 py-0.5 rounded bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300">
                    {log.action}
                  </span>
                  <span className="text-stone-500">
                    Entity: <strong>{log.entity_type}</strong> {log.entity_id ? `#${log.entity_id}` : ''}
                  </span>
                </div>
                <div className="text-[11px] text-stone-400">
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>

              <div className="flex items-center gap-3 text-stone-600 dark:text-stone-400">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-stone-400" />
                  {log.author_name ? `${log.author_name} (${log.author_email})` : 'System / Anonymous'}
                </span>
                {log.ip_address && <span>• IP: {log.ip_address}</span>}
              </div>

              {log.new_values && (
                <div className="p-2.5 bg-stone-50 dark:bg-stone-850 rounded-xl font-mono text-[11px] text-stone-800 dark:text-stone-200 overflow-x-auto">
                  {log.new_values}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuditLogsPage;

