import { useEffect, useRef } from "react";
import {
  ackDeviceCommand,
  completeDeviceCommand,
  logDeviceExecution,
  subscribeToDeviceCommands,
  type DeviceCommand,
} from "@/lib/device-commands";
import { sendCommandToAndroid } from "@/lib/android-bridge";
import { useState } from "react";

export interface LastCommandInfo {
  command: string;
  timestamp: number;
  isMatch: boolean;
  targetId: string;
  details: any;
  sentToAndroid?: boolean;
  androidAck?: {
    status: string;
    message?: string;
    timestamp: number;
  };
}

export interface CommandHandlerContext {
  reloadPlaylist: () => Promise<void> | void;
  playCampaign: (campaignId: string) => Promise<void> | void;
  setVolume: (value: number) => Promise<void> | void;
  screenshot: () => Promise<string | void>;
  clearCache: () => Promise<void> | void;
  reboot: () => Promise<void> | void;
  openApp?: (packageName: string) => Promise<void> | void;
  rebootDevice?: () => Promise<void> | void;
  restartPlayer?: () => Promise<void> | void;
  reloadPage?: () => Promise<void> | void;
  fullscreen?: (enabled: boolean) => Promise<void> | void;
  updateApk?: (url: string) => Promise<void> | void;
  startService?: (serviceName: string) => Promise<void> | void;
  stopService?: (serviceName: string) => Promise<void> | void;
  setBrightness?: (value: number) => Promise<void> | void;
  ttsSpeak?: (text: string) => Promise<void> | void;
  openUrl?: (url: string) => Promise<void> | void;
  consultaEan?: (codbar: string) => Promise<void> | void;
  resetApp?: () => Promise<void> | void;
  fechaApp?: () => Promise<void> | void;
  setIpServer?: (ip: string) => Promise<void> | void;
  tenantId?: string;
  companyId?: string;
}

/**
 * Hook used by the Player (/play/:deviceCode) to listen for remote commands
 * and report execution back to Supabase.
 */
export function useDeviceCommandChannel(
  deviceId: string | undefined,
  handlers: CommandHandlerContext & { serial?: string; externalId?: string }
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  
  const [lastCommand, setLastCommand] = useState<LastCommandInfo | null>(null);

  useEffect(() => {
    const handleAndroidAck = (event: any) => {
      const data = event.detail;
      setLastCommand(prev => {
        if (!prev) return null;
        // Se quisermos validar o command_id, o ideal seria que o Android retornasse o mesmo ID que enviamos
        // Por enquanto, atualizamos o último comando recebido
        return {
          ...prev,
          androidAck: {
            status: data.status,
            message: data.message,
            timestamp: Date.now()
          }
        };
      });
    };

    window.addEventListener("androidAck", handleAndroidAck);
    return () => window.removeEventListener("androidAck", handleAndroidAck);
  }, []);

  useEffect(() => {
    if (!deviceId) return;

    const unsubscribe = subscribeToDeviceCommands(
      deviceId, 
      async (cmd) => {
        const androidPayload = {
          comando: cmd.command,
          payload: cmd.payload,
          timestamp: Date.now(),
          device_id: cmd.device_id,
          tenant_id: cmd.tenant_id,
          company_id: handlersRef.current.companyId
        };

        console.log("[REALTIME RECEIVED]", cmd);
        console.log("[SENDING TO ANDROID]", androidPayload);

        const win = (window as any);
        let sent = false;
        if (win.sendCommandToAndroid) {
          sent = win.sendCommandToAndroid(JSON.stringify(androidPayload));
        }

        setLastCommand({
          command: cmd.command,
          timestamp: Date.now(),
          isMatch: true,
          targetId: cmd.device_id,
          details: cmd.payload,
          sentToAndroid: sent
        });

        await runCommand(cmd, handlersRef.current, deviceId);
      },
      { 
        serial: handlers.serial, 
        externalId: handlers.externalId 
      }
    );

    return unsubscribe;
  }, [deviceId, handlers.serial, handlers.externalId]);

  return { lastCommand };
}


async function runCommand(cmd: DeviceCommand, h: CommandHandlerContext, currentDeviceId: string) {
  // Security validation: ignore commands not meant for this device
  // We already filter in subscribeToDeviceCommands, but double check here
  const currentSerial = (h as any).serial;
  const currentExternal = (h as any).externalId;
  
  const isMatch = 
    cmd.device_id === currentDeviceId || 
    (currentSerial && cmd.device_id === currentSerial) ||
    (currentExternal && cmd.device_id === currentExternal) ||
    (cmd.metadata?.serial === currentSerial) ||
    (cmd.metadata?.device_id === currentDeviceId);

  if (!isMatch) {
    console.warn("[CommandChannel] Received command for wrong device:", cmd.device_id, "Current:", currentDeviceId, currentSerial);
    return;
  }

  const start = performance.now();
  // 1. acknowledge as soon as it arrives
  try {
    await ackDeviceCommand(cmd.id);
  } catch (e) {
    // non-fatal
    console.warn("ack failed", e);
  }

  let ok = true;
  let message: string | null = null;
  let resultPayload: Record<string, unknown> = {};

  const context = { 
    deviceId: cmd.device_id,
    tenantId: h.tenantId,
    companyId: h.companyId
  };

  try {
    switch (cmd.command) {
      case "reload_playlist":
        await h.reloadPlaylist();
        break;
      case "play_campaign": {
        const id = cmd.payload?.campaign_id;
        if (!id) throw new Error("campaign_id ausente");
        await h.playCampaign(String(id));
        break;
      }
      case "set_volume": {
        const v = Number(cmd.payload?.volume);
        if (!Number.isFinite(v)) throw new Error("volume inválido");
        const volume = Math.max(0, Math.min(100, v));
        await h.setVolume(volume);
        break;
      }
      case "screenshot": {
        const url = await h.screenshot();
        if (url) resultPayload.screenshot_url = url;
        break;
      }
      case "clear_cache":
        await h.clearCache();
        break;
      case "reboot":
        await h.reboot();
        break;
      case "reboot_device":
        // Already handled by immediate send
        break;
      case "open_app":
      case "abrir_app": {
        const pkg = cmd.payload?.package || cmd.payload?.packageName || cmd.payload?.pacote;
        if (!pkg) throw new Error("pacote ausente");
        await h.openApp?.(String(pkg));
        break;
      }
      case "restart_player":
        await h.restartPlayer?.();
        break;
      case "reload_page":
        await h.reloadPage?.();
        break;
      case "fullscreen": {
        const enabled = cmd.payload?.enabled ?? true;
        await h.fullscreen?.(Boolean(enabled));
        break;
      }
      case "update_apk": {
        const url = cmd.payload?.url;
        if (!url) throw new Error("URL do APK ausente");
        await h.updateApk?.(String(url));
        break;
      }
      case "start_service": {
        const service = cmd.payload?.service;
        if (!service) throw new Error("serviço ausente");
        await h.startService?.(String(service));
        break;
      }
      case "stop_service": {
        const service = cmd.payload?.service;
        if (!service) throw new Error("serviço ausente");
        await h.stopService?.(String(service));
        break;
      }
      case "set_brightness": {
        const v = Number(cmd.payload?.brightness);
        if (!Number.isFinite(v)) throw new Error("brilho inválido");
        const brightness = Math.max(0, Math.min(100, v));
        await h.setBrightness?.(brightness);
        break;
      }
      case "tts_speak": {
        const text = cmd.payload?.text;
        if (!text) throw new Error("texto ausente");
        await h.ttsSpeak?.(String(text));
        break;
      }
      case "open_url": {
        const url = cmd.payload?.url;
        if (!url) throw new Error("URL ausente");
        await h.openUrl?.(String(url));
        break;
      }
      case "consulta_ean": {
        const codbar = cmd.payload?.codbar || cmd.payload?.barcode;
        if (!codbar) throw new Error("código de barras ausente");
        await h.consultaEan?.(String(codbar));
        break;
      }
      case "reset_app": {
        await h.resetApp?.();
        break;
      }
      case "fecha_app":
      case "fecha_app_android": {
        await h.fechaApp?.();
        break;
      }
      case "ip_server": {
        const ip = cmd.payload?.ip_server || cmd.payload?.ip;
        if (!ip) throw new Error("IP do servidor ausente");
        await h.setIpServer?.(String(ip));
        break;
      }
      case "ping":
        message = "pong";
        break;
      default:
        ok = false;
        message = `Comando desconhecido: ${cmd.command}`;
    }
  } catch (e) {
    ok = false;
    message = e instanceof Error ? e.message : String(e);
  }

  const duration_ms = Math.round(performance.now() - start);

  try {
    await completeDeviceCommand(cmd.id, ok, ok ? undefined : message ?? "erro");
    await logDeviceExecution({
      device_id: cmd.device_id,
      command_id: cmd.id,
      command: cmd.command,
      result: ok ? "success" : "error",
      message,
      duration_ms,
      payload: { ...cmd.payload, ...resultPayload },
    });
  } catch (e) {
    console.warn("failed to report command result", e);
  }
}
