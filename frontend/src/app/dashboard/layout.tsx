"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  LayoutDashboard,
  Bot,
  Users,
  Phone,
  BarChart3,
  Settings,
  CreditCard,
  MessageSquare,
  Calendar,
  Bell,
  HelpCircle,
  LogOut,
  Building2,
  Mic2,
  Menu,
  X,
  Plus,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { bootstrapAuth } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { usePermissions } from "@/hooks/usePermissions";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/components/ui/Toast";
import { PERMISSIONS, Permission } from "@/lib/permissions";
import { Badge } from "@/components/ui/Badge";

interface NavItem {
  icon: any;
  label: string;
  href: string;
  permission: Permission;
  badge?: string;
}

const ALL_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard/overview", permission: PERMISSIONS.TENANT_VIEW },
    ],
  },
  {
    label: "AI Workforce",
    items: [
      { icon: Bot, label: "AI Agents", href: "/dashboard/agents", permission: PERMISSIONS.AI_AGENT_VIEW },
      { icon: Mic2, label: "Voices", href: "/dashboard/voices", permission: PERMISSIONS.AI_VOICE_MANAGE, badge: "New" },
    ],
  },
  {
    label: "Operations",
    items: [
      { icon: Phone, label: "Call Center", href: "/dashboard/calls", permission: PERMISSIONS.CALL_VIEW },
      { icon: Users, label: "CRM / Leads", href: "/dashboard/crm", permission: PERMISSIONS.LEAD_VIEW },
      { icon: Calendar, label: "Calendar", href: "/dashboard/calendar", permission: PERMISSIONS.CALENDAR_VIEW },
      { icon: MessageSquare, label: "Automations", href: "/dashboard/automations", permission: PERMISSIONS.AUTOMATION_VIEW },
    ],
  },
  {
    label: "Insights",
    items: [
      { icon: BarChart3, label: "Analytics", href: "/dashboard/analytics", permission: PERMISSIONS.ANALYTICS_VIEW },
    ],
  },
  {
    label: "Account",
    items: [
      { icon: Building2, label: "Workspace", href: "/dashboard/workspace", permission: PERMISSIONS.WORKSPACE_VIEW },
      { icon: CreditCard, label: "Billing", href: "/dashboard/billing", permission: PERMISSIONS.BILLING_VIEW },
      { icon: Settings, label: "Settings", href: "/dashboard/settings", permission: PERMISSIONS.TENANT_VIEW },
    ],
  },
];

const NOTIFS = [
  { id: 1, text: "Priya AI completed 50 calls today", time: "2m ago", unread: true },
  { id: 2, text: "New lead qualified: Rahul Sharma", time: "15m ago", unread: true },
  { id: 3, text: "Campaign 'Q3 Drive' reached 500 calls", time: "1h ago", unread: false },
];

function SidebarContent({
  collapsed = false,
  mobile = false,
  onClose,
}: {
  collapsed?: boolean;
  mobile?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { user, tenant, logout } = useAuthStore();
  const { can } = usePermissions();
  const router = useRouter();
  const { success } = useToast();
  const show = !collapsed || mobile;

  // Filter navigation groups based on permissions
  const groups = useMemo(() => {
    return ALL_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((item) => can(item.permission)),
    })).filter((g) => g.items.length > 0);
  }, [can]);

  return (
    <div className="flex flex-col h-full bg-surface-sidebar border-r border-line dark:border-brand-500/15 transition-colors duration-200">
      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-16 flex-shrink-0 border-b border-brand-500/15",
          show ? "px-5 gap-3" : "justify-center"
        )}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md shadow-brand-500/20 bg-gradient-to-br from-brand-500 to-brand-700">
          <Zap className="w-4 h-4 text-white fill-white" />
        </div>
        {show && (
          <span className="text-base font-bold text-slate-900 dark:text-white whitespace-nowrap">
            AgentCall <span className="gradient-text">AI</span>
          </span>
        )}
        {mobile && (
          <button
            onClick={onClose}
            className="ml-auto text-slate-400 dark:text-white/40 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-5">
        {groups.map((g) => (
          <div key={g.label}>
            {show && (
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/30">
                {g.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={!show ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                        show ? "px-3" : "justify-center mx-1",
                        active
                          ? "bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-white border border-brand-500/30 font-semibold shadow-sm"
                          : "text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04] border border-transparent"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-[18px] h-[18px] flex-shrink-0",
active
                          ? "text-brand-600 dark:text-rose-400"
                          : "text-slate-400 dark:text-white/40"
                        )}
                      />
                      {show && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-500/25 text-brand-700 dark:text-rose-300 border border-brand-200 dark:border-brand-500/30">
                              {item.badge}
                            </span>
                          ) : null}
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div
        className={cn(
          "p-2.5 space-y-1 flex-shrink-0 border-t border-brand-500/15",
          !show && "px-1"
        )}
      >
        <Link
          href="/help"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all",
            !show && "justify-center px-0"
          )}
        >
          <HelpCircle className="w-4 h-4 flex-shrink-0" />
          {show && <span>Help &amp; Support</span>}
        </Link>
        <button
          onClick={() => {
            success("You have been signed out safely.");
            logout();
            router.push("/login");
          }}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-500 dark:text-white/40 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all",
            !show && "justify-center px-0"
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {show && <span>Sign Out</span>}
        </button>
        {show && user && (
          <div className="flex items-center gap-3 px-3 py-2 mt-2 rounded-xl bg-slate-100/70 dark:bg-brand-500/10 border border-slate-200 dark:border-brand-500/20">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm bg-gradient-to-br from-brand-500 to-brand-700">
              {user.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {user.name}
              </p>
              <p className="text-[10px] capitalize truncate text-slate-500 dark:text-white/40">
                {tenant?.name ?? user.role?.replace("_", " ")}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, tenant, accessToken, isAuthenticated, logout } = useAuthStore();
  const { can } = usePermissions();
  const router = useRouter();
  const { success } = useToast();
  const [mounted, setMounted] = useState(false);
  const [sessionValidated, setSessionValidated] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Session revalidation on mount: verify persisted token via /auth/me
  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated && !accessToken) {
      setSessionValidated(true);
      return;
    }
    let active = true;
    (async () => {
      try {
        await bootstrapAuth();
      } catch {
        // Ignored; bootstrapAuth handles logout on failure
      } finally {
        if (active) setSessionValidated(true);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Hydration route guard
  useEffect(() => {
    if (mounted && !isAuthenticated && !accessToken) {
      router.replace("/login");
      const fallbackTimer = setTimeout(() => {
        if (!useAuthStore.getState().accessToken) {
          window.location.href = "/login";
        }
      }, 400);
      return () => clearTimeout(fallbackTimer);
    }
  }, [mounted, isAuthenticated, accessToken, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const fn = () => {
      setNotifOpen(false);
      setProfileOpen(false);
      setWorkspaceOpen(false);
    };
    document.addEventListener("click", fn);
    return () => document.removeEventListener("click", fn);
  }, []);

  // Guard against unauthenticated layout rendering during hydration
  if (!mounted || !sessionValidated) {
    return (
      <div className="flex h-screen items-center justify-center bg-page transition-colors duration-200">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center animate-pulse shadow-lg shadow-brand-500/20 bg-gradient-to-br from-brand-500 to-brand-700">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-white/40">
            Authenticating session...
          </p>
        </div>
      </div>
    );
  }

  // If session check has finished and user is not authenticated, render login redirect card
  if (!isAuthenticated && !accessToken) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-[#0c0102]">
        <div className="flex flex-col items-center gap-4 text-center p-6 max-w-sm mx-auto">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 bg-gradient-to-br from-brand-500 to-brand-700">
            <Zap className="w-6 h-6 text-white fill-white" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Authentication Required
          </h2>
          <p className="text-xs text-slate-500 dark:text-white/50 leading-relaxed">
            Please log in with your credentials to access the AgentCall AI dashboard.
          </p>
          <a
            href="/login"
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-brand-500 to-brand-700 hover:opacity-90 shadow-md shadow-brand-500/20 transition-all"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  const unread = NOTIFS.filter((n) => n.unread).length;
  const pageLabel = pathname.split("/").pop()?.replace(/-/g, " ") || "Dashboard";

  // Profile dropdown items filtered by permissions
  const profileItems = [
    { label: "Profile Settings", href: "/dashboard/settings", show: true },
    { label: "Workspace", href: "/dashboard/workspace", show: can(PERMISSIONS.WORKSPACE_VIEW) },
    { label: "Billing", href: "/dashboard/billing", show: can(PERMISSIONS.BILLING_VIEW) },
  ].filter((item) => item.show);

  return (
    <div className="flex h-screen overflow-hidden bg-page transition-colors duration-200">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col relative flex-shrink-0 transition-all duration-300",
          collapsed ? "w-[64px]" : "w-[240px]"
        )}
      >
        <SidebarContent collapsed={collapsed} />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center z-10 transition-all bg-input border border-slate-200 dark:border-brand-500/30 text-slate-500 dark:text-white/50 shadow-md hover:border-brand-500 hover:text-brand-600 dark:hover:text-white"
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 lg:hidden bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 h-full w-72 z-50 lg:hidden flex flex-col"
            >
              <SidebarContent mobile onClose={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 z-30 border-b border-slate-200 dark:border-brand-500/15 bg-surface-sidebar/85 backdrop-blur-xl transition-colors duration-200">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-500 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Workspace switcher */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  setWorkspaceOpen(!workspaceOpen);
                  setNotifOpen(false);
                  setProfileOpen(false);
                }}
                className="hidden sm:flex items-center gap-2 px-3 h-9 rounded-xl bg-slate-100/70 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/10 transition-all"
              >
                <Building2 className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span className="text-sm font-semibold text-slate-900 dark:text-white max-w-[140px] truncate">
                  {tenant?.name ?? "My Workspace"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-white/30" />
              </button>
              <AnimatePresence>
                {workspaceOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute left-0 top-12 w-64 rounded-2xl overflow-hidden z-50 bg-dropdown border border-slate-200 dark:border-brand-500/20 backdrop-blur-xl shadow-2xl"
                  >
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-white/[0.06]">
                      <p className="text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wide">
                        Workspaces
                      </p>
                    </div>
                    <div className="px-2 py-2">
                      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-brand-50/60 dark:bg-brand-500/10">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm bg-gradient-to-br from-brand-500 to-brand-700">
                          <Building2 className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {tenant?.name ?? "My Workspace"}
                          </p>
                          {tenant?.plan && (
                            <span className="text-[10px] capitalize text-slate-500 dark:text-white/40">
                              {tenant.plan} plan
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Link
                      href="/dashboard/workspace"
                      onClick={() => setWorkspaceOpen(false)}
                      className="block px-4 py-2.5 text-sm text-brand-600 dark:text-brand-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] border-t border-slate-200 dark:border-white/[0.06] transition-all"
                    >
                      Manage workspaces
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight capitalize truncate">
                {pageLabel}
              </h1>
              <p className="text-xs hidden sm:block text-slate-500 dark:text-white/40">
                {new Date().toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Search */}
            <div className="relative hidden sm:block">
              <AnimatePresence>
                {searchOpen ? (
                  <motion.input
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 200, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    autoFocus
                    onBlur={() => setSearchOpen(false)}
                    placeholder="Search..."
                    className="h-9 rounded-xl px-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/25 outline-none bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200 dark:border-brand-500/30"
                  />
                ) : (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setSearchOpen(true)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all bg-slate-100/70 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/50"
                  >
                    <Search className="w-4 h-4" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notifications */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  setProfileOpen(false);
                }}
                className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all bg-slate-100/70 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/60"
              >
                <Bell className="w-4 h-4" />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm bg-brand-500">
                    {unread}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute right-0 top-12 w-80 rounded-2xl overflow-hidden z-50 bg-dropdown border border-slate-200 dark:border-brand-500/20 backdrop-blur-xl shadow-2xl"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/[0.06]">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        Notifications
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-rose-300 border border-brand-200 dark:border-brand-500/30">
                        {unread} new
                      </span>
                    </div>
                    {NOTIFS.map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          "px-4 py-3 cursor-pointer transition-all border-b border-slate-200/70 dark:border-white/[0.04]",
                          n.unread
                            ? "bg-brand-50/50 dark:bg-brand-500/10"
                            : "hover:bg-slate-100 dark:hover:bg-white/[0.03]"
                        )}
                      >
                        <div className="flex gap-2.5">
                          {n.unread && (
                            <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-brand-500" />
                          )}
                          <div className={n.unread ? "" : "pl-4"}>
                            <p className="text-sm text-slate-700 dark:text-white/80">
                              {n.text}
                            </p>
                            <p className="text-xs mt-0.5 text-slate-500 dark:text-white/40">
                              {n.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="px-4 py-2.5 border-t border-slate-200/70 dark:border-white/[0.06]">
                      <button className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline">
                        View all →
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* New Agent — only visible if user can create agents */}
            {can(PERMISSIONS.AI_AGENT_CREATE) && (
              <Link
                href="/dashboard/agents"
                className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-xl text-white text-xs font-semibold transition-all active:scale-[0.97] shadow-md shadow-brand-500/20 bg-gradient-to-br from-brand-500 to-brand-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Agent</span>
              </Link>
            )}

            {/* Profile */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 h-9 px-2 rounded-xl transition-all hover:bg-slate-100 dark:hover:bg-white/[0.06]"
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm bg-gradient-to-br from-brand-500 to-brand-700">
                  {user?.name?.[0]?.toUpperCase() ?? "U"}
                </div>
                <span className="hidden sm:block text-xs font-medium max-w-[80px] truncate text-slate-700 dark:text-white/70">
                  {user?.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 hidden sm:block text-slate-400 dark:text-white/30" />
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute right-0 top-12 w-56 rounded-2xl overflow-hidden z-50 bg-dropdown border border-slate-200 dark:border-brand-500/20 backdrop-blur-xl shadow-2xl"
                  >
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-white/[0.06]">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {user?.name}
                      </p>
                      <p className="text-xs truncate text-slate-500 dark:text-white/40">
                        {user?.email}
                      </p>
                      <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-rose-300 border border-brand-200 dark:border-brand-500/30">
                        {user?.role === "super_admin" && <Shield className="w-2.5 h-2.5" />}
                        {user?.role?.replace("_", " ")}
                      </span>
                      {tenant?.plan && (
                        <Badge variant="info" className="ml-1 text-[10px]">
                          {tenant.plan}
                        </Badge>
                      )}
                    </div>
                    {profileItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-4 py-2.5 text-sm text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all"
                      >
                        {item.label}
                      </Link>
                    ))}
                    <div className="border-t border-slate-200/70 dark:border-white/[0.06]">
                      <button
                        onClick={() => {
                          success("You have been signed out safely.");
                          logout();
                          router.push("/login");
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto bg-page transition-colors duration-200">
          {children}
        </main>
      </div>
    </div>
  );
}
