"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Layout, Globe, Edit, Trash } from "lucide-react";

export default function MarketingPagesList() {
  const [pages, setPages] = useState<any[]>([]);

  useEffect(() => {
    // Placeholder until API integration
    setPages([
      {
        id: "1",
        title: "HR Management System",
        slug: "hr-management-system",
        pageType: "APP_FEATURE",
        published: true,
        updatedAt: new Date().toISOString(),
      },
    ]);
  }, []);

  return (
    <div>
      <div className="page-header flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Layout className="w-7 h-7 text-indigo-600" />
            Landing Pages
          </h1>
          <p className="page-subtitle">Manage feature pages, use cases, and legal pages</p>
        </div>
        <a href="/dashboard/marketing/pages/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          New Landing Page
        </a>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search pages..."
              className="input-field pl-9 w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Updated</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{page.title}</div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      /features/{page.slug}
                    </div>
                  </td>
                  <td className="p-4">
                    {page.published ? (
                      <span className="badge badge-emerald">Published</span>
                    ) : (
                      <span className="badge badge-gray">Draft</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="badge badge-blue">{page.pageType}</span>
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {new Date(page.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
