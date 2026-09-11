"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Target,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Phone,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { platformApi, PlatformCampaignItem } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/50",
  scheduled: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  running: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  paused: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  completed: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
  cancelled: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminCampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<PlatformCampaignItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const limit = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit };
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await platformApi.allCampaigns(params);
      let filtered = res.items;
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter((c) => c.name.toLowerCase().includes(q) || c.tenant?.name?.toLowerCase().includes(q));
      }
      setCampaigns(filtered);
      setTotal(search ? filtered.length : res.total);
      setPages(res.pages);
    } catch {
      setCampaigns([]);
      setTotal(0);
    }
    setLoading(false);
  }, [page, statusFilter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Campaigns</h1>
            <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">
              {total > 0 ? `${total.toLocaleString()} total campaigns across all companies` : "Manage campaigns across the platform"}
            </p>
          </div>
          <button
            onClick={() => fetchData()}
            className="p-2 rounded-xl bg-white dark:bg-[#120a06]/80 border border-slate-200 dark:border-white/[0.07] text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-all"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by campaign or company..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#120a06]/80 border border-slate-200 dark:border-white/[0.07] text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 outline-none focus:border-brand-500/40 transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-xl bg-white dark:bg-[#120a06]/80 border border-slate-200 dark:border-white/[0.07] text-sm text-slate-700 dark:text-white/70 outline-none focus:border-brand-500/40 transition-all cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="running">Running</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/[0.06]">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Campaign</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30 hidden md:table-cell">Company</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30 hidden lg:table-cell">Agent</th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Status</th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Contacts</th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Calls</th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30 hidden sm:table-cell">Created</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-white/[0.03]">
                      <td className="px-5 py-3"><div className="h-4 w-32 rounded bg-slate-100 dark:bg-white/5 animate-pulse" /></td>
                      <td className="px-5 py-3 hidden md:table-cell"><div className="h-4 w-24 rounded bg-slate-100 dark:bg-white/5 animate-pulse" /></td>
                      <td className="px-5 py-3 hidden lg:table-cell"><div className="h-4 w-20 rounded bg-slate-100 dark:bg-white/5 animate-pulse" /></td>
                      <td className="px-5 py-3"><div className="h-5 w-20 mx-auto rounded bg-slate-100 dark:bg-white/5 animate-pulse" /></td>
                      <td className="px-5 py-3"><div className="h-4 w-12 mx-auto rounded bg-slate-100 dark:bg-white/5 animate-pulse" /></td>
                      <td className="px-5 py-3"><div className="h-4 w-12 mx-auto rounded bg-slate-100 dark:bg-white/5 animate-pulse" /></td>
                      <td className="px-5 py-3 hidden sm:table-cell"><div className="h-4 w-20 ml-auto rounded bg-slate-100 dark:bg-white/5 animate-pulse" /></td>
                    </tr>
                  ))
                ) : campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <Target className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-white/15" />
                      <p className="text-sm font-medium text-slate-500 dark:text-white/40">No campaigns found</p>
                      <p className="text-xs text-slate-400 dark:text-white/25 mt-1">Try adjusting your filters or search</p>
                    </td>
                  </tr>
                ) : (
                  campaigns.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-slate-100 dark:border-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
                      onClick={() => router.push(`/dashboard/admin/companies/${c.tenant?.id}`)}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                            <Target className="w-4 h-4 text-brand-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-white truncate">{c.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <span className="text-xs text-slate-500 dark:text-white/40">{c.tenant?.name || "—"}</span>
                      </td>
                      <td className="px-5 py-3 hidden lg:table-cell">
                        <span className="text-xs text-slate-500 dark:text-white/40">{c.agent?.name || "—"}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold capitalize", STATUS_COLORS[c.status] || "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/50")}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-xs text-slate-600 dark:text-white/50">
                          <Users className="w-3 h-3" />
                          {c._count?.leads ?? 0}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-xs text-slate-600 dark:text-white/50">
                          <Phone className="w-3 h-3" />
                          {c._count?.calls ?? 0}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right hidden sm:table-cell">
                        <span className="text-xs text-slate-400 dark:text-white/25">{formatDate(c.createdAt)}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-white/[0.06]">
              <p className="text-xs text-slate-500 dark:text-white/35">
                Page {page} of {pages} · {total.toLocaleString()} results
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-white/40 hover:bg-slate-100 dark:hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-white/40 hover:bg-slate-100 dark:hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
