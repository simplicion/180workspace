"use client";

import { useState } from 'react';
import { Plus, Trash2, Layers, ArrowRight, ShieldCheck, Globe, Smartphone, Bot } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Drawer } from '@/components/ui/Drawer';
import CustomSelect from '@/components/ui/CustomSelect';

interface CreateRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  linkId: string;
  onSuccess: (newRule: any) => void;
}

interface ConditionItem {
  type: string;
  operator: string;
  key?: string;
  value: string;
}

export default function CreateRuleModal({ isOpen, onClose, linkId, onSuccess }: CreateRuleModalProps) {
  const [name, setName] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [actionType, setActionType] = useState('redirect_302');
  const [weight, setWeight] = useState(100);
  const [conditions, setConditions] = useState<ConditionItem[]>([
    { type: 'geo_country', operator: 'equals', value: 'US' }
  ]);
  const [loading, setLoading] = useState(false);

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
      copy[index] = { ...copy[index], [field]: val };
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
      const res = await api.post(`/v1/traffic-director/links/${linkId}/rules`, {
        name,
        destinationUrl,
        actionType,
        weight: Number(weight),
        conditions
      });

      toast.success('Routing Rule added!');
      onSuccess(res.data.data.rule);
      onClose();
      // Reset form
      setName('');
      setDestinationUrl('');
      setActionType('redirect_302');
      setWeight(100);
      setConditions([{ type: 'geo_country', operator: 'equals', value: 'US' }]);
    } catch (error: any) {
      console.error('Failed to create rule:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to create rule');
    } finally {
      setLoading(false);
    }
  };

  const conditionTypeOptions = [
    { value: 'geo_country', label: 'Country (ISO Code)' },
    { value: 'geo_city', label: 'City Name' },
    { value: 'device_type', label: 'Device Type (Mobile/Desktop/Tablet)' },
    { value: 'network_type', label: 'Network Type (Residential/Datacenter)' },
    { value: 'asn_provider', label: 'Cloud Provider (AWS/GCP/Azure)' },
    { value: 'touch_support', label: 'Touchscreen Hardware Present' },
    { value: 'gpu_renderer', label: 'Hardware GPU (Exclude SwiftShader)' },
    { value: 'battery_valid', label: 'Realistic Battery (Exclude 100% Static)' },
    { value: 'os', label: 'Operating System' },
    { value: 'browser', label: 'Browser Name' },
    { value: 'bot_status', label: 'Bot / Human Status' },
    { value: 'header', label: 'Custom HTTP Header' },
    { value: 'query_param', label: 'URL Query Parameter' },
    { value: 'language', label: 'Accept-Language' }
  ];

  const operatorOptions = [
    { value: 'equals', label: 'Equals (Exact Match)' },
    { value: 'not_equals', label: 'Does Not Equal' },
    { value: 'contains', label: 'Contains Substring' },
    { value: 'not_contains', label: 'Does Not Contain' },
    { value: 'in', label: 'In (Comma-separated List)' },
    { value: 'not_in', label: 'Not In List' },
    { value: 'regex', label: 'Matches Regular Expression' }
  ];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Add Dynamic Routing Rule"
      description="Match visitor criteria to route traffic to specific landing endpoints"
      icon={<Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
      maxWidth="max-w-2xl"
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
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] rounded-xl shadow-md shadow-purple-500/20 disabled:opacity-50 transition"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            Save Rule
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
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              HTTP Action Type
            </label>
            <CustomSelect
              value={actionType}
              onChange={(e: any) => setActionType(e.target.value)}
              options={[
                { value: 'redirect_302', label: '302 Temporary Redirect (Standard)' },
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
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Traffic Weight Split ({weight}%)
            </label>
            <span className="text-xs text-gray-400">Percentage of matched traffic routed</span>
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
              className="flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
            >
              <Plus className="w-3.5 h-3.5" /> Add Condition
            </button>
          </div>

          {conditions.map((cond, idx) => (
            <div key={idx} className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-2.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* Condition Type */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Signal Type</label>
                  <CustomSelect
                    value={cond.type}
                    onChange={(e: any) => handleUpdateCondition(idx, 'type', e.target.value)}
                    options={conditionTypeOptions}
                  />
                </div>

                {/* Operator */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Operator</label>
                  <CustomSelect
                    value={cond.operator}
                    onChange={(e: any) => handleUpdateCondition(idx, 'operator', e.target.value)}
                    options={operatorOptions}
                  />
                </div>
              </div>

              {/* Optional Key for Header/Query */}
              {(cond.type === 'header' || cond.type === 'query_param') && (
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                    {cond.type === 'header' ? 'Header Name' : 'Query Parameter Name'}
                  </label>
                  <input
                    type="text"
                    placeholder={cond.type === 'header' ? 'e.g. x-custom-token' : 'e.g. utm_source'}
                    value={cond.key || ''}
                    onChange={(e) => handleUpdateCondition(idx, 'key', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
                  />
                </div>
              )}

              {/* Match Value */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Target Value</label>
                {cond.type === 'device_type' ? (
                  <CustomSelect
                    value={cond.value}
                    onChange={(e: any) => handleUpdateCondition(idx, 'value', e.target.value)}
                    options={[
                      { value: 'mobile', label: 'Mobile (Smartphone)' },
                      { value: 'desktop', label: 'Desktop / Laptop' },
                      { value: 'tablet', label: 'Tablet (iPad / Android Tablet)' }
                    ]}
                  />
                ) : cond.type === 'bot_status' ? (
                  <CustomSelect
                    value={cond.value}
                    onChange={(e: any) => handleUpdateCondition(idx, 'value', e.target.value)}
                    options={[
                      { value: 'human', label: 'Human (Verified User)' },
                      { value: 'bot', label: 'Bot (Crawler / Scraper / Review Engine)' }
                    ]}
                  />
                ) : cond.type === 'touch_support' ? (
                  <CustomSelect
                    value={cond.value}
                    onChange={(e: any) => handleUpdateCondition(idx, 'value', e.target.value)}
                    options={[
                      { value: 'true', label: 'Yes (Touchscreen Hardware Present)' },
                      { value: 'false', label: 'No (No Touchscreen / Emulated Mobile)' }
                    ]}
                  />
                ) : cond.type === 'battery_valid' ? (
                  <CustomSelect
                    value={cond.value}
                    onChange={(e: any) => handleUpdateCondition(idx, 'value', e.target.value)}
                    options={[
                      { value: 'true', label: 'Yes (Realistic Battery Discharge)' },
                      { value: 'false', label: 'No (Static 100% Cloud Tester)' }
                    ]}
                  />
                ) : cond.type === 'network_type' ? (
                  <CustomSelect
                    value={cond.value}
                    onChange={(e: any) => handleUpdateCondition(idx, 'value', e.target.value)}
                    options={[
                      { value: 'residential', label: 'Residential ISP' },
                      { value: 'datacenter', label: 'Datacenter / Cloud Subnet' },
                      { value: 'cellular', label: 'Cellular 4G/5G' },
                      { value: 'vpn', label: 'VPN / Proxy' }
                    ]}
                  />
                ) : cond.type === 'asn_provider' ? (
                  <CustomSelect
                    value={cond.value}
                    onChange={(e: any) => handleUpdateCondition(idx, 'value', e.target.value)}
                    options={[
                      { value: 'AWS', label: 'Amazon AWS' },
                      { value: 'GOOGLE_CLOUD', label: 'Google Cloud' },
                      { value: 'AZURE', label: 'Microsoft Azure' },
                      { value: 'DIGITALOCEAN', label: 'DigitalOcean' },
                      { value: 'HETZNER', label: 'Hetzner Online' },
                      { value: 'CLOUDFLARE', label: 'Cloudflare' },
                      { value: 'OVH', label: 'OVH' },
                      { value: 'ORACLE', label: 'Oracle Cloud' }
                    ]}
                  />
                ) : (
                  <input
                    type="text"
                    placeholder={
                      cond.type === 'geo_country'
                        ? 'e.g. US, CA, GB'
                        : cond.type === 'gpu_renderer'
                        ? 'e.g. swiftshader, nvidia, apple'
                        : 'Value to match'
                    }
                    value={cond.value}
                    onChange={(e) => handleUpdateCondition(idx, 'value', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
                  />
                )}
              </div>

              {/* Remove condition button */}
              {conditions.length > 1 && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => handleRemoveCondition(idx)}
                    className="flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-600 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove Condition
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </form>
    </Drawer>
  );
}
