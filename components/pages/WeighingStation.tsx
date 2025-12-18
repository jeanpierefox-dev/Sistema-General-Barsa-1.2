import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WeighingType, ClientOrder, WeighingRecord, UserRole, Batch } from '../../types';
import { getOrders, saveOrder, getConfig, deleteOrder, getBatches, getUsers } from '../../services/storage';
import { ArrowLeft, Save, Printer, Eye, Package, PackageOpen, AlertOctagon, User, Lock, FileText, Settings, Edit, DollarSign, CreditCard, Banknote, CheckCircle, X, Trash2, Plus, ListChecks, Bluetooth, BarChart3, Clock, Bird, FileCheck } from 'lucide-react';
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

  const isOperator = user?.role === UserRole.OPERATOR;
  const types = [
      { t: 'FULL', l: 'JABAS LLENAS', c: [23, 37, 84], bg: 'bg-blue-900', text: 'text-blue-100' },
      { t: 'EMPTY', l: 'JABAS VACÍAS (TARA)', c: [194, 65, 12], bg: 'bg-orange-700', text: 'text-orange-100' },
      { t: 'MORTALITY', l: 'MERMA / MUERTOS', c: [185, 28, 28], bg: 'bg-red-700', text: 'text-red-100', hidden: isOperator }
  ].filter(type => !type.hidden);

  useEffect(() => {
    loadOrders();
    if (batchId) {
        const batch = getBatches().find(b => b.id === batchId);
        if (batch) setCurrentBatch(batch);
    }

    const handleUpdate = () => {
        loadOrders();
        if (activeOrder) {
            const found = getOrders().find(o => o.id === activeOrder.id);
            if (found) setActiveOrder(found);
            else setActiveOrder(null);
        }
    };
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
    let allUsers = getUsers();

    if (mode === WeighingType.BATCH && batchId) {
      allOrders = allOrders.filter(o => o.batchId === batchId);
    } else {
      allOrders = allOrders.filter(o => !o.batchId && o.weighingMode === mode);
    }

    if (user?.role === UserRole.ADMIN) {
    } else if (user?.role === UserRole.GENERAL) {
        const subordinateIds = allUsers.filter(u => u.parentId === user.id).map(u => u.id);
        allOrders = allOrders.filter(o => o.createdBy === user.id || subordinateIds.includes(o.createdBy || ''));
    } else {
        allOrders = allOrders.filter(o => o.createdBy === user?.id);
    }

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
    
    return { 
        totalFullWeight, totalEmptyWeight, totalMortWeight, 
        fullUnitsCount, emptyUnitsCount, mortCount, 
        netWeight, avgWeight, totalBirdsInitial, totalBirdsFinal
    };
  };

  const addWeight = () => {
    if (!activeOrder || !weightInput || !qtyInput) return;
    const requestedQty = parseInt(qtyInput);
    const totals = getTotals(activeOrder);

    if (activeTab === 'FULL' && activeOrder.targetCrates > 0) {
        if (totals.fullUnitsCount + requestedQty > activeOrder.targetCrates) {
            alert(`Límite de Jabas Llenas alcanzado (${activeOrder.targetCrates}).`);
            return;
        }
    }

    if (activeTab === 'EMPTY') {
        if (totals.emptyUnitsCount + requestedQty > totals.fullUnitsCount) {
            alert(`Error: Cantidad de vacías (${totals.emptyUnitsCount + requestedQty}) excede a las llenas (${totals.fullUnitsCount}).`);
            return;
        }
    }

    const record: WeighingRecord = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      weight: parseFloat(weightInput),
      quantity: requestedQty,
      type: activeTab
    };
    const updatedOrder = { ...activeOrder, records: [record, ...activeOrder.records] };
    saveOrder(updatedOrder);
    setActiveOrder(updatedOrder);
    setWeightInput('');
    weightInputRef.current?.focus();
  };

  const deleteRecord = (id: string) => {
    if(!activeOrder || !confirm('¿Eliminar esta pesada?')) return;
    const updatedOrder = { ...activeOrder, records: activeOrder.records.filter(r => r.id !== id) };
    saveOrder(updatedOrder);
    setActiveOrder(updatedOrder);
  };

  const handleConfirmCheckout = () => {
      if (!activeOrder || !checkoutPrice) {
          alert("Ingrese el precio por kilo.");
          return;
      }
      const price = parseFloat(checkoutPrice);
      const updatedOrder: ClientOrder = {
          ...activeOrder,
          pricePerKg: price,
          paymentMethod: checkoutPaymentMethod,
          status: 'CLOSED',
          paymentStatus: checkoutPaymentMethod === 'CASH' ? 'PAID' : 'PENDING'
      };
      if (checkoutPaymentMethod === 'CASH') {
          const { netWeight } = getTotals(activeOrder);
          updatedOrder.payments.push({ id: Date.now().toString(), amount: netWeight * price, timestamp: Date.now(), note: 'Cierre de cuenta' });
      }
      saveOrder(updatedOrder);
      setActiveOrder(updatedOrder);
      generateCheckoutTicket(updatedOrder);
      setShowCheckoutModal(false);
  };

  const generateDetailedCorporateReport = (order: ClientOrder) => {
      const totals = getTotals(order);
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const navy: [number, number, number] = [23, 37, 84];
      const gray: [number, number, number] = [100, 100, 100];

      // Membrete Centrado
      if (config.logoUrl) { try { doc.addImage(config.logoUrl, 'PNG', 105 - 12, 10, 24, 24); } catch {} }
      doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(navy[0], navy[1], navy[2]);
      doc.text(config.companyName.toUpperCase(), 105, 42, { align: 'center' });
      doc.setFontSize(9).setTextColor(gray[0], gray[1], gray[2]).setFont("helvetica", "normal");
      doc.text("SISTEMA DE CONTROL AVÍCOLA PROFESIONAL", 105, 47, { align: 'center' });
      doc.text(`Campaña: ${currentBatch?.name || 'Venta Directa'} | Ref: #${order.id.slice(-6)}`, 105, 52, { align: 'center' });

      doc.setDrawColor(220).line(15, 58, 195, 58);

      // Info Cliente (Layout Horizontal)
      doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(0);
      doc.text("INFORMACIÓN DE DESPACHO", 15, 66);
      doc.setFont("helvetica", "normal").setFontSize(8.5);
      doc.text(`CLIENTE: ${order.clientName.toUpperCase()}`, 15, 72);
      doc.text(`FECHA: ${new Date().toLocaleString()}`, 15, 77);
      doc.text(`CONDICIÓN: ${order.paymentMethod || 'NO DEFINIDO'}`, 140, 72);
      doc.text(`PRECIO x KG: S/. ${order.pricePerKg.toFixed(2)}`, 140, 77);

      // 1. CUADRO RESUMEN CONSOLIDADO (PRIORITARIO)
      const summaryY = 85;
      autoTable(doc, {
          startY: summaryY,
          theme: 'grid',
          headStyles: { fillColor: navy, fontSize: 8.5, halign: 'center' },
          styles: { fontSize: 8.5, halign: 'center', cellPadding: 2 },
          head: [['CONCEPTO', 'UNIDADES', 'PESO TOTAL (KG)']],
          body: [
              ['PESO BRUTO (LLENAS)', totals.fullUnitsCount, totals.totalFullWeight.toFixed(2)],
              ['TARA (VACÍAS)', totals.emptyUnitsCount, totals.totalEmptyWeight.toFixed(2)],
              ['MERMA / MUERTOS', totals.mortCount, totals.totalMortWeight.toFixed(2)],
              [{ content: 'PESO NETO FACTURABLE', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, '-', { content: totals.netWeight.toFixed(2), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]
          ],
          margin: { left: 15, right: 15 }
      });

      // 2. DETALLE DE PESAJES OPTIMIZADO (Lado a Lado para ahorrar páginas)
      const detailY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFont("helvetica", "bold").setFontSize(10).text("DESGLOSE DE PESAJES POR CATEGORÍA", 15, detailY);
      
      const colWidth = 55; // 3 columnas de 55mm = 165mm. Márgenes de 15mm. Total 195mm.
      const startX = 15;
      const gap = 5;

      const renderCompactTable = (type: string, title: string, xPos: number, headerColor: [number, number, number]) => {
          const filtered = order.records.filter(r => r.type === type);
          autoTable(doc, {
              startY: detailY + 4,
              theme: 'grid',
              headStyles: { fillColor: headerColor, fontSize: 7, halign: 'center', cellPadding: 1 },
              styles: { fontSize: 7, halign: 'center', cellPadding: 1 },
              head: [[title, 'UNDS', 'KG']],
              body: filtered.map((r, i) => [`#${filtered.length - i}`, r.quantity, r.weight.toFixed(2)]),
              margin: { left: xPos },
              tableWidth: colWidth
          });
          return (doc as any).lastAutoTable.finalY;
      };

      const y1 = renderCompactTable('FULL', 'LLENAS', startX, [23, 37, 84]);
      const y2 = renderCompactTable('EMPTY', 'TARA', startX + colWidth + gap, [194, 65, 12]);
      const y3 = renderCompactTable('MORTALITY', 'MERMA', startX + (colWidth + gap) * 2, [185, 28, 28]);

      const maxFinalY = Math.max(y1, y2, y3);

      // Firmas
      const footerY = Math.min(270, maxFinalY + 25);
      doc.setDrawColor(200).line(30, footerY, 80, footerY).line(130, footerY, 180, footerY);
      doc.setFontSize(8).setFont("helvetica", "bold").setTextColor(gray[0], gray[1], gray[2]);
      doc.text("FIRMA RESPONSABLE", 55, footerY + 5, { align: 'center' });
      doc.text("FIRMA CLIENTE", 155, footerY + 5, { align: 'center' });

      doc.save(`Reporte_Final_${order.clientName.replace(/\s+/g, '_')}.pdf`);
  };

  const generateCheckoutTicket = (order: ClientOrder) => {
    const totals = getTotals(order);
    const doc = new jsPDF({ unit: 'mm', format: [80, 150] });
    const navy: [number, number, number] = [23, 37, 84];
    let y = 8;
    
    if (config.logoUrl) { try { doc.addImage(config.logoUrl, 'PNG', 32, y, 16, 16); y += 18; } catch {} }
    doc.setFontSize(9).setFont("helvetica", "bold").text(config.companyName.toUpperCase(), 40, y, { align: 'center' });
    y += 4;
    doc.setFontSize(7).setFont("helvetica", "normal").text("COMPROBANTE DE DESPACHO", 40, y, { align: 'center' });
    y += 6;

    doc.setFontSize(7).setFont("helvetica", "bold");
    doc.text(`CLIENTE: ${order.clientName.toUpperCase()}`, 5, y); y += 3.5;
    doc.setFont("helvetica", "normal");
    doc.text(`REF: #${order.id.slice(-6)} | FECHA: ${new Date().toLocaleDateString()}`, 5, y); y += 3.5;
    
    autoTable(doc, {
        startY: y,
        theme: 'grid',
        headStyles: { fillColor: [50, 50, 50], fontSize: 6.5, halign: 'center', cellPadding: 1 },
        styles: { fontSize: 6.5, halign: 'center', cellPadding: 1 },
        head: [['ITEM', 'CANT', 'PESO KG']],
        body: [
            ['BRUTO', totals.fullUnitsCount, totals.totalFullWeight.toFixed(2)],
            ['TARA', totals.emptyUnitsCount, totals.totalEmptyWeight.toFixed(2)],
            ['MERMA', totals.mortCount, totals.totalMortWeight.toFixed(2)],
            [{ content: 'TOTAL NETO', styles: { fontStyle: 'bold' } }, '-', { content: totals.netWeight.toFixed(2), styles: { fontStyle: 'bold' } }]
        ],
        margin: { left: 4, right: 4 }
    });

    y = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(7.5).setFont("helvetica", "bold");
    doc.text(`AVES NETAS: ${totals.totalBirdsFinal}`, 5, y); y += 4;
    doc.text(`PRECIO KG: S/. ${order.pricePerKg.toFixed(2)}`, 5, y); y += 5;
    doc.setFontSize(9).text(`TOTAL: S/. ${(totals.netWeight * order.pricePerKg).toFixed(2)}`, 5, y);
    
    doc.save(`Ticket_${order.clientName}.pdf`);
  };

  const handleSaveClient = () => {
    if (!newClientName) return;
    if (editingOrder) {
        saveOrder({ ...editingOrder, clientName: newClientName, targetCrates: targetCrates });
    } else {
        const newOrder: ClientOrder = {
            id: Date.now().toString(),
            clientName: newClientName,
            targetCrates: targetCrates, 
            pricePerKg: 0,
            status: 'OPEN',
            records: [],
            batchId: batchId,
            weighingMode: mode as WeighingType,
            paymentStatus: 'PENDING',
            payments: [],
            createdBy: user?.id
        };
        saveOrder(newOrder);
    }
    closeClientModal();
  };

  const closeClientModal = () => {
      setShowClientModal(false);
      setEditingOrder(null);
      setNewClientName('');
      setTargetCrates(0);
  };

  const handleDeleteClient = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (confirm('¿Eliminar este cliente y todas sus pesadas?')) {
          deleteOrder(id);
      }
  };

  const totals = getTotals(activeOrder || { records: [], weighingMode: mode as any } as any);
  const isLocked = activeOrder?.status === 'CLOSED';

  if (!activeOrder) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 pb-4 border-b-2 border-slate-100">
            <div>
                <h2 className="text-2xl font-black text-blue-950 uppercase tracking-tight">Registro de Clientes</h2>
                <p className="text-slate-500 text-sm font-medium mt-1 uppercase">
                  {mode === WeighingType.BATCH ? `Campaña: ${currentBatch?.name || 'Cargando...'}` : `Modo Directo: ${mode}`}
                </p>
            </div>
            <div className="flex gap-4">
                <button onClick={() => navigate('/')} className="bg-white border-2 border-slate-100 text-slate-700 px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-sm flex items-center hover:bg-slate-50 transition-all"><ArrowLeft size={16} className="mr-2"/> Regresar</button>
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button 
            onClick={() => { setEditingOrder(null); setShowClientModal(true); }} 
            className="flex flex-col items-center justify-center min-h-[350px] bg-white border-4 border-dashed border-slate-200 rounded-[2.5rem] hover:bg-slate-50 hover:border-blue-600 transition-all group shadow-sm"
          >
            <div className="bg-blue-50 p-5 rounded-full shadow-inner mb-4 group-hover:scale-110 transition-transform">
                <Plus size={40} className="text-blue-600" />
            </div>
            <span className="font-black text-slate-500 uppercase text-[10px] tracking-widest text-center px-4">Nuevo Cliente</span>
          </button>
          
          {orders.map(order => {
              const oTotals = getTotals(order);
              const oClosed = order.status === 'CLOSED';
              const percent = order.targetCrates > 0 ? Math.min((oTotals.fullUnitsCount / order.targetCrates) * 100, 100) : 0;
              
              return (
                  <div key={order.id} className={`bg-white rounded-[2rem] shadow-lg border-2 transition-all duration-300 overflow-hidden flex flex-col min-h-[350px] relative cursor-pointer ${oClosed ? 'opacity-80' : 'border-slate-100 hover:border-blue-500 hover:shadow-2xl'}`} onClick={() => setActiveOrder(order)}>
                      <div className="bg-slate-900 p-5 flex justify-between items-start">
                         <div className="flex items-center space-x-3 overflow-hidden">
                             <div className={`p-2.5 rounded-xl text-white shadow-lg shrink-0 ${oClosed ? 'bg-slate-700' : 'bg-blue-600'}`}>
                                 {oClosed ? <Lock size={18} /> : <User size={18} />}
                             </div>
                             <div className="overflow-hidden">
                                <h3 className="font-black text-white text-base leading-tight uppercase truncate max-w-[130px]">{order.clientName}</h3>
                                <p className="text-slate-400 text-[8px] font-black uppercase mt-0.5 tracking-widest">#{order.id.slice(-6)}</p>
                             </div>
                         </div>
                         <div className="flex gap-1.5 shrink-0">
                             <button onClick={(e) => { e.stopPropagation(); setEditingOrder(order); setNewClientName(order.clientName); setTargetCrates(order.targetCrates); setShowClientModal(true); }} className="bg-slate-800 p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"><Edit size={14}/></button>
                             <button onClick={(e) => handleDeleteClient(e, order.id)} className="bg-slate-800 p-1.5 rounded-lg text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                         </div>
                      </div>

                      <div className="p-6 flex-1 flex flex-col justify-between">
                          <div>
                              <div className="mb-4">
                                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-2">
                                      <span className="text-slate-500">Jabas</span>
                                      <span className="text-blue-600 font-black">{oTotals.fullUnitsCount} / {order.targetCrates || '∞'}</span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-50 shadow-inner">
                                      <div className={`h-full rounded-full bg-blue-500 transition-all duration-700`} style={{ width: `${percent}%` }}></div>
                                  </div>
                              </div>

                              <div className="grid grid-cols-3 gap-2 text-center">
                                  <div className="bg-blue-50 p-2 rounded-xl border border-blue-100">
                                      <p className="text-[7px] font-black text-blue-500 uppercase mb-0.5">LLENAS</p>
                                      <p className="font-black text-slate-800 text-base leading-none">{oTotals.fullUnitsCount}</p>
                                  </div>
                                  <div className="bg-orange-50 p-2 rounded-xl border border-orange-100">
                                      <p className="text-[7px] font-black text-orange-500 uppercase mb-0.5">TARA</p>
                                      <p className="font-black text-slate-800 text-base leading-none">{oTotals.emptyUnitsCount}</p>
                                  </div>
                                  <div className="bg-red-50 p-2 rounded-xl border border-red-100">
                                      <p className="text-[7px] font-black text-red-500 uppercase mb-0.5">MERMA</p>
                                      <p className="font-black text-slate-800 text-base leading-none">{oTotals.mortCount}</p>
                                  </div>
                              </div>
                          </div>

                          <div className="mt-6 flex items-center justify-between border-t pt-3">
                             <div>
                                 <p className="text-[8px] font-black text-slate-400 uppercase">PESO NETO (KG)</p>
                                 <p className="text-base font-black text-slate-900">{oTotals.netWeight.toFixed(1)}</p>
                             </div>
                             <div className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${oClosed ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'}`}>
                                 {oClosed ? 'Liquidado' : 'Pesando'}
                             </div>
                          </div>
                      </div>
                  </div>
              );
          })}
        </div>

        {showClientModal && (
           <div className="fixed inset-0 bg-blue-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-md">
             <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 w-full max-w-sm">
                <h3 className="font-black text-2xl mb-8 text-slate-900 tracking-tight uppercase">{editingOrder ? 'Ajustar' : 'Nuevo'} Cliente</h3>
                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Nombre del Cliente</label>
                        <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-900 outline-none focus:border-blue-500 transition-all" value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Ej. Juan Pérez" autoFocus />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Meta de Jabas</label>
                        <input type="number" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-900 outline-none focus:border-blue-500 transition-all" value={targetCrates || ''} onChange={e => setTargetCrates(Number(e.target.value))} placeholder="Ej. 100" />
                    </div>
                </div>
                <div className="flex flex-col gap-3 mt-10">
                    <button onClick={handleSaveClient} className="bg-blue-950 text-white w-full py-4 rounded-xl font-black shadow-lg hover:bg-blue-900 uppercase text-[10px] tracking-widest active:scale-95 transition-all">ACEPTAR</button>
                    <button onClick={closeClientModal} className="w-full text-slate-400 font-bold py-2 text-[10px] uppercase tracking-widest">Cerrar</button>
                </div>
             </div>
           </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-3 max-w-7xl mx-auto p-1 md:p-2">
      <div className="bg-blue-950 p-2 md:p-3 rounded-2xl shadow-xl border border-blue-900 text-white flex flex-col md:flex-row justify-between items-center gap-2">
          <div className="flex items-center w-full md:w-auto">
             <button onClick={() => setActiveOrder(null)} className="p-2 bg-blue-900 rounded-lg mr-2 hover:bg-blue-800 transition-colors"><ArrowLeft size={16}/></button>
             <div className="truncate">
                 <h1 className="text-xs md:text-sm font-black truncate uppercase leading-none">{activeOrder.clientName}</h1>
                 <p className="text-[8px] text-blue-300 font-bold uppercase mt-1 tracking-widest">Meta: {activeOrder.targetCrates || '∞'}</p>
             </div>
          </div>
          <div className="flex-1 grid grid-cols-5 gap-1.5 w-full max-w-3xl">
              {[ 
                  {l: 'JABAS', v: totals.fullUnitsCount, c: 'text-blue-300'}, 
                  {l: 'POLLOS', v: totals.totalBirdsFinal, c: 'text-yellow-400'},
                  {l: 'P. BRUTO', v: totals.totalFullWeight.toFixed(1), c: 'text-white'}, 
                  {l: 'NETO KG', v: totals.netWeight.toFixed(1), c: 'text-emerald-400'}, 
                  {l: 'PROM/AVE', v: totals.avgWeight.toFixed(3), c: 'text-cyan-300'} 
              ].map((s,i) => (
                  <div key={i} className="bg-blue-900/40 py-1.5 px-1 rounded-lg text-center border border-blue-800/50">
                      <p className="text-[7px] font-black text-blue-400 uppercase mb-0.5 tracking-tighter leading-none">{s.l}</p>
                      <p className={`font-mono text-[10px] md:text-sm font-black leading-none ${s.c}`}>{s.v}</p>
                  </div>
              ))}
          </div>
          <div className="flex gap-1 w-full md:w-auto">
              <button onClick={() => setShowDetailModal(true)} className="flex-1 md:flex-none bg-blue-800 p-2 rounded-lg hover:bg-blue-700 transition-colors"><Eye size={16}/></button>
              {!isLocked ? (
                <button onClick={() => { setCheckoutPrice(''); setShowCheckoutModal(true); }} className="flex-1 md:flex-none bg-emerald-600 px-4 py-2 rounded-lg font-black text-[9px] uppercase shadow-lg hover:bg-emerald-500 transition-all flex items-center justify-center gap-1.5"><CheckCircle size={14}/> COBRAR</button>
              ) : (
                <button onClick={() => generateCheckoutTicket(activeOrder)} className="flex-1 md:flex-none bg-blue-600 px-4 py-2 rounded-lg font-black text-[9px] uppercase shadow-lg hover:bg-blue-500 transition-all flex items-center justify-center gap-1.5"><Printer size={14}/> TICKET</button>
              )}
          </div>
      </div>

      {!isLocked ? (
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex flex-col lg:flex-row gap-3 items-center">
                <div className="flex bg-slate-100 p-1 rounded-xl gap-1 w-full lg:w-auto">
                    {types.map(b => (
                        <button key={b.t} onClick={() => setActiveTab(b.t as any)} className={`px-4 py-2 rounded-lg flex-1 flex items-center justify-center gap-1.5 text-[9px] font-black transition-all ${activeTab === b.t ? `${b.bg} text-white shadow-md` : 'text-slate-400 hover:bg-white'}`}>
                            {b.t === 'FULL' ? <Package size={14}/> : b.t === 'EMPTY' ? <PackageOpen size={14}/> : <AlertOctagon size={14}/>}
                            {b.l.split(' ')[0]}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2 flex-1 w-full">
                    <div className="w-16 bg-slate-50 rounded-xl border border-slate-200 p-1 flex flex-col justify-center text-center">
                        <label className="text-[7px] font-black text-slate-400 uppercase mb-0.5">UNDS</label>
                        <input type="number" value={qtyInput} onChange={e => setQtyInput(e.target.value)} className="w-full bg-transparent text-slate-900 text-base font-black text-center outline-none" />
                    </div>
                    <div className="flex-1 relative bg-slate-50 rounded-xl border-2 border-slate-100 p-1 focus-within:border-blue-400 transition-all flex flex-col justify-center text-center">
                        <label className="text-[7px] font-black text-slate-400 uppercase mb-0.5">PESO (KG)</label>
                        <input ref={weightInputRef} type="number" step="0.01" value={weightInput} onChange={e => setWeightInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addWeight()} className="w-full bg-transparent text-slate-900 text-2xl font-black text-center outline-none" placeholder="0.00" />
                    </div>
                    <button onClick={addWeight} className="w-12 bg-blue-950 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all"><Save size={20}/></button>
                </div>
            </div>
        </div>
      ) : (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center flex flex-col items-center">
              <Lock size={24} className="text-slate-300 mb-1"/>
              <h3 className="text-[10px] font-black text-slate-800 uppercase">REGISTRO LIQUIDADO</h3>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 min-h-0 overflow-hidden pb-2">
          {types.map(sec => (
              <div key={sec.t} className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
                 <div className={`p-1.5 font-black text-[8px] text-center text-white uppercase tracking-widest ${sec.bg}`}>{sec.l}</div>
                 <div className={`flex-1 overflow-y-auto p-2 space-y-1 bg-slate-50/50`}>
                    {activeOrder.records.filter(r => r.type === sec.t).map(r => (
                       <div key={r.id} className="flex justify-between items-center p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                           <div className="flex flex-col leading-none">
                               <span className="font-mono font-black text-slate-800 text-sm">{r.weight.toFixed(2)} KG</span>
                               <span className="text-[7px] font-black text-slate-400 uppercase mt-0.5">X{r.quantity} UNDS</span>
                           </div>
                           {!isLocked && <button onClick={() => deleteRecord(r.id)} className="text-red-300 hover:text-red-600 transition-colors"><X size={14}/></button>}
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
                      <div className="flex items-center gap-3">
                          <ListChecks className="text-blue-400" />
                          <h3 className="font-black text-sm uppercase tracking-widest">Resumen de Pesaje - {activeOrder.clientName}</h3>
                      </div>
                      <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors"><X/></button>
                  </div>
                  <div className="p-6 overflow-y-auto space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-blue-50 p-6 rounded-[2rem] border-2 border-blue-200 text-center shadow-inner">
                              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center justify-center gap-2"><Package size={14}/> Solo Llenas</p>
                              <p className="font-black text-3xl text-slate-900 leading-none">{totals.totalFullWeight.toFixed(2)}</p>
                              <p className="text-[8px] font-bold text-slate-400 mt-2 uppercase">KG CONSOLIDADOS • {totals.fullUnitsCount} UND</p>
                          </div>
                          <div className="bg-orange-50 p-6 rounded-[2rem] border-2 border-orange-200 text-center shadow-inner">
                              <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2 flex items-center justify-center gap-2"><PackageOpen size={14}/> Solo Vacías</p>
                              <p className="font-black text-3xl text-slate-900 leading-none">{totals.totalEmptyWeight.toFixed(2)}</p>
                              <p className="text-[8px] font-bold text-slate-400 mt-2 uppercase">KG CONSOLIDADOS • {totals.emptyUnitsCount} UND</p>
                          </div>
                          <div className="bg-red-50 p-6 rounded-[2rem] border-2 border-red-200 text-center shadow-inner">
                              <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2 flex items-center justify-center gap-2"><AlertOctagon size={14}/> Solo Merma</p>
                              <p className="font-black text-3xl text-slate-900 leading-none">{totals.totalMortWeight.toFixed(2)}</p>
                              <p className="text-[8px] font-bold text-slate-400 mt-2 uppercase">KG CONSOLIDADOS • {totals.mortCount} UND</p>
                          </div>
                      </div>

                      <div className="bg-slate-900 p-6 rounded-[2rem] text-white flex justify-around items-center">
                          <div className="text-center">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Resultado Neto</p>
                              <p className="text-3xl font-black text-emerald-400">{totals.netWeight.toFixed(2)} KG</p>
                          </div>
                          <div className="w-px h-10 bg-slate-800"></div>
                          <div className="text-center">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Aves Despachadas</p>
                              <p className="text-3xl font-black text-yellow-400">{totals.totalBirdsFinal}</p>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {types.map(t => (
                            <div key={t.t} className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col h-[280px]">
                                <div className={`p-2 text-center text-white font-black text-[9px] uppercase ${t.bg}`}>{t.l}</div>
                                <div className="p-2 space-y-1 overflow-y-auto bg-slate-50/50 flex-1">
                                    {activeOrder.records.filter(r => r.type === t.t).map((r, i) => (
                                        <div key={r.id} className="bg-white p-2 rounded-lg border border-slate-100 flex justify-between items-center shadow-sm">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-slate-800">{r.weight.toFixed(2)} KG</span>
                                                <span className="text-[7px] text-slate-400 uppercase font-bold">Pesada #{activeOrder.records.filter(rec => rec.type === t.t).length - i}</span>
                                            </div>
                                            <span className="text-[8px] font-black text-slate-400">X{r.quantity}</span>
                                        </div>
                                    ))}
                                    {activeOrder.records.filter(r => r.type === t.t).length === 0 && (
                                        <div className="h-full flex items-center justify-center text-[8px] text-slate-300 font-black uppercase">Vacío</div>
                                    )}
                                </div>
                            </div>
                        ))}
                      </div>
                  </div>
                  <div className="p-6 bg-slate-50 border-t flex flex-col md:flex-row gap-3">
                      <button 
                        onClick={() => generateDetailedCorporateReport(activeOrder)} 
                        className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <FileCheck size={18}/> REPORTE CORPORATIVO (A4)
                      </button>
                      <div className="flex gap-3">
                        <button onClick={() => generateCheckoutTicket(activeOrder)} className="px-6 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-100 transition-colors flex items-center gap-2 font-black text-[10px] uppercase"><Printer size={20}/> TICKET</button>
                        <button onClick={() => setShowDetailModal(false)} className="px-6 bg-slate-200 text-slate-600 rounded-2xl font-black uppercase text-[10px]">Cerrar</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {showCheckoutModal && (
          <div className="fixed inset-0 bg-blue-950/80 flex items-center justify-center p-4 z-50 backdrop-blur-md">
              <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in flex flex-col">
                  <div className="p-5 bg-slate-900 text-white flex justify-between items-center"><h3 className="font-black text-xs uppercase tracking-widest">Liquidación</h3><button onClick={() => setShowCheckoutModal(false)} className="p-1.5 hover:bg-slate-800 rounded-xl"><X size={20}/></button></div>
                  <div className="p-6 space-y-6">
                      <div className="bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-200">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-3 text-center tracking-widest italic underline underline-offset-4">Ticket Consolidado</p>
                          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                             <div className="flex justify-between border-b pb-2 mb-2">
                                 <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">CLIENTE:</span>
                                 <span className="text-[10px] font-black text-slate-900 uppercase">{activeOrder?.clientName}</span>
                             </div>
                             <div className="space-y-1.5 text-[9px] font-bold text-slate-600">
                                 <div className="flex justify-between"><span>Peso Bruto:</span><span>{totals.totalFullWeight.toFixed(2)} KG</span></div>
                                 <div className="flex justify-between text-orange-600"><span>Peso Tara:</span><span>- {totals.totalEmptyWeight.toFixed(2)} KG</span></div>
                                 <div className="flex justify-between text-red-600"><span>Peso Merma:</span><span>- {totals.totalMortWeight.toFixed(2)} KG</span></div>
                                 <div className="flex justify-between pt-1 border-t font-black text-slate-900"><span>Peso Neto:</span><span>{totals.netWeight.toFixed(2)} KG</span></div>
                             </div>
                             <div className="pt-2 bg-slate-900 p-2.5 rounded-lg flex justify-between items-center text-white">
                                 <span className="text-[8px] font-black uppercase tracking-tighter">TOTAL:</span>
                                 <span className="text-base font-black text-emerald-400">S/. {(totals.netWeight * (parseFloat(checkoutPrice) || 0)).toFixed(2)}</span>
                             </div>
                          </div>
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-2 block">Precio x Kilo (S/.)</label>
                          <input type="number" step="0.01" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-black text-xl text-slate-900 outline-none focus:border-emerald-500 transition-all" value={checkoutPrice} onChange={e => setCheckoutPrice(e.target.value)} autoFocus />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => setCheckoutPaymentMethod('CASH')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-all ${checkoutPaymentMethod === 'CASH' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}><Banknote size={20}/><span className="text-[9px] font-black uppercase">Contado</span></button>
                          <button onClick={() => setCheckoutPaymentMethod('CREDIT')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-all ${checkoutPaymentMethod === 'CREDIT' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}><CreditCard size={20}/><span className="text-[9px] font-black uppercase">Crédito</span></button>
                      </div>
                  </div>
                  <div className="p-6 pt-0 flex flex-col gap-2">
                      <button onClick={handleConfirmCheckout} className="w-full bg-blue-950 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-blue-900 uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all"><Printer size={18}/> FINALIZAR E IMPRIMIR</button>
                      <button onClick={() => setShowCheckoutModal(false)} className="w-full text-slate-400 font-bold py-2 text-[10px] uppercase">Cerrar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default WeighingStation;