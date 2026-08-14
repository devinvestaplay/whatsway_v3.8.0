import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Eye,
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

type DetailData = {
  superadmin: SuperadminRow;
  controls: ControlsRow | null;
  clients: Array<Record<string, any>>;
  workspaces: Array<Record<string, any>>;
  subscriptions: Array<Record<string, any>>;
};

type ControlsRow = {
  planName: string;
  clientLimit: number | null;
  workspaceLimit: number | null;
  creditBalance: string | number;
  notes?: string | null;
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

const emptyControls = {
  planName: "Starter Partner",
  clientLimit: "",
  workspaceLimit: "",
  creditBalance: "0",
  notes: "",
};

function displayName(row?: Pick<SuperadminRow, "firstName" | "lastName" | "username"> | null) {
  if (!row) return "";
  return [row.firstName, row.lastName].filter(Boolean).join(" ") || row.username;
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : "-";
}

function StatusPill({ value }: { value?: string | null }) {
  const active = value === "active";
  const danger = value === "inactive" || value === "deleted";
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${active ? "bg-emerald-100 text-emerald-700" : danger ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>
      {value || "-"}
    </span>
  );
}

export default function PlatformAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [domainOpen, setDomainOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [selectedSuperadmin, setSelectedSuperadmin] = useState<SuperadminRow | null>(null);
  const [superadminDraft, setSuperadminDraft] = useState(emptySuperadmin);
  const [editDraft, setEditDraft] = useState({ username: "", email: "", firstName: "", lastName: "" });
  const [passwordDraft, setPasswordDraft] = useState("");
  const [domainDraft, setDomainDraft] = useState({ domain: "", notes: "" });
  const [controlsDraft, setControlsDraft] = useState(emptyControls);
  const [domainCheck, setDomainCheck] = useState<Record<string, any> | null>(null);

  const { data, isLoading, error: listError } = useQuery<{ success: boolean; data: SuperadminRow[] }>({
    queryKey: ["/api/platform/superadmins"],
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
    enabled: !!selectedSuperadmin?.id && detailsOpen,
  });

  const { data: controlsData } = useQuery<{ success: boolean; data: ControlsRow }>({
    queryKey: ["/api/platform/superadmins", selectedSuperadmin?.id, "controls"],
    enabled: !!selectedSuperadmin?.id && controlsOpen,
  });

  const { data: auditData } = useQuery<{ success: boolean; data: AuditRow[] }>({
    queryKey: ["/api/platform/audit-logs"],
    enabled: auditOpen,
  });

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
    if (!controlsData?.data) return;
    setControlsDraft({
      planName: controlsData.data.planName || "Starter Partner",
      clientLimit: controlsData.data.clientLimit == null ? "" : String(controlsData.data.clientLimit),
      workspaceLimit: controlsData.data.workspaceLimit == null ? "" : String(controlsData.data.workspaceLimit),
      creditBalance: String(controlsData.data.creditBalance ?? 0),
      notes: controlsData.data.notes || "",
    });
  }, [controlsData]);

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/platform/superadmins"] });
    queryClient.invalidateQueries({ queryKey: ["/api/platform/audit-logs"] });
    if (selectedSuperadmin?.id) {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/superadmins", selectedSuperadmin.id, "domains"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/superadmins", selectedSuperadmin.id, "details"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/superadmins", selectedSuperadmin.id, "controls"] });
    }
  };

  const createSuperadmin = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/platform/superadmins", superadminDraft)).json(),
    onSuccess: () => {
      toast({ title: "Superadmin created", description: "Partner profile is ready to use." });
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
      toast({ title: "Password reset", description: "Share the new password with the partner securely." });
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
      toast({ title: "Superadmin deleted", description: "The partner login and domains are disabled. Audit history is preserved." });
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

  const updateControls = useMutation({
    mutationFn: async () => {
      if (!selectedSuperadmin) throw new Error("Select a superadmin first");
      return (await apiRequest("PATCH", `/api/platform/superadmins/${selectedSuperadmin.id}/controls`, {
        planName: controlsDraft.planName,
        clientLimit: controlsDraft.clientLimit === "" ? null : Number(controlsDraft.clientLimit),
        workspaceLimit: controlsDraft.workspaceLimit === "" ? null : Number(controlsDraft.workspaceLimit),
        creditBalance: Number(controlsDraft.creditBalance || 0),
        notes: controlsDraft.notes,
      })).json();
    },
    onSuccess: () => {
      toast({ title: "Partner controls saved" });
      setControlsOpen(false);
      refreshAll();
    },
    onError: (error: Error) => toast({ title: "Controls not saved", description: error.message, variant: "destructive" }),
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

  const superadmins = data?.data || [];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-emerald-100 p-3 text-emerald-700">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">Platform Admin</p>
              <h1 className="text-3xl font-black text-slate-950">Superadmin & Domain Management</h1>
              <p className="mt-1 text-slate-600">Create partner superadmins, assign domains, control access, and audit platform actions.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
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
              <TableHead>Superadmin</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Clients</TableHead>
              <TableHead>Workspaces</TableHead>
              <TableHead>Domains</TableHead>
              <TableHead>Created</TableHead>
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
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="font-bold text-slate-950">{displayName(row)}</div>
                    <div className="text-sm text-slate-500">{row.email}</div>
                    <div className="text-xs text-slate-400">{row.id}</div>
                  </TableCell>
                  <TableCell><StatusPill value={row.status} /></TableCell>
                  <TableCell>{row.clients || 0}</TableCell>
                  <TableCell>{row.workspaces || 0}</TableCell>
                  <TableCell>{row.domains || 0}</TableCell>
                  <TableCell>{formatDate(row.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => { setSelectedSuperadmin(row); setDetailsOpen(true); }}>
                        <Eye className="h-4 w-4" /> Details
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => { setSelectedSuperadmin(row); setEditOpen(true); }}>
                        <Pencil className="h-4 w-4" /> Edit
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => { setSelectedSuperadmin(row); setControlsOpen(true); }}>
                        <SlidersHorizontal className="h-4 w-4" /> Controls
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => { setSelectedSuperadmin(row); setDomainOpen(true); setDomainCheck(null); }}>
                        <Globe2 className="h-4 w-4" /> Domains
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2" disabled={row.status !== "active" || impersonateSuperadmin.isPending} onClick={() => impersonateSuperadmin.mutate(row.id)}>
                        <LogIn className="h-4 w-4" /> Impersonate
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => { setSelectedSuperadmin(row); setPasswordOpen(true); }}>
                        <KeyRound className="h-4 w-4" /> Password
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => updateStatus.mutate({ id: row.id, status: row.status === "active" ? "inactive" : "active" })}>
                        {row.status === "active" ? "Inactivate" : "Activate"}
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
            <DialogDescription>This creates a clean partner profile. Share these credentials with the partner after creation.</DialogDescription>
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

      <Dialog open={controlsOpen} onOpenChange={setControlsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Partner Controls</DialogTitle>
            <DialogDescription>Manage platform-owned plan, limits, and credit balance for {selectedSuperadmin?.email}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Input placeholder="Plan name" value={controlsDraft.planName} onChange={(e) => setControlsDraft((d) => ({ ...d, planName: e.target.value }))} />
            <Input placeholder="Client limit, blank for unlimited" type="number" value={controlsDraft.clientLimit} onChange={(e) => setControlsDraft((d) => ({ ...d, clientLimit: e.target.value }))} />
            <Input placeholder="Workspace limit, blank for unlimited" type="number" value={controlsDraft.workspaceLimit} onChange={(e) => setControlsDraft((d) => ({ ...d, workspaceLimit: e.target.value }))} />
            <Input placeholder="Credit balance" type="number" value={controlsDraft.creditBalance} onChange={(e) => setControlsDraft((d) => ({ ...d, creditBalance: e.target.value }))} />
            <textarea className="min-h-24 rounded-md border px-3 py-2 text-sm" placeholder="Internal notes" value={controlsDraft.notes} onChange={(e) => setControlsDraft((d) => ({ ...d, notes: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setControlsOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-700 hover:bg-emerald-800" disabled={updateControls.isPending} onClick={() => updateControls.mutate()}>Save Controls</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Superadmin Details</DialogTitle>
            <DialogDescription>{selectedSuperadmin?.email}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border p-4"><div className="text-sm text-slate-500">Clients</div><div className="text-2xl font-black">{detailsData?.data.clients.length ?? 0}</div></div>
            <div className="rounded-lg border p-4"><div className="text-sm text-slate-500">Workspaces</div><div className="text-2xl font-black">{detailsData?.data.workspaces.length ?? 0}</div></div>
            <div className="rounded-lg border p-4"><div className="text-sm text-slate-500">Plan</div><div className="text-lg font-black">{detailsData?.data.controls?.planName || "-"}</div></div>
            <div className="rounded-lg border p-4"><div className="text-sm text-slate-500">Credit</div><div className="text-lg font-black">{detailsData?.data.controls?.creditBalance ?? 0}</div></div>
          </div>

          <section>
            <h3 className="mb-2 mt-4 text-lg font-black">Clients</h3>
            <Table>
              <TableHeader><TableRow><TableHead>Client</TableHead><TableHead>Status</TableHead><TableHead>Workspaces</TableHead><TableHead>Credit</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
              <TableBody>
                {(detailsData?.data.clients || []).map((client) => (
                  <TableRow key={client.id}><TableCell><div className="font-bold">{client.first_name || client.username}</div><div className="text-xs text-slate-500">{client.email}</div></TableCell><TableCell><StatusPill value={client.status} /></TableCell><TableCell>{client.workspaces}</TableCell><TableCell>{client.credit_balance}</TableCell><TableCell>{formatDate(client.created_at)}</TableCell></TableRow>
                ))}
                {!(detailsData?.data.clients || []).length && <TableRow><TableCell colSpan={5}>No clients found.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </section>

          <section>
            <h3 className="mb-2 mt-4 text-lg font-black">Workspaces</h3>
            <Table>
              <TableHeader><TableRow><TableHead>Workspace</TableHead><TableHead>Owner</TableHead><TableHead>Status</TableHead><TableHead>Type</TableHead><TableHead>Points</TableHead></TableRow></TableHeader>
              <TableBody>
                {(detailsData?.data.workspaces || []).map((workspace) => (
                  <TableRow key={workspace.id}><TableCell><div className="font-bold">{workspace.name}</div><div className="text-xs text-slate-500">{workspace.id}</div></TableCell><TableCell>{workspace.owner_email}</TableCell><TableCell><StatusPill value={workspace.is_active ? "active" : "inactive"} /></TableCell><TableCell>{workspace.white_label_workspace_type || "-"}</TableCell><TableCell>{workspace.white_label_points || 0}</TableCell></TableRow>
                ))}
                {!(detailsData?.data.workspaces || []).length && <TableRow><TableCell colSpan={5}>No workspaces found.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </section>
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
            <DialogDescription>Recent platform admin actions, domain checks, and impersonation activity.</DialogDescription>
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
