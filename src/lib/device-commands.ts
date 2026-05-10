import { supabase } from "@/integrations/supabase/client";

export type DeviceCommandKind =
  | "reload_playlist"
  | "play_campaign"
  | "set_volume"
  | "screenshot"
  | "reboot"
  | "clear_cache"
  | "ping"
  | "open_app"
  | "abrir_app"
  | "reboot_device"
  | "restart_player"
  | "reload_page"
  | "fullscreen"
  | "update_apk"
  | "start_service"
  | "stop_service"
  | "set_brightness"
  | "tts_speak"
  | "open_url"
  | "ota_update"
  | "watchdog_config"
  | "consulta_ean"
  | "reset_app"
  | "fecha_app"
  | "ip_server";


export interface DeviceCommandPayload {
  playlist_id?: string;
  campaign_id?: string;
  volume?: number;
  brightness?: number;
  package?: string;
  packageName?: string;
  url?: string;
  text?: string;
  enabled?: boolean;
  service?: string;
  [key: string]: unknown;
}

export interface DeviceCommand {
  id: string;
  device_id: string;
  command: string;
  status: "pending" | "delivered" | "ack" | "done" | "error";
  payload: DeviceCommandPayload;
  metadata: Record<string, unknown> | null;
  error_message: string | null;
  executed_at: string | null;
  acknowledged_at: string | null;
  created_at: string;
  tenant_id: string | null;
  issued_by: string | null;
}

export interface DeviceExecutionLog {
  id: string;
  command_id: string | null;
  device_id: string;
  command: string;
  result: "success" | "error" | "partial";
  message: string | null;
  duration_ms: number | null;
  payload: Record<string, unknown>;
  created_at: string;
}

/* ---------------------- Issuing commands ---------------------- */

export async function issueDeviceCommand(
  deviceId: string,
  command: DeviceCommandKind,
  payload: DeviceCommandPayload = {}
) {
  const { data, error } = await supabase
    .from("device_commands")
    .insert({
      device_id: deviceId,
      command,
      payload: payload as never,
      status: "pending",
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as DeviceCommand;
}

export async function ackDeviceCommand(commandId: string) {
  const { error } = await supabase
    .from("device_commands")
    .update({ status: "ack", acknowledged_at: new Date().toISOString() })
    .eq("id", commandId);
  if (error) throw error;
}

export async function completeDeviceCommand(
  commandId: string,
  ok: boolean,
  errorMessage?: string
) {
  const { error } = await supabase
    .from("device_commands")
    .update({
      status: ok ? "done" : "error",
      executed_at: new Date().toISOString(),
      error_message: errorMessage ?? null,
    })
    .eq("id", commandId);
  if (error) throw error;
}

/* ---------------------- Execution logs ---------------------- */

export async function logDeviceExecution(input: {
  device_id: string;
  command: string;
  result: "success" | "error" | "partial";
  command_id?: string | null;
  message?: string | null;
  duration_ms?: number | null;
  payload?: Record<string, unknown>;
}) {
  const { error } = await supabase.from("device_execution_logs").insert({
    device_id: input.device_id,
    command: input.command,
    result: input.result,
    command_id: input.command_id ?? null,
    message: input.message ?? null,
    duration_ms: input.duration_ms ?? null,
    payload: (input.payload ?? {}) as never,
  });
  if (error) throw error;
}

/* ---------------------- Realtime helpers ---------------------- */

/**
 * Subscribe to commands targeted at a single device.
 * Used by the Player to receive remote orders in real time.
 * Supports listening to commands by device_id (UUID) OR external_id/serial.
 */
export function subscribeToDeviceCommands(
  deviceId: string,
  onCommand: (cmd: DeviceCommand) => void,
  options: { serial?: string; externalId?: string } = {}
) {
  const channelName = `device-commands:${deviceId}`;
  console.log(`[REALTIME] Subscribing to channel: ${channelName}`, { deviceId, ...options });

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "device_commands",
      },
      (payload) => {
        const cmd = payload.new as unknown as DeviceCommand;
        
        // Multi-identifier matching logic
        const targetId = cmd.device_id;
        const currentId = deviceId;
        const currentSerial = options.serial;
        const currentExternal = options.externalId;

        const isMatch = 
          targetId === currentId || 
          (currentSerial && targetId === currentSerial) ||
          (currentExternal && targetId === currentExternal) ||
          (cmd.metadata?.serial === currentSerial) ||
          (cmd.metadata?.device_id === currentId);

        console.log("[REALTIME COMMAND RECEIVED]", {
          command: cmd.command,
          target_device_id: targetId,
          current_device_id: currentId,
          current_serial: currentSerial,
          isMatch
        });

        if (isMatch) {
          onCommand(cmd);
        }
      }
    )
    .subscribe((status) => {
      console.log(`[REALTIME STATUS] ${channelName}: ${status}`);
    });

  return () => {
    console.log(`[REALTIME] Unsubscribing from: ${channelName}`);
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to ALL execution logs (RLS already scopes to tenant).
 * Used by the Admin panel to render a live activity feed.
 */
export function subscribeToExecutionLogs(
  onLog: (log: DeviceExecutionLog) => void
) {
  const channel = supabase
    .channel("device-execution-logs")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "device_execution_logs" },
      (payload) => onLog(payload.new as unknown as DeviceExecutionLog)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to status changes of commands (delivered/ack/done/error).
 * Used by the Admin panel to track if a command was acknowledged.
 */
export function subscribeToCommandUpdates(
  onUpdate: (cmd: DeviceCommand) => void
) {
  const channel = supabase
    .channel("device-commands-updates")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "device_commands" },
      (payload) => onUpdate(payload.new as unknown as DeviceCommand)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/* ---------------------- Recent history ---------------------- */

export async function fetchRecentCommands(deviceId?: string, limit = 50) {
  let q = supabase
    .from("device_commands")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (deviceId) q = q.eq("device_id", deviceId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as DeviceCommand[];
}

export async function fetchRecentExecutionLogs(deviceId?: string, limit = 50) {
  let q = supabase
    .from("device_execution_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (deviceId) q = q.eq("device_id", deviceId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as DeviceExecutionLog[];
}
