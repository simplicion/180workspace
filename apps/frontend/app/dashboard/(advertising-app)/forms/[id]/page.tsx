"use client";

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Save, Plus, Trash2, 
  ExternalLink, GripHorizontal, Copy, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

type FieldType = 'TEXT' | 'EMAIL' | 'PHONE' | 'TEXTAREA' | 'SELECT' | 'RADIO' | 'CHECKBOX';

interface FormField {
  id?: string;
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: any;
  order: number;
}

export default function FormBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: formId } = use(params);
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [slug, setSlug] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);

  useEffect(() => {
    fetchForm();
  }, [formId]);

  const fetchForm = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/api/forms/${formId}`);
      const form = response.data.data.form;
      setTitle(form.title);
      setDescription(form.description || '');
      setIsActive(form.isActive);
      setSlug(form.slug);
      setFields(form.fields || []);
      
      const subResponse = await api.get(`/api/forms/${formId}/submissions`);
      setSubmissions(subResponse.data.data.submissions);
    } catch (error) {
      console.error('Failed to fetch form:', error);
      toast.error('Failed to load form details');
      router.push('/dashboard/forms');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const field of fields) {
        if (!field.name || !field.label) {
          toast.error('All fields must have a name and label');
          setIsSaving(false);
          return;
        }
      }

      const payload = {
        title,
        description,
        isActive,
        fields: fields.map((f, index) => ({
          ...f,
          order: index
        }))
      };

      await api.patch(`/api/forms/${formId}`, payload);
      
      toast.success('Form saved successfully');
      fetchForm();
    } catch (error) {
      console.error('Failed to save form:', error);
      toast.error('Failed to save form');
    } finally {
      setIsSaving(false);
    }
  };

  const addField = () => {
    const newField: FormField = {
      name: `field_${Date.now()}`,
      label: 'New Field',
      type: 'TEXT',
      required: false,
      order: fields.length
    };
    setFields([...fields, newField]);
  };

  const removeField = (index: number) => {
    const newFields = [...fields];
    newFields.splice(index, 1);
    setFields(newFields);
  };

  const updateField = (index: number, key: keyof FormField, value: any) => {
    const newFields = [...fields];
    if (key === 'label' && !newFields[index].id) {
      const suggestedName = value.toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (suggestedName && !newFields.some((f, i) => i !== index && f.name === suggestedName)) {
        newFields[index].name = suggestedName;
      }
    }
    newFields[index] = { ...newFields[index], [key]: value };
    setFields(newFields);
  };

  const updateFieldOptions = (index: number, optionsString: string) => {
    const newFields = [...fields];
    const optionsArray = optionsString.split(',').map(s => s.trim()).filter(s => s);
    newFields[index].options = optionsArray;
    setFields(newFields);
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === fields.length - 1)) return;
    const newFields = [...fields];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newFields[index];
    newFields[index] = newFields[newIndex];
    newFields[newIndex] = temp;
    setFields(newFields);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/f/${slug}`;
  const iframeCode = `<iframe src="${publicUrl}" width="100%" height="500" frameborder="0" marginheight="0" marginwidth="0">Loading...</iframe>`;

  const tabs = [
    { id: 'editor', label: 'Form Builder' },
    { id: 'settings', label: 'Settings & Share' },
    { id: 'submissions', label: `Submissions (${submissions.length})` },
  ];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-3">
          <button onClick={() => router.push('/dashboard/forms')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Edit Form: {title}</h2>
        </div>
        <div className="flex items-center space-x-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <div className="relative">
              <input type="checkbox" className="sr-only peer" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <div className="w-10 h-5 bg-gray-200 rounded-full peer-checked:bg-indigo-600 transition-colors"></div>
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></div>
            </div>
            <span className="text-sm font-medium text-gray-700">{isActive ? 'Active' : 'Draft'}</span>
          </label>
          <button 
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            onClick={() => window.open(publicUrl, '_blank')}
          >
            <ExternalLink className="h-4 w-4" /> View Public
          </button>
          <button 
            className="btn-primary"
            onClick={handleSave} 
            disabled={isSaving}
          >
            <Save className="h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab.id 
                ? 'bg-white text-indigo-700 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Editor Tab */}
      {activeTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
              <h3 className="font-semibold text-gray-900">Form Details</h3>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input 
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea 
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <button onClick={addField} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors">
              <Plus className="h-4 w-4" /> Add Field
            </button>
          </div>

          {/* Canvas */}
          <div className="lg:col-span-2 space-y-4">
            {fields.length === 0 ? (
              <div className="border border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center p-12 bg-gray-50/50">
                <Plus className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-700">No fields yet</h3>
                <p className="text-sm text-gray-500 mb-4 text-center">Add fields from the sidebar to build your form.</p>
                <button onClick={addField} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors">
                  Add First Field
                </button>
              </div>
            ) : (
              fields.map((field, index) => (
                <div key={index} className="relative group bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden border-l-4 border-l-indigo-500">
                  <div className="absolute right-2 top-2 flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30" onClick={() => moveField(index, 'up')} disabled={index === 0}>
                      <GripHorizontal className="h-4 w-4 rotate-90" />
                    </button>
                    <button className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600" onClick={() => removeField(index)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button className="p-1 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30" onClick={() => moveField(index, 'down')} disabled={index === fields.length - 1}>
                      <GripHorizontal className="h-4 w-4 rotate-90" />
                    </button>
                  </div>
                  
                  <div className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">Field Label</label>
                        <input 
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          value={field.label} 
                          onChange={(e) => updateField(index, 'label', e.target.value)} 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">Field Type</label>
                        <select 
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                          value={field.type} 
                          onChange={(e) => updateField(index, 'type', e.target.value as FieldType)}
                        >
                          <option value="TEXT">Short Text</option>
                          <option value="TEXTAREA">Long Text</option>
                          <option value="EMAIL">Email</option>
                          <option value="PHONE">Phone Number</option>
                          <option value="SELECT">Dropdown</option>
                          <option value="RADIO">Radio Buttons</option>
                          <option value="CHECKBOX">Checkboxes</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">System Name (used for data mapping)</label>
                        <input 
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 font-mono"
                          value={field.name} 
                          onChange={(e) => updateField(index, 'name', e.target.value.replace(/[^a-zA-Z0-9_]/g, '_'))}
                        />
                      </div>
                      <div className="space-y-1.5 flex flex-col justify-center pt-5">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <div className="relative">
                            <input type="checkbox" className="sr-only peer" checked={field.required} onChange={(e) => updateField(index, 'required', e.target.checked)} />
                            <div className="w-9 h-5 bg-gray-200 rounded-full peer-checked:bg-indigo-600 transition-colors"></div>
                            <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4"></div>
                          </div>
                          <span className="text-sm font-medium text-gray-700">Required field</span>
                        </label>
                      </div>

                      {['SELECT', 'RADIO', 'CHECKBOX'].includes(field.type) && (
                        <div className="col-span-1 md:col-span-2 space-y-1.5 mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <label className="block text-sm font-medium text-gray-700">Options (comma separated)</label>
                          <input 
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            value={Array.isArray(field.options) ? field.options.join(', ') : ''} 
                            onChange={(e) => updateFieldOptions(index, e.target.value)}
                            placeholder="e.g., Option 1, Option 2, Option 3"
                          />
                          <p className="text-xs text-gray-500">Separate each option with a comma.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-6">
            <h3 className="font-semibold text-gray-900">Share Your Form</h3>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Public Link</label>
              <div className="flex space-x-2">
                <input readOnly value={publicUrl} className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 font-mono" />
                <button 
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  onClick={() => copyToClipboard(publicUrl, 'Link')}
                >
                  <Copy className="h-4 w-4" /> Copy Link
                </button>
              </div>
              <p className="text-sm text-gray-500">Share this link directly with your clients.</p>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Embed Code (Iframe)</label>
              <div className="flex space-x-2">
                <input readOnly value={iframeCode} className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 font-mono" />
                <button 
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  onClick={() => copyToClipboard(iframeCode, 'Embed code')}
                >
                  <Copy className="h-4 w-4" /> Copy Code
                </button>
              </div>
              <p className="text-sm text-gray-500">Paste this code into your website builder (WordPress, Webflow, etc.) to embed the form.</p>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-gray-900">Submission Settings</h3>
            <p className="text-sm text-gray-500">
              When a form is submitted, a new lead/client is automatically created in your CRM if they don't already exist.
              Email notifications will also be sent to your team automatically.
            </p>
          </div>
        </div>
      )}

      {/* Submissions Tab */}
      {activeTab === 'submissions' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Form Submissions</h3>
          </div>
          <div className="p-5">
            {submissions.length === 0 ? (
              <div className="text-center p-8 text-gray-500">
                No submissions yet. Share your form to start collecting data.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 rounded-tl-lg">Date</th>
                      {Array.from(new Set(submissions.flatMap(s => s.values.map((v: any) => v.field.label)))).slice(0, 4).map(label => (
                        <th key={label} className="px-6 py-3">{label}</th>
                      ))}
                      <th className="px-6 py-3 rounded-tr-lg">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((submission) => (
                      <tr key={submission.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                          {new Date(submission.createdAt).toLocaleDateString()}
                        </td>
                        {Array.from(new Set(submissions.flatMap(s => s.values.map((v: any) => v.field.label)))).slice(0, 4).map(label => {
                          const val = submission.values.find((v: any) => v.field.label === label);
                          return (
                            <td key={label} className="px-6 py-4 truncate max-w-[200px] text-gray-600">
                              {val ? val.value : '-'}
                            </td>
                          );
                        })}
                        <td className="px-6 py-4">
                          <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">View Details</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
