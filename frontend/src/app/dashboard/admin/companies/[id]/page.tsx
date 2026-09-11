"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Users,
  Bot,
  Phone,
  Activity,
  Edit3,
  XCircle,
  CheckCircle,
  Calendar,
  Mail,
  Globe,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { tenantsApi, TenantDetailItem, normalizeApiError } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui";
import { Badge } from "@/components/ui";
import { EmptyState } from "@/components/ui";
import { Skeleton } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui";
import { Tabs } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";

const PLAN_CONFIG: Record<string, { label: string; color: string; bgClass: string }> = {
  starter: { label: "Starter", color: "text-blue-600 dark:text-blue-400", bgClass: "bg-blue-500" },
  growth: { label: "Growth", color: "text-amber-600 dark:text-amber-400", bgClass: "bg-amber-500" },
  business: { label: "Business", color: "text-emerald-600 dark:text-emerald-400", bgClass: "bg-emerald-500" },
  enterprise: { label: "Enterprise", color: "text-purple-600 dark:text-purple-400", bgClass: "bg-purple-500" },
};

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [company, setCompany] = useState<TenantDetailItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toggling, setToggling] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tenantsApi.getDetails(id);
      setCompany(data);
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusToggle = async () => {
    if (!company) return;
    setToggling(true);
    try {
      await tenantsApi.updateStatus(company.id, !company.isActive);
      success(company.isActive ? "Company suspended" : "Company activated");
      setConfirmOpen(false);
      fetchData();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !company) {
    return (
      <AdminLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
          <Link
            href="/dashboard/admin/companies"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-white/50 hover:text-brand-500 dark:hover:text-brand-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Companies
          </Link>
          <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 p-8 text-center">
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error || "Company not found"}</p>
            <Button variant="outline" size="sm" onClick={fetchData}>
              Retry
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const plan = PLAN_CONFIG[company.plan || "starter"] || PLAN_CONFIG.starter;
  const users = company.users || [];
  const agents = company.agents || [];
  const activeAgents = agents.filter((a) => a.status === "active").length;

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        {/* Back Link */}
        <Link
          href="/dashboard/admin/companies"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-white/50 hover:text-brand-500 dark:hover:text-brand-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Companies
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-500/10">
              <Building2 className="w-6 h-6 text-brand-500" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{company.name}</h1>
                <Badge variant={company.isActive ? "success" : "error"} dot>
                  {company.isActive ? "Active" : "Suspended"}
                </Badge>
                <span className={cn("px-2.5 py-0.5 rounded-md text-xs font-bold text-white", plan.bgClass)}>
                  {plan.label}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500 dark:text-white/40">
                <span className="font-mono">/{company.slug}</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Created {company.createdAt ? new Date(company.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={company.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
              onClick={() => setConfirmOpen(true)}
            >
              {company.isActive ? "Suspend" : "Activate"}
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Users", value: users.length, icon: Users, color: "bg-violet-50 dark:bg-violet-500/10 text-violet-500" },
            { label: "Agents", value: agents.length, icon: Bot, color: "bg-purple-50 dark:bg-purple-500/10 text-purple-500" },
            { label: "Active Agents", value: activeAgents, icon: Activity, color: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500" },
            { label: "Calls", value: company._count?.agents ?? 0, icon: Phone, color: "bg-amber-50 dark:bg-amber-500/10 text-amber-500" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="p-5 rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 shadow-sm"
            >
              <div className={cn("p-2.5 rounded-xl inline-flex mb-3", stat.color)}>
                <stat.icon className="w-4.5 h-4.5" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {stat.value}
              </p>
              <p className="text-xs mt-1 font-medium text-slate-500 dark:text-white/40">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 shadow-sm overflow-hidden">
          <Tabs
            tabs={[
              { id: "overview", label: "Overview" },
              { id: "users", label: "Users", count: users.length },
              { id: "agents", label: "Agents", count: agents.length },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Company Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/[0.04]">
                      <span className="text-xs text-slate-500 dark:text-white/40">Name</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{company.name}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/[0.04]">
                      <span className="text-xs text-slate-500 dark:text-white/40">Slug</span>
                      <span className="text-sm font-mono text-slate-700 dark:text-white/60">/{company.slug}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/[0.04]">
                      <span className="text-xs text-slate-500 dark:text-white/40">Plan</span>
                      <span className={cn("text-sm font-semibold", plan.color)}>{plan.label}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/[0.04]">
                      <span className="text-xs text-slate-500 dark:text-white/40">Status</span>
                      <Badge variant={company.isActive ? "success" : "error"} dot>
                        {company.isActive ? "Active" : "Suspended"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-xs text-slate-500 dark:text-white/40">Created</span>
                      <span className="text-sm text-slate-700 dark:text-white/60">
                        {company.createdAt ? new Date(company.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Quick Stats</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.04]">
                      <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{users.length}</p>
                      <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">Team Members</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.04]">
                      <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{agents.length}</p>
                      <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">AI Agents</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.04]">
                      <p className="text-2xl font-extrabold text-emerald-500">{activeAgents}</p>
                      <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">Active Agents</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.04]">
                      <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        {agents.length > 0 ? ((activeAgents / agents.length) * 100).toFixed(0) + "%" : "—"}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">Agent Uptime</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <div>
              {users.length === 0 ? (
                <EmptyState
                  icon={<Users className="w-10 h-10 text-slate-300 dark:text-white/20" />}
                  title="No users"
                  description="This company doesn't have any team members yet"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/[0.06]">
                        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                          Name
                        </th>
                        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                          Email
                        </th>
                        <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                          Role
                        </th>
                        <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                          Status
                        </th>
                        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                          Joined
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-brand-500 to-brand-700 flex-shrink-0">
                                {u.name?.[0]?.toUpperCase() ?? "U"}
                              </div>
                              <span className="font-medium text-slate-900 dark:text-white">{u.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-slate-500 dark:text-white/40">{u.email}</td>
                          <td className="px-5 py-3 text-center">
                            <Badge variant="outline" size="sm">
                              {u.role.replace("_", " ")}
                            </Badge>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <Badge variant={u.isActive ? "success" : "error"} dot size="sm">
                              {u.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-500 dark:text-white/40">
                            {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Agents Tab */}
          {activeTab === "agents" && (
            <div>
              {agents.length === 0 ? (
                <EmptyState
                  icon={<Bot className="w-10 h-10 text-slate-300 dark:text-white/20" />}
                  title="No agents"
                  description="This company hasn't created any AI agents yet"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/[0.06]">
                        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                          Agent
                        </th>
                        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                          Role
                        </th>
                        <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                          Language
                        </th>
                        <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                      {agents.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-50 dark:bg-purple-500/10">
                                <Bot className="w-4 h-4 text-purple-500" />
                              </div>
                              <span className="font-medium text-slate-900 dark:text-white">{a.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <Badge variant="outline" size="sm">
                              {a.role}
                            </Badge>
                          </td>
                          <td className="px-5 py-3 text-center text-xs text-slate-500 dark:text-white/40 capitalize">
                            {a.language}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <Badge
                              variant={a.status === "active" ? "success" : a.status === "paused" ? "warning" : "gray"}
                              dot
                              size="sm"
                            >
                              {a.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status Toggle Confirm */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleStatusToggle}
        title={company.isActive ? "Suspend Company" : "Activate Company"}
        message={
          company.isActive
            ? `Are you sure you want to suspend "${company.name}"? All users in this company will lose access.`
            : `Are you sure you want to activate "${company.name}"? Users will regain access.`
        }
        confirmLabel={company.isActive ? "Suspend" : "Activate"}
        variant={company.isActive ? "danger" : "warning"}
        loading={toggling}
      />
    </AdminLayout>
  );
}
