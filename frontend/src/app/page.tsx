// Landing page — server component. Sections are independently `"use client"`
// components, so each ships as its own lazy bundle (faster first paint).
import dynamic from "next/dynamic";
import { Navbar }             from "@/components/landing/Navbar";
import { HeroSection }         from "@/components/landing/HeroSection";

const TrustSection        = dynamic(() => import("@/components/landing/TrustSection").then(m => m.TrustSection),        { loading: () => null });
const FeaturesSection     = dynamic(() => import("@/components/landing/FeaturesSection").then(m => m.FeaturesSection),     { loading: () => null });
const HowItWorksSection   = dynamic(() => import("@/components/landing/HowItWorksSection").then(m => m.HowItWorksSection),   { loading: () => null });
const PricingSection      = dynamic(() => import("@/components/landing/PricingSection").then(m => m.PricingSection),      { loading: () => null });
const IntegrationsSection = dynamic(() => import("@/components/landing/IntegrationsSection").then(m => m.IntegrationsSection), { loading: () => null });
const CTASection          = dynamic(() => import("@/components/landing/CTASection").then(m => m.CTASection),          { loading: () => null });
const Footer              = dynamic(() => import("@/components/landing/Footer").then(m => m.Footer),              { loading: () => null });

export default function HomePage() {
  return (
    <main className="relative bg-white dark:bg-[#0c0102] text-gray-900 dark:text-white min-h-screen overflow-x-hidden transition-colors duration-200">
      <Navbar />
      <HeroSection />
      <TrustSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <IntegrationsSection />
      <CTASection />
      <Footer />
    </main>
  );
}
