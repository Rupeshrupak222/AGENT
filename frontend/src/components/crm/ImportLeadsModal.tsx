"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Layers,
  HelpCircle,
} from "lucide-react";
import { parseCsvContent, CsvParseResult, CsvColumnMapping } from "@/lib/csv-parser";
import { leadsApi, normalizeApiError } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/Badge";

interface ImportLeadsModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportLeadsModal({ onClose, onSuccess }: ImportLeadsModalProps) {
  const { success, error: toastError } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [rawText, setRawText] = useState<string>("");
  const [csvResult, setCsvResult] = useState<CsvParseResult | null>(null);
  const [customMapping, setCustomMapping] = useState<Partial<CsvColumnMapping>>({});
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInvalid, setShowInvalid] = useState(false);

  // Handle File Input
  const handleFileChange = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toastError("Please upload a valid .csv spreadsheet file.");
      return;
    }

    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRawText(text);
      try {
        const result = parseCsvContent(text, file.name);
        setCsvResult(result);
        setCustomMapping(result.detectedMapping);
      } catch (err: any) {
        toastError(`Failed to parse CSV: ${err.message}`);
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsText(file);
  };

  // Re-run mapping when dropdowns change
  const handleMappingChange = (field: keyof CsvColumnMapping, column: string) => {
    const updated = { ...customMapping, [field]: column };
    setCustomMapping(updated);
    if (rawText && csvResult) {
      try {
        const recomputed = parseCsvContent(
          rawText,
          csvResult.fileName,
          updated
        );
        setCsvResult(recomputed);
      } catch (err: any) {
        toastError(`Mapping error: ${err.message}`);
      }
    }
  };

  // Submit parsed leads to API
  const handleSubmit = async () => {
    if (!csvResult || csvResult.validRows.length === 0) {
      toastError("No valid leads found in this CSV file to import.");
      return;
    }

    try {
      setIsSubmitting(true);
      const leadsToImport = csvResult.validRows.map((r) => ({
        name: r.name,
        phone: r.phone,
        email: r.email || undefined,
        company: r.company || undefined,
        source: "csv_bulk_import",
        status: "new",
      }));

      const res = await leadsApi.bulkImport(leadsToImport);
      success(
        `Import complete: ${res.created} leads imported (${res.duplicates} duplicates skipped).`
      );
      onSuccess();
      onClose();
    } catch (err) {
      toastError(normalizeApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden text-slate-900 dark:text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Bulk Ingest Leads (CSV)</h3>
              <p className="text-xs text-slate-500 dark:text-white/40">
                Upload contacts with automatic column mapping & phone normalization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {!csvResult ? (
            /* Upload Dropzone */
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) {
                  handleFileChange(e.dataTransfer.files[0]);
                }
              }}
              className="border-2 border-dashed border-slate-200 dark:border-white/15 hover:border-brand-500 dark:hover:border-brand-400 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-white/[0.02] hover:bg-brand-50/30 dark:hover:bg-brand-500/[0.04]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
                }}
              />
              <div className="w-14 h-14 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Drop your CSV lead list here or click to browse
              </p>
              <p className="text-xs text-slate-500 dark:text-white/40 mt-1 max-w-sm">
                Supports standard comma-delimited CSV files up to 5,000 rows. Required columns:{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">Phone</span> &{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">Name</span>.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Badge variant="gray" className="text-[10px]">
                  E.164 Auto-Formatting
                </Badge>
                <Badge variant="gray" className="text-[10px]">
                  Duplicate Removal
                </Badge>
              </div>
            </div>
          ) : (
            /* Parsing Results & Column Mapping */
            <div className="space-y-5">
              {/* File summary pill */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-xs">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-5 h-5 text-brand-500" />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white truncate max-w-xs">
                      {csvResult.fileName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-white/40">
                      {(csvResult.fileSizeBytes / 1024).toFixed(1)} KB ·{" "}
                      {csvResult.totalRowsDetected} rows parsed
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCsvResult(null);
                    setRawText("");
                  }}
                  className="px-2.5 py-1 text-xs rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 transition-colors"
                >
                  Choose Different File
                </button>
              </div>

              {/* Column Mapping Selectors */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                  <Layers className="w-4 h-4 text-brand-500" />
                  <span>Column Field Mapping</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-white/50 mb-1">
                      Phone Number *
                    </label>
                    <select
                      value={customMapping.phoneCol || ""}
                      onChange={(e) => handleMappingChange("phoneCol", e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-white/10 text-xs"
                    >
                      {csvResult.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-white/50 mb-1">
                      Lead Name *
                    </label>
                    <select
                      value={customMapping.nameCol || ""}
                      onChange={(e) => handleMappingChange("nameCol", e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-white/10 text-xs"
                    >
                      {csvResult.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-white/50 mb-1">
                      Email Address
                    </label>
                    <select
                      value={customMapping.emailCol || ""}
                      onChange={(e) => handleMappingChange("emailCol", e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-white/10 text-xs"
                    >
                      <option value="">(None)</option>
                      {csvResult.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-white/50 mb-1">
                      Company / Org
                    </label>
                    <select
                      value={customMapping.companyCol || ""}
                      onChange={(e) => handleMappingChange("companyCol", e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-white/10 text-xs"
                    >
                      <option value="">(None)</option>
                      {csvResult.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Ingestion KPI Counters */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                    {csvResult.validRows.length}
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                    Valid Leads
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                  <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                    {csvResult.duplicateCountInFile}
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                    Duplicate Phones
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                  <p className="text-lg font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                    {csvResult.invalidRows.length}
                  </p>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 font-medium">
                    Invalid Rows
                  </p>
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Previewing top {Math.min(5, csvResult.validRows.length)} validated leads:
                  </span>
                  {csvResult.invalidRows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowInvalid(!showInvalid)}
                      className="text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      {showInvalid ? "Hide invalid rows" : `Show ${csvResult.invalidRows.length} invalid rows`}
                    </button>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-white/40 font-semibold border-b border-slate-200 dark:border-white/10">
                      <tr>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Phone (Normalized)</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Company</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                      {csvResult.validRows.slice(0, 5).map((row) => (
                        <tr key={row.rowNumber} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                          <td className="px-3 py-2 font-medium">{row.name}</td>
                          <td className="px-3 py-2 font-mono text-emerald-600 dark:text-emerald-400">
                            {row.phone}
                          </td>
                          <td className="px-3 py-2 text-slate-500 dark:text-white/60">
                            {row.email || "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-500 dark:text-white/60">
                            {row.company || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-white/70 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!csvResult || csvResult.validRows.length === 0 || isSubmitting}
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs shadow-md shadow-brand-600/30 flex items-center gap-2 transition-all"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Ingesting Leads...
              </>
            ) : (
              <>
                <span>Import {csvResult?.validRows.length || 0} Leads</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
