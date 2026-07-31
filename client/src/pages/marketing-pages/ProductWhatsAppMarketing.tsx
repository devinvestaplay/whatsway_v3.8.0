import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  Gift,
  Globe2,
  Headphones,
  Heart,
  Link2,
  MessageCircle,
  MessageSquare,
  MousePointer2,
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
  Zap,
} from "lucide-react";
import { AppSettings } from "@/types/types";

const founderLogos = ["Lenskart", "Quikr", "The Man Co", "HDFC", "Reliance", "Edelweiss", "Apollo"];

const stats = [
  { value: "98%", label: "Open rates" },
  { value: "45-60%", label: "Click rates" },
  { value: "2.60Bn+", label: "Active users" },
  { value: "70%", label: "Engagement rates" },
];

const industryTabs = ["Ecommerce", "Education", "Real Estate", "Events", "Healthcare", "Travel"];

const marketingUseCards = [
  { icon: Users, title: "Import and Segment WhatsApp users instantly", text: "Upload contacts and build audience lists for targeted WhatsApp campaigns." },
  { icon: MessageCircle, title: "Collect payments on WhatsApp", text: "Send payment links, reminders, and confirmations from WhatsApp flows." },
  { icon: MousePointer2, title: "Run click-to-WhatsApp ads", text: "Bring ad leads from Facebook and Instagram directly into WhatsApp." },
  { icon: Bot, title: "Build no-code WhatsApp chatbots in minutes", text: "Create automated flows for support, lead capture, and follow-ups." },
  { icon: Send, title: "Send automated CTA based notifications", text: "Trigger order, payment, shipping, and reminder messages with CTA buttons." },
  { icon: ShieldCheck, title: "Get official WhatsApp blue tick verification", text: "Build trust with customers through a more credible WhatsApp presence." },
  { icon: BarChart3, title: "Track campaign performance with advanced analytics", text: "Measure sent, delivered, read, clicked, and replied metrics across campaigns." },
  { icon: Globe2, title: "Integrate seamlessly with your tech stack", text: "Connect Shopify, CRMs, Zapier, Razorpay, and webhooks for automated journeys." },
  { icon: Headphones, title: "Answer customer queries with live chat", text: "Let multiple agents manage customer replies from one shared inbox." },
];

const bestPractices = [
  [Gift, "Build quality opt-in lists", "Only message users who have opted in and expect updates from your brand."],
  [Users, "Segment your audience", "Group users by interest, intent, purchase behavior, and campaign engagement."],
  [MessageSquare, "Personalize your messages", "Use names, order details, context, and relevant offers to improve response."],
  [Clock3, "Send at optimal times", "Schedule campaigns when your audience is most likely to read and respond."],
  [MousePointer2, "Keep content valuable and brief", "Make every message useful, direct, and easy to act on."],
  [BarChart3, "Use clear CTA buttons", "Guide customers to reply, buy, pay, book, or learn more from each message."],
];

const mistakes = [
  ["Ignoring opt-ins", "Do not message users without consent or context."],
  ["Sending too frequently", "Avoid overwhelming users with repeated promotions."],
  ["Batch blasts without targeting", "Segment campaigns instead of sending the same message to everyone."],
  ["Broad customer selection", "Use filters and attributes to reach the right audience."],
  ["Reduced copy quality", "Keep copy specific, conversational, and easy to understand."],
  ["Reduced offers", "Make the value clear with relevant offers or next steps."],
];

const cases = [
  ["COSCO", "Sports equipment brand", "Recovered lost conversations with WhatsApp campaigns."],
  ["Give", "Donation collection platform", "Used WhatsApp reminders to drive repeat actions."],
  ["Edelweiss", "Financial platform", "Improved customer communication through WhatsApp updates."],
];

const testimonials = [
  ["Priya Khurana", "Marketing Manager", "WhatsApp marketing helped us engage users faster than email or SMS."],
  ["Akash Jain", "Founder", "Campaigns, chatbots, and live chat made our customer follow-ups much smoother."],
  ["Aditya Mehra", "Growth Lead", "We could see reads, replies, and clicks clearly from every campaign."],
];

const faqs = [
  "What is the best way to do WhatsApp Marketing?",
  "How much does WhatsApp Marketing cost?",
  "Is it allowed on Official WhatsApp Marketing Software?",
  "Is there a free trial available for WhatsApp marketing?",
  "Is WhatsApp Marketing legal?",
  "What are the benefits of WhatsApp Marketing?",
  "Why is WhatsApp Marketing powerful?",
  "How to do bulk WhatsApp Marketing?",
  "Is WhatsApp Marketing effective?",
];

function HeroVisual() {
  return (
    <div className="relative mx-auto max-w-xl">
      <div className="absolute -left-5 top-12 hidden rounded-full bg-green-50 px-4 py-3 text-xs font-black text-green-700 shadow-lg md:block">Reach 1 Lakh package</div>
      <div className="absolute -right-4 top-28 hidden rounded-full bg-white px-4 py-3 text-xs font-black text-green-700 shadow-lg md:block">INR 4,00,000 generated</div>
      <div className="rounded-[2rem] bg-gradient-to-br from-green-100 to-white p-5 shadow-2xl shadow-green-950/10">
        <div className="rounded-[1.5rem] bg-white p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">Campaign Sent</span>
            <span className="text-xs font-black text-green-600">100k clicks</span>
          </div>
          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <div className="aspect-[4/2.4] rounded-xl bg-gradient-to-br from-green-500 to-slate-900" />
            <p className="mt-4 text-sm font-black text-slate-950">New Summer Offer</p>
            <p className="mt-1 text-xs text-slate-500">Hi Sam, your exclusive offer is live now.</p>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[["98%", "Open"], ["52%", "Click"], ["28%", "Reply"]].map(([value, label]) => (
              <div key={label} className="rounded-xl bg-green-50 p-3 text-center">
                <p className="text-lg font-black text-green-700">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>
          <button className="mt-5 h-10 w-full rounded-md bg-green-500 text-sm font-black text-white">Send Payment Link</button>
        </div>
      </div>
    </div>
  );
}

export default function ProductWhatsappMarketingPage() {
  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const appName = brandSettings?.title || "WhatsWay";

  return (
    <div className="bg-white pt-40 text-slate-950 sm:pt-44">
      <section className="bg-white pb-12 pt-10">
        <div className="mx-auto grid max-w-[1180px] gap-10 px-4 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-8">
          <div className="text-center lg:text-left">
            <p className="text-sm font-black text-green-600">WhatsApp Marketing Software</p>
            <h1 className="mt-3 text-4xl font-black leading-tight tracking-normal sm:text-6xl">
              Meet India's Best <span className="block text-green-500">WhatsApp Marketing Software</span>
            </h1>
            <p className="mt-5 text-base leading-7 text-slate-600">
              Achieve up to 5X ROI with {appName}'s AI-powered WhatsApp marketing platform. Launch WhatsApp campaigns, automate workflows, and convert customers faster.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Link href="/signup" className="inline-flex h-12 items-center justify-center rounded-md bg-green-500 px-6 text-sm font-black text-white transition hover:bg-green-600">
                Try {appName} FREE for 14 Days
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link href="/demo" className="inline-flex h-12 items-center justify-center rounded-md border border-slate-300 bg-white px-6 text-sm font-black text-slate-900 transition hover:bg-slate-50">
                Book a Demo
              </Link>
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-[1180px] px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-black sm:text-3xl">Founders and Marketers Love us</h2>
          <p className="mt-2 text-sm text-slate-500">Trusted by 50,000+ businesses across D2C, education, finance and ecommerce.</p>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {founderLogos.map((logo) => (
              <div key={logo} className="rounded-xl bg-white p-3 text-sm font-black text-slate-500 shadow-sm ring-1 ring-slate-100">{logo}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto grid max-w-[1180px] gap-8 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-8">
          <div>
            <h2 className="text-2xl font-black sm:text-3xl">What is WhatsApp Marketing?</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              WhatsApp Marketing is a direct communication strategy that uses WhatsApp Business API to send campaigns, promotions, reminders, updates, and automated conversations to opted-in customers.
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              With {appName}, brands can broadcast personalized offers, retarget interested users, automate replies, and manage support from one place.
            </p>
            <Link href="/signup" className="mt-5 inline-flex rounded-md bg-green-500 px-5 py-3 text-sm font-black text-white">Learn More</Link>
          </div>
          <div className="rounded-[1.5rem] bg-green-50 p-5">
            <div className="rounded-xl bg-white p-5 shadow-lg">
              <MessageSquare className="h-8 w-8 text-green-600" />
              <p className="mt-4 text-lg font-black">Launching a new campaign?</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Send offers, reminders, and automated replies with campaign analytics.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-green-100 py-12">
        <div className="mx-auto max-w-[1180px] px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-black sm:text-3xl">Why WhatsApp Marketing in 2026?</h2>
          <p className="mt-2 text-sm text-slate-600">WhatsApp is the one platform that brings together automation, notifications, commerce and support.</p>
          <div className="mt-8 grid rounded-xl bg-white shadow-lg shadow-green-900/5 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="border-b border-slate-100 p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
                <p className="text-2xl font-black">{stat.value}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-[1180px] px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-black sm:text-3xl">See how WhatsApp Marketing works with {appName}, in minutes</h2>
          <p className="mt-2 text-sm text-slate-500">Understand the platform and how campaigns, chatbots, and analytics work together.</p>
          <div className="relative mx-auto mt-8 max-w-3xl overflow-hidden rounded-xl bg-slate-200 shadow-2xl shadow-slate-950/15">
            <div className="aspect-video bg-gradient-to-br from-green-600 via-green-300 to-slate-800 p-8">
              <div className="flex h-full items-center justify-center">
                <div className="rounded-xl bg-white/85 p-8 text-center shadow-xl">
                  <p className="text-4xl font-black text-green-700">{appName} Explained</p>
                  <p className="mt-2 text-xl font-black text-slate-950">in 3 Minutes</p>
                  <div className="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-white">
                    <Play className="ml-1 h-8 w-8 fill-current" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-[1180px] px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-black sm:text-3xl">WhatsApp Marketing for every industry</h2>
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            {industryTabs.map((tab, index) => (
              <button key={tab} className={`rounded-full px-5 py-2 text-sm font-black ${index === 0 ? "bg-green-500 text-white" : "bg-slate-100 text-slate-700"}`}>{tab}</button>
            ))}
          </div>
          <div className="mx-auto mt-8 grid max-w-4xl gap-6 rounded-[1.5rem] bg-slate-50 p-5 text-left md:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-xl bg-gradient-to-br from-green-500 to-slate-900" />
            <div className="rounded-xl bg-white p-6 shadow-lg">
              <h3 className="text-xl font-black text-slate-950">WhatsApp marketing for ecommerce</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">Recover carts, promote new launches, share personalized offers, send payment reminders, and support shoppers from WhatsApp.</p>
              <ul className="mt-5 space-y-3">
                {["Broadcast promotional offers", "Send abandoned cart reminders", "Automate shipping and payment alerts"].map((item) => (
                  <li key={item} className="flex gap-3 text-sm font-semibold text-slate-700"><CheckCircle2 className="h-5 w-5 text-green-600" />{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-12">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-black sm:text-3xl">How to do WhatsApp Marketing with {appName}?</h2>
            <p className="mt-2 text-sm text-slate-500">Everything needed to build, launch and measure WhatsApp campaigns.</p>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {marketingUseCards.map((card) => (
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
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-black sm:text-3xl">WhatsApp Marketing Best Practices</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {bestPractices.map(([Icon, title, text]) => (
              <div key={String(title)} className="rounded-xl bg-white p-5 shadow-lg shadow-slate-950/5">
                <Icon className="h-7 w-7 text-green-600" />
                <h3 className="mt-4 text-base font-black text-slate-950">{String(title)}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{String(text)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-green-100 py-12">
        <div className="mx-auto max-w-[900px] px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 rounded-xl bg-white p-6 shadow-xl shadow-green-900/8 sm:grid-cols-2 lg:grid-cols-3">
            {mistakes.map(([title, text]) => (
              <div key={title}>
                <Zap className="h-6 w-6 text-green-600" />
                <h3 className="mt-3 text-sm font-black text-slate-950">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-[1180px] px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-black sm:text-3xl">Achieving 10x WhatsApp Marketing</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {cases.map(([title, role, text]) => (
              <div key={title} className="rounded-xl bg-white p-6 shadow-lg shadow-slate-950/5 ring-1 ring-slate-100">
                <h3 className="text-2xl font-black text-red-500">{title}</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">{role}</p>
                <p className="mt-4 text-sm leading-6 text-slate-600">{text}</p>
                <Link href="/case-studies" className="mt-4 inline-flex rounded-md border border-slate-300 px-4 py-2 text-xs font-black text-slate-900">Explore Case Study</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-green-100 py-12">
        <div className="mx-auto max-w-[1180px] px-4 text-center sm:px-6 lg:px-8">
          <div className="grid gap-5 md:grid-cols-3">
            {testimonials.map(([name, role, quote]) => (
              <div key={name} className="rounded-xl bg-white p-6 shadow-lg shadow-slate-950/5">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-200 text-xl font-black text-green-800">{name[0]}</div>
                <h3 className="mt-4 font-black text-slate-950">{name}</h3>
                <p className="text-xs font-semibold text-slate-500">{role}</p>
                <p className="mt-4 text-sm leading-6 text-slate-600">{quote}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="mx-auto flex max-w-[1180px] flex-col items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white px-5 py-5 shadow-lg shadow-slate-950/5 sm:px-6 md:flex-row lg:px-8">
          <h2 className="text-2xl font-black text-slate-950">Drive 3x Revenue with India's best WhatsApp Marketing Platform</h2>
          <div className="flex gap-3">
            <Link href="/demo" className="rounded-md border border-slate-900 bg-white px-5 py-3 text-sm font-black text-slate-950">Book a Demo</Link>
            <Link href="/signup" className="rounded-md bg-green-500 px-5 py-3 text-sm font-black text-white">Start FREE</Link>
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="mx-auto max-w-[700px] px-4 text-center sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className="rounded-md border border-slate-200 bg-white p-2 text-xs font-black text-slate-500 shadow-sm">Award</div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-black sm:text-3xl">WhatsApp Marketing FAQs</h2>
          <div className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {faqs.map((question) => (
              <details key={question} className="p-5">
                <summary className="cursor-pointer list-none text-sm font-black text-slate-950">{question}</summary>
                <p className="mt-3 text-sm leading-6 text-slate-600">{appName} helps businesses run compliant WhatsApp marketing campaigns with broadcasts, automation, analytics, and live chat.</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
