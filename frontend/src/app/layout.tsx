import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppProviders } from "@/components/AppProviders";

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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${mono.variable} min-h-screen bg-white dark:bg-[#0c0102] text-gray-900 dark:text-white antialiased transition-colors duration-200`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AppProviders>{children}</AppProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
