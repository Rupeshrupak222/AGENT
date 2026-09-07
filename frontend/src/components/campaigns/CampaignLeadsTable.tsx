"use client";

import { useState } from "react";
import {
  Phone,
  PhoneCall,
  Clock,
  Sparkles,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { CampaignLeadItem } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { formatDuration } from "@/lib/utils";

interface CampaignLeadsTableProps {
  leads: CampaignLeadItem[];
  total: number;
  page: number;
  limit: number;
  statusFilter: string;
  searchQuery: string;
  loading: boolean;
  onPageChange: (page: number) => void;
  onStatusFilterChange: (status: string) => void;
  onSearchChange: (search: string) => void;
  onSelectCall: (callId: string) => void;
}

const statusBadgeConfig: Record<string, { label: string; variant: "green" | "blue" | "yellow" | "red" | "gray" | "purple" }> = {
  pending: { label: "Pending", variant: "gray" },
  queued: { label: "Queued", variant: "yellow" },
  calling: { label: "In Flight", variant: "blue" },
  completed: { label: "Completed", variant: "green" },
  failed: { label: "Failed", variant: "red" },
  skipped: { label: "Skipped", variant: "gray" },
  retry_pending: { label: "Retry Pending", variant: "yellow" },
};

export function CampaignLeadsTable({
  leads,
  total,
  page,
  limit,
  statusFilter,
  searchQuery,
  loading,
  onPageChange,
  onStatusFilterChange,
  onSearchChange,
  onSelectCall,
}: CampaignLeadsTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Client-side text filter over current page (server filters status & page)
  const filteredLeads = leads.filter((cl) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      cl.lead?.name?.toLowerCase().includes(query) ||
      cl.lead?.phone?.includes(query) ||
      cl.lead?.company?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="rounded-2xl bg-white dark:bg-surface-card border border-slate-200/80 dark:border-white/5 shadow-sm overflow-hidden flex flex-col">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-200/80 dark:border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-white/[0.01]">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search leads by name or phone..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/60">
            <Filter className="w-3.5 h-3.5" />
            <span>State:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
          >
            <option value="">All States ({total})</option>
            <option value="pending">Pending</option>
            <option value="queued">Queued</option>
            <option value="calling">In Flight (Calling)</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="skipped">Skipped</option>
            <option value="retry_pending">Retry Pending</option>
          </select>
        </div>
      </div>

      {/* Table Elements */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600 dark:text-white/70">
          <thead className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-white/40 bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-white/5">
            <tr>
              <th className="py-3 px-4 font-semibold">Contact / Company</th>
              <th className="py-3 px-4 font-semibold">Phone Number</th>
              <th className="py-3 px-4 font-semibold">Execution State</th>
              <th className="py-3 px-4 font-semibold text-center">Attempts</th>
              <th className="py-3 px-4 font-semibold">Last Outcome</th>
              <th className="py-3 px-4 font-semibold">AI Lead Score</th>
              <th className="py-3 px-4 font-semibold">Intent & Sentiment</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    <span>Loading campaign leads...</span>
                  </div>
                </td>
              </tr>
            ) : filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-white/30">
                  No enrolled contacts found matching criteria.
                </td>
              </tr>
            ) : (
              filteredLeads.map((cl) => {
                const conf = statusBadgeConfig[cl.status] || { label: cl.status, variant: "gray" };
                const analysis = cl.lastCall?.analysis;
                const score = analysis?.leadScore;

                return (
                  <tr
                    key={cl.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Contact */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                        {cl.lead?.name || "Unnamed Contact"}
                      </div>
                      {cl.lead?.company && (
                        <p className="text-[10px] text-slate-400 dark:text-white/40 truncate max-w-[180px]">
                          {cl.lead.company}
                        </p>
                      )}
                    </td>

                    {/* Phone */}
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-700 dark:text-white/80">
                      {cl.lead?.phone || "—"}
                    </td>

                    {/* State */}
                    <td className="py-3 px-4">
                      <Badge variant={conf.variant} className="text-[10px] font-semibold">
                        {conf.label}
                      </Badge>
                    </td>

                    {/* Attempts */}
                    <td className="py-3 px-4 text-center font-mono">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {cl.attemptCount}
                      </span>
                    </td>

                    {/* Last Outcome */}
                    <td className="py-3 px-4">
                      {cl.outcome ? (
                        <span className="capitalize text-[11px] font-medium text-slate-800 dark:text-white/90">
                          {cl.outcome.replace("_", " ")}
                        </span>
                      ) : cl.lastCall?.status ? (
                        <span className="capitalize text-[11px] text-slate-500 dark:text-white/50">
                          {cl.lastCall.status}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* AI Lead Score */}
                    <td className="py-3 px-4">
                      {typeof score === "number" ? (
                        <div className="flex items-center gap-1.5 font-bold">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] ${
                              score >= 70
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                : score >= 40
                                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                            }`}
                          >
                            {score} / 100
                          </span>
                        </div>
                      ) : cl.status === "completed" ? (
                        <span className="text-[10px] text-slate-400">Processing...</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Intent / Sentiment */}
                    <td className="py-3 px-4">
                      {analysis ? (
                        <div className="space-y-0.5">
                          <p className="capitalize text-[11px] font-medium text-slate-800 dark:text-white/90 truncate max-w-[130px]">
                            {analysis.intent?.replace("_", " ") || "Inquiry"}
                          </p>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                              analysis.sentiment === "positive"
                                ? "text-emerald-500"
                                : analysis.sentiment === "negative"
                                ? "text-rose-500"
                                : "text-slate-400"
                            }`}
                          >
                            {analysis.sentiment || "Neutral"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      {cl.lastCallId ? (
                        <button
                          onClick={() => onSelectCall(cl.lastCallId!)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-500/10 hover:bg-brand-500/20 transition-colors inline-flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Intelligence</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">Uncontacted</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-slate-200/80 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-white/50 bg-slate-50/50 dark:bg-white/[0.01]">
        <div>
          Showing {filteredLeads.length > 0 ? (page - 1) * limit + 1 : 0} to{" "}
          {Math.min(page * limit, total)} of {total} leads
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 py-1 text-xs font-medium text-slate-900 dark:text-white">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
