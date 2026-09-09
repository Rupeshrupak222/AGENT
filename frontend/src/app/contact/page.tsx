import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Phone, Mail, MapPin } from "lucide-react";
import { ContactSection } from "@/components/landing/ContactSection";

export const metadata: Metadata = {
  title: "Contact Us & Enterprise Sales",
  description: "Get in touch with AgentCall AI's voice engineering and sales team in Bengaluru. Request custom voice model demonstrations and enterprise volume pricing.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen relative py-12 sm:py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: "#F5F0E8" }}>
      {/* Background Texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: "url('/howitworks-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <div className="max-w-6xl mx-auto relative z-10 mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#8B5A2B] hover:text-[#6F4428] mb-6 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Back to Home
        </Link>
      </div>

      <ContactSection />
    </main>
  );
}
