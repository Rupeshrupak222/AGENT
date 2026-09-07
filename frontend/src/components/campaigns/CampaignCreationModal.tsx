"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  X,
  CheckCircle2,
  Users,
  Bot,
  Clock,
  ShieldAlert,
  Search,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Sparkles,
  Calendar,
  Layers,
  ArrowRight,
} from "lucide-react";
import {
  campaignsApi,
  agentsApi,
  leadsApi,
  AgentItem,
  LeadItem,
  EligibilityPreviewResult,
  normalizeApiError,
} from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";

interface CampaignCreationModalProps {
  onClose: () => void;
  onSuccess: (campaignId: string) => void;
}

export function CampaignCreationModal({ onClose, onSuccess }: CampaignCreationModalProps) {
  const { success, error, warning } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [maxConcurrentCalls, setMaxConcurrentCalls] = useState(5);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [callsPerDay, setCallsPerDay] = useState(100);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);

  // Available Agents
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  // CRM Leads Pagination & Selection State
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [leadPage, setLeadPage] = useState(1);
  const [leadTotal, setLeadTotal] = useState(0);
  const [leadSearch, setLeadSearch] = useState("");
  const [leadStatusFilter, setLeadStatusFilter] = useState("");
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Eligibility Preview State
  const [preview, setPreview] = useState<EligibilityPreviewResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [creating, setCreating] = useState(false);

  // 1. Fetch Agents on Mount
  useEffect(() => {
    (async () => {
      try {
        setLoadingAgents(true);
        const res = await agentsApi.list();
        setAgents(res);
        if (res.length > 0 && !selectedAgentId) {
          setSelectedAgentId(res[0].id);
        }
      } catch (err) {
        error(`Failed to load agents: ${normalizeApiError(err)}`);
      } finally {
        setLoadingAgents(false);
      }
    })();
  }, []);

  // 2. Fetch Leads when on Step 2
  useEffect(() => {
    if (step !== 2) return;
    (async () => {
      try {
        setLoadingLeads(true);
        const res = await leadsApi.list({
          page: leadPage,
          limit: 8,
          search: leadSearch || undefined,
          status: leadStatusFilter || undefined,
        });
        setLeads(res.items);
        setLeadTotal(res.total);
      } catch (err) {
        error(`Failed to load CRM leads: ${normalizeApiError(err)}`);
      } finally {
        setLoadingLeads(false);
      }
    })();
  }, [step, leadPage, leadSearch, leadStatusFilter]);

  // Toggle Lead Selection
  const toggleLead = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectVisiblePage = () => {
    const visibleIds = leads.map((l) => l.id);
    setSelectedLeadIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const deselectAll = () => {
    setSelectedLeadIds([]);
  };

  // 3. Trigger Eligibility Preview on Step 3
  const handleProceedToStep3 = async () => {
    if (selectedLeadIds.length === 0) {
      warning("Selection Required: Please select at least 1 lead to enroll.");
      return;
    }
    setStep(3);
    try {
      setLoadingPreview(true);
      const res = await campaignsApi.previewLeadsEligibility(selectedLeadIds, selectedAgentId);
      setPreview(res);
    } catch (err) {
      error(`Preview Failed: ${normalizeApiError(err)}`);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Toggle Days of Week
  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  // Submit and Create Campaign
  const handleCreateCampaign = async () => {
    if (!name.trim()) {
      warning("Missing Name: Please enter a campaign name.");
      return;
    }
    if (!selectedAgentId) {
      warning("Missing Agent: Please select an AI agent.");
      return;
    }

    try {
      setCreating(true);
      // 1. Create Campaign
      const campaign = await campaignsApi.create({
        name,
        description: description || undefined,
        agentId: selectedAgentId,
        maxConcurrentCalls,
        maxAttempts,
        callsPerDay,
        startTime,
        endTime,
        daysOfWeek,
        leadIds: selectedLeadIds,
      });

      success(`Campaign "${campaign.name}" created with ${selectedLeadIds.length} enrolled leads.`);

      onSuccess(campaign.id);
      onClose();
    } catch (err) {
      error(`Creation Failed: ${normalizeApiError(err)}`);
    } finally {
      setCreating(false);
    }
  };

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col text-slate-900 dark:text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              Launch Outbound Campaign
            </h3>
            <p className="text-xs text-slate-500 dark:text-white/40">
              Step {step} of 3: {step === 1 ? "Configuration" : step === 2 ? "CRM Lead Selection" : "Eligibility & Safety Review"}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Navigation Tabs */}
        <div className="grid grid-cols-3 border-b border-slate-200 dark:border-white/10 text-xs font-semibold text-center bg-slate-50/30 dark:bg-white/[0.01]">
          <div className={`py-2.5 border-b-2 ${step === 1 ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-slate-400"}`}>
            1. Settings
          </div>
          <div className={`py-2.5 border-b-2 ${step === 2 ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-slate-400"}`}>
            2. Select Leads ({selectedLeadIds.length})
          </div>
          <div className={`py-2.5 border-b-2 ${step === 3 ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-slate-400"}`}>
            3. Eligibility & Launch
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[65vh] space-y-5">
          {/* ──────────────── STEP 1: CONFIGURATION ──────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-white/80 mb-1">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Q3 Enterprise SaaS Outreach"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-white/80 mb-1">
                  Assigned AI Voice Agent *
                </label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
                >
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.role || "Telecaller"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-white/80 mb-1">
                    Max Concurrency
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={maxConcurrentCalls}
                    onChange={(e) => setMaxConcurrentCalls(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Simultaneous lines</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-white/80 mb-1">
                    Max Attempts
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Dials per lead</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-white/80 mb-1">
                    Daily Limit
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={5000}
                    value={callsPerDay}
                    onChange={(e) => setCallsPerDay(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Calls/day max</p>
                </div>
              </div>

              {/* Calling Window & Days */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-3">
                <span className="text-xs font-bold text-slate-700 dark:text-white/80">
                  Calling Hours & Active Days
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-white/40 mb-1">Start Time (24h)</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-white/40 mb-1">End Time (24h)</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-white/40 mb-1.5">Active Days</label>
                  <div className="flex gap-1.5">
                    {dayNames.map((name, idx) => {
                      const selected = daysOfWeek.includes(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleDay(idx)}
                          className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-colors ${
                            selected
                              ? "bg-brand-600 text-white"
                              : "bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-white/50 hover:bg-slate-300"
                          }`}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── STEP 2: CRM LEAD SELECTION ──────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Controls */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search CRM leads by name or phone..."
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectVisiblePage}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 text-xs font-semibold text-slate-700 dark:text-white hover:bg-slate-200"
                  >
                    Select Page
                  </button>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 text-xs font-semibold text-slate-700 dark:text-white hover:bg-slate-200"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Selection Counter Bar */}
              <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-700 dark:text-brand-300 text-xs flex items-center justify-between">
                <span className="font-semibold">
                  {selectedLeadIds.length} lead(s) selected for enrollment
                </span>
                <span className="text-[11px] text-slate-500 dark:text-brand-200/70">
                  Total in CRM: {leadTotal}
                </span>
              </div>

              {/* Leads Table */}
              <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-600 dark:text-white/70">
                  <thead className="bg-slate-50 dark:bg-white/[0.02] text-[10px] uppercase text-slate-400 font-semibold border-b border-slate-200 dark:border-white/10">
                    <tr>
                      <th className="p-2.5 w-8"></th>
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5">Phone</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                    {loadingLeads ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          Loading leads...
                        </td>
                      </tr>
                    ) : leads.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          No matching leads found in CRM.
                        </td>
                      </tr>
                    ) : (
                      leads.map((l) => {
                        const isSelected = selectedLeadIds.includes(l.id);
                        return (
                          <tr
                            key={l.id}
                            onClick={() => toggleLead(l.id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-brand-500/10 dark:bg-brand-500/20"
                                : "hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                            }`}
                          >
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="rounded text-brand-600 cursor-pointer"
                              />
                            </td>
                            <td className="p-2.5 font-semibold text-slate-900 dark:text-white truncate max-w-[150px]">
                              {l.name}
                            </td>
                            <td className="p-2.5 font-mono text-[11px]">
                              {l.phone}
                            </td>
                            <td className="p-2.5">
                              <span className="capitalize text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10">
                                {l.status?.replace("_", " ") || "new"}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Lead Pagination */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Page {leadPage} of {Math.max(1, Math.ceil(leadTotal / 8))}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setLeadPage((p) => Math.max(1, p - 1))}
                    disabled={leadPage <= 1}
                    className="p-1 rounded border border-slate-200 dark:border-white/10 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeadPage((p) => p + 1)}
                    disabled={leadPage >= Math.ceil(leadTotal / 8)}
                    className="p-1 rounded border border-slate-200 dark:border-white/10 disabled:opacity-30"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── STEP 3: ELIGIBILITY & SAFETY REVIEW ──────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              {loadingPreview ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">Evaluating lead eligibility with backend rules...</span>
                </div>
              ) : preview ? (
                <>
                  {/* Category Breakdown */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                        Eligible Leads
                      </span>
                      <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {preview.eligibleCount}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase">
                        Ineligible Leads
                      </span>
                      <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
                        {preview.ineligibleCount}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-center">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">
                        Total Enrolled
                      </span>
                      <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                        {preview.total ?? selectedLeadIds.length}
                      </p>
                    </div>
                  </div>

                  {/* Reasons Breakdown */}
                  {Object.keys(preview.categories || {}).length > 0 && (
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase">
                        Eligibility Categorization
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(preview.categories).map(([cat, count]) => (
                          <div key={cat} className="flex justify-between p-1.5 rounded bg-white dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/5">
                            <span className="text-slate-700 dark:text-white/80">{cat}</span>
                            <span className="font-bold text-slate-900 dark:text-white">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Safety Confirmation Notice */}
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Outbound Calling Operational Safety Parameters</span>
                    </div>
                    <ul className="text-xs space-y-1 pl-5 list-disc text-amber-700 dark:text-amber-300/90">
                      <li>Total candidate leads to enroll: <strong>{selectedLeadIds.length}</strong></li>
                      <li>Max concurrent simultaneous lines: <strong>{maxConcurrentCalls}</strong></li>
                      <li>Max retry attempts per unanswered lead: <strong>{maxAttempts}</strong></li>
                      <li>Calling window restriction: <strong>{startTime} – {endTime}</strong> ({daysOfWeek.length} days/week)</li>
                      <li>Daily maximum calls cap: <strong>{callsPerDay}</strong></li>
                    </ul>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as any)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-white"
            >
              Cancel
            </button>

            {step === 1 && (
              <button
                type="button"
                onClick={() => {
                  if (!name.trim()) {
                    warning("Name required: Please provide a campaign name.");
                    return;
                  }
                  setStep(2);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white flex items-center gap-1.5 shadow-md"
              >
                <span>Select Leads</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                onClick={handleProceedToStep3}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white flex items-center gap-1.5 shadow-md"
              >
                <span>Preview Eligibility ({selectedLeadIds.length})</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={handleCreateCampaign}
                disabled={creating}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-md disabled:opacity-50"
              >
                {creating ? "Launching..." : "Confirm & Launch Campaign"}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
