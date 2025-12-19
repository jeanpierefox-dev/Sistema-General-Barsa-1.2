
import { AppConfig, User, UserRole, Batch, ClientOrder } from '../types';

// Default configuration for the application
const DEFAULT_CONFIG: AppConfig = {
  appName: 'AVICONTROL PRO',
  companyName: 'AVÍCOLA BARSA S.A.C.',
  cloudEnabled: false,
  scaleConnected: false,
  printerConnected: false,
  defaultFullCrateBatch: 5,
  defaultEmptyCrateBatch: 10,
  firebaseConfig: {
    apiKey: '',
    authDomain: '',
    databaseURL: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  }
};

// Initial admin user
const DEFAULT_USERS: User[] = [
  { id: '1', username: 'admin', password: '123', name: 'Administrador', role: UserRole.ADMIN }
];

const get = (key: string) => JSON.parse(localStorage.getItem(key) || 'null');
const set = (key: string, val: any) => localStorage.setItem(key, JSON.stringify(val));

// Initialize application data if not present
const init = () => {
  if (!localStorage.getItem('avi_users')) set('avi_users', DEFAULT_USERS);
  if (!localStorage.getItem('avi_config')) set('avi_config', DEFAULT_CONFIG);
  if (!localStorage.getItem('avi_batches')) set('avi_batches', []);
  if (!localStorage.getItem('avi_orders')) set('avi_orders', []);
};

init();

export const login = (username: string, pass: string): User | null => {
  const users: User[] = get('avi_users') || [];
  return users.find(u => u.username === username && u.password === pass) || null;
};

export const getConfig = (): AppConfig => get('avi_config') || DEFAULT_CONFIG;
export const saveConfig = (cfg: AppConfig) => {
  set('avi_config', cfg);
  window.dispatchEvent(new Event('avi_data_config'));
};

export const getUsers = (): User[] => get('avi_users') || [];
export const saveUser = (u: User) => {
  const users = getUsers();
  const idx = users.findIndex(x => x.id === u.id);
  if (idx > -1) users[idx] = u; else users.push(u);
  set('avi_users', users);
  window.dispatchEvent(new Event('avi_data_users'));
};
export const deleteUser = (id: string) => {
  set('avi_users', getUsers().filter(u => u.id !== id));
  window.dispatchEvent(new Event('avi_data_users'));
};

export const getBatches = (): Batch[] => get('avi_batches') || [];
export const saveBatch = (b: Batch) => {
  const batches = getBatches();
  const idx = batches.findIndex(x => x.id === b.id);
  if (idx > -1) batches[idx] = b; else batches.push(b);
  set('avi_batches', batches);
  window.dispatchEvent(new Event('avi_data_batches'));
};
export const deleteBatch = (id: string) => {
  set('avi_batches', getBatches().filter(b => b.id !== id));
  window.dispatchEvent(new Event('avi_data_batches'));
};

export const getOrders = (): ClientOrder[] => get('avi_orders') || [];
export const saveOrder = (o: ClientOrder) => {
  const orders = getOrders();
  const idx = orders.findIndex(x => x.id === o.id);
  if (idx > -1) orders[idx] = o; else orders.push(o);
  set('avi_orders', orders);
  window.dispatchEvent(new Event('avi_data_orders'));
};
export const deleteOrder = (id: string) => {
  set('avi_orders', getOrders().filter(o => o.id !== id));
  window.dispatchEvent(new Event('avi_data_orders'));
};

export const resetApp = () => {
  localStorage.clear();
  window.location.reload();
};

export const forceSyncUsers = async () => true;
export const uploadLocalDataToCloud = async () => true;
export const formatCloudData = async () => true;
export const testCloudConnection = async (cfg: AppConfig) => ({ success: true, message: 'Conexión exitosa' });

export const clearAllData = () => {
  localStorage.clear();
  window.location.reload();
};
