"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, FileText, BarChart, Trash2, Edit, ExternalLink, X } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function FormsListPage() {
  const router = useRouter();
  const [forms, setForms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create Form Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFormTitle, setNewFormTitle] = useState('');
  const [newFormDescription, setNewFormDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchForms = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/forms');
      setForms(response.data.data.forms);
    } catch (error) {
      console.error('Failed to fetch forms:', error);
      toast.error('Failed to load forms');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, []);

  const handleCreateForm = async () => {
    if (!newFormTitle.trim()) {
      toast.error('Please enter a form title');
      return;
    }
    
    setIsCreating(true);
    try {
      const response = await api.post('/api/forms', {
        title: newFormTitle,
        description: newFormDescription,
        fields: []
      });
      
      const newForm = response.data.data.form;
      toast.success('Form created successfully');
      setIsCreateModalOpen(false);
      router.push('/forms/${newForm.id}');
    } catch (error) {
      console.error('Failed to create form:', error);
      toast.error('Failed to create form');
      setIsCreating(false);
    }
  };

  const handleDeleteForm = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this form?')) return;
    
    try {
      await api.delete(`/api/forms/${id}`);
      toast.success('Form deleted successfully');
      fetchForms();
    } catch (error) {
      console.error('Failed to delete form:', error);
      toast.error('Failed to delete form');
    }
  };

  const filteredForms = forms.filter(form => 
    form.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (form.description && form.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Form Builder</h2>
          <p className="text-gray-500 mt-1">
            Create public forms to capture leads and client inquiries directly into your CRM.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary shadow-md shadow-indigo-600/20">
            <Plus className="mr-2 h-4 w-4" /> Create Form
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-2 mb-6">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="search"
            placeholder="Search forms..."
            className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border rounded-xl border-dashed border-gray-300 bg-gray-50/50">
          <FileText className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-700">No forms found</h3>
          <p className="text-sm text-gray-500 mb-4">
            {searchQuery ? "No forms match your search query." : "You haven't created any forms yet."}
          </p>
          {!searchQuery && (
            <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary">
              <Plus className="mr-2 h-4 w-4" /> Create Your First Form
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredForms.map((form) => (
            <div key={form.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden">
              <div className="p-5 pb-3">
                <div className="flex justify-between items-start">
                  <div className="bg-indigo-50 p-2 rounded-lg">
                    <FileText className="h-5 w-5 text-indigo-600" />
                  </div>
                  <button 
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    onClick={(e) => handleDeleteForm(form.id, e)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="mt-4 font-semibold text-gray-900 truncate" title={form.title}>{form.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 h-10 mt-1" title={form.description}>
                  {form.description || "No description"}
                </p>
              </div>
              <div className="px-5 pb-3 flex-grow">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-500">
                    <BarChart className="mr-1 h-4 w-4" />
                    <span>{form._count?.submissions || 0} Submissions</span>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${form.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {form.isActive ? 'Active' : 'Draft'}
                  </span>
                </div>
              </div>
              <div className="px-5 py-3 border-t border-gray-100 flex justify-between gap-2">
                <button 
                  className="w-1/2 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors" 
                  onClick={() => window.open(`/f/${form.slug}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" /> View Public
                </button>
                <button 
                  className="w-1/2 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                  onClick={() => router.push('/forms/${form.id}')}
                >
                  <Edit className="h-4 w-4" /> Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Form Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Create New Form</h3>
                <p className="text-sm text-gray-500 mt-0.5">Give your form a title and description. You can add fields on the next screen.</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">Form Title</label>
                <input
                  id="title"
                  type="text"
                  placeholder="e.g., Contact Us, Lead Capture"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={newFormTitle}
                  onChange={(e) => setNewFormTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                <textarea
                  id="description"
                  placeholder="A brief description of what this form is for..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  value={newFormDescription}
                  onChange={(e) => setNewFormDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button 
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                onClick={handleCreateForm} 
                disabled={isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Form'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
