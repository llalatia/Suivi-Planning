import React, { useState, useMemo } from 'react';
import {
  MicroJob,
  MicroTimelineDay,
  MicroJobDayData,
  MicroDailyRow,
} from '../../data/microPlanningTypes';
import { matchStyleWithModel, rowsForJob } from '../../utils/useMicroPlanning';
import { getModelColor, hexToRgba } from '../../utils/modelColorUtils';
import { formatDay } from '../../utils/dateDisplay';
import { ColorPickerPopover } from './ColorPickerPopover';
import {
  Layers,
  Calendar,
  Activity,
  CheckCircle2,
  FileSpreadsheet,
  Info,
  Edit2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface TableauMicroSimulationExcelProps {
  jobs: MicroJob[];
  timelineDays: MicroTimelineDay[];
  currentColIdx: number;
  rows: MicroDailyRow[];
  selectedRow?: MicroDailyRow;
  selectedChainFilter: string;
  searchQuery: string;
  onUpdateJobDayCell?: (jobId: string, colIdx: number, realValue: number, targetValue?: number) => void;
  onUpdateJobDayField?: (
    jobId: string,
    colIdx: number,
    field: 'coupe' | 'alim' | 'real' | 'cumul' | 'target',
    value: number
  ) => void;
  onUpdateJobTarget?: (
    jobId: string,
    newTarget: number,
    colIdx?: number,
    applyToSubsequentDays?: boolean
  ) => void;
  onSelectModelHealthJob: (job: MicroJob) => void;
  onOpenDayModal?: (data: {
    jobId: string;
    modelName: string;
    colIdx: number;
    dateLabel: string;
    week: string;
    coupe: number;
    alim: number;
    real: number;
    cumul: number;
    target: number;
  }) => void;
  displayedWeeks: string[];
  displayedDays: MicroTimelineDay[];
  weeksMap: Map<string, MicroTimelineDay[]>;
  modelColors?: Record<string, string>;
  onSetModelColor?: (modelName: string, color: string) => void;
}

export const TableauMicroSimulationExcel: React.FC<TableauMicroSimulationExcelProps> = ({
  jobs,
  timelineDays,
  currentColIdx,
  rows,
  selectedRow,
  selectedChainFilter,
  searchQuery,
  onUpdateJobDayCell,
  onUpdateJobDayField,
  onUpdateJobTarget,
  onSelectModelHealthJob,
  onOpenDayModal,
  displayedWeeks,
  displayedDays,
  weeksMap,
  modelColors = {},
  onSetModelColor,
}) => {
  // Inline editing state
  const [inlineEdit, setInlineEdit] = useState<{
    jobId: string;
    colIdx: number;
    field: 'coupe' | 'alim' | 'real' | 'cumul' | 'target';
    val: string;
  } | null>(null);

  // Filter jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      const matchChain =
        selectedChainFilter === 'ALL' ||
        j.chaine.toLowerCase().includes(selectedChainFilter.toLowerCase());
      const matchSearch =
        !searchQuery ||
        j.style.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.chaine.toLowerCase().includes(searchQuery.toLowerCase());
      return matchChain && matchSearch;
    });
  }, [jobs, selectedChainFilter, searchQuery]);

  // Group simulation jobs by chain
  const simulationJobsByChain = useMemo(() => {
    const map = new Map<string, MicroJob[]>();
    filteredJobs.forEach((job) => {
      if (!map.has(job.chaine)) map.set(job.chaine, []);
      map.get(job.chaine)!.push(job);
    });
    return map;
  }, [filteredJobs]);

  // Monochrome Chain style helpers (Black, White, Gray)
  const getChainHeaderBg = (chain: string) => {
    const c = chain.toUpperCase();
    if (c.includes('MARGUERITE')) return 'bg-slate-950 text-white border-slate-800';
    if (c.includes('TANA')) return 'bg-slate-900 text-white border-slate-800';
    if (c.includes('ROSE')) return 'bg-slate-850 text-slate-100 border-slate-700';
    if (c.includes('DHALIA')) return 'bg-slate-800 text-slate-100 border-slate-700';
    if (c.includes('SIEGE')) return 'bg-slate-700 text-slate-100 border-slate-600';
    return 'bg-slate-900 text-white border-slate-800';
  };

  // Helper to find the active job and day data on a chain for a given day colIdx
  const getActiveJobForChainAndDay = (
    chainJobs: MicroJob[],
    colIdx: number
  ): { job?: MicroJob; dayData?: MicroJobDayData } => {
    // 1. Look for job with recorded day data (including future planned days or zero-value planned entries)
    const jobWithData = chainJobs.find((j) => {
      const d = j.jours?.[colIdx];
      return d !== undefined;
    });

    if (jobWithData) {
      return { job: jobWithData, dayData: jobWithData.jours[colIdx] };
    }

    // 2. Look for job within launch and deadline range
    const jobInRange = chainJobs.find(
      (j) =>
        j.launchColIdx &&
        j.deadlineColIdx &&
        colIdx >= j.launchColIdx &&
        colIdx <= j.deadlineColIdx
    );
    if (jobInRange) {
      return { job: jobInRange, dayData: jobInRange.jours?.[colIdx] };
    }

    return {};
  };

  /**
   * Totaux des sous-lots du suivi journalier pour un style de la frise, au jour courant.
   * La frise reste saisie à la main (comme dans Excel) : ce calcul ne sert qu'à signaler
   * un désaccord entre la case tapée et le détail des lots.
   */
  const pivotLotsTotal = (
    job: MicroJob | undefined,
    isPivot: boolean,
    field: 'realPacking' | 'cumulPacking' | 'alimChaine' | 'cumulCoupe'
  ) => {
    if (!job || !isPivot) return null;
    const matched = rowsForJob(job, rows);
    if (matched.length === 0) return null;
    return { count: matched.length, total: matched.reduce((acc, r) => acc + (r[field] || 0), 0) };
  };

  const handleStartInlineEdit = (
    jobId: string,
    colIdx: number,
    field: 'coupe' | 'alim' | 'real' | 'cumul' | 'target',
    currentVal: number
  ) => {
    setInlineEdit({
      jobId,
      colIdx,
      field,
      val: currentVal > 0 ? String(currentVal) : '',
    });
  };

  const handleSaveInlineEdit = () => {
    if (inlineEdit) {
      const val = Math.max(0, Number(inlineEdit.val) || 0);
      if (inlineEdit.field === 'target') {
        if (onUpdateJobTarget) {
          onUpdateJobTarget(inlineEdit.jobId, val, inlineEdit.colIdx, false);
        } else if (onUpdateJobDayField) {
          onUpdateJobDayField(inlineEdit.jobId, inlineEdit.colIdx, 'target', val);
        }
      } else if (onUpdateJobDayField) {
        onUpdateJobDayField(inlineEdit.jobId, inlineEdit.colIdx, inlineEdit.field, val);
      } else if (onUpdateJobDayCell && inlineEdit.field === 'real') {
        onUpdateJobDayCell(inlineEdit.jobId, inlineEdit.colIdx, val);
      }
      setInlineEdit(null);
    }
  };

  return (
    <div className="w-full select-none">
      <div className="overflow-x-auto w-full max-h-[68vh]">
        <table className="w-full text-xs text-left border-collapse table-fixed">
          <colgroup>
            <col className="w-[280px] min-w-[280px] max-w-[280px]" />
            {displayedDays.map((d) => (
              <col key={`col_excel_${d.colIdx}`} className="w-[124px] min-w-[124px] max-w-[136px]" />
            ))}
          </colgroup>
          {/* Sticky Header: Weeks & Days */}
          <thead className="sticky top-0 z-30 shadow-xs">
            {/* LIGNE 1 : SEMAINES */}
            <tr className="bg-slate-900 text-white font-bold text-[10.5px] uppercase tracking-wider">
              <th className="sticky left-0 z-40 bg-slate-950 py-2 px-3 border-r-4 border-slate-700 shadow-[4px_0_10px_rgba(0,0,0,0.22)] text-left min-w-[280px] w-[280px] max-w-[280px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-white font-extrabold text-[11px]">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-slate-300" />
                    <span>CHAÎNE &amp; INDICATEURS EXCEL</span>
                  </div>
                  <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono font-bold">
                    8 LIGNES / CHAÎNE
                  </span>
                </div>
              </th>

              {displayedWeeks.map((weekCode) => {
                const daysInWeek = weeksMap.get(weekCode) || [];
                const todayDay = daysInWeek.find((d) => d.colIdx === currentColIdx);
                const hasToday = !!todayDay;
                const hasPastDays = daysInWeek.some((d) => d.colIdx < currentColIdx);
                const hasFutureDays = daysInWeek.some((d) => d.colIdx > currentColIdx);

                return (
                  <th
                    key={`wk_excel_${weekCode}`}
                    colSpan={daysInWeek.length}
                    className={`py-1.5 px-1 text-center border-r border-slate-700 font-extrabold font-mono transition-colors ${
                      hasToday
                        ? 'bg-[#FFFF00] text-slate-950 font-black border-b-2 border-b-amber-400'
                        : hasPastDays && !hasFutureDays
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-850 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-xs font-black">{weekCode}</span>
                      {hasToday ? (
                        <span className="text-[9px] bg-slate-950 text-[#FFFF00] px-1.5 py-0.2 rounded font-sans uppercase font-black">
                          ★ {formatDay(todayDay?.dateLabel)} actif
                        </span>
                      ) : null}
                    </div>
                  </th>
                );
              })}
            </tr>

            {/* LIGNE 2 : MÉTRIQUES + DATES */}
            <tr className="bg-slate-800 text-slate-200 font-bold text-[10px] uppercase border-b-2 border-slate-600">
              <th className="sticky left-0 z-40 bg-slate-900 py-1.5 px-3 border-r-4 border-slate-600 shadow-[4px_0_10px_rgba(0,0,0,0.22)] text-left min-w-[280px] w-[280px] max-w-[280px] text-slate-200">
                <div className="flex items-center justify-between">
                  <span>MÉTRIQUE / RUBRIQUE</span>
                  <span className="text-[9px] text-slate-400 font-normal">clic cell pour éditer</span>
                </div>
              </th>

              {displayedDays.map((day) => {
                const isPivot = day.colIdx === currentColIdx;
                const isPast = day.colIdx < currentColIdx;

                return (
                  <th
                    key={`day_th_excel_${day.colIdx}`}
                    className={`py-1 px-1 text-center border-r font-mono min-w-[124px] w-[124px] max-w-[136px] transition-colors ${
                      isPivot
                        ? 'bg-[#FFFF00] border-amber-400 text-slate-950 font-black ring-1 ring-amber-400'
                        : isPast
                        ? 'bg-slate-800/95 border-slate-700 text-slate-200'
                        : 'bg-slate-850 border-slate-700 text-slate-300'
                    }`}
                    title={`${day.dayName} ${formatDay(day.dateLabel)} (${day.week})`}
                  >
                    <div className="flex items-center justify-between px-1 text-[9px] font-sans font-bold leading-none">
                      <span className={`uppercase ${isPivot ? 'text-slate-950 font-black' : 'text-slate-400'}`}>{day.dayName}</span>
                      <div className="flex items-center gap-1">
                        <span
                          className={`text-[10px] font-mono ${
                            isPivot ? 'text-slate-950 underline font-black' : ''
                          }`}
                        >
                          {formatDay(day.dateLabel)}
                        </span>
                        {isPivot && (
                          <span className="text-[7.5px] bg-slate-950 text-[#FFFF00] px-1 rounded font-sans font-extrabold">
                            MAJ
                          </span>
                        )}
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body: 8 Stacked Rows per Chain Group */}
          <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
            {Array.from(simulationJobsByChain.entries()).map(([chainName, chainJobs]) => {
              const isChainHighlighted =
                selectedRow &&
                (chainName.toLowerCase().includes(selectedRow.chaine.toLowerCase()) ||
                  selectedRow.chaine.toLowerCase().includes(chainName.toLowerCase()));

              return (
                <React.Fragment key={`excel_chain_${chainName}`}>
                  {/* Chain Header Banner */}
                  <tr className={`border-t-2 border-slate-400 ${isChainHighlighted ? 'ring-2 ring-amber-400' : ''}`}>
                    <td
                      colSpan={1 + displayedDays.length}
                      className={`py-2 px-3 font-sans font-extrabold text-[12px] tracking-wide uppercase border-b-2 ${getChainHeaderBg(
                        chainName
                      )}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-amber-400" />
                          <span>SITE 1 — {chainName}</span>
                          {isChainHighlighted && (
                            <span className="bg-amber-400 text-slate-950 text-[9px] px-2 py-0.5 rounded font-black tracking-normal">
                              ★ Chaîne active dans le tableau du haut
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-300 font-mono font-medium lowercase">
                          {chainJobs.length} modèle(s) programmés en confection
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* ROW 1: CLIENT / BUYER */}
                  <tr className="bg-slate-50/80 hover:bg-slate-100/70 border-b border-slate-200 transition-colors">
                    <td className="sticky left-0 z-30 bg-slate-100 py-1.5 px-3 border-r-4 border-slate-400 shadow-[4px_0_10px_rgba(0,0,0,0.22)] font-sans text-slate-700 text-[10.5px]">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-800">CLIENT / BUYER</span>
                        <span className="text-[9px] text-slate-500 uppercase font-semibold">Donneur d'ordre</span>
                      </div>
                    </td>
                    {displayedDays.map((day) => {
                      const { job: activeJob } = getActiveJobForChainAndDay(chainJobs, day.colIdx);
                      const isPivot = day.colIdx === currentColIdx;
                      return (
                        <td
                          key={`client_${chainName}_${day.colIdx}`}
                          className={`py-1 px-1.5 text-center font-sans font-bold text-slate-800 text-[10.5px] border-r border-slate-200 truncate ${
                            isPivot ? 'bg-amber-50/60 font-black text-amber-950' : ''
                          }`}
                        >
                          {activeJob?.client || '—'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* ROW 2: REF / STYLE (Clickable for 360 Health Sheet) */}
                  <tr className="bg-white hover:bg-slate-50 border-b border-slate-200 transition-colors">
                    <td className="sticky left-0 z-30 bg-white py-2 px-3 border-r-4 border-slate-400 shadow-[4px_0_10px_rgba(0,0,0,0.22)] font-sans text-slate-900 text-[11px] shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-slate-900">REF / STYLE</span>
                        </div>
                        <span className="text-[9px] bg-slate-100 text-slate-800 px-1.5 py-0.2 rounded font-semibold border border-slate-300">
                          Fiche 360°
                        </span>
                      </div>
                    </td>
                    {displayedDays.map((day) => {
                      const { job: activeJob } = getActiveJobForChainAndDay(chainJobs, day.colIdx);
                      const isPivot = day.colIdx === currentColIdx;
                      const isSelectedStyle =
                        selectedRow && activeJob && matchStyleWithModel(activeJob.style, selectedRow.modele, selectedRow.chaine);
                      const mColor = activeJob ? getModelColor(activeJob.style, modelColors, activeJob.color) : undefined;

                      return (
                        <td
                          key={`style_${chainName}_${day.colIdx}`}
                          style={
                            !isPivot && activeJob && mColor
                              ? {
                                  backgroundColor: hexToRgba(mColor, 0.12),
                                  borderTop: `2.5px solid ${mColor}`,
                                }
                              : undefined
                          }
                          className={`py-1 px-1 text-center font-sans border-r border-slate-200 transition-colors ${
                            isSelectedStyle
                              ? 'bg-slate-200 font-black ring-1 ring-slate-400'
                              : isPivot
                              ? 'bg-[#FFFF00]/30 font-black ring-1 ring-amber-400'
                              : ''
                          }`}
                        >
                          {activeJob ? (
                            <div className="flex items-center justify-center gap-1 w-full">
                              {onSetModelColor && (
                                <ColorPickerPopover
                                  currentColor={mColor || '#2563EB'}
                                  onChangeColor={(col) => onSetModelColor(activeJob.style, col)}
                                  size="sm"
                                  title={`Changer la couleur du modèle ${activeJob.style}`}
                                />
                              )}
                              <button
                                type="button"
                                onClick={() => onSelectModelHealthJob(activeJob)}
                                className="hover:text-black hover:underline font-extrabold text-slate-900 text-[10px] truncate px-0.5 py-0.5 cursor-pointer flex items-center justify-center gap-0.5 group"
                                title={`Cliquer pour ouvrir la vue 360° du modèle ${activeJob.style}`}
                              >
                                <span className="truncate">{activeJob.style}</span>
                                <Activity className="w-2.5 h-2.5 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-[10px]">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* ROW 3: QTE / QTY (Total OF pcs) */}
                  <tr className="bg-slate-50/60 hover:bg-slate-100/60 border-b border-slate-200 transition-colors">
                    <td className="sticky left-0 z-30 bg-slate-100 py-1 px-3 border-r-4 border-slate-400 shadow-[4px_0_10px_rgba(0,0,0,0.22)] font-sans text-slate-700 text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">QTE / QTY</span>
                        <span className="text-[9px] text-slate-500 uppercase font-medium">Taille lot OF</span>
                      </div>
                    </td>
                    {displayedDays.map((day) => {
                      const { job: activeJob } = getActiveJobForChainAndDay(chainJobs, day.colIdx);
                      const isPivot = day.colIdx === currentColIdx;
                      return (
                        <td
                          key={`qty_${chainName}_${day.colIdx}`}
                          className={`py-1 px-1.5 text-center font-mono font-bold text-slate-700 text-[10.5px] border-r border-slate-200 ${
                            isPivot ? 'bg-[#FFFF00]/20' : ''
                          }`}
                        >
                          {activeJob?.qtyTotal ? `${activeJob.qtyTotal} pcs` : '—'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* ROW 4: OBJ/J / TARGET (Cadence journalière - In-Cell Edit & Variable Target Detection) */}
                  <tr className="bg-white hover:bg-slate-50 border-b border-slate-200 transition-colors">
                    <td className="sticky left-0 z-30 bg-white py-1.5 px-3 border-r-4 border-slate-400 shadow-[4px_0_10px_rgba(0,0,0,0.22)] font-sans text-slate-900 text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-900">OBJ/J / TARGET</span>
                        <span className="text-[8.5px] bg-slate-200 text-slate-900 px-1 rounded font-bold uppercase">
                          Cadence pcs/j
                        </span>
                      </div>
                    </td>
                    {displayedDays.map((day) => {
                      const { job: activeJob, dayData } = getActiveJobForChainAndDay(chainJobs, day.colIdx);
                      const isPivot = day.colIdx === currentColIdx;
                      const targetVal = dayData?.target !== undefined ? dayData.target : (activeJob?.objJour || 0);

                      const isEditingTarget =
                        inlineEdit?.jobId === activeJob?.id &&
                        inlineEdit?.colIdx === day.colIdx &&
                        inlineEdit?.field === 'target';

                      // Detect variable cadence change (e.g. 35 -> 21)
                      const isSpecialBliovaChange =
                        activeJob?.style.toUpperCase().includes('BLIOVA') &&
                        targetVal === 21 &&
                        day.colIdx >= 264;

                      return (
                        <td
                          key={`target_${chainName}_${day.colIdx}`}
                          className={`py-1 px-1 text-center font-mono border-r border-slate-200 ${
                            isSpecialBliovaChange
                              ? 'bg-slate-200'
                              : isPivot
                              ? 'bg-[#FFFF00]/25 font-black'
                              : ''
                          }`}
                        >
                          {activeJob ? (
                            isEditingTarget ? (
                              <input
                                type="number"
                                min="0"
                                autoFocus
                                value={inlineEdit.val}
                                onChange={(e) => setInlineEdit({ ...inlineEdit, val: e.target.value })}
                                onBlur={handleSaveInlineEdit}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlineEdit();
                                  if (e.key === 'Escape') setInlineEdit(null);
                                }}
                                className="w-14 text-center text-[10.5px] font-black bg-white border border-slate-900 rounded p-0 text-slate-900"
                              />
                            ) : (
                              <div
                                onClick={() => handleStartInlineEdit(activeJob.id, day.colIdx, 'target', targetVal)}
                                onDoubleClick={() => {
                                  if (onOpenDayModal) {
                                    onOpenDayModal({
                                      jobId: activeJob.id,
                                      modelName: activeJob.style,
                                      colIdx: day.colIdx,
                                      dateLabel: formatDay(day.dateLabel),
                                      week: day.week,
                                      coupe: dayData?.coupe || 0,
                                      alim: dayData?.alim || 0,
                                      real: dayData?.real || 0,
                                      cumul: dayData?.cumul || 0,
                                      target: targetVal,
                                    });
                                  }
                                }}
                                className="cursor-pointer hover:bg-slate-100 rounded px-1 py-0.5 transition flex items-center justify-center gap-1 select-none"
                                title={`Objectif journalier : ${targetVal} pcs/j. Cliquer pour éditer ce jour, double-clic pour propager aux jours suivants.`}
                              >
                                <span className="font-extrabold text-slate-900 text-[10.5px]">
                                  {targetVal > 0 ? `${targetVal}p` : '—'}
                                </span>
                                {isSpecialBliovaChange && (
                                  <span
                                    className="text-[8px] bg-slate-900 text-white font-black px-1 rounded tracking-tighter"
                                    title="Changement de cadence appliqué : 21 pcs/j"
                                  >
                                    21p
                                  </span>
                                )}
                              </div>
                            )
                          ) : (
                            <span className="text-slate-300 text-[10px]">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* ROW 5: REAL PACK / Achieved qty (Pièces emballées du jour - JAUNE pour date du jour) */}
                  <tr className="bg-slate-50 hover:bg-slate-100 border-b border-slate-200 transition-colors">
                    <td className="sticky left-0 z-30 bg-slate-100 py-1.5 px-3 border-r-4 border-slate-400 shadow-[4px_0_10px_rgba(0,0,0,0.22)] font-sans text-slate-950 text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-slate-950">REAL PACK / Achieved qty</span>
                        <span className="text-[8.5px] bg-slate-200 text-slate-800 px-1 rounded font-bold uppercase border border-slate-300">
                          Réalisé jour
                        </span>
                      </div>
                    </td>
                    {displayedDays.map((day) => {
                      const { job: activeJob, dayData } = getActiveJobForChainAndDay(chainJobs, day.colIdx);
                      const isPivot = day.colIdx === currentColIdx;
                      // La case du jour courant reste une saisie manuelle, comme dans la SIMULATION
                      // d'Excel ; la somme des lots du journalier ne sert que de contrôle affiché.
                      const lots = pivotLotsTotal(activeJob, isPivot, 'realPacking');
                      const realVal = dayData?.real || 0;
                      const ecartReal = !!lots && lots.total !== realVal;

                      const isEditingReal =
                        inlineEdit?.jobId === activeJob?.id &&
                        inlineEdit?.colIdx === day.colIdx &&
                        inlineEdit?.field === 'real';

                      return (
                        <td
                          key={`real_${chainName}_${day.colIdx}`}
                          className={`py-1 px-1 text-center font-mono border-r border-slate-200 ${
                            isPivot ? 'bg-[#FFFF00] font-black text-slate-950 ring-1 ring-amber-400' : ''
                          }`}
                        >
                          {activeJob ? (
                            isEditingReal ? (
                              <input
                                type="number"
                                min="0"
                                autoFocus
                                value={inlineEdit.val}
                                onChange={(e) => setInlineEdit({ ...inlineEdit, val: e.target.value })}
                                onBlur={handleSaveInlineEdit}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlineEdit();
                                  if (e.key === 'Escape') setInlineEdit(null);
                                }}
                                className="w-14 text-center text-[10.5px] font-black bg-white border border-slate-900 rounded p-0 text-slate-950"
                              />
                            ) : (
                              <div
                                onClick={() => handleStartInlineEdit(activeJob.id, day.colIdx, 'real', realVal)}
                                className={`w-full py-0.5 rounded cursor-pointer transition select-none ${
                                  isPivot
                                    ? 'font-black text-slate-950 text-[11px]'
                                    : realVal > 0
                                    ? 'font-black text-slate-950 bg-slate-200 hover:bg-slate-300 text-[11px]'
                                    : 'text-slate-400 hover:bg-slate-100 text-[10px]'
                                }`}
                                title={
                                  ecartReal
                                    ? `REAL PACK du ${formatDay(day.dateLabel)} : ${realVal} pcs saisis ici. Le suivi journalier totalise ${lots.total} pcs sur ${lots.count} sous-lots (cliquer pour éditer).`
                                    : `REAL PACK : ${realVal || 0} pcs (cliquer pour éditer)`
                                }
                              >
                                {realVal > 0 ? realVal : (day.colIdx > currentColIdx ? '—' : 0)}
                              </div>
                            )
                          ) : (
                            <span className="text-slate-300 text-[10px]">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* ROW 6: CUMUL PACK / Cumulative qty (Cumul emballage à date) */}
                  <tr className="bg-white hover:bg-slate-50 border-b border-slate-200 transition-colors">
                    <td className="sticky left-0 z-30 bg-white py-1.5 px-3 border-r-4 border-slate-400 shadow-[4px_0_10px_rgba(0,0,0,0.22)] font-sans text-slate-950 text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-slate-950">CUMUL PACK / Cumulative qty</span>
                        <span className="text-[8.5px] bg-slate-200 text-slate-950 px-1 rounded font-black uppercase">
                          Cumul emballé
                        </span>
                      </div>
                    </td>
                    {displayedDays.map((day) => {
                      const { job: activeJob, dayData } = getActiveJobForChainAndDay(chainJobs, day.colIdx);
                      const isPivot = day.colIdx === currentColIdx;
                      const lots = pivotLotsTotal(activeJob, isPivot, 'cumulPacking');
                      const cumulVal = dayData?.cumul || 0;
                      const ecartCumul = !!lots && lots.total !== cumulVal;

                      const isEditingCumul =
                        inlineEdit?.jobId === activeJob?.id &&
                        inlineEdit?.colIdx === day.colIdx &&
                        inlineEdit?.field === 'cumul';

                      return (
                        <td
                          key={`cumul_${chainName}_${day.colIdx}`}
                          className={`py-1 px-1 text-center font-mono border-r border-slate-200 ${
                            isPivot ? 'bg-[#FFFF00]/40 font-black text-slate-950' : ''
                          }`}
                        >
                          {activeJob ? (
                            isEditingCumul ? (
                              <input
                                type="number"
                                min="0"
                                autoFocus
                                value={inlineEdit.val}
                                onChange={(e) => setInlineEdit({ ...inlineEdit, val: e.target.value })}
                                onBlur={handleSaveInlineEdit}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlineEdit();
                                  if (e.key === 'Escape') setInlineEdit(null);
                                }}
                                className="w-14 text-center text-[10.5px] font-black bg-white border border-slate-900 rounded p-0 text-slate-950"
                              />
                            ) : (
                              <div
                                onClick={() => handleStartInlineEdit(activeJob.id, day.colIdx, 'cumul', cumulVal)}
                                className={`w-full py-0.5 rounded cursor-pointer transition select-none ${
                                  cumulVal > 0
                                    ? 'font-black text-slate-950 bg-slate-100 hover:bg-slate-200 text-[11px]'
                                    : 'text-slate-400 hover:bg-slate-50 text-[10px]'
                                }`}
                                title={
                                  ecartCumul
                                    ? `CUMUL PACK du ${formatDay(day.dateLabel)} : ${cumulVal} pcs saisis ici. Le suivi journalier totalise ${lots.total} pcs sur ${lots.count} sous-lots (cliquer pour éditer).`
                                    : `CUMUL PACK : ${cumulVal || 0} pcs (cliquer pour éditer). C(n) = cumul de la veille + REAL PACK du jour n'est appliqué qu'aux cases encore vides.`
                                }
                              >
                                {cumulVal > 0 ? cumulVal : (day.colIdx > currentColIdx ? '—' : 0)}
                              </div>
                            )
                          ) : (
                            <span className="text-slate-300 text-[10px]">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* ROW 6bis: RESTE À FAIRE (calculé : Quantité OF - cumul de la veille) */}
                  <tr className="bg-indigo-50/60 hover:bg-indigo-100/60 border-b border-slate-200 transition-colors">
                    <td className="sticky left-0 z-30 bg-indigo-100 py-1.5 px-3 border-r-4 border-slate-400 shadow-[4px_0_10px_rgba(0,0,0,0.22)] font-sans text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-indigo-900">RESTE À FAIRE</span>
                        <span className="text-[8.5px] bg-indigo-200 text-indigo-900 px-1 rounded font-bold uppercase">
                          OF − C(n-1)
                        </span>
                      </div>
                    </td>
                    {displayedDays.map((day) => {
                      const { job: activeJob, dayData } = getActiveJobForChainAndDay(chainJobs, day.colIdx);
                      const isPivot = day.colIdx === currentColIdx;
                      const resteVal = dayData?.reste;

                      return (
                        <td
                          key={`reste_${chainName}_${day.colIdx}`}
                          className={`py-1 px-1 text-center font-mono border-r border-slate-200 ${
                            isPivot ? 'bg-[#FFFF00]/40' : ''
                          }`}
                        >
                          {activeJob && resteVal !== undefined ? (
                            <span
                              className={`text-[11px] font-black ${
                                resteVal === 0 ? 'text-emerald-700' : 'text-indigo-900'
                              }`}
                              title={`RESTE À FAIRE (calculé) : ${resteVal} pcs à l'entame du ${formatDay(day.dateLabel)}`}
                            >
                              {resteVal}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-[10px]">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* ROW 7: ALIMENTATION / cutting qty available */}
                  <tr className="bg-slate-50 hover:bg-slate-100 border-b border-slate-200 transition-colors">
                    <td className="sticky left-0 z-30 bg-slate-100 py-1.5 px-3 border-r-4 border-slate-400 shadow-[4px_0_10px_rgba(0,0,0,0.22)] font-sans text-slate-900 text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-900">ALIMENTATION / cutting qty</span>
                        <span className="text-[8.5px] bg-slate-200 text-slate-900 px-1 rounded font-bold uppercase">
                          Dispo coupe
                        </span>
                      </div>
                    </td>
                    {displayedDays.map((day) => {
                      const { job: activeJob, dayData } = getActiveJobForChainAndDay(chainJobs, day.colIdx);
                      const isPivot = day.colIdx === currentColIdx;
                      const lots = pivotLotsTotal(activeJob, isPivot, 'alimChaine');
                      const alimVal = dayData?.alim || 0;
                      const ecartAlim = !!lots && lots.total !== alimVal;

                      const isEditingAlim =
                        inlineEdit?.jobId === activeJob?.id &&
                        inlineEdit?.colIdx === day.colIdx &&
                        inlineEdit?.field === 'alim';

                      return (
                        <td
                          key={`alim_${chainName}_${day.colIdx}`}
                          className={`py-1 px-1 text-center font-mono border-r border-slate-200 ${
                            isPivot ? 'bg-[#FFFF00]/25 font-black text-slate-950' : ''
                          }`}
                        >
                          {activeJob ? (
                            isEditingAlim ? (
                              <input
                                type="number"
                                min="0"
                                autoFocus
                                value={inlineEdit.val}
                                onChange={(e) => setInlineEdit({ ...inlineEdit, val: e.target.value })}
                                onBlur={handleSaveInlineEdit}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlineEdit();
                                  if (e.key === 'Escape') setInlineEdit(null);
                                }}
                                className="w-14 text-center text-[10.5px] font-bold bg-white border border-slate-900 rounded p-0 text-slate-950"
                              />
                            ) : (
                              <div
                                onClick={() => handleStartInlineEdit(activeJob.id, day.colIdx, 'alim', alimVal)}
                                className={`w-full py-0.5 rounded cursor-pointer transition select-none ${
                                  alimVal > 0
                                    ? 'font-bold text-slate-950 bg-slate-100 hover:bg-slate-200 text-[10.5px]'
                                    : 'text-slate-400 hover:bg-slate-50 text-[10px]'
                                }`}
                                title={
                                  ecartAlim
                                    ? `ALIMENTATION du ${formatDay(day.dateLabel)} : ${alimVal} pcs saisis ici. Le suivi journalier totalise ${lots.total} pcs sur ${lots.count} sous-lots (cliquer pour éditer).`
                                    : `ALIMENTATION : ${alimVal || 0} pcs (cliquer pour éditer)`
                                }
                              >
                                {alimVal > 0 ? alimVal : (day.colIdx > currentColIdx ? '—' : 0)}
                              </div>
                            )
                          ) : (
                            <span className="text-slate-300 text-[10px]">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* ROW 8: CUMUL COUPE / Cumulative cutting qty */}
                  <tr className="bg-white hover:bg-slate-50 border-b-2 border-slate-400 transition-colors">
                    <td className="sticky left-0 z-30 bg-white py-1.5 px-3 border-r-4 border-slate-400 shadow-[4px_0_10px_rgba(0,0,0,0.22)] font-sans text-slate-900 text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-900">CUMUL COUPE / Cumulative qty</span>
                        <span className="text-[8.5px] bg-slate-200 text-slate-900 px-1 rounded font-bold uppercase">
                          Cumul coupe
                        </span>
                      </div>
                    </td>
                    {displayedDays.map((day) => {
                      const { job: activeJob, dayData } = getActiveJobForChainAndDay(chainJobs, day.colIdx);
                      const isPivot = day.colIdx === currentColIdx;
                      const lots = pivotLotsTotal(activeJob, isPivot, 'cumulCoupe');
                      const coupeVal = dayData?.coupe || 0;
                      const ecartCoupe = !!lots && lots.total !== coupeVal;

                      const isEditingCoupe =
                        inlineEdit?.jobId === activeJob?.id &&
                        inlineEdit?.colIdx === day.colIdx &&
                        inlineEdit?.field === 'coupe';

                      return (
                        <td
                          key={`coupe_${chainName}_${day.colIdx}`}
                          className={`py-1 px-1 text-center font-mono border-r border-slate-200 ${
                            isPivot ? 'bg-[#FFFF00]/25 font-black text-slate-950' : ''
                          }`}
                        >
                          {activeJob ? (
                            isEditingCoupe ? (
                              <input
                                type="number"
                                min="0"
                                autoFocus
                                value={inlineEdit.val}
                                onChange={(e) => setInlineEdit({ ...inlineEdit, val: e.target.value })}
                                onBlur={handleSaveInlineEdit}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlineEdit();
                                  if (e.key === 'Escape') setInlineEdit(null);
                                }}
                                className="w-14 text-center text-[10.5px] font-bold bg-white border border-slate-900 rounded p-0 text-slate-950"
                              />
                            ) : (
                              <div
                                onClick={() => handleStartInlineEdit(activeJob.id, day.colIdx, 'coupe', coupeVal)}
                                className={`w-full py-0.5 rounded cursor-pointer transition select-none ${
                                  coupeVal > 0
                                    ? 'font-bold text-slate-950 bg-slate-100 hover:bg-slate-200 text-[10.5px]'
                                    : 'text-slate-400 hover:bg-slate-50 text-[10px]'
                                }`}
                                title={
                                  ecartCoupe
                                    ? `CUMUL COUPE du ${formatDay(day.dateLabel)} : ${coupeVal} pcs saisis ici. Le suivi journalier totalise ${lots.total} pcs sur ${lots.count} sous-lots (cliquer pour éditer).`
                                    : `CUMUL COUPE : ${coupeVal || 0} pcs (cliquer pour éditer)`
                                }
                              >
                                {coupeVal > 0 ? coupeVal : (day.colIdx > currentColIdx ? '—' : 0)}
                              </div>
                            )
                          ) : (
                            <span className="text-slate-300 text-[10px]">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>


    </div>
  );
};
