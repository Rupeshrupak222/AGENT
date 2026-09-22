"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  ShieldCheck,
  Building2,
  Users,
  Key,
  Crown,
  CheckCircle2,
  Lock,
  Mail,
  Globe,
  ArrowUpRight,
  Sparkles,
  Save,
  Check,
  Sliders,
  RefreshCw,
  LogOut,
  UserCircle2,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useToast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { authApi } from "@/lib/api";

// ── Role Metadata Definition ────────────────────────────────────
interface RoleConfig {
  name: string;
  badge: string;
  badgeColor: string;
  clearance: string;
  accentGradient: string;
  borderAccent: string;
  summary: string;
  defaultTitle: string;
  defaultDepartment: string;
  scope: string;
  portalLink?: { label: string; href: string };
  highlights: { label: string; value: string; hint: string }[];
  responsibilities: string[];
  restrictions: string[];
}

const ROLE_DEFINITIONS: Record<string, RoleConfig> = {
  super_admin: {
    name: "Platform Super Admin",
    badge: "Cluster Root (Super Admin)",
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    clearance: "Tier 5 · Root Infrastructure Clearance",
    accentGradient: "from-amber-600/25 via-purple-600/15 to-slate-900/40",
    borderAccent: "border-amber-500/30",
    summary:
      "Root authority across all organizational tenants, cluster telephony gateways, AI model providers, platform pricing, and multi-tenant isolation policies.",
    defaultTitle: "Principal Platform Infrastructure Architect",
    defaultDepartment: "Core Infrastructure & SecOps",
    scope: "Platform-wide (Cross-tenant Cluster Root)",
    portalLink: { label: "Super Admin Control Plane", href: "/dashboard/admin" },
    highlights: [
      { label: "Platform Access", value: "Root Level 5", hint: "Unrestricted cluster authority" },
      { label: "Tenant Directory", value: "All Tenants", hint: "Full multi-tenant governance" },
      { label: "Carrier Routing", value: "SIP Gateways", hint: "Twilio, Exotel & Direct Trunks" },
      { label: "Audit Vault", value: "Immutable", hint: "Full cryptographic audit visibility" },
    ],
    responsibilities: [
      "Manage all tenant workspaces, subscription overrides, and platform isolation limits",
      "Configure global wholesale telephony gateways (Twilio, Exotel, WebRTC Sandbox)",
      "Monitor AI provider quotas, model latency, and runtime diagnostics",
      "Define global RBAC role permissions, security allowlists, and system policies",
      "Investigate platform audit logs and platform security telemetry",
    ],
    restrictions: [],
  },

  company_admin: {
    name: "Company Administrator",
    badge: "Workspace Owner (Company Admin)",
    badgeColor: "bg-brand-500/10 text-brand-600 dark:text-rose-400 border-brand-500/30",
    clearance: "Tier 4 · Tenant Administrator Clearance",
    accentGradient: "from-brand-600/25 via-rose-600/15 to-slate-900/40",
    borderAccent: "border-brand-500/30",
    summary:
      "Executive owner of the organizational voice AI fleet. Manages team staffing, carrier phone numbers, AI prompt architectures, campaign budgets, and enterprise subscriptions.",
    defaultTitle: "VP of Voice Operations & Workspace Owner",
    defaultDepartment: "Executive Leadership & Operations",
    scope: "Tenant-wide (Acme Corp Workspace)",
    portalLink: { label: "Workspace Settings", href: "/dashboard/settings" },
    highlights: [
      { label: "Workspace Role", value: "Primary Owner", hint: "Complete organizational control" },
      { label: "Active Agents", value: "5 Voice Bots", hint: "Operational SDR & Support fleet" },
      { label: "Subscription", value: "Enterprise Plan", hint: "Unlimited concurrency & analytics" },
      { label: "Phone Numbers", value: "12 DIDs Active", hint: "Inbound & outbound routing ready" },
    ],
    responsibilities: [
      "Provision and assign telephony phone numbers (DIDs) to AI voice agents",
      "Invite team members, assign operational roles, and manage team member access",
      "Upgrade subscriptions, manage Razorpay/Stripe billing, and download invoices",
      "Configure webhook destinations, Zapier integrations, and CRM sync rules",
      "Deploy, pause, and supervise AI agent personas and knowledge sources",
    ],
    restrictions: [
      "Cannot modify root cluster carrier gateway configs (Managed by Platform Super Admin)",
      "Cannot view or manipulate data belonging to other companies/tenants",
    ],
  },

  manager: {
    name: "Call Center Operations Manager",
    badge: "Operations Director (Manager)",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    clearance: "Tier 3 · Operational Supervisor Clearance",
    accentGradient: "from-blue-600/25 via-indigo-600/15 to-slate-900/40",
    borderAccent: "border-blue-500/30",
    summary:
      "Operational supervisor directing daily voice campaigns, reviewing live call sentiments, intervening in live calls via whisper/barge, and coaching SDR pipelines.",
    defaultTitle: "Call Center Operations Director",
    defaultDepartment: "Customer Acquisition & Revenue Operations",
    scope: "Departmental Operations (Acme Corp)",
    portalLink: { label: "Live Call Center", href: "/dashboard/calls" },
    highlights: [
      { label: "Supervised Fleet", value: "5 Voice Agents", hint: "Active autonomous SDRs" },
      { label: "Active Campaigns", value: "4 Outbound", hint: "Scheduled calling queues" },
      { label: "Live Supervision", value: "Whisper & Barge", hint: "Real-time call intervention" },
      { label: "Quality Score", value: "92.4% Avg", hint: "Based on AI post-call sentiment" },
    ],
    responsibilities: [
      "Supervise live ongoing calls with real-time audio streaming and whisper guidance",
      "Launch, pause, and monitor outbound sales and appointment-setting campaigns",
      "Manage lead import, CRM pipeline stages, and contact dispositioning",
      "Review AI post-call transcripts, sentiment analyses, and QA audit recordings",
      "Inspect team calendar appointments, rescheduling, and reminder queues",
    ],
    restrictions: [
      "Cannot modify tenant billing, payment methods, or plan subscriptions",
      "Cannot purchase or delete carrier telephony phone numbers (DIDs)",
      "Cannot delete the workspace or remove primary company administrators",
      "Cannot modify root API keys or wholesale carrier routes",
    ],
  },
};

// Fallback for agent or viewer
const DEFAULT_ROLE_CONFIG: RoleConfig = {
  name: "Operator Specialist",
  badge: "Agent Specialist",
  badgeColor: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30",
  clearance: "Tier 2 · Operational Specialist",
  accentGradient: "from-slate-600/25 via-slate-700/15 to-slate-900/40",
  borderAccent: "border-slate-500/30",
  summary: "Assigned operator managing customer engagements and contact pipelines.",
  defaultTitle: "Voice AI Operator",
  defaultDepartment: "Operations",
  scope: "Assigned Queue Scope",
  highlights: [
    { label: "Assigned Desk", value: "General Queue", hint: "Incoming & outgoing desk" },
    { label: "Queue Status", value: "Online", hint: "Ready for live transfer" },
  ],
  responsibilities: ["Review assigned calls and update lead dispositions"],
  restrictions: ["Administrative actions restricted"],
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, tenant, login, updateUser, logout } = useAuthStore();
  const { success, error, warning } = useToast();

  const userRole = (user?.role || "company_admin").toLowerCase();
  const currentRoleConfig = ROLE_DEFINITIONS[userRole] || DEFAULT_ROLE_CONFIG;

  // Form State
  const [name, setName] = useState(user?.name || "User");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "+91 98765 43210");
  const [title, setTitle] = useState(
    user?.settings?.title || currentRoleConfig.defaultTitle
  );
  const [department, setDepartment] = useState(
    user?.settings?.department || currentRoleConfig.defaultDepartment
  );
  const [bio, setBio] = useState(
    user?.settings?.bio || currentRoleConfig.summary
  );
  const [timezone, setTimezone] = useState(
    user?.settings?.timezone || "Asia/Kolkata (IST)"
  );
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "permissions" | "security">("overview");
  const [switchingRole, setSwitchingRole] = useState<string | null>(null);

  // Sync state if user changes
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "+91 98765 43210");
      setTitle(user.settings?.title || currentRoleConfig.defaultTitle);
      setDepartment(user.settings?.department || currentRoleConfig.defaultDepartment);
      setBio(user.settings?.bio || currentRoleConfig.summary);
      setTimezone(user.settings?.timezone || "Asia/Kolkata (IST)");
    }
  }, [user, userRole, currentRoleConfig]);

  // Handle Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      updateUser({
        name,
        phone,
        settings: {
          ...(user?.settings || {}),
          title,
          department,
          bio,
          timezone,
        },
      });
      success("Profile details updated successfully.");
    } catch {
      error("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  // Quick Demo Role Switcher
  const handleQuickRoleSwitch = async (targetEmail: string, roleName: string) => {
    setSwitchingRole(roleName);
    try {
      const res = await authApi.login({ email: targetEmail, password: "Demo@1234" });
      if (res && res.user && res.accessToken) {
        login(res.user, res.tenant, res.accessToken, res.refreshToken);
        success(`Switched active profile to ${roleName} (${targetEmail})`);
      } else {
        warning(`Could not auto-authenticate as ${roleName}. Please use login.`);
      }
    } catch (err: any) {
      error(err?.response?.data?.message || `Failed to switch to ${roleName}`);
    } finally {
      setSwitchingRole(null);
    }
  };

  // Permission Matrix Groups for Interactive Inspection
  const permissionGroups = [
    {
      name: "Platform & Root Administration",
      permissions: [
        { key: PERMISSIONS.PLATFORM_TENANT_CREATE, label: "Create New Workspaces / Tenants", requiredRole: "super_admin" },
        { key: PERMISSIONS.PLATFORM_TENANT_MANAGE, label: "Manage Cross-Tenant Subscriptions & Isolation", requiredRole: "super_admin" },
        { key: PERMISSIONS.PLATFORM_TELEPHONY, label: "Wholesale Carrier Trunk Routing & SIP Gateways", requiredRole: "super_admin" },
        { key: PERMISSIONS.PLATFORM_AI_PROVIDERS, label: "AI Model Gateway Telemetry & Probes", requiredRole: "super_admin" },
        { key: PERMISSIONS.PLATFORM_BILLING_CONFIG, label: "Global Pricing Tier & Invoice Rules", requiredRole: "super_admin" },
        { key: PERMISSIONS.PLATFORM_AUDIT, label: "Immutable Platform Root Audit Vault", requiredRole: "super_admin" },
      ],
    },
    {
      name: "Workspace & Team Management",
      permissions: [
        { key: PERMISSIONS.TENANT_VIEW, label: "View Workspace Configuration & Health", requiredRole: "company_admin" },
        { key: PERMISSIONS.TENANT_UPDATE, label: "Update Workspace Branding & Regional Settings", requiredRole: "company_admin" },
        { key: PERMISSIONS.TEAM_VIEW, label: "View Organizational Staff Roster", requiredRole: "manager" },
        { key: PERMISSIONS.TEAM_INVITE, label: "Invite New Team Members & Assign Roles", requiredRole: "company_admin" },
        { key: PERMISSIONS.TEAM_REVOKE, label: "Revoke Staff Credentials & Deprovision Access", requiredRole: "company_admin" },
      ],
    },
    {
      name: "Autonomous Voice Fleet & Campaigns",
      permissions: [
        { key: PERMISSIONS.AI_AGENT_VIEW, label: "View Deployed AI Agents & Live State", requiredRole: "manager" },
        { key: PERMISSIONS.AI_AGENT_CREATE, label: "Design, Prompt & Deploy Autonomous Voice Agents", requiredRole: "company_admin" },
        { key: PERMISSIONS.AI_VOICE_MANAGE, label: "Configure Edge-TTS / ElevenLabs Voice Synthesis", requiredRole: "manager" },
        { key: PERMISSIONS.CAMPAIGN_VIEW, label: "Inspect Campaign Telemetry & Conversion Funnels", requiredRole: "manager" },
        { key: PERMISSIONS.CAMPAIGN_EXECUTE, label: "Execute, Pause & Schedule Outbound Dialing Runs", requiredRole: "manager" },
        { key: PERMISSIONS.CALL_MONITOR, label: "Real-time Live Call Audio Listen & Stream", requiredRole: "manager" },
        { key: PERMISSIONS.CALL_INTERVENE, label: "Live Supervisor Call Intervention (Whisper & Barge)", requiredRole: "manager" },
      ],
    },
    {
      name: "Billing, Integrations & Security",
      permissions: [
        { key: PERMISSIONS.BILLING_VIEW, label: "Inspect Current Invoices & Quota Usage", requiredRole: "company_admin" },
        { key: PERMISSIONS.BILLING_MANAGE, label: "Upgrade Plan & Process Razorpay/Stripe Payments", requiredRole: "company_admin" },
        { key: PERMISSIONS.TELEPHONY_MANAGE, label: "Provision Inbound/Outbound Phone DIDs", requiredRole: "company_admin" },
        { key: PERMISSIONS.INTEGRATIONS_MANAGE, label: "Manage Webhook Endpoints & API Keys", requiredRole: "company_admin" },
        { key: PERMISSIONS.SECURITY_MANAGE, label: "Enforce Multi-Factor Authentication & IP Allowlist", requiredRole: "company_admin" },
      ],
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/70 dark:bg-[#080204] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* ── Top Header & Role Switcher Bar ──────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <UserCircle2 className="w-5 h-5 text-brand-600 dark:text-rose-400" />
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Profile &amp; Role Identity
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-white/50">
              Manage your personal credentials, operational scope, and verified role permissions.
            </p>
          </div>

          {/* Quick Persona Switcher for Development & Demonstration */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 px-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Switch Persona:
            </span>

            <button
              onClick={() => handleQuickRoleSwitch("superadmin@agentcall.ai", "Super Admin")}
              disabled={switchingRole !== null}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                userRole === "super_admin"
                  ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20"
                  : "text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Super Admin</span>
              {switchingRole === "Super Admin" && <RefreshCw className="w-3 h-3 animate-spin" />}
            </button>

            <button
              onClick={() => handleQuickRoleSwitch("admin@acmecorp.com", "Company Admin")}
              disabled={switchingRole !== null}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                userRole === "company_admin"
                  ? "bg-brand-600 text-white shadow-sm shadow-brand-500/20"
                  : "text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Company Admin</span>
              {switchingRole === "Company Admin" && <RefreshCw className="w-3 h-3 animate-spin" />}
            </button>

            <button
              onClick={() => handleQuickRoleSwitch("manager@acmecorp.com", "Manager")}
              disabled={switchingRole !== null}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                userRole === "manager"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                  : "text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Manager</span>
              {switchingRole === "Manager" && <RefreshCw className="w-3 h-3 animate-spin" />}
            </button>
          </div>
        </div>

        {/* ── Role Hero Banner ────────────────────────────────────── */}
        <div
          className={`relative overflow-hidden rounded-3xl border ${currentRoleConfig.borderAccent} bg-gradient-to-br ${currentRoleConfig.accentGradient} p-6 sm:p-8 backdrop-blur-xl shadow-lg`}
        >
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4 sm:gap-5">
              {/* Avatar Circle with Badge */}
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-xl bg-gradient-to-br from-brand-500 to-brand-700 ring-4 ring-white/10">
                  {name?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                </div>
              </div>

              {/* User Info & Identity */}
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
                    {name}
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${currentRoleConfig.badgeColor}`}
                  >
                    {userRole === "super_admin" ? (
                      <Crown className="w-3 h-3 text-amber-500" />
                    ) : userRole === "company_admin" ? (
                      <Building2 className="w-3 h-3" />
                    ) : (
                      <Users className="w-3 h-3" />
                    )}
                    {currentRoleConfig.badge}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-white/70 font-medium">
                  {title} · <span className="text-slate-400 dark:text-white/40">{department}</span>
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500 dark:text-white/50">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    {email}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" />
                    {tenant?.name || "AgentCall Platform"}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-mono text-[11px] text-brand-600 dark:text-rose-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {currentRoleConfig.clearance}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Button for Role */}
            {currentRoleConfig.portalLink && (
              <div className="flex items-center gap-2.5">
                <Link
                  href={currentRoleConfig.portalLink.href}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-brand-500 to-brand-700 hover:opacity-95 shadow-md shadow-brand-500/20 transition-all flex items-center gap-2 flex-shrink-0"
                >
                  <span>{currentRoleConfig.portalLink.label}</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>

          {/* Quick Highlights Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-200/50 dark:border-white/10">
            {currentRoleConfig.highlights.map((h, i) => (
              <div
                key={i}
                className="p-3 rounded-2xl bg-white/60 dark:bg-white/[0.04] border border-white/60 dark:border-white/10 shadow-2xs backdrop-blur-xs"
              >
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {h.label}
                </p>
                <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {h.value}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-white/40 truncate mt-0.5">
                  {h.hint}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Navigation Tabs ─────────────────────────────────────── */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-brand-500/10 text-brand-600 dark:text-white border border-brand-500/30"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]"
            }`}
          >
            Role Overview &amp; Capabilities
          </button>
          <button
            onClick={() => setActiveTab("permissions")}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "permissions"
                ? "bg-brand-500/10 text-brand-600 dark:text-white border border-brand-500/30"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]"
            }`}
          >
            Verified Permission Matrix
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "security"
                ? "bg-brand-500/10 text-brand-600 dark:text-white border border-brand-500/30"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]"
            }`}
          >
            Account &amp; Security Settings
          </button>
        </div>

        {/* ── TAB 1: Role Overview & Scope ────────────────────────── */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Responsibilities & Boundaries */}
            <div className="lg:col-span-2 space-y-6">
              {/* Responsibilities */}
              <div className="p-6 rounded-3xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Authorized Role Responsibilities
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Active Clearance
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {currentRoleConfig.responsibilities.map((resp, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.05] flex items-start gap-3"
                    >
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <p className="text-xs text-slate-700 dark:text-white/80 leading-relaxed">
                        {resp}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Explicit Role Boundaries / Restrictions */}
              {currentRoleConfig.restrictions.length > 0 && (
                <div className="p-6 rounded-3xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Lock className="w-4 h-4 text-rose-500" />
                      Role Boundaries &amp; Safeguards
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                      RBAC Enforced
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {currentRoleConfig.restrictions.map((rest, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-rose-50/40 dark:bg-rose-500/[0.03] border border-rose-200/50 dark:border-rose-500/20 flex items-start gap-3"
                      >
                        <div className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Lock className="w-3 h-3" />
                        </div>
                        <p className="text-xs text-rose-800 dark:text-rose-200/80 leading-relaxed">
                          {rest}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Profile Editor */}
            <div className="space-y-6">
              <form
                onSubmit={handleSaveProfile}
                className="p-6 rounded-3xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-brand-600 dark:text-rose-400" />
                    Personal Information
                  </h3>
                  <Badge variant="gray" className="text-[10px]">
                    Editable
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-white/60 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full h-9 px-3 rounded-xl text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-hidden focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-white/60 mb-1">
                      Work Email (Authenticated)
                    </label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full h-9 px-3 rounded-xl text-xs bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 text-slate-500 dark:text-white/40 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-white/60 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-hidden focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-white/60 mb-1">
                      Official Role / Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-hidden focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-white/60 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-hidden focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-white/60 mb-1">
                      Timezone
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-hidden focus:border-brand-500"
                    >
                      <option value="Asia/Kolkata (IST)">Asia/Kolkata (IST · UTC+5:30)</option>
                      <option value="America/New_York (EST)">America/New_York (EST · UTC-5:00)</option>
                      <option value="Europe/London (GMT)">Europe/London (GMT · UTC+0:00)</option>
                      <option value="Asia/Dubai (GST)">Asia/Dubai (GST · UTC+4:00)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="w-full flex items-center justify-center gap-2 h-9 text-xs cursor-pointer"
                  >
                    {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save Profile Changes</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── TAB 2: Verified Permission Matrix ────────────────────── */}
        {activeTab === "permissions" && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-xs text-brand-800 dark:text-rose-200 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-brand-600 dark:text-rose-400 flex-shrink-0" />
              <p>
                Showing real-time RBAC policy claims for your current active role:{" "}
                <span className="font-bold underline uppercase">{userRole}</span>.
                Backend permissions are cryptographically checked on every API request.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {permissionGroups.map((group, gIdx) => (
                <div
                  key={gIdx}
                  className="p-6 rounded-3xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 shadow-xs space-y-3"
                >
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">
                    {group.name}
                  </h4>

                  <div className="space-y-2">
                    {group.permissions.map((perm) => {
                      const granted = hasPermission(userRole, perm.key as any);
                      return (
                        <div
                          key={perm.key}
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                            granted
                              ? "bg-emerald-500/[0.05] border-emerald-500/20 text-slate-800 dark:text-white"
                              : "bg-slate-50 dark:bg-white/[0.01] border-slate-200/60 dark:border-white/5 text-slate-400 dark:text-white/30"
                          }`}
                        >
                          <span className="font-medium">{perm.label}</span>
                          {granted ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3 stroke-[3]" /> Granted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-200/50 dark:bg-white/5 px-2 py-0.5 rounded-full">
                              <Lock className="w-3 h-3" /> Locked
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 3: Security & Session ───────────────────────────── */}
        {activeTab === "security" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Session Security */}
            <div className="p-6 rounded-3xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-brand-600 dark:text-rose-400" />
                Active Session Telemetry
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 flex items-center justify-between">
                  <span className="text-slate-500 dark:text-white/50">Authenticated ID</span>
                  <span className="font-mono text-slate-900 dark:text-white text-[11px] truncate max-w-[200px]">
                    {user?.id || "usr_seeded_default"}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 flex items-center justify-between">
                  <span className="text-slate-500 dark:text-white/50">Token Expiry &amp; Type</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Bearer JWT (7 Days)
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 flex items-center justify-between">
                  <span className="text-slate-500 dark:text-white/50">Multi-Factor Status</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Enforced
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 flex items-center justify-between">
                  <span className="text-slate-500 dark:text-white/50">Tenant Scoping Mode</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {userRole === "super_admin" ? "Cross-Tenant Super Cluster" : "Isolated Schema Public"}
                  </span>
                </div>
              </div>
            </div>

            {/* Sign Out & Session Reset */}
            <div className="p-6 rounded-3xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-500" />
                  Session Authentication Actions
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/50 mt-1 leading-relaxed">
                  Ending your session will invalidate your active browser tokens and require re-authentication.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-white/10">
                <button
                  onClick={() => {
                    success("Session revoked. Signed out safely.");
                    logout();
                    router.push("/login");
                  }}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-300 dark:border-rose-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Terminate Active Session (Sign Out)</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
