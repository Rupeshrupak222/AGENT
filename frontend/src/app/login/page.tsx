"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight, Phone, TrendingUp } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { authApi, normalizeApiError } from "@/lib/api";

const R = "#D42027";

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
      router.push("/dashboard/overview");
    } catch (err: unknown) {
      setError(normalizeApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background:"#0c0102" }}>

      {/* ── Left panel ──────────────────────────────────── */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden items-center justify-center p-12">
        {/* Background */}
        <div className="absolute inset-0"
          style={{ background:`radial-gradient(ellipse 80% 60% at 40% 50%,rgba(212,32,39,0.2),transparent 70%),#0c0102` }}/>
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage:`linear-gradient(${R} 1px,transparent 1px),linear-gradient(90deg,${R} 1px,transparent 1px)`, backgroundSize:"50px 50px" }}/>

        <div className="relative z-10 max-w-md w-full">
          <Link href="/" className="flex items-center gap-2.5 mb-14">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background:`linear-gradient(135deg,${R},#9b1219)`, boxShadow:`0 0 24px rgba(212,32,39,0.45)` }}>
              <Zap className="w-5 h-5 text-white fill-white"/>
            </div>
            <span className="text-xl font-extrabold text-white">AgentCall <span className="gradient-text">AI</span></span>
          </Link>

          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
            Your AI workforce<br/><span className="gradient-text">is waiting for you</span>
          </h2>
          <p className="text-lg leading-relaxed mb-10" style={{ color:"rgba(255,255,255,0.5)" }}>
            1,000+ businesses use AgentCall AI to automate calls, qualify leads and close deals — 24/7.
          </p>

          {/* Stat cards */}
          <div className="space-y-3">
            {[
              { icon:<Phone className="w-4 h-4"/>,       label:"Calls Today",      value:"2,847" },
              { icon:<TrendingUp className="w-4 h-4"/>,  label:"Conversion Rate",  value:"29.7%" },
            ].map((s,i)=>(
              <motion.div key={i} initial={{ opacity:0,x:-20 }} animate={{ opacity:1,x:0 }} transition={{ delay:0.3+i*0.15 }}
                className="flex items-center gap-3 rounded-2xl p-4"
                style={{ background:"rgba(212,32,39,0.1)", border:"1px solid rgba(212,32,39,0.22)", backdropFilter:"blur(12px)" }}>
                <div className="p-2 rounded-xl" style={{ background:"rgba(212,32,39,0.22)", color:R }}>{s.icon}</div>
                <span className="text-sm" style={{ color:"rgba(255,255,255,0.6)" }}>{s.label}</span>
                <span className="ml-auto text-lg font-extrabold text-white">{s.value}</span>
              </motion.div>
            ))}
          </div>

          {/* Testimonial */}
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.8 }}
            className="mt-8 rounded-2xl p-5"
            style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(212,32,39,0.16)", backdropFilter:"blur(12px)" }}>
            <p className="text-sm italic leading-relaxed mb-3" style={{ color:"rgba(255,255,255,0.65)" }}>
              &ldquo;AgentCall AI replaced our 10-person call center. Conversion went from 12% to 31% in the first month.&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background:`linear-gradient(135deg,${R},#9b1219)` }}>R</div>
              <div>
                <p className="text-xs font-semibold text-white">Rahul Mehta</p>
                <p className="text-xs" style={{ color:"rgba(255,255,255,0.38)" }}>VP Sales, TechCorp India</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Right panel — form ──────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10">
        {/* Mobile logo */}
        <Link href="/" className="flex items-center gap-2 mb-10 lg:hidden">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background:`linear-gradient(135deg,${R},#9b1219)` }}>
            <Zap className="w-4 h-4 text-white fill-white"/>
          </div>
          <span className="text-lg font-bold text-white">AgentCall <span className="gradient-text">AI</span></span>
        </Link>

        <motion.div initial={{ opacity:0,y:24 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.5 }}
          className="w-full max-w-md">

          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-white mb-2">Welcome back</h1>
            <p className="text-sm" style={{ color:"rgba(255,255,255,0.48)" }}>Sign in to your AgentCall AI workspace</p>
          </div>

          {/* Demo hint */}
          <button onClick={() => { setEmail("admin@acmecorp.com"); setPassword("Demo@1234"); setError(""); }}
            className="w-full mb-6 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
            style={{ border:`1px solid rgba(212,32,39,0.35)`, background:"rgba(212,32,39,0.1)", color:"#ffaaaa" }}>
            <Zap className="w-4 h-4"/> Use Demo Credentials
          </button>

          {/* Error */}
          {error && (
            <motion.div initial={{ opacity:0,y:-8 }} animate={{ opacity:1,y:0 }}
              className="mb-5 p-3.5 rounded-xl text-sm"
              style={{ background:"rgba(212,32,39,0.12)", border:"1px solid rgba(212,32,39,0.35)", color:"#ffaaaa" }}>
              {error}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium" style={{ color:"rgba(255,255,255,0.65)" }}>Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color:"rgba(255,255,255,0.28)" }}/>
                <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com"
                  className="w-full h-12 pl-10 pr-4 rounded-xl text-sm text-white placeholder:text-white/20 outline-none transition-all"
                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)" }}
                  onFocus={e=>(e.target.style.borderColor="rgba(212,32,39,0.65)")}
                  onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,0.1)")}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium" style={{ color:"rgba(255,255,255,0.65)" }}>Password</label>
                <Link href="#" className="text-xs font-medium transition-colors" style={{ color:R }}>Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color:"rgba(255,255,255,0.28)" }}/>
                <input type={showPwd?"text":"password"} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full h-12 pl-10 pr-12 rounded-xl text-sm text-white placeholder:text-white/20 outline-none transition-all"
                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)" }}
                  onFocus={e=>(e.target.style.borderColor="rgba(212,32,39,0.65)")}
                  onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,0.1)")}
                />
                <button type="button" onClick={()=>setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color:"rgba(255,255,255,0.3)" }}>
                  {showPwd ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full h-12 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ background:`linear-gradient(135deg,${R},#9b1219)`, boxShadow:"0 0 28px rgba(212,32,39,0.40), 0 4px 12px rgba(0,0,0,0.3)" }}>
              {loading ? (
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : <>Sign In <ArrowRight className="w-4 h-4"/></>}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px" style={{ background:"rgba(212,32,39,0.15)" }}/>
            <span className="text-xs" style={{ color:"rgba(255,255,255,0.28)" }}>or continue with</span>
            <div className="flex-1 h-px" style={{ background:"rgba(212,32,39,0.15)" }}/>
          </div>

          {/* Social */}
          <div className="grid grid-cols-2 gap-3">
            {[{ label:"Google", letter:"G" },{ label:"Microsoft", letter:"M" }].map(s=>(
              <button key={s.label} type="button"
                className="h-11 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
                style={{ border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.03)", color:"rgba(255,255,255,0.65)" }}
                onMouseEnter={e=>{const t=e.currentTarget;t.style.borderColor="rgba(212,32,39,0.35)";t.style.color="#fff"}}
                onMouseLeave={e=>{const t=e.currentTarget;t.style.borderColor="rgba(255,255,255,0.1)";t.style.color="rgba(255,255,255,0.65)"}}
              >
                <span className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center text-white"
                  style={{ background:R }}>{s.letter}</span>
                {s.label}
              </button>
            ))}
          </div>

          {/* Development Seed Helper */}
          <div className="mt-5 p-3 rounded-xl text-xs flex items-center justify-between"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}>
            <span>Seeded Admin: <strong className="text-white">admin@acmecorp.com</strong> / <strong className="text-white">Demo@1234</strong></span>
            <button type="button" onClick={() => { setEmail("admin@acmecorp.com"); setPassword("Demo@1234"); }}
              className="text-[11px] font-semibold underline transition-colors" style={{ color: R }}>
              Fill
            </button>
          </div>

          <p className="text-center text-sm mt-8" style={{ color:"rgba(255,255,255,0.38)" }}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold transition-colors" style={{ color:R }}
              onMouseEnter={e=>(e.currentTarget.style.color="#ff6464")} onMouseLeave={e=>(e.currentTarget.style.color=R)}>
              Start free trial
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
