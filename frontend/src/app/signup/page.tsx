"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Mail, Lock, Eye, EyeOff, User, Building2, ArrowRight, ArrowLeft, Check, Phone, Globe } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { authApi, normalizeApiError } from "@/lib/api";

const STEPS = ["Account", "Company", "Plan", "Done"];

const PLANS = [
  { id: "starter",  name: "Starter",  price: "₹2,999", detail: "Up to 2 agents · 500 min/mo", popular: false },
  { id: "growth",   name: "Growth",   price: "₹9,999", detail: "Up to 10 agents · 5,000 min/mo", popular: true  },
  { id: "business", name: "Business", price: "₹29,999", detail: "Unlimited · 50K min/mo",   popular: false },
];

const INDUSTRIES = [
  "Technology",
  "Finance & Banking",
  "Healthcare",
  "Education",
  "Real Estate",
  "E-Commerce",
  "Recruitment",
  "Manufacturing",
  "Other"
];

export default function SignupPage() {
  const router   = useRouter();
  const loginFn  = useAuthStore(s => s.login);
  const [step,   setStep]    = useState(0);
  const [loading,setLoading] = useState(false);
  const [showPwd,setShowPwd] = useState(false);
  const [errors, setErrors]  = useState<Record<string, string>>({});
  const [form,   setForm]    = useState({
    name: "", email: "", password: "", confirm: "",
    company: "", phone: "", website: "", industry: "Technology", plan: "growth",
  });

  const set = (k: string, v: string) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => { const n = { ...p }; delete n[k]; return n; });
  };

  function validate() {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!form.name.trim()) e.name = "Full name is required";
      if (!form.email.includes("@")) e.email = "Valid work email required";
      if (form.password.length < 8) e.password = "Minimum 8 characters required";
      if (form.password !== form.confirm) e.confirm = "Passwords do not match";
    }
    if (step === 1 && !form.company.trim()) e.company = "Company name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() { if (validate()) setStep(s => s + 1); }
  function back() { setStep(s => s - 1); }

  async function finish() {
    setLoading(true);
    setErrors({});
    try {
      const data = await authApi.register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        companyName: form.company.trim(),
        plan: form.plan,
      });

      loginFn(data.user, data.tenant, data.accessToken, data.refreshToken);
      setStep(3);
      setTimeout(() => router.push("/dashboard/overview"), 1500);
    } catch (err: unknown) {
      setErrors({ global: normalizeApiError(err) });
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full h-11 rounded-xl px-3.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-white border border-slate-200 outline-none focus:border-[#8B5A2B] focus:ring-1 focus:ring-[#8B5A2B] transition-all shadow-2xs";

  return (
    <div
      className="min-h-screen relative flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden"
      style={{ backgroundColor: "#F5F0E8" }}
    >
      {/* Background Texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: "url('/howitworks-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <div className="relative z-10 w-full max-w-lg flex flex-col items-center">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 mb-6 group">
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

        {/* Stepper Progress */}
        <div className="w-full flex items-center gap-2 mb-6 px-1">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all flex-shrink-0 ${
                  i < step
                    ? "bg-emerald-600 text-white"
                    : i === step
                    ? "text-white shadow-sm shadow-[#8B5A2B]/40"
                    : "bg-white/80 text-slate-500 border border-[#DDB892]/60"
                }`}
                style={
                  i === step
                    ? { background: "linear-gradient(135deg, #B08968 0%, #8B5A2B 50%, #6F4428 100%)" }
                    : {}
                }
              >
                {i < step ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : i + 1}
              </div>
              <span
                className={`text-xs font-semibold hidden sm:block ${
                  i === step ? "text-slate-900 font-bold" : "text-slate-500"
                }`}
              >
                {s}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 rounded-full transition-all ${
                    i < step ? "bg-emerald-600" : "bg-[#DDB892]/50"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div
          className="w-full rounded-3xl p-6 sm:p-9 border shadow-xl relative backdrop-blur-md"
          style={{
            background: "rgba(255, 255, 255, 0.94)",
            borderColor: "rgba(221, 184, 146, 0.6)",
            boxShadow: "0 20px 45px -10px rgba(111, 68, 40, 0.1), 0 0 0 1px rgba(221, 184, 146, 0.2)",
          }}
        >
          <AnimatePresence mode="wait">
            {/* Step 0: Account Details */}
            {step === 0 && (
              <motion.div
                key="s0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">
                    Create your organization account
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    14-day free trial · Full telephony API & dashboard access
                  </p>
                </div>

                {[
                  { k: "name",  label: "Full Name",  type: "text",  icon: <User className="w-4 h-4" />,  ph: "Alex Rivera" },
                  { k: "email", label: "Work Email", type: "email", icon: <Mail className="w-4 h-4" />,  ph: "alex@company.com" },
                ].map(f => (
                  <div key={f.k} className="space-y-1">
                    <label className="block text-xs font-bold text-slate-800">{f.label} *</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        {f.icon}
                      </span>
                      <input
                        type={f.type}
                        value={(form as any)[f.k]}
                        onChange={e => set(f.k, e.target.value)}
                        placeholder={f.ph}
                        className={inputCls + " pl-10"}
                      />
                    </div>
                    {errors[f.k] && <p className="text-xs text-red-600 font-medium mt-0.5">{errors[f.k]}</p>}
                  </div>
                ))}

                {/* Password */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" />
                    <input
                      type={showPwd ? "text" : "password"}
                      value={form.password}
                      onChange={e => set("password", e.target.value)}
                      placeholder="Min 8 characters"
                      className={inputCls + " pl-10 pr-10"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                      aria-label={showPwd ? "Hide password" : "Show password"}
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-600 font-medium mt-0.5">{errors.password}</p>}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" />
                    <input
                      type="password"
                      value={form.confirm}
                      onChange={e => set("confirm", e.target.value)}
                      placeholder="Repeat password"
                      className={inputCls + " pl-10"}
                    />
                  </div>
                  {errors.confirm && <p className="text-xs text-red-600 font-medium mt-0.5">{errors.confirm}</p>}
                </div>
              </motion.div>
            )}

            {/* Step 1: Company Details */}
            {step === 1 && (
              <motion.div
                key="s1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">
                    About your enterprise
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Configure workspace defaults and telephony routing
                  </p>
                </div>

                {[
                  { k: "company", label: "Company Name",      type: "text", icon: <Building2 className="w-4 h-4" />, ph: "Acme Technologies" },
                  { k: "phone",   label: "Direct Phone",       type: "tel",  icon: <Phone className="w-4 h-4" />,     ph: "+91 98765 43210" },
                  { k: "website", label: "Website (optional)", type: "url",  icon: <Globe className="w-4 h-4" />,     ph: "https://acme.com" },
                ].map(f => (
                  <div key={f.k} className="space-y-1">
                    <label className="block text-xs font-bold text-slate-800">{f.label} {f.k === "company" ? "*" : ""}</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        {f.icon}
                      </span>
                      <input
                        type={f.type}
                        value={(form as any)[f.k]}
                        onChange={e => set(f.k, e.target.value)}
                        placeholder={f.ph}
                        className={inputCls + " pl-10"}
                      />
                    </div>
                    {errors[f.k] && <p className="text-xs text-red-600 font-medium mt-0.5">{errors[f.k]}</p>}
                  </div>
                ))}

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">Industry</label>
                  <select
                    value={form.industry}
                    onChange={e => set("industry", e.target.value)}
                    className="w-full h-11 rounded-xl px-3.5 text-xs sm:text-sm text-slate-900 bg-white border border-slate-200 outline-none focus:border-[#8B5A2B] cursor-pointer"
                  >
                    {INDUSTRIES.map(i => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}

            {/* Step 2: Subscription Plan */}
            {step === 2 && (
              <motion.div
                key="s2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">
                    Select subscription tier
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    All plans include 14-day free trial · Upgrade or cancel anytime
                  </p>
                </div>

                <div className="space-y-2.5">
                  {PLANS.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => set("plan", p.id)}
                      className={`w-full p-4 rounded-2xl text-left transition-all relative ${
                        form.plan === p.id
                          ? "bg-[#F5EDE4] border-2 border-[#8B5A2B] shadow-xs"
                          : "bg-white border border-slate-200 hover:border-[#DDB892]"
                      }`}
                    >
                      {p.popular && (
                        <span
                          className="absolute top-3.5 right-3.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full text-white shadow-2xs"
                          style={{ background: "linear-gradient(135deg, #B08968 0%, #8B5A2B 50%, #6F4428 100%)" }}
                        >
                          POPULAR
                        </span>
                      )}
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-slate-900">{p.name}</span>
                        <span className="text-base font-extrabold text-[#7F5539] font-mono">
                          {p.price}<span className="text-xs font-normal text-slate-500">/mo</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{p.detail}</p>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-center text-slate-500">
                  Free trial · No immediate credit card charge · Cancel anytime with 1-click
                </p>
              </motion.div>
            )}

            {/* Step 3: Done / Redirecting */}
            {step === 3 && (
              <motion.div
                key="s3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                  <Check className="w-8 h-8 stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Workspace initialized!</h2>
                  <p className="text-xs sm:text-sm text-slate-600">Welcome, {form.name}! Redirecting to your console...</p>
                </div>
                <svg className="animate-spin h-6 w-6 mx-auto text-[#8B5A2B]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Global API Error */}
          {errors.global && (
            <div className="mt-4 p-3 rounded-xl text-xs bg-red-50 border border-red-200 text-red-600">
              <span>{errors.global}</span>
            </div>
          )}

          {/* Navigation Buttons */}
          {step < 3 && (
            <div className={`flex gap-3 mt-6 ${step === 0 ? "justify-end" : "justify-between"}`}>
              {step > 0 && (
                <button
                  type="button"
                  onClick={back}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
              )}
              <button
                type="button"
                onClick={step === 2 ? finish : next}
                disabled={loading}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-white text-xs sm:text-sm font-bold transition-all shadow-md hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
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
                  <>
                    {step === 2 ? "Complete Registration" : "Continue"} <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer Link */}
        <p className="text-center text-xs mt-6 text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-[#8B5A2B] hover:text-[#6F4428] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
