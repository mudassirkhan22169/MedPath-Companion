import React from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Bot, BookOpen, Pill, Microscope, FileText,
  User, LogOut, Stethoscope, ClipboardList, Calculator, Clipboard
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ai-assistant", label: "AI Assistant", icon: Bot },
  { href: "/disease-library", label: "Disease Library", icon: BookOpen },
  { href: "/drug-guide", label: "Drug Guide", icon: Pill },
  { href: "/investigation-interpreter", label: "Investigations", icon: Microscope },
  { href: "/osce-practice", label: "OSCE Practice", icon: ClipboardList },
  { href: "/ward-round-checklist", label: "Ward Round", icon: Clipboard },
  { href: "/calculators", label: "Calculators", icon: Calculator },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/profile", label: "Profile", icon: User },
];

// Bottom nav shows 5 most-used items on mobile
const mobileNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { href: "/ai-assistant", icon: Bot, label: "AI" },
  { href: "/osce-practice", icon: ClipboardList, label: "OSCE" },
  { href: "/calculators", icon: Calculator, label: "Calc" },
  { href: "/notes", icon: FileText, label: "Notes" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-gray-50/50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 flex-col fixed inset-y-0 left-0 bg-white border-r z-10 shadow-sm">
        <div className="h-14 flex items-center px-5 border-b shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2 text-primary font-bold text-lg tracking-tight">
            <Stethoscope className="w-5 h-5" />
            <span>MedPath</span>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary" : "text-gray-400")} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t shrink-0">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4 text-gray-400 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-60 flex flex-col min-w-0 pb-20 md:pb-6">
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around items-stretch px-1 pb-safe z-50 h-16">
        {mobileNavItems.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-2 px-1",
                isActive ? "text-primary" : "text-gray-500"
              )}
            >
              <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-primary" : "text-gray-400")} />
              <span className="text-[9px] font-medium truncate w-full text-center">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
