import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import NotificationTemplateLibrary from "@/components/notification-template-library";
import { AlertCircle, BellRing, Check, ChevronRight, Clock3, Eye, Mail, MessageCircle, RefreshCw, Save, Send, Settings2 } from "lucide-react";

type Recipient = "customer" | "owner" | "admin" | "chat";
type Channel = "whatsapp" | "sms" | "email" | "chat";
type Template = {
  id: string;
  template_name: string;
  recipient_type: Recipient;
  channel: Channel;
  event_type: string;
  subject: string;
  message_body: string;
  is_enabled: boolean;
  meta_template_name: string | null;
  meta_language: string | null;
  parameter_keys: string[];
  sms_template_id: string | null;
  updated_at: string;
};
type NotificationLog = {
  id: string;
  enquiry_id: string;
  recipient_type: string;
  channel: string;
  status: string;
  attempts: number;
  retryable: boolean;
  error_code: string | null;
  provider_message_id: string | null;
  created_at: string;
  sent_at: string | null;
};
type EnquiryOption = { id: string; property_title: string; customer_name: string; created_at: string };
type Settings = {
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  adminPhone: string;
  adminEmail: string;
  adminWhatsappConsent: boolean;
  ownerWhatsappConsent: boolean;
  siteUrl: string;
  platformName: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpFromName: string;
  smtpFromEmail: string;
  hasSmtpPassword: boolean;
};
type Payload = { templates: Template[]; settings: Settings; placeholders: string[]; logs: NotificationLog[]; providerStatus: { whatsapp: { configured: boolean; enabled: boolean }; sms: { configured: boolean }; email: { configured: boolean } } };
type Props = { onConfigureProviders?: () => void };

const initialSettings: Settings = {
  whatsappEnabled: false, smsEnabled: false, emailEnabled: false,
  adminPhone: "", adminEmail: "", adminWhatsappConsent: false, ownerWhatsappConsent: false,
  siteUrl: "", platformName: "Leaseo", smtpHost: "", smtpPort: 587, smtpSecure: false,
  smtpUser: "", smtpFromName: "", smtpFromEmail: "", hasSmtpPassword: false,
};
const statusTone: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  processing: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  accepted: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  sent: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  delivered: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  read: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  skipped: "bg-muted text-muted-foreground",
  unknown: "bg-muted text-muted-foreground",
};

function ChannelIcon({ channel }: { channel: string }) {
  if (channel === "email") return <Mail className="h-4 w-4" />;
  if (channel === "whatsapp" || channel === "chat") return <MessageCircle className="h-4 w-4" />;
  return <Send className="h-4 w-4" />;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function NotificationManagement({ onConfigureProviders }: Props) {
  const { toast } = useToast();
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient>("customer");
  const [activeTab, setActiveTab] = useState("customer");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Template>>({});
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [smtpPassword, setSmtpPassword] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewEnquiry, setPreviewEnquiry] = useState("");
  const [previewResult, setPreviewResult] = useState<{ subject: string; body: string; parameters: string[] } | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [testEnquiry, setTestEnquiry] = useState("");
  const [testRecipient, setTestRecipient] = useState("");
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [freeEnquiryId, setFreeEnquiryId] = useState("");
  const [testResult, setTestResult] = useState<{ id: string; status: string } | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const subjectRef = useRef<HTMLInputElement | null>(null);
  const insertionTargetRef = useRef<"body" | "subject">("body");
  const settingsBaselineRef = useRef<string | null>(null);
  const templateBaselineRef = useRef<Template | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery<Payload>({
    queryKey: ["/api/admin/notifications"],
    queryFn: async () => (await apiRequest("GET", "/api/admin/notifications")).json(),
    refetchOnMount: true,
    staleTime: 0,
    refetchInterval: 30000,
  });
  const logsQuery = useQuery<NotificationLog[]>({
    queryKey: ["/api/admin/notifications/logs"],
    queryFn: async () => (await apiRequest("GET", "/api/admin/notifications/logs")).json(),
    refetchInterval: 15000,
  });
  const enquiryQuery = useQuery<EnquiryOption[]>({
    queryKey: ["/api/admin/notifications/enquiries"],
    queryFn: async () => (await apiRequest("GET", "/api/admin/notifications/enquiries")).json(),
    enabled: previewOpen || testOpen,
  });

  const templates = data?.templates ?? [];
  const recipients = useMemo(() => (["customer", "owner", "admin", "chat"] as Recipient[]).filter((recipient) =>
    templates.some((template) => template.recipient_type === recipient)), [templates]);
  const recipientTemplates = templates.filter((template) => template.recipient_type === selectedRecipient);
  const selectedTemplate = recipientTemplates.find((template) => template.id === selectedId) ?? recipientTemplates[0] ?? null;

  useEffect(() => {
    if (!data) return;
    const next = { ...initialSettings, ...data.settings };
    setSettings((current) => {
      if (settingsBaselineRef.current === null || JSON.stringify(current) === settingsBaselineRef.current) {
        settingsBaselineRef.current = JSON.stringify(next);
        return next;
      }
      return current;
    });
  }, [data]);
  useEffect(() => {
    if (selectedTemplate) {
      setSelectedId(selectedTemplate.id);
      const previous = templateBaselineRef.current;
      setDraft(current => !previous || previous.id !== selectedTemplate.id ||
        JSON.stringify(current) === JSON.stringify(previous)
        ? { ...selectedTemplate, parameter_keys: [...(selectedTemplate.parameter_keys ?? [])] } : current);
      templateBaselineRef.current = selectedTemplate;
    } else {
      setSelectedId(null);
      setDraft({});
    }
  }, [selectedTemplate]);
  useEffect(() => {
    if (recipients.length && !recipients.includes(selectedRecipient)) {
      setSelectedRecipient(recipients[0]);
      setActiveTab(recipients[0]);
    }
  }, [recipients, selectedRecipient]);

  const saveTemplateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<Template> }) =>
      (await apiRequest("PATCH", `/api/admin/notifications/templates/${id}`, values)).json() as Promise<Template>,
    onSuccess: async (saved) => {
      setDraft({...saved,parameter_keys:[...saved.parameter_keys]});
      templateBaselineRef.current=saved;
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      toast({ title: "Template saved", description: "Future notification jobs will use the updated template." });
    },
    onError: (err: Error) => toast({ title: "Could not save template", description: err.message, variant: "destructive" }),
  });
  const settingsMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { ...settings };
      delete payload.hasSmtpPassword;
      if (smtpPassword.trim()) payload.smtpPassword = smtpPassword;
      return (await apiRequest("PUT", "/api/admin/notifications/settings", payload)).json() as Promise<Settings>;
    },
    onSuccess: async (saved) => {
      setSettings(saved);
      settingsBaselineRef.current = JSON.stringify(saved);
      setSmtpPassword("");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      toast({ title: "Notification settings saved" });
    },
    onError: (err: Error) => toast({ title: "Could not save settings", description: err.message, variant: "destructive" }),
  });
  const previewMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {};
      if (previewEnquiry.trim() && previewEnquiry !== "__sample") body.enquiryId = previewEnquiry.trim();
      else body.values = {};
      const response = await apiRequest("POST", `/api/admin/notifications/templates/${selectedTemplate?.id}/preview`, body);
      return response.json() as Promise<{ subject: string; body: string; parameters: string[] }>;
    },
    onSuccess: setPreviewResult,
    onError: (err: Error) => toast({ title: "Preview unavailable", description: err.message, variant: "destructive" }),
  });
  const testMutation = useMutation({
    mutationFn: async () => {
      const enquiryId = testEnquiry === "__manual" ? freeEnquiryId.trim() : testEnquiry;
      if (!enquiryId) throw new Error("Choose an enquiry or enter its ID.");
      if (!testRecipient.trim()) throw new Error("Enter a recipient for this test.");
      if (!consentConfirmed) throw new Error("Confirm consent before submitting a real test notification.");
      const response = await apiRequest("POST", `/api/admin/notifications/templates/${selectedTemplate?.id}/test`, {
        enquiryId, recipient: testRecipient.trim(), consentConfirmed: true,
      });
      return response.json() as Promise<{ id: string; status: string }>;
    },
    onSuccess: (result) => {
      setTestResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications/logs"] });
      toast({ title: "Test accepted", description: `Queue status: ${result.status}. Accepted does not mean delivered.` });
    },
    onError: (err: Error) => toast({ title: "Test was not queued", description: err.message, variant: "destructive" }),
  });
  const retryMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("POST", `/api/admin/notifications/retry/${id}`, {}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications/logs"] });
      toast({ title: "Retry queued" });
    },
    onError: (err: Error) => toast({ title: "Retry unavailable", description: err.message, variant: "destructive" }),
  });

  const patchDraft = (patch: Partial<Template>) => setDraft((current) => ({ ...current, ...patch }));
  const insertPlaceholder = (placeholder: string, target: "body" | "subject") => {
    const ref = target === "body" ? bodyRef.current : subjectRef.current;
    const key = target === "body" ? "message_body" : "subject";
    const current = String(draft[key] ?? "");
    if (!ref) {
      patchDraft({ [key]: `${current}${placeholder}` } as Partial<Template>);
      return;
    }
    const start = ref.selectionStart ?? current.length;
    const end = ref.selectionEnd ?? start;
    patchDraft({ [key]: `${current.slice(0, start)}${placeholder}${current.slice(end)}` } as Partial<Template>);
    requestAnimationFrame(() => {
      ref.focus();
      ref.setSelectionRange(start + placeholder.length, start + placeholder.length);
    });
  };
  const saveTemplate = () => {
    if (!selectedTemplate) return;
    const values = {
      template_name: draft.template_name,
      subject: draft.subject ?? "",
      message_body: draft.message_body ?? "",
      is_enabled: draft.is_enabled ?? false,
      meta_template_name: draft.meta_template_name ?? "",
      meta_language: draft.meta_language ?? "",
      parameter_keys: draft.parameter_keys ?? [],
      sms_template_id: draft.sms_template_id ?? "",
    };
    saveTemplateMutation.mutate({ id: selectedTemplate.id, values });
  };
  const updateParameterKey = (index: number, value: string) => {
    const keys = [...(draft.parameter_keys ?? [])];
    keys[index] = value.trim();
    patchDraft({ parameter_keys: keys });
  };
  const addParameterKey = () => patchDraft({ parameter_keys: [...(draft.parameter_keys ?? []), ""] });
  const removeParameterKey = (index: number) => patchDraft({ parameter_keys: (draft.parameter_keys ?? []).filter((_, i) => i !== index) });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-48 w-full" /><Skeleton className="h-72 w-full" /></div>;
  if (isError || !data) return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <div><p className="font-semibold">Notification controls could not load</p><p className="text-sm text-muted-foreground">{(error as Error)?.message || "The notification API is unavailable."}</p></div>
        <Button variant="outline" onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button>
      </CardContent>
    </Card>
  );

  const provider = data.providerStatus;
  return (
    <div className="min-w-0 space-y-6 break-words [&_fieldset]:min-w-0 [&_pre]:break-all" data-testid="section-notification-management">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Operations / Settings</p>
          <h1 className="text-2xl font-bold">Notification templates</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Edit enquiry messages, manage delivery channels and track worker updates. A queued or accepted message is not proof of delivery.</p>
        </div>
        <Button variant="outline" onClick={onConfigureProviders} data-testid="button-configure-providers">
          <Settings2 className="mr-2 h-4 w-4" />Provider credentials
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {([
          ["WhatsApp", provider.whatsapp.configured && provider.whatsapp.enabled, settings.whatsappEnabled, "whatsapp"],
          ["SMS", provider.sms.configured, settings.smsEnabled, "sms"],
          ["Email", provider.email.configured, settings.emailEnabled, "email"],
        ] as const).map(([label, configured, enabled, key]) => (
          <Card key={key} className="overflow-hidden">
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-md bg-primary/10 p-2 text-primary"><ChannelIcon channel={key} /></div>
                <div><p className="font-medium">{label}</p><p className="text-xs text-muted-foreground">{configured ? "Provider configured" : "Provider setup required"}</p></div>
              </div>
              <Badge variant={enabled && configured ? "default" : "secondary"}>{enabled && configured ? "Enabled" : "Off"}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value);
        if (recipients.includes(value as Recipient)) setSelectedRecipient(value as Recipient);
      }}>
        <TabsList className="h-auto flex-wrap justify-start">
          {recipients.map((recipient) => (
            <TabsTrigger key={recipient} value={recipient} className="capitalize" data-testid={`tab-notification-${recipient}`}>
              {recipient === "owner" ? "Property owner" : recipient === "chat" ? "Customer to owner" : recipient}
            </TabsTrigger>
          ))}
          <TabsTrigger value="settings" onClick={() => {}} data-testid="tab-notification-settings">Channel settings</TabsTrigger>
          <TabsTrigger value="library" data-testid="tab-notification-library">Template library</TabsTrigger>
          <TabsTrigger value="logs" data-testid="tab-notification-logs">Delivery log</TabsTrigger>
        </TabsList>
        {recipients.map((recipient) => (
          <TabsContent key={recipient} value={recipient} className="mt-4">
            <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
              <Card className="h-fit">
                <CardHeader className="pb-3"><CardTitle className="text-base capitalize">{recipient === "owner" ? "Property owner" : recipient === "chat" ? "Customer message" : recipient} templates</CardTitle><CardDescription>Select an event and channel to edit.</CardDescription></CardHeader>
                <CardContent className="space-y-2">
                  {templates.filter((template) => template.recipient_type === recipient).map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      className={`flex w-full items-center justify-between rounded-md border px-3 py-3 text-left transition-colors ${selectedTemplate?.id === template.id ? "border-primary bg-primary/5" : "hover:bg-muted/60"}`}
                      onClick={() => { setSelectedId(template.id); setDraft({ ...template, parameter_keys: [...(template.parameter_keys ?? [])] }); }}
                      data-testid={`button-select-template-${template.id}`}
                    >
                      <span className="flex min-w-0 items-center gap-2"><ChannelIcon channel={template.channel} /><span className="truncate text-sm font-medium">{template.template_name}</span></span>
                      <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${template.is_enabled ? "bg-emerald-500" : "bg-muted-foreground/40"}`} /><ChevronRight className="h-4 w-4 text-muted-foreground" /></span>
                    </button>
                  ))}
                  {!templates.some((template) => template.recipient_type === recipient) && <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No templates are available for this recipient.</p>}
                </CardContent>
              </Card>

              {selectedTemplate && selectedTemplate.recipient_type === recipient ? (
                <Card>
                  <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                    <div><CardTitle className="flex items-center gap-2 text-lg"><ChannelIcon channel={selectedTemplate.channel} />{selectedTemplate.template_name}</CardTitle><CardDescription className="mt-1">Event: <code>{selectedTemplate.event_type}</code> · {selectedTemplate.channel}</CardDescription></div>
                    <div className="flex items-center gap-2"><Label htmlFor={`template-enabled-${selectedTemplate.id}`} className="text-sm">Enabled</Label><Switch id={`template-enabled-${selectedTemplate.id}`} checked={Boolean(draft.is_enabled)} onCheckedChange={(checked) => patchDraft({ is_enabled: checked })} data-testid="switch-template-enabled" /></div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2"><Label htmlFor="template-name">Template name</Label><Input id="template-name" value={draft.template_name ?? ""} onChange={(event) => patchDraft({ template_name: event.target.value })} data-testid="input-template-name" /></div>
                      {selectedTemplate.channel === "email" && <div className="space-y-2"><Label htmlFor="template-subject">Email subject</Label><Input ref={subjectRef} id="template-subject" value={draft.subject ?? ""} onFocus={() => { insertionTargetRef.current = "subject"; }} onChange={(event) => patchDraft({ subject: event.target.value })} data-testid="input-template-subject" /></div>}
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2"><Label htmlFor="template-body">Message body</Label><span className="text-xs text-muted-foreground">Use the named placeholders below.</span></div>
                      <Textarea ref={bodyRef} id="template-body" rows={selectedTemplate.channel === "email" ? 10 : 7} value={draft.message_body ?? ""} onFocus={() => { insertionTargetRef.current = "body"; }} onChange={(event) => patchDraft({ message_body: event.target.value })} className="font-mono text-sm leading-relaxed" data-testid="textarea-template-body" />
                    </div>
                    <div className="space-y-2">
                      <Label>Available parameters</Label>
                      <div className="flex flex-wrap gap-2">
                        {(data.placeholders ?? []).map((placeholder) => (
                          <div key={placeholder} className="inline-flex items-center overflow-hidden rounded-md border bg-muted/30">
                            <code className="px-2 py-1 text-xs">{placeholder}</code>
                            <Button type="button" variant="ghost" size="sm" className="h-7 rounded-none px-2" onClick={() => insertPlaceholder(placeholder, insertionTargetRef.current)} aria-label={`Insert ${placeholder}`} data-testid={`button-insert-${placeholder.replace(/[{}]/g, "")}`}><Check className="h-3.5 w-3.5" /></Button>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">Missing values are resolved server-side; preview the message before enabling a template.</p>
                    </div>

                    {selectedTemplate.channel === "whatsapp" && (
                      <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                        <div><p className="text-sm font-semibold">Approved WhatsApp Business template</p><p className="text-xs text-muted-foreground">Meta sends the approved template's wording, not this local preview body. Changes to static wording must also be approved in Meta. Match the template name, language and parameter order.</p></div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-1.5"><Label>Meta template name</Label><Input value={draft.meta_template_name ?? ""} onChange={(event) => patchDraft({ meta_template_name: event.target.value })} data-testid="input-meta-template-name" /></div>
                          <div className="space-y-1.5"><Label>Language code</Label><Input value={draft.meta_language ?? ""} onChange={(event) => patchDraft({ meta_language: event.target.value })} placeholder="en" data-testid="input-meta-language" /></div>
                        </div>
                        <div className="space-y-2"><div className="flex items-center justify-between"><Label>Ordered parameter keys</Label><Button type="button" size="sm" variant="outline" onClick={addParameterKey}>Add parameter</Button></div>
                          {(draft.parameter_keys ?? []).map((key, index) => <div className="flex gap-2" key={`${index}-${selectedTemplate.id}`}><Input value={key} onChange={(event) => updateParameterKey(index, event.target.value)} placeholder="customer_name" aria-label={`Parameter ${index + 1}`} /><Button type="button" variant="ghost" onClick={() => removeParameterKey(index)} aria-label={`Remove parameter ${index + 1}`}>Remove</Button></div>)}
                          {!draft.parameter_keys?.length && <p className="text-xs text-muted-foreground">No ordered keys set.</p>}
                        </div>
                      </div>
                    )}
                    {selectedTemplate.channel === "sms" && <div className="space-y-3">
                      <div className="space-y-2"><Label>SMS provider template ID (DLT)</Label><Input value={draft.sms_template_id ?? ""} onChange={(event) => patchDraft({ sms_template_id: event.target.value })} data-testid="input-sms-template-id" /></div>
                      <p className="text-xs text-muted-foreground">Indian routes require approved DLT wording. MSG91 Flow variable names below must match the provider's template.</p>
                      <div className="flex items-center justify-between"><Label>Flow variable keys</Label><Button type="button" size="sm" variant="outline" onClick={addParameterKey}>Add variable</Button></div>
                      {(draft.parameter_keys ?? []).map((key,index)=><div className="flex gap-2" key={`${selectedTemplate.id}-sms-${index}`}>
                        <Input value={key} onChange={event=>updateParameterKey(index,event.target.value)} aria-label={`SMS variable ${index+1}`} />
                        <Button type="button" variant="ghost" onClick={()=>removeParameterKey(index)}>Remove</Button>
                      </div>)}
                    </div>}
                    <Separator />
                    <div className="flex flex-wrap justify-between gap-3">
                      <div className="flex gap-2"><Button variant="outline" onClick={() => { setPreviewResult(null); setPreviewEnquiry(""); setPreviewOpen(true); }} data-testid="button-preview-template"><Eye className="mr-2 h-4 w-4" />Preview</Button><Button variant="outline" onClick={() => { setTestResult(null); setTestEnquiry(""); setFreeEnquiryId(""); setTestRecipient(""); setConsentConfirmed(false); setTestOpen(true); }} data-testid="button-test-template"><Send className="mr-2 h-4 w-4" />Test notification</Button></div>
                      <Button onClick={saveTemplate} disabled={saveTemplateMutation.isPending} data-testid="button-save-template"><Save className="mr-2 h-4 w-4" />{saveTemplateMutation.isPending ? "Saving…" : "Save changes"}</Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">Choose a template to edit its content and delivery settings.</CardContent></Card>
              )}
            </div>
          </TabsContent>
        ))}
        <TabsContent value="settings" className="mt-4">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <Card>
              <CardHeader><CardTitle>Notification channels</CardTitle><CardDescription>All channels start disabled. Enable only after provider and consent prerequisites are in place.</CardDescription></CardHeader>
              <CardContent className="space-y-5">
                {([
                  ["WhatsApp", "whatsappEnabled", provider.whatsapp.configured, "Uses the existing WhatsApp provider configuration."],
                  ["SMS", "smsEnabled", provider.sms.configured, "Uses the existing SMS gateway."],
                  ["Email", "emailEnabled", provider.email.configured, "Requires SMTP settings or an available email provider."],
                ] as const).map(([label, key, configured, description]) => (
                  <div key={key} className="flex items-center justify-between gap-4 rounded-lg border p-4">
                    <div className="flex items-start gap-3"><div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary"><ChannelIcon channel={key.replace("Enabled", "")} /></div><div><Label className="text-base">{label}</Label><p className="mt-1 text-sm text-muted-foreground">{description}</p><p className="mt-1 text-xs">{configured ? "Provider reports configured" : "Provider is not configured"}</p></div></div>
                    <Switch checked={settings[key]} onCheckedChange={(checked) => setSettings((current) => ({ ...current, [key]: checked }))} aria-label={`Enable ${label}`} data-testid={`switch-channel-${key}`} />
                  </div>
                ))}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>Admin phone</Label><Input value={settings.adminPhone} onChange={(event) => setSettings((current) => ({ ...current, adminPhone: event.target.value }))} /></div>
                  <div className="space-y-2"><Label>Admin email</Label><Input type="email" value={settings.adminEmail} onChange={(event) => setSettings((current) => ({ ...current, adminEmail: event.target.value }))} /></div>
                  <div className="space-y-2"><Label>Platform name</Label><Input value={settings.platformName} onChange={(event) => setSettings((current) => ({ ...current, platformName: event.target.value }))} /></div>
                  <div className="space-y-2"><Label>Site URL</Label><Input type="url" value={settings.siteUrl} onChange={(event) => setSettings((current) => ({ ...current, siteUrl: event.target.value }))} placeholder="https://…" /></div>
                </div>
                <div className="space-y-3 rounded-lg border p-4">
                  <p className="font-medium">WhatsApp consent checks</p>
                  <label className="flex items-start gap-3 text-sm"><Checkbox checked={settings.ownerWhatsappConsent} onCheckedChange={(checked) => setSettings((current) => ({ ...current, ownerWhatsappConsent: checked === true }))} data-testid="checkbox-owner-whatsapp-consent" /><span><span className="font-medium">Owner consent verified</span><span className="mt-1 block text-muted-foreground">Confirms your team has obtained consent from owners to receive WhatsApp enquiry notifications. This is an operator attestation, not automatic consent from all owners.</span></span></label>
                  <label className="flex items-start gap-3 text-sm"><Checkbox checked={settings.adminWhatsappConsent} onCheckedChange={(checked) => setSettings((current) => ({ ...current, adminWhatsappConsent: checked === true }))} data-testid="checkbox-admin-whatsapp-consent" /><span><span className="font-medium">Admin recipient consent verified</span><span className="mt-1 block text-muted-foreground">Confirm the configured admin recipient has agreed to receive WhatsApp updates.</span></span></label>
                </div>
                <Separator />
                <div className="space-y-4">
                  <div><h3 className="font-semibold">Custom SMTP</h3><p className="text-xs text-muted-foreground">Credential values remain server-side. Leave the password blank to preserve the saved credential.</p></div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2"><Label>SMTP host</Label><Input value={settings.smtpHost} onChange={(event) => setSettings((current) => ({ ...current, smtpHost: event.target.value }))} /></div>
                    <div className="space-y-2"><Label>SMTP port</Label><Input type="number" min="1" max="65535" value={settings.smtpPort} onChange={(event) => setSettings((current) => ({ ...current, smtpPort: Number(event.target.value) || 0 }))} /></div>
                    <div className="space-y-2"><Label>SMTP username</Label><Input autoComplete="off" value={settings.smtpUser} onChange={(event) => setSettings((current) => ({ ...current, smtpUser: event.target.value }))} /></div>
                    <div className="space-y-2"><Label>SMTP password</Label><Input type="password" autoComplete="new-password" value={smtpPassword} onChange={(event) => setSmtpPassword(event.target.value)} placeholder={settings.hasSmtpPassword ? "Saved password stays unchanged" : "Enter a password"} /></div>
                    <div className="space-y-2"><Label>Sender name</Label><Input value={settings.smtpFromName} onChange={(event) => setSettings((current) => ({ ...current, smtpFromName: event.target.value }))} /></div>
                    <div className="space-y-2"><Label>Sender email</Label><Input type="email" value={settings.smtpFromEmail} onChange={(event) => setSettings((current) => ({ ...current, smtpFromEmail: event.target.value }))} /></div>
                  </div>
                  <label className="flex items-center gap-3 text-sm"><Checkbox checked={settings.smtpSecure} onCheckedChange={(checked) => setSettings((current) => ({ ...current, smtpSecure: checked === true }))} />Use secure TLS connection</label>
                </div>
                <div className="flex justify-end"><Button onClick={() => settingsMutation.mutate()} disabled={settingsMutation.isPending} data-testid="button-save-notification-settings"><Save className="mr-2 h-4 w-4" />{settingsMutation.isPending ? "Saving…" : "Save channel settings"}</Button></div>
              </CardContent>
            </Card>
            <Card className="h-fit">
              <CardHeader><CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5" />Provider status</CardTitle><CardDescription>Manage keys and provider accounts in the existing provider settings.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                {[["WhatsApp", provider.whatsapp.configured, provider.whatsapp.enabled], ["SMS", provider.sms.configured, null], ["Email", provider.email.configured, null]].map(([name, ready, active]) => (
                  <div className="flex items-center justify-between border-b pb-3 last:border-0" key={String(name)}><span className="text-sm font-medium">{name}</span><Badge variant={ready ? "secondary" : "outline"}>{ready ? (active === false ? "Provider off" : "Ready") : "Not configured"}</Badge></div>
                ))}
                <Button className="w-full" variant="outline" onClick={onConfigureProviders} data-testid="button-open-existing-provider-settings"><Settings2 className="mr-2 h-4 w-4" />Open provider management</Button>
                <p className="text-xs leading-relaxed text-muted-foreground">API keys and WhatsApp credentials are never displayed here. Continue to use the existing provider management for credential updates.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="library" className="mt-4">
          <NotificationTemplateLibrary />
        </TabsContent>
        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3"><div><CardTitle>Delivery history</CardTitle><CardDescription>Latest 100 notification attempts. Status refreshes every 15 seconds.</CardDescription></div><Button variant="outline" size="sm" onClick={() => logsQuery.refetch()}><RefreshCw className={`mr-2 h-4 w-4 ${logsQuery.isFetching ? "animate-spin" : ""}`} />Refresh</Button></CardHeader>
            <CardContent>
              {logsQuery.isLoading ? <div className="space-y-2">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-12 w-full" />)}</div>
                : logsQuery.isError ? <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Could not retrieve delivery history. <Button size="sm" variant="outline" onClick={() => logsQuery.refetch()}>Retry</Button></div>
                  : (logsQuery.data ?? []).length === 0 ? <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center"><Clock3 className="h-8 w-8 text-muted-foreground" /><p className="font-medium">No notification attempts yet</p><p className="text-sm text-muted-foreground">Once enquiries generate notifications, their delivery state will appear here.</p></div>
                    : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b text-xs uppercase tracking-wide text-muted-foreground"><th className="py-3 pr-4">Created</th><th className="py-3 pr-4">Enquiry</th><th className="py-3 pr-4">Recipient</th><th className="py-3 pr-4">Channel</th><th className="py-3 pr-4">Status</th><th className="py-3 pr-4">Attempts</th><th className="py-3 pr-2">Action</th></tr></thead><tbody>{logsQuery.data?.map((log) => <tr key={log.id} className="border-b last:border-0" data-testid={`row-notification-log-${log.id}`}><td className="py-3 pr-4 whitespace-nowrap">{formatDate(log.created_at)}</td><td className="py-3 pr-4 font-mono text-xs">{log.enquiry_id}</td><td className="py-3 pr-4 capitalize">{log.recipient_type}</td><td className="py-3 pr-4"><span className="inline-flex items-center gap-2 capitalize"><ChannelIcon channel={log.channel} />{log.channel}</span></td><td className="py-3 pr-4"><Badge className={statusTone[log.status] ?? statusTone.unknown}>{log.status}</Badge>{log.error_code && <p className="mt-1 text-xs text-destructive">{log.error_code}</p>}</td><td className="py-3 pr-4">{log.attempts}</td><td className="py-3 pr-2">{log.status === "failed" && <Button size="sm" variant="outline" onClick={() => retryMutation.mutate(log.id)} disabled={retryMutation.isPending} data-testid={`button-retry-notification-${log.id}`}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Retry</Button>}</td></tr>)}</tbody></table></div>}
              <p className="mt-4 text-xs text-muted-foreground">A provider acceptance, queue status or message ID does not confirm that a recipient received or read a message.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="w-[92vw] max-w-xl max-h-[90dvh] overflow-y-auto break-words">
          <DialogHeader><DialogTitle>Preview notification</DialogTitle><DialogDescription>Use an enquiry to resolve values from real data, or preview with sample values.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Optional enquiry</Label><Select value={previewEnquiry} onValueChange={setPreviewEnquiry}><SelectTrigger><SelectValue placeholder="Sample values" /></SelectTrigger><SelectContent><SelectItem value="__sample">Sample values</SelectItem>{enquiryQuery.data?.map((enquiry) => <SelectItem key={enquiry.id} value={enquiry.id}>{enquiry.property_title} — {enquiry.customer_name} ({enquiry.id})</SelectItem>)}</SelectContent></Select></div>
            <Button onClick={() => previewMutation.mutate()} disabled={previewMutation.isPending || !selectedTemplate} data-testid="button-run-template-preview"><Eye className="mr-2 h-4 w-4" />{previewMutation.isPending ? "Building preview…" : "Generate preview"}</Button>
            {previewResult && <div className="space-y-3 rounded-md border bg-muted/20 p-4"><div><p className="text-xs font-semibold uppercase text-muted-foreground">Subject</p><p className="mt-1 font-medium">{previewResult.subject || "—"}</p></div><Separator /><div><p className="text-xs font-semibold uppercase text-muted-foreground">Rendered message</p><pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed">{previewResult.body}</pre></div>{previewResult.parameters?.length > 0 && <p className="text-xs text-muted-foreground">Resolved parameters: {previewResult.parameters.join(", ")}</p>}</div>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="w-[92vw] max-w-lg max-h-[90dvh] overflow-y-auto break-words">
          <DialogHeader><DialogTitle>Send a test notification</DialogTitle><DialogDescription>This queues a real send using the selected channel. Verify the destination and consent before proceeding.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Enquiry</Label><Select value={testEnquiry} onValueChange={setTestEnquiry}><SelectTrigger data-testid="select-test-enquiry"><SelectValue placeholder="Choose an enquiry" /></SelectTrigger><SelectContent>{enquiryQuery.data?.map((enquiry) => <SelectItem key={enquiry.id} value={enquiry.id}>{enquiry.property_title} — {enquiry.customer_name} ({enquiry.id})</SelectItem>)}<SelectItem value="__manual">Enter enquiry ID</SelectItem></SelectContent></Select></div>
            {testEnquiry === "__manual" && <div className="space-y-2"><Label>Enquiry ID</Label><Input value={freeEnquiryId} onChange={(event) => setFreeEnquiryId(event.target.value)} data-testid="input-test-enquiry-id" /></div>}
            <div className="space-y-2"><Label>Test recipient</Label><Input value={testRecipient} onChange={(event) => setTestRecipient(event.target.value)} placeholder="Phone number, email address or chat destination" data-testid="input-test-recipient" /></div>
            <label className="flex items-start gap-3 rounded-md border p-3 text-sm"><Checkbox checked={consentConfirmed} onCheckedChange={(checked) => setConsentConfirmed(checked === true)} data-testid="checkbox-test-consent" /><span>I confirm this recipient has consented to receive this test message and I have checked the destination.</span></label>
            {testResult && <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200" role="status" data-testid="status-test-notification">Accepted into queue · {testResult.id} · {testResult.status}. Delivery is not yet confirmed.</div>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setTestOpen(false)}>Close</Button><Button onClick={() => testMutation.mutate()} disabled={testMutation.isPending || !selectedTemplate} data-testid="button-submit-test-notification">{testMutation.isPending ? "Submitting…" : "Queue test send"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
