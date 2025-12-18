import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Batch, WeighingType, UserRole } from '../../types';
import { getBatches, saveBatch, deleteBatch, getOrdersByBatch, getUsers } from '../../services/storage';
import { Plus, Trash2, Edit, Scale, Calendar, Box, Activity, ArrowLeft } from 'lucide-react';
import { AuthContext } from '../../App';

const BatchList: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [currentBatch, setCurrentBatch] = useState<Partial<Batch>>({});
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    refresh();
  }, [user]);

  const refresh = () => {
      const allBatches = getBatches();
      const allUsers = getUsers();
      
      if (user?.role === UserRole.ADMIN) {
          setBatches(allBatches);
      } else if (user?.role === UserRole.GENERAL) {
          // General ve sus lotes y los de sus operadores subordinados
          const subordinateIds = allUsers.filter(u => u.parentId === user.id).map(u => u.id);
          setBatches(allBatches.filter(b => b.createdBy === user.id || subordinateIds.includes(b.createdBy || '')));
      } else {
          // Operador ve sus propios lotes Y los de su supervisor (parentId)
          const mySupervisorId = user?.parentId;
          setBatches(allBatches.filter(b => b.createdBy === user?.id || b.createdBy === mySupervisorId));
      }
  };

  const handleSave = () => {
    if (!currentBatch.name || !currentBatch.totalCratesLimit) return;
    const batch: Batch = {
      id: currentBatch.id || Date.now().toString(),
      name: currentBatch.name,
      totalCratesLimit: Number(currentBatch.totalCratesLimit),
      createdAt: currentBatch.createdAt || Date.now(),
      status: 'ACTIVE',
      createdBy: currentBatch.createdBy || user?.id
    };
    saveBatch(batch);
    setShowModal(false);
    refresh();
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar este lote? Se eliminarán también las pesadas asociadas.')) {
      deleteBatch(id);
      refresh();
    }
  };

  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.GENERAL;

  const BatchCard: React.FC<{ batch: Batch }> = ({ batch }) => {
    const orders = getOrdersByBatch(batch.id);
    let totalFullCrates = 0; let totalFullWeight = 0;
    let totalEmptyCrates = 0; let totalEmptyWeight = 0;
    let totalMort = 0; let totalMortWeight = 0;

    orders.forEach(order => {
      order.records.forEach(r => {
        if (r.type === 'FULL') { totalFullCrates += r.quantity; totalFullWeight += r.weight; }
        if (r.type === 'EMPTY') { totalEmptyCrates += r.quantity; totalEmptyWeight += r.weight; }
        if (r.type === 'MORTALITY') { totalMort += r.quantity; totalMortWeight += r.weight; }
      });
    });

    const isOverLimit = totalFullCrates >= batch.totalCratesLimit;
    const percent = Math.min((totalFullCrates / batch.totalCratesLimit) * 100, 100);

    return (
      <div className="bg-white rounded-[2rem] shadow-lg border-2 border-slate-100 hover:shadow-2xl hover:border-blue-400 transition-all duration-300 overflow-hidden flex flex-col h-full relative group">
          <div className="bg-slate-900 p-6 flex justify-between items-start">
             <div className="flex items-center space-x-4">
                 <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg">
                     <Box size={24} />
                 </div>
                 <div>
                     <h3 className="font-black text-white text-lg leading-tight uppercase tracking-tight">{batch.name}</h3>
                     <p className="text-slate-400 text-[10px] font-black flex items-center mt-1 uppercase tracking-widest">
                         <Calendar size={12} className="mr-1"/> {new Date(batch.createdAt).toLocaleDateString()}
                     </p>
                 </div>
             </div>
             {canEdit && (
                <div className="flex space-x-2">
                    <button onClick={() => { setCurrentBatch(batch); setShowModal(true); }} className="bg-slate-800 p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(batch.id)} className="bg-slate-800 p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-slate-700 transition-colors"><Trash2 size={16} /></button>
                </div>
             )}
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                  <div className="mb-6">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-3">
                          <span className="text-slate-500">Capacidad Ocupada</span>
                          <span className={`${isOverLimit ? 'text-red-600' : 'text-blue-600'}`}>{totalFullCrates} / {batch.totalCratesLimit}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden border border-slate-50">
                          <div className={`h-full rounded-full transition-all duration-700 ${isOverLimit ? 'bg-red-500' : 'bg-gradient-to-r from-blue-600 to-blue-400'}`} style={{ width: `${percent}%` }}></div>
                      </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100 shadow-inner">
                          <p className="text-[9px] font-black text-blue-400 uppercase tracking-tighter">Llenas</p>
                          <p className="font-black text-slate-800 text-xl leading-none">{totalFullCrates}</p>
                          <p className="text-[9px] text-slate-500 font-bold mt-1">{totalFullWeight.toFixed(1)} kg</p>
                      </div>
                      <div className="bg-orange-50 p-3 rounded-2xl border border-orange-100 shadow-inner">
                          <p className="text-[9px] font-black text-orange-400 uppercase tracking-tighter">Vacías</p>
                          <p className="font-black text-slate-800 text-xl leading-none">{totalEmptyCrates}</p>
                           <p className="text-[9px] text-slate-500 font-bold mt-1">{totalEmptyWeight.toFixed(1)} kg</p>
                      </div>
                      <div className="bg-red-50 p-3 rounded-2xl border border-red-100 shadow-inner">
                          <p className="text-[9px] font-black text-red-400 uppercase tracking-tighter">Merma</p>
                          <p className="font-black text-slate-800 text-xl leading-none">{totalMort}</p>
                           <p className="text-[9px] text-slate-500 font-bold mt-1">{totalMortWeight.toFixed(1)} kg</p>
                      </div>
                  </div>
              </div>

              <button 
                onClick={() => navigate(`/weigh/${WeighingType.BATCH}/${batch.id}`)}
                className="w-full mt-8 bg-blue-950 hover:bg-blue-900 text-white py-4 rounded-2xl text-xs font-black flex items-center justify-center transition-all shadow-xl active:scale-95 uppercase tracking-widest"
              >
                <Scale size={20} className="mr-3" />
                Iniciar Pesaje
              </button>
          </div>
      </div>
    );
  };

  return (
    <div className="pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6">
        <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Control de Lotes</h2>
            <p className="text-slate-500 font-medium">Administre sus campañas de producción activa</p>
        </div>
        <div className="flex gap-4 w-full sm:w-auto">
            <button 
                onClick={() => navigate('/')}
                className="flex-1 sm:flex-none bg-white border-2 border-slate-100 text-slate-600 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
            >
                <ArrowLeft size={18}/> Regresar
            </button>
            {canEdit && (
                <button 
                onClick={() => { setCurrentBatch({}); setShowModal(true); }}
                className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl flex items-center justify-center transition-all shadow-xl shadow-emerald-900/10 font-black text-xs uppercase tracking-widest active:scale-95"
                >
                <Plus size={20} className="mr-2" />
                Nuevo Lote
                </button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {batches.map(b => <BatchCard key={b.id} batch={b} />)}
        {batches.length === 0 && (
            <div className="col-span-full py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                <Box size={64} className="mb-4 opacity-20"/>
                <p className="font-black text-xs uppercase tracking-widest">No hay lotes registrados</p>
            </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-blue-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 w-full max-w-sm border border-white/20">
            <h3 className="text-2xl font-black mb-8 text-slate-900 tracking-tight">{currentBatch.id ? 'Editar Lote' : 'Nuevo Lote'}</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Nombre del Lote</label>
                <input 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-900 focus:border-blue-500 focus:bg-white outline-none transition-all"
                  value={currentBatch.name || ''}
                  onChange={e => setCurrentBatch({...currentBatch, name: e.target.value})}
                  placeholder="Ej. CAMPAÑA 2024-A"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Capacidad de Jabas</label>
                <input 
                  type="number"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-900 focus:border-blue-500 focus:bg-white outline-none transition-all"
                  value={currentBatch.totalCratesLimit || ''}
                  onChange={e => setCurrentBatch({...currentBatch, totalCratesLimit: Number(e.target.value)})}
                  placeholder="Ej. 1000"
                />
                <p className="text-[9px] text-slate-400 mt-3 flex items-center px-2"><Activity size={12} className="mr-2 text-emerald-500"/> Este valor sirve de guía para el llenado del lote.</p>
              </div>
            </div>
            <div className="mt-10 flex flex-col gap-3">
              <button onClick={handleSave} className="w-full bg-blue-950 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-blue-900 transition-all uppercase text-xs tracking-widest active:scale-95">GUARDAR LOTE</button>
              <button onClick={() => setShowModal(false)} className="w-full text-slate-400 font-bold py-2 hover:text-slate-600 transition-colors text-xs uppercase tracking-widest">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchList;