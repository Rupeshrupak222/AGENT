"use client";

import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Building2,
  Users,
  Bot,
  Phone,
  Target,
  BarChart3,
  Activity,
  CreditCard,
  HeartPulse,
  Plug,
  Shield,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  ChevronDown,
  Zap,
  Globe,
  Headphones,
  PieChart,
  FileText,
  UserCog,
  BrainCircuit,
  RadioTower,
  Banknote,
  Settings2,
  Megaphone,
  ShieldCheck,
  Flag,
  KeyRound,
  FileBarChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/components/ui/Toast";
import { platformApi, GlobalSearchResult, superAdminApi } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserProfileModal } from "@/components/dashboard/UserProfileModal";

interface AdminNavItem {
  icon: any;
  label: string;
  href: string;
  section: string;
}

const ADMIN_NAV: AdminNavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard/admin", section: "PLATFORM" },
  { icon: Building2, label: "Companies", href: "/dashboard/admin/companies", section: "PLATFORM" },
  { icon: Users, label: "Users", href: "/dashboard/admin/users", section: "PLATFORM" },
  { icon: Bot, label: "AI Agents", href: "/dashboard/admin/agents", section: "PLATFORM" },
  { icon: Phone, label: "Calls", href: "/dashboard/admin/calls", section: "PLATFORM" },
  { icon: Target, label: "Campaigns", href: "/dashboard/admin/campaigns", section: "PLATFORM" },
  { icon: BarChart3, label: "Analytics", href: "/dashboard/admin/analytics", section: "INSIGHTS" },
  { icon: Activity, label: "Usage", href: "/dashboard/admin/usage", section: "INSIGHTS" },
  { icon: CreditCard, label: "Revenue", href: "/dashboard/admin/revenue", section: "INSIGHTS" },
  { icon: Plug, label: "Integrations", href: "/dashboard/admin/integrations", section: "SYSTEM" },
  { icon: HeartPulse, label: "System Health", href: "/dashboard/admin/health", section: "SYSTEM" },
  { icon: Shield, label: "Audit Logs", href: "/dashboard/admin/audit", section: "SYSTEM" },
  { icon: Settings, label: "Settings", href: "/dashboard/admin/settings", section: "ADMINISTRATION" },
  { icon: UserCog, label: "Admins", href: "/dashboard/admin/admins", section: "GOVERNANCE" },
  { icon: BrainCircuit, label: "AI Providers", href: "/dashboard/admin/ai-providers", section: "GOVERNANCE" },
  { icon: RadioTower, label: "Telephony", href: "/dashboard/admin/telephony", section: "GOVERNANCE" },
  { icon: Banknote, label: "Billing Plans", href: "/dashboard/admin/billing", section: "GOVERNANCE" },
  { icon: Settings2, label: "Role Permissions", href: "/dashboard/admin/permissions", section: "GOVERNANCE" },
  { icon: Flag, label: "Feature Flags", href: "/dashboard/admin/feature-flags", section: "GOVERNANCE" },
  { icon: KeyRound, label: "API Keys & Webhooks", href: "/dashboard/admin/api-keys", section: "GOVERNANCE" },
  { icon: FileBarChart, label: "Scheduled Reports", href: "/dashboard/admin/reports", section: "GOVERNANCE" },
  { icon: Megaphone, label: "Announcements", href: "/dashboard/admin/announcements", section: "GOVERNANCE" },
  { icon: Headphones, label: "Support Center", href: "/dashboard/admin/support", section: "GOVERNANCE" },
  { icon: ShieldCheck, label: "Security", href: "/dashboard/admin/security", section: "GOVERNANCE" },
];

const SECTION_LABELS: Record<string, string> = {
  PLATFORM: "Platform",
  INSIGHTS: "Insights",
  SYSTEM: "System",
  ADMINISTRATION: "Administration",
  GOVERNANCE: "Governance",
};

function AdminSidebarContent({
  collapsed = false,
  mobile = false,
  onClose,
  onNavigate,
  onOpenProfile,
}: {
  collapsed?: boolean;
  mobile?: boolean;
  onClose?: () => void;
  onNavigate?: () => void;
  onOpenProfile?: () => void;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const { success } = useToast();
  const show = !collapsed || mobile;

  const sections = ADMIN_NAV.reduce<Record<string, AdminNavItem[]>>((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0c0102] border-r border-slate-200 dark:border-white/[0.08]">
      {/* Logo */}
      <div className={cn("flex items-center h-16 flex-shrink-0 border-b border-slate-200 dark:border-white/[0.08]", show ? "px-5 gap-3" : "justify-center")}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-brand-500 to-brand-700 shadow-md shadow-brand-500/20">
          <Zap className="w-4 h-4 text-white fill-white" />
        </div>
        {show && (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-900 dark:text-white leading-none">
              AgentCall <span className="text-brand-500">AI</span>
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-amber-500 mt-0.5">
              Super Admin
            </span>
          </div>
        )}
        {mobile && (
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-5">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section}>
            {show && (
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/25">
                {SECTION_LABELS[section] || section}
              </p>
            )}
            <ul className="space-y-0.5">
              {items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard/admin" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      title={!show ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                        show ? "px-3" : "justify-center mx-1",
                        isActive
                          ? "bg-brand-500/10 dark:bg-brand-500/15 text-brand-600 dark:text-white font-semibold border border-brand-500/20"
                          : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04] border border-transparent"
                      )}
                    >
                      <Icon className={cn("w-[18px] h-[18px] flex-shrink-0", isActive ? "text-brand-500 dark:text-brand-400" : "text-slate-400 dark:text-white/35")} />
                      {show && <span className="flex-1 truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className={cn("p-2.5 space-y-1 flex-shrink-0 border-t border-slate-200 dark:border-white/[0.08]", !show && "px-1")}>
        {show && user && (
          <button
            type="button"
            onClick={() => onOpenProfile?.()}
            className="w-full flex items-center gap-3 px-3 py-2 mb-1 rounded-xl bg-slate-100/70 dark:bg-white/[0.04] hover:bg-slate-200/70 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] transition-all text-left cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 bg-gradient-to-br from-brand-500 to-brand-700 group-hover:scale-105 transition-transform overflow-hidden">
              {user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar} alt={user.name || ""} className="w-full h-full object-cover" />
              ) : (
                user.name?.[0]?.toUpperCase() ?? "U"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate group-hover:text-amber-500 transition-colors">{user.name}</p>
              <p className="text-[10px] text-slate-500 dark:text-white/35 truncate">{user.email}</p>
            </div>
          </button>
        )}
        {!show && user && (
          <button
            type="button"
            onClick={() => onOpenProfile?.()}
            title={user.name}
            className="w-full flex items-center justify-center py-2 mb-1 cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm bg-gradient-to-br from-brand-500 to-brand-700 group-hover:scale-110 transition-transform overflow-hidden">
              {user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar} alt={user.name || ""} className="w-full h-full object-cover" />
              ) : (
                user.name?.[0]?.toUpperCase() ?? "U"
              )}
            </div>
          </button>
        )}
        <button
          onClick={() => {
            success("Signed out safely.");
            logout();
            router.push("/login");
          }}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-500 dark:text-white/40 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all",
            !show && "justify-center px-0"
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {show && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );
}

const AdminLayoutContext = createContext<boolean>(false);
let cachedMaintenanceMode: boolean | null = null;

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const isNested = useContext(AdminLayoutContext);
  if (isNested) {
    return <>{children}</>;
  }

  return (
    <AdminLayoutContext.Provider value={true}>
      <AdminLayoutShell>{children}</AdminLayoutShell>
    </AdminLayoutContext.Provider>
  );
}

function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isAuthenticated, accessToken } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const hoverLeaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (hoverLeaveTimerRef.current) {
      clearTimeout(hoverLeaveTimerRef.current);
      hoverLeaveTimerRef.current = null;
    }
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverLeaveTimerRef.current) {
      clearTimeout(hoverLeaveTimerRef.current);
    }
    hoverLeaveTimerRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 180);
  }, []);

  useEffect(() => {
    setIsHovered(false);
    if (hoverLeaveTimerRef.current) {
      clearTimeout(hoverLeaveTimerRef.current);
    }
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (hoverLeaveTimerRef.current) {
        clearTimeout(hoverLeaveTimerRef.current);
      }
    };
  }, []);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GlobalSearchResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(() => cachedMaintenanceMode ?? false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sec = await superAdminApi.getSecurity();
        if (!cancelled) {
          cachedMaintenanceMode = !!sec.maintenanceMode;
          setMaintenanceMode(cachedMaintenanceMode);
        }
      } catch { /* non-fatal */ }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Global search
  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((p) => !p);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handler);
    searchInputRef.current?.focus();
    return () => window.removeEventListener("keydown", handler);
  }, [searchOpen]);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!q.trim()) { setSearchResults(null); return; }
    setSearchLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await platformApi.search(q);
        setSearchResults(results);
      } catch { setSearchResults(null); }
      finally { setSearchLoading(false); }
    }, 400);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#0a0102]">
        <aside className="hidden lg:flex flex-col w-[64px] bg-white dark:bg-[#0c0102] border-r border-slate-200 dark:border-white/[0.08]" />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b border-slate-200 dark:border-white/[0.08] bg-white/80 dark:bg-[#0c0102]/90 backdrop-blur-xl" />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    );
  }

  // Client-side role guard (defense in depth; the backend enforces real authorization)
  const rawRole = (user?.role || "").toLowerCase().trim();
  const isSuperAdmin = rawRole === "super_admin" || rawRole === "superadmin" || rawRole === "owner";
  if (!isAuthenticated) {
    return null; // dashboard layout handles login redirect
  }
  if (!isSuperAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-[#0a0102]">
        <div className="flex flex-col items-center gap-4 text-center p-6 max-w-sm mx-auto">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Access Restricted
          </h2>
          <p className="text-xs text-slate-500 dark:text-white/50 leading-relaxed">
            Your account does not have Super Admin privileges. Please contact the platform
            owner if you believe this is a mistake.
          </p>
          <button
            onClick={() => router.push("/dashboard/overview")}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-brand-500 to-brand-700 hover:opacity-90 shadow-md shadow-brand-500/20 transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentPage = ADMIN_NAV.find(
    (item) => pathname === item.href || (item.href !== "/dashboard/admin" && pathname.startsWith(item.href))
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#0a0102]">
      {/* Desktop Sidebar */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "hidden lg:flex flex-col relative flex-shrink-0 transition-all duration-300 ease-in-out z-20 overflow-hidden",
          isHovered ? "w-[250px]" : "w-[64px]"
        )}
      >
        <AdminSidebarContent
          collapsed={!isHovered}
          onNavigate={() => setIsHovered(false)}
          onOpenProfile={() => setIsProfileModalOpen(true)}
        />
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 lg:hidden bg-black/50" onClick={() => setMobileOpen(false)} />
            <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="fixed left-0 top-0 h-full w-72 z-50 lg:hidden">
              <AdminSidebarContent
                mobile
                onClose={() => setMobileOpen(false)}
                onOpenProfile={() => {
                  setMobileOpen(false);
                  setIsProfileModalOpen(true);
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 transition-all duration-300 ease-in-out">
        {maintenanceMode && (
          <div className="px-4 sm:px-6 py-2 flex-shrink-0 flex items-center gap-2 bg-amber-500/10 border-b border-amber-500/25 text-amber-600 dark:text-amber-400 text-xs font-medium">
            <Shield className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Maintenance mode is ON — tenant logins and voice calls are paused. Super admins remain able to sign in.</span>
          </div>
        )}
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 z-30 border-b border-slate-200 dark:border-white/[0.08] bg-white/80 dark:bg-[#0c0102]/90 backdrop-blur-xl">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {currentPage?.label || "Super Admin Dashboard"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 h-9 rounded-xl bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/50 text-xs transition-all"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden lg:inline font-medium">Search everything...</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/60">⌘K</kbd>
            </button>
            <ThemeToggle />
            <Link href="/dashboard/admin" className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/50 transition-all">
              <Bell className="w-4 h-4" />
            </Link>
            <button
              onClick={() => setIsProfileModalOpen(true)}
              aria-label="Super Admin Profile"
              className="flex items-center gap-2 px-2.5 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 border border-amber-200 dark:border-amber-500/20 transition-all cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline text-xs font-semibold text-amber-600 dark:text-amber-400">Super Admin</span>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-br from-amber-500 to-amber-700 ml-1 overflow-hidden">
                {user?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar} alt={user?.name || ""} className="w-full h-full object-cover" />
                ) : (
                  user?.name?.[0]?.toUpperCase() ?? "S"
                )}
              </div>
            </button>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Global Search Modal */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
            onClick={() => setSearchOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="w-full max-w-xl rounded-2xl bg-white dark:bg-[#120a06] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-white/[0.08]">
                <Search className="w-5 h-5 text-slate-400 dark:text-white/40" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search companies, users, agents, calls..."
                  className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 outline-none"
                />
                <kbd className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/50">ESC</kbd>
              </div>
              <div className="max-h-[400px] overflow-y-auto p-2">
                {searchLoading && (
                  <div className="py-8 text-center text-sm text-slate-400 dark:text-white/40">Searching...</div>
                )}
                {!searchLoading && searchResults && (
                  <div className="space-y-1">
                    {searchResults.companies.length > 0 && (
                      <div>
                        <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/25">Companies</p>
                        {searchResults.companies.map((c) => (
                          <Link key={c.id} href={`/dashboard/admin/companies/${c.id}`} onClick={() => setSearchOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all">
                            <Building2 className="w-4 h-4 text-slate-400 dark:text-white/35" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{c.name}</p>
                              <p className="text-xs text-slate-500 dark:text-white/35">/{c.slug} · {c.plan}</p>
                            </div>
                            <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold", c.isActive ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" : "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400")}>
                              {c.isActive ? "Active" : "Inactive"}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                    {searchResults.users.length > 0 && (
                      <div>
                        <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/25">Users</p>
                        {searchResults.users.map((u) => (
                          <Link key={u.id} href="/dashboard/admin/users" onClick={() => setSearchOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all">
                            <Users className="w-4 h-4 text-slate-400 dark:text-white/35" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{u.name}</p>
                              <p className="text-xs text-slate-500 dark:text-white/35">{u.email} · {u.role}</p>
                            </div>
                            <span className="text-xs text-slate-400 dark:text-white/30">{u.tenant.name}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                    {searchResults.agents.length > 0 && (
                      <div>
                        <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/25">AI Agents</p>
                        {searchResults.agents.map((a) => (
                          <Link key={a.id} href="/dashboard/admin/agents" onClick={() => setSearchOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all">
                            <Bot className="w-4 h-4 text-slate-400 dark:text-white/35" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{a.name}</p>
                              <p className="text-xs text-slate-500 dark:text-white/35">{a.role} · {a.tenant.name}</p>
                            </div>
                            <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold", a.status === "active" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/50")}>
                              {a.status}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                    {searchResults.calls.length > 0 && (
                      <div>
                        <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/25">Calls</p>
                        {searchResults.calls.map((c) => (
                          <Link key={c.id} href={`/dashboard/admin/calls/${c.id}`} onClick={() => setSearchOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all">
                            <Phone className="w-4 h-4 text-slate-400 dark:text-white/35" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{c.phone}</p>
                              <p className="text-xs text-slate-500 dark:text-white/35">{c.direction} · {c.status} · {c.tenant.name}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                    {!searchLoading && searchResults.companies.length === 0 && searchResults.users.length === 0 && searchResults.agents.length === 0 && searchResults.calls.length === 0 && (
                      <div className="py-8 text-center text-sm text-slate-400 dark:text-white/40">No results found for &ldquo;{searchQuery}&rdquo;</div>
                    )}
                  </div>
                )}
                {!searchLoading && !searchResults && (
                  <div className="py-8 text-center text-sm text-slate-400 dark:text-white/40">Type to search across the platform</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Profile Pop-Up Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
}
