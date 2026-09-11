"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  XCircle,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { platformApi, PlatformAuditLogItem } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";

const PAGE_SIZE = 20;

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<PlatformAuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [actionSearch, setActionSearch] = useState("");
  const [debouncedAction, setDebouncedAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce action search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedAction(actionSearch);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [actionSearch]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {
        page,
        limit: PAGE_SIZE,
      };
      if (debouncedAction.trim()) params.action = debouncedAction.trim();
      const res = await platformApi.auditLogs(params);
      setLogs(res.items);
      setTotal(res.total);
      setPages(res.pages || Math.ceil(res.total / PAGE_SIZE));
    } catch (e: any) {
      setError(e?.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedAction]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Audit Logs
            </h1>
            <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">
              Track all platform activity and security events
            </p>
          </div>
          <button
            onClick={fetchLogs}
            className="p-2 rounded-xl bg-white dark:bg-[#120a06]/80 border border-slate-200 dark:border-white/[0.07] text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-all"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/30" />
            <input
              type="text"
              value={actionSearch}
              onChange={(e) => setActionSearch(e.target.value)}
              placeholder="Search by action..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#120a06]/80 border border-slate-200 dark:border-white/[0.07] text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-[#120a06]/80 border border-slate-200 dark:border-white/[0.07]">
            <Filter className="w-4 h-4 text-slate-400 dark:text-white/30" />
            <span className="text-xs font-medium text-slate-500 dark:text-white/40">
              {total} total logs
            </span>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-8 text-center">
            <XCircle className="w-8 h-8 mx-auto mb-3 text-red-500" />
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {error}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/[0.06]">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                      Actor
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                      Target
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                      Company
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                      IP Address
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading && logs.length === 0 ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr
                        key={i}
                        className="border-b border-slate-100 dark:border-white/[0.03]"
                      >
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 rounded bg-slate-100 dark:bg-white/[0.04] animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : logs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-12 text-center text-slate-400 dark:text-white/30"
                      >
                        <Shield className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        No audit logs found
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const isWrite = log.action?.includes("create") ||
                        log.action?.includes("update") ||
                        log.action?.includes("delete") ||
                        log.action?.includes("invite");
                      return (
                        <tr
                          key={log.id}
                          className="border-b border-slate-100 dark:border-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-4 py-3 text-xs text-slate-500 dark:text-white/40 font-mono whitespace-nowrap">
                            {formatTimestamp(log.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-slate-900 dark:text-white">
                              {log.user?.name || "System"}
                            </div>
                            <div className="text-[11px] text-slate-400 dark:text-white/25">
                              {log.user?.email || "—"}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-slate-500 dark:text-white/40 capitalize">
                              {log.action?.split(".")[0] || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold",
                                isWrite
                                  ? "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
                                  : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/50"
                              )}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600 dark:text-white/50">
                            {log.resource}
                            {log.resourceId && (
                              <span className="text-slate-400 dark:text-white/25 ml-1 font-mono">
                                {log.resourceId.slice(0, 8)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 dark:text-white/40">
                            {log.tenant?.name || "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400 dark:text-white/30 font-mono">
                            {log.ipAddress || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold",
                                log.action?.includes("delete")
                                  ? "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400"
                                  : log.action?.includes("create")
                                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                                  : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/50"
                              )}
                            >
                              {log.action?.includes("delete")
                                ? "Destructive"
                                : log.action?.includes("create")
                                ? "Created"
                                : "Modified"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-white/[0.06]">
                <p className="text-xs text-slate-500 dark:text-white/40">
                  Showing {(page - 1) * PAGE_SIZE + 1}-
                  {Math.min(page * PAGE_SIZE, total)} of {total}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg text-slate-400 dark:text-white/30 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 text-xs font-semibold text-slate-700 dark:text-white/60">
                    {page} / {pages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(pages, p + 1))}
                    disabled={page >= pages}
                    className="p-1.5 rounded-lg text-slate-400 dark:text-white/30 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
