import React, { useEffect, useState, useContext } from 'react';
import { getBatches, getOrders, getConfig, getUsers } from '../../services/storage';
import { Batch, ClientOrder, WeighingType, UserRole } from '../../types';
import { ChevronDown, ChevronUp, Package, ShoppingCart, List, Printer, AlertOctagon, FileText } from 'lucide-react';
import { AuthContext } from '../../App';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const { user } = useContext(AuthContext);
  const config = getConfig();

  useEffect(() => {
    refresh();
  }, [user]);

  const refresh = () => {
      const allBatches = getBatches();
      const allOrders = getOrders();
      const allUsers = getUsers();
      
      if (user?.role === UserRole.ADMIN) {
          setBatches(allBatches);
          setOrders(allOrders);
      } else if (user?.role === UserRole.GENERAL) {
          const subordinateIds = allUsers.filter(u => u.parentId === user.id).map(u => u.id);
          setBatches(allBatches.filter(b => b.createdBy === user.id || subordinateIds.includes(b.createdBy || '')));
          setOrders(allOrders.filter(o => o.createdBy === user.id || subordinateIds.includes(o.createdBy || '')));
      } else {
          setBatches(allBatches.filter(b => b.createdBy === user?.id));
          setOrders(allOrders.filter(o => o.createdBy === user?.id));
      }
  }

  const getStats = (filterFn: (o: ClientOrder) => boolean) => {
    const filteredOrders = orders.filter(filterFn);
    let totalFull = 0, totalEmpty = 0, totalNet = 0, totalMort = 0;
    let totalFullCount = 0, totalMortCount = 0;
    
    filteredOrders.forEach(o => {
      const wFull = o.records.filter(r => r.type === 'FULL').reduce((a, b) => a + b.weight, 0);
      const wEmpty = o.records.filter(r => r.type === 'EMPTY').reduce((a, b) => a + b.weight, 0);
      const wMort = o.records.filter(r => r.type === 'MORTALITY').reduce((a, b) => a + b.weight, 0);
      const qFull = o.records.filter(r => r.type === 'FULL').reduce((a, b) => a + b.quantity, 0);
      const qMort = o.records.filter(r => r.type === 'MORTALITY').reduce((a, b) => a + b.quantity, 0);

      totalFull += wFull; totalEmpty += wEmpty; totalMort += wMort;
      totalFullCount += qFull; totalMortCount += qMort;
      let net = wFull - wEmpty - wMort;
      if (o.weighingMode === WeighingType.SOLO_POLLO) net = wFull;
      totalNet += net;
    });

    const totalBirdsFinal = Math.max(0, (totalFullCount * 9) - totalMortCount);
    const avgWeight = totalFullCount > 0 ? ((totalFull - totalEmpty) / (totalFullCount * 9)) : 0;
    return { totalFull, totalEmpty, totalMort, totalNet, orderCount: filteredOrders.length, batchOrders: filteredOrders, totalBirdsFinal, avgWeight };
  };

  const printBatchReport = (batchName: string, stats: any) => {
      const doc = new jsPDF();
      const navy: [number, number, number] = [23, 37, 84];

      if (config.logoUrl) { try { doc.addImage(config.logoUrl, 'PNG', 105 - 12, 10, 24, 24); } catch {} }
      doc.setFont("helvetica", "bold").setFontSize(22).setTextColor(navy[0], navy[1], navy[2]);
      doc.text(config.companyName.toUpperCase(), 105, 42, { align: 'center' });
      doc.setFontSize(11).setTextColor(100).text("LIQUIDACIÓN CONSOLIDADA DE CAMPAÑA", 105, 50, { align: 'center' });
      doc.text(`LOTE: ${batchName.toUpperCase()}  |  EMISIÓN: ${new Date().toLocaleString()}`, 105, 58, { align: 'center' });

      autoTable(doc, {
        startY: 68,
        theme: 'grid',
        headStyles: { fillColor: navy, fontSize: 10, halign: 'center' },
        head: [['CONCEPTO OPERATIVO', 'DATO / CANTIDAD', 'PESO KG']],
        body: [
            ['PESO BRUTO TOTAL', stats.batchOrders.length + ' Clientes', stats.totalFull.toFixed(2)],
            ['PESO TARA TOTAL', '-', stats.totalEmpty.toFixed(2)],
            ['MERMA / MUERTOS', '-', stats.totalMort.toFixed(2)],
            [{ content: 'PESO NETO FACTURABLE', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } }, '-', { content: stats.totalNet.toFixed(2), styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } }],
            [{ content: 'TOTAL POLLOS NETOS', styles: { fontStyle: 'bold' } }, { content: stats.totalBirdsFinal.toString(), styles: { fontStyle: 'bold' } }, '-'],
            [{ content: 'PROMEDIO POR AVE', styles: { fontStyle: 'bold' } }, '-', { content: stats.avgWeight.toFixed(3) + ' KG', styles: { fontStyle: 'bold' } }]
        ],
        styles: { fontSize: 9, halign: 'center', cellPadding: 3 }
      });

      doc.save(`Lote_${batchName}.pdf`);
  };

  const ReportCard = ({ id, title, subtitle, icon, stats }: any) => {
      const isExpanded = expandedBatch === id;
      return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-6 transition-all hover:shadow-md">
            <div className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setExpandedBatch(isExpanded ? null : id)}>
                <div className="flex items-center space-x-5">
                    <div className={`p-4 rounded-2xl ${id === 'direct-sales' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-800'}`}>{icon}</div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 leading-none uppercase tracking-tight">{title}</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">{subtitle} • {stats.orderCount} Clientes</p>
                    </div>
                </div>
                <div className="flex items-center gap-10">
                    <div className="text-right hidden sm:block">
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Kg Netos</p>
                        <p className="text-2xl font-black text-slate-900">{stats.totalNet.toFixed(1)}</p>
                    </div>
                    {isExpanded ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                </div>
            </div>

            {isExpanded && (
            <div className="bg-slate-50 border-t border-slate-200 p-6 animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Análisis de Campaña</h4>
                    <button onClick={() => printBatchReport(title, stats)} className="flex items-center text-[10px] font-black text-blue-800 bg-white border-2 border-blue-100 px-5 py-3 rounded-xl hover:bg-blue-50 transition-all uppercase tracking-widest"><Printer size={16} className="mr-2"/> Reporte PDF</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center shadow-sm">
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Aves Netas</p>
                        <p className="font-black text-2xl text-emerald-600">{stats.totalBirdsFinal}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center shadow-sm">
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Merma Total</p>
                        <p className="font-black text-2xl text-red-600">{stats.totalMort.toFixed(1)} KG</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center shadow-sm">
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Kg Brutos</p>
                        <p className="font-black text-2xl text-blue-900">{stats.totalFull.toFixed(1)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center shadow-sm">
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Promedio Ave</p>
                        <p className="font-black text-2xl text-slate-800">{stats.avgWeight.toFixed(3)}</p>
                    </div>
                </div>
            </div>
            )}
        </div>
      );
  }

  const directSalesStats = getStats(o => !o.batchId);

  return (
    <div className="space-y-8 pb-10">
      <div><h2 className="text-3xl font-black text-blue-950 uppercase tracking-tight">Reportes de Producción</h2><p className="text-slate-500 font-medium">Información consolidada por jerarquía</p></div>
      <div>
        {directSalesStats.orderCount > 0 && ( <ReportCard id="direct-sales" title="Operaciones Express" subtitle="Ventas Fuera de Lote" icon={<ShoppingCart size={28}/>} stats={directSalesStats} /> )}
        {batches.map(batch => {
          const stats = getStats(o => o.batchId === batch.id);
          return ( <ReportCard key={batch.id} id={batch.id} title={batch.name} subtitle="Campaña en Proceso" icon={<Package size={28}/>} stats={stats} /> );
        })}
      </div>
    </div>
  );
};

export default Reports;