"use client";
import { motion } from "framer-motion";
import { CheckCircle2, Zap } from "lucide-react";
import Link from "next/link";

const R = "#D42027";

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
    <section id="pricing" className="py-16 sm:py-24 relative bg-white">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full pointer-events-none"
        style={{ background:"radial-gradient(ellipse,rgba(212,32,39,0.05),transparent 70%)" }}/>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">

        <motion.div initial={{ opacity:0,y:20 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }}
          className="text-center mb-12 sm:mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-5"
            style={{ background:"rgba(212,32,39,0.08)", color:R, border:"1px solid rgba(212,32,39,0.22)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-current"/>Transparent Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
            Plans for Every <span className="gradient-text">Stage of Growth</span>
          </h2>
          <p className="text-base sm:text-lg max-w-xl mx-auto text-gray-500">
            Start free, scale as you grow. No hidden fees, no per-minute charges on base plan.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {plans.map((p,i)=>(
            <motion.div key={p.id}
              initial={{ opacity:0,y:30 }} whileInView={{ opacity:1,y:0 }}
              viewport={{ once:true }} transition={{ delay:i*0.1 }}
              className="relative rounded-2xl p-6 flex flex-col transition-all duration-300 bg-white"
              style={{
                border: p.popular ? `1.5px solid rgba(212,32,39,0.40)` : "1px solid rgba(0,0,0,0.08)",
                boxShadow: p.popular
                  ? "0 0 32px rgba(212,32,39,0.12), 0 8px 32px rgba(0,0,0,0.08)"
                  : "0 4px 20px rgba(0,0,0,0.06)",
              }}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white"
                    style={{ background:`linear-gradient(135deg,${R},#9b1219)`, boxShadow:"0 0 14px rgba(212,32,39,0.35)" }}>
                    <Zap className="w-3 h-3 fill-white"/>Most Popular
                  </span>
                </div>
              )}

              <h3 className="text-lg font-bold text-gray-900 mb-1 mt-2">{p.name}</h3>
              <p className="text-xs mb-4 leading-relaxed text-gray-400">{p.desc}</p>

              <div className="mb-6">
                {p.price ? (
                  <div className="flex items-end gap-1">
                    <span className="text-sm text-gray-400">₹</span>
                    <span className="text-4xl font-extrabold text-gray-900">{p.price.toLocaleString("en-IN")}</span>
                    <span className="text-sm mb-1 text-gray-400">/mo</span>
                  </div>
                ) : (
                  <span className="text-3xl font-extrabold text-gray-900">Custom</span>
                )}
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {p.features.map(f=>(
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5"/>{f}
                  </li>
                ))}
              </ul>

              <Link href={p.href}
                className="w-full py-3 rounded-xl text-sm font-semibold text-center transition-all duration-200 active:scale-[0.97]"
                style={p.popular
                  ? { background:`linear-gradient(135deg,${R},#9b1219)`, color:"#fff", boxShadow:"0 0 16px rgba(212,32,39,0.28)" }
                  : { border:"1px solid rgba(212,32,39,0.28)", color:R, background:"rgba(212,32,39,0.05)" }
                }
              >{p.cta}</Link>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-sm mt-8 text-gray-400">
          All plans include 14-day free trial · No credit card required · Cancel anytime
        </p>
      </div>
    </section>
  );
}
