import { Link } from "wouter";
import { LucideIcon, ArrowRight, Bot, CalendarCheck, CheckCircle2, ClipboardList, FileText, Globe2, Headphones, MessageCircle, MousePointer2, Send, Users } from "lucide-react";

export const featureLogos = ["Skullcandy", "Quikr", "PhysicsWallah", "HDFC", "HomeLane", "IndiaMART", "Gameskraft"];

export const engagementTools: Array<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: Headphones, title: "Multiple Human Live Chat", text: "Enable multiple agents to manage customer conversations from one inbox." },
  { icon: Bot, title: "Chatbot Flow Builder", text: "Build no-code automations that answer, qualify, and route customers." },
  { icon: Users, title: "Retarget Users on WhatsApp", text: "Create retargeting campaigns for users who interacted with your brand." },
  { icon: Send, title: "WhatsApp Scheduler", text: "Schedule broadcasts and reminders for the right time." },
  { icon: ClipboardList, title: "Import, Broadcast & Track", text: "Upload contacts, send campaigns, and track performance." },
  { icon: MousePointer2, title: "Ads that Click to WhatsApp", text: "Run ads that open direct WhatsApp conversations." },
  { icon: Globe2, title: "WhatsApp Webviews", text: "Create web experiences that open inside WhatsApp." },
  { icon: FileText, title: "WhatsApp Forms", text: "Capture leads, bookings, and structured data natively." },
];

export function LogoStrip({ title = "Founders & Marketers Love us" }: { title?: string }) {
  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl text-center">
        <h2 className="text-2xl font-black">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">Trusted by 210,000+ businesses across 68+ countries</p>
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {featureLogos.map((logo) => <div key={logo} className="rounded-md border border-slate-100 bg-white px-3 py-3 text-sm font-black text-slate-500 shadow-sm">{logo}</div>)}
        </div>
      </div>
    </section>
  );
}

export function EngagementGrid() {
  return (
    <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-2xl font-black sm:text-3xl">Everything You Need for WhatsApp Engagement</h2>
        <p className="mt-2 text-center text-slate-600">Marketing, CRM and customer support in one place.</p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {engagementTools.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-md border border-slate-100 bg-white p-5 shadow-sm">
              <Icon className="h-7 w-7 text-green-500" />
              <h3 className="mt-4 font-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              <Link href="/auth/register" className="mt-4 inline-flex rounded-md bg-green-500 px-3 py-2 text-xs font-black text-white">Learn More</Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Testimonials({ appName }: { appName: string }) {
  return (
    <section className="px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl text-center">
        <h2 className="text-2xl font-black sm:text-3xl">Hear it from our Customers!</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {['Priya Ostwal', 'Akash Jain', 'Ankita Marya'].map((name) => (
            <div key={name} className="rounded-md border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mx-auto h-16 w-16 rounded-full bg-green-100" />
              <h3 className="mt-4 font-black">{name}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{appName} helped our team simplify WhatsApp operations and improve conversions.</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FaqBlock({ title = "FAQ", questions, appName }: { title?: string; questions: string[]; appName: string }) {
  return (
    <section className="px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-2xl font-black">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">Frequently asked questions answered</p>
        <div className="mt-6 divide-y divide-slate-100 rounded-md border border-slate-100 bg-white">
          {questions.map((faq) => (
            <details key={faq} className="p-5">
              <summary className="cursor-pointer list-none font-bold">{faq}</summary>
              <p className="mt-3 text-sm leading-6 text-slate-600">{appName} supports this workflow with official WhatsApp Business API powered tools for growing teams.</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function RevenueCta({ appName, title = "Drive 3x Revenue with AiSensy" }: { appName: string; title?: string }) {
  return (
    <section className="bg-lime-100 px-4 py-9 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div><h2 className="text-3xl font-black">{title.replace("AiSensy", appName)}</h2><p className="mt-2 text-slate-700">Get started for FREE. No credit card needed.</p></div>
        <div className="flex gap-3"><Link href="/auth/register" className="rounded-md bg-green-500 px-5 py-3 text-sm font-black text-white">Start for FREE</Link><Link href="/book-demo" className="rounded-md border border-slate-900 px-5 py-3 text-sm font-black">Book a Demo</Link></div>
      </div>
    </section>
  );
}

export function CheckList({ items }: { items: string[] }) {
  return <div className="mt-5 space-y-3">{items.map((item) => <div key={item} className="flex gap-3 text-sm font-bold text-slate-700"><CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />{item}</div>)}</div>;
}

export function MiniDashboard() {
  return <div className="rounded-2xl bg-emerald-50 p-5"><div className="rounded-xl bg-white p-5 shadow-xl"><div className="grid gap-3">{['Broadcast sent', 'Messages read', 'Replies received', 'Conversions'].map((item, index) => <div key={item} className="flex items-center justify-between rounded-md bg-slate-50 p-3"><span className="text-sm font-bold text-slate-600">{item}</span><span className="font-black text-green-600">{['85%', '10,330', '1,441', '26%'][index]}</span></div>)}</div></div></div>;
}

export { ArrowRight };
