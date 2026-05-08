/**
 * Bridge for communication between the Web Player and the Android APK (Kodular).
 * Uses window.AppInventor.setWebViewString to send JSON commands.
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
 * Helper global para envio de comandos ao APK Android via Kodular WebView.
 * Extremamente leve, assíncrono e não bloqueante.
 */
export const sendCommandToAndroid = (
  comando: string, 
  payload: any = {}, 
  context: { deviceId?: string; tenantId?: string; companyId?: string } = {}
) => {
  const command: AndroidCommand = {
    comando: comando.toLowerCase(),
    payload: payload,
    timestamp: Math.floor(Date.now() / 1000),
    device_id: context.deviceId,
    tenant_id: context.tenantId,
    company_id: context.companyId
  };

  // Log para depuração em desenvolvimento
  console.log("[ANDROID COMMAND SENT]", command);

  try {
    // Verifica se a interface AppInventor (Kodular) está disponível
    if (
      typeof window !== "undefined" && 
      (window as any).AppInventor && 
      (window as any).AppInventor.setWebViewString
    ) {
      // O Kodular recebe uma STRING, então usamos JSON.stringify
      (window as any).AppInventor.setWebViewString(JSON.stringify(command));
      return true;
    } else {
      console.warn("Kodular bridge não encontrada (AppInventor.setWebViewString ausente)");
      
      // Para depuração no navegador, disparamos um evento customizado
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("androidCommand", { detail: command }));
      }
      return false;
    }
  } catch (error) {
    console.error("Erro ao enviar comando para o Android:", error);
    return false;
  }
};

// Expõe no window para acesso global conforme solicitado
if (typeof window !== "undefined") {
  (window as any).sendCommandToAndroid = sendCommandToAndroid;
}

