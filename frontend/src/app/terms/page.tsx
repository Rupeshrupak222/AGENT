import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Review the Terms of Service governing the use of AgentCall AI's autonomous voice workforce platform.",
};

export default function TermsOfServicePage() {
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
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#8B5A2B]">Legal Agreement</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Terms of Service
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
            <h2 className="text-xl font-bold text-slate-900">1. Acceptance of Terms</h2>
            <p className="text-sm">
              By registering for, accessing, or utilizing the <strong>AgentCall AI</strong> platform (&ldquo;Service&rdquo;), provided by AgentCall AI Technologies Pvt. Ltd., you agree to be bound by these Terms of Service. If you are entering into this agreement on behalf of a company, you represent that you possess legal authority to bind that entity.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">2. Autonomous AI Voice Platform Description</h2>
            <p className="text-sm">
              AgentCall AI delivers autonomous conversational intelligence systems, voice synthesize APIs, telephony routing, automatic call dispatchers, and CRM integration tools. You acknowledge that voice interactions are conducted by artificial intelligence models configured with specific scripts, goals, and knowledge bases provided by your organization.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">3. Telephony & TRAI / DLT Regulatory Compliance</h2>
            <p className="text-sm">
              You agree to strictly comply with all applicable telecommunication regulations, including the <strong>Telecom Commercial Communications Customer Preference Regulations (TCCCPR)</strong> administered by TRAI in India:
            </p>
            <ul className="space-y-2 text-xs sm:text-sm list-none pl-1">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Outbound calling campaigns must scrub numbers against national Do Not Disturb (DND) registries unless explicit prior consent exists.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Calls may only be placed during permissible regulatory calling windows (typically 09:00 AM to 09:00 PM local recipient time).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Misleading caller ID spoofing, fraudulent collection practices, or abusive call volumes are strictly prohibited and result in immediate account termination.</span>
              </li>
            </ul>
          </section>

          <section id="security" className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">4. Data Ownership, Transcripts & SOC2 Security</h2>
            <p className="text-sm">
              You retain all right, title, and interest in your customer call recordings, transcripts, and CRM data. AgentCall AI does not sell your customer data. All audio streams and data at rest are encrypted via 256-bit AES, and systems operate under SOC2 Type II compliant enterprise security protocols.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">5. Billing, Credits & Subscription Plans</h2>
            <p className="text-sm">
              Subscription tiers (Starter, Growth, Scale) are billed in advance on a monthly or annual cadence. Usage credits (per-minute or per-call telephony charges) are deducted from your prepaid balance. Unused telephony credits roll over according to your active plan rules. Refunds for consumed audio processing or completed carrier minutes are not permitted.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">6. Service Level Agreement (SLA)</h2>
            <p className="text-sm">
              AgentCall AI targets a <strong>99.99% monthly telephony uptime</strong> and sub-350ms conversational response latency. Scheduled maintenance windows will be communicated at least 48 hours in advance through status notifications.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">7. Governing Law & Jurisdiction</h2>
            <p className="text-sm">
              These Terms shall be governed by and construed in accordance with the laws of the Republic of India. Any disputes arising out of these Terms shall be subject to the exclusive jurisdiction of the courts located in Bengaluru, Karnataka.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
