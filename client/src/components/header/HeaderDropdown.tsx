import { Link } from "wouter";
import { ChevronDown } from "lucide-react";
import {
  headerMenuLabels,
  headerMenus,
  type HeaderMenuKey,
} from "./headerMenus";

type HeaderDropdownProps = {
  menu: HeaderMenuKey;
  activeMenu: HeaderMenuKey | null;
  setActiveMenu: (menu: HeaderMenuKey | null) => void;
};

export function HeaderDropdown({
  menu,
  activeMenu,
  setActiveMenu,
}: HeaderDropdownProps) {
  const isActive = activeMenu === menu;

  return (
    <div
      className="relative"
      onMouseEnter={() => setActiveMenu(menu)}
      onMouseLeave={() => setActiveMenu(null)}
    >
      <button
        type="button"
        className="inline-flex h-11 items-center gap-1 whitespace-nowrap px-2 text-[15px] font-medium text-slate-950 transition hover:text-green-600 2xl:px-3 2xl:text-base"
        aria-expanded={isActive}
      >
        {headerMenuLabels[menu]}
        <ChevronDown className={`h-3.5 w-3.5 transition ${isActive ? "rotate-180" : ""}`} />
      </button>

      <div
        className={`absolute left-1/2 top-full z-[70] w-[340px] -translate-x-1/2 pt-3 transition duration-200 ${
          isActive
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-2 opacity-0"
        }`}
      >
        <div className="max-h-[calc(100vh-150px)] overflow-y-auto rounded-md border border-slate-100 bg-white p-3 shadow-2xl shadow-slate-950/18">
          {headerMenus[menu].map((item) => (
            <Link
              key={`${menu}-${item.title}`}
              href={item.href}
              className="grid grid-cols-[42px_1fr] gap-4 rounded-lg px-3 py-3 transition hover:bg-emerald-50"
            >
              <span className="flex h-10 w-10 items-center justify-center text-green-600">
                <item.icon className="h-6 w-6" />
              </span>
              <span className="min-w-0">
                <span className="block text-[17px] font-medium leading-5 text-slate-950">
                  {item.title}
                </span>
                <span className="mt-1 block text-[16px] leading-5 text-slate-500">
                  {item.description}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
