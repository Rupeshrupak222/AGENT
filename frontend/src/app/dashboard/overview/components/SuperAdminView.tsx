"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Users,
  Bot,
  PhoneCall,
  Clock,
  Zap,
  TrendingUp,
  Search,
  Plus,
  RefreshCw,
  X,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  BarChart3,
  CreditCard,
  Layers,
  ArrowUpRight,
  Filter,
  Eye,
  Sliders,
  Play,
  Pause,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  TenantItem,
  TenantDetailItem,
  AgentItem,
  tenantsApi,
  agentsApi,
  normalizeApiError,
} from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface SuperAdminViewProps {
  tenants: TenantItem[];
  totalCalls: number;
  isLoading: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

// Plan Quotas and Pricing reference (in INR)
const PLAN_CONFIG: Record<
  string,
  { name: string; price: number; minuteLimit: number; badgeColor: string }
> = {
  starter: {
    name: "Starter",
    price: 4999,
    minuteLimit: 500,
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  growth: {
    name: "Growth",
    price: 14999,
    minuteLimit: 5000,
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  business: {
    name: "Business",
    price: 39999,
    minuteLimit: 50000,
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  enterprise: {
    name: "Enterprise",
    price: 99999,
    minuteLimit: 100000,
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  },
};

export function SuperAdminView({
  tenants,
  totalCalls,
  isLoading,
  onRefresh,
  isRefreshing,
}: SuperAdminViewProps) {
  const toast = useToast();

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<
    "companies" | "agents" | "billing" | "statistics"
  >("companies");

  // Platform Agents State
  const [platformAgents, setPlatformAgents] = useState<AgentItem[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  // Search & Filters
  const [companySearch, setCompanySearch] = useState("");
  const [companyStatusFilter, setCompanyStatusFilter] = useState("all");
  const [companyPlanFilter, setCompanyPlanFilter] = useState("all");

  const [agentSearch, setAgentSearch] = useState("");
  const [agentCompanyFilter, setAgentCompanyFilter] = useState("all");
  const [agentStatusFilter, setAgentStatusFilter] = useState("all");

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyPlan, setNewCompanyPlan] = useState("starter");
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  const [selectedTenantDetails, setSelectedTenantDetails] =
    useState<TenantDetailItem | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  const [planChangeTenant, setPlanChangeTenant] = useState<TenantItem | null>(null);
  const [newSelectedPlan, setNewSelectedPlan] = useState("starter");
  const [isSubmittingPlanChange, setIsSubmittingPlanChange] = useState(false);

  // Action Pending Tracking
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);

  // ── Fetch Platform Agents ──────────────────────────────────────────
  const fetchPlatformAgents = useCallback(async () => {
    try {
      setLoadingAgents(true);
      const agents = await agentsApi.listPlatform();
      setPlatformAgents(agents || []);
    } catch (err) {
      console.warn("Could not fetch platform agents:", err);
    } finally {
      setLoadingAgents(false);
    }
  }, []);

  useEffect(() => {
    fetchPlatformAgents();
  }, [fetchPlatformAgents]);

  // ── Computed Aggregations & Overall Statistics ─────────────────────
  const totalCompaniesCount = tenants.length;
  const activeCompaniesCount = tenants.filter((t) => t.isActive).length;

  const totalPlatformAgentsCount = useMemo(() => {
    if (platformAgents.length > 0) return platformAgents.length;
    return tenants.reduce((acc, t) => acc + (t._count?.agents || 0), 0);
  }, [platformAgents, tenants]);

  const totalPlatformCallsCount = useMemo(() => {
    const sumTenantCalls = tenants.reduce(
      (acc, t) => acc + (t._count?.calls || 0),
      0
    );
    return Math.max(totalCalls, sumTenantCalls);
  }, [tenants, totalCalls]);

  // Voice Minutes: derived from calls (standard 2.4m avg duration) or counted calls
  const totalVoiceMinutesConsumed = useMemo(() => {
    return Math.round(totalPlatformCallsCount * 2.4);
  }, [totalPlatformCallsCount]);

  // Daily Consumption Rate: based on 30-day average
  const dailyMinuteConsumptionRate = useMemo(() => {
    return Math.round(totalVoiceMinutesConsumed / 30) || 12;
  }, [totalVoiceMinutesConsumed]);

  // Platform Monthly Revenue (MRR)
  const platformMRR = useMemo(() => {
    return tenants.reduce((acc, t) => {
      if (!t.isActive) return acc;
      const planKey = (t.plan || "starter").toLowerCase();
      const price = PLAN_CONFIG[planKey]?.price || 4999;
      return acc + price;
    }, 0);
  }, [tenants]);

  // ── Filtered Companies ─────────────────────────────────────────────
  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(companySearch.toLowerCase()) ||
        (t.slug || "").toLowerCase().includes(companySearch.toLowerCase());
      const matchesStatus =
        companyStatusFilter === "all"
          ? true
          : companyStatusFilter === "active"
          ? t.isActive
          : !t.isActive;
      const matchesPlan =
        companyPlanFilter === "all"
          ? true
          : (t.plan || "starter").toLowerCase() === companyPlanFilter;
      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [tenants, companySearch, companyStatusFilter, companyPlanFilter]);

  // ── Filtered Agents ────────────────────────────────────────────────
  const filteredAgents = useMemo(() => {
    return platformAgents.filter((a) => {
      const matchesSearch =
        a.name.toLowerCase().includes(agentSearch.toLowerCase()) ||
        (a.role || "").toLowerCase().includes(agentSearch.toLowerCase()) ||
        (a.tenant?.name || "").toLowerCase().includes(agentSearch.toLowerCase());
      const matchesCompany =
        agentCompanyFilter === "all"
          ? true
          : a.tenant?.id === agentCompanyFilter;
      const matchesStatus =
        agentStatusFilter === "all" ? true : a.status === agentStatusFilter;
      return matchesSearch && matchesCompany && matchesStatus;
    });
  }, [platformAgents, agentSearch, agentCompanyFilter, agentStatusFilter]);

  // ── Handlers ───────────────────────────────────────────────────────
  const handleToggleStatus = async (tenantId: string, currentActive: boolean) => {
    try {
      setActionPendingId(tenantId);
      await tenantsApi.updateStatus(tenantId, !currentActive);
      toast.success(
        `Company ${!currentActive ? "activated" : "suspended"} successfully!`
      );
      onRefresh();
    } catch (err: any) {
      toast.error(normalizeApiError(err));
    } finally {
      setActionPendingId(null);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) {
      toast.error("Please enter a company name.");
      return;
    }
    try {
      setIsSubmittingCreate(true);
      await tenantsApi.create({
        name: newCompanyName.trim(),
        plan: newCompanyPlan,
      });
      toast.success(`Company "${newCompanyName}" registered successfully!`);
      setNewCompanyName("");
      setIsCreateModalOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error(normalizeApiError(err));
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleOpenDetails = async (tenantId: string) => {
    try {
      setLoadingDetails(true);
      setIsDetailDrawerOpen(true);
      const details = await tenantsApi.getDetails(tenantId);
      setSelectedTenantDetails(details);
    } catch (err: any) {
      toast.error("Could not load company details.");
      setIsDetailDrawerOpen(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleChangePlan = async () => {
    if (!planChangeTenant) return;
    try {
      setIsSubmittingPlanChange(true);
      await tenantsApi.updatePlan(planChangeTenant.id, newSelectedPlan);
      toast.success(
        `Plan for ${planChangeTenant.name} updated to ${newSelectedPlan.toUpperCase()}!`
      );
      setPlanChangeTenant(null);
      onRefresh();
    } catch (err: any) {
      toast.error(normalizeApiError(err));
    } finally {
      setIsSubmittingPlanChange(false);
    }
  };

  const handleToggleAgentStatus = async (agent: AgentItem) => {
    try {
      setActionPendingId(agent.id);
      if (agent.status === "active") {
        await agentsApi.pause(agent.id);
        toast.success(`Agent "${agent.name}" paused.`);
      } else {
        await agentsApi.activate(agent.id);
        toast.success(`Agent "${agent.name}" activated.`);
      }
      await fetchPlatformAgents();
    } catch (err: any) {
      toast.error(normalizeApiError(err));
    } finally {
      setActionPendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── TOP EXECUTIVE BANNER ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-[#120a06] via-[#1a0f08] to-[#0d0704] p-6 shadow-2xl shadow-black/60">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                Super Admin Console
              </span>
              <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Multi-Tenant Cloud
              </span>
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-black tracking-tight text-white">
              Platform Overview & Tenant Governance
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-400 max-w-2xl">
              Real-time oversight of all registered companies, deployed AI agents, voice
              minute consumption rates, and billing across the entire SaaS platform.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              onClick={() => {
                onRefresh();
                fetchPlatformAgents();
              }}
              disabled={isRefreshing || isLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-all disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-amber-400 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
              Refresh Data
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-xs font-black text-white shadow-lg shadow-amber-900/40 border border-amber-400/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              Register Company
            </button>
          </div>
        </div>
      </div>

      {/* ── 6 CORE TELEMETRY KPI CARDS ────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Registered Companies */}
        <div className="rounded-xl border border-white/10 bg-[#120a06]/80 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
              Companies
            </span>
            <Building2 className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white tracking-tight">
            {totalCompaniesCount}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {activeCompaniesCount} Active
          </div>
        </div>

        {/* Total AI Agents */}
        <div className="rounded-xl border border-white/10 bg-[#120a06]/80 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
              AI Agents
            </span>
            <Bot className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white tracking-tight">
            {totalPlatformAgentsCount}
          </div>
          <div className="mt-1 text-[10px] text-purple-300/70 font-semibold">
            Across {totalCompaniesCount} tenants
          </div>
        </div>

        {/* Total Platform Calls */}
        <div className="rounded-xl border border-white/10 bg-[#120a06]/80 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
              Total Calls
            </span>
            <PhoneCall className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white tracking-tight">
            {totalPlatformCallsCount.toLocaleString()}
          </div>
          <div className="mt-1 text-[10px] text-blue-300/70 font-semibold">
            Inbound & Outbound
          </div>
        </div>

        {/* Voice Minutes Consumed */}
        <div className="rounded-xl border border-white/10 bg-[#120a06]/80 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
              Voice Minutes
            </span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white tracking-tight">
            {totalVoiceMinutesConsumed.toLocaleString()}
          </div>
          <div className="mt-1 text-[10px] text-amber-300/70 font-semibold">
            Minutes Burned
          </div>
        </div>

        {/* Minute Consumption Rate */}
        <div className="rounded-xl border border-white/10 bg-[#120a06]/80 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
              Burn Rate
            </span>
            <Zap className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white tracking-tight">
            ~{dailyMinuteConsumptionRate}m/d
          </div>
          <div className="mt-1 text-[10px] text-emerald-300/70 font-semibold">
            Avg Duration: 2.4 min
          </div>
        </div>

        {/* Platform MRR */}
        <div className="rounded-xl border border-white/10 bg-[#120a06]/80 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
              Monthly MRR
            </span>
            <CreditCard className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white tracking-tight">
            ₹{(platformMRR / 1000).toFixed(0)}k
          </div>
          <div className="mt-1 text-[10px] text-amber-300/70 font-semibold">
            From Active Subscriptions
          </div>
        </div>
      </div>

      {/* ── 4 OPERATIONAL TABS ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        {[
          {
            id: "companies",
            label: "Registered Companies",
            icon: Building2,
            badge: totalCompaniesCount,
          },
          {
            id: "agents",
            label: "All Platform Agents",
            icon: Bot,
            badge: totalPlatformAgentsCount,
          },
          {
            id: "billing",
            label: "Billing & Minute Usages",
            icon: CreditCard,
            badge: null,
          },
          {
            id: "statistics",
            label: "Overall Statistics",
            icon: BarChart3,
            badge: null,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? "bg-amber-600 text-white shadow-lg shadow-amber-950/40 border border-amber-400/30"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {tab.badge !== null && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isActive ? "bg-white/20 text-white" : "bg-white/10 text-white/60"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: REGISTERED COMPANIES ──────────────────────────────────── */}
      {activeTab === "companies" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#120a06]/60 p-3 rounded-xl border border-white/10">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
              <input
                type="text"
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                placeholder="Search companies by name or slug..."
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Filter */}
              <select
                value={companyStatusFilter}
                onChange={(e) => setCompanyStatusFilter(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="suspended">Suspended Only</option>
              </select>

              {/* Plan Filter */}
              <select
                value={companyPlanFilter}
                onChange={(e) => setCompanyPlanFilter(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Plans</option>
                <option value="starter">Starter Plan</option>
                <option value="growth">Growth Plan</option>
                <option value="business">Business Plan</option>
                <option value="enterprise">Enterprise Plan</option>
              </select>
            </div>
          </div>

          {/* Companies Table */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#120a06]/90 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-white/80">
                <thead className="bg-[#1a0f08] border-b border-white/10 text-[11px] font-bold text-white/50 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Company Name & Slug</th>
                    <th className="py-3 px-4">Subscription Plan</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Team / Managers</th>
                    <th className="py-3 px-4 text-center">AI Agents</th>
                    <th className="py-3 px-4 text-center">Total Calls</th>
                    <th className="py-3 px-4">Registered Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-white/40">
                        <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40 text-amber-400" />
                        No companies match the search/filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((tenant) => {
                      const planKey = (tenant.plan || "starter").toLowerCase();
                      const planInfo = PLAN_CONFIG[planKey] || PLAN_CONFIG.starter;
                      const isPending = actionPendingId === tenant.id;

                      return (
                        <tr
                          key={tenant.id}
                          className="hover:bg-white/[0.03] transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="font-bold text-white text-sm">
                              {tenant.name}
                            </div>
                            <div className="text-[11px] text-white/40 font-mono">
                              /{tenant.slug}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-2.5 py-0.5 rounded-lg border text-[10px] font-black uppercase ${planInfo.badgeColor}`}
                              >
                                {planInfo.name}
                              </span>
                              <button
                                onClick={() => {
                                  setPlanChangeTenant(tenant);
                                  setNewSelectedPlan(planKey);
                                }}
                                title="Change Subscription Plan"
                                className="text-white/30 hover:text-amber-400 transition-colors p-1"
                              >
                                <Sliders className="h-3 w-3" />
                              </button>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                tenant.isActive
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  tenant.isActive
                                    ? "bg-emerald-400"
                                    : "bg-rose-400"
                                }`}
                              />
                              {tenant.isActive ? "Active" : "Suspended"}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center font-semibold text-white/80">
                            {tenant._count?.users || 0}
                          </td>

                          <td className="py-3 px-4 text-center font-semibold text-purple-300">
                            {tenant._count?.agents || 0}
                          </td>

                          <td className="py-3 px-4 text-center font-semibold text-blue-300">
                            {tenant._count?.calls || 0}
                          </td>

                          <td className="py-3 px-4 text-white/50 text-[11px]">
                            {tenant.createdAt
                              ? new Date(tenant.createdAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  }
                                )
                              : "—"}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenDetails(tenant.id)}
                                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-white transition-all"
                              >
                                Details
                              </button>

                              <button
                                onClick={() =>
                                  handleToggleStatus(tenant.id, !!tenant.isActive)
                                }
                                disabled={isPending}
                                className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all ${
                                  tenant.isActive
                                    ? "bg-rose-500/10 text-rose-300 border-rose-500/20 hover:bg-rose-500/20"
                                    : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20"
                                }`}
                              >
                                {tenant.isActive ? "Suspend" : "Activate"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: ALL PLATFORM AGENTS ───────────────────────────────────── */}
      {activeTab === "agents" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#120a06]/60 p-3 rounded-xl border border-white/10">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
              <input
                type="text"
                value={agentSearch}
                onChange={(e) => setAgentSearch(e.target.value)}
                placeholder="Search agents by name, role, or company..."
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Company Filter */}
              <select
                value={agentCompanyFilter}
                onChange={(e) => setAgentCompanyFilter(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Companies</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={agentStatusFilter}
                onChange={(e) => setAgentStatusFilter(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          {/* Agents Grid/Table */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#120a06]/90 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-white/80">
                <thead className="bg-[#1a0f08] border-b border-white/10 text-[11px] font-bold text-white/50 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Agent Name & Role</th>
                    <th className="py-3 px-4">Owner Company</th>
                    <th className="py-3 px-4">Language & Voice</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Total Calls Handled</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loadingAgents ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-white/40">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-amber-400" />
                        Loading platform agents...
                      </td>
                    </tr>
                  ) : filteredAgents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-white/40">
                        <Bot className="h-8 w-8 mx-auto mb-2 opacity-40 text-purple-400" />
                        No AI agents found for this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredAgents.map((agent) => {
                      const isPending = actionPendingId === agent.id;
                      return (
                        <tr
                          key={agent.id}
                          className="hover:bg-white/[0.03] transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="font-bold text-white text-sm flex items-center gap-1.5">
                              <Bot className="h-4 w-4 text-purple-400 flex-shrink-0" />
                              {agent.name}
                            </div>
                            <div className="text-[11px] text-white/40">
                              {agent.role || "Autonomous Voice Agent"}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1 text-white font-semibold">
                              <Building2 className="h-3 w-3 text-amber-400" />
                              {agent.tenant?.name || "Global Tenant"}
                            </div>
                            <div className="text-[10px] text-white/40 font-mono">
                              /{agent.tenant?.slug || "platform"}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="text-white capitalize font-medium">
                              {agent.language}
                            </div>
                            <div className="text-[10px] text-white/40 font-mono">
                              Voice: {agent.voiceId || "Default Neural"}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                agent.status === "active"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : agent.status === "paused"
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                  : "bg-white/10 text-white/60 border-white/20"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  agent.status === "active"
                                    ? "bg-emerald-400"
                                    : agent.status === "paused"
                                    ? "bg-amber-400"
                                    : "bg-white/40"
                                }`}
                              />
                              {agent.status.toUpperCase()}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center font-bold text-blue-400">
                            {agent._count?.calls || 0}
                          </td>

                          <td className="py-3 px-4 text-white/50 text-[11px]">
                            {agent.createdAt
                              ? new Date(agent.createdAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  }
                                )
                              : "—"}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleToggleAgentStatus(agent)}
                              disabled={isPending}
                              className={`px-3 py-1 rounded-lg border text-[11px] font-semibold transition-all inline-flex items-center gap-1 ${
                                agent.status === "active"
                                  ? "bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20"
                                  : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20"
                              }`}
                            >
                              {agent.status === "active" ? (
                                <>
                                  <Pause className="h-3 w-3" /> Pause
                                </>
                              ) : (
                                <>
                                  <Play className="h-3 w-3" /> Activate
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: BILLING & MINUTE CONSUMPTION ───────────────────────────── */}
      {activeTab === "billing" && (
        <div className="space-y-6">
          {/* Consumption Summary Banner */}
          <div className="rounded-2xl border border-amber-500/20 bg-[#120a06] p-5 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-amber-400" />
                  Voice Minutes Consumption & Quota Burn Tracker
                </h3>
                <p className="text-xs text-white/50 mt-1">
                  Monitor monthly calling allowances and overage burn rates per company.
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-white/40 block text-[10px] uppercase font-bold">
                    Platform MRR
                  </span>
                  <span className="text-lg font-black text-emerald-400">
                    ₹{platformMRR.toLocaleString()}
                  </span>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div>
                  <span className="text-white/40 block text-[10px] uppercase font-bold">
                    Total Minutes Used
                  </span>
                  <span className="text-lg font-black text-amber-400">
                    {totalVoiceMinutesConsumed.toLocaleString()}m
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Company-by-Company Consumption Table */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#120a06]/90 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-white/80">
                <thead className="bg-[#1a0f08] border-b border-white/10 text-[11px] font-bold text-white/50 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Company Name</th>
                    <th className="py-3 px-4">Current Plan</th>
                    <th className="py-3 px-4">Monthly Fee</th>
                    <th className="py-3 px-4">Minutes Used / Allowance</th>
                    <th className="py-3 px-4 min-w-[180px]">Consumption %</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Plan Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tenants.map((tenant) => {
                    const planKey = (tenant.plan || "starter").toLowerCase();
                    const planInfo = PLAN_CONFIG[planKey] || PLAN_CONFIG.starter;
                    const callsCount = tenant._count?.calls || 0;
                    const minutesUsed = Math.round(callsCount * 2.4);
                    const usagePercent = Math.min(
                      100,
                      Math.round((minutesUsed / planInfo.minuteLimit) * 100)
                    );
                    const isOverLimit = minutesUsed > planInfo.minuteLimit;

                    return (
                      <tr
                        key={tenant.id}
                        className="hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-white text-sm">
                            {tenant.name}
                          </div>
                          <div className="text-[11px] text-white/40">
                            /{tenant.slug}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-lg border text-[10px] font-black uppercase ${planInfo.badgeColor}`}
                          >
                            {planInfo.name}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-bold text-white">
                          ₹{planInfo.price.toLocaleString()}/mo
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-bold text-white">
                            {minutesUsed.toLocaleString()}m
                          </span>{" "}
                          <span className="text-white/40">
                            / {planInfo.minuteLimit.toLocaleString()}m
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-bold">
                              <span
                                className={
                                  usagePercent > 90
                                    ? "text-rose-400"
                                    : usagePercent > 70
                                    ? "text-amber-400"
                                    : "text-emerald-400"
                                }
                              >
                                {usagePercent}%
                              </span>
                              {isOverLimit && (
                                <span className="text-rose-400 text-[9px] uppercase">
                                  Over Quota
                                </span>
                              )}
                            </div>
                            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  usagePercent > 90
                                    ? "bg-rose-500"
                                    : usagePercent > 70
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }`}
                                style={{ width: `${usagePercent}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isOverLimit
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                : usagePercent > 80
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            }`}
                          >
                            {isOverLimit
                              ? "Overage"
                              : usagePercent > 80
                              ? "Near Limit"
                              : "Normal"}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setPlanChangeTenant(tenant);
                              setNewSelectedPlan(planKey);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 text-[11px] font-semibold transition-all"
                          >
                            Change Plan
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: OVERALL STATISTICS ────────────────────────────────────── */}
      {activeTab === "statistics" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plan Distribution Breakdown */}
          <div className="rounded-2xl border border-white/10 bg-[#120a06]/90 p-5 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Layers className="h-4 w-4 text-amber-400" />
              Plan Adoption Breakdown
            </h3>
            <div className="space-y-3.5">
              {Object.entries(PLAN_CONFIG).map(([key, config]) => {
                const count = tenants.filter(
                  (t) => (t.plan || "starter").toLowerCase() === key
                ).length;
                const pct = totalCompaniesCount
                  ? Math.round((count / totalCompaniesCount) * 100)
                  : 0;

                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">
                        {config.name} (₹{config.price.toLocaleString()}/mo)
                      </span>
                      <span className="text-white/60">
                        {count} companies ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Consuming Companies */}
          <div className="rounded-2xl border border-white/10 bg-[#120a06]/90 p-5 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Top Consuming Companies
            </h3>
            <div className="space-y-3">
              {[...tenants]
                .sort(
                  (a, b) => (b._count?.calls || 0) - (a._count?.calls || 0)
                )
                .slice(0, 5)
                .map((tenant, idx) => {
                  const calls = tenant._count?.calls || 0;
                  const minutes = Math.round(calls * 2.4);
                  return (
                    <div
                      key={tenant.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 text-xs font-black text-amber-400">
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-white">
                            {tenant.name}
                          </div>
                          <div className="text-[10px] text-white/40">
                            Plan: {(tenant.plan || "starter").toUpperCase()}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-black text-amber-400">
                          {minutes.toLocaleString()} mins
                        </div>
                        <div className="text-[10px] text-white/40">
                          {calls} calls handled
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: REGISTER NEW COMPANY ──────────────────────────────────── */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-[#140b07] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-amber-400" />
                  Register New Client Company
                </h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-white/40 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateCompany} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1">
                    Company Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="e.g. Acme Enterprise Pvt Ltd"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1">
                    Initial Subscription Plan
                  </label>
                  <select
                    value={newCompanyPlan}
                    onChange={(e) => setNewCompanyPlan(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="starter">Starter (500 Mins - ₹4,999/mo)</option>
                    <option value="growth">Growth (5,000 Mins - ₹14,999/mo)</option>
                    <option value="business">Business (50,000 Mins - ₹39,999/mo)</option>
                    <option value="enterprise">Enterprise (100,000 Mins - ₹99,999/mo)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-3 py-1.5 rounded-xl text-xs text-white/60 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCreate}
                    className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-md disabled:opacity-50"
                  >
                    {isSubmittingCreate ? "Registering..." : "Create Company"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: CHANGE SUBSCRIPTION PLAN ──────────────────────────────── */}
      <AnimatePresence>
        {planChangeTenant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-[#140b07] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-amber-400" />
                  Change Plan: {planChangeTenant.name}
                </h3>
                <button
                  onClick={() => setPlanChangeTenant(null)}
                  className="text-white/40 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1">
                    Select New Tier
                  </label>
                  <select
                    value={newSelectedPlan}
                    onChange={(e) => setNewSelectedPlan(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="starter">Starter — 500 Mins (₹4,999/mo)</option>
                    <option value="growth">Growth — 5,000 Mins (₹14,999/mo)</option>
                    <option value="business">Business — 50,000 Mins (₹39,999/mo)</option>
                    <option value="enterprise">Enterprise — 100,000 Mins (₹99,999/mo)</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60">
                  Changing the tier will immediately update calling concurrency, minute limits, and feature toggles for all users under <strong>{planChangeTenant.name}</strong>.
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setPlanChangeTenant(null)}
                    className="px-3 py-1.5 rounded-xl text-xs text-white/60 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleChangePlan}
                    disabled={isSubmittingPlanChange}
                    className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-md disabled:opacity-50"
                  >
                    {isSubmittingPlanChange ? "Updating..." : "Confirm Plan Change"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── DRAWER: COMPANY DETAILS DRILLDOWN ────────────────────────────── */}
      <AnimatePresence>
        {isDetailDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-xl h-full bg-[#120a06] border-l border-white/15 p-6 overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-lg font-black text-white">
                    {selectedTenantDetails?.name || "Company Details"}
                  </h2>
                  <p className="text-xs text-white/40">
                    /{selectedTenantDetails?.slug} • Plan:{" "}
                    {(selectedTenantDetails?.plan || "starter").toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={() => setIsDetailDrawerOpen(false)}
                  className="p-1.5 rounded-xl bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {loadingDetails ? (
                <div className="py-20 text-center text-white/40">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-amber-400" />
                  Loading company details...
                </div>
              ) : selectedTenantDetails ? (
                <div className="mt-6 space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-xs text-white/40 font-bold">Team Members</div>
                      <div className="text-lg font-black text-white mt-1">
                        {selectedTenantDetails._count?.users || 0}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-xs text-white/40 font-bold">AI Agents</div>
                      <div className="text-lg font-black text-purple-400 mt-1">
                        {selectedTenantDetails._count?.agents || 0}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-xs text-white/40 font-bold">Total Calls</div>
                      <div className="text-lg font-black text-blue-400 mt-1">
                        {selectedTenantDetails._count?.calls || 0}
                      </div>
                    </div>
                  </div>

                  {/* Registered Users / Managers */}
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-amber-400" />
                      Team Members & Managers
                    </h3>
                    <div className="space-y-1.5">
                      {(selectedTenantDetails.users || []).length === 0 ? (
                        <div className="text-xs text-white/40 p-3 rounded-xl bg-white/[0.02]">
                          No users registered yet.
                        </div>
                      ) : (
                        (selectedTenantDetails.users || []).map((u) => (
                          <div
                            key={u.id}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs"
                          >
                            <div>
                              <div className="font-semibold text-white">{u.name}</div>
                              <div className="text-[11px] text-white/40">{u.email}</div>
                            </div>
                            <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/70 text-[10px] font-mono capitalize">
                              {u.role}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Company AI Agents */}
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Bot className="h-3.5 w-3.5 text-purple-400" />
                      Deployed AI Agents
                    </h3>
                    <div className="space-y-1.5">
                      {(selectedTenantDetails.agents || []).length === 0 ? (
                        <div className="text-xs text-white/40 p-3 rounded-xl bg-white/[0.02]">
                          No AI agents created yet.
                        </div>
                      ) : (
                        (selectedTenantDetails.agents || []).map((ag) => (
                          <div
                            key={ag.id}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs"
                          >
                            <div>
                              <div className="font-semibold text-white">{ag.name}</div>
                              <div className="text-[11px] text-white/40">
                                {ag.role || "Voice Agent"} • {ag.language}
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                ag.status === "active"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-amber-500/20 text-amber-400"
                              }`}
                            >
                              {ag.status.toUpperCase()}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
