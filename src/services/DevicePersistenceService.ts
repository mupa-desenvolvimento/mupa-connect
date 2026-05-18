
/**
 * Service to manage persistent device identification across reloads, reboots and restarts.
 */

const STORAGE_KEYS = {
  DEVICE_SERIAL: "device_serial",
  PERSISTENT_UUID: "persistent_device_uuid",
  DEVICE_CONFIG: "mupa_device_config"
};

export const DevicePersistenceService = {
  /**
   * Gets or generates a persistent UUID for this device.
   * Priority: LocalStorage -> Generated
   */
  getOrCreatePersistentId: (): string => {
    // Tenta recuperar do localStorage primeiro
    let uuid = localStorage.getItem(STORAGE_KEYS.PERSISTENT_UUID);
    
    if (!uuid) {
      // Tenta recuperar do cookie como fallback (mais difícil de limpar em alguns casos)
      const cookieUuid = document.cookie
        .split("; ")
        .find((row) => row.startsWith("mupa_device_id="))
        ?.split("=")[1];

      if (cookieUuid) {
        uuid = cookieUuid;
        localStorage.setItem(STORAGE_KEYS.PERSISTENT_UUID, uuid);
      } else {
        // Se não houver nada, gera um novo robusto
        // Combina UUID com timestamp para garantir unicidade absoluta
        const timestamp = Date.now().toString(36);
        const randomPart = crypto.randomUUID().split('-')[0].toUpperCase();
        uuid = `CONS-${randomPart}-${timestamp}`.toUpperCase();
        
        localStorage.setItem(STORAGE_KEYS.PERSISTENT_UUID, uuid);
        localStorage.setItem(STORAGE_KEYS.DEVICE_SERIAL, uuid);
        
        // Salva no cookie por 10 anos
        const d = new Date();
        d.setTime(d.getTime() + (10 * 365 * 24 * 60 * 60 * 1000));
        document.cookie = `mupa_device_id=${uuid};expires=${d.toUTCString()};path=/;SameSite=Strict`;
      }
    }
    
    return uuid;
  },

  /**
   * Saves device configuration locally for offline/fast-load access
   */
  saveDeviceConfig: (config: any) => {
    if (!config) return;
    localStorage.setItem(STORAGE_KEYS.DEVICE_CONFIG, JSON.stringify({
      ...config,
      savedAt: new Date().toISOString()
    }));
  },

  /**
   * Gets saved device configuration
   */
  getSavedDeviceConfig: () => {
    const config = localStorage.getItem(STORAGE_KEYS.DEVICE_CONFIG);
    return config ? JSON.parse(config) : null;
  },

  /**
   * Clears all local device data (use for factory reset)
   */
  clearAllData: () => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  }
};
