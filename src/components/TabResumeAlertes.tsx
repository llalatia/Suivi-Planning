import React, { useState, useMemo } from 'react';
import { SemaineCalculated, CommandeCalculated } from '../utils/macroLogic';
import { formatDay } from '../utils/dateDisplay';
import {
  AlertTriangle,
  Clock,
  Users,
  CheckCircle2,
  Calendar,
  Sparkles,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  BarChart3,
  ListOrdered,
} from 'lucide-react';

interface TabResumeAlertesProps {
  semaines: SemaineCalculated[];
  commandes: CommandeCalculated[];
  currentSemaineCode: string;
  onPlanifierCommande: (commandeId: number) => void;
  onAutoDispatch: (commandeId: number) => void;
}

export const TabResumeAlertes: React.FC<TabResumeAlertesProps> = ({
  semaines,
  commandes,
  currentSemaineCode,
  onPlanifierCommande,
  onAutoDispatch,
}) => {
  const [maxTeamSize, setMaxTeamSize] = useState<number>(8); // Baseline 8 brodeuses
  const [activeSubTab, setActiveSubTab] = useState<'charge' | 'alertes' | 'cadence'>('charge');

  // Orders to watch (sous-planifiées ou TBC) matching gui.py
  const commandesASurveiller = useMemo(() => {
    return commandes.filter((c) => c.statut === 'sous_planifie' || c.heure_pcs_tbc === 1);
  }, [commandes]);

  const sousPlanifiees = useMemo(() => {
    return commandes.filter((c) => c.statut === 'sous_planifie');
  }, [commandes]);

  const tbcCommandes = useMemo(() => {
    return commandes.filter((c) => c.heure_pcs_tbc === 1);
  }, [commandes]);

  // Overall KPI metrics
  const globalStats = useMemo(() => {
    const totalPieces = commandes.reduce((sum, c) => sum + c.qte_commande, 0);
    const totalFinies = commandes.reduce((sum, c) => sum + c.qte_finie, 0);
    const totalReste = commandes.reduce((sum, c) => sum + c.resteAFaire, 0);
    const totalProg = commandes.reduce((sum, c) => sum + c.totalProgramme, 0);
    const totalManquant = sousPlanifiees.reduce((sum, c) => sum + c.manquant, 0);

    const activeWeeks = semaines.filter((s) => s.totalPieces > 0);
    const peakWeek = [...semaines].sort((a, b) => b.totalBrodeuses - a.totalBrodeuses)[0];

    return {
      totalPieces,
      totalFinies,
      totalReste,
      totalProg,
      totalManquant,
      activeWeeksCount: activeWeeks.length,
      peakWeekCode: peakWeek?.code || 'S34',
      peakBrodeuses: peakWeek?.totalBrodeuses || 0,
    };
  }, [commandes, semaines, sousPlanifiees]);

  return (
    <div className="space-y-6">
      {/* Top summary metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Reste à produire</span>
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {globalStats.totalReste.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-500">pcs</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Sur {globalStats.totalPieces.toLocaleString('fr-FR')} commandées
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Total Programmé</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {globalStats.totalProg.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-500">pcs</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Couverture : {Math.round((globalStats.totalProg / (globalStats.totalReste || 1)) * 100)}% du reste
          </div>
        </div>

        <div
          className={`p-4 rounded-xl border shadow-2xs ${
            sousPlanifiees.length > 0
              ? 'bg-rose-50/80 border-rose-200 text-rose-950'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold">Commandes sous-planifiées</span>
            <AlertTriangle className={`w-4 h-4 ${sousPlanifiees.length > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
          </div>
          <div className="text-xl font-black font-mono">
            {sousPlanifiees.length} <span className="text-xs font-normal">commandes</span>
          </div>
          <div className="text-[11px] mt-1">
            Manque : <strong className="font-mono">+{globalStats.totalManquant} pcs</strong> à planifier
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Pic de charge</span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {globalStats.peakBrodeuses} <span className="text-xs font-normal text-slate-500">brodeuses</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Semaine de pointe : <strong className="font-mono text-slate-800">{globalStats.peakWeekCode}</strong>
          </div>
        </div>
      </div>

      {/* Sub-tab navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('charge')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            activeSubTab === 'charge'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Charge de travail par semaine</span>
        </button>

        <button
          onClick={() => setActiveSubTab('alertes')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            activeSubTab === 'alertes'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Commandes à surveiller ({commandesASurveiller.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('cadence')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            activeSubTab === 'cadence'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Rapport Cadence & Dispatch Journalier</span>
        </button>
      </div>

      {/* VIEW 1: Charge de travail par semaine matching gui.py */}
      {activeSubTab === 'charge' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center">
              <span>Tableau de charge par semaine (S29 à S51)</span>
              <span className="ml-2 text-xs font-normal text-slate-500">
                (Calcul basé sur 40h / semaine par brodeuse)
              </span>
            </h3>

            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-600 font-medium">Effectif brodeuses disponible :</span>
              <input
                type="number"
                min={1}
                max={50}
                value={maxTeamSize}
                onChange={(e) => setMaxTeamSize(Number(e.target.value) || 8)}
                className="w-14 px-2 py-1 text-xs border border-slate-300 rounded font-mono font-bold text-center"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-xs text-left border-collapse font-mono">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-300">
                  <tr>
                    <th className="py-2.5 px-4 border-r border-slate-200 w-28 text-center">Semaine</th>
                    <th className="py-2.5 px-4 border-r border-slate-200 w-36 text-center">Date lundi</th>
                    <th className="py-2.5 px-4 border-r border-slate-200 text-right w-36">Total pièces</th>
                    <th className="py-2.5 px-4 border-r border-slate-200 text-right w-36">Total heures</th>
                    <th className="py-2.5 px-4 border-r border-slate-200 text-right w-44">
                      Brodeuses nécessaires
                    </th>
                    <th className="py-2.5 px-4 text-left font-sans">Capacité & Taux de charge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {semaines.map((s) => {
                    const isCourante = s.code === currentSemaineCode;
                    const loadRate = Math.round((s.totalBrodeuses / maxTeamSize) * 100);
                    const isOverloaded = s.totalBrodeuses > maxTeamSize;

                    return (
                      <tr
                        key={s.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          isCourante ? 'bg-amber-50/60 font-semibold' : ''
                        }`}
                      >
                        <td className="py-2.5 px-4 text-center border-r border-slate-100">
                          <div className="flex items-center justify-center space-x-1.5">
                            <span className="font-bold text-slate-900">{s.code}</span>
                            {isCourante && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-bold font-sans">
                                Courante
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-4 text-center text-slate-600 border-r border-slate-100">
                          {formatDay(s.date_debut)}
                        </td>

                        <td className="py-2.5 px-4 text-right text-slate-900 font-bold border-r border-slate-100">
                          {s.totalPieces > 0 ? s.totalPieces : '—'}
                        </td>

                        <td className="py-2.5 px-4 text-right text-slate-700 border-r border-slate-100">
                          {s.totalHeures > 0 ? `${s.totalHeures} h` : '—'}
                        </td>

                        <td className="py-2.5 px-4 text-right font-black border-r border-slate-100">
                          {s.totalBrodeuses > 0 ? (
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                isOverloaded
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {s.totalBrodeuses}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td className="py-2.5 px-4 font-sans">
                          {s.totalBrodeuses > 0 ? (
                            <div className="flex items-center space-x-3">
                              <div className="w-32 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                                <div
                                  className={`h-full rounded-full ${
                                    isOverloaded
                                      ? 'bg-rose-500'
                                      : loadRate > 80
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(100, loadRate)}%` }}
                                />
                              </div>
                              <span
                                className={`font-mono text-xs ${
                                  isOverloaded ? 'text-rose-600 font-bold' : 'text-slate-600'
                                }`}
                              >
                                {loadRate}% {isOverloaded && '(Surcharge !)'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Aucune charge</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Commandes à surveiller matching gui.py */}
      {activeSubTab === 'alertes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Commandes à surveiller (Sous-planifiées ou TBC)
              </h3>
              <p className="text-xs text-slate-500">
                Ces commandes risquent d'entraîner des retards de livraison client si le planning n'est pas complété.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-300">
                <tr>
                  <th className="py-2.5 px-3 min-w-[170px]">Client</th>
                  <th className="py-2.5 px-3 min-w-[220px]">Modèle</th>
                  <th className="py-2.5 px-3 text-right">Reste à faire</th>
                  <th className="py-2.5 px-3 text-right">Programmé</th>
                  <th className="py-2.5 px-3 text-right text-rose-700 font-bold">Manquant</th>
                  <th className="py-2.5 px-3 text-right">Heure/pcs</th>
                  <th className="py-2.5 px-4 text-center">Diagnostic & Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {commandesASurveiller.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-emerald-600 font-sans">
                      <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                      Toutes les commandes sont parfaitement planifiées et calibrées ! Aucun risque de retard détecté.
                    </td>
                  </tr>
                ) : (
                  commandesASurveiller.map((c) => {
                    const isSousPlanifie = c.statut === 'sous_planifie';
                    const isTbc = c.heure_pcs_tbc === 1;

                    return (
                      <tr
                        key={c.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          isSousPlanifie ? 'bg-rose-50/50' : 'bg-amber-50/50'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-semibold text-slate-900 font-sans">
                          {c.client}
                        </td>

                        <td className="py-2.5 px-3 text-slate-800 font-sans">
                          {c.modele}
                        </td>

                        <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                          {c.resteAFaire}
                        </td>

                        <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                          {c.totalProgramme}
                        </td>

                        <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                          {c.manquant > 0 ? `+${c.manquant}` : '—'}
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          {isTbc ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-bold">
                              TBC
                            </span>
                          ) : (
                            c.heure_pcs
                          )}
                        </td>

                        <td className="py-2.5 px-4 font-sans text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {isSousPlanifie && (
                              <button
                                onClick={() => onAutoDispatch(c.id)}
                                className="flex items-center space-x-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-md shadow-2xs transition"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>Dispatcher (+{c.manquant})</span>
                              </button>
                            )}

                            <button
                              onClick={() => onPlanifierCommande(c.id)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs rounded-md transition"
                            >
                              Ouvrir Planning ➜
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: Rapport de Cadence & Dispatch Journalier */}
      {activeSubTab === 'cadence' && (
        <div className="space-y-4">
          <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-md">
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 mb-2 font-mono">
              Rapport Synthétique de Cadence & Dispatch Anti-Retard
            </h3>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Le dispatching est calculé pour lisser la production sur une semaine de 5 jours ouvrés (8 heures par jour = 40h/brodeuse).
              Toute commande dont le total programmé est inférieur au reste à faire doit être lissée sur les semaines futures avant la date limite client.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                <Clock className="w-4 h-4 mr-1.5 text-indigo-600" />
                Règles de Cadence d'Atelier
              </h4>
              <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span><strong>1 Brodeuse</strong> = 40 heures de production par semaine (8h/jour × 5 jours).</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span><strong>Formule heures</strong> = Nb pièces × Heure/pièce.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span><strong>Nb brodeuses requises</strong> = Nb heures ÷ 40.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-rose-500 font-bold">!</span>
                  <span><strong>Alerte Sous-planifié</strong> : Se déclenche dès que Total Programmé &lt; Reste à faire.</span>
                </li>
              </ul>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-600" />
                Dispatching Journalier Moyen Recommandé
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Semaine active :</span>
                  <strong className="font-mono text-slate-900">{currentSemaineCode}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Cadence journalière cible :</span>
                  <strong className="font-mono text-slate-900">
                    {Math.round(
                      (semaines.find((s) => s.code === currentSemaineCode)?.totalPieces || 0) / 5
                    )}{' '}
                    pièces / jour
                  </strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Heures de broderie quotidiennes :</span>
                  <strong className="font-mono text-slate-900">
                    {Math.round(
                      ((semaines.find((s) => s.code === currentSemaineCode)?.totalHeures || 0) / 5) * 10
                    ) / 10}{' '}
                    h / jour
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
