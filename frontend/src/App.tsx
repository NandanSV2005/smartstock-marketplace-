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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved as 'light' | 'dark';
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  });

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

  // Dynamic dashboard path
  const dashboardPath = user
    ? user.role === 'retailer'
      ? '/retailer/dashboard'
      : user.role === 'wholesaler'
        ? '/wholesaler/dashboard'
        : '/admin/dashboard'
    : '/login';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-x-clip transition-colors duration-300">
      <header className="backdrop-blur-xl bg-white/70 dark:bg-black/60 border-b border-black/5 dark:border-white/10 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="bg-primary-500/10 p-1.5 rounded-lg border border-primary-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800 tracking-tight leading-none">SmartStock</h1>
              <span className="text-[11px] text-primary-500 font-semibold tracking-wider uppercase">Solutions AI</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500 hover:text-slate-800 transition-all cursor-pointer flex items-center justify-center active:scale-[0.98] shadow-sm"
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
                <div className="hidden sm:flex items-center bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
                  <span className="text-xs text-slate-650 font-medium">
                    {user.role} &bull; {user.email}
                  </span>
                </div>
                {isLandingPage && (
                  <button
                    onClick={() => navigate(dashboardPath)}
                    className="btn-tactile-orange py-1.5 px-3 text-xs font-semibold shadow-tactile-primary"
                  >
                    Portal
                  </button>
                )}
                <button 
                  type="button"
                  onClick={handleLogout}
                  className="btn-secondary py-1.5 px-3 text-xs font-semibold border-rose-500/20 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 rounded-lg transition-all active:scale-[0.98] shadow-sm"
                >
                  Logout
                </button>
              </>
            ) : (
              <button 
                onClick={() => navigate('/login')}
                className="btn-tactile-orange py-1.5 px-3 text-xs font-semibold shadow-tactile-primary"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <main className={`flex-1 w-full ${isLandingPage || isLoginPage ? '' : 'max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 px-4'}`}>
        {children}
      </main>

      {!(isLandingPage || isLoginPage) && (
        <footer className="py-8 mt-auto border-t border-slate-200 text-center bg-slate-100">
          <p className="text-xs font-normal text-slate-500">© 2026 SmartStock Solutions • Next-Gen Supply Chain Infrastructure</p>
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
