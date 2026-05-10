import { FirebaseRealtimeService } from "@/services/FirebaseRealtimeService";

/**
 * Bridge for communication between the Web Player and the Android APK (Kodular).
 * Supports LocalStorage and Firebase Realtime for maximum reliability.
 */

export interface AndroidCommand {
  comando: string;
  payload?: any;
  timestamp: number;
  device_id?: string;
  tenant_id?: string;
  company_id?: string;
}

/**
 * Helper global para envio de comandos ao APK Android via LocalStorage (preferencial) 
 * ou Kodular WebView (fallback).
 * Extremamente leve, assíncrono e não bloqueante.
 */
export const sendCommandToAndroid = (
  comandoOrJson: string, 
  payload: any = {}, 
  context: { deviceId?: string; tenantId?: string; companyId?: string; deviceCode?: string } = {}
) => {
  let command: AndroidCommand;

  try {
    // Se for uma string JSON começando com {, assumimos que é o comando completo
    if (typeof comandoOrJson === "string" && comandoOrJson.trim().startsWith("{")) {
      command = JSON.parse(comandoOrJson);
    } else {
      command = {
        comando: comandoOrJson.toLowerCase(),
        payload: payload,
        timestamp: Date.now(), // Usar timestamp em ms conforme solicitado
        device_id: context.deviceId,
        tenant_id: context.tenantId,
        company_id: context.companyId
      };
    }
  } catch (e) {
    // Fallback caso o parse falhe
    command = {
      comando: comandoOrJson.toLowerCase(),
      payload: payload,
      timestamp: Date.now(),
      device_id: context.deviceId,
      tenant_id: context.tenantId,
      company_id: context.companyId
    };
  }

  console.log("[ANDROID BRIDGE] Sending command:", command);

  if (typeof window === "undefined") return false;

  try {
    // 1. MIGRATION: Save to LocalStorage (Main mechanism)
    // Isso evita problemas de bridge instável no Android 9
    localStorage.setItem("mupa_command", JSON.stringify(command));
    console.log("[ANDROID BRIDGE] Command saved to LocalStorage (mupa_command)");

    // 2. FALLBACK: Kodular WebViewString
    if (
      (window as any).AppInventor && 
      (window as any).AppInventor.setWebViewString
    ) {
      (window as any).AppInventor.setWebViewString(JSON.stringify(command));
      console.log("[ANDROID BRIDGE] Command sent via AppInventor bridge");
    }

    // Dispara evento interno para atualização de UI (Debug)
    window.dispatchEvent(new CustomEvent("androidCommand", { detail: command }));
    
    return true;
  } catch (error) {
    console.error("Erro ao enviar comando para o Android:", error);
    return false;
  }
};

/**
 * Listener para confirmação (ACK) vindo do Android.
 * Suporta tanto chamada direta quanto monitoramento de LocalStorage.
 */
if (typeof window !== "undefined") {
  (window as any).sendCommandToAndroid = sendCommandToAndroid;
  
  // Função que processa o ACK (pode ser chamada via window ou via LocalStorage trigger)
  const processAck = (payload: any) => {
    try {
      const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
      console.log("[ANDROID BRIDGE] ACK processed:", data);
      
      // Dispara evento para o sistema de logs e UI reagirem
      window.dispatchEvent(new CustomEvent("androidAck", { detail: data }));
      return true;
    } catch (e) {
      console.error("[ANDROID BRIDGE] ACK Error:", e);
      return false;
    }
  };

  (window as any).confirmAndroidExecution = processAck;

  // Monitorar LocalStorage para "mupa_ack" (Novo fluxo)
  // Como o storage event não dispara no mesmo window, usamos um pequeno poller 
  // para garantir compatibilidade com WebView instável
  let lastAckValue = localStorage.getItem("mupa_ack");
  
  setInterval(() => {
    const currentAck = localStorage.getItem("mupa_ack");
    if (currentAck && currentAck !== lastAckValue) {
      console.log("[ANDROID BRIDGE] New ACK detected in LocalStorage");
      lastAckValue = currentAck;
      processAck(currentAck);
      // Limpamos para permitir o recebimento do mesmo payload futuramente
      localStorage.removeItem("mupa_ack");
      lastAckValue = null;
    }
  }, 1000);

  // Também ouvimos o evento padrão (caso venha de outro contexto)
  window.addEventListener('storage', (event) => {
    if (event.key === 'mupa_ack' && event.newValue) {
      processAck(event.newValue);
    }
  });
}


