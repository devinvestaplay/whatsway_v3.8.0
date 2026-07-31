import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Compass,
  FileText,
  Globe2,
  Headphones,
  HeartPulse,
  Home,
  LockKeyhole,
  MessageCircle,
  MousePointer2,
  Plane,
  Play,
  School,
  Send,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Ticket,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import { AppSettings } from "@/types/types";
import { EngagementGrid, LogoStrip, RevenueCta } from "./featureShared";

const problemFlow = [
  { icon: Compass, label: "Browser Redirections = Drop-offs", text: "Every time a user is sent to an external website, chances are they will drop off due to slow loading, webpages, and many more reasons." },
  { icon: TrendingUp, label: "Lost Sales = Lost Revenue", text: "Potential customers abandon carts because of too many steps, leading to missed opportunities and decreased conversion rates." },
  { icon: Globe2, label: "WhatsApp Webviews", text: "Keep users engaged inside WhatsApp and get more sales, bookings, and signups effortlessly." },
];
const benefits = [
  { icon: CheckCircle2, title: "Enhanced User Experience", text: "By keeping the process within WhatsApp, users enjoy a much faster and simpler experience." },
  { icon: ArrowRight, title: "Increased Conversion Rates", text: "Minimize drop-offs and boost conversions by enabling customers to complete actions inside WhatsApp." },
  { icon: BadgeCheck, title: "Streamlined Customer Support", text: "Handle order tracking, issue resolution, and live conversations without leaving WhatsApp." },
  { icon: Users, title: "Personalized Interactions", text: "Deliver tailored content and offers within the chat, improving engagement and loyalty." },
  { icon: ClipboardList, title: "Simplified Data Collection", text: "Gather customer information seamlessly through forms or screens inside WhatsApp." },
  { icon: ShieldCheck, title: "Enhanced Security & Trust", text: "Leverage WhatsApp's secure environment to build customer confidence." },
];
const useCases = [
  { icon: ShoppingCart, title: "E-commerce", text: "Customers can view and add products from multiple options inside WhatsApp." },
  { icon: Plane, title: "Travel & Tourism", text: "Provide smooth booking and itinerary experiences from inside the chat." },
  { icon: HeartPulse, title: "Healthcare", text: "Host live consultations with doctors and access medical records securely." },
  { icon: School, title: "Education", text: "Conduct quizzes, gather assignments, and share updates." },
  { icon: WalletCards, title: "Finance", text: "Enable instant loan approvals with secure embedded workflows." },
  { icon: Home, title: "Real Estate", text: "Offer immersive 3D tours and schedule visits instantly." },
  { icon: Ticket, title: "Logistics", text: "Enable tracking with dynamic updates and delivery rescheduling." },
  { icon: Star, title: "Entertainment", text: "Stream live events and sell exclusive merchandise directly in chat." },
  { icon: CalendarCheck, title: "Hospitality", text: "Provide personalized travel itineraries and concierge services." },
];

export default function FeaturesWhatsappWebviewsPage() {
  const { data: settings } = useQuery<AppSettings>({ queryKey: ["/api/brand-settings"], staleTime: 1000 * 60 * 5 });
  const appName = settings?.title || "WhatsWay";

  return (
    <main className="bg-white text-slate-950">
      <section className="border-b border-emerald-100 bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase text-green-600">Feature</p>
            <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight sm:text-5xl">
              Maximize Engagement with Native <span className="text-green-500">WhatsApp Webviews</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Keep customers engaged, reduce drop-offs, and drive more sales by seamlessly loading web pages without leaving WhatsApp.
            </p>
            <p className="mt-3 font-bold text-green-600">Powered by Official WhatsApp Business API</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/auth/register" className="rounded-md bg-green-500 px-5 py-3 text-sm font-black text-white">Talk to Sales</Link>
            </div>
          </div>
          <div className="rounded-[2rem] bg-emerald-50 p-5">
            <div className="relative min-h-[360px] rounded-2xl bg-white p-6 shadow-xl">
              <div className="absolute left-8 top-8 rounded-xl bg-white p-4 shadow"><p className="font-black">Webpage Loaded</p><p className="text-sm text-green-600">Inside WhatsApp</p></div>
              <div className="absolute bottom-8 right-8 rounded-xl bg-green-50 p-4 shadow"><p className="font-black">Ticket Booked</p></div>
              <div className="mx-auto flex h-72 w-44 items-center justify-center rounded-[2rem] bg-slate-950 p-3">
                <div className="h-full w-full rounded-[1.5rem] bg-white p-3">
                  <p className="rounded-lg bg-green-50 p-3 text-sm font-bold">Book bus ticket</p>
                  <div className="mt-4 space-y-2">{["From", "To", "Date", "Seats"].map((field) => <div key={field} className="rounded-md bg-slate-50 p-2 text-xs font-bold text-slate-500">{field}</div>)}</div>
                  <p className="mt-4 rounded-lg bg-green-500 p-2 text-center text-xs font-black text-white">Pay INR 60.00</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-black sm:text-3xl">Why Most Businesses Lose Customers on WhatsApp</h2>
          <p className="mt-3 text-lg font-black text-green-500">(And How Webviews Fix It!)</p>
          <div className="mt-10 space-y-8">
            {problemFlow.map(({ icon: Icon, label, text }, index) => (
              <div key={label} className="mx-auto max-w-xl">
                <div className="rounded-md border border-slate-100 bg-white p-6 text-left shadow-sm">
                  <Icon className="h-7 w-7 text-green-500" />
                  <h3 className="mt-4 font-black text-green-600">{label}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                </div>
                {index < problemFlow.length - 1 && <p className="mt-6 text-xs font-black uppercase text-slate-400">{index === 0 ? "Which causes" : "The Solution"}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-black">Unlock the Power of Web, Within WhatsApp</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              With WhatsApp Webviews, businesses can load rich websites or landing pages directly within WhatsApp chats.
            </p>
            <p className="mt-4 leading-7 text-slate-600">No more lost customers. Just seamless sales, support, and engagement inside WhatsApp.</p>
            <div className="mt-6 space-y-5">
              {["Open Web within WhatsApp", "Enhanced Engagement", "Increased Conversion Rates"].map((item) => <div key={item} className="flex gap-3"><CheckCircle2 className="h-6 w-6 text-green-500" /><div><h3 className="font-black">{item}</h3><p className="text-sm text-slate-600">Keep customer actions smooth and connected inside the chat.</p></div></div>)}
            </div>
            <Link href="/auth/register" className="mt-7 inline-flex rounded-md bg-green-500 px-5 py-3 text-sm font-black text-white">Talk to Sales</Link>
          </div>
          <div className="flex justify-center">
            <div className="h-[430px] w-60 rounded-[2.3rem] bg-slate-950 p-3 shadow-2xl">
              <div className="h-full rounded-[1.8rem] bg-white p-4">
                <p className="rounded-lg bg-green-50 p-3 text-sm font-bold">Webview checkout</p>
                <div className="mt-5 aspect-video rounded-xl bg-emerald-50" />
                <div className="mt-4 space-y-2">{[1, 2, 3].map((line) => <div key={line} className="h-4 rounded-full bg-slate-100" />)}</div>
                <p className="mt-5 rounded-lg bg-green-500 p-3 text-center text-xs font-black text-white">Continue</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl font-black sm:text-3xl">Powerful Benefits of WhatsApp Webviews</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map(({ icon: Icon, title, text }) => <div key={title} className="rounded-md border border-slate-100 bg-white p-6 shadow-sm"><Icon className="h-8 w-8 text-green-500" /><h3 className="mt-5 font-black">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{text}</p></div>)}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-2xl font-black sm:text-3xl">WhatsApp Webviews Use-Cases</h2>
          <p className="mx-auto mt-3 max-w-3xl text-center text-slate-600">Here is how various industries are increasing ROI and creating better user experiences with WhatsApp Webviews.</p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map(({ icon: Icon, title, text }) => <div key={title} className="rounded-md border border-slate-100 bg-white p-6 text-center shadow-sm"><Icon className="mx-auto h-7 w-7 text-green-500" /><h3 className="mt-4 font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div>)}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-black">See WhatsApp WebViews in Action</h2>
          <p className="mt-3 max-w-3xl text-slate-600">Watch how businesses simplify booking processes using native Webviews, making it as smooth and hassle-free as possible.</p>
          <div className="mt-8 flex aspect-video items-center justify-center rounded-2xl bg-slate-950 text-white">
            <div className="text-center"><p className="text-4xl font-black">Book Bus Tickets on</p><p className="mt-2 text-5xl font-black text-green-500">WhatsApp</p><Play className="mx-auto mt-6 h-14 w-14" /></div>
          </div>
        </div>
      </section>

      <EngagementGrid />
      <RevenueCta appName={appName} />
      <section className="px-4 py-10 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl text-center"><p className="text-sm font-black text-slate-600">Excellent</p><div className="mt-2 flex justify-center gap-1 text-green-500">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className="h-5 w-5 fill-current" />)}</div><p className="mt-2 text-sm text-slate-500">4.4 out of 5 based on 8080 reviews</p></div></section>
      <LogoStrip />
    </main>
  );
}

