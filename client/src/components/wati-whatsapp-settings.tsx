import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type WatiSettings = { apiHost: string; channel: string; hasApiToken: boolean; configured: boolean; hasWebhookSecret: boolean };
const endpoint = "/api/admin/notifications/wati";

export default function WatiWhatsappSettings() {
  const { toast } = useToast();
  const query = useQuery<WatiSettings>({ queryKey: [endpoint] });
  const [host, setHost] = useState("");
  const [channel, setChannel] = useState("");
  const [token, setToken] = useState("");
  const [webhook, setWebhook] = useState("");
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (query.data && !dirty) {
      setHost(query.data.apiHost);
      setChannel(query.data.channel);
    }
  }, [query.data, dirty]);
  const save = useMutation({
    mutationFn: async () => (await apiRequest("PUT", endpoint, {
      apiHost: host.trim(), channel: channel.trim(), ...(token ? { apiToken: token.trim() } : {}),
    })).json() as Promise<WatiSettings>,
    onSuccess: async saved => {
      setToken(""); setWebhook(""); setDirty(false);
      queryClient.setQueryData([endpoint], saved);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      toast({ title: "WATI connection saved", description: "No message was sent. Select WATI in Notification Templates → Channel settings to use it." });
    },
    onError: (e: Error) => toast({ title: "WATI settings not saved", description: e.message, variant: "destructive" }),
  });
  const reveal = useMutation({
    mutationFn: async () => (await apiRequest("POST", `${endpoint}/webhook-url`, {})).json() as Promise<{ path: string }>,
    onSuccess: data => setWebhook(`${window.location.origin}${data.path}`),
    onError: (e: Error) => toast({ title: "Could not load webhook URL", description: e.message, variant: "destructive" }),
  });
  return <Card>
    <CardHeader>
      <CardTitle>WATI WhatsApp enquiry connection</CardTitle>
      <CardDescription>Separate from BhashSMS and login OTP. Saving credentials never sends a message or switches providers.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {query.isLoading ? <p role="status">Loading WATI settings…</p> : query.isError ?
        <div role="alert" className="space-y-2"><p className="text-sm text-destructive">{query.error.message}</p><p className="text-sm">If WATI_MIGRATION_REQUIRED appears, apply the WATI migration described in WATI_SETUP.md.</p><Button variant="outline" onClick={() => query.refetch()}>Retry</Button></div> : <>
        <p className="text-sm">{query.data?.configured ? "Credentials saved. Live sending has not been verified." : "Connection not configured."}</p>
        <div className="space-y-2"><Label htmlFor="wati-api-host">WATI API host</Label>
          <Input id="wati-api-host" value={host} placeholder="https://live-mt-server.wati.io" onChange={e => { setHost(e.target.value); setDirty(true); setWebhook(""); }} />
          <p className="text-xs text-muted-foreground">Copy the API host from WATI’s API request example, not the dashboard address. Host only: no tenant ID or /api suffix. WATI-controlled HTTPS hosts only.</p></div>
        <div className="space-y-2"><Label htmlFor="wati-channel">Sender number</Label>
          <Input id="wati-channel" value={channel} placeholder="Country code and number, digits only" onChange={e => { setChannel(e.target.value); setDirty(true); setWebhook(""); }} />
          <p className="text-xs text-muted-foreground">Your WATI-connected business number, not a Meta Phone Number ID or tenant ID. Leave blank only to use WATI’s default channel.</p></div>
        <div className="space-y-2"><Label htmlFor="wati-token">WATI API key</Label>
          <Input id="wati-token" type="password" autoComplete="new-password" value={token} placeholder={query.data?.hasApiToken ? "Saved securely; leave blank to keep" : "Paste API key without Bearer"} onChange={e => { setToken(e.target.value); setDirty(true); }} />
          <p className="text-xs text-muted-foreground">Encrypted on the server and never returned. Needs template-send permission. A stable server encryption key of at least 32 characters is required.</p></div>
        <div className="rounded-md border p-3 text-sm space-y-2">
          <p>Manage and approve templates in WATI. In each Leaseo customer/owner/admin WhatsApp template, enter its exact WATI template name and variable keys. WATI uses named variables; names must match the website keys.</p>
          <p>The Template library’s “Submit to Meta” actions are for the direct Meta connection, not WATI.</p>
          <p>Saving a sender/host change invalidates the previous webhook URL. Update your WATI subscription afterwards.</p>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending || !host.trim() || (!token.trim() && !query.data?.hasApiToken)}>{save.isPending ? "Saving…" : "Save WATI connection"}</Button>
        <div className="space-y-2 border-t pt-4">
          <Label>Delivery webhook</Label>
          <p className="text-xs text-muted-foreground">Use your public HTTPS website. This URL includes a secret: keep it private and configure access logs to hide query strings. Never use the Meta webhook URL.</p>
          <Button variant="outline" disabled={dirty || !query.data?.hasWebhookSecret || reveal.isPending} onClick={() => webhook ? setWebhook("") : reveal.mutate()}>{webhook ? "Hide webhook URL" : "Show webhook URL"}</Button>
          {webhook && <Input aria-label="Private WATI webhook URL" readOnly value={webhook} onFocus={e => e.target.select()} />}
          <p className="text-xs text-muted-foreground">Subscribe to templateMessageSent_v2, sentMessageDELIVERED_v2, sentMessageREAD_v2 and templateMessageFailed. Delivery updates appear after the notification worker runs.</p>
        </div>
      </>}
    </CardContent>
  </Card>;
}
