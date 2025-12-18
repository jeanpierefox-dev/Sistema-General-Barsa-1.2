import React, { useState, useEffect, useContext } from 'react';
import { getOrders, saveOrder, getConfig, getUsers } from '../../services/storage';
import { ClientOrder, WeighingType, UserRole } from '../../types';
import { Search, Clock, History, Printer, Filter, CheckCircle, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AuthContext } from '../../App';

const Collections: React.FC = () => {
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<ClientOrder | null>(null);
  const [viewHistoryOrder, setViewHistoryOrder] = useState<ClientOrder | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'BATCH' | 'SOLO_POLLO' | 'SOLO_JABAS'>('ALL');
  const { user } = useContext(AuthContext);
  const config = getConfig();

  useEffect(() => {
    refresh();
  }, [user]);

  const refresh = () => {
      const allOrders = getOrders();
      const allUsers = getUsers();
      
      if (user?.role === UserRole.ADMIN) {
          setOrders(allOrders);
      } else if (user?.role === UserRole.GENERAL) {
          const subordinateIds = allUsers.filter(u => u.parentId === user.id).map(u => u.id);
          setOrders(allOrders.filter(o => o.createdBy === user.id || subordinateIds.includes(o.createdBy || '')));
      } else {
          setOrders(allOrders.filter(o => o.createdBy === user?.id));
      }
  }

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesFilter = true;
    if (filterMode === 'BATCH') matchesFilter = !!o.batchId;
    if (filterMode === 'SOLO_POLLO') matchesFilter = o.weighingMode === WeighingType.SOLO_POLLO;
    if (filterMode === 'SOLO_JABAS') matchesFilter = o.weighingMode === WeighingType.SOLO_JABAS;
    return matchesSearch && matchesFilter;
  });

  const calculateBalance = (order: ClientOrder) => {
    const full = order.records.filter(r => r.type === 'FULL').reduce((a,b)=>a+b.weight,0);
    const empty = order.records.filter(r => r.type === 'EMPTY').reduce((a,b)=>a+b.weight,0);
    const mort = order.records.filter(r => r.type === 'MORTALITY').reduce((a,b)=>a+b.weight,0);
    let net = full - empty - mort;
    if (order.weighingMode === WeighingType.SOLO_POLLO) net = full; 
    const totalDue = net * order.pricePerKg;
    const totalPaid = order.payments.reduce((a,b) => a + b.amount, 0);
    return { totalDue, totalPaid, balance: totalDue - totalPaid };
  };

  const handlePay = () => {
    if (!selectedOrder) return;
    const amount = parseFloat(payAmount);
    if (!amount) return;
    const updatedOrder = { ...selectedOrder };
    updatedOrder.payments.push({ id: Date.now().toString(), amount: amount, timestamp: Date.now(), note: 'Abono Manual' });
    const bal = calculateBalance(updatedOrder);
    if (bal.balance <= 0.1) updatedOrder.paymentStatus = 'PAID';
    saveOrder(updatedOrder);
    refresh(); 
    setSelectedOrder(null);
    setPayAmount('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Cobranza Jerárquica</h2>
            <p className="text-gray-500 text-sm">Control de créditos y pagos de clientes</p>
          </div>
          <div className="flex bg-white rounded-lg border border-gray-200 p-1">
              <button onClick={() => setFilterMode('ALL')} className={`px-3 py-1 text-xs font-bold rounded ${filterMode === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>TODOS</button>
              <button onClick={() => setFilterMode('BATCH')} className={`px-3 py-1 text-xs font-bold rounded ${filterMode === 'BATCH' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>LOTES</button>
          </div>
      </div>
      <div className="relative">
        <input type="text" placeholder="Buscar cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:border-blue-500 outline-none font-bold text-gray-900" />
        <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
      </div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
        <table className="w-full text-left min-w-[700px]">
          <thead className="bg-gray-100 text-gray-600 uppercase text-[10px] font-bold tracking-wider">
            <tr><th className="p-4">Cliente</th><th className="p-4 text-center">Estado</th><th className="p-4 text-right">Pendiente</th><th className="p-4 text-center">Acciones</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredOrders.map(order => {
              const { totalDue, balance } = calculateBalance(order);
              const isPaid = balance <= 0.1;
              return (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-bold text-gray-900">{order.clientName}</td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{isPaid ? 'PAGADO' : 'PENDIENTE'}</span>
                  </td>
                  <td className="p-4 text-right font-black text-red-600">S/. {balance.toFixed(2)}</td>
                  <td className="p-4 text-center flex justify-center space-x-2">
                    {!isPaid && <button onClick={() => { setSelectedOrder(order); setPayAmount(balance.toFixed(2)); }} className="bg-slate-900 text-white px-4 py-1.5 rounded-lg hover:bg-slate-800 text-xs font-bold">ABONAR</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Collections;