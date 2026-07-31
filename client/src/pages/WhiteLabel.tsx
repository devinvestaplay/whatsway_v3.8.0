import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BadgeCheck, Building2, CreditCard, Download, Eye, History, LogIn, Palette, Plus, RefreshCw, Search, ShieldCheck, Users } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const API = "/api/superadmin/white-label";

type ListResponse<T> = { rows: T[]; total?: number; page?: number; limit?: number };
type Summary = { clients: number; workspaces: number; active_workspaces: number; partners: number; credit_balance: string };
type WhiteLabelSettings = {
  platformName: string;
  brandTagline?: string;
  supportEmail?: string;
  supportPhone?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  mainLogo?: string;
  darkModeLogo?: string;
  favicon?: string;
  loginBanner?: string;
  footerText?: string;
  customDomain?: string;
  emailFromName?: string;
  emailFromAddress?: string;
  hidePoweredBy?: boolean;
  allowPartnerSignup?: boolean;
  maintenanceMode?: boolean;
};

type ClientRow = {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status: string;
  workspaces: number;
  bots: number;
  bot_users: number;
  members: number;
  addon_count: number;
  credit_balance: string;
  subscription_status?: string;
  end_date?: string;
  last_login?: string;
};

type WorkspaceRow = {
  id: string;
  name: string;
  phone_number?: string;
  is_active: boolean;
  workspace_type: string;
  points: string;
  auto_renew: boolean;
  end_date?: string;
  created_at?: string;
  owner_id?: string;
  owner_email?: string;
  owner_name?: string;
  bot_users: number;
  bots: number;
  members: number;
  addon_count: number;
  subscription_status?: string;
};

type CreditRow = { id: string; client_email?: string; workspace_name?: string; transaction_type: string; credits: string; balance_before: string; balance_after: string; reference?: string; note?: string; created_at: string };
type PartnerRow = { id: string; name: string; email: string; company_name?: string; status: string; commission_rate: string; revenue_share_rate: string; clients_count: number };
type AuditRow = { id: string; actor_email?: string; action_type: string; target_type: string; target_id?: string; created_at: string };

const tabs = [
  { key: "settings", label: "White Label Settings", icon: Palette },
  { key: "workspaces", label: "Workspaces", icon: Building2 },
  { key: "clients", label: "Clients", icon: Users },
  { key: "credits", label: "Prepaid Credit", icon: CreditCard },
  { key: "partners", label: "Partner Settings", icon: ShieldCheck },
  { key: "audit", label: "Audit Logs", icon: History },
];

function makeQuery(path: string, params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const qs = query.toString();
  return `${path}${qs ? `?${qs}` : ""}`;
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

function formatNumber(value: unknown) {
  return Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function StatCard({ title, value, icon: Icon }: { title: string; value: React.ReactNode; icon: React.ElementType }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600"><Icon className="h-5 w-5" /></div>
      </CardContent>
    </Card>
  );
}

function StatusPill({ value }: { value?: string | boolean }) {
  const active = value === true || value === "active" || value === "credit";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{String(value ?? "inactive")}</span>;
}

export default function WhiteLabel() {
  const { toast } = useToast();
  const [tab, setTab] = useState("settings");
  const [search, setSearch] = useState("");
  const [workspaceOwnerId, setWorkspaceOwnerId] = useState("");
  const [settingsForm, setSettingsForm] = useState<WhiteLabelSettings>({ platformName: "Whatsway" });
  const [creditForm, setCreditForm] = useState({ clientId: "", workspaceId: "", transactionType: "credit", credits: "", reference: "", note: "" });
  const [partnerForm, setPartnerForm] = useState({ name: "", email: "", companyName: "", phone: "", commissionRate: "0", revenueShareRate: "0" });
  const [pointForm, setPointForm] = useState<{ workspaceId: string; name: string; transactionType: "credit" | "debit" | "adjustment"; credits: string; note: string } | null>(null);

  const clientUrl = makeQuery(`${API}/clients`, { search });
  const workspaceUrl = makeQuery(`${API}/workspaces`, { search, ownerId: workspaceOwnerId });

  const { data: summary } = useQuery<Summary>({ queryKey: [`${API}/summary`] });
  const { data: settings } = useQuery<WhiteLabelSettings>({ queryKey: [`${API}/settings`] });
  const { data: clients } = useQuery<ListResponse<ClientRow>>({ queryKey: [clientUrl], enabled: tab === "clients" || tab === "credits" || tab === "partners" || tab === "workspaces" });
  const { data: workspaces } = useQuery<ListResponse<WorkspaceRow>>({ queryKey: [workspaceUrl], enabled: tab === "workspaces" || tab === "credits" });
  const { data: credits } = useQuery<ListResponse<CreditRow>>({ queryKey: [`${API}/credits`], enabled: tab === "credits" });
  const { data: partners } = useQuery<{ rows: PartnerRow[] }>({ queryKey: [`${API}/partners`], enabled: tab === "partners" });
  const { data: audit } = useQuery<ListResponse<AuditRow>>({ queryKey: [`${API}/audit-logs`], enabled: tab === "audit" });

  useEffect(() => {
    if (settings) setSettingsForm(settings);
  }, [settings]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: [`${API}/summary`] });
    queryClient.invalidateQueries({ queryKey: [`${API}/settings`] });
    queryClient.invalidateQueries({ queryKey: [clientUrl] });
    queryClient.invalidateQueries({ queryKey: [workspaceUrl] });
    queryClient.invalidateQueries({ queryKey: [`${API}/credits`] });
    queryClient.invalidateQueries({ queryKey: [`${API}/partners`] });
    queryClient.invalidateQueries({ queryKey: [`${API}/audit-logs`] });
  };

  const saveSettings = useMutation({
    mutationFn: () => apiRequest("PUT", `${API}/settings`, settingsForm),
    onSuccess: () => { invalidateAll(); toast({ title: "White label settings saved" }); },
  });

  const resetSettings = useMutation({
    mutationFn: () => apiRequest("POST", `${API}/settings/reset`),
    onSuccess: () => { invalidateAll(); toast({ title: "Settings restored to defaults" }); },
  });

  const patchWorkspace = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => apiRequest("PATCH", `${API}/workspaces/${id}`, payload),
    onSuccess: () => { invalidateAll(); toast({ title: "Workspace updated" }); },
  });

  const updatePoints = useMutation({
    mutationFn: () => apiRequest("PATCH", `${API}/workspaces/${pointForm?.workspaceId}/points`, { transactionType: pointForm?.transactionType, credits: Number(pointForm?.credits || 0), note: pointForm?.note || null }),
    onSuccess: () => { setPointForm(null); invalidateAll(); toast({ title: "Workspace points updated" }); },
  });

  const impersonateClient = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `${API}/clients/${id}/impersonate`),
    onSuccess: async (res: Response) => {
      const data = await res.json().catch(() => ({ redirectTo: "/dashboard" }));
      queryClient.clear();
      window.location.href = data.redirectTo || "/dashboard";
    },
    onError: (error: Error) => toast({ title: "Impersonation failed", description: error.message, variant: "destructive" }),
  });

  const addCredit = useMutation({
    mutationFn: () => apiRequest("POST", `${API}/credits`, { ...creditForm, credits: Number(creditForm.credits), workspaceId: creditForm.workspaceId || null }),
    onSuccess: () => { setCreditForm({ clientId: "", workspaceId: "", transactionType: "credit", credits: "", reference: "", note: "" }); invalidateAll(); toast({ title: "Credit transaction added" }); },
  });

  const addPartner = useMutation({
    mutationFn: () => apiRequest("POST", `${API}/partners`, { ...partnerForm, commissionRate: Number(partnerForm.commissionRate), revenueShareRate: Number(partnerForm.revenueShareRate) }),
    onSuccess: () => { setPartnerForm({ name: "", email: "", companyName: "", phone: "", commissionRate: "0", revenueShareRate: "0" }); invalidateAll(); toast({ title: "Partner created" }); },
  });

  const clientOptions = clients?.rows ?? [];
  const workspaceOptions = workspaces?.rows ?? [];
  const selectedOwner = clientOptions.find((client) => client.id === workspaceOwnerId);
  const statValues = useMemo(() => ({
    clients: summary?.clients ?? 0,
    workspaces: summary?.workspaces ?? 0,
    active: summary?.active_workspaces ?? 0,
    credits: formatNumber(summary?.credit_balance),
  }), [summary]);

  const openClientWorkspaces = (client: ClientRow) => {
    setWorkspaceOwnerId(client.id);
    setSearch("");
    setTab("workspaces");
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase text-emerald-700">
              <BadgeCheck className="h-3.5 w-3.5" /> Super Admin Module
            </div>
            <h1 className="text-3xl font-extrabold text-slate-950">White-Labelling and Partner Management</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">Manage all clients, their workspaces, WhatsApp bots, imported bot users, team members, add-ons, points, branding, partners, exports, and audit history from one separated control page.</p>
          </div>
          <Button variant="outline" onClick={invalidateAll}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard title="Clients" value={statValues.clients} icon={Users} />
          <StatCard title="Workspaces" value={statValues.workspaces} icon={Building2} />
          <StatCard title="Active Workspaces" value={statValues.active} icon={ShieldCheck} />
          <StatCard title="Credit Balance" value={statValues.credits} icon={CreditCard} />
        </div>

        <div className="flex flex-wrap gap-2 rounded-2xl bg-white p-2 shadow-sm">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === key ? "bg-emerald-600 text-white shadow" : "text-slate-600 hover:bg-slate-100"}`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {tab === "settings" && (
          <Card>
            <CardHeader><CardTitle>Brand Settings</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <InputField label="Platform Name" value={settingsForm.platformName || ""} onChange={(v) => setSettingsForm({ ...settingsForm, platformName: v })} />
                <InputField label="Support Email" value={settingsForm.supportEmail || ""} onChange={(v) => setSettingsForm({ ...settingsForm, supportEmail: v })} />
                <InputField label="Support Phone" value={settingsForm.supportPhone || ""} onChange={(v) => setSettingsForm({ ...settingsForm, supportPhone: v })} />
                <InputField label="Main Logo URL" value={settingsForm.mainLogo || ""} onChange={(v) => setSettingsForm({ ...settingsForm, mainLogo: v })} />
                <InputField label="Dark Logo URL" value={settingsForm.darkModeLogo || ""} onChange={(v) => setSettingsForm({ ...settingsForm, darkModeLogo: v })} />
                <InputField label="Favicon URL" value={settingsForm.favicon || ""} onChange={(v) => setSettingsForm({ ...settingsForm, favicon: v })} />
                <InputField label="Primary Color" type="color" value={settingsForm.primaryColor || "#16a34a"} onChange={(v) => setSettingsForm({ ...settingsForm, primaryColor: v })} />
                <InputField label="Secondary Color" type="color" value={settingsForm.secondaryColor || "#111827"} onChange={(v) => setSettingsForm({ ...settingsForm, secondaryColor: v })} />
                <InputField label="Accent Color" type="color" value={settingsForm.accentColor || "#22c55e"} onChange={(v) => setSettingsForm({ ...settingsForm, accentColor: v })} />
                <InputField label="Custom Domain" value={settingsForm.customDomain || ""} onChange={(v) => setSettingsForm({ ...settingsForm, customDomain: v })} />
                <InputField label="Email From Name" value={settingsForm.emailFromName || ""} onChange={(v) => setSettingsForm({ ...settingsForm, emailFromName: v })} />
                <InputField label="Email From Address" value={settingsForm.emailFromAddress || ""} onChange={(v) => setSettingsForm({ ...settingsForm, emailFromAddress: v })} />
              </div>
              <label className="block text-sm font-semibold text-slate-700">Brand Tagline</label>
              <Textarea value={settingsForm.brandTagline || ""} onChange={(e) => setSettingsForm({ ...settingsForm, brandTagline: e.target.value })} />
              <div className="grid gap-3 md:grid-cols-3">
                <Toggle label="Hide Powered By" checked={!!settingsForm.hidePoweredBy} onChange={(v) => setSettingsForm({ ...settingsForm, hidePoweredBy: v })} />
                <Toggle label="Allow Partner Signup" checked={!!settingsForm.allowPartnerSignup} onChange={(v) => setSettingsForm({ ...settingsForm, allowPartnerSignup: v })} />
                <Toggle label="Maintenance Mode" checked={!!settingsForm.maintenanceMode} onChange={(v) => setSettingsForm({ ...settingsForm, maintenanceMode: v })} />
              </div>
              <div className="flex gap-3"><Button onClick={() => saveSettings.mutate()}>Save Settings</Button><Button variant="outline" onClick={() => resetSettings.mutate()}>Reset Defaults</Button></div>
            </CardContent>
          </Card>
        )}

        {(tab === "workspaces" || tab === "clients") && <SearchBar value={search} onChange={setSearch} exportUrl={`${API}/${tab}/export`} />}

        {tab === "workspaces" && (
          <TableCard title="Workspaces">
            {workspaceOwnerId && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <span>Showing workspaces for {selectedOwner?.email || workspaceOwnerId}</span>
                <Button variant="outline" size="sm" onClick={() => setWorkspaceOwnerId("")}>Show All Workspaces</Button>
              </div>
            )}
            {pointForm && (
              <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_160px_140px_1fr_auto] md:items-end">
                <div><p className="text-xs font-semibold uppercase text-slate-500">Editing points</p><p className="font-semibold text-slate-900">{pointForm.name}</p></div>
                <select className="h-10 rounded-md border bg-white px-3 text-sm" value={pointForm.transactionType} onChange={(e) => setPointForm({ ...pointForm, transactionType: e.target.value as "credit" | "debit" | "adjustment" })}><option value="credit">Increase</option><option value="debit">Decrease</option><option value="adjustment">Set Exact</option></select>
                <Input placeholder="Points" type="number" value={pointForm.credits} onChange={(e) => setPointForm({ ...pointForm, credits: e.target.value })} />
                <Input placeholder="Note" value={pointForm.note} onChange={(e) => setPointForm({ ...pointForm, note: e.target.value })} />
                <div className="flex gap-2"><Button disabled={!pointForm.credits} onClick={() => updatePoints.mutate()}>Save</Button><Button variant="outline" onClick={() => setPointForm(null)}>Cancel</Button></div>
              </div>
            )}
            <table className="w-full min-w-[1180px] text-sm">
              <thead><tr className="border-b text-left text-slate-500"><th className="p-3">Active</th><th className="p-3">Id</th><th className="p-3">Name</th><th className="p-3">End Date</th><th className="p-3">Bot Users</th><th className="p-3">Bots</th><th className="p-3">Members</th><th className="p-3">Addon</th><th className="p-3">Owner</th><th className="p-3">Created at</th><th className="p-3">Points</th><th className="p-3">Auto Renew</th></tr></thead>
              <tbody>{(workspaces?.rows ?? []).map((w) => <tr key={w.id} className="border-b last:border-0"><td className="p-3"><Switch checked={!!w.is_active} onCheckedChange={(v) => patchWorkspace.mutate({ id: w.id, payload: { isActive: v } })} /></td><td className="p-3 font-mono text-xs text-slate-500">{w.id.slice(0, 8)}</td><td className="p-3 font-semibold">{w.name}<div className="text-xs font-normal text-slate-500">{w.phone_number || "No phone"}</div></td><td className="p-3">{formatDate(w.end_date)}</td><td className="p-3">{formatNumber(w.bot_users)}</td><td className="p-3">{formatNumber(w.bots)}</td><td className="p-3">{formatNumber(w.members)}</td><td className="p-3">{formatNumber(w.addon_count)}</td><td className="p-3">{w.owner_name || w.owner_email || "Unassigned"}<div className="text-xs text-slate-500">{w.owner_email}</div></td><td className="p-3">{formatDate(w.created_at)}</td><td className="p-3"><button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white" onClick={() => setPointForm({ workspaceId: w.id, name: w.name, transactionType: "credit", credits: "", note: "" })}>{formatNumber(w.points)}</button></td><td className="p-3"><Switch checked={!!w.auto_renew} onCheckedChange={(v) => patchWorkspace.mutate({ id: w.id, payload: { autoRenew: v } })} /></td></tr>)}</tbody>
            </table>
          </TableCard>
        )}

        {tab === "clients" && (
          <TableCard title="Clients">
            <table className="w-full min-w-[1120px] text-sm">
              <thead><tr className="border-b text-left text-slate-500"><th className="p-3">Client</th><th className="p-3">Status</th><th className="p-3">Workspace</th><th className="p-3">Bots</th><th className="p-3">Bot Users</th><th className="p-3">Members</th><th className="p-3">Add-on</th><th className="p-3">Points</th><th className="p-3">Plan</th><th className="p-3 text-right">Actions</th></tr></thead>
              <tbody>{(clients?.rows ?? []).map((c) => <tr key={c.id} className="border-b last:border-0"><td className="p-3 font-semibold">{c.first_name || c.username} {c.last_name || ""}<div className="text-xs font-normal text-slate-500">{c.email}</div></td><td className="p-3"><StatusPill value={c.status} /></td><td className="p-3"><button className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-bold text-emerald-700" onClick={() => openClientWorkspaces(c)}><Eye className="h-3.5 w-3.5" />{formatNumber(c.workspaces)}</button></td><td className="p-3">{formatNumber(c.bots)}</td><td className="p-3">{formatNumber(c.bot_users)}</td><td className="p-3">{formatNumber(c.members)}</td><td className="p-3">{formatNumber(c.addon_count)}</td><td className="p-3">{formatNumber(c.credit_balance)}</td><td className="p-3">{c.subscription_status || "none"}<div className="text-xs text-slate-500">{formatDate(c.end_date)}</div></td><td className="p-3 text-right"><Button size="sm" variant="outline" disabled={c.status !== "active" || impersonateClient.isPending} onClick={() => impersonateClient.mutate(c.id)}><LogIn className="mr-2 h-4 w-4" /> Impersonate</Button></td></tr>)}</tbody>
            </table>
          </TableCard>
        )}

        {tab === "credits" && (
          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <Card><CardHeader><CardTitle>Add Credit Transaction</CardTitle></CardHeader><CardContent className="space-y-3">
              <select className="w-full rounded-md border p-2" value={creditForm.clientId} onChange={(e) => setCreditForm({ ...creditForm, clientId: e.target.value })}><option value="">Select client</option>{clientOptions.map((c) => <option key={c.id} value={c.id}>{c.email}</option>)}</select>
              <select className="w-full rounded-md border p-2" value={creditForm.workspaceId} onChange={(e) => setCreditForm({ ...creditForm, workspaceId: e.target.value })}><option value="">No workspace</option>{workspaceOptions.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
              <select className="w-full rounded-md border p-2" value={creditForm.transactionType} onChange={(e) => setCreditForm({ ...creditForm, transactionType: e.target.value })}><option value="credit">Credit</option><option value="debit">Debit</option><option value="adjustment">Adjustment</option></select>
              <Input placeholder="Credits" type="number" value={creditForm.credits} onChange={(e) => setCreditForm({ ...creditForm, credits: e.target.value })} />
              <Input placeholder="Reference" value={creditForm.reference} onChange={(e) => setCreditForm({ ...creditForm, reference: e.target.value })} />
              <Textarea placeholder="Note" value={creditForm.note} onChange={(e) => setCreditForm({ ...creditForm, note: e.target.value })} />
              <Button className="w-full" disabled={!creditForm.clientId || !creditForm.credits} onClick={() => addCredit.mutate()}><Plus className="mr-2 h-4 w-4" /> Add Transaction</Button>
            </CardContent></Card>
            <TableCard title="Credit Ledger"><table className="w-full text-sm"><thead><tr className="border-b text-left text-slate-500"><th className="p-3">Client</th><th className="p-3">Type</th><th className="p-3">Credits</th><th className="p-3">Balance</th><th className="p-3">Reference</th><th className="p-3">Date</th></tr></thead><tbody>{(credits?.rows ?? []).map((c) => <tr key={c.id} className="border-b last:border-0"><td className="p-3">{c.client_email}<div className="text-xs text-slate-500">{c.workspace_name}</div></td><td className="p-3"><StatusPill value={c.transaction_type} /></td><td className="p-3">{formatNumber(c.credits)}</td><td className="p-3">{formatNumber(c.balance_after)}</td><td className="p-3">{c.reference}</td><td className="p-3">{new Date(c.created_at).toLocaleString()}</td></tr>)}</tbody></table></TableCard>
          </div>
        )}

        {tab === "partners" && (
          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <Card><CardHeader><CardTitle>Create Partner</CardTitle></CardHeader><CardContent className="space-y-3">
              <Input placeholder="Partner name" value={partnerForm.name} onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })} />
              <Input placeholder="Email" value={partnerForm.email} onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })} />
              <Input placeholder="Company" value={partnerForm.companyName} onChange={(e) => setPartnerForm({ ...partnerForm, companyName: e.target.value })} />
              <Input placeholder="Phone" value={partnerForm.phone} onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })} />
              <div className="grid grid-cols-2 gap-3"><Input placeholder="Commission %" type="number" value={partnerForm.commissionRate} onChange={(e) => setPartnerForm({ ...partnerForm, commissionRate: e.target.value })} /><Input placeholder="Revenue %" type="number" value={partnerForm.revenueShareRate} onChange={(e) => setPartnerForm({ ...partnerForm, revenueShareRate: e.target.value })} /></div>
              <Button className="w-full" disabled={!partnerForm.name || !partnerForm.email} onClick={() => addPartner.mutate()}><Plus className="mr-2 h-4 w-4" /> Create Partner</Button>
            </CardContent></Card>
            <TableCard title="Partners"><table className="w-full text-sm"><thead><tr className="border-b text-left text-slate-500"><th className="p-3">Partner</th><th className="p-3">Status</th><th className="p-3">Commission</th><th className="p-3">Revenue Share</th><th className="p-3">Clients</th></tr></thead><tbody>{(partners?.rows ?? []).map((p) => <tr key={p.id} className="border-b last:border-0"><td className="p-3 font-semibold">{p.name}<div className="text-xs font-normal text-slate-500">{p.email}</div></td><td className="p-3"><StatusPill value={p.status} /></td><td className="p-3">{p.commission_rate}%</td><td className="p-3">{p.revenue_share_rate}%</td><td className="p-3">{p.clients_count}</td></tr>)}</tbody></table></TableCard>
          </div>
        )}

        {tab === "audit" && <TableCard title="Audit Logs"><table className="w-full text-sm"><thead><tr className="border-b text-left text-slate-500"><th className="p-3">Action</th><th className="p-3">Actor</th><th className="p-3">Target</th><th className="p-3">Date</th></tr></thead><tbody>{(audit?.rows ?? []).map((a) => <tr key={a.id} className="border-b last:border-0"><td className="p-3 font-semibold">{a.action_type}</td><td className="p-3">{a.actor_email || "System"}</td><td className="p-3">{a.target_type}<div className="text-xs text-slate-500">{a.target_id}</div></td><td className="p-3">{new Date(a.created_at).toLocaleString()}</td></tr>)}</tbody></table></TableCard>}
      </div>
    </main>
  );
}

function InputField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="space-y-2 text-sm font-semibold text-slate-700"><span>{label}</span><Input type={type} value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4"><span className="text-sm font-semibold text-slate-700">{label}</span><Switch checked={checked} onCheckedChange={onChange} /></div>;
}

function SearchBar({ value, onChange, exportUrl }: { value: string; onChange: (value: string) => void; exportUrl: string }) {
  return <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"><div className="relative w-full md:max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" placeholder="Search by name, email, phone..." value={value} onChange={(e) => onChange(e.target.value)} /></div><Button variant="outline" onClick={() => { window.location.href = exportUrl; }}><Download className="mr-2 h-4 w-4" /> Export Excel</Button></div>;
}

function TableCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent><div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-0">{children}</div></CardContent></Card>;
}
