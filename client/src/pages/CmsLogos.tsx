import { useMutation, useQuery } from "@tanstack/react-query";
import { FileText, Image, Link2, MessageSquareQuote, Megaphone, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode, TextareaHTMLAttributes } from "react";
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

type CmsEntry = {
  id: string;
  type: "case_study" | "review_feedback";
  title: string;
  subtitle: string;
  body: string;
  image_url: string;
  link_url: string;
  metadata: Record<string, any>;
  status: "active" | "inactive";
  display_order: number;
};

type CmsSection = "announcement" | "logos" | "social" | "case_study" | "review_feedback";

const sections: Array<{ key: CmsSection; label: string; helper: string; icon: any }> = [
  { key: "announcement", label: "Top Announcement Bar", helper: "Header line above the public website navigation.", icon: Megaphone },
  { key: "logos", label: "Partner Logos", helper: "Founder and trusted-brand logo strips across marketing pages.", icon: Image },
  { key: "social", label: "Social Media Links", helper: "Footer social platform links.", icon: Link2 },
  { key: "case_study", label: "Case Studies", helper: "Customer stories shown on case-study sections/pages.", icon: FileText },
  { key: "review_feedback", label: "Review Feedback", helper: "Testimonials and review cards shown on marketing pages.", icon: MessageSquareQuote },
];

const emptyLogoForm = {
  id: "",
  name: "",
  logoUrl: "",
  placement: "founders",
  status: "active",
  displayOrder: "0",
};

const emptyEntryForm = {
  id: "",
  title: "",
  subtitle: "",
  body: "",
  imageUrl: "",
  linkUrl: "",
  displayOrder: "0",
  status: "active",
  metric: "",
  tags: "",
};

const defaultAnnouncement = {
  enabled: true,
  badge: "NEW LAUNCH",
  text: "Build AI Agents on WhatsApp that qualify leads, answer customers, and convert sales 24/7",
  ctaText: "Explore More",
  ctaUrl: "/ai-assistant",
};

const defaultSocialLinks = {
  twitter: "https://x.com",
  linkedin: "https://linkedin.com",
  instagram: "https://instagram.com",
  facebook: "https://facebook.com",
};

function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`min-h-24 w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-emerald-700 ${props.className || ""}`} />;
}

export default function CmsLogos() {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<CmsSection>("announcement");
  const [logoForm, setLogoForm] = useState(emptyLogoForm);
  const [entryForm, setEntryForm] = useState(emptyEntryForm);

  const { data: logosData, isLoading: logosLoading } = useQuery<{ rows: CmsLogo[] }>({
    queryKey: ["/api/superadmin/cms/logos"],
    queryFn: () => apiRequest("GET", "/api/superadmin/cms/logos").then((res) => res.json()),
  });

  const { data: settingsData } = useQuery<{ rows: Array<{ key: string; value: any }> }>({
    queryKey: ["/api/superadmin/cms/settings"],
    queryFn: () => apiRequest("GET", "/api/superadmin/cms/settings").then((res) => res.json()),
  });

  const { data: entriesData, isLoading: entriesLoading } = useQuery<{ rows: CmsEntry[] }>({
    queryKey: ["/api/superadmin/cms/entries"],
    queryFn: () => apiRequest("GET", "/api/superadmin/cms/entries").then((res) => res.json()),
  });

  const announcement = {
    ...defaultAnnouncement,
    ...(settingsData?.rows?.find((row) => row.key === "announcement_bar")?.value || {}),
  };
  const socialLinks = {
    ...defaultSocialLinks,
    ...(settingsData?.rows?.find((row) => row.key === "social_links")?.value || {}),
  };

  const [announcementDraft, setAnnouncementDraft] = useState(defaultAnnouncement);
  const [socialDraft, setSocialDraft] = useState(defaultSocialLinks);

  useEffect(() => {
    setAnnouncementDraft(announcement);
    setSocialDraft(socialLinks);
  }, [settingsData]);

  const saveSetting = useMutation({
    mutationFn: ({ key, value }: { key: string; value: Record<string, any> }) =>
      apiRequest("PUT", `/api/superadmin/cms/settings/${key}`, { value }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/cms/settings"] });
      queryClient.invalidateQueries({ queryKey: [`/api/cms/settings/${variables.key}`] });
      toast({ title: "CMS setting saved" });
    },
  });

  const saveLogo = useMutation({
    mutationFn: () => {
      const payload = {
        name: logoForm.name,
        logoUrl: logoForm.logoUrl,
        placement: logoForm.placement || "founders",
        status: logoForm.status as "active" | "inactive",
        displayOrder: Number(logoForm.displayOrder || 0),
      };
      return logoForm.id
        ? apiRequest("PATCH", `/api/superadmin/cms/logos/${logoForm.id}`, payload)
        : apiRequest("POST", "/api/superadmin/cms/logos", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/cms/logos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cms/logos", "founders"] });
      setLogoForm(emptyLogoForm);
      toast({ title: "Partner logo saved" });
    },
  });

  const deleteLogo = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/superadmin/cms/logos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/cms/logos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cms/logos", "founders"] });
      toast({ title: "Partner logo deleted" });
    },
  });

  const saveEntry = useMutation({
    mutationFn: () => {
      const payload = {
        type: activeSection as "case_study" | "review_feedback",
        title: entryForm.title,
        subtitle: entryForm.subtitle,
        body: entryForm.body,
        imageUrl: entryForm.imageUrl,
        linkUrl: entryForm.linkUrl,
        status: entryForm.status as "active" | "inactive",
        displayOrder: Number(entryForm.displayOrder || 0),
        metadata: {
          metric: entryForm.metric,
          tags: entryForm.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        },
      };
      return entryForm.id
        ? apiRequest("PATCH", `/api/superadmin/cms/entries/${entryForm.id}`, payload)
        : apiRequest("POST", "/api/superadmin/cms/entries", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/cms/entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cms/entries"] });
      setEntryForm(emptyEntryForm);
      toast({ title: activeSection === "case_study" ? "Case study saved" : "Review feedback saved" });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/superadmin/cms/entries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/cms/entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cms/entries"] });
      toast({ title: "CMS entry deleted" });
    },
  });

  const logos = logosData?.rows ?? [];
  const entries = (entriesData?.rows ?? []).filter((entry) => entry.type === activeSection);
  const entryLabel = activeSection === "case_study" ? "Case Study" : "Review Feedback";

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
              <p className="text-sm text-slate-500">Manage marketing content by section, with clear labels for the exact area being changed.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          {sections.map(({ key, label, helper, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`rounded-xl border p-4 text-left transition ${activeSection === key ? "border-emerald-700 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              <Icon className="h-5 w-5" />
              <p className="mt-3 font-black">{label}</p>
              <p className="mt-1 text-xs text-slate-500">{helper}</p>
            </button>
          ))}
        </div>

        {activeSection === "announcement" && (
          <Card>
            <CardHeader>
              <CardTitle>Changing: Top Announcement Bar</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={announcementDraft.enabled}
                    onChange={(event) => setAnnouncementDraft({ ...announcementDraft, enabled: event.target.checked })}
                  />
                  Show announcement bar
                </label>
                <Input placeholder="Badge text" value={announcementDraft.badge} onChange={(event) => setAnnouncementDraft({ ...announcementDraft, badge: event.target.value })} />
                <Input placeholder="Main line text" value={announcementDraft.text} onChange={(event) => setAnnouncementDraft({ ...announcementDraft, text: event.target.value })} />
                <Input placeholder="CTA text" value={announcementDraft.ctaText} onChange={(event) => setAnnouncementDraft({ ...announcementDraft, ctaText: event.target.value })} />
                <Input placeholder="CTA URL" value={announcementDraft.ctaUrl} onChange={(event) => setAnnouncementDraft({ ...announcementDraft, ctaUrl: event.target.value })} />
                <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={() => saveSetting.mutate({ key: "announcement_bar", value: announcementDraft })}>
                  <Save className="h-4 w-4" /> Save Announcement Bar
                </Button>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-slate-500">Live-style preview</p>
                <div className="overflow-hidden rounded-xl border border-green-200 bg-gradient-to-r from-green-100 via-lime-50 to-green-100 p-4">
                  <div className="flex items-center justify-center gap-4 text-center text-lg font-black text-slate-900">
                    <span className="inline-flex items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-xs font-black text-white">
                      <span className="h-2 w-2 rounded-full bg-white" />
                      {announcementDraft.badge || "NEW LAUNCH"}
                    </span>
                    <span>{announcementDraft.text}</span>
                    <span className="text-green-700">{announcementDraft.ctaText}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeSection === "social" && (
          <Card>
            <CardHeader>
              <CardTitle>Changing: Footer Social Media Links</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Twitter / X URL" value={socialDraft.twitter} onChange={(event) => setSocialDraft({ ...socialDraft, twitter: event.target.value })} />
              <Input placeholder="LinkedIn URL" value={socialDraft.linkedin} onChange={(event) => setSocialDraft({ ...socialDraft, linkedin: event.target.value })} />
              <Input placeholder="Instagram URL" value={socialDraft.instagram} onChange={(event) => setSocialDraft({ ...socialDraft, instagram: event.target.value })} />
              <Input placeholder="Facebook URL" value={socialDraft.facebook} onChange={(event) => setSocialDraft({ ...socialDraft, facebook: event.target.value })} />
              <Button className="bg-emerald-700 hover:bg-emerald-800 md:col-span-2" onClick={() => saveSetting.mutate({ key: "social_links", value: socialDraft })}>
                <Save className="h-4 w-4" /> Save Social Links
              </Button>
            </CardContent>
          </Card>
        )}

        {activeSection === "logos" && (
          <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            <Card>
              <CardHeader><CardTitle>{logoForm.id ? "Changing: Partner Logo" : "Add: Partner Logo"}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Company name" value={logoForm.name} onChange={(event) => setLogoForm({ ...logoForm, name: event.target.value })} />
                <Input placeholder="Logo URL" value={logoForm.logoUrl} onChange={(event) => setLogoForm({ ...logoForm, logoUrl: event.target.value })} />
                <Input placeholder="Placement, for example founders" value={logoForm.placement} onChange={(event) => setLogoForm({ ...logoForm, placement: event.target.value || "founders" })} />
                <Input type="number" placeholder="Display order" value={logoForm.displayOrder} onChange={(event) => setLogoForm({ ...logoForm, displayOrder: event.target.value })} />
                <select className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={logoForm.status} onChange={(event) => setLogoForm({ ...logoForm, status: event.target.value })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <Button className="w-full bg-emerald-700 hover:bg-emerald-800" disabled={!logoForm.name || !logoForm.logoUrl || saveLogo.isPending} onClick={() => saveLogo.mutate()}>
                  {logoForm.id ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {logoForm.id ? "Update Partner Logo" : "Add Partner Logo"}
                </Button>
              </CardContent>
            </Card>

            <CmsTable title="Partner Logos" loading={logosLoading} empty="No partner logos added yet." columns={["Logo", "Name", "Placement", "Order", "Status", "Actions"]}>
              {logos.map((logo) => (
                <tr key={logo.id} className="border-t">
                  <td className="p-3"><img src={logo.logo_url} alt={logo.name} className="h-9 max-w-[110px] object-contain" /></td>
                  <td className="p-3 font-bold">{logo.name}</td>
                  <td className="p-3">{logo.placement}</td>
                  <td className="p-3">{logo.display_order}</td>
                  <td className="p-3"><Status status={logo.status} /></td>
                  <td className="p-3"><RowActions onEdit={() => setLogoForm({ id: logo.id, name: logo.name, logoUrl: logo.logo_url, placement: logo.placement, status: logo.status, displayOrder: String(logo.display_order || 0) })} onDelete={() => deleteLogo.mutate(logo.id)} /></td>
                </tr>
              ))}
            </CmsTable>
          </div>
        )}

        {(activeSection === "case_study" || activeSection === "review_feedback") && (
          <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
            <Card>
              <CardHeader><CardTitle>{entryForm.id ? `Changing: ${entryLabel}` : `Add: ${entryLabel}`}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder={activeSection === "case_study" ? "Case study title" : "Reviewer name"} value={entryForm.title} onChange={(event) => setEntryForm({ ...entryForm, title: event.target.value })} />
                <Input placeholder={activeSection === "case_study" ? "Company / industry" : "Role / company"} value={entryForm.subtitle} onChange={(event) => setEntryForm({ ...entryForm, subtitle: event.target.value })} />
                <Textarea placeholder={activeSection === "case_study" ? "Challenge / story summary" : "Review text"} value={entryForm.body} onChange={(event) => setEntryForm({ ...entryForm, body: event.target.value })} />
                <Input placeholder="Metric / highlighted result" value={entryForm.metric} onChange={(event) => setEntryForm({ ...entryForm, metric: event.target.value })} />
                <Input placeholder="Image URL" value={entryForm.imageUrl} onChange={(event) => setEntryForm({ ...entryForm, imageUrl: event.target.value })} />
                <Input placeholder="Link URL" value={entryForm.linkUrl} onChange={(event) => setEntryForm({ ...entryForm, linkUrl: event.target.value })} />
                <Input placeholder="Tags, comma separated" value={entryForm.tags} onChange={(event) => setEntryForm({ ...entryForm, tags: event.target.value })} />
                <Input type="number" placeholder="Display order" value={entryForm.displayOrder} onChange={(event) => setEntryForm({ ...entryForm, displayOrder: event.target.value })} />
                <select className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={entryForm.status} onChange={(event) => setEntryForm({ ...entryForm, status: event.target.value })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <Button className="w-full bg-emerald-700 hover:bg-emerald-800" disabled={!entryForm.title || saveEntry.isPending} onClick={() => saveEntry.mutate()}>
                  {entryForm.id ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {entryForm.id ? `Update ${entryLabel}` : `Add ${entryLabel}`}
                </Button>
              </CardContent>
            </Card>

            <CmsTable title={`${entryLabel} Items`} loading={entriesLoading} empty={`No ${entryLabel.toLowerCase()} items added yet.`} columns={["Title", "Subtitle", "Metric", "Order", "Status", "Actions"]}>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-t">
                  <td className="p-3 font-bold">{entry.title}</td>
                  <td className="p-3">{entry.subtitle}</td>
                  <td className="p-3">{entry.metadata?.metric || "-"}</td>
                  <td className="p-3">{entry.display_order}</td>
                  <td className="p-3"><Status status={entry.status} /></td>
                  <td className="p-3">
                    <RowActions
                      onEdit={() => setEntryForm({
                        id: entry.id,
                        title: entry.title,
                        subtitle: entry.subtitle || "",
                        body: entry.body || "",
                        imageUrl: entry.image_url || "",
                        linkUrl: entry.link_url || "",
                        displayOrder: String(entry.display_order || 0),
                        status: entry.status,
                        metric: entry.metadata?.metric || "",
                        tags: Array.isArray(entry.metadata?.tags) ? entry.metadata.tags.join(", ") : "",
                      })}
                      onDelete={() => deleteEntry.mutate(entry.id)}
                    />
                  </td>
                </tr>
              ))}
            </CmsTable>
          </div>
        )}
      </div>
    </div>
  );
}

function Status({ status }: { status: "active" | "inactive" }) {
  return <span className={`rounded-full px-2 py-1 text-xs font-bold ${status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{status}</span>;
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex justify-end gap-2">
      <Button size="icon" variant="outline" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
      <Button size="icon" variant="outline" className="text-red-600" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
    </div>
  );
}

function CmsTable({
  title,
  loading,
  empty,
  columns,
  children,
}: {
  title: string;
  loading: boolean;
  empty: string;
  columns: string[];
  children: ReactNode;
}) {
  const hasRows = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>{columns.map((column) => <th key={column} className={`p-3 ${column === "Actions" ? "text-right" : ""}`}>{column}</th>)}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="p-6 text-center text-slate-500" colSpan={columns.length}>Loading...</td></tr>
              ) : !hasRows ? (
                <tr><td className="p-6 text-center text-slate-500" colSpan={columns.length}>{empty}</td></tr>
              ) : children}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
