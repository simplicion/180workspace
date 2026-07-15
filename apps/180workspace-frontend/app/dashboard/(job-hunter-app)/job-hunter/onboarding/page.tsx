'use client';
import { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle2 } from 'lucide-react';
import { getSocket } from '@/lib/socket';

export default function OnboardingPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      const handleTaskCompleted = (data: any) => {
        if (data && data.profileId) {
          setParsing(false);
          setComplete(true);
        }
      };
      socket.on('FILE_TASK_COMPLETED', handleTaskCompleted);
      return () => {
        socket.off('FILE_TASK_COMPLETED', handleTaskCompleted);
      };
    }
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setParsing(true);
      
      const formData = new FormData();
      formData.append('resume', e.target.files[0]);

      try {
        // We use localStorage token for the fetch request
        const token = localStorage.getItem('token') || '';
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        
        const res = await fetch(`${baseUrl}/api/job-hunter/profile/extract`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (res.status === 202) {
            console.log('Extraction started in background. Waiting for WebSocket event...');
        } else {
            console.error('Failed to start extraction');
            setParsing(false);
        }
      } catch (err) {
        console.error('Upload error', err);
        setParsing(false);
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <div className="text-center space-y-4 mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Welcome to Job Hunter AI</h1>
        <p className="text-gray-500">Upload your resume once. We'll do the rest.</p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        {!complete ? (
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
            {parsing ? (
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-indigo-600 font-medium">Extracting profile with AI...</p>
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-900">Click to upload resume</p>
                  <p className="text-sm text-gray-500">PDF, DOCX up to 5MB</p>
                </div>
                <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleUpload} />
              </label>
            )}
          </div>
        ) : (
          <div className="text-center space-y-6 py-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Profile Extracted Successfully!</h2>
              <p className="text-gray-500 mt-2">We found 8 skills and 4 years of experience.</p>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-xl text-left border border-gray-200 max-w-lg mx-auto">
                <h3 className="font-semibold text-gray-900 mb-4">Job Preferences</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Target Role</label>
                    <input type="text" defaultValue="Software Engineer" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Work Type</label>
                    <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border">
                        <option>Remote</option>
                        <option>Hybrid</option>
                        <option>Onsite</option>
                    </select>
                  </div>
                </div>
            </div>

            <button className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors">
              Save & Start Searching
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
