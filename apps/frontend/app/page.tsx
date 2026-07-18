import Link from 'next/link';
import {
  ArrowRight, Cloud, HardDrive, Shield,
  Briefcase, Users, LayoutDashboard,
  BarChart3, Wallet, Inbox, Target, Zap
} from 'lucide-react';

export default function WorkspaceRoot() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">

      {/* Navigation (Glassmorphism) */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/70 backdrop-blur-md border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/black icon.svg" alt="180workspace Icon" className="w-10 h-10" />
            <span className="text-2xl font-black text-slate-900 tracking-tight">180workspace</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">Features</Link>
            <Link href="#integrations" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">Integrations</Link>
            <Link href="/privacy-policy" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">Privacy</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:inline-flex px-5 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:text-slate-900 rounded-full transition-all shadow-sm">
              Log in
            </Link>
            <Link href="/login" className="px-5 py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-indigo-600 rounded-full transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full pt-28">
        {/* Hero Section */}
        <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 md:pt-32 md:pb-32 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-semibold text-sm mb-8 animate-fade-in-up">
            <Zap className="w-4 h-4" />
            <span>The ultimate business operating system</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-8 leading-[1.1] max-w-4xl">
            Run your entire company from <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">one unified workspace.</span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mb-8 leading-relaxed">
            Replace dozens of fragmented tools. 180workspace allows you to manage your HR, CRM, Projects, Finances, and Media in a single, scalable platform designed for modern teams.
          </p>
          <div className="bg-indigo-50/80 border border-indigo-100 rounded-2xl p-6 mb-12 max-w-3xl text-left">
            <h3 className="text-lg font-bold text-indigo-900 mb-2 flex items-center gap-2">
              <Cloud className="w-5 h-5" />
              Google Drive Integration
            </h3>
            <p className="text-base text-indigo-800 leading-relaxed">
              <strong>Why we request your data:</strong> 180workspace requests access to your Google Drive to allow you to seamlessly import your existing media, documents, and assets directly into your projects, and to automatically sync exported files back to your Drive. Your data is used exclusively to power these integrations within your workspace.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link href="/login" className="w-full sm:w-auto px-8 py-4 text-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 transform hover:-translate-y-1">
              Start your workspace <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="#features" className="w-full sm:w-auto px-8 py-4 text-lg font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-full shadow-sm transition-all flex items-center justify-center">
              Explore Features
            </Link>
          </div>
        </section>

        {/* Bento Box Features Grid */}
        <section id="features" className="w-full bg-white py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Everything you need to scale</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">180workspace comes fully loaded with enterprise-grade modules to handle every aspect of your business operations.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="col-span-1 md:col-span-2 lg:col-span-2 bg-slate-50 rounded-3xl p-8 border border-slate-200 hover:border-indigo-300 transition-colors group overflow-hidden relative shadow-sm">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-indigo-500/20 transition-all"></div>
                <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 border border-indigo-200">
                  <Briefcase className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">CRM & Sales Pipeline</h3>
                <p className="text-slate-600 text-lg max-w-md">Track leads, manage client relationships, and close deals faster with our integrated CRM. Never let an opportunity slip through the cracks again.</p>
              </div>

              {/* Feature 2 */}
              <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200 hover:border-emerald-300 transition-colors group relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-emerald-500/20 transition-all"></div>
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 border border-emerald-200">
                  <Users className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">HR Management</h3>
                <p className="text-slate-600 text-lg">Manage your team, track time off, handle recruiting, and streamline employee onboarding.</p>
              </div>

              {/* Feature 3 */}
              <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200 hover:border-blue-300 transition-colors group relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-blue-500/20 transition-all"></div>
                <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 border border-blue-200">
                  <LayoutDashboard className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Projects & Tasks</h3>
                <p className="text-slate-600 text-lg">Keep teams aligned and deliver on time with robust project tracking and kanban boards.</p>
              </div>

              {/* Feature 4 */}
              <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200 hover:border-amber-300 transition-colors group relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-amber-500/20 transition-all"></div>
                <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6 border border-amber-200">
                  <Wallet className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Finance & Assets</h3>
                <p className="text-slate-600 text-lg">Monitor expenses, track revenue, and manage company assets from a centralized dashboard.</p>
              </div>

              {/* Feature 5 */}
              <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200 hover:border-pink-300 transition-colors group relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-pink-500/20 transition-all"></div>
                <div className="w-14 h-14 bg-pink-100 text-pink-600 rounded-2xl flex items-center justify-center mb-6 border border-pink-200">
                  <BarChart3 className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Deep Insights</h3>
                <p className="text-slate-600 text-lg">Generate real-time reports and analytics across all your business operations.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Google Drive Specific Section (Required for Verification) */}
        <section id="integrations" className="w-full bg-indigo-50 py-24 px-4 sm:px-6 lg:px-8 border-y border-indigo-100">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm mb-6">
                <Cloud className="w-4 h-4" />
                Google Drive Verified
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                Seamless cloud media management.
              </h2>

              {/* Note: This specific copy is required to pass Google OAuth Trust & Safety manual verification */}
              <div className="prose prose-lg text-slate-600 mb-8">
                <p>
                  The core purpose of <strong>180workspace</strong> is to help teams seamlessly manage, organize, and compress their media files.
                </p>
                <p>
                  Our application integrates directly with Google Drive, allowing users to effortlessly import their existing files into their projects, and automatically create new folders in their Google Drive to export and sync their compressed media.
                </p>
              </div>
            </div>

            <div className="lg:w-1/2 w-full grid sm:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                  <HardDrive className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Google Drive Integration</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Securely connect your Google Drive account to browse, select, and upload files directly into your 180workspace projects without downloading them first.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
                  <Cloud className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Universal Media Processing</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Automatically compress and optimize videos and images upon upload to save storage and increase performance.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:col-span-2">
                <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-4">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Secure & Private</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  We only request access to the Google Drive files you explicitly select or the folders you create within the app. Your data is encrypted and secure.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="w-full bg-white py-24 px-4 text-center">
          <h2 className="text-4xl font-bold text-slate-900 mb-6">Ready to upgrade your workspace?</h2>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">Join thousands of teams running their entire business on 180workspace.</p>
          <Link href="/login" className="inline-flex px-10 py-5 text-lg font-bold text-white bg-slate-900 hover:bg-indigo-600 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1">
            Create your free account
          </Link>
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full bg-slate-50 py-12 px-6 border-t border-slate-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <img src="/black icon.svg" alt="180workspace Icon" className="w-6 h-6" />
            <span className="text-xl font-bold text-slate-900">180workspace</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/privacy-policy" className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors">Privacy Policy</Link>
            <Link href="/terms-of-service" className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors">Terms of Service</Link>
            <a href="mailto:support@180workspace.com" className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors">Contact Support</a>
          </div>
          <div className="text-sm text-slate-400 font-medium">
            &copy; {new Date().getFullYear()} 180workspace. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
