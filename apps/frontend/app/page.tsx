import Link from 'next/link';
import { ArrowRight, Cloud, HardDrive, Shield } from 'lucide-react';
import Link from 'next/link';
import { ArrowRight, Cloud, HardDrive, Shield } from 'lucide-react';

export default function WorkspaceRoot() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center">
      {/* Navigation */}
      <nav className="w-full max-w-6xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Cloud className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900">180workspace</span>
        </div>
        <div className="flex gap-4 items-center">
          <Link href="/privacy-policy" className="text-sm font-medium text-slate-600 hover:text-slate-900">Privacy Policy</Link>
          <Link href="/terms-of-service" className="text-sm font-medium text-slate-600 hover:text-slate-900">Terms of Service</Link>
          <Link href="/login" className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-full transition-colors">
            Login to Dashboard
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-20 flex flex-col items-center text-center">
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-8">
          The ultimate media hub for <span className="text-indigo-600">your workspace.</span>
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mb-6 leading-relaxed">
          The core purpose of <strong>180workspace</strong> is to help teams seamlessly manage, organize, and compress their media files. 
        </p>
        <p className="text-lg text-slate-600 max-w-2xl mb-12 leading-relaxed">
          Our application integrates directly with Google Drive, allowing users to effortlessly import their existing files into their projects, and automatically create new folders in their Google Drive to export and sync their compressed media.
        </p>
        
        <Link href="/login" className="px-8 py-4 text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2 mb-20">
          Get Started Now <ArrowRight className="w-5 h-5" />
        </Link>

        {/* Features for Google Verification */}
        <div className="grid md:grid-cols-3 gap-8 w-full">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
              <HardDrive className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-3">Google Drive Integration</h3>
            <p className="text-slate-600">
              Securely connect your Google Drive account to browse, select, and upload files directly into your 180workspace projects without downloading them first.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-6">
              <Cloud className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-3">Universal Media Processing</h3>
            <p className="text-slate-600">
              Automatically compress and optimize videos and images upon upload to save storage and increase performance.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-3">Secure & Private</h3>
            <p className="text-slate-600">
              We only request access to the Google Drive files you explicitly select or the folders you create within the app. Your data is encrypted and secure.
            </p>
          </div>
        </div>
      </main>

      <footer className="w-full py-8 text-center text-sm text-slate-500 border-t border-slate-200">
        &copy; {new Date().getFullYear()} 180workspace. All rights reserved.
      </footer>
    </div>
  );
}
