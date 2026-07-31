import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bot,
  Check,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Facebook,
  FileText,
  Gauge,
  Globe2,
  Headphones,
  ImagePlus,
  Layers3,
  Megaphone,
  MessageCircle,
  MousePointer2,
  Play,
  Send,
  ShoppingBag,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  Wand2,
  Zap,
} from "lucide-react";
import { AppSettings } from "@/types/types";

const founderLogos = ["Lenskart", "Quikr", "The Man Co", "HDFC", "Reliance", "Edelweiss", "Apollo"];

const adTypes = [
  { icon: MessageCircle, title: "Click-to-WhatsApp Ads", text: "Create ads that open WhatsApp conversations with high-intent leads." },
  { icon: Globe2, title: "Website Ads", text: "Drive qualified traffic to your landing pages and capture buyer demand." },
  { icon: FileText, title: "Lead Ads", text: "Collect lead details inside Meta forms and sync them to your workspace." },
  { icon: Send, title: "WhatsApp Status Ads", text: "Promote offers and updates where your audience already spends time." },
];

const dashboardCards = [
  { icon: Megaphone, title: "Unified campaign management", text: "Create, monitor, and optimize all Meta campaigns from one clean dashboard." },
  { icon: Users, title: "Advanced audience targeting", text: "Build audiences by location, interests, engagement, and retargeting lists." },
  { icon: MessageCircle, title: "Manage and reply from one inbox", text: "Agents can respond to incoming leads, qualify buyers, and move chats forward." },
  { icon: BarChart3, title: "Real-time analytics and performance tracking", text: "Track spend, reach, leads, cost per result, and WhatsApp replies." },
];

const workflow = [
  { tag: "01", title: "Add ad account", text: "Connect your Meta ad account and choose the business asset you want to use." },
  { tag: "02", title: "Choose campaign objective", text: "Select leads, messages, traffic, or engagement based on your goal." },
  { tag: "03", title: "Connect your Facebook Business Manager", text: "Authorize pages, pixels, catalogs, and permissions in a guided flow." },
  { tag: "04", title: "Set ad type", text: "Pick Click-to-WhatsApp, website, lead, or status ads from one panel." },
  { tag: "05", title: "Add targeting", text: "Define location, age, gender, interests, placements, and retargeting audiences." },
  { tag: "06", title: "Set budget and schedule", text: "Control daily budgets, start and end dates, and pacing in a simple setup." },
  { tag: "07", title: "Add visuals and copy", text: "Upload creatives, write ad copy, and preview how the ad will appear." },
  { tag: "08", title: "Submit for approval", text: "Publish the campaign and track approval status without leaving the dashboard." },
  { tag: "09", title: "Launch and monitor campaign", text: "Measure performance, see lead quality, and improve budget allocation." },
];

const compareRows = [
  ["Where does the lead start?", "People click Meta ads", "People visit your site", "Facebook mobile"],
  ["Primary channel", "WhatsApp direct thread", "Landing page", "Instant form"],
  ["Best for", "Fast replies", "Website conversions", "Lead collection"],
  ["Conversation speed", "Very high", "Medium", "Medium"],
  ["Data captured", "Chat plus profile", "Form or website behavior", "Meta form fields"],
];

const engagementTools = [
  { icon: Layers3, title: "Multi-agent inbox", text: "Assign and resolve conversations from a shared team inbox." },
  { icon: Bot, title: "Chatbot flow builder", text: "Qualify leads with automated questions and routing." },
  { icon: Headphones, title: "Human takeover", text: "Move hot prospects from automation to live sales instantly." },
  { icon: MessageCircle, title: "WhatsApp CRM", text: "Track contacts, tags, notes, and follow-ups in one place." },
  { icon: Send, title: "Broadcasts", text: "Retarget leads with approved WhatsApp templates." },
  { icon: ClipboardList, title: "Forms", text: "Collect customer details inside guided WhatsApp journeys." },
  { icon: CircleDollarSign, title: "Payments", text: "Send payment links and close deals from chat." },
  { icon: BarChart3, title: "Analytics", text: "Measure leads, replies, conversions, and campaign ROI." },
];

const successStories = [
  ["Financial dashboard CPA", "Generated qualified finance leads with lower acquisition cost."],
  ["Fashion store conversions", "Recovered interest from shoppers using WhatsApp follow-ups."],
  ["IPO lead nurturing", "Converted high-intent ad leads into booked conversations."],
];

const faqs = [
  "Do I need a Facebook Business Manager account?",
  "Can I run multiple campaigns simultaneously?",
  "How do ad leads work?",
  "Is there a contract or commitment?",
  "Can I integrate leads with my CRM?",
  "Are these workflows an add-on or included?",
];

function SettingsQuery() {
  return useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    staleTime: 1000 * 60 * 5,
  });
}

export default function ProductAiAdsManagerPage() {
  const { data: settings } = SettingsQuery();
  const appName = settings?.title || "WhatsWay";

  return (
    <main className="bg-white text-slate-950">
      <section className="relative overflow-hidden border-b border-emerald-100 bg-gradient-to-b from-emerald-50/70 via-white to-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8 lg:py-20">
          <div className="flex flex-col justify-center">
            <p className="mb-3 text-sm font-bold uppercase tracking-wide text-green-600">Ads Manager</p>
            <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              {appName} AI-Powered Ads <span className="block text-green-500">Manager</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Run Meta ads, capture leads on WhatsApp, and manage every conversation from one dashboard built for fast growing teams.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/auth/register" className="inline-flex items-center gap-2 rounded-md bg-green-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-green-200 transition hover:bg-green-600">
                Start for FREE <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/book-demo" className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-5 py-3 text-sm font-black text-slate-900 transition hover:border-green-500 hover:text-green-600">
                Book a Demo
              </Link>
            </div>
          </div>
          <div className="relative min-h-[360px] rounded-[2rem] bg-emerald-100 p-4 shadow-2xl shadow-emerald-100">
            <div className="absolute left-6 top-8 rounded-2xl bg-white px-4 py-3 shadow-xl">
              <p className="text-xs font-bold text-slate-500">Campaign Health</p>
              <p className="text-2xl font-black text-green-500">92%</p>
            </div>
            <div className="absolute bottom-8 right-5 rounded-2xl bg-white px-4 py-3 shadow-xl">
              <p className="text-xs font-bold text-slate-500">Lead Quality</p>
              <p className="text-2xl font-black text-green-500">5.2x</p>
            </div>
            <div className="flex h-full flex-col justify-between rounded-[1.5rem] bg-white p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="text-sm font-bold text-slate-500">Live campaign</p>
                  <p className="text-xl font-black">Festive Sale Leads</p>
                </div>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">Active</span>
              </div>
              <div className="grid gap-3 py-6">
                {["Spend", "Leads", "WhatsApp Replies", "Cost / Lead"].map((item, index) => (
                  <div key={item} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                    <span className="text-sm font-bold text-slate-600">{item}</span>
                    <span className="font-black text-slate-950">{["Rs. 12.4K", "486", "312", "Rs. 25"][index]}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl bg-green-50 p-4">
                <div className="mb-3 flex items-center justify-between text-sm font-bold">
                  <span>Performance</span><span className="text-green-600">Growing</span>
                </div>
                <div className="flex h-24 items-end gap-2">
                  {[35, 50, 44, 70, 62, 88, 78].map((height, index) => (
                    <span key={index} className="flex-1 rounded-t-md bg-green-500" style={{ height: `${height}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-2xl font-black">Founders & Marketers Love us</h2>
          <p className="mt-2 text-sm text-slate-500">Trusted by D2C brands, agencies, and growth teams.</p>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {founderLogos.map((logo) => (
              <div key={logo} className="rounded-md border border-slate-100 bg-white px-3 py-3 text-sm font-black text-slate-500 shadow-sm">{logo}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1fr] lg:items-center">
          <div className="rounded-2xl bg-emerald-50 p-5">
            <div className="rounded-xl bg-white p-4 shadow-xl shadow-emerald-100">
              <div className="mb-4 flex items-center gap-3"><div className="h-12 w-12 rounded-full bg-green-100" /><div><p className="font-black">Rahul Sharma</p><p className="text-sm text-slate-500">New lead from ad</p></div></div>
              <div className="rounded-xl bg-slate-50 p-4"><p className="text-sm font-bold text-slate-600">Hi, I want details about your offer.</p></div>
              <button className="mt-4 rounded-md bg-green-500 px-4 py-2 text-sm font-black text-white">Reply in WhatsApp</button>
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black">Why Choose {appName} Ads Manager?</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Advertising is only useful when leads become conversations. {appName} helps teams launch ads, capture leads, reply faster, and understand campaign performance without switching tools.
            </p>
            <div className="mt-6 grid gap-3">
              {["Run campaigns from a single workspace", "Capture Meta leads directly into WhatsApp", "Use AI suggestions to write better ad copy", "Track campaign spend, replies, and conversions"].map((point) => (
                <div key={point} className="flex items-start gap-3 text-slate-700"><CheckCircle2 className="mt-0.5 h-5 w-5 text-green-500" /><span>{point}</span></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-2xl font-black sm:text-3xl">The 3 Ad Types in {appName} Ads Manager</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">Choose the format that matches your growth goal and launch faster.</p>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {adTypes.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-md border border-slate-100 bg-white p-5 shadow-sm">
                <Icon className="h-8 w-8 text-green-500" />
                <h3 className="mt-4 font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                <Link href="/auth/register" className="mt-4 inline-flex rounded-md bg-green-500 px-3 py-2 text-xs font-black text-white">Get started</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-2xl font-black sm:text-3xl">Manage Everything in One Single Dashboard</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {dashboardCards.map(({ icon: Icon, title, text }, index) => (
              <div key={title} className="rounded-md border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-green-100"><Icon className="h-6 w-6 text-green-600" /></div>
                  <div><h3 className="font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div>
                </div>
                <div className="mt-5 rounded-xl bg-slate-50 p-4">
                  <div className="mb-3 flex justify-between text-xs font-bold text-slate-500"><span>{index % 2 ? "Audience" : "Campaign"}</span><span>Live</span></div>
                  <div className="grid gap-2">
                    {[72, 44, 88].map((width, bar) => <span key={bar} className="h-3 rounded-full bg-green-400" style={{ width: `${width}%` }} />)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-black sm:text-3xl">How It Works</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">Launch Meta campaigns without jumping between disconnected tools.</p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {workflow.map((step, index) => (
              <div key={step.title} className="grid gap-4 rounded-md border border-slate-100 bg-white p-5 shadow-sm sm:grid-cols-[80px_1fr]">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-xl font-black text-green-600">#{step.tag}</div>
                <div>
                  <h3 className="font-black">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
                  <div className="mt-4 rounded-xl bg-slate-50 p-3">
                    <div className="h-3 w-2/3 rounded-full bg-slate-200" />
                    <div className="mt-2 h-3 w-1/2 rounded-full bg-green-300" />
                    <div className="mt-2 h-3 w-3/4 rounded-full bg-slate-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-emerald-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_0.85fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase text-green-600">AI creative studio</p>
            <h2 className="mt-2 text-3xl font-black">Generate Ad Creatives with AI</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">Generate campaign visuals and captions for your CTA campaigns in seconds. Keep testing new creative angles without slowing your team down.</p>
            <div className="mt-6 grid gap-3">
              {["Auto brand prompts", "Upload brand assets", "Generate captions", "Download creatives instantly"].map((point) => (
                <div key={point} className="flex items-center gap-3"><Wand2 className="h-5 w-5 text-green-600" /><span className="font-bold text-slate-700">{point}</span></div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-xl shadow-emerald-100">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center justify-between"><Sparkles className="h-7 w-7 text-green-500" /><span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">AI generated</span></div>
              <div className="mt-5 aspect-[4/3] rounded-xl bg-gradient-to-br from-green-200 via-white to-slate-100 p-5">
                <div className="ml-auto h-full w-2/3 rounded-2xl bg-white/80 p-4 shadow-lg"><ImagePlus className="h-10 w-10 text-green-500" /><p className="mt-4 text-xl font-black">Creative ready for review</p></div>
              </div>
              <button className="mt-4 w-full rounded-md bg-green-500 py-3 text-sm font-black text-white">Generate Ads with AI</button>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-black sm:text-3xl">Compare Ad Types at a Glance</h2>
          <div className="mt-8 overflow-hidden rounded-md border border-slate-200">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-green-500 text-white"><tr><th className="p-4">Parameter</th><th className="p-4">Lead Form Ads</th><th className="p-4">Click-to-WhatsApp Ads</th><th className="p-4">Website Ads</th></tr></thead>
              <tbody>
                {compareRows.map((row) => (
                  <tr key={row[0]} className="border-t border-slate-100"><td className="p-4 font-black text-slate-800">{row[0]}</td><td className="p-4 text-slate-600">{row[1]}</td><td className="p-4 text-slate-600">{row[2]}</td><td className="p-4 text-slate-600">{row[3]}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-2xl font-black sm:text-3xl">Everything You Need for WhatsApp Engagement</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {engagementTools.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-md border border-slate-100 bg-white p-5 shadow-sm">
                <Icon className="h-7 w-7 text-green-500" />
                <h3 className="mt-4 font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                <Link href="/auth/register" className="mt-4 inline-flex rounded-md bg-green-500 px-3 py-2 text-xs font-black text-white">Get started</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-black sm:text-3xl">WhatsApp Ads Success Stories</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {successStories.map(([title, text]) => (
              <div key={title} className="rounded-md border border-slate-100 bg-white p-6 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100"><TrendingUp className="h-6 w-6 text-green-600" /></div>
                <h3 className="mt-4 font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                <Link href="/resources/case-studies" className="mt-4 inline-flex rounded-md bg-green-500 px-3 py-2 text-xs font-black text-white">Explore case study</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-lime-100 px-4 py-9 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">Drive 3x Revenue with {appName}</h2>
            <p className="mt-2 text-slate-700">Launch ads, collect WhatsApp leads, and convert faster from one place.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/auth/register" className="rounded-md bg-green-500 px-5 py-3 text-sm font-black text-white">Start for FREE</Link>
            <Link href="/book-demo" className="rounded-md border border-slate-900 px-5 py-3 text-sm font-black text-slate-900">Book a Demo</Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-black">FAQ</h2>
          <div className="mt-6 divide-y divide-slate-100 rounded-md border border-slate-100 bg-white shadow-sm">
            {faqs.map((faq) => (
              <details key={faq} className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-900">
                  {faq}<span className="text-green-500">+</span>
                </summary>
                <p className="mt-3 text-sm leading-6 text-slate-600">Yes. {appName} keeps the setup simple while giving teams the controls they need to launch and manage campaigns confidently.</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}


