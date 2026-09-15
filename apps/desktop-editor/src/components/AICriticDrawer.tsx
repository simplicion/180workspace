import React from "react";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  X,
  Flame,
  Wand2,
  ArrowRight,
  TrendingUp,
  Clock,
  ShieldCheck,
} from "lucide-react";
import {
  EditIR,
  EditCommand,
  VideoCriticService,
  VideoCritiqueReport,
  QualityIssue,
} from "@workspace/video-contracts";

interface AICriticDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  editIR: EditIR;
  onApplyRepairs: (repairs: EditCommand[]) => void;
}

export const AICriticDrawer: React.FC<AICriticDrawerProps> = ({
  isOpen,
  onClose,
  editIR,
  onApplyRepairs,
}) => {
  if (!isOpen) return null;

  const report: VideoCritiqueReport = VideoCriticService.analyze(editIR);

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-96 bg-surface border-l border-surface-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 select-none">
      {/* Drawer Header */}
      <div className="p-4 border-b border-surface-border flex items-center justify-between bg-surface-subtle">
        <div className="flex items-center space-x-2 text-pink-400">
          <Sparkles className="w-5 h-5" />
          <div>
            <h3 className="text-sm font-bold text-gray-100">AI Critic & Retention QA</h3>
            <p className="text-[10px] text-gray-400">Autonomous pacing & viewer retention analyzer</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-surface transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Retention Score Cards */}
      <div className="p-5 overflow-y-auto flex-1 space-y-5">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-indigo-500/10 border border-pink-500/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider block mb-0.5">
              Predicted Retention
            </span>
            <p className="text-3xl font-black text-white">{report.retentionPrediction}%</p>
            <p className="text-[11px] text-gray-400 mt-1 flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pacing Quality Score: {report.overallScore}/100</span>
            </p>
          </div>

          <div className="w-16 h-16 rounded-full bg-surface border border-pink-500/40 flex items-center justify-center font-black text-lg text-pink-300 shadow-lg shadow-pink-500/20">
            {report.overallScore >= 80 ? "A+" : report.overallScore >= 60 ? "B" : "C"}
          </div>
        </div>

        {/* Auto Repair CTA */}
        {report.recommendedRepairs.length > 0 && (
          <div className="p-3.5 rounded-xl bg-surface-subtle border border-surface-border flex items-center justify-between">
            <div className="text-xs">
              <p className="font-semibold text-gray-200">
                {report.recommendedRepairs.length} Automated Fixes Ready
              </p>
              <p className="text-[10px] text-gray-400">Injects missing zooms & repairs pacing</p>
            </div>
            <button
              onClick={() => onApplyRepairs(report.recommendedRepairs)}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-indigo-500 text-white font-bold text-xs shadow-md shadow-pink-500/20 flex items-center space-x-1 hover:from-pink-600 hover:to-indigo-600 transition"
            >
              <Wand2 className="w-3 h-3" />
              <span>Auto-Fix</span>
            </button>
          </div>
        )}

        {/* Diagnostic Issues List */}
        <div className="space-y-3">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
            Pacing & Retention Diagnostics ({report.issues.length})
          </span>

          {report.issues.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-emerald-500/30 rounded-xl bg-emerald-500/5">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-gray-200">Timeline Optimized!</p>
              <p className="text-[10px] text-gray-400 mt-1">Zero dead air or jarring cuts detected.</p>
            </div>
          ) : (
            report.issues.map((issue: QualityIssue) => (
              <div
                key={issue.id}
                className="p-3.5 rounded-xl bg-surface-subtle border border-surface-border space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      issue.severity === "CRITICAL"
                        ? "bg-red-500/20 text-red-300 border border-red-500/40"
                        : issue.severity === "WARNING"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                    }`}
                  >
                    {issue.category} • {issue.severity}
                  </span>
                  <span className="text-[10px] font-mono text-gray-500 flex items-center space-x-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{issue.timeRangeSec.start.toFixed(1)}s</span>
                  </span>
                </div>

                <h4 className="text-xs font-bold text-gray-200">{issue.title}</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">{issue.description}</p>

                {issue.suggestedAction && (
                  <div className="pt-1.5 text-[10px] text-pink-300 font-medium flex items-center space-x-1">
                    <ArrowRight className="w-3 h-3 shrink-0" />
                    <span>Suggestion: {issue.suggestedAction}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
