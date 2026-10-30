import React, { useState } from 'react';
import { BottleneckAlert, SolutionOption } from '../types';
import {
  AlertTriangle,
  CheckCircle2,
  Zap,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
} from 'lucide-react';

interface AlertsAndSolutionsProps {
  alerts: BottleneckAlert[];
  onApplySolution: (solution: SolutionOption) => void;
}

export const AlertsAndSolutions: React.FC<AlertsAndSolutionsProps> = ({
  alerts,
  onApplySolution,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [appliedId, setAppliedId] = useState<string | null>(null);

  const handleApply = (sol: SolutionOption) => {
    setAppliedId(sol.id);
    onApplySolution(sol);
    setTimeout(() => setAppliedId(null), 1500);
  };

  if (alerts.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between text-emerald-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-900">
              Anticipation Réussie : 100% des commandes dans les délais clients
            </p>
            <p className="text-xs text-emerald-700">
              La cadence et les capacités machines actuelles garantissent zéro retard de livraison.
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-200/60 rounded-lg text-emerald-900">
          Planning Sécurisé
        </span>
      </div>
    );
  }

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-white">
                Centre d'Anticipation des Délais & Solutions Immédiates
              </h2>
              <span className="px-2 py-0.5 text-xs font-bold bg-rose-500 text-white rounded-full">
                {criticalCount} {criticalCount > 1 ? 'retards critiques' : 'retard critique'}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Détection automatique des goulots d'étranglement et actions correctives en 1 clic
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition text-xs flex items-center gap-1"
        >
          {isCollapsed ? (
            <>
              <span>Afficher les détails</span>
              <ChevronDown className="w-4 h-4" />
            </>
          ) : (
            <>
              <span>Réduire</span>
              <ChevronUp className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="p-4 space-y-3 divide-y divide-slate-100">
          {alerts.map((alert) => (
            <div key={alert.id} className="pt-3 first:pt-0">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                {/* Diagnostic & Impact */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${
                        alert.severity === 'critical'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      {alert.message}
                    </span>
                    {alert.orderCode && (
                      <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {alert.orderCode}
                      </span>
                    )}
                    {alert.client && (
                      <span className="text-xs text-slate-600 font-medium">
                        Client : <strong className="text-slate-900">{alert.client}</strong>
                      </span>
                    )}
                  </div>

                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                    {alert.impact}
                  </p>
                </div>

                {/* Solutions Proposées */}
                <div className="lg:w-7/12 flex flex-col gap-2">
                  <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Solutions d'anticipation recommandées :</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {alert.suggestedSolutions.map((sol) => {
                      const isJustApplied = appliedId === sol.id;
                      return (
                        <div
                          key={sol.id}
                          className={`p-2.5 rounded-lg border transition flex flex-col justify-between ${
                            isJustApplied
                              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200'
                              : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                          }`}
                        >
                          <div>
                            <p className="text-xs font-semibold text-slate-900 flex items-center justify-between">
                              <span>{sol.title}</span>
                            </p>
                            <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                              {sol.description}
                            </p>
                            <p className="text-[10px] font-medium text-emerald-700 mt-1">
                              {sol.gainHoursOrDays}
                            </p>
                          </div>

                          <button
                            id={`btn-apply-solution-${sol.id}`}
                            onClick={() => handleApply(sol)}
                            disabled={isJustApplied}
                            className={`mt-2 w-full py-1 px-2 text-xs font-medium rounded-md transition flex items-center justify-center gap-1 shadow-2xs ${
                              isJustApplied
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-900 hover:bg-slate-800 text-white'
                            }`}
                          >
                            {isJustApplied ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Solution Appliquée !</span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-3 h-3 text-amber-300" />
                                <span>Appliquer cette solution</span>
                                <ArrowRight className="w-3 h-3" />
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
