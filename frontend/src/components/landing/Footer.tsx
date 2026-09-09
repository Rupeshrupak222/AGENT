"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Zap, Twitter, Linkedin, Youtube, Github } from "lucide-react";

const cols = {
  Product:    [{ l:"Features",href:"#features" },{ l:"How It Works",href:"#how-it-works" },{ l:"Pricing",href:"#pricing" }],
  "Get Started": [{ l:"Sign In",href:"/login" },{ l:"Start Free Trial",href:"/signup" }],
};
const socials = [
  { icon:<Twitter className="w-4 h-4"/>,  href:"https://twitter.com",  label:"Twitter" },
  { icon:<Linkedin className="w-4 h-4"/>, href:"https://linkedin.com", label:"LinkedIn" },
  { icon:<Youtube className="w-4 h-4"/>,  href:"https://youtube.com",  label:"YouTube" },
  { icon:<Github className="w-4 h-4"/>,   href:"https://github.com",   label:"GitHub" },
];

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6 }}
      className="bg-surface pt-12 sm:pt-16 pb-6 sm:pb-8 border-t border-slate-200 dark:border-slate-800"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-10">

          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-xs">
                <Zap className="w-3.5 h-3.5 fill-white"/>
              </div>
              <span className="text-base font-semibold text-slate-900 dark:text-white tracking-tight">AgentCall <span className="text-brand-500">AI</span></span>
            </Link>
            <p className="text-xs leading-relaxed mb-5 max-w-xs text-slate-500 dark:text-slate-400">
              Autonomous conversational voice infrastructure for sales, support, and recruitment operations.
            </p>
            <div className="flex items-center gap-2">
              {socials.map(s=>(
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                  className="w-7 h-7 rounded-md flex items-center justify-center transition-colors text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 hover:text-brand-500"
                >{s.icon}</a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(cols).map(([cat, links])=>(
            <div key={cat}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4 text-slate-700 dark:text-slate-300">{cat}</p>
              <ul className="space-y-2">
                {links.map(link=>(
                  <li key={link.l}>
                    <Link href={link.href} className="text-xs transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >{link.l}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">© 2026 AgentCall AI. Enterprise Voice Infrastructure.</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">SOC2 Type II Certified · Sub-350ms SLA</p>
        </div>
      </div>
    </motion.footer>
  );
}
