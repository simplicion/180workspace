"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Megaphone, FileText, Globe, MoreVertical, Edit, Trash, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

export default function MarketingBlogsPage() {
  const [blogs, setBlogs] = useState<any[]>([]);

  useEffect(() => {
    // We will fetch from API later, for now just placeholder
    setBlogs([
      {
        id: "1",
        title: "How to Scale Your Digital Agency in 2027",
        slug: "how-to-scale-digital-agency",
        category: "agency-growth",
        published: true,
        authorName: "John Doe",
        publishedAt: new Date().toISOString(),
      },
    ]);
  }, []);

  return (
    <div>
      <div className="page-header flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-indigo-600" />
            Marketing Blogs
          </h1>
          <p className="page-subtitle">Manage AEO/SEO optimized blog posts for the marketing site</p>
        </div>
        <a href="/dashboard/marketing/blogs/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          New Blog Post
        </a>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search blogs..."
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
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Author</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {blogs.map((blog) => (
                <tr key={blog.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{blog.title}</div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      /{blog.slug}
                    </div>
                  </td>
                  <td className="p-4">
                    {blog.published ? (
                      <span className="badge badge-emerald">Published</span>
                    ) : (
                      <span className="badge badge-gray">Draft</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="badge badge-purple">{blog.category}</span>
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {blog.authorName}
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
