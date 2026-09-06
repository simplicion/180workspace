"use client";

import { useState } from 'react';
import { Headphones, Music, Users, Clock, Radio, Sparkles } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { UniversalSlideDrawer } from './UniversalSlideDrawer';

interface CallQueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CallQueueDrawer({
  isOpen,
  onClose,
  onSuccess
}: CallQueueDrawerProps) {
  const [name, setName] = useState('VIP Priority Hold Queue');
  const [maxQueueSize, setMaxQueueSize] = useState(25);
  const [maxWaitTimeSec, setMaxWaitTimeSec] = useState(300);
  const [holdMusicUrl, setHoldMusicUrl] = useState('');
  const [announcePosition, setAnnouncePosition] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Queue name is required');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: name.trim(),
        maxQueueSize: Number(maxQueueSize) || 25,
        maxWaitTimeSec: Number(maxWaitTimeSec) || 300,
        holdMusicUrl: holdMusicUrl.trim() || null,
        announcePosition
      };

      await api.post('/api/v1/voiceforce/queues', payload);
      toast.success('Active hold queue created successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create queue');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <UniversalSlideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Create Active Call Queue"
      subtitle="Configure an active hold room with hold music, position announcements, and auto-dispatch."
      icon={Headphones}
      iconColorClass="text-amber-600 dark:text-amber-400"
      iconBgClass="bg-amber-50 dark:bg-amber-950/60"
      maxWidthClass="max-w-xl"
      onSubmit={handleSubmit}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm transition-all shadow-md shadow-amber-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {submitting ? 'Creating Queue...' : 'Create Hold Queue'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Queue Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Queue Title
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sales Overflow Queue"
            className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            required
          />
        </div>

        {/* Queue Capacity & Max Wait Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-gray-400" />
              <span>Max Queue Capacity</span>
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={maxQueueSize}
              onChange={(e) => setMaxQueueSize(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Maximum waiting callers allowed.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span>Max Wait Duration</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={30}
                max={1800}
                value={maxWaitTimeSec}
                onChange={(e) => setMaxWaitTimeSec(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
              <span className="text-xs text-gray-500">sec</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{Math.round(maxWaitTimeSec / 60)} min before voicemail.</p>
          </div>
        </div>

        {/* Hold Music URL */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5 text-gray-400" />
            <span>Custom Hold Music Audio Stream (Optional)</span>
          </label>
          <input
            type="url"
            value={holdMusicUrl}
            onChange={(e) => setHoldMusicUrl(e.target.value)}
            placeholder="https://your-bucket.s3.amazonaws.com/chime.mp3"
            className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            Leave blank to use default soothing corporate ambient audio.
          </p>
        </div>

        {/* Position Announcement Toggle */}
        <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                Caller Position Announcements
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Periodically speaks "You are caller #2 in line" to reassure callers.
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={announcePosition}
              onChange={(e) => setAnnouncePosition(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-amber-600"></div>
          </label>
        </div>
      </div>
    </UniversalSlideDrawer>
  );
}
