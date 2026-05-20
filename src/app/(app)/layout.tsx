import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MobileNav } from "@/components/layout/mobile-nav";
import { 
  LayoutDashboard, 
  Building2, 
  Megaphone,
  BarChart3,
  LogOut
} from "lucide-react";

export const dynamic = "force-dynamic";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/brands", label: "Brands", icon: Building2 },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden w-64 border-r border-border bg-card/70 md:flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b">
          <Link href="/dashboard" className="font-bold text-lg">
            Creator Campaign OS
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User section */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 px-3 py-2 text-sm">
            <div className="flex-1 truncate">
              <p className="font-medium truncate">{user.email}</p>
            </div>
          </div>
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="flex items-center gap-3 border-b px-4 py-3 md:hidden">
          <MobileNav userEmail={user.email} />
          <Link href="/dashboard" className="font-bold text-base">
            Creator Campaign OS
          </Link>
        </div>
        <div className="container mx-auto px-4 py-6 max-w-6xl md:px-8 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
