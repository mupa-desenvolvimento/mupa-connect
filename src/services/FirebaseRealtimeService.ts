import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export const FirebaseRealtimeService = {
  subscribeToDeviceUpdates: (deviceCode: string, onUpdate: () => void) => {
    if (!deviceCode) return () => {};
    
    console.log(`[Firebase] Subscribing to updates for device: ${deviceCode}`);
    const deviceRef = ref(database, `devices/${deviceCode}/last_update`);
    
    const unsubscribe = onValue(deviceRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        console.log(`[Firebase] Immediate update signal received for ${deviceCode}:`, data);
        onUpdate();
      }
    });

    return unsubscribe;
  },

  notifyDeviceUpdate: async (deviceCode: string) => {
    if (!deviceCode) return;
    try {
      const { set } = await import("firebase/database");
      const deviceRef = ref(database, `devices/${deviceCode}/last_update`);
      await set(deviceRef, Date.now());
      console.log(`[Firebase] Update signal sent for device: ${deviceCode}`);
    } catch (err) {
      console.error(`[Firebase] Failed to send update signal for ${deviceCode}:`, err);
    }
  },

  notifyPlaylistUpdate: async (playlistId: string) => {
    if (!playlistId) return;
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      // Find all devices using this playlist
      const { data: devices } = await supabase
        .from("dispositivos")
        .select("serial, apelido_interno")
        .eq("playlist_id", playlistId as any);

      if (devices && devices.length > 0) {
        for (const device of devices) {
          const code = device.serial || device.apelido_interno;
          if (code) {
            await FirebaseRealtimeService.notifyDeviceUpdate(code);
          }
        }
      }
    } catch (err) {
      console.error(`[Firebase] Failed to notify playlist update for ${playlistId}:`, err);
    }
  }
};
