import { Link } from "wouter";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppSettings } from "@/types/types";

export type MarketingPageData = {
  eyebrow: string;
  title: string;
  description: string;
  category: string;
  highlights: string[];
  useCases: string[];
};

type MarketingPageProps = {
  page: MarketingPageData;
};

export function MarketingPageLayout({ page }: MarketingPageProps) {
  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const appName = brandSettings?.title || "WhatsWay";

  return (
    <div className="bg-white pt-40 text-slate-950 sm:pt-44">
      <section className="relative overflow-hidden border-b border-emerald-100 bg-gradient-to-b from-emerald-50 to-white py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_0.85fr] lg:items-center lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-black text-emerald-700 shadow-sm">
              <Sparkles className="h-4 w-4" />
              {page.eyebrow}
            </div>
            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight tracking-normal sm:text-6xl">
              {page.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              {page.description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="inline-flex items-center justify-center rounded-md bg-green-500 px-7 py-4 text-base font-black text-white shadow-lg shadow-green-500/20 transition hover:bg-green-600">
                Start for FREE
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link href="/demo" className="inline-flex items-center justify-center rounded-md border-2 border-slate-950 bg-white px-7 py-4 text-base font-semibold text-slate-950 transition hover:bg-slate-50">
                Book a Demo
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-emerald-100 bg-white p-5 shadow-2xl shadow-emerald-950/10">
            <div className="rounded-[1.5rem] bg-slate-950 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">{page.category}</p>
                  <h2 className="mt-2 text-2xl font-black">{appName}</h2>
                </div>
                <MessageSquare className="h-8 w-8 text-emerald-300" />
              </div>
              <div className="mt-8 grid gap-3">
                {page.highlights.slice(0, 3).map((highlight) => (
                  <div key={highlight} className="flex items-start gap-3 rounded-2xl bg-white/10 p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-emerald-300" />
                    <span className="text-sm leading-6 text-slate-100">{highlight}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-600">What you can build</p>
              <h2 className="mt-4 text-3xl font-black tracking-normal sm:text-5xl">
                A focused page for {page.category.toLowerCase()}.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                This page is intentionally separated so its copy, sections, SEO, screenshots, and CTAs can evolve without affecting other menu pages.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {page.useCases.map((useCase) => (
                <div key={useCase} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-950/5">
                  <BarChart3 className="h-7 w-7 text-emerald-600" />
                  <p className="mt-4 text-lg font-black text-slate-950">{useCase}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
