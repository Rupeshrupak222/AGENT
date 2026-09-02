"use client";
import { motion } from "framer-motion";

const R = "#D42027";

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
    <section id="integrations" className="py-16 sm:py-24 bg-gray-50"
      style={{ borderTop:"1px solid rgba(0,0,0,0.07)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity:0,y:20 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }}
          className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-5"
            style={{ background:"rgba(249,115,22,0.10)", color:"#ea580c", border:"1px solid rgba(249,115,22,0.25)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-current"/>Integrations
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
            Connects with <span className="gradient-text">Your Entire Stack</span>
          </h2>
          <p className="text-base sm:text-lg max-w-xl mx-auto text-gray-500">
            Native integrations with the tools you already use. One-click setup, no engineering needed.
          </p>
        </motion.div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
          {integrations.map((int,i)=>(
            <motion.div key={int.name}
              initial={{ opacity:0,scale:0.9 }} whileInView={{ opacity:1,scale:1 }}
              viewport={{ once:true }} transition={{ delay:i*0.05 }}
              className="rounded-2xl p-3 sm:p-4 flex flex-col items-center gap-2 cursor-pointer transition-all duration-300 hover:-translate-y-1 bg-white"
              style={{
                border:"1px solid rgba(0,0,0,0.08)",
                boxShadow:"0 2px 10px rgba(0,0,0,0.05)",
              }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(212,32,39,0.22)";e.currentTarget.style.boxShadow="0 6px 20px rgba(212,32,39,0.08)"}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(0,0,0,0.08)";e.currentTarget.style.boxShadow="0 2px 10px rgba(0,0,0,0.05)"}}
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-xs font-bold"
                style={{ background: int.color + "18", border:`1px solid ${int.color}33`, color:int.color }}>
                {int.name.slice(0,2)}
              </div>
              <p className="text-xs font-semibold text-gray-700 text-center leading-tight">{int.name}</p>
              <span className="text-[9px] px-2 py-0.5 rounded-full font-medium"
                style={{ background:"rgba(212,32,39,0.07)", color:R, border:"1px solid rgba(212,32,39,0.18)" }}>
                {int.category}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
