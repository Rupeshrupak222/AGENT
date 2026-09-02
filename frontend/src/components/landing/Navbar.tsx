"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

const R = "#D42027";

const navLinks = [
  { label:"Features",     href:"#features"     },
  { label:"How It Works", href:"#how-it-works"  },
  { label:"Pricing",      href:"#pricing"       },
  { label:"Integrations", href:"#integrations"  },
  { label:"Docs",         href:"/docs"          },
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
      document.getElementById(href.slice(1))?.scrollIntoView({ behavior:"smooth", block:"start" });
      setMobileOpen(false);
    }
  }

  return (
    <nav
      style={scrolled ? {
        backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
        background:"rgba(255,255,255,0.92)",
        borderBottom:"1px solid rgba(0,0,0,0.08)",
        boxShadow:"0 4px 24px rgba(0,0,0,0.08)",
      } : { background:"transparent" }}
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300"
              style={{ background:`linear-gradient(135deg,${R} 0%,#9b1219 100%)`, boxShadow:`0 0 18px rgba(212,32,39,0.30)` }}>
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">
              AgentCall <span className="gradient-text">AI</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map(l => (
              <a key={l.label} href={l.href} onClick={e=>anchor(e,l.href)}
                className="px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 cursor-pointer text-gray-600"
                onMouseEnter={e=>{(e.target as HTMLElement).style.color="#111";(e.target as HTMLElement).style.background="rgba(0,0,0,0.05)"}}
                onMouseLeave={e=>{(e.target as HTMLElement).style.color="";(e.target as HTMLElement).style.background="transparent"}}
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login"
              className="px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 text-gray-700 dark:text-gray-200"
              style={{ border:"1px solid rgba(212,32,39,0.28)", background:"rgba(212,32,39,0.05)" }}
              onMouseEnter={e=>{const t=e.currentTarget;t.style.borderColor="rgba(212,32,39,0.55)";t.style.color=R;t.style.background="rgba(212,32,39,0.09)"}}
              onMouseLeave={e=>{const t=e.currentTarget;t.style.borderColor="rgba(212,32,39,0.28)";t.style.color="";t.style.background="rgba(212,32,39,0.05)"}}
            >Sign In</Link>
            <Link href="/signup" className="btn-red text-sm px-5 py-2 h-9 rounded-xl">
              Start Free Trial
            </Link>
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button onClick={()=>setMobileOpen(!mobileOpen)}
              className="p-2 rounded-xl transition-all text-gray-600 dark:text-gray-300"
            >
              {mobileOpen ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{ background:"rgba(255,255,255,0.98)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(0,0,0,0.08)" }}>
          <div className="px-4 py-4 space-y-1">
            {navLinks.map(l=>(
              <a key={l.label} href={l.href} onClick={e=>anchor(e,l.href)}
                className="block px-4 py-3 text-sm rounded-xl transition-all cursor-pointer text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              >{l.label}</a>
            ))}
            <div className="pt-3 flex flex-col gap-2 border-t border-gray-100">
              <Link href="/login" onClick={()=>setMobileOpen(false)}
                className="w-full py-3 text-center text-sm font-semibold rounded-xl transition-all text-gray-700"
                style={{ border:"1px solid rgba(212,32,39,0.28)", background:"rgba(212,32,39,0.05)" }}>
                Sign In
              </Link>
              <Link href="/signup" onClick={()=>setMobileOpen(false)}
                className="w-full py-3 text-center text-sm font-semibold text-white rounded-xl transition-all"
                style={{ background:`linear-gradient(135deg,${R} 0%,#9b1219 100%)`, boxShadow:"0 0 20px rgba(212,32,39,0.25)" }}>
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
