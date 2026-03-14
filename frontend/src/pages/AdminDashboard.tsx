import { useEffect } from 'react';
import { useAuth } from '../AuthContext';
export function AdminDashboard() {
  const { accessToken } = useAuth();
  // metrics, loading, error state initialized when the dashboard gets extended

  useEffect(() => {
    if (!accessToken) return;

    // getDashboardMetrics(accessToken)
    //   .then(setMetrics)
    //   .catch(err => setError(err.message || 'Failed to load admin metrics'))
    //   .finally(() => setLoading(false));
  }, [accessToken]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-12 border-b border-white/5 pb-8">
        <h2 className="text-3xl font-black leading-7 text-slate-800 sm:text-4xl sm:truncate uppercase tracking-tighter">
          Systems Overlord
        </h2>
        <p className="mt-2 text-sm text-slate-400 font-medium italic">
          Infrastructure health monitor, global telemetry, and core protocol orchestration.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="card p-8 bg-slate-100 border-none shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-600/5 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Provisioned Entities</h3>
          <p className="text-3xl font-black text-slate-800">03 Roles</p>
          <p className="text-[8px] text-slate-400 mt-4 font-black uppercase tracking-widest opacity-60">Retail • Wholesale • Root</p>
        </div>
        <div className="card p-8 bg-slate-100 border-none shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-400/5 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Logic Clusters</h3>
          <p className="text-3xl font-black text-slate-800">06 Core</p>
          <p className="text-[8px] text-slate-400 mt-4 font-black uppercase tracking-widest opacity-60">Auth • DMA • HEURISTIC</p>
        </div>
        <div className="card p-8 bg-slate-100 border-none shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Neural Status</h3>
          <p className="text-3xl font-black text-slate-800 flex items-center">
            <span className="w-4 h-4 bg-secondary-500 rounded-full mr-3 animate-pulse shadow-lg shadow-secondary-500/20"></span> Nominal
          </p>
          <p className="text-[8px] text-slate-400 mt-4 font-black uppercase tracking-widest opacity-60">Inference modules synchronized</p>
        </div>
        <div className="card p-8 bg-slate-100 border-none shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Gateway Velocity</h3>
          <p className="text-3xl font-black text-slate-800 tracking-tighter">99.98%</p>
          <p className="text-[8px] text-slate-400 mt-4 font-black uppercase tracking-widest opacity-60">Zero packet loss detected</p>
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="card p-10 bg-slate-100 border-none shadow-2xl">
          <h3 className="text-base font-black text-slate-800 mb-8 uppercase tracking-widest border-b border-white/5 pb-4">Protocol Overrides</h3>
          <div className="space-y-4">
            <button className="w-full bg-white/5 border border-white/5 text-slate-400 py-4 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest text-left hover:bg-white/10 transition-all flex justify-between items-center group">
              Manage User Infrastructure (Coming Soon)
              <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </button>
            <button className="w-full bg-white/5 border border-white/5 text-slate-400 py-4 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest text-left hover:bg-white/10 transition-all flex justify-between items-center group">
              Audit Wholesaler Provisioning
              <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </button>
            <button className="w-full bg-white/5 border border-white/5 text-slate-400 py-4 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest text-left hover:bg-white/10 transition-all flex justify-between items-center group">
              Core Runtime Logs
              <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </button>
          </div>
        </section>

        <section className="card p-10 bg-slate-100 border-none shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-600 via-secondary-500 to-accent-500 opacity-20"></div>
          <h3 className="text-base font-black text-slate-800 mb-8 flex items-center uppercase tracking-widest">
            <svg className="w-5 h-5 mr-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            Architecture Brief
          </h3>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed font-medium italic">
            Deployment: PRODUCTION_STAGING • Pulse: SYNCHRONIZED
          </p>
          <ul className="text-[10px] text-slate-500 space-y-4 font-black uppercase tracking-widest opacity-80">
            <li className="flex items-center group">
              <span className="w-8 h-px bg-white/5 mr-4 group-hover:w-12 transition-all"></span>
              JWT AUTHENTICATION STACK
            </li>
            <li className="flex items-center group">
              <span className="w-8 h-px bg-white/5 mr-4 group-hover:w-12 transition-all"></span>
              B2B WORKFLOW ENGINE
            </li>
            <li className="flex items-center group">
              <span className="w-8 h-px bg-white/5 mr-4 group-hover:w-12 transition-all"></span>
              HEURISTIC INVENTORY INTELLIGENCE
            </li>
            <li className="flex items-center group">
              <span className="w-8 h-px bg-white/5 mr-4 group-hover:w-12 transition-all"></span>
              ROLE-BASED PERMISSIONING
            </li>
          </ul>
        </section>
      </div>

    </div>
  );
}
