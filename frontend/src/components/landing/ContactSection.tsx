"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send, CheckCircle2, Clock, Sparkles } from "lucide-react";

export function ContactSection() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    volume: "5,000 - 25,000 calls/mo",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;
    setSubmitted(true);
  };

  return (
    <section
      id="contact"
      className="py-16 sm:py-24 relative overflow-hidden border-t border-[#DDB892]/40"
      style={{
        backgroundImage: "url('/howitworks-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#F5F0E8",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12 sm:mb-16"
        >
          <span
            className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold mb-5 border backdrop-blur-sm"
            style={{ background: "#F5EDE4", color: "#6F4428", borderColor: "#DDB892" }}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: "#8B5A2B" }} />
            Direct Enterprise Consultation
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4 tracking-tight" style={{ color: "#1a1a1a" }}>
            Ready to Speak with a <span style={{ color: "#7F5539" }}>Voice Architect?</span>
          </h2>
          <p className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: "#4A5568" }}>
            Schedule a customized live demo, discuss telecom volume pricing, or test a custom voice agent built specifically for your business.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-8 items-start max-w-6xl mx-auto">

          {/* Left Column: Direct Contact Info & SLA */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-5 rounded-3xl p-7 sm:p-9 border shadow-lg space-y-7"
            style={{
              background: "rgba(255, 255, 255, 0.9)",
              borderColor: "rgba(221, 184, 146, 0.6)",
              boxShadow: "0 10px 30px rgba(140, 90, 50, 0.06)",
            }}
          >
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Get in Touch Directly</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Our voice engineers and solution architects in Bengaluru respond within 15 minutes during business hours.
              </p>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <a
                href="mailto:sales@agentcall.ai"
                className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#F5EDE4]/50 border border-[#DDB892]/40 hover:bg-[#F5EDE4] transition-colors group"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-xs"
                  style={{ background: "linear-gradient(135deg, #B08968 0%, #8B5A2B 50%, #6F4428 100%)" }}
                >
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 group-hover:text-[#8B5A2B] transition-colors">sales@agentcall.ai</p>
                  <p className="text-[11px] text-slate-500">For enterprise contracts & API keys</p>
                </div>
              </a>

              <a
                href="tel:+918047192300"
                className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#F5EDE4]/50 border border-[#DDB892]/40 hover:bg-[#F5EDE4] transition-colors group"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-xs"
                  style={{ background: "linear-gradient(135deg, #B08968 0%, #8B5A2B 50%, #6F4428 100%)" }}
                >
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 group-hover:text-[#8B5A2B] transition-colors">+91 80 4719 2300</p>
                  <p className="text-[11px] text-slate-500">Direct Telephony Support Hotline</p>
                </div>
              </a>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-xs"
                  style={{ background: "linear-gradient(135deg, #B08968 0%, #8B5A2B 50%, #6F4428 100%)" }}
                >
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Headquarters</p>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    4th Block, 100 Feet Rd, Koramangala, Bengaluru, Karnataka 560034
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Telephony Support
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> 24/7 Operations
              </span>
            </div>
          </motion.div>

          {/* Right Column: Contact Inquiry Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 rounded-3xl p-7 sm:p-9 border shadow-lg"
            style={{
              background: "rgba(255, 255, 255, 0.9)",
              borderColor: "rgba(221, 184, 146, 0.6)",
              boxShadow: "0 10px 30px rgba(140, 90, 50, 0.06)",
            }}
          >
            {submitted ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900">Inquiry Received!</h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  Thank you, <strong>{formData.name}</strong>. A voice solutions engineer has been assigned and will reach out to <strong>{formData.email}</strong> shortly.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-4 px-5 py-2 rounded-xl text-xs font-bold text-[#8B5A2B] bg-[#F5EDE4] border border-[#DDB892] hover:bg-[#ebdccf] transition-colors"
                >
                  Send another inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Your Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-hidden focus:border-[#8B5A2B] focus:ring-1 focus:ring-[#8B5A2B]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Work Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="rahul@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-hidden focus:border-[#8B5A2B] focus:ring-1 focus:ring-[#8B5A2B]"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-hidden focus:border-[#8B5A2B] focus:ring-1 focus:ring-[#8B5A2B]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Company Name</label>
                    <input
                      type="text"
                      placeholder="e.g. FinCorp Tech"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-hidden focus:border-[#8B5A2B] focus:ring-1 focus:ring-[#8B5A2B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Estimated Monthly Call Volume</label>
                  <select
                    value={formData.volume}
                    onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-hidden focus:border-[#8B5A2B]"
                  >
                    <option value="Under 5,000 calls/mo">Under 5,000 calls/mo</option>
                    <option value="5,000 - 25,000 calls/mo">5,000 - 25,000 calls/mo</option>
                    <option value="25,000 - 100,000 calls/mo">25,000 - 100,000 calls/mo</option>
                    <option value="100,000+ calls/mo">100,000+ calls/mo (Enterprise Custom)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">How can we help you?</label>
                  <textarea
                    rows={3}
                    placeholder="Describe your use case (e.g., automated EMI recovery, inbound lead qualification, regional language models)..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-hidden focus:border-[#8B5A2B] focus:ring-1 focus:ring-[#8B5A2B]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-white shadow-lg transition-all duration-200 hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #B08968 0%, #8B5A2B 50%, #6F4428 100%)" }}
                >
                  <Send className="w-4 h-4" /> Submit Inquiry & Request Architecture Call
                </button>
              </form>
            )}
          </motion.div>

        </div>
      </div>
    </section>
  );
}
