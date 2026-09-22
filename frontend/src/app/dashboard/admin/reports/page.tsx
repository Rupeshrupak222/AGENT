"use client";

import { useState, useEffect, useCallback } from "react";
import { FileBarChart, Plus, Trash2, Play, CalendarDays } from "lucide-react";
import { superAdminApi, ScheduledReportItem, normalizeApiError } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button, Badge, EmptyState, TableRowSkeleton, Modal, Input, ConfirmDialog } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

const REPORTS_TYPES = [
  { value: "companies", label: "Companies" },
  { value: "agents", label: "Agents" },
  { value: "calls", label: "Calls" },
  { value: "leads", label: "Leads" },
  { value: "summary", label: "Platform summary" },
];

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const EMPTY_FORM = { name: "", type: "companies", frequency: "weekly", recipients: "", format: "csv", enabled: true };

export default function ScheduledReportsPage() {
  const { success, error: toastError } = useToast();
  const [reports, setReports] = useState<ScheduledReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<ScheduledReportItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [lastSummary, setLastSummary] = useState<{ id: string; text: string } | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ScheduledReportItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await superAdminApi.listScheduledReports();
      setReports(res.items);
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModal(true);
  };

  const openEdit = (r: ScheduledReportItem) => {
    setEditing(r);
    setForm({ name: r.name, type: r.type, frequency: r.frequency, recipients: r.recipients.join(", "), format: r.format, enabled: r.enabled });
    setFormError(null);
    setModal(true);
  };

  const handleSave = async () => {
    setFormError(null);
    if (!form.name.trim()) { setFormError("Report name is required"); return; }
    const recipients = form.recipients.split(",").map((r) => r.trim()).filter(Boolean);
    if (!recipients.length) { setFormError("At least one recipient email is required"); return; }
    setSaving(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        type: form.type,
        frequency: form.frequency,
        recipients,
        format: form.format,
        enabled: form.enabled,
      };
      if (editing) {
        await superAdminApi.updateScheduledReport(editing.id, payload);
        success("Report schedule updated");
      } else {
        await superAdminApi.createScheduledReport(payload);
        success("Report schedule created");
      }
      setModal(false);
      fetchData();
    } catch (e) {
      setFormError(normalizeApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async (r: ScheduledReportItem) => {
    setRunningId(r.id);
    try {
      const res = await superAdminApi.runScheduledReport(r.id);
      success(`Report generated (${res.status})`);
      if (res.summary) setLastSummary({ id: r.id, text: res.summary });
      fetchData();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setRunningId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await superAdminApi.deleteScheduledReport(deleteTarget.id);
      success("Report schedule deleted");
      setDeleteTarget(null);
      fetchData();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setDeleting(false);
    }
  };

  const handleToggle = async (r: ScheduledReportItem) => {
    try {
      await superAdminApi.updateScheduledReport(r.id, { enabled: !r.enabled });
      success(r.enabled ? "Schedule paused" : "Schedule activated");
      fetchData();
    } catch (e) {
      toastError(normalizeApiError(e));
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Scheduled Reports</h1>
            <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">
              Automated email reports for platform stakeholders
            </p>
          </div>
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            New Report
          </Button>
        </div>

        {error && !loading && (
          <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 shadow-sm overflow-hidden">
          {loading ? (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={i} columns={4} />)}
            </div>
          ) : reports.length === 0 ? (
            <EmptyState
              icon={<FileBarChart className="w-10 h-10 text-slate-300 dark:text-white/20" />}
              title="No scheduled reports"
              description="Schedule recurring reports sent by email on a daily, weekly or monthly cadence"
              action={<Button size="sm" onClick={openCreate}>New Report</Button>}
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {reports.map((r) => (
                <div key={r.id} className="p-5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{r.name}</h3>
                        <Badge variant={r.enabled ? "success" : "gray"} size="sm" dot>{r.enabled ? "Scheduled" : "Paused"}</Badge>
                        {r.lastStatus && (
                          <Badge variant={r.lastStatus === "failed" ? "error" : "success"} size="sm">{r.lastStatus}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400 dark:text-white/30">
                        <span>{REPORTS_TYPES.find((t) => t.value === r.type)?.label || r.type}</span>
                        <span>{FREQUENCIES.find((f) => f.value === r.frequency)?.label || r.frequency}</span>
                        <span className="uppercase">{r.format}</span>
                        <span className="font-mono">{r.recipients.join(", ")}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400 dark:text-white/30">
                        {r.nextRunAt ? (
                          <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> Next: {new Date(r.nextRunAt).toLocaleString()}</span>
                        ) : null}
                        {r.lastRunAt ? <span>Last run: {new Date(r.lastRunAt).toLocaleString()}</span> : null}
                      </div>
                      {lastSummary?.id === r.id && (
                        <pre className="mt-3 text-[11px] font-mono bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.05] rounded-lg p-3 text-slate-600 dark:text-white/50 whitespace-pre-wrap max-h-40 overflow-auto">
                          {lastSummary.text}
                        </pre>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Button variant="ghost" size="sm" loading={runningId === r.id} icon={<Play className="w-3.5 h-3.5" />} onClick={() => handleRun(r)}>
                        Run
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleToggle(r)}>{r.enabled ? "Pause" : "Resume"}</Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>Edit</Button>
                      <button onClick={() => setDeleteTarget(r)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Modal
          open={modal}
          onClose={() => { if (!saving) setModal(false); }}
          title={editing ? "Edit Report Schedule" : "New Scheduled Report"}
          description="Reports are emailed to the recipients on the chosen cadence"
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setModal(false)} disabled={saving}>Cancel</Button>
              <Button size="sm" onClick={handleSave} loading={saving}>{editing ? "Save Changes" : "Create Report"}</Button>
            </>
          }
        >
          <div className="space-y-4">
            {formError && (
              <div className="rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-400">{formError}</div>
            )}
            <Input
              label="Report Name"
              placeholder="e.g. Weekly Company Summary"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-white/60 mb-1.5 block">Report Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none"
                >
                  {REPORTS_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-white/60 mb-1.5 block">Frequency</label>
                <select
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none"
                >
                  {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-white/60 mb-1.5 block">Format</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "csv", label: "CSV attachment" },
                  { value: "summary", label: "Text summary" },
                ].map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setForm({ ...form, format: o.value })}
                    className={cn(
                      "text-left text-xs px-3 py-2 rounded-lg border transition-all",
                      form.format === o.value
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 font-medium"
                        : "border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/40"
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <Input
              label="Recipients (comma separated)"
              placeholder="ops@company.com, ceo@company.com"
              value={form.recipients}
              onChange={(e) => setForm({ ...form, recipients: e.target.value })}
            />
            <button
              type="button"
              onClick={() => setForm({ ...form, enabled: !form.enabled })}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all",
                form.enabled
                  ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10"
                  : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04]"
              )}
            >
              <span className="text-sm font-medium text-slate-700 dark:text-white/70">Schedule active</span>
              <span className={cn("relative w-10 h-5 rounded-full transition-colors", form.enabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-white/15")}>
                <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all", form.enabled ? "left-[22px]" : "left-0.5")} />
              </span>
            </button>
            <p className="text-xs text-slate-400 dark:text-white/30">
              Email delivery uses the platform Resend integration (<code>RESEND_API_KEY</code>). Without it, reports are generated and logged.
            </p>
          </div>
        </Modal>

        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete Report Schedule"
          message={`Delete "${deleteTarget?.name}"? The schedule and history will be removed.`}
          confirmLabel="Delete"
          variant="danger"
          loading={deleting}
        />
      </div>
    </AdminLayout>
  );
}