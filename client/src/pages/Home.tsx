/**
 * ============================================================
 * (c) 2025 Diploy - a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */

import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Megaphone,
  MessageCircle,
  MessagesSquare,
  Send,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { PlansDataTypes, AppSettings } from "@/types/types";

const customerLogos = [
  { name: "Lenskart", url: "https://logo.clearbit.com/lenskart.com" },
  { name: "Quikr", url: "https://logo.clearbit.com/quikr.com" },
  { name: "The Man Co", url: "https://logo.clearbit.com/themancompany.com" },
  { name: "HDFC", url: "https://logo.clearbit.com/hdfcbank.com" },
  { name: "Reliance", url: "https://logo.clearbit.com/relianceindustries.com" },
  { name: "Edelweiss", url: "https://logo.clearbit.com/edelweissfin.com" },
  { name: "Apollo", url: "https://logo.clearbit.com/apollohospitals.com" },
];

type CmsLogo = {
  id: string;
  name: string;
  logo_url: string;
};

function HomeLogoCard({ logo }: { logo: { name: string; url: string } }) {
  const [failed, setFailed] = React.useState(false);

  return (
    <div className="flex h-14 items-center justify-center rounded-2xl bg-slate-50 px-3 text-center text-sm font-black text-slate-500">
      {failed ? (
        <span>{logo.name}</span>
      ) : (
        <img
          src={logo.url}
          alt={`${logo.name} logo`}
          loading="lazy"
          className="max-h-8 max-w-[104px] object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

const broadcastBenefits = [
  {
    icon: Megaphone,
    title: "8+ powerful messaging categories",
    description:
      "Send promotions, offers, coupon codes, reminders, catalog messages, carousels, and updates through approved WhatsApp templates.",
  },
  {
    icon: MessageCircle,
    title: "Add CTAs and quick replies",
    description:
      "Turn broadcast traffic into conversations with reply buttons, call-to-action links, and guided next steps.",
  },
  {
    icon: Clock3,
    title: "Schedule campaigns ahead",
    description:
      "Plan launches, reminders, and festive campaigns in advance so your team can focus on conversions.",
  },
];

const featureCards = [
  {
    icon: Send,
    title: "Run click-to-WhatsApp ads",
    description:
      "Capture leads from Facebook and Instagram ads, route them into WhatsApp, and automate follow-ups from one workspace.",
  },
  {
    icon: Workflow,
    title: "Build WhatsApp forms",
    description:
      "Collect customer details, feedback, preferences, and qualification answers directly inside WhatsApp chats.",
  },
  {
    icon: CircleDollarSign,
    title: "Collect payments on WhatsApp",
    description:
      "Let customers complete purchases with payment links and checkout workflows connected to your existing stack.",
  },
];

const stats = [
  { value: "98%", label: "Open rates" },
  { value: "45-60%", label: "Click rates" },
  { value: "2.6 Bn+", label: "Active users" },
  { value: "7%", label: "Engagement rate" },
];

const advancedFeatures = [
  {
    icon: Users,
    title: "Multiple human live chat",
    description:
      "Let sales and support agents handle conversations on the same WhatsApp number with tags, ownership, and smart routing.",
  },
  {
    icon: BarChart3,
    title: "Real-time analytics",
    description:
      "Track delivery, reads, clicks, replies, conversions, and campaign health so every send can be improved.",
  },
  {
    icon: Bot,
    title: "No-code chatbot builder",
    description:
      "Create automated customer journeys, lead qualification flows, FAQs, and catalog conversations without writing code.",
  },
  {
    icon: Store,
    title: "Import and broadcast instantly",
    description:
      "Upload contacts, segment audiences, pick approved templates, and launch campaigns with performance visibility.",
  },
];

const launchBenefits = [
  "Official WhatsApp Business API workflows",
  "Verified business profile support",
  "Broadcast and automation tools in one dashboard",
  "Live chat, analytics, templates, and integrations",
];

const faqs = [
  {
    question: "What does this platform do?",
    answer:
      "It helps businesses broadcast WhatsApp campaigns, automate conversations, manage live chats, run chatbot flows, collect leads, and track performance from one dashboard.",
  },
  {
    question: "Is this built for official WhatsApp marketing?",
    answer:
      "Yes. The product is designed around WhatsApp Business API workflows so teams can market, support, and automate responsibly.",
  },
  {
    question: "Can I start without a technical team?",
    answer:
      "Yes. The core workflows are no-code: import contacts, choose templates, build flows, connect channels, and launch campaigns from the interface.",
  },
  {
    question: "Does it support sales and support teams together?",
    answer:
      "Yes. Campaigns, live chat, automation, templates, agent routing, analytics, and CRM-style contact management work together.",
  },
];

const Home = () => {
  const { data: paymentProviders } = useQuery<PlansDataTypes>({
    queryKey: ["/api/admin/plans"],
    queryFn: async () => {
      const res = await fetch("/api/admin/plans");
      return res.json();
    },
  });

  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });
  const { data: cmsLogoResponse } = useQuery<{ rows: CmsLogo[] }>({
    queryKey: ["/api/cms/logos", "founders"],
    queryFn: () => fetch("/api/cms/logos?placement=founders").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const appName = brandSettings?.title || "WhatsWay";
  const hasPlans =
    paymentProviders?.success && paymentProviders?.data?.length > 0;
  const displayCustomerLogos = cmsLogoResponse?.rows?.length
    ? cmsLogoResponse.rows.map((logo) => ({ name: logo.name, url: logo.logo_url }))
    : customerLogos;

  return (
    <div className="overflow-hidden bg-white text-slate-950">
      <section className="relative isolate pt-40 sm:pt-44">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(34,197,94,0.18),transparent_32%),linear-gradient(180deg,#ecfdf5_0%,#ffffff_62%)]" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr]">
            <div className="text-center lg:text-left">
              <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm lg:mx-0">
                <Sparkles className="h-4 w-4" />
                AI-powered WhatsApp marketing platform
              </div>
              <h1 className="mx-auto max-w-4xl text-4xl font-black leading-[1.04] tracking-normal text-slate-950 sm:text-6xl lg:mx-0 lg:text-7xl">
                7X your revenue with the power of WhatsApp
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 lg:mx-0">
                Broadcast, automate, engage, and sell with {appName}. Run
                official WhatsApp campaigns, build no-code chatbots, manage live
                chat, and measure growth from one platform.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-7 py-4 text-base font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600"
                >
                  Start 14-Day Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-7 py-4 text-base font-bold text-slate-900 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700"
                >
                  Join Live Demo
                </Link>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-semibold text-slate-600 lg:justify-start">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Powered by official WhatsApp APIs
                </span>
                <span className="inline-flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Built for fast campaign launches
                </span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl">
              <div className="rounded-[2rem] border border-emerald-100 bg-white p-4 shadow-2xl shadow-emerald-950/10">
                <div className="rounded-[1.5rem] bg-slate-950 p-4 text-white">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">
                        Campaign dashboard
                      </p>
                      <h2 className="mt-1 text-xl font-bold">{appName}</h2>
                    </div>
                    <div className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-bold text-emerald-200">
                      Live
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {stats.slice(0, 3).map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-2xl bg-white/10 p-3"
                      >
                        <p className="text-2xl font-black">{stat.value}</p>
                        <p className="mt-1 text-xs text-slate-300">
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl bg-white p-4 text-slate-950">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold">
                          Festive offer broadcast
                        </p>
                        <p className="text-xs text-slate-500">
                          48,920 recipients scheduled
                        </p>
                      </div>
                      <Send className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="mt-4 space-y-3">
                      <div className="h-3 rounded-full bg-emerald-100">
                        <div className="h-3 w-[82%] rounded-full bg-emerald-500" />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="rounded-xl bg-emerald-50 p-2">
                          <strong className="block text-sm">96%</strong>
                          Delivered
                        </div>
                        <div className="rounded-xl bg-cyan-50 p-2">
                          <strong className="block text-sm">71%</strong>
                          Read
                        </div>
                        <div className="rounded-xl bg-amber-50 p-2">
                          <strong className="block text-sm">28%</strong>
                          Clicked
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-emerald-400 p-4 text-slate-950">
                      <MessagesSquare className="mb-3 h-6 w-6" />
                      <p className="text-sm font-black">Live chat</p>
                      <p className="mt-1 text-xs">
                        Route high-intent replies to agents instantly.
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-4">
                      <Bot className="mb-3 h-6 w-6 text-emerald-300" />
                      <p className="text-sm font-black">Chatbot flows</p>
                      <p className="mt-1 text-xs text-slate-300">
                        Automate FAQs, forms, and follow-ups.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-16 rounded-3xl border border-slate-100 bg-white px-5 py-7 shadow-sm">
            <p className="text-center text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
              Founders and marketers trust WhatsApp for growth
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {displayCustomerLogos.map((logo) => <HomeLogoCard key={logo.name} logo={logo} />)}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-600">
                Broadcast marketing
              </p>
              <h2 className="mt-4 text-3xl font-black tracking-normal text-slate-950 sm:text-5xl">
                Broadcast marketing messages on WhatsApp, officially.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Enjoy a limitless broadcast experience with approved templates,
                CTA buttons, audience segments, scheduling, and analytics built
                around measurable revenue.
              </p>
              <Link
                href="/signup"
                className="mt-8 inline-flex items-center rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-600"
              >
                Start for free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {broadcastBenefits.map((item) => (
                <div
                  key={item.title}
                  className="rounded-3xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-950/5"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-lg font-black text-slate-950">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-600">
              Powerful WhatsApp features
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-normal text-slate-950 sm:text-5xl">
              Packed with tools that help teams launch, convert, and support.
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {featureCards.map((feature) => (
              <div
                key={feature.title}
                className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-950/5"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                  <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="mt-6 text-xl font-black text-slate-950">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {feature.description}
                </p>
                <Link
                  href="/signup"
                  className="mt-5 inline-flex items-center text-sm font-bold text-emerald-700"
                >
                  Explore
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] bg-emerald-500 px-6 py-12 text-slate-950 shadow-2xl shadow-emerald-500/20 sm:px-10">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em]">
                  Why WhatsApp?
                </p>
                <h2 className="mt-4 text-3xl font-black tracking-normal sm:text-5xl">
                  WhatsApp brings notifications, marketing, and support into one
                  customer channel.
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-3xl bg-white/90 p-5 text-center"
                  >
                    <p className="text-3xl font-black">{stat.value}</p>
                    <p className="mt-2 text-sm font-bold text-slate-600">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="use-cases" className="bg-slate-950 py-20 text-white sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-300">
                Advanced features
              </p>
              <h2 className="mt-4 text-3xl font-black tracking-normal sm:text-5xl">
                Drive more conversions from every WhatsApp conversation.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                {appName} combines campaign tools, live support, automation, and
                analytics so your team can move from first reply to repeat
                purchase faster.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {advancedFeatures.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-3xl border border-white/10 bg-white/[0.06] p-6"
                >
                  <feature.icon className="h-8 w-8 text-emerald-300" />
                  <h3 className="mt-5 text-xl font-black">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="rounded-[2rem] bg-slate-50 p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-xl font-black text-white">
                  A
                </div>
                <div>
                  <p className="font-black text-slate-950">Achina Mayya</p>
                  <p className="text-sm text-slate-500">Founder and CEO</p>
                </div>
              </div>
              <p className="mt-6 text-xl font-bold leading-9 text-slate-800">
                "{appName} helps teams make WhatsApp feel personal at scale. The
                faster replies, automated journeys, and clear campaign insights
                make customer engagement easier to act on."
              </p>
            </div>

            <div className="rounded-[2rem] border border-emerald-100 bg-white p-8 shadow-xl shadow-slate-950/5">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-600">
                Start in 10 minutes
              </p>
              <h2 className="mt-4 text-3xl font-black tracking-normal text-slate-950 sm:text-5xl">
                Launch WhatsApp marketing without the messy setup.
              </h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {launchBenefits.map((item) => (
                  <div key={item} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-emerald-600" />
                    <p className="text-sm font-semibold leading-6 text-slate-700">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
              <Link
                href="/signup"
                className="mt-8 inline-flex items-center rounded-full bg-emerald-500 px-7 py-4 text-base font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600"
              >
                Start now for free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {hasPlans && (
        <section id="pricing" className="bg-emerald-50 py-16">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:px-8">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
                Pricing available
              </p>
              <h2 className="mt-3 text-3xl font-black text-slate-950">
                Choose a plan that matches your WhatsApp growth stage.
              </h2>
            </div>
            <Link
              href="/signup"
              className="inline-flex items-center rounded-full bg-slate-950 px-7 py-4 text-base font-bold text-white transition hover:bg-emerald-600"
            >
              View plans
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </section>
      )}

      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-600">
              FAQ
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-normal text-slate-950 sm:text-5xl">
              Common questions about WhatsApp marketing
            </h2>
          </div>
          <div className="mt-10 divide-y divide-slate-200 rounded-3xl border border-slate-200 bg-white">
            {faqs.map((faq) => (
              <details key={faq.question} className="group p-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-black text-slate-950">
                  {faq.question}
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 transition group-open:rotate-45">
                    <Check className="h-4 w-4" />
                  </span>
                </summary>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;

