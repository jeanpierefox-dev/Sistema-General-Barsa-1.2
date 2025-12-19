
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Batch, WeighingType } from '../../types';
import { getBatches, saveBatch, deleteBatch, getOrders } from '../../services/storage';
import { Plus, Trash2, Edit, Scale, Box, ArrowLeft, Layers, Activity, TrendingUp } from 'lucide-react';
import { AuthContext } from '../../App';

const BatchList: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [currentBatch, setCurrentBatch] = useState<Partial<Batch>>({});
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  useEffect(() => { refresh(); }, [user]);

  const refresh = () => setBatches(getBatches());

  const handleSave = () => {
    if (!currentBatch.name || !currentBatch.totalCratesLimit) return;
    saveBatch({
      id: currentBatch.id || Date.now().toString(),
      name: currentBatch.name,
      totalCratesLimit: Number(currentBatch.totalCratesLimit),
      createdAt: currentBatch.createdAt || Date.now(),
      status: 'ACTIVE',
      createdBy: currentBatch.createdBy || user?.id
    } as Batch);
    setShowModal(false);
    refresh();
  };

  const BatchCard: React.FC<{ batch: Batch }> = ({ batch }) => {
    const orders = getOrders().filter(o => o.batchId === batch.id);
    let tFull = 0, tEmpty = 0, tMort = 0, tCrates = 0, tRecords = 0;

    orders.forEach(order => {
      tRecords += order.records.length;
      order.records.forEach(r => {
        if (r.type === 'FULL') { tFull += r.weight; tCrates += r.quantity; }
        if (r.type === 'EMPTY') { tEmpty += r.weight; }
        if (r.type === 'MORTALITY') { tMort += r.weight; }
      });
    });

    const net = tFull - tEmpty - tMort;
    const progress = (tCrates / batch.totalCratesLimit) * 100;

    return (
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-xl transition-all flex flex-col overflow-hidden group">
          {/* Cabecera de Tarjeta */}
          <div className="bg-slate-900 p-5 flex justify-between items-center border-b border-white/5">
             <div className="flex items-center space-x-3">
                 <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform"><Layers size={20} /></div>
                 <div>
                    <h3 className="font-black text-white text-sm uppercase tracking-tight leading-none">{batch.name}</h3>
                    <p className="text-[8px] font-black text-slate-400 uppercase mt-1.5 tracking-[0.2em]">{new Date(batch.createdAt).toLocaleDateString()}</p>
                 </div>
             </div>
             <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setCurrentBatch(batch); setShowModal(true); }} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"><Edit size={16}/></button>
                <button onClick={() => { if(confirm('¿Eliminar lote?')) { deleteBatch(batch.id); refresh(); } }} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"><Trash2 size={16}/></button>
             </div>
          </div>

          <div className="p-5 space-y-5">
              {/* Grid de Totales de Peso */}
              <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 py-3 px-1 rounded-2xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1 tracking-wider">Bruto</p>
                      <p className="text-sm font-black text-slate-900 font-mono tracking-tighter">{tFull.toFixed(1)} <span className="text-[9px] font-normal text-slate-400">KG</span></p>
                  </div>
                  <div className="bg-slate-50 py-3 px-1 rounded-2xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1 tracking-wider">Tara</p>
                      <p className="text-sm font-black text-slate-900 font-mono tracking-tighter">{tEmpty.toFixed(1)} <span className="text-[9px] font-normal text-slate-400">KG</span></p>
                  </div>
                  <div className="bg-emerald-50 py-3 px-1 rounded-2xl border border-emerald-100">
                      <p className="text-[8px] font-black text-emerald-500 uppercase mb-1 tracking-wider">Neto</p>
                      <p className="text-sm font-black text-emerald-700 font-mono tracking-tighter">{net.toFixed(1)} <span className="text-[9px] font-normal text-emerald-400">KG</span></p>
                  </div>
              </div>

              {/* Estadísticas Secundarias */}
              <div className="flex justify-between items-center bg-slate-50/50 px-4 py-3 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2">
                      <Activity size={14} className="text-blue-500"/>
                      <div className="flex flex-col">
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Registros</span>
                          <span className="text-[11px] font-black text-slate-800">{tRecords} Pesadas</span>
                      </div>
                  </div>
                  <div className="w-px h-6 bg-slate-200"></div>
                  <div className="flex items-center gap-2">
                      <Scale size={14} className="text-emerald-500"/>
                      <div className="flex flex-col">
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Jabas</span>
                          <span className="text-[11px] font-black text-slate-800">{tCrates} / {batch.totalCratesLimit}</span>
                      </div>
                  </div>
              </div>

              {/* Barra de Progreso Avanzada */}
              <div className="space-y-1.5">
                  <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-[0.15em]">
                      <span>Progreso del Lote</span>
                      <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner p-0.5">
                      <div className="bg-blue-600 h-full rounded-full transition-all duration-1000 ease-out relative" style={{ width: `${Math.min(progress, 100)}%` }}>
                          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                      </div>
                  </div>
              </div>

              {/* Botón de Acción Principal */}
              <button 
                onClick={() => navigate(`/weigh/${WeighingType.BATCH}/${batch.id}`)}
                className="w-full bg-slate-900 hover:bg-blue-600 text-white py-4 rounded-2xl text-[10px] font-black flex items-center justify-center transition-all uppercase tracking-[0.2em] shadow-lg shadow-slate-200 hover:shadow-blue-500/20 active:scale-95"
              >
                <Scale size={18} className="mr-2" /> Entrar al Pesaje
              </button>
          </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm gap-4">
        <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Archivo de Lotes</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                <TrendingUp size={12} className="text-blue-500" /> Monitoreo de Producción en Vivo
            </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <button onClick={() => navigate('/')} className="flex-1 md:flex-none bg-slate-50 border border-slate-200 p-3.5 rounded-2xl hover:bg-white transition-all shadow-sm active:scale-95">
                <ArrowLeft size={22} className="text-slate-600 mx-auto" />
            </button>
            <button 
                onClick={() => { setCurrentBatch({}); setShowModal(true); }} 
                className="flex-[3] md:flex-none bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
                <Plus size={20}/> Nuevo Lote de Campaña
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {batches.map(b => <BatchCard key={b.id} batch={b} />)}
        
        {batches.length === 0 && (
          <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center space-y-4">
             <div className="bg-slate-50 p-6 rounded-full text-slate-200 shadow-inner">
                 <Box size={56} />
             </div>
             <div className="max-w-xs">
                <p className="text-slate-900 font-black uppercase text-sm tracking-tight mb-2">Sin Lotes Registrados</p>
                <p className="text-slate-400 font-medium text-[11px] leading-relaxed">Inicie una nueva campaña de producción presionando el botón superior.</p>
             </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-[100] backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl border border-white/20">
            <div className="flex flex-col items-center mb-8">
                <div className="bg-blue-50 p-4 rounded-3xl text-blue-600 mb-4 shadow-inner">
                    <Layers size={32}/>
                </div>
                <h3 className="text-xl font-black uppercase text-center text-slate-900 tracking-tight">Parámetros de Lote</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configuración de Nueva Campaña</p>
            </div>
            
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identificador del Lote</label>
                <input 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-black uppercase text-sm focus:border-blue-500 outline-none transition-all shadow-sm placeholder:text-slate-300" 
                    value={currentBatch.name || ''} 
                    onChange={e => setCurrentBatch({...currentBatch, name: e.target.value.toUpperCase()})} 
                    placeholder="EJE. AGOSTO-01" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Meta de Jabas (Límite)</label>
                <input 
                    type="number" 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-black text-sm focus:border-blue-500 outline-none transition-all shadow-sm" 
                    value={currentBatch.totalCratesLimit || ''} 
                    onChange={e => setCurrentBatch({...currentBatch, totalCratesLimit: Number(e.target.value)})} 
                    placeholder="0" 
                />
              </div>
            </div>
            
            <div className="mt-10 flex flex-col gap-3">
              <button 
                onClick={handleSave} 
                className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-600/30 hover:bg-blue-700 transition-all active:scale-95"
              >
                Guardar Configuración
              </button>
              <button 
                onClick={() => setShowModal(false)} 
                className="w-full text-slate-400 font-black py-2 uppercase text-[10px] tracking-widest hover:text-slate-600 transition-colors"
              >
                Cancelar Operación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchList;
