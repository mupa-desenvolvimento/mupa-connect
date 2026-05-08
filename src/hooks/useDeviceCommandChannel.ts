import { useEffect, useRef } from "react";
import {
  ackDeviceCommand,
  completeDeviceCommand,
  logDeviceExecution,
  subscribeToDeviceCommands,
  type DeviceCommand,
} from "@/lib/device-commands";
import { sendCommandToAndroid } from "@/lib/android-bridge";

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
}

/**
 * Hook used by the Player (/play/:deviceCode) to listen for remote commands
 * and report execution back to Supabase.
 *
 * Pass `deviceId` (UUID from public.devices.id) — not the device_code.
 */
export function useDeviceCommandChannel(
  deviceId: string | undefined,
  handlers: CommandHandlerContext
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!deviceId) return;

    const unsubscribe = subscribeToDeviceCommands(deviceId, async (cmd) => {
      await runCommand(cmd, handlersRef.current);
    });

    return unsubscribe;
  }, [deviceId]);
}

async function runCommand(cmd: DeviceCommand, h: CommandHandlerContext) {
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

  try {
    switch (cmd.command) {
      case "reload_playlist":
        await h.reloadPlaylist();
        sendCommandToAndroid("RELOAD_PAGE", {}, cmd.device_id);
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
        sendCommandToAndroid("CHANGE_VOLUME", { volume }, cmd.device_id);
        break;
      }
      case "screenshot": {
        const url = await h.screenshot();
        if (url) resultPayload.screenshot_url = url;
        break;
      }
      case "clear_cache":
        await h.clearCache();
        sendCommandToAndroid("CLEAR_CACHE", {}, cmd.device_id);
        break;
      case "reboot":
        await h.reboot();
        sendCommandToAndroid("RELOAD_PAGE", {}, cmd.device_id);
        break;
      case "reboot_device":
        await sendCommandToAndroid("REBOOT", {}, cmd.device_id);
        break;
      case "open_app": {
        const pkg = cmd.payload?.package || cmd.payload?.packageName;
        if (!pkg) throw new Error("package ausente");
        await h.openApp?.(String(pkg));
        sendCommandToAndroid("OPEN_APP", { package: pkg }, cmd.device_id);
        break;
      }
      case "restart_player":
        await h.restartPlayer?.();
        sendCommandToAndroid("RESTART_PLAYER", {}, cmd.device_id);
        break;
      case "reload_page":
        await h.reloadPage?.();
        sendCommandToAndroid("RELOAD_PAGE", {}, cmd.device_id);
        break;
      case "fullscreen": {
        const enabled = cmd.payload?.enabled ?? true;
        await h.fullscreen?.(Boolean(enabled));
        sendCommandToAndroid("FULLSCREEN", { enabled }, cmd.device_id);
        break;
      }
      case "update_apk": {
        const url = cmd.payload?.url;
        if (!url) throw new Error("URL do APK ausente");
        await h.updateApk?.(String(url));
        sendCommandToAndroid("UPDATE_APK", { url }, cmd.device_id);
        break;
      }
      case "start_service": {
        const service = cmd.payload?.service;
        if (!service) throw new Error("serviço ausente");
        await h.startService?.(String(service));
        sendCommandToAndroid("START_SERVICE", { service }, cmd.device_id);
        break;
      }
      case "stop_service": {
        const service = cmd.payload?.service;
        if (!service) throw new Error("serviço ausente");
        await h.stopService?.(String(service));
        sendCommandToAndroid("STOP_SERVICE", { service }, cmd.device_id);
        break;
      }
      case "ping":
        message = "pong";
        sendCommandToAndroid("PING", {}, cmd.device_id);
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
