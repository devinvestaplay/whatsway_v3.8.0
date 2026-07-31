import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileText,
  Globe2,
  MessageCircle,
  PackageCheck,
  Send,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
  Workflow,
  Zap,
} from "lucide-react";
import { AppSettings } from "@/types/types";
import { FaqBlock, LogoStrip } from "./featureShared";

const catalogBenefits = [
  "Professional storefront",
  "Faster orders",
  "AI automation",
];
const wabaBenefits = [
  "Scalability",
  "Automation",
  "Advanced analytics",
];
const catalogFlow = [
  { icon: MessageCircle, title: "Display product catalogue within chat" },
  { icon: ShoppingCart, title: "View products and add to cart" },
  { icon: ClipboardList, title: "Proceed to checkout and place order" },
  { icon: CreditCard, title: "Complete payment via WhatsApp" },
];
const enableSteps = [
  "Create an AiSensy account and apply for WhatsApp Business API",
  "Unlock Flow Builder",
  "Connect your Facebook Business Account",
  "Link your catalog to WhatsApp",
  "Go to Product and add the listed products",
  "Set up your trigger keywords or AI",
  "Save and activate your flow",
];
const agentUseCases = [
  "Answer product questions in natural language",
  "Recommend items based on user intent",
  "Share catalog items and collect purchase interest",
  "Escalate to a human agent when needed",
];
const faqs = [
  "What is better: to create a WhatsApp Catalog via the WhatsApp Business App or API?",
  "How does integrating a product catalog with a WhatsApp chatbot benefit customer support?",
  "Can I sell digital products using the WhatsApp Catalog?",
  "How does integrating a product catalog with a WhatsApp chatbot benefit customer support?",
  "Are there any limits on the number of items I can add to my WhatsApp Catalog?",
  "Can I integrate payment options with my WhatsApp Catalog?",
  "How does integrating a product catalog with an AI Agent benefit customer support?",
];

export default function FeaturesWhatsappCatalogPage() {
  const { data: settings } = useQuery<AppSettings>({ queryKey: ["/api/brand-settings"], staleTime: 1000 * 60 * 5 });
  const appName = settings?.title || "WhatsWay";

  return (
    <main className="bg-white text-slate-950">
      <section className="border-b border-emerald-100 bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase text-green-600">Feature</p>
            <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight sm:text-5xl">
              <span className="text-green-500">WhatsApp Catalog:</span> Sell your Products on WhatsApp
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Create professional WhatsApp catalogs, automate orders with AI, and turn every conversation into a sale, all in one place with {appName}.
            </p>
            <p className="mt-3 font-bold text-green-600">Powered by Official WhatsApp Business API</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/auth/register" className="rounded-md bg-green-500 px-5 py-3 text-sm font-black text-white">Start for FREE</Link>
              <Link href="/book-demo" className="rounded-md border border-slate-300 px-5 py-3 text-sm font-black">Book a Demo</Link>
            </div>
          </div>
          <div className="rounded-[2rem] bg-emerald-50 p-5">
            <div className="grid gap-4 rounded-2xl bg-white p-5 shadow-xl md:grid-cols-[1fr_190px]">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="aspect-video rounded-xl bg-green-100" />
                <p className="mt-4 text-2xl font-black">Catalog orders</p>
                <p className="mt-2 text-sm text-slate-600">Browse, add to cart, and checkout.</p>
              </div>
              <div className="rounded-[1.5rem] bg-slate-950 p-3">
                <div className="h-full rounded-[1.2rem] bg-white p-3">
                  <p className="font-black">Catalog</p>
                  {["Leather Bag", "Sneakers", "Premium Watch"].map((item) => <div key={item} className="mt-3 rounded-lg bg-green-50 p-2 text-xs font-bold">{item}</div>)}
                  <p className="mt-4 rounded-md bg-green-500 p-2 text-center text-xs font-black text-white">View Cart</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LogoStrip />

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1fr] lg:items-center">
          <div className="rounded-2xl bg-slate-50 p-5">
            <div className="grid gap-4 rounded-xl bg-white p-5 shadow-xl sm:grid-cols-3">
              {[ShoppingBag, ShoppingCart, CreditCard].map((Icon, index) => <div key={index} className="rounded-lg bg-emerald-50 p-4"><Icon className="h-8 w-8 text-green-500" /><div className="mt-5 h-24 rounded-md bg-white" /></div>)}
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black">What is a WhatsApp Catalog?</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              WhatsApp Catalog allows businesses to create and share catalogs of their products and services directly through WhatsApp. Customers can browse products, ask questions, and even make purchase decisions without leaving WhatsApp.
            </p>
            <div className="mt-6 space-y-4">
              {catalogBenefits.map((item) => <div key={item} className="flex gap-3"><CheckCircle2 className="h-6 w-6 text-green-500" /><div><h3 className="font-black">{item}</h3><p className="text-sm text-slate-600">Improve catalog discovery and shopping inside WhatsApp conversations.</p></div></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_0.85fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-black">Catalog via WhatsApp Business API Account (WABA)?</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">If you are running a larger ecommerce or retail store, WhatsApp Business API adds automation, team workflows, and scale to catalog selling.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {wabaBenefits.map((item) => <div key={item} className="rounded-md bg-white p-4 shadow-sm"><BadgeCheck className="h-6 w-6 text-green-500" /><h3 className="mt-3 font-black">{item}</h3><p className="mt-2 text-sm text-slate-600">Grow catalog sales with reliable API-powered workflows.</p></div>)}
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm"><div className="aspect-video rounded-xl bg-emerald-50" /><div className="mt-4 h-20 rounded-xl bg-slate-50" /></div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-center text-2xl font-black sm:text-3xl">Share, Engage & Sell using WhatsApp Catalogues</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {catalogFlow.map(({ icon: Icon, title }) => <div key={title} className="rounded-md bg-emerald-50 p-5 text-center"><Icon className="mx-auto h-8 w-8 text-green-500" /><h3 className="mt-4 font-black">{title}</h3><div className="mx-auto mt-5 h-48 w-28 rounded-[1.5rem] bg-slate-950 p-2"><div className="h-full rounded-[1.2rem] bg-white" /></div></div>)}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-black sm:text-3xl">How to Enable WhatsApp Catalog via {appName}</h2>
          <p className="mt-3 text-center text-slate-600">Steps to enable WhatsApp Catalog on your official WhatsApp Business API.</p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {enableSteps.map((step, index) => <div key={step} className="rounded-md border border-slate-100 bg-white p-6 shadow-sm"><p className="text-5xl font-black text-slate-100">#{index + 1}</p><h3 className="-mt-5 font-black">{step}</h3><p className="mt-2 text-sm leading-6 text-slate-600">Complete this action inside the {appName} dashboard and continue to the next setup step.</p><div className="mt-4 h-28 rounded-xl bg-emerald-50" /><Link href="/auth/register" className="mt-4 inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-black">Learn More</Link></div>)}
          </div>
        </div>
      </section>

      <section className="bg-emerald-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 rounded-2xl bg-white p-6 shadow-sm lg:grid-cols-[0.9fr_1fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase text-green-600">Take it further</p>
            <h2 className="mt-2 text-3xl font-black">Take it Further with AI Agents</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">Connect your WhatsApp Catalog to an AI agent and automate the entire shopping experience. Agents understand customer requirements, show relevant catalog items, and escalate when needed.</p>
            <div className="mt-6 space-y-3">{agentUseCases.map((item) => <div key={item} className="flex gap-3 text-sm font-bold text-slate-700"><Sparkles className="h-5 w-5 text-green-500" />{item}</div>)}</div>
            <Link href="/features/ai-whatsapp-agents" className="mt-6 inline-flex rounded-md bg-green-500 px-5 py-3 text-sm font-black text-white">Build Your AI Agent</Link>
          </div>
          <div className="rounded-2xl bg-green-50 p-5"><div className="rounded-xl bg-white p-5 shadow-xl"><Bot className="h-14 w-14 text-green-500" /><h3 className="mt-4 text-2xl font-black">AI Agent Builder for WhatsApp</h3><div className="mt-5 grid gap-3">{["AI Assistant", "Catalog Search", "Payment Match"].map((item) => <div key={item} className="rounded-md bg-emerald-50 p-3 font-bold">{item}</div>)}</div></div></div>
        </div>
      </section>

      <section className="bg-lime-100 px-4 py-9 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div><h2 className="text-3xl font-black">Yes, it's that easy!</h2><p className="mt-2 text-slate-700">Unlock the Flow Builder in {appName} and start selling products on WhatsApp instantly.</p></div>
          <Link href="/auth/register" className="rounded-md bg-green-500 px-5 py-3 text-sm font-black text-white">Unlock Flow Builder</Link>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl text-center"><p className="text-sm font-black text-slate-600">Excellent</p><div className="mt-2 flex justify-center gap-1 text-green-500">{[1,2,3,4,5].map((star) => <Star key={star} className="h-5 w-5 fill-current" />)}</div><p className="mt-2 text-sm text-slate-500">4.4 out of 5 based on 8080 reviews</p></div></section>

      <FaqBlock title="FAQ" questions={faqs} appName={appName} />
    </main>
  );
}

