"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Eye,
  XCircle,
  CheckCircle,
  Shield,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  platformApi,
  PlatformUserItem,
  normalizeApiError,
} from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui";
import { Badge } from "@/components/ui";
import { EmptyState } from "@/components/ui";
import { TableRowSkeleton } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui";
import { Pagination } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";

const ROLE_OPTIONS = [
  { value: "all", label: "All Roles" },
  { value: "super_admin", label: "Super Admin" },
  { value: "company_admin", label: "Company Admin" },
  { value: "manager", label: "Manager" },
  { value: "agent", label: "Agent" },
  { value: "viewer", label: "Viewer" },
];

const ROLE_BADGE: Record<string, { variant: "brand" | "purple" | "info" | "success" | "gray" }> = {
  super_admin: { variant: "brand" },
  company_admin: { variant: "purple" },
  manager: { variant: "info" },
  agent: { variant: "success" },
  viewer: { variant: "gray" },
};

const PER_PAGE = 20;

export default function UsersPage() {
  const { success, error: toastError } = useToast();
  const [users, setUsers] = useState<PlatformUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {
        page,
        limit: PER_PAGE,
      };
      if (search.trim()) params.search = search.trim();
      if (roleFilter !== "all") params.role = roleFilter;
      const res = await platformApi.allUsers(params);
      setUsers(res.items);
      setTotal(res.total);
      setPageCount(res.pages);
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter]);

  const filtered = users.filter((u) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") return u.isActive;
    return !u.isActive;
  });

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Users</h1>
            <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">
              Manage all users across the platform
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-white/40">
            <Users className="w-4 h-4" />
            <span className="font-semibold text-slate-900 dark:text-white">{total}</span> total users
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-8 text-sm rounded-xl outline-none transition-colors bg-slate-50 dark:bg-white/[0.04] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 placeholder:text-slate-400 dark:placeholder:text-white/20 focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/25 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:text-white/30 dark:hover:text-white/60"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-9 px-3 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-slate-600 dark:text-white/60 outline-none cursor-pointer"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              {(["all", "active", "inactive"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                    statusFilter === s
                      ? "bg-brand-500/10 text-brand-600 border-brand-500/25 dark:bg-brand-500/15 dark:text-brand-400 dark:border-brand-500/35"
                      : "bg-slate-50 dark:bg-white/[0.04] text-slate-500 dark:text-white/50 border-transparent hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                  )}
                >
                  {s === "all" ? "All" : s === "active" ? "Active" : "Inactive"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && !loading && (
          <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 p-6 text-center">
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 shadow-sm overflow-hidden">
          {loading ? (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {Array.from({ length: 8 }).map((_, i) => (
                <TableRowSkeleton key={i} columns={6} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Users className="w-10 h-10 text-slate-300 dark:text-white/20" />}
              title="No users found"
              description={
                search || roleFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "No users have been registered yet"
              }
              action={
                search || roleFilter !== "all" || statusFilter !== "all" ? (
                  <Button variant="outline" size="sm" onClick={() => { setSearch(""); setRoleFilter("all"); setStatusFilter("all"); }}>
                    Clear Filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/[0.06]">
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                        Name
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                        Email
                      </th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                        Role
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                        Company
                      </th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                        Status
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                    {filtered.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-brand-500 to-brand-700 flex-shrink-0">
                              {u.name?.[0]?.toUpperCase() ?? "U"}
                            </div>
                            <span className="font-medium text-slate-900 dark:text-white">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-white/40">{u.email}</td>
                        <td className="px-5 py-3.5 text-center">
                          <Badge variant={ROLE_BADGE[u.role]?.variant || "gray"} size="sm">
                            {u.role.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <Link
                            href={`/dashboard/admin/companies/${u.tenant.id}`}
                            className="text-sm text-brand-500 hover:text-brand-600 dark:hover:text-brand-400 font-medium transition-colors"
                          >
                            {u.tenant.name}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <Badge variant={u.isActive ? "success" : "error"} dot size="sm">
                            {u.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-white/40">
                          {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="lg:hidden divide-y divide-slate-100 dark:divide-white/[0.04]">
                {filtered.map((u) => (
                  <div key={u.id} className="p-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-brand-500 to-brand-700 flex-shrink-0">
                        {u.name?.[0]?.toUpperCase() ?? "U"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white truncate">{u.name}</p>
                        <p className="text-xs text-slate-500 dark:text-white/40 truncate">{u.email}</p>
                      </div>
                      <Badge variant={u.isActive ? "success" : "error"} dot size="sm">
                        {u.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-white/40">
                      <Badge variant={ROLE_BADGE[u.role]?.variant || "gray"} size="sm">
                        {u.role.replace("_", " ")}
                      </Badge>
                      <Link
                        href={`/dashboard/admin/companies/${u.tenant.id}`}
                        className="text-brand-500 hover:text-brand-600 font-medium"
                      >
                        {u.tenant.name}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pageCount > 1 && (
                <div className="px-5 py-4 border-t border-slate-200 dark:border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500 dark:text-white/35">
                      Showing {(page - 1) * PER_PAGE + 1}-
                      {Math.min(page * PER_PAGE, total)} of {total}
                    </p>
                    <Pagination page={page} totalPages={pageCount} onPageChange={setPage} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
