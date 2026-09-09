"use client";
import { motion } from "framer-motion";
import { Star, Quote, Building2, GraduationCap, Landmark, ShieldCheck } from "lucide-react";

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
  industry: string;
  icon: any;
  metricBadge: string;
  metricSub: string;
  avatarColor: string;
}

const testimonials: Testimonial[] = [
  {
    quote: "AgentCall AI reaches out to property leads within 45 seconds of website form submission. Our site visit bookings tripled in the first 30 days, while cutting call center overhead by ₹3.8 Lakhs/month.",
    author: "Rohan Verma",
    role: "VP of Sales & Growth",
    company: "Apex Reality & PropTiger Partner",
    industry: "Real Estate",
    icon: Building2,
    metricBadge: "+340% Site Visits",
    metricSub: "Lead response dropped from 2 hrs to 45s",
    avatarColor: "#8B5A2B"
  },
  {
    quote: "Our admission team was overwhelmed during national board results season. AgentCall's AI Counselor handled 18,000 inquiries in natural Hinglish with sub-300ms latency. Zero dropped calls.",
    author: "Dr. Megha Sethi",
    role: "Head of Student Counseling",
    company: "CareerNest Academy",
    industry: "EdTech & Education",
    icon: GraduationCap,
    metricBadge: "18,000+ Inquiries",
    metricSub: "Zero human counselor burnout",
    avatarColor: "#B08968"
  },
  {
    quote: "The conversational tone is remarkably polite yet persistent. Our EMI recovery increased by 82% without irritating borrowers, and payment links are auto-dispatched via WhatsApp instantly.",
    author: "Ankit Mehta",
    role: "Chief Risk & Collections Officer",
    company: "FinCorp Lending",
    industry: "Fintech & NBFC",
    icon: Landmark,
    metricBadge: "82% EMI Recovery",
    metricSub: "68% reduction in collection costs",
    avatarColor: "#6F4428"
  }
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-16 sm:py-24 relative overflow-hidden border-t border-[#DDB892]/40"
      style={{
        backgroundImage: "url('/agents-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#F5F0E8"
      }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12 sm:mb-16"
        >
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold mb-5 border backdrop-blur-sm"
            style={{ background: "#F5EDE4", color: "#6F4428", borderColor: "#DDB892" }}>
            <Quote className="w-3.5 h-3.5" style={{ color: "#8B5A2B" }}/>Customer Success Stories
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4 tracking-tight" style={{ color: "#1a1a1a" }}>
            Loved by <span style={{ color: "#7F5539" }}>Fast-Growing Teams</span>
          </h2>
          <p className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: "#4A5568" }}>
            Discover how leading enterprises automate customer calling, qualify leads, and scale conversions with zero downtime.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => {
            const Icon = t.icon;
            return (
              <motion.div
                key={t.author}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="rounded-3xl p-6 sm:p-7 border shadow-lg flex flex-col justify-between transition-all duration-300 backdrop-blur-sm"
                style={{
                  background: "rgba(255, 255, 255, 0.88)",
                  borderColor: "rgba(221, 184, 146, 0.5)",
                  boxShadow: "0 10px 32px 0 rgba(140, 90, 50, 0.07)"
                }}
              >
                <div>
                  {/* Metric Ribbon Badge */}
                  <div className="flex items-center justify-between gap-2 mb-5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white shadow-xs"
                      style={{ background: "linear-gradient(135deg, #B08968 0%, #8B5A2B 50%, #6F4428 100%)" }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {t.metricBadge}
                    </span>
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                  </div>

                  {/* Quote text */}
                  <p className="text-xs sm:text-sm leading-relaxed text-slate-700 italic mb-6">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                </div>

                {/* Author Info */}
                <div className="pt-5 border-t border-slate-200/80 flex items-center gap-3.5">
                  <div
                    className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-xs"
                    style={{ background: t.avatarColor }}
                  >
                    {t.author.slice(0, 1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold text-slate-900">{t.author}</h4>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <p className="text-xs text-slate-500">{t.role}</p>
                    <p className="text-[11px] font-semibold text-[#8B5A2B]">{t.company}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
