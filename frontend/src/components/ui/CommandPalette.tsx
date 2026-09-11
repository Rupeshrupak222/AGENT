"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Bot,
  Phone,
  Target,
  Users,
  Calendar,
  BarChart3,
  CreditCard,
  Settings,
  Building2,
  Radio,
  Plus,
  ArrowRight,
  Sparkles,
  Shield,
  FileText,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions";

interface CommandItem {
  id: string;
  label: string;
  category: "Navigation" | "Quick Actions" | "Platform Governance";
  icon: any;
  href?: string;
  action?: () => void;
  badge?: string;
  roleRequired?: "super_admin" | "company_admin" | "manager";
  permission?: string;
}

export function CommandPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { can } = usePermissions();

  const role = (user?.role || "").toLowerCase().trim();
  const isSuperAdmin = role === "super_admin" || role === "superadmin" || role === "owner";

  // Build command item registry
  const allCommands: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = [
      // Navigation
      {
        id: "nav-overview",
        label: "Dashboard Overview",
        category: "Navigation",
        icon: BarChart3,
        href: "/dashboard/overview",
      },
      {
        id: "nav-agents",
        label: "AI Voice Agents",
        category: "Navigation",
        icon: Bot,
        href: "/dashboard/agents",
        permission: PERMISSIONS.AI_AGENT_VIEW,
      },
      {
        id: "nav-calls",
        label: "Call Center & Transcripts",
        category: "Navigation",
        icon: Phone,
        href: "/dashboard/calls",
        permission: PERMISSIONS.CALL_VIEW,
      },
      {
        id: "nav-campaigns",
        label: "Outbound Calling Campaigns",
        category: "Navigation",
        icon: Target,
        href: "/dashboard/campaigns",
        permission: PERMISSIONS.CAMPAIGN_VIEW,
      },
      {
        id: "nav-crm",
        label: "CRM & Contacts Pipeline",
        category: "Navigation",
        icon: Users,
        href: "/dashboard/crm",
        permission: PERMISSIONS.LEAD_VIEW,
      },
      {
        id: "nav-calendar",
        label: "Calendar Appointments",
        category: "Navigation",
        icon: Calendar,
        href: "/dashboard/calendar",
        permission: PERMISSIONS.CALENDAR_VIEW,
      },
      {
        id: "nav-analytics",
        label: "Analytics & Call Trends",
        category: "Navigation",
        icon: BarChart3,
        href: "/dashboard/analytics",
        permission: PERMISSIONS.ANALYTICS_VIEW,
      },
      {
        id: "nav-team",
        label: "Workspace & Team Members",
        category: "Navigation",
        icon: Building2,
        href: "/dashboard/workspace",
        permission: PERMISSIONS.WORKSPACE_VIEW,
      },
      {
        id: "nav-billing",
        label: "Billing & Minutes Subscriptions",
        category: "Navigation",
        icon: CreditCard,
        href: "/dashboard/billing",
        permission: PERMISSIONS.BILLING_VIEW,
      },
      {
        id: "nav-settings",
        label: "Company Settings & Integrations",
        category: "Navigation",
        icon: Settings,
        href: "/dashboard/settings",
        permission: PERMISSIONS.TEAM_VIEW,
      },
      // Quick Actions
      {
        id: "action-new-agent",
        label: "Create New AI Agent",
        category: "Quick Actions",
        icon: Plus,
        href: "/dashboard/agents",
        badge: "Create",
        permission: PERMISSIONS.AI_AGENT_CREATE,
      },
      {
        id: "action-new-campaign",
        label: "Launch Outbound Campaign",
        category: "Quick Actions",
        icon: Target,
        href: "/dashboard/campaigns",
        badge: "Autodialer",
        permission: PERMISSIONS.CAMPAIGN_CREATE,
      },
      {
        id: "action-import-leads",
        label: "Import Leads CSV",
        category: "Quick Actions",
        icon: Users,
        href: "/dashboard/crm",
        badge: "CRM",
        permission: PERMISSIONS.LEAD_IMPORT,
      },
      // Super Admin Controls
      {
        id: "sa-dashboard",
        label: "Platform Admin Dashboard",
        category: "Platform Governance",
        icon: BarChart3,
        href: "/dashboard/admin",
        badge: "Super Admin",
        roleRequired: "super_admin",
      },
      {
        id: "sa-tenants",
        label: "Manage Client Organizations",
        category: "Platform Governance",
        icon: Building2,
        href: "/dashboard/admin/companies",
        badge: "Super Admin",
        roleRequired: "super_admin",
      },
      {
        id: "sa-gateways",
        label: "Probe Speech AI & Telephony Gateways",
        category: "Platform Governance",
        icon: Radio,
        href: "/dashboard/admin/health",
        badge: "Diagnostics",
        roleRequired: "super_admin",
      },
      {
        id: "sa-audit",
        label: "Platform Audit & Security Logs",
        category: "Platform Governance",
        icon: Shield,
        href: "/dashboard/admin/audit",
        badge: "Audit",
        roleRequired: "super_admin",
      },
    ];

    return items.filter((item) => {
      if (item.roleRequired === "super_admin" && !isSuperAdmin) return false;
      if (item.permission && !can(item.permission as any)) return false;
      return true;
    });
  }, [isSuperAdmin, can]);

  // Filter commands based on user query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands;
    const q = query.toLowerCase();
    return allCommands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }, [allCommands, query]);

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // Keyboard navigation inside command palette
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = filteredCommands[selectedIndex];
        if (selected) {
          executeCommand(selected);
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex]);

  const executeCommand = (cmd: CommandItem) => {
    onClose();
    if (cmd.href) {
      router.push(cmd.href);
    } else if (cmd.action) {
      cmd.action();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -10 }}
        className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700/60 shadow-2xl overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 gap-3">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or jump to page... (e.g. Agents, Calls, CRM)"
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-400 outline-none"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700">
            ESC
          </kbd>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No matching destinations or commands found.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  onClick={() => executeCommand(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all text-left ${
                    isSelected
                      ? "bg-brand-600 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "bg-white/20" : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <p className="font-semibold truncate">{cmd.label}</p>
                      <p
                        className={`text-[10px] truncate ${
                          isSelected ? "text-white/80" : "text-slate-500"
                        }`}
                      >
                        {cmd.category}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {cmd.badge && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}
                      >
                        {cmd.badge}
                      </span>
                    )}
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-white" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span>Navigation:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">↑</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">↓</kbd>
            <span>Select:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">↵</kbd>
          </div>
          <span className="font-medium text-slate-400">AgentCall Command Center</span>
        </div>
      </motion.div>
    </div>
  );
}
