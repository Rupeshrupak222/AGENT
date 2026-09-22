"use client";

import { useState, useEffect, useCallback } from "react";
import { Megaphone, Plus, Trash2, Power, PowerOff } from "lucide-react";
import { superAdminApi, AnnouncementItem, normalizeApiError } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button, Badge, EmptyState, TableRowSkeleton, Modal, Input, Select, TextArea, ConfirmDialog } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

const PRIORITY_BADGE: Record<string, any> = {
  info: "info",
  warning: "warning",
  important: "error",
};

const EMPTY_FORM = { title: "", body: "", priority: "info", audience: "all", startsAt: "", expiresAt: "" };

export default function AnnouncementsPage() {
  const { success, error: toastError } = useToast();
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AnnouncementItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<AnnouncementItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await superAdminApi.listAnnouncements();
      setAnnouncements(res.items);
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (a: AnnouncementItem) => {
    setEditing(a);
    setForm({
      title: a.title,
      body: a.body,
      priority: a.priority,
      audience: a.audience,
      startsAt: a.startsAt ? new Date(a.startsAt).toISOString().slice(0, 16) : "",
      expiresAt: a.expiresAt ? new Date(a.expiresAt).toISOString().slice(0, 16) : "",
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setFormError(null);
    if (!form.title.trim() || !form.body.trim()) {
      setFormError("Title and message are required");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        title: form.title.trim(),
        body: form.body.trim(),
        priority: form.priority,
        audience: form.audience,
        startsAt: form.startsAt || undefined,
        expiresAt: form.expiresAt || undefined,
      };
      if (editing) {
        await superAdminApi.updateAnnouncement(editing.id, payload);
        success("Announcement updated");
      } else {
        await superAdminApi.createAnnouncement(payload);
        success("Announcement published");
      }
      setModalOpen(false);
      fetchData();
    } catch (e) {
      setFormError(normalizeApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (a: AnnouncementItem) => {
    setTogglingId(a.id);
    try {
      await superAdminApi.updateAnnouncement(a.id, { isActive: !a.isActive });
      success(a.isActive ? "Announcement taken offline" : "Announcement live");
      fetchData();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await superAdminApi.deleteAnnouncement(deleteTarget.id);
      success("Announcement deleted");
      setDeleteTarget(null);
      fetchData();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Announcements</h1>
            <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">
              Broadcast announcements to all tenants or specific companies
            </p>
          </div>
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            New Announcement
          </Button>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 shadow-sm overflow-hidden">
          {loading ? (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRowSkeleton key={i} columns={4} />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
            </div>
          ) : announcements.length === 0 ? (
            <EmptyState
              icon={<Megaphone className="w-10 h-10 text-slate-300 dark:text-white/20" />}
              title="No announcements"
              description="Publish a message shown to tenants across the platform"
              action={<Button size="sm" onClick={openCreate}>New Announcement</Button>}
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {announcements.map((a) => (
                <div key={a.id} className="p-5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{a.title}</h3>
                        <Badge variant={PRIORITY_BADGE[a.priority] || "gray"} size="sm" dot>{a.priority}</Badge>
                        <Badge variant={a.isActive ? "success" : "gray"} size="sm">{a.isActive ? "Live" : "Hidden"}</Badge>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-white/60 mt-2 line-clamp-2">{a.body}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 dark:text-white/30">
                        <span className="capitalize">{a.audience === "all" ? "All tenants" : `${(a.tenantIds || []).length} specific`}</span>
                        {a.startsAt && <span>Starts {new Date(a.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}
                        {a.expiresAt && <span>Until {new Date(a.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}
                        <span>{new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Button variant="ghost" size="sm" loading={togglingId === a.id} icon={a.isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />} onClick={() => handleToggle(a)}>
                        {a.isActive ? "Hide" : "Publish"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>Edit</Button>
                      <button onClick={() => setDeleteTarget(a)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
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
          open={modalOpen}
          onClose={() => { if (!saving) setModalOpen(false); }}
          title={editing ? "Edit Announcement" : "New Announcement"}
          description="This message is shown to the selected tenants"
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
              <Button size="sm" onClick={handleSave} loading={saving}>{editing ? "Save Changes" : "Publish"}</Button>
            </>
          }
        >
          <div className="space-y-4">
            {formError && (
              <div className="rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-400">{formError}</div>
            )}
            <Input label="Title" placeholder="e.g. Platform maintenance" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <TextArea label="Message" placeholder="Enter announcement message" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Priority"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                options={[
                  { value: "info", label: "Info" },
                  { value: "warning", label: "Warning" },
                  { value: "important", label: "Important" },
                ]}
              />
              <Select
                label="Audience"
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value })}
                options={[
                  { value: "all", label: "All tenants" },
                  { value: "specific", label: "Specific tenants" },
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Starts At" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
              <Input label="Expires At" type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
            </div>
          </div>
        </Modal>

        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete Announcement"
          message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          loading={deleting}
        />
      </div>
    </AdminLayout>
  );
}