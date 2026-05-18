import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Settings, Trash2, Plug2, Plus, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { useUserRole } from "@/hooks/use-user-role";
import { useApiIntegrations, type ApiIntegrationRow, type ApiIntegrationUpsert } from "@/hooks/useApiIntegrations";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type CompanyIntegrationRow = Database["public"]["Tables"]["company_integrations"]["Row"];

const COMPANY_INTEGRATION_INITIAL_FORM = {
  integration_id: "",
  usuario: "",
  password: "",
  loja: "",
  image_base_url: "http://srv-mupa.ddns.net:5050/produto-imagem",
};

function jsonStringify(value: unknown, fallback: unknown) {
  try {
    if (value === null || value === undefined) return JSON.stringify(fallback, null, 2);
    return JSON.stringify(value, null, 2);
  } catch {
    return JSON.stringify(fallback, null, 2);
  }
}

function parseJsonOrThrow(value: string, fieldLabel: string, fallback: unknown) {
  const trimmed = (value || "").trim();
  if (!trimmed) return fallback;
  try {
    return JSON.parse(trimmed);
  } catch {
    toast.error(`JSON inválido em "${fieldLabel}"`);
    throw new Error(`invalid_json_${fieldLabel}`);
  }
}

function CompanyIntegrationsDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string | null;
  companyName: string | null;
}) {
  const { open, onOpenChange, companyId, companyName } = props;
  const queryClient = useQueryClient();
  const [showSecret, setShowSecret] = useState(false);
  const [form, setForm] = useState(COMPANY_INTEGRATION_INITIAL_FORM);

  const { data: availableIntegrations = [] } = useQuery({
    queryKey: ["api-integrations", "active-only"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_integrations")
        .select("id,name,slug,is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: companyIntegrations = [], isLoading: isLoadingCompanyIntegrations } = useQuery({
    queryKey: ["company-integrations", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("company_integrations")
        .select("id,integration_id,is_active,settings,api_integrations(name,slug)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Array<
        Pick<CompanyIntegrationRow, "id" | "integration_id" | "is_active" | "settings"> & {
          api_integrations: { name: string; slug: string } | null;
        }
      >;
    },
    enabled: !!companyId && open,
  });

  const addCompanyIntegration = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("company_id_required");
      if (!form.integration_id) throw new Error("integration_id_required");
      if (!form.usuario || !form.password) throw new Error("credentials_required");
      if (!form.loja) throw new Error("store_required");

      const { error } = await supabase.from("company_integrations").insert({
        company_id: companyId,
        integration_id: form.integration_id,
        credentials: { usuario: form.usuario, password: form.password } as unknown as Json,
        settings: {
          loja: form.loja,
          store_code: form.loja,
          image_base_url: form.image_base_url,
        } as unknown as Json,
        is_active: true,
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["company-integrations", companyId] });
      toast.success("Integração adicionada com sucesso");
      setForm(COMPANY_INTEGRATION_INITIAL_FORM);
      setShowSecret(false);
    },
    onError: (e: any) => {
      const message = String(e?.message || "");
      if (message === "integration_id_required") toast.error("Selecione uma integração");
      else if (message === "credentials_required") toast.error("Credenciais são obrigatórias");
      else if (message === "store_required") toast.error("Código da loja é obrigatório");
      else toast.error("Erro ao adicionar integração");
    },
  });

  const removeCompanyIntegration = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("company_integrations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["company-integrations", companyId] });
      toast.success("Integração removida");
    },
    onError: () => toast.error("Erro ao remover integração"),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setForm(COMPANY_INTEGRATION_INITIAL_FORM);
          setShowSecret(false);
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plug2 className="h-5 w-5" />
            Integrações de API
          </DialogTitle>
          <DialogDescription>Configure integrações para {companyName || "esta empresa"}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {companyIntegrations.length > 0 && (
            <div className="space-y-2 border-b pb-4">
              <h4 className="text-sm font-medium">Integrações ativas</h4>
              {isLoadingCompanyIntegrations ? (
                <div className="text-sm text-muted-foreground">Carregando...</div>
              ) : (
                companyIntegrations.map((ci) => {
                  const settings = (ci.settings as Record<string, string>) || {};
                  return (
                    <div key={ci.id} className="flex items-center justify-between rounded bg-accent/40 p-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Plug2 className="h-4 w-4 text-primary" />
                        <span className="font-medium">{ci.api_integrations?.name || "API"}</span>
                        <Badge variant="outline" className="font-mono text-xs">
                          Loja {settings.loja || "-"}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (!confirm("Remover esta integração?")) return;
                          removeCompanyIntegration.mutate(ci.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-medium">
              <Settings className="h-4 w-4" />
              Adicionar integração
            </h4>

            <div className="space-y-2">
              <Label>Tipo de Integração</Label>
              <Select value={form.integration_id} onValueChange={(value) => setForm({ ...form, integration_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a integração" />
                </SelectTrigger>
                <SelectContent>
                  {availableIntegrations.map((integration) => (
                    <SelectItem key={integration.id} value={integration.id}>
                      {integration.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3">
              <div className="space-y-2">
                <Label>Usuário</Label>
                <Input
                  value={form.usuario}
                  onChange={(e) => setForm({ ...form, usuario: e.target.value })}
                  placeholder="Usuário da API"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <div className="relative">
                  <Input
                    type={showSecret ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Senha da API"
                    autoComplete="off"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? "Ocultar" : "Mostrar"}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Código da Loja</Label>
                <Input
                  value={form.loja}
                  onChange={(e) => setForm({ ...form, loja: e.target.value })}
                  placeholder="Ex: 001"
                />
              </div>
              <div className="space-y-2">
                <Label>URL Base de Imagens</Label>
                <Input
                  value={form.image_base_url}
                  onChange={(e) => setForm({ ...form, image_base_url: e.target.value })}
                  placeholder="http://..."
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            onClick={() => addCompanyIntegration.mutate()}
            disabled={addCompanyIntegration.isPending || !companyId}
          >
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const INTEGRATION_FORM_DEFAULT: ApiIntegrationUpsert = {
  name: "",
  slug: "",
  base_url: "",
  description: null,
  is_active: true,
  auth_curl: null,
  auth_url: null,
  auth_method: null,
  auth_body_json: {},
  auth_headers_json: {},
  auth_query_params_json: {},
  auth_body_text: null,
  auth_token_path: null,
  token_expiration_seconds: null,
  request_curl: null,
  request_url: null,
  request_method: null,
  request_headers_json: {},
  request_params_json: {},
  request_query_params_json: {},
  request_body_json: {},
  request_body_text: null,
  request_variables_json: [],
  barcode_param_name: null,
  store_param_name: null,
  response_mapping_json: {},
};

function IntegrationUpsertDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ApiIntegrationRow | null;
  onSubmit: (payload: ApiIntegrationUpsert) => Promise<void>;
  isSubmitting: boolean;
}) {
  const { open, onOpenChange, initial, onSubmit, isSubmitting } = props;
  const isEdit = !!initial?.id;

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [authUrl, setAuthUrl] = useState("");
  const [authMethod, setAuthMethod] = useState("");
  const [authTokenPath, setAuthTokenPath] = useState("");
  const [tokenExpirationSeconds, setTokenExpirationSeconds] = useState<string>("");
  const [authHeadersJson, setAuthHeadersJson] = useState(jsonStringify({}, {}));
  const [authQueryParamsJson, setAuthQueryParamsJson] = useState(jsonStringify({}, {}));
  const [authBodyJson, setAuthBodyJson] = useState(jsonStringify({}, {}));
  const [authBodyText, setAuthBodyText] = useState("");

  const [requestUrl, setRequestUrl] = useState("");
  const [requestMethod, setRequestMethod] = useState("");
  const [requestHeadersJson, setRequestHeadersJson] = useState(jsonStringify({}, {}));
  const [requestQueryParamsJson, setRequestQueryParamsJson] = useState(jsonStringify({}, {}));
  const [requestParamsJson, setRequestParamsJson] = useState(jsonStringify({}, {}));
  const [requestBodyJson, setRequestBodyJson] = useState(jsonStringify({}, {}));
  const [requestBodyText, setRequestBodyText] = useState("");
  const [requestVariablesJson, setRequestVariablesJson] = useState(jsonStringify([], []));

  const [barcodeParamName, setBarcodeParamName] = useState("");
  const [storeParamName, setStoreParamName] = useState("");
  const [responseMappingJson, setResponseMappingJson] = useState(jsonStringify({}, {}));

  useEffect(() => {
    if (!open) return;
    const src = initial || null;
    if (!src) {
      setName(INTEGRATION_FORM_DEFAULT.name);
      setSlug(INTEGRATION_FORM_DEFAULT.slug);
      setBaseUrl(INTEGRATION_FORM_DEFAULT.base_url);
      setDescription("");
      setIsActive(true);

      setAuthUrl("");
      setAuthMethod("");
      setAuthTokenPath("");
      setTokenExpirationSeconds("");
      setAuthHeadersJson(jsonStringify({}, {}));
      setAuthQueryParamsJson(jsonStringify({}, {}));
      setAuthBodyJson(jsonStringify({}, {}));
      setAuthBodyText("");

      setRequestUrl("");
      setRequestMethod("");
      setRequestHeadersJson(jsonStringify({}, {}));
      setRequestQueryParamsJson(jsonStringify({}, {}));
      setRequestParamsJson(jsonStringify({}, {}));
      setRequestBodyJson(jsonStringify({}, {}));
      setRequestBodyText("");
      setRequestVariablesJson(jsonStringify([], []));

      setBarcodeParamName("");
      setStoreParamName("");
      setResponseMappingJson(jsonStringify({}, {}));
      return;
    }

    setName(src.name || "");
    setSlug(src.slug || "");
    setBaseUrl(src.base_url || "");
    setDescription(src.description || "");
    setIsActive(!!src.is_active);

    setAuthUrl(src.auth_url || "");
    setAuthMethod(src.auth_method || "");
    setAuthTokenPath(src.auth_token_path || "");
    setTokenExpirationSeconds(src.token_expiration_seconds ? String(src.token_expiration_seconds) : "");
    setAuthHeadersJson(jsonStringify(src.auth_headers_json, {}));
    setAuthQueryParamsJson(jsonStringify(src.auth_query_params_json, {}));
    setAuthBodyJson(jsonStringify(src.auth_body_json, {}));
    setAuthBodyText(src.auth_body_text || "");

    setRequestUrl(src.request_url || "");
    setRequestMethod(src.request_method || "");
    setRequestHeadersJson(jsonStringify(src.request_headers_json, {}));
    setRequestQueryParamsJson(jsonStringify(src.request_query_params_json, {}));
    setRequestParamsJson(jsonStringify(src.request_params_json, {}));
    setRequestBodyJson(jsonStringify(src.request_body_json, {}));
    setRequestBodyText(src.request_body_text || "");
    setRequestVariablesJson(jsonStringify(src.request_variables_json, []));

    setBarcodeParamName(src.barcode_param_name || "");
    setStoreParamName(src.store_param_name || "");
    setResponseMappingJson(jsonStringify(src.response_mapping_json, {}));
  }, [open, initial]);

  const submit = async () => {
    const cleanName = name.trim();
    const cleanSlug = slug.trim();
    const cleanBaseUrl = baseUrl.trim();

    if (!cleanName || !cleanSlug || !cleanBaseUrl) {
      toast.error("Preencha nome, slug e base_url");
      return;
    }

    let payload: ApiIntegrationUpsert;
    try {
      payload = {
        name: cleanName,
        slug: cleanSlug,
        base_url: cleanBaseUrl,
        description: description.trim() ? description.trim() : null,
        is_active: isActive,
        auth_curl: null,
        auth_url: authUrl.trim() ? authUrl.trim() : null,
        auth_method: authMethod.trim() ? authMethod.trim() : null,
        auth_body_json: parseJsonOrThrow(authBodyJson, "auth_body_json", {}) as unknown as Json,
        auth_headers_json: parseJsonOrThrow(authHeadersJson, "auth_headers_json", {}) as unknown as Json,
        auth_query_params_json: parseJsonOrThrow(authQueryParamsJson, "auth_query_params_json", {}) as unknown as Json,
        auth_body_text: authBodyText.trim() ? authBodyText.trim() : null,
        auth_token_path: authTokenPath.trim() ? authTokenPath.trim() : null,
        token_expiration_seconds: tokenExpirationSeconds.trim() ? Number(tokenExpirationSeconds.trim()) : null,
        request_curl: null,
        request_url: requestUrl.trim() ? requestUrl.trim() : null,
        request_method: requestMethod.trim() ? requestMethod.trim() : null,
        request_headers_json: parseJsonOrThrow(requestHeadersJson, "request_headers_json", {}) as unknown as Json,
        request_params_json: parseJsonOrThrow(requestParamsJson, "request_params_json", {}) as unknown as Json,
        request_query_params_json: parseJsonOrThrow(requestQueryParamsJson, "request_query_params_json", {}) as unknown as Json,
        request_body_json: parseJsonOrThrow(requestBodyJson, "request_body_json", {}) as unknown as Json,
        request_body_text: requestBodyText.trim() ? requestBodyText.trim() : null,
        request_variables_json: parseJsonOrThrow(requestVariablesJson, "request_variables_json", []) as unknown as Json,
        barcode_param_name: barcodeParamName.trim() ? barcodeParamName.trim() : null,
        store_param_name: storeParamName.trim() ? storeParamName.trim() : null,
        response_mapping_json: parseJsonOrThrow(responseMappingJson, "response_mapping_json", {}) as unknown as Json,
      };
    } catch {
      return;
    }

    await onSubmit(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isEdit ? "Editar Integração" : "Nova Integração"}
          </DialogTitle>
          <DialogDescription>Configure o template de integração (api_integrations).</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Assaí ERP" />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="assai" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Base URL</Label>
            <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.exemplo.com" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3 md:col-span-2">
            <div>
              <div className="text-sm font-medium">Ativa</div>
              <div className="text-xs text-muted-foreground">Disponível para vincular nas empresas</div>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <div className="text-sm font-semibold">Autenticação</div>
          </div>
          <div className="space-y-2">
            <Label>auth_url</Label>
            <Input value={authUrl} onChange={(e) => setAuthUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label>auth_method</Label>
            <Input value={authMethod} onChange={(e) => setAuthMethod(e.target.value)} placeholder="POST" />
          </div>
          <div className="space-y-2">
            <Label>auth_token_path</Label>
            <Input value={authTokenPath} onChange={(e) => setAuthTokenPath(e.target.value)} placeholder="data.token" />
          </div>
          <div className="space-y-2">
            <Label>token_expiration_seconds</Label>
            <Input
              value={tokenExpirationSeconds}
              onChange={(e) => setTokenExpirationSeconds(e.target.value)}
              placeholder="3600"
              inputMode="numeric"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>auth_headers_json</Label>
            <Textarea value={authHeadersJson} onChange={(e) => setAuthHeadersJson(e.target.value)} className="font-mono text-xs" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>auth_query_params_json</Label>
            <Textarea value={authQueryParamsJson} onChange={(e) => setAuthQueryParamsJson(e.target.value)} className="font-mono text-xs" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>auth_body_json</Label>
            <Textarea value={authBodyJson} onChange={(e) => setAuthBodyJson(e.target.value)} className="font-mono text-xs" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>auth_body_text</Label>
            <Textarea value={authBodyText} onChange={(e) => setAuthBodyText(e.target.value)} className="font-mono text-xs" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <div className="text-sm font-semibold">Requisição</div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>request_url</Label>
            <Input value={requestUrl} onChange={(e) => setRequestUrl(e.target.value)} placeholder="/endpoint" />
          </div>
          <div className="space-y-2">
            <Label>request_method</Label>
            <Input value={requestMethod} onChange={(e) => setRequestMethod(e.target.value)} placeholder="GET" />
          </div>
          <div className="space-y-2">
            <Label>barcode_param_name</Label>
            <Input value={barcodeParamName} onChange={(e) => setBarcodeParamName(e.target.value)} placeholder="ean" />
          </div>
          <div className="space-y-2">
            <Label>store_param_name</Label>
            <Input value={storeParamName} onChange={(e) => setStoreParamName(e.target.value)} placeholder="store" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>request_headers_json</Label>
            <Textarea value={requestHeadersJson} onChange={(e) => setRequestHeadersJson(e.target.value)} className="font-mono text-xs" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>request_query_params_json</Label>
            <Textarea value={requestQueryParamsJson} onChange={(e) => setRequestQueryParamsJson(e.target.value)} className="font-mono text-xs" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>request_params_json</Label>
            <Textarea value={requestParamsJson} onChange={(e) => setRequestParamsJson(e.target.value)} className="font-mono text-xs" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>request_body_json</Label>
            <Textarea value={requestBodyJson} onChange={(e) => setRequestBodyJson(e.target.value)} className="font-mono text-xs" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>request_body_text</Label>
            <Textarea value={requestBodyText} onChange={(e) => setRequestBodyText(e.target.value)} className="font-mono text-xs" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>request_variables_json</Label>
            <Textarea
              value={requestVariablesJson}
              onChange={(e) => setRequestVariablesJson(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <div className="text-sm font-semibold">Mapeamento</div>
          </div>
          <div className="space-y-2">
            <Label>response_mapping_json</Label>
            <Textarea value={responseMappingJson} onChange={(e) => setResponseMappingJson(e.target.value)} className="font-mono text-xs" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={isSubmitting}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ApiIntegrationsPage() {
  const { isSuperAdmin, isAdmin, companyId } = useUserRole();
  const queryClient = useQueryClient();
  const { integrations, isLoading, createIntegration, updateIntegration, setActive } = useApiIntegrations();

  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [upsertOpen, setUpsertOpen] = useState(false);
  const [editing, setEditing] = useState<ApiIntegrationRow | null>(null);

  const { data: company } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase.from("companies").select("id,name").eq("id", companyId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: companyIntegrations = [] } = useQuery({
    queryKey: ["company-integrations-page", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("company_integrations")
        .select("id,is_active,settings,api_integrations(name,slug)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (
        (data || []) as Array<
          Pick<CompanyIntegrationRow, "id" | "is_active" | "settings"> & {
            api_integrations: { name: string; slug: string } | null;
          }
        >
      );
    },
    enabled: !!companyId,
  });

  const removeCompanyIntegration = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("company_integrations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["company-integrations-page", companyId] });
      await queryClient.invalidateQueries({ queryKey: ["company-integrations", companyId] });
      toast.success("Integração removida");
    },
    onError: () => toast.error("Erro ao remover integração"),
  });

  const activeIntegrations = useMemo(() => {
    return (integrations || []).slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [integrations]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrações de API"
        description="Gerencie templates de integração e vincule credenciais por empresa."
        actions={
          <div className="flex gap-2">
            {isAdmin && (
              <Button variant="outline" onClick={() => setCompanyDialogOpen(true)} disabled={!companyId}>
                <Plug2 className="h-4 w-4 mr-2" />
                Configurar Empresa
              </Button>
            )}
            {isSuperAdmin && (
              <Button
                onClick={() => {
                  setEditing(null);
                  setUpsertOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Integração
              </Button>
            )}
          </div>
        }
      />

      {isAdmin && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Integrações vinculadas à empresa</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Integração</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyIntegrations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                      Nenhuma integração configurada.
                    </TableCell>
                  </TableRow>
                ) : (
                  companyIntegrations.map((ci) => {
                    const settings = (ci.settings as Record<string, string>) || {};
                    return (
                      <TableRow key={ci.id}>
                        <TableCell className="font-medium">{ci.api_integrations?.name || "API"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {settings.loja || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={ci.is_active ? "default" : "secondary"}>{ci.is_active ? "Ativa" : "Inativa"}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (!confirm("Remover esta integração?")) return;
                              removeCompanyIntegration.mutate(ci.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {isSuperAdmin && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Templates (api_integrations)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Base URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : activeIntegrations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                      Nenhuma integração encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  activeIntegrations.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {i.slug}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{i.base_url}</TableCell>
                      <TableCell>
                        <Badge variant={i.is_active ? "default" : "secondary"}>{i.is_active ? "Ativa" : "Inativa"}</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditing(i);
                            setUpsertOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActive.mutate({ id: i.id, is_active: !i.is_active })}
                          disabled={setActive.isPending}
                        >
                          {i.is_active ? "Desativar" : "Ativar"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <CompanyIntegrationsDialog
        open={companyDialogOpen}
        onOpenChange={setCompanyDialogOpen}
        companyId={companyId}
        companyName={company?.name || null}
      />

      <IntegrationUpsertDialog
        open={upsertOpen}
        onOpenChange={(o) => {
          setUpsertOpen(o);
          if (!o) setEditing(null);
        }}
        initial={editing}
        isSubmitting={createIntegration.isPending || updateIntegration.isPending}
        onSubmit={async (payload) => {
          if (editing?.id) {
            await updateIntegration.mutateAsync({ id: editing.id, ...payload } as any);
          } else {
            await createIntegration.mutateAsync(payload);
          }
        }}
      />
    </div>
  );
}
