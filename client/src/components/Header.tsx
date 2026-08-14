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

import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  ChevronDown,
  Globe2,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  User,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { AppSettings } from "@/types/types";
import { HeaderDropdown } from "./header/HeaderDropdown";
import { MobileHeaderMenu } from "./header/MobileHeaderMenu";
import { headerMenuOrder, type HeaderMenuKey } from "./header/headerMenus";

const Header = () => {
  const [location, setLocation] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<HeaderMenuKey | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });
  const { data: announcementSetting } = useQuery<{ value: any }>({
    queryKey: ["/api/cms/settings/announcement_bar"],
    queryFn: () => fetch("/api/cms/settings/announcement_bar").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const appName = brandSettings?.title || "WhatsWay";
  const announcement = announcementSetting?.value || {};
  const announcementEnabled = announcement.enabled !== false;
  const announcementBadge = announcement.badge || "NEW LAUNCH";
  const announcementText =
    announcement.text || "Build AI Agents on WhatsApp that qualify leads, answer customers, and convert sales 24/7";
  const announcementCtaText = announcement.ctaText || "Explore More";
  const announcementCtaUrl = announcement.ctaUrl || "/ai-assistant";
  const username =
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    user?.username ||
    "Account";

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setActiveMenu(null);
    setAccountOpen(false);
  }, [location]);

  const Brand = () => (
    <Link href="/" className="flex min-w-0 items-center gap-3" aria-label={appName}>
      {brandSettings?.logo ? (
        <img
          src={brandSettings.logo}
          alt={appName}
          className="h-10 max-w-[160px] object-contain xl:max-w-[190px]"
        />
      ) : (
        <>
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
            <MessageSquare className="h-6 w-6" />
          </span>
          <span className="truncate text-xl font-black tracking-normal text-slate-950">
            {appName}
          </span>
        </>
      )}
    </Link>
  );

  return (
    <>
    <header className="public-site-header fixed left-0 right-0 top-0 z-50 bg-white">
      {announcementEnabled && <div className="overflow-hidden border-b border-green-200 bg-gradient-to-r from-green-100 via-lime-50 to-green-100">
        <div className="launch-bar-track flex h-14 min-w-max items-center gap-5 px-4 text-sm font-black text-slate-900 sm:h-14 sm:min-w-0 sm:justify-center sm:text-xl">
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-xs font-black text-white shadow-lg shadow-green-600/25 sm:text-sm">
            <span className="h-2 w-2 rounded-full bg-white" />
            {announcementBadge}
          </span>
          <span className="shrink-0 whitespace-nowrap">{announcementText}</span>
          <Link href={announcementCtaUrl} className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-sm font-black text-green-700 sm:text-lg">
            {announcementCtaText}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-xs font-black text-white shadow-lg shadow-green-600/25 sm:hidden">
            <span className="h-2 w-2 rounded-full bg-white" />
            {announcementBadge}
          </span>
          <span className="shrink-0 whitespace-nowrap sm:hidden">{announcementText}</span>
          <Link href={announcementCtaUrl} className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-sm font-black text-green-700 sm:hidden">
            {announcementCtaText}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <style>{`
          @media (max-width: 639px) {
            .launch-bar-track {
              width: max-content;
              animation: launch-bar-scroll 18s linear infinite;
            }
            @keyframes launch-bar-scroll {
              from { transform: translateX(0); }
              to { transform: translateX(-50%); }
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .launch-bar-track { animation: none; transform: none; }
          }
        `}</style>
      </div>}

      <div className={`border-b transition-all duration-300 ${isScrolled ? "border-slate-200 shadow-lg shadow-slate-950/[0.04]" : "border-slate-200"}`}>
        <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between gap-5">
            <Brand />

            <nav className="hidden flex-1 items-center justify-end gap-1 xl:flex">
              <Link href="/pricing" className="inline-flex h-11 items-center whitespace-nowrap px-2 text-[15px] font-medium text-slate-950 transition hover:text-green-600 2xl:px-3 2xl:text-base">
                Pricing
              </Link>
              {headerMenuOrder.map((menu) => (
                <HeaderDropdown
                  key={menu}
                  menu={menu}
                  activeMenu={activeMenu}
                  setActiveMenu={setActiveMenu}
                />
              ))}
              <Link href="/careers" className="inline-flex h-11 items-center whitespace-nowrap px-2 text-[15px] font-medium text-slate-950 transition hover:text-green-600 2xl:px-3 2xl:text-base">
                Partner
              </Link>
              <div className="flex h-11 items-center gap-1 whitespace-nowrap px-1 text-[15px] font-medium text-slate-950 2xl:text-base">
                <Globe2 className="h-4 w-4" />
                <span>Eng</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </div>
            </nav>

            <div className="hidden flex-none items-center gap-3 xl:flex">
              {!isAuthenticated ? (
                <>
                  <Link
                    href="/signup"
                    className="inline-flex h-14 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-green-500 px-5 text-lg font-black text-white shadow-sm transition hover:bg-green-600 2xl:px-6"
                  >
                    Start for FREE
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex h-14 items-center justify-center gap-2 whitespace-nowrap rounded-md border-2 border-black bg-white px-5 text-lg font-medium text-black transition hover:bg-slate-50 2xl:px-6"
                  >
                    Login
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/dashboard"
                    className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-green-500 px-5 text-base font-black text-white transition hover:bg-green-600"
                  >
                    Dashboard
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setAccountOpen((open) => !open)}
                      className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50"
                      aria-label="Open account menu"
                    >
                      <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(username)}`}
                        alt={username}
                        className="h-full w-full object-cover"
                      />
                    </button>
                    <div className={`absolute right-0 top-full mt-3 w-56 rounded-md border border-slate-100 bg-white p-2 shadow-2xl shadow-slate-950/10 transition ${accountOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"}`}>
                      <p className="px-3 py-2 text-sm font-black text-slate-950">{username}</p>
                      <button type="button" onClick={() => setLocation("/settings")} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700">
                        <Settings className="h-4 w-4" /> Settings
                      </button>
                      <button type="button" onClick={() => setLocation("/account")} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700">
                        <User className="h-4 w-4" /> Account
                      </button>
                      <button type="button" onClick={logout} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50">
                        <LogOut className="h-4 w-4" /> Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-md border border-slate-200 bg-white xl:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <div className={`border-b border-slate-200 bg-white xl:hidden ${menuOpen ? "block" : "hidden"}`}>
        <div className="mx-auto max-h-[calc(100vh-132px)] max-w-[1500px] overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
          <MobileHeaderMenu />
          <div className="mt-4 grid gap-2">
            {isAuthenticated ? (
              <Link href="/dashboard" className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-green-500 px-5 text-sm font-black text-white">
                Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link href="/signup" className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-green-500 px-5 text-sm font-black text-white">
                  Start for FREE
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/login" className="inline-flex h-12 items-center justify-center gap-2 rounded-md border-2 border-black bg-white px-5 text-sm font-semibold text-black">
                  Login
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
    <div className={`${announcementEnabled ? "h-[137px]" : "h-20"} shrink-0`} aria-hidden="true" />
    </>
  );
};

export default Header;



