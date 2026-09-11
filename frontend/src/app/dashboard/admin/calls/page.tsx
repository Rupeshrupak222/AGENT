"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { platformApi, PlatformCallItem } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  missed: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  failed: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400",
  transferred: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
  in_progress: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  queued: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/50",
  ringing: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "text-emerald-500",
  neutral: "text-slate-400",
  negative: "text-red-500",
  mixed: "text-amber-500",
};

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function sentimentLabel(score: number | null): string {
  if (score == null) return "—";
  if (score >= 0.6) return "Positive";
  if (score >= 0.4) return "Neutral";
  return "Negative";
}

export default function AdminCallsPage() {
  const router = useRouter();
  const [calls, setCalls] = useState<PlatformCallItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [direction, setDirection] = useState("all");
  const [status, setStatus] = useState("all");
  const limit = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit };
      if (search) params.search = search;
      if (direction !== "all") params.direction = direction;
      if (status !== "all") params.status = status;
      const res = await platformApi.allCalls(params);
      setCalls(res.items);
      setTotal(res.total);
      setPages(res.pages);
    } catch {
      setCalls([]);
      setTotal(0);
    }
    setLoading(false);
  }, [page, search, direction, status]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Global Calls</h1>
            <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">
              {total > 0 ? `${total.toLocaleString()} total calls across all companies` : "Monitor all calls across the platform"}
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
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/30" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search by phone or outcome..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#120a06]/80 border border-slate-200 dark:border-white/[0.07] text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 outline-none focus:border-brand-500/40 transition-all"
            />
          </div>

          {/* Direction */}
          <select
            value={direction}
            onChange={(e) => { setDirection(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-xl bg-white dark:bg-[#120a06]/80 border border-slate-200 dark:border-white/[0.07] text-sm text-slate-700 dark:text-white/70 outline-none focus:border-brand-500/40 transition-all cursor-pointer"
          >
            <option value="all">All Directions</option>
            <option value="inbound">Inbound</option>
            <option value="outbound">Outbound</option>
          </select>

          {/* Status */}
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-xl bg-white dark:bg-[#120a06]/80 border border-slate-200 dark:border-white/[0.07] text-sm text-slate-700 dark:text-white/70 outline-none focus:border-brand-500/40 transition-all cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="missed">Missed</option>
            <option value="failed">Failed</option>
            <option value="transferred">Transferred</option>
          </select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/[0.06]">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Caller</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30 hidden md:table-cell">Company</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30 hidden lg:table-cell">Agent</th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Direction</th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Duration</th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Status</th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30 hidden md:table-cell">Outcome</th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30 hidden lg:table-cell">Sentiment</th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30 hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-white/[0.03]">
                      <td className="px-5 py-3"><div className="h-4 w-28 rounded bg-slate-100 dark:bg-white/5 animate-pulse" /></td>
                      <td className="px-5 py-3 hidden md:table-cell"><div className="h-4 w-24 rounded bg-slate-100 dark:bg-white/5 animate-pulse" /></td>
                      <td className="px-5 py-3 hidden lg:table-cell"><div className="h-4 w-20 rounded bg-slate-100 dark:bg-white/5 animate-pulse" /></td>
                      <td className="px-5 py-3"><div className="h-4 w-16 mx-auto rounded bg-slate-100 dark:bg-white/5 animate-pulse" /></td>
                      <td className="px-5 py-3"><div className="h-4 w-12 mx-auto rounded bg-slate-100 dark:bg-white/5 animate-pulse" /></td>
                      <td className="px-5 py-3"><div className="h-5 w-20 mx-auto rounded bg-slate-100 dark:bg-white/5 animate-pulse" /></td>
                      <td className="px-5 py-3 hidden md:table-cell"><div className="h-4 w-20 mx-auto rounded bg-slate-100 dark:bg-white/5 animate-pulse" /></td>
                      <td className="px-5 py-3 hidden lg:table-cell"><div className="h-4 w-16 mx-auto rounded bg-slate-100 dark:bg-white/5 animate-pulse" /></td>
                      <td className="px-5 py-3 hidden sm:table-cell"><div className="h-4 w-20 ml-auto rounded bg-slate-100 dark:bg-white/5 animate-pulse" /></td>
                    </tr>
                  ))
                ) : calls.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-16 text-center">
                      <Phone className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-white/15" />
                      <p className="text-sm font-medium text-slate-500 dark:text-white/40">No calls found</p>
                      <p className="text-xs text-slate-400 dark:text-white/25 mt-1">Try adjusting your filters or search query</p>
                    </td>
                  </tr>
                ) : (
                  calls.map((call) => (
                    <tr
                      key={call.id}
                      onClick={() => router.push(`/dashboard/admin/calls/${call.id}`)}
                      className="border-b border-slate-100 dark:border-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                            {call.direction === "inbound" ? (
                              <PhoneIncoming className="w-3.5 h-3.5 text-blue-500" />
                            ) : (
                              <PhoneOutgoing className="w-3.5 h-3.5 text-emerald-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-white truncate">
                              {call.lead?.name || "Unknown"}
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-white/30 font-mono truncate">{call.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <span className="text-slate-600 dark:text-white/50 text-xs">{call.tenant?.name || "—"}</span>
                      </td>
                      <td className="px-5 py-3 hidden lg:table-cell">
                        <span className="text-slate-600 dark:text-white/50 text-xs">{call.agent?.name || "—"}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold",
                          call.direction === "inbound"
                            ? "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
                            : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                        )}>
                          {call.direction === "inbound" ? <PhoneIncoming className="w-3 h-3" /> : <PhoneOutgoing className="w-3 h-3" />}
                          {call.direction}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center font-mono text-xs text-slate-600 dark:text-white/50">
                        {formatDuration(call.duration)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold capitalize", STATUS_COLORS[call.status] || "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/50")}>
                          {call.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center hidden md:table-cell">
                        <span className="text-xs text-slate-500 dark:text-white/40 truncate max-w-[100px] inline-block">
                          {call.outcome || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center hidden lg:table-cell">
                        <span className={cn("text-xs font-medium", SENTIMENT_COLORS[sentimentLabel(call.sentimentScore)] || "text-slate-400")}>
                          {sentimentLabel(call.sentimentScore)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right hidden sm:table-cell">
                        <div className="text-xs text-slate-500 dark:text-white/40">{formatDate(call.startedAt)}</div>
                        <div className="text-[11px] text-slate-400 dark:text-white/25">{formatTime(call.startedAt)}</div>
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
