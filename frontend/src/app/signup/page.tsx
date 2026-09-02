"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Mail, Lock, Eye, EyeOff, User, Building2, ArrowRight, ArrowLeft, Check, Phone, Globe } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

const R = "#D42027";
const STEPS = ["Account","Company","Plan","Done"];

const PLANS = [
  { id:"starter",  name:"Starter",  price:"₹2,999", detail:"2 agents · 500 calls/mo",   popular:false },
  { id:"growth",   name:"Growth",   price:"₹9,999", detail:"10 agents · 5,000 calls/mo", popular:true  },
  { id:"business", name:"Business", price:"₹29,999",detail:"Unlimited · 50K calls/mo",   popular:false },
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
    await new Promise(r=>setTimeout(r,1200));
    loginFn({ id:"new-"+Date.now(), name:form.name, email:form.email, role:"company_admin", tenantId:"tenant-"+Date.now() }, "demo-jwt-"+Date.now());
    setStep(3); setLoading(false);
    setTimeout(()=>router.push("/dashboard/overview"),1800);
  }

  const inputCls = "w-full h-11 rounded-xl px-4 text-sm text-white placeholder:text-white/20 outline-none transition-all";
  const inputStyle = { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)" };
  const focusIn  = (e:any) => (e.target.style.borderColor="rgba(212,32,39,0.65)");
  const focusOut = (e:any) => (e.target.style.borderColor="rgba(255,255,255,0.1)");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8"
      style={{ background:"#0c0102" }}>

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background:`linear-gradient(135deg,${R},#9b1219)`, boxShadow:`0 0 20px rgba(212,32,39,0.4)` }}>
          <Zap className="w-4.5 h-4.5 text-white fill-white"/>
        </div>
        <span className="text-xl font-extrabold text-white">AgentCall <span className="gradient-text">AI</span></span>
      </Link>

      <motion.div initial={{ opacity:0,y:24 }} animate={{ opacity:1,y:0 }} className="w-full max-w-lg">

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s,i)=>(
            <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all flex-shrink-0"
                style={{
                  background: i<step?"#16a34a" : i===step?R : "rgba(255,255,255,0.08)",
                  color:"#fff",
                  boxShadow: i===step?`0 0 14px rgba(212,32,39,0.45)`:"none",
                }}>
                {i<step ? <Check className="w-4 h-4"/> : i+1}
              </div>
              <span className="text-xs font-medium hidden sm:block"
                style={{ color: i===step?"#fff":"rgba(255,255,255,0.28)" }}>{s}</span>
              {i<STEPS.length-1 && (
                <div className="flex-1 h-0.5 rounded-full transition-all"
                  style={{ background: i<step?"#16a34a":"rgba(255,255,255,0.08)" }}/>
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-3xl p-7 sm:p-9"
          style={{
            background:"linear-gradient(135deg,rgba(255,255,255,0.045) 0%,rgba(212,32,39,0.022) 100%)",
            border:"1px solid rgba(212,32,39,0.2)",
            backdropFilter:"blur(18px)",
            boxShadow:"0 0 60px rgba(212,32,39,0.12), 0 24px 48px rgba(0,0,0,0.55)",
          }}>

          <AnimatePresence mode="wait">

            {/* Step 0 */}
            {step===0 && (
              <motion.div key="s0" initial={{ opacity:0,x:30 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:-30 }} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-extrabold text-white mb-1">Create your account</h2>
                  <p className="text-sm" style={{ color:"rgba(255,255,255,0.42)" }}>14-day free trial — no credit card needed</p>
                </div>
                {[
                  { k:"name",    label:"Full Name",        type:"text",     icon:<User className="w-4 h-4"/>,   ph:"John Doe" },
                  { k:"email",   label:"Work Email",       type:"email",    icon:<Mail className="w-4 h-4"/>,   ph:"you@company.com" },
                ].map(f=>(
                  <div key={f.k} className="space-y-1.5">
                    <label className="block text-sm font-medium" style={{ color:"rgba(255,255,255,0.65)" }}>{f.label}</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color:"rgba(255,255,255,0.28)" }}>{f.icon}</span>
                      <input type={f.type} value={(form as any)[f.k]} onChange={e=>set(f.k,e.target.value)} placeholder={f.ph}
                        className={inputCls+" pl-10"} style={{ ...inputStyle, borderColor: errors[f.k]?"rgba(212,32,39,0.75)":undefined }}
                        onFocus={focusIn} onBlur={focusOut}/>
                    </div>
                    {errors[f.k] && <p className="text-xs" style={{ color:"#ff8080" }}>{errors[f.k]}</p>}
                  </div>
                ))}
                {/* Password */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium" style={{ color:"rgba(255,255,255,0.65)" }}>Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color:"rgba(255,255,255,0.28)" }}/>
                    <input type={showPwd?"text":"password"} value={form.password} onChange={e=>set("password",e.target.value)} placeholder="Min 8 characters"
                      className={inputCls+" pl-10 pr-12"} style={{ ...inputStyle, borderColor: errors.password?"rgba(212,32,39,0.75)":undefined }}
                      onFocus={focusIn} onBlur={focusOut}/>
                    <button type="button" onClick={()=>setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color:"rgba(255,255,255,0.3)" }}>
                      {showPwd?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs" style={{ color:"#ff8080" }}>{errors.password}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium" style={{ color:"rgba(255,255,255,0.65)" }}>Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color:"rgba(255,255,255,0.28)" }}/>
                    <input type="password" value={form.confirm} onChange={e=>set("confirm",e.target.value)} placeholder="Repeat password"
                      className={inputCls+" pl-10"} style={{ ...inputStyle, borderColor: errors.confirm?"rgba(212,32,39,0.75)":undefined }}
                      onFocus={focusIn} onBlur={focusOut}/>
                  </div>
                  {errors.confirm && <p className="text-xs" style={{ color:"#ff8080" }}>{errors.confirm}</p>}
                </div>
              </motion.div>
            )}

            {/* Step 1 */}
            {step===1 && (
              <motion.div key="s1" initial={{ opacity:0,x:30 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:-30 }} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-extrabold text-white mb-1">About your company</h2>
                  <p className="text-sm" style={{ color:"rgba(255,255,255,0.42)" }}>We'll customise AgentCall AI for your business</p>
                </div>
                {[
                  { k:"company", label:"Company Name",        type:"text", icon:<Building2 className="w-4 h-4"/>, ph:"Acme Corp" },
                  { k:"phone",   label:"Phone Number",         type:"tel",  icon:<Phone className="w-4 h-4"/>,    ph:"+91 98765 43210" },
                  { k:"website", label:"Website (optional)",   type:"url",  icon:<Globe className="w-4 h-4"/>,    ph:"https://acmecorp.com" },
                ].map(f=>(
                  <div key={f.k} className="space-y-1.5">
                    <label className="block text-sm font-medium" style={{ color:"rgba(255,255,255,0.65)" }}>{f.label}</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color:"rgba(255,255,255,0.28)" }}>{f.icon}</span>
                      <input type={f.type} value={(form as any)[f.k]} onChange={e=>set(f.k,e.target.value)} placeholder={f.ph}
                        className={inputCls+" pl-10"} style={{ ...inputStyle, borderColor: errors[f.k]?"rgba(212,32,39,0.75)":undefined }}
                        onFocus={focusIn} onBlur={focusOut}/>
                    </div>
                    {errors[f.k] && <p className="text-xs" style={{ color:"#ff8080" }}>{errors[f.k]}</p>}
                  </div>
                ))}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium" style={{ color:"rgba(255,255,255,0.65)" }}>Industry</label>
                  <select value={form.industry} onChange={e=>set("industry",e.target.value)}
                    className="w-full h-11 rounded-xl px-4 text-sm text-white outline-none cursor-pointer"
                    style={{ background:"#1a0405", border:"1px solid rgba(255,255,255,0.1)" }}>
                    {INDUSTRIES.map(i=><option key={i} value={i} style={{ background:"#1a0405" }}>{i}</option>)}
                  </select>
                </div>
              </motion.div>
            )}

            {/* Step 2 */}
            {step===2 && (
              <motion.div key="s2" initial={{ opacity:0,x:30 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:-30 }} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-extrabold text-white mb-1">Choose your plan</h2>
                  <p className="text-sm" style={{ color:"rgba(255,255,255,0.42)" }}>All plans include a 14-day free trial</p>
                </div>
                <div className="space-y-3">
                  {PLANS.map(p=>(
                    <button key={p.id} type="button" onClick={()=>set("plan",p.id)}
                      className="w-full p-4 rounded-2xl text-left transition-all relative"
                      style={{
                        background: form.plan===p.id ? "rgba(212,32,39,0.15)" : "rgba(255,255,255,0.03)",
                        border: form.plan===p.id ? `1px solid rgba(212,32,39,0.5)` : "1px solid rgba(255,255,255,0.08)",
                        boxShadow: form.plan===p.id ? "0 0 20px rgba(212,32,39,0.18)":undefined,
                      }}>
                      {p.popular && (
                        <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                          style={{ background:R }}>POPULAR</span>
                      )}
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white">{p.name}</span>
                        <span className="text-lg font-extrabold text-white">{p.price}<span className="text-xs font-normal" style={{ color:"rgba(255,255,255,0.4)" }}>/mo</span></span>
                      </div>
                      <p className="text-xs" style={{ color:"rgba(255,255,255,0.48)" }}>{p.detail}</p>
                      {form.plan===p.id && (
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full" style={{ background:R }}/>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-center" style={{ color:"rgba(255,255,255,0.28)" }}>Free trial · Cancel anytime · No credit card required</p>
              </motion.div>
            )}

            {/* Step 3 — Done */}
            {step===3 && (
              <motion.div key="s3" initial={{ opacity:0,scale:0.9 }} animate={{ opacity:1,scale:1 }} className="text-center py-8 space-y-5">
                <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:"spring",stiffness:200,damping:15 }}
                  className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                  style={{ background:"linear-gradient(135deg,#16a34a,#15803d)", boxShadow:"0 0 40px rgba(34,197,94,0.4)" }}>
                  <Check className="w-10 h-10 text-white"/>
                </motion.div>
                <div>
                  <h2 className="text-2xl font-extrabold text-white mb-2">You&apos;re all set! 🎉</h2>
                  <p className="text-sm" style={{ color:"rgba(255,255,255,0.5)" }}>Welcome, {form.name}! Redirecting to dashboard...</p>
                </div>
                <svg className="animate-spin h-6 w-6 mx-auto" style={{ color:R }} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              </motion.div>
            )}

          </AnimatePresence>

          {/* Navigation */}
          {step<3 && (
            <div className={`flex gap-3 mt-8 ${step===0?"justify-end":"justify-between"}`}>
              {step>0 && (
                <button type="button" onClick={back}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ border:"1px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.6)" }}>
                  <ArrowLeft className="w-4 h-4"/> Back
                </button>
              )}
              <button type="button" onClick={step===2?finish:next} disabled={loading}
                className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-white text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-50"
                style={{ background:`linear-gradient(135deg,${R},#9b1219)`, boxShadow:"0 0 20px rgba(212,32,39,0.38)" }}>
                {loading ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : <>{step===2?"Create Account":"Continue"} <ArrowRight className="w-4 h-4"/></>}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-sm mt-6" style={{ color:"rgba(255,255,255,0.38)" }}>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold transition-colors" style={{ color:R }}>Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
