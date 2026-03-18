import type { ReactElement } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import './App.css';
import { useAuth } from './AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RetailerDashboard } from './pages/RetailerDashboard';
import { WholesalerDashboard } from './pages/WholesalerDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { SimulatedPaymentPage } from './pages/SimulatedPaymentPage';

function ProtectedRoute({ children }: { children: ReactElement }) {
  const { user, initialized } = useAuth();
  const location = useLocation();

  if (!initialized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-500 text-sm font-black uppercase tracking-widest opacity-50">Auth Sync...</p>
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

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-x-hidden">
      <header className="bg-slate-200 border-b border-white/5 sticky top-0 z-50 backdrop-blur-xl shadow-2xl shadow-black/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="bg-white p-1.5 rounded-lg shadow-inner">
              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight leading-none">SmartStock</h1>
              <span className="text-[10px] text-blue-200 uppercase tracking-widest font-semibold">Marketplace AI</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="hidden sm:flex items-center bg-primary-800/50 rounded-full px-3 py-1 border border-primary-700">
                  <span className="w-2 h-2 bg-secondary-400 rounded-full mr-2"></span>
                  <span className="text-xs text-blue-50 font-medium">
                    {user.role} &bull; {user.email}
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-error-600 rounded-lg hover:bg-error-700 transition-colors shadow-sm cursor-pointer"
                >
                  Logout
                </button>
              </>
            ) : (
              <button 
                onClick={() => navigate('/login')}
                className="btn-primary py-1.5 px-4"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</main>
      <footer className="py-12 mt-auto border-t border-white/5 text-center">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest opacity-40">© 2026 SmartStock Marketplace • Professional Trade Infrastructure</p>
      </footer>
    </div>
  );
}

function App() {
  const { user } = useAuth();

  const defaultDashboard =
    user?.role === 'retailer'
      ? <RetailerDashboard />
      : user?.role === 'wholesaler'
        ? <WholesalerDashboard />
        : user?.role === 'admin'
          ? <AdminDashboard />
          : null;

  return (
    <AppShell>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              {defaultDashboard ?? <Navigate to="/login" replace />}
            </ProtectedRoute>
          }
        />
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
