import React from 'react';
import { ProductionOrder, ProductionLine, ProductionReportKPI, ProductionSettings } from '../types';
import { formatFullDate } from '../utils/dateDisplay';
import {
  FileText,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Gauge,
  X,
  Building2,
} from 'lucide-react';

interface ProductionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: ProductionOrder[];
  lines: ProductionLine[];
  kpis: ProductionReportKPI;
  settings: ProductionSettings;
  onExportExcel: () => void;
}

export const ProductionReportModal: React.FC<ProductionReportModalProps> = ({
  isOpen,
  onClose,
  orders,
  lines,
  kpis,
  settings,
  onExportExcel,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const lineMap = new Map<string, ProductionLine>(lines.map((l) => [l.id, l]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header with Print / Close Actions */}
        <div className="p-4 bg-slate-900 text-white rounded-t-2xl flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Rapport de Production & Analyse de Cadence
              </h2>
              <p className="text-xs text-slate-400">
                Synthèse opérationnelle pour direction & responsables d'atelier
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition flex items-center gap-1.5 border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5 text-cyan-400" />
              <span>Imprimer / PDF</span>
            </button>

            <button
              onClick={onExportExcel}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter en .xlsx</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report Content (Printable) */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800 text-xs">
          {/* Factory Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-500" />
                <h3 className="text-base font-bold text-slate-900">{settings.factoryName}</h3>
              </div>
              <p className="text-slate-500 text-xs mt-0.5">
                Régime d'ouverture : {settings.workingDaysPerWeek} jours/semaine • {settings.shiftsPerDay} shifts/jour ({settings.shiftsPerDay * settings.dailyShiftHours}h d'ouverture quotidienne)
              </p>
            </div>
            <div className="text-right font-mono text-slate-500 text-xs">
              Date du rapport : {formatFullDate(new Date().toISOString())}
            </div>
          </div>

          {/* KPI High-Level Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500">Taux de Respect Délais (OTD)</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{kpis.onTimeDeliveryRate}%</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {kpis.onTimeOrders} à l'heure sur {kpis.totalOrders} OF
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500">Volume Pièces Total</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {kpis.totalPlannedPieces.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {kpis.totalProducedPieces.toLocaleString()} déjà produites ({Math.round(kpis.totalPlannedPieces > 0 ? (kpis.totalProducedPieces / kpis.totalPlannedPieces) * 100 : 0)}%)
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500">Cadence Moyenne Atelier</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{kpis.averageCadence} pcs/h</p>
              <p className="text-[10px] text-slate-400 mt-0.5">TRS moyen usine : {kpis.overallOEE}%</p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-500">Retards Critiques</span>
              <p className={`text-2xl font-bold mt-1 ${kpis.delayedOrders > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {kpis.delayedOrders}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {kpis.atRiskOrders} commande(s) sous surveillance
              </p>
            </div>
          </div>

          {/* Section: Cadence & Charge par Ligne de Production */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2.5 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-indigo-600" />
              <span>Analyse de Cadence & Saturation par Ligne de Production</span>
            </h4>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Ligne / Machine</th>
                    <th className="py-2.5 px-3">Atelier</th>
                    <th className="py-2.5 px-3 text-right">Cadence Standard</th>
                    <th className="py-2.5 px-3 text-right">Capacité Hebdo</th>
                    <th className="py-2.5 px-3 text-right">Charge Planifiée</th>
                    <th className="py-2.5 px-3 text-center">Taux Saturation</th>
                    <th className="py-2.5 px-3 text-center">Diagnostic</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((line) => {
                    const lineOrders = orders.filter((o) => o.lineId === line.id && o.status !== 'completed');
                    const totalHours = lineOrders.reduce((acc, o) => acc + (o.estimatedHours || 0), 0);
                    const weeklyCap = line.capacityHoursPerDay * settings.workingDaysPerWeek;
                    const saturation = Math.round((totalHours / Math.max(1, weeklyCap)) * 100);

                    return (
                      <tr key={line.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-900">{line.name}</td>
                        <td className="py-2 px-3 text-slate-500">{line.category}</td>
                        <td className="py-2 px-3 text-right font-mono">{line.defaultCadence} pcs/h</td>
                        <td className="py-2 px-3 text-right font-mono">{weeklyCap}h</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">{Math.round(totalHours * 10) / 10}h</td>
                        <td className="py-2 px-3 text-center font-mono font-bold">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] ${
                              saturation > 100
                                ? 'bg-rose-100 text-rose-800'
                                : saturation > 85
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {saturation}%
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-medium">
                          {saturation > 100 ? (
                            <span className="text-rose-600 font-bold">Goulot d'étranglement</span>
                          ) : saturation > 85 ? (
                            <span className="text-amber-600">Pleine capacité</span>
                          ) : (
                            <span className="text-emerald-600">Fluide</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Commandes en Retard et Plans d'Action */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2.5 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Bilan des Retards Clients & Recommandations d'Anticipation</span>
            </h4>

            {kpis.delayedOrders === 0 ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Aucun retard client détecté dans la planification actuelle. La cadence couvre tous les délais promis.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {orders
                  .filter((o) => o.status === 'delayed')
                  .map((ord) => {
                    const line = lineMap.get(ord.lineId);
                    return (
                      <div
                        key={ord.id}
                        className="p-3 bg-rose-50/50 border border-rose-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">{ord.code}</span>
                            <span className="font-semibold text-slate-800">Client : {ord.client}</span>
                            <span className="text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded text-[10px]">
                              Retard de {ord.delayDays} jour(s)
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px] mt-0.5">
                            Produit : <strong>{ord.product}</strong> • Ligne : <strong>{line?.name}</strong> • Reste à produire : <strong>{ord.remainingQty} pcs</strong> à <strong>{ord.cadencePerHour} pcs/h</strong>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[11px] text-slate-500">Date promise : {formatFullDate(ord.deadlineDate)}</span>
                          <p className="text-rose-700 font-bold text-xs">Fin calculée : {formatFullDate(ord.estimatedEndDate)}</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Document généré automatiquement par OptiProd Engine • 100% Hors-ligne
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition"
          >
            Fermer le rapport
          </button>
        </div>
      </div>
    </div>
  );
};
