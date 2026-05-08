import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";
import { supabase } from "@/integrations/supabase/client";

const firebaseConfig = {
  apiKey: "AIzaSyC1RGJg54rTlsha1xyqMQKHvg5B7RFIiWc",
  authDomain: "update-group-38a2b.firebaseapp.com",
  databaseURL: "https://update-group-38a2b-default-rtdb.firebaseio.com",
  projectId: "update-group-38a2b",
  storageBucket: "update-group-38a2b.firebasestorage.app",
  messagingSenderId: "1061722413506",
  appId: "1:1061722413506:web:9f7500a08423db97445e5b",
  measurementId: "G-BFZ1YK6K6D"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export type DeviceUpdatePayload = {
  reason: string;
  playlist_id?: string;
  ts: number;
};

export type DeviceCommandPayload = {
  comando: string;
  payload?: any;
  ts: number;
};

export const FirebaseRealtimeService = {

  /**
   * Subscribe a player to its update channel.
   * Skips the very first snapshot (initial value) so reloads only happen on real changes.
   */
  subscribeToDeviceUpdates: (
    deviceCode: string,
    onUpdate: (payload: DeviceUpdatePayload) => void
  ) => {
    if (!deviceCode) return () => {};

    console.log(`[Firebase] Subscribing to updates for device: ${deviceCode}`);
    const deviceRef = ref(database, `devices/${deviceCode}/last_update`);
    let isFirst = true;

    const unsubscribe = onValue(deviceRef, (snapshot) => {
      const data = snapshot.val();
      if (isFirst) {
        isFirst = false;
        return;
      }
      if (data) {
        console.log(`[Firebase] Update signal for ${deviceCode}:`, data);
        onUpdate(data as DeviceUpdatePayload);
      }
    });

    return unsubscribe;
  },

  /**
   * Write an update marker for a single device.
   */
  notifyDevice: async (deviceCode: string, payload: Omit<DeviceUpdatePayload, "ts">) => {
    if (!deviceCode) return;
    try {
      await set(ref(database, `devices/${deviceCode}/last_update`), {
        ...payload,
        ts: Date.now(),
      });
      console.log(`[Firebase] Notified device ${deviceCode}`);
    } catch (err) {
      console.warn(`[Firebase] Failed to notify ${deviceCode}`, err);
    }
  },

  /**
   * Send heartbeat and status update to Firebase Realtime Database.
   * Based on execution of player (/play).
   */
  sendHeartbeat: async (deviceCode: string, mediaId?: string | null, status: string = "playing") => {
    if (!deviceCode) return;
    try {
      const deviceRef = ref(database, `devices/${deviceCode}/status`);
      await set(deviceRef, {
        last_update: Date.now(),
        media_id: mediaId || null,
        status: status
      });
    } catch (err) {
      // Silently fail to avoid crashing the player on connection issues
      console.warn("[Firebase] Heartbeat failed", err);
    }
  },

  /**
   * Notify every device linked to a given playlist (by serial AND apelido_interno).
   */
  notifyPlaylistDevices: async (playlistId: string) => {
    if (!playlistId) return;
    try {
      const { data: devices, error } = await supabase
        .from("dispositivos")
        .select("serial, apelido_interno")
        .eq("playlist_id", playlistId);

      if (error || !devices?.length) {
        console.log(`[Firebase] No devices to notify for playlist ${playlistId}`);
        return;
      }

      const codes = new Set<string>();
      devices.forEach((d: any) => {
        if (d.serial) codes.add(d.serial);
        if (d.apelido_interno) codes.add(d.apelido_interno);
      });

      await Promise.all(
        Array.from(codes).map((code) =>
          FirebaseRealtimeService.notifyDevice(code, {
            reason: "playlist_updated",
            playlist_id: playlistId,
          })
        )
      );
      console.log(`[Firebase] Notified ${codes.size} device codes for playlist ${playlistId}`);
    } catch (err) {
      console.warn("[Firebase] notifyPlaylistDevices failed", err);
    }
  },

  /**
   * Notify every device linked to a given company.
   */
  notifyCompanyDevices: async (companyId: string) => {
    if (!companyId) return;
    try {
      const { data: devices, error } = await supabase
        .from("dispositivos")
        .select("serial, apelido_interno")
        .eq("company_id", companyId);

      if (error || !devices?.length) return;

      const codes = new Set<string>();
      devices.forEach((d: any) => {
        if (d.serial) codes.add(d.serial);
        if (d.apelido_interno) codes.add(d.apelido_interno);
      });

      await Promise.all(
        Array.from(codes).map((code) =>
          FirebaseRealtimeService.notifyDevice(code, {
            reason: "company_settings_updated",
          })
        )
      );
      console.log(`[Firebase] Notified ${codes.size} device codes for company ${companyId}`);
    } catch (err) {
      console.warn("[Firebase] notifyCompanyDevices failed", err);
    }
  },

  /**
   * Log player events to Firebase for real-time monitoring.
   */
  logEvent: async (deviceCode: string, event: string, details: any = {}) => {
    if (!deviceCode) return;
    try {
      const logRef = ref(database, `devices/${deviceCode}/logs/${Date.now()}`);
      await set(logRef, {
        event,
        ...details,
        timestamp: new Date().toISOString()
      });
      
      // Manter apenas os últimos 50 logs para evitar sobrecarga no banco
      // (Isso é um "set" em um path fixo baseado em tempo, o Firebase não remove automático, 
      // mas podemos implementar uma limpeza periódica se necessário. Por ora apenas registramos).
    } catch (err) {
      console.warn("[Firebase] Log event failed", err);
    }
  },

  /**
   * Subscribe to real-time commands via Firebase.
   */
  subscribeToCommands: (
    deviceCode: string,
    onCommand: (payload: DeviceCommandPayload) => void
  ) => {
    if (!deviceCode) return () => {};

    console.log(`[Firebase] Subscribing to commands for device: ${deviceCode}`);
    const commandRef = ref(database, `devices/${deviceCode}/commands`);
    let isFirst = true;

    const unsubscribe = onValue(commandRef, (snapshot) => {
      const data = snapshot.val();
      if (isFirst) {
        isFirst = false;
        return;
      }
      if (data) {
        console.log(`[Firebase] Command received for ${deviceCode}:`, data);
        onCommand(data as DeviceCommandPayload);
      }
    });

    return unsubscribe;
  },
};

