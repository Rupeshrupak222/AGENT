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
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white border-b border-slate-200 shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 bg-gradient-to-br from-brand-500 to-brand-700 shadow-md shadow-brand-500/30">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-lg font-bold text-black">
              AgentCall <span style={{ color: "#8B0000" }}>AI</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map(l => (
              <a key={l.label} href={l.href} onClick={e=>anchor(e,l.href)}
                className="px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 cursor-pointer text-black hover:bg-slate-100 hover:text-black"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login"
              className="px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 text-black border border-black/30 bg-black/5 hover:bg-black/10 hover:border-black/50"
            >
              Sign In
            </Link>
            <Link href="/signup" className="btn-red text-sm px-5 py-2 h-9 rounded-xl">
              Start Free Trial
            </Link>
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <button onClick={()=>setMobileOpen(!mobileOpen)}
              className="p-2 rounded-xl transition-all text-black hover:bg-slate-100"
            >
              {mobileOpen ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="bg-page backdrop-blur-xl border-b border-slate-200">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map(l=>(
              <a key={l.label} href={l.href} onClick={e=>anchor(e,l.href)}
                className="block px-4 py-3 text-sm rounded-xl transition-all cursor-pointer text-black hover:bg-slate-100 hover:text-black"
              >{l.label}</a>
            ))}
            <div className="pt-3 flex flex-col gap-2 border-t border-slate-200">
              <Link href="/login" onClick={()=>setMobileOpen(false)}
                className="w-full py-3 text-center text-sm font-semibold rounded-xl transition-all text-black border border-black/30 bg-black/5"
              >
                Sign In
              </Link>
              <Link href="/signup" onClick={()=>setMobileOpen(false)}
                className="w-full py-3 text-center text-sm font-semibold text-white rounded-xl transition-all bg-gradient-to-br from-brand-500 to-brand-700 shadow-md shadow-brand-500/25"
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
