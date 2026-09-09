"use client";
import { motion } from "framer-motion";

const integrations = [
  { name:"Salesforce",      category:"CRM",       color:"#00A1E0" },
  { name:"HubSpot",         category:"CRM",       color:"#FF7A59" },
  { name:"Zoho CRM",        category:"CRM",       color:"#E42527" },
  { name:"Pipedrive",       category:"CRM",       color:"#1A1A2E" },
  { name:"Google Sheets",   category:"Data",      color:"#34A853" },
  { name:"Slack",           category:"Comms",     color:"#4A154B" },
  { name:"Microsoft Teams", category:"Comms",     color:"#6264A7" },
  { name:"Twilio",          category:"Calling",   color:"#F22F46" },
  { name:"Exotel",          category:"Calling",   color:"#1E40AF" },
  { name:"WhatsApp",        category:"Messaging", color:"#25D366" },
  { name:"Google Calendar", category:"Calendar",  color:"#4285F4" },
  { name:"Razorpay",        category:"Payments",  color:"#528FF0" },
];

const integrationsContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
};

const integrationCardVariants = {
  hidden: { opacity: 0, scale: 0.85, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 160,
      damping: 14,
    },
  },
};

export function IntegrationsSection() {
  return (
    <section id="integrations" className="py-16 sm:py-24 border-t border-slate-200 dark:border-brand-500/15"
      style={{
        backgroundImage: "url('/integrations-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "scroll"
      }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.25 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold mb-5 border backdrop-blur-sm"
            style={{ background: "#F5EDE4", color: "#6F4428", borderColor: "#DDB892" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#8B5A2B" }}/>Integrations & Ecosystem
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4 tracking-tight" style={{ color: "#000" }}>
            Connects with <span style={{ color: "#7F5539" }}>Your Entire Stack</span>
          </h2>
          <p className="text-base sm:text-lg max-w-xl mx-auto" style={{ color: "#333" }}>
            Native integrations with the tools you already use. One-click setup, no engineering needed.
          </p>
        </motion.div>

        <motion.div
          variants={integrationsContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.15 }}
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4"
        >
          {integrations.map((int)=>(
            <motion.div key={int.name}
              variants={integrationCardVariants}
              whileHover={{ y: -6, scale: 1.05, transition: { duration: 0.2 } }}
              className="rounded-2xl p-3 sm:p-4 flex flex-col items-center gap-2 cursor-pointer transition-all duration-300 backdrop-filter backdrop-blur-md shadow-sm hover:shadow-lg"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.45)", border: "1px solid rgba(221, 184, 146, 0.4)" }}
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-xs font-bold"
                style={{ background: int.color + "18", border:`1px solid ${int.color}33`, color:int.color }}>
                {int.name.slice(0,2)}
              </div>
              <p className="text-xs font-semibold text-center leading-tight" style={{ color: "#000" }}>{int.name}</p>
              <span className="text-[9px] px-2 py-0.5 rounded-full font-medium border"
                style={{ background: "#F5EDE4", color: "#6F4428", borderColor: "#DDB892" }}
              >
                {int.category}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
