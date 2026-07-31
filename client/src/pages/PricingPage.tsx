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

import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  CheckCircle2,
  Crown,
  Headphones,
  HelpCircle,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  X,
  Zap,
} from "lucide-react";
import { AppSettings, PaymentProvidersResponse, Plan, PlansDataTypes } from "@/types/types";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import CheckoutModal from "@/components/modals/CheckoutPage";

const defaultPlans = [
  {
    name: "Basic",
    description: "For teams starting WhatsApp campaigns.",
    monthlyPrice: "Free",
    annualPrice: "Free",
    badge: "Start here",
    features: ["1 WhatsApp number", "Broadcast campaigns", "Template management", "Basic analytics", "Email support"],
  },
  {
    name: "Pro",
    description: "For growing businesses that need automation.",
    monthlyPrice: "Custom",
    annualPrice: "Custom",
    badge: "Popular",
    features: ["Multiple agents", "Chatbot builder", "Campaign scheduling", "Live chat inbox", "Advanced reports"],
  },
  {
    name: "Enterprise",
    description: "For teams scaling marketing and support together.",
    monthlyPrice: "Talk to us",
    annualPrice: "Talk to us",
    badge: "Scale",
    features: ["Custom workflows", "Priority onboarding", "API and webhooks", "Dedicated support", "Custom limits"],
  },
];

const comparisonRows = [
  ["WhatsApp Business API setup", true, true, true],
  ["Broadcast campaigns", true, true, true],
  ["No-code chatbot builder", false, true, true],
  ["Live chat agent inbox", true, true, true],
  ["Advanced automation flows", false, true, true],
  ["Campaign analytics", true, true, true],
  ["API and webhook access", false, true, true],
  ["Priority onboarding", false, false, true],
];

const faqItems = [
  {
    question: "Is WhatsApp Business API billing included?",
    answer:
      "Platform pricing and WhatsApp conversation charges are usually separate. Your final billing depends on plan limits, messaging volume, and enabled payment provider configuration.",
  },
  {
    question: "Can I change my plan later?",
    answer:
      "Yes. Authenticated users can upgrade or change plans from the billing area, based on the plans configured by the admin.",
  },
  {
    question: "Do I need technical setup?",
    answer:
      "Most workflows are no-code. Teams can create broadcasts, templates, chatbot flows, live chat routing, and analytics without engineering help.",
  },
  {
    question: "What happens after I start?",
    answer:
      "You can connect your WhatsApp channel, import contacts, create approved templates, and start campaign or automation workflows.",
  },
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap,
  Crown,
  Star,
  Bot,
  Users,
  ShieldCheck,
};

const currencySymbolMap: Record<string, string> = {
  USD: "$",
  INR: "INR ",
  EUR: "EUR ",
  GBP: "GBP ",
  AED: "AED ",
  SGD: "S$",
  AUD: "A$",
  CAD: "C$",
};

export default function PublicPricingPage() {
  const [, setLocation] = useLocation();
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { user, currency } = useAuth();

  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const { data: plansResponse, isLoading } = useQuery<PlansDataTypes>({
    queryKey: ["/api/admin/plans"],
    queryFn: async () => {
      const res = await fetch("/api/admin/plans");
      return res.json();
    },
  });

  const { data: paymentProviders, isLoading: isLoadingProviders } =
    useQuery<PaymentProvidersResponse>({
      queryKey: ["/api/payment-providers"],
      queryFn: async () => {
        const res = await apiRequest("GET", "/api/payment-providers");
        if (!res.ok) throw new Error("Failed to fetch payment providers");
        return res.json();
      },
      enabled: !!user?.id,
    });

  const appName = brandSettings?.title || "WhatsWay";
  const realPlans = plansResponse?.success ? plansResponse.data : [];

  const displayedCurrencies = useMemo(() => {
    const currencies = new Set<string>(["USD"]);
    if (currency) currencies.add(currency.toUpperCase());
    realPlans.forEach((plan) => {
      Object.keys(plan.multiCurrencyPrices || {}).forEach((code) => currencies.add(code));
    });
    return Array.from(currencies);
  }, [currency, realPlans]);

  const sortedPlans = useMemo(
    () =>
      [...realPlans].sort((a, b) => {
        const priceA = Number(isAnnual ? a.annualPrice : a.monthlyPrice) || 0;
        const priceB = Number(isAnnual ? b.annualPrice : b.monthlyPrice) || 0;
        return priceA - priceB;
      }),
    [isAnnual, realPlans],
  );

  const formatPlanPrice = (plan: Plan) => {
    const prices = plan.multiCurrencyPrices?.[selectedCurrency];
    const raw = prices
      ? isAnnual
        ? prices.annual
        : prices.monthly
      : isAnnual
        ? plan.annualPrice
        : plan.monthlyPrice;
    const symbol = currencySymbolMap[selectedCurrency] || `${selectedCurrency} `;
    return `${symbol}${raw}`;
  };

  const handlePlanClick = (plan: Plan) => {
    if (!user) {
      setLocation("/signup");
      return;
    }
    setSelectedPlan(plan);
    setCheckoutOpen(true);
  };

  return (
    <div className="bg-white pt-40 text-slate-950 sm:pt-44">
      <section className="relative overflow-hidden bg-gradient-to-b from-green-50 via-white to-white pb-16 pt-12 sm:pb-20 sm:pt-16">
        <div className="mx-auto max-w-[1500px] px-4 text-center sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-white px-4 py-2 text-sm font-black text-green-700 shadow-sm">
            <Sparkles className="h-4 w-4" />
            Simple pricing for WhatsApp growth
          </div>
          <h1 className="mx-auto mt-6 max-w-5xl text-4xl font-black leading-tight tracking-normal sm:text-6xl lg:text-7xl">
            Choose the right {appName} plan for your business
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            Start with WhatsApp marketing, automation, live chat, AI agents, and analytics. Pick a plan that matches your team size and customer messaging volume.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setIsAnnual(false)}
                className={`rounded-full px-6 py-3 text-sm font-black transition ${!isAnnual ? "bg-green-500 text-white" : "text-slate-600"}`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setIsAnnual(true)}
                className={`rounded-full px-6 py-3 text-sm font-black transition ${isAnnual ? "bg-green-500 text-white" : "text-slate-600"}`}
              >
                Yearly
              </button>
            </div>
            {displayedCurrencies.length > 1 && (
              <select
                value={selectedCurrency}
                onChange={(event) => setSelectedCurrency(event.target.value)}
                className="h-12 rounded-full border border-slate-200 bg-white px-5 text-sm font-black text-slate-800 shadow-sm outline-none"
              >
                {displayedCurrencies.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            )}
            {isAnnual && (
              <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-black text-green-700">
                Save more with yearly billing
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="pb-16 sm:pb-20">
        <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="rounded-[2rem] border border-slate-100 bg-white py-20 text-center shadow-xl shadow-slate-950/5">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-green-100 border-t-green-500" />
              <p className="mt-4 text-sm font-black text-slate-500">Loading plans...</p>
            </div>
          ) : sortedPlans.length > 0 ? (
            <div className="grid gap-5 lg:grid-cols-3 xl:grid-cols-4">
              {sortedPlans.map((plan) => {
                const Icon = iconMap[plan.icon] || Zap;
                return (
                  <div
                    key={plan.id}
                    className={`relative flex min-h-[620px] flex-col rounded-[1.5rem] border bg-white p-6 shadow-xl shadow-slate-950/5 ${plan.popular ? "border-green-400 ring-2 ring-green-100" : "border-slate-200"}`}
                  >
                    {(plan.badge || plan.popular) && (
                      <span className="absolute right-5 top-5 rounded-full bg-green-500 px-3 py-1 text-xs font-black text-white">
                        {plan.badge || "Popular"}
                      </span>
                    )}
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h2 className="mt-6 text-2xl font-black text-slate-950">{plan.name}</h2>
                    <p className="mt-3 min-h-[52px] text-sm leading-6 text-slate-600">{plan.description}</p>
                    <div className="mt-6">
                      <span className="text-4xl font-black text-slate-950">{formatPlanPrice(plan)}</span>
                      <span className="ml-2 text-sm font-semibold text-slate-500">/{isAnnual ? "year" : "month"}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePlanClick(plan)}
                      className="mt-6 inline-flex h-12 items-center justify-center rounded-md bg-green-500 px-5 text-sm font-black text-white transition hover:bg-green-600"
                    >
                      {Number(plan.monthlyPrice) === 0 ? "Get Started" : "Choose Plan"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </button>
                    <div className="mt-6 border-t border-slate-100 pt-6">
                      <p className="text-sm font-black text-slate-950">Includes</p>
                      <ul className="mt-4 space-y-3">
                        {(plan.features?.length ? plan.features : []).slice(0, 8).map((feature, index) => (
                          <li key={`${plan.id}-${index}`} className="flex gap-3 text-sm leading-6 text-slate-700">
                            {feature.included ? <Check className="mt-1 h-4 w-4 flex-none text-green-600" /> : <X className="mt-1 h-4 w-4 flex-none text-slate-300" />}
                            <span>{feature.name}</span>
                          </li>
                        ))}
                        {plan.permissions && Object.entries(plan.permissions).slice(0, 4).map(([key, value]) => value ? (
                          <li key={`${plan.id}-${key}`} className="flex gap-3 text-sm leading-6 text-slate-700">
                            <Check className="mt-1 h-4 w-4 flex-none text-green-600" />
                            <span>{value} {key}</span>
                          </li>
                        ) : null)}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-3">
              {defaultPlans.map((plan) => (
                <div key={plan.name} className={`flex min-h-[520px] flex-col rounded-[1.5rem] border bg-white p-6 shadow-xl shadow-slate-950/5 ${plan.name === "Pro" ? "border-green-400 ring-2 ring-green-100" : "border-slate-200"}`}>
                  <span className="w-fit rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">{plan.badge}</span>
                  <h2 className="mt-6 text-2xl font-black text-slate-950">{plan.name}</h2>
                  <p className="mt-3 min-h-[52px] text-sm leading-6 text-slate-600">{plan.description}</p>
                  <div className="mt-6 text-4xl font-black text-slate-950">{isAnnual ? plan.annualPrice : plan.monthlyPrice}</div>
                  <Link href="/signup" className="mt-6 inline-flex h-12 items-center justify-center rounded-md bg-green-500 px-5 text-sm font-black text-white transition hover:bg-green-600">
                    Start for FREE
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                  <ul className="mt-6 space-y-3 border-t border-slate-100 pt-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-3 text-sm leading-6 text-slate-700">
                        <Check className="mt-1 h-4 w-4 flex-none text-green-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-green-600">Compare plans</p>
            <h2 className="mt-4 text-3xl font-black tracking-normal sm:text-5xl">Everything you need to choose confidently</h2>
          </div>
          <div className="mt-10 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-xl shadow-slate-950/5">
            <div className="grid grid-cols-[1.4fr_repeat(3,1fr)] bg-slate-950 text-sm font-black text-white">
              <div className="p-4">Feature</div>
              <div className="p-4 text-center">Basic</div>
              <div className="p-4 text-center">Pro</div>
              <div className="p-4 text-center">Enterprise</div>
            </div>
            {comparisonRows.map(([label, basic, pro, enterprise]) => (
              <div key={String(label)} className="grid grid-cols-[1.4fr_repeat(3,1fr)] border-t border-slate-100 text-sm">
                <div className="p-4 font-semibold text-slate-800">{label}</div>
                {[basic, pro, enterprise].map((value, index) => (
                  <div key={`${label}-${index}`} className="flex items-center justify-center p-4">
                    {value ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <X className="h-5 w-5 text-slate-300" />}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-[1500px] gap-6 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
          {[
            { icon: MessageSquare, title: "WhatsApp conversation charges", text: "Conversation charges depend on Meta category, country, and messaging volume." },
            { icon: Headphones, title: "Onboarding support", text: "Get help with setup, channel connection, templates, and launch readiness." },
            { icon: BarChart3, title: "Growth analytics", text: "Track delivery, read rates, replies, clicks, conversions, and agent performance." },
          ].map((item) => (
            <div key={item.title} className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-lg shadow-slate-950/5">
              <item.icon className="h-8 w-8 text-green-600" />
              <h3 className="mt-5 text-xl font-black text-slate-950">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-950 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-green-300">FAQ</p>
            <h2 className="mt-4 text-3xl font-black tracking-normal sm:text-5xl">Pricing questions, answered</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {faqItems.map((faq) => (
              <details key={faq.question} className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
                <summary className="flex cursor-pointer list-none items-start gap-3 text-base font-black">
                  <HelpCircle className="mt-0.5 h-5 w-5 flex-none text-green-300" />
                  {faq.question}
                </summary>
                <p className="mt-4 text-sm leading-7 text-slate-300">{faq.answer}</p>
              </details>
            ))}
          </div>
          <div className="mt-12 rounded-[1.5rem] bg-green-500 p-8 text-center text-slate-950">
            <h2 className="text-3xl font-black">Need a custom WhatsApp growth plan?</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-800">
              Talk to our team about high-volume campaigns, custom integrations, dedicated onboarding, and enterprise workflows.
            </p>
            <Link href="/contact" className="mt-6 inline-flex h-12 items-center justify-center rounded-md bg-slate-950 px-6 text-sm font-black text-white">
              Contact Sales
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {selectedPlan && (
        <CheckoutModal
          plan={selectedPlan}
          isAnnual={isAnnual}
          open={checkoutOpen}
          onOpenChange={(open) => {
            setCheckoutOpen(open);
            if (!open) setSelectedPlan(null);
          }}
          userId={user?.id}
          paymentProviders={paymentProviders?.data}
          isLoadingProviders={isLoadingProviders}
          selectedCurrency={selectedCurrency}
        />
      )}
    </div>
  );
}
