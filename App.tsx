
import React, { createContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { User } from './types';
import Login from './components/pages/Login';
import Dashboard from './components/pages/Dashboard';
import BatchList from './components/pages/BatchList';
import WeighingStation from './components/pages/WeighingStation';
import Collections from './components/pages/Collections';
import Reports from './components/pages/Reports';
import UserManagement from './components/pages/UserManagement';
import Configuration from './components/pages/Configuration';

// Export AuthContext for global session management
export const AuthContext = createContext<{
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}>({
  user: null,
  setUser: () => {},
});

// Component to protect routes requiring authentication
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = React.useContext(AuthContext);
  return user ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  // Restore session from sessionStorage on load
  useEffect(() => {
    const saved = sessionStorage.getItem('avi_auth');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  // Update sessionStorage when user state changes
  useEffect(() => {
    if (user) sessionStorage.setItem('avi_auth', JSON.stringify(user));
    else sessionStorage.removeItem('avi_auth');
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-100 font-sans">
          {user && (
            <nav className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg sticky top-0 z-50">
              <span className="font-black tracking-tighter text-xl">AVICONTROL <span className="text-blue-500">PRO</span></span>
              <button 
                onClick={() => setUser(null)}
                className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition-all"
              >
                Cerrar Sesión
              </button>
            </nav>
          )}
          <main className={user ? "p-6 max-w-7xl mx-auto" : ""}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/lotes" element={<PrivateRoute><BatchList /></PrivateRoute>} />
              <Route path="/weigh/:mode" element={<PrivateRoute><WeighingStation /></PrivateRoute>} />
              <Route path="/weigh/:mode/:batchId" element={<PrivateRoute><WeighingStation /></PrivateRoute>} />
              <Route path="/cobranza" element={<PrivateRoute><Collections /></PrivateRoute>} />
              <Route path="/reportes" element={<PrivateRoute><Reports /></PrivateRoute>} />
              <Route path="/usuarios" element={<PrivateRoute><UserManagement /></PrivateRoute>} />
              <Route path="/config" element={<PrivateRoute><Configuration /></PrivateRoute>} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthContext.Provider>
  );
};

export default App;
