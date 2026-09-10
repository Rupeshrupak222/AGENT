"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight, Phone, TrendingUp, ShieldCheck } from "lucide-react";
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">

      {/* ── Left panel — Enterprise Showcase ────────────────── */}
      <div
        className="hidden lg:flex w-1/2 relative overflow-hidden items-center justify-center p-12 border-r border-[#DDB892]/40"
        style={{ backgroundColor: "#F5F0E8" }}
      >
        {/* Warm background texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-35"
          style={{
            backgroundImage: "url('/howitworks-bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        <div className="relative z-10 max-w-md w-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 mb-12 group">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm shadow-[#8B5A2B]/30 transition-transform group-hover:scale-105"
              style={{ background: "linear-gradient(135deg, #B08968 0%, #8B5A2B 50%, #6F4428 100%)" }}
            >
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              AgentCall <span style={{ color: "#7F5539" }}>AI</span>
            </span>
          </Link>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight mb-4 tracking-tight">
            Mission-critical voice agents for high-growth enterprises
          </h2>
          <p className="text-sm leading-relaxed mb-8 text-slate-600">
            Automate outbound telephony, inbound support qualification, and pipeline generation with sub-second response latency.
          </p>

          {/* Stat cards */}
          <div className="space-y-3">
            {[
              { icon: <Phone className="w-4 h-4" />,      label: "Daily Autonomous Calls", value: "48,290" },
              { icon: <TrendingUp className="w-4 h-4" />, label: "Qualification Rate",     value: "34.2%" },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-3.5 rounded-2xl p-4 bg-white/90 border border-[#DDB892]/50 shadow-xs backdrop-blur-sm"
              >
                <div
                  className="p-2.5 rounded-xl border flex items-center justify-center"
                  style={{
                    background: "#F5EDE4",
                    color: "#6F4428",
                    borderColor: "rgba(221, 184, 146, 0.7)",
                  }}
                >
                  {s.icon}
                </div>
                <span className="text-xs font-bold text-slate-700">{s.label}</span>
                <span className="ml-auto text-base font-extrabold text-slate-900 font-mono tracking-tight">
                  {s.value}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Testimonial */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 rounded-2xl p-5 bg-white/90 border border-[#DDB892]/50 shadow-xs backdrop-blur-sm"
          >
            <p className="text-xs italic leading-relaxed mb-3.5 text-slate-700">
              &ldquo;AgentCall AI allowed us to scale outbound recruitment across 12 cities without expanding headcounts. Call latency and voice quality are indistinguishable from human agents.&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-2xs"
                style={{ background: "linear-gradient(135deg, #B08968 0%, #8B5A2B 50%, #6F4428 100%)" }}
              >
                RM
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 flex items-center gap-1">
                  Rahul Mehta
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                </p>
                <p className="text-[11px] text-slate-500">VP of Operations, TechCorp</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Right panel — Clean White Form ──────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 bg-white">
        {/* Mobile logo */}
        <Link href="/" className="flex items-center gap-2.5 mb-8 lg:hidden">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs"
            style={{ background: "linear-gradient(135deg, #B08968 0%, #8B5A2B 50%, #6F4428 100%)" }}
          >
            <Zap className="w-4 h-4 fill-white" />
          </div>
          <span className="text-lg font-bold text-slate-900 tracking-tight">
            AgentCall <span style={{ color: "#7F5539" }}>AI</span>
          </span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-sm"
        >
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1.5 tracking-tight">
              Sign in to console
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Enter your organizational credentials below
            </p>
          </div>

          {/* Development demo logins — hidden in production */}
          {process.env.NODE_ENV !== "production" && (
            <div className="mb-5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-[#8B5A2B] fill-[#8B5A2B]" />
                  Quick Demo Access
                </span>
                <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                  Dev only
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => quickLogin("superadmin@agentcall.ai", "Demo@1234")}
                  className="p-2 rounded-xl text-[11px] font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 transition-colors text-left flex items-center gap-1.5 shadow-2xs"
                >
                  👑 Super Admin
                </button>
                <button
                  type="button"
                  onClick={() => quickLogin("admin@acmecorp.com", "Demo@1234")}
                  className="p-2 rounded-xl text-[11px] font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 transition-colors text-left flex items-center gap-1.5 shadow-2xs"
                >
                  🏢 Company Admin
                </button>
                <button
                  type="button"
                  onClick={() => quickLogin("manager@acmecorp.com", "Demo@1234")}
                  className="p-2 rounded-xl text-[11px] font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 transition-colors text-left flex items-center gap-1.5 shadow-2xs"
                >
                  👔 Manager
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
              className="mb-4 p-3 rounded-xl text-xs bg-red-50 border border-red-200 text-red-600 font-medium"
            >
              {error}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-white border border-slate-200 outline-none focus:border-[#8B5A2B] focus:ring-1 focus:ring-[#8B5A2B] transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800">Password</label>
                <span className="text-[11px] text-slate-500 font-medium">Contact administrator if locked</span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" />
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-10 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-white border border-slate-200 outline-none focus:border-[#8B5A2B] focus:ring-1 focus:ring-[#8B5A2B] transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  aria-label={showPwd ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all duration-200 hover:brightness-105 active:scale-[0.98] disabled:opacity-50 mt-3"
              style={{
                background: "linear-gradient(135deg, #B08968 0%, #8B5A2B 50%, #6F4428 100%)",
                boxShadow: "0 4px 15px rgba(139, 90, 43, 0.3)",
              }}
            >
              {loading ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <>Sign in to workspace <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-xs mt-6 text-slate-600">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-bold text-[#8B5A2B] hover:text-[#6F4428] hover:underline">
              Create workspace
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
