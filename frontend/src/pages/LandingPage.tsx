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

  const storySectionRef = useRef<HTMLDivElement>(null);
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

  // Sticky Storytelling scroll tracker using IntersectionObserver
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
        rootMargin: '-30% 0px -45% 0px', // Focus on the middle segment of viewport
        threshold: 0.1,
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
          const duration = 2000; // 2 seconds
          const startTime = performance.now();

          const animate = (currentTime: number) => {
            const progress = Math.min((currentTime - startTime) / duration, 1);
            // Ease out quad formula
            const easeProgress = progress * (2 - progress);

            setStats({
              volume: Math.floor(easeProgress * 4.5), // ₹4.5B
              retailers: Math.floor(easeProgress * 12000), // 12,000+
              accuracy: Math.floor(easeProgress * 99), // 99%
              dispatch: Math.max(2, Math.floor(120 - easeProgress * 118)), // 2 hours
            });

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
          observer.disconnect(); // Only animate once
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

  const storySignals = [
    {
      label: 'Forecast',
      value: '94.2%',
      detail: 'Confidence score',
      tone: 'text-primary-400 bg-primary-500/15 border-primary-500/20',
    },
    {
      label: 'Dispatch',
      value: '2.4 hrs',
      detail: 'Depot to store ETA',
      tone: 'text-emerald-400 bg-emerald-400/15 border-emerald-400/20',
    },
    {
      label: 'Trust',
      value: '98.2',
      detail: 'Retailer ledger score',
      tone: 'text-amber-400 bg-amber-400/15 border-amber-400/20',
    },
  ];

  return (
    <div className="w-full bg-slate-50 transition-colors duration-300 overflow-x-clip">
      
      {/* Immersive Hero Section */}
      <section className="relative min-h-[95vh] flex flex-col justify-center items-center text-center px-4 sm:px-6 lg:px-8 pt-12 apple-glow-bg">
        {/* Apple-style background ambient accent */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] max-w-full rounded-full opacity-60 pointer-events-none blur-[120px] bg-[radial-gradient(circle_at_center,var(--color-primary-500)_0%,transparent_70%)]"></div>

        <div className="max-w-4xl mx-auto z-10 space-y-6">
          <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider text-primary-500 bg-primary-500/15 border border-primary-500/20 uppercase animate-scale-in">
            Introducing SmartStock AI
          </span>
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[1.05] text-slate-800 animate-fade-in uppercase">
            THE FUTURE OF <br />
            <span className="apple-text-gradient bg-gradient-to-r from-primary-500 to-orange-600">B2B COMMERCE.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg sm:text-2xl text-slate-500 font-medium tracking-wide leading-relaxed animate-fade-in opacity-80 select-none">
            Predict inventory shortfalls, automate direct credit lines, and coordinate bulk logistics in real time. Absolute intelligence, minimal effort.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-fade-in">
            <button
              onClick={() => navigate(dashboardPath)}
              className="btn-primary px-8 py-4 text-sm font-black uppercase tracking-widest rounded-full shadow-2xl hover:scale-102 active:scale-100 transition-all duration-300 w-full sm:w-auto"
            >
              {user ? 'Enter Dashboard' : 'Get Started Now'}
            </button>
            <button 
              onClick={() => {
                const el = document.getElementById('storytelling');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-8 py-4 text-sm font-black uppercase tracking-widest text-slate-700 bg-slate-200 border border-slate-300 rounded-full hover:bg-slate-300 transition-all duration-300 w-full sm:w-auto"
            >
              Learn More
            </button>
          </div>
        </div>

        {/* Floating Mockup (Hero image replacement using premium CSS visualization) */}
        <div className="mt-16 max-w-6xl w-full mx-auto px-4 z-10 scroll-reveal transform translate-y-10">
          <div className="glass rounded-[2rem] p-3 sm:p-5 border border-white/10 shadow-[0_40px_100px_-15px_rgba(0,0,0,0.5)]">
            <div className="bg-[#0c0c0e] rounded-[1.5rem] overflow-hidden border border-white/5 aspect-[16/9] flex flex-col">
              
              {/* Mockup Header */}
              <div className="px-6 py-4 bg-[#141416] border-b border-white/5 flex items-center justify-between">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                </div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-lg border border-white/5">
                  smartstock.ai/retailer-portal
                </div>
                <div className="w-10"></div>
              </div>

              {/* Mockup Screen Layout */}
              <div className="flex-1 p-4 sm:p-8 grid grid-cols-3 gap-6 text-left text-slate-400 select-none">
                
                {/* Left col - Stock warnings */}
                <div className="col-span-3 lg:col-span-1 bg-white/3 rounded-2xl p-5 border border-white/5 flex flex-col justify-between">
                  <div>
                    <h4 className="text-[10px] text-primary-500 font-black uppercase tracking-widest mb-3">AI Stock Warnings</h4>
                    <div className="space-y-4">
                      <div className="border-b border-white/5 pb-2">
                        <div className="flex justify-between items-center text-xs font-bold text-white uppercase tracking-tighter">
                          <span>Britannia Good Day</span>
                          <span className="text-red-500 bg-red-500/15 px-2 py-0.5 rounded text-[10px]">Critical</span>
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-1">Reorder level reached: Stockout in 2 days</span>
                      </div>
                      <div className="border-b border-white/5 pb-2">
                        <div className="flex justify-between items-center text-xs font-bold text-white uppercase tracking-tighter">
                          <span>Tata Salt Premium</span>
                          <span className="text-orange-500 bg-orange-500/15 px-2 py-0.5 rounded text-[10px]">Warning</span>
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-1">Unusual weekend demand spike detected</span>
                      </div>
                    </div>
                  </div>
                  <button className="w-full bg-primary-600 text-white font-black uppercase text-[10px] tracking-widest py-3 rounded-xl shadow-lg shadow-primary-500/10 hover:bg-primary-500 transition-all mt-4">
                    Trigger Smart Reorder (2 Items)
                  </button>
                </div>

                {/* Right col - Recharts / Sales Visualization mockup */}
                <div className="col-span-3 lg:col-span-2 bg-white/3 rounded-2xl p-6 border border-white/5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Store Revenue (Last 30 Days)</h4>
                      <span className="text-[10px] text-emerald-400 font-black bg-emerald-500/10 px-3 py-1 rounded-full uppercase tracking-widest">
                        +18.4% Revenue Increase
                      </span>
                    </div>
                    {/* Visual representation of a chart */}
                    <div className="h-40 flex items-end justify-between gap-1 sm:gap-2 px-2 mt-4 border-b border-white/5 pb-1">
                      <div className="w-full bg-white/10 rounded-t h-[40%] hover:bg-primary-500/50 transition-colors"></div>
                      <div className="w-full bg-white/10 rounded-t h-[35%] hover:bg-primary-500/50 transition-colors"></div>
                      <div className="w-full bg-white/10 rounded-t h-[55%] hover:bg-primary-500/50 transition-colors"></div>
                      <div className="w-full bg-white/10 rounded-t h-[48%] hover:bg-primary-500/50 transition-colors"></div>
                      <div className="w-full bg-white/10 rounded-t h-[65%] hover:bg-primary-500/50 transition-colors"></div>
                      <div className="w-full bg-white/10 rounded-t h-[50%] hover:bg-primary-500/50 transition-colors"></div>
                      <div className="w-full bg-white/10 rounded-t h-[75%] hover:bg-primary-500/50 transition-colors"></div>
                      <div className="w-full bg-primary-500 rounded-t h-[90%] shadow-[0_0_15px_rgba(249,115,22,0.4)]"></div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-white mt-4">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block tracking-widest">Total Sales</span>
                      <span className="text-xl font-black">₹4,84,320</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block tracking-widest">Active Credit Lines</span>
                      <span className="text-xl font-black text-primary-500">₹1,50,000</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Sticky Storytelling Section */}
      <section id="storytelling" ref={storySectionRef} className="relative bg-slate-50 py-24 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-stretch">
            
            {/* Left Column: Sticky visualizer */}
            <div className="hidden lg:block relative z-20">
              <div className="sticky top-28">
              <div className="w-full max-w-lg rounded-3xl relative overflow-hidden min-h-[520px]" style={{background: 'linear-gradient(135deg, #0f0f12 0%, #18181f 100%)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)'}}>
                
                {/* Ambient glow */}
                <div className={`absolute inset-0 pointer-events-none transition-all duration-1000 ${
                  activeStory === 0 ? 'opacity-100' : 'opacity-0'
                }`} style={{background: 'radial-gradient(circle at 80% 20%, rgba(249,115,22,0.18) 0%, transparent 60%)'}}></div>
                <div className={`absolute inset-0 pointer-events-none transition-all duration-1000 ${
                  activeStory === 1 ? 'opacity-100' : 'opacity-0'
                }`} style={{background: 'radial-gradient(circle at 20% 80%, rgba(52,211,153,0.15) 0%, transparent 60%)'}}></div>
                <div className={`absolute inset-0 pointer-events-none transition-all duration-1000 ${
                  activeStory === 2 ? 'opacity-100' : 'opacity-0'
                }`} style={{background: 'radial-gradient(circle at 50% 50%, rgba(245,158,11,0.15) 0%, transparent 60%)'}}></div>

                {/* ── STORY 0: AI Forecast Dashboard ── */}
                <div className={`transition-all duration-500 flex flex-col ${
                  activeStory === 0 ? 'relative opacity-100 translate-y-0' : 'absolute inset-0 opacity-0 translate-y-4 pointer-events-none'
                }`}>
                  <div className="p-6 flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary-500 rounded-full animate-ping"></span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary-400">AI Forecast Engine</span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">LIVE</span>
                    </div>

                    {/* Mini bar chart */}
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 mb-4">
                      <div className="flex items-end justify-between gap-1.5 h-20 mb-3">
                        {[35,55,42,68,45,30,20,48,60,78,55,40].map((h, i) => (
                          <div key={i} className="flex-1 rounded-sm transition-all duration-700" style={{height: `${h}%`, background: i >= 8 ? 'rgba(239,68,68,0.7)' : 'rgba(249,115,22,0.55)', animationDelay: `${i*60}ms`}}></div>
                        ))}
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                        <span>Jun 01</span><span>Jun 07</span><span className="text-red-400 font-bold">CRITICAL ↑</span>
                      </div>
                    </div>

                    {/* Alert card */}
                    <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-3.5 h-3.5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19h-17L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>
                        <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Stockout Alert – 3 Products</span>
                      </div>
                      <div className="space-y-1.5">
                        {[['Tata Salt 1kg', '14h'], ['Parle-G 800g', '31h'], ['Amul Butter', '48h']].map(([item, time]) => (
                          <div key={item} className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-300 font-medium">{item}</span>
                            <span className="text-[10px] text-red-400 font-black font-mono">{time} left</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Reorder suggestion */}
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest block mb-2">AI Reorder Suggestion</span>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-white">₹18,400 Restocking</span>
                        <button className="text-[9px] font-black uppercase tracking-wider text-primary-400 bg-primary-500/15 px-3 py-1 rounded-lg border border-primary-500/20 hover:bg-primary-500/25 transition-colors">Auto-Order</button>
                      </div>
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-3">
                        <div className="bg-primary-500 h-full rounded-full" style={{width:'68%'}}></div>
                      </div>
                      <span className="text-[9px] text-slate-500 mt-1 block">Confidence: 94.2%</span>
                    </div>
                  </div>
                </div>

                {/* ── STORY 1: Logistics & Wholesaler ── */}
                <div className={`transition-all duration-500 flex flex-col ${
                  activeStory === 1 ? 'relative opacity-100 translate-y-0' : 'absolute inset-0 opacity-0 translate-y-4 pointer-events-none'
                }`}>
                  <div className="p-6 flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Live Order Pipeline</span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">3 ACTIVE</span>
                    </div>

                    {/* Order pipeline */}
                    <div className="space-y-3 mb-4">
                      {[
                        {name:'Reliance Wholesale', sku:'42 SKUs', status:'Dispatched', color:'emerald'},
                        {name:'Metro Cash & Carry', sku:'18 SKUs', status:'Packing', color:'amber'},
                        {name:'D-Mart Depot', sku:'61 SKUs', status:'Confirmed', color:'sky'},
                      ].map(({name, sku, status, color}) => (
                        <div key={name} className="bg-white/5 rounded-xl p-3.5 border border-white/5 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-black text-white block">{name}</span>
                            <span className="text-[9px] text-slate-500 font-mono">{sku}</span>
                          </div>
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${
                            color==='emerald' ? 'text-emerald-400 bg-emerald-400/15 border border-emerald-400/20' :
                            color==='amber' ? 'text-amber-400 bg-amber-400/15 border border-amber-400/20' :
                            'text-sky-400 bg-sky-400/15 border border-sky-400/20'
                          }`}>{status}</span>
                        </div>
                      ))}
                    </div>

                    {/* Map placeholder */}
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex-1">
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest block mb-3">Delivery Estimate</span>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] text-slate-400">Depot → Store</span>
                            <span className="text-[9px] text-emerald-400 font-black">2.4 hrs</span>
                          </div>
                          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full animate-pulse" style={{width:'60%'}}></div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex space-x-1">
                          {[1,2,3,4,5].map(i => <span key={i} className={`w-1.5 h-1.5 rounded-full ${ i<=3 ? 'bg-emerald-500' : 'bg-white/15'}`}></span>)}
                        </div>
                        <span className="text-[9px] text-slate-400">3 of 5 checkpoints passed</span>
                      </div>
                    </div>

                    {/* Price lock */}
                    <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase tracking-widest block">Price Locked At</span>
                        <span className="text-sm font-black text-white">₹2,840 / case</span>
                      </div>
                      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                    </div>
                  </div>
                </div>

                {/* ── STORY 2: Trust & Credit ── */}
                <div className={`transition-all duration-500 flex flex-col ${
                  activeStory === 2 ? 'relative opacity-100 translate-y-0' : 'absolute inset-0 opacity-0 translate-y-4 pointer-events-none'
                }`}>
                  <div className="p-6 flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Trust Infrastructure</span>
                      </div>
                      <span className="text-[9px] text-emerald-400 font-black bg-emerald-400/10 px-2 py-0.5 rounded-lg border border-emerald-400/20">VERIFIED</span>
                    </div>

                    {/* Reputation ring */}
                    <div className="flex items-center gap-5 bg-white/5 rounded-2xl p-4 border border-white/5 mb-4">
                      <div className="relative w-20 h-20 flex-shrink-0">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3"/>
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="98.2 100" strokeLinecap="round"/>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-lg font-black text-white leading-none">98.2</span>
                          <span className="text-[8px] text-slate-500 uppercase">score</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-black text-white block mb-1">High Trust Retailer</span>
                        <span className="text-[9px] text-slate-400 leading-relaxed block">Based on 847 verified transactions with zero defaults</span>
                        <span className="text-[10px] text-amber-400 font-black mt-2 block">Top 4% in your region</span>
                      </div>
                    </div>

                    {/* Transaction ledger */}
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 mb-4">
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest block mb-3">Recent Ledger Entries</span>
                      <div className="space-y-2">
                        {[
                          ['INV-20481', '₹42,000', 'Paid', 'emerald'],
                          ['INV-20462', '₹18,500', 'Paid', 'emerald'],
                          ['INV-20440', '₹65,200', 'Paid', 'emerald'],
                        ].map(([id, amt, status, color]) => (
                          <div key={id} className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-mono">{id}</span>
                            <span className="text-[10px] font-black text-white">{amt}</span>
                            <span className={`text-[9px] font-black ${ color==='emerald' ? 'text-emerald-400' : 'text-red-400'}`}>{status}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Credit line card */}
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] text-slate-400 uppercase tracking-widest">Active Credit Line</span>
                        <span className="text-[9px] text-amber-400 font-black">Auto-Approved</span>
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="text-xl font-black text-white">₹2.5L</span>
                        <span className="text-[9px] text-slate-400">0.8% per month</span>
                      </div>
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
                        <div className="bg-amber-500 h-full rounded-full" style={{width:'38%'}}></div>
                      </div>
                      <span className="text-[9px] text-slate-500 mt-1 block">₹95,000 utilized of ₹2.5L</span>
                    </div>
                  </div>
                </div>

                {/* Story dots (always visible) */}
                <div className="relative z-20 flex items-center justify-between px-6 pb-4" style={{paddingTop: activeStory === 0 ? '0' : '0'}}>
                  <div className="flex space-x-2">
                    {[0, 1, 2].map((idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveStory(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          activeStory === idx ? 'bg-primary-500 w-6' : 'bg-white/20 w-3.5'
                        }`}
                      ></button>
                    ))}
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">{activeStory + 1} / 3</span>
                </div>

              </div>

              <div className="mt-5 w-full max-w-lg grid grid-cols-3 gap-3">
                {storySignals.map((signal, index) => (
                  <button
                    key={signal.label}
                    onClick={() => setActiveStory(index)}
                    className={`text-left rounded-2xl border p-4 transition-all duration-300 ${
                      activeStory === index
                        ? signal.tone
                        : 'border-slate-200 bg-slate-100 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <span className="block text-[9px] font-black uppercase tracking-widest">{signal.label}</span>
                    <span className="block text-lg font-black text-slate-800 mt-1">{signal.value}</span>
                    <span className="block text-[9px] font-bold uppercase tracking-wide text-slate-500 mt-1">{signal.detail}</span>
                  </button>
                ))}
              </div>
              </div>
            </div>

            {/* Right Column: Text Story blocks */}
            <div className="py-16">
              
              <div data-story-idx="0" className="scroll-reveal space-y-6 min-h-[75vh] flex flex-col justify-center">
                <span className="text-sm font-black text-primary-500 uppercase tracking-widest block">01 / FORECAST</span>
                <h3 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-800 uppercase leading-none">
                  Never run dry. <br />
                  AI predicts demand.
                </h3>
                <p className="text-slate-500 text-lg sm:text-xl leading-relaxed font-medium max-w-xl">
                  SmartStock's core engine watches your stock volumes, analyzing historical trade trends and seasonal variations. It detects potential stockouts long before they happen, suggesting exact reorder volumes to maximize cash efficiency.
                </p>
                <div className="lg:hidden p-6 bg-slate-100 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Live Feature Preview</span>
                  <p className="text-sm text-slate-700 font-bold uppercase tracking-tight">Timeline to Stockout: 48h Remaining</p>
                </div>
              </div>

              <div data-story-idx="1" className="scroll-reveal space-y-6 min-h-[75vh] flex flex-col justify-center">
                <span className="text-sm font-black text-primary-500 uppercase tracking-widest block">02 / LOGISTICS</span>
                <h3 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-800 uppercase leading-none">
                  Direct connection. <br />
                  Wholesaler integration.
                </h3>
                <p className="text-slate-500 text-lg sm:text-xl leading-relaxed font-medium max-w-xl">
                  Connect instantly to FMCG and grocery wholesalers. Orders pass through automated pipeline processing, syncing active inventories and providing secure, lock-in price snapshots to defend against pricing drift.
                </p>
                <div className="hidden lg:grid grid-cols-2 gap-4 max-w-xl">
                  <div className="rounded-2xl border border-slate-200 bg-slate-100 p-5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Pipeline Load</span>
                    <p className="text-2xl font-black text-slate-800 mt-2">121 SKUs</p>
                    <p className="text-xs font-semibold leading-relaxed text-slate-500 mt-2">Grouped into three active supplier runs with live status updates.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-100 p-5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary-500">Price Control</span>
                    <p className="text-2xl font-black text-slate-800 mt-2">Locked</p>
                    <p className="text-xs font-semibold leading-relaxed text-slate-500 mt-2">Order values are snapshotted before dispatch to prevent rate drift.</p>
                  </div>
                </div>
                <div className="lg:hidden p-6 bg-slate-100 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Live Feature Preview</span>
                  <p className="text-sm text-slate-700 font-bold uppercase tracking-tight">Cargo Status: Dispatched from Depot</p>
                </div>
              </div>

              <div data-story-idx="2" className="scroll-reveal space-y-6 min-h-[75vh] flex flex-col justify-center">
                <span className="text-sm font-black text-primary-500 uppercase tracking-widest block">03 / TRUST</span>
                <h3 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-800 uppercase leading-none">
                  Automated Credit. <br />
                  Auditable ledger.
                </h3>
                <p className="text-slate-500 text-lg sm:text-xl leading-relaxed font-medium max-w-xl">
                  Eliminate paperwork. Retailers build high-trust profiles automatically by conducting trade transactions. Wholesalers deploy custom credit term triggers to repeat partners without running traditional manual risk underwriting.
                </p>
                <div className="hidden lg:grid grid-cols-2 gap-4 max-w-xl">
                  <div className="rounded-2xl border border-slate-200 bg-slate-100 p-5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Credit Health</span>
                    <p className="text-2xl font-black text-slate-800 mt-2">Top 4%</p>
                    <p className="text-xs font-semibold leading-relaxed text-slate-500 mt-2">Retailer reliability is computed from paid invoices and order cadence.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-100 p-5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Ledger Trail</span>
                    <p className="text-2xl font-black text-slate-800 mt-2">847</p>
                    <p className="text-xs font-semibold leading-relaxed text-slate-500 mt-2">Verified transactions feed automatic credit terms for repeat partners.</p>
                  </div>
                </div>
                <div className="lg:hidden p-6 bg-slate-100 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Live Feature Preview</span>
                  <p className="text-sm text-slate-700 font-bold uppercase tracking-tight">Reputation Score: 98.2 / High Trust</p>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section className="bg-slate-100 py-24 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-16">
          
          <div className="max-w-3xl mx-auto space-y-4 scroll-reveal">
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-800 uppercase leading-tight">
              DESIGNED TO RUN B2B LOGISTICS AT SCALE.
            </h2>
            <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto">
              Every detail engineered for kiranas, supermarkets, and major wholesalers. Minimal configuration, massive results.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            <div className="scroll-reveal card bg-slate-50 p-8 text-left hover:-translate-y-1.5 duration-500 transition-all border-slate-200 flex flex-col justify-between">
              <div>
                <div className="bg-primary-500/10 p-3 rounded-2xl border border-primary-500/10 w-fit mb-6 text-primary-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <h3 className="text-lg font-black text-slate-800 uppercase mb-3">Instant Reordering</h3>
                <p className="text-slate-400 text-sm leading-relaxed font-medium">
                  Queue orders from multiple wholesalers in a single touch. No phone calls, no spreadsheets.
                </p>
              </div>
            </div>

            <div className="scroll-reveal card bg-slate-50 p-8 text-left hover:-translate-y-1.5 duration-500 transition-all border-slate-200 flex flex-col justify-between">
              <div>
                <div className="bg-primary-500/10 p-3 rounded-2xl border border-primary-500/10 w-fit mb-6 text-primary-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                </div>
                <h3 className="text-lg font-black text-slate-800 uppercase mb-3">Locked-In Prices</h3>
                <p className="text-slate-400 text-sm leading-relaxed font-medium">
                  Secure prices automatically during market fluctuations. Wholesaler rate agreements are guaranteed on placement.
                </p>
              </div>
            </div>

            <div className="scroll-reveal card bg-slate-50 p-8 text-left hover:-translate-y-1.5 duration-500 transition-all border-slate-200 flex flex-col justify-between">
              <div>
                <div className="bg-primary-500/10 p-3 rounded-2xl border border-primary-500/10 w-fit mb-6 text-primary-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                </div>
                <h3 className="text-lg font-black text-slate-800 uppercase mb-3">Sales Dashboards</h3>
                <p className="text-slate-400 text-sm leading-relaxed font-medium">
                  Visualize margins, top-selling assets, and inventory turnovers in real time on sleek, interactive area charts.
                </p>
              </div>
            </div>

            <div className="scroll-reveal card bg-slate-50 p-8 text-left hover:-translate-y-1.5 duration-500 transition-all border-slate-200 flex flex-col justify-between">
              <div>
                <div className="bg-primary-500/10 p-3 rounded-2xl border border-primary-500/10 w-fit mb-6 text-primary-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <h3 className="text-lg font-black text-slate-800 uppercase mb-3">Dynamic Credit Lines</h3>
                <p className="text-slate-400 text-sm leading-relaxed font-medium">
                  Unlock lines of credit directly through wholesalers without traditional manual approval bottlenecks.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Counters Section */}
      <section ref={statsSectionRef} className="bg-slate-50 py-24 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            
            <div className="space-y-2">
              <p className="text-5xl sm:text-6xl font-black text-slate-800 uppercase tracking-tighter transition-all duration-700">
                ₹{stats.volume > 0 ? `${stats.volume}.5B+` : '4.5B+'}
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Trade Volume</p>
            </div>

            <div className="space-y-2">
              <p className="text-5xl sm:text-6xl font-black text-slate-800 uppercase tracking-tighter transition-all duration-700">
                {stats.retailers > 0 ? stats.retailers.toLocaleString() : '12,000'}+
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Retailers</p>
            </div>

            <div className="space-y-2">
              <p className="text-5xl sm:text-6xl font-black text-slate-800 uppercase tracking-tighter transition-all duration-700">
                {stats.accuracy > 0 ? stats.accuracy : '99'}%
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prediction Accuracy</p>
            </div>

            <div className="space-y-2">
              <p className="text-5xl sm:text-6xl font-black text-slate-800 uppercase tracking-tighter transition-all duration-700">
                &lt; {stats.dispatch}h
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Wholesaler Dispatch Time</p>
            </div>

          </div>
        </div>
      </section>

      {/* Customer Testimonials Section */}
      <section className="bg-slate-100 py-24 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-16">
          
          <div className="max-w-3xl mx-auto space-y-4 scroll-reveal">
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-800 uppercase leading-none">
              PROVEN BY THE BEST IN THE INDUSTRY.
            </h2>
            <p className="text-lg text-slate-500 font-medium max-w-xl mx-auto">
              Read how store owners and FMCG suppliers are changing their workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <div className="scroll-reveal glass p-8 rounded-3xl border-slate-200 text-left flex flex-col justify-between shadow-lg">
              <p className="text-slate-600 text-base leading-relaxed font-medium italic">
                &ldquo;SmartStock completely changed my supermarket's reordering cycle. The AI warnings let me order exactly what we need, reducing capital tied up in slow products by 30%.&rdquo;
              </p>
              <div className="mt-8 flex items-center gap-3 border-t border-slate-200/20 pt-4">
                <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold uppercase">
                  RS
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase">Ramesh Sharma</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Kirana Owner, Mumbai</p>
                </div>
              </div>
            </div>

            <div className="scroll-reveal glass p-8 rounded-3xl border-slate-200 text-left flex flex-col justify-between shadow-lg">
              <p className="text-slate-600 text-base leading-relaxed font-medium italic">
                &ldquo;As a wholesaler, order accuracy is everything. By integrating with the SmartStock ledger, retailers submit direct inventory requirements that flow straight into our dispatch system.&rdquo;
              </p>
              <div className="mt-8 flex items-center gap-3 border-t border-slate-200/20 pt-4">
                <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold uppercase">
                  AP
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase">Ananya Patel</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">FMCG Wholesaler, Surat</p>
                </div>
              </div>
            </div>

            <div className="scroll-reveal glass p-8 rounded-3xl border-slate-200 text-left flex flex-col justify-between shadow-lg">
              <p className="text-slate-600 text-base leading-relaxed font-medium italic">
                &ldquo;Underwriting credit for small shops used to be a major headache. The credit ledger built into SmartStock lets us offer flexible credit lines with zero manual paperwork.&rdquo;
              </p>
              <div className="mt-8 flex items-center gap-3 border-t border-slate-200/20 pt-4">
                <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold uppercase">
                  VK
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase">Vikram K.</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Distributor Director, Delhi</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-slate-50 py-24 border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-4 scroll-reveal">
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-800 uppercase leading-none">
              QUESTIONS & ANSWERS.
            </h2>
            <p className="text-slate-500 font-medium">Everything you need to know about the platform.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className="scroll-reveal border-b border-slate-200 pb-4"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex justify-between items-center text-left py-4 text-lg font-bold text-slate-800 hover:text-primary-500 transition-colors uppercase tracking-tight"
                >
                  <span>{faq.q}</span>
                  <span className={`text-xl transform transition-transform duration-300 ${
                    openFaq === index ? 'rotate-45 text-primary-500' : 'text-slate-400'
                  }`}>
                    +
                  </span>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${
                  openFaq === index ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0'
                }`}>
                  <p className="text-slate-400 text-sm leading-relaxed font-medium pb-4">
                    {faq.a}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Final Call to Action Section */}
      <section className="relative py-32 bg-[#0c0c0e] text-white overflow-hidden border-t border-white/5">
        
        {/* Glow behind final CTA */}
        <div className="absolute inset-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.1)_0%,transparent_60%)] pointer-events-none blur-2xl"></div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10 scroll-reveal">
          <h2 className="text-5xl sm:text-7xl font-black tracking-tight leading-none uppercase">
            UPGRADE YOUR <br />
            <span className="apple-text-gradient bg-gradient-to-r from-primary-500 to-orange-500">OPERATIONS TODAY.</span>
          </h2>
          <p className="max-w-xl mx-auto text-slate-400 text-base sm:text-lg leading-relaxed font-medium">
            Join thousands of retailers and wholesale distributors leveraging SmartStock AI to maximize profitability.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => navigate(dashboardPath)}
              className="btn-primary px-10 py-5 text-sm font-black uppercase tracking-widest rounded-full shadow-2xl hover:scale-102 transition-all w-full sm:w-auto"
            >
              {user ? 'Enter Dashboard' : 'Create Free Account'}
            </button>
            {!user && (
              <button
                onClick={() => navigate('/login')}
                className="px-10 py-5 text-sm font-black uppercase tracking-widest text-slate-300 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all w-full sm:w-auto"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}
