import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Globe2, Plus, ShieldCheck } from "lucide-react";
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
};

const emptySuperadmin = {
  username: "",
  password: "",
  email: "",
  firstName: "",
  lastName: "",
};

export default function PlatformAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [domainOpen, setDomainOpen] = useState(false);
  const [selectedSuperadmin, setSelectedSuperadmin] = useState<SuperadminRow | null>(null);
  const [superadminDraft, setSuperadminDraft] = useState(emptySuperadmin);
  const [domainDraft, setDomainDraft] = useState({ domain: "", notes: "" });

  const { data, isLoading, error: listError } = useQuery<{ success: boolean; data: SuperadminRow[] }>({
    queryKey: ["/api/platform/superadmins"],
  });

  const { data: domainData } = useQuery<{ success: boolean; data: DomainRow[] }>({
    queryKey: ["/api/platform/superadmins", selectedSuperadmin?.id, "domains"],
    queryFn: async () => {
      const res = await fetch(`/api/platform/superadmins/${selectedSuperadmin?.id}/domains`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load domains");
      return res.json();
    },
    enabled: !!selectedSuperadmin?.id && domainOpen,
  });

  const createSuperadmin = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/platform/superadmins", superadminDraft);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Superadmin created", description: "Partner profile is ready to use." });
      setCreateOpen(false);
      setSuperadminDraft(emptySuperadmin);
      queryClient.invalidateQueries({ queryKey: ["/api/platform/superadmins"] });
    },
    onError: (error: Error) => {
      toast({ title: "Superadmin not created", description: error.message, variant: "destructive" });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/platform/superadmins/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/superadmins"] });
    },
    onError: (error: Error) => {
      toast({ title: "Status not updated", description: error.message, variant: "destructive" });
    },
  });

  const addDomain = useMutation({
    mutationFn: async () => {
      if (!selectedSuperadmin) throw new Error("Select a superadmin first");
      const res = await apiRequest("POST", `/api/platform/superadmins/${selectedSuperadmin.id}/domains`, domainDraft);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Domain added", description: "Add the DNS record, then activate when it resolves." });
      setDomainDraft({ domain: "", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/superadmins", selectedSuperadmin?.id, "domains"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/superadmins"] });
    },
    onError: (error: Error) => {
      toast({ title: "Domain not added", description: error.message, variant: "destructive" });
    },
  });

  const updateDomainStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/platform/domains/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/superadmins", selectedSuperadmin?.id, "domains"] });
    },
    onError: (error: Error) => {
      toast({ title: "Domain status not updated", description: error.message, variant: "destructive" });
    },
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
              <p className="mt-1 text-slate-600">Create partner superadmins, assign their custom domains, and control access.</p>
            </div>
          </div>
          <Button className="gap-2 bg-emerald-700 hover:bg-emerald-800" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New Superadmin
          </Button>
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
                    <div className="font-bold text-slate-950">{[row.firstName, row.lastName].filter(Boolean).join(" ") || row.username}</div>
                    <div className="text-sm text-slate-500">{row.email}</div>
                    <div className="text-xs text-slate-400">{row.id}</div>
                  </TableCell>
                  <TableCell>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${row.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {row.status}
                    </span>
                  </TableCell>
                  <TableCell>{row.clients || 0}</TableCell>
                  <TableCell>{row.workspaces || 0}</TableCell>
                  <TableCell>{row.domains || 0}</TableCell>
                  <TableCell>{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "-"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => { setSelectedSuperadmin(row); setDomainOpen(true); }}>
                        <Globe2 className="h-4 w-4" />
                        Domains
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatus.mutate({ id: row.id, status: row.status === "active" ? "inactive" : "active" })}
                      >
                        {row.status === "active" ? "Inactivate" : "Activate"}
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
            <DialogDescription>This creates a partner profile. Share these credentials with the partner after creation.</DialogDescription>
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
            <Button className="bg-emerald-700 hover:bg-emerald-800" disabled={createSuperadmin.isPending} onClick={() => createSuperadmin.mutate()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={domainOpen} onOpenChange={setDomainOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Partner Domains</DialogTitle>
            <DialogDescription>
              {selectedSuperadmin?.email}. Point CNAME for subdomains to your app domain, then mark active after DNS and SSL are ready.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 rounded-lg border p-4">
            <div className="flex items-center gap-2 font-bold">
              <Building2 className="h-4 w-4 text-emerald-700" />
              Add domain
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Input placeholder="app.partnerdomain.com" value={domainDraft.domain} onChange={(e) => setDomainDraft((d) => ({ ...d, domain: e.target.value }))} />
              <Button className="bg-emerald-700 hover:bg-emerald-800" disabled={addDomain.isPending} onClick={() => addDomain.mutate()}>
                Add Domain
              </Button>
            </div>
            <Input placeholder="Notes, DNS provider, owner contact..." value={domainDraft.notes} onChange={(e) => setDomainDraft((d) => ({ ...d, notes: e.target.value }))} />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>DNS Verification</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(domainData?.data || []).length === 0 ? (
                <TableRow><TableCell colSpan={4}>No domains added.</TableCell></TableRow>
              ) : (
                (domainData?.data || []).map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell className="font-bold">{domain.domain}</TableCell>
                    <TableCell>{domain.status} / SSL {domain.sslStatus}</TableCell>
                    <TableCell>
                      <code className="rounded bg-slate-100 px-2 py-1 text-xs">TXT {domain.verificationToken}</code>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateDomainStatus.mutate({ id: domain.id, status: domain.status === "active" ? "inactive" : "active" })}
                      >
                        {domain.status === "active" ? "Inactivate" : "Mark Active"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
