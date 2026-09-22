"use client";

import { useState, useEffect, useCallback } from "react";
import { Banknote, Save } from "lucide-react";
import { superAdminApi, PlanPriceItem, InvoiceItem, normalizeApiError } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button, Badge, EmptyState, TableRowSkeleton, Select, Pagination, Tabs, Skeleton } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

const PLAN_LABEL: Record<string, string> = {
  starter: "Starter",
  growth: "Growth",
  business: "Business",
  enterprise: "Enterprise",
};

const INVOICE_BADGE: Record<string, any> = {
  paid: "success",
  pending: "warning",
  failed: "error",
};

const INVOICE_STATUS = ["pending", "paid", "failed"];
const PER_PAGE = 15;

export default function BillingPage() {
  const { success, error: toastError } = useToast();
  const [pricing, setPricing] = useState<PlanPriceItem[]>([]);
  const [invoices, setInvoices] = useState<{ items: InvoiceItem[]; total: number; page: number; pages: number }>({ items: [], total: 0, page: 1, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pricing");

  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [savingPlan, setSavingPlan] = useState<string | null>(null);

  const [invoicePage, setInvoicePage] = useState(1);
  const [invoiceStatus, setInvoiceStatus] = useState("all");
  const [overridingId, setOverridingId] = useState<string | null>(null);

  const fetchPricing = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await superAdminApi.getPricing();
      setPricing(p);
      const nextDrafts: Record<string, number> = {};
      p.forEach((x) => { nextDrafts[x.plan] = Math.round(Number(x.amount) / 100); });
      setDrafts(nextDrafts);
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await superAdminApi.listInvoices({ page: invoicePage, limit: PER_PAGE, status: invoiceStatus === "all" ? undefined : invoiceStatus });
      setInvoices(res);
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setLoading(false);
    }
  }, [invoicePage, invoiceStatus]);

  useEffect(() => {
    if (activeTab === "pricing") fetchPricing();
    else fetchInvoices();
  }, [activeTab, fetchPricing, fetchInvoices]);

  const handleSavePlan = async (plan: string) => {
    setSavingPlan(plan);
    try {
      await superAdminApi.upsertPricing({ plan, currency: "INR", amount: Math.round((drafts[plan] ?? 0) * 100) });
      success(`${PLAN_LABEL[plan]} pricing saved`);
      fetchPricing();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setSavingPlan(null);
    }
  };

  const handleOverride = async (inv: InvoiceItem, status: string) => {
    setOverridingId(inv.id);
    try {
      await superAdminApi.overrideInvoiceStatus(inv.id, status);
      success(`Invoice marked ${status}`);
      fetchInvoices();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setOverridingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Billing Plans</h1>
            <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">
              Plan pricing templates and invoice oversight
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 shadow-sm overflow-hidden">
          <Tabs
            tabs={[
              { id: "pricing", label: "Plan Pricing" },
              { id: "invoices", label: "Invoices", count: invoices.total },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {loading ? (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={activeTab === "pricing" ? fetchPricing : fetchInvoices}>Retry</Button>
            </div>
          ) : activeTab === "pricing" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-6">
              {pricing.length === 0 ? (
                <EmptyState
                  icon={<Banknote className="w-10 h-10 text-slate-300 dark:text-white/20" />}
                  title="No pricing configured"
                  description="Set monthly pricing for each plan"
                />
              ) : (
                pricing.map((p) => {
                  const dirty = (drafts[p.plan] ?? 0) !== Math.round(Number(p.amount) / 100);
                  return (
                    <div key={p.id} className="rounded-xl border border-slate-200 dark:border-white/[0.07] p-5 bg-gradient-to-br from-slate-50 to-white dark:from-white/[0.03] dark:to-transparent">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white capitalize">{PLAN_LABEL[p.plan] || p.plan}</h3>
                          <p className="text-xs text-slate-500 dark:text-white/40">{p.currency} · updated {new Date(p.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                        </div>
                        <Badge variant={p.isActive ? "success" : "gray"} size="sm">{p.isActive ? "Active" : "Inactive"}</Badge>
                      </div>
                      <div className="flex items-end gap-2 mb-4">
                        <span className="text-2xl font-extrabold text-slate-900 dark:text-white">₹</span>
                        <input
                          type="number"
                          min={0}
                          value={drafts[p.plan] ?? 0}
                          onChange={(e) => setDrafts({ ...drafts, [p.plan]: Number(e.target.value) })}
                          className="w-40 h-12 text-2xl font-extrabold text-slate-900 dark:text-white rounded-xl px-3 outline-none bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 focus:border-brand-500/50"
                        />
                        <span className="text-xs text-slate-500 dark:text-white/40 pb-2">/month (INR)</span>
                      </div>
                      <Button
                        size="sm"
                        disabled={!dirty}
                        loading={savingPlan === p.plan}
                        icon={<Save className="w-3.5 h-3.5" />}
                        onClick={() => handleSavePlan(p.plan)}
                      >
                        {dirty ? "Save Changes" : "Saved"}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-slate-200 dark:border-white/[0.06] flex items-center gap-3">
                <Select
                  value={invoiceStatus}
                  onChange={(e) => { setInvoiceStatus(e.target.value); setInvoicePage(1); }}
                  options={[{ value: "all", label: "All Statuses" }, ...INVOICE_STATUS.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))]}
                  className="!w-44"
                />
              </div>
              {invoices.items.length === 0 ? (
                <EmptyState
                  icon={<Banknote className="w-10 h-10 text-slate-300 dark:text-white/20" />}
                  title="No invoices"
                  description="Invoices generated for tenants will appear here"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/[0.06]">
                        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Tenant</th>
                        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Amount</th>
                        <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Status</th>
                        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Created</th>
                        <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">Override</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                      {invoices.items.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">{inv.tenant?.name || "—"}</td>
                          <td className="px-5 py-3.5">
                            <span className="font-bold text-slate-900 dark:text-white">₹</span>{(Number(inv.amount) / 100).toLocaleString("en-IN")}
                            <span className="text-xs text-slate-400 dark:text-white/30 ml-1">{inv.currency}</span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <Badge variant={INVOICE_BADGE[inv.status] || "gray"} dot size="sm">{inv.status}</Badge>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-white/40">
                            {new Date(inv.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end gap-1.5">
                              {INVOICE_STATUS.filter((s) => s !== inv.status).map((s) => (
                                <Button key={s} variant="ghost" size="sm" loading={overridingId === inv.id} onClick={() => handleOverride(inv, s)}>
                                  {s.charAt(0).toUpperCase() + s.slice(1)}
                                </Button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {invoices.pages > 1 && (
                <div className="px-5 py-4 border-t border-slate-200 dark:border-white/[0.06]">
                  <Pagination page={invoicePage} totalPages={invoices.pages} onPageChange={setInvoicePage} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}