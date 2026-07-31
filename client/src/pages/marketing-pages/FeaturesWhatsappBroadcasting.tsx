import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Bot, CheckCircle2, ClipboardList, Globe2, Headphones, MessageCircle, MousePointer2, Send, ShieldCheck, Users, Zap } from "lucide-react";
import { AppSettings } from "@/types/types";
import { CheckList, EngagementGrid, FaqBlock, LogoStrip, RevenueCta, Testimonials } from "./featureShared";

const stats = ["46% conversion", "45-28% click rates", "2.60Bn+ users", "70% engagement"];
const keyFeatures = ["Import contacts and broadcast unlimited WhatsApp messages", "Pre-approved message templates", "Advanced audience segmentation", "Message personalization", "Carousel cards and interactive button messages", "Campaign scheduling", "Real-time analytics", "Click tracking and campaign reports", "Integrations with Shopify, Zapier, Razorpay and CRMs"];
const steps = ["Enter platform", "Select Contact section and import your contacts", "Create campaign", "Segment your audience", "Schedule or send broadcast", "Monitor performance"];
const faqs = ["What is broadcast in WhatsApp?", "What is a WhatsApp Broadcast list?", "How many contacts can be added to a WhatsApp Broadcast?", "How to increase the WhatsApp Broadcast limit?", "What if any business crosses the daily WhatsApp Broadcast limit?", "How to send unlimited messages on WhatsApp?", "Is there a limit on WhatsApp Business API number getting blocked?", "Can I integrate AiSensy with other platforms for bulk messaging automation?", "How much does it cost to send bulk WhatsApp messages?"];

export default function FeaturesWhatsappBroadcastingPage() {
  const { data: settings } = useQuery<AppSettings>({ queryKey: ["/api/brand-settings"], staleTime: 1000 * 60 * 5 });
  const appName = settings?.title || "WhatsWay";
  return (
    <main className="bg-white text-slate-950">
      <section className="border-b border-emerald-100 bg-white px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1fr] lg:items-center"><div><p className="text-sm font-black uppercase text-green-600">Feature</p><h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight sm:text-5xl">Send Bulk WhatsApp Broadcast <span className="text-green-500">(Officially)</span> via WhatsApp Business API</h1><p className="mt-5 text-lg leading-8 text-slate-600">Broadcast bulk WhatsApp messages to opted-in users with approved templates, analytics, personalization, and official API safeguards.</p><p className="mt-3 font-bold text-green-600">Powered by Official WhatsApp Business API</p><div className="mt-7 flex gap-3"><Link href="/auth/register" className="rounded-md bg-green-500 px-5 py-3 text-sm font-black text-white">Start for FREE</Link><Link href="/book-demo" className="rounded-md border border-slate-300 px-5 py-3 text-sm font-black">Book a Demo</Link></div></div><div className="rounded-2xl bg-emerald-50 p-5"><div className="rounded-xl bg-white p-5 shadow-xl"><MessageCircle className="h-12 w-12 text-green-500" /><p className="mt-5 text-2xl font-black">Unlimited broadcast campaigns</p><div className="mt-5 space-y-3">{["Campaign sent", "Message delivered", "Customer replied"].map((x) => <div key={x} className="rounded-md bg-green-50 p-3 font-bold">{x}</div>)}</div></div></div></div></section>
      <section className="bg-lime-50 px-4 py-12 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl"><h2 className="text-center text-2xl font-black sm:text-3xl">Why WhatsApp Marketing in 2026?</h2><div className="mt-6 grid gap-3 sm:grid-cols-4">{stats.map((s) => <div key={s} className="rounded-md bg-white p-4 text-center font-black shadow-sm">{s}</div>)}</div></div></section>
      <section className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><h2 className="text-3xl font-black">WhatsApp Broadcast: Key Features</h2><p className="mt-2 text-slate-600">All features a WhatsApp broadcast, automation, engagement, and acquisition needs.</p><div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{keyFeatures.map(({ icon: Icon, title }) => <div key={title} className="rounded-md border border-slate-100 bg-white p-6 shadow-sm"><Icon className="h-8 w-8 text-green-500" /><h3 className="mt-4 font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">Manage this broadcast capability from one simple dashboard.</p><div className="mt-5 h-28 rounded-xl bg-emerald-50" /></div>)}</div></div></section>
      <LogoStrip />
      <section className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl text-center"><h2 className="text-3xl font-black">How to send WhatsApp Broadcast without getting your number blocked</h2><p className="mt-3 text-slate-600">Step-by-step process of sending WhatsApp messages safely and officially.</p><div className="mt-8 flex aspect-video items-center justify-center rounded-2xl bg-slate-950 text-white"><span className="text-2xl font-black">Broadcast Unlimited Messages</span></div></div></section>
      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl"><h2 className="text-center text-2xl font-black sm:text-3xl">How to send Bulk WhatsApp Broadcast Messages with {appName}</h2><div className="mt-10 grid gap-6 md:grid-cols-2">{steps.map((step, index) => <div key={step} className="rounded-md bg-white p-6 shadow-sm"><p className="text-5xl font-black text-slate-100">#{index + 1}</p><h3 className="-mt-5 font-black">{step}</h3><p className="mt-2 text-sm leading-6 text-slate-600">Follow this action in the {appName} dashboard to create and optimize your broadcast.</p><div className="mt-4 h-28 rounded-xl bg-emerald-50" /></div>)}</div></div></section>
      <EngagementGrid />
      <Testimonials appName={appName} />
      <RevenueCta appName={appName} title="Get Started Today" />
      <FaqBlock questions={faqs} appName={appName} />
    </main>
  );
}


