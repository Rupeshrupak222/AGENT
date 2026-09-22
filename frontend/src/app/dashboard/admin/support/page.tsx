"use client";

import { useState, useEffect, useCallback } from "react";
import { Headphones, Send } from "lucide-react";
import { superAdminApi, SupportTicketItem, normalizeApiError } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button, Badge, EmptyState, TableRowSkeleton, Modal, Select, TextArea, Pagination } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<string, any> = {
  open: "error",
  in_progress: "warning",
  resolved: "success",
  closed: "gray",
};

const PRIORITY_BADGE: Record<string, any> = {
  low: "gray",
  medium: "info",
  high: "warning",
  urgent: "error",
};

const PER_PAGE = 15;

export default function SupportPage() {
  const { success, error: toastError } = useToast();
  const [tickets, setTickets] = useState<{ items: SupportTicketItem[]; total: number; page: number; pages: number }>({ items: [], total: 0, page: 1, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [selected, setSelected] = useState<SupportTicketItem | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await superAdminApi.listTickets({
        page,
        limit: PER_PAGE,
        status: statusFilter === "all" ? undefined : statusFilter,
        priority: priorityFilter === "all" ? undefined : priorityFilter,
      });
      setTickets(res);
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, priorityFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openTicket = async (t: SupportTicketItem) => {
    setSelected(t);
    setReplyText("");
  };

  const handleReply = async () => {
    if (!selected || !replyText.trim()) return;
    setReplying(true);
    try {
      const updated = await superAdminApi.replyTicket(selected.id, replyText.trim());
      setSelected(updated);
      setReplyText("");
      success("Reply sent");
      fetchData();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setReplying(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!selected) return;
    setUpdatingStatus(true);
    try {
      const updated = await superAdminApi.updateTicket(selected.id, { status });
      setSelected(updated);
      success(`Status set to ${status}`);
      fetchData();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Support Inbox</h1>
          <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">
            Tickets submitted by tenants across the platform
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-white/[0.06] flex items-center gap-3 flex-wrap">
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              options={[
                { value: "all", label: "All Statuses" },
                { value: "open", label: "Open" },
                { value: "in_progress", label: "In Progress" },
                { value: "resolved", label: "Resolved" },
                { value: "closed", label: "Closed" },
              ]}
              className="!w-44"
            />
            <Select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
              options={[
                { value: "all", label: "All Priorities" },
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
                { value: "urgent", label: "Urgent" },
              ]}
              className="!w-44"
            />
          </div>

          {loading ? (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {Array.from({ length: 6 }).map((_, i) => (
                <TableRowSkeleton key={i} columns={4} />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
            </div>
          ) : tickets.items.length === 0 ? (
            <EmptyState
              icon={<Headphones className="w-10 h-10 text-slate-300 dark:text-white/20" />}
              title="No tickets"
              description="Support tickets raised by tenants will appear here"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/[0.06]">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Subject</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Tenant</th>
                    <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Priority</th>
                    <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Status</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {tickets.items.map((t) => (
                    <tr key={t.id} onClick={() => openTicket(t)} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-900 dark:text-white">{t.subject}</p>
                        <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5 line-clamp-1">{t.body}</p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-white/40">{t.tenantName || "—"}</td>
                      <td className="px-5 py-3.5 text-center">
                        <Badge variant={PRIORITY_BADGE[t.priority] || "gray"} size="sm" dot>{t.priority}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <Badge variant={STATUS_BADGE[t.status] || "gray"} size="sm">{t.status.replace("_", " ")}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-white/40">
                        {new Date(t.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tickets.pages > 1 && (
            <div className="px-5 py-4 border-t border-slate-200 dark:border-white/[0.06]">
              <Pagination page={page} totalPages={tickets.pages} onPageChange={setPage} />
            </div>
          )}
        </div>

        <Modal
          open={!!selected}
          onClose={() => setSelected(null)}
          title={selected?.subject || "Ticket"}
          description={selected ? `${selected.tenantName || "Guest"} · ${selected.tenantEmail || "no email"}` : undefined}
          size="lg"
          footer={
            selected ? (
              <>
                <Select
                  value={selected.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  options={[
                    { value: "open", label: "Open" },
                    { value: "in_progress", label: "In Progress" },
                    { value: "resolved", label: "Resolved" },
                    { value: "closed", label: "Closed" },
                  ]}
                  className="!w-40"
                  disabled={updatingStatus}
                />
                <Button size="sm" icon={<Send className="w-3.5 h-3.5" />} onClick={handleReply} loading={replying} disabled={!replyText.trim()}>
                  Send Reply
                </Button>
              </>
            ) : undefined
          }
        >
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={PRIORITY_BADGE[selected.priority] || "gray"} size="sm" dot>{selected.priority}</Badge>
                <Badge variant={STATUS_BADGE[selected.status] || "gray"} size="sm">{selected.status.replace("_", " ")}</Badge>
                <span className="text-xs text-slate-400 dark:text-white/30">
                  Opened {new Date(selected.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              <div className={cn("rounded-xl border p-4 text-sm", "border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] text-slate-700 dark:text-white/70")}>
                {selected.body}
              </div>

              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/30">Conversation</p>
                {(selected.messages || []).length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-white/40">No replies yet.</p>
                ) : (
                  selected.messages!.map((m, i) => (
                    <div key={i} className={cn("rounded-xl border p-4 text-sm", "border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03]")}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white">{m.fromEmail}</span>
                        <span className="text-[10px] text-slate-400 dark:text-white/30">{new Date(m.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p className="text-slate-700 dark:text-white/70">{m.body}</p>
                    </div>
                  ))
                )}
              </div>

              <TextArea
                label="Your reply"
                placeholder="Type your response to this ticket..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
            </div>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}