import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AgentCall AI — Hire AI Employees That Work 24/7",
    template: "%s | AgentCall AI",
  },
  description:
    "Deploy AI Telecallers, Recruiters, Receptionists and Sales Agents in minutes. Reduce costs, increase conversions and automate business operations.",
  keywords: ["AI calling agent","AI telecaller","AI recruiter","voice AI","AI workforce","call center automation"],
  authors: [{ name: "AgentCall AI" }],
  openGraph: {
    type: "website",
    locale: "en_IN",
    title: "AgentCall AI — Hire AI Employees That Work 24/7",
    description: "Deploy AI Agents that make calls, qualify leads and book appointments automatically.",
    siteName: "AgentCall AI",
  },
  twitter: { card: "summary_large_image", title: "AgentCall AI", creator: "@agentcallai" },
};

export const viewport: Viewport = {
  themeColor: "#f83232",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
