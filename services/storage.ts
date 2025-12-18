
import { User, UserRole, Batch, ClientOrder, AppConfig, WeighingType } from '../types';
import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, get } from 'firebase/database';

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

const sanitizeForFirebase = (data: any) => {
    return JSON.parse(JSON.stringify(data, (key, value) => {
        return value === undefined ? null : value;
    }));
};

// --- Lógica de Conexión ---

const initFirebase = async (config: AppConfig) => {
    const fc = config.firebaseConfig;
    
    // Validación y Limpieza
    const apiKey = fc.apiKey?.trim();
    const dbURL = fc.databaseURL?.trim();
    const projId = fc.projectId?.trim();

    if (!apiKey || !dbURL || !projId) {
        throw new Error("Faltan credenciales críticas (API Key, URL o Project ID).");
    }

    try {
        // Reiniciar apps previas para evitar conflictos de instancia
        const apps = getApps();
        for (const app of apps) {
            await deleteApp(app);
        }
        
        const cleanConfig = {
            apiKey: apiKey,
            databaseURL: dbURL,
            projectId: projId,
            appId: fc.appId?.trim() || "",
            authDomain: `${projId}.firebaseapp.com`,
            storageBucket: `${projId}.appspot.com`
        };

        console.log("Intentando conectar a:", dbURL);
        
        firebaseApp = initializeApp(cleanConfig);
        
        // SOLUCIÓN CLAVE: Pasar explícitamente la URL al obtener la base de datos
        firebaseDb = getDatabase(firebaseApp, dbURL);
        
        if (!firebaseDb) {
            throw new Error("El servicio de base de datos no se pudo inicializar.");
        }

        setupListeners();
        return firebaseDb;
    } catch (e: any) {
        console.error("Firebase Init Error:", e);
        throw new Error(`Fallo de conexión: ${e.message}`);
    }
};

const ensureConnected = async () => {
    if (firebaseDb) return firebaseDb;
    const config = getConfig();
    if (!config.cloudEnabled) return null;
    return await initFirebase(config);
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

export const testCloudConnection = async (tempConfig?: AppConfig): Promise<{success: boolean, message: string}> => {
    const config = tempConfig || getConfig();
    try {
        const db = await initFirebase(config);
        
        // Verificamos conexión real leyendo un nodo especial de Firebase
        const connectedRef = ref(db, '.info/connected');
        const snapshot = await get(connectedRef);
        
        if (snapshot.val() === true) {
            return { success: true, message: "¡SISTEMA VINCULADO! Conexión con la nube establecida." };
        } else {
            return { success: false, message: "No se pudo establecer comunicación. Verifique su internet." };
        }
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const forceSyncUsers = async () => {
    try {
        const db = await ensureConnected();
        if (!db) return false;
        const snapshot = await get(ref(db, 'data/users'));
        const data = snapshot.val();
        if (data) {
            localStorage.setItem(KEYS.USERS, JSON.stringify(arrayFromFirebase(data)));
            window.dispatchEvent(new Event('avi_data_users'));
            return true;
        }
    } catch (e) {
        console.error("Sync Error:", e);
    }
    return false;
};

export const uploadLocalDataToCloud = async () => {
    const db = await ensureConnected();
    if (!db) throw new Error("La nube no está configurada.");
    try {
        const users = sanitizeForFirebase(getUsers());
        const batches = sanitizeForFirebase(getBatches());
        const orders = sanitizeForFirebase(getOrders());
        await set(ref(db, 'data/users'), users);
        await set(ref(db, 'data/batches'), batches);
        await set(ref(db, 'data/orders'), orders);
        return true;
    } catch (e: any) {
        if (e.message?.includes('permission_denied')) {
            throw new Error("REGLAS DE FIREBASE: Cambie 'Rules' a true en la consola de Firebase.");
        }
        throw e;
    }
};

export const formatCloudData = async () => {
    const db = await ensureConnected();
    if (!db) throw new Error("Sin conexión.");
    try {
        await set(ref(db, 'data'), null);
        return true;
    } catch (e: any) {
        throw e;
    }
};

const pushToCloud = async (path: string, data: any) => {
    try {
        const db = await ensureConnected();
        if (!db) return;
        await set(ref(db, `data/${path}`), sanitizeForFirebase(data));
    } catch (e) {
        console.error("Cloud Push Error:", e);
    }
};

// --- Seed Data & Methods ---

const seedData = () => {
  const existingUsers = safeParse(KEYS.USERS, []);
  if (existingUsers.length === 0) {
    const admin: User = {
      id: 'admin-1', username: 'admin', password: '123',
      name: 'Administrador Barsa', role: UserRole.ADMIN, allowedModes: [WeighingType.BATCH, WeighingType.SOLO_POLLO, WeighingType.SOLO_JABAS]
    };
    localStorage.setItem(KEYS.USERS, JSON.stringify([admin]));
  }

  if (localStorage.getItem(KEYS.CONFIG) === null) {
    const config: AppConfig = {
      appName: 'AVICONTROL PRO',
      companyName: 'AVÍCOLA BARSA S.A.C.', 
      logoUrl: '',
      printerConnected: false, 
      scaleConnected: false,
      defaultFullCrateBatch: 5, 
      defaultEmptyCrateBatch: 10,
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
  if (cfg.cloudEnabled) {
      initFirebase(cfg).catch(e => console.error("Auto-init error:", e));
  }
  window.dispatchEvent(new Event('avi_data_config'));
};

export const resetApp = () => {
  localStorage.clear();
  seedData();
  window.location.reload();
};
