"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  Bot,
  Phone,
  Plus,
  Search,
  MoreVertical,
  Eye,
  ArrowUpDown,
  XCircle,
  CheckCircle,
  ChevronDown,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import {
  platformApi,
  tenantsApi,
  PlatformCompanyPerformance,
  normalizeApiError,
} from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui";
import { Badge } from "@/components/ui";
import { EmptyState } from "@/components/ui";
import { Skeleton, TableRowSkeleton } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui";
import { Modal } from "@/components/ui";
import { Input } from "@/components/ui";
import { Select } from "@/components/ui";
import { Pagination } from "@/components/ui";
import { SearchInput } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";

const PLAN_CONFIG: Record<string, { label: string; color: string; bgClass: string }> = {
  starter: { label: "Starter", color: "text-blue-600 dark:text-blue-400", bgClass: "bg-blue-500" },
  growth: { label: "Growth", color: "text-amber-600 dark:text-amber-400", bgClass: "bg-amber-500" },
  business: { label: "Business", color: "text-emerald-600 dark:text-emerald-400", bgClass: "bg-emerald-500" },
  enterprise: { label: "Enterprise", color: "text-purple-600 dark:text-purple-400", bgClass: "bg-purple-500" },
};

const PLANS = ["starter", "growth", "business", "enterprise"];

const PER_PAGE = 15;

export default function CompaniesPage() {
  const { success, error: toastError } = useToast();
  const [companies, setCompanies] = useState<PlatformCompanyPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyPlan, setNewCompanyPlan] = useState("starter");
  const [creating, setCreating] = useState(false);

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planTarget, setPlanTarget] = useState<PlatformCompanyPerformance | null>(null);
  const [planValue, setPlanValue] = useState("starter");
  const [planSaving, setPlanSaving] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<PlatformCompanyPerformance | null>(null);
  const [confirmAction, setConfirmAction] = useState<"activate" | "suspend">("activate");
  const [toggling, setToggling] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await platformApi.companyPerformance("month");
      setCompanies(data);
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = companies.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q);
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && c.isActive) ||
      (statusFilter === "suspended" && !c.isActive);
    const matchPlan = planFilter === "all" || c.plan === planFilter;
    return matchSearch && matchStatus && matchPlan;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, planFilter]);

  const handleCreate = async () => {
    if (!newCompanyName.trim()) return;
    setCreating(true);
    try {
      await tenantsApi.create({ name: newCompanyName.trim(), plan: newCompanyPlan });
      success("Company created successfully");
      setCreateOpen(false);
      setNewCompanyName("");
      setNewCompanyPlan("starter");
      fetchData();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setCreating(false);
    }
  };

  const handlePlanChange = async () => {
    if (!planTarget) return;
    setPlanSaving(true);
    try {
      await tenantsApi.updatePlan(planTarget.id, planValue);
      success(`Plan updated to ${PLAN_CONFIG[planValue]?.label || planValue}`);
      setPlanModalOpen(false);
      setPlanTarget(null);
      fetchData();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setPlanSaving(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!confirmTarget) return;
    setToggling(true);
    try {
      await tenantsApi.updateStatus(confirmTarget.id, confirmAction === "activate");
      success(confirmAction === "activate" ? "Company activated" : "Company suspended");
      setConfirmOpen(false);
      setConfirmTarget(null);
      fetchData();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setToggling(false);
    }
  };

  const statusCounts = {
    all: companies.length,
    active: companies.filter((c) => c.isActive).length,
    suspended: companies.filter((c) => !c.isActive).length,
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Companies</h1>
            <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">
              Manage all tenant organizations on the platform
            </p>
          </div>
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
            Create Company
          </Button>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/25 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name or slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-8 text-sm rounded-xl outline-none transition-colors bg-slate-50 dark:bg-white/[0.04] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 placeholder:text-slate-400 dark:placeholder:text-white/20 focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:text-white/30 dark:hover:text-white/60"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {(["all", "active", "suspended"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                    statusFilter === s
                      ? "bg-brand-500/10 text-brand-600 border-brand-500/25 dark:bg-brand-500/15 dark:text-brand-400 dark:border-brand-500/35"
                      : "bg-slate-50 dark:bg-white/[0.04] text-slate-500 dark:text-white/50 border-transparent hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                  )}
                >
                  {s === "all" ? "All" : s === "active" ? "Active" : "Suspended"}
                  <span className="ml-1 text-[10px] opacity-60">{statusCounts[s]}</span>
                </button>
              ))}
            </div>

            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="h-9 px-3 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-slate-600 dark:text-white/60 outline-none cursor-pointer"
            >
              <option value="all">All Plans</option>
              {PLANS.map((p) => (
                <option key={p} value={p}>
                  {PLAN_CONFIG[p]?.label || p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error State */}
        {error && !loading && (
          <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 p-6 text-center">
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchData}>
              Retry
            </Button>
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 shadow-sm overflow-hidden">
          {loading ? (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {Array.from({ length: 8 }).map((_, i) => (
                <TableRowSkeleton key={i} columns={7} />
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <EmptyState
              icon={<Building2 className="w-10 h-10 text-slate-300 dark:text-white/20" />}
              title="No companies found"
              description={
                search || statusFilter !== "all" || planFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Get started by creating your first company"
              }
              action={
                search || statusFilter !== "all" || planFilter !== "all" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("all");
                      setPlanFilter("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
                    Create Company
                  </Button>
                )
              }
            />
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/[0.06]">
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                        Company
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                        Plan
                      </th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                        Status
                      </th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                        Users
                      </th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                        Agents
                      </th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                        Calls
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                        Created
                      </th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                    {paginated.map((c) => {
                      const plan = PLAN_CONFIG[c.plan] || PLAN_CONFIG.starter;
                      return (
                        <tr
                          key={c.id}
                          className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-slate-900 dark:text-white">{c.name}</div>
                            <div className="text-[11px] text-slate-400 dark:text-white/30 font-mono">
                              /{c.slug}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <button
                              onClick={() => {
                                setPlanTarget(c);
                                setPlanValue(c.plan);
                                setPlanModalOpen(true);
                              }}
                              className={cn(
                                "px-2 py-0.5 rounded-md text-[10px] font-bold text-white hover:brightness-110 transition-all cursor-pointer",
                                plan.bgClass
                              )}
                              title="Click to change plan"
                            >
                              {plan.label}
                            </button>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <Badge
                              variant={c.isActive ? "success" : "error"}
                              dot
                              size="sm"
                            >
                              {c.isActive ? "Active" : "Suspended"}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-center font-medium text-slate-700 dark:text-white/60">
                            {c.users}
                          </td>
                          <td className="px-5 py-3.5 text-center font-medium text-slate-700 dark:text-white/60">
                            {c.activeAgents}/{c.agents}
                          </td>
                          <td className="px-5 py-3.5 text-center font-medium text-slate-700 dark:text-white/60">
                            {formatNumber(c.calls)}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-white/40">
                            {new Date(c.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end gap-1">
                              <Link
                                href={`/dashboard/admin/companies/${c.id}`}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 dark:text-white/40 dark:hover:text-white transition-all"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => {
                                  setConfirmTarget(c);
                                  setConfirmAction(c.isActive ? "suspend" : "activate");
                                  setConfirmOpen(true);
                                }}
                                className={cn(
                                  "p-1.5 rounded-lg transition-all",
                                  c.isActive
                                    ? "text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 dark:text-white/40 dark:hover:text-amber-400"
                                    : "text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 dark:text-white/40 dark:hover:text-emerald-400"
                                )}
                                title={c.isActive ? "Suspend" : "Activate"}
                              >
                                {c.isActive ? (
                                  <XCircle className="w-4 h-4" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden divide-y divide-slate-100 dark:divide-white/[0.04]">
                {paginated.map((c) => {
                  const plan = PLAN_CONFIG[c.plan] || PLAN_CONFIG.starter;
                  return (
                    <div key={c.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <Link
                            href={`/dashboard/admin/companies/${c.id}`}
                            className="font-semibold text-slate-900 dark:text-white hover:text-brand-500 dark:hover:text-brand-400 transition-colors"
                          >
                            {c.name}
                          </Link>
                          <div className="text-[11px] text-slate-400 dark:text-white/30 font-mono">
                            /{c.slug}
                          </div>
                        </div>
                        <Badge variant={c.isActive ? "success" : "error"} dot size="sm">
                          {c.isActive ? "Active" : "Suspended"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-white/40">
                        <button
                          onClick={() => {
                            setPlanTarget(c);
                            setPlanValue(c.plan);
                            setPlanModalOpen(true);
                          }}
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-bold text-white",
                            plan.bgClass
                          )}
                        >
                          {plan.label}
                        </button>
                        <span>{c.users} users</span>
                        <span>{c.agents} agents</span>
                        <span>{formatNumber(c.calls)} calls</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/dashboard/admin/companies/${c.id}`}
                          className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium text-slate-600 dark:text-white/60 bg-slate-50 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </Link>
                        <button
                          onClick={() => {
                            setConfirmTarget(c);
                            setConfirmAction(c.isActive ? "suspend" : "activate");
                            setConfirmOpen(true);
                          }}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium transition-colors",
                            c.isActive
                              ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/15"
                              : "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/15"
                          )}
                        >
                          {c.isActive ? (
                            <>
                              <XCircle className="w-3.5 h-3.5" /> Suspend
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" /> Activate
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-5 py-4 border-t border-slate-200 dark:border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500 dark:text-white/35">
                      Showing {(page - 1) * PER_PAGE + 1}-
                      {Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
                    </p>
                    <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Company Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create New Company"
        description="Add a new tenant organization to the platform"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreate} loading={creating} disabled={!newCompanyName.trim()}>
              Create Company
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Company Name"
            placeholder="Enter company name"
            value={newCompanyName}
            onChange={(e) => setNewCompanyName(e.target.value)}
          />
          <Select
            label="Plan"
            value={newCompanyPlan}
            onChange={(e) => setNewCompanyPlan(e.target.value)}
            options={PLANS.map((p) => ({ value: p, label: PLAN_CONFIG[p]?.label || p }))}
          />
        </div>
      </Modal>

      {/* Plan Change Modal */}
      <Modal
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        title="Change Plan"
        description={planTarget ? `Update plan for ${planTarget.name}` : undefined}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setPlanModalOpen(false)} disabled={planSaving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handlePlanChange} loading={planSaving}>
              Save Plan
            </Button>
          </>
        }
      >
        <Select
          label="Select Plan"
          value={planValue}
          onChange={(e) => setPlanValue(e.target.value)}
          options={PLANS.map((p) => ({ value: p, label: PLAN_CONFIG[p]?.label || p }))}
        />
      </Modal>

      {/* Status Toggle Confirm */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleStatusToggle}
        title={confirmAction === "suspend" ? "Suspend Company" : "Activate Company"}
        message={
          confirmTarget
            ? confirmAction === "suspend"
              ? `Are you sure you want to suspend "${confirmTarget.name}"? All users in this company will lose access.`
              : `Are you sure you want to activate "${confirmTarget.name}"? Users will regain access.`
            : ""
        }
        confirmLabel={confirmAction === "suspend" ? "Suspend" : "Activate"}
        variant={confirmAction === "suspend" ? "danger" : "warning"}
        loading={toggling}
      />
    </AdminLayout>
  );
}
