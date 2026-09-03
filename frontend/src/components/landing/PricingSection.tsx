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
    <section id="pricing" className="py-16 sm:py-24 relative bg-white dark:bg-[#0c0102]">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full pointer-events-none"
        style={{ background:"radial-gradient(ellipse,rgba(212,32,39,0.05),transparent 70%)" }}/>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">

        <motion.div initial={{ opacity:0,y:20 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }}
          className="text-center mb-12 sm:mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-5 bg-brand-500/10 text-brand-500 dark:text-brand-400 border border-brand-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-current"/>Transparent Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
            Plans for Every <span className="gradient-text">Stage of Growth</span>
          </h2>
          <p className="text-base sm:text-lg max-w-xl mx-auto text-gray-500 dark:text-white/60">
            Start free, scale as you grow. No hidden fees, no per-minute charges on base plan.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {plans.map((p,i)=>(
            <motion.div key={p.id}
              initial={{ opacity:0,y:30 }} whileInView={{ opacity:1,y:0 }}
              viewport={{ once:true }} transition={{ delay:i*0.1 }}
              className={cn(
                "relative rounded-2xl p-6 flex flex-col transition-all duration-300",
                "bg-white dark:bg-white/[0.03]",
                p.popular
                  ? "border-[1.5px] border-brand-500/40 shadow-[0_0_32px_rgba(212,32,39,0.12),0_8px_32px_rgba(0,0,0,0.08)]"
                  : "border border-slate-200 dark:border-white/[0.08] shadow-sm"
              )}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-500/35">
                    <Zap className="w-3 h-3 fill-white"/>Most Popular
                  </span>
                </div>
              )}

              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 mt-2">{p.name}</h3>
              <p className="text-xs mb-4 leading-relaxed text-gray-400 dark:text-white/40">{p.desc}</p>

              <div className="mb-6">
                {p.price ? (
                  <div className="flex items-end gap-1">
                    <span className="text-sm text-gray-400 dark:text-white/40">₹</span>
                    <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{p.price.toLocaleString("en-IN")}</span>
                    <span className="text-sm mb-1 text-gray-400 dark:text-white/40">/mo</span>
                  </div>
                ) : (
                  <span className="text-3xl font-extrabold text-gray-900 dark:text-white">Custom</span>
                )}
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {p.features.map(f=>(
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-white/65">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5"/>{f}
                  </li>
                ))}
              </ul>

              <Link href={p.href}
                className={cn(
                  "w-full py-3 rounded-xl text-sm font-semibold text-center transition-all duration-200 active:scale-[0.97]",
                  p.popular
                    ? "bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-500/30 hover:brightness-110"
                    : "border border-brand-500/30 text-brand-500 dark:text-brand-400 bg-brand-500/5 hover:bg-brand-500/10 hover:border-brand-500/50"
                )}
              >{p.cta}</Link>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-sm mt-8 text-gray-400 dark:text-white/40">
          All plans include 14-day free trial · No credit card required · Cancel anytime
        </p>
      </div>
    </section>
  );
}
