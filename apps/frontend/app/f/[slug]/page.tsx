"use client";

import React, { useState, useEffect, use } from 'react';
import axios from 'axios';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import CustomSelect from '@/components/ui/CustomSelect';

export default function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [form, setForm] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/public/forms/${slug}`);
        setForm(response.data.data.form);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Form not found or is currently inactive.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchForm();
  }, [slug]);

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleCheckboxChange = (fieldId: string, option: string, checked: boolean) => {
    setFormData(prev => {
      const current = prev[fieldId] || [];
      if (checked) {
        return { ...prev, [fieldId]: [...current, option] };
      } else {
        return { ...prev, [fieldId]: current.filter((item: string) => item !== option) };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Process checkbox arrays to strings if needed by backend
      const processedData = { ...formData };
      Object.keys(processedData).forEach(key => {
        if (Array.isArray(processedData[key])) {
          processedData[key] = processedData[key].join(', ');
        }
      });

      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/public/forms/${slug}/submit`, {
        values: processedData
      });
      
      setIsSuccess(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md backdrop-blur-md bg-white/60 dark:bg-black/60 border border-white/20 dark:border-white/10 p-12 rounded-2xl shadow-lg shadow-black/5 dark:shadow-[0_0_40px_rgba(255,255,255,0.05)] text-center">
          <div className="inline-flex bg-red-100 text-red-600 p-3 rounded-full mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Form Unavailable</h2>
          <p className="text-gray-500 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md backdrop-blur-md bg-white/60 dark:bg-black/60 border border-green-200/50 p-12 rounded-2xl shadow-lg shadow-black/5 dark:shadow-[0_0_40px_rgba(255,255,255,0.05)] text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mb-4 mx-auto" />
          <h2 className="text-2xl font-bold mb-2 text-green-800 dark:text-green-400 tracking-tight">Thank You!</h2>
          <p className="text-gray-500 dark:text-gray-400">Your submission has been received successfully.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
      <div 
        className="max-w-2xl mx-auto backdrop-blur-md bg-white/60 dark:bg-black/60 border border-white/20 dark:border-white/10 rounded-2xl overflow-hidden shadow-lg shadow-black/5 dark:shadow-[0_0_40px_rgba(255,255,255,0.05)] border-t-4"
        style={{ borderTopColor: form.company?.primaryColor || 'hsl(var(--primary))' }}
      >
        <div className="px-8 py-10 text-center border-b border-gray-100 dark:border-gray-800">
          {form.company?.logo && (
            <div className="flex justify-center mb-6">
              <img src={form.company.logo} alt={form.company.name || "Company Logo"} className="h-12 object-contain" />
            </div>
          )}
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{form.title}</h1>
          {form.description && (
            <p className="mt-3 text-base text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{form.description}</p>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-8">
          {form.fields.map((field: any) => (
            <div key={field.id} className="space-y-3">
              <label htmlFor={field.id} className="block text-sm font-medium text-gray-900 dark:text-gray-200">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              
              {field.type === 'TEXT' && (
                <input 
                  id={field.id}
                  type="text"
                  required={field.required}
                  value={formData[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-black/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                />
              )}
              
              {field.type === 'EMAIL' && (
                <input 
                  id={field.id}
                  type="email"
                  required={field.required}
                  value={formData[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-black/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                />
              )}
              
              {field.type === 'PHONE' && (
                <input 
                  id={field.id}
                  type="tel"
                  required={field.required}
                  value={formData[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-black/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                />
              )}
              
              {field.type === 'TEXTAREA' && (
                <textarea 
                  id={field.id}
                  required={field.required}
                  value={formData[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-black/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors resize-y"
                />
              )}
              
              {field.type === 'SELECT' && (
                <div className="relative">
                  <CustomSelect
                    id={field.id}
                    required={field.required}
                    value={formData[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className="w-full px-4 py-3 appearance-none bg-white/50 dark:bg-black/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors text-gray-900 dark:text-gray-100"
                  >
                    <option value="" disabled>Select an option</option>
                    {field.options?.map((option: string, i: number) => (
                      <option key={i} value={option}>{option}</option>
                    ))}
                  </CustomSelect>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              )}
              
              {field.type === 'RADIO' && (
                <div className="space-y-3 pt-1">
                  {field.options?.map((option: string, i: number) => (
                    <div key={i} className="flex items-center">
                      <input
                        type="radio"
                        id={`${field.id}-${i}`}
                        name={field.id}
                        value={option}
                        checked={formData[field.id] === option}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        required={field.required}
                        className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                      />
                      <label htmlFor={`${field.id}-${i}`} className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {option}
                      </label>
                    </div>
                  ))}
                </div>
              )}
              
              {field.type === 'CHECKBOX' && (
                <div className="space-y-3 pt-1">
                  {field.options?.map((option: string, i: number) => {
                    const isChecked = (formData[field.id] || []).includes(option);
                    return (
                      <div key={i} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`${field.id}-${i}`}
                          checked={isChecked}
                          onChange={(e) => handleCheckboxChange(field.id, option, e.target.checked)}
                          className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        />
                        <label htmlFor={`${field.id}-${i}`} className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          {option}
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          
          <div className="pt-6">
            <button 
              type="submit" 
              className="btn-primary w-full py-3"
              disabled={isSubmitting}
              style={form.company?.primaryColor ? { backgroundColor: form.company.primaryColor, color: '#ffffff' } : { backgroundColor: '#4f46e5', color: '#ffffff' }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

