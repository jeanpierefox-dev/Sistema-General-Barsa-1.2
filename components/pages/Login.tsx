
import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';
import { login, getConfig, saveConfig, forceSyncUsers } from '../../services/storage';
import { Scale, AlertTriangle, User, Lock, Settings, Cloud, X, Database, CheckCircle, Wifi, RefreshCw, KeyRound, Loader2 } from 'lucide-react';
import { AppConfig } from '../../types';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [step, setStep] = useState<'AUTH' | 'CONFIG'>('AUTH');
  const [masterPin, setMasterPin] = useState('');
  const [config, setConfig] = useState<AppConfig>(getConfig());
  const [isSyncing, setIsSyncing] = useState(false);
  
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const MASTER_CODE = "BARSA2025"; 

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
    const foundUser = login(username, password);
    if (foundUser) {
      setUser(foundUser);
      navigate('/');
    } else {
      setError('Credenciales incorrectas.');
    }
  };

  const handleVerifyMaster = () => {
      if (masterPin === MASTER_CODE) {
          setStep('CONFIG');
      } else {
          alert("PIN INCORRECTO.");
          setMasterPin('');
      }
  };

  const handleSaveConfig = async () => {
      if (!config.firebaseConfig.apiKey || !config.firebaseConfig.databaseURL) {
          alert("Datos incompletos.");
          return;
      }
      setIsSyncing(true);
      try {
          saveConfig({ ...config, cloudEnabled: true });
          const success = await forceSyncUsers();
          if (success) {
              setError('Sincronización completa.');
              setShowConfig(false);
          }
      } catch (e) {
          setError('Fallo de red.');
      } finally {
          setIsSyncing(false);
      }
  };

  const isCloudActive = config.cloudEnabled && config.firebaseConfig.apiKey;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden font-youthful">
      {/* Animación de fondo */}
      <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600 rounded-full blur-[150px] opacity-10 -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600 rounded-full blur-[150px] opacity-10 translate-y-1/2 -translate-x-1/2"></div>
      </div>

      <div className="bg-white/10 backdrop-blur-2xl p-10 md:p-14 rounded-[3rem] shadow-2xl border border-white/20 w-full max-w-md relative z-10">
        
        {/* Badge de Estado */}
        <div className="absolute top-8 right-10">
            {isCloudActive ? (
                <div className="flex items-center gap-2 bg-emerald-500/20 px-3 py-1.5 rounded-full border border-emerald-500/30">
                    <Wifi size={12} className="text-emerald-400" />
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Cloud</span>
                </div>
            ) : (
                <div className="flex items-center gap-2 bg-slate-500/20 px-3 py-1.5 rounded-full border border-slate-500/30">
                    <Cloud size={12} className="text-slate-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Offline</span>
                </div>
            )}
        </div>

        <div className="mb-10 flex flex-col items-center">
          <div className="bg-white p-5 rounded-3xl w-24 h-24 shadow-2xl flex items-center justify-center mb-6 ring-8 ring-white/5">
            {config.logoUrl ? (
               <img src={config.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
            ) : (
               <Scale size={48} className="text-blue-950" />
            )}
          </div>
          <h1 className="text-3xl font-black text-white text-center tracking-tighter uppercase leading-none">
            {config.appName || 'AVICONTROL PRO'}
          </h1>
          <p className="text-blue-300 text-[9px] font-black uppercase tracking-[0.3em] mt-3 opacity-70">
            {config.companyName || 'Control de Operaciones'}
          </p>
        </div>
        
        {error && (
          <div className="w-full mb-8 p-4 bg-slate-800 border border-slate-700 text-blue-100 rounded-2xl text-[10px] text-center font-bold uppercase tracking-widest animate-pulse">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuario</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-900 placeholder-slate-400 focus:border-blue-500 outline-none transition-all font-bold text-base"
                  placeholder="ID Usuario"
                  required
                />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-900 placeholder-slate-400 focus:border-blue-500 outline-none transition-all font-bold text-base"
                  placeholder="••••••••"
                  required
                />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl active:scale-95 tracking-widest text-xs uppercase"
          >
            INGRESAR
          </button>
        </form>

        <button 
            onClick={() => { setShowConfig(true); setStep('AUTH'); setMasterPin(''); }}
            className="mt-8 w-full flex items-center justify-center gap-2 text-[9px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest border-t border-white/5 pt-6"
        >
            <Settings size={14} /> Ajustes de Conexión
        </button>
      </div>

      {/* Modal de Configuración */}
      {showConfig && (
          <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-4 z-[100]">
              <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border border-slate-200">
                  <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
                      <div className="flex items-center gap-3">
                          <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''}/>
                          <h3 className="font-black text-xs uppercase tracking-widest">Sincronización</h3>
                      </div>
                      <button onClick={() => setShowConfig(false)} className="p-1.5 hover:bg-slate-800 rounded-xl transition-colors"><X size={20}/></button>
                  </div>
                  
                  <div className="p-6">
                      {step === 'AUTH' ? (
                          <div className="space-y-6 text-center py-4">
                              <div className="bg-blue-50 w-16 h-16 rounded-[1.5rem] flex items-center justify-center mx-auto text-blue-600 shadow-inner">
                                  <KeyRound size={28}/>
                              </div>
                              <input 
                                type="password"
                                value={masterPin}
                                onChange={e => setMasterPin(e.target.value)}
                                className="w-full text-center bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 text-2xl font-black tracking-[0.5em] outline-none focus:border-blue-500 shadow-sm"
                                placeholder="••••"
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleVerifyMaster()}
                              />
                              <button onClick={handleVerifyMaster} className="w-full bg-blue-950 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95">
                                DESBLOQUEAR
                              </button>
                          </div>
                      ) : (
                          <div className="space-y-5">
                              <div className="space-y-4">
                                  <div className="space-y-1">
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Database URL</label>
                                      <input value={config.firebaseConfig.databaseURL} onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, databaseURL: e.target.value}})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-[10px] outline-none" placeholder="https://..." />
                                  </div>
                                  <div className="space-y-1">
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">API Key</label>
                                      <input value={config.firebaseConfig.apiKey} onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, apiKey: e.target.value}})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-[10px] outline-none" placeholder="AIza..." />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-1">
                                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Project ID</label>
                                          <input value={config.firebaseConfig.projectId} onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, projectId: e.target.value}})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-[10px] outline-none" />
                                      </div>
                                      <div className="space-y-1">
                                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">App ID</label>
                                          <input value={config.firebaseConfig.appId} onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, appId: e.target.value}})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-[10px] outline-none" />
                                      </div>
                                  </div>
                              </div>
                              <button 
                                onClick={handleSaveConfig}
                                className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95"
                              >
                                {isSyncing ? 'CONECTANDO...' : 'GUARDAR Y SINCRONIZAR'}
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Login;
