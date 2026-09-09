"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X, ShieldCheck } from "lucide-react";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if user has previously made a choice
    const consent = localStorage.getItem("agentcall_cookie_consent");
    if (!consent) {
      // Small delay for smooth entry after initial page load
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem("agentcall_cookie_consent", "all");
    setVisible(false);
  };

  const handleEssentialOnly = () => {
    localStorage.setItem("agentcall_cookie_consent", "essential");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 pointer-events-auto"
        >
          <div
            className="rounded-2xl p-5 sm:p-6 shadow-2xl border backdrop-blur-md relative"
            style={{
              background: "rgba(255, 255, 255, 0.94)",
              borderColor: "rgba(221, 184, 146, 0.8)",
              boxShadow: "0 20px 45px -10px rgba(111, 68, 40, 0.2), 0 0 0 1px rgba(221, 184, 146, 0.4)",
            }}
          >
            {/* Close button */}
            <button
              onClick={handleEssentialOnly}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close cookie banner"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3.5 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-xs"
                style={{ background: "linear-gradient(135deg, #B08968 0%, #8B5A2B 50%, #6F4428 100%)" }}
              >
                <Cookie className="w-5 h-5" />
              </div>
              <div className="pr-4">
                <h3 className="text-sm font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                  We Value Your Privacy
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  We use cookies and telemetry to personalize your experience, maintain session state, and analyze voice telephony performance.
                </p>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 mb-4 pl-1">
              Read our{" "}
              <Link href="/cookies" className="text-[#8B5A2B] font-semibold underline hover:text-[#6F4428]">
                Cookie Policy
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-[#8B5A2B] font-semibold underline hover:text-[#6F4428]">
                Privacy Policy
              </Link>{" "}
              to learn more.
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleAcceptAll}
                className="flex-1 py-2 px-4 rounded-xl text-xs font-bold text-white shadow-xs transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #B08968 0%, #8B5A2B 50%, #6F4428 100%)" }}
              >
                Accept All
              </button>
              <button
                onClick={handleEssentialOnly}
                className="py-2 px-3.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors active:scale-[0.98]"
              >
                Essential Only
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
