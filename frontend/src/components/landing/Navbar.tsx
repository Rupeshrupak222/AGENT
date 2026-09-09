"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Features",     href: "#features"     },
  { label: "How It Works", href: "#how-it-works"  },
  { label: "Pricing",      href: "#pricing"       },
  { label: "Integrations", href: "#integrations"  },
];

export function Navbar() {
  const [scrolled,   setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  function anchor(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (href.startsWith("#")) {
      e.preventDefault();
      document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
      setMobileOpen(false);
    }
  }

  return (
    <header className="fixed top-3 sm:top-5 inset-x-0 z-50 flex flex-col items-center px-3 sm:px-6 pointer-events-none">
      {/* iPhone Curved Glass Capsule */}
      <nav
        className={cn(
          "pointer-events-auto w-full max-w-5xl h-14 sm:h-16 px-4 sm:px-6 rounded-full transition-all duration-300",
          "flex items-center justify-between",
          "backdrop-blur-xl border",
          scrolled
            ? "bg-white/80 dark:bg-[#140b07]/80 border-white/60 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.10),inset_0_1px_1px_rgba(255,255,255,0.8)]"
            : "bg-white/65 dark:bg-[#140b07]/60 border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.7)]"
        )}
        style={{
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-sm shadow-[#8B5A2B]/30"
            style={{ background: "linear-gradient(135deg, #B08968 0%, #8B5A2B 50%, #6F4428 100%)" }}
          >
            <Zap className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            AgentCall <span style={{ color: "#7F5539" }}>AI</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={(e) => anchor(e, l.href)}
              className="px-4 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all duration-200 cursor-pointer text-slate-700 hover:text-black dark:text-slate-200 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-2.5">
          <Link
            href="/login"
            className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-full transition-all duration-200 text-slate-800 dark:text-slate-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2 text-xs sm:text-sm font-semibold text-white rounded-full transition-all duration-200 shadow-sm shadow-[#8B5A2B]/30 hover:brightness-105 active:scale-[0.97]"
            style={{ background: "linear-gradient(135deg, #B08968 0%, #8B5A2B 50%, #6F4428 100%)" }}
          >
            Start Free Trial
          </Link>
        </div>

        {/* Mobile hamburger */}
        <div className="flex md:hidden items-center gap-1.5">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-full transition-all text-slate-800 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer (iPhone rounded card) */}
      {mobileOpen && (
        <div
          className="pointer-events-auto w-full max-w-sm mt-2 p-4 rounded-[28px] backdrop-blur-2xl bg-white/90 dark:bg-[#140b07]/90 border border-white/60 dark:border-white/10 shadow-2xl transition-all duration-300 space-y-1"
          style={{ WebkitBackdropFilter: "blur(24px)" }}
        >
          {navLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={(e) => anchor(e, l.href)}
              className="block px-4 py-2.5 text-sm font-medium rounded-2xl transition-all cursor-pointer text-slate-800 dark:text-slate-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
            >
              {l.label}
            </a>
          ))}
          <div className="pt-3 flex flex-col gap-2 border-t border-slate-200/60 dark:border-white/10">
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="w-full py-2.5 text-center text-sm font-semibold rounded-full transition-all text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 hover:bg-black/5"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileOpen(false)}
              className="w-full py-2.5 text-center text-sm font-semibold text-white rounded-full transition-all shadow-md shadow-[#8B5A2B]/25"
              style={{ background: "linear-gradient(135deg, #B08968 0%, #8B5A2B 50%, #6F4428 100%)" }}
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
