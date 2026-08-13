import { useMutation, useQuery } from "@tanstack/react-query";
import { Image, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type CmsLogo = {
  id: string;
  name: string;
  logo_url: string;
  placement: string;
  status: "active" | "inactive";
  display_order: number;
};

const emptyForm = {
  id: "",
  name: "",
  logoUrl: "",
  placement: "founders",
  status: "active",
  displayOrder: "0",
};

export default function CmsLogos() {
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery<{ rows: CmsLogo[] }>({
    queryKey: ["/api/superadmin/cms/logos"],
    queryFn: () => apiRequest("GET", "/api/superadmin/cms/logos").then((res) => res.json()),
  });

  const saveLogo = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        logoUrl: form.logoUrl,
        placement: form.placement || "founders",
        status: form.status as "active" | "inactive",
        displayOrder: Number(form.displayOrder || 0),
      };
      return form.id
        ? apiRequest("PATCH", `/api/superadmin/cms/logos/${form.id}`, payload)
        : apiRequest("POST", "/api/superadmin/cms/logos", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/cms/logos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cms/logos", "founders"] });
      setForm(emptyForm);
      toast({ title: "Logo saved" });
    },
  });

  const deleteLogo = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/superadmin/cms/logos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/cms/logos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cms/logos", "founders"] });
      toast({ title: "Logo deleted" });
    },
  });

  const rows = data?.rows ?? [];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-3">
              <Image className="h-6 w-6 text-emerald-700" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-950">CMS</h1>
              <p className="text-sm text-slate-500">Manage brand logos used across marketing pages.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{form.id ? "Edit logo" : "Add logo"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Company name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              <Input placeholder="Logo URL" value={form.logoUrl} onChange={(event) => setForm({ ...form, logoUrl: event.target.value })} />
              <Input placeholder="Placement" value={form.placement} onChange={(event) => setForm({ ...form, placement: event.target.value || "founders" })} />
              <Input type="number" placeholder="Display order" value={form.displayOrder} onChange={(event) => setForm({ ...form, displayOrder: event.target.value })} />
              <select className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              {form.logoUrl && (
                <div className="flex h-20 items-center justify-center rounded-lg border bg-white p-3">
                  <img src={form.logoUrl} alt={form.name || "Logo preview"} className="max-h-12 max-w-[180px] object-contain" />
                </div>
              )}
              <div className="flex gap-2">
                <Button className="flex-1 bg-emerald-700 hover:bg-emerald-800" disabled={!form.name || !form.logoUrl || saveLogo.isPending} onClick={() => saveLogo.mutate()}>
                  {form.id ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {form.id ? "Update" : "Add"}
                </Button>
                {form.id && <Button variant="outline" onClick={() => setForm(emptyForm)}>Cancel</Button>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Brand logos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="p-3">Logo</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Placement</th>
                      <th className="p-3">Order</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr><td className="p-6 text-center text-slate-500" colSpan={6}>Loading logos...</td></tr>
                    ) : rows.length === 0 ? (
                      <tr><td className="p-6 text-center text-slate-500" colSpan={6}>No logos added yet.</td></tr>
                    ) : rows.map((logo) => (
                      <tr key={logo.id} className="border-t">
                        <td className="p-3"><img src={logo.logo_url} alt={logo.name} className="h-9 max-w-[110px] object-contain" /></td>
                        <td className="p-3 font-bold">{logo.name}</td>
                        <td className="p-3">{logo.placement}</td>
                        <td className="p-3">{logo.display_order}</td>
                        <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${logo.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{logo.status}</span></td>
                        <td className="p-3">
                          <div className="flex justify-end gap-2">
                            <Button size="icon" variant="outline" onClick={() => setForm({ id: logo.id, name: logo.name, logoUrl: logo.logo_url, placement: logo.placement, status: logo.status, displayOrder: String(logo.display_order || 0) })}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="outline" className="text-red-600" disabled={deleteLogo.isPending} onClick={() => deleteLogo.mutate(logo.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
