import React from 'react';
import { ProductionReportKPI } from '../types';
import { Clock, AlertTriangle, CheckCircle2, Gauge, Activity, Flame } from 'lucide-react';

interface KPISummaryProps {
  kpis: ProductionReportKPI;
  onFilterDelayed?: () => void;
}

export const KPISummary: React.FC<KPISummaryProps> = ({ kpis, onFilterDelayed }) => {
  const otdColor =
    kpis.onTimeDeliveryRate >= 95
      ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
      : kpis.onTimeDeliveryRate >= 80
      ? 'text-amber-600 bg-amber-50 border-amber-200'
      : 'text-rose-600 bg-rose-50 border-rose-200';

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {/* 1. Taux de respect des délais (OTD) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
          <span>Respect Délais (OTD)</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            {kpis.onTimeDeliveryRate}%
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-md font-semibold border ${otdColor}`}>
            {kpis.onTimeDeliveryRate >= 95 ? 'Excellence' : kpis.onTimeDeliveryRate >= 80 ? 'Vigilance' : 'Alerte'}
          </span>
        </div>
        <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              kpis.onTimeDeliveryRate >= 95 ? 'bg-emerald-500' : kpis.onTimeDeliveryRate >= 80 ? 'bg-amber-500' : 'bg-rose-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(5, kpis.onTimeDeliveryRate))}%` }}
          />
        </div>
      </div>

      {/* 2. Retards Clients / Risques */}
      <div
        onClick={onFilterDelayed}
        className={`bg-white p-4 rounded-xl border shadow-xs flex flex-col justify-between cursor-pointer transition hover:border-slate-300 ${
          kpis.delayedOrders > 0 ? 'border-rose-300 ring-1 ring-rose-200 bg-rose-50/30' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
          <span>Retards Clients</span>
          {kpis.delayedOrders > 0 ? (
            <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className={`text-2xl font-bold tracking-tight ${
              kpis.delayedOrders > 0 ? 'text-rose-600' : 'text-slate-900'
            }`}
          >
            {kpis.delayedOrders}
          </span>
          <span className="text-xs text-slate-500">
            {kpis.delayedOrders > 1 ? 'commandes' : 'commande'} en dérive
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500 truncate">
          {kpis.delayedOrders > 0
            ? `+ ${kpis.atRiskOrders} à risque imminent`
            : kpis.atRiskOrders > 0
            ? `${kpis.atRiskOrders} sous surveillance`
            : 'Aucun retard prévu'}
        </p>
      </div>

      {/* 3. Cadence Moyenne */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
          <span>Cadence Moyenne</span>
          <Gauge className="w-4 h-4 text-cyan-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            {kpis.averageCadence}
          </span>
          <span className="text-xs text-slate-500">pièces / heure</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <Activity className="w-3.5 h-3.5 text-cyan-600" />
          <span>TRS / OEE moyen : ~{kpis.overallOEE}%</span>
        </div>
      </div>

      {/* 4. Charge de Travail (Heures requises) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
          <span>Heures de Charge</span>
          <Clock className="w-4 h-4 text-indigo-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            {kpis.totalRequiredHours}h
          </span>
          <span className="text-xs text-slate-500">à produire</span>
        </div>
        <p className="mt-2 text-xs text-slate-500 truncate">
          Sur {kpis.totalOrders - kpis.completedOrders} OF en cours
        </p>
      </div>

      {/* 5. Volume Total de Pièces */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between col-span-2 md:col-span-1">
        <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
          <span>Avancement Pièces</span>
          <Flame className="w-4 h-4 text-amber-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            {kpis.totalProducedPieces.toLocaleString()}
          </span>
          <span className="text-xs text-slate-400">
            / {kpis.totalPlannedPieces.toLocaleString()}
          </span>
        </div>
        <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(
                100,
                kpis.totalPlannedPieces > 0 ? (kpis.totalProducedPieces / kpis.totalPlannedPieces) * 100 : 0
              )}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
};
