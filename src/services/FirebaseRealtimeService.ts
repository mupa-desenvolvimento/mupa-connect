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
};
