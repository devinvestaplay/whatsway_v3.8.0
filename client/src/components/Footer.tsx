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
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Twitter,
} from "lucide-react";
import { AppSettings } from "@/types/types";

const footerColumns = [
  {
    title: "Product",
    links: [
      { name: "Broadcast campaigns", href: "/features" },
      { name: "Chatbot builder", href: "/chatbot-builder" },
      { name: "Live chat inbox", href: "/inbox" },
      { name: "Analytics", href: "/analytics" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About", href: "/about" },
      { name: "Contact", href: "/contact" },
      { name: "Careers", href: "/careers" },
      { name: "Press kit", href: "/press-kit" },
    ],
  },
  {
    title: "Resources",
    links: [
      { name: "WhatsApp guide", href: "/whatsapp-guide" },
      { name: "Best practices", href: "/best-practices" },
      { name: "Case studies", href: "/case-studies" },
      { name: "API docs", href: "/api-docs" },
    ],
  },
  {
    title: "Legal",
    links: [
      { name: "Privacy policy", href: "/privacy-policy" },
      { name: "Terms", href: "/terms" },
      { name: "Cookie policy", href: "/cookie-policy" },
    ],
  },
];

const Footer: React.FC = () => {
  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });
  const { data: socialSetting } = useQuery<{ value: Record<string, string> }>({
    queryKey: ["/api/cms/settings/social_links"],
    queryFn: () => fetch("/api/cms/settings/social_links").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const appName = brandSettings?.title || "WhatsWay";
  const socialLinks = socialSetting?.value || {};
  const logo =
    brandSettings?.logo2 && brandSettings.logo2 !== "/uploads/null"
      ? brandSettings.logo2
      : brandSettings?.logo;

  return (
    <footer className="bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-emerald-500 px-6 py-10 text-slate-950 sm:px-10 lg:flex lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-black uppercase tracking-[0.18em]">Grow on WhatsApp</p>
            <h2 className="mt-3 text-3xl font-black tracking-normal sm:text-5xl">
              Start turning conversations into revenue today.
            </h2>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-0">
            <Link
              href="/demo"
              className="inline-flex items-center justify-center rounded-full border border-slate-950/15 bg-white px-6 py-3 text-sm font-black text-slate-950 shadow-sm transition hover:bg-emerald-50"
            >
              Book Demo
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="grid gap-12 py-14 lg:grid-cols-[1.15fr_2fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3" aria-label={appName}>
              {logo ? (
                <img
                  src={logo}
                  alt={appName}
                  className="h-12 max-w-[170px] object-contain"
                  style={{ filter: "brightness(0) invert(1)" }}
                />
              ) : (
                <>
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                    <MessageSquare className="h-7 w-7" />
                  </span>
                  <span className="text-2xl font-black tracking-normal">{appName}</span>
                </>
              )}
            </Link>
            <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">
              {appName} helps businesses broadcast WhatsApp campaigns, automate
              customer journeys, manage live conversations, and track marketing
              performance from one clean dashboard.
            </p>
            <div className="mt-6 space-y-3 text-sm text-slate-400">
              <p className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-emerald-300" /> cs@diploy.in
              </p>
              <p className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-emerald-300" /> WhatsApp-first customer growth
              </p>
              <p className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-emerald-300" /> Built for global businesses
              </p>
            </div>
            <div className="mt-7 flex gap-3">
              {[
                { icon: Twitter, label: "Twitter", href: socialLinks.twitter || "https://x.com" },
                { icon: Linkedin, label: "LinkedIn", href: socialLinks.linkedin || "https://linkedin.com" },
                { icon: Instagram, label: "Instagram", href: socialLinks.instagram || "https://instagram.com" },
                { icon: Facebook, label: "Facebook", href: socialLinks.facebook || "https://facebook.com" },
              ].filter((social) => social.href).map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-emerald-300 hover:bg-emerald-400/10 hover:text-emerald-200"
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h3 className="text-sm font-black uppercase tracking-[0.16em] text-white">
                  {column.title}
                </h3>
                <ul className="mt-5 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-sm font-semibold text-slate-400 transition hover:text-emerald-200"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>Copyright {new Date().getFullYear()} {appName}. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/terms" className="hover:text-slate-300">Terms</Link>
            <Link href="/privacy-policy" className="hover:text-slate-300">Privacy</Link>
            <Link href="/cookie-policy" className="hover:text-slate-300">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

