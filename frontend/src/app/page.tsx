// Landing page — server component. Sections are independently `"use client"`
// components, so each ships as its own lazy bundle (faster first paint).
import { Navbar }             from "@/components/landing/Navbar";
import { HeroSection }         from "@/components/landing/HeroSection";
import { TrustSection }        from "@/components/landing/TrustSection";
import { FeaturesSection }     from "@/components/landing/FeaturesSection";
import { HowItWorksSection }   from "@/components/landing/HowItWorksSection";
import { PricingSection }      from "@/components/landing/PricingSection";
import { IntegrationsSection } from "@/components/landing/IntegrationsSection";
import { CTASection }          from "@/components/landing/CTASection";
import { Footer }              from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <main className="relative bg-page text-gray-900 dark:text-white min-h-screen overflow-x-hidden transition-colors duration-200">
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
