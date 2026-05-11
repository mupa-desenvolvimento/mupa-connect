import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, push, serverTimestamp } from "firebase/database";
import { supabase } from "@/integrations/supabase/client";

const firebaseConfig = {
  apiKey: "AIzaSyC1RGJg54rTlsha1xyqMQKHvg5B7RFIiWc",
  authDomain: "comandos-1621d.firebaseapp.com",
  databaseURL: "https://comandos-1621d-default-rtdb.firebaseio.com",
  projectId: "comandos-1621d",
  storageBucket: "comandos-1621d.firebasestorage.app",
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

// Internal rate limiting state
const lastWriteTimes: Record<string, number> = {};

export const FirebaseRealtimeService = {

  /**
   * Subscribe a player to its update channel.
   * Path: dispositivos/{deviceCode}/last_update
   */
  subscribeToDeviceUpdates: (
    deviceCode: string,
    onUpdate: (payload: DeviceUpdatePayload) => void
  ) => {
    if (!deviceCode) return () => {};

    console.log(`[Firebase] Subscribing to updates for device: ${deviceCode}`);
    const deviceRef = ref(database, `dispositivos/${deviceCode}/last_update`);
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
      await set(ref(database, `dispositivos/${deviceCode}/last_update`), {
        ...payload,
        ts: Date.now(),
      });
      console.log(`[Firebase] Notified device ${deviceCode}`);
    } catch (err) {
      console.warn(`[Firebase] Failed to notify ${deviceCode}`, err);
    }
  },

  // sendHeartbeat removido conforme solicitação


  /**
   * Notify every device linked to a given playlist.
   */
  notifyPlaylistDevices: async (playlistId: string) => {
    if (!playlistId) return;
    try {
      const { data: devices, error } = await supabase
        .from("dispositivos")
        .select("serial, apelido_interno")
        .eq("playlist_id", playlistId);

      if (error || !devices?.length) return;

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
    } catch (err) {
      console.warn("[Firebase] notifyCompanyDevices failed", err);
    }
  },

  /**
   * Log CRITICAL events only. Media transitions are BLOCKED here.
   * Path: dispositivos/{deviceCode}/logs
   */
  logEvent: async (deviceCode: string, event: string, details: any = {}) => {
    if (!deviceCode) return;
    
    // FILTER: Block media transitions and playback logs from Firebase
    const blockedEvents = ['media_transition', 'playback_start', 'playback_end', 'playlist_index_change'];
    if (blockedEvents.includes(event)) {
      // Save locally to Android via Bridge instead
      const win = window as any;
      if (win.sendCommandToAndroid) {
        win.sendCommandToAndroid("local_log", { event, ...details, ts: Date.now() });
      }
      return;
    }

    // MODE: Only send critical errors or manually triggered debug logs
    const isCritical = event.includes('error') || event.includes('crash') || event.includes('fatal');
    const isDebugMode = localStorage.getItem("mupa_debug_logging") === "true";

    if (!isCritical && !isDebugMode) return;

    try {
      const logRef = push(ref(database, `dispositivos/${deviceCode}/logs`));
      await set(logRef, {
        event,
        ...details,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.warn("[Firebase] Log event failed", err);
    }
  },

  /**
   * Subscribe to real-time commands.
   * Path: dispositivos/{deviceCode}/commands
   */
  subscribeToCommands: (
    deviceCode: string,
    onCommand: (payload: DeviceCommandPayload) => void
  ) => {
    if (!deviceCode) return () => {};

    const commandRef = ref(database, `dispositivos/${deviceCode}/commands`);
    let isFirst = true;

    const unsubscribe = onValue(commandRef, (snapshot) => {
      const data = snapshot.val();
      if (isFirst) {
        isFirst = false;
        return;
      }
      if (data) {
        onCommand(data as DeviceCommandPayload);
      }
    });

    return unsubscribe;
  },

  /**
   * Send a command manually from Admin Panel.
   */
  sendCommand: async (deviceCode: string, comando: string, payload: any = {}) => {
    if (!deviceCode) return;
    try {
      const commandRef = ref(database, `dispositivos/${deviceCode}/commands`);
      await set(commandRef, {
        comando: comando.toLowerCase(),
        payload: payload,
        ts: Date.now(),
      });
    } catch (err) {
      console.warn(`[Firebase] Failed to send command to ${deviceCode}`, err);
    }
  },
};
