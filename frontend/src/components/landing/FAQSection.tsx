"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle, Sparkles } from "lucide-react";

interface FAQItem {
  q: string;
  a: string;
}

const faqs: FAQItem[] = [
  {
    q: "How natural does the AI voice sound? Can customers tell it's an AI?",
    a: "AgentCall AI utilizes state-of-the-art neural voice models cloned with realistic speech cadences, natural pauses, polite breathing, and authentic intonation. Over 89% of customers in live blind tests converse normally without realizing they are speaking to an autonomous AI agent."
  },
  {
    q: "Does it understand Hindi, Hinglish, and regional Indian accents?",
    a: "Yes! AgentCall AI is specifically trained on Indian speech patterns, regional colloquialisms, and mixed-language Hinglish. It fluently supports Hindi, Indian English, Tamil, Telugu, Kannada, Bengali, Marathi, Gujarati, and Punjabi with sub-300ms turn-taking."
  },
  {
    q: "What happens if a customer asks something off-script or wants a human?",
    a: "The AI agent detects complex sentiments and user requests in real time. If a customer asks to speak with a human executive or requests specialized assistance, AgentCall AI instantly triggers a live warm phone transfer to your designated support number or schedules a callback seamlessly."
  },
  {
    q: "Can I connect my own phone numbers (Twilio, Exotel, Tata, Jio)?",
    a: "Absolutely. You can bring your own SIP trunks or telephony provider credentials (Twilio, Exotel, Plivo, Tata Tele, etc.) with 1-click credential configuration, or instantly provision pre-verified local Indian DLT-compliant virtual numbers directly inside the dashboard."
  },
  {
    q: "How does CRM integration and lead syncing work?",
    a: "Every completed call is automatically transcribed, summarized, and analyzed for sentiment and qualification. The outcome (e.g., booked date, lead status, recording audio URL) is synced immediately to Salesforce, HubSpot, Zoho CRM, Google Sheets, or any custom webhook in real time."
  },
  {
    q: "Is there a free trial and do I need to enter credit card details?",
    a: "Yes! You get a 14-day free trial with complimentary call minutes to test and deploy your first voice agent. No credit card is required to create an account and start testing."
  }
];

export function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  function toggle(idx: number) {
    setOpenIdx(openIdx === idx ? null : idx);
  }

  return (
    <section id="faq" className="py-16 sm:py-24 relative overflow-hidden border-t border-[#DDB892]/40"
      style={{
        backgroundImage: "url('/integrations-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#F5F0E8"
      }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12 sm:mb-16"
        >
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold mb-5 border backdrop-blur-sm"
            style={{ background: "#F5EDE4", color: "#6F4428", borderColor: "#DDB892" }}>
            <HelpCircle className="w-3.5 h-3.5" style={{ color: "#8B5A2B" }}/>Frequently Asked Questions
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4 tracking-tight" style={{ color: "#1a1a1a" }}>
            Got Questions? <span style={{ color: "#7F5539" }}>We&apos;ve Got Answers</span>
          </h2>
          <p className="text-base sm:text-lg max-w-xl mx-auto leading-relaxed" style={{ color: "#4A5568" }}>
            Everything you need to know about getting started with AgentCall AI voice infrastructure.
          </p>
        </motion.div>

        {/* FAQ Accordion List */}
        <div className="space-y-3.5">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <motion.div
                key={faq.q}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="rounded-2xl border transition-all duration-200 shadow-xs overflow-hidden"
                style={{
                  background: isOpen ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 0.75)",
                  borderColor: isOpen ? "rgba(139, 90, 43, 0.4)" : "rgba(221, 184, 146, 0.45)"
                }}
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-slate-900 focus:outline-hidden"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-[#8B5A2B] font-mono text-xs sm:text-sm font-bold opacity-80">
                      0{idx + 1}
                    </span>
                    <span>{faq.q}</span>
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex-shrink-0 text-[#8B5A2B]"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
