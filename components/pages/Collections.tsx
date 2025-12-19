
import React, { useState, useEffect, useContext } from 'react';
import { getOrders, saveOrder, getConfig } from '../../services/storage';
import { ClientOrder, Payment } from '../../types';
import { Search, History, Printer, X, Wallet, CreditCard, Scale, DollarSign, ReceiptText, ChevronRight, Activity, TrendingUp, Filter } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AuthContext } from '../../App';

const Collections: React.FC = () => {
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<ClientOrder | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [paymentInput, setPaymentInput] = useState('');
  const { user } = useContext(AuthContext);
  const config = getConfig();

  useEffect(() => { setOrders(getOrders()); }, [user]);

  const calculateFinancials = (order: ClientOrder) => {
    const fw = order.records.filter(r => r.type === 'FULL').reduce((a, b) => a + b.weight, 0);
    const tw = order.records.filter(r => r.type === 'EMPTY').reduce((a, b) => a + b.weight, 0);
    const mw = order.records.filter(r => r.type === 'MORTALITY').reduce((a, b) => a + b.weight, 0);
    const net = fw - tw - mw;
    const total = net * (order.pricePerKg || 0);
    const paid = (order.payments || []).reduce((a, b) => a + b.amount, 0);
    return { net, total, paid, balance: total - paid, price: order.pricePerKg };
  };

  const handleRegisterPayment = () => {
    if (!selectedOrder || !paymentInput) return;
    const amount = parseFloat(paymentInput);
    if (isNaN(amount) || amount <= 0) return;

    const newPayment: Payment = {
        id: Date.now().toString(),
        amount: amount,
        timestamp: Date.now(),
        note: 'Abono Manual'
    };

    const updatedOrder: ClientOrder = {
        ...selectedOrder,
        payments: [...(selectedOrder.payments || []), newPayment]
    };

    saveOrder(updatedOrder);
    setOrders(getOrders());
    setSelectedOrder(updatedOrder);
    setPaymentInput('');
    alert("¡Abono registrado con éxito!");
  };

  const printReceipt = (order: ClientOrder, payment: Payment) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <style>
            body { font-family: 'Courier New', monospace; width: 80mm; padding: 5mm; margin: 0; font-size: 13px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 10px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .amount { font-size: 18px; font-weight: bold; text-align: center; margin: 15px 0; border: 1px solid #000; padding: 5px; }
            .footer { text-align: center; margin-top: 20px; font-size: 11px; border-top: 1px dashed #000; padding-top: 10px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <strong>${config.companyName}</strong><br>
            RECIBO DE PAGO / ABONO<br>
            ${new Date(payment.timestamp).toLocaleString()}
          </div>
          <div class="row"><span>CLIENTE:</span><strong>${order.clientName}</strong></div>
          <div class="row"><span>N° TRANS:</span><span>${payment.id.substring(0,8)}</span></div>
          <div class="amount">RECIBIDO: S/. ${payment.amount.toFixed(2)}</div>
          <div class="row"><span>SALDO ANTERIOR:</span><span>S/. ${calculateFinancials(order).balance.toFixed(2)}</span></div>
          <div class="footer">¡GRACIAS POR SU PAGO!<br>Control de Cobranzas AviControl</div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const totals = orders.reduce((acc, o) => {
      const fin = calculateFinancials(o);
      acc.total += fin.total;
      acc.paid += fin.paid;
      acc.balance += fin.balance;
      return acc;
  }, { total: 0, paid: 0, balance: 0 });

  const filtered = orders.filter(o => {
    const matchSearch = o.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    const fin = calculateFinancials(o);
    if (filterMode === 'PENDING') return matchSearch && fin.balance > 0.1;
    if (filterMode === 'PAID') return matchSearch && fin.balance <= 0.1;
    return matchSearch;
  });

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-10">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase">Cartera de Clientes</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Estado Financiero de Liquidaciones</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg border shadow-inner">
                {['ALL', 'PENDING', 'PAID'].map(m => (
                  <button key={m} onClick={() => setFilterMode(m as any)} className={`px-4 py-2 text-[8px] font-black rounded-md uppercase transition-all ${filterMode === m ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                      {m === 'ALL' ? 'Todos' : m === 'PENDING' ? 'Deudores' : 'Liquidados'}
                  </button>
                ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t pt-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-[7px] font-bold text-slate-400 uppercase mb-1">Cuentas x Cobrar</p>
                  <p className="text-lg font-black text-slate-900 font-mono">S/. {totals.total.toFixed(2)}</p>
              </div>
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                  <p className="text-[7px] font-bold text-emerald-500 uppercase mb-1">Abonos Recibidos</p>
                  <p className="text-lg font-black text-emerald-600 font-mono">S/. {totals.paid.toFixed(2)}</p>
              </div>
              <div className="bg-rose-50 p-3 rounded-lg border border-rose-100">
                  <p className="text-[7px] font-bold text-rose-500 uppercase mb-1">Saldo en Deuda</p>
                  <p className="text-lg font-black text-rose-600 font-mono">S/. {totals.balance.toFixed(2)}</p>
              </div>
          </div>
      </div>

      <div className="relative">
        <input type="text" placeholder="Buscar cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 border rounded-xl shadow-sm outline-none font-bold text-slate-900 uppercase text-xs focus:border-blue-600 transition-all" />
        <Search className="absolute left-3.5 top-3.5 text-slate-300" size={16} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 text-slate-400 uppercase tracking-widest border-b font-black text-[8px]">
                    <tr>
                        <th className="p-4">Cliente</th>
                        <th className="p-4">Peso Neto</th>
                        <th className="p-4">Venta (S/.)</th>
                        <th className="p-4">Pagado</th>
                        <th className="p-4">Saldo</th>
                        <th className="p-4 text-center">Acción</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filtered.map(o => {
                        const fin = calculateFinancials(o);
                        const isPending = fin.balance > 0.1;
                        return (
                          <tr key={o.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="p-4 font-black text-slate-900 uppercase">{o.clientName}</td>
                              <td className="p-4 font-mono">{fin.net.toFixed(1)} KG</td>
                              <td className="p-4 font-black">S/. {fin.total.toFixed(2)}</td>
                              <td className="p-4 font-black text-emerald-600">S/. {fin.paid.toFixed(2)}</td>
                              <td className="p-4">
                                  <span className={`font-mono font-black ${isPending ? 'text-rose-600' : 'text-emerald-500'}`}>S/. {fin.balance.toFixed(2)}</span>
                              </td>
                              <td className="p-4 text-center">
                                  <button onClick={() => setSelectedOrder(o)} className="bg-slate-100 text-slate-400 p-2 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                                      <ChevronRight size={16}/>
                                  </button>
                              </td>
                          </tr>
                        );
                    })}
                </tbody>
            </table>
          </div>
      </div>

      {selectedOrder && (
          <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
              <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl space-y-6 border border-slate-200 overflow-y-auto max-h-[90vh]">
                  <div className="flex justify-between items-center border-b pb-3">
                    <h3 className="font-black text-slate-900 uppercase text-xs">Liquidación de Cobro</h3>
                    <button onClick={() => { setSelectedOrder(null); setPaymentInput(''); }}><X size={20}/></button>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-slate-900 p-5 rounded-xl text-white text-center">
                        <p className="text-[8px] uppercase tracking-widest text-slate-400 mb-1">Comprador</p>
                        <p className="text-sm font-black uppercase mb-3">{selectedOrder.clientName}</p>
                        <div className="flex justify-between border-t border-slate-800 pt-3">
                            <div className="text-left">
                                <p className="text-[7px] uppercase text-slate-500">Total Venta</p>
                                <p className="text-base font-black font-mono">S/. {calculateFinancials(selectedOrder).total.toFixed(2)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[7px] uppercase text-rose-500">Pendiente</p>
                                <p className="text-base font-black font-mono text-rose-400">S/. {calculateFinancials(selectedOrder).balance.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Nuevo Abono (S/.)</label>
                        <input type="number" step="0.01" className="w-full bg-white border rounded-lg px-4 py-3 font-black text-lg outline-none focus:border-blue-600" value={paymentInput} onChange={e => setPaymentInput(e.target.value)} placeholder="0.00" />
                        <button onClick={handleRegisterPayment} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg">
                          <DollarSign size={16}/> Registrar Pago
                        </button>
                    </div>

                    <div className="space-y-2">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Historial de Pagos</p>
                        {(selectedOrder.payments || []).length === 0 ? (
                            <p className="text-[9px] text-center text-slate-300 italic">No hay pagos registrados</p>
                        ) : (
                            selectedOrder.payments.map(p => (
                                <div key={p.id} className="flex justify-between items-center bg-white p-2 rounded-lg border text-[10px] group">
                                    <div className="font-bold">
                                        <p>S/. {p.amount.toFixed(2)}</p>
                                        <p className="text-[8px] text-slate-400 uppercase">{new Date(p.timestamp).toLocaleDateString()}</p>
                                    </div>
                                    <button onClick={() => printReceipt(selectedOrder, p)} className="p-2 text-slate-200 group-hover:text-slate-900 transition-colors">
                                        <Printer size={16}/>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Collections;
