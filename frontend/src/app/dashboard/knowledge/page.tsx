"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen,
  Search,
  Plus,
  X,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  FileText,
  Link2,
  HelpCircle,
  File as FileIcon,
  RefreshCw,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions";
import {
  knowledgeApi,
  agentsApi,
  normalizeApiError,
  KnowledgeSourceItem,
  AgentItem,
} from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

const KB_TYPES = ["manual", "pdf", "docx", "txt", "url", "faq"];

const TYPE_META: Record<string, { icon: any; color: string; label: string }> = {
  manual: { icon: FileText, color: "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/30", label: "Manual" },
  pdf: { icon: FileIcon, color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30", label: "PDF" },
  docx: { icon: FileIcon, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30", label: "Docx" },
  txt: { icon: FileIcon, color: "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/30", label: "Text" },
  url: { icon: Link2, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", label: "URL" },
  faq: { icon: HelpCircle, color: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30", label: "FAQ" },
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  ready: { label: "Ready", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" },
  processing: { label: "Processing", cls: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30" },
  failed: { label: "Failed", cls: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30" },
  outdated: { label: "Outdated", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30" },
};

function humanize(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface FormState {
  id?: string;
  name: string;
  type: string;
  sourceUrl: string;
  content: string;
  tags: string;
  agentId: string;
}

const EMPTY_FORM: FormState = { name: "", type: "manual", sourceUrl: "", content: "", tags: "", agentId: "" };

export default function KnowledgePage() {
  const { can } = usePermissions();
  const [items, setItems] = useState<KnowledgeSourceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<KnowledgeSourceItem | null>(null);

  const { success, error: toastError } = useToast();
  const canManage = can(PERMISSIONS.AI_KNOWLEDGE_MANAGE);

  const load = useCallback(
    async (manual = false) => {
      if (manual) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await knowledgeApi.list({
          search: search.trim() || undefined,
          type: typeFilter || undefined,
          status: statusFilter || undefined,
          limit: 50,
        });
        setItems(res.items);
        setTotal(res.total);
      } catch (e) {
        setError(normalizeApiError(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, typeFilter, statusFilter]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (canManage) {
      agentsApi
        .list()
        .then(setAgents)
        .catch(() => {});
    }
  }, [canManage]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (item: KnowledgeSourceItem) => {
    setForm({
      id: item.id,
      name: item.name,
      type: item.type,
      sourceUrl: item.sourceUrl ?? "",
      content: item.content ?? "",
      tags: item.tags?.join(", ") ?? "",
      agentId: item.agentId ?? "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toastError("Name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type || "manual",
        content: form.content.trim() || undefined,
        sourceUrl: form.sourceUrl.trim() || undefined,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        agentId: form.agentId || undefined,
      };
      if (!payload.content && !payload.sourceUrl) {
        toastError("Provide either content or a source URL.");
        return;
      }
      if (form.id) {
        await knowledgeApi.update(form.id, payload);
        success("Knowledge source updated.");
      } else {
        await knowledgeApi.create(payload);
        success("Knowledge source created.");
      }
      setShowForm(false);
      await load();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: KnowledgeSourceItem) => {
    if (!window.confirm(`Delete knowledge source "${item.name}"? This cannot be undone.`)) return;
    setDeletingId(item.id);
    try {
      await knowledgeApi.remove(item.id);
      success("Knowledge source deleted.");
      if (preview?.id === item.id) setPreview(null);
      await load();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setDeletingId(null);
    }
  };

  if (!can(PERMISSIONS.AI_AGENT_VIEW)) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="rounded-2xl p-8 text-center bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Access Restricted</p>
          <p className="text-xs text-slate-500 dark:text-white/50 mt-1">You do not have permission to view the knowledge base.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-brand-500 dark:text-brand-400" /> Knowledge Base
          </h1>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
            Training documents, FAQs and URLs your AI agents use to answer customers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-white/80 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-brand-500 dark:text-brand-400" : ""}`} />
            Refresh
          </button>
          {canManage && (
            <button
              onClick={openCreate}
              className="btn-red text-xs h-10 px-4 shadow-lg shadow-brand-500/25 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Source
            </button>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/40" />
          <label htmlFor="kb-search" className="sr-only">Search knowledge base</label>
          <input
            id="kb-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or content…"
            className="w-full h-10 pl-9 pr-3 rounded-xl text-sm bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="kb-type" className="sr-only">Filter by type</label>
          <select id="kb-type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-10 rounded-xl px-3 text-sm bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500">
            <option value="">All Types</option>
            {KB_TYPES.map((t) => (
              <option key={t} value={t}>{TYPE_META[t]?.label ?? humanize(t)}</option>
            ))}
          </select>
          <label htmlFor="kb-status" className="sr-only">Filter by status</label>
          <select id="kb-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-xl px-3 text-sm bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500">
            <option value="">All Statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <span className="text-xs font-mono text-slate-400 dark:text-white/40 whitespace-nowrap">{total} sources</span>
        </div>
      </div>

      {/* List */}
      {loading && items.length === 0 ? (
        <div className="grid gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-200/60 dark:bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl p-12 text-center bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]">
          <BookOpen className="w-10 h-10 text-slate-300 dark:text-white/20 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-900 dark:text-white/70">No knowledge sources yet</p>
          <p className="text-xs text-slate-400 dark:text-white/40 mt-1 max-w-sm mx-auto">
            {canManage
              ? "Add manuals, PDFs, FAQs or URLs so your AI agents answer from official material."
              : "Uploaded training material will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => {
            const tm = TYPE_META[item.type] ?? TYPE_META.manual;
            const TypeIcon = tm.icon;
            const sm = STATUS_META[item.status] ?? STATUS_META.ready;
            return (
              <div
                key={item.id}
                className="rounded-2xl p-4 panel-card flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
              >
                <button
                  onClick={() => setPreview(item)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left group"
                  title="View details"
                >
                  <div className={`p-2.5 rounded-xl border ${tm.color}`}>
                    <TypeIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-white/40 truncate">
                      {item.sourceUrl || (item.content ?? "").slice(0, 90) || "No preview"}
                    </p>
                  </div>
                </button>

                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full ${sm.cls}`}>
                    {sm.label}
                  </span>
                  {item.agent && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/25" title={`Linked to ${item.agent.name}`}>
                      <Bot className="w-2.5 h-2.5" /> {item.agent.name}
                    </span>
                  )}
                  {item.tags?.length > 0 && (
                    <span className="hidden md:flex items-center gap-1 text-[10px] font-mono text-slate-400 dark:text-white/40">
                      {item.tags.slice(0, 3).map((t) => (
                        <span key={t} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06]">#{t}</span>
                      ))}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 dark:text-white/40 whitespace-nowrap">
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </span>
                  {canManage && (
                    <button
                      onClick={() => openEdit(item)}
                      className="p-2 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-500 dark:text-white/60 hover:text-brand-500 transition-colors"
                      aria-label="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canManage && (
                    <button
                      onClick={() => handleDelete(item)}
                      disabled={deletingId === item.id}
                      className="p-2 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-500 dark:text-white/60 hover:text-rose-500 disabled:opacity-50 transition-colors"
                      aria-label="Delete"
                    >
                      {deletingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview drawer */}
      {preview && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm" onClick={() => setPreview(null)}>
          <div
            className="w-full sm:max-w-2xl max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 bg-white dark:bg-[#140204] border border-slate-200 dark:border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">{preview.name}</h3>
                <p className="text-xs text-slate-400 dark:text-white/40 mt-0.5">
                  {TYPE_META[preview.type]?.label ?? humanize(preview.type)} · Updated {new Date(preview.updatedAt).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setPreview(null)} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors" aria-label="Close preview">
                <X className="w-4 h-4" />
              </button>
            </div>
            {canManage && (
              <button
                onClick={() => { openEdit(preview); setPreview(null); }}
                className="mb-4 inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-600 dark:text-white/70"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit Source
              </button>
            )}
            {preview.sourceUrl && (
              <a href={preview.sourceUrl} target="_blank" rel="noopener noreferrer" className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline">
                <Link2 className="w-3.5 h-3.5" /> {preview.sourceUrl}
              </a>
            )}
            <div className="rounded-xl p-4 bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] whitespace-pre-wrap text-xs leading-relaxed text-slate-600 dark:text-white/70 max-h-96 overflow-y-auto">
              {preview.content || "No text content stored for this source."}
            </div>
          </div>
        </div>
      )}

      {/* Create / edit modal */}
      {showForm && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl p-6 bg-white dark:bg-[#1a0405] border border-slate-200 dark:border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {form.id ? "Edit Knowledge Source" : "Add Knowledge Source"}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="kb-name" className="block text-xs font-semibold text-slate-500 dark:text-white/50 mb-1.5">Name *</label>
                <input
                  id="kb-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Product FAQ 2026"
                  className="w-full h-10 rounded-xl px-3 text-sm bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label htmlFor="kb-type-sel" className="block text-xs font-semibold text-slate-500 dark:text-white/50 mb-1.5">Type</label>
                <select
                  id="kb-type-sel"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full h-10 rounded-xl px-3 text-sm bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500"
                >
                  {KB_TYPES.map((t) => (
                    <option key={t} value={t}>{TYPE_META[t]?.label ?? humanize(t)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="kb-url" className="block text-xs font-semibold text-slate-500 dark:text-white/50 mb-1.5">Source URL</label>
                <input
                  id="kb-url"
                  value={form.sourceUrl}
                  onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
                  placeholder="https://… (for url type)"
                  className="w-full h-10 rounded-xl px-3 text-sm bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label htmlFor="kb-content" className="block text-xs font-semibold text-slate-500 dark:text-white/50 mb-1.5">Content</label>
                <textarea
                  id="kb-content"
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={5}
                  placeholder="Paste training text — provide either content or a URL."
                  className="w-full rounded-xl px-3 py-2.5 text-sm bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500 resize-y"
                />
              </div>

              <div>
                <label htmlFor="kb-tags" className="block text-xs font-semibold text-slate-500 dark:text-white/50 mb-1.5">Tags (comma separated)</label>
                <input
                  id="kb-tags"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="pricing, onboarding, support"
                  className="w-full h-10 rounded-xl px-3 text-sm bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label htmlFor="kb-agent" className="block text-xs font-semibold text-slate-500 dark:text-white/50 mb-1.5">Link to Agent</label>
                <select
                  id="kb-agent"
                  value={form.agentId}
                  onChange={(e) => setForm({ ...form, agentId: e.target.value })}
                  className="w-full h-10 rounded-xl px-3 text-sm bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500"
                >
                  <option value="">Workspace-wide (all agents)</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 justify-end pt-2">
                <button onClick={() => setShowForm(false)} className="h-10 px-4 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-600 dark:text-white/70">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="btn-red text-xs h-10 px-4 shadow-lg shadow-brand-500/25 flex items-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save Source
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}