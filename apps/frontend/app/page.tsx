import Link from 'next/link';
import {
  ArrowRight, Cloud, HardDrive, Shield,
  Briefcase, Users, LayoutDashboard,
  BarChart3, Wallet, Inbox, Target, Zap
} from 'lucide-react';

export default function WorkspaceRoot() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900 relative">
      {/* Full Page Blue Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#3b82f61a_1px,transparent_1px),linear-gradient(to_bottom,#3b82f61a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0"></div>

      {/* Navigation (Glassmorphism) */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/70 backdrop-blur-md border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer">
            <img src="/black icon.svg" alt="180workspace" className="w-8 h-8" />
            <span className="text-2xl font-black text-slate-900 tracking-tight"><span className="text-blue-600">180</span>workspace</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">Features</Link>
            <Link href="#integrations" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">Integrations</Link>
            <Link href="/privacy-policy" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">Privacy</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:inline-flex px-5 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:text-slate-900 rounded-full transition-all shadow-sm">
              Log in
            </Link>
            <Link href="/login" className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full pt-24 relative z-10">
        <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 md:pt-24 md:pb-28 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 font-semibold text-sm mb-8 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
            The New Business Operating System
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-slate-950 tracking-tighter mb-8 leading-[1.05] max-w-5xl">
            Stop losing time to fragmented tools. Run your business on <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">one unified engine.</span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mb-12 leading-relaxed font-medium">
            Software sprawl is killing productivity and costing you thousands. 180workspace replaces dozens of chaotic apps with a single, powerful platform for your CRM, HR, Projects, and Finances.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link href="/login" className="w-full sm:w-auto px-8 py-4 text-lg font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 transform hover:-translate-y-1">
              Start your workspace <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="#features" className="w-full sm:w-auto px-8 py-4 text-lg font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-full shadow-sm transition-all flex items-center justify-center">
              Explore Features
            </Link>
          </div>
        </section>

        {/* Bento Box Features Grid */}
        <section id="features" className="w-full py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tight mb-4">Eliminate chaos. Scale with confidence.</h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto font-medium">Stop duct-taping your business together. 180workspace provides everything you need natively, so your team can focus on growth instead of managing software.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="col-span-1 md:col-span-2 lg:col-span-2 bg-white/90 backdrop-blur-sm rounded-3xl p-8 border border-slate-200 hover:border-indigo-300 transition-colors group overflow-hidden relative shadow-xl shadow-blue-900/5">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-indigo-500/20 transition-all"></div>
                <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 border border-indigo-200">
                  <Briefcase className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-slate-950 tracking-tight mb-3">CRM & Sales Pipeline</h3>
                <p className="text-slate-600 text-lg max-w-md font-medium">Stop letting leads slip through the cracks. Manage client relationships, track pipelines, and close deals faster with a CRM that actually talks to the rest of your business.</p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 border border-slate-200 hover:border-emerald-300 transition-colors group relative overflow-hidden shadow-xl shadow-blue-900/5">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-emerald-500/20 transition-all"></div>
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 border border-emerald-200">
                  <Users className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-slate-950 tracking-tight mb-3">HR Management</h3>
                <p className="text-slate-600 text-lg font-medium">Say goodbye to messy spreadsheets. Automate onboarding, track time off, and manage your entire workforce seamlessly.</p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 border border-slate-200 hover:border-blue-300 transition-colors group relative overflow-hidden shadow-xl shadow-blue-900/5">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-blue-500/20 transition-all"></div>
                <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 border border-blue-200">
                  <LayoutDashboard className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-slate-950 tracking-tight mb-3">Projects & Tasks</h3>
                <p className="text-slate-600 text-lg font-medium">End the status-update meetings. Keep your team aligned and deliver on time with robust kanban boards and project tracking.</p>
              </div>

              {/* Feature 4 */}
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 border border-slate-200 hover:border-amber-300 transition-colors group relative overflow-hidden shadow-xl shadow-blue-900/5">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-amber-500/20 transition-all"></div>
                <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6 border border-amber-200">
                  <Wallet className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-slate-950 tracking-tight mb-3">Finance & Assets</h3>
                <p className="text-slate-600 text-lg font-medium">Take control of your cash flow. Monitor expenses, track revenue, and manage company assets without complex accounting software.</p>
              </div>

              {/* Feature 5 */}
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 border border-slate-200 hover:border-pink-300 transition-colors group relative overflow-hidden shadow-xl shadow-blue-900/5">
                <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-pink-500/20 transition-all"></div>
                <div className="w-14 h-14 bg-pink-100 text-pink-600 rounded-2xl flex items-center justify-center mb-6 border border-pink-200">
                  <BarChart3 className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-slate-950 tracking-tight mb-3">Deep Insights</h3>
                <p className="text-slate-600 text-lg font-medium">Stop guessing. Make data-driven decisions with real-time reports and analytics across all your operations.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="w-full py-24 px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-950 mb-6">Stop paying the fragmentation tax.</h2>
          <p className="text-xl text-slate-600 font-medium mb-10 max-w-2xl mx-auto">Join forward-thinking businesses who have consolidated their tech stack and accelerated their growth.</p>
          <Link href="/login" className="inline-flex px-10 py-5 text-lg font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1">
            Create your free account
          </Link>
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full bg-white/80 backdrop-blur-md py-12 px-6 border-t border-slate-200 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center justify-center gap-3 mb-8">
            <img src="/black icon.svg" alt="180workspace" className="w-8 h-8 opacity-90" />
            <span className="text-xl font-bold text-slate-900"><span className="text-blue-600">180</span>workspace</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/privacy-policy" className="text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors">Privacy Policy</Link>
            <Link href="/terms-of-service" className="text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors">Terms of Service</Link>
            <a href="mailto:support@180workspace.com" className="text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors">Contact Support</a>
          </div>
          <div className="text-sm text-slate-400 font-medium">
            &copy; {new Date().getFullYear()} 180workspace. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
