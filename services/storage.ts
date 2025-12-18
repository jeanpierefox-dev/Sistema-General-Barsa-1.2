
import { User, UserRole, Batch, ClientOrder, AppConfig, WeighingType } from '../types';
import { initializeApp, getApps, deleteApp } from 'https://esm.sh/firebase@11.3.1/app';
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

const sanitizeForFirebase = (data: any) => {
    return JSON.parse(JSON.stringify(data, (key, value) => {
        return value === undefined ? null : value;
    }));
};

// --- Lógica de Conexión ---

/**
 * Inicializa Firebase con validaciones estrictas.
 */
const initFirebase = async (config: AppConfig) => {
    const fc = config.firebaseConfig;
    
    // Validaciones preventivas
    if (!fc.apiKey || fc.apiKey.trim() === '') throw new Error("Falta la API Key de Firebase.");
    if (!fc.databaseURL || fc.databaseURL.trim() === '') throw new Error("Falta la URL de la base de datos.");
    if (!fc.databaseURL.startsWith('https://')) throw new Error("La URL de la base de datos debe empezar con https://");
    if (!fc.projectId || fc.projectId.trim() === '') throw new Error("Falta el Project ID.");

    try {
        const apps = getApps();
        if (apps.length > 0) {
            for (const app of apps) {
                await deleteApp(app);
            }
        }
        
        // Limpiamos espacios en blanco de la configuración antes de iniciar
        const cleanConfig = {
            ...fc,
            apiKey: fc.apiKey.trim(),
            databaseURL: fc.databaseURL.trim(),
            projectId: fc.projectId.trim(),
            appId: fc.appId.trim()
        };

        firebaseApp = initializeApp(cleanConfig);
        firebaseDb = getDatabase(firebaseApp);
        setupListeners();
        return firebaseDb;
    } catch (e: any) {
        console.error("Firebase Init Error:", e);
        throw new Error("Fallo crítico al crear la instancia: " + (e.message || "Verifique sus credenciales."));
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

/**
 * Prueba la conexión usando una configuración específica (útil para pruebas antes de guardar).
 */
export const testCloudConnection = async (tempConfig?: AppConfig): Promise<{success: boolean, message: string}> => {
    const config = tempConfig || getConfig();
    
    try {
        const db = await initFirebase(config);
        if (!db) throw new Error("No se pudo obtener la referencia de la base de datos.");
        
        // Verificamos conexión real con el servidor
        const connectedRef = ref(db, '.info/connected');
        const snapshot = await get(connectedRef);
        
        if (snapshot.val() === true) {
            return { success: true, message: "¡CONEXIÓN EXITOSA! El sistema se comunicó con Firebase correctamente." };
        } else {
            return { success: false, message: "Instancia creada, pero el servidor no responde. Revise su Internet." };
        }
    } catch (e: any) {
        console.error("Test Connection Fail:", e);
        let msg = e.message || "Error desconocido.";
        if (msg.includes('permission_denied')) msg = "PERMISOS DENEGADOS: Cambie las 'Rules' de su Realtime Database a true.";
        return { success: false, message: msg };
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
    if (!db) throw new Error("La nube no está activa en la configuración.");
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
            throw new Error("REGLAS DE FIREBASE INCORRECTAS. Deben estar en true.");
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
  // Re-inicializamos Firebase si la nube está activa
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
