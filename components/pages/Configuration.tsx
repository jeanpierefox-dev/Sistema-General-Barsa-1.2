
import React, { useState, useContext, useEffect } from 'react';
import { AppConfig, UserRole } from '../../types';
import { getConfig, saveConfig, resetApp, uploadLocalDataToCloud, formatCloudData, testCloudConnection } from '../../services/storage';
import { bluetooth } from '../../services/bluetooth';
import { Save, Check, AlertTriangle, Building2, ShieldAlert, Cloud, Bluetooth, Printer, Loader2, Link2, X, Search, Wifi, Database, Smartphone, UploadCloud, Trash2, Activity } from 'lucide-react';
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
      const result = await testCloudConnection();
      alert(result.message);
      setIsTesting(false);
  };

  const handleConnectCloud = () => {
      if (!config.firebaseConfig.apiKey || !config.firebaseConfig.projectId || !config.firebaseConfig.databaseURL) {
          alert("Debe completar los campos de Firebase para activar la sincronización.");
          return;
      }
      setIsSyncing(true);
      setTimeout(() => {
          setIsSyncing(false);
          const newConfig = { ...config, cloudEnabled: true };
          setConfig(newConfig);
          saveConfig(newConfig);
      }, 1000);
  };

  const handleDisconnectCloud = () => {
      const newConfig = { ...config, cloudEnabled: false };
      setConfig(newConfig);
      saveConfig(newConfig);
  };

  const handleManualUpload = async () => {
      if (!confirm("Esta acción subirá todos sus datos locales a la Nube. ¿Desea continuar?")) return;
      setIsUploading(true);
      try {
          await uploadLocalDataToCloud();
          alert("¡BASE DE DATOS SUBIDA CON ÉXITO!");
      } catch (e) {
          alert("Error: " + (e as Error).message);
      } finally {
          setIsUploading(false);
      }
  };

  const handleFormatCloud = async () => {
      if (!confirm("⚠️ ATENCIÓN: ¿BORRAR TODA LA INFORMACIÓN EN LA NUBE?")) return;
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
            <p className="text-slate-500 font-medium">Dispositivos y sincronización de red</p>
          </div>
          <button onClick={handleSave} className={`flex items-center px-8 py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95 ${saved ? 'bg-emerald-600 text-white' : 'bg-blue-950 text-white hover:bg-blue-900'}`}>
            {saved ? <Check className="mr-2"/> : <Save className="mr-2" />}
            {saved ? 'Cambios Guardados' : 'Guardar Todo'}
          </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
              {/* Nube / Firebase */}
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
                    <div className="flex gap-2">
                        <button onClick={handleTestConnection} disabled={isTesting} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 flex items-center gap-2">
                            {isTesting ? <Loader2 className="animate-spin" size={12}/> : <Activity size={12}/>} PRUEBA
                        </button>
                        {config.cloudEnabled ? (
                            <button onClick={handleDisconnectCloud} className="bg-red-50 text-red-600 px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest">Desactivar</button>
                        ) : (
                            <button onClick={handleConnectCloud} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">Activar Nube</button>
                        )}
                    </div>
                </div>

                {config.cloudEnabled && (
                    <div className="bg-emerald-50 p-6 rounded-2xl border-2 border-dashed border-emerald-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <UploadCloud className="text-emerald-500 shrink-0" size={32}/>
                            <div>
                                <h4 className="font-black text-emerald-900 text-xs uppercase mb-1">Subida Manual</h4>
                                <p className="text-[10px] text-emerald-700 leading-relaxed font-bold uppercase tracking-tight">Cargue sus datos locales a la nube ahora.</p>
                            </div>
                        </div>
                        <button onClick={handleManualUpload} disabled={isUploading} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2 disabled:opacity-50">
                            {isUploading ? <Loader2 className="animate-spin" size={16}/> : <Database size={16}/>}
                            {isUploading ? 'Subiendo...' : 'SUBIR TODO'}
                        </button>
                    </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">API Key de Firebase</label>
                            <input value={config.firebaseConfig.apiKey} onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, apiKey: e.target.value}})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-[10px] outline-none" placeholder="AIza..." />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Database URL (Obligatorio)</label>
                            <input value={config.firebaseConfig.databaseURL} onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, databaseURL: e.target.value}})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-[10px] outline-none" placeholder="https://tu-proyecto.firebaseio.com" />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Project ID</label>
                            <input value={config.firebaseConfig.projectId} onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, projectId: e.target.value}})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-[10px] outline-none" placeholder="avicola-barsa" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">App ID</label>
                            <input value={config.firebaseConfig.appId} onChange={e => setConfig({...config, firebaseConfig: {...config.firebaseConfig, appId: e.target.value}})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-[10px] outline-none" placeholder="1:4242..." />
                        </div>
                    </div>
                </div>
              </div>

              {/* Periféricos */}
              <div className="bg-white rounded-3xl shadow-sm border p-6 space-y-6">
                <h3 className="font-bold text-slate-800 border-b pb-3 flex items-center uppercase text-xs tracking-widest"><Bluetooth size={16} className="mr-2 text-blue-500"/> Sincronización Bluetooth</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center text-center ${config.scaleConnected ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
                        <Bluetooth size={28} className={config.scaleConnected ? 'text-emerald-500 mb-4' : 'text-slate-300 mb-4'}/>
                        <h4 className="font-bold text-slate-900 text-xs">Balanza Electrónica</h4>
                        <p className="text-[10px] text-slate-400 mb-6 uppercase font-black">{config.scaleConnected ? 'Vínculo Activo' : 'Sin Conexión'}</p>
                        <button onClick={() => handleBluetoothConnect('scale')} disabled={isConnecting === 'scale'} className={`w-full py-4 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 ${config.scaleConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-950 text-white shadow-lg'}`}>
                            {isConnecting === 'scale' ? <Loader2 className="animate-spin"/> : <Search size={16}/>} 
                            {config.scaleConnected ? 'RECONECTAR' : 'CONECTAR'}
                        </button>
                    </div>

                    <div className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center text-center ${config.printerConnected ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                        <Printer size={28} className={config.printerConnected ? 'text-blue-500 mb-4' : 'text-slate-300 mb-4'}/>
                        <h4 className="font-bold text-slate-900 text-xs">Ticketera Térmica</h4>
                        <p className="text-[10px] text-slate-400 mb-6 uppercase font-black">{config.printerConnected ? 'Impresora Lista' : 'Desconectada'}</p>
                        <button onClick={() => handleBluetoothConnect('printer')} disabled={isConnecting === 'printer'} className={`w-full py-4 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 ${config.printerConnected ? 'bg-blue-100 text-blue-700' : 'bg-blue-950 text-white shadow-lg'}`}>
                            {isConnecting === 'printer' ? <Loader2 className="animate-spin"/> : <Search size={16}/>}
                            {config.printerConnected ? 'RECONECTAR' : 'CONECTAR'}
                        </button>
                    </div>
                </div>
              </div>
          </div>

          <div className="space-y-6">
              <div className="bg-white rounded-3xl border-2 border-red-50 p-8 text-center shadow-sm space-y-6">
                  <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 text-red-600"><ShieldAlert size={32}/></div>
                  <h3 className="font-black text-sm text-slate-800 uppercase tracking-widest">Mantenimiento</h3>
                  {config.cloudEnabled && (
                      <div className="pt-2">
                          <button onClick={handleFormatCloud} disabled={isFormattingCloud} className="w-full bg-slate-900 text-white py-5 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all hover:bg-black">
                              {isFormattingCloud ? <Loader2 className="animate-spin" size={18}/> : <Trash2 size={18} className="text-red-500"/>}
                              LIMPIAR NUBE
                          </button>
                      </div>
                  )}
                  <div className="pt-2 border-t border-red-50">
                      <button onClick={() => { if(confirm('¿BORRAR DATOS LOCALES?')) resetApp(); }} className="w-full bg-red-600 text-white py-5 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all hover:bg-red-700">
                          <AlertTriangle size={18}/> FORMATEAR APP
                      </button>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Configuration;
