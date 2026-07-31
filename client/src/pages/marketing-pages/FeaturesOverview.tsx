import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Bot, CalendarCheck, CheckCircle2, ClipboardList, FileText, Globe2, Headphones, MessageCircle, MousePointer2, Send, ShieldCheck, ShoppingCart, Sparkles, Star, Users, Zap } from "lucide-react";
import { AppSettings } from "@/types/types";
import { ArrowRight, CheckList, FaqBlock, LogoStrip, MiniDashboard, RevenueCta, Testimonials } from "./featureShared";

const heroFeatures = ["Smooth chatbot to human transfer", "Smart audience segmentation", "Drag and drop chatbots"];
const platformTabs = ["AI WhatsApp Agents", "Broadcast Unlimited", "Chatbot Flow Builder", "WhatsApp Forms", "WhatsApp Payments", "Multi-agent Live Chat", "Click-to-WhatsApp Ads", "AI Ads Manager", "WhatsApp Webviews", "Carousel Cards"];
const features = [
  [Bot, "AI WhatsApp Agents"], [Send, "Broadcast Unlimited Campaigns"], [MessageCircle, "Chatbot Flow Builder"], [FileText, "WhatsApp Forms"],
  [ShoppingCart, "WhatsApp Payments"], [Headphones, "Multi-Agent Live Chat"], [Zap, "Connect No-Code AI Chatbots"], [Users, "Agent Rules"],
  [MessageCircle, "Chat CRM Included"], [ShieldCheck, "FREE WhatsApp Business API"], [ClipboardList, "Import and Export Contacts"], [Send, "Send Personalized Messages"],
  [CalendarCheck, "WhatsApp Scheduler"], [FileText, "Template Messages Approvals"], [Globe2, "Carousel Cards on WhatsApp"], [MousePointer2, "Click-to-WhatsApp Ads"],
  [MousePointer2, "AI Ads Manager"], [BarIcon, "WhatsApp Click Tracking"], [Users, "Retarget Users on WhatsApp"], [Sparkles, "WhatsApp Acquisition Tools"],
  [Globe2, "WhatsApp Webviews"], [Zap, "Connect your APIs"], [ClipboardList, "Ecomm+"],
];
function BarIcon(props: React.SVGProps<SVGSVGElement>) { return <CheckCircle2 {...props} />; }
const faqs = ["What features does AiSensy offer for WhatsApp automation and marketing?", "What is WhatsApp Broadcasting in AiSensy?", "How is AiSensy's broadcasting different from regular WhatsApp forwarding?", "Does AiSensy support Click-to-WhatsApp Ads, and what benefits do they bring?", "Can I collect payments and manage transactions within WhatsApp using AiSensy?", "What is WhatsApp Webviews and how does it improve conversions?", "How do AiSensy's Basic and Pro plans differ?"];

export default function FeaturesOverviewPage() {
  const { data: settings } = useQuery<AppSettings>({ queryKey: ["/api/brand-settings"], staleTime: 1000 * 60 * 5 });
  const appName = settings?.title || "WhatsWay";

  return (
    <main className="bg-white text-slate-950">
      <section className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1fr] lg:items-center"><div><p className="text-sm font-black uppercase text-green-600">Features</p><h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight sm:text-5xl"><span className="text-green-500">Powerful Features</span> that you Need</h1><p className="mt-4 text-slate-600">{appName} covers all aspects of marketing, CRM and customer support in one place.</p><CheckList items={heroFeatures} /><Link href="/book-demo" className="mt-7 inline-flex items-center gap-2 rounded-md bg-green-500 px-5 py-3 text-sm font-black text-white">Book a Demo Now <ArrowRight className="h-4 w-4" /></Link></div><div className="rounded-2xl bg-emerald-50 p-5"><div className="rounded-xl bg-white p-5 shadow-xl"><Sparkles className="h-12 w-12 text-green-500" /><p className="mt-6 text-3xl font-black">One workspace for WhatsApp growth</p></div></div></div></section>
      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><h2 className="text-center text-3xl font-black"><span className="text-green-500">{appName}</span> - One Platform for <span className="text-green-500">Everything WhatsApp</span></h2><p className="mt-3 text-center text-slate-600">5X your revenues using {appName} marketing platform.</p><div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]"><MiniDashboard /><div className="rounded-md bg-white p-4 shadow-sm">{platformTabs.map((tab) => <div key={tab} className="border-b border-slate-100 px-3 py-3 text-sm font-bold text-slate-600 last:border-0">{tab}</div>)}</div></div></div></section>
      <LogoStrip title="Founders & Marketers love us" />
      <section className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl text-center"><h2 className="text-3xl font-black">Let's take you through a <span className="text-green-500">Power Packed Demo</span></h2><p className="mt-3 text-slate-600">See how {appName} can help your business grow 3X in this product walkthrough video.</p><div className="mt-8 flex aspect-video items-center justify-center rounded-2xl bg-slate-950 text-white"><span className="text-3xl font-black">{appName} Platform Demo</span></div></div></section>
      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><h2 className="text-center text-3xl font-black">Everything your <span className="text-green-500">WhatsApp marketing</span> runs on</h2><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{features.map(([Icon, title]) => <div key={title as string} className="rounded-md border border-slate-100 bg-white p-5 shadow-sm"><Icon className="h-7 w-7 text-green-500" /><h3 className="mt-4 font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">Use this capability to automate, engage, and convert customers on WhatsApp.</p><Link href="/auth/register" className="mt-4 inline-flex rounded-md bg-green-500 px-3 py-2 text-xs font-black text-white">Learn More</Link></div>)}</div></div></section>
      <Testimonials appName={appName} />
      <RevenueCta appName={appName} title="2,10,000+ businesses already picked a plan. Yours is waiting..." />
      <FaqBlock questions={faqs} appName={appName} />
    </main>
  );
}

