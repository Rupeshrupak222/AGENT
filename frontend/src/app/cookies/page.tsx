import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Cookie, Shield, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "Learn how AgentCall AI uses cookies and tracking technologies to deliver reliable voice telemetry and personalized experiences.",
};

export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen relative py-16 sm:py-24 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: "#F5F0E8" }}>
      {/* Background Texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: "url('/howitworks-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#8B5A2B] hover:text-[#6F4428] mb-8 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Back to Home
        </Link>

        {/* Header Card */}
        <div
          className="rounded-3xl p-8 sm:p-12 border shadow-lg mb-10"
          style={{
            background: "rgba(255, 255, 255, 0.92)",
            borderColor: "rgba(221, 184, 146, 0.6)",
            boxShadow: "0 10px 30px rgba(140, 90, 50, 0.06)",
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
              style={{ background: "linear-gradient(135deg, #B08968 0%, #8B5A2B 50%, #6F4428 100%)" }}
            >
              <Cookie className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#8B5A2B]">Legal & Privacy</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Cookie Policy
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Effective Date: September 1, 2026 · Last Updated: September 9, 2026
          </p>
        </div>

        {/* Content Body */}
        <div
          className="rounded-3xl p-8 sm:p-12 border shadow-lg space-y-10 text-slate-700 leading-relaxed"
          style={{
            background: "rgba(255, 255, 255, 0.92)",
            borderColor: "rgba(221, 184, 146, 0.6)",
            boxShadow: "0 10px 30px rgba(140, 90, 50, 0.06)",
          }}
        >
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">1. Introduction</h2>
            <p className="text-sm">
              This Cookie Policy explains how <strong>AgentCall AI</strong> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) uses cookies and similar tracking technologies when you visit our website at agentcall.ai, access our web portal, or interact with our autonomous voice communication APIs.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">2. What are Cookies?</h2>
            <p className="text-sm">
              Cookies are small data files placed on your computer or mobile device when you visit a website. They are widely used by online service providers to enable website operation, preserve authentication sessions, enhance navigation speed, and provide analytics data.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">3. Categories of Cookies We Use</h2>

            <div className="grid gap-4 mt-4">
              <div className="p-5 rounded-2xl bg-[#F5EDE4]/60 border border-[#DDB892]/60">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#8B5A2B]" />
                  Strictly Necessary / Essential Cookies
                </div>
                <p className="text-xs text-slate-600 leading-normal">
                  Required for the technical operation of our application. They enable user logins, JWT session validation, role-based access to your agent dashboard, and CSRF protection. Without these, core features cannot function.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-1.5">
                  <Shield className="w-4 h-4 text-[#8B5A2B]" />
                  Performance & Telephony Analytics Cookies
                </div>
                <p className="text-xs text-slate-600 leading-normal">
                  Measure call latency, browser WebRTC stability, error diagnostics, and feature usage patterns. These cookies do not store voice transcripts or personal financial details.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-1.5">
                  <Cookie className="w-4 h-4 text-[#8B5A2B]" />
                  Functional & Preference Cookies
                </div>
                <p className="text-xs text-slate-600 leading-normal">
                  Remember your UI preferences such as audio player volume, preferred language filter in live demos, and dark/light mode states.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">4. How to Manage and Disable Cookies</h2>
            <p className="text-sm">
              You have the right to choose whether to accept or decline cookies. You can adjust your preferences at any time using our on-page cookie consent manager or directly within your browser settings (Chrome, Safari, Firefox, Edge). Please note that disabling essential cookies will prevent access to the AgentCall AI administrative dashboard.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">5. Contact Our Privacy Office</h2>
            <p className="text-sm">
              If you have any questions regarding this Cookie Policy or our telemetry practices, please contact our Data Protection Officer at:
            </p>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <p><strong>Email:</strong> privacy@agentcall.ai</p>
              <p><strong>Address:</strong> AgentCall AI Technologies Pvt. Ltd., 4th Block, Koramangala, Bengaluru, Karnataka 560034</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
