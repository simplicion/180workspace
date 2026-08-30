"use client";

import { useState, useEffect } from 'react';
import { Plus, Layers, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Drawer } from '@/components/ui/Drawer';
import CustomSelect from '@/components/ui/CustomSelect';
import InfoTooltip from '@/components/ui/InfoTooltip';
import { LogoLoader } from '@workspace/ui';
import ConditionRow, { ConditionItem } from './ConditionRow';
import { getDefaultValueForType } from './TargetingSignalPresets';

interface EditRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  linkId: string;
  rule: any;
  onSuccess: (updatedRule: any) => void;
}

export default function EditRuleModal({ isOpen, onClose, linkId, rule, onSuccess }: EditRuleModalProps) {
  const [name, setName] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [actionType, setActionType] = useState('redirect_302');
  const [weight, setWeight] = useState(100);
  const [conditions, setConditions] = useState<ConditionItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (rule) {
      setName(rule.name || '');
      setDestinationUrl(rule.destinationUrl || '');
      setActionType(rule.actionType || 'redirect_302');
      setWeight(rule.weight !== undefined ? rule.weight : 100);

      let parsedConditions: ConditionItem[] = [];
      if (typeof rule.conditions === 'string') {
        try {
          parsedConditions = JSON.parse(rule.conditions);
        } catch (e) {
          parsedConditions = [];
        }
      } else if (Array.isArray(rule.conditions)) {
        parsedConditions = rule.conditions;
      }

      setConditions(parsedConditions.length > 0 ? parsedConditions : [
        { type: 'geo_country', operator: 'equals', value: 'US' }
      ]);
    }
  }, [rule]);

  const handleAddCondition = () => {
    setConditions(prev => [
      ...prev,
      { type: 'device_type', operator: 'equals', value: 'mobile' }
    ]);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateCondition = (index: number, field: keyof ConditionItem, val: string) => {
    setConditions(prev => {
      const copy = [...prev];
      if (field === 'type') {
        copy[index] = {
          ...copy[index],
          type: val,
          value: getDefaultValueForType(val),
          key: (val === 'header' || val === 'query_param') ? (copy[index].key || '') : undefined
        };
      } else {
        copy[index] = { ...copy[index], [field]: val };
      }
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !destinationUrl.trim()) {
      toast.error('Name and Destination URL are required');
      return;
    }

    try {
      setLoading(true);
      const res = await api.put(`/api/v1/traffic-director/rules/${rule.id}`, {
        name,
        destinationUrl,
        actionType,
        weight: Number(weight),
        conditions
      });

      toast.success('Routing Rule updated!');
      onSuccess(res.data.data.rule);
      onClose();
    } catch (error: any) {
      console.error('Failed to update rule:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to update rule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Dynamic Routing Rule"
      description="Update visitor matching conditions and destination landing endpoint"
      icon={<Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
      maxWidth="max-w-2xl"
      position="right"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] rounded-xl shadow-md shadow-purple-500/20 disabled:opacity-50 transition cursor-pointer"
          >
            {loading ? (
              <LogoLoader className="w-4 h-4 animate-spin text-white" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            Update Rule
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5 p-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Rule Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. US Mobile Visitors"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              <span>HTTP Action Type</span>
              <InfoTooltip content="302 is recommended for cloaking and dynamic routing because it avoids client-side browser caching." />
            </label>
            <CustomSelect
              value={actionType}
              onChange={(e: any) => setActionType(e.target.value)}
              options={[
                { value: 'redirect_302', label: '302 Temporary Redirect (Standard)' },
                { value: 'proxy_target_offer', label: 'Server-Side Proxy (200 OK - No Redirect)' },
                { value: 'js_replace', label: 'Client-Side JavaScript Replace' },
                { value: 'redirect_307', label: '307 Temporary Redirect (Preserve Method)' },
                { value: 'redirect_301', label: '301 Permanent Redirect' }
              ]}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
            Destination Target Landing URL <span className="text-rose-500">*</span>
          </label>
          <input
            type="url"
            required
            placeholder="https://app.example.com/us-mobile-offer"
            value={destinationUrl}
            onChange={(e) => setDestinationUrl(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              <span>Traffic Weight Split ({weight}%)</span>
              <InfoTooltip content="Set less than 100% to A/B test between multiple target offer URLs or split traffic." />
            </label>
            <span className="text-xs text-gray-400">Percentage routed</span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
        </div>

        {/* Condition Matrix */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Condition Matrix (All must match - AND Logic)
            </label>
            <button
              type="button"
              onClick={handleAddCondition}
              className="flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Condition
            </button>
          </div>

          {conditions.map((cond, idx) => (
            <ConditionRow
              key={idx}
              condition={cond}
              index={idx}
              totalCount={conditions.length}
              onUpdate={handleUpdateCondition}
              onRemove={handleRemoveCondition}
            />
          ))}
        </div>
      </form>
    </Drawer>
  );
}
