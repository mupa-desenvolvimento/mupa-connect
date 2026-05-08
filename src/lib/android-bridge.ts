/**
 * Bridge for communication between the Web Player and the Android APK (Kodular).
 * Uses window.AppInventor.setWebViewString to send JSON commands.
 */

export interface AndroidCommand {
  action: string;
  payload?: any;
  timestamp: number;
  device_id?: string;
}

export const sendCommandToAndroid = (action: string, payload: any = {}, deviceId?: string) => {
  const command = {
    action: action.toUpperCase(),
    ...payload,
    timestamp: Date.now(),
    device_id: deviceId
  };

  console.log("[Android Bridge] Sending command:", command);

  // Check if AppInventor (Kodular) is available
  if (typeof (window as any).AppInventor !== "undefined") {
    try {
      (window as any).AppInventor.setWebViewString(JSON.stringify(command));
      return true;
    } catch (error) {
      console.error("[Android Bridge] Error sending command to AppInventor:", error);
      return false;
    }
  } else {
    console.warn("[Android Bridge] AppInventor not detected. This command will only work inside the Mupa Android APK.");
    
    // For local debugging/testing, we can also dispatch a custom event
    window.dispatchEvent(new CustomEvent("androidCommand", { detail: command }));
    return false;
  }
};

// Expose to window for manual debugging or third-party scripts
if (typeof window !== "undefined") {
  (window as any).sendCommandToAndroid = sendCommandToAndroid;
}
