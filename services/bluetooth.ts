import { WeighingRecord } from '../types';

// UUIDs Estándar y comunes para Balanzas y Ticketeras
const UUIDS = {
  SCALE_SERVICE: 0x181D, // Weight Scale Service
  SCALE_CHAR: 0x2A9D,    // Weight Measurement
  PRINTER_SERVICE: '0000ff00-0000-1000-8000-00805f9b34fb', // Común en impresoras chinas
  PRINTER_CHAR: '0000ff01-0000-1000-8000-00805f9b34fb'
};

class BluetoothService {
  // Fix: Used 'any' for Web Bluetooth device types to bypass missing global type definitions.
  private scaleDevice: any = null;
  private printerDevice: any = null;
  private printerChar: any = null;
  
  private weightListeners: ((weight: number) => void)[] = [];

  // --- BALANZA ---

  async connectScale(): Promise<string> {
    try {
      // Fix: Cast navigator to any to access 'bluetooth' property which is not in the standard Navigator type.
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: [UUIDS.SCALE_SERVICE] }, { namePrefix: 'Scale' }, { namePrefix: 'Balanza' }],
        optionalServices: [UUIDS.SCALE_SERVICE, 'battery_service']
      });

      const server = await device.gatt?.connect();
      if (!server) throw new Error("No se pudo conectar al servidor GATT");

      const service = await server.getPrimaryService(UUIDS.SCALE_SERVICE);
      const char = await service.getCharacteristic(UUIDS.SCALE_CHAR);

      await char.startNotifications();
      char.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = event.target.value;
        // Interpretación básica de peso (depende del fabricante, usualmente uint16 o float32)
        const weight = value.getUint16(1, true) / 100; 
        this.notifyWeight(weight);
      });

      this.scaleDevice = device;
      return device.name || "Balanza Conectada";
    } catch (e) {
      console.error("Scale Connect Error:", e);
      throw e;
    }
  }

  onWeightUpdate(callback: (weight: number) => void) {
    this.weightListeners.push(callback);
    return () => {
      this.weightListeners = this.weightListeners.filter(l => l !== callback);
    };
  }

  private notifyWeight(w: number) {
    this.weightListeners.forEach(l => l(w));
  }

  // --- IMPRESORA ---

  async connectPrinter(): Promise<string> {
    try {
      // Fix: Cast navigator to any to access 'bluetooth' property.
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [UUIDS.PRINTER_SERVICE]
      });

      const server = await device.gatt?.connect();
      if (!server) throw new Error("GATT Error");

      const service = await server.getPrimaryService(UUIDS.PRINTER_SERVICE);
      this.printerChar = await service.getCharacteristic(UUIDS.PRINTER_CHAR);
      
      this.printerDevice = device;
      return device.name || "Impresora Conectada";
    } catch (e) {
      console.error("Printer Connect Error:", e);
      throw e;
    }
  }

  async printEscPos(text: string) {
    if (!this.printerChar) throw new Error("Impresora no conectada");
    
    const encoder = new TextEncoder();
    const data = encoder.encode(text + "\n\n\n"); // Añadimos avance de papel
    
    // Las impresoras Bluetooth suelen tener un límite de MTU de 20 bytes por escritura
    const chunkSize = 20;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await this.printerChar.writeValue(chunk);
    }
  }

  isConnected(type: 'scale' | 'printer'): boolean {
    return type === 'scale' ? !!this.scaleDevice?.gatt?.connected : !!this.printerDevice?.gatt?.connected;
  }
}

export const bluetooth = new BluetoothService();