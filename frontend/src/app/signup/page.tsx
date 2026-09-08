"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Mail, Lock, Eye, EyeOff, User, Building2, ArrowRight, ArrowLeft, Check, Phone, Globe } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { authApi, normalizeApiError } from "@/lib/api";

const STEPS = ["Account","Company","Plan","Done"];

const PLANS = [
  { id:"starter",  name:"Starter",  price:"₹2,999", detail:"Up to 2 agents · 500 min/mo", popular:false },
  { id:"growth",   name:"Growth",   price:"₹9,999", detail:"Up to 10 agents · 5,000 min/mo", popular:true  },
  { id:"business", name:"Business", price:"₹29,999", detail:"Unlimited · 50K min/mo",   popular:false },
];

const INDUSTRIES = ["Technology","Finance & Banking","Healthcare","Education","Real Estate","E-Commerce","Recruitment","Manufacturing","Other"];

export default function SignupPage() {
  const router   = useRouter();
  const loginFn  = useAuthStore(s=>s.login);
  const [step,   setStep]    = useState(0);
  const [loading,setLoading] = useState(false);
  const [showPwd,setShowPwd] = useState(false);
  const [errors, setErrors]  = useState<Record<string,string>>({});
  const [form,   setForm]    = useState({
    name:"", email:"", password:"", confirm:"",
    company:"", phone:"", website:"", industry:"Technology", plan:"growth",
  });

  const set = (k:string,v:string) => { setForm(p=>({...p,[k]:v})); setErrors(p=>{const n={...p};delete n[k];return n;}); };

  function validate() {
    const e: Record<string,string> = {};
    if (step===0) {
      if (!form.name.trim()) e.name="Name required";
      if (!form.email.includes("@")) e.email="Valid email required";
      if (form.password.length<8) e.password="Min 8 characters";
      if (form.password!==form.confirm) e.confirm="Passwords don't match";
    }
    if (step===1 && !form.company.trim()) e.company="Company name required";
    setErrors(e); return Object.keys(e).length===0;
  }

  function next() { if (validate()) setStep(s=>s+1); }
  function back() { setStep(s=>s-1); }

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

  const inputCls = "w-full h-10 rounded-lg px-3.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-50 dark:bg-slate-950">

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
          <Zap className="w-4 h-4 fill-white"/>
        </div>
        <span className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">AgentCall <span className="text-blue-600 dark:text-blue-400">AI</span></span>
      </Link>

      <motion.div initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} className="w-full max-w-lg">

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6 px-1">
          {STEPS.map((s,i)=>(
            <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all flex-shrink-0 ${
                i<step ? "bg-emerald-600 text-white" : i===step ? "bg-blue-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}>
                {i<step ? <Check className="w-3.5 h-3.5"/> : i+1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${
                i===step ? "text-slate-900 dark:text-white" : "text-slate-400"
              }`}>{s}</span>
              {i<STEPS.length-1 && (
                <div className={`flex-1 h-0.5 rounded-full transition-all ${
                  i<step ? "bg-emerald-600" : "bg-slate-200 dark:bg-slate-800"
                }`}/>
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">

          <AnimatePresence mode="wait">

            {/* Step 0 */}
            {step===0 && (
              <motion.div key="s0" initial={{ opacity:0,x:20 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:-20 }} className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Create your organization account</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">14-day free trial · Full API & dashboard access</p>
                </div>
                {[
                  { k:"name",    label:"Full Name",        type:"text",     icon:<User className="w-4 h-4"/>,   ph:"Alex Rivera" },
                  { k:"email",   label:"Work Email",       type:"email",    icon:<Mail className="w-4 h-4"/>,   ph:"alex@company.com" },
                ].map(f=>(
                  <div key={f.k} className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">{f.label}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">{f.icon}</span>
                      <input type={f.type} value={(form as any)[f.k]} onChange={e=>set(f.k,e.target.value)} placeholder={f.ph}
                        className={inputCls+" pl-9"}
                      />
                    </div>
                    {errors[f.k] && <p className="text-xs text-red-500">{errors[f.k]}</p>}
                  </div>
                ))}
                {/* Password */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400"/>
                    <input type={showPwd?"text":"password"} value={form.password} onChange={e=>set("password",e.target.value)} placeholder="Min 8 characters"
                      className={inputCls+" pl-9 pr-9"}
                    />
                    <button type="button" onClick={()=>setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPwd?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400"/>
                    <input type="password" value={form.confirm} onChange={e=>set("confirm",e.target.value)} placeholder="Repeat password"
                      className={inputCls+" pl-9"}
                    />
                  </div>
                  {errors.confirm && <p className="text-xs text-red-500">{errors.confirm}</p>}
                </div>
              </motion.div>
            )}

            {/* Step 1 */}
            {step===1 && (
              <motion.div key="s1" initial={{ opacity:0,x:20 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:-20 }} className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">About your enterprise</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Configure workspace defaults and telephony routing</p>
                </div>
                {[
                  { k:"company", label:"Company Name",        type:"text", icon:<Building2 className="w-4 h-4"/>, ph:"Acme Corp" },
                  { k:"phone",   label:"Direct Phone",         type:"tel",  icon:<Phone className="w-4 h-4"/>,    ph:"+91 98765 43210" },
                  { k:"website", label:"Website (optional)",   type:"url",  icon:<Globe className="w-4 h-4"/>,    ph:"https://acmecorp.com" },
                ].map(f=>(
                  <div key={f.k} className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">{f.label}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">{f.icon}</span>
                      <input type={f.type} value={(form as any)[f.k]} onChange={e=>set(f.k,e.target.value)} placeholder={f.ph}
                        className={inputCls+" pl-9"}
                      />
                    </div>
                    {errors[f.k] && <p className="text-xs text-red-500">{errors[f.k]}</p>}
                  </div>
                ))}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Industry</label>
                  <select value={form.industry} onChange={e=>set("industry",e.target.value)}
                    className="w-full h-10 rounded-lg px-3 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 outline-none cursor-pointer">
                    {INDUSTRIES.map(i=><option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </motion.div>
            )}

            {/* Step 2 */}
            {step===2 && (
              <motion.div key="s2" initial={{ opacity:0,x:20 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:-20 }} className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Select subscription tier</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">All plans include 14-day trial · Upgrade or cancel anytime</p>
                </div>
                <div className="space-y-2.5">
                  {PLANS.map(p=>(
                    <button key={p.id} type="button" onClick={()=>set("plan",p.id)}
                      className={`w-full p-3.5 rounded-xl text-left transition-all relative ${
                        form.plan===p.id
                          ? "bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-600 dark:border-blue-500"
                          : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      {p.popular && (
                        <span className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                          POPULAR
                        </span>
                      )}
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white">{p.name}</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{p.price}<span className="text-[11px] font-normal text-slate-500">/mo</span></span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{p.detail}</p>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-center text-slate-500">Free trial · No immediate billing · Cancel anytime</p>
              </motion.div>
            )}

            {/* Step 3 — Done */}
            {step===3 && (
              <motion.div key="s3" initial={{ opacity:0,scale:0.95 }} animate={{ opacity:1,scale:1 }} className="text-center py-6 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto">
                  <Check className="w-7 h-7"/>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Workspace initialized!</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Welcome, {form.name}! Launching your console...</p>
                </div>
                <svg className="animate-spin h-5 w-5 mx-auto text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              </motion.div>
            )}

          </AnimatePresence>

          {/* Global API Error */}
          {errors.global && (
            <div className="mt-4 p-3 rounded-lg text-xs bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
              <span>{errors.global}</span>
            </div>
          )}

          {/* Navigation */}
          {step<3 && (
            <div className={`flex gap-3 mt-6 ${step===0?"justify-end":"justify-between"}`}>
              {step>0 && (
                <button type="button" onClick={back}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5"/> Back
                </button>
              )}
              <button type="button" onClick={step===2?finish:next} disabled={loading}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-white text-xs font-medium bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition-colors shadow-xs disabled:opacity-50"
              >
                {loading ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : <>{step===2?"Complete Registration":"Continue"} <ArrowRight className="w-3.5 h-3.5"/></>}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs mt-6 text-slate-500 dark:text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
