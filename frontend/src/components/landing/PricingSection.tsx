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

const pricingContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

const pricingCardVariants = {
  hidden: { opacity: 0, y: 45, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export function PricingSection() {
  return (
    <section id="pricing" className="py-16 sm:py-24 relative"
      style={{
        backgroundImage: "url('/pricing-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "scroll"
      }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full pointer-events-none"
        style={{ background:"radial-gradient(ellipse,rgba(212,32,39,0.05),transparent 70%)" }}/>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12 sm:mb-16"
        >
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold mb-5 border backdrop-blur-sm"
            style={{ background: "#F5EDE4", color: "#6F4428", borderColor: "#DDB892" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#8B5A2B" }}/>Transparent Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4 tracking-tight" style={{ color: "#000" }}>
            Plans for Every <span style={{ color: "#7F5539" }}>Stage of Growth</span>
          </h2>
          <p className="text-base sm:text-lg max-w-xl mx-auto" style={{ color: "#333" }}>
            Start free, scale as you grow. No hidden fees, no per-minute charges on base plan.
          </p>
        </motion.div>

        <motion.div
          variants={pricingContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5"
        >
          {plans.map((p)=>(
            <motion.div key={p.id}
              variants={pricingCardVariants}
              whileHover={{ y: -8, scale: p.popular ? 1.03 : 1.02, transition: { duration: 0.2 } }}
              className={cn(
                "relative rounded-2xl p-6 flex flex-col transition-all duration-300",
                "backdrop-filter backdrop-blur-md",
                p.popular
                  ? "border-[1.5px] border-[#B08968]/50 shadow-[0_0_32px_rgba(140,90,50,0.12),0_8px_32px_rgba(0,0,0,0.08)]"
                  : "border border-white/20 shadow-sm"
              )}
              style={{
                backgroundColor: p.popular ? "rgba(255, 255, 255, 0.45)" : "rgba(255, 255, 255, 0.25)"
              }}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold text-white shadow-lg shadow-[#8B5A2B]/30"
                    style={{ background: "linear-gradient(135deg, #B08968 0%, #8B5A2B 50%, #6F4428 100%)" }}
                  >
                    <Zap className="w-3 h-3 fill-white"/>Most Popular
                  </span>
                </div>
              )}

              <h3 className="text-lg font-bold mb-1 mt-2" style={{ color: "#000" }}>{p.name}</h3>
              <p className="text-xs mb-4 leading-relaxed" style={{ color: "#333" }}>{p.desc}</p>

              <div className="mb-6">
                {p.price ? (
                  <div className="flex items-end gap-1">
                    <span className="text-sm" style={{ color: "#333" }}>₹</span>
                    <span className="text-4xl font-extrabold" style={{ color: "#000" }}>{p.price.toLocaleString("en-IN")}</span>
                    <span className="text-sm mb-1" style={{ color: "#333" }}>/mo</span>
                  </div>
                ) : (
                  <span className="text-3xl font-extrabold" style={{ color: "#000" }}>Custom</span>
                )}
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {p.features.map(f=>(
                  <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "#333" }}>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5"/>{f}
                  </li>
                ))}
              </ul>

              <Link href={p.href}
                className="w-full py-3 rounded-xl text-sm font-semibold text-center transition-all duration-200 active:scale-[0.97]"
                style={p.popular ? {
                  background: "linear-gradient(135deg, #B08968 0%, #8B5A2B 50%, #6F4428 100%)",
                  color: "#fff",
                  boxShadow: "0 4px 14px rgba(139, 90, 43, 0.25)"
                } : {
                  background: "#F5EDE4",
                  color: "#6F4428",
                  border: "1px solid #DDB892"
                }}
              >{p.cta}</Link>
            </motion.div>
          ))}
        </motion.div>

        <p className="text-center text-sm mt-8" style={{ color: "#333" }}>
          All plans include 14-day free trial · No credit card required · Cancel anytime
        </p>
      </div>
    </section>
  );
}
