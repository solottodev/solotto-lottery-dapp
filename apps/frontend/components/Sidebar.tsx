"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { name: "Control", href: "/dashboard/control" },
  { name: "Snapshot", href: "/dashboard/snapshot" },
  { name: "Drawing", href: "/dashboard/drawing" },
  { name: "History", href: "/dashboard/history" }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-20 flex h-screen w-64 flex-col justify-between bg-night-900 shadow-xl">
      <div>
        <div className="p-6 text-xl font-bold tracking-wide text-primary">Solotto</div>
        <nav className="flex flex-col gap-1 px-4">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <span
                className={`block rounded px-4 py-2 text-sm font-medium ${
                  pathname === item.href
                    ? "bg-primary text-night font-semibold shadow-glow"
                    : "text-slate-400 hover:bg-night-800 hover:text-white"
                }`}
              >
                {item.name}
              </span>
            </Link>
          ))}
        </nav>
      </div>
      <div className="p-4">
        <div className="text-xs text-slate-500">v1.0.0</div>
      </div>
    </aside>
  );
}
