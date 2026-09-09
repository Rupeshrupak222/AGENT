"use client";
import { motion } from "framer-motion";

function SalesforceLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <path fill="#00A1E0" d="M10 4.2c1.4 0 2.6.7 3.3 1.8.8-.6 1.9-.9 3.1-.9 2.8 0 5.1 2.2 5.3 5 1.7.6 2.9 2.2 2.9 4.1 0 2.4-2 4.4-4.4 4.4H5.4C2.4 18.6 0 16.2 0 13.2c0-2.3 1.5-4.2 3.6-4.7.4-2.9 2.9-5.1 6.2-5.1z" />
    </svg>
  );
}

function HubSpotLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#FF7A59">
      <path d="M18.8 7.3V4.9c.7-.4 1.2-1.2 1.2-2.1 0-1.3-1.1-2.4-2.4-2.4s-2.4 1.1-2.4 2.4c0 .9.5 1.7 1.2 2.1v2.4c-1.1.4-2 1.1-2.6 2.1l-6.1-4.7c.1-.3.2-.7.2-1.1 0-1.9-1.5-3.4-3.4-3.4S1.1 1.7 1.1 3.6s1.5 3.4 3.4 3.4c.7 0 1.4-.2 1.9-.6l5.9 4.6c-.6 1-.9 2.1-.9 3.3 0 1.2.4 2.4 1 3.3l-2.4 2.4c-.4-.2-.8-.3-1.3-.3-1.5 0-2.8 1.3-2.8 2.8s1.3 2.8 2.8 2.8 2.8-1.3 2.8-2.8c0-.5-.1-.9-.3-1.3l2.4-2.4c1 .6 2.1 1 3.3 1 3.4 0 6.2-2.8 6.2-6.2 0-2.6-1.6-4.8-3.9-5.7zm-1.2 9.6c-2 0-3.6-1.6-3.6-3.6s1.6-3.6 3.6-3.6 3.6 1.6 3.6 3.6-1.6 3.6-3.6 3.6z"/>
    </svg>
  );
}

function ZohoLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <rect x="2" y="2" width="9" height="9" rx="2" fill="#E42527" />
      <rect x="13" y="2" width="9" height="9" rx="2" fill="#2266AA" />
      <rect x="2" y="13" width="9" height="9" rx="2" fill="#2CA02C" />
      <rect x="13" y="13" width="9" height="9" rx="2" fill="#F4B400" />
    </svg>
  );
}

function PipedriveLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <circle cx="12" cy="12" r="10.5" fill="#000000" />
      <path d="M12 6.5c-2.6 0-4.5 1.9-4.5 4.5 0 2.1 1.2 3.7 3.1 4.3v4h2.8v-4c1.9-.6 3.1-2.2 3.1-4.3 0-2.6-1.9-4.5-4.5-4.5zm0 6.2c-.9 0-1.7-.8-1.7-1.7s.8-1.7 1.7-1.7 1.7.8 1.7 1.7-.8 1.7-1.7 1.7z" fill="#00D26A" />
    </svg>
  );
}

function GoogleSheetsLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" fill="#0F9D58"/>
      <path d="M14 2v6h6" fill="#87CEAC"/>
      <path d="M7 11h10v2H7zm0 3h10v2H7zm0 3h10v2H7zm4-6h2v8h-2z" fill="#FFFFFF"/>
    </svg>
  );
}

function SlackLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <path d="M5.04 14.28a2.28 2.28 0 1 1-2.28-2.28h2.28v2.28zm1.14 0a2.28 2.28 0 0 1 4.56 0v5.7a2.28 2.28 0 1 1-4.56 0v-5.7z" fill="#E01E5A"/>
      <path d="M9.72 5.04a2.28 2.28 0 1 1 2.28-2.28v2.28h-2.28zm0 1.14a2.28 2.28 0 0 1 0 4.56H4.02a2.28 2.28 0 0 1 0-4.56h5.7z" fill="#36C5F0"/>
      <path d="M18.96 9.72a2.28 2.28 0 1 1 2.28 2.28h-2.28V9.72zm-1.14 0a2.28 2.28 0 0 1-4.56 0V4.02a2.28 2.28 0 1 1 4.56 0v5.7z" fill="#2EB67D"/>
      <path d="M14.28 18.96a2.28 2.28 0 1 1-2.28 2.28v-2.28h2.28zm0-1.14a2.28 2.28 0 0 1 0-4.56h5.7a2.28 2.28 0 1 1 0 4.56h-5.7z" fill="#ECB22E"/>
    </svg>
  );
}

function TeamsLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <path d="M19.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM17 9.5h5a2 2 0 0 1 2 2v4a3 3 0 0 1-3 3h-2v-4.5a3 3 0 0 0-2-2.83V9.5z" fill="#505AC9"/>
      <path d="M13 6.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM7.5 8h11a2.5 2.5 0 0 1 2.5 2.5V17a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4v-6.5A2.5 2.5 0 0 1 7.5 8z" fill="#7B83EB"/>
      <rect x="1" y="7" width="10" height="10" rx="2" fill="#4B53BC"/>
      <path d="M4 10h4v1.5H6.8v4H5.2v-4H4V10z" fill="#FFFFFF"/>
    </svg>
  );
}

function TwilioLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <circle cx="12" cy="12" r="10.5" fill="#F22F46"/>
      <circle cx="8" cy="8" r="2.2" fill="#FFFFFF"/>
      <circle cx="16" cy="8" r="2.2" fill="#FFFFFF"/>
      <circle cx="8" cy="16" r="2.2" fill="#FFFFFF"/>
      <circle cx="16" cy="16" r="2.2" fill="#FFFFFF"/>
    </svg>
  );
}

function ExotelLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <circle cx="12" cy="12" r="10.5" fill="#0A58CA"/>
      <path d="M6 14.5a7.5 7.5 0 0 1 12 0M8 12a4.5 4.5 0 0 1 8 0M10.2 9.8a2.2 2.2 0 0 1 3.6 0" stroke="#FFFFFF" strokeWidth="1.7" strokeLinecap="round" fill="none"/>
      <circle cx="12" cy="16" r="1.4" fill="#FFFFFF"/>
    </svg>
  );
}

function WhatsAppLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <circle cx="12" cy="12" r="10.5" fill="#25D366"/>
      <path d="M17.5 14.4c-.3-.2-1.7-.8-1.9-.9-.3-.1-.5-.2-.7.1-.2.3-.8.9-1 1.1-.2.2-.4.2-.7.1-.3-.1-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.7.1-.1.3-.4.5-.5.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.2-.7-1.7-.9-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.4-1.2 1.2-1.2 2.9s1.2 3.3 1.4 3.6c.2.2 2.4 3.7 5.8 5.1.8.3 1.4.6 1.9.7.8.3 1.6.2 2.2.1.7-.1 2.1-.9 2.4-1.7.3-.8.3-1.6.2-1.7-.1-.2-.3-.3-.6-.5z" fill="#FFFFFF"/>
    </svg>
  );
}

function GoogleCalendarLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <path d="M18 4h-1V2h-2v2H9V2H7v2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" fill="#4285F4"/>
      <path d="M18 20H6V9h12v11z" fill="#FFFFFF"/>
      <rect x="4" y="4" width="16" height="5" fill="#1A73E8"/>
      <text x="12" y="17.5" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#1A73E8" fontFamily="sans-serif">31</text>
    </svg>
  );
}

function RazorpayLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <path d="M14.5 3L6 14.5h5.5L9.5 21 18 9.5h-5.5L14.5 3z" fill="#0C2340"/>
      <path d="M13.2 4.5L7.5 13.5h4.2l-1.8 5 6.2-8.5h-4.2l1.3-5.5z" fill="#0284C7"/>
    </svg>
  );
}

const integrations = [
  { name:"Salesforce",      category:"CRM",       logo: SalesforceLogo },
  { name:"HubSpot",         category:"CRM",       logo: HubSpotLogo },
  { name:"Zoho CRM",        category:"CRM",       logo: ZohoLogo },
  { name:"Pipedrive",       category:"CRM",       logo: PipedriveLogo },
  { name:"Google Sheets",   category:"Data",      logo: GoogleSheetsLogo },
  { name:"Slack",           category:"Comms",     logo: SlackLogo },
  { name:"Microsoft Teams", category:"Comms",     logo: TeamsLogo },
  { name:"Twilio",          category:"Calling",   logo: TwilioLogo },
  { name:"Exotel",          category:"Calling",   logo: ExotelLogo },
  { name:"WhatsApp",        category:"Messaging", logo: WhatsAppLogo },
  { name:"Google Calendar", category:"Calendar",  logo: GoogleCalendarLogo },
  { name:"Razorpay",        category:"Payments",  logo: RazorpayLogo },
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
    <section id="integrations" className="py-16 sm:py-24 border-t border-[#DDB892]/40"
      style={{
        backgroundImage: "url('/integrations-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#F5F0E8",
        backgroundAttachment: "scroll"
      }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
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
          viewport={{ once: true, amount: 0.15 }}
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4"
        >
          {integrations.map((int)=>(
            <motion.div key={int.name}
              variants={integrationCardVariants}
              whileHover={{ y: -6, scale: 1.05, transition: { duration: 0.2 } }}
              className="rounded-2xl p-3 sm:p-4 flex flex-col items-center gap-2 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-lg group"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.85)", border: "1px solid rgba(221, 184, 146, 0.5)" }}
            >
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-white shadow-xs border border-slate-200/80 transition-transform duration-200 group-hover:scale-110">
                <int.logo />
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
