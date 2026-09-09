"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, useScroll, useSpring } from "framer-motion";
import { Menu, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Features",     href: "#features"     },
  { label: "Voice Demo",   href: "#demo"         },
  { label: "How It Works", href: "#how-it-works"  },
  { label: "Savings",      href: "#calculator"   },
  { label: "Pricing",      href: "#pricing"       },
  { label: "FAQ",          href: "#faq"           },
  { label: "Contact",      href: "#contact"       },
];

export function Navbar() {
  const [scrolled,   setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  function anchor(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (href.startsWith("#")) {
      e.preventDefault();
      const target = document.getElementById(href.slice(1));
      if (target) {
        const navOffset = 90;
        const targetTop = target.getBoundingClientRect().top + window.scrollY - navOffset;
        window.scrollTo({
          top: targetTop,
          behavior: "smooth"
        });
      }
      setMobileOpen(false);
    }
  }

  return (
    <>
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[3px] z-[100] origin-left pointer-events-none"
        style={{
          scaleX,
          background: "linear-gradient(90deg, #B08968 0%, #8B5A2B 50%, #6F4428 100%)",
          boxShadow: "0 0 10px rgba(139, 90, 43, 0.45)"
        }}
      />

      <header className="fixed top-3 sm:top-5 inset-x-0 z-50 flex flex-col items-center px-3 sm:px-6 pointer-events-none">
        {/* iPhone Curved Glass Capsule */}
        <motion.nav
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
          "pointer-events-auto w-full max-w-6xl h-14 sm:h-16 px-3 sm:px-5 lg:px-6 rounded-full transition-all duration-300",
          "flex items-center justify-between",
          "backdrop-blur-md border",
          scrolled
            ? "bg-white/15 dark:bg-white/[0.07] border-white/25 dark:border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.2)]"
            : "bg-white/[0.04] dark:bg-white/[0.03] border-white/20 dark:border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.15)]"
        )}
        style={{
          WebkitBackdropFilter: "blur(10px)",
        }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-sm shadow-[#8B5A2B]/30 flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #B08968 0%, #8B5A2B 50%, #6F4428 100%)" }}
          >
            <Zap className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            AgentCall <span style={{ color: "#7F5539" }}>AI</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-0.5 lg:gap-1">
          {navLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={(e) => anchor(e, l.href)}
              className="px-2.5 lg:px-3.5 py-1.5 text-xs lg:text-sm font-semibold rounded-full transition-all duration-200 cursor-pointer text-slate-700 hover:text-black hover:bg-black/[0.04] whitespace-nowrap flex-shrink-0"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-1.5 lg:gap-2.5 flex-shrink-0">
          <Link
            href="/login"
            className="px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-semibold rounded-full transition-all duration-200 text-slate-800 hover:text-black hover:bg-black/[0.04] whitespace-nowrap flex-shrink-0"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="px-3.5 lg:px-5 py-1.5 lg:py-2 text-xs lg:text-sm font-semibold text-white rounded-full transition-all duration-200 shadow-sm shadow-[#8B5A2B]/30 hover:brightness-105 active:scale-[0.97] whitespace-nowrap flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #B08968 0%, #8B5A2B 50%, #6F4428 100%)" }}
          >
            Start Free Trial
          </Link>
        </div>

        {/* Mobile hamburger */}
        <div className="flex md:hidden items-center gap-1.5">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-full transition-all text-slate-800 hover:bg-black/5"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        </motion.nav>

      {/* Mobile drawer (iPhone rounded card) */}
      {mobileOpen && (
        <div
          className="pointer-events-auto w-full max-w-sm mt-2 p-4 rounded-[28px] backdrop-blur-2xl bg-white/85 dark:bg-[#140b07]/85 border border-white/60 dark:border-white/15 shadow-2xl transition-all duration-300 space-y-1"
          style={{ WebkitBackdropFilter: "blur(24px)" }}
        >
          {navLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={(e) => anchor(e, l.href)}
              className="block px-4 py-2.5 text-sm font-semibold rounded-2xl transition-all cursor-pointer text-slate-800 hover:text-black hover:bg-black/[0.05]"
            >
              {l.label}
            </a>
          ))}
          <div className="pt-3 flex flex-col gap-2 border-t border-slate-200/60 dark:border-white/10">
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="w-full py-2.5 text-center text-sm font-semibold rounded-full transition-all text-slate-800 border border-slate-300/80 hover:bg-black/5"
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
    </>
  );
}
