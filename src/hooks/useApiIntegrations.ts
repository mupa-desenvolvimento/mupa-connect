import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

export type ApiIntegrationRow = Database["public"]["Tables"]["api_integrations"]["Row"];
export type ApiIntegrationInsert = Database["public"]["Tables"]["api_integrations"]["Insert"];

export type ApiIntegrationUpsert = Pick<
  ApiIntegrationInsert,
  | "name"
  | "slug"
  | "base_url"
  | "description"
  | "is_active"
  | "auth_curl"
  | "auth_url"
  | "auth_method"
  | "auth_body_json"
  | "auth_headers_json"
  | "auth_query_params_json"
  | "auth_body_text"
  | "auth_token_path"
  | "token_expiration_seconds"
  | "request_curl"
  | "request_url"
  | "request_method"
  | "request_headers_json"
  | "request_params_json"
  | "request_query_params_json"
  | "request_body_json"
  | "request_body_text"
  | "request_variables_json"
  | "barcode_param_name"
  | "store_param_name"
  | "response_mapping_json"
>;

export function useApiIntegrations() {
  const queryClient = useQueryClient();

  const { data: integrations, isLoading } = useQuery({
    queryKey: ["api-integrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_integrations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Erro ao carregar integrações");
        throw error;
      }

      return (data || []) as ApiIntegrationRow[];
    },
  });

  const createIntegration = useMutation({
    mutationFn: async (newIntegration: ApiIntegrationUpsert) => {
      const { data, error } = await supabase
        .from("api_integrations")
        .insert({
          name: newIntegration.name,
          slug: newIntegration.slug,
          base_url: newIntegration.base_url,
          description: newIntegration.description ?? null,
          is_active: newIntegration.is_active ?? true,
          auth_curl: newIntegration.auth_curl ?? null,
          auth_url: newIntegration.auth_url ?? null,
          auth_method: newIntegration.auth_method ?? null,
          auth_body_json: (newIntegration.auth_body_json ?? {}) as unknown as Json,
          auth_headers_json: (newIntegration.auth_headers_json ?? {}) as unknown as Json,
          auth_query_params_json: (newIntegration.auth_query_params_json ?? {}) as unknown as Json,
          auth_body_text: newIntegration.auth_body_text ?? null,
          auth_token_path: newIntegration.auth_token_path ?? null,
          token_expiration_seconds: newIntegration.token_expiration_seconds ?? null,
          request_curl: newIntegration.request_curl ?? null,
          request_url: newIntegration.request_url ?? null,
          request_method: newIntegration.request_method ?? null,
          request_headers_json: (newIntegration.request_headers_json ?? {}) as unknown as Json,
          request_params_json: (newIntegration.request_params_json ?? {}) as unknown as Json,
          request_query_params_json: (newIntegration.request_query_params_json ?? {}) as unknown as Json,
          request_body_json: (newIntegration.request_body_json ?? {}) as unknown as Json,
          request_body_text: newIntegration.request_body_text ?? null,
          request_variables_json: (newIntegration.request_variables_json ?? []) as unknown as Json,
          barcode_param_name: newIntegration.barcode_param_name ?? null,
          store_param_name: newIntegration.store_param_name ?? null,
          response_mapping_json: (newIntegration.response_mapping_json ?? {}) as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ApiIntegrationRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-integrations"] });
      toast.success("Integração criada com sucesso");
    },
    onError: (error: any) => {
      console.error(error);
      toast.error("Erro ao criar integração");
    },
  });

  const updateIntegration = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ApiIntegrationRow> & { id: string }) => {
      const { data, error } = await supabase
        .from("api_integrations")
        .update({
          name: updates.name,
          slug: updates.slug,
          base_url: updates.base_url,
          description: updates.description ?? null,
          is_active: updates.is_active,
          auth_curl: updates.auth_curl ?? null,
          auth_url: updates.auth_url ?? null,
          auth_method: updates.auth_method ?? null,
          auth_body_json: (updates.auth_body_json ?? {}) as unknown as Json,
          auth_headers_json: (updates.auth_headers_json ?? {}) as unknown as Json,
          auth_query_params_json: (updates.auth_query_params_json ?? {}) as unknown as Json,
          auth_body_text: updates.auth_body_text ?? null,
          auth_token_path: updates.auth_token_path ?? null,
          token_expiration_seconds: updates.token_expiration_seconds ?? null,
          request_curl: updates.request_curl ?? null,
          request_url: updates.request_url ?? null,
          request_method: updates.request_method ?? null,
          request_headers_json: (updates.request_headers_json ?? {}) as unknown as Json,
          request_params_json: (updates.request_params_json ?? {}) as unknown as Json,
          request_query_params_json: (updates.request_query_params_json ?? {}) as unknown as Json,
          request_body_json: (updates.request_body_json ?? {}) as unknown as Json,
          request_body_text: updates.request_body_text ?? null,
          request_variables_json: (updates.request_variables_json ?? []) as unknown as Json,
          barcode_param_name: updates.barcode_param_name ?? null,
          store_param_name: updates.store_param_name ?? null,
          response_mapping_json: (updates.response_mapping_json ?? {}) as unknown as Json,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as ApiIntegrationRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-integrations"] });
      toast.success("Integração atualizada com sucesso");
    },
    onError: (error: any) => {
      console.error(error);
      toast.error("Erro ao atualizar integração");
    },
  });

  const setActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("api_integrations").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-integrations"] });
    },
    onError: (error: any) => {
      console.error(error);
      toast.error("Erro ao atualizar status");
    },
  });

  return {
    integrations,
    isLoading,
    createIntegration,
    updateIntegration,
    setActive,
  };
}

