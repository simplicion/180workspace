"use client";

import { useState } from "react";
import { ArrowLeft, Save, Layout, Globe } from "lucide-react";

export default function NewMarketingPage() {
  const [formData, setFormData] = useState({
    title: "", // We can use seoTitle or heroHeadline
    slug: "",
    pageType: "APP_FEATURE",
    heroHeadline: "",
    heroSubtext: "",
    seoTitle: "",
    seoDescription: "",
    published: false,
    structuredData: ""
  });

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="page-header flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <a href="/dashboard/marketing/pages" className="p-2 text-gray-500 hover:text-gray-900 bg-white rounded-full border border-gray-200 shadow-sm transition-all hover:shadow-md">
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div>
            <h1 className="page-title">Create Landing Page</h1>
            <p className="page-subtitle">Design a new feature or use-case page</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary">
            Save as Draft
          </button>
          <button className="btn-primary">
            <Save className="w-4 h-4" />
            Publish Page
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Layout className="w-5 h-5 text-indigo-500" />
              Hero Section
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hero Headline</label>
                <input 
                  type="text" 
                  name="heroHeadline"
                  className="input-field text-lg font-medium"
                  placeholder="e.g. The Best HR System for Agencies"
                  value={formData.heroHeadline}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hero Subtext</label>
                <textarea 
                  name="heroSubtext"
                  rows={3}
                  className="input-field"
                  placeholder="Subtext goes here..."
                  value={formData.heroSubtext}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-500" />
              SEO & Metadata
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SEO Title</label>
                <input 
                  type="text" 
                  name="seoTitle"
                  className="input-field"
                  value={formData.seoTitle}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SEO Description</label>
                <textarea 
                  name="seoDescription"
                  rows={3}
                  className="input-field"
                  value={formData.seoDescription}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">JSON-LD Schema</label>
                <textarea 
                  name="structuredData"
                  rows={4}
                  className="input-field font-mono text-xs"
                  placeholder='{ "@context": "https://schema.org", "@type": "Product" }'
                  value={formData.structuredData}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-1 space-y-6">
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Page Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
                <input 
                  type="text" 
                  name="slug"
                  className="input-field"
                  placeholder="e.g. hr-management"
                  value={formData.slug}
                  onChange={handleChange}
                />
                <p className="text-xs text-gray-500 mt-1">Will be hosted at /features/[slug]</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Page Type</label>
                <select 
                  name="pageType"
                  className="input-field"
                  value={formData.pageType}
                  onChange={handleChange}
                >
                  <option value="APP_FEATURE">App Feature</option>
                  <option value="USE_CASE">Use Case</option>
                  <option value="LEGAL">Legal</option>
                </select>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-900 cursor-pointer">
                  Published Status
                </label>
                <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                  <input type="checkbox" name="published" id="toggle" checked={formData.published} onChange={handleChange} className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer border-gray-300 checked:right-0 checked:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 transition-transform duration-200" style={{ right: formData.published ? '0' : '1.25rem' }}/>
                  <label htmlFor="toggle" className={`toggle-label block overflow-hidden h-5 rounded-full bg-gray-300 cursor-pointer transition-colors duration-200 ${formData.published ? 'bg-indigo-600' : ''}`}></label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
