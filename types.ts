
export enum UserRole {
  ADMIN = 'ADMIN',
  GENERAL = 'GENERAL',
  OPERATOR = 'OPERATOR'
}

export enum WeighingType {
  BATCH = 'BATCH',
  SOLO_POLLO = 'SOLO_POLLO',
  SOLO_JABAS = 'SOLO_JABAS'
}

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  parentId?: string;
  allowedModes?: WeighingType[];
}

export interface AppConfig {
  appName: string;
  companyName: string;
  logoUrl?: string;
  cloudEnabled: boolean;
  scaleConnected: boolean;
  printerConnected: boolean;
  defaultFullCrateBatch?: number;
  defaultEmptyCrateBatch?: number;
  firebaseConfig: {
    apiKey: string;
    authDomain: string;
    databaseURL: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
}

export interface Batch {
  id: string;
  name: string;
  totalCratesLimit: number;
  createdAt: number;
  status: 'ACTIVE' | 'CLOSED';
  createdBy?: string;
}

export interface WeighingRecord {
  id: string;
  timestamp: number;
  weight: number;
  quantity: number;
  type: 'FULL' | 'EMPTY' | 'MORTALITY';
}

export interface Payment {
  id: string;
  amount: number;
  timestamp: number;
  note?: string;
}

export interface ClientOrder {
  id: string;
  clientName: string;
  targetCrates: number;
  pricePerKg: number;
  status: 'OPEN' | 'CLOSED';
  records: WeighingRecord[];
  batchId?: string;
  weighingMode: WeighingType;
  paymentStatus: 'PENDING' | 'PAID';
  payments: Payment[];
  createdBy?: string;
  paymentMethod?: 'CASH' | 'CREDIT';
}
