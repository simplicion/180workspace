'use client';
import { useState, useEffect } from 'react';
import { Briefcase, MapPin, Building2, BrainCircuit, Mail, CheckCircle2 } from 'lucide-react';
import { getSocket } from '@/lib/socket';

export default function JobsPage() {
  const [applying, setApplying] = useState<Record<number, boolean>>({});
  const [applied, setApplied] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      const handleTaskCompleted = (data: any) => {
        if (data && data.applicationId) {
          // In a real app we'd map applicationId to jobId, but for this mock we'll just mark all applying as applied
          setApplying({});
          // Just set all currently applying to applied
          setApplied(prev => {
            const next = { ...prev };
            Object.keys(applying).forEach(key => {
              if (applying[parseInt(key)]) next[parseInt(key)] = true;
            });
            return next;
          });
        }
      };
      socket.on('AI_TASK_COMPLETED', handleTaskCompleted);
      return () => {
        socket.off('AI_TASK_COMPLETED', handleTaskCompleted);
      };
    }
  }, [applying]);

  const handleApply = async (jobId: number) => {
    setApplying(prev => ({ ...prev, [jobId]: true }));
    
    try {
      const token = localStorage.getItem('token') || '';
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const res = await fetch(`${baseUrl}/api/job-hunter/apply`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ jobId })
      });
      
      if (res.status === 202) {
          console.log(`Job application ${jobId} started in background. Waiting for WebSocket event...`);
      } else {
          console.error('Failed to apply for job');
          setApplying(prev => ({ ...prev, [jobId]: false }));
      }
    } catch (err) {
      console.error('Apply error', err);
      setApplying(prev => ({ ...prev, [jobId]: false }));
    }
  };

  const jobs = [
    {
      id: 1,
      title: "Senior React Developer",
      company: "TechFlow Solutions",
      location: "Remote",
      salary: "$120k - $150k",
      match: 94,
      missing: ["GraphQL"]
    },
    {
      id: 2,
      title: "Frontend Engineer",
      company: "Innovate Inc",
      location: "Hybrid - New York",
      salary: "$110k - $130k",
      match: 88,
      missing: ["Docker", "AWS"]
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Recommended Jobs</h1>
        <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-medium flex items-center space-x-2">
           <BrainCircuit className="w-5 h-5" />
           <span>Auto-Search Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 mt-6">
        {jobs.map(job => (
          <div key={job.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-6">
            
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{job.title}</h2>
                <div className="flex items-center space-x-4 mt-2 text-gray-500 text-sm">
                  <div className="flex items-center space-x-1"><Building2 className="w-4 h-4"/><span>{job.company}</span></div>
                  <div className="flex items-center space-x-1"><MapPin className="w-4 h-4"/><span>{job.location}</span></div>
                  <div className="flex items-center space-x-1"><Briefcase className="w-4 h-4"/><span>{job.salary}</span></div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between border border-gray-100">
                 <div>
                   <p className="text-sm font-medium text-gray-900">Match Score</p>
                   <p className="text-sm text-gray-500 mt-1">Missing skills: <span className="text-red-500">{job.missing.join(', ')}</span></p>
                 </div>
                 <div className="w-12 h-12 rounded-full border-4 border-emerald-500 flex items-center justify-center font-bold text-emerald-600">
                   {job.match}%
                 </div>
              </div>
            </div>

            <div className="w-full md:w-64 flex flex-col justify-end space-y-3 border-t md:border-t-0 md:border-l border-gray-200 pt-4 md:pt-0 md:pl-6">
               {applied[job.id] ? (
                 <button disabled className="w-full bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-bold flex items-center justify-center space-x-2 opacity-80 cursor-not-allowed">
                   <CheckCircle2 className="w-4 h-4" />
                   <span>Applied</span>
                 </button>
               ) : applying[job.id] ? (
                 <button disabled className="w-full bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-bold flex items-center justify-center space-x-2 opacity-75 cursor-not-allowed">
                   <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                   <span>Generating...</span>
                 </button>
               ) : (
                 <button onClick={() => handleApply(job.id)} className="w-full bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition flex items-center justify-center space-x-2">
                   <BrainCircuit className="w-4 h-4" />
                   <span>Auto Apply (AI)</span>
                 </button>
               )}
               <button className="w-full bg-white text-gray-700 border border-gray-300 px-4 py-2.5 rounded-lg font-bold hover:bg-gray-50 transition flex items-center justify-center space-x-2">
                 <Mail className="w-4 h-4" />
                 <span>Review Email</span>
               </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
