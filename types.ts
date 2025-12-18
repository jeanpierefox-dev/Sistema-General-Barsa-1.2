export enum UserRole {
  ADMIN = 'ADMIN',
  GENERAL = 'GENERAL',
  OPERATOR = 'OPERATOR'
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

export enum WeighingType {
  BATCH = 'BATCH',
  SOLO_POLLO = 'SOLO_POLLO',
  SOLO_JABAS = 'SOLO_JABAS'
}

export interface WeighingRecord {
  id: string;
  timestamp: number;
  weight: number;
  quantity: number;
  type: 'FULL' | 'EMPTY' | 'MORTALITY';
}

export interface ClientOrder {
  id: string;
  clientName: string;
  targetCrates: number;
  pricePerKg: number;
  status: 'OPEN' | 'CLOSED';
  records: WeighingRecord[];
  batchId?: string;
  weighingMode?: WeighingType;
  paymentStatus: 'PENDING' | 'PAID';
  paymentMethod?: 'CASH' | 'CREDIT';
  payments: Payment[];
  createdBy?: string;
}

export interface Payment {
  id: string;
  amount: number;
  timestamp: number;
  note?: string;
}

export interface Batch {
  id: string;
  name: string;
  createdAt: number;
  totalCratesLimit: number;
  status: 'ACTIVE' | 'ARCHIVED';
  createdBy?: string;
}

export interface AppConfig {
  companyName: string;
  logoUrl: string;
  printerConnected: boolean;
  scaleConnected: boolean;
  defaultFullCrateBatch: number;
  defaultEmptyCrateBatch: number;
  // Firebase settings
  cloudEnabled: boolean;
  firebaseConfig: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    databaseURL: string;
  };
}