import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  MicroDailyRow,
  MicroTimelineDay,
  MicroJob,
  MicroJobDayData,
} from '../../data/microPlanningTypes';
import {
  Package,
  Scissors,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Search,
  Filter,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Info,
  Layers,
  FileSpreadsheet,
  Check,
  TrendingUp,
} from 'lucide-react';

import { getModelColor } from '../../utils/modelColorUtils';
import { ColorPickerPopover } from './ColorPickerPopover';

interface TableauMicroSuiviJournalierProps {
  rows: MicroDailyRow[];
  timelineDays: MicroTimelineDay[];
  jobs: MicroJob[];
  currentDateKey: string;
  onUpdateField: (id: string, field: keyof MicroDailyRow, value: any) => void;
  onDeleteRow: (id: string) => void;
  onAddRowModal: () => void;
  onUpdateJobDayCell: (jobId: string, colIdx: number, realValue: number, targetValue?: number) => void;
  onUpdateJob?: (jobId: string, updates: Partial<MicroJob>) => void;
  availableChains: string[];
  modelColors?: Record<string, string>;
  onSetModelColor?: (modelName: string, color: string) => void;
  onShowToast?: (msg: string) => void;
}

export const TableauMicroSuiviJournalier: React.FC<TableauMicroSuiviJournalierProps> = ({
  rows,
  timelineDays = [],
  jobs = [],
  currentDateKey,
  onUpdateField,
  onDeleteRow,
  onAddRowModal,
  onUpdateJobDayCell,
  onUpdateJob,
  availableChains,
  modelColors = {},
  onSetModelColor,
  onShowToast,
}) => {
  // Filters & search
  const [selectedChainFilter, setSelectedChainFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCoupeColumns, setShowCoupeColumns] = useState(false);
  const [showInfoGuide, setShowInfoGuide] = useState(false);

  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Group timeline days by week
  const weeksMap = useMemo(() => {
    const map = new Map<string, MicroTimelineDay[]>();
    timelineDays.forEach((d) => {
      if (!map.has(d.week)) map.set(d.week, []);
      map.get(d.week)!.push(d);
    });
    return map;
  }, [timelineDays]);

  const allWeeks = useMemo(() => Array.from(weeksMap.keys()), [weeksMap]);

  // Semaine de référence courante basée sur la date en cours (ex: 12/10 -> S41)
  const activeTimelineWeek = useMemo(() => {
    const formatted = currentDateKey.replace('-', '/');
    const match = timelineDays.find((d) => d.dateLabel === formatted);
    if (match?.week) return match.week;
    if (allWeeks.includes('S41')) return 'S41';
    return allWeeks[0] || 'S41';
  }, [timelineDays, currentDateKey, allWeeks]);

  const [currentWeekCode, setCurrentWeekCode] = useState<string>(activeTimelineWeek);

  // Sync currentWeekCode if activeTimelineWeek changes
  useEffect(() => {
    if (activeTimelineWeek) {
      setCurrentWeekCode(activeTimelineWeek);
    }
  }, [activeTimelineWeek]);

  // Inline editing state for timeline day cells
  const [editingDayCell, setEditingDayCell] = useState<{
    rowId: string;
    jobId: string;
    colIdx: number;
  } | null>(null);
  const [tempDayVal, setTempDayVal] = useState<string>('');

  const weeksPerPage = 6; // 6 semaines affichées simultanément pour confort de lecture

  // Pagination / fenêtrage des semaines affichées (centré sur la semaine active)
  const [weekOffset, setWeekOffset] = useState<number>(() => {
    const idx = allWeeks.indexOf(activeTimelineWeek);
    return idx >= 0 ? Math.max(0, Math.min(idx, Math.max(0, allWeeks.length - 6))) : 0;
  });

  // Keep weekOffset focused on currentWeekCode when it changes
  useEffect(() => {
    const idx = allWeeks.indexOf(currentWeekCode);
    if (idx >= 0) {
      setWeekOffset(Math.max(0, Math.min(idx, Math.max(0, allWeeks.length - weeksPerPage))));
    }
  }, [allWeeks, currentWeekCode]);

  const displayedWeeks = useMemo(() => {
    const start = Math.max(0, Math.min(weekOffset, Math.max(0, allWeeks.length - weeksPerPage)));
    return allWeeks.slice(start, start + weeksPerPage);
  }, [allWeeks, weekOffset, weeksPerPage]);

  const displayedDays = useMemo(() => {
    const days: MicroTimelineDay[] = [];
    displayedWeeks.forEach((w) => {
      const list = weeksMap.get(w) || [];
      days.push(...list);
    });
    return days;
  }, [displayedWeeks, weeksMap]);

  // Index de la semaine courante
  const currentWeekIdx = useMemo(() => {
    return allWeeks.indexOf(currentWeekCode);
  }, [allWeeks, currentWeekCode]);

  // Map rapide normalisée pour associer chaque MicroDailyRow à un MicroJob
  const jobLookupMap = useMemo(() => {
    const map = new Map<string, MicroJob>();
    jobs.forEach((j) => {
      // Clé par modèle normalisé
      const k1 = j.style.toLowerCase().trim();
      map.set(k1, j);
      // Clé par chaîne + modèle
      const k2 = `${j.chaine.toLowerCase().trim()}_${k1}`;
      map.set(k2, j);
    });
    return map;
  }, [jobs]);

  // Find job for a daily row
  const getJobForRow = (row: MicroDailyRow): MicroJob | undefined => {
    const k2 = `${row.chaine.toLowerCase().trim()}_${row.modele.toLowerCase().trim()}`;
    if (jobLookupMap.has(k2)) return jobLookupMap.get(k2);
    const k1 = row.modele.toLowerCase().trim();
    if (jobLookupMap.has(k1)) return jobLookupMap.get(k1);
    // Recherche partielle
    return jobs.find(
      (j) =>
        j.style.toLowerCase().includes(row.modele.toLowerCase().trim()) ||
        row.modele.toLowerCase().includes(j.style.toLowerCase().trim())
    );
  };

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchChain =
        selectedChainFilter === 'ALL' ||
        r.chaine.toLowerCase().includes(selectedChainFilter.toLowerCase());
      const matchSearch =
        !searchQuery ||
        r.modele.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.chaine.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.client && r.client.toLowerCase().includes(searchQuery.toLowerCase())) ||
        r.remarque.toLowerCase().includes(searchQuery.toLowerCase());
      return matchChain && matchSearch;
    });
  }, [rows, selectedChainFilter, searchQuery]);

  // Totals
  const totals = useMemo(() => {
    let of = 0;
    let real = 0;
    let cumulJ1 = 0;
    let cumulPack = 0;
    let resteAFaire = 0;
    let alim = 0;
    let prodCoupe = 0;
    let cumulCoupe = 0;

    filteredRows.forEach((r) => {
      const ofVal = r.of || 0;
      const cPack = r.cumulPacking || 0;
      of += ofVal;
      real += r.realPacking || 0;
      cumulJ1 += r.cumulJ1 || 0;
      cumulPack += cPack;
      resteAFaire += Math.max(0, ofVal - cPack);
      alim += r.alimChaine || 0;
      prodCoupe += r.prodCoupe || 0;
      cumulCoupe += r.cumulCoupe || 0;
    });

    // Totaux journaliers sur la frise
    const dailyTotals: Record<number, number> = {};
    displayedDays.forEach((td) => {
      let sum = 0;
      filteredRows.forEach((r) => {
        const job = getJobForRow(r);
        if (job?.jours && job.jours[td.colIdx]) {
          sum += job.jours[td.colIdx].real || 0;
        }
      });
      dailyTotals[td.colIdx] = sum;
    });

    return { of, real, cumulJ1, cumulPack, resteAFaire, alim, prodCoupe, cumulCoupe, dailyTotals };
  }, [filteredRows, displayedDays, getJobForRow]);

  // Monochrome Chain badge styling (Black, White, Gray)
  const getChainColor = (chain: string) => {
    const c = chain.toUpperCase();
    if (c.includes('MARGUERITE')) return 'bg-slate-900 text-white border-slate-950 font-bold';
    if (c.includes('TANA')) return 'bg-slate-800 text-white border-slate-900 font-bold';
    if (c.includes('ROSE')) return 'bg-slate-700 text-white border-slate-800 font-bold';
    if (c.includes('DHALIA')) return 'bg-slate-200 text-slate-900 border-slate-300 font-bold';
    if (c.includes('SIEGE')) return 'bg-slate-100 text-slate-800 border-slate-300 font-bold';
    return 'bg-slate-100 text-slate-900 border-slate-300 font-bold';
  };

  /**
   * Calcul du statut d'une cellule de calendrier sur la frise (MICRO-PLANNING) :
   * Thème Noir, Blanc et Gris avec JAUNE réservé pour imposer la date/semaine en cours.
   */
  const resolveMicroCellVisual = (
    row: MicroDailyRow,
    job: MicroJob | undefined,
    day: MicroTimelineDay
  ): {
    bgClass: string;
    textClass: string;
    isSa: boolean;
    isSb: boolean;
    isGlissement: boolean;
    isTermine: boolean;
    val: number;
  } => {
    const saWeek = row.semaineLancement || job?.launchWeek || '';
    const sbWeek = row.semaineLimite || job?.deadlineWeek || '';

    const saIdx = allWeeks.indexOf(saWeek);
    const sbIdx = allWeeks.indexOf(sbWeek);
    const dayWeekIdx = allWeeks.indexOf(day.week);

    const ofVal = row.of || job?.qtyTotal || 0;
    const cumul = row.cumulPacking || job?.cumulRealise || 0;
    const reste = Math.max(0, ofVal - cumul);
    const isSolded = ofVal > 0 && reste === 0;

    const val = job?.jours?.[day.colIdx]?.real || 0;

    const isSaWeek = saWeek ? day.week === saWeek : false;
    const isSbWeek = sbWeek ? day.week === sbWeek : false;

    // Glissement rule:
    const isGlissementActive = sbIdx !== -1 && currentWeekIdx > sbIdx && reste > 0;
    const isGlissementWeek =
      isGlissementActive && dayWeekIdx > sbIdx && dayWeekIdx <= sbIdx + 4;

    // 1. JOUR EN COURS / ACTIF -> JAUNE IMPÉRATIF (#FFFF00)
    if (day.isToday) {
      return {
        bgClass: val > 0 ? 'bg-[#FFFF00] ring-1 ring-amber-400' : 'bg-[#FFFF00]/70',
        textClass: 'text-slate-950 font-black',
        isSa: false,
        isSb: false,
        isGlissement: false,
        isTermine: false,
        val,
      };
    }

    // 2. Terminé / Soldé dans les temps -> Blanc / Gris clair contrasté
    if (isSolded) {
      if (val > 0) {
        return {
          bgClass: 'bg-slate-200 hover:bg-slate-300',
          textClass: 'text-slate-950 font-extrabold',
          isSa: false,
          isSb: false,
          isGlissement: false,
          isTermine: true,
          val,
        };
      }
      return {
        bgClass: 'bg-slate-100/70',
        textClass: 'text-slate-700 font-semibold',
        isSa: false,
        isSb: false,
        isGlissement: false,
        isTermine: true,
        val: 0,
      };
    }

    // 3. Glissement vs Planning -> Gris foncé / Noir ardoise
    if (isGlissementWeek) {
      return {
        bgClass: 'bg-slate-800 hover:bg-slate-700',
        textClass: 'text-white font-extrabold',
        isSa: false,
        isSb: false,
        isGlissement: true,
        isTermine: false,
        val,
      };
    }

    // 4. Semaine Limite Client (Sb) -> Gris foncé moyen
    if (isSbWeek) {
      return {
        bgClass: 'bg-slate-700 hover:bg-slate-600',
        textClass: 'text-white font-extrabold',
        isSa: false,
        isSb: true,
        isGlissement: false,
        isTermine: false,
        val,
      };
    }

    // 5. Semaine de Lancement (Sa) -> Gris ardoise clair
    if (isSaWeek) {
      return {
        bgClass: 'bg-slate-300 hover:bg-slate-400',
        textClass: 'text-slate-950 font-extrabold',
        isSa: true,
        isSb: false,
        isGlissement: false,
        isTermine: false,
        val,
      };
    }

    // 6. Cellule normale avec quantité -> Blanc avec texte noir gras
    if (val > 0) {
      return {
        bgClass: 'bg-slate-100 hover:bg-slate-200',
        textClass: 'text-slate-950 font-extrabold',
        isSa: false,
        isSb: false,
        isGlissement: false,
        isTermine: false,
        val,
      };
    }

    // Cellule neutre vide
    return {
      bgClass: 'bg-white hover:bg-slate-50',
      textClass: 'text-slate-400',
      isSa: false,
      isSb: false,
      isGlissement: false,
      isTermine: false,
      val: 0,
    };
  };

  // Inline edit handlers for calendar cells
  const handleStartEditDayCell = (rowId: string, jobId: string, colIdx: number, currentVal: number) => {
    setEditingDayCell({ rowId, jobId, colIdx });
    setTempDayVal(currentVal > 0 ? String(currentVal) : '');
  };

  const handleCommitEditDayCell = () => {
    if (!editingDayCell) return;
    const num = Number(tempDayVal) || 0;
    onUpdateJobDayCell(editingDayCell.jobId, editingDayCell.colIdx, num);
    setEditingDayCell(null);
    if (onShowToast) onShowToast(`Quantité enregistrée : ${num} pcs`);
  };

  return (
    <div className="flex flex-col bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
      {/* =========================================================================
          BARRE D'ACTIONS ET DE CONTRÔLE SUPÉRIEURE
         ========================================================================= */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-300 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Filtres de Chaîne */}
        <div className="flex items-center flex-wrap gap-2">
          <span className="font-bold text-slate-700 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            Chaîne :
          </span>
          <button
            onClick={() => setSelectedChainFilter('ALL')}
            className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer transition ${
              selectedChainFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
            }`}
          >
            Toutes ({rows.length})
          </button>
          {availableChains.map((ch) => {
            const count = rows.filter((r) => r.chaine.toLowerCase().includes(ch.toLowerCase())).length;
            if (count === 0 && !['MARGUERITE 1', 'DHALIA - POSE CUIR'].includes(ch)) return null;
            return (
              <button
                key={ch}
                onClick={() => setSelectedChainFilter(ch)}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition ${
                  selectedChainFilter === ch
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                {ch} ({count})
              </button>
            );
          })}
        </div>

        {/* Contrôles Frise & Semaine de référence */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Sélecteur de semaine active (avec JAUNE pour imposer la semaine en cours) */}
          <div className="flex items-center bg-[#FFFF00]/20 border border-amber-400 rounded px-2.5 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-950 mr-1.5" />
            <span className="text-slate-950 font-black mr-1.5">Semaine active :</span>
            <select
              value={currentWeekCode}
              onChange={(e) => {
                setCurrentWeekCode(e.target.value);
                if (onShowToast) onShowToast(`Semaine active définie sur ${e.target.value}`);
              }}
              className="bg-[#FFFF00] text-slate-950 font-black font-mono px-2 py-0.5 rounded border border-amber-400 cursor-pointer shadow-2xs"
              title="Semaine active de travail (mise en valeur en jaune)"
            >
              {allWeeks.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          {/* Pagination Frise Semaines (‹ Précédent / Suivant ›) */}
          <div className="flex items-center bg-white border border-slate-300 rounded text-xs shadow-2xs">
            <button
              onClick={() => setWeekOffset((prev) => Math.max(0, prev - 2))}
              disabled={weekOffset <= 0}
              className="p-1.5 text-slate-600 hover:text-slate-950 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              title="Semaines précédentes"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono font-bold text-slate-800 text-[11px]">
              {displayedWeeks[0]} ➔ {displayedWeeks[displayedWeeks.length - 1]}
            </span>
            <button
              onClick={() =>
                setWeekOffset((prev) =>
                  Math.min(allWeeks.length - weeksPerPage, prev + 2)
                )
              }
              disabled={weekOffset >= allWeeks.length - weeksPerPage}
              className="p-1.5 text-slate-600 hover:text-slate-950 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              title="Semaines suivantes"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Toggle Colonnes Coupe & Atelier */}
          <button
            onClick={() => setShowCoupeColumns(!showCoupeColumns)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold border transition cursor-pointer ${
              showCoupeColumns
                ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
            title="Afficher/masquer les colonnes Coupe, Alimentation et Cartons"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>{showCoupeColumns ? 'Masquer Coupe' : '+ Détails Coupe & Atelier'}</span>
          </button>

          {/* Toggle Guide & Légende */}
          <button
            onClick={() => setShowInfoGuide(!showInfoGuide)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold border transition cursor-pointer ${
              showInfoGuide
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Guide &amp; Légende</span>
          </button>

          {/* Recherche */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher modèle, chaîne..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-2.5 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-slate-900 w-44"
            />
          </div>

          {/* Nouveau Modèle */}
          <button
            onClick={onAddRowModal}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-black text-white rounded text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Modèle / OF</span>
          </button>
        </div>
      </div>

      {/* GUIDE & LÉGENDE DÉPLIABLE DU MICRO-PLANNING */}
      {showInfoGuide && (
        <div className="px-4 py-3 bg-slate-100 border-b border-slate-300 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-900">
          <div className="space-y-1">
            <div className="font-extrabold flex items-center gap-1.5 text-slate-950">
              <span className="w-2.5 h-2.5 rounded-xs bg-slate-900" />
              VOLET FIXE D'IDENTIFICATION &amp; SUIVI OPERATIF (100% OPAQUE)
            </div>
            <p className="text-slate-700 leading-relaxed text-[11px]">
              Les colonnes <strong>#</strong>, <strong>Chaîne</strong>, <strong>Modèle</strong>, <strong>Client</strong>, <strong>OF</strong>, <strong>Date Livr.</strong>, <strong>Réalisé Jour</strong>, <strong>Cumul</strong> et <strong>Reste</strong> restent ancrées à gauche avec un fond opaque strict pour ne jamais chevaucher le calendrier lors du défilement horizontal.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="font-extrabold flex items-center gap-1.5 text-slate-950">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#FFFF00] border border-amber-400" />
              VOLET CALENDRIER : THÈME NOIR, BLANC &amp; GRIS (JAUNE = SEMAINE / DATE ACTIVE)
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className="px-1.5 py-0.5 rounded bg-[#FFFF00] text-slate-950 font-black border border-amber-400">
                Jaune : Jour ou Semaine en cours (Actif)
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-300 text-slate-950 font-bold border border-slate-400">
                Sa : Lancement
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-700 text-white font-bold">
                Sb : Limite Client
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white font-bold">
                Glissement : Sb+1..+4
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-950 font-bold border border-slate-300">
                Gris clair : Soldé / Terminé
              </span>
            </div>
            <p className="text-slate-600 text-[10px]">
              Astuce : Cliquez sur n'importe quel chiffre de date pour saisir ou modifier directement la production réalisée ou prévue.
            </p>
          </div>
        </div>
      )}

      {/* =========================================================================
          TABLEAU PRINCIPAL : SUIVI D'ATELIER + CALENDRIER DES SEMAINES ET DATES
         ========================================================================= */}
      <div ref={tableContainerRef} className="overflow-x-auto w-full relative">
        <table className="text-xs text-left border-collapse table-fixed min-w-full">
          {/* Ligne 1 d'en-tête : Identification + Grandes Semaines (S50, S51...) */}
          <thead>
            <tr className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
              {/* Colonne 0 : Index */}
              <th
                rowSpan={2}
                className="sticky left-0 z-30 bg-slate-900 py-2 px-1 text-center border-r border-slate-700 w-10 min-w-[40px] max-w-[40px]"
              >
                #
              </th>

              {/* Colonne 1 : Chaîne */}
              <th
                rowSpan={2}
                className="sticky left-[40px] z-30 bg-slate-900 py-2 px-2.5 border-r border-slate-700 w-36 min-w-[145px] max-w-[145px]"
              >
                CHAINE / LINE
              </th>

              {/* Colonne 2 : Modèle */}
              <th
                rowSpan={2}
                className="sticky left-[185px] z-30 bg-slate-900 py-2 px-2.5 border-r border-slate-700 w-48 min-w-[190px] max-w-[190px]"
              >
                MODELE / STYLE
              </th>

              {/* Colonne 3 : Client */}
              <th
                rowSpan={2}
                className="sticky left-[375px] z-30 bg-slate-900 py-2 px-2 border-r border-slate-700 w-24 min-w-[95px] max-w-[95px]"
              >
                CLIENT
              </th>

              {/* Colonne 4 : OF */}
              <th
                rowSpan={2}
                className="sticky left-[470px] z-30 bg-slate-950 py-2 px-2 text-right border-r border-slate-700 w-16 min-w-[65px] max-w-[65px] text-white"
              >
                OF
              </th>

              {/* Colonne 5 : Date Livraison */}
              <th
                rowSpan={2}
                className="sticky left-[535px] z-30 bg-slate-900 py-2 px-1 text-center border-r border-slate-700 w-16 min-w-[65px] max-w-[65px] text-slate-200"
              >
                LIVR.
              </th>

              {/* Colonne 6 : Réalisé Jour */}
              <th
                rowSpan={2}
                className="sticky left-[600px] z-30 bg-slate-900 py-2 px-2 text-right border-r border-slate-700 w-16 min-w-[65px] max-w-[65px] text-white"
                title={`Quantité emballée le ${currentDateKey}`}
              >
                REAL (J)
              </th>

              {/* Colonne 7 : Cumul Packing */}
              <th
                rowSpan={2}
                className="sticky left-[665px] z-30 bg-slate-900 py-2 px-2 text-right border-r border-slate-700 w-20 min-w-[80px] max-w-[80px] text-white"
              >
                CUMUL
              </th>

              {/* Colonne 8 : Reste à faire (FRONTIÈRE ROBUSTE AVEC LE CALENDRIER) */}
              <th
                rowSpan={2}
                className="sticky left-[745px] z-30 bg-slate-950 py-2 px-2 text-right border-r-4 border-slate-700 shadow-[4px_0_10px_rgba(0,0,0,0.18)] w-16 min-w-[65px] max-w-[65px] text-white"
              >
                RESTE
              </th>

              {/* Colonnes Semaines sur la Frise (S50, S51, S52...) */}
              {displayedWeeks.map((w) => {
                const daysInWeek = weeksMap.get(w) || [];
                const isCourante = w === currentWeekCode;
                return (
                  <th
                    key={w}
                    colSpan={daysInWeek.length}
                    className={`py-1.5 px-2 text-center border-r-2 border-slate-700 font-extrabold ${
                      isCourante ? 'bg-[#FFFF00] text-slate-950' : 'bg-slate-800 text-white'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>{w}</span>
                      {isCourante && (
                        <span className="text-[9px] bg-amber-900 text-white px-1 py-0.2 rounded font-mono">
                          ACTIVE
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}

              {/* Colonnes Optionnelles Coupe & Carton */}
              {showCoupeColumns && (
                <>
                  <th rowSpan={2} className="py-2 px-2 text-right border-r border-slate-700 w-16 bg-sky-950/30 text-sky-200">
                    ALIM.
                  </th>
                  <th rowSpan={2} className="py-2 px-2 text-right border-r border-slate-700 w-16 bg-sky-950/40 text-sky-300">
                    COUPE (J)
                  </th>
                  <th rowSpan={2} className="py-2 px-2 text-right border-r border-slate-700 w-16 text-slate-300">
                    CUM. COUPE
                  </th>
                  <th rowSpan={2} className="py-2 px-2 text-center border-r border-slate-700 w-20 text-slate-300">
                    % COUPE
                  </th>
                  <th rowSpan={2} className="py-2 px-3 border-r border-slate-700 min-w-[140px] text-slate-300">
                    REMARQUE
                  </th>
                </>
              )}

              {/* Actions */}
              <th rowSpan={2} className="py-2 px-1 text-center w-10 text-slate-400">
                ACT.
              </th>
            </tr>

            {/* Ligne 2 d'en-tête : Les Jours et Dates individuels (08/12 Lun, 09/12 Mar...) */}
            <tr className="bg-slate-900 text-white text-[10px] font-mono border-b-2 border-slate-600">
              {displayedDays.map((td) => (
                <th
                  key={`th-day-${td.colIdx}`}
                  className={`py-1 px-1 text-center border-r border-slate-700 w-12 min-w-[48px] max-w-[48px] ${
                    td.isToday ? 'bg-amber-400 text-slate-950 font-extrabold' : 'text-slate-300'
                  }`}
                  title={`${td.dayName} ${td.dateLabel} (Semaine ${td.week})`}
                >
                  <div>{td.dateLabel}</div>
                  <div className="text-[9px] opacity-80 uppercase">{td.dayName}</div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Corps du Tableau */}
          <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={12 + displayedDays.length + (showCoupeColumns ? 5 : 0)}
                  className="py-12 text-center text-slate-500 font-sans text-xs"
                >
                  Aucun modèle trouvé pour les filtres sélectionnés.
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => {
                const job = getJobForRow(row);
                const ofVal = row.of || job?.qtyTotal || 0;
                const cumulPack = row.cumulPacking || job?.cumulRealise || 0;
                const reste = Math.max(0, ofVal - cumulPack);
                const isCompleted = ofVal > 0 && reste === 0;
                const progressPct = ofVal > 0 ? Math.min(100, Math.round((cumulPack / ofVal) * 100)) : 0;
                const coupePct = Math.round((row.pctCoupe || 0) * 100);

                const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';

                return (
                  <tr
                    key={row.id}
                    className={`hover:bg-amber-50/50 transition-colors ${rowBg} ${
                      isCompleted ? 'bg-emerald-50/30' : ''
                    }`}
                  >
                    {/* Index */}
                    <td
                      className={`sticky left-0 z-20 ${rowBg} py-2 px-1 text-center text-slate-400 font-sans font-medium border-r border-slate-200 w-10 min-w-[40px] max-w-[40px]`}
                    >
                      {idx + 1}
                    </td>

                    {/* Chaîne */}
                    <td
                      className={`sticky left-[40px] z-20 ${rowBg} py-2 px-2 border-r border-slate-200 font-sans w-36 min-w-[145px] max-w-[145px]`}
                    >
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border truncate max-w-full ${getChainColor(
                          row.chaine
                        )}`}
                        title={row.chaine}
                      >
                        {row.chaine}
                      </span>
                    </td>

                    {/* Modèle / Style */}
                    <td
                      className={`sticky left-[185px] z-20 ${rowBg} py-2 px-2.5 border-r border-slate-200 font-sans w-48 min-w-[190px] max-w-[190px]`}
                      style={{
                        borderLeft: `3px solid ${getModelColor(row.modele, modelColors, row.color)}`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {onSetModelColor && (
                            <ColorPickerPopover
                              currentColor={getModelColor(row.modele, modelColors, row.color)}
                              onChangeColor={(c) => onSetModelColor(row.modele, c)}
                              size="sm"
                              title={`Couleur pour ${row.modele}`}
                            />
                          )}
                          <span className="font-bold text-slate-900 truncate" title={row.modele}>
                            {row.modele}
                          </span>
                        </div>
                        {isCompleted && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-slate-200 text-slate-900 px-1 py-0.2 rounded border border-slate-300 shrink-0">
                            <CheckCircle2 className="w-2.5 h-2.5 text-slate-800" />
                            Soldé
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Client */}
                    <td
                      className={`sticky left-[375px] z-20 ${rowBg} py-2 px-2 border-r border-slate-200 font-sans text-slate-700 truncate w-24 min-w-[95px] max-w-[95px]`}
                      title={row.client || job?.client || '-'}
                    >
                      {row.client || job?.client || '-'}
                    </td>

                    {/* OF (Total) */}
                    <td
                      className={`sticky left-[470px] z-20 ${rowBg} py-2 px-2 text-right font-extrabold text-slate-900 border-r border-slate-200 w-16 min-w-[65px] max-w-[65px]`}
                    >
                      <input
                        type="number"
                        min="1"
                        value={ofVal || 0}
                        onChange={(e) => onUpdateField(row.id, 'of', Number(e.target.value))}
                        className="w-12 text-right font-bold text-slate-900 bg-transparent border-b border-dashed border-slate-300 hover:border-slate-800 focus:outline-none focus:border-slate-900 py-0.5"
                      />
                    </td>

                    {/* Date Livraison */}
                    <td
                      className={`sticky left-[535px] z-20 ${rowBg} py-2 px-1 text-center border-r border-slate-200 w-16 min-w-[65px] max-w-[65px]`}
                    >
                      <input
                        type="text"
                        value={row.dateLivraison || '15/10'}
                        onChange={(e) => onUpdateField(row.id, 'dateLivraison', e.target.value)}
                        className="w-12 text-center font-semibold text-slate-700 bg-transparent border-b border-dashed border-slate-300 focus:outline-none"
                        placeholder="JJ/MM"
                        title="Date limite de livraison"
                      />
                    </td>

                    {/* REAL PACKING (Jour J) */}
                    <td
                      className={`sticky left-[600px] z-20 ${rowBg} py-2 px-2 text-right border-r border-slate-200 w-16 min-w-[65px] max-w-[65px]`}
                    >
                      <input
                        type="number"
                        min="0"
                        value={row.realPacking || ''}
                        placeholder="0"
                        onChange={(e) =>
                          onUpdateField(row.id, 'realPacking', Number(e.target.value))
                        }
                        className="w-12 text-right font-extrabold text-slate-900 bg-white border border-slate-300 rounded px-1 py-0.5 shadow-2xs focus:outline-none focus:border-slate-900"
                        title="Quantité réalisée ce jour"
                      />
                    </td>

                    {/* CUMUL PACKING */}
                    <td
                      className={`sticky left-[665px] z-20 ${rowBg} py-2 px-2 text-right font-extrabold text-slate-900 border-r border-slate-200 w-20 min-w-[80px] max-w-[80px]`}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>{cumulPack}</span>
                        <span className="text-[9px] text-slate-400 font-sans font-normal">
                          ({progressPct}%)
                        </span>
                      </div>
                    </td>

                    {/* RESTE À FAIRE (FRONTIÈRE ROBUSTE AVEC LE CALENDRIER) */}
                    <td
                      className={`sticky left-[745px] z-20 ${rowBg} py-2 px-2 text-right font-extrabold border-r-4 border-slate-700 shadow-[4px_0_10px_rgba(0,0,0,0.18)] w-16 min-w-[65px] max-w-[65px] ${
                        reste === 0 ? 'text-slate-400' : 'text-slate-950'
                      }`}
                    >
                      {reste}
                    </td>

                    {/* CELLULES DU CALENDRIER (SEMAINES ET DATES) */}
                    {displayedDays.map((td) => {
                      const visual = resolveMicroCellVisual(row, job, td);
                      const isEditing =
                        editingDayCell?.rowId === row.id &&
                        editingDayCell?.colIdx === td.colIdx;

                      return (
                        <td
                          key={`td-${row.id}-${td.colIdx}`}
                          onClick={() => {
                            if (job) {
                              handleStartEditDayCell(row.id, job.id, td.colIdx, visual.val);
                            }
                          }}
                          className={`py-1 px-0.5 text-center border-r border-slate-200 transition-colors cursor-pointer w-12 min-w-[48px] max-w-[48px] ${visual.bgClass} ${visual.textClass}`}
                          title={`${td.dayName} ${td.dateLabel} (${td.week}) · ${
                            visual.val > 0 ? visual.val + ' pcs' : '0 pcs'
                          } ${visual.isSa ? '· Lancement (Sa)' : ''} ${
                            visual.isSb ? '· Limite client (Sb)' : ''
                          } ${visual.isGlissement ? '· Glissement vs Planning' : ''}`}
                        >
                          {isEditing ? (
                            <input
                              type="number"
                              autoFocus
                              value={tempDayVal}
                              onChange={(e) => setTempDayVal(e.target.value)}
                              onBlur={handleCommitEditDayCell}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCommitEditDayCell();
                                if (e.key === 'Escape') setEditingDayCell(null);
                              }}
                              className="w-10 text-center font-extrabold bg-white text-slate-900 border border-slate-900 rounded px-0.5 py-0 shadow-md text-[11px]"
                            />
                          ) : visual.val > 0 ? (
                            <span>{visual.val}</span>
                          ) : visual.isSa ? (
                            <span className="text-[9px] tracking-tighter opacity-90">Sa</span>
                          ) : visual.isSb ? (
                            <span className="text-[9px] tracking-tighter opacity-90">Sb</span>
                          ) : visual.isGlissement ? (
                            <span className="text-[9px] tracking-tighter opacity-80">GLIS.</span>
                          ) : (
                            <span className="text-[9px] opacity-20">-</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Colonnes Optionnelles Coupe & Carton */}
                    {showCoupeColumns && (
                      <>
                        <td className="py-2 px-2 text-right border-r border-slate-200 bg-slate-50 text-slate-900 font-semibold w-16">
                          <input
                            type="number"
                            value={row.alimChaine || ''}
                            placeholder="0"
                            onChange={(e) =>
                              onUpdateField(row.id, 'alimChaine', Number(e.target.value))
                            }
                            className="w-12 text-right bg-transparent border-b border-dashed border-slate-300 focus:outline-none"
                          />
                        </td>

                        <td className="py-2 px-2 text-right border-r border-slate-200 bg-slate-100 text-slate-900 font-bold w-16">
                          <input
                            type="number"
                            value={row.prodCoupe || ''}
                            placeholder="0"
                            onChange={(e) =>
                              onUpdateField(row.id, 'prodCoupe', Number(e.target.value))
                            }
                            className="w-12 text-right bg-white border border-slate-300 rounded px-1 py-0.5 shadow-2xs"
                          />
                        </td>

                        <td className="py-2 px-2 text-right border-r border-slate-200 text-slate-700 w-16">
                          {row.cumulCoupe || 0}
                        </td>

                        <td className="py-2 px-2 border-r border-slate-200 font-sans w-20">
                          <div className="flex items-center gap-1">
                            <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  coupePct >= 100
                                    ? 'bg-slate-900'
                                    : coupePct >= 50
                                    ? 'bg-slate-600'
                                    : 'bg-slate-400'
                                }`}
                                style={{ width: `${Math.min(100, coupePct)}%` }}
                              />
                            </div>
                            <span className="text-[9px] font-semibold text-slate-600 w-6 text-right">
                              {coupePct}%
                            </span>
                          </div>
                        </td>

                        <td className="py-2 px-2.5 border-r border-slate-200 font-sans min-w-[140px]">
                          <input
                            type="text"
                            value={row.remarque || ''}
                            placeholder="Remarque..."
                            onChange={(e) => onUpdateField(row.id, 'remarque', e.target.value)}
                            className="w-full text-xs text-slate-700 bg-transparent border-b border-dashed border-transparent hover:border-slate-300 focus:border-slate-900 focus:outline-none"
                          />
                        </td>
                      </>
                    )}

                    {/* Actions */}
                    <td className="py-2 px-1 text-center w-10">
                      <button
                        onClick={() => onDeleteRow(row.id)}
                        className="p-1 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                        title="Supprimer la ligne"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Table Footer Totals */}
          <tfoot>
            <tr className="bg-slate-900 text-white font-extrabold text-[11px] border-t-2 border-slate-700">
              <td
                colSpan={4}
                className="sticky left-0 z-30 bg-slate-900 py-2.5 px-3 uppercase text-right tracking-wider border-r border-slate-700"
              >
                TOTAL GÉNÉRAL ({filteredRows.length} OF)
              </td>
              <td className="sticky left-[470px] z-30 bg-slate-950 text-white font-mono py-2.5 px-2 text-right border-r border-slate-700">
                {totals.of}
              </td>
              <td className="sticky left-[535px] z-30 bg-slate-900 py-2.5 px-1 border-r border-slate-700" />
              <td className="sticky left-[600px] z-30 bg-slate-900 text-white font-mono py-2.5 px-2 text-right border-r border-slate-700">
                +{totals.real}
              </td>
              <td className="sticky left-[665px] z-30 bg-slate-950 text-white font-mono py-2.5 px-2 text-right border-r border-slate-700">
                {totals.cumulPack}
              </td>
              <td className="sticky left-[745px] z-30 bg-slate-900 text-white font-mono py-2.5 px-2 text-right border-r-4 border-slate-700 shadow-[4px_0_10px_rgba(0,0,0,0.18)]">
                {totals.resteAFaire}
              </td>

              {/* Totaux par jour sur la Frise */}
              {displayedDays.map((td) => {
                const daySum = totals.dailyTotals[td.colIdx] || 0;
                const isCurrent = td.isToday;
                return (
                  <td
                    key={`ft-${td.colIdx}`}
                    className={`py-2 px-0.5 text-center font-mono border-r border-slate-700 w-12 min-w-[48px] max-w-[48px] ${
                      isCurrent
                        ? 'bg-[#FFFF00] text-slate-950 font-black'
                        : daySum > 0
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-500'
                    }`}
                  >
                    {daySum > 0 ? daySum : '-'}
                  </td>
                );
              })}

              {/* Totaux Coupe */}
              {showCoupeColumns && (
                <>
                  <td className="py-2.5 px-2 text-right font-mono text-slate-200 border-r border-slate-700">
                    {totals.alim}
                  </td>
                  <td className="py-2.5 px-2 text-right bg-slate-800 text-white font-mono border-r border-slate-700">
                    +{totals.prodCoupe}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-slate-300 border-r border-slate-700">
                    {totals.cumulCoupe}
                  </td>
                  <td colSpan={2} className="py-2.5 px-2 text-slate-400 font-sans border-r border-slate-700" />
                </>
              )}

              <td className="py-2.5 px-1" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
