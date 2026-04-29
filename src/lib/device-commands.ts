import { supabase } from "@/integrations/supabase/client";

export type DeviceCommandKind =
  | "reload_playlist"
  | "play_campaign"
  | "set_volume"
  | "screenshot"
  | "reboot"
  | "clear_cache"
  | "ping";

export interface DeviceCommandPayload {
  playlist_id?: string;
  campaign_id?: string;
  volume?: number;
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
 */
export function subscribeToDeviceCommands(
  deviceId: string,
  onCommand: (cmd: DeviceCommand) => void
) {
  const channel = supabase
    .channel(`device-commands:${deviceId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "device_commands",
        filter: `device_id=eq.${deviceId}`,
      },
      (payload) => onCommand(payload.new as unknown as DeviceCommand)
    )
    .subscribe();

  return () => {
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
