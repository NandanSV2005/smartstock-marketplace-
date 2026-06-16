import { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import './App.css';
import { useAuth } from './AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RetailerDashboard } from './pages/RetailerDashboard';
import { WholesalerDashboard } from './pages/WholesalerDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { SimulatedPaymentPage } from './pages/SimulatedPaymentPage';
import { LandingPage } from './pages/LandingPage';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from './api';
import type { AppNotification } from './api';

function ProtectedRoute({ children }: { children: ReactElement }) {
  const { user, initialized } = useAuth();
  const location = useLocation();

  if (!initialized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-500 text-sm font-medium">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

function AppShell({ children }: { children: ReactElement }) {
  const { user, logout, accessToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved as 'light' | 'dark';
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  });

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (user && accessToken) {
      const fetchNotes = () => {
        getNotifications(accessToken)
          .then(setNotifications)
          .catch(console.error);
      };
      fetchNotes();
      const interval = setInterval(fetchNotes, 15000);
      return () => clearInterval(interval);
    }
  }, [user, accessToken]);

  const handleMarkRead = async (id: number) => {
    if (!accessToken) return;
    try {
      await markNotificationRead(accessToken, id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    if (!accessToken) return;
    try {
      await markAllNotificationsRead(accessToken);
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isLandingPage = location.pathname === '/';
  const isLoginPage = location.pathname === '/login';

  const queryParams = new URLSearchParams(location.search);
  const activeTabParam = queryParams.get('tab');
  const path = location.pathname;

  const retailerTabs = [
    { id: 'dashboard', label: 'Dashboard', path: '/retailer/dashboard?tab=dashboard', active: path === '/retailer/dashboard' && (!activeTabParam || activeTabParam === 'dashboard'), icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg> },
    { id: 'marketplace', label: 'Marketplace', path: '/retailer/dashboard?tab=marketplace', active: path === '/retailer/dashboard' && activeTabParam === 'marketplace', icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 00-.75-.75h-1.5a.75.75 0 00-.75.75V21m-9 0h18M12 9v3m0 0v3m0-3h3m-3 0H9m-3 9h12a2 2 0 002-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> },
    { id: 'cart', label: 'Cart', path: '/retailer/dashboard?tab=cart', active: path === '/retailer/dashboard' && activeTabParam === 'cart', icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.7 3.03-7.1H5.4M7.5 14.25L5.15 6M7.5 14.25a3 3 0 003 3m0 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3m9 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3" /></svg> },
    { id: 'inventory', label: 'Inventory', path: '/retailer/dashboard?tab=inventory', active: path === '/retailer/dashboard' && activeTabParam === 'inventory', icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg> },
    { id: 'ledger', label: 'Ledger', path: '/retailer/dashboard?tab=ledger', active: path === '/retailer/dashboard' && activeTabParam === 'ledger', icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg> },
    { id: 'sales', label: 'Sales', path: '/sales/record', active: path.startsWith('/sales'), icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  ];

  const wholesalerTabs = [
    { id: 'terminal', label: 'Orders', path: '/wholesaler/dashboard?tab=terminal', active: path === '/wholesaler/dashboard' && (!activeTabParam || activeTabParam === 'terminal'), icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
    { id: 'ledger', label: 'Payments', path: '/wholesaler/dashboard?tab=ledger', active: path === '/wholesaler/dashboard' && activeTabParam === 'ledger', icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { id: 'credit', label: 'Credit Intel', path: '/wholesaler/dashboard?tab=credit', active: path === '/wholesaler/dashboard' && activeTabParam === 'credit', icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.599-3.751A11.959 11.959 0 0112 2.714z" /></svg> },
  ];

  const currentTabs = user ? (user.role === 'retailer' ? retailerTabs : user.role === 'wholesaler' ? wholesalerTabs : []) : [];
  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <div className="min-h-screen bg-[var(--color-slate-50)] flex flex-col font-sans overflow-x-clip transition-colors duration-[var(--nb-duration-mid)] pb-16 md:pb-0">
      <header className="h-14 fixed top-0 left-0 right-0 z-50 bg-[var(--color-slate-100)] border-b border-[var(--color-slate-200)] flex items-center transition-colors duration-[var(--nb-duration-mid)]">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-full">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="bg-primary-500/10 p-1 rounded-lg border border-primary-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-[var(--color-slate-800)] tracking-tight leading-none">SmartStock</h1>
              {user && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase border ${
                  user.role === 'retailer'
                    ? 'text-indigo-650 bg-indigo-50/80 border-indigo-200/50 dark:text-indigo-400 dark:bg-indigo-950/20 dark:border-indigo-800/50'
                    : 'text-amber-600 bg-amber-50/80 border-amber-200/50 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-800/50'
                }`}>
                  {user.role}
                </span>
              )}
            </div>
          </div>

          {user && currentTabs.length > 0 && (
            <nav className="hidden md:flex items-center h-full space-x-6">
              {currentTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => navigate(tab.path)}
                  className={`h-14 flex items-center gap-1.5 px-1 border-b-2 text-[11px] font-bold uppercase tracking-wider transition-all duration-[var(--nb-duration-fast)] ease-[var(--nb-ease-smooth)] cursor-pointer ${
                    tab.active
                      ? 'border-[var(--color-primary-500)] text-[var(--color-primary-500)]'
                      : 'border-transparent text-[var(--color-slate-400)] hover:text-[var(--color-slate-700)]'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          )}

          <div className="flex items-center space-x-3">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg bg-[var(--color-slate-100)] hover:bg-[var(--color-slate-200)] border border-[var(--color-slate-200)] text-[var(--color-slate-500)] hover:text-[var(--color-slate-800)] transition-all cursor-pointer flex items-center justify-center active:scale-[0.98]"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.46 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            {user ? (
              <>
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-1.5 rounded-lg bg-[var(--color-slate-100)] hover:bg-[var(--color-slate-200)] border border-[var(--color-slate-200)] text-[var(--color-slate-500)] hover:text-[var(--color-slate-800)] transition-all cursor-pointer flex items-center justify-center relative active:scale-[0.98]"
                  >
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-bold leading-none text-white bg-red-500 rounded-full animate-pulse">{unreadCount}</span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 rounded-2xl shadow-xl z-50 border border-[var(--color-slate-200)] overflow-hidden text-left bg-[var(--color-slate-100)] animate-scale-in">
                      <div className="p-4 border-b border-[var(--color-slate-200)] flex justify-between items-center bg-[var(--color-slate-50)]">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-slate-700)]">Notifications</h3>
                        {unreadCount > 0 && (
                          <button onClick={handleMarkAllRead} className="text-xs text-[var(--color-primary-500)] hover:underline font-semibold">Mark All Read</button>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                          <p className="p-6 text-xs text-[var(--color-slate-400)] italic text-center">No notifications yet</p>
                        ) : (
                          notifications.slice(0, 15).map(note => (
                            <div
                              key={note.id}
                              className={`p-4 border-b border-[var(--color-slate-200)] cursor-pointer transition-all hover:bg-[var(--color-slate-50)] ${
                                note.read_at ? 'opacity-60 bg-transparent' : 'bg-primary-50/30'
                              }`}
                              onClick={() => !note.read_at && handleMarkRead(note.id)}
                            >
                              <h4 className="text-xs font-bold text-[var(--color-slate-800)] mb-1 leading-snug">{note.title}</h4>
                              <p className="text-xs text-[var(--color-slate-500)] leading-relaxed">{note.body}</p>
                              <span className="text-[10px] text-[var(--color-slate-400)] mt-1.5 block font-medium">{new Date(note.created_at).toLocaleString()}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-primary-500)]/15 border border-[var(--color-primary-500)]/30 text-[var(--color-primary-500)] flex items-center justify-center font-bold text-xs cursor-default" title={user.email}>
                    {user.first_name ? user.first_name[0].toUpperCase() : user.username[0].toUpperCase()}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="btn-secondary py-1.5 px-3 text-xs font-semibold border-rose-500/20 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 rounded-lg transition-all active:scale-[0.98] shadow-sm cursor-pointer"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="btn-tactile-orange py-1.5 px-3 text-xs font-semibold shadow-tactile-primary cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <main className={`flex-1 w-full mt-14 ${isLandingPage || isLoginPage ? '' : 'max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 px-4'}`}>
        {children}
      </main>

      {user && currentTabs.length > 0 && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[var(--color-slate-100)] border-t border-[var(--color-slate-200)] z-50 flex items-center justify-around px-2 shadow-lg">
          {currentTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all duration-[var(--nb-duration-fast)] ${
                tab.active
                  ? 'text-[var(--color-primary-500)] scale-105'
                  : 'text-[var(--color-slate-400)] hover:text-[var(--color-slate-650)]'
              }`}
            >
              {tab.icon}
              <span className="mt-1">{tab.label}</span>
            </button>
          ))}
        </nav>
      )}

      {!(isLandingPage || isLoginPage) && (
        <footer className="py-8 mt-auto border-t border-[var(--color-slate-200)] text-center bg-[var(--color-slate-100)] text-[var(--color-slate-500)] text-xs">
          <p className="font-semibold">© 2026 SmartStock Solutions • Next-Gen Supply Chain Infrastructure</p>
        </footer>
      )}
    </div>
  );
}

function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/retailer/dashboard"
          element={
            <ProtectedRoute>
              <RetailerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wholesaler/dashboard"
          element={
            <ProtectedRoute>
              <WholesalerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout/payment"
          element={
            <ProtectedRoute>
              <SimulatedPaymentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales/record"
          element={
            <ProtectedRoute>
              <RetailerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales/history"
          element={
            <ProtectedRoute>
              <RetailerDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default App;
