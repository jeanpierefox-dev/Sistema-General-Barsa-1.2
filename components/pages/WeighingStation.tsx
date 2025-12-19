
import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WeighingType, ClientOrder, WeighingRecord, Batch } from '../../types';
import { getOrders, saveOrder, deleteOrder, getConfig, getBatches } from '../../services/storage';
// Added Activity icon to imports
import { 
  ArrowLeft, User, CheckCircle, X, Scale, FileText, Calculator, History, 
  ShoppingBag, Package, AlertCircle, Save, Printer, Lock, Info, Download, 
  ChevronRight, Plus, Edit, Trash2, Gauge, Zap, Activity
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AuthContext } from '../../App';

const WeighingStation: React.FC = () => {
  const { mode, batchId } = useParams<{ mode: string; batchId?: string }>();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const config = getConfig();

  const [activeOrder, setActiveOrder] = useState<ClientOrder | null>(null);
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [currentBatch, setCurrentBatch] = useState<Batch | null>(null);
  
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ClientOrder | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showTicketPreview, setShowTicketPreview] = useState(false);
  
  const [newClientName, setNewClientName] = useState('');
  const [targetCrates, setTargetCrates] = useState(0);

  // Inputs por columna para pesaje en tiempo real
  const [fullWeight, setFullWeight] = useState('');
  const [fullQty, setFullQty] = useState(String(config.defaultFullCrateBatch || 5));
  const [emptyWeight, setEmptyWeight] = useState('');
  const [emptyQty, setEmptyQty] = useState(String(config.defaultEmptyCrateBatch || 10));
  const [mortWeight, setMortWeight] = useState('');
  const [mortQty, setMortQty] = useState('1');

  const [checkoutPrice, setCheckoutPrice] = useState('');
  const [checkoutMethod, setCheckoutMethod] = useState<'CASH' | 'CREDIT'>('CASH');

  // Refs para auto-focus al registrar
  const fullRef = useRef<HTMLInputElement>(null);
  const emptyRef = useRef<HTMLInputElement>(null);
  const mortRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshOrders();
    if (batchId) {
      const b = getBatches().find(x => x.id === batchId);
      if (b) setCurrentBatch(b);
    }
  }, [mode, batchId]);

  const refreshOrders = () => {
    const all = getOrders().filter(o => mode === WeighingType.BATCH ? o.batchId === batchId : o.weighingMode === mode);
    setOrders(all);
  };

  const stats = useMemo(() => {
    if (!activeOrder) return { netWeight: 0, fullCount: 0, emptyCount: 0, mortCount: 0, birds: 0, avg: 0, grossWeight: 0, tareWeight: 0, mermaWeight: 0, records: [] };
    const r = activeOrder.records;
    const fw = r.filter(x => x.type === 'FULL').reduce((a, b) => a + b.weight, 0);
    const tw = r.filter(x => x.type === 'EMPTY').reduce((a, b) => a + b.weight, 0);
    const mw = r.filter(x => x.type === 'MORTALITY').reduce((a, b) => a + b.weight, 0);
    const fc = r.filter(x => x.type === 'FULL').reduce((a, b) => a + b.quantity, 0);
    const ec = r.filter(x => x.type === 'EMPTY').reduce((a, b) => a + b.quantity, 0);
    const mc = r.filter(x => x.type === 'MORTALITY').reduce((a, b) => a + b.quantity, 0);
    
    // Cantidad estimada: 9 pollos por jaba llena menos merma reportada
    const birds = (fc * 9) - mc;
    const net = fw - tw - mw;
    const avg = birds > 0 ? net / birds : 0;

    return { 
      netWeight: net, fullCount: fc, emptyCount: ec, mortCount: mc, birds, 
      avg, grossWeight: fw, tareWeight: tw, mermaWeight: mw, records: r
    };
  }, [activeOrder]);

  const isClosed = activeOrder?.status === 'CLOSED';

  const handleAddWeight = (type: 'FULL' | 'EMPTY' | 'MORTALITY') => {
    if (!activeOrder || isClosed) return;
    
    let weight = 0, qty = 0;

    if (type === 'FULL') {
        weight = parseFloat(fullWeight);
        qty = parseInt(fullQty);
        if (activeOrder.targetCrates > 0 && stats.fullCount >= activeOrder.targetCrates) {
            alert("Límite de jabas alcanzado para este cliente."); return;
        }
    } else if (type === 'EMPTY') {
        weight = parseFloat(emptyWeight);
        qty = parseInt(emptyQty);
    } else {
        weight = parseFloat(mortWeight);
        qty = parseInt(mortQty);
    }

    if (!weight || !qty) return;

    const record: WeighingRecord = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      weight,
      quantity: qty,
      type
    };

    const updated = { ...activeOrder, records: [record, ...activeOrder.records] };
    saveOrder(updated);
    setActiveOrder(updated);

    if (type === 'FULL') { setFullWeight(''); fullRef.current?.focus(); }
    else if (type === 'EMPTY') { setEmptyWeight(''); emptyRef.current?.focus(); }
    else { setMortWeight(''); mortRef.current?.focus(); }
  };

  const handleCreateOrUpdateClient = () => {
    if (!newClientName) return;
    if (editingOrder) {
      saveOrder({ ...editingOrder, clientName: newClientName.toUpperCase(), targetCrates });
    } else {
      const order: ClientOrder = {
        id: Date.now().toString(),
        clientName: newClientName.toUpperCase(),
        targetCrates,
        pricePerKg: 0,
        status: 'OPEN',
        records: [],
        batchId,
        weighingMode: mode as WeighingType,
        paymentStatus: 'PENDING',
        payments: [],
        createdBy: user?.id
      };
      saveOrder(order);
    }
    setShowClientModal(false);
    setEditingOrder(null);
    setNewClientName('');
    setTargetCrates(0);
    refreshOrders();
  };

  const generateReportPDF = () => {
    if (!activeOrder) return;
    const doc = new jsPDF();
    const navy: [number, number, number] = [15, 23, 42];

    doc.setFont("helvetica", "bold").setFontSize(22).setTextColor(navy[0], navy[1], navy[2]);
    doc.text(config.companyName.toUpperCase(), 105, 15, { align: 'center' });
    doc.setFontSize(10).setTextColor(100).text("REPORTE DE AUDITORÍA DE PESAJE", 105, 22, { align: 'center' });
    doc.setDrawColor(navy[0], navy[1], navy[2]).setLineWidth(0.5).line(20, 25, 190, 25);

    doc.setFontSize(11).setTextColor(40).text(`CLIENTE: ${activeOrder.clientName}`, 20, 35);
    doc.text(`FECHA: ${new Date().toLocaleString()}`, 190, 35, { align: 'right' });

    autoTable(doc, {
      startY: 42,
      head: [['CONCEPTO', 'CANTIDAD / PESO']],
      body: [
        ['PESO BRUTO (LLENAS)', `${stats.grossWeight.toFixed(2)} KG`],
        ['PESO TARA (VACÍAS)', `${stats.tareWeight.toFixed(2)} KG`],
        ['PESO MERMA (BAJAS)', `${stats.mermaWeight.toFixed(2)} KG`],
        [{ content: 'PESO NETO COBRABLE', styles: { fontStyle: 'bold' } }, { content: `${stats.netWeight.toFixed(2)} KG`, styles: { fontStyle: 'bold' } }],
        ['TOTAL AVES ESTIMADAS', `${stats.birds} UND`],
        ['PESO PROMEDIO / AVE', `${stats.avg.toFixed(2)} KG`]
      ],
      theme: 'grid',
      headStyles: { fillColor: navy }
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [['TURNO', 'TIPO', 'CANT.', 'PESO (KG)', 'PROMEDIO', 'HORA']],
      body: activeOrder.records.map((r, i) => [
        activeOrder.records.length - i,
        r.type === 'FULL' ? 'CARGA' : r.type === 'EMPTY' ? 'TARA' : 'MERMA',
        r.quantity,
        r.weight.toFixed(2),
        (r.weight / r.quantity).toFixed(2),
        new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      ]),
      theme: 'striped',
      headStyles: { fillColor: [60, 60, 60] }
    });

    doc.save(`Auditoria_${activeOrder.clientName}.pdf`);
  };

  const handleCheckout = () => {
    if (!activeOrder || !checkoutPrice) return;
    const price = parseFloat(checkoutPrice);
    const updated: ClientOrder = { 
      ...activeOrder, status: 'CLOSED', pricePerKg: price, paymentMethod: checkoutMethod,
      paymentStatus: checkoutMethod === 'CASH' ? 'PAID' : 'PENDING'
    };
    if (checkoutMethod === 'CASH') {
      updated.payments.push({ id: Date.now().toString(), amount: stats.netWeight * price, timestamp: Date.now(), note: 'Cierre de Venta' });
    }
    saveOrder(updated);
    refreshOrders();
    setActiveOrder(null);
    setShowCheckoutModal(false);
  };

  if (!activeOrder) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Selección de Operación</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Lote Activo: {currentBatch?.name || mode}</p>
          </div>
          <button 
            onClick={() => { setEditingOrder(null); setNewClientName(''); setTargetCrates(0); setShowClientModal(true); }} 
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-[11px] uppercase shadow-lg shadow-blue-600/20 hover:bg-blue-700 flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus size={18}/> Nuevo Cliente / Liquidación
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {orders.map(o => {
              const orderStats = o.records.reduce((acc, r) => {
                  if (r.type === 'FULL') { acc.fw += r.weight; }
                  else if (r.type === 'EMPTY') { acc.tw += r.weight; }
                  else if (r.type === 'MORTALITY') { acc.mw += r.weight; }
                  return acc;
              }, {fw:0, tw:0, mw:0});
              const orderNet = orderStats.fw - orderStats.tw - orderStats.mw;
              
              return (
                <div key={o.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 hover:border-blue-500 transition-all flex flex-col overflow-hidden group">
                  <div className="bg-slate-900 p-5 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2.5 rounded-2xl text-white ${o.status === 'CLOSED' ? 'bg-slate-700' : 'bg-blue-600 shadow-blue-500/20 shadow-lg'}`}><User size={20} /></div>
                      <div>
                        <h3 className="font-black text-white text-sm uppercase leading-none truncate max-w-[100px]">{o.clientName}</h3>
                        <p className="text-[8px] font-black text-slate-400 uppercase mt-1.5 tracking-widest">{o.status === 'CLOSED' ? 'REGISTRO CERRADO' : 'EN PESAJE'}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingOrder(o); setNewClientName(o.clientName); setTargetCrates(o.targetCrates || 0); setShowClientModal(true); }} className="p-2 text-slate-400 hover:text-white"><Edit size={16}/></button>
                      <button onClick={() => { if(confirm('¿Eliminar registro?')) { deleteOrder(o.id); refreshOrders(); }}} className="p-2 text-slate-400 hover:text-red-400"><Trash2 size={16}/></button>
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center">
                        <p className="text-[8px] font-black text-blue-500 uppercase mb-1.5 tracking-widest">Peso Neto Acumulado</p>
                        <p className="text-2xl font-black text-blue-900 font-mono leading-none">{orderNet.toFixed(2)} KG</p>
                    </div>
                    <button onClick={() => setActiveOrder(o)} className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all ${o.status === 'CLOSED' ? 'bg-slate-800 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                      {o.status === 'CLOSED' ? <><FileText size={16} className="mr-2 inline"/> Ver Reporte</> : <><Scale size={16} className="mr-2 inline"/> Continuar Pesaje</>}
                    </button>
                  </div>
                </div>
              );
          })}
        </div>

        {showClientModal && (
          <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
            <div className="bg-white p-6 rounded-3xl w-full max-w-sm shadow-2xl border border-slate-200">
              <h3 className="text-lg font-black text-slate-900 mb-6 uppercase text-center tracking-tight">{editingOrder ? 'Ajustar Datos' : 'Nueva Operación'}</h3>
              <div className="space-y-4">
                <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Cliente</label>
                    <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold uppercase text-sm outline-none focus:border-blue-500 transition-all shadow-sm" value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="EJ. JUAN PEREZ" autoFocus />
                </div>
                <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Meta de Jabas</label>
                    <input type="number" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:border-blue-500 transition-all shadow-sm" value={targetCrates || ''} onChange={e => setTargetCrates(parseInt(e.target.value) || 0)} placeholder="0 = Sin Límite" />
                </div>
              </div>
              <div className="mt-8 flex flex-col gap-2">
                <button onClick={handleCreateOrUpdateClient} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black uppercase text-[11px] shadow-xl hover:bg-emerald-700 active:scale-95 transition-all">Guardar Cambios</button>
                <button onClick={() => setShowClientModal(false)} className="w-full text-slate-400 font-bold py-1 uppercase text-[10px]">Cerrar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4 max-w-6xl mx-auto pb-10">
      {/* Cabecera de KPIs Superiores */}
      <div className="bg-slate-900 p-4 rounded-3xl text-white shadow-2xl flex flex-wrap items-center justify-between gap-4 border border-white/5">
        <div className="flex items-center gap-4">
            <button onClick={() => setActiveOrder(null)} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all active:scale-95 shadow-lg"><ArrowLeft size={20}/></button>
            <div>
                <h2 className="text-[14px] font-black uppercase truncate leading-none">{activeOrder.clientName}</h2>
                <p className="text-[7px] font-black text-emerald-400 mt-1 uppercase tracking-[0.3em] flex items-center gap-1">
                    {isClosed ? <><Lock size={8}/> CERRADO</> : <><Activity size={8} className="animate-pulse"/> EN PROCESO</>}
                </p>
            </div>
        </div>

        <div className="flex items-center gap-2 flex-1 justify-center">
            {[
              { l: 'PESO NETO', v: stats.netWeight.toFixed(2), c: 'text-emerald-400', i: <Scale size={12}/> },
              { l: 'TOTAL MERMA', v: stats.mermaWeight.toFixed(2), c: 'text-red-400', i: <AlertCircle size={12}/> },
              { l: 'PROM / POLLO', v: stats.avg.toFixed(2), c: 'text-blue-400', i: <Zap size={12}/> },
              { l: 'CANTIDAD AVES', v: stats.birds, c: 'text-white', i: <Gauge size={12}/> }
            ].map((k, idx) => (
              <div key={idx} className="bg-slate-800/60 border border-white/10 px-3 py-2.5 rounded-2xl text-center min-w-[105px] shadow-inner">
                  <p className="text-[7px] font-black uppercase opacity-40 mb-1 flex items-center justify-center gap-1">{k.i} {k.l}</p>
                  <p className={`text-[15px] font-black font-mono leading-none ${k.c}`}>{k.v}</p>
              </div>
            ))}
        </div>

        <div className="flex gap-2">
           {!isClosed && (
             <button onClick={() => setShowCheckoutModal(true)} className="bg-emerald-600 hover:bg-emerald-500 p-4 rounded-2xl text-white shadow-xl transition-all active:scale-95">
               <Calculator size={24}/>
             </button>
           )}
           <button onClick={() => isClosed ? generateReportPDF() : setShowDetailModal(true)} className={`p-4 rounded-2xl border transition-all active:scale-95 ${isClosed ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-blue-400'}`}>
             <FileText size={24}/>
           </button>
        </div>
      </div>

      {/* Columnas de Pesaje en Tiempo Real (Triple Entrada) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* COLUMNA: CARGA (LLENAS) */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="bg-blue-600 p-4 flex justify-between items-center text-white shadow-lg relative z-10">
                <div className="flex items-center gap-2">
                    <ShoppingBag size={18}/>
                    <span className="font-black uppercase text-[11px] tracking-widest">CARGA - LLENAS</span>
                </div>
                <span className="bg-white/20 px-3 py-1 rounded-lg text-[10px] font-black uppercase">{stats.fullCount} JABAS</span>
            </div>
            {!isClosed && (
                <div className="p-4 bg-blue-50/50 border-b border-blue-100 flex flex-col gap-3">
                    <div className="flex gap-2">
                        <div className="flex-1 bg-white p-2 rounded-xl border border-blue-200 shadow-sm">
                            <label className="text-[7px] font-black text-blue-400 uppercase ml-1">Kilos Bruto</label>
                            <input ref={fullRef} type="number" step="0.01" className="w-full bg-transparent font-black text-3xl font-mono text-center outline-none text-blue-900" value={fullWeight} onChange={setFullWeight.bind(null)} onKeyDown={e => e.key === 'Enter' && handleAddWeight('FULL')} placeholder="0.00" />
                        </div>
                        <div className="w-24 bg-white p-2 rounded-xl border border-blue-200 shadow-sm">
                            <label className="text-[7px] font-black text-blue-400 uppercase ml-1">Cant. Jabas</label>
                            <input type="number" className="w-full bg-transparent font-black text-xl text-center outline-none text-blue-900" value={fullQty} onChange={e => setFullQty(e.target.value)} />
                        </div>
                    </div>
                    <button onClick={() => handleAddWeight('FULL')} className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-black uppercase text-[10px] shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"><Save size={16}/> REGISTRAR CARGA</button>
                </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide bg-slate-50/30">
                {stats.records.filter(r => r.type === 'FULL').map(r => (
                  <div key={r.id} className="bg-white p-3 rounded-2xl border border-slate-100 flex justify-between items-center group shadow-sm hover:border-blue-400 transition-all">
                     <div className="flex flex-col">
                        <p className="font-black text-slate-900 text-xl font-mono leading-none">{r.weight.toFixed(2)} KG</p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase mt-1.5 tracking-tighter">{r.quantity} JABAS • {new Date(r.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                     </div>
                     {!isClosed && <button onClick={() => { if(confirm('¿Eliminar esta pesada?')) { const up = {...activeOrder, records: activeOrder.records.filter(x => x.id !== r.id)}; saveOrder(up); setActiveOrder(up); }}} className="text-slate-200 hover:text-red-500 transition-colors"><X size={20}/></button>}
                  </div>
                ))}
            </div>
        </div>

        {/* COLUMNA: TARA (VACÍAS) */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="bg-orange-600 p-4 flex justify-between items-center text-white shadow-lg relative z-10">
                <div className="flex items-center gap-2">
                    <Package size={18}/>
                    <span className="font-black uppercase text-[11px] tracking-widest">TARA - VACÍAS</span>
                </div>
                <span className="bg-white/20 px-3 py-1 rounded-lg text-[10px] font-black uppercase">{stats.emptyCount} JABAS</span>
            </div>
            {!isClosed && (
                <div className="p-4 bg-orange-50/50 border-b border-orange-100 flex flex-col gap-3">
                    <div className="flex gap-2">
                        <div className="flex-1 bg-white p-2 rounded-xl border border-orange-200 shadow-sm">
                            <label className="text-[7px] font-black text-orange-400 uppercase ml-1">Kilos Tara</label>
                            <input ref={emptyRef} type="number" step="0.01" className="w-full bg-transparent font-black text-3xl font-mono text-center outline-none text-orange-900" value={emptyWeight} onChange={e => setEmptyWeight(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddWeight('EMPTY')} placeholder="0.00" />
                        </div>
                        <div className="w-24 bg-white p-2 rounded-xl border border-orange-200 shadow-sm">
                            <label className="text-[7px] font-black text-orange-400 uppercase ml-1">Cant. Jabas</label>
                            <input type="number" className="w-full bg-transparent font-black text-xl text-center outline-none text-orange-900" value={emptyQty} onChange={e => setEmptyQty(e.target.value)} />
                        </div>
                    </div>
                    <button onClick={() => handleAddWeight('EMPTY')} className="bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-black uppercase text-[10px] shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"><Save size={16}/> REGISTRAR TARA</button>
                </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide bg-slate-50/30">
                {stats.records.filter(r => r.type === 'EMPTY').map(r => (
                  <div key={r.id} className="bg-white p-3 rounded-2xl border border-slate-100 flex justify-between items-center group shadow-sm hover:border-orange-400 transition-all">
                     <div className="flex flex-col">
                        <p className="font-black text-slate-900 text-xl font-mono leading-none">{r.weight.toFixed(2)} KG</p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase mt-1.5 tracking-tighter">{r.quantity} JABAS • {new Date(r.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                     </div>
                     {!isClosed && <button onClick={() => { if(confirm('¿Eliminar esta tara?')) { const up = {...activeOrder, records: activeOrder.records.filter(x => x.id !== r.id)}; saveOrder(up); setActiveOrder(up); }}} className="text-slate-200 hover:text-red-500 transition-colors"><X size={20}/></button>}
                  </div>
                ))}
            </div>
        </div>

        {/* COLUMNA: MERMA (BAJAS) */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="bg-red-600 p-4 flex justify-between items-center text-white shadow-lg relative z-10">
                <div className="flex items-center gap-2">
                    <AlertCircle size={18}/>
                    <span className="font-black uppercase text-[11px] tracking-widest">MERMA - BAJAS</span>
                </div>
                <span className="bg-white/20 px-3 py-1 rounded-lg text-[10px] font-black uppercase">{stats.mortCount} AVES</span>
            </div>
            {!isClosed && (
                <div className="p-4 bg-red-50/50 border-b border-red-100 flex flex-col gap-3">
                    <div className="flex gap-2">
                        <div className="flex-1 bg-white p-2 rounded-xl border border-red-200 shadow-sm">
                            <label className="text-[7px] font-black text-red-400 uppercase ml-1">Kilos Merma</label>
                            <input ref={mortRef} type="number" step="0.01" className="w-full bg-transparent font-black text-3xl font-mono text-center outline-none text-red-900" value={mortWeight} onChange={e => setMortWeight(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddWeight('MORTALITY')} placeholder="0.00" />
                        </div>
                        <div className="w-24 bg-white p-2 rounded-xl border border-red-200 shadow-sm">
                            <label className="text-[7px] font-black text-red-400 uppercase ml-1">Cant. Aves</label>
                            <input type="number" className="w-full bg-transparent font-black text-xl text-center outline-none text-red-900" value={mortQty} onChange={e => setMortQty(e.target.value)} />
                        </div>
                    </div>
                    <button onClick={() => handleAddWeight('MORTALITY')} className="bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-black uppercase text-[10px] shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"><Save size={16}/> REGISTRAR MERMA</button>
                </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide bg-slate-50/30">
                {stats.records.filter(r => r.type === 'MORTALITY').map(r => (
                  <div key={r.id} className="bg-white p-3 rounded-2xl border border-slate-100 flex justify-between items-center group shadow-sm hover:border-red-400 transition-all">
                     <div className="flex flex-col">
                        <p className="font-black text-slate-900 text-xl font-mono leading-none">{r.weight.toFixed(2)} KG</p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase mt-1.5 tracking-tighter">{r.quantity} AVES • {new Date(r.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                     </div>
                     {!isClosed && <button onClick={() => { if(confirm('¿Eliminar esta merma?')) { const up = {...activeOrder, records: activeOrder.records.filter(x => x.id !== r.id)}; saveOrder(up); setActiveOrder(up); }}} className="text-slate-200 hover:text-red-500 transition-colors"><X size={20}/></button>}
                  </div>
                ))}
            </div>
        </div>

      </div>

      {/* Modal: Cierre de Operación / Checkout */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl space-y-6 border border-slate-200">
             <div className="flex justify-between items-center border-b pb-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Cierre de Venta</h3>
                <button onClick={() => { setShowCheckoutModal(false); setShowTicketPreview(false); }} className="hover:bg-slate-100 p-1 rounded-full transition-colors"><X size={24}/></button>
             </div>
             
             {!showTicketPreview ? (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-slate-900 p-6 rounded-3xl text-white text-center shadow-xl border border-white/5">
                        <p className="text-[8px] uppercase tracking-widest text-slate-400 mb-2">Neto para Liquidar</p>
                        <p className="text-4xl font-black font-mono tracking-tighter text-emerald-400">{stats.netWeight.toFixed(2)} KG</p>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-3xl border flex flex-col items-center shadow-inner">
                        <label className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Precio de Venta (S/.)</label>
                        <input type="number" step="0.01" className="bg-transparent text-center font-black text-5xl outline-none text-slate-900 font-mono w-full" value={checkoutPrice} onChange={e => setCheckoutPrice(e.target.value)} placeholder="0.00" autoFocus />
                    </div>
                    <button onClick={() => checkoutPrice ? setShowTicketPreview(true) : alert("Ingrese precio por kilo")} className="bg-blue-600 text-white w-full py-5 rounded-3xl font-black uppercase text-[11px] shadow-2xl active:scale-95 flex items-center justify-center gap-2 transition-all hover:bg-blue-700">VER RESUMEN FINAL <ChevronRight size={18}/></button>
                </div>
             ) : (
                <div className="space-y-6 animate-slide-up">
                    <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-200 border-dashed font-mono text-[11px] text-slate-700 leading-relaxed shadow-inner">
                        <p className="text-center font-black border-b border-slate-300 pb-2 mb-3 uppercase tracking-widest">DETALLE DE COBRO</p>
                        <p className="flex justify-between mb-1"><span>COMPRADOR:</span> <span className="font-black">{activeOrder.clientName}</span></p>
                        <p className="flex justify-between"><span>PESO NETO:</span> <span className="font-black">{stats.netWeight.toFixed(2)} KG</span></p>
                        <p className="flex justify-between"><span>PRECIO KG:</span> <span className="font-black">S/. {checkoutPrice}</span></p>
                        <div className="border-t-2 border-slate-400 mt-3 pt-2">
                            <p className="flex justify-between text-2xl font-black text-slate-900"><span>TOTAL:</span> <span>S/. {(stats.netWeight * parseFloat(checkoutPrice)).toFixed(2)}</span></p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={handleCheckout} className="bg-emerald-600 text-white w-full py-4 rounded-2xl font-black uppercase text-[10px] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-emerald-700">CONFIRMAR</button>
                        <button onClick={() => generateReportPDF()} className="bg-slate-900 text-white w-full py-4 rounded-2xl font-black uppercase text-[10px] shadow-xl active:scale-95 transition-all hover:bg-black">REPORTE</button>
                    </div>
                </div>
             )}
          </div>
        </div>
      )}

      {/* Modal: Detalle / Auditoría */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-slate-200">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-3">
                    <FileText size={24} className="text-blue-400"/>
                    <h3 className="font-black text-sm uppercase tracking-widest">Historial Operativo: {activeOrder.clientName}</h3>
                </div>
                <button onClick={() => setShowDetailModal(false)}><X size={24}/></button>
            </div>
            <div className="p-8 overflow-y-auto space-y-8 bg-slate-50/50 scrollbar-hide">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-3xl border border-blue-100 text-center shadow-sm">
                        <p className="text-[9px] font-black text-blue-500 uppercase mb-2">Carga Bruta</p>
                        <p className="text-2xl font-black text-slate-900 font-mono tracking-tighter">{stats.grossWeight.toFixed(2)}</p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-orange-100 text-center shadow-sm">
                        <p className="text-[9px] font-black text-orange-500 uppercase mb-2">Tara Total</p>
                        <p className="text-2xl font-black text-slate-900 font-mono tracking-tighter">{stats.tareWeight.toFixed(2)}</p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-red-100 text-center shadow-sm">
                        <p className="text-[9px] font-black text-red-500 uppercase mb-2">Merma Bajas</p>
                        <p className="text-2xl font-black text-red-600 font-mono tracking-tighter">{stats.mermaWeight.toFixed(2)}</p>
                    </div>
                    <div className="bg-emerald-600 p-6 rounded-3xl text-center text-white shadow-2xl">
                        <p className="text-[9px] font-black text-white/50 uppercase mb-2">Neto Venta</p>
                        <p className="text-3xl font-black font-mono tracking-tighter">{stats.netWeight.toFixed(2)}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-center text-[12px] border-collapse">
                            <thead className="bg-slate-50 text-slate-400 uppercase text-[9px] border-b font-black tracking-widest">
                            <tr><th className="p-4">Turno #</th><th className="p-4 text-left">Tipo</th><th className="p-4">Unidades</th><th className="p-4">Kilos</th><th className="p-4">Promedio</th><th className="p-4">Hora</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                            {activeOrder.records.map((r, i) => (
                                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 text-slate-400 font-mono">{activeOrder.records.length - i}</td>
                                <td className="p-4 text-left font-black">
                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black border uppercase ${r.type === 'FULL' ? 'bg-blue-50 text-blue-700 border-blue-200' : r.type === 'EMPTY' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                        {r.type === 'FULL' ? 'CARGA' : r.type === 'EMPTY' ? 'TARA' : 'MERMA'}
                                    </span>
                                </td>
                                <td className="p-4 font-bold text-slate-600">{r.quantity} {r.type === 'MORTALITY' ? 'AV' : 'JB'}</td>
                                <td className="p-4 font-mono font-black text-slate-900">{r.weight.toFixed(2)} KG</td>
                                <td className="p-4 text-slate-400 font-mono">{(r.weight/r.quantity).toFixed(2)}</td>
                                <td className="p-4 text-slate-400 text-[10px] uppercase font-bold">{new Date(r.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div className="p-6 border-t bg-white flex gap-4">
                <button onClick={() => setShowDetailModal(false)} className="flex-1 py-4 font-black uppercase text-[11px] text-slate-400 tracking-widest">Regresar</button>
                <button onClick={() => generateReportPDF()} className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[11px] shadow-2xl flex items-center justify-center gap-3 transition-all hover:bg-black active:scale-95"><Download size={22}/> Descargar Informe PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeighingStation;
