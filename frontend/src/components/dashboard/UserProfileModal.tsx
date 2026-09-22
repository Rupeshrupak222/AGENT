"use client";

import React, { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Shield,
  Building2,
  Mail,
  Phone,
  Crown,
  Key,
  CreditCard,
  Settings,
  LogOut,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Headphones,
  UserCheck,
  Copy,
  Radio,
  Sliders,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useToast } from "@/components/ui/Toast";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { user, tenant, logout } = useAuthStore();
  const router = useRouter();
  const { success, info } = useToast();

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const rawRole = (user?.role || "").toLowerCase().trim();
  const isSuperAdmin = rawRole === "super_admin" || rawRole === "superadmin" || rawRole === "owner";
  const isManager = rawRole === "manager" || rawRole === "supervisor";
  const isCompanyAdmin = rawRole === "company_admin" || rawRole === "admin" || (!isSuperAdmin && !isManager);

  // Role metadata tailored to user's permission clearance
  const roleConfig = useMemo(() => {
    if (isSuperAdmin) {
      return {
        roleLabel: "Platform Super Admin",
        badge: "Cluster Root Authority",
        badgeColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
        clearance: "Tier 5 · Root Infrastructure Clearance",
        accentGlow: "from-amber-500/20 via-brand-500/10 to-purple-500/10",
        avatarGradient: "from-amber-500 to-amber-700",
        department: "Core Infrastructure & SecOps",
        capabilities: [
          "Cross-Tenant Governance",
          "SIP Trunk Carrier Gateways",
          "Global RBAC & Security Overrides",
          "AI Provider Latency Diagnostics",
        ],
        primaryAction: { label: "Super Admin Control Plane", href: "/dashboard/admin" },
      };
    }

    if (isManager) {
      return {
        roleLabel: "Call Center Operations Manager",
        badge: "Operations Supervisor",
        badgeColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
        clearance: "Tier 3 · Operations Supervisor Clearance",
        accentGlow: "from-blue-500/20 via-indigo-500/10 to-brand-500/10",
        avatarGradient: "from-blue-600 to-indigo-700",
        department: "Revenue Operations & SDR Swarm",
        capabilities: [
          "Live Audio Waveform Monitoring",
          "Supervisor AI Whisper & Barge-in",
          "Campaign Queue Scheduling",
          "Post-Call Sentiment QA Reviews",
        ],
        primaryAction: { label: "Live Call Center", href: "/dashboard/calls" },
      };
    }

    // Default: Company Admin
    return {
      roleLabel: "Company Administrator",
      badge: "Workspace Owner",
      badgeColor: "bg-brand-500/15 text-brand-600 dark:text-rose-400 border-brand-500/30",
      clearance: "Tier 4 · Tenant Administrator Clearance",
      accentGlow: "from-brand-500/20 via-rose-500/10 to-amber-500/10",
      avatarGradient: "from-brand-500 to-brand-700",
      department: "Executive Leadership & Operations",
      capabilities: [
        "Autonomous Multilingual Calling Fleet",
        "Carrier Telephony DIDs & Headers",
        "Team Members & Role Governance",
        "Enterprise Plan & Billing Invoices",
      ],
      primaryAction: { label: "Operations Dashboard", href: "/dashboard/overview" },
    };
  }, [isSuperAdmin, isManager]);

  const handleCopyId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      info("User ID copied to clipboard");
    }
  };

  const handleSignOut = () => {
    onClose();
    success("You have been signed out safely.");
    logout();
    router.push("/login");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="w-full max-w-xl rounded-3xl bg-white dark:bg-[#120a06] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden relative text-slate-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Background Aura */}
            <div
              className={`absolute top-0 inset-x-0 h-36 bg-gradient-to-b ${roleConfig.accentGlow} pointer-events-none opacity-80`}
            />

            {/* Modal Header Controls */}
            <div className="relative z-10 flex items-center justify-between p-6 pb-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider bg-black/5 dark:bg-white/10 text-slate-600 dark:text-white/70 border border-black/5 dark:border-white/10">
                <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                {roleConfig.clearance}
              </span>

              <button
                onClick={onClose}
                aria-label="Close profile popup"
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Identity Card */}
            <div className="relative z-10 p-6 pt-4 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Avatar with live status indicator */}
                <div className="relative flex-shrink-0">
                  <div
                    className={`w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${roleConfig.avatarGradient} flex items-center justify-center text-2xl font-black text-white shadow-xl`}
                  >
                    {user?.name?.[0]?.toUpperCase() ?? "U"}
                  </div>
                  <span
                    title="Active session"
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-3 border-white dark:border-[#120a06] flex items-center justify-center"
                  >
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </span>
                </div>

                {/* Identity Info */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white truncate">
                      {user?.name || "AgentCall Operator"}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${roleConfig.badgeColor}`}
                    >
                      {isSuperAdmin && <Crown className="w-3.5 h-3.5" />}
                      {roleConfig.badge}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-white/50 flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    {user?.email || "operator@agentcall.ai"}
                  </p>

                  <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-slate-500 dark:text-white/40 flex-wrap">
                    <span className="flex items-center gap-1 text-slate-700 dark:text-white/70">
                      <Building2 className="w-3 h-3 text-brand-500" />
                      {tenant?.name || "AgentCall Autonomous AI"}
                    </span>
                    {tenant?.plan && (
                      <span className="px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-600 dark:text-rose-300 font-bold border border-brand-500/20 uppercase">
                        {tenant.plan} Plan
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Role Scope & Department Banner */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-500 dark:text-white/50">Primary Designation:</span>
                  <span className="text-slate-900 dark:text-white font-bold">{roleConfig.roleLabel}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-500 dark:text-white/50">Assigned Department:</span>
                  <span className="text-slate-700 dark:text-white/80">{roleConfig.department}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold pt-1 border-t border-slate-200/60 dark:border-white/[0.06]">
                  <span className="text-slate-500 dark:text-white/50 font-mono text-[10px]">User Account ID:</span>
                  <button
                    onClick={handleCopyId}
                    className="flex items-center gap-1 text-[11px] font-mono text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    <span>{user?.id ? `${user.id.slice(0, 14)}…` : "usr_live_root"}</span>
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Authority & Capabilities Matrix */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-700 dark:text-white/80 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-brand-500" />
                  Role Capabilities & Operational Clearance
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {roleConfig.capabilities.map((cap) => (
                    <div
                      key={cap}
                      className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] flex items-center gap-2 text-xs text-slate-700 dark:text-white/70"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span className="truncate">{cap}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation Action Links */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                <Link
                  href="/dashboard/profile"
                  onClick={onClose}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-xs font-semibold text-slate-700 dark:text-white/80 border border-slate-200 dark:border-white/10 transition-colors"
                >
                  <span>Full Profile</span>
                  <ArrowRight className="w-3.5 h-3.5 text-brand-500" />
                </Link>

                <Link
                  href="/dashboard/settings"
                  onClick={onClose}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-xs font-semibold text-slate-700 dark:text-white/80 border border-slate-200 dark:border-white/10 transition-colors"
                >
                  <span>Settings</span>
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                </Link>

                <Link
                  href={isSuperAdmin ? "/dashboard/admin/billing" : "/dashboard/billing"}
                  onClick={onClose}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-xs font-semibold text-slate-700 dark:text-white/80 border border-slate-200 dark:border-white/10 transition-colors col-span-2 sm:col-span-1"
                >
                  <span>Billing & Plan</span>
                  <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                </Link>
              </div>

              {/* Footer: Primary Role Action & Sign Out */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-white/[0.08]">
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-2 px-4 h-9 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>

                <Link
                  href={roleConfig.primaryAction.href}
                  onClick={onClose}
                  className="inline-flex items-center gap-2 px-4 h-9 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-brand-700 hover:brightness-110 shadow-md shadow-brand-500/20 transition-all"
                >
                  <span>{roleConfig.primaryAction.label}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
