// Landing page — server component. Sections are independently `"use client"`
// components, so each ships as its own lazy bundle (faster first paint).
import { Navbar }               from "@/components/landing/Navbar";
import { HeroSection }           from "@/components/landing/HeroSection";
import { TrustSection }          from "@/components/landing/TrustSection";
import { VoiceDemoSection }       from "@/components/landing/VoiceDemoSection";
import { FeaturesSection }       from "@/components/landing/FeaturesSection";
import { ComparisonSection }     from "@/components/landing/ComparisonSection";
import { HowItWorksSection }     from "@/components/landing/HowItWorksSection";
import { RoiCalculatorSection }  from "@/components/landing/RoiCalculatorSection";
import { IntegrationsSection }   from "@/components/landing/IntegrationsSection";
import { PricingSection }        from "@/components/landing/PricingSection";
import { TestimonialsSection }   from "@/components/landing/TestimonialsSection";
import { FAQSection }            from "@/components/landing/FAQSection";
import { ContactSection }        from "@/components/landing/ContactSection";
import { CTASection }            from "@/components/landing/CTASection";
import { Footer }                from "@/components/landing/Footer";
import { SmoothScrollProvider }  from "@/components/SmoothScrollProvider";

export default function HomePage() {
  return (
    <SmoothScrollProvider>
      <main className="relative text-gray-900 min-h-screen overflow-x-clip transition-colors duration-200" style={{ backgroundColor: "#F5F0E8" }}>
        <Navbar />
        <HeroSection />
        <TrustSection />
        <VoiceDemoSection />
        <FeaturesSection />
        <ComparisonSection />
        <HowItWorksSection />
        <RoiCalculatorSection />
        <IntegrationsSection />
        <PricingSection />
        <TestimonialsSection />
        <FAQSection />
        <ContactSection />
        <CTASection />
        <Footer />
      </main>
    </SmoothScrollProvider>
  );
}
