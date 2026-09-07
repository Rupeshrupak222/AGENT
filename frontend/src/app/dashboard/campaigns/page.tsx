"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Target,
  Plus,
  Play,
  Pause,
  RotateCcw,
  XCircle,
  RefreshCw,
  Clock,
  Bot,
  Calendar,
  AlertCircle,
  Layers,
  ChevronDown,
} from "lucide-react";
import {
  campaignsApi,
  CampaignItem,
  CampaignMetrics,
  CampaignLeadItem,
  normalizeApiError,
} from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/Badge";
import { CampaignKPICards } from "@/components/campaigns/CampaignKPICards";
import { CampaignProgressBar } from "@/components/campaigns/CampaignProgressBar";
import { CampaignLeadsTable } from "@/components/campaigns/CampaignLeadsTable";
import { CampaignCreationModal } from "@/components/campaigns/CampaignCreationModal";
import { UnifiedCallWorkspaceModal } from "@/components/campaigns/UnifiedCallWorkspaceModal";

export default function CampaignOperationsPage() {
  const { success, error, info } = useToast();
  const { can } = usePermissions();

  // Permissions
  const canCreate = can(PERMISSIONS.CAMPAIGN_CREATE);
  const canExecute = can(PERMISSIONS.CAMPAIGN_EXECUTE);
  const canPause = can(PERMISSIONS.CAMPAIGN_PAUSE);

  // Campaigns list state
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  // Active Campaign Details & Metrics
  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // Campaign Leads Table State
  const [leads, setLeads] = useState<CampaignLeadItem[]>([]);
  const [leadTotal, setLeadTotal] = useState(0);
  const [leadPage, setLeadPage] = useState(1);
  const [leadLimit] = useState(15);
  const [leadStatusFilter, setLeadStatusFilter] = useState("");
  const [leadSearchQuery, setLeadSearchQuery] = useState("");
  const [loadingLeads, setLoadingLeads] = useState(false);

  // Action Pending States
  const [actionPending, setActionPending] = useState(false);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  // 1. Fetch All Campaigns
  const loadCampaigns = useCallback(async (selectId?: string) => {
    try {
      setLoadingCampaigns(true);
      const res = await campaignsApi.list();
      setCampaigns(res.items);

      if (res.items.length > 0) {
        if (selectId && res.items.some((c) => c.id === selectId)) {
          setSelectedCampaignId(selectId);
        } else if (!selectedCampaignId || !res.items.some((c) => c.id === selectedCampaignId)) {
          setSelectedCampaignId(res.items[0].id);
        }
      } else {
        setSelectedCampaignId(null);
      }
    } catch (err) {
      error(`Failed to load campaigns: ${normalizeApiError(err)}`);
    } finally {
      setLoadingCampaigns(false);
    }
  }, [selectedCampaignId, error]);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const activeCampaign = campaigns.find((c) => c.id === selectedCampaignId) || null;

  // 2. Fetch Metrics for Active Campaign
  const loadMetrics = useCallback(async () => {
    if (!selectedCampaignId) return;
    try {
      setLoadingMetrics(true);
      const res = await campaignsApi.getMetrics(selectedCampaignId);
      setMetrics(res);
    } catch (err) {
      // Non-blocking metrics load
    } finally {
      setLoadingMetrics(false);
    }
  }, [selectedCampaignId]);

  // 3. Fetch Leads for Active Campaign
  const loadLeads = useCallback(async () => {
    if (!selectedCampaignId) return;
    try {
      setLoadingLeads(true);
      const res = await campaignsApi.getLeads(selectedCampaignId, {
        page: leadPage,
        limit: leadLimit,
        status: leadStatusFilter || undefined,
      });
      setLeads(res.items);
      setLeadTotal(res.total);
    } catch (err) {
      // Non-blocking leads load
    } finally {
      setLoadingLeads(false);
    }
  }, [selectedCampaignId, leadPage, leadLimit, leadStatusFilter]);

  useEffect(() => {
    if (selectedCampaignId) {
      loadMetrics();
      loadLeads();
    }
  }, [selectedCampaignId, loadMetrics, loadLeads]);

  // Auto-polling when campaign is actively running
  useEffect(() => {
    if (!activeCampaign || activeCampaign.status !== "running") return;
    const interval = setInterval(() => {
      loadMetrics();
      loadLeads();
    }, 6000);
    return () => clearInterval(interval);
  }, [activeCampaign, loadMetrics, loadLeads]);

  // Lifecycle Controls
  const handleStartCampaign = async () => {
    if (!selectedCampaignId) return;
    try {
      setActionPending(true);
      const res = await campaignsApi.start(selectedCampaignId);
      success(`Campaign Started: Outbound calling active. ${res.enqueued} leads enqueued for execution.`);
      await loadCampaigns(selectedCampaignId);
      loadMetrics();
      loadLeads();
    } catch (err) {
      error(`Failed to Start: ${normalizeApiError(err)}`);
    } finally {
      setActionPending(false);
    }
  };

  const handlePauseCampaign = async () => {
    if (!selectedCampaignId) return;
    try {
      setActionPending(true);
      await campaignsApi.pause(selectedCampaignId);
      info("Campaign Paused: Calling queue paused. Active calls will complete naturally.");
      await loadCampaigns(selectedCampaignId);
      loadMetrics();
    } catch (err) {
      error(`Failed to Pause: ${normalizeApiError(err)}`);
    } finally {
      setActionPending(false);
    }
  };

  const handleResumeCampaign = async () => {
    if (!selectedCampaignId) return;
    try {
      setActionPending(true);
      const res = await campaignsApi.resume(selectedCampaignId);
      success(`Campaign Resumed: Calling resumed with ${res.enqueued} leads enqueued.`);
      await loadCampaigns(selectedCampaignId);
      loadMetrics();
      loadLeads();
    } catch (err) {
      error(`Failed to Resume: ${normalizeApiError(err)}`);
    } finally {
      setActionPending(false);
    }
  };

  const handleCancelCampaign = async () => {
    if (!selectedCampaignId) return;
    if (!confirm("Are you sure you want to cancel this campaign? Pending leads will be skipped.")) return;
    try {
      setActionPending(true);
      await campaignsApi.cancel(selectedCampaignId);
      info("Campaign Cancelled: Campaign was marked cancelled and uncalled leads skipped.");
      await loadCampaigns(selectedCampaignId);
      loadMetrics();
      loadLeads();
    } catch (err) {
      error(`Failed to Cancel: ${normalizeApiError(err)}`);
    } finally {
      setActionPending(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
              <Target className="w-6 h-6 text-brand-500" />
              Campaign Operations
            </h1>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400">
              Live Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-white/50 mt-1">
            Autonomous outbound dialer, eligibility validation & post-call AI intelligence workspace
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadCampaigns(selectedCampaignId || undefined);
              loadMetrics();
              loadLeads();
            }}
            aria-label="Refresh data"
            className="p-2 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loadingCampaigns || loadingMetrics ? "animate-spin" : ""}`} />
          </button>

          {canCreate && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-brand-500/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create Campaign</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Active Campaign Selector & Controls Bar ── */}
      {loadingCampaigns && campaigns.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400 rounded-2xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/5">
          Loading active campaigns...
        </div>
      ) : campaigns.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/5 space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
            <Target className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Outbound Campaigns Yet</h3>
            <p className="text-xs text-slate-500 dark:text-white/40 mt-1">
              Select leads from your CRM, configure calling parameters, and launch your first autonomous AI campaign.
            </p>
          </div>
          {canCreate && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Launch First Campaign</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Campaign Selector & Lifecycle Actions Card */}
          <div className="p-4 rounded-2xl bg-white dark:bg-surface-card border border-slate-200/80 dark:border-white/5 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Selector */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <select
                    value={selectedCampaignId || ""}
                    onChange={(e) => {
                      setSelectedCampaignId(e.target.value);
                      setLeadPage(1);
                    }}
                    className="pl-3 pr-8 py-2 rounded-xl text-sm font-bold bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 appearance-none cursor-pointer"
                  >
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.status.toUpperCase()})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {activeCampaign && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        activeCampaign.status === "running"
                          ? "green"
                          : activeCampaign.status === "paused"
                          ? "yellow"
                          : activeCampaign.status === "completed"
                          ? "blue"
                          : "gray"
                      }
                      className="capitalize font-bold text-xs"
                    >
                      {activeCampaign.status}
                    </Badge>

                    {activeCampaign.agent && (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-xs text-slate-600 dark:text-white/70">
                        <Bot className="w-3.5 h-3.5 text-brand-500" />
                        <span className="font-semibold">{activeCampaign.agent.name}</span>
                      </div>
                    )}

                    {activeCampaign.startTime && activeCampaign.endTime && (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-xs text-slate-600 dark:text-white/70">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>{activeCampaign.startTime} – {activeCampaign.endTime}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {activeCampaign && (
                <div className="flex items-center gap-2">
                  {/* Start (when draft) */}
                  {activeCampaign.status === "draft" && canExecute && (
                    <button
                      onClick={handleStartCampaign}
                      disabled={actionPending}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Campaign</span>
                    </button>
                  )}

                  {/* Pause (when running) */}
                  {activeCampaign.status === "running" && canPause && (
                    <button
                      onClick={handlePauseCampaign}
                      disabled={actionPending}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Pause</span>
                    </button>
                  )}

                  {/* Resume (when paused) */}
                  {activeCampaign.status === "paused" && canExecute && (
                    <button
                      onClick={handleResumeCampaign}
                      disabled={actionPending}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Resume</span>
                    </button>
                  )}

                  {/* Cancel (when running or paused) */}
                  {(activeCampaign.status === "running" || activeCampaign.status === "paused") && canPause && (
                    <button
                      onClick={handleCancelCampaign}
                      disabled={actionPending}
                      className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Campaign Config Parameters */}
            {activeCampaign && (
              <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-white/40">
                <span>Concurrency: <strong className="text-slate-800 dark:text-white">{activeCampaign.maxConcurrentCalls} lines</strong></span>
                <span>Max Attempts: <strong className="text-slate-800 dark:text-white">{activeCampaign.maxAttempts} dials</strong></span>
                <span>Daily Limit: <strong className="text-slate-800 dark:text-white">{activeCampaign.callsPerDay || "Unlimited"} calls</strong></span>
                <span>Days: <strong className="text-slate-800 dark:text-white">{activeCampaign.daysOfWeek?.length || 5} active</strong></span>
              </div>
            )}
          </div>

          {/* ── Operational KPI Cards ── */}
          <CampaignKPICards metrics={metrics} loading={loadingMetrics} />

          {/* ── Execution Progress Bar ── */}
          <CampaignProgressBar
            metrics={metrics}
            status={activeCampaign?.status || "draft"}
          />

          {/* ── Enrolled Campaign Leads Execution Table ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-white/60">
                Lead Execution & AI Outcomes
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                {leadTotal} contacts enrolled
              </span>
            </div>

            <CampaignLeadsTable
              leads={leads}
              total={leadTotal}
              page={leadPage}
              limit={leadLimit}
              statusFilter={leadStatusFilter}
              searchQuery={leadSearchQuery}
              loading={loadingLeads}
              onPageChange={setLeadPage}
              onStatusFilterChange={(st) => {
                setLeadStatusFilter(st);
                setLeadPage(1);
              }}
              onSearchChange={setLeadSearchQuery}
              onSelectCall={(callId) => setSelectedCallId(callId)}
            />
          </div>
        </>
      )}

      {/* ── Campaign Creation Modal ── */}
      {isCreateModalOpen && (
        <CampaignCreationModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={(newId) => {
            loadCampaigns(newId);
          }}
        />
      )}

      {/* ── Unified Call Intelligence Workspace Modal ── */}
      {selectedCallId && (
        <UnifiedCallWorkspaceModal
          callId={selectedCallId}
          onClose={() => setSelectedCallId(null)}
          onAnalysisUpdated={() => {
            loadLeads();
            loadMetrics();
          }}
        />
      )}
    </div>
  );
}
