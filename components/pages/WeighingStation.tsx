import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WeighingType, ClientOrder, WeighingRecord, UserRole, Batch } from '../../types';
import { getOrders, saveOrder, getConfig, deleteOrder, getBatches, getUsers } from '../../services/storage';
import { bluetooth } from '../../services/bluetooth';
// Fix: Added missing 'Edit' icon to the lucide-react import list.
import { ArrowLeft, Save, Printer, Eye, Package, PackageOpen, AlertOctagon, User, FileCheck, DollarSign, CreditCard, Banknote, CheckCircle, X, Trash2, Plus, ListChecks, Bluetooth, Loader2, Edit } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AuthContext } from '../../App';

const WeighingStation: React.FC = () => {
  const { mode, batchId } = useParams<{ mode: string; batchId?: string }>();
  const navigate = useNavigate();
  const [config, setLocalConfig] = useState(getConfig());
  const { user } = useContext(AuthContext);

  const [activeOrder, setActiveOrder] = useState<ClientOrder | null>(null);
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [currentBatch, setCurrentBatch] = useState<Batch | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  
  const [editingOrder, setEditingOrder] = useState<ClientOrder | null>(null);
  const [newClientName, setNewClientName] = useState('');
  const [targetCrates, setTargetCrates] = useState(0); 

  const [checkoutPrice, setCheckoutPrice] = useState<string>('');
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<'CASH' | 'CREDIT'>('CASH');

  const [weightInput, setWeightInput] = useState('');
  const [qtyInput, setQtyInput] = useState('');
  const [activeTab, setActiveTab] = useState<'FULL' | 'EMPTY' | 'MORTALITY'>('FULL');
  
  const weightInputRef = useRef<HTMLInputElement>(null);

  // Escucha de Balanza en Tiempo Real
  useEffect(() => {
    if (config.scaleConnected) {
      const cleanup = bluetooth.onWeightUpdate((w) => {
        setWeightInput(w.toFixed(2));
      });
      return cleanup;
    }
  }, [config.scaleConnected]);

  useEffect(() => {
    loadOrders();
    if (batchId) {
        const batch = getBatches().find(b => b.id === batchId);
        if (batch) setCurrentBatch(batch);
    }
    const handleUpdate = () => loadOrders();
    window.addEventListener('avi_data_orders', handleUpdate);
    setDefaultQuantity();
    return () => window.removeEventListener('avi_data_orders', handleUpdate);
  }, [mode, batchId]);

  useEffect(() => {
    setDefaultQuantity();
    setTimeout(() => weightInputRef.current?.focus(), 100);
  }, [activeTab]);

  const setDefaultQuantity = () => {
    if (mode === WeighingType.SOLO_POLLO) setQtyInput('10'); 
    else if (mode === WeighingType.SOLO_JABAS) setQtyInput('1'); 
    else {
      if (activeTab === 'FULL') setQtyInput(config.defaultFullCrateBatch.toString());
      if (activeTab === 'EMPTY') setQtyInput(config.defaultEmptyCrateBatch.toString());
      if (activeTab === 'MORTALITY') setQtyInput('1');
    }
  };

  const loadOrders = () => {
    let allOrders = getOrders();
    if (mode === WeighingType.BATCH && batchId) allOrders = allOrders.filter(o => o.batchId === batchId);
    else allOrders = allOrders.filter(o => !o.batchId && o.weighingMode === mode);
    allOrders.sort((a, b) => (a.status === 'OPEN' ? -1 : 1));
    setOrders(allOrders);
  };

  const getTotals = (order: ClientOrder) => {
    const full = order.records.filter(r => r.type === 'FULL');
    const empty = order.records.filter(r => r.type === 'EMPTY');
    const mort = order.records.filter(r => r.type === 'MORTALITY');
    const totalFullWeight = full.reduce((a, b) => a + b.weight, 0);
    const totalEmptyWeight = empty.reduce((a, b) => a + b.weight, 0);
    const totalMortWeight = mort.reduce((a, b) => a + b.weight, 0);
    const fullUnitsCount = full.reduce((a, b) => a + b.quantity, 0);
    const emptyUnitsCount = empty.reduce((a, b) => a + b.quantity, 0);
    const mortCount = mort.reduce((a, b) => a + b.quantity, 0);
    const netWeight = totalFullWeight - totalEmptyWeight - totalMortWeight;
    const totalBirdsInitial = fullUnitsCount * 9;
    const avgWeight = totalBirdsInitial > 0 ? ((totalFullWeight - totalEmptyWeight) / totalBirdsInitial) : 0;
    const totalBirdsFinal = Math.max(0, totalBirdsInitial - mortCount);
    return { totalFullWeight, totalEmptyWeight, totalMortWeight, fullUnitsCount, emptyUnitsCount, mortCount, netWeight, avgWeight, totalBirdsInitial, totalBirdsFinal };
  };

  const addWeight = () => {
    if (!activeOrder || !weightInput || !qtyInput) return;
    const requestedQty = parseInt(qtyInput);
    const totals = getTotals(activeOrder);
    if (activeTab === 'FULL' && activeOrder.targetCrates > 0 && (totals.fullUnitsCount + requestedQty > activeOrder.targetCrates)) return;
    const record: WeighingRecord = { id: Date.now().toString(), timestamp: Date.now(), weight: parseFloat(weightInput), quantity: requestedQty, type: activeTab };
    const updatedOrder = { ...activeOrder, records: [record, ...activeOrder.records] };
    saveOrder(updatedOrder);
    setActiveOrder(updatedOrder);
    setWeightInput('');
    weightInputRef.current?.focus();
  };

  const handleConfirmCheckout = async () => {
      if (!activeOrder || !checkoutPrice) return;
      const price = parseFloat(checkoutPrice);
      const updatedOrder: ClientOrder = { ...activeOrder, pricePerKg: price, paymentMethod: checkoutPaymentMethod, status: 'CLOSED', paymentStatus: checkoutPaymentMethod === 'CASH' ? 'PAID' : 'PENDING' };
      if (checkoutPaymentMethod === 'CASH') {
          const { netWeight } = getTotals(activeOrder);
          updatedOrder.payments.push({ id: Date.now().toString(), amount: netWeight * price, timestamp: Date.now(), note: 'Cierre' });
      }
      saveOrder(updatedOrder);
      setActiveOrder(updatedOrder);
      await generateTicket(updatedOrder);
      setShowCheckoutModal(false);
  };

  const generateTicket = async (order: ClientOrder) => {
      if (config.printerConnected) {
          const t = getTotals(order);
          const header = `${config.companyName}\nID: #${order.id.slice(-6)}\nCLIENTE: ${order.clientName}\nFECHA: ${new Date().toLocaleDateString()}\n----------------\n`;
          const body = `BRUTO: ${t.totalFullWeight.toFixed(2)} KG\nTARA: ${t.totalEmptyWeight.toFixed(2)} KG\nNETO: ${t.netWeight.toFixed(2)} KG\n----------------\nAVES: ${t.totalBirdsFinal}\nTOTAL: S/. ${(t.netWeight * order.pricePerKg).toFixed(2)}`;
          try {
              await bluetooth.printEscPos(header + body);
          } catch (e) {
              alert("Error al imprimir vía Bluetooth. Se descargará PDF.");
              generatePDFTicket(order);
          }
      } else {
          generatePDFTicket(order);
      }
  };

  const generatePDFTicket = (order: ClientOrder) => {
    const totals = getTotals(order);
    const doc = new jsPDF({ unit: 'mm', format: [80, 140] });
    let y = 10;
    doc.setFontSize(10).setFont("helvetica", "bold").text(config.companyName.toUpperCase(), 40, y, { align: 'center' }); y += 10;
    doc.setFontSize(8).text(`CLIENTE: ${order.clientName.toUpperCase()}`, 5, y); y += 5;
    doc.text(`NETO: ${totals.netWeight.toFixed(2)} KG`, 5, y); y += 5;
    doc.text(`TOTAL: S/. ${(totals.netWeight * order.pricePerKg).toFixed(2)}`, 5, y);
    doc.save(`Ticket_${order.clientName}.pdf`);
  };

  const handleSaveClient = () => {
    if (!newClientName) return;
    const o = editingOrder ? { ...editingOrder, clientName: newClientName, targetCrates } : { id: Date.now().toString(), clientName: newClientName, targetCrates, pricePerKg: 0, status: 'OPEN', records: [], batchId, weighingMode: mode as any, paymentStatus: 'PENDING', payments: [], createdBy: user?.id };
    saveOrder(o as any);
    setShowClientModal(false);
    setEditingOrder(null);
    setNewClientName('');
    setTargetCrates(0);
  };

  const totals = getTotals(activeOrder || { records: [] } as any);
  const isLocked = activeOrder?.status === 'CLOSED';

  if (!activeOrder) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b-2 pb-4">
            <div>
                <h2 className="text-2xl font-black text-blue-950 uppercase">Despacho de Mercadería</h2>
                <p className="text-slate-500 text-xs font-bold uppercase">{mode === WeighingType.BATCH ? `Lote: ${currentBatch?.name}` : `Modo: ${mode}`}</p>
            </div>
            <button onClick={() => navigate('/')} className="bg-white border-2 p-3 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"><ArrowLeft size={16}/> Volver</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button onClick={() => { setEditingOrder(null); setShowClientModal(true); }} className="flex flex-col items-center justify-center min-h-[300px] bg-white border-4 border-dashed border-slate-200 rounded-[2.5rem] hover:border-blue-600 transition-all group">
            <Plus size={40} className="text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
            <span className="font-black text-slate-400 uppercase text-[10px] tracking-widest">NUEVO CLIENTE</span>
          </button>
          {orders.map(order => {
              const ot = getTotals(order);
              return (
                  <div key={order.id} className="bg-white rounded-[2rem] shadow-lg border-2 border-slate-100 hover:border-blue-500 transition-all p-6 cursor-pointer" onClick={() => setActiveOrder(order)}>
                      <div className="flex justify-between items-start mb-4">
                          <div className="bg-blue-600 p-2 rounded-xl text-white"><User size={20}/></div>
                          <div className="flex gap-2">
                              <button onClick={(e) => { e.stopPropagation(); setEditingOrder(order); setNewClientName(order.clientName); setTargetCrates(order.targetCrates); setShowClientModal(true); }} className="text-slate-400 hover:text-blue-500"><Edit size={16}/></button>
                              <button onClick={(e) => { e.stopPropagation(); if(confirm('¿Borrar?')) deleteOrder(order.id); }} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                          </div>
                      </div>
                      <h3 className="font-black text-slate-800 text-lg uppercase truncate mb-1">{order.clientName}</h3>
                      <div className="grid grid-cols-2 gap-2 mt-4">
                          <div className="bg-slate-50 p-2 rounded-xl text-center"><p className="text-[7px] font-black text-slate-400 uppercase">PESO NETO</p><p className="font-black text-slate-900">{ot.netWeight.toFixed(1)} KG</p></div>
                          <div className="bg-slate-50 p-2 rounded-xl text-center"><p className="text-[7px] font-black text-slate-400 uppercase">JABAS</p><p className="font-black text-slate-900">{ot.fullUnitsCount}</p></div>
                      </div>
                  </div>
              );
          })}
        </div>
        {showClientModal && (
           <div className="fixed inset-0 bg-blue-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-md">
             <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-sm">
                <h3 className="font-black text-xl mb-6 uppercase text-slate-900">{editingOrder ? 'Editar' : 'Nuevo'} Cliente</h3>
                <input className="w-full bg-slate-50 border-2 rounded-xl px-4 py-3 font-bold mb-4 outline-none focus:border-blue-500" value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Nombre del Cliente" />
                <input type="number" className="w-full bg-slate-50 border-2 rounded-xl px-4 py-3 font-bold mb-6 outline-none focus:border-blue-500" value={targetCrates || ''} onChange={e => setTargetCrates(Number(e.target.value))} placeholder="Meta de Jabas" />
                <button onClick={handleSaveClient} className="bg-blue-950 text-white w-full py-4 rounded-xl font-black uppercase text-[11px] tracking-widest shadow-lg">ACEPTAR</button>
             </div>
           </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-3 max-w-7xl mx-auto p-2">
      <div className="bg-blue-950 p-3 rounded-2xl shadow-xl text-white flex justify-between items-center gap-4">
          <div className="flex items-center">
             <button onClick={() => setActiveOrder(null)} className="p-2 bg-blue-900 rounded-lg mr-3"><ArrowLeft size={16}/></button>
             <div>
                 <h1 className="text-sm font-black uppercase truncate">{activeOrder.clientName}</h1>
                 {config.scaleConnected && <div className="flex items-center gap-1.5 text-[8px] text-emerald-400 font-black uppercase tracking-widest animate-pulse"><Bluetooth size={10}/> Balanza Activa</div>}
             </div>
          </div>
          <div className="flex-1 grid grid-cols-4 gap-2">
              <div className="bg-blue-900/40 p-2 rounded-lg text-center"><p className="text-[7px] text-blue-400 uppercase font-black">NETO KG</p><p className="font-mono text-sm font-black text-emerald-400">{totals.netWeight.toFixed(1)}</p></div>
              <div className="bg-blue-900/40 p-2 rounded-lg text-center"><p className="text-[7px] text-blue-400 uppercase font-black">JABAS</p><p className="font-mono text-sm font-black">{totals.fullUnitsCount}</p></div>
              <div className="bg-blue-900/40 p-2 rounded-lg text-center"><p className="text-[7px] text-blue-400 uppercase font-black">AVES</p><p className="font-mono text-sm font-black text-yellow-400">{totals.totalBirdsFinal}</p></div>
              <div className="bg-blue-900/40 p-2 rounded-lg text-center"><p className="text-[7px] text-blue-400 uppercase font-black">PROM</p><p className="font-mono text-sm font-black text-cyan-300">{totals.avgWeight.toFixed(3)}</p></div>
          </div>
          <div className="flex gap-2">
              <button onClick={() => setShowDetailModal(true)} className="bg-blue-800 p-2 rounded-lg"><Eye size={18}/></button>
              {!isLocked && <button onClick={() => setShowCheckoutModal(true)} className="bg-emerald-600 px-4 py-2 rounded-lg font-black text-[9px] uppercase flex items-center gap-2"><CheckCircle size={14}/> COBRAR</button>}
          </div>
      </div>

      {!isLocked ? (
        <div className="bg-white p-4 rounded-2xl shadow-sm border flex flex-col md:flex-row gap-4">
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1 flex-1 md:flex-none">
                <button onClick={() => setActiveTab('FULL')} className={`px-4 py-3 rounded-lg flex-1 text-[10px] font-black uppercase transition-all ${activeTab === 'FULL' ? 'bg-blue-900 text-white' : 'text-slate-400'}`}>Llenas</button>
                <button onClick={() => setActiveTab('EMPTY')} className={`px-4 py-3 rounded-lg flex-1 text-[10px] font-black uppercase transition-all ${activeTab === 'EMPTY' ? 'bg-orange-600 text-white' : 'text-slate-400'}`}>Vacías</button>
                <button onClick={() => setActiveTab('MORTALITY')} className={`px-4 py-3 rounded-lg flex-1 text-[10px] font-black uppercase transition-all ${activeTab === 'MORTALITY' ? 'bg-red-600 text-white' : 'text-slate-400'}`}>Merma</button>
            </div>
            <div className="flex-1 flex gap-2">
                <div className="w-20 bg-slate-50 border rounded-xl p-2 text-center">
                    <label className="text-[7px] font-black text-slate-400 uppercase">UNDS</label>
                    <input type="number" value={qtyInput} onChange={e => setQtyInput(e.target.value)} className="w-full bg-transparent text-lg font-black text-center outline-none" />
                </div>
                <div className="flex-1 bg-slate-50 border-2 rounded-xl p-2 focus-within:border-blue-500 flex flex-col justify-center">
                    <label className="text-[7px] font-black text-slate-400 uppercase text-center">PESO (KG)</label>
                    <div className="relative">
                      <input ref={weightInputRef} type="number" step="0.01" value={weightInput} onChange={e => setWeightInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addWeight()} className="w-full bg-transparent text-3xl font-black text-center outline-none" placeholder="0.00" />
                      {config.scaleConnected && <div className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-500 animate-pulse"><Bluetooth size={16}/></div>}
                    </div>
                </div>
                <button onClick={addWeight} className="bg-blue-950 text-white px-6 rounded-xl shadow-lg active:scale-95 transition-all"><Save size={24}/></button>
            </div>
        </div>
      ) : (
          <div className="bg-white p-6 rounded-2xl shadow-sm border text-center flex flex-col items-center">
              <h3 className="text-sm font-black text-slate-800 uppercase">VENTA FINALIZADA</h3>
          </div>
      )}

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden min-h-0">
          {['FULL', 'EMPTY', 'MORTALITY'].map(type => (
              <div key={type} className="bg-white rounded-xl border flex flex-col overflow-hidden">
                  <div className={`p-2 text-center text-white text-[9px] font-black uppercase ${type === 'FULL' ? 'bg-blue-900' : type === 'EMPTY' ? 'bg-orange-600' : 'bg-red-600'}`}>{type}</div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-50">
                      {activeOrder.records.filter(r => r.type === type).map(r => (
                          <div key={r.id} className="bg-white p-3 rounded-lg border shadow-sm flex justify-between items-center">
                              <div><p className="font-mono font-black text-slate-800">{r.weight.toFixed(2)} KG</p><p className="text-[8px] text-slate-400 font-bold uppercase">X{r.quantity} UND</p></div>
                              {!isLocked && <button onClick={() => { if(confirm('¿Borrar?')) { const u = {...activeOrder, records: activeOrder.records.filter(rec => rec.id !== r.id)}; saveOrder(u); setActiveOrder(u); } }} className="text-red-300 hover:text-red-500"><X size={16}/></button>}
                          </div>
                      ))}
                  </div>
              </div>
          ))}
      </div>

      {showDetailModal && (
          <div className="fixed inset-0 bg-blue-950/80 flex items-center justify-center p-4 z-[60] backdrop-blur-md">
              <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                  <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                      <h3 className="font-black text-sm uppercase tracking-widest">Resumen - {activeOrder.clientName}</h3>
                      <button onClick={() => setShowDetailModal(false)} className="p-2"><X/></button>
                  </div>
                  <div className="p-6 overflow-y-auto space-y-6">
                      <div className="grid grid-cols-3 gap-4">
                          <div className="bg-blue-50 p-4 rounded-2xl border text-center"><p className="text-[9px] font-black text-blue-600 uppercase mb-1">BRUTO</p><p className="font-black text-2xl">{totals.totalFullWeight.toFixed(2)}</p></div>
                          <div className="bg-orange-50 p-4 rounded-2xl border text-center"><p className="text-[9px] font-black text-orange-600 uppercase mb-1">TARA</p><p className="font-black text-2xl">{totals.totalEmptyWeight.toFixed(2)}</p></div>
                          <div className="bg-red-50 p-4 rounded-2xl border text-center"><p className="text-[9px] font-black text-red-600 uppercase mb-1">MERMA</p><p className="font-black text-2xl">{totals.totalMortWeight.toFixed(2)}</p></div>
                      </div>
                      <div className="bg-slate-900 p-6 rounded-3xl text-center text-white"><p className="text-xs uppercase font-black text-slate-400 mb-2">RESULTADO NETO</p><p className="text-4xl font-black text-emerald-400">{totals.netWeight.toFixed(2)} KG</p></div>
                  </div>
                  <div className="p-6 bg-slate-50 border-t flex gap-3">
                      <button onClick={() => generatePDFTicket(activeOrder)} className="flex-1 bg-white border-2 p-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2"><Printer size={18}/> PDF TICKET</button>
                      <button onClick={() => setShowDetailModal(false)} className="flex-1 bg-slate-200 p-4 rounded-2xl font-black uppercase text-[10px]">Cerrar</button>
                  </div>
              </div>
          </div>
      )}

      {showCheckoutModal && (
          <div className="fixed inset-0 bg-blue-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-md">
              <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl p-8">
                  <div className="flex justify-between items-center mb-8"><h3 className="font-black text-xl uppercase text-slate-900">Liquidación</h3><button onClick={() => setShowCheckoutModal(false)}><X size={24}/></button></div>
                  <div className="space-y-6 mb-10">
                      <div className="bg-slate-900 p-6 rounded-2xl text-white flex justify-between items-center"><span className="text-xs font-black uppercase text-blue-400">Total Neto:</span><span className="text-3xl font-black text-emerald-400">{totals.netWeight.toFixed(2)} KG</span></div>
                      <input type="number" step="0.01" className="w-full bg-slate-50 border-4 border-slate-100 rounded-2xl p-6 font-black text-3xl outline-none focus:border-emerald-500" value={checkoutPrice} onChange={e => setCheckoutPrice(e.target.value)} placeholder="Precio S/. 0.00" autoFocus />
                      <div className="grid grid-cols-2 gap-4">
                          <button onClick={() => setCheckoutPaymentMethod('CASH')} className={`p-4 rounded-2xl border-2 font-black text-[10px] uppercase transition-all ${checkoutPaymentMethod === 'CASH' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-inner' : 'bg-slate-50 text-slate-400'}`}>EFECTIVO</button>
                          <button onClick={() => setCheckoutPaymentMethod('CREDIT')} className={`p-4 rounded-2xl border-2 font-black text-[10px] uppercase transition-all ${checkoutPaymentMethod === 'CREDIT' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-inner' : 'bg-slate-50 text-slate-400'}`}>CRÉDITO</button>
                      </div>
                  </div>
                  <button onClick={handleConfirmCheckout} className="w-full bg-blue-950 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                      {config.printerConnected ? <Bluetooth size={20}/> : <Printer size={20}/>}
                      {config.printerConnected ? 'IMPRIMIR TICKET BLUETOOTH' : 'FINALIZAR Y DESCARGAR TICKET'}
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default WeighingStation;