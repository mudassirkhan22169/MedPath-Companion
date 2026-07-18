import React from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  LayoutDashboard, 
  Bot, 
  BookOpen, 
  Pill, 
  Microscope, 
  FileText, 
  User, 
  LogOut,
  Stethoscope
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ai-assistant", label: "AI Assistant", icon: Bot },
  { href: "/disease-library", label: "Disease Library", icon: BookOpen },
  { href: "/drug-guide", label: "Drug Guide", icon: Pill },
  { href: "/investigation-interpreter", label: "Investigations", icon: Microscope },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/profile", label: "Profile", icon: User },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-gray-50/50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 left-0 bg-white border-r z-10 shadow-sm">
        <div className="h-16 flex items-center px-6 border-b">
          <Link href="/dashboard" className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
            <Stethoscope className="w-6 h-6" />
            <span>MedPath</span>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-gray-400")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t">
          <button 
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-5 h-5 text-gray-400" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 flex flex-col min-w-0 pb-16 md:pb-0">
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-between px-2 pb-safe pt-1 z-50">
        {[
          { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
          { href: "/ai-assistant", icon: Bot, label: "AI" },
          { href: "/disease-library", icon: BookOpen, label: "Library" },
          { href: "/notes", icon: FileText, label: "Notes" },
          { href: "/profile", icon: User, label: "Profile" }
        ].map((item) => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center p-2 min-w-[64px]",
                isActive ? "text-primary" : "text-gray-500"
              )}
            >
              <item.icon className={cn("w-6 h-6 mb-1", isActive ? "text-primary" : "text-gray-400")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
