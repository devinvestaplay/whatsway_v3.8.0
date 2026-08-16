import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CreditCard,
  Eye,
  FileText,
  Globe2,
  KeyRound,
  LogIn,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ZiinaCheckout from "@/components/payments/ZiinaCheckout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SuperadminRow = {
  id: string;
  username: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  status: string;
  createdAt?: string;
  clients: number;
  workspaces: number;
  domains: number;
  planName?: string | null;
  subscriptionStatus?: string | null;
  subscriptionEndDate?: string | null;
  clientLimit?: number | null;
  workspaceLimit?: number | null;
  domainLimit?: number | null;
  creditBalance?: string | number | null;
};

type DomainRow = {
  id: string;
  domain: string;
  status: string;
  sslStatus: string;
  verificationToken: string;
  notes?: string | null;
  blockedReason?: string | null;
  superadminStatus?: string;
};

type PartnerPlan = {
  id: string;
  planKey: string;
  name: string;
  description?: string | null;
  status: string;
  monthlyPrice: string | number;
  yearlyPrice: string | number;
  currency: string;
  clientLimit: number | null;
  workspaceLimit: number | null;
  domainLimit: number | null;
  includedCredits: string | number;
  trialDays: number;
  features: string[];
  displayOrder: number;
};

type BillingData = {
  superadmin: SuperadminRow;
  plans: PartnerPlan[];
  subscription: Record<string, any> | null;
  ledger: Array<Record<string, any>>;
  payments: Array<Record<string, any>>;
  invoices: Array<Record<string, any>>;
  dunningEvents: Array<Record<string, any>>;
  balance: string | number;
  usage: { clients: number; workspaces: number; domains: number };
};

type DetailData = {
  superadmin: SuperadminRow;
  clients: Array<Record<string, any>>;
  workspaces: Array<Record<string, any>>;
  subscriptions: Array<Record<string, any>>;
};

type AuditRow = {
  id: string;
  action_type: string;
  target_type: string;
  target_id?: string;
  actor_email?: string;
  actor_role?: string;
  updated_values?: Record<string, unknown>;
  created_at: string;
};

const emptySuperadmin = {
  username: "",
  password: "",
  email: "",
  firstName: "",
  lastName: "",
};

const emptyPlan = {
  name: "",
  description: "",
  status: "active",
  monthlyPrice: "0",
  yearlyPrice: "0",
  currency: "USD",
  clientLimit: "",
  workspaceLimit: "",
  domainLimit: "",
  includedCredits: "0",
  trialDays: "0",
  features: "",
  displayOrder: "0",
};

const emptySubscription = {
  planId: "",
  status: "active",
  billingCycle: "monthly",
  startDate: "",
  endDate: "",
  autoRenew: false,
  clientLimit: "",
  workspaceLimit: "",
  domainLimit: "",
  includedCredits: "",
  price: "",
  currency: "USD",
  notes: "",
  grantIncludedCredits: false,
};

const emptyCredit = {
  transactionType: "credit",
  credits: "",
  reference: "manual",
  note: "",
};

function displayName(row?: Pick<SuperadminRow, "firstName" | "lastName" | "username"> | null) {
  if (!row) return "";
  return [row.firstName, row.lastName].filter(Boolean).join(" ") || row.username;
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : "-";
}

function formatDateInput(value?: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function formatMoney(amount?: string | number | null, currency = "USD") {
  const value = Number(amount || 0);
  return `${currency} ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function limitText(used: number, limit?: number | null) {
  return limit == null ? `${used} / unlimited` : `${used} / ${limit}`;
}

function StatusPill({ value }: { value?: string | null }) {
  const active = value === "active" || value === "trialing";
  const danger = value === "inactive" || value === "deleted" || value === "expired" || value === "cancelled";
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${active ? "bg-emerald-100 text-emerald-700" : danger ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>
      {value || "not assigned"}
    </span>
  );
}

function UsageBar({ used, limit }: { used: number; limit?: number | null }) {
  const percent = limit ? Math.min(100, Math.round((used / Math.max(limit, 1)) * 100)) : 0;
  return (
    <div>
      <div className="text-sm font-semibold text-slate-700">{limitText(used, limit)}</div>
      <div className="mt-2 h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-emerald-600" style={{ width: limit ? `${percent}%` : "12%" }} />
      </div>
    </div>
  );
}

export default function PlatformAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [domainOpen, setDomainOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [manageTab, setManageTab] = useState("overview");
  const [selectedSuperadmin, setSelectedSuperadmin] = useState<SuperadminRow | null>(null);
  const [superadminDraft, setSuperadminDraft] = useState(emptySuperadmin);
  const [editDraft, setEditDraft] = useState({ username: "", email: "", firstName: "", lastName: "" });
  const [passwordDraft, setPasswordDraft] = useState("");
  const [domainDraft, setDomainDraft] = useState({ domain: "", notes: "" });
  const [domainCheck, setDomainCheck] = useState<Record<string, any> | null>(null);
  const [planDraft, setPlanDraft] = useState(emptyPlan);
  const [subscriptionDraft, setSubscriptionDraft] = useState(emptySubscription);
  const [creditDraft, setCreditDraft] = useState(emptyCredit);
  const [ziinaCheckout, setZiinaCheckout] = useState<{ paymentId: string; embeddedUrl: string } | null>(null);

  const { data, isLoading, error: listError } = useQuery<{ success: boolean; data: SuperadminRow[] }>({
    queryKey: ["/api/platform/superadmins"],
  });

  const { data: plansData } = useQuery<{ success: boolean; data: PartnerPlan[] }>({
    queryKey: ["/api/platform/plans"],
  });

  const { data: domainData } = useQuery<{ success: boolean; data: DomainRow[] }>({
    queryKey: ["/api/platform/superadmins", selectedSuperadmin?.id, "domains"],
    queryFn: async () => {
      const res = await fetch(`/api/platform/superadmins/${selectedSuperadmin?.id}/domains`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load domains");
      return res.json();
    },
    enabled: !!selectedSuperadmin?.id && domainOpen,
  });

  const { data: detailsData } = useQuery<{ success: boolean; data: DetailData }>({
    queryKey: ["/api/platform/superadmins", selectedSuperadmin?.id, "details"],
    enabled: !!selectedSuperadmin?.id && manageOpen,
  });

  const { data: billingData } = useQuery<{ success: boolean; data: BillingData }>({
    queryKey: ["/api/platform/superadmins", selectedSuperadmin?.id, "billing"],
    enabled: !!selectedSuperadmin?.id && manageOpen,
  });

  const { data: auditData } = useQuery<{ success: boolean; data: AuditRow[] }>({
    queryKey: ["/api/platform/audit-logs"],
    enabled: auditOpen,
  });

  const plans = plansData?.data || billingData?.data.plans || [];
  const superadmins = data?.data || [];
  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === subscriptionDraft.planId),
    [plans, subscriptionDraft.planId]
  );

  useEffect(() => {
    if (!selectedSuperadmin) return;
    setEditDraft({
      username: selectedSuperadmin.username || "",
      email: selectedSuperadmin.email || "",
      firstName: selectedSuperadmin.firstName || "",
      lastName: selectedSuperadmin.lastName || "",
    });
  }, [selectedSuperadmin]);

  useEffect(() => {
    const billing = billingData?.data;
    if (!billing) return;
    const subscription = billing.subscription;
    const fallbackPlan = billing.plans.find((plan) => plan.status === "active") || billing.plans[0];
    setSubscriptionDraft({
      planId: subscription?.planId || fallbackPlan?.id || "",
      status: subscription?.status || "active",
      billingCycle: subscription?.billingCycle || "monthly",
      startDate: formatDateInput(subscription?.startDate),
      endDate: formatDateInput(subscription?.endDate),
      autoRenew: Boolean(subscription?.autoRenew),
      clientLimit: subscription?.clientLimit == null ? fallbackPlan?.clientLimit?.toString() || "" : String(subscription.clientLimit),
      workspaceLimit: subscription?.workspaceLimit == null ? fallbackPlan?.workspaceLimit?.toString() || "" : String(subscription.workspaceLimit),
      domainLimit: subscription?.domainLimit == null ? fallbackPlan?.domainLimit?.toString() || "" : String(subscription.domainLimit),
      includedCredits: subscription?.includedCredits == null ? String(fallbackPlan?.includedCredits ?? 0) : String(subscription.includedCredits),
      price: subscription?.price == null ? "" : String(subscription.price),
      currency: subscription?.currency || fallbackPlan?.currency || "USD",
      notes: subscription?.notes || "",
      grantIncludedCredits: false,
    });
  }, [billingData]);

  useEffect(() => {
    if (!selectedPlan) return;
    setSubscriptionDraft((draft) => ({
      ...draft,
      currency: selectedPlan.currency || draft.currency,
      clientLimit: selectedPlan.clientLimit == null ? "" : String(selectedPlan.clientLimit),
      workspaceLimit: selectedPlan.workspaceLimit == null ? "" : String(selectedPlan.workspaceLimit),
      domainLimit: selectedPlan.domainLimit == null ? "" : String(selectedPlan.domainLimit),
      includedCredits: String(selectedPlan.includedCredits ?? 0),
      price: draft.billingCycle === "yearly" ? String(selectedPlan.yearlyPrice ?? 0) : String(selectedPlan.monthlyPrice ?? 0),
    }));
  }, [selectedPlan?.id]);

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/platform/superadmins"] });
    queryClient.invalidateQueries({ queryKey: ["/api/platform/plans"] });
    queryClient.invalidateQueries({ queryKey: ["/api/platform/audit-logs"] });
    if (selectedSuperadmin?.id) {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/superadmins", selectedSuperadmin.id, "domains"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/superadmins", selectedSuperadmin.id, "details"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/superadmins", selectedSuperadmin.id, "billing"] });
    }
  };

  const createSuperadmin = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/platform/superadmins", superadminDraft)).json(),
    onSuccess: () => {
      toast({ title: "Superadmin created", description: "Assign a partner subscription before handing over the account." });
      setCreateOpen(false);
      setSuperadminDraft(emptySuperadmin);
      refreshAll();
    },
    onError: (error: Error) => toast({ title: "Superadmin not created", description: error.message, variant: "destructive" }),
  });

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!selectedSuperadmin) throw new Error("Select a superadmin first");
      return (await apiRequest("PATCH", `/api/platform/superadmins/${selectedSuperadmin.id}`, editDraft)).json();
    },
    onSuccess: () => {
      toast({ title: "Superadmin updated" });
      setEditOpen(false);
      refreshAll();
    },
    onError: (error: Error) => toast({ title: "Profile not updated", description: error.message, variant: "destructive" }),
  });

  const resetPassword = useMutation({
    mutationFn: async () => {
      if (!selectedSuperadmin) throw new Error("Select a superadmin first");
      return (await apiRequest("PATCH", `/api/platform/superadmins/${selectedSuperadmin.id}/password`, { password: passwordDraft })).json();
    },
    onSuccess: () => {
      toast({ title: "Password reset" });
      setPasswordOpen(false);
      setPasswordDraft("");
      refreshAll();
    },
    onError: (error: Error) => toast({ title: "Password not reset", description: error.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => (await apiRequest("PATCH", `/api/platform/superadmins/${id}/status`, { status })).json(),
    onSuccess: refreshAll,
    onError: (error: Error) => toast({ title: "Status not updated", description: error.message, variant: "destructive" }),
  });

  const deleteSuperadmin = useMutation({
    mutationFn: async (id: string) => (await apiRequest("DELETE", `/api/platform/superadmins/${id}`)).json(),
    onSuccess: () => {
      toast({ title: "Superadmin deleted", description: "Login and partner domains are disabled. Audit history is preserved." });
      refreshAll();
    },
    onError: (error: Error) => toast({ title: "Superadmin not deleted", description: error.message, variant: "destructive" }),
  });

  const impersonateSuperadmin = useMutation({
    mutationFn: async (id: string) => (await apiRequest("POST", `/api/platform/superadmins/${id}/impersonate`)).json(),
    onSuccess: (result) => {
      window.location.href = result.redirectTo || "/dashboard";
    },
    onError: (error: Error) => toast({ title: "Impersonation failed", description: error.message, variant: "destructive" }),
  });

  const savePlan = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/platform/plans", {
      name: planDraft.name,
      description: planDraft.description,
      status: planDraft.status,
      monthlyPrice: Number(planDraft.monthlyPrice || 0),
      yearlyPrice: Number(planDraft.yearlyPrice || 0),
      currency: planDraft.currency,
      clientLimit: planDraft.clientLimit === "" ? null : Number(planDraft.clientLimit),
      workspaceLimit: planDraft.workspaceLimit === "" ? null : Number(planDraft.workspaceLimit),
      domainLimit: planDraft.domainLimit === "" ? null : Number(planDraft.domainLimit),
      includedCredits: Number(planDraft.includedCredits || 0),
      trialDays: Number(planDraft.trialDays || 0),
      features: planDraft.features.split("\n").map((feature) => feature.trim()).filter(Boolean),
      displayOrder: Number(planDraft.displayOrder || 0),
    })).json(),
    onSuccess: () => {
      toast({ title: "Platform plan saved" });
      setPlanDraft(emptyPlan);
      refreshAll();
    },
    onError: (error: Error) => toast({ title: "Plan not saved", description: error.message, variant: "destructive" }),
  });

  const saveSubscription = useMutation({
    mutationFn: async () => {
      if (!selectedSuperadmin) throw new Error("Select a superadmin first");
      return (await apiRequest("PATCH", `/api/platform/superadmins/${selectedSuperadmin.id}/subscription`, {
        planId: subscriptionDraft.planId,
        status: subscriptionDraft.status,
        billingCycle: subscriptionDraft.billingCycle,
        startDate: subscriptionDraft.startDate || null,
        endDate: subscriptionDraft.endDate || null,
        autoRenew: subscriptionDraft.autoRenew,
        clientLimit: subscriptionDraft.clientLimit === "" ? null : Number(subscriptionDraft.clientLimit),
        workspaceLimit: subscriptionDraft.workspaceLimit === "" ? null : Number(subscriptionDraft.workspaceLimit),
        domainLimit: subscriptionDraft.domainLimit === "" ? null : Number(subscriptionDraft.domainLimit),
        includedCredits: Number(subscriptionDraft.includedCredits || 0),
        price: Number(subscriptionDraft.price || 0),
        currency: subscriptionDraft.currency,
        notes: subscriptionDraft.notes,
        grantIncludedCredits: subscriptionDraft.grantIncludedCredits,
      })).json();
    },
    onSuccess: () => {
      toast({ title: "Partner subscription saved" });
      refreshAll();
    },
    onError: (error: Error) => toast({ title: "Subscription not saved", description: error.message, variant: "destructive" }),
  });

  const createZiinaCheckout = useMutation({
    mutationFn: async () => {
      if (!selectedSuperadmin) throw new Error("Select a superadmin first");
      if (subscriptionDraft.billingCycle === "manual") throw new Error("Ziina checkout supports monthly or yearly plans only");
      const response = await apiRequest("POST", `/api/platform/superadmins/${selectedSuperadmin.id}/ziina-checkout`, {
        planId: subscriptionDraft.planId,
        billingCycle: subscriptionDraft.billingCycle,
        currency: subscriptionDraft.currency || "AED",
        startDate: subscriptionDraft.startDate || null,
        endDate: subscriptionDraft.endDate || null,
        autoRenew: subscriptionDraft.autoRenew,
        clientLimit: subscriptionDraft.clientLimit === "" ? null : Number(subscriptionDraft.clientLimit),
        workspaceLimit: subscriptionDraft.workspaceLimit === "" ? null : Number(subscriptionDraft.workspaceLimit),
        domainLimit: subscriptionDraft.domainLimit === "" ? null : Number(subscriptionDraft.domainLimit),
        includedCredits: Number(subscriptionDraft.includedCredits || 0),
        notes: subscriptionDraft.notes,
        grantIncludedCredits: subscriptionDraft.grantIncludedCredits,
      });
      return response.json();
    },
    onSuccess: (result) => {
      const checkout = result.data;
      if (!checkout?.embeddedUrl && !checkout?.redirectUrl) {
        toast({ title: "Ziina checkout not available", description: "Ziina did not return a checkout URL.", variant: "destructive" });
        return;
      }
      setZiinaCheckout({ paymentId: checkout.paymentId, embeddedUrl: checkout.embeddedUrl || checkout.redirectUrl });
      toast({ title: "Ziina checkout created", description: "Complete payment to activate this partner subscription." });
      refreshAll();
    },
    onError: (error: Error) => toast({ title: "Ziina checkout failed", description: error.message, variant: "destructive" }),
  });

  const runRenewals = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/platform/billing/run-renewals")).json(),
    onSuccess: (result) => {
      const renewals = result.data?.renewals;
      const dunning = result.data?.dunning;
      toast({
        title: "Renewal check complete",
        description: `Renewals checked: ${renewals?.checked || 0}, reminders checked: ${dunning?.checked || 0}`,
      });
      refreshAll();
    },
    onError: (error: Error) => toast({ title: "Renewal check failed", description: error.message, variant: "destructive" }),
  });

  const adjustCredit = useMutation({
    mutationFn: async () => {
      if (!selectedSuperadmin) throw new Error("Select a superadmin first");
      return (await apiRequest("POST", `/api/platform/superadmins/${selectedSuperadmin.id}/credits`, {
        transactionType: creditDraft.transactionType,
        credits: Number(creditDraft.credits || 0),
        reference: creditDraft.reference,
        note: creditDraft.note,
      })).json();
    },
    onSuccess: () => {
      toast({ title: "Partner credits updated" });
      setCreditDraft(emptyCredit);
      refreshAll();
    },
    onError: (error: Error) => toast({ title: "Credits not updated", description: error.message, variant: "destructive" }),
  });

  const addDomain = useMutation({
    mutationFn: async () => {
      if (!selectedSuperadmin) throw new Error("Select a superadmin first");
      return (await apiRequest("POST", `/api/platform/superadmins/${selectedSuperadmin.id}/domains`, domainDraft)).json();
    },
    onSuccess: () => {
      toast({ title: "Domain added", description: "Add DNS, then run Check and mark active when ready." });
      setDomainDraft({ domain: "", notes: "" });
      setDomainCheck(null);
      refreshAll();
    },
    onError: (error: Error) => toast({ title: "Domain not added", description: error.message, variant: "destructive" }),
  });

  const updateDomainStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => (await apiRequest("PATCH", `/api/platform/domains/${id}/status`, { status })).json(),
    onSuccess: refreshAll,
    onError: (error: Error) => toast({ title: "Domain status not updated", description: error.message, variant: "destructive" }),
  });

  const checkDomain = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/platform/domains/${id}/check`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (result) => {
      setDomainCheck(result.data);
      queryClient.invalidateQueries({ queryKey: ["/api/platform/audit-logs"] });
    },
    onError: (error: Error) => toast({ title: "Domain check failed", description: error.message, variant: "destructive" }),
  });

  const openManage = (row: SuperadminRow, tab = "overview") => {
    setSelectedSuperadmin(row);
    setManageTab(tab);
    setZiinaCheckout(null);
    setManageOpen(true);
  };

  const openDomains = (row: SuperadminRow) => {
    setSelectedSuperadmin(row);
    setDomainCheck(null);
    setDomainOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-emerald-100 p-3 text-emerald-700">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">Platform Admin</p>
              <h1 className="text-3xl font-black text-slate-950">Partner Subscription Management</h1>
              <p className="mt-1 text-slate-600">Create superadmins, assign partner plans, manage limits, domains, credits, and audit actions.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setPlansOpen(true)}>
              <CreditCard className="h-4 w-4" />
              Plans
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setAuditOpen(true)}>
              <Eye className="h-4 w-4" />
              Audit
            </Button>
            <Button className="gap-2 bg-emerald-700 hover:bg-emerald-800" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New Superadmin
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Partner</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Credits</TableHead>
              <TableHead>Renewal</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listError ? (
              <TableRow><TableCell colSpan={7} className="text-red-600">Failed to load superadmins: {(listError as Error).message}</TableCell></TableRow>
            ) : isLoading ? (
              <TableRow><TableCell colSpan={7}>Loading...</TableCell></TableRow>
            ) : superadmins.length === 0 ? (
              <TableRow><TableCell colSpan={7}>No superadmins created yet.</TableCell></TableRow>
            ) : (
              superadmins.map((row) => (
                <TableRow key={row.id} className="align-top">
                  <TableCell className="min-w-64">
                    <div className="font-bold text-slate-950">{displayName(row)}</div>
                    <div className="text-sm text-slate-500">{row.email}</div>
                    <div className="mt-1 text-xs text-slate-400">{row.id}</div>
                    <div className="mt-2"><StatusPill value={row.status} /></div>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-slate-900">{row.planName || "No plan"}</div>
                    <div className="text-xs text-slate-500">Domains {limitText(row.domains || 0, row.domainLimit)}</div>
                  </TableCell>
                  <TableCell>
                    <StatusPill value={row.subscriptionStatus} />
                  </TableCell>
                  <TableCell className="min-w-48">
                    <div className="text-sm">Clients: {limitText(row.clients || 0, row.clientLimit)}</div>
                    <div className="text-sm">Workspaces: {limitText(row.workspaces || 0, row.workspaceLimit)}</div>
                  </TableCell>
                  <TableCell className="font-black text-slate-950">{Number(row.creditBalance || 0).toLocaleString()}</TableCell>
                  <TableCell>{formatDate(row.subscriptionEndDate)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button size="sm" className="gap-2 bg-emerald-700 hover:bg-emerald-800" onClick={() => openManage(row)}>
                        <SlidersHorizontal className="h-4 w-4" /> Manage
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2" disabled={row.status !== "active" || impersonateSuperadmin.isPending} onClick={() => impersonateSuperadmin.mutate(row.id)}>
                        <LogIn className="h-4 w-4" /> Impersonate
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => openDomains(row)}>
                        <Globe2 className="h-4 w-4" /> Domains
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => { setSelectedSuperadmin(row); setEditOpen(true); }}>
                        <Pencil className="h-4 w-4" /> Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => updateStatus.mutate({ id: row.id, status: row.status === "active" ? "inactive" : "active" })}>
                        {row.status === "active" ? "Inactivate" : "Activate"}
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => { setSelectedSuperadmin(row); setPasswordOpen(true); }}>
                        <KeyRound className="h-4 w-4" /> Password
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-red-600 hover:text-red-700"
                        onClick={() => {
                          if (window.confirm(`Delete ${displayName(row)}? This disables login and partner domains but keeps audit history.`)) {
                            deleteSuperadmin.mutate(row.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Superadmin</DialogTitle>
            <DialogDescription>This creates a clean partner profile. Assign a subscription from Manage after creation.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Input placeholder="First name" value={superadminDraft.firstName} onChange={(e) => setSuperadminDraft((d) => ({ ...d, firstName: e.target.value }))} />
            <Input placeholder="Last name" value={superadminDraft.lastName} onChange={(e) => setSuperadminDraft((d) => ({ ...d, lastName: e.target.value }))} />
            <Input placeholder="Email" value={superadminDraft.email} onChange={(e) => setSuperadminDraft((d) => ({ ...d, email: e.target.value }))} />
            <Input placeholder="Username" value={superadminDraft.username} onChange={(e) => setSuperadminDraft((d) => ({ ...d, username: e.target.value }))} />
            <Input placeholder="Temporary password" type="password" value={superadminDraft.password} onChange={(e) => setSuperadminDraft((d) => ({ ...d, password: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-700 hover:bg-emerald-800" disabled={createSuperadmin.isPending} onClick={() => createSuperadmin.mutate()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Superadmin</DialogTitle>
            <DialogDescription>Update partner profile identity and login username.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Input placeholder="First name" value={editDraft.firstName} onChange={(e) => setEditDraft((d) => ({ ...d, firstName: e.target.value }))} />
            <Input placeholder="Last name" value={editDraft.lastName} onChange={(e) => setEditDraft((d) => ({ ...d, lastName: e.target.value }))} />
            <Input placeholder="Email" value={editDraft.email} onChange={(e) => setEditDraft((d) => ({ ...d, email: e.target.value }))} />
            <Input placeholder="Username" value={editDraft.username} onChange={(e) => setEditDraft((d) => ({ ...d, username: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-700 hover:bg-emerald-800" disabled={updateProfile.isPending} onClick={() => updateProfile.mutate()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Set a new temporary password for {selectedSuperadmin?.email}.</DialogDescription>
          </DialogHeader>
          <Input placeholder="New password" type="password" value={passwordDraft} onChange={(e) => setPasswordDraft(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-700 hover:bg-emerald-800" disabled={resetPassword.isPending || passwordDraft.length < 8} onClick={() => resetPassword.mutate()}>Reset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-h-[88vh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Partner</DialogTitle>
            <DialogDescription>{selectedSuperadmin?.email}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-slate-50 p-2">
            {["overview", "subscription", "invoices", "credits", "clients", "workspaces"].map((tab) => (
              <Button key={tab} size="sm" variant={manageTab === tab ? "default" : "outline"} className={manageTab === tab ? "bg-emerald-700 hover:bg-emerald-800" : ""} onClick={() => setManageTab(tab)}>
                {tab[0].toUpperCase() + tab.slice(1)}
              </Button>
            ))}
            <Button size="sm" variant="outline" className="ml-auto gap-2" disabled={runRenewals.isPending} onClick={() => runRenewals.mutate()}>
              <RefreshCw className={`h-4 w-4 ${runRenewals.isPending ? "animate-spin" : ""}`} />
              Run renewals
            </Button>
          </div>

          {manageTab === "overview" && (
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-slate-500">Plan</div>
                  <div className="text-xl font-black">{billingData?.data.subscription?.planName || "No plan assigned"}</div>
                  <div className="mt-2"><StatusPill value={billingData?.data.subscription?.status} /></div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-slate-500">Credits</div>
                  <div className="text-2xl font-black">{Number(billingData?.data.balance || 0).toLocaleString()}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-slate-500">Renewal / End</div>
                  <div className="text-xl font-black">{formatDate(billingData?.data.subscription?.endDate)}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-slate-500">Price</div>
                  <div className="text-xl font-black">{formatMoney(billingData?.data.subscription?.price, billingData?.data.subscription?.currency || "USD")}</div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4"><div className="mb-3 font-bold">Clients</div><UsageBar used={billingData?.data.usage.clients || 0} limit={billingData?.data.subscription?.clientLimit} /></div>
                <div className="rounded-lg border p-4"><div className="mb-3 font-bold">Workspaces</div><UsageBar used={billingData?.data.usage.workspaces || 0} limit={billingData?.data.subscription?.workspaceLimit} /></div>
                <div className="rounded-lg border p-4"><div className="mb-3 font-bold">Domains</div><UsageBar used={billingData?.data.usage.domains || 0} limit={billingData?.data.subscription?.domainLimit} /></div>
              </div>
            </div>
          )}

          {manageTab === "subscription" && (
            ziinaCheckout ? (
              <ZiinaCheckout
                paymentId={ziinaCheckout.paymentId}
                embeddedUrl={ziinaCheckout.embeddedUrl}
                onBack={() => setZiinaCheckout(null)}
                onSuccess={() => {
                  toast({ title: "Ziina payment confirmed", description: "Partner subscription is active now." });
                  setZiinaCheckout(null);
                  refreshAll();
                }}
                onFailed={(message) => toast({ title: "Ziina payment not completed", description: message, variant: "destructive" })}
              />
            ) : (
            <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <div className="grid gap-3 rounded-lg border p-4">
                <h3 className="text-lg font-black">Assign Subscription</h3>
                <select className="rounded-md border px-3 py-2" value={subscriptionDraft.planId} onChange={(e) => setSubscriptionDraft((d) => ({ ...d, planId: e.target.value }))}>
                  <option value="">Select plan</option>
                  {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
                </select>
                <div className="grid gap-3 sm:grid-cols-3">
                  <select className="rounded-md border px-3 py-2" value={subscriptionDraft.status} onChange={(e) => setSubscriptionDraft((d) => ({ ...d, status: e.target.value }))}>
                    <option value="active">Active</option>
                    <option value="trialing">Trialing</option>
                    <option value="past_due">Past due</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="expired">Expired</option>
                  </select>
                  <select className="rounded-md border px-3 py-2" value={subscriptionDraft.billingCycle} onChange={(e) => setSubscriptionDraft((d) => ({ ...d, billingCycle: e.target.value }))}>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="manual">Manual</option>
                  </select>
                  <Input placeholder="Currency" value={subscriptionDraft.currency} onChange={(e) => setSubscriptionDraft((d) => ({ ...d, currency: e.target.value }))} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input type="date" value={subscriptionDraft.startDate} onChange={(e) => setSubscriptionDraft((d) => ({ ...d, startDate: e.target.value }))} />
                  <Input type="date" value={subscriptionDraft.endDate} onChange={(e) => setSubscriptionDraft((d) => ({ ...d, endDate: e.target.value }))} />
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <Input placeholder="Client limit" type="number" value={subscriptionDraft.clientLimit} onChange={(e) => setSubscriptionDraft((d) => ({ ...d, clientLimit: e.target.value }))} />
                  <Input placeholder="Workspace limit" type="number" value={subscriptionDraft.workspaceLimit} onChange={(e) => setSubscriptionDraft((d) => ({ ...d, workspaceLimit: e.target.value }))} />
                  <Input placeholder="Domain limit" type="number" value={subscriptionDraft.domainLimit} onChange={(e) => setSubscriptionDraft((d) => ({ ...d, domainLimit: e.target.value }))} />
                  <Input placeholder="Price" type="number" value={subscriptionDraft.price} onChange={(e) => setSubscriptionDraft((d) => ({ ...d, price: e.target.value }))} />
                </div>
                <Input placeholder="Included credits" type="number" value={subscriptionDraft.includedCredits} onChange={(e) => setSubscriptionDraft((d) => ({ ...d, includedCredits: e.target.value }))} />
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={subscriptionDraft.autoRenew} onChange={(e) => setSubscriptionDraft((d) => ({ ...d, autoRenew: e.target.checked }))} />
                  Auto renew
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={subscriptionDraft.grantIncludedCredits} onChange={(e) => setSubscriptionDraft((d) => ({ ...d, grantIncludedCredits: e.target.checked }))} />
                  Add included credits to partner balance when saving
                </label>
                <textarea className="min-h-24 rounded-md border px-3 py-2 text-sm" placeholder="Internal notes" value={subscriptionDraft.notes} onChange={(e) => setSubscriptionDraft((d) => ({ ...d, notes: e.target.value }))} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button className="bg-emerald-700 hover:bg-emerald-800" disabled={!subscriptionDraft.planId || saveSubscription.isPending} onClick={() => saveSubscription.mutate()}>
                    Save Manual Subscription
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    disabled={!subscriptionDraft.planId || subscriptionDraft.billingCycle === "manual" || createZiinaCheckout.isPending}
                    onClick={() => createZiinaCheckout.mutate()}
                  >
                    <CreditCard className="h-4 w-4" />
                    Ziina Checkout
                  </Button>
                </div>
                <p className="text-xs text-slate-500">Manual save applies immediately. Ziina checkout activates only after payment confirmation.</p>
              </div>
              <div className="rounded-lg border p-4">
                <h3 className="text-lg font-black">Available Plans</h3>
                <div className="mt-4 grid gap-3">
                  {plans.map((plan) => (
                    <div key={plan.id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-black">{plan.name}</div>
                        <StatusPill value={plan.status} />
                      </div>
                      <div className="mt-2 text-sm text-slate-600">{plan.description}</div>
                      <div className="mt-3 text-sm font-semibold">{formatMoney(plan.monthlyPrice, plan.currency)} / month</div>
                      <div className="text-xs text-slate-500">Clients {plan.clientLimit ?? "unlimited"} | Workspaces {plan.workspaceLimit ?? "unlimited"} | Credits {plan.includedCredits}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 border-t pt-4">
                  <h3 className="text-lg font-black">Ziina Payment History</h3>
                  <div className="mt-3 grid gap-2">
                    {(billingData?.data.payments || []).map((payment) => (
                      <div key={payment.id} className="rounded-md border p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-bold">{formatMoney(payment.amount, payment.currency)}</div>
                          <StatusPill value={payment.status} />
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {payment.billingCycle} | {new Date(payment.createdAt).toLocaleString()}
                        </div>
                        {payment.failureMessage && <div className="mt-1 text-xs font-semibold text-red-600">{payment.failureMessage}</div>}
                      </div>
                    ))}
                    {!(billingData?.data.payments || []).length && <div className="text-sm text-slate-500">No Ziina partner payments yet.</div>}
                  </div>
                </div>
              </div>
            </div>
            )
          )}

          {manageTab === "credits" && (
            <div className="grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
              <div className="rounded-lg border p-4">
                <h3 className="text-lg font-black">Adjust Credits</h3>
                <div className="mt-4 grid gap-3">
                  <select className="rounded-md border px-3 py-2" value={creditDraft.transactionType} onChange={(e) => setCreditDraft((d) => ({ ...d, transactionType: e.target.value }))}>
                    <option value="credit">Credit</option>
                    <option value="debit">Debit</option>
                    <option value="adjustment">Set balance</option>
                  </select>
                  <Input placeholder="Credits" type="number" value={creditDraft.credits} onChange={(e) => setCreditDraft((d) => ({ ...d, credits: e.target.value }))} />
                  <Input placeholder="Reference" value={creditDraft.reference} onChange={(e) => setCreditDraft((d) => ({ ...d, reference: e.target.value }))} />
                  <textarea className="min-h-24 rounded-md border px-3 py-2 text-sm" placeholder="Note" value={creditDraft.note} onChange={(e) => setCreditDraft((d) => ({ ...d, note: e.target.value }))} />
                  <Button className="bg-emerald-700 hover:bg-emerald-800" disabled={!Number(creditDraft.credits) || adjustCredit.isPending} onClick={() => adjustCredit.mutate()}>
                    Apply Credits
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <h3 className="text-lg font-black">Credit Ledger</h3>
                <Table>
                  <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Credits</TableHead><TableHead>Balance</TableHead><TableHead>Reference</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(billingData?.data.ledger || []).map((row) => (
                      <TableRow key={row.id}>
                        <TableCell><StatusPill value={row.transactionType} /></TableCell>
                        <TableCell>{row.credits}</TableCell>
                        <TableCell>{row.balanceAfter}</TableCell>
                        <TableCell>{row.reference || "-"}</TableCell>
                        <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {!(billingData?.data.ledger || []).length && <TableRow><TableCell colSpan={5}>No platform credit transactions yet.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {manageTab === "invoices" && (
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-lg font-black">Invoices</h3>
                  <Button size="sm" variant="outline" className="gap-2" disabled={runRenewals.isPending} onClick={() => runRenewals.mutate()}>
                    <RefreshCw className={`h-4 w-4 ${runRenewals.isPending ? "animate-spin" : ""}`} />
                    Check now
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(billingData?.data.invoices || []).map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <div className="font-bold">{invoice.invoiceNumber}</div>
                          <div className="text-xs text-slate-500">{invoice.billingCycle}</div>
                        </TableCell>
                        <TableCell><StatusPill value={invoice.status} /></TableCell>
                        <TableCell>{formatMoney(invoice.amount, invoice.currency)}</TableCell>
                        <TableCell>{formatDate(invoice.dueAt)}</TableCell>
                        <TableCell>{formatDate(invoice.paidAt)}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" className="gap-2" onClick={() => window.open(`/api/platform/invoices/${invoice.id}/html`, "_blank")}>
                            <FileText className="h-4 w-4" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!(billingData?.data.invoices || []).length && <TableRow><TableCell colSpan={6}>No platform invoices yet.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="text-lg font-black">Renewal & Dunning Log</h3>
                <div className="mt-3 grid gap-2">
                  {(billingData?.data.dunningEvents || []).map((event) => (
                    <div key={event.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold">{event.eventType}</div>
                        <StatusPill value={event.status} />
                      </div>
                      {event.message && <div className="mt-1 text-xs text-slate-600">{event.message}</div>}
                      <div className="mt-1 text-xs text-slate-500">
                        {new Date(event.createdAt).toLocaleString()}
                        {event.nextRetryAt ? ` | next retry ${new Date(event.nextRetryAt).toLocaleString()}` : ""}
                      </div>
                    </div>
                  ))}
                  {!(billingData?.data.dunningEvents || []).length && <div className="text-sm text-slate-500">No renewal reminders yet.</div>}
                </div>
              </div>
            </div>
          )}

          {manageTab === "clients" && (
            <Table>
              <TableHeader><TableRow><TableHead>Client</TableHead><TableHead>Status</TableHead><TableHead>Workspaces</TableHead><TableHead>Credit</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
              <TableBody>
                {(detailsData?.data.clients || []).map((client) => (
                  <TableRow key={client.id}><TableCell><div className="font-bold">{client.first_name || client.username}</div><div className="text-xs text-slate-500">{client.email}</div></TableCell><TableCell><StatusPill value={client.status} /></TableCell><TableCell>{client.workspaces}</TableCell><TableCell>{client.credit_balance}</TableCell><TableCell>{formatDate(client.created_at)}</TableCell></TableRow>
                ))}
                {!(detailsData?.data.clients || []).length && <TableRow><TableCell colSpan={5}>No clients found.</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}

          {manageTab === "workspaces" && (
            <Table>
              <TableHeader><TableRow><TableHead>Workspace</TableHead><TableHead>Owner</TableHead><TableHead>Status</TableHead><TableHead>Type</TableHead><TableHead>Points</TableHead></TableRow></TableHeader>
              <TableBody>
                {(detailsData?.data.workspaces || []).map((workspace) => (
                  <TableRow key={workspace.id}><TableCell><div className="font-bold">{workspace.name}</div><div className="text-xs text-slate-500">{workspace.id}</div></TableCell><TableCell>{workspace.owner_email}</TableCell><TableCell><StatusPill value={workspace.is_active ? "active" : "inactive"} /></TableCell><TableCell>{workspace.white_label_workspace_type || "-"}</TableCell><TableCell>{workspace.white_label_points || 0}</TableCell></TableRow>
                ))}
                {!(detailsData?.data.workspaces || []).length && <TableRow><TableCell colSpan={5}>No workspaces found.</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={plansOpen} onOpenChange={setPlansOpen}>
        <DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Platform Partner Plans</DialogTitle>
            <DialogDescription>Plans used by Platform Admin to sell and limit superadmin partner accounts.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
            <div className="rounded-lg border p-4">
              <h3 className="text-lg font-black">Add / Update Plan</h3>
              <div className="mt-4 grid gap-3">
                <Input placeholder="Plan name" value={planDraft.name} onChange={(e) => setPlanDraft((d) => ({ ...d, name: e.target.value }))} />
                <textarea className="min-h-20 rounded-md border px-3 py-2 text-sm" placeholder="Description" value={planDraft.description} onChange={(e) => setPlanDraft((d) => ({ ...d, description: e.target.value }))} />
                <select className="rounded-md border px-3 py-2" value={planDraft.status} onChange={(e) => setPlanDraft((d) => ({ ...d, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input placeholder="Monthly price" type="number" value={planDraft.monthlyPrice} onChange={(e) => setPlanDraft((d) => ({ ...d, monthlyPrice: e.target.value }))} />
                  <Input placeholder="Yearly price" type="number" value={planDraft.yearlyPrice} onChange={(e) => setPlanDraft((d) => ({ ...d, yearlyPrice: e.target.value }))} />
                  <Input placeholder="Currency" value={planDraft.currency} onChange={(e) => setPlanDraft((d) => ({ ...d, currency: e.target.value }))} />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input placeholder="Client limit" type="number" value={planDraft.clientLimit} onChange={(e) => setPlanDraft((d) => ({ ...d, clientLimit: e.target.value }))} />
                  <Input placeholder="Workspace limit" type="number" value={planDraft.workspaceLimit} onChange={(e) => setPlanDraft((d) => ({ ...d, workspaceLimit: e.target.value }))} />
                  <Input placeholder="Domain limit" type="number" value={planDraft.domainLimit} onChange={(e) => setPlanDraft((d) => ({ ...d, domainLimit: e.target.value }))} />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input placeholder="Included credits" type="number" value={planDraft.includedCredits} onChange={(e) => setPlanDraft((d) => ({ ...d, includedCredits: e.target.value }))} />
                  <Input placeholder="Trial days" type="number" value={planDraft.trialDays} onChange={(e) => setPlanDraft((d) => ({ ...d, trialDays: e.target.value }))} />
                  <Input placeholder="Display order" type="number" value={planDraft.displayOrder} onChange={(e) => setPlanDraft((d) => ({ ...d, displayOrder: e.target.value }))} />
                </div>
                <textarea className="min-h-24 rounded-md border px-3 py-2 text-sm" placeholder="Features, one per line" value={planDraft.features} onChange={(e) => setPlanDraft((d) => ({ ...d, features: e.target.value }))} />
                <Button className="bg-emerald-700 hover:bg-emerald-800" disabled={!planDraft.name || savePlan.isPending} onClick={() => savePlan.mutate()}>Save Plan</Button>
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="text-lg font-black">Plan Library</h3>
              <div className="mt-4 grid gap-3">
                {plans.map((plan) => (
                  <div key={plan.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-black">{plan.name}</div>
                        <div className="text-sm text-slate-600">{plan.description}</div>
                      </div>
                      <StatusPill value={plan.status} />
                    </div>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                      <div>{formatMoney(plan.monthlyPrice, plan.currency)} / month</div>
                      <div>{formatMoney(plan.yearlyPrice, plan.currency)} / year</div>
                      <div>{Number(plan.includedCredits || 0).toLocaleString()} credits</div>
                      <div>Clients {plan.clientLimit ?? "unlimited"}</div>
                      <div>Workspaces {plan.workspaceLimit ?? "unlimited"}</div>
                      <div>Domains {plan.domainLimit ?? "unlimited"}</div>
                    </div>
                  </div>
                ))}
                {!plans.length && <div className="text-slate-500">No platform plans found.</div>}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={domainOpen} onOpenChange={setDomainOpen}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Partner Domains</DialogTitle>
            <DialogDescription>{selectedSuperadmin?.email}. Add DNS, check resolution, then mark active.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 rounded-lg border p-4">
            <div className="flex items-center gap-2 font-bold"><Building2 className="h-4 w-4 text-emerald-700" />Add domain</div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Input placeholder="app.partnerdomain.com" value={domainDraft.domain} onChange={(e) => setDomainDraft((d) => ({ ...d, domain: e.target.value }))} />
              <Button className="bg-emerald-700 hover:bg-emerald-800" disabled={addDomain.isPending} onClick={() => addDomain.mutate()}>Add Domain</Button>
            </div>
            <Input placeholder="Notes, DNS provider, owner contact..." value={domainDraft.notes} onChange={(e) => setDomainDraft((d) => ({ ...d, notes: e.target.value }))} />
          </div>

          {domainCheck && (
            <div className={`rounded-lg border p-4 text-sm ${domainCheck.allowed ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
              <div className="font-bold">{domainCheck.domain}</div>
              <div>DNS: {domainCheck.dnsOk ? (domainCheck.dns || []).join(", ") : domainCheck.dnsError || "not resolving"}</div>
              <div>Access: {domainCheck.allowed ? "Allowed" : domainCheck.blockedReason || "Blocked"}</div>
            </div>
          )}

          <Table>
            <TableHeader><TableRow><TableHead>Domain</TableHead><TableHead>Status</TableHead><TableHead>DNS Verification</TableHead><TableHead>Blocked Reason</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {(domainData?.data || []).length === 0 ? (
                <TableRow><TableCell colSpan={5}>No domains added.</TableCell></TableRow>
              ) : (
                (domainData?.data || []).map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell className="font-bold">{domain.domain}</TableCell>
                    <TableCell><StatusPill value={domain.status} /> <span className="ml-2 text-xs text-slate-500">SSL {domain.sslStatus}</span></TableCell>
                    <TableCell><code className="rounded bg-slate-100 px-2 py-1 text-xs">TXT {domain.verificationToken}</code></TableCell>
                    <TableCell className={domain.blockedReason ? "font-semibold text-red-600" : "text-slate-500"}>{domain.blockedReason || "Not blocked"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => checkDomain.mutate(domain.id)}><RefreshCw className="h-4 w-4" />Check</Button>
                        <Button variant="outline" size="sm" onClick={() => updateDomainStatus.mutate({ id: domain.id, status: domain.status === "active" ? "inactive" : "active" })}>{domain.status === "active" ? "Inactivate" : "Mark Active"}</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
        <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Platform Audit Logs</DialogTitle>
            <DialogDescription>Recent platform admin actions, billing changes, domain checks, and impersonation activity.</DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader><TableRow><TableHead>Action</TableHead><TableHead>Actor</TableHead><TableHead>Target</TableHead><TableHead>Values</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
            <TableBody>
              {(auditData?.data || []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-bold">{row.action_type}</TableCell>
                  <TableCell>{row.actor_email || "System"}<div className="text-xs text-slate-500">{row.actor_role || ""}</div></TableCell>
                  <TableCell>{row.target_type}<div className="text-xs text-slate-500">{row.target_id}</div></TableCell>
                  <TableCell className="max-w-xs truncate text-xs">{row.updated_values ? JSON.stringify(row.updated_values) : "-"}</TableCell>
                  <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {!(auditData?.data || []).length && <TableRow><TableCell colSpan={5}>No audit logs found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
