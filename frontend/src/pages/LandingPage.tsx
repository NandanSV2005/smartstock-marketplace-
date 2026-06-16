import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeStory, setActiveStory] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
  // Stats counters state
  const [stats, setStats] = useState({
    volume: 0,
    retailers: 0,
    accuracy: 0,
    dispatch: 120,
  });

  const statsSectionRef = useRef<HTMLDivElement>(null);

  // Dynamic dashboard routing path
  const dashboardPath = user
    ? user.role === 'retailer'
      ? '/retailer/dashboard'
      : user.role === 'wholesaler'
        ? '/wholesaler/dashboard'
        : '/admin/dashboard'
    : '/login';

  // Smooth scroll reveals using IntersectionObserver
  useEffect(() => {
    const reveals = document.querySelectorAll('.scroll-reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-visible');
          }
        });
      },
      { threshold: 0.15 }
    );
    reveals.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Sticky Storytelling scroll tracker
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-story-idx'));
            setActiveStory(index);
          }
        });
      },
      {
        rootMargin: '-30% 0px -45% 0px',
        threshold: 0.2,
      }
    );

    const blocks = document.querySelectorAll('[data-story-idx]');
    blocks.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Statistics count-up animation when visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          const duration = 2000;
          const startTime = performance.now();

          const animate = (currentTime: number) => {
            const progress = Math.min((currentTime - startTime) / duration, 1);
            const easeProgress = progress * (2 - progress);

            setStats({
              volume: Math.floor(easeProgress * 4.5),
              retailers: Math.floor(easeProgress * 12000),
              accuracy: Math.floor(easeProgress * 99),
              dispatch: Math.max(2, Math.floor(120 - easeProgress * 118)),
            });

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (statsSectionRef.current) {
      observer.observe(statsSectionRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const faqs = [
    {
      q: "How does the SmartStock AI predict inventory stockouts?",
      a: "Our machine learning models analyze historical sales velocity, regional demand shifts, seasonality, and supplier lead times to build a hyper-accurate stock degradation timeline for each product, alerting you before items sell out."
    },
    {
      q: "How is the automated line of credit calculated for retailers?",
      a: "SmartStock tracks ledger consistency and sales velocity on our decentralized system. Retailers with reliable order intervals and transparent sales records are dynamically granted larger, interest-free credit terms directly from suppliers."
    },
    {
      q: "Can I connect my existing point-of-sale (POS) terminal?",
      a: "Yes. SmartStock provides open API access and pre-built integrations for standard retail point-of-sale systems. Sales recorded at your local registers automatically sync to update your inventory thresholds in real time."
    },
    {
      q: "What are the dispatch guarantees for wholesaler fulfillment?",
      a: "Our synchronized wholesaler logistics ensure that orders placed via SmartStock's automated reorder triggers are packaged instantly and dispatched within 2 hours, resulting in zero supplier downtime."
    }
  ];

  const stories = [
    {
      idx: 0,
      label: 'Forecast Engine',
      title: 'Never run dry. AI predicts demand.',
      description: "SmartStock's core engine watches your stock volumes, analyzing historical trade trends and seasonal variations. It detects potential stockouts long before they happen, suggesting exact reorder volumes to maximize cash efficiency.",
      highlight: 'Timeline to Stockout: 48h Remaining'
    },
    {
      idx: 1,
      label: 'Direct Logistics',
      title: 'Direct connection. Wholesaler integration.',
      description: 'Connect instantly to FMCG and grocery wholesalers. Orders pass through automated pipeline processing, syncing active inventories and providing secure, lock-in price snapshots to defend against pricing drift.',
      highlight: 'Cargo Status: Dispatched from Depot'
    },
    {
      idx: 2,
      label: 'Trust & Credit',
      title: 'Automated Credit. Auditable ledger.',
      description: 'Eliminate paperwork. Retailers build high-trust profiles automatically by conducting trade transactions. Wholesalers deploy custom credit term triggers to repeat partners without running traditional manual risk underwriting.',
      highlight: 'Reputation Score: 98.2 / High Trust'
    }
  ];

  return (
    <div className="w-full bg-[var(--color-slate-50)] transition-colors duration-[var(--nb-duration-mid)] overflow-x-clip">
      
      {/* Immersive Hero Section with Indigo Radial Glow */}
      <section className="relative min-h-[90vh] flex flex-col justify-center items-center text-center px-4 sm:px-8 lg:px-16 pt-16"
               style={{ background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 100%)' }}>
        
        <div className="max-w-4xl mx-auto z-10 space-y-6">
          <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider text-[var(--color-primary-500)] bg-[var(--color-primary-500)]/10 border border-[var(--color-primary-500)]/20 uppercase animate-scale-in">
            ✦ Introducing SmartStock AI
          </span>
          <h1 className="text-4xl sm:text-[56px] font-bold font-display tracking-tight leading-none text-[var(--color-slate-900)] animate-fade-in uppercase">
            THE FUTURE OF <br />
            <span className="text-[var(--color-primary-500)] bg-gradient-to-r from-[var(--color-primary-500)] to-orange-500 bg-clip-text text-transparent">B2B COMMERCE.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-base sm:text-xl text-[var(--color-slate-500)] font-normal tracking-wide leading-relaxed animate-fade-in select-none">
            Predict inventory shortfalls, automate direct credit lines, and coordinate bulk logistics in real time. Absolute intelligence, minimal effort.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-fade-in">
            <button
              onClick={() => navigate(dashboardPath)}
              className="btn-tactile-orange px-8 py-4 text-sm font-semibold uppercase tracking-wider rounded-full shadow-2xl hover:scale-[1.02] active:scale-100 transition-all duration-[var(--nb-duration-fast)] w-full sm:w-auto cursor-pointer"
            >
              {user ? 'Enter Portal Dashboard' : 'Start as Retailer'}
            </button>
            <button 
              onClick={() => {
                const el = document.getElementById('storytelling');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="border border-[var(--color-primary-500)] text-[var(--color-primary-500)] bg-transparent hover:bg-[var(--color-primary-500)]/10 transition-all duration-[var(--nb-duration-fast)] rounded-full px-8 py-4 text-sm font-semibold uppercase tracking-wider w-full sm:w-auto cursor-pointer"
            >
              Join as Wholesaler
            </button>
          </div>

          {/* 3 Trust Signals */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-8 border-t border-[var(--color-slate-200)] mt-8 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 text-left">
              <svg className="w-5 h-5 text-[var(--color-primary-500)]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21a3.745 3.745 0 01-3.128-1.596 3.746 3.746 0 01-3.297-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" /></svg>
              <div>
                <span className="block text-xs font-bold uppercase tracking-widest text-[var(--color-slate-800)]">94.2% ACCURACY</span>
                <span className="block text-[10px] text-[var(--color-slate-400)]">AI Demand Forecasting</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-left">
              <svg className="w-5 h-5 text-[var(--color-secondary-500)]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div>
                <span className="block text-xs font-bold uppercase tracking-widest text-[var(--color-slate-800)]">&lt; 2hr DISPATCH</span>
                <span className="block text-[10px] text-[var(--color-slate-400)]">FMCG Depot Logistics</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-left">
              <svg className="w-5 h-5 text-[var(--color-accent-500)]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div>
                <span className="block text-xs font-bold uppercase tracking-widest text-[var(--color-slate-800)]">₹4.5B+ VOLUME</span>
                <span className="block text-[10px] text-[var(--color-slate-400)]">Monthly Trade Value</span>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* Sticky Storytelling Section (Column Swapped) */}
      <section id="storytelling" className="relative bg-[var(--color-slate-50)] py-24 border-t border-[var(--color-slate-200)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-stretch">
            
            {/* Left Column: Sticky Narrative Block */}
            <div className="relative z-20">
              <div className="sticky top-28 space-y-8">
                <div className="space-y-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-primary-500)]">How SmartStock Works</span>
                  <h2 className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-[var(--color-slate-800)] uppercase">Next-Gen Intelligent Reordering</h2>
                </div>

                <div className="space-y-4 border-l border-[var(--color-slate-200)]">
                  {stories.map((s) => (
                    <button
                      key={s.idx}
                      onClick={() => {
                        const el = document.querySelector(`[data-story-idx="${s.idx}"]`);
                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className={`w-full text-left block pl-6 py-4 border-l-4 transition-all duration-[var(--nb-duration-mid)] ease-[var(--nb-ease-smooth)] cursor-pointer ${
                        activeStory === s.idx
                          ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-500)]/5 text-[var(--color-slate-900)]'
                          : 'border-transparent text-[var(--color-slate-400)] hover:text-[var(--color-slate-650)]'
                      }`}
                    >
                      <span className="block text-[10px] font-bold uppercase tracking-wider mb-1">0{s.idx + 1} / {s.label}</span>
                      <h4 className="text-sm font-bold leading-tight mb-2">{s.title}</h4>
                      <p className={`text-xs leading-relaxed font-normal transition-opacity duration-300 ${
                        activeStory === s.idx ? 'opacity-100 text-[var(--color-slate-500)]' : 'opacity-0 h-0 overflow-hidden'
                      }`}>
                        {s.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Scrolling Screenshots / Visualizers */}
            <div className="space-y-16 mt-12 lg:mt-0">
              
              {/* Mockup 1 */}
              <div data-story-idx="0" className="rounded-2xl border border-[var(--color-slate-200)] shadow-xl relative overflow-hidden bg-[#0c0c0e] min-h-[420px] p-6 flex flex-col justify-between">
                <div className="absolute inset-0 bg-[var(--color-primary-500)]/5 pointer-events-none z-10" />
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-[var(--color-primary-500)] rounded-full animate-ping"></span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-primary-400">AI Forecast Engine</span>
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">LIVE</span>
                  </div>

                  {/* Mini bar chart */}
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5 mb-4">
                    <div className="flex items-end justify-between gap-1.5 h-20 mb-3">
                      {[35,55,42,68,45,30,20,48,60,78,55,40].map((h, i) => (
                        <div key={i} className="flex-1 rounded-sm transition-all duration-700" style={{height: `${h}%`, background: i >= 8 ? 'rgba(239,68,68,0.7)' : 'rgba(99, 102, 241, 0.55)'}}></div>
                      ))}
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                      <span>Jun 01</span><span>Jun 07</span><span className="text-red-400 font-bold">CRITICAL ↑</span>
                    </div>
                  </div>

                  {/* Alert list */}
                  <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-3.5 h-3.5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19h-17L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>
                      <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Stockout Alert – 3 Products</span>
                    </div>
                    <div className="space-y-1.5">
                      {[['Tata Salt 1kg', '14h'], ['Parle-G 800g', '31h'], ['Amul Butter', '48h']].map(([item, time]) => (
                        <div key={item} className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-300 font-medium">{item}</span>
                          <span className="text-[10px] text-red-400 font-bold font-mono">{time} left</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest block">AI Reorder Suggestion</span>
                  <span className="text-xs font-semibold text-emerald-400 font-mono">Confidence: 94.2%</span>
                </div>
              </div>

              {/* Mockup 2 */}
              <div data-story-idx="1" className="rounded-2xl border border-[var(--color-slate-200)] shadow-xl relative overflow-hidden bg-[#0c0c0e] min-h-[420px] p-6 flex flex-col justify-between">
                <div className="absolute inset-0 bg-[var(--color-primary-500)]/5 pointer-events-none z-10" />
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Live Order Pipeline</span>
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">3 ACTIVE</span>
                  </div>

                  <div className="space-y-3 mb-4">
                    {[
                      {name:'Reliance Wholesale', sku:'42 SKUs', status:'Dispatched', color:'emerald'},
                      {name:'Metro Cash & Carry', sku:'18 SKUs', status:'Packing', color:'amber'},
                      {name:'D-Mart Depot', sku:'61 SKUs', status:'Confirmed', color:'sky'},
                    ].map(({name, sku, status, color}) => (
                      <div key={name} className="bg-white/5 rounded-xl p-3 border border-white/5 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-white block">{name}</span>
                          <span className="text-[9px] text-slate-500 font-mono">{sku}</span>
                        </div>
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                          color==='emerald' ? 'text-emerald-400 bg-emerald-400/15 border border-emerald-400/20' :
                          color==='amber' ? 'text-amber-400 bg-amber-400/15 border border-amber-400/20' :
                          'text-sky-400 bg-sky-400/15 border border-sky-400/20'
                        }`}>{status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest block">Cargo Route Duration</span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">2.4 hrs average</span>
                </div>
              </div>

              {/* Mockup 3 */}
              <div data-story-idx="2" className="rounded-2xl border border-[var(--color-slate-200)] shadow-xl relative overflow-hidden bg-[#0c0c0e] min-h-[420px] p-6 flex flex-col justify-between">
                <div className="absolute inset-0 bg-[var(--color-primary-500)]/5 pointer-events-none z-10" />
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Trust Infrastructure</span>
                    </div>
                    <span className="text-[9px] text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">VERIFIED</span>
                  </div>

                  <div className="flex items-center gap-5 bg-white/5 rounded-2xl p-4 border border-white/5 mb-4">
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3"/>
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="98.2 100" strokeLinecap="round"/>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-sm font-bold text-white leading-none font-mono">98.2</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block mb-1">High Trust Retailer</span>
                      <span className="text-[9px] text-slate-400 block leading-tight">Based on 847 ledger-verified transactions</span>
                    </div>
                  </div>

                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-slate-400 uppercase tracking-widest">Active Credit Line</span>
                      <span className="text-[9px] text-amber-400 font-bold">Auto-Approved</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="text-lg font-bold text-white font-mono">₹2.5L</span>
                      <span className="text-[9px] text-slate-400">0.8% per month</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest block">Audit Trail Ledger</span>
                  <span className="text-xs font-bold text-amber-400 font-mono">Syncing Ledger Invoices</span>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* Feature Grid Section (Adaptive 12-Column Spatial Grid) */}
      <section className="bg-[var(--color-slate-100)] py-24 border-t border-[var(--color-slate-200)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-16">
          
          <div className="max-w-3xl mx-auto space-y-4 scroll-reveal">
            <h2 className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-[var(--color-slate-800)] uppercase">
              DESIGNED TO RUN B2B LOGISTICS AT SCALE.
            </h2>
            <p className="text-sm sm:text-base text-[var(--color-slate-500)] font-normal max-w-xl mx-auto">
              Every detail engineered for kiranas, supermarkets, and major wholesalers. Minimal configuration, massive results.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            <div className="scroll-reveal card bg-[var(--color-slate-50)] p-8 text-left hover:-translate-y-1 duration-500 transition-all border-[var(--color-slate-200)] flex flex-col justify-between rounded-2xl">
              <div>
                <div className="bg-primary-500/10 p-3 rounded-2xl border border-primary-500/10 w-fit mb-6 text-primary-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <h3 className="text-sm font-bold text-[var(--color-slate-800)] uppercase mb-3">Instant Reordering</h3>
                <p className="text-[var(--color-slate-500)] text-xs leading-relaxed">
                  Queue orders from multiple wholesalers in a single touch. No phone calls, no spreadsheets.
                </p>
              </div>
            </div>

            <div className="scroll-reveal card bg-[var(--color-slate-50)] p-8 text-left hover:-translate-y-1 duration-500 transition-all border-[var(--color-slate-200)] flex flex-col justify-between rounded-2xl">
              <div>
                <div className="bg-primary-500/10 p-3 rounded-2xl border border-primary-500/10 w-fit mb-6 text-primary-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                </div>
                <h3 className="text-sm font-bold text-[var(--color-slate-800)] uppercase mb-3">Locked-In Prices</h3>
                <p className="text-[var(--color-slate-500)] text-xs leading-relaxed">
                  Secure prices automatically during market fluctuations. Wholesaler rate agreements are guaranteed on placement.
                </p>
              </div>
            </div>

            <div className="scroll-reveal card bg-[var(--color-slate-50)] p-8 text-left hover:-translate-y-1 duration-500 transition-all border-[var(--color-slate-200)] flex flex-col justify-between rounded-2xl">
              <div>
                <div className="bg-primary-500/10 p-3 rounded-2xl border border-primary-500/10 w-fit mb-6 text-primary-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                </div>
                <h3 className="text-sm font-bold text-[var(--color-slate-800)] uppercase mb-3">Sales Dashboards</h3>
                <p className="text-[var(--color-slate-500)] text-xs leading-relaxed">
                  Visualize margins, top-selling assets, and inventory turnovers in real time on sleek, interactive area charts.
                </p>
              </div>
            </div>

            <div className="scroll-reveal card bg-[var(--color-slate-50)] p-8 text-left hover:-translate-y-1 duration-500 transition-all border-[var(--color-slate-200)] flex flex-col justify-between rounded-2xl">
              <div>
                <div className="bg-primary-500/10 p-3 rounded-2xl border border-primary-500/10 w-fit mb-6 text-primary-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <h3 className="text-sm font-bold text-[var(--color-slate-800)] uppercase mb-3">Dynamic Credit Lines</h3>
                <p className="text-[var(--color-slate-500)] text-xs leading-relaxed">
                  Unlock lines of credit directly through wholesalers without traditional manual approval bottlenecks.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Counters Section (Styled as Google Sans Display) */}
      <section ref={statsSectionRef} className="bg-[var(--color-slate-50)] py-24 border-t border-[var(--color-slate-200)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            
            <div className="space-y-2">
              <p className="text-4xl sm:text-[48px] font-bold font-display text-[var(--color-primary-500)] tracking-tight">
                ₹{stats.volume > 0 ? `${stats.volume}.5B+` : '4.5B+'}
              </p>
              <p className="text-xs uppercase tracking-widest text-[var(--color-slate-400)] font-semibold">Total Trade Volume</p>
            </div>

            <div className="space-y-2">
              <p className="text-4xl sm:text-[48px] font-bold font-display text-[var(--color-primary-500)] tracking-tight">
                {stats.retailers > 0 ? stats.retailers.toLocaleString() : '12,000'}+
              </p>
              <p className="text-xs uppercase tracking-widest text-[var(--color-slate-400)] font-semibold">Active Retailers</p>
            </div>

            <div className="space-y-2">
              <p className="text-4xl sm:text-[48px] font-bold font-display text-[var(--color-primary-500)] tracking-tight">
                {stats.accuracy > 0 ? stats.accuracy : '99'}%
              </p>
              <p className="text-xs uppercase tracking-widest text-[var(--color-slate-400)] font-semibold">Prediction Accuracy</p>
            </div>

            <div className="space-y-2">
              <p className="text-4xl sm:text-[48px] font-bold font-display text-[var(--color-primary-500)] tracking-tight">
                &lt; {stats.dispatch}h
              </p>
              <p className="text-xs uppercase tracking-widest text-[var(--color-slate-400)] font-semibold">Wholesaler Dispatch Time</p>
            </div>

          </div>
        </div>
      </section>

      {/* Customer Testimonials Section */}
      <section className="bg-[var(--color-slate-100)] py-24 border-t border-[var(--color-slate-200)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-16">
          
          <div className="max-w-3xl mx-auto space-y-4 scroll-reveal">
            <h2 className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-[var(--color-slate-800)] uppercase">
              PROVEN BY THE BEST IN THE INDUSTRY.
            </h2>
            <p className="text-sm text-[var(--color-slate-500)] font-normal max-w-xl mx-auto">
              Read how store owners and FMCG suppliers are changing their workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <div className="scroll-reveal glass p-8 rounded-3xl border border-[var(--color-slate-200)] text-left flex flex-col justify-between shadow-lg">
              <p className="text-[var(--color-slate-500)] text-sm leading-relaxed italic">
                &ldquo;SmartStock completely changed my supermarket's reordering cycle. The AI warnings let me order exactly what we need, reducing capital tied up in slow products by 30%.&rdquo;
              </p>
              <div className="mt-8 flex items-center gap-3 border-t border-[var(--color-slate-200)] pt-4">
                <div className="w-10 h-10 rounded-full bg-[var(--color-primary-500)] text-white flex items-center justify-center font-bold">
                  RS
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--color-slate-800)] uppercase">Ramesh Sharma</h4>
                  <p className="text-[9px] text-[var(--color-slate-400)] font-bold uppercase tracking-widest">Kirana Owner, Mumbai</p>
                </div>
              </div>
            </div>

            <div className="scroll-reveal glass p-8 rounded-3xl border border-[var(--color-slate-200)] text-left flex flex-col justify-between shadow-lg">
              <p className="text-[var(--color-slate-500)] text-sm leading-relaxed italic">
                &ldquo;As a wholesaler, order accuracy is everything. By integrating with the SmartStock ledger, retailers submit direct inventory requirements that flow straight into our dispatch system.&rdquo;
              </p>
              <div className="mt-8 flex items-center gap-3 border-t border-[var(--color-slate-200)] pt-4">
                <div className="w-10 h-10 rounded-full bg-[var(--color-primary-500)] text-white flex items-center justify-center font-bold">
                  AP
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--color-slate-800)] uppercase">Ananya Patel</h4>
                  <p className="text-[9px] text-[var(--color-slate-400)] font-bold uppercase tracking-widest">FMCG Wholesaler, Surat</p>
                </div>
              </div>
            </div>

            <div className="scroll-reveal glass p-8 rounded-3xl border border-[var(--color-slate-200)] text-left flex flex-col justify-between shadow-lg">
              <p className="text-[var(--color-slate-500)] text-sm leading-relaxed italic">
                &ldquo;Underwriting credit for small shops used to be a major headache. The credit ledger built into SmartStock lets us offer flexible credit lines with zero manual paperwork.&rdquo;
              </p>
              <div className="mt-8 flex items-center gap-3 border-t border-[var(--color-slate-200)] pt-4">
                <div className="w-10 h-10 rounded-full bg-[var(--color-primary-500)] text-white flex items-center justify-center font-bold">
                  VK
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--color-slate-800)] uppercase">Vikram K.</h4>
                  <p className="text-[9px] text-[var(--color-slate-400)] font-bold uppercase tracking-widest">Distributor Director, Delhi</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-[var(--color-slate-50)] py-24 border-t border-[var(--color-slate-200)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-4 scroll-reveal">
            <h2 className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-[var(--color-slate-800)] uppercase">
              QUESTIONS & ANSWERS.
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-slate-400)] font-semibold uppercase tracking-wider">Everything you need to know about the platform.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className="scroll-reveal border-b border-[var(--color-slate-200)] pb-4"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex justify-between items-center text-left py-4 text-sm font-bold text-[var(--color-slate-800)] hover:text-[var(--color-primary-500)] transition-colors uppercase tracking-wider cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <span className={`text-base transform transition-transform duration-[var(--nb-duration-fast)] ${
                    openFaq === index ? 'rotate-45 text-[var(--color-primary-500)]' : 'text-[var(--color-slate-400)]'
                  }`}>
                    +
                  </span>
                </button>
                <div className={`overflow-hidden transition-all duration-[var(--nb-duration-mid)] ease-[var(--nb-ease-smooth)] ${
                  openFaq === index ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0'
                }`}>
                  <p className="text-[var(--color-slate-500)] text-xs leading-relaxed font-normal pb-4">
                    {faq.a}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Final Call to Action Section */}
      <section className="relative py-24 bg-[#0c0c0e] text-white overflow-hidden border-t border-white/5">
        <div className="absolute inset-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06)_0%,transparent_60%)] pointer-events-none blur-2xl"></div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10 scroll-reveal">
          <h2 className="text-4xl sm:text-5xl font-bold font-display tracking-tight leading-none uppercase">
            UPGRADE YOUR <br />
            <span className="text-[var(--color-primary-500)] bg-gradient-to-r from-[var(--color-primary-500)] to-orange-500 bg-clip-text text-transparent">OPERATIONS TODAY.</span>
          </h2>
          <p className="max-w-xl mx-auto text-slate-400 text-sm leading-relaxed font-normal">
            Join thousands of retailers and wholesale distributors leveraging SmartStock AI to maximize profitability.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => navigate(dashboardPath)}
              className="btn-tactile-orange px-10 py-5 text-sm font-semibold uppercase tracking-wider rounded-full shadow-2xl hover:scale-102 transition-all cursor-pointer"
            >
              {user ? 'Enter Portal Dashboard' : 'Create Free Account'}
            </button>
            {!user && (
              <button
                onClick={() => navigate('/login')}
                className="px-10 py-5 text-sm font-semibold uppercase tracking-wider text-slate-300 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Premium Structured Footer */}
      <footer className="bg-[var(--color-slate-100)] border-t border-[var(--color-slate-200)] py-16 text-[var(--color-slate-500)] text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-5 gap-12 text-left">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2 text-[var(--color-slate-900)]">
              <div className="bg-primary-500/10 p-1.5 rounded-lg border border-primary-500/20">
                <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
              </div>
              <span className="font-bold text-sm">SmartStock AI</span>
            </div>
            <p className="text-slate-400 max-w-sm leading-relaxed">
              Next-generation supply chain and trade infrastructure for kiranas, independent supermarkets, and FMCG wholesalers. Built for speed, security, and automated credit lines.
            </p>
          </div>
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-slate-800)] mb-4">Platform</h4>
            <ul className="space-y-2.5 font-semibold">
              <li><a href="#" className="hover:text-[var(--color-primary-500)] transition-colors">AI Demand Engine</a></li>
              <li><a href="#" className="hover:text-[var(--color-primary-500)] transition-colors">Supplier Exchange</a></li>
              <li><a href="#" className="hover:text-[var(--color-primary-500)] transition-colors">Automated Credit</a></li>
              <li><a href="#" className="hover:text-[var(--color-primary-500)] transition-colors">Security Audit</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-slate-800)] mb-4">Resources</h4>
            <ul className="space-y-2.5 font-semibold">
              <li><a href="#" className="hover:text-[var(--color-primary-500)] transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-[var(--color-primary-500)] transition-colors">API References</a></li>
              <li><a href="#" className="hover:text-[var(--color-primary-500)] transition-colors">Case Studies</a></li>
              <li><a href="#" className="hover:text-[var(--color-primary-500)] transition-colors">Developer Portal</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-slate-800)] mb-4">Company</h4>
            <ul className="space-y-2.5 font-semibold">
              <li><a href="#" className="hover:text-[var(--color-primary-500)] transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-[var(--color-primary-500)] transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-[var(--color-primary-500)] transition-colors">Press Kit</a></li>
              <li><a href="#" className="hover:text-[var(--color-primary-500)] transition-colors">Contact Support</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-[var(--color-slate-200)] mt-12 pt-8 text-center text-slate-400 font-medium">
          <p>© 2026 SmartStock Solutions Inc. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
