import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, Building2, CheckCircle2, ClipboardCheck, FileCheck2, Globe2, GraduationCap, Landmark, MessageCircle, Play, ShieldCheck, ShoppingCart, Sparkles, Star, Store, TicketCheck, Users } from "lucide-react";
import { AppSettings } from "@/types/types";

const industries = [
  [ShoppingCart, "WhatsApp Verification for Ecommerce", "Instantly boost customer trust and increase conversions with verified ecommerce identity."],
  [Landmark, "WhatsApp Verification for Financial Services", "Clearly differentiate your legitimate financial brand and build stronger customer confidence."],
  [GraduationCap, "WhatsApp Verification for Educational Institutions", "Give trust to students and parents receiving engagement or admission updates."],
  [BriefcaseBusiness, "WhatsApp Verification for Healthcare Providers", "Help patients recognize official appointment, report, and service communication."],
  [Store, "WhatsApp Verification for Travel Agencies", "Build trust for bookings, itinerary updates, and travel support interactions."],
  [MessageCircle, "WhatsApp Verification for Marketing Agencies", "Clearly identify your official agency account for client and campaign communication."],
  [TicketCheck, "WhatsApp Verification for Entertainment Services", "Enhance audience engagement and campaign credibility for events and creators."],
  [Users, "WhatsApp Verification for Event Planning Services", "Build confidence while sharing invitations, booking confirmations, and event updates."],
  [Building2, "WhatsApp Verification for Other Businesses", "Create a trusted brand identity for any growing business using WhatsApp."],
];
const requirements = ["WhatsApp API setup", "Complete Facebook Business / KYC verification", "5 organic PR news article", "Tier 2 or above messaging level", "2FA verification", "Notable and reputable business", "Registered business", "Approved display name", "High-quality WABA"];
const steps = ["Go to the dashboard", "Click the Apply for Blue Tick button", "Fill the form and upload documents", "Submit for verification and track status"];
const benefits = ["Business name clearly marked as verified", "Increase your message open rate by up to 70% with verified WhatsApp", "Stand out in competitive markets"];
const logos = ["Skullcandy", "Quikr", "PhysicsWallah", "HDFC", "HomeLane", "IndiaMART", "Gameskraft"];
const cases = [["COSCO", "Sports Equipment Brand"], ["give", "Donation Collection Platform"], ["Edtech Platform", "Education Platform"]];
const faqs = ["How to apply for the WhatsApp Blue Tick?", "How long does WhatsApp Blue Tick approval take?", "What happens if my WhatsApp verification request is denied?", "Does AiSensy guarantee WhatsApp blue tick verification?", "Does AiSensy guarantee WhatsApp blue tick verification?"];

export default function ProductWhatsappBlueTickPage() {
  const { data: settings } = useQuery<AppSettings>({ queryKey: ["/api/brand-settings"], staleTime: 1000 * 60 * 5 });
  const appName = settings?.title || "WhatsWay";

  return (
    <main className="bg-white text-slate-950">
      <section className="border-b border-emerald-100 bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1fr] lg:items-center">
          <div>
            <h1 className="max-w-2xl text-4xl font-black leading-tight sm:text-5xl">Get Verified with WhatsApp Blue Tick for Free</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">Win customer trust instantly. Get your business verified on WhatsApp and apply for the blue tick with expert guidance from {appName}.</p>
            <p className="mt-3 font-bold text-green-600">Powered by Official WhatsApp Business API</p>
            <div className="mt-7 flex flex-wrap gap-3"><Link href="/auth/register" className="rounded-md bg-green-500 px-5 py-3 text-sm font-black text-white">Start for FREE</Link><Link href="/book-demo" className="rounded-md border border-slate-300 px-5 py-3 text-sm font-black">Book a Demo</Link></div>
          </div>
          <div className="rounded-[2rem] bg-emerald-50 p-5"><div className="relative min-h-[360px] rounded-2xl bg-white p-6 shadow-xl"><div className="mx-auto flex h-72 w-44 items-center justify-center rounded-[2rem] bg-slate-950 p-3"><div className="h-full w-full rounded-[1.5rem] bg-green-50 p-3"><p className="rounded-lg bg-white p-3 text-sm font-bold">Your official business profile</p><p className="ml-auto mt-4 rounded-lg bg-green-500 p-3 text-sm font-black text-white">Thank You!</p></div></div><div className="absolute right-8 top-8 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-white shadow-xl"><BadgeCheck className="h-8 w-8" /></div><div className="absolute bottom-8 left-8 rounded-xl bg-yellow-50 px-4 py-3 shadow"><p className="font-black">Verified account</p><p className="text-sm text-slate-600">Trusted brand profile</p></div></div></div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1fr] lg:items-center"><div className="rounded-2xl bg-slate-50 p-5"><div className="rounded-xl bg-white p-5 shadow-xl"><div className="flex h-28 items-center justify-center"><BadgeCheck className="h-20 w-20 text-blue-500" /></div><p className="mt-4 rounded-lg bg-green-50 p-3 text-center font-bold">Verified badge beside your brand name</p></div></div><div><h2 className="text-3xl font-black">What is WhatsApp Blue Tick?</h2><p className="mt-4 text-lg leading-8 text-slate-600">The WhatsApp Blue Tick identifies official business accounts that appear more trustworthy in customer chats. It helps customers instantly recognize that the account is authentic and safe to communicate with.</p></div></div></section>

      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="grid gap-8 lg:grid-cols-[0.8fr_1fr] lg:items-center"><div><h2 className="text-3xl font-black">See Why Verified WhatsApp Accounts Win More Customers</h2><p className="mt-4 leading-7 text-slate-600">A verified badge can reduce confusion and make your official account easier to trust before a user starts a conversation.</p></div><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-white p-5 shadow-sm"><BadgeCheck className="h-8 w-8 text-blue-500" /><p className="mt-4 font-black">Verified WhatsApp profile</p></div><div className="rounded-2xl bg-white p-5 shadow-sm"><ShieldCheck className="h-8 w-8 text-slate-500" /><p className="mt-4 font-black">Regular business profile</p></div></div></div><div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{industries.map(([Icon, title, text]) => <div key={title as string} className="rounded-md border border-slate-100 bg-white p-5 shadow-sm"><Icon className="h-7 w-7 text-green-500" /><h3 className="mt-4 font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div>)}</div></div></section>

      <section className="px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><h2 className="text-center text-2xl font-black sm:text-3xl">Requirements to apply for WhatsApp Blue Tick</h2><p className="mx-auto mt-3 max-w-4xl text-center text-slate-600">Creating the blue tick involves meeting eligibility checks, business verification, and quality standards.</p><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{requirements.map((item) => <div key={item} className="rounded-md border border-slate-100 bg-white p-5 shadow-sm"><CheckCircle2 className="h-6 w-6 text-green-500" /><h3 className="mt-4 font-black">{item}</h3><p className="mt-2 text-sm leading-6 text-slate-600">Make sure this requirement is completed before submitting your blue tick request.</p></div>)}</div></div></section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl"><h2 className="text-center text-2xl font-black sm:text-3xl">How to apply for WhatsApp Blue Tick via {appName}</h2><p className="text-center text-slate-600">Follow these steps to apply for WhatsApp Blue Tick.</p><div className="mx-auto mt-8 flex aspect-video max-w-4xl items-center justify-center rounded-2xl bg-slate-950 text-white"><Play className="h-16 w-16" /></div><div className="mt-10 grid gap-6 md:grid-cols-2">{steps.map((step, index) => <div key={step} className="rounded-md border border-slate-100 bg-white p-6 shadow-sm"><p className="text-4xl font-black text-slate-100">#{index + 1}</p><h3 className="-mt-4 font-black">{step}</h3><p className="mt-2 text-sm leading-6 text-slate-600">Complete this step in the {appName} dashboard and continue the application process.</p><Link href="/auth/register" className="mt-4 inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-black">Go to Dashboard</Link></div>)}</div></div></section>

      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.75fr_1fr]"><div><h2 className="text-3xl font-black">WhatsApp Blue Tick</h2><p className="mt-3 text-slate-600">Here is why getting verified on WhatsApp is a game changer for your business.</p><Link href="/auth/register" className="mt-5 inline-flex rounded-md bg-green-500 px-4 py-2 text-sm font-black text-white">Learn More</Link></div><div className="grid gap-5 md:grid-cols-3">{benefits.map((benefit) => <div key={benefit} className="rounded-md bg-white p-5 shadow-sm"><Sparkles className="h-7 w-7 text-green-500" /><h3 className="mt-4 font-black">{benefit}</h3><p className="mt-2 text-sm text-slate-600">Improve customer trust and brand recognition with an official profile.</p></div>)}</div></div></section>

      <section className="px-4 py-12 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl text-center"><p className="text-sm font-bold text-slate-500">Trusted by 210,000+ Businesses across 68+ Countries</p><div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">{logos.map((logo) => <div key={logo} className="rounded-md border border-slate-100 px-3 py-3 text-sm font-black text-slate-500 shadow-sm">{logo}</div>)}</div></div></section>

      <section className="px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><h2 className="text-3xl font-black">How Brands use {appName} for WhatsApp Marketing</h2><div className="mt-8 grid gap-5 md:grid-cols-3">{cases.map(([brand, type]) => <div key={brand} className="rounded-md border border-slate-100 bg-white p-6 shadow-sm"><h3 className="text-2xl font-black text-red-500">{brand}</h3><p className="mt-5 font-black">{type}</p><p className="mt-2 text-sm leading-6 text-slate-600">Used WhatsApp trust and engagement workflows to improve customer response.</p><Link href="/resources/case-studies" className="mt-5 inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-black">Explore Case Study <ArrowRight className="ml-2 h-4 w-4" /></Link></div>)}</div></div></section>

      <section className="px-4 py-14 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl"><h2 className="text-2xl font-black">WhatsApp Verified Blue Tick FAQs</h2><p className="mt-2 text-sm text-slate-500">Frequently asked questions answered</p><div className="mt-6 divide-y divide-slate-100 rounded-md border border-slate-100 bg-white">{faqs.map((faq, index) => <details key={`${faq}-${index}`} className="p-5"><summary className="cursor-pointer list-none font-bold">{faq}</summary><p className="mt-3 text-sm leading-6 text-slate-600">{appName} can help you prepare and submit the application, while final approval depends on WhatsApp policies and eligibility.</p></details>)}</div></div></section>

      <section className="bg-lime-100 px-4 py-9 sm:px-6 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between"><p className="font-bold text-slate-700">Apply for FREE WhatsApp Blue Tick with {appName}. Get started for FREE.</p><div className="flex gap-3"><Link href="/book-demo" className="rounded-md border border-slate-900 px-5 py-3 text-sm font-black">Book a Demo</Link><Link href="/auth/register" className="rounded-md bg-green-500 px-5 py-3 text-sm font-black text-white">Get Started</Link></div></div></section>
    </main>
  );
}

