
import { User, UserRole, Batch, ClientOrder, AppConfig, WeighingType } from '../types';
import { initializeApp, getApp, getApps, deleteApp } from 'https://esm.sh/firebase@11.3.1/app';
import { getDatabase, ref, onValue, set, get } from 'https://esm.sh/firebase@11.3.1/database';

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

const arrayFromFirebase = (data: any) => {
    if (!data) return [];
    if (Array.isArray(data)) return data.filter(Boolean);
    return Object.values(data);
};

/**
 * Limpia objetos para Firebase eliminando propiedades 'undefined' 
 * que causan errores en la subida.
 */
const sanitizeForFirebase = (data: any) => {
    return JSON.parse(JSON.stringify(data, (key, value) => {
        return value === undefined ? null : value;
    }));
};

// --- Firebase Sync Logic ---

const initFirebase = async (config: AppConfig) => {
    if (!config.cloudEnabled || !config.firebaseConfig.apiKey) return;
    try {
        const apps = getApps();
        if (apps.length > 0) {
            for (const app of apps) {
                await deleteApp(app);
            }
        }
        
        firebaseApp = initializeApp(config.firebaseConfig);
        firebaseDb = getDatabase(firebaseApp);
        setupListeners();
    } catch (e) {
        console.error("Firebase Init Error:", e);
    }
};

const setupListeners = () => {
    if (!firebaseDb) return;
    
    onValue(ref(firebaseDb, 'data/users'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            localStorage.setItem(KEYS.USERS, JSON.stringify(arrayFromFirebase(data)));
            window.dispatchEvent(new Event('avi_data_users'));
        }
    });

    onValue(ref(firebaseDb, 'data/batches'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            localStorage.setItem(KEYS.BATCHES, JSON.stringify(arrayFromFirebase(data)));
            window.dispatchEvent(new Event('avi_data_batches'));
        }
    });

    onValue(ref(firebaseDb, 'data/orders'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            localStorage.setItem(KEYS.ORDERS, JSON.stringify(arrayFromFirebase(data)));
            window.dispatchEvent(new Event('avi_data_orders'));
        }
    });
};

export const forceSyncUsers = async () => {
    const config = getConfig();
    if (!config.cloudEnabled || !config.firebaseConfig.apiKey) return false;
    
    if (!firebaseDb) await initFirebase(config);
    if (!firebaseDb) return false;

    try {
        const snapshot = await get(ref(firebaseDb, 'data/users'));
        const data = snapshot.val();
        if (data) {
            localStorage.setItem(KEYS.USERS, JSON.stringify(arrayFromFirebase(data)));
            window.dispatchEvent(new Event('avi_data_users'));
            return true;
        }
    } catch (e) {
        console.error("Force Sync Error:", e);
    }
    return false;
};

export const uploadLocalDataToCloud = async () => {
    const config = getConfig();
    if (!config.cloudEnabled || !config.firebaseConfig.apiKey) {
        throw new Error("La nube no está configurada o activada.");
    }
    
    await initFirebase(config);
    if (!firebaseDb) throw new Error("No se pudo conectar con la base de datos.");

    try {
        const users = sanitizeForFirebase(getUsers());
        const batches = sanitizeForFirebase(getBatches());
        const orders = sanitizeForFirebase(getOrders());

        await set(ref(firebaseDb, 'data/users'), users);
        await set(ref(firebaseDb, 'data/batches'), batches);
        await set(ref(firebaseDb, 'data/orders'), orders);
        
        return true;
    } catch (e: any) {
        console.error("Manual Upload Error:", e);
        if (e.message?.includes('permission_denied')) {
            throw new Error("Error de permisos: Verifique que las reglas de su base de datos permitan lectura/escritura.");
        }
        throw e;
    }
};

// FUNCIÓN PARA FORMATEAR LA NUBE
export const formatCloudData = async () => {
    const config = getConfig();
    if (!config.cloudEnabled || !config.firebaseConfig.apiKey) {
        throw new Error("La nube no está configurada.");
    }
    
    if (!firebaseDb) await initFirebase(config);
    if (!firebaseDb) throw new Error("No hay conexión con la base de datos.");

    try {
        // Al setear el nodo 'data' en null, Firebase borra todo su contenido
        await set(ref(firebaseDb, 'data'), null);
        return true;
    } catch (e: any) {
        console.error("Cloud Format Error:", e);
        throw e;
    }
};

const pushToCloud = async (path: string, data: any) => {
    const config = getConfig();
    if (!config.cloudEnabled || !firebaseDb) return;
    try {
        await set(ref(firebaseDb, `data/${path}`), sanitizeForFirebase(data));
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

export const login = (u: string, p: string): User | null => {
  const users = getUsers();
  return users.find(user => user.username.toLowerCase() === u.toLowerCase() && user.password === p) || null;
};

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

export const getConfig = (): AppConfig => {
    const cfg = safeParse(KEYS.CONFIG, null);
    if (!cfg) {
        seedData();
        return safeParse(KEYS.CONFIG, {});
    }
    return cfg;
};

export const saveConfig = (cfg: AppConfig) => {
  localStorage.setItem(KEYS.CONFIG, JSON.stringify(cfg));
  initFirebase(cfg);
  window.dispatchEvent(new Event('avi_data_config'));
};

export const resetApp = () => {
  localStorage.clear();
  seedData();
  window.location.reload();
};
