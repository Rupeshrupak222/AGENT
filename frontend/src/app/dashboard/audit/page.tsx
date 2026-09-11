"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  Activity,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions";
import { auditApi, CompanyAuditLogItem, normalizeApiError } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

const ACTION_GROUPS: Record<string, string> = {
  CREATED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
  UPDATED: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30",
  DELETED: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30",
  ENABLED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
  DISABLED: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30",
  INVITED: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/30",
  KICKED: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30",
  PAUSED: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30",
  RESUMED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
};

function badgeClass(action: string): string {
  for (const [suffix, cls] of Object.entries(ACTION_GROUPS)) {
    if (action.toUpperCase().endsWith(suffix)) return cls;
  }
  return "bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-500/30";
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function AuditPage() {
  const { can } = usePermissions();
  const [items, setItems] = useState<CompanyAuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [pages, setPages] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { success } = useToast();

  const load = useCallback(
    async (manual = false, targetPage = page) => {
      if (manual) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await auditApi.list({
          action: actionFilter || undefined,
          resource: resourceFilter || undefined,
          page: targetPage,
          limit,
        });
        setItems(res.items);
        setTotal(res.total);
        setPages(res.pages);
        if (targetPage !== res.page) setPage(res.page);
      } catch (e) {
        setError(normalizeApiError(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [actionFilter, resourceFilter, page, limit]
  );

  useEffect(() => {
    setPage(1);
  }, [actionFilter, resourceFilter]);

  useEffect(() => {
    load(false, page);
  }, [load, page]);

  if (!can(PERMISSIONS.AUDIT_LOG_VIEW)) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="rounded-2xl p-8 text-center bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Access Restricted</p>
          <p className="text-xs text-slate-500 dark:text-white/50 mt-1">You do not have permission to view audit logs.</p>
        </div>
      </div>
    );
  }

  const detailPreview = (d: Record<string, any> | null | undefined) => {
    if (!d) return null;
    const keys = Object.keys(d).filter((k) => typeof d[k] !== "object" || d[k] === null);
    if (keys.length === 0) return null;
    return keys
      .slice(0, 3)
      .map((k) => `${k}: ${String(d[k] ?? "—")}`)
      .join(" · ");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-brand-500 dark:text-brand-400" /> Audit Activity
          </h1>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
            Immutable trail of every administrative action performed across this workspace.
          </p>
        </div>
        <button
          onClick={() => load(true, page)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-white/80 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-brand-500 dark:text-brand-400" : ""}`} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <label htmlFor="audit-action" className="sr-only">Filter by action</label>
        <select
          id="audit-action"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="h-10 rounded-xl px-3 text-sm bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500"
        >
          <option value="">All Actions</option>
          <option value="_CREATED">Created</option>
          <option value="_UPDATED">Updated</option>
          <option value="_DELETED">Deleted</option>
          <option value="_INVITED">Invited</option>
          <option value="PHONE_NUMBER">Phone Numbers</option>
          <option value="KNOWLEDGE_SOURCE">Knowledge</option>
        </select>

        <label htmlFor="audit-resource" className="sr-only">Filter by resource</label>
        <select
          id="audit-resource"
          value={resourceFilter}
          onChange={(e) => setResourceFilter(e.target.value)}
          className="h-10 rounded-xl px-3 text-sm bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500"
        >
          <option value="">All Resources</option>
          <option value="tenant">tenant</option>
          <option value="user">user</option>
          <option value="agent">agent</option>
          <option value="lead">lead</option>
          <option value="call">call</option>
          <option value="campaign">campaign</option>
          <option value="integration">integration</option>
          <option value="phone_number">phone_number</option>
          <option value="knowledge_source">knowledge_source</option>
        </select>

        <span className="text-xs font-mono text-slate-400 dark:text-white/40">
          {total} events
        </span>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Log table */}
      <div className="rounded-2xl panel-card overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-slate-200/60 dark:bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <FileSearch className="w-10 h-10 text-slate-300 dark:text-white/20 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-900 dark:text-white/70">No audit events found</p>
            <p className="text-xs text-slate-400 dark:text-white/40 mt-1">
              Adjust your filters, or administrative actions will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-white/40 border-b border-slate-100 dark:border-white/[0.06]">
                  <th className="px-5 py-3 font-semibold">Action</th>
                  <th className="px-5 py-3 font-semibold">Resource</th>
                  <th className="px-5 py-3 font-semibold">Details</th>
                  <th className="px-5 py-3 font-semibold">Actor</th>
                  <th className="px-5 py-3 font-semibold">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {items.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold font-mono ${badgeClass(log.action)}`}>
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600 dark:text-white/70 capitalize">
                      {log.resource.replace(/_/g, " ")}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/50">
                        <Activity className="w-3.5 h-3.5 text-slate-400 dark:text-white/30 flex-shrink-0" />
                        <span className="max-w-[360px] truncate">
                          {detailPreview(log.details) ?? log.resourceId ?? "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {log.user ? (
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">{log.user.name}</p>
                          <p className="text-[11px] text-slate-400 dark:text-white/40">{log.user.email}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-white/40">System</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-white/50 whitespace-nowrap" title={new Date(log.createdAt).toLocaleString()}>
                      {timeAgo(log.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 dark:text-white/40">
            Page {page} of {pages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 h-9 px-3 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-white/70 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="inline-flex items-center gap-1 h-9 px-3 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-white/70 disabled:opacity-40 transition-colors"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}