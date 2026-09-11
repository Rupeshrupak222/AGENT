"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Bot,
  Pause,
  Play,
  Building2,
  Phone,
  Languages,
  Search,
  XCircle,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import {
  agentsApi,
  AgentItem,
  normalizeApiError,
} from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui";
import { Badge } from "@/components/ui";
import { EmptyState } from "@/components/ui";
import { TableRowSkeleton } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui";
import { Pagination } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "warning" | "gray" | "info" }> = {
  active: { label: "Active", variant: "success" },
  paused: { label: "Paused", variant: "warning" },
  draft: { label: "Draft", variant: "gray" },
  archived: { label: "Archived", variant: "gray" },
};

const PER_PAGE = 20;

export default function AgentsPage() {
  const { success, error: toastError } = useToast();
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [toggleTarget, setToggleTarget] = useState<AgentItem | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toggling, setToggling] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await agentsApi.listPlatform();
      setAgents(data);
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const companies = useMemo(() => {
    const map = new Map<string, string>();
    agents.forEach((a) => {
      if (a.tenant) map.set(a.tenant.id, a.tenant.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [agents]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return agents.filter((a) => {
      const matchSearch =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        (a.tenant?.name || "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || a.status === statusFilter;
      const matchCompany = companyFilter === "all" || a.tenant?.id === companyFilter;
      return matchSearch && matchStatus && matchCompany;
    });
  }, [agents, search, statusFilter, companyFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, companyFilter]);

  const handleToggle = async () => {
    if (!toggleTarget) return;
    setToggling(true);
    try {
      if (toggleTarget.status === "active") {
        await agentsApi.pause(toggleTarget.id);
        success(`${toggleTarget.name} paused`);
      } else {
        await agentsApi.activate(toggleTarget.id);
        success(`${toggleTarget.name} activated`);
      }
      setConfirmOpen(false);
      setToggleTarget(null);
      fetchData();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setToggling(false);
    }
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: agents.length };
    agents.forEach((a) => {
      counts[a.status] = (counts[a.status] || 0) + 1;
    });
    return counts;
  }, [agents]);

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">AI Agents</h1>
            <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">
              Manage all AI agents across the platform
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-white/40">
            <Bot className="w-4 h-4" />
            <span className="font-semibold text-slate-900 dark:text-white">{agents.length}</span> total agents
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/25 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, role, or company..."
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
              {(["all", "active", "paused", "draft"] as const).map((s) => (
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
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                  <span className="ml-1 text-[10px] opacity-60">{statusCounts[s] || 0}</span>
                </button>
              ))}
            </div>

            {companies.length > 0 && (
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="h-9 px-3 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-slate-600 dark:text-white/60 outline-none cursor-pointer"
              >
                <option value="all">All Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Error */}
        {error && !loading && (
          <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 p-6 text-center">
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
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
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Bot className="w-10 h-10 text-slate-300 dark:text-white/20" />}
              title="No agents found"
              description={
                search || statusFilter !== "all" || companyFilter !== "all"
                  ? "Try adjusting your filters"
                  : "No AI agents have been created yet"
              }
              action={
                search || statusFilter !== "all" || companyFilter !== "all" ? (
                  <Button variant="outline" size="sm" onClick={() => { setSearch(""); setStatusFilter("all"); setCompanyFilter("all"); }}>
                    Clear Filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/[0.06]">
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                        Agent
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                        Company
                      </th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                        Status
                      </th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                        Calls
                      </th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                        Language
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
                    {paginated.map((a) => {
                      const st = STATUS_CONFIG[a.status] || STATUS_CONFIG.draft;
                      return (
                        <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-50 dark:bg-purple-500/10">
                                <Bot className="w-4 h-4 text-purple-500" />
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900 dark:text-white">{a.name}</div>
                                <div className="text-[11px] text-slate-400 dark:text-white/30">{a.role}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            {a.tenant ? (
                              <Link
                                href={`/dashboard/admin/companies/${a.tenant.id}`}
                                className="flex items-center gap-1.5 text-sm text-brand-500 hover:text-brand-600 dark:hover:text-brand-400 font-medium transition-colors"
                              >
                                <Building2 className="w-3.5 h-3.5 opacity-50" />
                                {a.tenant.name}
                              </Link>
                            ) : (
                              <span className="text-xs text-slate-400 dark:text-white/25">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <Badge variant={st.variant} dot size="sm">
                              {st.label}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-center font-medium text-slate-700 dark:text-white/60">
                            {a._count?.calls ?? 0}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-white/40 capitalize">
                              <Languages className="w-3 h-3 opacity-50" />
                              {a.language}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-white/40">
                            {a.createdAt
                              ? new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                              : "—"}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end">
                              {a.status !== "draft" && a.status !== "archived" && (
                                <button
                                  onClick={() => {
                                    setToggleTarget(a);
                                    setConfirmOpen(true);
                                  }}
                                  className={cn(
                                    "p-1.5 rounded-lg transition-all",
                                    a.status === "active"
                                      ? "text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 dark:text-white/40 dark:hover:text-amber-400"
                                      : "text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 dark:text-white/40 dark:hover:text-emerald-400"
                                  )}
                                  title={a.status === "active" ? "Pause" : "Activate"}
                                >
                                  {a.status === "active" ? (
                                    <Pause className="w-4 h-4" />
                                  ) : (
                                    <Play className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="lg:hidden divide-y divide-slate-100 dark:divide-white/[0.04]">
                {paginated.map((a) => {
                  const st = STATUS_CONFIG[a.status] || STATUS_CONFIG.draft;
                  return (
                    <div key={a.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-50 dark:bg-purple-500/10">
                            <Bot className="w-4 h-4 text-purple-500" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{a.name}</p>
                            <p className="text-[11px] text-slate-400 dark:text-white/30">{a.role}</p>
                          </div>
                        </div>
                        <Badge variant={st.variant} dot size="sm">
                          {st.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-white/40">
                        {a.tenant && (
                          <Link
                            href={`/dashboard/admin/companies/${a.tenant.id}`}
                            className="flex items-center gap-1 text-brand-500 font-medium"
                          >
                            <Building2 className="w-3 h-3" />
                            {a.tenant.name}
                          </Link>
                        )}
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {a._count?.calls ?? 0} calls
                        </span>
                        <span className="capitalize">{a.language}</span>
                      </div>
                      {a.status !== "draft" && a.status !== "archived" && (
                        <button
                          onClick={() => {
                            setToggleTarget(a);
                            setConfirmOpen(true);
                          }}
                          className={cn(
                            "w-full flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium transition-colors",
                            a.status === "active"
                              ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/15"
                              : "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/15"
                          )}
                        >
                          {a.status === "active" ? (
                            <>
                              <Pause className="w-3.5 h-3.5" /> Pause Agent
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5" /> Activate Agent
                            </>
                          )}
                        </button>
                      )}
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

      {/* Toggle Confirm */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleToggle}
        title={toggleTarget?.status === "active" ? "Pause Agent" : "Activate Agent"}
        message={
          toggleTarget
            ? toggleTarget.status === "active"
              ? `Are you sure you want to pause "${toggleTarget.name}"? It will stop handling calls.`
              : `Are you sure you want to activate "${toggleTarget.name}"? It will start handling calls.`
            : ""
        }
        confirmLabel={toggleTarget?.status === "active" ? "Pause" : "Activate"}
        variant={toggleTarget?.status === "active" ? "warning" : "warning"}
        loading={toggling}
      />
    </AdminLayout>
  );
}
