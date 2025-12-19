
import React, { useEffect, useState, useContext } from 'react';
import { getBatches, getOrders, getConfig } from '../../services/storage';
import { Batch, ClientOrder, WeighingRecord } from '../../types';
import { ChevronDown, ChevronUp, Package, TrendingUp, User, List, Layers, Bird, Scale, AlertCircle, PieChart, Download, FileText, Printer } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AuthContext } from '../../App';

const Reports: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const { user } = useContext(AuthContext);
  const config = getConfig();

  useEffect(() => {
      setBatches(getBatches());
      setOrders(getOrders());
  }, [user]);

  const calculateFinancials = (order: ClientOrder) => {
    const fw = order.records.filter(r => r.type === 'FULL').reduce((a, b) => a + b.weight, 0);
    const tw = order.records.filter(r => r.type === 'EMPTY').reduce((a, b) => a + b.weight, 0);
    const mw = order.records.filter(r => r.type === 'MORTALITY').reduce((a, b) => a + b.weight, 0);
    const net = fw - tw - mw;
    const birds = (order.records.filter(r => r.type === 'FULL').reduce((a, b) => a + b.quantity, 0) * 9) - 
                  order.records.filter(r => r.type === 'MORTALITY').reduce((a, b) => a + b.quantity, 0);
    return { net, birds, fullWeight: fw, emptyWeight: tw, mortWeight: mw };
  };

  const getBatchTotals = (batchId: string) => {
    const batchOrders = orders.filter(o => o.batchId === batchId);
    let tNet = 0, tFull = 0, tEmpty = 0, tMort = 0, tBirds = 0;
    batchOrders.forEach(o => {
        const fin = calculateFinancials(o);
        tNet += fin.net; tFull += fin.fullWeight; tEmpty += fin.emptyWeight; tMort += fin.mortWeight; tBirds += fin.birds;
    });
    return { tNet, tFull, tEmpty, tMort, tBirds, count: batchOrders.length, batchOrders };
  };

  const generateDividedReportPDF = (order: ClientOrder) => {
    const doc = new jsPDF();
    const navy: [number, number, number] = [15, 23, 42];
    const stats = calculateFinancials(order);
    
    // Totales del lote
    const allBatchOrders = getOrders().filter(o => o.batchId === order.batchId);
    let totalBatchWeight = 0;
    allBatchOrders.forEach(bo => {
        const boFin = calculateFinancials(bo);
        totalBatchWeight += boFin.net;
    });

    const paid = (order.payments || []).reduce((a, b) => a + b.amount, 0);
    const totalSale = stats.net * (order.pricePerKg || 0);
    const debt = totalSale - paid;

    // Header Corporativo
    doc.setFont("helvetica", "bold").setFontSize(22).setTextColor(navy[0], navy[1], navy[2]);
    doc.text(config.companyName.toUpperCase(), 105, 15, { align: 'center' });
    doc.setFontSize(9).setTextColor(100).text("REPORTE HISTÓRICO DE AUDITORÍA", 105, 21, { align: 'center' });
    doc.setDrawColor(navy[0], navy[1], navy[2]).setLineWidth(0.5).line(20, 24, 190, 24);

    doc.setFontSize(10).setTextColor(40).text(`CLIENTE: ${order.clientName}`, 20, 35);
    doc.text(`AUDITADO: ${new Date().toLocaleString()}`, 190, 35, { align: 'right' });

    // RESUMEN: Lote -> Cliente -> Deuda
    autoTable(doc, {
      startY: 42,
      head: [['INDICADOR OPERATIVO', 'RESULTADO']],
      body: [
        ['PESO TOTAL DEL LOTE (KG)', totalBatchWeight.toFixed(2)],
        ['PESO TOTAL DEL CLIENTE (KG)', stats.net.toFixed(2)],
        [{ content: 'DEUDA PENDIENTE (S/.)', styles: { fontStyle: 'bold', textColor: [180, 0, 0] } }, { content: 'S/. ' + debt.toFixed(2), styles: { fontStyle: 'bold', textColor: [180, 0, 0] } }]
      ],
      theme: 'grid',
      headStyles: { fillColor: navy, halign: 'center' },
      styles: { fontSize: 10 }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 10;

    // Detalle Dividido por Tipo
    const sections = [
      { title: 'DETALLE: JABAS LLENAS (CARGA)', type: 'FULL', color: [37, 99, 235] },
      { title: 'DETALLE: JABAS VACÍAS (TARA)', type: 'EMPTY', color: [234, 88, 12] },
      { title: 'DETALLE: MERMA (MORTALIDAD)', type: 'MORTALITY', color: [220, 38, 38] }
    ];

    sections.forEach(sec => {
      const items = order.records.filter(r => r.type === sec.type);
      if (items.length === 0) return;

      if (currentY > 260) { doc.addPage(); currentY = 20; }
      doc.setFontSize(10).setTextColor(sec.color[0], sec.color[1], sec.color[2]).text(sec.title, 20, currentY);
      
      autoTable(doc, {
        startY: currentY + 3,
        head: [['#', 'CANTIDAD', 'PESO (KG)', 'HORA']],
        body: items.map((r, i) => [
          i + 1,
          r.quantity,
          r.weight.toFixed(2),
          new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        ]),
        theme: 'striped',
        styles: { fontSize: 7, halign: 'center' },
        // Fixed: Explicitly cast to [number, number, number] tuple as required by Color type in jspdf-autotable
        headStyles: { fillColor: sec.color as [number, number, number] },
        margin: { left: 20, right: 20 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 12;
    });

    doc.save(`Auditoria_${order.clientName}_Final.pdf`);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="bg-white p-6 rounded-3xl border shadow-sm flex justify-between items-center border-slate-200">
        <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Archivo de Auditoría</h2>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Historial de Operaciones Registradas</p>
        </div>
        <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 shadow-inner"><TrendingUp size={28}/></div>
      </div>

      <div className="grid gap-4">
          {batches.map(batch => {
              const totals = getBatchTotals(batch.id);
              const isExp = expandedBatch === batch.id;
              return (
                  <div key={batch.id} className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden ${isExp ? 'border-blue-500 shadow-xl ring-4 ring-blue-50' : 'border-slate-200 shadow-sm'}`}>
                      <div className={`p-5 flex items-center justify-between cursor-pointer ${isExp ? 'bg-blue-600 text-white' : 'hover:bg-slate-50'}`} onClick={() => setExpandedBatch(isExp ? null : batch.id)}>
                          <div className="flex items-center gap-4">
                              <Package size={24} className={isExp ? 'text-white' : 'text-slate-400'}/>
                              <div>
                                  <h3 className="font-black text-sm uppercase tracking-tight">{batch.name}</h3>
                                  <p className={`text-[9px] font-bold uppercase ${isExp ? 'text-blue-100' : 'text-slate-400'}`}>{totals.count} Liquidaciones</p>
                              </div>
                          </div>
                          <div className="flex items-center gap-6">
                              <div className={`px-4 py-1.5 rounded-xl border flex items-center gap-4 ${isExp ? 'bg-white/10 border-white/20' : 'bg-blue-50 border-blue-100'}`}>
                                  <div className="text-right">
                                      <p className={`text-[7px] font-bold uppercase ${isExp ? 'text-white/60' : 'text-blue-500'}`}>Neto Lote</p>
                                      <p className={`text-base font-black font-mono leading-none ${isExp ? 'text-white' : 'text-blue-700'}`}>{totals.tNet.toFixed(1)} KG</p>
                                  </div>
                              </div>
                              {isExp ? <ChevronUp size={20}/> : <ChevronDown size={20} className="text-slate-300"/>}
                          </div>
                      </div>

                      {isExp && (
                          <div className="p-6 bg-slate-50 border-t space-y-4 animate-fade-in">
                              {totals.batchOrders.map(o => (
                                  <div key={o.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:border-blue-400 transition-all flex flex-col md:flex-row justify-between items-center gap-4">
                                      <div className="flex items-center gap-4 flex-1">
                                          <div className="bg-slate-100 p-3 rounded-xl text-slate-500 shadow-inner"><User size={20}/></div>
                                          <div>
                                              <h5 className="font-black text-slate-900 uppercase text-[14px] leading-tight tracking-tight">{o.clientName}</h5>
                                              <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{o.records.length} Pesadas Registradas</p>
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-4">
                                          <div className="bg-slate-50 px-5 py-3 rounded-2xl border text-right">
                                              <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1.5">Peso Neto</p>
                                              <p className="text-lg font-black text-blue-900 font-mono leading-none">{calculateFinancials(o).net.toFixed(1)} KG</p>
                                          </div>
                                          <button onClick={() => generateDividedReportPDF(o)} className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg hover:bg-black transition-all active:scale-95">
                                              <FileText size={20}/>
                                          </button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              );
          })}
      </div>
    </div>
  );
};

export default Reports;
