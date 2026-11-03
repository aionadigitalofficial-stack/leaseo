import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, CircleHelp, Clock3, KeyRound, MessageSquareText, RefreshCw, ShieldCheck, Smartphone, Wifi } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

type WhatsAppSettings = {
  enabled: boolean;
  apiVersion: string;
  phoneNumberId: string;
  businessAccountId: string;
  testRecipient: string;
  testTemplate: string;
  testLanguage: string;
  hasAccessToken: boolean;
  hasAppSecret: boolean;
  hasVerifyToken: boolean;
};

type WhatsAppStatus = {
  enabled: boolean;
  configured: boolean;
  missing: string[];
  invalid: string[];
  encryptionReady: boolean;
  source: "database" | "environment";
  testRecipientConfigured: boolean;
  webhookPath: "/api/whatsapp/webhook";
  automaticNotifications: false;
};

type SettingsResponse = { settings: WhatsAppSettings; status: WhatsAppStatus; updatedAt: string | null };
type DeliveryEvent = { messageId: string; status: string; eventTimestamp: string; errorCode: number | null; receivedAt: string };
type DeliveryResponse = { events: DeliveryEvent[] };
type FormValues = Pick<WhatsAppSettings, "enabled" | "apiVersion" | "phoneNumberId" | "businessAccountId" | "testRecipient" | "testTemplate" | "testLanguage">;
type Secrets = { accessToken: string; appSecret: string; verifyToken: string };
type SafeApiError = { error?: string; missing?: string[]; invalid?: string[] };

const EMPTY_FORM: FormValues = {
  enabled: false,
  apiVersion: "v24.0",
  phoneNumberId: "",
  businessAccountId: "",
  testRecipient: "",
  testTemplate: "hello_world",
  testLanguage: "en_US",
};

const SETTINGS_KEY = ["/api/admin/whatsapp/settings"];
const EVENTS_KEY = ["/api/admin/whatsapp/delivery-events"];

function extractSafeError(error: unknown): SafeApiError {
  const message = error instanceof Error ? error.message : "";
  const match = message.match(/\{[\s\S]*\}$/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]) as SafeApiError;
      if (typeof parsed.error === "string") return parsed;
    } catch {
      // Do not surface raw provider or transport response text.
    }
  }
  return {};
}

function errorText(error: unknown) {
  const details = extractSafeError(error);
  const code = details.error;
  if (code === "INVALID_WHATSAPP_SETTINGS") {
    return `Check the required or invalid settings: ${[...(details.missing || []), ...(details.invalid || [])].join(", ") || "invalid input"}.`;
  }
  if (code === "WHATSAPP_SETTINGS_STORAGE_UNAVAILABLE") return "Settings storage is unavailable. Apply or rerun the WhatsApp database migration, then try again.";
  if (code === "WHATSAPP_ENCRYPTION_KEY_REQUIRED") return "A stable encryption key is required before settings can be saved. Configure WHATSAPP_CONFIG_ENCRYPTION_KEY (32+ characters), or an existing strong SESSION_SECRET/JWT_SECRET, in Coolify.";
  if (code === "WHATSAPP_SETTINGS_DECRYPTION_FAILED") return "Saved credentials cannot be decrypted because the encryption key changed. Restore the original key before continuing.";
  if (code) return `The WhatsApp settings service rejected this request (${code}).`;
  if (messageLooksUnavailable(error)) return "The Meta WhatsApp admin API is unavailable. Settings have not been saved; check the server deployment and try again.";
  return "The request could not be completed. No secret values are shown here. Check the connection and try again.";
}

function messageLooksUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return /failed to fetch|networkerror|404|not found|503|502/i.test(message);
}

function toForm(settings: WhatsAppSettings): FormValues {
  return {
    enabled: settings.enabled,
    apiVersion: settings.apiVersion || "v24.0",
    phoneNumberId: settings.phoneNumberId || "",
    businessAccountId: settings.businessAccountId || "",
    testRecipient: settings.testRecipient || "",
    testTemplate: settings.testTemplate || "hello_world",
    testLanguage: settings.testLanguage || "en_US",
  };
}

function timestamp(value: string) {
  const date = new Date(/^\d+$/.test(value) ? Number(value) * 1000 : value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function MetaWhatsAppSettings() {
  const settingsQuery = useQuery<SettingsResponse>({
    queryKey: SETTINGS_KEY,
    queryFn: async () => (await apiRequest("GET", "/api/admin/whatsapp/settings")).json(),
    staleTime: 0,
    refetchOnMount: true,
    refetchInterval: 30_000,
  });
  const eventsQuery = useQuery<DeliveryResponse>({
    queryKey: EVENTS_KEY,
    queryFn: async () => (await apiRequest("GET", "/api/admin/whatsapp/delivery-events")).json(),
    staleTime: 0,
    refetchOnMount: true,
    refetchInterval: 30_000,
  });

  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [secrets, setSecrets] = useState<Secrets>({ accessToken: "", appSecret: "", verifyToken: "" });
  const [savedForm, setSavedForm] = useState<FormValues | null>(null);
  const [savedSecretFlags, setSavedSecretFlags] = useState({ accessToken: false, appSecret: false, verifyToken: false });
  const [consent, setConsent] = useState(false);
  const [parameters, setParameters] = useState<string[]>([]);
  const [testNotice, setTestNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const isDirty = useMemo(() => {
    if (!savedForm) return false;
    return JSON.stringify(form) !== JSON.stringify(savedForm) ||
      !!secrets.accessToken || !!secrets.appSecret || !!secrets.verifyToken;
  }, [form, savedForm, secrets]);

  useEffect(() => {
    const value = settingsQuery.data;
    if (!value || isDirty) return;
    const next = toForm(value.settings);
    setForm(next);
    setSavedForm(next);
    setSavedSecretFlags({
      accessToken: value.settings.hasAccessToken,
      appSecret: value.settings.hasAppSecret,
      verifyToken: value.settings.hasVerifyToken,
    });
  }, [settingsQuery.data, isDirty]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: FormValues & Partial<Secrets> = { ...form };
      if (secrets.accessToken.trim()) payload.accessToken = secrets.accessToken;
      if (secrets.appSecret.trim()) payload.appSecret = secrets.appSecret;
      if (secrets.verifyToken.trim()) payload.verifyToken = secrets.verifyToken;
      return await (await apiRequest("PUT", "/api/admin/whatsapp/settings", payload)).json() as SettingsResponse;
    },
    onSuccess: (response) => {
      const next = toForm(response.settings);
      setForm(next);
      setSavedForm(next);
      setSavedSecretFlags({
        accessToken: response.settings.hasAccessToken,
        appSecret: response.settings.hasAppSecret,
        verifyToken: response.settings.hasVerifyToken,
      });
      setSecrets({ accessToken: "", appSecret: "", verifyToken: "" });
      queryClient.setQueryData(SETTINGS_KEY, response);
      setTestNotice(null);
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const bodyParameters = parameters.map(value => value.trim());
      if (bodyParameters.some(value => !value || value.length > 1024)) {
        throw new Error("Each template parameter must contain 1–1024 characters.");
      }
      const body: { consentConfirmed: true; bodyParameters?: string[] } = { consentConfirmed: true };
      if (bodyParameters.length) body.bodyParameters = bodyParameters;
      return await (await apiRequest("POST", "/api/admin/whatsapp/test", body)).json() as { messageId: string; status: "accepted" };
    },
    onSuccess: (response) => {
      setTestNotice({ kind: "success", text: `Accepted by Meta for processing. Message ID: ${response.messageId}. This does not confirm delivery.` });
      setConsent(false);
      eventsQuery.refetch();
    },
    onError: (error) => setTestNotice({ kind: "error", text: error instanceof Error && error.message.includes("parameter") ? error.message : errorText(error) }),
  });

  const settingsError = settingsQuery.error;
  const status = settingsQuery.data?.status;
  const canTest = !!savedForm && !isDirty && !!settingsQuery.data?.settings.enabled && !!status?.configured &&
    !!status.testRecipientConfigured && consent && !testMutation.isPending;

  const change = <K extends keyof FormValues>(key: K, value: FormValues[K]) => setForm(current => ({ ...current, [key]: value }));
  const secretField = (key: keyof Secrets, label: string, saved: boolean) => (
    <div className="space-y-2" key={key}>
      <Label htmlFor={`meta-${key}`}>{label}</Label>
      <Input
        id={`meta-${key}`}
        type="password"
        autoComplete="new-password"
        value={secrets[key]}
        onChange={(event) => setSecrets(current => ({ ...current, [key]: event.target.value }))}
        placeholder={saved ? "Saved securely · enter a new value to rotate" : "Paste secret"}
      />
      <p className="text-xs text-muted-foreground">{saved ? "A value is stored. Leave blank to keep it unchanged." : "Never shown again after saving."}</p>
    </div>
  );

  if (settingsQuery.isLoading) {
    return <div className="space-y-4" aria-label="Loading Meta WhatsApp settings">
      <Skeleton className="h-24 w-full" /><Skeleton className="h-72 w-full" /><Skeleton className="h-48 w-full" />
    </div>;
  }

  if (settingsError || !settingsQuery.data) {
    return <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-destructive" /> Meta WhatsApp API unavailable</CardTitle>
        <CardDescription>{errorText(settingsError)}</CardDescription>
      </CardHeader>
      <CardContent><Button variant="outline" onClick={() => settingsQuery.refetch()} disabled={settingsQuery.isFetching}><RefreshCw className="mr-2 h-4 w-4" />Retry connection</Button></CardContent>
    </Card>;
  }

  const missing = status?.missing || [];
  const invalid = status?.invalid || [];

  return (
    <fieldset disabled={saveMutation.isPending || testMutation.isPending} className="min-w-0 space-y-5">
      <Card className="overflow-hidden border-primary/20">
        <CardHeader className="bg-primary/[0.045]">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary"><MessageSquareText className="h-4 w-4" /> META BUSINESS MESSAGING</div>
              <CardTitle className="text-xl">Meta WhatsApp Cloud API</CardTitle>
              <CardDescription className="mt-1 max-w-2xl">Connect Leaseo’s business number for approved WhatsApp messaging. Saving credentials never sends a message.</CardDescription>
            </div>
            <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3">
              <div className="text-right">
                <p className="text-sm font-semibold">{form.enabled ? "Enabled" : "Disabled"}</p>
                <p className="text-xs text-muted-foreground">Messaging state</p>
              </div>
              <Switch checked={form.enabled} onCheckedChange={(checked) => change("enabled", checked)} aria-label="Enable Meta WhatsApp" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 pt-5 sm:grid-cols-3">
          <div className="flex gap-3 rounded-lg border p-3">
            <ShieldCheck className={`mt-0.5 h-5 w-5 shrink-0 ${status?.encryptionReady ? "text-emerald-600" : "text-amber-600"}`} />
            <div><p className="text-sm font-medium">Encrypted storage</p><p className="mt-1 text-xs text-muted-foreground">{status?.encryptionReady ? "Ready to store credentials securely." : "A stable strong server encryption key is required."}</p></div>
          </div>
          <div className="flex gap-3 rounded-lg border p-3">
            <Wifi className={`mt-0.5 h-5 w-5 shrink-0 ${status?.configured ? "text-emerald-600" : "text-muted-foreground"}`} />
            <div><p className="text-sm font-medium">{status?.configured ? "Configuration complete" : "Configuration incomplete"}</p><p className="mt-1 text-xs text-muted-foreground">{status?.source === "database" ? "Dashboard settings take precedence." : "Currently using environment configuration."}</p></div>
          </div>
          <div className="flex gap-3 rounded-lg border p-3">
            <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div><p className="text-sm font-medium">Webhook endpoint</p><p className="mt-1 break-all font-mono text-xs text-muted-foreground">{status?.webhookPath || "/api/whatsapp/webhook"}</p></div>
          </div>
        </CardContent>
      </Card>

      {!status?.encryptionReady && (
        <div className="flex gap-3 rounded-lg border border-amber-300/70 bg-amber-50/70 p-4 text-sm text-amber-950">
          <KeyRound className="mt-0.5 h-5 w-5 shrink-0" />
          <div><p className="font-semibold">Prepare server-side encryption before saving</p><p className="mt-1 leading-relaxed">Configure a stable <code className="rounded bg-amber-100 px-1">WHATSAPP_CONFIG_ENCRYPTION_KEY</code> with at least 32 characters in Coolify, or use an existing strong <code className="rounded bg-amber-100 px-1">SESSION_SECRET</code>/<code className="rounded bg-amber-100 px-1">JWT_SECRET</code>. Keep it stable: changing it can make stored credentials unreadable.</p></div>
        </div>
      )}

      {(missing.length > 0 || invalid.length > 0) && (
        <div className="rounded-lg border border-amber-300/70 bg-amber-50/70 p-4 text-sm text-amber-950">
          <p className="font-semibold">Configuration needs attention</p>
          {missing.length > 0 && <p className="mt-1">Missing: {missing.join(", ")}</p>}
          {invalid.length > 0 && <p className="mt-1">Invalid: {invalid.join(", ")}</p>}
          {form.enabled && <p className="mt-2">To enable messaging, complete and validate all required credentials.</p>}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Connection details</CardTitle>
          <CardDescription>Non-secret values are restored when you return. Secret inputs are always blank and are never cached or displayed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="meta-api-version">Graph API version</Label><Input id="meta-api-version" value={form.apiVersion} onChange={(e) => change("apiVersion", e.target.value)} placeholder="v21.0" /></div>
            <div className="space-y-2"><Label htmlFor="meta-phone-id">Phone number ID</Label><Input id="meta-phone-id" value={form.phoneNumberId} onChange={(e) => change("phoneNumberId", e.target.value)} placeholder="Meta WhatsApp phone number ID" /></div>
            <div className="space-y-2"><Label htmlFor="meta-business-id">Business account ID</Label><Input id="meta-business-id" value={form.businessAccountId} onChange={(e) => change("businessAccountId", e.target.value)} placeholder="Meta business account ID" /></div>
            <div className="space-y-2"><Label htmlFor="meta-test-recipient">Test recipient</Label><Input id="meta-test-recipient" value={form.testRecipient} onChange={(e) => change("testRecipient", e.target.value)} placeholder="15551234567 (country code included)" /><p className="text-xs text-muted-foreground">Use digits with country code, without spaces or punctuation.</p></div>
            <div className="space-y-2"><Label htmlFor="meta-template">Test template</Label><Input id="meta-template" value={form.testTemplate} onChange={(e) => change("testTemplate", e.target.value)} placeholder="hello_world" /><p className="text-xs text-muted-foreground">hello_world is for Meta’s test sender. A production sender needs its own approved template.</p></div>
            <div className="space-y-2"><Label htmlFor="meta-language">Template language</Label><Input id="meta-language" value={form.testLanguage} onChange={(e) => change("testLanguage", e.target.value)} placeholder="en_US" /></div>
          </div>
          <div className="border-t pt-5">
            <div className="mb-4"><p className="font-medium">Credentials</p><p className="text-sm text-muted-foreground">Blank fields preserve currently saved secrets. To rotate one, enter its replacement.</p></div>
            <div className="grid gap-5 sm:grid-cols-2">
              {secretField("accessToken", "Permanent access token", savedSecretFlags.accessToken)}
              {secretField("appSecret", "App secret", savedSecretFlags.appSecret)}
              {secretField("verifyToken", "Webhook verify token", savedSecretFlags.verifyToken)}
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm">
              {isDirty ? <Badge variant="secondary">Unsaved changes</Badge> : <Badge variant="outline" className="text-emerald-700"><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Saved configuration</Badge>}
              <span className="text-xs text-muted-foreground">{settingsQuery.data.updatedAt ? `Updated ${timestamp(settingsQuery.data.updatedAt)}` : "Not saved yet"}</span>
            </div>
            <div className="flex items-center gap-2">
              {isDirty && <Button variant="outline" onClick={() => {
                if (savedForm) setForm(savedForm);
                setSecrets({ accessToken: "", appSecret: "", verifyToken: "" });
              }}>Discard changes</Button>}
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !isDirty || !status?.encryptionReady}>
              {saveMutation.isPending ? "Saving securely…" : "Save settings"}
              </Button>
            </div>
          </div>
          {saveMutation.isError && <p role="alert" className="text-sm text-destructive">{errorText(saveMutation.error)}</p>}
          {saveMutation.isSuccess && !isDirty && <p className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />Settings saved. Secret fields have been cleared from this page.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Send a consented test message</CardTitle>
          <CardDescription>This sends a real outbound WhatsApp message and may incur charges. Recipient, template and language are taken from the saved configuration only.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.testTemplate === "hello_world" && <div className="flex gap-2 rounded-md bg-muted/60 p-3 text-sm text-muted-foreground"><CircleHelp className="h-4 w-4 shrink-0" /><span>hello_world is only for Meta’s test sender. A production sender must use its own approved template.</span></div>}
          {isDirty && <p className="text-sm text-amber-700">Save or discard your pending changes before testing. Tests always use the last saved configuration.</p>}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-sm font-medium">Positional body parameters</p><p className="text-xs text-muted-foreground">Text values must match the template’s body parameter order. Up to 30, maximum 1,024 characters each.</p></div>
              <Button type="button" variant="outline" size="sm" onClick={() => setParameters(current => current.length < 30 ? [...current, ""] : current)} disabled={parameters.length >= 30}>Add parameter</Button>
            </div>
            {parameters.length > 0 && <ol className="space-y-2">
              {parameters.map((value, index) => <li className="flex items-center gap-2" key={index}>
                <span className="w-7 shrink-0 text-center text-xs font-medium text-muted-foreground">{index + 1}</span>
                <Input aria-label={`Template body parameter ${index + 1}`} value={value} maxLength={1024} onChange={(event) => setParameters(current => current.map((entry, i) => i === index ? event.target.value : entry))} placeholder={`Template text value ${index + 1}`} />
                <Button type="button" variant="ghost" size="sm" onClick={() => setParameters(current => current.filter((_, i) => i !== index))} aria-label={`Remove parameter ${index + 1}`}>Remove</Button>
              </li>)}
            </ol>}
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
            <Checkbox checked={consent} onCheckedChange={(checked) => setConsent(checked === true)} />
            <span className="text-sm leading-relaxed">I confirm the saved test recipient has consented to receive this message. I understand this sends a real message and may be charged.</span>
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button onClick={() => { setTestNotice(null); testMutation.mutate(); }} disabled={!canTest}>
              {testMutation.isPending ? "Submitting test…" : "Send test message"}
            </Button>
            {!status?.configured || !settingsQuery.data.settings.enabled || !status.testRecipientConfigured
              ? <span className="text-xs text-muted-foreground">Enable and save a complete configuration with a test recipient to send.</span>
              : null}
          </div>
          {testNotice && <div role="status" className={`rounded-md border p-3 text-sm ${testNotice.kind === "error" ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-emerald-300/60 bg-emerald-50 text-emerald-900"}`}>{testNotice.text}</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div><CardTitle className="text-lg">Recent delivery events</CardTitle><CardDescription>Latest 50 events. This list refreshes every 30 seconds and after a test attempt.</CardDescription></div>
          <Button variant="outline" size="sm" onClick={() => eventsQuery.refetch()} disabled={eventsQuery.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${eventsQuery.isFetching ? "animate-spin" : ""}`} />Refresh</Button>
        </CardHeader>
        <CardContent>
          {eventsQuery.isLoading ? <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
            : eventsQuery.isError ? <div className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><div><p>{errorText(eventsQuery.error)}</p><Button className="mt-2 h-8 px-2" variant="outline" size="sm" onClick={() => eventsQuery.refetch()}>Retry delivery events</Button></div></div>
              : !eventsQuery.data?.events?.length ? <div className="rounded-lg border border-dashed p-6 text-center"><Clock3 className="mx-auto mb-2 h-5 w-5 text-muted-foreground" /><p className="text-sm font-medium">No delivery events yet</p><p className="mt-1 text-xs text-muted-foreground">Events will appear here after WhatsApp message activity.</p></div>
                : <div className="space-y-2">
                  {eventsQuery.data.events.map((event, index) => <div key={`${event.messageId}-${index}`} className="grid gap-2 rounded-lg border px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                    <div className="min-w-0"><p className="truncate font-mono text-xs text-muted-foreground">{event.messageId}</p><p className="mt-1 text-xs">{timestamp(event.eventTimestamp)}</p></div>
                    <Badge variant={/delivered|read/i.test(event.status) ? "default" : "secondary"} className="w-fit">{event.status}</Badge>
                    <p className="text-xs text-muted-foreground">{event.errorCode !== null ? `Error code ${event.errorCode}` : `Received ${timestamp(event.receivedAt)}`}</p>
                  </div>)}
                </div>}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">Automatic notifications are not enabled by this configuration. Test results are accepted for processing until a delivery event confirms the final status.</p>
    </fieldset>
  );
}
