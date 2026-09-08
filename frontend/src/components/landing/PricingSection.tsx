"use client";
import { motion } from "framer-motion";
import { CheckCircle2, Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const plans = [
  { id:"starter",   name:"Starter",   price:2999,  desc:"For small businesses getting started.",  popular:false,
    features:["2 AI Agents","500 Calls/month","Hindi + English","Basic CRM","WhatsApp follow-up","Email support"],
    cta:"Start Free Trial", href:"/signup?plan=starter" },
  { id:"growth",    name:"Growth",    price:9999,  desc:"For growing teams needing more scale.",   popular:true,
    features:["10 AI Agents","5,000 Calls/month","All 10 Indian Languages","Full CRM + Pipeline","WhatsApp + SMS","Calendar Booking","Analytics Dashboard","Priority support"],
    cta:"Start Free Trial", href:"/signup?plan=growth" },
  { id:"business",  name:"Business",  price:29999, desc:"Full-scale enterprise deployment.",       popular:false,
    features:["Unlimited Agents","50,000 Calls/month","Custom AI Voice","Advanced Analytics","CRM Integrations","API Access","White Label","Dedicated Manager"],
    cta:"Start Free Trial", href:"/signup?plan=business" },
  { id:"enterprise",name:"Enterprise",price:null,  desc:"Custom infrastructure & dedicated support.", popular:false,
    features:["Everything in Business","Dedicated Servers","SSO / SAML","Audit Logs","SLA Guarantee","Custom Integrations","24/7 Phone Support"],
    cta:"Contact Sales", href:"/contact" },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-16 sm:py-24 relative bg-page border-t border-slate-200 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">

        <motion.div initial={{ opacity:0,y:20 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }}
          className="text-center mb-12 sm:mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-5 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"/>Transparent Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
            Predictable Plans for Modern Teams
          </h2>
          <p className="text-base sm:text-lg max-w-xl mx-auto text-slate-600 dark:text-slate-400">
            Start free, scale as your call volume grows. Zero hidden telephony fees or lock-ins.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {plans.map((p,i)=>(
            <motion.div key={p.id}
              initial={{ opacity:0,y:30 }} whileInView={{ opacity:1,y:0 }}
              viewport={{ once:true }} transition={{ delay:i*0.08 }}
              className={cn(
                "relative rounded-xl p-6 flex flex-col transition-all duration-200",
                "bg-white dark:bg-slate-900/70",
                p.popular
                  ? "border-2 border-blue-600 dark:border-blue-500 shadow-xl shadow-blue-600/5 ring-1 ring-blue-600/20"
                  : "border border-slate-200 dark:border-slate-800 shadow-sm"
              )}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider text-white bg-blue-600 shadow-sm">
                    <Zap className="w-3 h-3 fill-white"/>Most Popular
                  </span>
                </div>
              )}

              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 mt-1">{p.name}</h3>
              <p className="text-xs mb-5 leading-relaxed text-slate-500 dark:text-slate-400">{p.desc}</p>

              <div className="mb-6">
                {p.price ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">₹</span>
                    <span className="text-3xl font-bold text-slate-900 dark:text-white">{p.price.toLocaleString("en-IN")}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">/month</span>
                  </div>
                ) : (
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">Custom</span>
                )}
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {p.features.map(f=>(
                  <li key={f} className="flex items-start gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5"/>{f}
                  </li>
                ))}
              </ul>

              <Link href={p.href}
                className={cn(
                  "w-full py-2.5 rounded-lg text-xs font-semibold text-center transition-colors duration-150",
                  p.popular
                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
                )}
              >{p.cta}</Link>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-xs mt-8 text-slate-500 dark:text-slate-400">
          All plans include 14-day free trial · No credit card required · Cancel anytime
        </p>
      </div>
    </section>
  );
}
