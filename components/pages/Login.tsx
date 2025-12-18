
import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';
import { login, getConfig, saveConfig } from '../../services/storage';
import { Scale, AlertTriangle, User, Lock, Settings, Cloud, X, Database, CheckCircle, Wifi, RefreshCw } from 'lucide-react';
import { AppConfig } from '../../types';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<AppConfig>(getConfig());
  
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const handleSync = () => setConfig(getConfig());
    window.addEventListener('avi_data_users', handleSync);
    window.addEventListener('avi_data_config', handleSync);
    return () => {
        window.removeEventListener('avi_data_users', handleSync);
        window.removeEventListener('avi_data_config', handleSync);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = login(username, password);
    if (user) {
      setUser(user);
      navigate('/');
    } else {
      setError('Credenciales inválidas o datos no sincronizados.');
    }
  };

  const handleSaveConfig = () => {
      saveConfig({ ...config, cloudEnabled: !!config.firebaseConfig.apiKey });
      setShowConfig(false);
      setError('Configuración de nube aplicada. Intente ingresar ahora.');
  };

  const isCloudActive = config.cloudEnabled && config.firebaseConfig.apiKey;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden">
      {/* Abstract Corporate Background */}
      <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-900 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-900 rounded-full blur-[100px] opacity-20 translate-y-1/2 -translate-x-1/2"></div>
      </div>

      <div className="bg-white/10 backdrop-blur-xl p-8 md:p-12 rounded-3xl shadow-2xl border border-white/20 w-full max-w-md relative z-10 flex flex-col items-center">
        
        {/* Status Indicator */}
        <div className="absolute top-6 right-8 flex items-center gap-2">
            {isCloudActive ? (
                <div className="flex items-center gap-1.5 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30">
                    <Wifi size={10} className="text-emerald-400" />
                    <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Sincronizado</span>
                </div>
            ) : (
                <div className="flex items-center gap-1.5 bg-slate-500/20 px-3 py-1 rounded-full border border-slate-500/30">
                    <Cloud size={10} className="text-slate-400" />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Local</span>
                </div>
            )}
        </div>

        <div className="mb-8 flex flex-col items-center">
          <div className="bg-white p-4 rounded-2xl w-24 h-24 shadow-xl flex items-center justify-center mb-6 ring-4 ring-white/10">
            {config.logoUrl ? (
               <img src={config.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
            ) : (
               <Scale size={48} className="text-blue-900" />
            )}
          </div>
          <h1 className="text-3xl font-youthful font-black text-white text-center tracking-tight leading-tight uppercase">
            Sistema Barsa
          </h1>
          <div className="h-1.5 w-16 bg-blue-500 mt-4 mb-2 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
          <p className="text-blue-200 text-sm font-youthful font-medium tracking-wide">Control Avícola Integral</p>
        </div>
        
        {error && (
          <div className="w-full mb-6 p-4 bg-red-500/20 border border-red-500/50 text-red-100 rounded-xl text-sm text-center font-bold font-youthful shadow-inner backdrop-blur-sm">
            <AlertTriangle className="inline mr-2 mb-0.5" size={16}/>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 w-full">
          <div className="relative group">
            <label className="block text-xs font-youthful font-bold text-slate-300 mb-1.5 uppercase tracking-wide ml-1">Identificación</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all font-bold text-lg shadow-sm"
                  placeholder="Usuario"
                  required
                />
            </div>
          </div>
          
          <div className="relative group">
            <label className="block text-xs font-youthful font-bold text-slate-300 mb-1.5 uppercase tracking-wide ml-1">Clave de Acceso</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all font-bold text-lg shadow-sm"
                  placeholder="••••••••"
                  required
                />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-youthful font-black py-4 rounded-xl transition-all shadow-lg shadow-blue-900/50 mt-4 active:scale-95 tracking-wide text-base border-t border-white/20"
          >
            INGRESAR AL SISTEMA
          </button>
        </form>

        {/* Cloud Setup for New Devices */}
        <button 
            onClick={() => setShowConfig(true)}
            className="mt-6 flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-white transition-colors uppercase tracking-widest"
        >
            <Settings size={14} /> Configurar Nube
        </button>
        
        <div className="mt-8 text-center text-[10px] text-slate-400/60 font-youthful">
            Barsa Tech Solutions &copy; {new Date().getFullYear()}
        </div>
      </div>

      {/* Sync Configuration Modal */}
      {showConfig && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
              <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in">
                  <div className="p-6 bg-blue-950 text-white flex justify-between items-center">
                      <div className="flex items-center gap-2">
                          <RefreshCw size={18} className="animate-spin text-blue-400"/>
                          <h3 className="font-black text-xs uppercase tracking-widest">Sincronización Inicial</h3>
                      </div>
                      <button onClick={() => setShowConfig(false)} className="p-2 hover:bg-blue-900 rounded-xl transition-colors"><X/></button>
                  </div>
                  <div className="p-8 space-y-5">
                      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
                          <Database size={20} className="text-blue-600 shrink-0 mt-1" />
                          <p className="text-[10px] font-bold text-blue-800 leading-relaxed uppercase">Pegue sus datos de Firebase para descargar usuarios y lotes de la red.</p>
                      </div>
                      <div className="space-y-4">
                          <div>
                              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 ml-1">Database URL</label>
                              <input 
                                value={config.firebaseConfig.databaseURL} 
                                onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, databaseURL: e.target.value}})} 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 font-mono text-[9px] focus:border-blue-500 outline-none" 
                                placeholder="https://..."
                              />
                          </div>
                          <div>
                              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 ml-1">API Key</label>
                              <input 
                                value={config.firebaseConfig.apiKey} 
                                onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, apiKey: e.target.value}})} 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 font-mono text-[9px] focus:border-blue-500 outline-none" 
                              />
                          </div>
                          <div>
                              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 ml-1">Project ID</label>
                              <input 
                                value={config.firebaseConfig.projectId} 
                                onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, projectId: e.target.value}})} 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 font-mono text-[9px] focus:border-blue-500 outline-none" 
                              />
                          </div>
                          <div>
                              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 ml-1">App ID</label>
                              <input 
                                value={config.firebaseConfig.appId} 
                                onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, appId: e.target.value}})} 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 font-mono text-[9px] focus:border-blue-500 outline-none" 
                              />
                          </div>
                      </div>
                      <button 
                        onClick={handleSaveConfig}
                        className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-emerald-500 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={16}/> Aplicar y Sincronizar
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Login;
