"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Building2,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Users,
  X,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/creators", label: "Creators", icon: Users },
  { href: "/brands", label: "Brands", icon: Building2 },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function MobileNav({ userEmail }: { userEmail: string | undefined }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border bg-background text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          />

          <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-r bg-background shadow-lg">
            <div className="flex items-center justify-between border-b p-6">
              <Link
                href="/dashboard"
                className="font-bold text-lg"
                onClick={() => setOpen(false)}
              >
                Creator Campaign OS
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 p-4">
              <ul className="space-y-1">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="border-t p-4">
              <div className="flex items-center gap-3 px-3 py-2 text-sm">
                <div className="flex-1 truncate">
                  <p className="font-medium truncate">{userEmail}</p>
                </div>
              </div>
              <form action="/auth/signout" method="POST">
                <button
                  type="submit"
                  className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
