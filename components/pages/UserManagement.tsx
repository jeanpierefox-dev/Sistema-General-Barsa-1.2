import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../App';
import { User, UserRole, WeighingType } from '../../types';
import { getUsers, saveUser, deleteUser } from '../../services/storage';
import { Trash2, Plus, Shield, Edit, User as UserIcon, Database, CheckSquare } from 'lucide-react';

const UserManagement: React.FC = () => {
  const { user: currentUser } = useContext(AuthContext);
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State con valores por defecto seguros
  const [newUser, setNewUser] = useState<Partial<User>>({ 
      role: UserRole.OPERATOR,
      allowedModes: [WeighingType.BATCH, WeighingType.SOLO_POLLO, WeighingType.SOLO_JABAS]
  });

  useEffect(() => {
    refreshUsers();
  }, [currentUser]);

  const refreshUsers = () => {
    const all = getUsers();
    if (currentUser?.role === UserRole.ADMIN) {
      setUsers(all);
    } else {
      setUsers(all.filter(u => u.parentId === currentUser?.id || u.id === currentUser?.id));
    }
  };

  const handleEdit = (u: User) => {
    setNewUser({
        ...u,
        allowedModes: u.allowedModes || [WeighingType.BATCH, WeighingType.SOLO_POLLO, WeighingType.SOLO_JABAS]
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!newUser.username || !newUser.name || !newUser.password) {
        alert("Complete los campos obligatorios (Nombre, Usuario y Clave)");
        return;
    }
    
    const u: User = {
      id: newUser.id || Date.now().toString(),
      username: newUser.username,
      password: newUser.password,
      name: newUser.name,
      role: newUser.role as UserRole,
      parentId: newUser.parentId || (newUser.id ? undefined : currentUser?.id),
      allowedModes: newUser.allowedModes && newUser.allowedModes.length > 0 
        ? newUser.allowedModes 
        : [WeighingType.BATCH, WeighingType.SOLO_POLLO, WeighingType.SOLO_JABAS]
    };
    saveUser(u);
    setIsModalOpen(false);
    refreshUsers();
  };

  const toggleMode = (mode: WeighingType) => {
      const current = newUser.allowedModes || [];
      if (current.includes(mode)) {
          setNewUser({ ...newUser, allowedModes: current.filter(m => m !== mode) });
      } else {
          setNewUser({ ...newUser, allowedModes: [...current, mode] });
      }
  };

  const canDelete = (target: User) => {
    if (target.id === currentUser?.id) return false;
    if (currentUser?.role === UserRole.ADMIN) return true;
    if (currentUser?.role === UserRole.GENERAL && target.parentId === currentUser.id) return true;
    return false;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-black text-gray-900 uppercase">Jerarquía de Usuarios</h2>
            <p className="text-slate-500 text-sm flex items-center">
                <Shield size={14} className="text-blue-500 mr-1"/>
                Gestionando accesos para {currentUser?.role}
            </p>
        </div>
        <button 
          onClick={() => { 
              setNewUser({ role: UserRole.OPERATOR, allowedModes: [WeighingType.BATCH, WeighingType.SOLO_POLLO, WeighingType.SOLO_JABAS] }); 
              setIsModalOpen(true); 
          }}
          className="bg-blue-950 text-white px-5 py-3 rounded-xl flex items-center hover:bg-blue-900 shadow-lg font-black text-xs transition-all uppercase tracking-widest"
        >
          <Plus size={18} className="mr-2" /> Crear Nuevo Usuario
        </button>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {users.map(u => (
          <div key={u.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl transition-all flex flex-col justify-between h-full relative overflow-hidden group">
            
            <div className={`absolute top-0 right-0 px-4 py-1 rounded-bl-2xl text-[10px] font-black uppercase tracking-wider ${u.role === UserRole.ADMIN ? 'bg-purple-600 text-white' : u.role === UserRole.GENERAL ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {u.role}
            </div>

            <div className="flex items-start space-x-4 mb-6">
              <div className={`p-4 rounded-2xl ${u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
                {u.role === UserRole.ADMIN ? <Shield size={28} /> : <UserIcon size={28} />}
              </div>
              <div className="overflow-hidden">
                <p className="font-black text-slate-900 text-lg leading-tight uppercase truncate">{u.name}</p>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">ID: {u.username}</p>
              </div>
            </div>
            
            <div className="border-t border-slate-100 pt-4 mt-auto">
                <p className="text-[10px] text-slate-400 uppercase font-black mb-3 tracking-widest">Módulos Permitidos</p>
                <div className="flex gap-2 mb-6 flex-wrap">
                    {u.allowedModes?.map(mode => (
                        <span key={mode} className="text-[9px] bg-slate-50 text-slate-600 px-2 py-1 rounded-lg font-black border border-slate-100 uppercase">{mode}</span>
                    ))}
                    {(!u.allowedModes || u.allowedModes.length === 0) && <span className="text-[9px] text-red-400 font-bold">SIN PERMISOS</span>}
                </div>

                <div className="flex justify-end gap-2">
                    <button onClick={() => handleEdit(u)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit size={18}/></button>
                    {canDelete(u) && (
                        <button onClick={() => { if(confirm('¿Eliminar usuario?')) { deleteUser(u.id); refreshUsers(); }}} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18}/></button>
                    )}
                </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-blue-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 w-full max-w-md">
            <h3 className="font-black mb-8 text-2xl text-slate-900 tracking-tight">{newUser.id ? 'Editar Cuenta' : 'Nueva Cuenta'}</h3>
            <div className="space-y-5">
              <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre y Apellido</label>
                  <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 font-bold text-slate-900 outline-none focus:border-blue-500 transition-all" value={newUser.name || ''} onChange={e => setNewUser({...newUser, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Usuario (Login)</label>
                      <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 font-bold text-slate-900 outline-none focus:border-blue-500 transition-all" value={newUser.username || ''} onChange={e => setNewUser({...newUser, username: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Clave</label>
                      <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 font-bold text-slate-900 outline-none focus:border-blue-500 transition-all" value={newUser.password || ''} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                  </div>
              </div>
              
              <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Rol Asignado</label>
                  <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 font-bold text-slate-900 outline-none focus:border-blue-500 transition-all" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}>
                    <option value={UserRole.OPERATOR}>Operador / Pesaje</option>
                    {currentUser?.role === UserRole.ADMIN && <option value={UserRole.GENERAL}>Supervisor General</option>}
                    {currentUser?.role === UserRole.ADMIN && <option value={UserRole.ADMIN}>Administrador Total</option>}
                  </select>
              </div>

              <div className="pt-4 space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Accesos Permitidos</p>
                  <div className="grid grid-cols-1 gap-2">
                      {[
                        {id: WeighingType.BATCH, l: 'Control de Lotes'},
                        {id: WeighingType.SOLO_POLLO, l: 'Solo Pollo (Venta Directa)'},
                        {id: WeighingType.SOLO_JABAS, l: 'Solo Jabas'}
                      ].map(m => (
                        <button key={m.id} onClick={() => toggleMode(m.id)} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all font-bold text-xs ${newUser.allowedModes?.includes(m.id) ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                           {m.l}
                           {newUser.allowedModes?.includes(m.id) && <CheckSquare size={16}/>}
                        </button>
                      ))}
                  </div>
              </div>
            </div>
            <div className="mt-10 flex flex-col gap-2">
              <button onClick={handleSave} className="bg-blue-950 text-white w-full py-4 rounded-2xl font-black shadow-xl hover:bg-blue-900 transition-all uppercase text-xs tracking-widest">GUARDAR CAMBIOS</button>
              <button onClick={() => setIsModalOpen(false)} className="w-full text-slate-400 font-bold py-2 text-xs uppercase tracking-widest">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;