import { Link } from "wouter";
import { Languages } from "lucide-react";
import { LanguageSelector } from "../language-selector";
import {
  headerMenuLabels,
  headerMenuOrder,
  headerMenus,
} from "./headerMenus";

export function MobileHeaderMenu() {
  return (
    <div className="grid gap-2">
      <Link href="/#pricing" className="rounded-md px-3 py-3 text-sm font-black text-slate-900 hover:bg-slate-50">
        Pricing
      </Link>
      {headerMenuOrder.map((menu) => (
        <details key={menu} className="rounded-md border border-slate-100 bg-white">
          <summary className="cursor-pointer list-none px-3 py-3 text-sm font-black text-slate-900">
            {headerMenuLabels[menu]}
          </summary>
          <div className="grid gap-1 border-t border-slate-100 p-2">
            {headerMenus[menu].map((item) => (
              <Link
                key={`${menu}-mobile-${item.title}`}
                href={item.href}
                className="grid grid-cols-[34px_1fr] gap-3 rounded-md p-2 hover:bg-emerald-50"
              >
                <item.icon className="h-5 w-5 text-green-600" />
                <span>
                  <span className="block text-sm font-semibold text-slate-950">{item.title}</span>
                  <span className="block text-xs text-slate-500">{item.description}</span>
                </span>
              </Link>
            ))}
          </div>
        </details>
      ))}
      <Link href="/careers" className="rounded-md px-3 py-3 text-sm font-black text-slate-900 hover:bg-slate-50">
        Partner
      </Link>
      <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-3">
        <span className="inline-flex items-center gap-2 text-sm font-black text-slate-900">
          <Languages className="h-4 w-4" /> Language
        </span>
        <LanguageSelector />
      </div>
    </div>
  );
}
