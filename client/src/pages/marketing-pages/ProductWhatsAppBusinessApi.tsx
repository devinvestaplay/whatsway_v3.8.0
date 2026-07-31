import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  Gift,
  Globe2,
  Headphones,
  Heart,
  MessageCircle,
  MessageSquare,
  Phone,
  Play,
  Send,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  UserCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import { AppSettings } from "@/types/types";

const founderLogos = ["Unacademy", "uDrivr", "mCaffeine", "Cult.fit", "Giva", "Classplus", "Clovia"];

const stats = [
  { value: "98%", label: "Open Rates" },
  { value: "45-60%", label: "Click Rates" },
  { value: "2.60Bn+", label: "Active Users" },
  { value: "70%", label: "Engagement Rates" },
];

const comparisonRows = [
  ["Message Broadcasting", true, false],
  ["Bulk Rate Access", true, false],
  ["Limited Messages", false, true],
  ["Broadcast Size", "Unlimited users", "Up to 256 contacts/time"],
  ["Broadcast Reach", "98%", "Only who have saved your number"],
  ["Catalog Access", "Yes, but manage it in dashboard", "Yes, via app only"],
  ["Chatbot Flow", "Yes", "No"],
  ["Clickable Messages", "Yes", "No"],
  ["Campaign Analytics", "Yes", "No"],
  ["Integrate with CRMs and other software", "Yes", "No"],
  ["Broadcasting Cost", "Low", "No"],
];

const benefitCards = [
  { icon: Users, title: "Reach customers wherever they are", text: "Reach opted-in customers instantly on WhatsApp with a direct and trusted communication channel." },
  { icon: Send, title: "Bulk messaging made simple", text: "Send campaign templates, reminders, and notifications to large audiences with better tracking." },
  { icon: Gift, title: "Grow your revenue by 5x", text: "Use personalized messages, CTAs, retargeting, and automation to convert more conversations." },
  { icon: UserCheck, title: "Offer unmatched customer support", text: "Manage customer queries, handoff to agents, and keep conversation history in one place." },
  { icon: Sparkles, title: "Highly cost-effective", text: "Automate repeat workflows and reduce manual effort while keeping customers engaged." },
  { icon: ShieldCheck, title: "Secure, verified and officially approved", text: "Use approved WhatsApp templates and official API workflows for compliant communication." },
];

const usageCards = [
  { icon: Users, title: "Import and broadcast instantly", text: "Upload contacts and start segment-based campaigns after template approval." },
  { icon: MessageCircle, title: "Collect payments on WhatsApp", text: "Send payment links, reminders, invoices, and confirmations inside chat journeys." },
  { icon: Phone, title: "Run click-to-WhatsApp ads", text: "Move Facebook and Instagram ad leads directly into WhatsApp conversations." },
  { icon: Bot, title: "Build no-code WhatsApp chatbots in minutes", text: "Create FAQs, qualification flows, bookings, and support journeys without code." },
  { icon: Send, title: "Send automated CTA based notifications", text: "Trigger account, order, payment, shipping, reminder, and update messages." },
  { icon: CheckCircle2, title: "Get official WhatsApp blue tick verification", text: "Prepare your business profile and verification readiness from one platform." },
  { icon: BarChart3, title: "Track campaign performance with advanced analytics", text: "Measure delivery, reads, clicks, replies, and conversion outcomes from campaigns." },
  { icon: Globe2, title: "Integrate seamlessly with your tech stack", text: "Connect Shopify, CRMs, Zapier, Razorpay, and webhook workflows." },
  { icon: Headphones, title: "Answer customer queries with live chat", text: "Let agents manage conversations, assign chats, and respond faster." },
];

const industries = [
  [ShoppingCart, "Ecommerce", "Recover carts and send order updates."],
  [Building2, "Education and Edtech", "Nurture admissions and student reminders."],
  [Star, "Banking and Finance", "Send payment and account notifications."],
  [Heart, "Healthcare", "Book appointments and follow up."],
  [Store, "Real Estate", "Qualify leads and book property visits."],
  [Phone, "Automobile", "Book test drives and service reminders."],
  [Gift, "Travel and Tourism", "Send booking updates and offers."],
  [TrendingUp, "Marketing Agencies", "Manage campaigns for multiple clients."],
];

const whyApply = [
  [ShieldCheck, "Official WhatsApp Partner", "Built around official WhatsApp API workflows."],
  [Gift, "Free WhatsApp Business API", "Start without setup friction or complex handoffs."],
  [Headphones, "Unlimited Support", "Get help with setup, templates, campaigns, and launch."],
];

const testimonials = [
  ["Priya Khurana", "Marketing Manager", "The team helped us launch WhatsApp campaigns faster and track every reply clearly."],
  ["Akash Jain", "Founder", "We moved customer follow-ups to WhatsApp and saw faster responses from leads."],
  ["Aditya Mehra", "Growth Lead", "Broadcasts, automation, and inbox together made customer communication much easier."],
];

const growthCards = [
  ["D2C Transport Corp.", "Sent personalized WhatsApp notifications and improved customer response."],
  ["Edtech Platform", "Used automated reminders and broadcasts to drive registrations."],
  ["IndMart", "Recovered conversations using WhatsApp offers and follow-ups."],
];

const faqs = [
  "Is WhatsApp Business API free?",
  "How to get WhatsApp Business API for FREE?",
  "Can I use WhatsApp Apps and WhatsApp Business API on the same number?",
  "Can I send automated messages using WhatsApp Business API?",
  "Can I access WhatsApp on multiple devices with WhatsApp Business API?",
  "Which one is better, WhatsApp Business or WhatsApp Business API?",
  "How long does it take to get WhatsApp Business API approval?",
  "What are the prerequisites for applying to WhatsApp Business API?",
  "Are international phone numbers accepted for WhatsApp Business API?",
  "Can I downgrade from WhatsApp Business API back to the regular app?",
];

function VisualPanel() {
  return (
    <div className="rounded-[1.6rem] bg-gradient-to-br from-green-700 to-green-500 p-3 shadow-2xl shadow-green-900/20">
      <div className="rounded-[1.25rem] bg-white p-4">
        <div className="grid gap-4 md:grid-cols-[0.75fr_1.25fr]">
          <div className="space-y-3">
            <div className="rounded-2xl bg-green-50 p-4">
              <MessageSquare className="h-7 w-7 text-green-600" />
              <p className="mt-3 text-sm font-black">WhatsApp API</p>
              <p className="mt-1 text-xs text-slate-500">Verified setup</p>
            </div>
            <div className="rounded-2xl bg-slate-950 p-4 text-white">
              <p className="text-2xl font-black">72%</p>
              <p className="text-xs text-slate-300">Read rate</p>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-black">Campaign Overview</span>
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">Live</span>
            </div>
            <div className="space-y-3">
              {["Template approved", "Contacts imported", "Broadcast scheduled", "Replies routed"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-semibold text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductWhatsappBusinessApiPage() {
  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const appName = brandSettings?.title || "WhatsWay";

  return (
    <div className="bg-white pt-40 text-slate-950 sm:pt-44">
      <section className="bg-white pb-12 pt-10">
        <div className="mx-auto grid max-w-[1180px] gap-10 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-8">
          <div>
            <h1 className="text-4xl font-black leading-tight tracking-normal sm:text-6xl">
              Get<br /> Official <span className="text-green-500">WhatsApp Business API FREE</span><br /> with {appName}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
              Built on official WhatsApp Business API. Launch WhatsApp broadcast campaigns, automate notifications, build AI agents, and connect support workflows from one platform.
            </p>
            <p className="mt-3 text-sm font-semibold text-slate-500">Get free WhatsApp Business API access with no setup fee.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="inline-flex h-12 items-center justify-center rounded-md bg-green-500 px-6 text-sm font-black text-white transition hover:bg-green-600">
                GET FREE WHATSAPP API
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link href="/demo" className="inline-flex h-12 items-center justify-center rounded-md border border-slate-300 bg-white px-6 text-sm font-black text-slate-900 transition hover:bg-slate-50">
                Book a Demo
              </Link>
            </div>
          </div>
          <VisualPanel />
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-[1180px] px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-black sm:text-3xl">Founders and Marketers Love us</h2>
          <p className="mt-2 text-sm text-slate-500">Admired by 50,000+ businesses globally</p>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {founderLogos.map((logo) => (
              <div key={logo} className="rounded-xl bg-white p-3 text-sm font-black text-slate-500 shadow-sm ring-1 ring-slate-100">{logo}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="mx-auto max-w-[1180px] px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-black sm:text-3xl">Why WhatsApp in 2026?</h2>
          <p className="mt-2 text-sm text-slate-500">WhatsApp is the channel businesses rely on for engagement, automation, and support.</p>
          <div className="mt-6 grid rounded-xl border border-slate-100 bg-white shadow-lg shadow-slate-950/5 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="border-b border-slate-100 p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
                <p className="text-2xl font-black text-slate-950">{stat.value}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-black sm:text-3xl">WhatsApp Business vs WhatsApp Business API</h2>
            <p className="mt-2 text-sm text-slate-500">See how WhatsApp Business API compares to the regular app.</p>
          </div>
          <div className="mt-8 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl shadow-slate-950/5">
            <div className="grid grid-cols-[1.1fr_1fr_1fr] bg-slate-50 text-center text-sm font-black">
              <div className="p-4 text-left">Feature</div>
              <div className="border-l border-slate-100 p-4">WhatsApp Business API</div>
              <div className="border-l border-slate-100 p-4">WhatsApp Business App</div>
            </div>
            {comparisonRows.map(([label, api, app]) => (
              <div key={String(label)} className="grid grid-cols-[1.1fr_1fr_1fr] border-t border-slate-100 text-sm">
                <div className="p-4 font-semibold text-green-600">{String(label)}</div>
                {[api, app].map((value, index) => (
                  <div key={`${label}-${index}`} className="flex items-center justify-center border-l border-slate-100 p-4 text-center text-slate-600">
                    {value === true ? <Check className="h-5 w-5 text-green-600" /> : value === false ? <X className="h-5 w-5 text-slate-300" /> : String(value)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-12">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-black sm:text-3xl">Benefits of WhatsApp Business API for businesses</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {benefitCards.map((card) => (
              <div key={card.title} className="rounded-xl bg-white p-5 shadow-lg shadow-slate-950/5">
                <card.icon className="h-8 w-8 text-green-600" />
                <h3 className="mt-4 text-base font-black text-slate-950">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-[1180px] px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-black sm:text-3xl">Get WhatsApp Business API FREE for LIFE</h2>
          <p className="mt-2 text-sm text-slate-500">Watch how to get WhatsApp Business API in 10 minutes with {appName}</p>
          <div className="relative mx-auto mt-8 max-w-3xl overflow-hidden rounded-xl bg-slate-200 shadow-2xl shadow-slate-950/15">
            <div className="aspect-video bg-gradient-to-br from-green-700 via-green-500 to-slate-900 p-8 text-left text-white">
              <div className="flex h-full items-center justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-green-600 shadow-xl">
                  <Play className="ml-1 h-9 w-9 fill-current" />
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-white/90 p-5 text-center text-3xl font-black text-slate-950">{appName}</div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-12">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-black sm:text-3xl">How you can use WhatsApp Business API with {appName}?</h2>
            <p className="mt-2 text-sm text-slate-500">Everything you need to grow your business with WhatsApp marketing.</p>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {usageCards.map((card, index) => (
              <div key={card.title} className={`${index === 6 || index === 7 ? "lg:col-span-1" : ""} rounded-xl bg-white p-5 shadow-lg shadow-slate-950/5`}>
                <card.icon className="h-8 w-8 text-green-600" />
                <h3 className="mt-4 text-base font-black text-slate-950">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-black sm:text-3xl">WhatsApp Business API Use Cases Across Industries</h2>
            <p className="mt-2 text-sm text-slate-500">From ecommerce to education, use WhatsApp to support, sell, and engage.</p>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {industries.map(([Icon, title, text]) => (
              <div key={String(title)} className="rounded-xl border border-slate-100 bg-white p-5 text-center shadow-lg shadow-slate-950/5">
                <Icon className="mx-auto h-8 w-8 text-green-600" />
                <h3 className="mt-4 text-base font-black text-slate-950">{String(title)}</h3>
                <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-600">{String(text)}</p>
                <Link href="/signup" className="mt-4 inline-flex rounded-md bg-green-500 px-4 py-2 text-xs font-black text-white">Explore Use Case</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-12">
        <div className="mx-auto max-w-[1180px] px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-black sm:text-3xl">Why Apply for WhatsApp Business API with {appName}?</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {whyApply.map(([Icon, title, text]) => (
              <div key={String(title)} className="rounded-xl bg-white p-6 shadow-lg shadow-slate-950/5">
                <Icon className="mx-auto h-8 w-8 text-green-600" />
                <h3 className="mt-4 font-black text-slate-950">{String(title)}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{String(text)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-[1180px] px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-black sm:text-3xl">Hear it from our Customers!</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {testimonials.map(([name, role, quote]) => (
              <div key={name} className="rounded-xl bg-white p-6 shadow-xl shadow-slate-950/8 ring-1 ring-slate-100">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-xl font-black text-green-700">{name[0]}</div>
                <h3 className="mt-4 font-black text-slate-950">{name}</h3>
                <p className="text-xs font-semibold text-slate-500">{role}</p>
                <p className="mt-4 text-sm leading-6 text-slate-600">{quote}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-12">
        <div className="mx-auto max-w-[1180px] px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-black sm:text-3xl">How brands are growing 5x with WhatsApp Business API</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {growthCards.map(([title, text]) => (
              <div key={title} className="rounded-xl bg-white p-6 shadow-lg shadow-slate-950/5">
                <TrendingUp className="mx-auto h-8 w-8 text-green-600" />
                <h3 className="mt-4 font-black text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                <Link href="/case-studies" className="mt-4 inline-flex rounded-md bg-green-500 px-4 py-2 text-xs font-black text-white">Explore Case Study</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-green-100 py-8">
        <div className="mx-auto flex max-w-[1180px] flex-col items-center justify-between gap-4 px-4 sm:px-6 md:flex-row lg:px-8">
          <h2 className="text-2xl font-black text-slate-950">Drive 3x Revenue with WhatsApp</h2>
          <div className="flex gap-3">
            <Link href="/demo" className="rounded-md border border-slate-900 bg-white px-5 py-3 text-sm font-black text-slate-950">Book a Demo</Link>
            <Link href="/signup" className="rounded-md bg-green-500 px-5 py-3 text-sm font-black text-white">Get FREE WhatsApp API</Link>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-black sm:text-3xl">WhatsApp Business API FAQs</h2>
          <div className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {faqs.map((question) => (
              <details key={question} className="p-5">
                <summary className="cursor-pointer list-none text-sm font-black text-slate-950">{question}</summary>
                <p className="mt-3 text-sm leading-6 text-slate-600">{appName} helps you apply, connect, and use WhatsApp Business API with broadcasts, templates, automation, analytics, and live chat workflows.</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
