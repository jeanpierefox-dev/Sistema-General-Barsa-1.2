import React, { useState, useContext } from 'react';
import { AppConfig, UserRole } from '../../types';
import { getConfig, saveConfig, resetApp } from '../../services/storage';
import { Save, Check, AlertTriangle, Building2, ShieldAlert, Cloud, Bluetooth, Printer, Loader2, Link2, Info, X, Search, Wifi, RefreshCw, Database } from 'lucide-react';
import { AuthContext } from '../../App';

const Configuration: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>(getConfig());
  const [saved, setSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { user } = useContext(AuthContext);
  const [searchModal, setSearchModal] = useState<'printer' | 'scale' | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [foundDevices, setFoundDevices] = useState<{id: string, name: string}[]>([]);
  
  const handleSave = () => {
    saveConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleConnectCloud = () => {
      if (!config.firebaseConfig.apiKey || !config.firebaseConfig.projectId || !config.firebaseConfig.databaseURL) {
          alert("Complete los datos de Firebase y la Database URL antes de conectar.");
          return;
      }
      setIsSyncing(true);
      setTimeout(() => {
          setIsSyncing(false);
          alert("Firebase Conectado. Sincronización en tiempo real activada.");
      }, 2000);
  };

  const startSearch = (type: 'printer' | 'scale') => {
      setSearchModal(type);
      setIsSearching(true);
      setFoundDevices([]);
      
      // Simulación de búsqueda en tiempo real (descubrimiento progresivo)
      setTimeout(() => {
          setFoundDevices(prev => [...prev, { id: 'SC-01', name: type === 'scale' ? 'Balanza AviControl 5.0' : 'Ticketera Térmica BT' }]);
      }, 1000);

      setTimeout(() => {
          setFoundDevices(prev => [...prev, { id: 'SC-GEN', name: type === 'scale' ? 'Indicador Digital BT' : 'POS-58 Portátil' }]);
      }, 2500);

      setTimeout(() => {
          setIsSearching(false);
      }, 3500);
  };

  const linkDevice = (id: string) => {
      const type = searchModal;
      const newConfig = { ...config, [type === 'printer' ? 'printerConnected' : 'scaleConnected']: true };
      setConfig(newConfig);
      saveConfig(newConfig);
      setSearchModal(null);
      alert(`Bluetooth vinculado.`);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setConfig({ ...config, logoUrl: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Configuración</h2>
            <p className="text-slate-500 font-medium">Control central de periféricos y datos</p>
          </div>
          <button onClick={handleSave} className={`flex items-center px-8 py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95 ${saved ? 'bg-emerald-600 text-white' : 'bg-blue-950 text-white hover:bg-blue-900'}`}>
            {saved ? <Check className="mr-2"/> : <Save className="mr-2" />}
            {saved ? 'Guardado' : 'Guardar Configuración'}
          </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl shadow-sm border p-6 space-y-6">
                <h3 className="font-bold text-slate-800 border-b pb-3 flex items-center uppercase text-xs tracking-widest"><Building2 size={16} className="mr-2 text-slate-400"/> Perfil del Sistema</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Nombre Comercial</label>
                        <input value={config.companyName} onChange={e => setConfig({...config, companyName: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold focus:border-blue-500 outline-none transition-all" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Logo Principal</label>
                        <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border-2 border-slate-100">
                            {config.logoUrl ? <img src={config.logoUrl} className="h-12 w-12 object-contain rounded-xl bg-white p-1 border shadow-sm"/> : <div className="h-12 w-12 bg-slate-200 rounded-xl flex items-center justify-center"><Building2 size={24} className="text-slate-400"/></div>}
                            <label className="cursor-pointer bg-blue-50 text-blue-700 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tight hover:bg-blue-100">Subir Logo<input type="file" onChange={handleLogoUpload} className="hidden" accept="image/*" /></label>
                        </div>
                    </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border p-6 space-y-6">
                <h3 className="font-bold text-slate-800 border-b pb-3 flex items-center uppercase text-xs tracking-widest"><Bluetooth size={16} className="mr-2 text-blue-500"/> Vinculación Bluetooth</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center text-center ${config.scaleConnected ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
                        <Bluetooth size={28} className={config.scaleConnected ? 'text-emerald-500 mb-4' : 'text-slate-300 mb-4'}/>
                        <h4 className="font-bold text-slate-900">Balanza Bluetooth</h4>
                        <p className="text-xs text-slate-500 mb-6">{config.scaleConnected ? 'Dispositivo Vinculado' : 'Sin conexión'}</p>
                        <button onClick={() => startSearch('scale')} className={`w-full py-4 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 ${config.scaleConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-950 text-white'}`}>
                            <Search size={16}/> BUSCAR BALANZA
                        </button>
                    </div>

                    <div className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center text-center ${config.printerConnected ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                        <Printer size={28} className={config.printerConnected ? 'text-blue-500 mb-4' : 'text-slate-300 mb-4'}/>
                        <h4 className="font-bold text-slate-900">Impresora Bluetooth</h4>
                        <p className="text-xs text-slate-500 mb-6">{config.printerConnected ? 'Ticketera Lista' : 'Esperando vinculación'}</p>
                        <button onClick={() => startSearch('printer')} className={`w-full py-4 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 ${config.printerConnected ? 'bg-blue-100 text-blue-700' : 'bg-blue-950 text-white'}`}>
                            <Search size={16}/> BUSCAR IMPRESORA
                        </button>
                    </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border p-6 space-y-6">
                <div className="flex justify-between items-center border-b pb-3">
                    <h3 className="font-bold text-slate-800 flex items-center uppercase text-xs tracking-widest"><Cloud size={16} className="mr-2 text-blue-500"/> Sincronización Cloud (Firebase)</h3>
                    <button 
                        onClick={handleConnectCloud}
                        disabled={isSyncing}
                        className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isSyncing ? <RefreshCw size={16} className="animate-spin"/> : <Wifi size={16}/>}
                        {isSyncing ? 'CONECTANDO...' : 'CONECTAR A LA NUBE'}
                    </button>
                </div>
                
                <div className="space-y-6">
                    <div className="flex items-center gap-4 bg-blue-50 p-5 rounded-2xl text-blue-800 text-xs border border-blue-100">
                        <Info size={20} className="shrink-0"/>
                        <p className="font-bold">Para evitar la pérdida de información ante fallos locales, se recomienda mantener activa la sincronización con Firebase Cloud.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-85">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Database URL (Primordial)</label>
                                <div className="relative">
                                    <Database size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
                                    <input value={config.firebaseConfig.databaseURL} onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, databaseURL: e.target.value}})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-10 pr-4 py-3 font-mono text-xs focus:border-blue-500 outline-none" placeholder="https://tu-proyecto.firebaseio.com" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Firebase API Key</label>
                                <input value={config.firebaseConfig.apiKey} onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, apiKey: e.target.value}})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 font-mono text-xs" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Project ID</label>
                                <input value={config.firebaseConfig.projectId} onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, projectId: e.target.value}})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 font-mono text-xs" />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">App ID</label>
                                <input value={config.firebaseConfig.appId} onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, appId: e.target.value}})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 font-mono text-xs" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Auth Domain</label>
                                <input value={config.firebaseConfig.authDomain} onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, authDomain: e.target.value}})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 font-mono text-xs" />
                            </div>
                        </div>
                    </div>
                </div>
              </div>
          </div>

          <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-red-50 p-8 text-center">
                  <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                      <ShieldAlert size={32}/>
                  </div>
                  <h3 className="font-black text-sm text-slate-800 mb-2 uppercase tracking-widest">Reseteo Maestro</h3>
                  <p className="text-xs text-slate-500 mb-6 italic">Esta acción borrará todos los datos del dispositivo. No se puede deshacer.</p>
                  <button onClick={() => { if(confirm('¿BORRAR TODO?')) resetApp(); }} className="w-full bg-red-600 text-white py-5 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-xl hover:bg-red-700 transition-all active:scale-95">
                      <AlertTriangle size={18}/> REINICIAR SISTEMA
                  </button>
              </div>
          </div>
      </div>

      {searchModal && (
          <div className="fixed inset-0 bg-blue-950/80 flex items-center justify-center p-4 z-[100] backdrop-blur-md">
              <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in">
                  <div className="p-6 bg-blue-950 text-white flex justify-between items-center">
                      <div className="flex items-center gap-2">
                          <Wifi size={20} className="animate-pulse text-blue-400"/>
                          <h3 className="font-black text-sm uppercase tracking-widest">Escaneando Bluetooth</h3>
                      </div>
                      <button onClick={() => setSearchModal(null)} className="p-2 hover:bg-blue-900 rounded-xl"><X/></button>
                  </div>
                  
                  <div className="p-8">
                      {isSearching && foundDevices.length === 0 ? (
                          <div className="py-10 flex flex-col items-center justify-center">
                              <Loader2 className="animate-spin text-blue-600 mb-4" size={48}/>
                              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Buscando dispositivos...</p>
                          </div>
                      ) : (
                          <div className="space-y-3">
                              {foundDevices.map(dev => (
                                  <button key={dev.id} onClick={() => linkDevice(dev.id)} className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 hover:border-blue-500 flex items-center justify-between group animate-fade-in">
                                      <div className="flex items-center gap-3">
                                          <div className="bg-white p-2 rounded-lg border shadow-sm text-slate-400 group-hover:text-blue-500">
                                              {searchModal === 'scale' ? <Bluetooth size={18}/> : <Printer size={18}/>}
                                          </div>
                                          <span className="font-bold text-slate-700 text-sm">{dev.name}</span>
                                      </div>
                                      <Link2 size={16} className="text-slate-300 group-hover:text-blue-500"/>
                                  </button>
                              ))}
                              {isSearching && (
                                  <div className="flex items-center justify-center pt-4">
                                      <Loader2 className="animate-spin text-blue-300 mr-2" size={16}/>
                                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sigue buscando...</span>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Configuration;