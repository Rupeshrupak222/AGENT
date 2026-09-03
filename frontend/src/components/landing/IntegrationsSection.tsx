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

export function IntegrationsSection() {
  return (
    <section id="integrations" className="py-16 sm:py-24 bg-gray-50 dark:bg-[#0a0102] border-t border-slate-200 dark:border-brand-500/15">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity:0,y:20 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }}
          className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-5 bg-orange-500/10 text-orange-600 border border-orange-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-current"/>Integrations
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
            Connects with <span className="gradient-text">Your Entire Stack</span>
          </h2>
          <p className="text-base sm:text-lg max-w-xl mx-auto text-gray-500 dark:text-white/60">
            Native integrations with the tools you already use. One-click setup, no engineering needed.
          </p>
        </motion.div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
          {integrations.map((int,i)=>(
            <motion.div key={int.name}
              initial={{ opacity:0,scale:0.9 }} whileInView={{ opacity:1,scale:1 }}
              viewport={{ once:true }} transition={{ delay:i*0.05 }}
              className="rounded-2xl p-3 sm:p-4 flex flex-col items-center gap-2 cursor-pointer transition-all duration-300 hover:-translate-y-1 bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-sm hover:border-brand-500/25 hover:shadow-lg hover:shadow-brand-500/10"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-xs font-bold"
                style={{ background: int.color + "18", border:`1px solid ${int.color}33`, color:int.color }}>
                {int.name.slice(0,2)}
              </div>
              <p className="text-xs font-semibold text-gray-700 dark:text-white/75 text-center leading-tight">{int.name}</p>
              <span className="text-[9px] px-2 py-0.5 rounded-full font-medium bg-brand-500/10 text-brand-500 dark:text-brand-400 border border-brand-500/20">
                {int.category}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
