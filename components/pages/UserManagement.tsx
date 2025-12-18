import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../App';
import { User, UserRole, WeighingType } from '../../types';
import { getUsers, saveUser, deleteUser } from '../../services/storage';
import { Trash2, Plus, Shield, Edit, User as UserIcon, CheckSquare, X } from 'lucide-react';

const UserManagement: React.FC = () => {
  const { user: currentUser } = useContext(AuthContext);
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
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
        alert("Complete los campos obligatorios");
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
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-black text-gray-900 uppercase">Gestión de Accesos</h2>
            <p className="text-slate-500 text-xs flex items-center font-bold uppercase tracking-wider">
                <Shield size={12} className="text-blue-500 mr-1.5"/>
                Administrando como {currentUser?.role}
            </p>
        </div>
        <button 
          onClick={() => { 
              setNewUser({ role: UserRole.OPERATOR, allowedModes: [WeighingType.BATCH, WeighingType.SOLO_POLLO, WeighingType.SOLO_JABAS] }); 
              setIsModalOpen(true); 
          }}
          className="bg-blue-950 text-white px-6 py-3 rounded-xl flex items-center hover:bg-blue-900 shadow-lg font-black text-xs transition-all uppercase tracking-widest active:scale-95"
        >
          <Plus size={18} className="mr-2" /> Nuevo Usuario
        </button>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {users.map(u => (
          <div key={u.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl transition-all flex flex-col justify-between h-full relative overflow-hidden group">
            <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[9px] font-black uppercase tracking-wider ${u.role === UserRole.ADMIN ? 'bg-purple-600 text-white' : u.role === UserRole.GENERAL ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {u.role}
            </div>
            <div className="flex items-start space-x-4 mb-4">
              <div className={`p-3 rounded-xl ${u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-600' : 'bg-slate-50 text-slate-400'}`}>
                {u.role === UserRole.ADMIN ? <Shield size={24} /> : <UserIcon size={24} />}
              </div>
              <div className="overflow-hidden">
                <p className="font-black text-slate-900 text-base leading-tight uppercase truncate">{u.name}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Login: {u.username}</p>
              </div>
            </div>
            <div className="border-t border-slate-50 pt-3">
                <div className="flex flex-wrap gap-1 mb-4">
                    {u.allowedModes?.map(mode => (
                        <span key={mode} className="text-[8px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded-md font-black border border-slate-100 uppercase">{mode}</span>
                    ))}
                </div>
                <div className="flex justify-end gap-1">
                    <button onClick={() => handleEdit(u)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit size={16}/></button>
                    {canDelete(u) && (
                        <button onClick={() => { if(confirm('¿Eliminar usuario?')) { deleteUser(u.id); refreshUsers(); }}} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16}/></button>
                    )}
                </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-blue-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight">{newUser.id ? 'Editar Cuenta' : 'Nueva Cuenta'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                  <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 font-bold text-slate-900 outline-none focus:border-blue-500 transition-all" value={newUser.name || ''} onChange={e => setNewUser({...newUser, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuario</label>
                      <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 font-bold text-slate-900 outline-none focus:border-blue-500 transition-all" value={newUser.username || ''} onChange={e => setNewUser({...newUser, username: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clave</label>
                      <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 font-bold text-slate-900 outline-none focus:border-blue-500 transition-all" value={newUser.password || ''} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                  </div>
              </div>
              <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rol de Sistema</label>
                  <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 font-bold text-slate-900 outline-none focus:border-blue-500 transition-all appearance-none" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}>
                    <option value={UserRole.OPERATOR}>Operador (Pesaje)</option>
                    {currentUser?.role === UserRole.ADMIN && <option value={UserRole.GENERAL}>Supervisor General</option>}
                    {currentUser?.role === UserRole.ADMIN && <option value={UserRole.ADMIN}>Administrador Total</option>}
                  </select>
              </div>
              <div className="pt-2 space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Permisos de Módulo</p>
                  <div className="space-y-2">
                      {[
                        {id: WeighingType.BATCH, l: 'Control de Lotes'},
                        {id: WeighingType.SOLO_POLLO, l: 'Solo Pollo'},
                        {id: WeighingType.SOLO_JABAS, l: 'Solo Jabas'}
                      ].map(m => (
                        <button key={m.id} onClick={() => toggleMode(m.id)} className={`flex items-center justify-between w-full p-3 rounded-xl border-2 transition-all font-bold text-xs ${newUser.allowedModes?.includes(m.id) ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                           {m.l}
                           {newUser.allowedModes?.includes(m.id) && <CheckSquare size={16}/>}
                        </button>
                      ))}
                  </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-50 bg-slate-50/50 rounded-b-[2rem]">
              <button onClick={handleSave} className="bg-blue-950 text-white w-full py-4 rounded-2xl font-black shadow-xl hover:bg-blue-900 transition-all uppercase text-xs tracking-widest active:scale-95">
                ACEPTAR Y GUARDAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;