import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { User, UserRole } from './types';
import { LogOut, ArrowLeft, Settings, Database, RefreshCw } from 'lucide-react';

// Pages
import LoginPage from './components/pages/Login';
import Dashboard from './components/pages/Dashboard';
import UserManagement from './components/pages/UserManagement';
import BatchList from './components/pages/BatchList';
import WeighingStation from './components/pages/WeighingStation';
import Collections from './components/pages/Collections';
import Reports from './components/pages/Reports';
import Configuration from './components/pages/Configuration';

// Context
export const AuthContext = React.createContext<{
  user: User | null;
  setUser: (u: User | null) => void;
  logout: () => void;
}>({ user: null, setUser: () => {}, logout: () => {} });

// Simple Container Layout without Sidebar
const Container: React.FC<{ children: React.ReactNode; title?: string; showBack?: boolean }> = ({ children, title, showBack }) => {
  const { user, logout } = React.useContext(AuthContext);
  const navigate = useNavigate();

  const handleUpdate = () => {
    // Forzamos una recarga limpia para asegurar que los cambios se apliquen
    window.location.reload();
  };

  if (!user) return <Navigate to="/login" />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* App Bar - Navy Blue */}
      <header className="bg-blue-950 text-white shadow-lg p-3 sticky top-0 z-50 border-b border-blue-900">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {showBack && (
              <button onClick={() => navigate(-1)} className="p-1 hover:bg-blue-900 rounded-full transition-colors">
                <ArrowLeft size={24} />
              </button>
            )}
            <h1 className="text-lg font-black tracking-tight uppercase">{title || 'SISTEMA BARSA'}</h1>
          </div>
          <div className="flex items-center space-x-2">
            
            <div className="text-right hidden md:block mr-2 border-r border-blue-800 pr-4">
              <p className="text-[10px] font-black text-blue-400 uppercase leading-none mb-1">Usuario Activo</p>
              <p className="text-xs font-bold text-white leading-none">{user.name}</p>
            </div>

            {/* El botón de actualizar solo aparece para el Administrador */}
            {user.role === UserRole.ADMIN && (
              <button
                onClick={handleUpdate}
                className="bg-blue-800 hover:bg-blue-700 p-2 rounded-lg transition-all shadow-md flex items-center gap-2 group"
                title="Actualizar App"
              >
                <RefreshCw size={18} className="group-active:rotate-180 transition-transform duration-500" />
                <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Actualizar</span>
              </button>
            )}

            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 p-2 rounded-lg transition-colors shadow-md flex items-center gap-2"
              title="Cerrar Sesión"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-4">
        {children}
      </main>
    </div>
  );
};

const App: React.FC = () => {
    // Simple Session Persistence
    const [user, setUserState] = useState<User | null>(() => {
        try {
            const saved = localStorage.getItem('avi_session_user');
            return saved ? JSON.parse(saved) : null;
        } catch { return null; }
    });

    const setUser = (u: User | null) => {
        if (u) localStorage.setItem('avi_session_user', JSON.stringify(u));
        else localStorage.removeItem('avi_session_user');
        setUserState(u);
    };

    const logout = () => setUser(null);

    return (
        <AuthContext.Provider value={{ user, setUser, logout }}>
            <HashRouter>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    
                    <Route path="/" element={<Container><Dashboard /></Container>} />
                    <Route path="/usuarios" element={<Container title="Gestión de Usuarios" showBack><UserManagement /></Container>} />
                    <Route path="/lotes" element={<Container title="Lotes de Producción" showBack><BatchList /></Container>} />
                    <Route path="/weigh/:mode/:batchId?" element={<Container title="Estación de Pesaje" showBack><WeighingStation /></Container>} />
                    <Route path="/cobranza" element={<Container title="Cobranza y Caja" showBack><Collections /></Container>} />
                    <Route path="/reportes" element={<Container title="Reportes y Estadísticas" showBack><Reports /></Container>} />
                    <Route path="/config" element={<Container title="Configuración" showBack><Configuration /></Container>} />
                    
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </HashRouter>
        </AuthContext.Provider>
    );
};

export default App;