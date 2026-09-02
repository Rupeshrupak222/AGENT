"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Zap, LayoutDashboard, Bot, Users, Phone, BarChart3,
  Settings, CreditCard, ChevronLeft, ChevronRight,
  MessageSquare, Calendar, Bell, HelpCircle, LogOut,
  Building2, Mic2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

const navGroups = [
  {
    label: "Overview",
    items: [
      { icon: <LayoutDashboard className="w-4.5 h-4.5" />, label: "Dashboard",   href: "/dashboard",           badge: null },
    ],
  },
  {
    label: "AI Workforce",
    items: [
      { icon: <Bot className="w-4.5 h-4.5" />,       label: "AI Agents",     href: "/dashboard/agents",    badge: null },
      { icon: <Mic2 className="w-4.5 h-4.5" />,      label: "Voice Library", href: "/dashboard/voices",    badge: "New" },
    ],
  },
  {
    label: "Operations",
    items: [
      { icon: <Phone className="w-4.5 h-4.5" />,     label: "Call Center",   href: "/dashboard/calls",     badge: null },
      { icon: <Users className="w-4.5 h-4.5" />,     label: "CRM / Leads",   href: "/dashboard/crm",       badge: null },
      { icon: <Calendar className="w-4.5 h-4.5" />,  label: "Calendar",      href: "/dashboard/calendar",  badge: null },
      { icon: <MessageSquare className="w-4.5 h-4.5" />, label: "Automations", href: "/dashboard/automations", badge: null },
    ],
  },
  {
    label: "Insights",
    items: [
      { icon: <BarChart3 className="w-4.5 h-4.5" />, label: "Analytics",     href: "/dashboard/analytics", badge: null },
    ],
  },
  {
    label: "Account",
    items: [
      { icon: <Building2 className="w-4.5 h-4.5" />, label: "Workspace",     href: "/dashboard/workspace", badge: null },
      { icon: <CreditCard className="w-4.5 h-4.5" />,label: "Billing",       href: "/dashboard/billing",   badge: null },
      { icon: <Settings className="w-4.5 h-4.5" />,  label: "Settings",      href: "/dashboard/settings",  badge: null },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen border-r border-white/[0.07] bg-[#0d0d1f]",
        "transition-all duration-300 ease-in-out flex-shrink-0",
        collapsed ? "w-[64px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 px-4 h-16 border-b border-white/[0.07]",
        collapsed && "justify-center px-0"
      )}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0 shadow-brand-sm">
          <Zap className="w-4 h-4 text-white fill-white" />
        </div>
        {!collapsed && (
          <span className="text-base font-bold text-white whitespace-nowrap">
            AgentCall <span className="gradient-text">AI</span>
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 mb-1 text-[10px] font-semibold text-white/25 uppercase tracking-widest">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                        collapsed ? "justify-center px-0 py-2.5 mx-1" : "",
                        active
                          ? "bg-brand-500/15 text-white border border-brand-500/25"
                          : "text-white/50 hover:text-white hover:bg-white/[0.04]"
                      )}
                    >
                      <span className={cn("flex-shrink-0", active ? "text-brand-400" : "")}>
                        {item.icon}
                      </span>
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge && (
                            <Badge variant="blue" className="text-[10px] py-0 px-1.5">{item.badge}</Badge>
                          )}
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

      {/* Bottom user area */}
      <div className={cn("border-t border-white/[0.07] p-3 space-y-1", collapsed && "px-1")}>
        <Link
          href="/help"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/40 hover:text-white hover:bg-white/5 transition-all",
            collapsed && "justify-center px-0"
          )}
        >
          <HelpCircle className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Help &amp; Support</span>}
        </Link>
        <button
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/40 hover:text-red-400 hover:bg-red-500/5 transition-all",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>

        {/* User chip */}
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2 mt-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">Acme Corp</p>
              <p className="text-[10px] text-white/35 truncate">Growth Plan</p>
            </div>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[#1a1a30] border border-white/15 flex items-center justify-center text-white/50 hover:text-white hover:border-brand-500/50 transition-all shadow-lg z-10"
      >
        {collapsed
          ? <ChevronRight className="w-3.5 h-3.5" />
          : <ChevronLeft className="w-3.5 h-3.5" />
        }
      </button>
    </aside>
  );
}
