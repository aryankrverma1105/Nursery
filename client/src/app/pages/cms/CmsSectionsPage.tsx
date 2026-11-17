import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import { LayoutDashboard, Save, ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react';

export const CmsSectionsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [editingSection, setEditingSection] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['cms-sections'],
    queryFn: async () => {
      const res = await api.get('/cms/sections');
      return res.data.sections;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (section: any) => {
      await api.put(`/cms/sections/${section.id}`, section);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-sections'] });
      setEditingSection(null);
      alert('Homepage section updated & public cache invalidated.');
    },
  });

  const sections = data || [];

  const handleToggle = (section: any) => {
    updateMutation.mutate({
      ...section,
      is_enabled: !section.is_enabled,
    });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const current = sections[index];
    const target = sections[targetIndex];

    const tempOrder = current.display_order;
    current.display_order = target.display_order;
    target.display_order = tempOrder;

    updateMutation.mutate(current);
    updateMutation.mutate(target);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
          Homepage Section Management
        </h1>
        <p className="text-xs text-stone-500">
          Reorder sections, toggle visibility, and customize headings and calls-to-action on the public website.
        </p>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-stone-500">Loading sections...</div>
      ) : (
        <div className="space-y-3">
          {sections.map((section: any, idx: number) => (
            <div
              key={section.id}
              className={`p-4 rounded-2xl bg-white dark:bg-stone-900 border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                section.is_enabled
                  ? 'border-stone-200 dark:border-stone-800'
                  : 'border-dashed border-stone-300 dark:border-stone-700 opacity-60'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded text-stone-600 dark:text-stone-300">
                    Order #{section.display_order} • Key: {section.section_key}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      section.is_enabled
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    {section.is_enabled ? 'LIVE' : 'HIDDEN'}
                  </span>
                </div>
                <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
                  {section.title || section.section_key.toUpperCase()}
                </h3>
                {section.subtitle && (
                  <p className="text-xs text-stone-500 line-clamp-1">{section.subtitle}</p>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleMove(idx, 'up')}
                  disabled={idx === 0}
                  className="p-2 rounded-lg border border-stone-300 dark:border-stone-700 disabled:opacity-30"
                  title="Move Up"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleMove(idx, 'down')}
                  disabled={idx === sections.length - 1}
                  className="p-2 rounded-lg border border-stone-300 dark:border-stone-700 disabled:opacity-30"
                  title="Move Down"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleToggle(section)}
                  className={`p-2 rounded-lg border ${
                    section.is_enabled
                      ? 'border-stone-300 text-stone-700'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  }`}
                  title={section.is_enabled ? 'Hide from public site' : 'Show on public site'}
                >
                  {section.is_enabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setEditingSection(section)}
                  className="px-3 py-1.5 bg-brand-800 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingSection && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 max-w-lg w-full rounded-3xl p-6 border border-stone-200 dark:border-stone-800 shadow-2xl space-y-4">
            <h3 className="font-serif text-xl font-bold">
              Edit Section: {editingSection.section_key}
            </h3>

            <div>
              <label className="block text-xs font-bold mb-1">Section Heading / Title</label>
              <input
                type="text"
                value={editingSection.title || ''}
                onChange={(e) => setEditingSection({ ...editingSection, title: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-sm font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Section Subtitle / Description</label>
              <textarea
                rows={3}
                value={editingSection.subtitle || ''}
                onChange={(e) => setEditingSection({ ...editingSection, subtitle: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-earth-50/50 dark:bg-stone-950 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingSection(null)}
                className="px-4 py-2 text-xs font-bold text-stone-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => updateMutation.mutate(editingSection)}
                className="px-5 py-2.5 rounded-xl bg-brand-800 text-white text-xs font-bold shadow"
              >
                Save & Invalidate Cache
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CmsSectionsPage;

