import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppProviders } from "@/components/AppProviders";
import { CookieConsent } from "@/components/CookieConsent";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://agentcall.ai";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "AgentCall AI — Hire Autonomous AI Voice Employees That Work 24/7",
    template: "%s | AgentCall AI",
  },
  description:
    "Deploy autonomous AI Telecallers, Recruiters, Receptionists and Sales Agents in minutes. Sub-300ms latency, native Hinglish fluency, 100% TRAI & DLT compliant.",
  keywords: [
    "AI calling agent",
    "AI telecaller",
    "AI recruiter",
    "voice AI",
    "AI workforce",
    "call center automation",
    "conversational voice AI",
    "outbound sales AI caller",
    "inbound receptionist AI",
    "TRAI compliant calling",
    "Hinglish AI voice agent",
    "automated EMI collection agent",
  ],
  authors: [{ name: "AgentCall AI Technologies Pvt. Ltd." }],
  creator: "AgentCall AI",
  publisher: "AgentCall AI",
  category: "technology",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: baseUrl,
    title: "AgentCall AI — Hire AI Employees That Work 24/7",
    description: "Deploy AI Agents that make calls, qualify leads and book appointments automatically with human-like conversation.",
    siteName: "AgentCall AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "AgentCall AI — Autonomous Conversational Voice Infrastructure",
    description: "Deploy AI Agents that make calls, qualify leads and close outcomes 24/7.",
    creator: "@agentcallai",
  },
};

export const viewport: Viewport = {
  themeColor: "#7c3f1d",
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${baseUrl}/#organization`,
      name: "AgentCall AI Technologies Pvt. Ltd.",
      url: baseUrl,
      logo: `${baseUrl}/icon.png`,
      sameAs: [
        "https://twitter.com/agentcallai",
        "https://linkedin.com/company/agentcallai",
        "https://github.com/agentcallai",
      ],
      contactPoint: [
        {
          "@type": "ContactPoint",
          telephone: "+91-80-4719-2300",
          contactType: "customer service",
          email: "support@agentcall.ai",
          areaServed: "IN",
          availableLanguage: ["English", "Hindi"],
        },
      ],
      address: {
        "@type": "PostalAddress",
        streetAddress: "4th Block, 100 Feet Rd, Koramangala",
        addressLocality: "Bengaluru",
        addressRegion: "Karnataka",
        postalCode: "560034",
        addressCountry: "IN",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${baseUrl}/#software`,
      name: "AgentCall AI",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Cloud, Telephony",
      description:
        "Autonomous conversational voice AI infrastructure for sales, customer support, recruitment, and EMI collections.",
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.9",
        ratingCount: "1140",
        bestRating: "5",
        worstRating: "1",
      },
      offers: {
        "@type": "Offer",
        price: "1.50",
        priceCurrency: "INR",
        description: "Autonomous AI Telephony starting at ₹1.50 per qualified call",
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} ${mono.variable} min-h-screen bg-page text-slate-900 dark:text-white antialiased transition-colors duration-200`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <AppProviders>
            {children}
            <CookieConsent />
          </AppProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
