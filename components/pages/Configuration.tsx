
import React, { useState, useContext, useEffect } from 'react';
import { AppConfig, UserRole } from '../../types';
import { getConfig, saveConfig, resetApp, uploadLocalDataToCloud, formatCloudData, testCloudConnection } from '../../services/storage';
import { bluetooth } from '../../services/bluetooth';
import { Save, Check, AlertTriangle, Building2, ShieldAlert, Cloud, Bluetooth, Printer, Loader2, Link2, X, Search, Wifi, Database, Smartphone, UploadCloud, Trash2, Activity, Layout, ImageIcon } from 'lucide-react';
import { AuthContext } from '../../App';

const Configuration: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>(getConfig());
  const [saved, setSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFormattingCloud, setIsFormattingCloud] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const { user } = useContext(AuthContext);
  
  const [isConnecting, setIsConnecting] = useState<'scale' | 'printer' | null>(null);
  
  const handleSave = () => {
    saveConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestConnection = async () => {
      setIsTesting(true);
      // Probamos con lo que el usuario ha escrito actualmente en los inputs
      const result = await testCloudConnection(config);
      alert(result.message);
      setIsTesting(false);
  };

  const handleConnectCloud = () => {
      if (!config.firebaseConfig.apiKey || !config.firebaseConfig.projectId || !config.firebaseConfig.databaseURL) {
          alert("Debe completar los campos de Firebase antes de activar la nube.");
          return;
      }
      setIsSyncing(true);
      setTimeout(() => {
          setIsSyncing(false);
          const newConfig = { ...config, cloudEnabled: true };
          setConfig(newConfig);
          saveConfig(newConfig);
      }, 500);
  };

  const handleDisconnectCloud = () => {
      const newConfig = { ...config, cloudEnabled: false };
      setConfig(newConfig);
      saveConfig(newConfig);
  };

  const handleManualUpload = async () => {
      if (!confirm("¿Subir todos los datos locales a la Nube?")) return;
      setIsUploading(true);
      try {
          await uploadLocalDataToCloud();
          alert("¡BASE DE DATOS SUBIDA!");
      } catch (e) {
          alert("Error: " + (e as Error).message);
      } finally {
          setIsUploading(false);
      }
  };

  const handleFormatCloud = async () => {
      if (!confirm("⚠️ ¿BORRAR TODA LA NUBE? Esta acción no se puede deshacer.")) return;
      setIsFormattingCloud(true);
      try {
          await formatCloudData();
          alert("¡NUBE FORMATEADA!");
      } catch (e) {
          alert("Error: " + (e as Error).message);
      } finally {
          setIsFormattingCloud(false);
      }
  };

  const handleBluetoothConnect = async (type: 'scale' | 'printer') => {
      setIsConnecting(type);
      try {
          const deviceName = type === 'scale' 
            ? await bluetooth.connectScale() 
            : await bluetooth.connectPrinter();
          
          const newConfig = { ...config, [type === 'scale' ? 'scaleConnected' : 'printerConnected']: true };
          setConfig(newConfig);
          saveConfig(newConfig);
          alert(`¡${deviceName} conectado!`);
      } catch (e) {
          alert("Error de conexión Bluetooth.");
      } finally {
          setIsConnecting(null);
      }
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
    <div className="max-w-5xl mx-auto space-y-6 pb-10 font-youthful">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Configuración</h2>
            <p className="text-slate-500 font-medium">Personalización y sincronización del sistema</p>
          </div>
          <button onClick={handleSave} className={`flex items-center px-8 py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95 ${saved ? 'bg-emerald-600 text-white' : 'bg-blue-950 text-white hover:bg-blue-900'}`}>
            {saved ? <Check className="mr-2"/> : <Save className="mr-2" />}
            {saved ? 'Cambios Guardados' : 'Guardar Todo'}
          </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
              
              {/* Identidad del Sistema */}
              <div className="bg-white rounded-3xl shadow-sm border p-6 space-y-6">
                <h3 className="font-bold text-slate-800 border-b pb-3 flex items-center uppercase text-xs tracking-widest">
                  <Layout size={16} className="mr-2 text-indigo-500"/> Personalización Visual
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Nombre de la Aplicación</label>
                            <input 
                              value={config.appName} 
                              onChange={e => setConfig({...config, appName: e.target.value.toUpperCase()})} 
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold text-sm outline-none focus:border-indigo-500 transition-all" 
                              placeholder="Ej. AVICONTROL PRO"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Razón Social (Para Reportes)</label>
                            <input 
                              value={config.companyName} 
                              onChange={e => setConfig({...config, companyName: e.target.value.toUpperCase()})} 
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold text-sm outline-none focus:border-indigo-500 transition-all" 
                              placeholder="Ej. AVÍCOLA BARSA S.A.C."
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Logo del Sistema</label>
                        <div className="flex flex-col items-center gap-4 bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200">
                            {config.logoUrl ? (
                              <div className="relative group">
                                <img src={config.logoUrl} className="h-24 w-24 object-contain rounded-2xl bg-white p-2 border shadow-lg transition-transform group-hover:scale-105"/>
                                <button onClick={() => setConfig({...config, logoUrl: ''})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg"><X size={12}/></button>
                              </div>
                            ) : (
                              <div className="h-24 w-24 bg-slate-200 rounded-2xl flex items-center justify-center text-slate-400">
                                <ImageIcon size={32}/>
                              </div>
                            )}
                            <label className="cursor-pointer bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-md transition-all active:scale-95">
                              Subir Logo
                              <input type="file" onChange={handleLogoUpload} className="hidden" accept="image/*" />
                            </label>
                        </div>
                    </div>
                </div>
              </div>

              {/* Nube / Firebase */}
              <div className="bg-white rounded-3xl shadow-sm border p-6 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${config.cloudEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                            <Cloud size={20}/>
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 uppercase text-[11px] tracking-widest">Sincronización Cloud</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{config.cloudEnabled ? 'Conexión Activa' : 'Modo Solo Local'}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleTestConnection} disabled={isTesting} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 flex items-center gap-2">
                            {isTesting ? <Loader2 className="animate-spin" size={12}/> : <Activity size={12}/>} PRUEBA
                        </button>
                        {config.cloudEnabled ? (
                            <button onClick={handleDisconnectCloud} className="bg-red-50 text-red-600 px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest">Desactivar</button>
                        ) : (
                            <button onClick={handleConnectCloud} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">Activar</button>
                        )}
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">API Key</label>
                            <input 
                                value={config.firebaseConfig.apiKey} 
                                onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, apiKey: e.target.value}})} 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-[10px] outline-none" 
                                placeholder="AIzaSy..." 
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Database URL (Debe empezar con https://)</label>
                            <input 
                                value={config.firebaseConfig.databaseURL} 
                                onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, databaseURL: e.target.value}})} 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-[10px] outline-none" 
                                placeholder="https://tu-proyecto.firebaseio.com" 
                            />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Project ID</label>
                            <input 
                                value={config.firebaseConfig.projectId} 
                                onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, projectId: e.target.value}})} 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-[10px] outline-none" 
                                placeholder="avicola-barsa" 
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">App ID</label>
                            <input 
                                value={config.firebaseConfig.appId} 
                                onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, appId: e.target.value}})} 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-[10px] outline-none" 
                                placeholder="1:4242..." 
                            />
                        </div>
                    </div>
                </div>

                {config.cloudEnabled && (
                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                        <button onClick={handleManualUpload} disabled={isUploading} className="flex-1 bg-emerald-100 text-emerald-700 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-200 transition-all flex items-center justify-center gap-2">
                            {isUploading ? <Loader2 className="animate-spin" size={14}/> : <UploadCloud size={14}/>}
                            Sincronizar Datos Locales a la Nube
                        </button>
                    </div>
                )}
              </div>
          </div>

          <div className="space-y-6">
              {/* Bluetooth */}
              <div className="bg-white rounded-3xl shadow-sm border p-6 space-y-6">
                <h3 className="font-bold text-slate-800 border-b pb-3 flex items-center uppercase text-xs tracking-widest"><Bluetooth size={16} className="mr-2 text-blue-500"/> Bluetooth</h3>
                <div className="space-y-3">
                    <button onClick={() => handleBluetoothConnect('scale')} className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase flex items-center justify-between px-6 ${config.scaleConnected ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-100' : 'bg-slate-50 text-slate-500 border-2 border-slate-100'}`}>
                        BALANZA {config.scaleConnected ? 'LISTA' : 'DESCONECTADA'}
                        {config.scaleConnected ? <Check size={16}/> : <Search size={16}/>}
                    </button>
                    <button onClick={() => handleBluetoothConnect('printer')} className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase flex items-center justify-between px-6 ${config.printerConnected ? 'bg-blue-50 text-blue-700 border-2 border-blue-100' : 'bg-slate-50 text-slate-500 border-2 border-slate-100'}`}>
                        TICKETERA {config.printerConnected ? 'LISTA' : 'DESCONECTADA'}
                        {config.printerConnected ? <Check size={16}/> : <Search size={16}/>}
                    </button>
                </div>
              </div>

              {/* Mantenimiento */}
              <div className="bg-white rounded-3xl border-2 border-red-50 p-6 text-center shadow-sm space-y-4">
                  <div className="bg-red-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-red-600"><ShieldAlert size={24}/></div>
                  <h3 className="font-black text-[10px] text-slate-800 uppercase tracking-widest">Zona de Peligro</h3>
                  
                  {config.cloudEnabled && (
                    <button onClick={handleFormatCloud} disabled={isFormattingCloud} className="w-full bg-slate-900 text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-md hover:bg-black transition-all flex items-center justify-center gap-2">
                        {isFormattingCloud ? <Loader2 className="animate-spin" size={14}/> : <Trash2 size={14} className="text-red-500"/>}
                        BORRAR DATOS DE LA NUBE
                    </button>
                  )}

                  <button onClick={() => { if(confirm('⚠️ ¿BORRAR TODO EL SISTEMA? Se perderán todos los datos locales.')) resetApp(); }} className="w-full bg-red-600 text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-red-700 transition-all">
                      RESETEAR SISTEMA LOCAL
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Configuration;
