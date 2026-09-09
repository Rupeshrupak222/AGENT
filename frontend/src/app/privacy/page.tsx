import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Shield, Lock, Database, EyeOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Learn how AgentCall AI protects and processes customer call data, voice recordings, and enterprise telephony information under GDPR and India DPDP Act 2023.",
};

export default function PrivacyPolicyPage() {
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
              <Shield className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#8B5A2B]">Data Privacy</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Effective Date: September 1, 2026 · Last Updated: September 9, 2026 · Compliant with India DPDP Act 2023 & GDPR
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
            <h2 className="text-xl font-bold text-slate-900">1. Overview and Commitment</h2>
            <p className="text-sm">
              At <strong>AgentCall AI</strong> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;), we recognize that business conversations contain sensitive corporate and customer information. We operate on a strict principle: <strong>your customer conversations belong to you</strong>. We do not sell your personal data or voice recordings to third parties.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">2. Information We Process</h2>

            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-1">
                  <Database className="w-4 h-4 text-[#8B5A2B]" />
                  Telephony & Call Data
                </div>
                <p className="text-xs text-slate-600">
                  Phone numbers dialed, call duration, latency metrics, audio recordings (WAV/MP3), and AI-generated textual transcripts.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-1">
                  <Lock className="w-4 h-4 text-[#8B5A2B]" />
                  CRM & Contact Fields
                </div>
                <p className="text-xs text-slate-600">
                  Customer names, lead stages, follow-up appointment dates, and custom CRM attributes synced via webhooks or native integrations.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">3. Automatic PII Redaction & Data Minimization</h2>
            <div className="p-5 rounded-2xl bg-[#F5EDE4]/60 border border-[#DDB892]/60">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-2">
                <EyeOff className="w-4 h-4 text-[#8B5A2B]" />
                Zero-Cavesdropping Guarantee & Automated PII Masking
              </div>
              <p className="text-xs text-slate-600 leading-normal">
                Our speech processing engine includes automated scrubbing of sensitive credentials such as credit card numbers, OTPs, Aadhaar numbers, and PAN details from written transcripts before persistent storage.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">4. Data Retention & Deletion Rights</h2>
            <p className="text-sm">
              By default, audio recordings are preserved for 90 days for quality assurance and training, after which they are permanently purged unless custom retention policies are configured in your enterprise workspace settings. You may request total data deletion at any time via your dashboard or by emailing our privacy team.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">5. Sub-processors & Infrastructure Partners</h2>
            <p className="text-sm">
              We partner exclusively with certified infrastructure providers:
            </p>
            <ul className="text-xs space-y-1.5 list-disc pl-5 text-slate-600">
              <li><strong>Cloud & Compute:</strong> Google Cloud Platform (Mumbai & Delhi regions) & AWS India.</li>
              <li><strong>Licensed Telephony Carriers:</strong> Exotel, Twilio, and Tata Telecommunications.</li>
              <li><strong>Database & Storage:</strong> Encrypted PostgreSQL with AES-256 keys managed via Cloud KMS.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">6. Privacy Inquiries & Grievance Officer</h2>
            <p className="text-sm">
              Pursuant to the Information Technology Act 2000 and DPDP Act 2023, the contact details for our Grievance Redressal Officer are:
            </p>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <p><strong>Grievance Officer:</strong> Data Protection & Security Team</p>
              <p><strong>Email:</strong> privacy@agentcall.ai / grievance@agentcall.ai</p>
              <p><strong>HQ:</strong> 4th Block, Koramangala, Bengaluru, Karnataka 560034</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
