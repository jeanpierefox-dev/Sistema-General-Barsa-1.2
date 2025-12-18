
import { User, UserRole, Batch, ClientOrder, AppConfig, WeighingType } from '../types';
import { initializeApp } from 'https://esm.sh/firebase@11.3.1/app';
import { getDatabase, ref, onValue, set, off, get } from 'https://esm.sh/firebase@11.3.1/database';

const KEYS = {
  USERS: 'avi_users',
  BATCHES: 'avi_batches',
  ORDERS: 'avi_orders',
  CONFIG: 'avi_config',
  SESSION: 'avi_session'
};

let firebaseApp: any = null;
let firebaseDb: any = null;

const safeParse = (key: string, fallback: any) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (e) {
        return fallback;
    }
};

// --- Firebase Sync Logic ---

const initFirebase = (config: AppConfig) => {
    if (!config.cloudEnabled || !config.firebaseConfig.apiKey) return;
    try {
        if (!firebaseApp) {
            firebaseApp = initializeApp(config.firebaseConfig);
            firebaseDb = getDatabase(firebaseApp);
            setupListeners();
        }
    } catch (e) {
        console.error("Firebase Init Error:", e);
    }
};

const setupListeners = () => {
    if (!firebaseDb) return;
    
    // Escuchar cambios en toda la base de datos de esta empresa
    const dbRef = ref(firebaseDb, 'data/');
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            if (data.users) localStorage.setItem(KEYS.USERS, JSON.stringify(Object.values(data.users)));
            if (data.batches) localStorage.setItem(KEYS.BATCHES, JSON.stringify(Object.values(data.batches)));
            if (data.orders) localStorage.setItem(KEYS.ORDERS, JSON.stringify(Object.values(data.orders)));
            
            // Notificar a la UI
            window.dispatchEvent(new Event('avi_data_users'));
            window.dispatchEvent(new Event('avi_data_batches'));
            window.dispatchEvent(new Event('avi_data_orders'));
        }
    });
};

const pushToCloud = async (path: string, data: any) => {
    const config = getConfig();
    if (!config.cloudEnabled || !firebaseDb) return;
    try {
        await set(ref(firebaseDb, `data/${path}`), data);
    } catch (e) {
        console.error("Cloud Push Error:", e);
    }
};

// --- Seed Data ---

const seedData = () => {
  const existingUsers = safeParse(KEYS.USERS, []);
  if (existingUsers.length === 0) {
    const defaultModes = [WeighingType.BATCH, WeighingType.SOLO_POLLO, WeighingType.SOLO_JABAS];
    const admin: User = {
      id: 'admin-1', username: 'admin', password: '123',
      name: 'Administrador Barsa', role: UserRole.ADMIN, allowedModes: defaultModes
    };
    localStorage.setItem(KEYS.USERS, JSON.stringify([admin]));
  }

  if (localStorage.getItem(KEYS.CONFIG) === null) {
    const config: AppConfig = {
      companyName: 'Avícola Barsa', logoUrl: '',
      printerConnected: false, scaleConnected: false,
      defaultFullCrateBatch: 5, defaultEmptyCrateBatch: 10,
      cloudEnabled: false,
      firebaseConfig: {
        apiKey: '', authDomain: '', projectId: '', storageBucket: '',
        messagingSenderId: '', appId: '', databaseURL: ''
      }
    };
    localStorage.setItem(KEYS.CONFIG, JSON.stringify(config));
  }
};

seedData();

// --- Exported Methods ---

export const getUsers = (): User[] => safeParse(KEYS.USERS, []);
export const saveUser = (user: User) => {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx >= 0) users[idx] = user; else users.push(user);
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  pushToCloud('users', users);
  window.dispatchEvent(new Event('avi_data_users'));
};

export const deleteUser = (id: string) => {
  const users = getUsers().filter(u => u.id !== id);
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  pushToCloud('users', users);
  window.dispatchEvent(new Event('avi_data_users'));
};

export const login = (u: string, p: string): User | null => {
  const users = getUsers();
  return users.find(user => user.username.toLowerCase() === u.toLowerCase() && user.password === p) || null;
};

export const getBatches = (): Batch[] => safeParse(KEYS.BATCHES, []);
export const saveBatch = (batch: Batch) => {
  const batches = getBatches();
  const idx = batches.findIndex(b => b.id === batch.id);
  if (idx >= 0) batches[idx] = batch; else batches.push(batch);
  localStorage.setItem(KEYS.BATCHES, JSON.stringify(batches));
  pushToCloud('batches', batches);
  window.dispatchEvent(new Event('avi_data_batches'));
};

export const deleteBatch = (id: string) => {
  const batches = getBatches().filter(b => b.id !== id);
  localStorage.setItem(KEYS.BATCHES, JSON.stringify(batches));
  pushToCloud('batches', batches);
  window.dispatchEvent(new Event('avi_data_batches'));
};

export const getOrders = (): ClientOrder[] => safeParse(KEYS.ORDERS, []);
export const saveOrder = (order: ClientOrder) => {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === order.id);
  if (idx >= 0) orders[idx] = order; else orders.push(order);
  localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
  pushToCloud('orders', orders);
  window.dispatchEvent(new Event('avi_data_orders'));
};

export const deleteOrder = (id: string) => {
  const orders = getOrders().filter(o => o.id !== id);
  localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
  pushToCloud('orders', orders);
  window.dispatchEvent(new Event('avi_data_orders'));
};

export const getOrdersByBatch = (batchId: string) => getOrders().filter(o => o.batchId === batchId);

export const getConfig = (): AppConfig => {
    const cfg = safeParse(KEYS.CONFIG, {
        companyName: 'Avícola Barsa',
        logoUrl: '',
        defaultFullCrateBatch: 5,
        defaultEmptyCrateBatch: 10,
        cloudEnabled: false,
        firebaseConfig: {}
    });
    // Autoinicializar Firebase si está activo
    if (cfg.cloudEnabled && !firebaseApp) initFirebase(cfg);
    return cfg;
};

export const saveConfig = (cfg: AppConfig) => {
  localStorage.setItem(KEYS.CONFIG, JSON.stringify(cfg));
  if (cfg.cloudEnabled) initFirebase(cfg);
  else {
      // Si se desactiva, podríamos querer limpiar listeners
      firebaseApp = null;
      firebaseDb = null;
  }
  window.dispatchEvent(new Event('avi_data_config'));
};

export const resetApp = () => {
  localStorage.clear();
  seedData();
  window.location.reload();
};
