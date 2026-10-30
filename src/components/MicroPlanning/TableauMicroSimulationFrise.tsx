import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  MicroJob,
  MicroTimelineDay,
  MicroJobDayData,
  MicroDailyRow,
} from '../../data/microPlanningTypes';
import { FicheEtatModeleModal } from './FicheEtatModeleModal';
import { TableauMicroSimulationExcel } from './TableauMicroSimulationExcel';
import { getModelColor, hexToRgba } from '../../utils/modelColorUtils';
import { formatDay, formatWeekCaption, isoAddDays } from '../../utils/dateDisplay';
import { ColorPickerPopover } from './ColorPickerPopover';
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
  Sparkles,
  Activity,
  FileSpreadsheet,
  LayoutGrid,
} from 'lucide-react';

interface TableauMicroSimulationFriseProps {
  jobs: MicroJob[];
  timelineDays: MicroTimelineDay[];
  currentDailyRows?: MicroDailyRow[];
  currentDateKey?: string;
  currentColIdx?: number;
  onUpdateJobDayCell?: (jobId: string, colIdx: number, realValue: number, targetValue?: number) => void;
  onUpdateJobDayField?: (jobId: string, colIdx: number, field: 'coupe' | 'alim' | 'real' | 'cumul' | 'target', value: number) => void;
  onUpdateJobTarget?: (jobId: string, newTarget: number, colIdx?: number, applyToSubsequentDays?: boolean) => void;
  availableChains: string[];
  modelColors?: Record<string, string>;
  onSetModelColor?: (modelName: string, color: string) => void;
}

export const TableauMicroSimulationFrise: React.FC<TableauMicroSimulationFriseProps> = ({
  jobs,
  timelineDays,
  currentDailyRows = [],
  currentDateKey = '12-10',
  currentColIdx = 267,
  onUpdateJobDayCell,
  onUpdateJobDayField,
  onUpdateJobTarget,
  availableChains,
  modelColors = {},
  onSetModelColor,
}) => {
  const [simulationLayout, setSimulationLayout] = useState<'excel' | 'compact'>('excel');
  const [selectedChainFilter, setSelectedChainFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModelHealthJob, setSelectedModelHealthJob] = useState<MicroJob | null>(null);
  const [editingCell, setEditingCell] = useState<{
    jobId: string;
    colIdx: number;
    field: 'coupe' | 'alim' | 'real' | 'cumul';
    initialVal: number;
  } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
        const primary = candidates.filter((d) => d.colIdx < 317);
        orderedMap.set(weekCode, primary.length > 0 ? primary : candidates);
      } else {
        const cal = CALENDAR_52_WEEKS[wIdx];
        const syntheticDays: MicroTimelineDay[] = (['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'] as const).map(
          (dayName, offset) => {
            const iso = isoAddDays(cal.date_debut, offset);
            return {
              colIdx: 1000 + wIdx * 5 + offset,
              week: weekCode,
              excelDate: 46000 + wIdx * 7 + offset,
              fullDate: iso,
              dateLabel: formatDay(iso),
              dayName,
              isActualite: false,
              isPrevision: true,
            };
          }
        );
        orderedMap.set(weekCode, syntheticDays);
      }
    });

    return orderedMap;
  }, [timelineDays]);

  // Semaine du jour pointé (S41 pour 12/10), calculée depuis currentColIdx et non plus figée
  const pivotDay = useMemo(
    () => timelineDays.find((d) => d.colIdx === currentColIdx) || null,
    [timelineDays, currentColIdx]
  );
  const pivotDate = formatDay(pivotDay?.dateLabel || currentDateKey);
  const pivotWeek = pivotDay?.week || 'S41';

  const defaultWeekIdx = useMemo(() => {
    const idx = pivotWeek ? allWeeks.indexOf(pivotWeek) : -1;
    return idx >= 0 ? idx : 40;
  }, [allWeeks, pivotWeek]);

  const [visibleWeeksRange, setVisibleWeeksRange] = useState<number>(defaultWeekIdx);

  // Sync if defaultWeekIdx changes on fresh load
  useEffect(() => {
    if (defaultWeekIdx > 0 && visibleWeeksRange === 0) {
      setVisibleWeeksRange(defaultWeekIdx);
    }
  }, [defaultWeekIdx]);

  // Display 6 to 8 weeks at a time for optimal comfort
  const displayedWeeks = useMemo(() => {
    const start = Math.max(0, Math.min(visibleWeeksRange, Math.max(0, allWeeks.length - 6)));
    return allWeeks.slice(start, start + 6);
  }, [allWeeks, visibleWeeksRange]);

  const displayedDays = useMemo(() => {
    const days: MicroTimelineDay[] = [];
    displayedWeeks.forEach((w) => {
      const list = weeksMap.get(w) || [];
      days.push(...list);
    });
    return days;
  }, [displayedWeeks, weeksMap]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchChain =
        selectedChainFilter === 'ALL' ||
        job.chaine.toLowerCase().includes(selectedChainFilter.toLowerCase());
      const matchSearch =
        !searchQuery ||
        job.style.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.chaine.toLowerCase().includes(searchQuery.toLowerCase());
      return matchChain && matchSearch;
    });
  }, [jobs, selectedChainFilter, searchQuery]);

  // Group filtered jobs by chain for clean visual sections
  const jobsByChain = useMemo(() => {
    const map = new Map<string, MicroJob[]>();
    filteredJobs.forEach((j) => {
      if (!map.has(j.chaine)) map.set(j.chaine, []);
      map.get(j.chaine)!.push(j);
    });
    return map;
  }, [filteredJobs]);

  const handleStartEdit = (
    jobId: string,
    colIdx: number,
    field: 'coupe' | 'alim' | 'real' | 'cumul',
    currentVal: number
  ) => {
    setEditingCell({ jobId, colIdx, field, initialVal: currentVal });
    setEditValue(currentVal > 0 ? String(currentVal) : '');
  };

  const handleSaveEdit = () => {
    if (editingCell) {
      const val = Math.max(0, Number(editValue) || 0);
      if (onUpdateJobDayField) {
        onUpdateJobDayField(editingCell.jobId, editingCell.colIdx, editingCell.field, val);
      } else if (onUpdateJobDayCell && editingCell.field === 'real') {
        onUpdateJobDayCell(editingCell.jobId, editingCell.colIdx, val);
      }
      setEditingCell(null);
    }
  };

  const handleSaveAndNext = (
    jobId: string,
    colIdx: number,
    nextField: 'coupe' | 'alim' | 'real' | 'cumul'
  ) => {
    if (editingCell) {
      const val = Math.max(0, Number(editValue) || 0);
      if (onUpdateJobDayField) {
        onUpdateJobDayField(editingCell.jobId, editingCell.colIdx, editingCell.field, val);
      } else if (onUpdateJobDayCell && editingCell.field === 'real') {
        onUpdateJobDayCell(editingCell.jobId, editingCell.colIdx, val);
      }

      // Activate next sub-case for fluid keyboard entry!
      const targetJob = jobs.find((j) => j.id === jobId);
      const dayData = targetJob?.jours?.[colIdx];
      const nextVal = (dayData ? dayData[nextField] : 0) || 0;
      setEditingCell({ jobId, colIdx, field: nextField, initialVal: nextVal });
      setEditValue(nextVal > 0 ? String(nextVal) : '');
    }
  };

  const getWeekFriendlyLabel = (weekCode: string) => {
    const daysInWeek = weeksMap.get(weekCode) || [];
    const calInfo = getCalendarWeek(weekCode);
    return formatWeekCaption(
      weekCode,
      daysInWeek[0]?.dateLabel ?? calInfo?.date_debut,
      daysInWeek[daysInWeek.length - 1]?.dateLabel ?? calInfo?.date_friday,
      weekCode === allWeeks[defaultWeekIdx]
    );
  };

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
      setVisibleWeeksRange(defaultWeekIdx);
    } else if (preset === 's01' || preset === 't1') {
      setVisibleWeeksRange(0); // S01
    } else if (preset === 't2') {
      setVisibleWeeksRange(13); // S14
    } else if (preset === 't3') {
      setVisibleWeeksRange(26); // S27
    } else if (preset === 't4') {
      setVisibleWeeksRange(39); // S40
    } else if (preset === 'beforeS41') {
      setVisibleWeeksRange(Math.max(0, defaultWeekIdx - 6));
    } else if (preset === 's52') {
      setVisibleWeeksRange(Math.max(0, allWeeks.length - 6));
    } else if (preset === 'real_calendar') {
      const realCode = getCurrentCalendarWeekCode();
      const idx = allWeeks.indexOf(realCode);
      if (idx >= 0) {
        setVisibleWeeksRange(Math.max(0, Math.min(idx, allWeeks.length - 6)));
      }
    } else {
      const foundMonth = CALENDAR_MONTHS.find(
        (m) => m.short.toLowerCase() === preset.toLowerCase() || m.name.toLowerCase() === preset.toLowerCase()
      );
      if (foundMonth) {
        const idx = allWeeks.indexOf(foundMonth.startWeek);
        if (idx >= 0) {
          setVisibleWeeksRange(Math.max(0, Math.min(idx, allWeeks.length - 6)));
        }
      }
    }
  };

  // Monochrome Chain theme helpers (Black, White, Gray)
  const getChainHeaderStyle = (chain: string) => {
    const c = chain.toUpperCase();
    if (c.includes('TANA')) return 'bg-slate-900 text-white border-slate-800';
    if (c.includes('MARGUERITE')) return 'bg-slate-950 text-white border-slate-800';
    if (c.includes('ROSE')) return 'bg-slate-850 text-slate-100 border-slate-700';
    if (c.includes('DHALIA')) return 'bg-slate-800 text-slate-100 border-slate-700';
    if (c.includes('SIEGE')) return 'bg-slate-700 text-slate-100 border-slate-600';
    return 'bg-slate-900 text-white border-slate-800';
  };

  return (
    <div className="flex flex-col bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
      {/* Header and Mode Switcher Bar */}
      <div className="px-4 py-2.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-700">
        <div className="flex items-center gap-2.5">
          <Layers className="w-4 h-4 text-slate-300" />
          <div>
            <h2 className="font-extrabold uppercase tracking-wide text-white text-xs">
              Simulation de Production &amp; Frise Multi-Chaînes
            </h2>
            <span className="text-[10px] text-slate-400">
              Visualisation continue par atelier · Format officiel MICRO-PLANNING MAJ du 12-10
            </span>
          </div>
        </div>

        {/* Mode Switcher: Excel MICRO-PLANNING (8 Lignes) vs Compact */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-700 shadow-inner">
          <button
            type="button"
            onClick={() => setSimulationLayout('excel')}
            className={`px-3 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              simulationLayout === 'excel'
                ? 'bg-slate-200 text-slate-950 font-black shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Format officiel du fichier MICRO-PLANNING MAJ du 12-10 : 8 lignes dédiées par atelier"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Format Excel MICRO-PLANNING (8 Lignes / Chaîne)</span>
            <span className="text-[8.5px] bg-slate-950 text-white px-1 py-0.2 rounded uppercase font-black border border-slate-700">
              Officiel
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSimulationLayout('compact')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              simulationLayout === 'compact'
                ? 'bg-slate-200 text-slate-950 font-black shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Format compact par modèle"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Format Compact (4 Cases)</span>
          </button>
        </div>
      </div>

      {/* Filter and Full Week Navigation Toolbar */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
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
                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            Toutes ({jobs.length})
          </button>
          {availableChains.map((ch) => {
            const count = jobs.filter((j) => j.chaine.toLowerCase().includes(ch.toLowerCase())).length;
            if (count === 0) return null;
            return (
              <button
                key={ch}
                onClick={() => setSelectedChainFilter(ch)}
                className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition ${
                  selectedChainFilter === ch
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {ch} ({count})
              </button>
            );
          })}
        </div>

        {/* Right side navigation & search */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Quick Preset Buttons (S01, Quarters, Active S41 in Yellow, S52) */}
          <div className="flex items-center flex-wrap bg-slate-800 p-0.5 rounded-md border border-slate-700 gap-0.5">
            <span className="text-[10px] text-slate-400 px-1.5 font-medium">Calendrier :</span>
            <button
              onClick={() => handleSelectPeriodPreset('s01')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                visibleWeeksRange === 0
                  ? 'bg-slate-950 text-white shadow-xs font-black border border-slate-700'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Début de l'année : S01 (Janvier)"
            >
              |◀ S01
            </button>
            <button
              onClick={() => handleSelectPeriodPreset('t1')}
              className="px-1.5 py-1 rounded text-[10px] text-slate-300 hover:text-white hover:bg-slate-700/60 transition cursor-pointer"
              title="Trimestre 1 (S01 - S13)"
            >
              T1
            </button>
            <button
              onClick={() => handleSelectPeriodPreset('t2')}
              className="px-1.5 py-1 rounded text-[10px] text-slate-300 hover:text-white hover:bg-slate-700/60 transition cursor-pointer"
              title="Trimestre 2 (S14 - S26)"
            >
              T2
            </button>
            <button
              onClick={() => handleSelectPeriodPreset('t3')}
              className="px-1.5 py-1 rounded text-[10px] text-slate-300 hover:text-white hover:bg-slate-700/60 transition cursor-pointer"
              title="Trimestre 3 (S27 - S39)"
            >
              T3
            </button>
            <button
              onClick={() => handleSelectPeriodPreset('t4')}
              className="px-1.5 py-1 rounded text-[10px] text-slate-300 hover:text-white hover:bg-slate-700/60 transition cursor-pointer"
              title="Trimestre 4 (S40 - S52)"
            >
              T4
            </button>
            <button
              onClick={() => handleSelectPeriodPreset('active')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                visibleWeeksRange === defaultWeekIdx
                  ? 'bg-[#FFFF00] text-slate-950 font-black shadow-xs ring-1 ring-amber-400'
                  : 'text-slate-300 hover:text-white'
              }`}
              title={`Semaine contenant le ${pivotDate} (${pivotWeek})`}
            >
              ★ {pivotWeek} active ({pivotDate})
            </button>
            <button
              onClick={() => handleSelectPeriodPreset('beforeS41')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                visibleWeeksRange < defaultWeekIdx && visibleWeeksRange >= defaultWeekIdx - 6
                  ? 'bg-slate-950 text-white shadow-xs font-black border border-slate-700'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title={`Semaines avant ${pivotWeek}`}
            >
              ⏪ Avant {pivotWeek}
            </button>
            <button
              onClick={() => handleSelectPeriodPreset('s52')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                visibleWeeksRange >= allWeeks.length - 6
                  ? 'bg-slate-950 text-white shadow-xs font-black border border-slate-700'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Fin d'année : S52 (Décembre)"
            >
              S52 ▶|
            </button>
          </div>

          {/* Quick Month Selector Buttons */}
          <div className="hidden xl:flex items-center bg-slate-800 p-0.5 rounded-md border border-slate-700 gap-0.5 text-[10px]">
            <span className="text-slate-400 px-1 font-medium">Mois :</span>
            {CALENDAR_MONTHS.map((m) => (
              <button
                key={`m_frise_${m.short}`}
                onClick={() => handleSelectPeriodPreset(m.short)}
                className="px-1.5 py-0.5 rounded text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                title={`${m.name} (${m.startWeek} à ${m.endWeek})`}
              >
                {m.short}
              </button>
            ))}
          </div>

          {/* Week Dropdown Selector: all 52 weeks */}
          <div className="flex items-center bg-slate-800 rounded-md border border-slate-700 px-2 py-0.5 gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] text-slate-300 font-semibold whitespace-nowrap">Semaine :</span>
            <select
              value={allWeeks[visibleWeeksRange] || 'S41'}
              onChange={(e) => {
                const idx = allWeeks.indexOf(e.target.value);
                if (idx >= 0) {
                  setVisibleWeeksRange(Math.max(0, Math.min(idx, allWeeks.length - 6)));
                }
              }}
              className="bg-slate-900 text-amber-300 font-mono font-bold text-xs rounded border border-slate-600 px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
            >
              {allWeeks.map((w, idx) => (
                <option key={`opt_frise_${w}_${idx}`} value={w}>
                  {getWeekFriendlyLabel(w)}
                </option>
              ))}
            </select>
          </div>

          {/* Stepper buttons */}
          <div className="flex items-center bg-slate-800 rounded-md border border-slate-700 px-1 py-0.5 gap-0.5">
            <button
              onClick={() => setVisibleWeeksRange(0)}
              disabled={visibleWeeksRange === 0}
              className="px-1.5 py-0.5 text-[10px] rounded text-slate-300 hover:bg-slate-700 disabled:opacity-30 cursor-pointer font-mono"
              title="Aller au début de l'année (S01)"
            >
              |◀ S01
            </button>
            <button
              onClick={() => setVisibleWeeksRange((prev) => Math.max(0, prev - 6))}
              disabled={visibleWeeksRange === 0}
              className="px-1.5 py-0.5 text-[10px] rounded text-slate-300 hover:bg-slate-700 disabled:opacity-30 cursor-pointer font-mono"
              title="Reculer de 6 semaines"
            >
              -6s
            </button>
            <button
              onClick={() => setVisibleWeeksRange((prev) => Math.max(0, prev - 1))}
              disabled={visibleWeeksRange === 0}
              className="p-1 rounded text-slate-300 hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
              title="Semaine précédente (-1s)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="text-[11px] font-mono text-amber-300 font-extrabold px-1.5 whitespace-nowrap">
              {displayedWeeks[0]} → {displayedWeeks[displayedWeeks.length - 1]}
            </span>

            <button
              onClick={() =>
                setVisibleWeeksRange((prev) =>
                  Math.min(Math.max(0, allWeeks.length - 6), prev + 1)
                )
              }
              disabled={visibleWeeksRange + 6 >= allWeeks.length}
              className="p-1 rounded text-slate-300 hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
              title="Semaine suivante (+1s)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() =>
                setVisibleWeeksRange((prev) =>
                  Math.min(Math.max(0, allWeeks.length - 6), prev + 6)
                )
              }
              disabled={visibleWeeksRange + 6 >= allWeeks.length}
              className="px-1.5 py-0.5 text-[10px] rounded text-slate-300 hover:bg-slate-700 disabled:opacity-30 cursor-pointer font-mono"
              title="Avancer de 6 semaines"
            >
              +6s
            </button>
            <button
              onClick={() => setVisibleWeeksRange(Math.max(0, allWeeks.length - 6))}
              disabled={visibleWeeksRange + 6 >= allWeeks.length}
              className="px-1.5 py-0.5 text-[10px] rounded text-slate-300 hover:bg-slate-700 disabled:opacity-30 cursor-pointer font-mono"
              title="Aller à la fin de l'année (S52)"
            >
              S52 ▶|
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrer modèle, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-2.5 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44"
            />
          </div>
        </div>
      </div>

      {/* Main Simulation View: Excel 8-Lines by Atelier vs Compact */}
      {simulationLayout === 'excel' ? (
        <TableauMicroSimulationExcel
          jobs={jobs}
          timelineDays={timelineDays}
          currentColIdx={currentColIdx}
          rows={currentDailyRows}
          selectedChainFilter={selectedChainFilter}
          searchQuery={searchQuery}
          onUpdateJobDayCell={onUpdateJobDayCell}
          onUpdateJobDayField={onUpdateJobDayField}
          onUpdateJobTarget={onUpdateJobTarget}
          onSelectModelHealthJob={(j) => setSelectedModelHealthJob(j)}
          displayedWeeks={displayedWeeks}
          displayedDays={displayedDays}
          weeksMap={weeksMap}
          modelColors={modelColors}
          onSetModelColor={onSetModelColor}
        />
      ) : (
        <>
          {/* Main Timeline Grid (Compact) */}
          <div ref={scrollContainerRef} className="overflow-x-auto w-full max-h-[72vh]">
            <table className="w-full text-xs text-left border-collapse select-none table-fixed">
              {/* STRICT COLUMN WIDTHS FOR SIMULATION FRISE */}
              <colgroup>
                <col style={{ width: '140px', minWidth: '140px', maxWidth: '140px' }} />
                <col style={{ width: '95px', minWidth: '95px', maxWidth: '95px' }} />
                <col style={{ width: '170px', minWidth: '170px', maxWidth: '170px' }} />
                <col style={{ width: '64px', minWidth: '64px', maxWidth: '64px' }} />
                <col style={{ width: '56px', minWidth: '56px', maxWidth: '56px' }} />
                <col style={{ width: '64px', minWidth: '64px', maxWidth: '64px' }} />
                {displayedDays.map((d) => (
                  <col
                    key={`col_day_${d.colIdx}`}
                    style={{ width: '136px', minWidth: '136px', maxWidth: '144px' }}
                  />
                ))}
              </colgroup>

              {/* Two-tier Table Header */}
              <thead className="sticky top-0 z-30 shadow-xs">
            {/* Tier 1: Weeks */}
            <tr className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
              {/* Sticky Left Corner Header */}
              <th
                colSpan={6}
                className="sticky left-0 z-40 bg-slate-900 py-2 px-3 border-r-4 border-slate-950 text-left w-[589px] min-w-[589px] max-w-[589px] shadow-[4px_0_10px_rgba(0,0,0,0.22)]"
              >
                <div className="flex items-center justify-between">
                  <span>IDENTIFICATION MODÈLE & ATELIER</span>
                  <span className="text-[10px] text-slate-400 lowercase font-normal">
                    ({filteredJobs.length} lignes)
                  </span>
                </div>
              </th>

              {/* Week Spanning Headers */}
              {displayedWeeks.map((weekCode) => {
                const daysInWeek = weeksMap.get(weekCode) || [];
                return (
                  <th
                    key={weekCode}
                    colSpan={daysInWeek.length}
                    className="py-1.5 px-1 text-center border-r border-slate-700 bg-slate-800 text-amber-300 font-extrabold font-mono"
                  >
                    {weekCode}
                  </th>
                );
              })}
            </tr>

            {/* Tier 2: Sub-headers (Model Columns + Day Columns) */}
            <tr className="bg-slate-800 text-slate-200 font-bold text-[10px] uppercase border-b-2 border-slate-600">
              {/* Sticky Columns */}
              <th className="sticky left-0 z-40 bg-slate-800 py-1.5 px-2.5 border-r border-slate-700 w-[140px] min-w-[140px] max-w-[140px] text-left">
                CHAÎNE / LIGNE
              </th>
              <th className="sticky left-[140px] z-40 bg-slate-800 py-1.5 px-2.5 border-r border-slate-700 w-[95px] min-w-[95px] max-w-[95px] text-left">
                CLIENT
              </th>
              <th className="sticky left-[235px] z-40 bg-slate-800 py-1.5 px-2.5 border-r border-slate-700 w-[170px] min-w-[170px] max-w-[170px] text-left">
                MODÈLE / STYLE
              </th>
              <th className="sticky left-[405px] z-40 bg-slate-850 py-1.5 px-2 border-r border-slate-700 text-right w-16 min-w-[64px] max-w-[64px]">
                OF (PCS)
              </th>
              <th className="sticky left-[469px] z-40 bg-slate-800 py-1.5 px-2 border-r border-slate-700 text-right w-14 min-w-[56px] max-w-[56px]">
                OBJ/J
              </th>
              <th className="sticky left-[525px] z-40 bg-slate-900 py-1.5 px-2 border-r-4 border-slate-700 text-right w-16 min-w-[64px] max-w-[64px] text-emerald-300 shadow-[4px_0_10px_rgba(0,0,0,0.22)]">
                CUMUL
              </th>

              {/* Individual Day Columns: Clean header without clutter, 4 cases below */}
              {displayedDays.map((d) => {
                const isHighlight = d.colIdx === currentColIdx;
                return (
                  <th
                    key={`th_day_${d.colIdx}`}
                    className={`py-1 px-1 text-center border-r border-slate-700 font-mono min-w-[136px] w-[136px] max-w-[144px] ${
                      isHighlight
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                    title={`${d.dayName} ${formatDay(d.dateLabel)} (${d.week})`}
                  >
                    <div className="flex items-center justify-between px-1 text-[9px] font-sans font-bold leading-none">
                      <span>{d.dayName}</span>
                      <span className="text-[10px] font-mono">{formatDay(d.dateLabel)}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body grouped by Production Chain */}
          <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
            {filteredJobs.length === 0 ? (
              <tr>
                <td
                  colSpan={6 + displayedDays.length}
                  className="py-12 text-center text-slate-500 font-sans"
                >
                  Aucun modèle trouvé dans la simulation pour cette sélection.
                </td>
              </tr>
            ) : (
              Array.from(jobsByChain.entries()).map(([chainName, chainJobs]) => (
                <React.Fragment key={`chain_group_${chainName}`}>
                  {/* Chain Group Header Separator */}
                  <tr className="border-t-2 border-slate-300">
                    <td
                      colSpan={6 + displayedDays.length}
                      className={`py-1.5 px-3 font-sans font-extrabold text-[11px] tracking-wide uppercase ${getChainHeaderStyle(
                        chainName
                      )}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5" />
                          <span>{chainName}</span>
                        </div>
                        <span className="text-[10px] font-mono font-medium opacity-80 lowercase">
                          {chainJobs.length} modèle(s) programmés
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Rows for each Job in this chain */}
                  {chainJobs.map((job, jIdx) => {
                    const isDone = job.qtyTotal > 0 && job.cumulRealise >= job.qtyTotal;
                    const pct =
                      job.qtyTotal > 0
                        ? Math.min(100, Math.round((job.cumulRealise / job.qtyTotal) * 100))
                        : 0;
                    const rowSolidBg = isDone ? 'bg-emerald-50' : jIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50';

                    return (
                      <tr
                        key={job.id}
                        className={`hover:bg-amber-100/70 transition-colors ${rowSolidBg}`}
                      >
                        {/* 1. Chaîne Sticky */}
                        <td className={`sticky left-0 z-30 ${rowSolidBg} py-2 px-2.5 border-r border-slate-200 font-sans font-semibold text-slate-700 text-[10px] truncate max-w-[140px]`}>
                          {job.chaine}
                        </td>

                        {/* 2. Client Sticky */}
                        <td className={`sticky left-[140px] z-30 ${rowSolidBg} py-2 px-2.5 border-r border-slate-200 font-sans font-bold text-slate-800 text-[11px] truncate max-w-[95px]`}>
                          {job.client}
                        </td>

                        {/* 3. Modèle / Style Sticky */}
                        <td
                          className={`sticky left-[235px] z-30 ${rowSolidBg} py-2 px-2.5 border-r border-slate-200 font-sans font-bold text-slate-900 text-[11px] truncate max-w-[170px]`}
                          style={{
                            borderLeft: `3px solid ${getModelColor(job.style, modelColors, job.color)}`,
                          }}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {onSetModelColor && (
                                <ColorPickerPopover
                                  currentColor={getModelColor(job.style, modelColors, job.color)}
                                  onChangeColor={(c) => onSetModelColor(job.style, c)}
                                  size="sm"
                                  title={`Couleur pour ${job.style}`}
                                />
                              )}
                              <button
                                type="button"
                                onClick={() => setSelectedModelHealthJob(job)}
                                className="font-bold text-slate-900 truncate hover:text-black hover:underline cursor-pointer text-left flex items-center gap-1 group"
                                title="Cliquer pour ouvrir la fiche d'état général 360° du modèle"
                              >
                                <span className="truncate">{job.style}</span>
                                <Activity className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                              </button>
                            </div>
                            {isDone && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-slate-800 shrink-0" />
                            )}
                          </div>
                        </td>

                        {/* 4. OF Total Sticky */}
                        <td className="sticky left-[405px] z-30 bg-slate-100 py-2 px-2 text-right font-extrabold text-slate-900 border-r border-slate-200">
                          {job.qtyTotal > 0 ? job.qtyTotal : '-'}
                        </td>

                        {/* 5. Target Obj/J Sticky */}
                        <td className={`sticky left-[469px] z-30 ${rowSolidBg} py-1 px-1.5 text-right border-r border-slate-200 text-[10px]`}>
                          {(() => {
                            const targets = Array.from(
                              new Set(
                                (Object.values(job.jours || {}) as MicroJobDayData[])
                                  .map((d) => d.target)
                                  .filter((t): t is number => t !== undefined && t > 0)
                              )
                            );
                            const hasVarying = targets.length > 1;

                            return (
                              <button
                                type="button"
                                onClick={() => setSelectedModelHealthJob(job)}
                                className="w-full text-right cursor-pointer hover:bg-indigo-50/80 rounded px-1 py-0.5 transition-colors group flex flex-col items-end"
                                title={
                                  hasVarying
                                    ? `Cadence variable (${targets.join(' → ')}p). Cliquer pour ouvrir la vue 360° et ajuster.`
                                    : `Objectif journalier : ${job.objJour}p. Cliquer pour ajuster.`
                                }
                              >
                                <span className="font-extrabold text-indigo-700 group-hover:text-indigo-900">
                                  {job.objJour > 0 ? `${job.objJour}p` : '-'}
                                </span>
                                {hasVarying && (
                                  <span className="text-[8px] font-black bg-amber-100 text-amber-900 px-1 rounded tracking-tighter border border-amber-300">
                                    {targets.join('→')}p
                                  </span>
                                )}
                              </button>
                            );
                          })()}
                        </td>

                        {/* 6. Cumul Realise Sticky + Strong boundary */}
                        <td className="sticky left-[525px] z-30 bg-emerald-100 py-2 px-2 text-right font-extrabold text-emerald-950 border-r-4 border-slate-700 shadow-[4px_0_10px_rgba(0,0,0,0.22)]">
                          <div className="flex flex-col items-end leading-none">
                            <span>{job.cumulRealise || 0}</span>
                            <span className="text-[9px] text-slate-500 font-sans">{pct}%</span>
                          </div>
                        </td>

                        {/* Timeline Day Cells: 4 cases per date (Coupe, Alim, Real, Cumul) */}
                        {displayedDays.map((day) => {
                          const col = day.colIdx;
                          const dayData: MicroJobDayData | undefined = job.jours?.[col];
                          const coupeVal = dayData?.coupe || 0;
                          const alimVal = dayData?.alim || 0;
                          const realVal = dayData?.real || 0;
                          const cumulVal = dayData?.cumul || 0;

                          const isEditingCoupe =
                            editingCell?.jobId === job.id &&
                            editingCell?.colIdx === col &&
                            editingCell?.field === 'coupe';
                          const isEditingAlim =
                            editingCell?.jobId === job.id &&
                            editingCell?.colIdx === col &&
                            editingCell?.field === 'alim';
                          const isEditingReal =
                            editingCell?.jobId === job.id &&
                            editingCell?.colIdx === col &&
                            editingCell?.field === 'real';
                          const isEditingCumul =
                            editingCell?.jobId === job.id &&
                            editingCell?.colIdx === col &&
                            editingCell?.field === 'cumul';

                          const isHighlight = day.colIdx === currentColIdx;

                          return (
                            <td
                              key={`cell_${job.id}_${col}`}
                              className={`p-0 border-r border-slate-300 min-w-[136px] w-[136px] max-w-[144px] ${
                                isHighlight ? 'bg-amber-50/40' : ''
                              }`}
                            >
                              <div className="grid grid-cols-4 divide-x divide-slate-200 h-8 items-stretch">
                                {/* CASE 1 : CUMUL COUPE */}
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEdit(job.id, col, 'coupe', coupeVal);
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
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={handleSaveEdit}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEdit();
                                        if (e.key === 'Tab') {
                                          e.preventDefault();
                                          handleSaveAndNext(job.id, col, 'alim');
                                        }
                                        if (e.key === 'Escape') setEditingCell(null);
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
                                    handleStartEdit(job.id, col, 'alim', alimVal);
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
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={handleSaveEdit}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEdit();
                                        if (e.key === 'Tab') {
                                          e.preventDefault();
                                          handleSaveAndNext(job.id, col, 'real');
                                        }
                                        if (e.key === 'Escape') setEditingCell(null);
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
                                    handleStartEdit(job.id, col, 'real', realVal);
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
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={handleSaveEdit}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEdit();
                                        if (e.key === 'Tab') {
                                          e.preventDefault();
                                          handleSaveAndNext(job.id, col, 'cumul');
                                        }
                                        if (e.key === 'Escape') setEditingCell(null);
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
                                    handleStartEdit(job.id, col, 'cumul', cumulVal);
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
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={handleSaveEdit}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEdit();
                                        if (e.key === 'Escape') setEditingCell(null);
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
              ))
            )}
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

      {/* Fiche d'État Général 360° du Modèle */}
      <FicheEtatModeleModal
        isOpen={selectedModelHealthJob !== null}
        onClose={() => setSelectedModelHealthJob(null)}
        job={selectedModelHealthJob}
        rows={[]}
        timelineDays={timelineDays}
        currentDateKey={currentDateKey}
        currentColIdx={currentColIdx}
        onUpdateJobTarget={onUpdateJobTarget}
        onUpdateJobDayField={onUpdateJobDayField}
      />
    </div>
  );
};
