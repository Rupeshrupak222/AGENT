"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight, Phone, TrendingUp } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { authApi, normalizeApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const login  = useAuthStore(s => s.login);
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await authApi.login({
        email: email.trim().toLowerCase(),
        password,
      });

      login(data.user, data.tenant, data.accessToken, data.refreshToken);
      window.location.href = "/dashboard/overview";
    } catch (err: unknown) {
      setError(normalizeApiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function quickLogin(userEmail: string, userPwd: string) {
    setEmail(userEmail);
    setPassword(userPwd);
    setError("");
    setLoading(true);
    try {
      const data = await authApi.login({
        email: userEmail.trim().toLowerCase(),
        password: userPwd,
      });
      login(data.user, data.tenant, data.accessToken, data.refreshToken);
      window.location.href = "/dashboard/overview";
    } catch (err: unknown) {
      setError(normalizeApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-page">

      {/* ── Left panel ──────────────────────────────────── */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden items-center justify-center p-12 bg-slate-950 border-r border-slate-800">
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage:`linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)`, backgroundSize:"40px 40px" }}/>

        <div className="relative z-10 max-w-md w-full">
          <Link href="/" className="flex items-center gap-2.5 mb-14">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Zap className="w-4 h-4 fill-white"/>
            </div>
            <span className="text-lg font-semibold text-white tracking-tight">AgentCall <span className="text-blue-400">AI</span></span>
          </Link>

          <h2 className="text-3xl font-bold text-white leading-tight mb-4">
            Mission-critical voice agents for high-growth enterprises
          </h2>
          <p className="text-sm leading-relaxed mb-8 text-slate-400">
            Automate outbound telephony, inbound support qualification, and pipeline generation with sub-second response latency.
          </p>

          {/* Stat cards */}
          <div className="space-y-3">
            {[
              { icon:<Phone className="w-4 h-4"/>,       label:"Daily Autonomous Calls", value:"48,290" },
              { icon:<TrendingUp className="w-4 h-4"/>,  label:"Qualification Rate",     value:"34.2%" },
            ].map((s,i)=>(
              <motion.div key={i} initial={{ opacity:0,x:-20 }} animate={{ opacity:1,x:0 }} transition={{ delay:0.2+i*0.1 }}
                className="flex items-center gap-3 rounded-xl p-3.5 bg-slate-900/80 border border-slate-800">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">{s.icon}</div>
                <span className="text-xs font-medium text-slate-400">{s.label}</span>
                <span className="ml-auto text-base font-bold text-white font-mono">{s.value}</span>
              </motion.div>
            ))}
          </div>

          {/* Testimonial */}
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.5 }}
            className="mt-6 rounded-xl p-4 bg-slate-900/60 border border-slate-800">
            <p className="text-xs italic leading-relaxed mb-3 text-slate-300">
              &ldquo;AgentCall AI allowed us to scale outbound recruitment across 12 cities without expanding headcounts. Call latency and voice quality are indistinguishable from human agents.&rdquo;
            </p>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-200">RM</div>
              <div>
                <p className="text-xs font-semibold text-white">Rahul Mehta</p>
                <p className="text-[11px] text-slate-500">VP of Operations, TechCorp</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Right panel — form ──────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 bg-slate-50 dark:bg-slate-950">
        {/* Mobile logo */}
        <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Zap className="w-3.5 h-3.5 fill-white"/>
          </div>
          <span className="text-base font-semibold text-slate-900 dark:text-white">AgentCall <span className="text-blue-600 dark:text-blue-400">AI</span></span>
        </Link>

        <motion.div initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.3 }}
          className="w-full max-w-sm">

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1.5">Sign in to console</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400">Enter your organizational credentials below</p>
          </div>

          {/* Development demo logins — hidden in production */}
          {process.env.NODE_ENV !== "production" && (
            <div className="mb-5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                  Quick Demo Access
                </span>
                <span className="text-[10px] text-slate-400">Dev only</span>
              </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => quickLogin("superadmin@agentcall.ai", "SuperAdmin@1234")}
                className="p-2 rounded-lg text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-left flex items-center gap-1.5"
              >
                👑 Super Admin
              </button>
              <button
                type="button"
                onClick={() => quickLogin("admin@acmecorp.com", "Demo@1234")}
                className="p-2 rounded-lg text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-left flex items-center gap-1.5"
              >
                🏢 Company Admin
              </button>
              <button
                type="button"
                onClick={() => quickLogin("manager@acmecorp.com", "Demo@1234")}
                className="p-2 rounded-lg text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-left flex items-center gap-1.5"
              >
                👔 Manager
              </button>
              <button
                type="button"
                onClick={() => quickLogin("agent@acmecorp.com", "Demo@1234")}
                className="p-2 rounded-lg text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-left flex items-center gap-1.5"
              >
                🎧 Calling Agent
              </button>
            </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              className="mb-4 p-3 rounded-lg text-xs bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400"
            >
              {error}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400"/>
                <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@company.com"
                  className="w-full h-10 pl-9 pr-3 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Password</label>
                <span className="text-[11px] text-slate-500">Contact administrator if locked</span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400"/>
                <input type={showPwd?"text":"password"} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full h-10 pl-9 pr-9 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={()=>setShowPwd(!showPwd)}
                  aria-label={showPwd ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  {showPwd ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full h-10 rounded-lg text-white font-medium text-xs flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 mt-2">
              {loading ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : <>Sign in to workspace <ArrowRight className="w-3.5 h-3.5"/></>}
            </button>
          </form>

          <p className="text-center text-xs mt-6 text-slate-500 dark:text-slate-400">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              Create workspace
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
