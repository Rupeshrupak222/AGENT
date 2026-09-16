"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  Database,
  Cpu,
  Layers,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Clock,
  ArrowRight,
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
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const KB_TYPES = ["manual", "pdf", "docx", "txt", "url", "faq"];

const TYPE_META: Record<string, { icon: any; color: string; label: string }> = {
  manual: { icon: FileText, color: "bg-slate-500/10 text-slate-300 border-slate-500/30", label: "Manual Document" },
  pdf: { icon: FileIcon, color: "bg-rose-500/10 text-rose-400 border-rose-500/30", label: "PDF Document" },
  docx: { icon: FileIcon, color: "bg-blue-500/10 text-blue-400 border-blue-500/30", label: "Word Docx" },
  txt: { icon: FileIcon, color: "bg-slate-500/10 text-slate-300 border-slate-500/30", label: "Plain Text" },
  url: { icon: Link2, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", label: "Web URL" },
  faq: { icon: HelpCircle, color: "bg-amber-500/10 text-amber-400 border-amber-500/30", label: "Structured FAQ" },
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  ready: { label: "Indexed & Ready", cls: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" },
  processing: { label: "Vectorizing", cls: "bg-sky-500/10 text-sky-400 border border-sky-500/30 animate-pulse" },
  failed: { label: "Indexing Failed", cls: "bg-rose-500/10 text-rose-400 border border-rose-500/30" },
  outdated: { label: "Needs Re-sync", cls: "bg-amber-500/10 text-amber-400 border border-amber-500/30" },
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

  // Derived telemetry metrics
  const vectorTelemetry = useMemo(() => {
    let totalChars = 0;
    let urlCount = 0;
    let docCount = 0;
    let readyCount = 0;

    items.forEach((it) => {
      if (it.content) totalChars += it.content.length;
      if (it.type === "url") urlCount++;
      else docCount++;
      if (it.status === "ready" || !it.status) readyCount++;
    });

    // Approximate vector chunks (approx 500 chars / chunk)
    const estimatedChunks = Math.max(items.length * 3, Math.round(totalChars / 500));
    return {
      totalSources: total || items.length,
      estimatedChunks,
      urlCount,
      docCount,
      readyPercent: items.length > 0 ? Math.round((readyCount / items.length) * 100) : 100,
    };
  }, [items, total]);

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
      toastError("Source name is required.");
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
        toastError("Provide either text content or a source URL.");
        setSaving(false);
        return;
      }
      if (form.id) {
        await knowledgeApi.update(form.id, payload);
        success("Knowledge source updated & re-indexed.");
      } else {
        await knowledgeApi.create(payload);
        success("Knowledge source created & vector indexing scheduled.");
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
    if (!window.confirm(`Delete knowledge source "${item.name}"? This will prune associated embedding vectors.`)) return;
    setDeletingId(item.id);
    try {
      await knowledgeApi.remove(item.id);
      success("Knowledge source and vectors removed.");
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
        <div className="rounded-2xl p-8 text-center bg-white/[0.02] border border-white/10">
          <p className="text-sm font-semibold text-white">Access Restricted</p>
          <p className="text-xs text-white/50 mt-1">You do not have permission to view the knowledge base.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Knowledge Base & Vector Engine
              </h1>
              <p className="text-xs text-amber-200/60 mt-0.5">
                Multi-format training corpora, FAQs, and semantic embeddings powering autonomous agent dialogue
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => load(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin text-amber-400" : ""}`} />
            <span>Sync</span>
          </Button>
          {canManage && (
            <Button
              variant="primary"
              size="sm"
              onClick={openCreate}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              <span>Add Knowledge Source</span>
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Vector Indexing Telemetry Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-[#140b07] border border-amber-500/15">
          <div className="flex items-center justify-between text-xs text-amber-200/60 mb-1">
            <span>Total Sources</span>
            <Database className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white">{vectorTelemetry.totalSources}</p>
          <p className="text-[10px] text-white/40 mt-1">
            {vectorTelemetry.docCount} docs · {vectorTelemetry.urlCount} crawled URLs
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#140b07] border border-amber-500/15">
          <div className="flex items-center justify-between text-xs text-amber-200/60 mb-1">
            <span>Vector Chunks</span>
            <Layers className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-amber-400">
            {vectorTelemetry.estimatedChunks.toLocaleString()}
          </p>
          <p className="text-[10px] text-white/40 mt-1">512-dim embedding spaces</p>
        </div>

        <div className="p-4 rounded-xl bg-[#140b07] border border-amber-500/15">
          <div className="flex items-center justify-between text-xs text-amber-200/60 mb-1">
            <span>Embeddings Model</span>
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-base font-bold font-mono text-white truncate">text-embedding-3</p>
          <p className="text-[10px] text-emerald-400 font-mono mt-1">Cosine similarity index</p>
        </div>

        <div className="p-4 rounded-xl bg-[#140b07] border border-amber-500/15">
          <div className="flex items-center justify-between text-xs text-amber-200/60 mb-1">
            <span>Vector Index Health</span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-400">
            {vectorTelemetry.readyPercent}%
          </p>
          <p className="text-[10px] text-white/40 mt-1">Ready for real-time RAG</p>
        </div>
      </div>

      {/* Filters & Search Ribbon */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            id="kb-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents by title, tags, or content keywords…"
            className="w-full h-10 pl-9 pr-3 rounded-xl text-xs bg-black/40 border border-amber-500/20 text-white outline-none focus:border-amber-400"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <select
            id="kb-type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 rounded-xl px-3 text-xs bg-[#140b07] border border-amber-500/20 text-white outline-none focus:border-amber-400"
          >
            <option value="">All Formats</option>
            {KB_TYPES.map((t) => (
              <option key={t} value={t}>{TYPE_META[t]?.label ?? humanize(t)}</option>
            ))}
          </select>
          <select
            id="kb-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl px-3 text-xs bg-[#140b07] border border-amber-500/20 text-white outline-none focus:border-amber-400"
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Source Items Grid */}
      {loading && items.length === 0 ? (
        <div className="grid gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-white/[0.03] animate-pulse border border-white/5" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl p-12 text-center bg-black/30 border border-white/10">
          <BookOpen className="w-10 h-10 text-amber-500/40 mx-auto mb-3" />
          <p className="text-sm font-bold text-white">No knowledge sources found</p>
          <p className="text-xs text-white/50 mt-1 max-w-sm mx-auto">
            {canManage
              ? "Ingest company handbooks, pricing PDFs, FAQs, or web URLs to enrich agent dialogue."
              : "Uploaded knowledge assets will appear here."}
          </p>
          {canManage && (
            <Button
              variant="primary"
              size="sm"
              onClick={openCreate}
              className="mt-4"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add First Document
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => {
            const tm = TYPE_META[item.type] ?? TYPE_META.manual;
            const TypeIcon = tm.icon;
            const sm = STATUS_META[item.status] ?? STATUS_META.ready;
            const chunkEstimate = Math.max(1, Math.round((item.content?.length || 500) / 500));

            return (
              <div
                key={item.id}
                className="rounded-xl p-4 bg-[#120a06] border border-amber-500/15 hover:border-amber-500/30 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 transition-all"
              >
                <button
                  onClick={() => setPreview(item)}
                  className="flex items-center gap-3.5 flex-1 min-w-0 text-left group"
                  title="View details"
                >
                  <div className={`p-2.5 rounded-xl border ${tm.color} flex-shrink-0`}>
                    <TypeIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                        {item.name}
                      </p>
                      <span className="text-[10px] font-mono text-amber-300/80 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 flex-shrink-0">
                        ~{chunkEstimate} chunks
                      </span>
                    </div>
                    <p className="text-xs text-white/40 truncate mt-0.5">
                      {item.sourceUrl || (item.content ?? "").slice(0, 100) || "No snippet available"}
                    </p>
                  </div>
                </button>

                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md ${sm.cls}`}>
                    {sm.label}
                  </span>
                  {item.agent && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/25" title={`Linked to ${item.agent.name}`}>
                      <Bot className="w-2.5 h-2.5" /> {item.agent.name}
                    </span>
                  )}
                  {item.tags && item.tags.length > 0 && (
                    <span className="hidden md:flex items-center gap-1 text-[10px] font-mono text-white/40">
                      {item.tags.slice(0, 2).map((t) => (
                        <span key={t} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">#{t}</span>
                      ))}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-white/40 whitespace-nowrap">
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </span>
                  {canManage && (
                    <button
                      onClick={() => openEdit(item)}
                      className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-amber-400 transition-colors"
                      aria-label="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canManage && (
                    <button
                      onClick={() => handleDelete(item)}
                      disabled={deletingId === item.id}
                      className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-rose-400 disabled:opacity-50 transition-colors"
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

      {/* Preview Drawer */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setPreview(null)}>
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl p-6 bg-[#0e0805] border border-amber-500/20 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">{preview.name}</h3>
                <p className="text-xs text-amber-200/50 mt-0.5">
                  {TYPE_META[preview.type]?.label ?? humanize(preview.type)} · Last updated {new Date(preview.updatedAt).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setPreview(null)} className="p-1.5 rounded-lg text-white/40 hover:text-white transition-colors" aria-label="Close preview">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              {canManage && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { openEdit(preview); setPreview(null); }}
                >
                  <Pencil className="w-3 h-3 mr-1" /> Edit Source
                </Button>
              )}
              {preview.sourceUrl && (
                <a
                  href={preview.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
                >
                  <Link2 className="w-3.5 h-3.5" /> <span>Visit Source URL</span> <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="rounded-xl p-4 bg-black/40 border border-white/10 whitespace-pre-wrap text-xs font-mono leading-relaxed text-slate-300 max-h-96 overflow-y-auto">
              {preview.content || "No raw text content stored for this source."}
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showForm && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl p-6 bg-[#0e0805] border border-amber-500/20 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white">
                {form.id ? "Edit Knowledge Source" : "Ingest Knowledge Source"}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-white/40 hover:text-white transition-colors" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="kb-name" className="block text-xs font-semibold text-amber-100/90 mb-1.5">Source Title *</label>
                <input
                  id="kb-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Enterprise Pricing FAQ 2026"
                  className="w-full h-10 rounded-lg px-3 text-xs bg-black/40 border border-amber-500/20 text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label htmlFor="kb-type-sel" className="block text-xs font-semibold text-amber-100/90 mb-1.5">Document Type</label>
                <select
                  id="kb-type-sel"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full h-10 rounded-lg px-3 text-xs bg-[#180f0a] border border-amber-500/20 text-white outline-none focus:border-amber-400"
                >
                  {KB_TYPES.map((t) => (
                    <option key={t} value={t}>{TYPE_META[t]?.label ?? humanize(t)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="kb-url" className="block text-xs font-semibold text-amber-100/90 mb-1.5">Source URL (Optional if pasting content)</label>
                <input
                  id="kb-url"
                  value={form.sourceUrl}
                  onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
                  placeholder="https://acme.com/help-docs"
                  className="w-full h-10 rounded-lg px-3 text-xs bg-black/40 border border-amber-500/20 text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label htmlFor="kb-content" className="block text-xs font-semibold text-amber-100/90 mb-1.5">Training Text / FAQs</label>
                <textarea
                  id="kb-content"
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={6}
                  placeholder="Paste product specifications, pricing tiers, FAQs, or customer conversation objection scripts..."
                  className="w-full rounded-lg px-3 py-2.5 text-xs font-mono bg-black/40 border border-amber-500/20 text-white outline-none focus:border-amber-400 resize-y"
                />
              </div>

              <div>
                <label htmlFor="kb-tags" className="block text-xs font-semibold text-amber-100/90 mb-1.5">Tags (Comma-separated)</label>
                <input
                  id="kb-tags"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="pricing, real_estate, objections"
                  className="w-full h-10 rounded-lg px-3 text-xs bg-black/40 border border-amber-500/20 text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label htmlFor="kb-agent" className="block text-xs font-semibold text-amber-100/90 mb-1.5">Link to Specific Agent</label>
                <select
                  id="kb-agent"
                  value={form.agentId}
                  onChange={(e) => setForm({ ...form, agentId: e.target.value })}
                  className="w-full h-10 rounded-lg px-3 text-xs bg-[#180f0a] border border-amber-500/20 text-white outline-none focus:border-amber-400"
                >
                  <option value="">Workspace-Wide (All Autonomous Agents)</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 justify-end pt-3 border-t border-white/10">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                  <span>{saving ? "Vectorizing..." : "Index Source"}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}