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
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled || mobileOpen
          ? "bg-page/85 backdrop-blur-md border-b border-slate-200/80 dark:border-white/[0.08] shadow-sm"
          : "bg-transparent border-b border-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 bg-blue-600 shadow-sm shadow-blue-500/20">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              AgentCall <span className="text-blue-600 dark:text-blue-400">AI</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(l => (
              <a key={l.label} href={l.href} onClick={e=>anchor(e,l.href)}
                className="px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all duration-150 cursor-pointer text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login"
              className="px-3.5 py-2 text-sm font-medium rounded-lg transition-all text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05]"
            >
              Sign In
            </Link>
            <Link href="/signup"
              className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-500 active:scale-[0.99] shadow-sm transition-all"
            >
              Start Free Trial
            </Link>
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <button onClick={()=>setMobileOpen(!mobileOpen)}
              className="p-2 rounded-lg transition-all text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
            >
              {mobileOpen ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="bg-page/95 backdrop-blur-xl border-b border-slate-200 dark:border-white/[0.08]">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map(l=>(
              <a key={l.label} href={l.href} onClick={e=>anchor(e,l.href)}
                className="block px-4 py-2.5 text-sm rounded-lg transition-all cursor-pointer text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white"
              >{l.label}</a>
            ))}
            <div className="pt-3 flex flex-col gap-2 border-t border-slate-200 dark:border-white/[0.08]">
              <Link href="/login" onClick={()=>setMobileOpen(false)}
                className="w-full py-2.5 text-center text-sm font-medium rounded-lg transition-all text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10"
              >
                Sign In
              </Link>
              <Link href="/signup" onClick={()=>setMobileOpen(false)}
                className="w-full py-2.5 text-center text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-500 shadow-sm"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
