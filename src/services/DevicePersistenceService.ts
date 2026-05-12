
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
   * Priority: LocalStorage -> IndexedDB (Future) -> Generated
   */
  getOrCreatePersistentId: (): string => {
    let uuid = localStorage.getItem(STORAGE_KEYS.PERSISTENT_UUID);
    
    if (!uuid) {
      // Check if we have an old serial and reuse it or its suffix to maintain some continuity
      const oldSerial = localStorage.getItem(STORAGE_KEYS.DEVICE_SERIAL);
      if (oldSerial && oldSerial.startsWith("CONS-")) {
        uuid = oldSerial;
      } else {
        uuid = `CONS-${crypto.randomUUID().split('-')[0].toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      }
      localStorage.setItem(STORAGE_KEYS.PERSISTENT_UUID, uuid);
      localStorage.setItem(STORAGE_KEYS.DEVICE_SERIAL, uuid);
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
