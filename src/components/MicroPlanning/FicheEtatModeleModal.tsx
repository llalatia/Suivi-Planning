import React, { useState, useMemo } from 'react';
import {
  MicroJob,
  MicroDailyRow,
  MicroTimelineDay,
  MicroJobDayData,
} from '../../data/microPlanningTypes';
import {
  X,
  Activity,
  Calendar,
  Layers,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Scissors,
  Package,
  Sliders,
  ChevronRight,
  Info,
  Edit2,
  Check,
  RefreshCw,
} from 'lucide-react';

import { getModelColor } from '../../utils/modelColorUtils';
import { ColorPickerPopover } from './ColorPickerPopover';

interface FicheEtatModeleModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: MicroJob | null;
  rows: MicroDailyRow[];
  timelineDays: MicroTimelineDay[];
  currentDateKey: string;
  currentColIdx: number;
  modelColors?: Record<string, string>;
  onSetModelColor?: (modelName: string, color: string) => void;
  onUpdateJobTarget?: (
    jobId: string,
    newTarget: number,
    colIdx?: number,
    applyToSubsequentDays?: boolean
  ) => void;
  onUpdateJobDayField?: (
    jobId: string,
    colIdx: number,
    field: 'coupe' | 'alim' | 'real' | 'cumul' | 'target',
    value: number
  ) => void;
}

export const FicheEtatModeleModal: React.FC<FicheEtatModeleModalProps> = ({
  isOpen,
  onClose,
  job,
  rows,
  timelineDays,
  currentDateKey,
  currentColIdx,
  modelColors = {},
  onSetModelColor,
  onUpdateJobTarget,
  onUpdateJobDayField,
}) => {
  if (!isOpen || !job) return null;

  // Local state for target adjuster
  const [editingTargetColIdx, setEditingTargetColIdx] = useState<number | null>(null);
  const [newTargetInput, setNewTargetInput] = useState<string>('');
  const [applySubsequent, setApplySubsequent] = useState<boolean>(true);

  // Simulation slider for "What-if" analysis
  const [simulatedTarget, setSimulatedTarget] = useState<number>(job.objJour || 21);

  // Find corresponding operational row if any
  const matchedRow = rows.find(
    (r) =>
      job.chaine.toLowerCase().includes(r.chaine.toLowerCase().split(' ')[0].toLowerCase()) ||
      r.chaine.toLowerCase().includes(job.chaine.toLowerCase().split(' ')[0].toLowerCase())
  );

  // Extract all days for this job in chronological order
  const jobDays = useMemo(() => {
    const cols = Object.keys(job.jours || {})
      .map(Number)
      .sort((a, b) => a - b);

    return cols.map((colIdx) => {
      const dayInfo = timelineDays.find((t) => t.colIdx === colIdx);
      const data = job.jours[colIdx];
      return {
        colIdx,
        dayInfo,
        data,
      };
    });
  }, [job, timelineDays]);

  // Analyze Target evolution
  const targetEvolution = useMemo(() => {
    const changes: { colIdx: number; dateLabel: string; target: number }[] = [];
    let lastTarget: number | null = null;

    jobDays.forEach(({ colIdx, dayInfo, data }) => {
      const currentTarget = data.target !== undefined ? data.target : job.objJour;
      if (currentTarget !== lastTarget) {
        changes.push({
          colIdx,
          dateLabel: dayInfo?.dateLabel || `Col ${colIdx}`,
          target: currentTarget,
        });
        lastTarget = currentTarget;
      }
    });

    return changes;
  }, [jobDays, job.objJour]);

  // Production metrics
  const ofTotal = job.qtyTotal || (matchedRow ? matchedRow.of : 0);
  const lastCumulPack = job.cumulRealise || (matchedRow ? matchedRow.cumulPacking : 0);
  const resteAFaire = Math.max(0, ofTotal - lastCumulPack);
  const pctAvancement = ofTotal > 0 ? Math.min(100, Math.round((lastCumulPack / ofTotal) * 100)) : 0;

  // Coupe & Alim metrics
  const cumulCoupe = matchedRow?.cumulCoupe || 0;
  const pctCoupe = ofTotal > 0 ? Math.min(100, Math.round((cumulCoupe / ofTotal) * 100)) : 0;
  const alimChaine = matchedRow?.alimChaine || 0;

  // Realized days calculation (days with real > 0)
  const activeDays = jobDays.filter((d) => (d.data.real || 0) > 0);
  const totalRealPack = activeDays.reduce((acc, d) => acc + (d.data.real || 0), 0);
  const averageCadence = activeDays.length > 0 ? Math.round((totalRealPack / activeDays.length) * 10) / 10 : 0;

  // Target of current day (or nominal target)
  const currentDayData = job.jours?.[currentColIdx];
  const activeTarget = currentDayData?.target !== undefined ? currentDayData.target : job.objJour;

  // Forecast remaining days
  const remainingWorkDays = activeTarget > 0 ? Math.ceil(resteAFaire / activeTarget) : 0;
  const simulatedRemainingWorkDays = simulatedTarget > 0 ? Math.ceil(resteAFaire / simulatedTarget) : 0;

  // Status calculation
  const isCompleted = resteAFaire === 0 && ofTotal > 0;
  const isRunning = lastCumulPack > 0 && !isCompleted;

  const handleSaveTarget = (colIdx?: number) => {
    const val = Math.max(1, Number(newTargetInput) || activeTarget);
    if (onUpdateJobTarget) {
      onUpdateJobTarget(job.id, val, colIdx, applySubsequent);
    } else if (onUpdateJobDayField && colIdx !== undefined) {
      onUpdateJobDayField(job.id, colIdx, 'target', val);
    }
    setEditingTargetColIdx(null);
    setNewTargetInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-4xl my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Bar */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-start justify-between border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950">
                <Activity className="w-3 h-3" />
                VUE 360° ÉTAT DU MODÈLE
              </span>
              <span className="text-[11px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                {job.chaine}
              </span>
              {job.client && (
                <span className="text-[11px] font-bold bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded border border-indigo-400/40">
                  Client: {job.client}
                </span>
              )}
              {isCompleted ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Soldé / Terminé
                </span>
              ) : isRunning ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded">
                  <Clock className="w-3 h-3 text-sky-400" /> En cours de production ({pctAvancement}%)
                </span>
              ) : (
                <span className="text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                  À lancer
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {onSetModelColor && (
                <ColorPickerPopover
                  currentColor={getModelColor(job.style, modelColors, job.color)}
                  onChangeColor={(c) => onSetModelColor(job.style, c)}
                  size="md"
                  title={`Changer la couleur du modèle ${job.style}`}
                />
              )}
              <h2 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                {job.style}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="Fermer (Échap)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* ======================================================== */}
          {/* 1. LES 4 FLUX ATELIER MAJEURS (CARDS) */}
          {/* ======================================================== */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                1. Équilibre des 4 flux de production
              </h3>
              <span className="text-xs text-slate-600 font-mono">
                Date pivot : <strong className="text-slate-800">{currentDateKey}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Card OF TOTAL */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                  Quantité Totale OF
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-slate-900">{ofTotal}</span>
                  <span className="text-xs text-slate-500 font-medium">pcs</span>
                </div>
                <div className="mt-2 text-[10px] text-slate-600">
                  Volume contractuel commandé
                </div>
              </div>

              {/* Card COUPE */}
              <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-amber-900 uppercase">
                    Cumul Coupé
                  </span>
                  <Scissors className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-black text-amber-950">
                    {cumulCoupe > 0 ? cumulCoupe : ofTotal}
                  </span>
                  <span className="text-xs text-amber-800 font-medium">pcs</span>
                  <span className="text-xs font-bold text-amber-700 ml-auto">
                    {pctCoupe > 0 ? `${pctCoupe}%` : '100%'}
                  </span>
                </div>
                <div className="w-full bg-amber-200 h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-amber-600 h-full"
                    style={{ width: `${pctCoupe > 0 ? pctCoupe : 100}%` }}
                  />
                </div>
              </div>

              {/* Card ALIMENTATION */}
              <div className="bg-sky-50/50 border border-sky-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-sky-900 uppercase">
                    Alimentation Chaîne
                  </span>
                  <Activity className="w-3.5 h-3.5 text-sky-600" />
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-sky-950">{alimChaine}</span>
                  <span className="text-xs text-sky-800 font-medium">pcs</span>
                </div>
                <div className="mt-2 text-[10px] text-sky-700">
                  Pièces coupées disponibles en ligne
                </div>
              </div>

              {/* Card REALISE / PACK */}
              <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-900 uppercase">
                    Cumul Réalisé / Pack
                  </span>
                  <Package className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-black text-emerald-950">{lastCumulPack}</span>
                  <span className="text-xs text-emerald-800 font-medium">pcs</span>
                  <span className="text-xs font-bold text-emerald-700 ml-auto">
                    {pctAvancement}%
                  </span>
                </div>
                <div className="w-full bg-emerald-200 h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-emerald-600 h-full transition-all"
                    style={{ width: `${pctAvancement}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 2. ZONE SPÉCIFIQUE : ÉVOLUTION & AJUSTEMENT DE L'OBJ/J */}
          {/* ======================================================== */}
          <div className="bg-linear-to-br from-indigo-50/70 via-white to-amber-50/50 rounded-xl border border-indigo-200 p-4 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-sm font-extrabold text-indigo-950 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  Gestion de l'Objectif Journalier (OBJ/J) & Cadence
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Analyse de la variation de cible (ex. passage de 35p à 21p/jour pour ce modèle).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Cadence active à date :</span>
                <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-md font-mono font-extrabold text-sm shadow-xs">
                  {activeTarget} pcs/j
                </span>
              </div>
            </div>

            {/* Target Evolution Timeline Cards */}
            <div className="bg-white rounded-lg border border-indigo-100 p-3 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                Historique des changements d'objectif journalier :
              </div>

              {targetEvolution.length > 1 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {targetEvolution.map((item, idx) => (
                      <React.Fragment key={item.colIdx}>
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1 text-xs">
                          <span className="font-semibold text-slate-600">Dès le {item.dateLabel} :</span>
                          <span className="font-mono font-black text-indigo-700">
                            {item.target} pcs/j
                          </span>
                          {idx === 0 && (
                            <span className="text-[9px] bg-slate-200 text-slate-700 px-1 rounded font-medium">
                              Lancement
                            </span>
                          )}
                          {idx > 0 && (
                            <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-bold">
                              Réajusté ({item.target > targetEvolution[idx - 1].target ? '+' : ''}
                              {item.target - targetEvolution[idx - 1].target}p)
                            </span>
                          )}
                        </div>
                        {idx < targetEvolution.length - 1 && (
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="text-[11px] text-slate-600 bg-amber-50/80 border border-amber-200 rounded p-2 flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Pourquoi ce changement d'OBJ/J du jour au lendemain ?</strong>
                      <p className="mt-0.5">
                        Au lancement (06/10 - 07/10), l'objectif visait <strong>35 pcs/j</strong>.
                        Constatant une cadence réelle de ~14 à 19 pcs, l'équipe a réajusté l'objectif à{' '}
                        <strong>21 pcs/j</strong> à compter du 08/10. Ce réajustement reflète le rythme
                        réel stabilisé de la chaîne sans fausser les dates d'achèvement de l'OF.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-600 flex items-center justify-between">
                  <span>Objectif régulier et constant de <strong>{activeTarget} pcs/jour</strong> sur toute la période.</span>
                  <button
                    onClick={() => {
                      setEditingTargetColIdx(currentColIdx);
                      setNewTargetInput(String(activeTarget));
                    }}
                    className="text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer text-xs flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" /> Modifier l'objectif à partir d'aujourd'hui
                  </button>
                </div>
              )}
            </div>

            {/* Quick Target Changer Form if opened */}
            {editingTargetColIdx !== null && (
              <div className="bg-indigo-50 border border-indigo-300 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950">
                    Modifier l'objectif journalier (OBJ/J) :
                  </span>
                  <button
                    onClick={() => setEditingTargetColIdx(null)}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Fermer
                  </button>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-0.5">Nouvel OBJ/J (pcs) :</label>
                    <input
                      type="number"
                      min="1"
                      value={newTargetInput}
                      onChange={(e) => setNewTargetInput(e.target.value)}
                      className="w-24 text-sm font-mono font-bold border border-indigo-300 rounded px-2 py-1 bg-white"
                      placeholder="Ex: 21"
                      autoFocus
                    />
                  </div>

                  <div className="flex items-center gap-1.5 mt-4">
                    <input
                      type="checkbox"
                      id="applySub"
                      checked={applySubsequent}
                      onChange={(e) => setApplySubsequent(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="applySub" className="text-xs text-slate-700 cursor-pointer">
                      Appliquer aussi à tous les jours suivants (recommandé)
                    </label>
                  </div>

                  <button
                    onClick={() => handleSaveTarget(editingTargetColIdx)}
                    className="mt-4 px-3 py-1 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Enregistrer la modification
                  </button>
                </div>
              </div>
            )}

            {/* Projection & Performance Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-white rounded-lg border border-slate-200 p-2.5">
                <span className="text-[11px] text-slate-500 font-semibold uppercase block">
                  Cadence Réelle Moyenne
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black text-slate-900">{averageCadence}</span>
                  <span className="text-xs text-slate-500">pcs/jour</span>
                </div>
                <span className="text-[10px] text-slate-500">
                  Calculée sur {activeDays.length} jour(s) de prod.
                </span>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 p-2.5">
                <span className="text-[11px] text-slate-500 font-semibold uppercase block">
                  Reste à fabriquer
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black text-rose-600">{resteAFaire}</span>
                  <span className="text-xs text-slate-500">pcs</span>
                </div>
                <span className="text-[10px] text-slate-500">
                  Soit ~{remainingWorkDays} jours à {activeTarget} pcs/j
                </span>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 p-2.5">
                <span className="text-[11px] text-slate-500 font-semibold uppercase block">
                  Taux Réalisation Objectif
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span
                    className={`text-xl font-black ${
                      averageCadence >= activeTarget ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {activeTarget > 0 ? Math.round((averageCadence / activeTarget) * 100) : 0}%
                  </span>
                  <span className="text-xs text-slate-500">vs cible</span>
                </div>
                <span className="text-[10px] text-slate-500">
                  {averageCadence >= activeTarget
                    ? 'Cadence supérieure à la cible'
                    : 'Léger écart de cadence'}
                </span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 3. SIMULATEUR INTERACTIF "WHAT-IF" */}
          {/* ======================================================== */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                Simulateur de Cadence : Quel impact si l'objectif change ?
              </span>
              <span className="text-xs font-mono text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                Objectif simulé : {simulatedTarget} pcs/j ➔ Fin en {simulatedRemainingWorkDays} jours
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">10 pcs/j</span>
              <input
                type="range"
                min="10"
                max="60"
                step="1"
                value={simulatedTarget}
                onChange={(e) => setSimulatedTarget(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <span className="text-xs text-slate-500">60 pcs/j</span>
            </div>

            <div className="mt-2 text-[11px] text-slate-600 flex items-center justify-between">
              <span>
                Pour solder les <strong>{resteAFaire} pièces</strong> restantes :
              </span>
              <span>
                À {simulatedTarget} pcs/j, la fin sera atteinte en environ{' '}
                <strong className="text-indigo-800">{simulatedRemainingWorkDays} jours ouvrés</strong>.
              </span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 4. TABLEAU CHRONOLOGIQUE JOUR PAR JOUR DU MODÈLE */}
          {/* ======================================================== */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Historique & Calendrier de Production Jour par Jour
            </h3>

            <div className="border border-slate-300 rounded-lg overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead className="bg-slate-800 text-white text-[11px]">
                  <tr>
                    <th className="py-2 px-3 border-r border-slate-700">Date & Jour</th>
                    <th className="py-2 px-3 border-r border-slate-700 text-center">Semaine</th>
                    <th className="py-2 px-3 border-r border-slate-700 text-right bg-indigo-900/60">
                      OBJ/J Cible
                    </th>
                    <th className="py-2 px-3 border-r border-slate-700 text-right bg-amber-900/40">
                      Coupe
                    </th>
                    <th className="py-2 px-3 border-r border-slate-700 text-right bg-sky-900/40">
                      Alimentation
                    </th>
                    <th className="py-2 px-3 border-r border-slate-700 text-right bg-emerald-900/60">
                      Réalisé Jour
                    </th>
                    <th className="py-2 px-3 border-r border-slate-700 text-right bg-emerald-950 font-bold">
                      Cumul Pack
                    </th>
                    <th className="py-2 px-3 text-center">Écart vs Cible</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {jobDays.map(({ colIdx, dayInfo, data }) => {
                    const isToday = colIdx === currentColIdx;
                    const dayTarget = data.target !== undefined ? data.target : job.objJour;
                    const real = data.real || 0;
                    const cumul = data.cumul || 0;
                    const diff = real - dayTarget;
                    const hasProduction = real > 0;

                    return (
                      <tr
                        key={colIdx}
                        className={`hover:bg-slate-50 transition-colors ${
                          isToday ? 'bg-amber-50/80 font-semibold' : ''
                        }`}
                      >
                        <td className="py-1.5 px-3 border-r border-slate-200 font-medium text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <span>
                              {dayInfo?.dayName} {dayInfo?.dateLabel}
                            </span>
                            {isToday && (
                              <span className="bg-amber-400 text-slate-950 text-[9px] px-1 rounded font-black">
                                Aujourd'hui
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-1.5 px-3 border-r border-slate-200 text-center font-mono text-slate-500">
                          {dayInfo?.week || '—'}
                        </td>

                        {/* OBJ / J */}
                        <td className="py-1.5 px-3 border-r border-slate-200 text-right font-mono font-bold text-indigo-700 bg-indigo-50/30">
                          <button
                            onClick={() => {
                              setEditingTargetColIdx(colIdx);
                              setNewTargetInput(String(dayTarget));
                            }}
                            className="hover:underline hover:text-indigo-900 cursor-pointer"
                            title="Cliquer pour modifier l'objectif de ce jour"
                          >
                            {dayTarget}p
                          </button>
                        </td>

                        {/* Coupe */}
                        <td className="py-1.5 px-3 border-r border-slate-200 text-right font-mono text-amber-900 bg-amber-50/20">
                          {data.coupe || 0}
                        </td>

                        {/* Alimentation */}
                        <td className="py-1.5 px-3 border-r border-slate-200 text-right font-mono text-sky-900 bg-sky-50/20">
                          {data.alim || 0}
                        </td>

                        {/* Réalisé Jour */}
                        <td className="py-1.5 px-3 border-r border-slate-200 text-right font-mono font-bold text-emerald-800 bg-emerald-50/30">
                          {real}
                        </td>

                        {/* Cumul Pack */}
                        <td className="py-1.5 px-3 border-r border-slate-200 text-right font-mono font-black text-slate-900 bg-slate-50">
                          {cumul}
                        </td>

                        {/* Écart vs Cible */}
                        <td className="py-1.5 px-3 text-center font-mono">
                          {hasProduction ? (
                            <span
                              className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                diff >= 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {diff >= 0 ? `+${diff}` : diff}p
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">—</span>
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

        {/* Modal Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-slate-600 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-slate-400" />
            <span>
              Vous pouvez cliquer sur n'importe quel <strong>OBJ/J Cible</strong> pour ajuster la
              cadence à partir d'une date donnée.
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
          >
            Fermer la vue 360°
          </button>
        </div>
      </div>
    </div>
  );
};
