import { User, UserRole, Batch, ClientOrder, AppConfig } from '../types';

const KEYS = {
  USERS: 'avi_users',
  BATCHES: 'avi_batches',
  ORDERS: 'avi_orders',
  CONFIG: 'avi_config',
  SESSION: 'avi_session'
};

const safeParse = (key: string, fallback: any) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (e) {
        console.warn(`Data corruption detected in ${key}. Resetting to default.`);
        return fallback;
    }
};

const seedData = () => {
  if (localStorage.getItem(KEYS.USERS) === null) {
    const admin: User = {
      id: 'admin-1',
      username: 'admin',
      password: '123',
      name: 'Administrador Principal',
      role: UserRole.ADMIN
    };
    localStorage.setItem(KEYS.USERS, JSON.stringify([admin]));
  }
  if (localStorage.getItem(KEYS.CONFIG) === null) {
    const config: AppConfig = {
      companyName: 'Avícola Barsa',
      logoUrl: '',
      printerConnected: false,
      scaleConnected: false,
      defaultFullCrateBatch: 5,
      defaultEmptyCrateBatch: 10,
      cloudEnabled: false,
      firebaseConfig: {
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: '',
        databaseURL: ''
      }
    };
    localStorage.setItem(KEYS.CONFIG, JSON.stringify(config));
  }
};

seedData();

export const getUsers = (): User[] => safeParse(KEYS.USERS, []);
export const saveUser = (user: User) => {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx >= 0) users[idx] = user;
  else users.push(user);
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  window.dispatchEvent(new Event('avi_data_users'));
};
export const deleteUser = (id: string) => {
  const users = getUsers().filter(u => u.id !== id);
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  window.dispatchEvent(new Event('avi_data_users'));
};
export const login = (u: string, p: string): User | null => {
  const users = getUsers();
  return users.find(user => user.username === u && user.password === p) || null;
};

export const getBatches = (): Batch[] => safeParse(KEYS.BATCHES, []);
export const saveBatch = (batch: Batch) => {
  const batches = getBatches();
  const idx = batches.findIndex(b => b.id === batch.id);
  if (idx >= 0) batches[idx] = batch;
  else batches.push(batch);
  localStorage.setItem(KEYS.BATCHES, JSON.stringify(batches));
  window.dispatchEvent(new Event('avi_data_batches'));
};
export const deleteBatch = (id: string) => {
  const batches = getBatches().filter(b => b.id !== id);
  localStorage.setItem(KEYS.BATCHES, JSON.stringify(batches));
  // Also delete associated orders
  const orders = getOrders().filter(o => o.batchId !== id);
  localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
  window.dispatchEvent(new Event('avi_data_batches'));
  window.dispatchEvent(new Event('avi_data_orders'));
};

export const getOrders = (): ClientOrder[] => safeParse(KEYS.ORDERS, []);
export const saveOrder = (order: ClientOrder) => {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === order.id);
  if (idx >= 0) orders[idx] = order;
  else orders.push(order);
  localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
  window.dispatchEvent(new Event('avi_data_orders'));
};
export const deleteOrder = (id: string) => {
  const orders = getOrders().filter(o => o.id !== id);
  localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
  window.dispatchEvent(new Event('avi_data_orders'));
};
export const getOrdersByBatch = (batchId: string) => getOrders().filter(o => o.batchId === batchId);

export const getConfig = (): AppConfig => safeParse(KEYS.CONFIG, {});
export const saveConfig = (cfg: AppConfig) => {
  localStorage.setItem(KEYS.CONFIG, JSON.stringify(cfg));
  window.dispatchEvent(new Event('avi_data_config'));
};

export const resetApp = () => {
  localStorage.clear();
  seedData();
  window.location.reload();
};