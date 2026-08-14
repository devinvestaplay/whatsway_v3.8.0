import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BadgeCheck, Building2, CheckCircle, CreditCard, Download, Edit3, Eye, History, LogIn, Minus, MoreHorizontal, Package, Palette, Plus, Receipt, RefreshCw, Search, ShieldCheck, SlidersHorizontal, Trash2, Users } from "lucide-react";
import { apiRequest, queryClient, readApiJson } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
  public_client_id?: number;
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
  created_at?: string;
  updated_at?: string;
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

type CreditRow = { id: string; client_id?: string; workspace_id?: string; client_email?: string; workspace_name?: string; transaction_type: string; credits: string; balance_before: string; balance_after: string; reference?: string; note?: string; created_at: string };
type PartnerRow = { id: string; name: string; email: string; company_name?: string; status: string; commission_rate: string; revenue_share_rate: string; clients_count: number };
type AuditRow = { id: string; actor_email?: string; action_type: string; target_type: string; target_id?: string; created_at: string };
type FeatureRow = { key: string; label: string; group: string };
type PlanConfigRow = {
  id: string;
  plan_key: string;
  plan_name: string;
  status: string;
  display_price: string;
  cost_price: string;
  billing_cycle: string;
  badge?: string;
  description?: string;
  hide_usage_counts: boolean;
  enabled_features: string[];
  disabled_features: string[];
  gateway_metadata?: Record<string, unknown>;
};
type AddonCatalogRow = { id: string; addon_key: string; addon_name: string; description?: string; cost_price: string; points: string; label?: string; status: string; display_order: number };
type TopupOptionRow = { id: string; display_order: number; currency: string; amount: string; points: string; label: string; status: string };
type PartnerSettings = {
  clientBilling: {
    paymentMode: "own_site" | "platform";
    paymentMethods?: string;
    stripeAutomaticTax: boolean;
    requireVatId: boolean;
    stripeConsentMessage?: string;
    addonCreditEnabled: boolean;
    defaultAddonTopupOption?: string;
    pricingPageNote?: string;
  };
  signupTrial: {
    freeTrialDays: number;
    freeTrialOption: "new_workspaces" | "new_clients" | "none";
    userRegistrationEnabled: boolean;
    phoneRequired: boolean;
    emailVerificationEnabled: boolean;
  };
  defaults: {
    language: string;
    flowTheme: string;
    timezone: string;
    countryCode: string;
  };
  sharedServices: {
    systemEmailProfile?: string;
    s3StorageEnabled: boolean;
    webChatSupportEnabled: boolean;
    openaiEnabled: boolean;
    xaiEnabled: boolean;
    groqEnabled: boolean;
  };
  apiRedirects: {
    privateKey?: string;
    webhookUrl?: string;
    loginRedirectUrl?: string;
  };
  loginPage: {
    layout: "default" | "apple" | "banana" | "cherry";
    backgroundMain: string;
    backgroundForm: string;
    textMain: string;
    textLight: string;
    buttonBackground: string;
    buttonText: string;
    linkColor: string;
    backgroundImage?: string;
  };
};

const tabs = [
  { key: "settings", label: "White Label Settings", icon: Palette },
  { key: "workspaces", label: "Workspaces", icon: Building2 },
  { key: "clients", label: "Clients", icon: Users },
  { key: "billing", label: "Custom Plans & Billing", icon: CreditCard },
  { key: "partners", label: "Partner Settings", icon: ShieldCheck },
  { key: "audit", label: "Audit Logs", icon: History },
];

const billingTabs = [
  { key: "prepaid", label: "Prepaid Credit", icon: CreditCard },
  { key: "plans", label: "Plans & Features", icon: SlidersHorizontal },
  { key: "addons", label: "Addons Credit Billing", icon: Package },
  { key: "ledger", label: "Credit Billing", icon: Receipt },
];

const partnerSettingTabs = [
  { key: "clientBilling", label: "Client Billing" },
  { key: "signupTrial", label: "Signup & Trial" },
  { key: "defaults", label: "Defaults" },
  { key: "sharedServices", label: "Shared Services" },
  { key: "apiRedirects", label: "API & Redirects" },
  { key: "loginPage", label: "Login Page" },
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
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [workspaceForm, setWorkspaceForm] = useState({ clientId: "", name: "", workspaceType: "free", notes: "" });
  const [creditForm, setCreditForm] = useState({ clientId: "", workspaceId: "", transactionType: "credit", credits: "", reference: "", note: "" });
  const [partnerForm, setPartnerForm] = useState({ name: "", email: "", companyName: "", phone: "", commissionRate: "0", revenueShareRate: "0" });
  const [pointForm, setPointForm] = useState<{ workspaceId: string; name: string; transactionType: "credit" | "debit" | "adjustment"; credits: string; note: string } | null>(null);
  const [pointsWorkspace, setPointsWorkspace] = useState<WorkspaceRow | null>(null);
  const [pointsSearch, setPointsSearch] = useState("");
  const [showAdjustPoints, setShowAdjustPoints] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "client" | "workspace"; id: string; name: string } | null>(null);
  const [billingTab, setBillingTab] = useState("prepaid");
  const [planPanel, setPlanPanel] = useState<"customization" | "features" | "billing">("customization");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [featureSearch, setFeatureSearch] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [addonForm, setAddonForm] = useState({ id: "", addonKey: "", addonName: "", description: "", costPrice: "", points: "", label: "", status: "active", displayOrder: "0" });
  const [topupForm, setTopupForm] = useState({ id: "", displayOrder: "0", currency: "USD", amount: "", points: "", label: "", status: "active" });
  const [partnerSettingsTab, setPartnerSettingsTab] = useState("clientBilling");
  const [partnerSettingsForm, setPartnerSettingsForm] = useState<PartnerSettings | null>(null);

  const clientUrl = makeQuery(`${API}/clients`, { search });
  const workspaceUrl = makeQuery(`${API}/workspaces`, { search, ownerId: workspaceOwnerId });
  const pointsLedgerUrl = pointsWorkspace
    ? makeQuery(`${API}/credits`, { workspaceId: pointsWorkspace.id, search: pointsSearch })
    : `${API}/credits`;

  const { data: summary } = useQuery<Summary>({ queryKey: [`${API}/summary`] });
  const { data: settings } = useQuery<WhiteLabelSettings>({ queryKey: [`${API}/settings`] });
  const { data: clients } = useQuery<ListResponse<ClientRow>>({ queryKey: [clientUrl], enabled: tab === "clients" || tab === "billing" || tab === "partners" || tab === "workspaces" });
  const { data: workspaces } = useQuery<ListResponse<WorkspaceRow>>({ queryKey: [workspaceUrl], enabled: tab === "workspaces" || tab === "billing" });
  const { data: credits } = useQuery<ListResponse<CreditRow>>({ queryKey: [`${API}/credits`], enabled: tab === "billing" });
  const { data: partners } = useQuery<{ rows: PartnerRow[] }>({ queryKey: [`${API}/partners`], enabled: tab === "partners" });
  const { data: audit } = useQuery<ListResponse<AuditRow>>({ queryKey: [`${API}/audit-logs`], enabled: tab === "audit" });
  const { data: partnerSettings } = useQuery<PartnerSettings>({ queryKey: [`${API}/partner-settings`], enabled: tab === "partners" });
  const { data: features } = useQuery<{ rows: FeatureRow[] }>({ queryKey: [`${API}/billing/features`], enabled: tab === "billing" && billingTab === "plans" });
  const { data: planConfigs } = useQuery<{ rows: PlanConfigRow[] }>({ queryKey: [`${API}/billing/plans`], enabled: tab === "billing" && billingTab === "plans" });
  const { data: addonCatalog } = useQuery<{ rows: AddonCatalogRow[] }>({ queryKey: [`${API}/billing/addons`], enabled: tab === "billing" && billingTab === "addons" });
  const { data: topupOptions } = useQuery<{ rows: TopupOptionRow[] }>({ queryKey: [`${API}/billing/topups`], enabled: tab === "billing" && billingTab === "addons" });
  const { data: pointsLedger } = useQuery<ListResponse<CreditRow>>({ queryKey: [pointsLedgerUrl], enabled: !!pointsWorkspace });

  useEffect(() => {
    if (settings) setSettingsForm(settings);
  }, [settings]);

  useEffect(() => {
    if (partnerSettings) setPartnerSettingsForm(partnerSettings);
  }, [partnerSettings]);

  useEffect(() => {
    if (!selectedPlanId && planConfigs?.rows?.length) {
      setSelectedPlanId(planConfigs.rows[0].id);
    }
  }, [planConfigs, selectedPlanId]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: [`${API}/summary`] });
    queryClient.invalidateQueries({ queryKey: [`${API}/settings`] });
    queryClient.invalidateQueries({ queryKey: [clientUrl] });
    queryClient.invalidateQueries({ queryKey: [workspaceUrl] });
    queryClient.invalidateQueries({ queryKey: [`${API}/credits`] });
    queryClient.invalidateQueries({ queryKey: [`${API}/partners`] });
    queryClient.invalidateQueries({ queryKey: [`${API}/audit-logs`] });
    queryClient.invalidateQueries({ queryKey: [`${API}/partner-settings`] });
    queryClient.invalidateQueries({ queryKey: [`${API}/billing/plans`] });
    queryClient.invalidateQueries({ queryKey: [`${API}/billing/addons`] });
    queryClient.invalidateQueries({ queryKey: [`${API}/billing/topups`] });
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
    onSuccess: () => { setPointForm(null); setShowAdjustPoints(false); invalidateAll(); if (pointsWorkspace) queryClient.invalidateQueries({ queryKey: [pointsLedgerUrl] }); toast({ title: "Workspace points updated" }); },
  });

  const deleteEntity = useMutation({
    mutationFn: (target: { type: "client" | "workspace"; id: string; name: string }) => {
      const path = target.type === "client" ? `${API}/clients/${target.id}` : `${API}/workspaces/${target.id}`;
      return apiRequest("DELETE", path);
    },
    onSuccess: () => {
      const label = deleteTarget?.type === "client" ? "Client" : "Workspace";
      setDeleteTarget(null);
      invalidateAll();
      toast({ title: `${label} deleted` });
    },
    onError: (error: Error) => toast({ title: "Delete failed", description: error.message, variant: "destructive" }),
  });

  const createWorkspace = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/workspaces", {
        clientId: workspaceForm.clientId,
        name: workspaceForm.name,
        workspaceType: workspaceForm.workspaceType,
        notes: workspaceForm.notes || null,
      });
      return readApiJson(response, "Workspace API is not available");
    },
    onSuccess: () => {
      setWorkspaceOwnerId(workspaceForm.clientId);
      setWorkspaceForm({ clientId: "", name: "", workspaceType: "free", notes: "" });
      setShowNewWorkspace(false);
      setTab("workspaces");
      invalidateAll();
      toast({ title: "Workspace created" });
    },
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

  const savePlanConfig = useMutation({
    mutationFn: (plan: PlanConfigRow) => apiRequest("PATCH", `${API}/billing/plans/${plan.id}`, {
      planName: plan.plan_name,
      status: plan.status,
      displayPrice: Number(plan.display_price || 0),
      costPrice: Number(plan.cost_price || 0),
      billingCycle: plan.billing_cycle || "monthly",
      badge: plan.badge || null,
      description: plan.description || null,
      hideUsageCounts: !!plan.hide_usage_counts,
      enabledFeatures: plan.enabled_features || [],
      disabledFeatures: plan.disabled_features || [],
      gatewayMetadata: plan.gateway_metadata || {},
    }),
    onSuccess: () => { invalidateAll(); toast({ title: "Plan saved" }); },
  });

  const saveAddon = useMutation({
    mutationFn: () => {
      const payload = {
        addonKey: addonForm.addonKey,
        addonName: addonForm.addonName,
        description: addonForm.description || null,
        costPrice: Number(addonForm.costPrice || 0),
        points: Number(addonForm.points || 0),
        label: addonForm.label || null,
        status: addonForm.status,
        displayOrder: Number(addonForm.displayOrder || 0),
      };
      return addonForm.id
        ? apiRequest("PATCH", `${API}/billing/addons/${addonForm.id}`, payload)
        : apiRequest("POST", `${API}/billing/addons`, payload);
    },
    onSuccess: () => {
      setAddonForm({ id: "", addonKey: "", addonName: "", description: "", costPrice: "", points: "", label: "", status: "active", displayOrder: "0" });
      invalidateAll();
      toast({ title: "Addon saved" });
    },
  });

  const saveTopup = useMutation({
    mutationFn: () => {
      const payload = {
        displayOrder: Number(topupForm.displayOrder || 0),
        currency: topupForm.currency || "USD",
        amount: Number(topupForm.amount || 0),
        points: Number(topupForm.points || 0),
        label: topupForm.label,
        status: topupForm.status,
      };
      return topupForm.id
        ? apiRequest("PATCH", `${API}/billing/topups/${topupForm.id}`, payload)
        : apiRequest("POST", `${API}/billing/topups`, payload);
    },
    onSuccess: () => {
      setTopupForm({ id: "", displayOrder: "0", currency: "USD", amount: "", points: "", label: "", status: "active" });
      invalidateAll();
      toast({ title: "Topup option saved" });
    },
  });

  const addPartner = useMutation({
    mutationFn: () => apiRequest("POST", `${API}/partners`, { ...partnerForm, commissionRate: Number(partnerForm.commissionRate), revenueShareRate: Number(partnerForm.revenueShareRate) }),
    onSuccess: () => { setPartnerForm({ name: "", email: "", companyName: "", phone: "", commissionRate: "0", revenueShareRate: "0" }); invalidateAll(); toast({ title: "Partner created" }); },
  });

  const savePartnerSettings = useMutation({
    mutationFn: () => apiRequest("PUT", `${API}/partner-settings`, partnerSettingsForm),
    onSuccess: () => { invalidateAll(); toast({ title: "Partner settings saved" }); },
  });

  const clientOptions = clients?.rows ?? [];
  const workspaceOptions = workspaces?.rows ?? [];
  const selectedPlan = planConfigs?.rows?.find((plan) => plan.id === selectedPlanId) || planConfigs?.rows?.[0];
  const featureRows = features?.rows ?? [];
  const featureMap = new Map(featureRows.map((feature) => [feature.key, feature]));
  const enabledFeatureKeys = selectedPlan?.enabled_features ?? [];
  const disabledFeatureKeys = selectedPlan?.disabled_features ?? [];
  const enabledFeatures = enabledFeatureKeys.map((key) => featureMap.get(key) || { key, label: key, group: "Custom" });
  const disabledFeatures = disabledFeatureKeys.map((key) => featureMap.get(key) || { key, label: key, group: "Custom" });
  const filteredEnabledFeatures = enabledFeatures.filter((feature) => feature.label.toLowerCase().includes(featureSearch.toLowerCase()));
  const filteredDisabledFeatures = disabledFeatures.filter((feature) => feature.label.toLowerCase().includes(featureSearch.toLowerCase()));
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

  const openWorkspacePoints = (workspace: WorkspaceRow) => {
    setPointsWorkspace(workspace);
    setPointsSearch("");
    setPointForm({ workspaceId: workspace.id, name: workspace.name, transactionType: "credit", credits: "", note: "" });
  };

  const updateSelectedPlan = (updates: Partial<PlanConfigRow>) => {
    if (!selectedPlan) return;
    queryClient.setQueryData<{ rows: PlanConfigRow[] }>([`${API}/billing/plans`], (current) => ({
      rows: (current?.rows ?? []).map((plan) => plan.id === selectedPlan.id ? { ...plan, ...updates } : plan),
    }));
  };

  const moveFeatures = (direction: "enable" | "disable") => {
    if (!selectedPlan || selectedFeatures.length === 0) return;
    const selected = new Set(selectedFeatures);
    if (direction === "enable") {
      updateSelectedPlan({
        enabled_features: Array.from(new Set([...enabledFeatureKeys, ...selectedFeatures])),
        disabled_features: disabledFeatureKeys.filter((key) => !selected.has(key)),
      });
    } else {
      updateSelectedPlan({
        disabled_features: Array.from(new Set([...disabledFeatureKeys, ...selectedFeatures])),
        enabled_features: enabledFeatureKeys.filter((key) => !selected.has(key)),
      });
    }
    setSelectedFeatures([]);
  };

  const updatePartnerSettings = <K extends keyof PartnerSettings>(section: K, updates: Partial<PartnerSettings[K]>) => {
    if (!partnerSettingsForm) return;
    setPartnerSettingsForm({
      ...partnerSettingsForm,
      [section]: {
        ...partnerSettingsForm[section],
        ...updates,
      },
    });
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
            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Workspace Management</p>
                  <p className="text-xs text-slate-500">Create workspaces for clients and manage their status, points, and renewal state.</p>
                </div>
                <Button onClick={() => setShowNewWorkspace((value) => !value)}><Plus className="mr-2 h-4 w-4" /> New Workspace</Button>
              </div>
              {showNewWorkspace && (
                <div className="grid gap-3 md:grid-cols-[1fr_1fr_140px_1fr_auto] md:items-end">
                  <select className="h-10 rounded-md border bg-white px-3 text-sm" value={workspaceForm.clientId} onChange={(e) => setWorkspaceForm({ ...workspaceForm, clientId: e.target.value })}>
                    <option value="">Select client</option>
                    {clientOptions.map((client) => <option key={client.id} value={client.id}>{client.email} ({client.public_client_id || "-"})</option>)}
                  </select>
                  <Input placeholder="Workspace name" value={workspaceForm.name} onChange={(e) => setWorkspaceForm({ ...workspaceForm, name: e.target.value })} />
                  <select className="h-10 rounded-md border bg-white px-3 text-sm" value={workspaceForm.workspaceType} onChange={(e) => setWorkspaceForm({ ...workspaceForm, workspaceType: e.target.value })}>
                    <option value="free">Free</option>
                    <option value="paid">Paid</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                  <Input placeholder="Notes" value={workspaceForm.notes} onChange={(e) => setWorkspaceForm({ ...workspaceForm, notes: e.target.value })} />
                  <Button disabled={!workspaceForm.clientId || !workspaceForm.name.trim() || createWorkspace.isPending} onClick={() => createWorkspace.mutate()}>
                    {createWorkspace.isPending ? "Creating..." : "Create"}
                  </Button>
                </div>
              )}
            </div>
            {workspaceOwnerId && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <span>Showing workspaces for {selectedOwner?.email || workspaceOwnerId}</span>
                <Button variant="outline" size="sm" onClick={() => setWorkspaceOwnerId("")}>Show All Workspaces</Button>
              </div>
            )}
            <table className="w-full min-w-[1180px] text-sm">
              <thead><tr className="border-b text-left text-slate-500"><th className="p-3">Active</th><th className="p-3">Id</th><th className="p-3">Name</th><th className="p-3">End Date</th><th className="p-3">Bot Users</th><th className="p-3">Bots</th><th className="p-3">Members</th><th className="p-3">Addon</th><th className="p-3">Owner</th><th className="p-3">Created at</th><th className="p-3">Points</th><th className="p-3">Auto Renew</th><th className="p-3 text-right">Actions</th></tr></thead>
              <tbody>{(workspaces?.rows ?? []).map((w) => <tr key={w.id} className="border-b last:border-0"><td className="p-3"><Switch checked={!!w.is_active} onCheckedChange={(v) => patchWorkspace.mutate({ id: w.id, payload: { isActive: v } })} /></td><td className="p-3 font-mono text-xs text-slate-500">{w.id.slice(0, 8)}</td><td className="p-3 font-semibold">{w.name}<div className="text-xs font-normal text-slate-500">{w.phone_number || "Workspace shell"}</div></td><td className="p-3">{formatDate(w.end_date)}</td><td className="p-3">{formatNumber(w.bot_users)}</td><td className="p-3">{formatNumber(w.bots)}</td><td className="p-3">{formatNumber(w.members)}</td><td className="p-3">{formatNumber(w.addon_count)}</td><td className="p-3">{w.owner_name || w.owner_email || "Unassigned"}<div className="text-xs text-slate-500">{w.owner_email}</div><div className="font-mono text-[11px] text-slate-400">{w.owner_id}</div></td><td className="p-3">{formatDate(w.created_at)}</td><td className="p-3"><button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white" onClick={() => openWorkspacePoints(w)}>{formatNumber(w.points)}</button></td><td className="p-3"><Switch checked={!!w.auto_renew} onCheckedChange={(v) => patchWorkspace.mutate({ id: w.id, payload: { autoRenew: v } })} /></td><td className="p-3 text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="outline"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => openWorkspacePoints(w)}><Receipt className="mr-2 h-4 w-4" />Manage points</DropdownMenuItem><DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteTarget({ type: "workspace", id: w.id, name: w.name })}><Trash2 className="mr-2 h-4 w-4" />Delete workspace</DropdownMenuItem></DropdownMenuContent></DropdownMenu></td></tr>)}</tbody>
            </table>
          </TableCard>
        )}

        {tab === "clients" && (
          <TableCard title="Clients">
            <table className="w-full min-w-[1380px] text-sm">
              <thead><tr className="border-b text-left text-slate-500"><th className="p-3">Client</th><th className="p-3">Client ID</th><th className="p-3">Created at</th><th className="p-3">Updated at</th><th className="p-3">Status</th><th className="p-3">Workspace</th><th className="p-3">Bots</th><th className="p-3">Bot Users</th><th className="p-3">Members</th><th className="p-3">Add-on</th><th className="p-3">Points</th><th className="p-3">Plan</th><th className="p-3 text-right">Actions</th></tr></thead>
              <tbody>{(clients?.rows ?? []).map((c) => <tr key={c.id} className="border-b last:border-0"><td className="p-3 font-semibold">{c.first_name || c.username} {c.last_name || ""}<div className="text-xs font-normal text-slate-500">{c.email}</div></td><td className="p-3 font-mono text-sm font-semibold text-slate-700">{c.public_client_id || "-"}</td><td className="p-3">{formatDate(c.created_at)}</td><td className="p-3">{formatDate(c.updated_at)}</td><td className="p-3"><StatusPill value={c.status} /></td><td className="p-3"><button className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-bold text-emerald-700" onClick={() => openClientWorkspaces(c)}><Eye className="h-3.5 w-3.5" />{formatNumber(c.workspaces)}</button></td><td className="p-3">{formatNumber(c.bots)}</td><td className="p-3">{formatNumber(c.bot_users)}</td><td className="p-3">{formatNumber(c.members)}</td><td className="p-3">{formatNumber(c.addon_count)}</td><td className="p-3">{formatNumber(c.credit_balance)}</td><td className="p-3">{c.subscription_status || "none"}<div className="text-xs text-slate-500">{formatDate(c.end_date)}</div></td><td className="p-3 text-right"><div className="flex justify-end gap-2"><Button size="sm" variant="outline" disabled={c.status !== "active" || impersonateClient.isPending} onClick={() => impersonateClient.mutate(c.id)}><LogIn className="mr-2 h-4 w-4" /> Impersonate</Button><DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="outline"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => openClientWorkspaces(c)}><Eye className="mr-2 h-4 w-4" />View workspaces</DropdownMenuItem><DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteTarget({ type: "client", id: c.id, name: c.email })}><Trash2 className="mr-2 h-4 w-4" />Delete client</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></td></tr>)}</tbody>
            </table>
          </TableCard>
        )}

        {tab === "billing" && (
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            <Card className="self-start">
              <CardHeader><CardTitle className="text-base">Custom Plans & Billing</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {billingTabs.map(({ key, label, icon: Icon }) => (
                  <button key={key} onClick={() => setBillingTab(key)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold ${billingTab === key ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50"}`}>
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                ))}
              </CardContent>
            </Card>

            {billingTab === "prepaid" && (
              <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
                <Card><CardHeader><CardTitle>Add Credit Transaction</CardTitle></CardHeader><CardContent className="space-y-3">
                  <select className="w-full rounded-md border p-2" value={creditForm.clientId} onChange={(e) => setCreditForm({ ...creditForm, clientId: e.target.value })}><option value="">Select client</option>{clientOptions.map((c) => <option key={c.id} value={c.id}>{c.email} ({c.public_client_id || "-"})</option>)}</select>
                  <select className="w-full rounded-md border p-2" value={creditForm.workspaceId} onChange={(e) => setCreditForm({ ...creditForm, workspaceId: e.target.value })}><option value="">No workspace</option>{workspaceOptions.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
                  <select className="w-full rounded-md border p-2" value={creditForm.transactionType} onChange={(e) => setCreditForm({ ...creditForm, transactionType: e.target.value })}><option value="credit">Credit</option><option value="debit">Debit</option><option value="adjustment">Adjustment</option></select>
                  <Input placeholder="Credits" type="number" value={creditForm.credits} onChange={(e) => setCreditForm({ ...creditForm, credits: e.target.value })} />
                  <Input placeholder="Reference" value={creditForm.reference} onChange={(e) => setCreditForm({ ...creditForm, reference: e.target.value })} />
                  <Textarea placeholder="Note" value={creditForm.note} onChange={(e) => setCreditForm({ ...creditForm, note: e.target.value })} />
                  <Button className="w-full" disabled={!creditForm.clientId || !creditForm.credits} onClick={() => addCredit.mutate()}><Plus className="mr-2 h-4 w-4" /> Add Transaction</Button>
                </CardContent></Card>
                <CreditLedger credits={credits?.rows ?? []} />
              </div>
            )}

            {billingTab === "plans" && selectedPlan && (
              <Card>
                <CardContent className="p-0">
                  <div className="border-b p-4">
                    <label className="mb-2 block text-xs font-semibold uppercase text-slate-500">Plan</label>
                    <select className="h-10 min-w-[260px] rounded-md border bg-white px-3 text-sm" value={selectedPlan.id} onChange={(e) => { setSelectedPlanId(e.target.value); setSelectedFeatures([]); }}>
                      {(planConfigs?.rows ?? []).map((plan) => <option key={plan.id} value={plan.id}>{plan.plan_name}</option>)}
                    </select>
                  </div>
                  <div className="grid gap-4 p-4 xl:grid-cols-[260px_1fr]">
                    <div className="rounded-lg border p-6 text-center">
                      <h3 className="text-xl font-bold">{selectedPlan.plan_name}</h3>
                      <StatusPill value={selectedPlan.status} />
                      <p className="mt-6 text-3xl font-black">{formatNumber(selectedPlan.display_price)}<span className="text-sm font-normal text-slate-500">/{selectedPlan.billing_cycle === "annual" ? "year" : "month"}</span></p>
                      <Button className="mt-6 w-full" variant="outline">Price Calculator</Button>
                    </div>
                    <div>
                      <div className="mb-4 flex gap-2 border-b">
                        {(["customization", "features", "billing"] as const).map((panel) => <button key={panel} className={`px-3 py-2 text-sm font-semibold capitalize ${planPanel === panel ? "border-b-2 border-emerald-600 text-emerald-700" : "text-slate-500"}`} onClick={() => setPlanPanel(panel)}>{panel === "billing" ? "Stripe Billing" : panel}</button>)}
                      </div>

                      {planPanel === "customization" && (
                        <div className="space-y-4 rounded-lg border p-4">
                          <div className="flex items-center justify-between"><span className="text-sm font-semibold">Plan Status</span><Toggle label="Active" checked={selectedPlan.status === "active"} onChange={(v) => updateSelectedPlan({ status: v ? "active" : "archived" })} /></div>
                          <InputField label="Plan Name" value={selectedPlan.plan_name} onChange={(v) => updateSelectedPlan({ plan_name: v })} />
                          <div className="grid gap-3 md:grid-cols-2"><InputField label="Display Price" type="number" value={String(selectedPlan.display_price ?? 0)} onChange={(v) => updateSelectedPlan({ display_price: v })} /><InputField label="Cost Price" type="number" value={String(selectedPlan.cost_price ?? 0)} onChange={(v) => updateSelectedPlan({ cost_price: v })} /></div>
                          <Toggle label="Hide bots, bot users, members" checked={!!selectedPlan.hide_usage_counts} onChange={(v) => updateSelectedPlan({ hide_usage_counts: v })} />
                          <label className="block text-sm font-semibold text-slate-700">Description</label>
                          <Textarea value={selectedPlan.description || ""} onChange={(e) => updateSelectedPlan({ description: e.target.value })} />
                        </div>
                      )}

                      {planPanel === "features" && (
                        <div className="grid items-center gap-4 xl:grid-cols-[1fr_150px_1fr]">
                          <FeatureList title="Enabled Features" features={filteredEnabledFeatures} selected={selectedFeatures} setSelected={setSelectedFeatures} />
                          <div className="flex flex-row justify-center gap-2 xl:flex-col">
                            <Button onClick={() => moveFeatures("enable")} disabled={!selectedFeatures.length}><CheckCircle className="mr-2 h-4 w-4" />Enable</Button>
                            <Button variant="outline" onClick={() => moveFeatures("disable")} disabled={!selectedFeatures.length}>Disable</Button>
                            <Input placeholder="Search" value={featureSearch} onChange={(e) => setFeatureSearch(e.target.value)} />
                          </div>
                          <FeatureList title="Disabled Features" features={filteredDisabledFeatures} selected={selectedFeatures} setSelected={setSelectedFeatures} />
                        </div>
                      )}

                      {planPanel === "billing" && (
                        <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
                          <InputField label="Billing Cycle" value={selectedPlan.billing_cycle || "monthly"} onChange={(v) => updateSelectedPlan({ billing_cycle: v })} />
                          <InputField label="Badge" value={selectedPlan.badge || ""} onChange={(v) => updateSelectedPlan({ badge: v })} />
                          <InputField label="Stripe Price ID" value={String((selectedPlan.gateway_metadata as any)?.stripePriceId || "")} onChange={(v) => updateSelectedPlan({ gateway_metadata: { ...(selectedPlan.gateway_metadata || {}), stripePriceId: v } })} />
                          <InputField label="Gateway Plan ID" value={String((selectedPlan.gateway_metadata as any)?.gatewayPlanId || "")} onChange={(v) => updateSelectedPlan({ gateway_metadata: { ...(selectedPlan.gateway_metadata || {}), gatewayPlanId: v } })} />
                        </div>
                      )}
                      <div className="mt-4 flex justify-end"><Button onClick={() => savePlanConfig.mutate(selectedPlan)}>Save</Button></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {billingTab === "addons" && (
              <div className="space-y-6">
                <TableCard title="Addon Settings">
                  <div className="mb-4 grid gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-[120px_1fr_1fr_120px_100px_1fr_110px_auto]">
                    <Input placeholder="Key" value={addonForm.addonKey} onChange={(e) => setAddonForm({ ...addonForm, addonKey: e.target.value })} />
                    <Input placeholder="Addon name" value={addonForm.addonName} onChange={(e) => setAddonForm({ ...addonForm, addonName: e.target.value })} />
                    <Input placeholder="Description" value={addonForm.description} onChange={(e) => setAddonForm({ ...addonForm, description: e.target.value })} />
                    <Input placeholder="Cost" type="number" value={addonForm.costPrice} onChange={(e) => setAddonForm({ ...addonForm, costPrice: e.target.value })} />
                    <Input placeholder="Points" type="number" value={addonForm.points} onChange={(e) => setAddonForm({ ...addonForm, points: e.target.value })} />
                    <Input placeholder="Label" value={addonForm.label} onChange={(e) => setAddonForm({ ...addonForm, label: e.target.value })} />
                    <select className="h-10 rounded-md border bg-white px-2" value={addonForm.status} onChange={(e) => setAddonForm({ ...addonForm, status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select>
                    <Button disabled={!addonForm.addonKey || !addonForm.addonName} onClick={() => saveAddon.mutate()}>{addonForm.id ? "Update" : "Add"}</Button>
                  </div>
                  <table className="w-full min-w-[980px] text-sm"><thead><tr className="border-b text-left text-slate-500"><th className="p-3">Addon</th><th className="p-3">Your Cost Price</th><th className="p-3">Points</th><th className="p-3">Label</th><th className="p-3">Status</th><th className="p-3 text-right">Edit</th></tr></thead><tbody>{(addonCatalog?.rows ?? []).map((addon) => <tr key={addon.id} className="border-b last:border-0"><td className="p-3"><span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">{addon.addon_key}</span><div className="mt-1 font-semibold">{addon.addon_name}</div><div className="text-xs text-slate-500">{addon.description}</div></td><td className="p-3">${formatNumber(addon.cost_price)}</td><td className="p-3">{formatNumber(addon.points)}</td><td className="p-3">{addon.label}</td><td className="p-3"><StatusPill value={addon.status} /></td><td className="p-3 text-right"><Button size="icon" variant="outline" onClick={() => setAddonForm({ id: addon.id, addonKey: addon.addon_key, addonName: addon.addon_name, description: addon.description || "", costPrice: String(addon.cost_price || ""), points: String(addon.points || ""), label: addon.label || "", status: addon.status, displayOrder: String(addon.display_order || 0) })}><Edit3 className="h-4 w-4" /></Button></td></tr>)}</tbody></table>
                </TableCard>

                <TableCard title="Topup Options">
                  <div className="mb-4 grid gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-[90px_100px_120px_120px_1fr_110px_auto]">
                    <Input placeholder="Order" type="number" value={topupForm.displayOrder} onChange={(e) => setTopupForm({ ...topupForm, displayOrder: e.target.value })} />
                    <Input placeholder="Currency" value={topupForm.currency} onChange={(e) => setTopupForm({ ...topupForm, currency: e.target.value })} />
                    <Input placeholder="Amount" type="number" value={topupForm.amount} onChange={(e) => setTopupForm({ ...topupForm, amount: e.target.value })} />
                    <Input placeholder="Points" type="number" value={topupForm.points} onChange={(e) => setTopupForm({ ...topupForm, points: e.target.value })} />
                    <Input placeholder="Label" value={topupForm.label} onChange={(e) => setTopupForm({ ...topupForm, label: e.target.value })} />
                    <select className="h-10 rounded-md border bg-white px-2" value={topupForm.status} onChange={(e) => setTopupForm({ ...topupForm, status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select>
                    <Button disabled={!topupForm.amount || !topupForm.points || !topupForm.label} onClick={() => saveTopup.mutate()}>{topupForm.id ? "Update" : "New Option"}</Button>
                  </div>
                  <table className="w-full text-sm"><thead><tr className="border-b text-left text-slate-500"><th className="p-3">Display Order</th><th className="p-3">Currency</th><th className="p-3">Amount</th><th className="p-3">Points</th><th className="p-3">Label</th><th className="p-3">Status</th><th className="p-3 text-right">Edit</th></tr></thead><tbody>{(topupOptions?.rows ?? []).map((option) => <tr key={option.id} className="border-b last:border-0"><td className="p-3">{option.display_order}</td><td className="p-3">{option.currency}</td><td className="p-3">{formatNumber(option.amount)}</td><td className="p-3">{formatNumber(option.points)}</td><td className="p-3">{option.label}</td><td className="p-3"><StatusPill value={option.status} /></td><td className="p-3 text-right"><Button size="icon" variant="outline" onClick={() => setTopupForm({ id: option.id, displayOrder: String(option.display_order || 0), currency: option.currency, amount: String(option.amount || ""), points: String(option.points || ""), label: option.label, status: option.status })}><Edit3 className="h-4 w-4" /></Button></td></tr>)}</tbody></table>
                </TableCard>
              </div>
            )}

            {billingTab === "ledger" && <CreditLedger credits={credits?.rows ?? []} />}
          </div>
        )}

        {tab === "partners" && partnerSettingsForm && (
          <Card>
            <CardContent className="p-0">
              <div className="flex flex-wrap gap-4 border-b px-4 pt-3">
                {partnerSettingTabs.map((item) => (
                  <button key={item.key} onClick={() => setPartnerSettingsTab(item.key)} className={`border-b-2 px-1 pb-3 text-sm font-semibold ${partnerSettingsTab === item.key ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-600"}`}>
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="space-y-4 p-4">
                {partnerSettingsTab === "clientBilling" && (
                  <div className="grid gap-4 xl:grid-cols-2">
                    <PartnerPanel title="How clients pay you" subtitle="Changes what the rest of this tab asks for">
                      <div className="grid gap-3 md:grid-cols-2">
                        <ChoiceCard title="On your own site" description="Plan and top-up buttons send clients to your billing pages." active={partnerSettingsForm.clientBilling.paymentMode === "own_site"} onClick={() => updatePartnerSettings("clientBilling", { paymentMode: "own_site" })} />
                        <ChoiceCard title="Inside the platform" description="Clients pick a plan and pay here through your connected account." active={partnerSettingsForm.clientBilling.paymentMode === "platform"} onClick={() => updatePartnerSettings("clientBilling", { paymentMode: "platform" })} />
                      </div>
                    </PartnerPanel>
                    <PartnerPanel title="Addon credit" subtitle="Workspaces spend points on addons instead of being billed separately">
                      <Toggle label="Credit Billing For Addons" checked={partnerSettingsForm.clientBilling.addonCreditEnabled} onChange={(v) => updatePartnerSettings("clientBilling", { addonCreditEnabled: v })} />
                      <label className="space-y-2 text-sm font-semibold text-slate-700"><span>Default addon topup option</span><select className="h-10 w-full rounded-md border bg-white px-3" value={partnerSettingsForm.clientBilling.defaultAddonTopupOption || ""} onChange={(e) => updatePartnerSettings("clientBilling", { defaultAddonTopupOption: e.target.value })}><option value="">No auto recharge</option>{(topupOptions?.rows ?? []).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
                      <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-800">Note: clients will not be able to select an auto recharge option when this is empty.</div>
                    </PartnerPanel>
                    <PartnerPanel title="Stripe checkout" subtitle="Applies to paid top-ups too">
                      <InputField label="Payment methods" value={partnerSettingsForm.clientBilling.paymentMethods || ""} onChange={(v) => updatePartnerSettings("clientBilling", { paymentMethods: v })} />
                      <Toggle label="Stripe Automatic Tax" checked={partnerSettingsForm.clientBilling.stripeAutomaticTax} onChange={(v) => updatePartnerSettings("clientBilling", { stripeAutomaticTax: v })} />
                      <Toggle label="Require VAT ID" checked={partnerSettingsForm.clientBilling.requireVatId} onChange={(v) => updatePartnerSettings("clientBilling", { requireVatId: v })} />
                      <label className="space-y-2 text-sm font-semibold text-slate-700"><span>Stripe Consent Message</span><Textarea value={partnerSettingsForm.clientBilling.stripeConsentMessage || ""} onChange={(e) => updatePartnerSettings("clientBilling", { stripeConsentMessage: e.target.value })} /></label>
                    </PartnerPanel>
                    <PartnerPanel title="Pricing page" subtitle="Shown at the top of the pricing page your clients see">
                      <label className="space-y-2 text-sm font-semibold text-slate-700"><span>Pricing Page Note</span><Textarea className="min-h-36" value={partnerSettingsForm.clientBilling.pricingPageNote || ""} onChange={(e) => updatePartnerSettings("clientBilling", { pricingPageNote: e.target.value })} /></label>
                    </PartnerPanel>
                  </div>
                )}

                {partnerSettingsTab === "signupTrial" && (
                  <div className="grid max-w-3xl gap-4">
                    <PartnerPanel title="Free trial">
                      <InputField label="Free Trial Days" type="number" value={String(partnerSettingsForm.signupTrial.freeTrialDays)} onChange={(v) => updatePartnerSettings("signupTrial", { freeTrialDays: Number(v || 0) })} />
                      <label className="space-y-2 text-sm font-semibold text-slate-700"><span>Free Trial Option</span><select className="h-10 w-full rounded-md border bg-white px-3" value={partnerSettingsForm.signupTrial.freeTrialOption} onChange={(e) => updatePartnerSettings("signupTrial", { freeTrialOption: e.target.value as PartnerSettings["signupTrial"]["freeTrialOption"] })}><option value="new_workspaces">Free trial for new workspaces</option><option value="new_clients">Free trial for new clients</option><option value="none">No free trial</option></select></label>
                    </PartnerPanel>
                    <PartnerPanel title="Registration">
                      <Toggle label="User Registration" checked={partnerSettingsForm.signupTrial.userRegistrationEnabled} onChange={(v) => updatePartnerSettings("signupTrial", { userRegistrationEnabled: v })} />
                      <Toggle label="User Registration - Phone Required" checked={partnerSettingsForm.signupTrial.phoneRequired} onChange={(v) => updatePartnerSettings("signupTrial", { phoneRequired: v })} />
                      <Toggle label="Signup Email Verification" checked={partnerSettingsForm.signupTrial.emailVerificationEnabled} onChange={(v) => updatePartnerSettings("signupTrial", { emailVerificationEnabled: v })} />
                    </PartnerPanel>
                  </div>
                )}

                {partnerSettingsTab === "defaults" && (
                  <PartnerPanel title="New workspace defaults">
                    <div className="grid max-w-3xl gap-4 md:grid-cols-2">
                      <InputField label="Default Language" value={partnerSettingsForm.defaults.language} onChange={(v) => updatePartnerSettings("defaults", { language: v })} />
                      <InputField label="Default Flow Theme" value={partnerSettingsForm.defaults.flowTheme} onChange={(v) => updatePartnerSettings("defaults", { flowTheme: v })} />
                      <InputField label="Default Timezone" value={partnerSettingsForm.defaults.timezone} onChange={(v) => updatePartnerSettings("defaults", { timezone: v })} />
                      <InputField label="Default Country Code" value={partnerSettingsForm.defaults.countryCode} onChange={(v) => updatePartnerSettings("defaults", { countryCode: v })} />
                    </div>
                  </PartnerPanel>
                )}

                {partnerSettingsTab === "sharedServices" && (
                  <div className="grid gap-4 xl:grid-cols-2">
                    <PartnerPanel title="Storage & email">
                      <InputField label="System Email Profile" value={partnerSettingsForm.sharedServices.systemEmailProfile || ""} onChange={(v) => updatePartnerSettings("sharedServices", { systemEmailProfile: v })} />
                      <Toggle label="S3 Storage" checked={partnerSettingsForm.sharedServices.s3StorageEnabled} onChange={(v) => updatePartnerSettings("sharedServices", { s3StorageEnabled: v })} />
                    </PartnerPanel>
                    <PartnerPanel title="Client support">
                      <Toggle label="Web Chat Support" checked={partnerSettingsForm.sharedServices.webChatSupportEnabled} onChange={(v) => updatePartnerSettings("sharedServices", { webChatSupportEnabled: v })} />
                    </PartnerPanel>
                    <PartnerPanel title="AI providers">
                      <Toggle label="OpenAI" checked={partnerSettingsForm.sharedServices.openaiEnabled} onChange={(v) => updatePartnerSettings("sharedServices", { openaiEnabled: v })} />
                      <Toggle label="xAI" checked={partnerSettingsForm.sharedServices.xaiEnabled} onChange={(v) => updatePartnerSettings("sharedServices", { xaiEnabled: v })} />
                      <Toggle label="Groq" checked={partnerSettingsForm.sharedServices.groqEnabled} onChange={(v) => updatePartnerSettings("sharedServices", { groqEnabled: v })} />
                    </PartnerPanel>
                  </div>
                )}

                {partnerSettingsTab === "apiRedirects" && (
                  <div className="grid gap-4 xl:grid-cols-2">
                    <PartnerPanel title="Signing">
                      <InputField label="Private Key" value={partnerSettingsForm.apiRedirects.privateKey || ""} onChange={(v) => updatePartnerSettings("apiRedirects", { privateKey: v })} />
                      <Button variant="outline" onClick={() => updatePartnerSettings("apiRedirects", { privateKey: crypto.randomUUID() })}>Generate new key</Button>
                    </PartnerPanel>
                    <PartnerPanel title="Login redirect">
                      <InputField label="Redirect URL after login" value={partnerSettingsForm.apiRedirects.loginRedirectUrl || ""} onChange={(v) => updatePartnerSettings("apiRedirects", { loginRedirectUrl: v })} />
                    </PartnerPanel>
                    <PartnerPanel title="Webhook">
                      <InputField label="Webhook URL" value={partnerSettingsForm.apiRedirects.webhookUrl || ""} onChange={(v) => updatePartnerSettings("apiRedirects", { webhookUrl: v })} />
                    </PartnerPanel>
                  </div>
                )}

                {partnerSettingsTab === "loginPage" && (
                  <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
                    <div className="space-y-4">
                      <PartnerPanel title="Layout">
                        <div className="grid grid-cols-2 gap-3">{(["default", "apple", "banana", "cherry"] as const).map((layout) => <ChoiceCard key={layout} title={layout[0].toUpperCase() + layout.slice(1)} description={layout === "banana" ? "Image on the right" : layout === "apple" ? "Image on the left" : layout === "cherry" ? "Centred login card" : "Platform login page"} active={partnerSettingsForm.loginPage.layout === layout} onClick={() => updatePartnerSettings("loginPage", { layout })} />)}</div>
                      </PartnerPanel>
                      <PartnerPanel title="Colors & background">
                        <InputField label="Background Color - Main" type="color" value={partnerSettingsForm.loginPage.backgroundMain} onChange={(v) => updatePartnerSettings("loginPage", { backgroundMain: v })} />
                        <InputField label="Background Color - Form" type="color" value={partnerSettingsForm.loginPage.backgroundForm} onChange={(v) => updatePartnerSettings("loginPage", { backgroundForm: v })} />
                        <InputField label="Text Color - Main" type="color" value={partnerSettingsForm.loginPage.textMain} onChange={(v) => updatePartnerSettings("loginPage", { textMain: v })} />
                        <InputField label="Button Background Color" type="color" value={partnerSettingsForm.loginPage.buttonBackground} onChange={(v) => updatePartnerSettings("loginPage", { buttonBackground: v })} />
                        <InputField label="Background Image" value={partnerSettingsForm.loginPage.backgroundImage || ""} onChange={(v) => updatePartnerSettings("loginPage", { backgroundImage: v })} />
                      </PartnerPanel>
                    </div>
                    <PartnerPanel title="Live preview" subtitle="Showing the existing landing page from this project">
                      <div className="mb-3 flex justify-end">
                        <Button variant="outline" size="sm" onClick={() => window.open("/", "_blank", "noopener,noreferrer")}>Preview full page</Button>
                      </div>
                      <div className="h-[560px] overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <iframe
                          className="h-full w-full"
                          src="/"
                          title="Landing page preview"
                        />
                      </div>
                    </PartnerPanel>
                  </div>
                )}

                <div className="sticky bottom-0 flex justify-end border-t bg-white p-3">
                  <Button onClick={() => savePartnerSettings.mutate()} disabled={savePartnerSettings.isPending}>{savePartnerSettings.isPending ? "Saving..." : "Save"}</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {tab === "audit" && <TableCard title="Audit Logs"><table className="w-full text-sm"><thead><tr className="border-b text-left text-slate-500"><th className="p-3">Action</th><th className="p-3">Actor</th><th className="p-3">Target</th><th className="p-3">Date</th></tr></thead><tbody>{(audit?.rows ?? []).map((a) => <tr key={a.id} className="border-b last:border-0"><td className="p-3 font-semibold">{a.action_type}</td><td className="p-3">{a.actor_email || "System"}</td><td className="p-3">{a.target_type}<div className="text-xs text-slate-500">{a.target_id}</div></td><td className="p-3">{new Date(a.created_at).toLocaleString()}</td></tr>)}</tbody></table></TableCard>}
      </div>

      <Dialog open={!!pointsWorkspace} onOpenChange={(open) => { if (!open) { setPointsWorkspace(null); setPointForm(null); setShowAdjustPoints(false); } }}>
        <DialogContent className="max-w-[95vw] lg:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Manage Points</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950">{pointsWorkspace?.name}</p>
                <p className="text-xs text-slate-500">{pointsWorkspace?.owner_email || "No owner"} · Balance {formatNumber(pointsWorkspace?.points)}</p>
              </div>
              <Button onClick={() => setShowAdjustPoints(true)}>Adjust Points</Button>
            </div>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" placeholder="Search by action, reference, note..." value={pointsSearch} onChange={(e) => setPointsSearch(e.target.value)} />
            </div>
            <div className="max-h-[55vh] overflow-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[820px] text-sm">
                <thead><tr className="border-b bg-slate-50 text-left text-slate-500"><th className="p-3">Action</th><th className="p-3">Amount</th><th className="p-3">Points</th><th className="p-3">Note</th><th className="p-3 text-right">Time</th></tr></thead>
                <tbody>{(pointsLedger?.rows ?? []).map((entry) => {
                  const type = entry.transaction_type;
                  const amount = type === "debit" ? -Number(entry.credits || 0) : Number(entry.credits || 0);
                  return <tr key={entry.id} className="border-b last:border-0"><td className="p-3"><StatusPill value={type} /></td><td className={`p-3 font-semibold ${amount < 0 ? "text-red-600" : "text-emerald-600"}`}>{amount < 0 ? "-" : ""}{formatNumber(Math.abs(amount))}</td><td className="p-3">{formatNumber(entry.balance_after)}</td><td className="p-3">{entry.note || entry.reference || "-"}</td><td className="p-3 text-right text-slate-500">{new Date(entry.created_at).toLocaleString()}</td></tr>;
                })}</tbody>
              </table>
              {!(pointsLedger?.rows ?? []).length && <div className="p-8 text-center text-sm text-slate-500">No point history found for this workspace.</div>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAdjustPoints} onOpenChange={setShowAdjustPoints}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Points Balance Adjustment</DialogTitle>
          </DialogHeader>
          {pointForm && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Action</label>
                <select className="h-11 w-full rounded-md border bg-white px-3 text-sm" value={pointForm.transactionType} onChange={(e) => setPointForm({ ...pointForm, transactionType: e.target.value as "credit" | "debit" | "adjustment" })}>
                  <option value="credit">Increase points</option>
                  <option value="debit">Decrease points</option>
                  <option value="adjustment">Set exact balance</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Points</label>
                <div className="flex max-w-xs overflow-hidden rounded-md border bg-white">
                  <button type="button" className="flex h-11 w-14 items-center justify-center border-r text-slate-500 hover:bg-slate-50" onClick={() => setPointForm({ ...pointForm, credits: String(Math.max(0, Number(pointForm.credits || 0) - 1)) })}><Minus className="h-4 w-4" /></button>
                  <Input className="h-11 rounded-none border-0 text-center focus-visible:ring-0" type="number" min="0" value={pointForm.credits} onChange={(e) => setPointForm({ ...pointForm, credits: e.target.value })} />
                  <button type="button" className="flex h-11 w-14 items-center justify-center border-l text-slate-500 hover:bg-slate-50" onClick={() => setPointForm({ ...pointForm, credits: String(Number(pointForm.credits || 0) + 1) })}><Plus className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700"><span className="text-red-500">*</span> Reason</label>
                <Textarea rows={4} maxLength={500} value={pointForm.note} onChange={(e) => setPointForm({ ...pointForm, note: e.target.value })} />
                <p className="text-right text-xs text-slate-400">{pointForm.note.length}/500</p>
              </div>
              <div className="flex justify-end gap-3 border-t pt-4">
                <Button variant="outline" onClick={() => setShowAdjustPoints(false)}>Cancel</Button>
                <Button disabled={!pointForm.credits || Number(pointForm.credits) <= 0 || !pointForm.note.trim() || updatePoints.isPending} onClick={() => updatePoints.mutate()}>
                  {updatePoints.isPending ? "Applying..." : "Apply"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === "client" ? "client" : "workspace"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong>. Related white-label records will be cleaned up, and protected records may block deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteEntity.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" disabled={deleteEntity.isPending} onClick={(event) => { event.preventDefault(); if (deleteTarget) deleteEntity.mutate(deleteTarget); }}>
              {deleteEntity.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function InputField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="space-y-2 text-sm font-semibold text-slate-700"><span>{label}</span><Input type={type} value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4"><span className="text-sm font-semibold text-slate-700">{label}</span><Switch checked={checked} onCheckedChange={onChange} /></div>;
}

function FeatureList({ title, features, selected, setSelected }: { title: string; features: FeatureRow[]; selected: string[]; setSelected: (value: string[]) => void }) {
  const toggle = (key: string) => {
    setSelected(selected.includes(key) ? selected.filter((item) => item !== key) : [...selected, key]);
  };
  return (
    <div className="h-[430px] rounded-lg border bg-white">
      <div className="flex items-center justify-between border-b p-3">
        <p className="text-sm font-semibold">{title}</p>
        <span className="text-xs text-slate-500">{features.length}</span>
      </div>
      <div className="h-[380px] overflow-y-auto p-3">
        {features.map((feature) => (
          <label key={feature.key} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-slate-50">
            <input type="checkbox" checked={selected.includes(feature.key)} onChange={() => toggle(feature.key)} />
            <span className="font-medium">{feature.label}</span>
            <span className="ml-auto text-xs text-slate-400">{feature.group}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function CreditLedger({ credits }: { credits: CreditRow[] }) {
  return (
    <TableCard title="Credit Ledger">
      <table className="w-full min-w-[780px] text-sm">
        <thead><tr className="border-b text-left text-slate-500"><th className="p-3">Client</th><th className="p-3">Type</th><th className="p-3">Credits</th><th className="p-3">Balance</th><th className="p-3">Reference</th><th className="p-3">Date</th></tr></thead>
        <tbody>{credits.map((c) => <tr key={c.id} className="border-b last:border-0"><td className="p-3">{c.client_email}<div className="text-xs text-slate-500">{c.workspace_name || "Client balance"}</div></td><td className="p-3"><StatusPill value={c.transaction_type} /></td><td className="p-3">{formatNumber(c.credits)}</td><td className="p-3">{formatNumber(c.balance_after)}</td><td className="p-3">{c.reference || "-"}</td><td className="p-3">{new Date(c.created_at).toLocaleString()}</td></tr>)}</tbody>
      </table>
    </TableCard>
  );
}

function PartnerPanel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <h3 className="font-bold text-slate-950">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function ChoiceCard({ title, description, active, onClick }: { title: string; description: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-lg border p-4 text-left transition ${active ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-slate-900">{title}</p>
        {active && <span className="h-2 w-2 rounded-full bg-emerald-600" />}
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </button>
  );
}

function SearchBar({ value, onChange, exportUrl }: { value: string; onChange: (value: string) => void; exportUrl: string }) {
  return <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"><div className="relative w-full md:max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" placeholder="Search by name, email, phone..." value={value} onChange={(e) => onChange(e.target.value)} /></div><Button variant="outline" onClick={() => { window.location.href = exportUrl; }}><Download className="mr-2 h-4 w-4" /> Export Excel</Button></div>;
}

function TableCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent><div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-0">{children}</div></CardContent></Card>;
}
