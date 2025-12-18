
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

  const MASTER_CODE = "BARSA2025"; // Código obligatorio para configurar

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
      setError('Acceso denegado. Verifique sus credenciales o sincronice la nube.');
    }
  };

  const handleVerifyMaster = () => {
      if (masterPin === MASTER_CODE) {
          setStep('CONFIG');
      } else {
          alert("CÓDIGO INCORRECTO. Solo personal autorizado.");
          setMasterPin('');
      }
  };

  const handleSaveConfig = async () => {
      if (!config.firebaseConfig.apiKey || !config.firebaseConfig.databaseURL) {
          alert("Complete los datos de Firebase.");
          return;
      }
      setIsSyncing(true);
      try {
          saveConfig({ ...config, cloudEnabled: true });
          // Forzamos la descarga de usuarios inmediatamente
          const success = await forceSyncUsers();
          if (success) {
              setError('¡Sincronización Exitosa! Ya puede ingresar con sus usuarios.');
              setShowConfig(false);
          } else {
              setError('Conectado, pero no se encontraron usuarios en la nube.');
          }
      } catch (e) {
          setError('Error de conexión con Firebase.');
      } finally {
          setIsSyncing(false);
      }
  };

  const isCloudActive = config.cloudEnabled && config.firebaseConfig.apiKey;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden font-youthful">
      {/* Abstract Background Decor */}
      <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600 rounded-full blur-[150px] opacity-10 -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600 rounded-full blur-[150px] opacity-10 translate-y-1/2 -translate-x-1/2"></div>
      </div>

      <div className="bg-white/10 backdrop-blur-2xl p-10 md:p-14 rounded-[3rem] shadow-2xl border border-white/20 w-full max-w-md relative z-10">
        
        {/* Connection Badge */}
        <div className="absolute top-8 right-10">
            {isCloudActive ? (
                <div className="flex items-center gap-2 bg-emerald-500/20 px-3 py-1.5 rounded-full border border-emerald-500/30">
                    <Wifi size={12} className="text-emerald-400" />
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">En Línea</span>
                </div>
            ) : (
                <div className="flex items-center gap-2 bg-slate-500/20 px-3 py-1.5 rounded-full border border-slate-500/30">
                    <Cloud size={12} className="text-slate-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Local</span>
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
            AVÍCOLA BARSA
          </h1>
          <p className="text-blue-300 text-[9px] font-black uppercase tracking-[0.3em] mt-3 opacity-70">Control de Operaciones</p>
        </div>
        
        {error && (
          <div className="w-full mb-8 p-4 bg-slate-800 border border-slate-700 text-blue-100 rounded-2xl text-[10px] text-center font-bold uppercase tracking-widest flex items-center justify-center gap-2 animate-pulse">
            <AlertTriangle size={14} className="text-yellow-400 shrink-0"/>
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
                  className="w-full pl-10 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-900 placeholder-slate-400 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-base"
                  placeholder="ID de Usuario"
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
                  className="w-full pl-10 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-900 placeholder-slate-400 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-base"
                  placeholder="••••••••"
                  required
                />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-blue-900/40 active:scale-95 tracking-widest text-xs uppercase"
          >
            INGRESAR AL SISTEMA
          </button>
        </form>

        <button 
            onClick={() => { setShowConfig(true); setStep('AUTH'); setMasterPin(''); }}
            className="mt-8 w-full flex items-center justify-center gap-2 text-[9px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest border-t border-white/5 pt-6"
        >
            <Settings size={14} /> Ajustes de Sincronización
        </button>
      </div>

      {/* Configuration Modal - Standard Small Size max-w-md */}
      {showConfig && (
          <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-4 z-[100]">
              <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-fade-in border border-slate-200">
                  <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
                      <div className="flex items-center gap-3">
                          <RefreshCw size={20} className={`text-blue-400 ${isSyncing ? 'animate-spin' : ''}`}/>
                          <h3 className="font-black text-xs uppercase tracking-widest">Sincronización de Red</h3>
                      </div>
                      <button onClick={() => setShowConfig(false)} className="p-1.5 hover:bg-slate-800 rounded-xl transition-colors"><X size={20}/></button>
                  </div>
                  
                  <div className="p-6">
                      {step === 'AUTH' ? (
                          <div className="space-y-6 text-center py-4">
                              <div className="bg-blue-50 w-16 h-16 rounded-[1.5rem] flex items-center justify-center mx-auto text-blue-600 shadow-inner">
                                  <KeyRound size={28}/>
                              </div>
                              <div>
                                <h4 className="font-black text-slate-900 uppercase text-base tracking-tight">Acceso Administrativo</h4>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Solo personal de sistemas</p>
                              </div>
                              <input 
                                type="password"
                                value={masterPin}
                                onChange={e => setMasterPin(e.target.value)}
                                className="w-full text-center bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 text-2xl font-black tracking-[0.5em] outline-none focus:border-blue-500 transition-all shadow-sm"
                                placeholder="••••"
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleVerifyMaster()}
                              />
                              <button onClick={handleVerifyMaster} className="w-full bg-blue-950 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-blue-900 transition-all active:scale-95">
                                DESBLOQUEAR
                              </button>
                          </div>
                      ) : (
                          <div className="space-y-5">
                              <div className="bg-blue-50 p-4 rounded-[1.5rem] border-2 border-dashed border-blue-100 flex items-center gap-4">
                                  <Database size={24} className="text-blue-600 shrink-0" />
                                  <div>
                                      <p className="text-[10px] font-black text-blue-900 leading-none uppercase">Configuración de Nube</p>
                                      <p className="text-[9px] font-bold text-blue-600 leading-relaxed mt-1">Ingrese los datos para vincular este dispositivo.</p>
                                  </div>
                              </div>

                              <div className="space-y-4">
                                  <div className="space-y-1">
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Database URL</label>
                                      <input value={config.firebaseConfig.databaseURL} onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, databaseURL: e.target.value}})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-[10px] outline-none focus:border-blue-500 shadow-sm" placeholder="https://..." />
                                  </div>
                                  <div className="space-y-1">
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">API Key</label>
                                      <input value={config.firebaseConfig.apiKey} onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, apiKey: e.target.value}})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-[10px] outline-none focus:border-blue-500 shadow-sm" placeholder="AIza..." />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-1">
                                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Project ID</label>
                                          <input value={config.firebaseConfig.projectId} onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, projectId: e.target.value}})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-[10px] outline-none focus:border-blue-500 shadow-sm" />
                                      </div>
                                      <div className="space-y-1">
                                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">App ID</label>
                                          <input value={config.firebaseConfig.appId} onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, appId: e.target.value}})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-[10px] outline-none focus:border-blue-500 shadow-sm" />
                                      </div>
                                  </div>
                              </div>

                              <div className="pt-4 border-t border-slate-100">
                                  {isSyncing ? (
                                      <div className="py-2 flex flex-col items-center justify-center gap-3">
                                          <Loader2 className="animate-spin text-blue-600" size={32}/>
                                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest animate-pulse">Sincronizando Usuarios...</p>
                                      </div>
                                  ) : (
                                      <button 
                                        onClick={handleSaveConfig}
                                        className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 active:scale-95"
                                      >
                                        <CheckCircle size={18}/> GUARDAR Y SINCRONIZAR
                                      </button>
                                  )}
                              </div>
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
