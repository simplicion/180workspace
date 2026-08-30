"use client";

import { useState, useEffect } from 'react';
import { Settings, Sparkles } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Drawer } from '@/components/ui/Drawer';

interface EditLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  link: any;
  onSuccess: () => void;
}

export default function EditLinkModal({ isOpen, onClose, link, onSuccess }: EditLinkModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (link) {
      setName(link.name || '');
      setDescription(link.description || '');
      setCustomDomain(link.customDomain || '');
      setTagsInput(Array.isArray(link.tags) ? link.tags.join(', ') : '');
    }
  }, [link]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      setLoading(true);
      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      await api.put(`/v1/traffic-director/links/${link.id}`, {
        name,
        description,
        customDomain: customDomain.trim() || null,
        tags
      });

      toast.success('Smart Link details updated!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to update link:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to update link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Smart Link"
      description="Update campaign metadata, domain routing, and tags"
      icon={<Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
      maxWidth="max-w-lg"
      position="right"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-xl shadow-md shadow-indigo-500/20 disabled:opacity-50 transition"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-1">
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
            Link Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
            Custom Domain (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. go.branddomain.com"
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
            Description (Optional)
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
            Tags (Comma separated)
          </label>
          <input
            type="text"
            placeholder="google-ads, ios, us-only"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
          />
        </div>
      </form>
    </Drawer>
  );
}
