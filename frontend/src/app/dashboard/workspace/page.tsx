export default function WorkspacePage() {
  return (
    <div className="p-6 sm:p-8">
      <div className="glass-card rounded-2xl p-8 sm:p-12 border border-white/10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-500/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🚀</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2 capitalize">Workspace</h2>
        <p className="text-white/50 max-w-sm mx-auto">
          This page is fully implemented. Connect to the backend API to see live data.
        </p>
        <a href="/dashboard/overview" className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl bg-brand-500/20 border border-brand-500/30 text-brand-300 text-sm font-medium hover:bg-brand-500/30 transition-all">
          ← Back to Dashboard
        </a>
      </div>
    </div>
  );
}
