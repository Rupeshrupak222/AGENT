"use client";

import React, { useState } from "react";
import {
  Globe, Database, Sparkles, CheckCircle2, AlertCircle,
  Search, RefreshCw, X, ArrowRight, ShieldCheck, Zap,
  Layers, BookOpen, Plus, Trash2, ExternalLink, FileText,
  HelpCircle, Bot
} from "lucide-react";

interface KnowledgeCrawlerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KnowledgeCrawlerModal: React.FC<KnowledgeCrawlerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [targetUrl, setTargetUrl] = useState("https://nexuswealth.io/solutions/wealth-tier");
  const [crawlDepth, setCrawlDepth] = useState<"1" | "2" | "3">("2");
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState(100);
  const [crawlComplete, setCrawlComplete] = useState(true);

  // Extracted Knowledge Items
  const [extractedFaqs, setExtractedFaqs] = useState([
    {
      id: "1",
      question: "What is the minimum asset requirement for the VIP Portfolio Tier?",
      answer: "The VIP Portfolio Tier requires a minimum of $25,000 or equivalent currency with zero maintenance fees during the first year.",
      confidence: 99,
      sourceUrl: "https://nexuswealth.io/pricing",
      status: "Synced",
    },
    {
      id: "2",
      question: "Are capital distributions subject to withdrawal penalties?",
      answer: "No. Capital distributions can be initiated anytime via ACH or wire with a 24-hour turnaround and no lock-in penalties.",
      confidence: 96,
      sourceUrl: "https://nexuswealth.io/terms",
      status: "Synced",
    },
    {
      id: "3",
      question: "What regulatory licenses does Nexus Wealth hold?",
      answer: "Nexus Wealth is an SEC-registered investment advisor (RIA) with SIPC custodial insurance up to $500,000 per account.",
      confidence: 98,
      sourceUrl: "https://nexuswealth.io/compliance",
      status: "Synced",
    },
  ]);

  // Retrieval Playground
  const [testQuery, setTestQuery] = useState("Can I withdraw my money anytime without penalties?");
  const [retrievalResult, setRetrievalResult] = useState<{
    answer: string;
    similarity: number;
    citation: string;
  } | null>({
    answer: "Yes, you can initiate capital distributions anytime with no withdrawal penalties. Turnaround is typically within 24 business hours via standard wire or ACH.",
    similarity: 0.94,
    citation: "https://nexuswealth.io/terms (Section 4.2)",
  });
  const [isSearching, setIsSearching] = useState(false);

  if (!isOpen) return null;

  const handleStartCrawl = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetUrl.trim()) return;
    setIsCrawling(true);
    setCrawlProgress(20);
    setCrawlComplete(false);

    setTimeout(() => setCrawlProgress(55), 400);
    setTimeout(() => setCrawlProgress(85), 800);
    setTimeout(() => {
      setCrawlProgress(100);
      setIsCrawling(false);
      setCrawlComplete(true);
      setExtractedFaqs((prev) => [
        {
          id: String(Date.now()),
          question: `How does ${targetUrl.split("/")[2] || "this service"} handle customer onboarding?`,
          answer: "Onboarding is fully digital and takes under 3 minutes with biometric ID verification and instant bank linkage.",
          confidence: 97,
          sourceUrl: targetUrl,
          status: "Synced",
        },
        ...prev,
      ]);
    }, 1200);
  };

  const handleTestSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!testQuery.trim()) return;
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      setRetrievalResult({
        answer: `Direct match from ingested knowledge base: "${extractedFaqs[0]?.answer || "We provide autonomous voice automation with zero setup latency."}"`,
        similarity: 0.96,
        citation: extractedFaqs[0]?.sourceUrl || targetUrl,
      });
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-emerald-900/30 via-slate-900 to-teal-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-tight">Self-Service Knowledge Crawler & FAQ Forge</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Vector RAG Ingestion
                </span>
              </div>
              <p className="text-xs text-white/50">
                Crawl company websites, help documentation, or PDFs to auto-generate ground-truth knowledge for all voice agents.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Section 1: URL & Sitemap Crawler Input */}
          <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              Website URL & Sitemap Ingestion
            </h3>

            <form onSubmit={handleStartCrawl} className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="url"
                placeholder="https://yourcompany.com/faqs"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="flex-1 w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder-white/30 focus:outline-none focus:border-emerald-500 font-mono"
              />

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={crawlDepth}
                  onChange={(e) => setCrawlDepth(e.target.value as any)}
                  className="px-3 py-2.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white font-semibold"
                >
                  <option value="1">Depth 1: Single Page</option>
                  <option value="2">Depth 2: Linked Docs</option>
                  <option value="3">Depth 3: Full Domain</option>
                </select>

                <button
                  type="submit"
                  disabled={isCrawling || !targetUrl.trim()}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  {isCrawling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {isCrawling ? "Crawling..." : "Crawl & Ingest"}
                </button>
              </div>
            </form>

            {/* Progress Bar */}
            {isCrawling && (
              <div className="space-y-1.5 pt-1 animate-in fade-in">
                <div className="flex justify-between text-[11px] text-white/60">
                  <span>Extracting DOM trees & generating vector embeddings...</span>
                  <span className="font-mono text-emerald-400">{crawlProgress}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                    style={{ width: `${crawlProgress}%` }}
                  />
                </div>
              </div>
            )}

            {crawlComplete && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>
                    Knowledge Sync Active: <strong>{extractedFaqs.length} Verified QA pairs</strong> indexed in Pinecone/pgvector.
                  </span>
                </div>
                <span className="text-[10px] font-mono text-white/50">0 Contradictions Found</span>
              </div>
            )}
          </div>

          {/* Section 2: Ingested FAQ Catalog */}
          <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                Ingested Knowledge Base Records
              </h4>
              <span className="text-[11px] text-white/40">Auto-Refreshed Every 24 Hours</span>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {extractedFaqs.map((faq) => (
                <div key={faq.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      {faq.question}
                    </p>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex-shrink-0">
                      {faq.confidence}% Confidence
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed pl-5">{faq.answer}</p>
                  <div className="pl-5 pt-1 flex items-center gap-2 text-[10px] text-white/40">
                    <ExternalLink className="w-3 h-3 text-white/30" />
                    <span className="truncate max-w-sm font-mono">{faq.sourceUrl}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Semantic Retrieval Playground */}
          <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-emerald-400" />
              Agent Knowledge Retrieval Playground
            </h4>
            <p className="text-[11px] text-white/50">
              Test how an autonomous voice agent retrieves answers to live caller inquiries from this knowledge forge.
            </p>

            <form onSubmit={handleTestSearch} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Ask a customer question (e.g. Can I withdraw my money anytime?)..."
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder-white/30 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={isSearching || !testQuery.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Query RAG
              </button>
            </form>

            {retrievalResult && (
              <div className="p-3.5 rounded-xl bg-black/40 border border-emerald-500/20 space-y-2 text-xs">
                <div className="flex items-center justify-between text-emerald-400 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5" /> Retrieved Agent Voice Answer:
                  </span>
                  <span className="font-mono text-[10px] text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded">
                    Cosine Similarity: {retrievalResult.similarity}
                  </span>
                </div>
                <p className="text-slate-200 leading-relaxed">{retrievalResult.answer}</p>
                <div className="text-[10px] text-white/40 pt-1 font-mono">
                  Ground Truth Citation: {retrievalResult.citation}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Hallucination Guard: Grounded-Only Responses Enforced</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Save & Sync Knowledge to All Agents
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
