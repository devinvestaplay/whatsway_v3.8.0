import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BarChart3, Bot, CheckCircle2, ClipboardList, FileText, Globe2, Headphones, MessageCircle, MousePointer2, Play, Send, ShieldCheck, ShoppingCart, Sparkles, Star, Users, Workflow, Zap } from "lucide-react";
import { AppSettings } from "@/types/types";

const logos = ["Lenskart", "Quikr", "The Man Co", "HDFC", "Reliance", "Edelweiss", "Apollo"];
const smartReasons = [
  { title: "Automate 80% of support instantly", text: "Answer FAQs, qualify leads, and route customers without waiting for agents." },
  { title: "Qualify leads without lifting a finger", text: "Collect names, numbers, requirements, budgets, and purchase intent." },
  { title: "Stay active 24x7", text: "Keep conversations moving even when your team is offline." },
];
const addons = [
  { icon: ShoppingCart, title: "Turn leads into customers effortlessly", text: "Use chatbots to share products, collect details, and hand over to sales." },
  { icon: Workflow, title: "AI chatbot builder for non-techies", text: "Design drag-and-drop flows without writing code." },
  { icon: MessageCircle, title: "24x7 support and sales automation", text: "Handle common questions, pricing, bookings, and follow-ups on autopilot." },
  { icon: Globe2, title: "Seamless integrations with business tools", text: "Connect your stack and sync customer data into useful workflows." },
];
const steps = ["Create app from builder", "Create a new chatbot flow", "Design your chatbot", "Triggers and conditions", "Add livechat fallback", "Create smart delay", "Submit Meta performance", "Launch and optimize"];
const useCases = ["E-commerce", "Customer Support", "Lead Qualification", "Click-to-WhatsApp Ads", "Appointment Booking", "Order Tracking & Updates"];
const tools = ["AI Ads Manager", "AI Creative Generator", "AI WhatsApp Template Generator", "AI CTA Generator"];
const engagement = [
  { icon: Headphones, title: "Multiple human live chat" }, { icon: Bot, title: "Chatbot flow builder" }, { icon: Users, title: "Retarget users on WhatsApp" }, { icon: Send, title: "WhatsApp scheduler" },
  { icon: ClipboardList, title: "Import, broadcast and track" }, { icon: MousePointer2, title: "Ads that click to WhatsApp" }, { icon: Globe2, title: "WhatsApp webviews" }, { icon: FileText, title: "WhatsApp forms" },
];
const faqs = ["What is a WhatsApp chatbot and how does it work?", "How can a WhatsApp chatbot help my business?", "Do I need coding skills to create a WhatsApp chatbot?", "Can I integrate a WhatsApp chatbot with my existing tools?", "Can chatbots handle payments and order tracking?", "Can I get a FREE trial of WhatsApp chatbot before purchasing?"];

export default function ProductWhatsappChatbotsPage() {
  const { data: settings } = useQuery<AppSettings>({ queryKey: ["/api/brand-settings"], staleTime: 1000 * 60 * 5 });
  const appName = settings?.title || "WhatsWay";

  return (
    <main className="bg-white text-slate-950">
      <section className="border-b border-emerald-100 bg-gradient-to-b from-emerald-50/70 to-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase text-green-600">Product</p>
            <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight sm:text-5xl">Build No-code WhatsApp <span className="text-green-500">Chatbots</span> in Minutes</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">Build smart WhatsApp chatbot journeys with a drag-and-drop flow builder. Qualify leads, share catalogs, collect payments, and support customers 24x7 without writing a single line of code.</p>
            <div className="mt-7 flex flex-wrap gap-3"><Link href="/auth/register" className="rounded-md bg-green-500 px-5 py-3 text-sm font-black text-white">Start for FREE</Link><Link href="/book-demo" className="rounded-md border border-slate-300 px-5 py-3 text-sm font-black">Book a Demo</Link></div>
          </div>
          <div className="rounded-2xl bg-emerald-100 p-5 shadow-2xl shadow-emerald-100">
            <div className="grid gap-4 rounded-xl bg-white p-4 md:grid-cols-[1fr_210px]">
              <div className="space-y-3 rounded-lg bg-slate-50 p-4">{["Welcome message", "Ask requirement", "Send product card", "Collect payment link"].map((item, index) => <div key={item} className="rounded-md bg-white p-3 text-sm font-bold shadow-sm"><span className="mr-2 text-green-500">#{index + 1}</span>{item}</div>)}</div>
              <div className="rounded-[1.5rem] bg-slate-950 p-3"><div className="h-full rounded-[1.2rem] bg-green-50 p-3"><p className="rounded-lg bg-white p-3 text-sm font-bold">Hi, show me best offers</p><p className="ml-auto mt-3 rounded-lg bg-green-500 p-3 text-sm font-bold text-white">Sure. Pick a category.</p></div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 text-center sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl"><h2 className="text-2xl font-black sm:text-3xl">Why Build Smart WhatsApp Chatbots with {appName}</h2><p className="mx-auto mt-3 max-w-3xl text-slate-600">Stay ready to close more conversations across sales, support, and commerce.</p><div className="mt-8 grid gap-5 md:grid-cols-3">{smartReasons.map((item) => <div key={item.title} className="rounded-md border border-slate-100 bg-white p-5 shadow-sm"><Sparkles className="mx-auto h-7 w-7 text-green-500" /><h3 className="mt-4 font-black">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p></div>)}</div></div></section>

      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><h2 className="text-center text-2xl font-black sm:text-3xl">Add-on Feature</h2><p className="mx-auto mt-3 max-w-3xl text-center text-slate-600">Unlock automation along with integrations, live chat, catalogs, and payments.</p><div className="mt-8 grid gap-5 md:grid-cols-2">{addons.map(({ icon: Icon, title, text }) => <div key={title} className="rounded-md border border-slate-100 bg-white p-6 shadow-sm"><Icon className="h-8 w-8 text-green-500" /><h3 className="mt-4 font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p><div className="mt-5 rounded-xl bg-emerald-50 p-4"><div className="h-28 rounded-lg bg-white shadow-inner" /></div></div>)}</div></div></section>

      <section className="px-4 py-12 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl text-center"><h2 className="text-2xl font-black">Founders & Marketers Love us</h2><div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">{logos.map((logo) => <div key={logo} className="rounded-md border border-slate-100 px-3 py-3 text-sm font-black text-slate-500 shadow-sm">{logo}</div>)}</div></div></section>

      <section className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl"><h2 className="text-center text-2xl font-black sm:text-3xl">How It Works</h2><p className="text-center text-slate-600">Simple steps to create your first chatbot with {appName}.</p><div className="mt-10 grid gap-6 md:grid-cols-2">{steps.map((step, index) => <div key={step} className="rounded-md border border-slate-100 bg-white p-5 shadow-sm"><p className="text-4xl font-black text-slate-100">#{index + 1}</p><h3 className="-mt-4 font-black">{step}</h3><p className="mt-2 text-sm leading-6 text-slate-600">Configure this step from the dashboard and preview your WhatsApp flow instantly.</p><div className="mt-4 rounded-xl bg-slate-50 p-4"><div className="h-24 rounded-lg bg-white" /></div></div>)}</div></div></section>

      <section className="bg-emerald-50 px-4 py-12 text-center sm:px-6 lg:px-8"><h2 className="text-3xl font-black">Yes, it's that easy!</h2><p className="mt-2 text-slate-600">Create your first chatbot in a few minutes.</p><Link href="/auth/register" className="mt-5 inline-flex rounded-md bg-green-500 px-5 py-3 text-sm font-black text-white">Create Flow Builder <ArrowRight className="ml-2 h-4 w-4" /></Link></section>

      <section className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.75fr_1fr]"><div><h2 className="text-2xl font-black">WhatsApp Chatbot Use Cases</h2><p className="mt-3 text-slate-600">Popular use cases for WhatsApp chatbots across industries.</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{useCases.map((item) => <div key={item} className="rounded-md border border-slate-100 bg-white p-5 shadow-sm"><CheckCircle2 className="h-6 w-6 text-green-500" /><h3 className="mt-3 font-black">{item}</h3><p className="mt-2 text-sm text-slate-600">Automate this workflow with guided chatbot journeys.</p></div>)}</div></div></section>

      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2 lg:items-center"><div><p className="text-sm font-black uppercase text-green-600">Free AI tools</p><h2 className="mt-2 text-3xl font-black">AI Tools to Supercharge WhatsApp Marketing</h2><div className="mt-5 space-y-3">{tools.map((tool) => <div key={tool} className="flex items-center gap-3 rounded-md bg-white p-3 font-bold shadow-sm"><Zap className="h-5 w-5 text-green-500" />{tool}</div>)}</div></div><div className="rounded-2xl bg-green-100 p-5"><div className="rounded-xl bg-white p-5 shadow-xl"><BarChart3 className="h-12 w-12 text-green-500" /><p className="mt-4 text-2xl font-black">75K leads managed</p><p className="text-slate-600">Campaigns, chatbots, and analytics in one place.</p></div></div></div></section>

      <section className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl"><h2 className="text-center text-2xl font-black sm:text-3xl">Hear it from our Customers!</h2><div className="mt-8 grid gap-5 md:grid-cols-3">{["Priya Oberoi", "Akash Jain", "Ankita Mehra"].map((name) => <div key={name} className="rounded-md border border-slate-100 p-6 text-center shadow-sm"><div className="mx-auto h-16 w-16 rounded-full bg-green-100" /><h3 className="mt-4 font-black">{name}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{appName} helped our team respond faster and convert more WhatsApp leads.</p></div>)}</div></div></section>

      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><h2 className="text-center text-2xl font-black sm:text-3xl">Everything You Need for WhatsApp Engagement</h2><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{engagement.map(({ icon: Icon, title }) => <div key={title} className="rounded-md border border-slate-100 bg-white p-5 shadow-sm"><Icon className="h-7 w-7 text-green-500" /><h3 className="mt-4 font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">Connect this feature with chatbots to improve response and conversion.</p><Link href="/auth/register" className="mt-4 inline-flex rounded-md bg-green-500 px-3 py-2 text-xs font-black text-white">Learn More</Link></div>)}</div></div></section>

      <section className="px-4 py-10 sm:px-6 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h2 className="text-2xl font-black">Ready to get Started?</h2><p className="mt-2 text-slate-600">Create your first chatbot and start selling over WhatsApp.</p></div><Link href="/auth/register" className="rounded-md bg-green-500 px-5 py-3 text-sm font-black text-white">Start Your Builder</Link></div></section>
      <section className="px-4 pb-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl"><h2 className="text-2xl font-black">FAQ</h2><div className="mt-6 divide-y divide-slate-100 rounded-md border border-slate-100">{faqs.map((faq) => <details key={faq} className="p-5"><summary className="cursor-pointer list-none font-bold">{faq}</summary><p className="mt-3 text-sm text-slate-600">Yes. {appName} is designed to make this workflow simple for growing teams.</p></details>)}</div></div></section>
    </main>
  );
}

