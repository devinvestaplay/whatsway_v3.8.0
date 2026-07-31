import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeIndianRupee, Banknote, BarChart3, Bot, CheckCircle2, ClipboardList, CreditCard, FileText, Globe2, Headphones, LockKeyhole, MessageCircle, MousePointer2, ReceiptText, Send, ShieldCheck, ShoppingCart, Smartphone, Users, WalletCards } from "lucide-react";
import { AppSettings } from "@/types/types";

const paymentFeatures = [
  { icon: MessageCircle, title: "Send payment messages via live chat and chatbot flows", text: "Send payment links directly from chats, automations, and sales workflows." },
  { icon: BarChart3, title: "Track payment status and retarget effortlessly", text: "Monitor pending and completed payments, then retarget users who dropped off." },
  { icon: Users, title: "Verify payment status from user profile", text: "Check every customer payment from a unified profile view." },
  { icon: ReceiptText, title: "View all payments received in one unified dashboard", text: "Track payment confirmations and customer records in one place." },
  { icon: WalletCards, title: "Works seamlessly with Razorpay, PayU and other PGs", text: "Connect your payment gateway and start collecting payments on WhatsApp." },
];
const reasons = [
  { icon: Smartphone, title: "Convenience", text: "Customers can complete transactions within the chat window." },
  { icon: LockKeyhole, title: "Security", text: "Use trusted payment gateways and secure transaction flows." },
  { icon: ZapIcon, title: "Efficiency", text: "Reduce payment friction and improve conversion rates." },
];
function ZapIcon(props: React.SVGProps<SVGSVGElement>) { return <BadgeIndianRupee {...props} />; }
const engagement = [
  { icon: Headphones, title: "Multiple human live chat" }, { icon: Bot, title: "Chatbot flow builder" }, { icon: Users, title: "Retarget users on WhatsApp" }, { icon: Send, title: "WhatsApp scheduler" },
  { icon: ClipboardList, title: "Import, broadcast and track" }, { icon: MousePointer2, title: "Ads that click to WhatsApp" }, { icon: Globe2, title: "WhatsApp webviews" }, { icon: FileText, title: "WhatsApp forms" },
];
const logos = ["Skullcandy", "Quikr", "PhysicsWallah", "HDFC", "HomeLane", "IndiaMART", "Gameskraft"];
const stories = [
  ["COSCO", "Sports Equipment Brand", "Converted shopping interest using WhatsApp payment reminders."],
  ["give", "Donation Collection Platform", "Collected repeat donations with simple payment links."],
  ["Fintech Platform", "Edtech Platform", "Used WhatsApp payments to close faster from chat."],
];
const faqs = ["Is WhatsApp Payments secure?", "What payment methods are supported?", "How do I track payments?", "In which countries is WhatsApp Payments available?"];

export default function ProductWhatsappPaymentsPage() {
  const { data: settings } = useQuery<AppSettings>({ queryKey: ["/api/brand-settings"], staleTime: 1000 * 60 * 5 });
  const appName = settings?.title || "WhatsWay";

  return (
    <main className="bg-white text-slate-950">
      <section className="border-b border-emerald-100 bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1fr] lg:items-center">
          <div><p className="text-sm font-black uppercase text-green-600">Feature</p><h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight sm:text-5xl">WhatsApp <span className="text-green-500">Payments:</span> Collect Payments Directly within WhatsApp</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">Transform customer interactions by collecting payments directly within WhatsApp through secure payment links and automated reminders.</p><div className="mt-5 grid gap-2 text-sm font-bold text-slate-700"><span>Accept payments via UPI</span><span>Net Banking</span><span>Credit and Debit cards</span></div><div className="mt-7 flex gap-3"><Link href="/auth/register" className="rounded-md bg-green-500 px-5 py-3 text-sm font-black text-white">Start for FREE</Link><Link href="/book-demo" className="rounded-md border border-slate-300 px-5 py-3 text-sm font-black">Book a Demo</Link></div></div>
          <div className="rounded-[2rem] bg-emerald-50 p-5"><div className="relative min-h-[360px] rounded-2xl bg-white p-6 shadow-xl"><div className="absolute right-8 top-8 rounded-xl bg-green-50 p-4 shadow"><p className="text-xs font-bold text-slate-500">Payment due</p><p className="text-2xl font-black">INR 890.00</p></div><div className="absolute bottom-8 left-8 rounded-xl bg-white p-4 shadow-xl"><CreditCard className="h-8 w-8 text-green-500" /><p className="mt-3 font-black">Pay Now</p></div><div className="mx-auto flex h-72 w-44 items-center justify-center rounded-[2rem] bg-slate-950 p-3"><div className="h-full w-full rounded-[1.5rem] bg-green-50 p-3"><p className="rounded-lg bg-white p-3 text-sm font-bold">Your total is INR 1,389.00</p><p className="mt-3 rounded-lg bg-green-500 p-3 text-sm font-bold text-white">Complete payment</p></div></div></div></div>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><h2 className="text-2xl font-black sm:text-3xl">WhatsApp Payment Features ({appName} Exclusive)</h2><p className="mt-2 text-slate-600">An end-to-end shopping experience directly inside WhatsApp.</p><div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{paymentFeatures.map(({ icon: Icon, title, text }, index) => <div key={title} className={index < 2 ? "rounded-md border border-slate-100 bg-white p-6 shadow-sm lg:col-span-1" : "rounded-md border border-slate-100 bg-white p-6 shadow-sm"}><Icon className="h-8 w-8 text-green-500" /><h3 className="mt-4 font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p><div className="mt-5 rounded-xl bg-emerald-50 p-4"><div className="h-32 rounded-lg bg-white shadow-inner" /></div></div>)}</div></div></section>

      <section className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1fr] lg:items-center"><div><h2 className="text-3xl font-black">Why Use WhatsApp Payments?</h2><p className="mt-4 text-lg leading-8 text-slate-600">Whether you are running an ecommerce business or providing services, WhatsApp payments offer a secure, easy-to-use solution that fits perfectly into the customer journey.</p><div className="mt-6 space-y-5">{reasons.map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-4"><Icon className="mt-1 h-6 w-6 text-green-500" /><div><h3 className="font-black">{title}</h3><p className="text-sm leading-6 text-slate-600">{text}</p></div></div>)}</div></div><div className="rounded-2xl bg-green-50 p-5"><div className="rounded-xl bg-white p-5 shadow-xl"><Banknote className="h-12 w-12 text-green-500" /><p className="mt-4 text-3xl font-black">INR 1,389.00</p><p className="mt-2 text-slate-600">Collected inside WhatsApp with instant confirmation.</p></div></div></div></section>

      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><h2 className="text-3xl font-black">Everything You Need for WhatsApp Engagement</h2><p className="mt-2 text-slate-600">Marketing, CRM, and customer support in one place.</p><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{engagement.map(({ icon: Icon, title }) => <div key={title} className="rounded-md border border-slate-100 bg-white p-5 shadow-sm"><Icon className="h-7 w-7 text-green-500" /><h3 className="mt-4 font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">Use this feature with WhatsApp payments to improve conversion.</p><Link href="/auth/register" className="mt-4 inline-flex rounded-md bg-green-500 px-3 py-2 text-xs font-black text-white">Learn More</Link></div>)}</div></div></section>

      <section className="px-4 py-12 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl text-center"><p className="text-sm font-bold text-slate-500">Trusted by 210,000+ Businesses across 68+ Countries</p><div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">{logos.map((logo) => <div key={logo} className="rounded-md border border-slate-100 px-3 py-3 text-sm font-black text-slate-500 shadow-sm">{logo}</div>)}</div></div></section>

      <section className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><h2 className="text-3xl font-black">How Brands use {appName} for WhatsApp Marketing</h2><div className="mt-8 grid gap-5 md:grid-cols-3">{stories.map(([brand, type, text]) => <div key={brand} className="rounded-md border border-slate-100 bg-white p-6 shadow-sm"><h3 className="text-2xl font-black text-red-500">{brand}</h3><p className="mt-5 font-black">{type}</p><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p><Link href="/resources/case-studies" className="mt-5 inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-black">Explore Case Study <ArrowRight className="ml-2 h-4 w-4" /></Link></div>)}</div></div></section>

      <section className="bg-lime-100 px-4 py-9 sm:px-6 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h2 className="text-3xl font-black">Drive 3x Revenue with {appName}</h2><p className="mt-2 text-slate-700">Get started for FREE. No credit card needed.</p></div><div className="flex gap-3"><Link href="/auth/register" className="rounded-md bg-green-500 px-5 py-3 text-sm font-black text-white">Start for FREE</Link><Link href="/book-demo" className="rounded-md border border-slate-900 px-5 py-3 text-sm font-black">Book a Demo</Link></div></div></section>

      <section className="px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl"><h2 className="text-2xl font-black">FAQ</h2><p className="mt-2 text-sm text-slate-500">Frequently asked questions answered</p><div className="mt-6 divide-y divide-slate-100 rounded-md border border-slate-100 bg-white">{faqs.map((faq) => <details key={faq} className="p-5"><summary className="cursor-pointer list-none font-bold">{faq}</summary><p className="mt-3 text-sm leading-6 text-slate-600">Yes. {appName} supports secure payment workflows when connected with supported payment gateway settings.</p></details>)}</div></div></section>
    </main>
  );
}

