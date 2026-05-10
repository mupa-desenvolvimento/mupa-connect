import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Monitora dispositivos com 'persistence' ativado.
 * Se um dispositivo ficar offline, envia o comando 'abrir_app' para o Firebase.
 */
export function DevicePersistenceMonitor() {
  useEffect(() => {
    const checkPersistence = async () => {
      // 1. Buscar dispositivos com persistence=true
      const { data: devices, error } = await supabase
        .from("dispositivos")
        .select("id, serial, last_heartbeat_at, persistence")
        .eq("persistence", true);

      if (error || !devices) return;

      const now = Date.now();
      const offlineThreshold = 5 * 60 * 1000; // 5 minutos

      for (const device of devices) {
        if (!device.serial || !device.last_heartbeat_at) continue;

        const lastHeartbeat = new Date(device.last_heartbeat_at).getTime();
        const diff = now - lastHeartbeat;

        // Se estiver offline (mais de 5 min sem heartbeat)
        if (diff > offlineThreshold) {
          console.log(`[Persistence] Device ${device.serial} is offline. Sending re-open command.`);
          
          const payload = {
            comando: "abrir_app",
            package: "com.mupa.apptc",
            time: `${Date.now()}`,
          };

          try {
            await fetch(
              `https://comandos-1621d-default-rtdb.firebaseio.com/dispositivos/${encodeURIComponent(device.serial)}.json`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              }
            );
          } catch (e) {
            console.error(`[Persistence] Failed to notify ${device.serial}`, e);
          }
        }
      }
    };

    // Executa a cada 2 minutos
    const interval = setInterval(checkPersistence, 2 * 60 * 1000);
    
    // Executa uma vez ao montar
    checkPersistence();

    return () => clearInterval(interval);
  }, []);

  return null;
}
