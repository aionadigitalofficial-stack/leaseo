import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, Archive, Check, Copy, Eye, FilePlus2, Loader2, Pencil, RefreshCw, Save, Send, ShieldAlert } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type Channel = "whatsapp" | "sms" | "email";
type Recipient = "customer" | "owner" | "admin";
type Draft = {
  id: string; version: number; template_name: string; channel: Channel; recipient_type: Recipient;
  subject: string; message_body: string; meta_template_name: string; meta_language: string;
  meta_category: "UTILITY" | "MARKETING"; parameter_keys: string[]; sms_template_id: string;
  example_values: Record<string, string>; provider_status: string; provider_error_code: string | null;
  meta_template_id: string; meta_account_id: string; provider_body: string | null;
  last_synced_at: string | null; created_at: string; updated_at: string;
};
type DraftInput = Pick<Draft, "template_name" | "channel" | "recipient_type" | "subject" | "message_body" |
  "meta_template_name" | "meta_language" | "meta_category" | "sms_template_id" | "example_values">;
type Preview = { subject: string; body: string; parameters: string[] };
type DraftList = { drafts: Draft[]; placeholders: string[] };

const freshForm = (channel: Channel = "whatsapp", recipient_type: Recipient = "customer"): DraftInput => ({
  template_name: "", channel, recipient_type, subject: "", message_body: "", meta_template_name: "",
  meta_language: "en_US", meta_category: "UTILITY", sms_template_id: "", example_values: {},
});
const statusClass = (status: string) => {
  if (status === "APPROVED") return "border-emerald-300 bg-emerald-50 text-emerald-800";
  if (status === "REJECTED" || status === "ERROR") return "border-red-200 bg-red-50 text-red-800";
  if (status === "PENDING" || status === "SUBMITTING") return "border-amber-200 bg-amber-50 text-amber-800";
  return "";
};
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Please try again.";

export default function NotificationTemplateLibrary() {
  const { toast } = useToast();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<DraftInput>(freshForm());
  const [previewDraft, setPreviewDraft] = useState<Draft | null>(null);
  const [previewResult, setPreviewResult] = useState<Preview | null>(null);
  const [archiveDraft, setArchiveDraft] = useState<Draft | null>(null);
  const [applyDraft, setApplyDraft] = useState<Draft | null>(null);
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});

  const draftsQuery = useQuery<DraftList>({
    queryKey: ["/api/admin/notifications/drafts"],
    queryFn: async () => (await apiRequest("GET", "/api/admin/notifications/drafts")).json(),
    staleTime: 0,
    refetchOnMount: true,
    refetchInterval: 30000,
  });
  const refreshDrafts = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications/drafts"] });
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form };
      if (editing) return (await apiRequest("PATCH", `/api/admin/notifications/drafts/${editing.id}`, { ...payload, version: editing.version })).json() as Promise<Draft>;
      return (await apiRequest("POST", "/api/admin/notifications/drafts", payload)).json() as Promise<Draft>;
    },
    onSuccess: async () => {
      await refreshDrafts();
      setFormOpen(false);
      toast({ title: editing ? "Draft saved" : "Draft created", description: "Your changes are stored in the template library." });
    },
    onError: (error: Error) => toast({ title: "Could not save draft", description: error.message, variant: "destructive" }),
  });
  const previewMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/admin/notifications/drafts/${previewDraft?.id}/preview`, { values: previewValues })).json() as Promise<Preview>,
    onSuccess: setPreviewResult,
    onError: (error: Error) => toast({ title: "Preview unavailable", description: error.message, variant: "destructive" }),
  });
  const archiveMutation = useMutation({
    mutationFn: async (draft: Draft) => apiRequest("DELETE", `/api/admin/notifications/drafts/${draft.id}`, { version: draft.version }),
    onSuccess: async () => { await refreshDrafts(); setArchiveDraft(null); toast({ title: "Draft archived", description: "The Meta template, if any, was not deleted." }); },
    onError: (error: Error) => toast({ title: "Could not archive draft", description: error.message, variant: "destructive" }),
  });
  const actionMutation = useMutation({
    mutationFn: async ({ draft, action }: { draft: Draft; action: "submit" | "sync" | "apply" }) => {
      const payload = action === "apply" ? { version: draft.version, confirmReplace: true } : { version: draft.version };
      return (await apiRequest("POST", `/api/admin/notifications/drafts/${draft.id}/${action}`, payload)).json() as Promise<Draft>;
    },
    onSuccess: async (saved, variables) => {
      await refreshDrafts();
      if (variables.action === "apply") {
        await queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
        setApplyDraft(null);
        toast({ title: "Template copied to notification settings", description: "It remains disabled. Enable it in the existing template editor when ready." });
      } else {
        toast({ title: variables.action === "sync" ? "Meta status refreshed" : "Submitted to Meta", description: variables.action === "sync" ? `Current status: ${saved.provider_status}` : "This submits the template for review; it does not send a message." });
      }
    },
    onError: async (error: Error, variables) => {
      await refreshDrafts();
      if(variables.action==="apply")setApplyDraft(null);
      toast({ title: "Action could not be completed", description: error.message, variant: "destructive" });
    },
  });
  const drafts = draftsQuery.data?.drafts ?? [];
  const placeholders = draftsQuery.data?.placeholders ?? [];
  const usedKeys = useMemo(() => {
    const source = `${form.subject} ${form.message_body}`;
    return Array.from(new Set(Array.from(source.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g), match => match[1])));
  }, [form.subject, form.message_body]);
  const openCreate = () => { setEditing(null); setForm(freshForm()); setFormOpen(true); };
  const openEdit = (draft: Draft) => {
    setEditing(draft);
    setForm({
      template_name: draft.template_name, channel: draft.channel, recipient_type: draft.recipient_type,
      subject: draft.subject ?? "", message_body: draft.message_body ?? "", meta_template_name: draft.meta_template_name ?? "",
      meta_language: draft.meta_language || "en_US", meta_category: draft.meta_category || "UTILITY",
      sms_template_id: draft.sms_template_id ?? "", example_values: { ...(draft.example_values ?? {}) },
    });
    setFormOpen(true);
  };
  const duplicateDraft = (draft: Draft) => {
    setEditing(null);
    setForm({
      template_name: `${draft.template_name} copy`, channel: draft.channel, recipient_type: draft.recipient_type,
      subject: draft.subject ?? "", message_body: draft.message_body ?? "",
      meta_template_name: draft.channel === "whatsapp" ? `${(draft.meta_template_name || draft.template_name).replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase().slice(0, 54)}_copy` : "",
      meta_language: draft.meta_language || "en_US", meta_category: draft.meta_category || "UTILITY",
      sms_template_id: draft.sms_template_id ?? "", example_values: { ...(draft.example_values ?? {}) },
    });
    setFormOpen(true);
  };
  const setField = <K extends keyof DraftInput>(key: K, value: DraftInput[K]) => setForm((current) => ({ ...current, [key]: value }));
  const canEdit = (draft: Draft) => (draft.provider_status === "DRAFT" || draft.provider_status === "ERROR") && !draft.meta_template_id;
  const canApply = (draft: Draft) => draft.channel !== "whatsapp" || draft.provider_status === "APPROVED";
  const draftKeys = (draft: Draft) => Array.from(new Set([
    ...(draft.parameter_keys ?? []),
    ...Array.from(`${draft.subject ?? ""} ${draft.message_body ?? ""}`.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g), match => match[1]),
  ]));

  return (
    <section className="space-y-5" data-testid="section-template-library">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Drafts / provider workflows</p><h2 className="mt-1 text-xl font-semibold">Template library</h2><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Build reusable drafts separately from the nine canonical templates that power enquiry notifications.</p></div>
        <Button onClick={openCreate} data-testid="button-create-library-draft"><FilePlus2 className="mr-2 h-4 w-4" />New draft</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-950"><p className="font-medium">WhatsApp</p><p className="mt-1 text-xs leading-relaxed">Meta approval and the <code>whatsapp_business_management</code> permission are required. Draft submission is not message delivery.</p></div>
        <div className="rounded-lg border bg-muted/30 p-3 text-sm"><p className="font-medium">SMS</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">DLT registration happens externally. Store approved DLT or MSG91 Flow IDs here; this library does not submit SMS templates.</p></div>
        <div className="rounded-lg border bg-muted/30 p-3 text-sm"><p className="font-medium">Email</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Plain-text subject and body need no provider approval. Delivery uses configured SMTP after activation.</p></div>
      </div>

      {draftsQuery.isLoading ? <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div> : draftsQuery.isError ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-10 text-center"><AlertCircle className="h-8 w-8 text-destructive" /><div><p className="font-medium">Draft library could not load</p><p className="text-sm text-muted-foreground">{errorMessage(draftsQuery.error)}</p></div><Button variant="outline" onClick={() => draftsQuery.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button></CardContent></Card>
      ) : drafts.length === 0 ? (
        <Card className="border-dashed"><CardContent className="flex flex-col items-center gap-3 py-12 text-center"><FilePlus2 className="h-8 w-8 text-muted-foreground" /><div><p className="font-semibold">No library drafts yet</p><p className="text-sm text-muted-foreground">Create a separate draft without changing active enquiry notifications.</p></div><Button variant="outline" onClick={openCreate}>Create first draft</Button></CardContent></Card>
      ) : <div className="space-y-3">{drafts.map((draft) => (
        <Card key={draft.id} data-testid={`card-library-draft-${draft.id}`}>
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{draft.template_name || "Untitled draft"}</h3><Badge variant="outline" className={statusClass(draft.provider_status)}>{draft.provider_status}</Badge><Badge variant="secondary" className="capitalize">{draft.channel}</Badge><Badge variant="outline" className="capitalize">{draft.recipient_type}</Badge></div>
              <p className="text-sm text-muted-foreground">{draft.subject || draft.meta_template_name || "No subject"}{draft.meta_template_name && draft.channel === "whatsapp" ? ` · ${draft.meta_template_name}` : ""}</p>
              <p className="line-clamp-2 break-words text-xs text-muted-foreground">{draft.message_body || "No message body"}{draft.provider_error_code ? ` · Provider: ${draft.provider_error_code}` : ""}</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {draft.channel === "whatsapp" && <Button variant="outline" size="sm" disabled={actionMutation.isPending} onClick={() => actionMutation.mutate({ draft, action: "sync" })} data-testid={`button-sync-draft-${draft.id}`}><RefreshCw className="mr-1.5 h-4 w-4" />Refresh status</Button>}
              {canEdit(draft) && <Button variant="outline" size="sm" onClick={() => openEdit(draft)} data-testid={`button-edit-draft-${draft.id}`}><Pencil className="mr-1.5 h-4 w-4" />Edit</Button>}
              <Button variant="outline" size="sm" onClick={() => duplicateDraft(draft)} data-testid={`button-duplicate-draft-${draft.id}`}><Copy className="mr-1.5 h-4 w-4" />Duplicate</Button>
              <Button variant="outline" size="sm" onClick={() => { setPreviewDraft(draft); setPreviewResult(null); setPreviewValues({ ...(draft.example_values ?? {}) }); }} data-testid={`button-preview-draft-${draft.id}`}><Eye className="mr-1.5 h-4 w-4" />Preview</Button>
              {canEdit(draft) && draft.channel === "whatsapp" && <Button size="sm" variant="secondary" disabled={actionMutation.isPending || !draft.message_body.trim() || !draft.meta_template_name.trim() || draftKeys(draft).some((key) => !draft.example_values?.[key]?.trim())} onClick={() => actionMutation.mutate({ draft, action: "submit" })} data-testid={`button-submit-draft-${draft.id}`}><Send className="mr-1.5 h-4 w-4" />Submit to Meta</Button>}
              {canApply(draft) && <Button size="sm" disabled={actionMutation.isPending} onClick={() => setApplyDraft(draft)} data-testid={`button-apply-draft-${draft.id}`}>Apply to notifications</Button>}
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setArchiveDraft(draft)} data-testid={`button-archive-draft-${draft.id}`}><Archive className="mr-1.5 h-4 w-4" />Archive</Button>
            </div>
          </CardContent>
        </Card>
      ))}</div>}

      <Dialog open={formOpen} onOpenChange={(open) => { if (!saveMutation.isPending) setFormOpen(open); }}>
        <DialogContent className="max-h-[92dvh] w-[calc(100%-1rem)] max-w-2xl overflow-y-auto sm:w-full">
          <DialogHeader><DialogTitle>{editing ? "Edit library draft" : "Create library draft"}</DialogTitle><DialogDescription>Saved drafts are separate from active notification templates. Changes here never enable delivery.</DialogDescription></DialogHeader>
          <div className="space-y-5 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="library-name">Draft name</Label><Input id="library-name" value={form.template_name} onChange={(event) => setField("template_name", event.target.value)} data-testid="input-library-name" /></div>
              <div className="space-y-2"><Label>Channel</Label><Select value={form.channel} disabled={Boolean(editing)} onValueChange={(value) => setField("channel", value as Channel)}><SelectTrigger data-testid="select-library-channel"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="sms">SMS</SelectItem><SelectItem value="email">Email</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Recipient</Label><Select value={form.recipient_type} disabled={Boolean(editing)} onValueChange={(value) => setField("recipient_type", value as Recipient)}><SelectTrigger data-testid="select-library-recipient"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="customer">Customer</SelectItem><SelectItem value="owner">Property owner</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select></div>
              {form.channel === "email" && <div className="space-y-2"><Label htmlFor="library-subject">Email subject</Label><Input id="library-subject" value={form.subject} onChange={(event) => setField("subject", event.target.value)} data-testid="input-library-subject" /></div>}
            </div>
            <div className="space-y-2"><div className="flex flex-wrap items-center justify-between gap-2"><Label htmlFor="library-body">Message body</Label><span className="text-xs text-muted-foreground">{form.channel === "whatsapp" ? `${form.message_body.length}/1024 characters` : "Plain text"}</span></div><Textarea id="library-body" rows={8} maxLength={form.channel === "whatsapp" ? 1024 : undefined} value={form.message_body} onChange={(event) => setField("message_body", event.target.value)} className="font-mono text-sm" data-testid="textarea-library-body" /><p className="text-xs text-muted-foreground">Use named variables such as <code>{"{{customer_name}}"}</code>. The server derives the parameter list from the body.</p></div>
            {placeholders.length > 0 && <div className="space-y-2"><Label>Available placeholders</Label><div className="flex flex-wrap gap-2">{placeholders.map((item) => <button type="button" key={item} onClick={() => setField("message_body", `${form.message_body}${item}`)} className="rounded-md border bg-muted/40 px-2 py-1 font-mono text-xs hover:bg-muted" data-testid={`button-library-placeholder-${item.replace(/[{}]/g, "")}`}>{item}</button>)}</div></div>}
            {form.channel === "whatsapp" && <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
              <div className="flex gap-3"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /><p className="text-xs leading-relaxed text-muted-foreground">WhatsApp text is sent for Meta review. Semantic placeholders become numbered Meta variables. Add realistic example values for every variable before submission; approval also requires <code>whatsapp_business_management</code>.</p></div>
              <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5"><Label>Meta template name</Label><Input value={form.meta_template_name} onChange={(event) => setField("meta_template_name", event.target.value)} placeholder="leaseo_enquiry_update" data-testid="input-library-meta-name" /></div><div className="space-y-1.5"><Label>Language</Label><Input value={form.meta_language} onChange={(event) => setField("meta_language", event.target.value)} placeholder="en_US" data-testid="input-library-meta-language" /></div><div className="space-y-1.5"><Label>Category</Label><Select value={form.meta_category} onValueChange={(value) => setField("meta_category", value as "UTILITY" | "MARKETING")}><SelectTrigger data-testid="select-library-meta-category"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="UTILITY">Utility</SelectItem><SelectItem value="MARKETING">Marketing</SelectItem></SelectContent></Select></div></div>
              <div className="space-y-2"><Label>Review example values</Label>{usedKeys.length ? usedKeys.map((key) => <div className="grid gap-1.5 sm:grid-cols-[180px_1fr]" key={key}><Label className="self-center font-mono text-xs">{`{{${key}}}`}</Label><Input value={form.example_values[key] ?? ""} onChange={(event) => setField("example_values", { ...form.example_values, [key]: event.target.value })} placeholder={`Example for ${key}`} data-testid={`input-example-${key}`} /></div>) : <p className="text-xs text-muted-foreground">Add a named placeholder in the body to provide its review example.</p>}</div>
            </div>}
            {form.channel === "sms" && <div className="space-y-2 rounded-lg border bg-muted/20 p-4"><Label htmlFor="library-sms-id">Approved DLT template / MSG91 Flow ID</Label><Input id="library-sms-id" value={form.sms_template_id} onChange={(event) => setField("sms_template_id", event.target.value)} data-testid="input-library-sms-id" /><p className="text-xs text-muted-foreground">SMS registration and approval are external. Enter an existing approved identifier; no provider submission is made here.</p></div>}
            {form.channel === "email" && <p className="rounded-lg border bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">Email drafts are plain text and do not require external approval. Messages are sent directly through configured SMTP only after a canonical template is activated.</p>}
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row"><Button variant="outline" disabled={saveMutation.isPending} onClick={() => setFormOpen(false)}>Cancel</Button><Button disabled={saveMutation.isPending || !form.template_name.trim() || !form.message_body.trim() || (form.channel === "email" && !form.subject.trim()) || (form.channel === "whatsapp" && usedKeys.some((key) => !form.example_values[key]?.trim()))} onClick={() => saveMutation.mutate()} data-testid="button-save-library-draft">{saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{saveMutation.isPending ? "Saving…" : "Save draft"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(previewDraft)} onOpenChange={(open) => { if (!open) { setPreviewDraft(null); setPreviewResult(null); } }}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-1rem)] max-w-xl overflow-y-auto sm:w-full"><DialogHeader><DialogTitle>Draft preview</DialogTitle><DialogDescription>Preview renders this draft only; it does not submit or send it.</DialogDescription></DialogHeader>
          <div className="space-y-4">{previewDraft && draftKeys(previewDraft).length > 0 && <div className="space-y-2"><Label>Example values</Label>{previewDraft && draftKeys(previewDraft).map((key) => <div className="grid gap-2 sm:grid-cols-[150px_1fr]" key={key}><Label className="self-center font-mono text-xs">{key}</Label><Input value={previewValues[key] ?? ""} onChange={(event) => setPreviewValues({ ...previewValues, [key]: event.target.value })} data-testid={`input-preview-value-${key}`} /></div>)}</div>}
            <Button disabled={previewMutation.isPending} onClick={() => previewMutation.mutate()} data-testid="button-run-library-preview">{previewMutation.isPending ? "Rendering…" : <><Eye className="mr-2 h-4 w-4" />Render preview</>}</Button>
            {previewMutation.isError && <p className="text-sm text-destructive">{errorMessage(previewMutation.error)}</p>}
            {previewResult && <div className="space-y-3 rounded-lg border bg-muted/30 p-4" data-testid="text-library-preview-result">{previewResult.subject && <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subject</p><p className="mt-1 break-words">{previewResult.subject}</p></div>}<div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Body</p><pre className="mt-1 whitespace-pre-wrap break-words font-sans text-sm">{previewResult.body}</pre></div>{previewResult.parameters.length > 0 && <p className="text-xs text-muted-foreground">Parameters: {previewResult.parameters.join(", ")}</p>}</div>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(archiveDraft)} onOpenChange={(open) => { if (!open && !archiveMutation.isPending) setArchiveDraft(null); }}><DialogContent className="w-[calc(100%-1rem)] max-w-md"><DialogHeader><DialogTitle>Archive this draft?</DialogTitle><DialogDescription>This removes it from your local draft library only. It never deletes a Meta template or affects an active notification template.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setArchiveDraft(null)}>Keep draft</Button><Button variant="destructive" disabled={archiveMutation.isPending} onClick={() => archiveDraft && archiveMutation.mutate(archiveDraft)}>{archiveMutation.isPending ? "Archiving…" : "Archive locally"}</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={Boolean(applyDraft)} onOpenChange={(open) => { if (!open && !actionMutation.isPending) setApplyDraft(null); }}><DialogContent className="w-[calc(100%-1rem)] max-w-md"><DialogHeader><DialogTitle>Replace a canonical notification template?</DialogTitle><DialogDescription>This copies “{applyDraft?.template_name}” into the existing {applyDraft?.recipient_type} / {applyDraft?.channel} notification template. The existing canonical content may be replaced. The result remains disabled until you enable it in the existing notification editor. Nothing is sent automatically.{applyDraft?.channel === "whatsapp" ? " Only an approved WhatsApp draft can be applied; the server checks the latest Meta status and body." : ""}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setApplyDraft(null)}>Cancel</Button><Button disabled={actionMutation.isPending} onClick={() => applyDraft && actionMutation.mutate({ draft: applyDraft, action: "apply" })} data-testid="button-confirm-apply-draft">{actionMutation.isPending ? "Applying…" : <><Check className="mr-2 h-4 w-4" />Confirm replacement</>}</Button></DialogFooter></DialogContent></Dialog>
    </section>
  );
}
