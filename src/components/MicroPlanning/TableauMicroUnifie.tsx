import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  MicroDailyRow,
  MicroJob,
  MicroTimelineDay,
  MicroJobDayData,
} from '../../data/microPlanningTypes';
import { matchStyleWithModel } from '../../utils/useMicroPlanning';
import { getModelColor } from '../../utils/modelColorUtils';
import { ColorPickerPopover } from './ColorPickerPopover';
import { FicheEtatModeleModal } from './FicheEtatModeleModal';
import { TableauMicroSimulationExcel } from './TableauMicroSimulationExcel';
import {
  ALL_52_WEEK_CODES,
  CALENDAR_52_WEEKS,
  CALENDAR_QUARTERS,
  CALENDAR_MONTHS,
  getCalendarWeek,
  getCurrentCalendarWeekCode,
} from '../../utils/calendarUtils';
import {
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Clock,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Sparkles,
  HelpCircle,
  BarChart2,
  Sliders,
  ChevronDown,
  ChevronUp,
  Activity,
  Package,
  Scissors,
  Check,
  Table,
  LayoutGrid,
  FileSpreadsheet,
  Info,
} from 'lucide-react';

interface TableauMicroUnifieProps {
  rows: MicroDailyRow[];
  jobs: MicroJob[];
  timelineDays: MicroTimelineDay[];
  currentDateKey: string;
  currentColIdx: number;
  onUpdateDailyField: (id: string, field: keyof MicroDailyRow, value: any) => void;
  onDeleteDailyRow: (id: string) => void;
  onAddDailyRowModal: () => void;
  onUpdateJobDayCell: (jobId: string, colIdx: number, realValue: number, targetValue?: number) => void;
  onUpdateJobDayField?: (jobId: string, colIdx: number, field: 'coupe' | 'alim' | 'real' | 'cumul' | 'target', value: number) => void;
  onUpdateJobTarget?: (jobId: string, newTarget: number, colIdx?: number, applyToSubsequentDays?: boolean) => void;
  availableChains: string[];
  modelColors?: Record<string, string>;
  onSetModelColor?: (modelName: string, color: string) => void;
}

export const TableauMicroUnifie: React.FC<TableauMicroUnifieProps> = ({
  rows,
  jobs,
  timelineDays,
  currentDateKey,
  currentColIdx,
  onUpdateDailyField,
  onDeleteDailyRow,
  onAddDailyRowModal,
  onUpdateJobDayCell,
  onUpdateJobDayField,
  onUpdateJobTarget,
  availableChains,
  modelColors = {},
  onSetModelColor,
}) => {
  // Filters & State
  const [selectedChainFilter, setSelectedChainFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [expandedChainDetails, setExpandedChainDetails] = useState<string | null>(null);
  const [selectedModelHealthJob, setSelectedModelHealthJob] = useState<MicroJob | null>(null);

  // Simulation layout mode: 'excel' (Format officiel MICRO-PLANNING MAJ du 12-10, 8 lignes par chaîne)
  // or 'compact' (Grille compacte avec 4 sous-cases par jour)
  const [simulationLayout, setSimulationLayout] = useState<'excel' | 'compact'>('excel');

  // Inline edit state for simulation cases
  const [inlineEdit, setInlineEdit] = useState<{
    jobId: string;
    colIdx: number;
    field: 'coupe' | 'alim' | 'real' | 'cumul' | 'target';
    val: string;
  } | null>(null);

  // Modal edit for simulation cells
  const [editingDayCell, setEditingDayCell] = useState<{
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
    applySubsequent?: boolean;
  } | null>(null);

  // Standard Annual Calendar: 52 weeks S01 to S52
  const allWeeks = ALL_52_WEEK_CODES;

  // Group timeline days by week, mapped strictly to the standard S01..S52 annual calendar
  const weeksMap = useMemo(() => {
    const rawMap = new Map<string, MicroTimelineDay[]>();
    timelineDays.forEach((d) => {
      if (!rawMap.has(d.week)) rawMap.set(d.week, []);
      rawMap.get(d.week)!.push(d);
    });

    const orderedMap = new Map<string, MicroTimelineDay[]>();
    ALL_52_WEEK_CODES.forEach((weekCode, wIdx) => {
      const candidates = rawMap.get(weekCode) || [];
      if (candidates.length > 0) {
        // Prioritize the primary annual cycle columns (colIdx < 317) for S01..S49
        const primary = candidates.filter((d) => d.colIdx < 317);
        orderedMap.set(weekCode, primary.length > 0 ? primary : candidates);
      } else {
        // Fallback calendar days based on standard ISO calendar
        const cal = CALENDAR_52_WEEKS[wIdx];
        const syntheticDays: MicroTimelineDay[] = [
          { colIdx: 1000 + wIdx * 5 + 0, week: weekCode, excelDate: 46000 + wIdx * 7 + 0, fullDate: cal.date_debut, dateLabel: cal.date_label, dayName: 'Lun', isActualite: false, isPrevision: true },
          { colIdx: 1000 + wIdx * 5 + 1, week: weekCode, excelDate: 46000 + wIdx * 7 + 1, fullDate: cal.date_debut, dateLabel: cal.date_label, dayName: 'Mar', isActualite: false, isPrevision: true },
          { colIdx: 1000 + wIdx * 5 + 2, week: weekCode, excelDate: 46000 + wIdx * 7 + 2, fullDate: cal.date_debut, dateLabel: cal.date_label, dayName: 'Mer', isActualite: false, isPrevision: true },
          { colIdx: 1000 + wIdx * 5 + 3, week: weekCode, excelDate: 46000 + wIdx * 7 + 3, fullDate: cal.date_debut, dateLabel: cal.date_label, dayName: 'Jeu', isActualite: false, isPrevision: true },
          { colIdx: 1000 + wIdx * 5 + 4, week: weekCode, excelDate: 46000 + wIdx * 7 + 4, fullDate: cal.date_friday, dateLabel: cal.date_label, dayName: 'Ven', isActualite: false, isPrevision: true },
        ];
        orderedMap.set(weekCode, syntheticDays);
      }
    });

    return orderedMap;
  }, [timelineDays]);

  // Find index of the week containing the pivot date (12-10) -> S41 (index 40)
  const currentWeekIdx = useMemo(() => {
    const activeDay = timelineDays.find((d) => d.colIdx === currentColIdx);
    if (!activeDay) return 40; // Default to S41
    const idx = allWeeks.indexOf(activeDay.week);
    return idx >= 0 ? idx : 40;
  }, [timelineDays, currentColIdx, allWeeks]);

  // Timeline window navigation: starts right on S41 (contains 12-10) by default
  const [visibleWeekStart, setVisibleWeekStart] = useState<number>(() => {
    return currentWeekIdx;
  });

  // Keep synced if currentWeekIdx changes
  useEffect(() => {
    if (currentWeekIdx > 0 && visibleWeekStart === 0) {
      setVisibleWeekStart(currentWeekIdx);
    }
  }, [currentWeekIdx]);

  const displayedWeeks = useMemo(() => {
    const start = Math.max(0, Math.min(visibleWeekStart, Math.max(0, allWeeks.length - 6)));
    return allWeeks.slice(start, start + 6);
  }, [allWeeks, visibleWeekStart]);

  const displayedDays = useMemo(() => {
    const days: MicroTimelineDay[] = [];
    displayedWeeks.forEach((w) => {
      const list = weeksMap.get(w) || [];
      days.push(...list);
    });
    return days;
  }, [displayedWeeks, weeksMap]);

  const getWeekFriendlyLabel = (weekCode: string) => {
    const daysInWeek = weeksMap.get(weekCode) || [];
    const firstDay = daysInWeek[0];
    const lastDay = daysInWeek[daysInWeek.length - 1];
    const isCurrent = weekCode === allWeeks[currentWeekIdx];
    const calInfo = getCalendarWeek(weekCode);
    const dateRange =
      firstDay && lastDay
        ? `${firstDay.dateLabel} - ${lastDay.dateLabel}`
        : calInfo?.date_label || '';
    const month = calInfo ? ` · ${calInfo.mois_short}` : '';
    return `${weekCode}${isCurrent ? ' ★ (12/10 - Active)' : ''}${dateRange ? ` [${dateRange}]` : ''}${month}`;
  };

  // Quick preset period selector adapted to normal calendar
  const handleSelectPeriodPreset = (
    preset:
      | 'active'
      | 'beforeS41'
      | 's01'
      | 't1'
      | 't2'
      | 't3'
      | 't4'
      | 's52'
      | 'real_calendar'
      | string
  ) => {
    if (preset === 'active') {
      setVisibleWeekStart(currentWeekIdx);
    } else if (preset === 's01' || preset === 't1') {
      setVisibleWeekStart(0); // S01
    } else if (preset === 't2') {
      setVisibleWeekStart(13); // S14
    } else if (preset === 't3') {
      setVisibleWeekStart(26); // S27
    } else if (preset === 't4') {
      setVisibleWeekStart(39); // S40
    } else if (preset === 'beforeS41') {
      // Jump 6 weeks right before S41 (S35 à S40)
      setVisibleWeekStart(Math.max(0, currentWeekIdx - 6));
    } else if (preset === 's52') {
      setVisibleWeekStart(Math.max(0, allWeeks.length - 6)); // S47 to S52
    } else if (preset === 'real_calendar') {
      const realCode = getCurrentCalendarWeekCode();
      const idx = allWeeks.indexOf(realCode);
      if (idx >= 0) {
        setVisibleWeekStart(Math.max(0, Math.min(idx, allWeeks.length - 6)));
      }
    } else {
      // Month jump (e.g. 'Jan', 'Fév', etc.)
      const foundMonth = CALENDAR_MONTHS.find(
        (m) => m.short.toLowerCase() === preset.toLowerCase() || m.name.toLowerCase() === preset.toLowerCase()
      );
      if (foundMonth) {
        const idx = allWeeks.indexOf(foundMonth.startWeek);
        if (idx >= 0) {
          setVisibleWeekStart(Math.max(0, Math.min(idx, allWeeks.length - 6)));
        }
      }
    }
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

  const handleSaveAndNextInline = (
    jobId: string,
    colIdx: number,
    nextField: 'coupe' | 'alim' | 'real' | 'cumul'
  ) => {
    if (inlineEdit) {
      const val = Math.max(0, Number(inlineEdit.val) || 0);
      if (onUpdateJobDayField) {
        onUpdateJobDayField(inlineEdit.jobId, inlineEdit.colIdx, inlineEdit.field, val);
      } else if (onUpdateJobDayCell && inlineEdit.field === 'real') {
        onUpdateJobDayCell(inlineEdit.jobId, inlineEdit.colIdx, val);
      }

      const targetJob = jobs.find((j) => j.id === jobId);
      const dayData = targetJob?.jours?.[colIdx];
      const nextVal = (dayData ? dayData[nextField] : 0) || 0;
      setInlineEdit({
        jobId,
        colIdx,
        field: nextField,
        val: nextVal > 0 ? String(nextVal) : '',
      });
    }
  };

  // Filter operational rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchChain =
        selectedChainFilter === 'ALL' ||
        r.chaine.toLowerCase().includes(selectedChainFilter.toLowerCase());
      const matchSearch =
        !searchQuery ||
        r.modele.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.chaine.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.remarque.toLowerCase().includes(searchQuery.toLowerCase());
      return matchChain && matchSearch;
    });
  }, [rows, selectedChainFilter, searchQuery]);

  // Operational Totals
  const totals = useMemo(() => {
    let of = 0;
    let real = 0;
    let cumulJ1 = 0;
    let cumulPack = 0;
    let alim = 0;
    let prodCoupe = 0;
    let cumulCoupe = 0;

    filteredRows.forEach((r) => {
      of += r.of || 0;
      real += r.realPacking || 0;
      cumulJ1 += r.cumulJ1 || 0;
      cumulPack += r.cumulPacking || 0;
      alim += r.alimChaine || 0;
      prodCoupe += r.prodCoupe || 0;
      cumulCoupe += r.cumulCoupe || 0;
    });

    return { of, real, cumulJ1, cumulPack, alim, prodCoupe, cumulCoupe };
  }, [filteredRows]);

  // Filter simulation jobs by chain & search (in compact layout, only show jobs with activity in displayed weeks)
  const filteredJobs = useMemo(() => {
    const displayedColSet = new Set(displayedDays.map((d) => d.colIdx));
    return jobs.filter((j) => {
      const matchChain =
        selectedChainFilter === 'ALL' ||
        j.chaine.toLowerCase().includes(selectedChainFilter.toLowerCase());
      const matchSearch =
        !searchQuery ||
        j.style.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.chaine.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchChain || !matchSearch) return false;

      // In compact layout, only show jobs with activity or schedule in the currently displayed weeks
      if (simulationLayout === 'compact') {
        const hasActivityInView =
          Object.keys(j.jours || {}).some((c) => displayedColSet.has(Number(c))) ||
          (j.launchColIdx &&
            j.deadlineColIdx &&
            displayedDays.some((d) => d.colIdx >= j.launchColIdx! && d.colIdx <= j.deadlineColIdx!));
        return hasActivityInView;
      }

      return true;
    });
  }, [jobs, selectedChainFilter, searchQuery, simulationLayout, displayedDays]);

  // Group simulation jobs by chain
  const simulationJobsByChain = useMemo(() => {
    const map = new Map<string, MicroJob[]>();
    filteredJobs.forEach((job) => {
      if (!map.has(job.chaine)) map.set(job.chaine, []);
      map.get(job.chaine)!.push(job);
    });
    return map;
  }, [filteredJobs]);

  // Monochrome Chain theme helpers (Black, White, Gray)
  const getChainBadgeStyle = (chain: string) => {
    const c = chain.toUpperCase();
    if (c.includes('MARGUERITE')) return 'bg-slate-900 text-white border-slate-950 font-bold';
    if (c.includes('TANA')) return 'bg-slate-800 text-white border-slate-900 font-bold';
    if (c.includes('ROSE')) return 'bg-slate-700 text-white border-slate-800 font-bold';
    if (c.includes('DHALIA')) return 'bg-slate-200 text-slate-900 border-slate-300 font-bold';
    if (c.includes('SIEGE')) return 'bg-slate-100 text-slate-800 border-slate-300 font-bold';
    return 'bg-slate-100 text-slate-900 border-slate-300 font-bold';
  };

  const getChainHeaderBg = (chain: string) => {
    const c = chain.toUpperCase();
    if (c.includes('MARGUERITE')) return 'bg-slate-950 text-white border-slate-800';
    if (c.includes('TANA')) return 'bg-slate-900 text-white border-slate-800';
    if (c.includes('ROSE')) return 'bg-slate-850 text-slate-100 border-slate-700';
    if (c.includes('DHALIA')) return 'bg-slate-800 text-slate-100 border-slate-700';
    if (c.includes('SIEGE')) return 'bg-slate-700 text-slate-100 border-slate-600';
    return 'bg-slate-900 text-white border-slate-800';
  };

  // Find corresponding simulation job for an operational row
  const getJobForRow = (row: MicroDailyRow): MicroJob | undefined => {
    return jobs.find((j) => {
      const chainMatch =
        j.chaine.toLowerCase().includes(row.chaine.toLowerCase()) ||
        row.chaine.toLowerCase().includes(j.chaine.toLowerCase());
      const styleMatch = matchStyleWithModel(j.style, row.modele, row.chaine);
      return chainMatch && styleMatch;
    });
  };

  // Helper to find the active job and data on a chain for a given day colIdx (Format Excel)
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

  const selectedRow = rows.find((r) => r.id === selectedRowId);

  return (
    <div className="space-y-4">
      {/* ========================================================= */}
      {/* SECTION 1 : TABLEAU DU HAUT - SUIVI OPÉRATIONNEL D'ATELIER */}
      {/* ========================================================= */}
      <div className="flex flex-col bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden">
        {/* Header Bar */}
        <div className="px-4 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-500/30 rounded-md border border-indigo-400/30">
              <Package className="w-4 h-4 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight text-white uppercase">
                  1. Suivi Opérationnel d'Atelier
                </h2>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] px-2 py-0.5 rounded font-mono font-semibold">
                  Pointage du Jour : {currentDateKey}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Saisie directe des pièces emballées du jour et suivi des cartons, coupe et avancement
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onAddDailyRowModal}
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Nouveau Modèle / OF</span>
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Chain Filters */}
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="font-semibold text-slate-600 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              Chaîne :
            </span>
            <button
              onClick={() => setSelectedChainFilter('ALL')}
              className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition ${
                selectedChainFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              Toutes ({rows.length})
            </button>
            {availableChains.map((ch) => {
              const count = rows.filter((r) =>
                r.chaine.toLowerCase().includes(ch.toLowerCase())
              ).length;
              if (count === 0 && !['MARGUERITE 1', 'DHALIA - POSE CUIR'].includes(ch)) return null;
              return (
                <button
                  key={ch}
                  onClick={() => setSelectedChainFilter(ch)}
                  className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition ${
                    selectedChainFilter === ch
                      ? 'bg-slate-900 text-white font-semibold shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-300'
                  }`}
                >
                  {ch} ({count})
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrer modèle, chaîne..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-2.5 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-slate-900 w-52"
            />
          </div>
        </div>

        {/* Operational Table (Full Width, comfortable, matching sheet 12-10) */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-[10.5px] uppercase tracking-wider">
                <th className="py-2.5 px-2.5 border-r border-slate-700 w-10 text-center">#</th>
                <th className="py-2.5 px-3 border-r border-slate-700 min-w-[140px]">CHAINE / LINE</th>
                <th className="py-2.5 px-3 border-r border-slate-700 min-w-[210px]">MODELE / STYLE</th>
                <th className="py-2.5 px-2.5 border-r border-slate-700 text-right w-16 bg-slate-950 text-white">
                  OF
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-700 text-right min-w-[105px] bg-[#FFFF00] text-slate-950 font-black">
                  REAL PACKING (J)
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-700 text-right min-w-[90px]">
                  CUMUL J-1
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-700 text-right min-w-[100px] bg-slate-800 text-white">
                  CUMUL PACK
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-700 text-right min-w-[95px]">
                  MIS EN CARTON
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-700 text-right min-w-[95px] bg-slate-850 text-slate-200">
                  ALIM. CHAINE
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-700 text-right min-w-[95px] bg-slate-850 text-slate-200">
                  PROD COUPE
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-700 text-right min-w-[95px]">
                  CUMUL COUPE
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-700 text-center min-w-[95px]">
                  % AVANC.
                </th>
                <th className="py-2.5 px-3 border-r border-slate-700 min-w-[150px]">REMARQUE</th>
                <th className="py-2.5 px-2 text-center w-12">ACT.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-8 text-center text-slate-500 font-sans">
                    Aucun modèle trouvé pour les filtres sélectionnés.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const isCompleted = row.of > 0 && row.cumulPacking >= row.of;
                  const progressPct =
                    row.of > 0 ? Math.min(100, Math.round((row.cumulPacking / row.of) * 100)) : 0;
                  const isSelected = selectedRowId === row.id;

                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedRowId(isSelected ? null : row.id)}
                      className={`transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-amber-100/70 border-l-4 border-l-amber-500'
                          : idx % 2 === 0
                          ? 'bg-white hover:bg-slate-50'
                          : 'bg-slate-50/50 hover:bg-slate-100/60'
                      } ${isCompleted ? 'bg-emerald-50/30' : ''}`}
                    >
                      {/* # Index */}
                      <td className="py-2 px-2 text-center text-slate-400 font-sans font-medium border-r border-slate-200">
                        {idx + 1}
                      </td>

                      {/* Chaîne */}
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border truncate max-w-[130px] ${getChainBadgeStyle(
                            row.chaine
                          )}`}
                        >
                          {row.chaine}
                        </span>
                      </td>

                      {/* Modèle / Style */}
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            {onSetModelColor && (
                              <ColorPickerPopover
                                currentColor={getModelColor(row.modele, modelColors, row.color)}
                                onChangeColor={(c) => onSetModelColor(row.modele, c)}
                                size="sm"
                                title={`Couleur pour ${row.modele}`}
                              />
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const j = getJobForRow(row);
                                if (j) setSelectedModelHealthJob(j);
                              }}
                              className="text-left font-bold text-slate-900 hover:text-black transition-colors flex items-center gap-1.5 group cursor-pointer truncate"
                              title="Cliquer pour ouvrir la vue 360° état général du modèle (cadence, prévision, avancement)"
                            >
                              <span className="group-hover:underline truncate">{row.modele}</span>
                              <Activity className="w-3.5 h-3.5 text-slate-600 opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />
                            </button>
                          </div>
                          {isCompleted && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-slate-200 text-slate-900 px-1.5 py-0.2 rounded border border-slate-300 shrink-0">
                              <CheckCircle2 className="w-2.5 h-2.5 text-slate-800" />
                              Soldé
                            </span>
                          )}
                        </div>
                      </td>

                      {/* OF Total */}
                      <td
                        className="py-2 px-2.5 text-right font-bold text-slate-900 border-r border-slate-200 bg-slate-50/50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="number"
                          min="1"
                          value={row.of || 0}
                          onChange={(e) =>
                            onUpdateDailyField(row.id, 'of', Number(e.target.value))
                          }
                          className="w-14 text-right font-bold text-slate-900 bg-transparent border-b border-dashed border-slate-300 hover:border-slate-800 focus:outline-none focus:border-slate-900 py-0.5"
                        />
                      </td>

                      {/* REAL PACKING (Jour J) - Direct inline edit (JAUNE = DATE DU JOUR) */}
                      <td
                        className="py-2 px-2.5 text-right border-r border-slate-200 bg-[#FFFF00]/30"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="number"
                          min="0"
                          value={row.realPacking || ''}
                          placeholder="0"
                          onChange={(e) =>
                            onUpdateDailyField(row.id, 'realPacking', Number(e.target.value))
                          }
                          className="w-16 text-right font-black text-slate-950 bg-white border border-slate-900 rounded px-1.5 py-0.5 shadow-2xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                          title="Saisir la quantité emballée aujourd'hui (12-10)"
                        />
                      </td>

                      {/* CUMUL J-1 */}
                      <td
                        className="py-2 px-2.5 text-right border-r border-slate-200 text-slate-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="number"
                          min="0"
                          value={row.cumulJ1 || ''}
                          placeholder="0"
                          onChange={(e) =>
                            onUpdateDailyField(row.id, 'cumulJ1', Number(e.target.value))
                          }
                          className="w-12 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none py-0.5"
                        />
                      </td>

                      {/* CUMUL PACKING */}
                      <td className="py-2 px-2.5 text-right border-r border-slate-200 font-extrabold text-slate-900 bg-slate-100">
                        {row.cumulPacking || 0}
                      </td>

                      {/* MIS EN CARTON */}
                      <td
                        className="py-2 px-2.5 text-right border-r border-slate-200 text-slate-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="number"
                          min="0"
                          value={row.cumulCarton || ''}
                          placeholder="0"
                          onChange={(e) =>
                            onUpdateDailyField(row.id, 'cumulCarton', Number(e.target.value))
                          }
                          className="w-12 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none py-0.5"
                        />
                      </td>

                      {/* ALIMENTATION CHAINE */}
                      <td
                        className="py-2 px-2.5 text-right border-r border-slate-200 text-slate-800 bg-slate-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="number"
                          min="0"
                          value={row.alimChaine || ''}
                          placeholder="0"
                          onChange={(e) =>
                            onUpdateDailyField(row.id, 'alimChaine', Number(e.target.value))
                          }
                          className="w-12 text-right text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none py-0.5"
                        />
                      </td>

                      {/* PROD COUPE (Jour) */}
                      <td
                        className="py-2 px-2.5 text-right border-r border-slate-200 text-slate-900 bg-slate-100 font-bold"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="number"
                          min="0"
                          value={row.prodCoupe || ''}
                          placeholder="0"
                          onChange={(e) =>
                            onUpdateDailyField(row.id, 'prodCoupe', Number(e.target.value))
                          }
                          className="w-12 text-right text-slate-900 font-bold bg-white border border-slate-300 rounded px-1 py-0.5 shadow-2xs focus:outline-none"
                        />
                      </td>

                      {/* CUMUL COUPE */}
                      <td className="py-2 px-2.5 text-right border-r border-slate-200 text-slate-700">
                        {row.cumulCoupe || 0}
                      </td>

                      {/* % AVANCEMENT */}
                      <td className="py-2 px-2.5 border-r border-slate-200 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className={`text-[10px] font-extrabold ${
                              isCompleted
                                ? 'text-slate-900'
                                : progressPct > 50
                                ? 'text-slate-800'
                                : 'text-slate-700'
                            }`}
                          >
                            {progressPct}%
                          </span>
                          <div className="w-14 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                isCompleted
                                  ? 'bg-slate-900'
                                  : progressPct > 50
                                  ? 'bg-slate-700'
                                  : 'bg-slate-400'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* REMARQUE */}
                      <td
                        className="py-2 px-3 border-r border-slate-200 font-sans text-[10px] text-slate-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={row.remarque || ''}
                          placeholder="Ajouter remarque..."
                          onChange={(e) => onUpdateDailyField(row.id, 'remarque', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none focus:border-indigo-400 py-0.5 text-[10px]"
                        />
                      </td>

                      {/* ACTIONS */}
                      <td
                        className="py-2 px-2 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => onDeleteDailyRow(row.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          title="Supprimer cette ligne"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Footer Totals */}
            <tfoot className="bg-slate-900 text-white font-mono font-bold text-[11px] border-t-2 border-slate-700">
              <tr>
                <td colSpan={3} className="py-2.5 px-3 border-r border-slate-700 text-amber-300 font-sans uppercase">
                  TOTAUX POINT DU JOUR ({filteredRows.length} OF)
                </td>
                <td className="py-2.5 px-2.5 text-right border-r border-slate-700 text-white">
                  {totals.of.toLocaleString()}
                </td>
                <td className="py-2.5 px-2.5 text-right border-r border-slate-700 text-emerald-300 bg-emerald-950">
                  +{totals.real.toLocaleString()}
                </td>
                <td className="py-2.5 px-2.5 text-right border-r border-slate-700 text-slate-300">
                  {totals.cumulJ1.toLocaleString()}
                </td>
                <td className="py-2.5 px-2.5 text-right border-r border-slate-700 text-indigo-200 bg-indigo-950">
                  {totals.cumulPack.toLocaleString()}
                </td>
                <td className="py-2.5 px-2.5 text-right border-r border-slate-700 text-slate-300">
                  {totals.cumulPack.toLocaleString()}
                </td>
                <td className="py-2.5 px-2.5 text-right border-r border-slate-700 text-sky-300">
                  {totals.alim.toLocaleString()}
                </td>
                <td className="py-2.5 px-2.5 text-right border-r border-slate-700 text-sky-300 bg-sky-950">
                  +{totals.prodCoupe.toLocaleString()}
                </td>
                <td className="py-2.5 px-2.5 text-right border-r border-slate-700 text-slate-300">
                  {totals.cumulCoupe.toLocaleString()}
                </td>
                <td className="py-2.5 px-2.5 border-r border-slate-700 text-center text-emerald-400">
                  {totals.of > 0 ? Math.round((totals.cumulPack / totals.of) * 100) : 0}%
                </td>
                <td colSpan={2} className="py-2.5 px-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION 2 : TABLEAU SIMULATION & FRISE DE PRODUCTION       */}
      {/* ========================================================= */}
      <div className="flex flex-col bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden">
        {/* Entête du tableau : Titre, modes et indicateurs */}
        <div className="px-4 py-2.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-amber-400" />
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-extrabold uppercase tracking-wide text-white text-xs">
                TABLEAU SIMULATION &amp; FRISE DE PRODUCTION
              </h2>
              {selectedRow ? (
                <span className="bg-slate-200 text-slate-950 text-[10px] px-2 py-0.5 rounded font-extrabold">
                  Chaîne sélectionnée : {selectedRow.chaine} ({selectedRow.modele})
                </span>
              ) : null}
            </div>
            <span className="hidden md:inline-block text-[10px] text-slate-400 border-l border-slate-700 pl-2">
              Vue chronologique par chaîne · 1ère Ligne = Semaines · 2ème Ligne = Dates journalières
            </span>
          </div>

          {/* Mode Switcher: Excel MICRO-PLANNING (8 Lignes) vs Compact (4 Cases) */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-700 shadow-inner">
              <button
                type="button"
                onClick={() => setSimulationLayout('excel')}
                className={`px-3 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  simulationLayout === 'excel'
                    ? 'bg-slate-800 text-white font-black shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Format fidèle au fichier Excel MICRO-PLANNING MAJ du 12-10 : 8 lignes dédiées par chaîne en flux continu"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Format Excel MICRO-PLANNING (8 Lignes / Chaîne)</span>
                <span className="text-[8.5px] bg-slate-950/30 text-slate-300 px-1 py-0.2 rounded uppercase font-black">
                  Officiel
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSimulationLayout('compact')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  simulationLayout === 'compact'
                    ? 'bg-slate-800 text-white font-black shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Format compact par modèle avec 4 sous-cases par jour"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Format Compact (4 Cases)</span>
              </button>
            </div>

            {/* Status indicators in pure monochrome with yellow for active date */}
            <div className="hidden lg:flex items-center gap-3 text-[11px] pl-3 border-l border-slate-700">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                <span className="text-slate-300">
                  <strong className="text-white">Réalisé (Passé)</strong> : Pièces physiques produites
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFFF00] ring-1 ring-amber-400"></span>
                <span className="text-[#FFFF00] font-black">
                  Date en cours ({currentDateKey})
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
                <span className="text-slate-300">
                  <strong className="text-white">Prévisions (Futur)</strong> : Cadences cibles (pcs/j)
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Barre intégrée dans l'entête : Navigation Calendrier, Semaines et Stepper */}
        <div className="px-4 py-2 bg-slate-950 text-white flex flex-wrap items-center justify-between gap-2.5 text-xs border-b border-slate-800">
          {/* Quick Preset Buttons (S01, Quarters, Active S41, S52, Real Calendar) */}
          <div className="flex items-center flex-wrap gap-2 text-xs">
            <div className="flex items-center flex-wrap bg-slate-900 p-0.5 rounded-md border border-slate-700 gap-0.5">
              <span className="text-[10px] text-slate-400 px-1.5 font-medium">Calendrier :</span>
              <button
                onClick={() => handleSelectPeriodPreset('s01')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                  visibleWeekStart === 0
                    ? 'bg-slate-700 text-white shadow-xs font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Début d'année : Semaine S01 (Janvier)"
              >
                |◀ S01 (Début)
              </button>
              <button
                onClick={() => handleSelectPeriodPreset('t1')}
                className="px-1.5 py-1 rounded text-[10px] text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Trimestre 1 : S01 à S13"
              >
                T1 (S01)
              </button>
              <button
                onClick={() => handleSelectPeriodPreset('t2')}
                className="px-1.5 py-1 rounded text-[10px] text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Trimestre 2 : S14 à S26"
              >
                T2 (S14)
              </button>
              <button
                onClick={() => handleSelectPeriodPreset('t3')}
                className="px-1.5 py-1 rounded text-[10px] text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Trimestre 3 : S27 à S39"
              >
                T3 (S27)
              </button>
              <button
                onClick={() => handleSelectPeriodPreset('t4')}
                className="px-1.5 py-1 rounded text-[10px] text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Trimestre 4 : S40 à S52"
              >
                T4 (S40)
              </button>
              <button
                onClick={() => handleSelectPeriodPreset('active')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                  visibleWeekStart === currentWeekIdx
                    ? 'bg-[#FFFF00] text-slate-950 font-black shadow-xs ring-1 ring-amber-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Semaine contenant le 12-10 (S41)"
              >
                ★ S41 Active (12-10)
              </button>
              <button
                onClick={() => handleSelectPeriodPreset('beforeS41')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                  visibleWeekStart < currentWeekIdx && visibleWeekStart >= currentWeekIdx - 6
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Afficher les semaines avant S41 (S35 à S40)"
              >
                ⏪ Avant S41
              </button>
              <button
                onClick={() => handleSelectPeriodPreset('s52')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                  visibleWeekStart >= allWeeks.length - 6
                    ? 'bg-slate-700 text-white shadow-xs font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Fin d'année : Semaine S52 (Décembre)"
              >
                S52 (Fin) ▶|
              </button>
            </div>

            {/* Quick Month Selector Buttons */}
            <div className="hidden 2xl:flex items-center bg-slate-900 p-0.5 rounded-md border border-slate-700 gap-0.5 text-[10px]">
              <span className="text-slate-400 px-1 font-medium">Mois :</span>
              {CALENDAR_MONTHS.map((m) => (
                <button
                  key={m.short}
                  onClick={() => handleSelectPeriodPreset(m.short)}
                  className="px-1.5 py-0.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  title={`${m.name} (${m.startWeek} à ${m.endWeek})`}
                >
                  {m.short}
                </button>
              ))}
            </div>
          </div>

          {/* Direct Week Selector & Stepper */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Direct Week Dropdown Selector: jump to any of the 52 weeks in 1 click! */}
            <div className="flex items-center bg-slate-900 rounded-md border border-slate-700 px-2 py-0.5 gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] text-slate-300 font-semibold whitespace-nowrap">Semaine :</span>
              <select
                value={allWeeks[visibleWeekStart] || 'S41'}
                onChange={(e) => {
                  const idx = allWeeks.indexOf(e.target.value);
                  if (idx >= 0) {
                    setVisibleWeekStart(Math.max(0, Math.min(idx, allWeeks.length - 6)));
                  }
                }}
                className="bg-slate-950 text-amber-300 font-mono font-bold text-xs rounded border border-slate-700 px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
              >
                {allWeeks.map((w, idx) => (
                  <option key={`opt_${w}_${idx}`} value={w}>
                    {getWeekFriendlyLabel(w)}
                  </option>
                ))}
              </select>
            </div>

            {/* Stepper buttons (prev/next 1 and 6 weeks) */}
            <div className="flex items-center bg-slate-900 rounded-md border border-slate-700 px-1 py-0.5 gap-0.5">
              <button
                onClick={() => setVisibleWeekStart(0)}
                disabled={visibleWeekStart === 0}
                className="px-1.5 py-0.5 text-[10px] rounded text-slate-300 hover:bg-slate-800 disabled:opacity-30 cursor-pointer font-mono"
                title="Aller au début de l'année (S01)"
              >
                |◀ S01
              </button>
              <button
                onClick={() => setVisibleWeekStart((prev) => Math.max(0, prev - 6))}
                disabled={visibleWeekStart === 0}
                className="px-1.5 py-0.5 text-[10px] rounded text-slate-300 hover:bg-slate-800 disabled:opacity-30 cursor-pointer font-mono"
                title="Reculer de 6 semaines"
              >
                -6s
              </button>
              <button
                onClick={() => setVisibleWeekStart((prev) => Math.max(0, prev - 1))}
                disabled={visibleWeekStart === 0}
                className="p-1 rounded text-slate-300 hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                title="Semaine précédente (-1s)"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="text-[11px] font-mono text-amber-300 font-extrabold px-1.5 whitespace-nowrap">
                {displayedWeeks[0]} → {displayedWeeks[displayedWeeks.length - 1]}
              </span>

              <button
                onClick={() =>
                  setVisibleWeekStart((prev) =>
                    Math.min(Math.max(0, allWeeks.length - 6), prev + 1)
                  )
                }
                disabled={visibleWeekStart + 6 >= allWeeks.length}
                className="p-1 rounded text-slate-300 hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                title="Semaine suivante (+1s)"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() =>
                  setVisibleWeekStart((prev) =>
                    Math.min(Math.max(0, allWeeks.length - 6), prev + 6)
                  )
                }
                disabled={visibleWeekStart + 6 >= allWeeks.length}
                className="px-1.5 py-0.5 text-[10px] rounded text-slate-300 hover:bg-slate-800 disabled:opacity-30 cursor-pointer font-mono"
                title="Avancer de 6 semaines"
              >
                +6s
              </button>
              <button
                onClick={() => setVisibleWeekStart(Math.max(0, allWeeks.length - 6))}
                disabled={visibleWeekStart + 6 >= allWeeks.length}
                className="px-1.5 py-0.5 text-[10px] rounded text-slate-300 hover:bg-slate-800 disabled:opacity-30 cursor-pointer font-mono"
                title="Aller à la fin de l'année (S52)"
              >
                S52 ▶|
              </button>
            </div>
          </div>
        </div>

        {/* Main Simulation Table */}
        {/* Main Simulation Table: Excel 8-Line Layout vs Compact */}
        {simulationLayout === 'excel' ? (
          <TableauMicroSimulationExcel
            jobs={jobs}
            timelineDays={timelineDays}
            currentColIdx={currentColIdx}
            rows={rows}
            selectedRow={selectedRow}
            selectedChainFilter={selectedChainFilter}
            searchQuery={searchQuery}
            onUpdateJobDayCell={onUpdateJobDayCell}
            onUpdateJobDayField={onUpdateJobDayField}
            onUpdateJobTarget={onUpdateJobTarget}
            onSelectModelHealthJob={(j) => setSelectedModelHealthJob(j)}
            onOpenDayModal={(data) => {
              setEditingDayCell({
                ...data,
                applySubsequent: true,
              });
            }}
            displayedWeeks={displayedWeeks}
            displayedDays={displayedDays}
            weeksMap={weeksMap}
            modelColors={modelColors}
            onSetModelColor={onSetModelColor}
          />
        ) : (
          <>
            <div className="overflow-x-auto w-full max-h-[65vh]">
          <table className="w-full text-xs text-left border-collapse select-none">
            {/* Header 1 & 2 */}
            <thead className="sticky top-0 z-20 shadow-xs">
              {/* LIGNE 1 : SEMAINES & ZONES */}
              <tr className="bg-slate-900 text-white font-bold text-[10.5px] uppercase tracking-wider">
                <th
                  colSpan={4}
                  className="sticky left-0 z-30 bg-slate-900 py-2 px-3 border-r-2 border-slate-700 text-left min-w-[320px]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-amber-300 font-extrabold">CHAÎNE & MODÈLE SIMULÉ</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      ({filteredJobs.length} modèles actifs)
                    </span>
                  </div>
                </th>

                {/* Week Columns */}
                {displayedWeeks.map((weekCode) => {
                  const daysInWeek = weeksMap.get(weekCode) || [];
                  const hasPastDays = daysInWeek.some((d) => d.colIdx <= currentColIdx);
                  const hasFutureDays = daysInWeek.some((d) => d.colIdx > currentColIdx);
                  const hasToday = daysInWeek.some((d) => d.colIdx === currentColIdx);

                  return (
                    <th
                      key={weekCode}
                      colSpan={daysInWeek.length}
                      className={`py-1.5 px-1 text-center border-r border-slate-700 font-extrabold font-mono transition-colors ${
                        hasToday
                          ? 'bg-amber-950/70 border-b-2 border-b-amber-400 text-amber-300'
                          : hasPastDays && !hasFutureDays
                          ? 'bg-slate-850 text-emerald-300'
                          : 'bg-slate-800 text-sky-200'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-xs font-black">{weekCode}</span>
                        {hasToday ? (
                          <span className="text-[9px] bg-amber-400/30 text-amber-200 px-1 rounded font-sans uppercase">
                            ★ Actuel
                          </span>
                        ) : hasPastDays && !hasFutureDays ? (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 rounded font-sans uppercase">
                            Actualité
                          </span>
                        ) : (
                          <span className="text-[9px] bg-indigo-500/30 text-indigo-200 px-1 rounded font-sans uppercase">
                            Prévisions
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>

              {/* LIGNE 2 : DÉTAILS MODÈLE + DATES JOURNALIÈRES */}
              <tr className="bg-slate-800 text-slate-200 font-bold text-[10px] uppercase border-b-2 border-slate-600">
                <th className="sticky left-0 z-30 bg-slate-800 py-1.5 px-2.5 border-r border-slate-700 min-w-[130px]">
                  CHAÎNE
                </th>
                <th className="sticky left-[130px] z-30 bg-slate-800 py-1.5 px-2.5 border-r border-slate-700 min-w-[150px]">
                  STYLE / MODÈLE
                </th>
                <th className="sticky left-[280px] z-30 bg-slate-850 py-1.5 px-2 border-r border-slate-700 text-right w-16 text-white">
                  OF TOTAL
                </th>
                <th className="sticky left-[344px] z-30 bg-slate-800 py-1.5 px-2 border-r-2 border-slate-600 text-right w-14 text-indigo-200">
                  OBJ/J
                </th>

                {/* Day Columns */}
                {displayedDays.map((day) => {
                  const isPivot = day.colIdx === currentColIdx;
                  const isPast = day.colIdx < currentColIdx;

                  return (
                    <th
                      key={day.colIdx}
                      className={`py-1 px-1 text-center border-r font-mono min-w-[136px] w-[136px] max-w-[144px] transition-colors ${
                        isPivot
                          ? 'bg-amber-900/60 border-amber-500 text-amber-200 font-extrabold ring-1 ring-amber-400/40'
                          : isPast
                          ? 'bg-slate-800/95 border-slate-700 text-emerald-300'
                          : 'bg-slate-850 border-slate-700 text-sky-200'
                      }`}
                      title={`${day.dayName} ${day.dateLabel} (${day.week})`}
                    >
                      <div className="flex items-center justify-between px-1.5 text-[9px] font-sans font-bold leading-none">
                        <span className="uppercase text-slate-400">{day.dayName}</span>
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-[10px] font-mono ${
                              isPivot ? 'text-amber-300 underline font-black' : ''
                            }`}
                          >
                            {day.dateLabel}
                          </span>
                          {isPivot && (
                            <span className="text-[7.5px] bg-amber-400 text-slate-950 px-1 rounded font-sans font-extrabold">
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

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
              {Array.from(simulationJobsByChain.entries()).map(([chainName, chainJobs]) => {
                const isChainHighlighted =
                  selectedRow &&
                  (chainName.toLowerCase().includes(selectedRow.chaine.toLowerCase()) ||
                    selectedRow.chaine.toLowerCase().includes(chainName.toLowerCase()));

                return (
                  <React.Fragment key={chainName}>
                    {/* Chain Header Group */}
                    <tr className={`border-t-2 ${isChainHighlighted ? 'ring-2 ring-amber-400' : ''}`}>
                      <td
                        colSpan={4 + displayedDays.length}
                        className={`py-1.5 px-3 font-sans font-extrabold text-[11px] tracking-wide uppercase border-b ${getChainHeaderBg(
                          chainName
                        )}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>{chainName}</span>
                            {isChainHighlighted && (
                              <span className="bg-amber-400 text-slate-950 text-[9px] px-1.5 py-0.2 rounded font-black">
                                Chaîne active dans le tableau du haut
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-300 font-normal lowercase">
                            {chainJobs.length} modèle(s) simulé(s)
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Jobs for this chain */}
                    {chainJobs.map((job) => {
                      const isStyleSelected =
                        selectedRow && matchStyleWithModel(job.style, selectedRow.modele, selectedRow.chaine);

                      return (
                        <tr
                          key={job.id}
                          className={`hover:bg-amber-50/40 transition-colors ${
                            isStyleSelected
                              ? 'bg-amber-100/60 font-semibold'
                              : 'bg-white'
                          }`}
                        >
                          {/* Chaîne */}
                          <td className="sticky left-0 z-10 bg-inherit py-1.5 px-2.5 border-r border-slate-200 font-sans text-slate-600 truncate max-w-[130px]">
                            {job.chaine}
                          </td>

                          {/* Style & Client */}
                          <td className="sticky left-[130px] z-10 bg-inherit py-1.5 px-2.5 border-r border-slate-200 font-sans">
                            <div className="flex items-center justify-between gap-1">
                              <button
                                type="button"
                                onClick={() => setSelectedModelHealthJob(job)}
                                className="font-bold text-slate-900 truncate hover:text-indigo-600 hover:underline cursor-pointer text-left flex items-center gap-1 group"
                                title="Cliquer pour ouvrir la vue 360° état du modèle (avancement, cadences, prévisions)"
                              >
                                <span className="truncate">{job.style}</span>
                                <Activity className="w-3 h-3 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                              </button>
                              {job.client && (
                                <span className="text-[9.5px] bg-slate-100 text-slate-700 px-1 py-0.2 rounded font-medium border border-slate-200 shrink-0">
                                  {job.client}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* OF Total */}
                          <td className="sticky left-[280px] z-10 bg-inherit py-1.5 px-2 text-right font-bold text-slate-900 border-r border-slate-200 bg-slate-50">
                            {job.qtyTotal ? `${job.qtyTotal}p` : '—'}
                          </td>

                          {/* OBJ/J */}
                          <td className="sticky left-[344px] z-10 bg-inherit py-1 px-1.5 text-right font-extrabold text-indigo-700 border-r-2 border-slate-300">
                            {(() => {
                              const targets = Array.from(
                                new Set(
                                  (Object.values(job.jours || {}) as MicroJobDayData[])
                                    .map((d) => d.target)
                                    .filter((t): t is number => t !== undefined && t > 0)
                                )
                              );
                              const hasVarying = targets.length > 1;
                              const curTarget = job.jours?.[currentColIdx]?.target || job.objJour;

                              return (
                                <button
                                  type="button"
                                  onClick={() => setSelectedModelHealthJob(job)}
                                  className="w-full text-right cursor-pointer hover:bg-indigo-50/80 rounded px-1 py-0.5 transition-colors group flex flex-col items-end"
                                  title={
                                    hasVarying
                                      ? `Cadence variable détectée (${targets.join(' → ')}p). Cliquer pour ouvrir la vue 360° et ajuster.`
                                      : `Objectif journalier : ${curTarget}p. Cliquer pour ajuster.`
                                  }
                                >
                                  <span className="font-extrabold text-indigo-700 group-hover:text-indigo-900 text-xs">
                                    {curTarget ? `${curTarget}p` : '—'}
                                  </span>
                                  {hasVarying && (
                                    <span className="text-[8.5px] font-black bg-amber-100 text-amber-900 px-1 rounded tracking-tighter border border-amber-300">
                                      {targets.join('→')}p
                                    </span>
                                  )}
                                </button>
                              );
                            })()}
                          </td>

                          {/* Timeline Cells: 4 cases per day (Coupe, Alim, Real, Cumul) */}
                          {displayedDays.map((day) => {
                            const isPivot = day.colIdx === currentColIdx;
                            const col = day.colIdx;
                            const dayData = job.jours?.[col];

                            let realVal = dayData?.real || 0;
                            let cumulVal = dayData?.cumul || 0;
                            let coupeVal = dayData?.coupe || 0;
                            let alimVal = dayData?.alim || 0;

                            if (isPivot) {
                              const matchingRows = rows.filter(
                                (r) =>
                                  r.chaine.toLowerCase().includes(job.chaine.toLowerCase().split(' ')[0].toLowerCase()) &&
                                  matchStyleWithModel(job.style, r.modele, r.chaine)
                              );
                              if (matchingRows.length > 0) {
                                realVal = matchingRows.reduce((acc, curr) => acc + (curr.realPacking || 0), 0);
                                cumulVal = matchingRows.reduce((acc, curr) => acc + (curr.cumulPacking || 0), 0);
                                coupeVal = matchingRows.reduce((acc, curr) => acc + (curr.cumulCoupe || 0), 0);
                                alimVal = matchingRows.reduce((acc, curr) => acc + (curr.alimChaine || 0), 0);
                              }
                            }

                            const isEditingCoupe =
                              inlineEdit?.jobId === job.id &&
                              inlineEdit?.colIdx === col &&
                              inlineEdit?.field === 'coupe';
                            const isEditingAlim =
                              inlineEdit?.jobId === job.id &&
                              inlineEdit?.colIdx === col &&
                              inlineEdit?.field === 'alim';
                            const isEditingReal =
                              inlineEdit?.jobId === job.id &&
                              inlineEdit?.colIdx === col &&
                              inlineEdit?.field === 'real';
                            const isEditingCumul =
                              inlineEdit?.jobId === job.id &&
                              inlineEdit?.colIdx === col &&
                              inlineEdit?.field === 'cumul';

                            return (
                              <td
                                key={day.colIdx}
                                onDoubleClick={() => {
                                  const dayTarget = dayData?.target !== undefined ? dayData.target : job.objJour;
                                  setEditingDayCell({
                                    jobId: job.id,
                                    modelName: job.style,
                                    colIdx: day.colIdx,
                                    dateLabel: day.dateLabel,
                                    week: day.week,
                                    coupe: coupeVal,
                                    alim: alimVal,
                                    real: realVal,
                                    cumul: cumulVal,
                                    target: dayTarget,
                                    applySubsequent: true,
                                  });
                                }}
                                className={`p-0 border-r border-slate-300 min-w-[136px] w-[136px] max-w-[144px] ${
                                  isPivot ? 'bg-amber-50/50' : ''
                                }`}
                              >
                                <div className="grid grid-cols-4 divide-x divide-slate-200 h-8 items-stretch">
                                  {/* CASE 1 : CUMUL COUPE */}
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartInlineEdit(job.id, col, 'coupe', coupeVal);
                                    }}
                                    className={`h-full flex items-center justify-center font-mono text-[10px] cursor-pointer transition select-none ${
                                      isEditingCoupe
                                        ? 'p-0.5 bg-white ring-2 ring-amber-500 z-10'
                                        : coupeVal > 0
                                        ? 'bg-amber-100/70 hover:bg-amber-200/80 text-amber-950 font-bold'
                                        : 'hover:bg-amber-50/60 bg-amber-50/20 text-slate-400'
                                    }`}
                                    title={`1. CUMUL COUPE / Cumulative cutting qty : ${coupeVal || 0} pcs (cliquer pour éditer)`}
                                  >
                                    {isEditingCoupe ? (
                                      <input
                                        type="number"
                                        min="0"
                                        autoFocus
                                        value={inlineEdit.val}
                                        onChange={(e) =>
                                          setInlineEdit({ ...inlineEdit, val: e.target.value })
                                        }
                                        onBlur={handleSaveInlineEdit}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSaveInlineEdit();
                                          if (e.key === 'Tab') {
                                            e.preventDefault();
                                            handleSaveAndNextInline(job.id, col, 'alim');
                                          }
                                          if (e.key === 'Escape') setInlineEdit(null);
                                        }}
                                        className="w-full h-full text-[10px] font-bold text-center bg-white border border-amber-500 rounded-xs focus:outline-none p-0"
                                      />
                                    ) : (
                                      <span>{coupeVal > 0 ? coupeVal : '—'}</span>
                                    )}
                                  </div>

                                  {/* CASE 2 : ALIMENTATION */}
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartInlineEdit(job.id, col, 'alim', alimVal);
                                    }}
                                    className={`h-full flex items-center justify-center font-mono text-[10px] cursor-pointer transition select-none ${
                                      isEditingAlim
                                        ? 'p-0.5 bg-white ring-2 ring-sky-500 z-10'
                                        : alimVal > 0
                                        ? 'bg-sky-100/70 hover:bg-sky-200/80 text-sky-950 font-bold'
                                        : 'hover:bg-sky-50/60 bg-sky-50/20 text-slate-400'
                                    }`}
                                    title={`2. ALIMENTATION / Cutting qty available : ${alimVal || 0} pcs (cliquer pour éditer)`}
                                  >
                                    {isEditingAlim ? (
                                      <input
                                        type="number"
                                        min="0"
                                        autoFocus
                                        value={inlineEdit.val}
                                        onChange={(e) =>
                                          setInlineEdit({ ...inlineEdit, val: e.target.value })
                                        }
                                        onBlur={handleSaveInlineEdit}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSaveInlineEdit();
                                          if (e.key === 'Tab') {
                                            e.preventDefault();
                                            handleSaveAndNextInline(job.id, col, 'real');
                                          }
                                          if (e.key === 'Escape') setInlineEdit(null);
                                        }}
                                        className="w-full h-full text-[10px] font-bold text-center bg-white border border-sky-500 rounded-xs focus:outline-none p-0"
                                      />
                                    ) : (
                                      <span>{alimVal > 0 ? alimVal : '—'}</span>
                                    )}
                                  </div>

                                  {/* CASE 3 : REAL PACK */}
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartInlineEdit(job.id, col, 'real', realVal);
                                    }}
                                    className={`h-full flex items-center justify-center font-mono text-[10px] cursor-pointer transition select-none ${
                                      isEditingReal
                                        ? 'p-0.5 bg-white ring-2 ring-emerald-500 z-10'
                                        : realVal > 0
                                        ? 'bg-emerald-100/80 hover:bg-emerald-200 text-emerald-950 font-extrabold'
                                        : 'hover:bg-emerald-50/60 bg-emerald-50/20 text-slate-400'
                                    }`}
                                    title={`3. REAL PACK / Achieved qty : ${realVal || 0} pcs (cliquer pour éditer)`}
                                  >
                                    {isEditingReal ? (
                                      <input
                                        type="number"
                                        min="0"
                                        autoFocus
                                        value={inlineEdit.val}
                                        onChange={(e) =>
                                          setInlineEdit({ ...inlineEdit, val: e.target.value })
                                        }
                                        onBlur={handleSaveInlineEdit}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSaveInlineEdit();
                                          if (e.key === 'Tab') {
                                            e.preventDefault();
                                            handleSaveAndNextInline(job.id, col, 'cumul');
                                          }
                                          if (e.key === 'Escape') setInlineEdit(null);
                                        }}
                                        className="w-full h-full text-[10px] font-bold text-center bg-white border border-emerald-500 rounded-xs focus:outline-none p-0"
                                      />
                                    ) : (
                                      <span>{realVal > 0 ? realVal : '—'}</span>
                                    )}
                                  </div>

                                  {/* CASE 4 : CUMUL PACK (tout à droite) */}
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartInlineEdit(job.id, col, 'cumul', cumulVal);
                                    }}
                                    className={`h-full flex items-center justify-center font-mono text-[10px] cursor-pointer transition select-none ${
                                      isEditingCumul
                                        ? 'p-0.5 bg-white ring-2 ring-indigo-500 z-10'
                                        : cumulVal > 0
                                        ? 'bg-indigo-100/80 hover:bg-indigo-200 text-indigo-950 font-black'
                                        : 'hover:bg-indigo-50/60 bg-indigo-50/20 text-slate-400'
                                    }`}
                                    title={`4. CUMUL PACK / Cumulative qty (tout à droite) : ${cumulVal || 0} pcs (cliquer pour éditer)`}
                                  >
                                    {isEditingCumul ? (
                                      <input
                                        type="number"
                                        min="0"
                                        autoFocus
                                        value={inlineEdit.val}
                                        onChange={(e) =>
                                          setInlineEdit({ ...inlineEdit, val: e.target.value })
                                        }
                                        onBlur={handleSaveInlineEdit}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSaveInlineEdit();
                                          if (e.key === 'Escape') setInlineEdit(null);
                                        }}
                                        className="w-full h-full text-[10px] font-black text-center bg-white border border-indigo-500 rounded-xs focus:outline-none p-0"
                                      />
                                    ) : (
                                      <span>{cumulVal > 0 ? cumulVal : '—'}</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* NOTE EXPLICATIVE TOUT EN BAS DU TABLEAU (LÉGENDE DES 4 CASES PAR JOUR) */}
        <div className="p-3 bg-slate-900 border-t border-slate-700 text-white flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black rounded text-[10px] uppercase">
              Légende des 4 Cases par Jour
            </span>
            <span className="text-slate-300 text-[11px]">
              Chaque date comprend 4 cases manuelles (de gauche à droite) :
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto text-[11px] font-sans">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/80 border border-amber-500/50 text-amber-200">
              <span className="w-4 h-4 rounded bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center shrink-0">
                1
              </span>
              <div>
                <div className="font-extrabold text-[10px] uppercase text-amber-300">CUMUL COUPE</div>
                <div className="text-[9px] text-amber-200/70">Cumulative cutting qty</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-sky-950/80 border border-sky-500/50 text-sky-200">
              <span className="w-4 h-4 rounded bg-sky-500 text-slate-950 font-black text-[9px] flex items-center justify-center shrink-0">
                2
              </span>
              <div>
                <div className="font-extrabold text-[10px] uppercase text-sky-300">ALIMENTATION</div>
                <div className="text-[9px] text-sky-200/70">Cutting qty available</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-200">
              <span className="w-4 h-4 rounded bg-emerald-500 text-slate-950 font-black text-[9px] flex items-center justify-center shrink-0">
                3
              </span>
              <div>
                <div className="font-extrabold text-[10px] uppercase text-emerald-300">REAL PACK</div>
                <div className="text-[9px] text-emerald-200/70">Achieved qty</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-950/80 border border-indigo-500/50 text-indigo-200">
              <span className="w-4 h-4 rounded bg-indigo-500 text-white font-black text-[9px] flex items-center justify-center shrink-0">
                4
              </span>
              <div>
                <div className="font-extrabold text-[10px] uppercase text-indigo-300">CUMUL PACK</div>
                <div className="text-[9px] text-indigo-200/70">Cumulative qty (droite)</div>
              </div>
            </div>
          </div>
        </div>
      </>
    )}
    </div>

      {/* Edit Cell Modal (Pour éditer simultanément les 4 cases d'un jour) */}
      {editingDayCell && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm p-4 space-y-3 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Éditer les 4 cases journalières
                </h3>
              </div>
              <span className="bg-slate-100 text-slate-700 text-xs font-mono px-2 py-0.5 rounded font-bold">
                {editingDayCell.dateLabel} ({editingDayCell.week})
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[11px] text-slate-500">Modèle sélectionné :</span>
              <p className="text-xs font-bold text-slate-800">{editingDayCell.modelName}</p>
            </div>

            <div className="space-y-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-amber-900 mb-0.5">
                  1. CUMUL COUPE / Cumulative cutting qty :
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingDayCell.coupe}
                  onChange={(e) =>
                    setEditingDayCell({
                      ...editingDayCell,
                      coupe: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full text-xs font-mono border border-amber-300 bg-amber-50/30 rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-sky-900 mb-0.5">
                  2. ALIMENTATION / Cutting qty available :
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingDayCell.alim}
                  onChange={(e) =>
                    setEditingDayCell({
                      ...editingDayCell,
                      alim: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full text-xs font-mono border border-sky-300 bg-sky-50/30 rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-emerald-900 mb-0.5">
                  3. REAL PACK / Achieved qty :
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingDayCell.real}
                  onChange={(e) =>
                    setEditingDayCell({
                      ...editingDayCell,
                      real: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full text-xs font-mono border border-emerald-300 bg-emerald-50/30 rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold text-emerald-950"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-indigo-900 mb-0.5">
                  4. CUMUL PACK / Cumulative qty (tout à droite) :
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingDayCell.cumul}
                  onChange={(e) =>
                    setEditingDayCell({
                      ...editingDayCell,
                      cumul: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full text-xs font-mono border border-indigo-300 bg-indigo-50/30 rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-black text-indigo-950"
                />
              </div>

              {/* Target / Cadence OBJ/J du jour */}
              <div className="pt-2.5 border-t border-slate-200 bg-slate-50 p-2.5 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-extrabold text-slate-800">
                    5. OBJECTIF DU JOUR (OBJ/J cible) :
                  </label>
                  <span className="text-[10px] text-indigo-700 font-mono font-bold">
                    Cadence prévisionnelle
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    type="number"
                    min="1"
                    value={editingDayCell.target || ''}
                    onChange={(e) =>
                      setEditingDayCell({
                        ...editingDayCell,
                        target: Number(e.target.value) || 0,
                      })
                    }
                    className="w-24 text-xs font-mono font-bold border border-indigo-300 bg-white rounded px-2 py-1 text-indigo-950"
                    placeholder="Ex: 21"
                  />
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingDayCell.applySubsequent ?? true}
                      onChange={(e) =>
                        setEditingDayCell({
                          ...editingDayCell,
                          applySubsequent: e.target.checked,
                        })
                      }
                      className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>Appliquer aussi aux jours suivants (ex: changement d'OBJ/J)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setEditingDayCell(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded cursor-pointer font-medium"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (onUpdateJobDayField) {
                    onUpdateJobDayField(editingDayCell.jobId, editingDayCell.colIdx, 'coupe', editingDayCell.coupe);
                    onUpdateJobDayField(editingDayCell.jobId, editingDayCell.colIdx, 'alim', editingDayCell.alim);
                    onUpdateJobDayField(editingDayCell.jobId, editingDayCell.colIdx, 'real', editingDayCell.real);
                    onUpdateJobDayField(editingDayCell.jobId, editingDayCell.colIdx, 'cumul', editingDayCell.cumul);
                  } else {
                    onUpdateJobDayCell(editingDayCell.jobId, editingDayCell.colIdx, editingDayCell.real);
                  }

                  if (onUpdateJobTarget && editingDayCell.target > 0) {
                    onUpdateJobTarget(
                      editingDayCell.jobId,
                      editingDayCell.target,
                      editingDayCell.colIdx,
                      editingDayCell.applySubsequent ?? true
                    );
                  }
                  setEditingDayCell(null);
                }}
                className="px-3.5 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold shadow-xs cursor-pointer"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fiche d'État Général 360° du Modèle */}
      <FicheEtatModeleModal
        isOpen={selectedModelHealthJob !== null}
        onClose={() => setSelectedModelHealthJob(null)}
        job={selectedModelHealthJob}
        rows={rows}
        timelineDays={timelineDays}
        currentDateKey={currentDateKey}
        currentColIdx={currentColIdx}
        onUpdateJobTarget={onUpdateJobTarget}
        onUpdateJobDayField={onUpdateJobDayField}
      />
    </div>
  );
};
