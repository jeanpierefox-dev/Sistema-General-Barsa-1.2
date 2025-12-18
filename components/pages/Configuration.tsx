
import React, { useState, useContext, useEffect } from 'react';
import { AppConfig, UserRole } from '../../types';
import { getConfig, saveConfig, resetApp } from '../../services/storage';
import { Save, Check, AlertTriangle, Building2, ShieldAlert, Cloud, CloudOff, Bluetooth, Printer, Loader2, Link2, Info, X, Search, Wifi, RefreshCw, Database, Copy, Smartphone } from 'lucide-react';
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
          alert("Debe completar los campos de Firebase para activar la sincronización entre dispositivos.");
          return;
      }
      setIsSyncing(true);
      setTimeout(() => {
          setIsSyncing(false);
          const newConfig = { ...config, cloudEnabled: true };
          setConfig(newConfig);
          saveConfig(newConfig);
      }, 1500);
  };

  const handleDisconnectCloud = () => {
      const newConfig = { ...config, cloudEnabled: false };
      setConfig(newConfig);
      saveConfig(newConfig);
  };

  const startSearch = (type: 'printer' | 'scale') => {
      setSearchModal(type);
      setIsSearching(true);
      setFoundDevices([]);
      setTimeout(() => setFoundDevices([{ id: 'SC-01', name: type === 'scale' ? 'Balanza AviControl 5.0' : 'Ticketera BT' }]), 1500);
      setTimeout(() => setIsSearching(false), 3000);
  };

  const linkDevice = (id: string) => {
      const type = searchModal;
      const newConfig = { ...config, [type === 'printer' ? 'printerConnected' : 'scaleConnected']: true };
      setConfig(newConfig);
      saveConfig(newConfig);
      setSearchModal(null);
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
            <p className="text-slate-500 font-medium">Gestión de dispositivos y sincronización de red</p>
          </div>
          <button onClick={handleSave} className={`flex items-center px-8 py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95 ${saved ? 'bg-emerald-600 text-white' : 'bg-blue-950 text-white hover:bg-blue-900'}`}>
            {saved ? <Check className="mr-2"/> : <Save className="mr-2" />}
            {saved ? 'Cambios Guardados' : 'Guardar Todo'}
          </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
              {/* Sección de Nube y Multi-dispositivo */}
              <div className="bg-white rounded-3xl shadow-sm border p-6 space-y-6 overflow-hidden relative">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${config.cloudEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                            <Cloud size={20}/>
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 uppercase text-[11px] tracking-widest">Sincronización Multi-Dispositivo</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{config.cloudEnabled ? 'Conexión Activa' : 'Modo Solo Local'}</p>
                        </div>
                    </div>
                    {config.cloudEnabled ? (
                        <button onClick={handleDisconnectCloud} className="bg-red-50 text-red-600 px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all">Desactivar Nube</button>
                    ) : (
                        <button onClick={handleConnectCloud} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all">Activar Nube</button>
                    )}
                </div>

                <div className="bg-blue-50/50 p-6 rounded-2xl border-2 border-dashed border-blue-100">
                    <div className="flex items-start gap-4">
                        <Smartphone className="text-blue-500 shrink-0" size={24}/>
                        <div>
                            <h4 className="font-black text-blue-900 text-xs uppercase mb-1">¿Cómo conectar otro celular o tablet?</h4>
                            <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                                Para compartir los mismos datos en tiempo real, instala esta aplicación en el otro dispositivo y **copia exactamente** los campos de abajo. Una vez configurados con el mismo proyecto de Firebase, ambos dispositivos se sincronizarán al instante.
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 tracking-widest">API Key de Firebase</label>
                            <input value={config.firebaseConfig.apiKey} onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, apiKey: e.target.value}})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-[10px] focus:border-blue-500 outline-none" placeholder="AIzaSy..." />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 tracking-widest">Project ID</label>
                            <input value={config.firebaseConfig.projectId} onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, projectId: e.target.value}})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-[10px] focus:border-blue-500 outline-none" placeholder="avícola-barsa-42" />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 tracking-widest">Database URL</label>
                            <input value={config.firebaseConfig.databaseURL} onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, databaseURL: e.target.value}})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-[10px] focus:border-blue-500 outline-none" placeholder="https://tu-proyecto.firebaseio.com" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 tracking-widest">App ID</label>
                            <input value={config.firebaseConfig.appId} onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, appId: e.target.value}})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-[10px] focus:border-blue-500 outline-none" placeholder="1:4242..." />
                        </div>
                    </div>
                </div>
              </div>

              {/* Perfil de Empresa */}
              <div className="bg-white rounded-3xl shadow-sm border p-6 space-y-6">
                <h3 className="font-bold text-slate-800 border-b pb-3 flex items-center uppercase text-xs tracking-widest"><Building2 size={16} className="mr-2 text-slate-400"/> Información de Empresa</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Razón Social</label>
                        <input value={config.companyName} onChange={e => setConfig({...config, companyName: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold focus:border-blue-500 outline-none text-sm" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Logo Institucional</label>
                        <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border-2 border-slate-100">
                            {config.logoUrl ? <img src={config.logoUrl} className="h-12 w-12 object-contain rounded-xl bg-white p-1 border shadow-sm"/> : <div className="h-12 w-12 bg-slate-200 rounded-xl flex items-center justify-center"><Building2 size={24} className="text-slate-400"/></div>}
                            <label className="cursor-pointer bg-blue-50 text-blue-700 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tight hover:bg-blue-100">Cargar Imagen<input type="file" onChange={handleLogoUpload} className="hidden" accept="image/*" /></label>
                        </div>
                    </div>
                </div>
              </div>

              {/* Periféricos */}
              <div className="bg-white rounded-3xl shadow-sm border p-6 space-y-6">
                <h3 className="font-bold text-slate-800 border-b pb-3 flex items-center uppercase text-xs tracking-widest"><Bluetooth size={16} className="mr-2 text-blue-500"/> Conexión Bluetooth</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center text-center ${config.scaleConnected ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
                        <Bluetooth size={28} className={config.scaleConnected ? 'text-emerald-500 mb-4' : 'text-slate-300 mb-4'}/>
                        <h4 className="font-bold text-slate-900 text-xs">Balanza Electrónica</h4>
                        <p className="text-[10px] text-slate-400 mb-6 uppercase font-black">{config.scaleConnected ? 'Vínculo Establecido' : 'Desconectado'}</p>
                        <button onClick={() => startSearch('scale')} className={`w-full py-4 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 ${config.scaleConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-950 text-white shadow-lg'}`}>
                            <Search size={16}/> BUSCAR BALANZA
                        </button>
                    </div>

                    <div className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center text-center ${config.printerConnected ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                        <Printer size={28} className={config.printerConnected ? 'text-blue-500 mb-4' : 'text-slate-300 mb-4'}/>
                        <h4 className="font-bold text-slate-900 text-xs">Impresora Térmica</h4>
                        <p className="text-[10px] text-slate-400 mb-6 uppercase font-black">{config.printerConnected ? 'Impresora Lista' : 'Esperando...'}</p>
                        <button onClick={() => startSearch('printer')} className={`w-full py-4 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 ${config.printerConnected ? 'bg-blue-100 text-blue-700' : 'bg-blue-950 text-white shadow-lg'}`}>
                            <Search size={16}/> BUSCAR TICKETERA
                        </button>
                    </div>
                </div>
              </div>
          </div>

          <div className="space-y-6">
              <div className="bg-white rounded-3xl border-2 border-red-50 p-8 text-center shadow-sm">
                  <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                      <ShieldAlert size={32}/>
                  </div>
                  <h3 className="font-black text-sm text-slate-800 mb-2 uppercase tracking-widest">Mantenimiento</h3>
                  <p className="text-[10px] text-slate-500 mb-6 italic leading-relaxed">Si tiene problemas graves con los datos, el reseteo borrará todo el almacenamiento local.</p>
                  <button onClick={() => { if(confirm('¿BORRAR TODOS LOS DATOS LOCALES?')) resetApp(); }} className="w-full bg-red-600 text-white py-5 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-xl hover:bg-red-700 transition-all active:scale-95">
                      <AlertTriangle size={18}/> FORMATEAR APP
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
                          <h3 className="font-black text-sm uppercase tracking-widest">Sincronización BT</h3>
                      </div>
                      <button onClick={() => setSearchModal(null)} className="p-2 hover:bg-blue-900 rounded-xl"><X/></button>
                  </div>
                  
                  <div className="p-8">
                      {isSearching && foundDevices.length === 0 ? (
                          <div className="py-10 flex flex-col items-center justify-center">
                              <Loader2 className="animate-spin text-blue-600 mb-4" size={48}/>
                              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Buscando...</p>
                          </div>
                      ) : (
                          <div className="space-y-3">
                              {foundDevices.map(dev => (
                                  <button key={dev.id} onClick={() => linkDevice(dev.id)} className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 hover:border-blue-500 flex items-center justify-between group transition-all">
                                      <div className="flex items-center gap-4">
                                          <div className="bg-white p-3 rounded-xl border shadow-sm text-slate-400 group-hover:text-blue-500 transition-colors">
                                              {searchModal === 'scale' ? <Bluetooth size={20}/> : <Printer size={20}/>}
                                          </div>
                                          <span className="font-black text-slate-700 text-xs uppercase tracking-tight">{dev.name}</span>
                                      </div>
                                      <Link2 size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors"/>
                                  </button>
                              ))}
                              {isSearching && (
                                  <div className="flex items-center justify-center pt-6">
                                      <Loader2 className="animate-spin text-blue-300 mr-2" size={16}/>
                                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Detectando más señales...</span>
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
