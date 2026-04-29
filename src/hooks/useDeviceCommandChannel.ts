import { useEffect, useRef } from "react";
import {
  ackDeviceCommand,
  completeDeviceCommand,
  logDeviceExecution,
  subscribeToDeviceCommands,
  type DeviceCommand,
} from "@/lib/device-commands";

export interface CommandHandlerContext {
  reloadPlaylist: () => Promise<void> | void;
  playCampaign: (campaignId: string) => Promise<void> | void;
  setVolume: (value: number) => Promise<void> | void;
  screenshot: () => Promise<string | void>;
  clearCache: () => Promise<void> | void;
  reboot: () => Promise<void> | void;
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
        await h.setVolume(Math.max(0, Math.min(100, v)));
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
