import React, { useState, useMemo, useRef } from 'react';
import { Commande, PlanningCell, CellStatut } from '../data/initialData';
import {
  CommandeCalculated,
  SemaineCalculated,
  nbHeuresExact,
  nbBrodeusesExact,
  formatExcelNumber,
  HEURES_PAR_BRODEUSE_SEMAINE,
} from '../utils/macroLogic';
import {
  CALENDAR_52_WEEKS,
  CALENDAR_QUARTERS,
  CALENDAR_MONTHS,
  getCurrentCalendarWeekCode,
} from '../utils/calendarUtils';
import { formatDay, formatFullDate, formatWeekCaption, isoWeekEnd } from '../utils/dateDisplay';
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Paintbrush,
  Sparkles,
  Copy,
  Trash2,
  Edit3,
  X,
  SlidersHorizontal,
  Layers,
  Eye,
  Info,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Check,
  ArrowRight,
} from 'lucide-react';

export type MacroViewMode = 'panoramic' | 'identification_only' | 'compact_frise';
export type MacroWeekRange = 'ALL' | 'T1' | 'T2' | 'T3' | 'T4' | 'FROM_CURRENT';

interface TableauFriseChronologiqueProps {
  semaines: SemaineCalculated[];
  commandes: CommandeCalculated[];
  planning: PlanningCell[];
  currentSemaineCode: string;
  onSetCurrentSemaine: (code: string) => void;
  onSetPieces: (
    commandeId: number,
    semaineId: number,
    pieces: number,
    statut?: CellStatut,
    manualBrodeuses?: number | null
  ) => void;
  onSetBrodeusesDispoCommande: (commandeId: number, nbBrodeusesDispo: number | null) => void;
  onSetStatut: (commandeId: number, semaineId: number, statut: CellStatut) => void;
  onSetRowColor: (commandeId: number, rowColor: CellStatut) => void;
  onSetEffectifDispo: (semaineId: number | 'all', effectif: number) => void;
  onShiftOrderWeeks: (commandeId: number, deltaWeeks: number) => void;
  onAutoDispatch: (commandeId: number, startWeek?: string, nbWeeks?: number) => void;
  onUpdateCommande: (id: number, updates: Partial<Commande>) => void;
  onAddCommande: () => void;
  onEditCommandeModal: (cmd: Commande) => void;
  onDuplicateCommande: (id: number) => void;
  onDeleteCommande: (id: number) => void;
  onShowToast: (msg: string) => void;
}

export const TableauFriseChronologique: React.FC<TableauFriseChronologiqueProps> = ({
  semaines,
  commandes,
  planning,
  currentSemaineCode,
  onSetCurrentSemaine,
  onSetPieces,
  onSetBrodeusesDispoCommande,
  onSetStatut,
  onSetRowColor,
  onSetEffectifDispo,
  onShiftOrderWeeks,
  onAutoDispatch,
  onUpdateCommande,
  onAddCommande,
  onEditCommandeModal,
  onDuplicateCommande,
  onDeleteCommande,
  onShowToast,
}) => {
  // Mode d'affichage (Panoramique 2 volets, Fiche commandes seule, Frise synthétique)
  const [viewMode, setViewMode] = useState<MacroViewMode>('panoramic');

  // Filtre de recherche client / modèle
  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('ALL');
  const [weekRangeFilter, setWeekRangeFilter] = useState<MacroWeekRange>('ALL');
  const [showInfoGuide, setShowInfoGuide] = useState(false);

  // Outil Pinceau de couleur / statut
  const [activeBrush, setActiveBrush] = useState<CellStatut | null>(null);

  // État d'édition inline d'une cellule de planning (Nb pièces ET/OU Nb brodeuses)
  const [editingCell, setEditingCell] = useState<{
    cmdId: number;
    semId: number;
    focusField: 'pieces' | 'brodeuses';
  } | null>(null);
  const [tempValPieces, setTempValPieces] = useState<string>('');
  const [tempValBrod, setTempValBrod] = useState<string>('');

  // État d'édition inline des colonnes fixes (qte_commande, heure_pcs, qte_finie, nb_brodeuses_dispo)
  const [editingFixed, setEditingFixed] = useState<{
    cmdId: number;
    field: 'qte_commande' | 'heure_pcs' | 'qte_finie' | 'nb_brodeuses_dispo' | 'semaine_lancement' | 'semaine_limite_client';
  } | null>(null);
  const [tempFixedVal, setTempFixedVal] = useState<string>('');

  // État d'édition de l'effectif disponible (42 brodeuses)
  const [editingEffectifSemId, setEditingEffectifSemId] = useState<number | null>(null);
  const [tempEffectifVal, setTempEffectifVal] = useState<string>('');

  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Map rapide [cmdId_semId] -> PlanningCell
  const planningMap = useMemo(() => {
    const map = new Map<string, PlanningCell>();
    planning.forEach((p) => {
      map.set(`${p.commande_id}_${p.semaine_id}`, p);
    });
    return map;
  }, [planning]);

  // Liste des clients uniques
  const uniqueClients = useMemo(() => {
    return Array.from(new Set(commandes.map((c) => c.client)));
  }, [commandes]);

  // Filtrage des commandes
  const filteredCommandes = useMemo(() => {
    return commandes.filter((c, idx) => {
      const matchClient = clientFilter === 'ALL' || c.client === clientFilter;
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        c.client.toLowerCase().includes(q) ||
        c.modele.toLowerCase().includes(q) ||
        String(idx + 1).includes(q);
      return matchClient && matchSearch;
    });
  }, [commandes, clientFilter, searchTerm]);

  // Dénombrement Sa (Lancement) et Sb (Limite client) par semaine pour la frise
  const saCountByWeek = useMemo(() => {
    const map = new Map<string, number>();
    commandes.forEach((c) => {
      if (c.saCode) {
        const k = c.saCode.toUpperCase().trim();
        map.set(k, (map.get(k) || 0) + 1);
      }
    });
    return map;
  }, [commandes]);

  const sbCountByWeek = useMemo(() => {
    const map = new Map<string, number>();
    commandes.forEach((c) => {
      if (c.sbCode) {
        const k = c.sbCode.toUpperCase().trim();
        map.set(k, (map.get(k) || 0) + 1);
      }
    });
    return map;
  }, [commandes]);

  // Filtrage des 52 semaines affichées sur la frise
  const visibleSemaines = useMemo(() => {
    const currentIdx = semaines.findIndex((s) => s.code === currentSemaineCode);
    return semaines.filter((_, idx) => {
      if (weekRangeFilter === 'FROM_CURRENT') {
        return currentIdx >= 0 ? idx >= currentIdx : true;
      }
      if (weekRangeFilter === 'T1') {
        return idx >= 0 && idx <= 12; // S01 - S13
      }
      if (weekRangeFilter === 'T2') {
        return idx >= 13 && idx <= 25; // S14 - S26
      }
      if (weekRangeFilter === 'T3') {
        return idx >= 26 && idx <= 38; // S27 - S39
      }
      if (weekRangeFilter === 'T4') {
        return idx >= 39 && idx <= 51; // S40 - S52
      }
      return true;
    });
  }, [semaines, weekRangeFilter, currentSemaineCode]);

  // Scroll horizontal rapide vers une semaine sur la frise
  const scrollToWeek = (weekCode: string) => {
    if (!tableContainerRef.current) return;
    const targetEl = tableContainerRef.current.querySelector(
      `[data-week-header="${weekCode}"]`
    ) as HTMLElement | null;
    if (targetEl) {
      const container = tableContainerRef.current;
      const stickyOffset = viewMode === 'compact_frise' ? 262 : 857;
      const scrollLeft = Math.max(0, targetEl.offsetLeft - stickyOffset);
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  };

  // Gestion édition Nb pièces + Nb brodeuses dans une cellule de semaine
  const startEditWeekCell = (
    cmd: CommandeCalculated,
    semId: number,
    currentPieces: number,
    currentBrod: number | null,
    focusField: 'pieces' | 'brodeuses' = 'pieces'
  ) => {
    if (activeBrush !== null) {
      onSetStatut(cmd.id, semId, activeBrush);
      return;
    }
    setEditingCell({ cmdId: cmd.id, semId, focusField });
    setTempValPieces(currentPieces > 0 ? String(currentPieces) : '');
    setTempValBrod(
      currentBrod !== null && currentBrod > 0 ? String(Math.round(currentBrod * 10) / 10) : ''
    );
  };

  const handleTempPiecesChange = (val: string, cmd: CommandeCalculated) => {
    setTempValPieces(val);
    const numPcs = parseFloat(val.replace(',', '.'));
    if (
      !Number.isNaN(numPcs) &&
      numPcs >= 0 &&
      !cmd.heure_pcs_tbc &&
      cmd.heure_pcs &&
      cmd.heure_pcs > 0
    ) {
      const calcBrod =
        Math.round(((numPcs * cmd.heure_pcs) / HEURES_PAR_BRODEUSE_SEMAINE) * 10) / 10;
      setTempValBrod(numPcs > 0 ? String(calcBrod) : '');
    }
  };

  const handleTempBrodChange = (val: string, cmd: CommandeCalculated) => {
    setTempValBrod(val);
    const numBrod = parseFloat(val.replace(',', '.'));
    if (
      !Number.isNaN(numBrod) &&
      numBrod >= 0 &&
      !cmd.heure_pcs_tbc &&
      cmd.heure_pcs &&
      cmd.heure_pcs > 0
    ) {
      const calcPcs = Math.round((numBrod * HEURES_PAR_BRODEUSE_SEMAINE) / cmd.heure_pcs);
      setTempValPieces(numBrod > 0 ? String(calcPcs) : '0');
    }
  };

  const commitEditWeekCell = (cmd: CommandeCalculated) => {
    if (!editingCell) return;
    const parsedPcs = parseFloat(tempValPieces.replace(',', '.'));
    const parsedBrod = parseFloat(tempValBrod.replace(',', '.'));

    let finalPieces = Number.isNaN(parsedPcs) ? 0 : Math.max(0, parsedPcs);
    let finalManualBrod: number | null = null;

    if (!Number.isNaN(parsedBrod) && parsedBrod >= 0) {
      if (
        (tempValPieces.trim() === '' || finalPieces === 0) &&
        parsedBrod > 0 &&
        !cmd.heure_pcs_tbc &&
        cmd.heure_pcs &&
        cmd.heure_pcs > 0
      ) {
        finalPieces = Math.round((parsedBrod * HEURES_PAR_BRODEUSE_SEMAINE) / cmd.heure_pcs);
      }
      if (!cmd.heure_pcs_tbc && cmd.heure_pcs && cmd.heure_pcs > 0) {
        const theoreticalBrod =
          Math.round(((finalPieces * cmd.heure_pcs) / HEURES_PAR_BRODEUSE_SEMAINE) * 10) / 10;
        if (Math.abs(parsedBrod - theoreticalBrod) > 0.15) {
          finalManualBrod = parsedBrod;
        }
      } else if (parsedBrod > 0) {
        finalManualBrod = parsedBrod;
      }
    }

    onSetPieces(editingCell.cmdId, editingCell.semId, finalPieces, undefined, finalManualBrod);
    setEditingCell(null);
  };

  // Gestion édition colonnes fixes (qte_commande, heure_pcs, qte_finie, nb_brodeuses_dispo, semaine_lancement, semaine_limite_client)
  const startEditFixed = (
    cmd: CommandeCalculated,
    field: 'qte_commande' | 'heure_pcs' | 'qte_finie' | 'nb_brodeuses_dispo' | 'semaine_lancement' | 'semaine_limite_client'
  ) => {
    setEditingFixed({ cmdId: cmd.id, field });
    if (field === 'heure_pcs') {
      setTempFixedVal(cmd.heure_pcs_tbc ? 'TBC' : String(cmd.heure_pcs ?? ''));
    } else if (field === 'nb_brodeuses_dispo') {
      setTempFixedVal(
        cmd.nb_brodeuses_dispo !== null && cmd.nb_brodeuses_dispo !== undefined
          ? String(cmd.nb_brodeuses_dispo)
          : cmd.brodeusesActives !== null
          ? String(cmd.brodeusesActives)
          : ''
      );
    } else {
      setTempFixedVal(String(cmd[field] ?? 0));
    }
  };

  const commitEditFixed = (cmd: CommandeCalculated, orderNumber: number) => {
    if (!editingFixed) return;
    const { cmdId, field } = editingFixed;
    const raw = tempFixedVal.trim().toUpperCase();

    if (field === 'nb_brodeuses_dispo') {
      if (raw === '' || raw === '0') {
        onSetBrodeusesDispoCommande(cmdId, null);
      } else {
        const num = parseFloat(raw.replace(',', '.'));
        if (!Number.isNaN(num) && num > 0) {
          onSetBrodeusesDispoCommande(cmdId, num);
          if (!cmd.heure_pcs_tbc && cmd.heure_pcs && cmd.heure_pcs > 0) {
            const pcsPerWeek = Math.max(
              1,
              Math.round((num * HEURES_PAR_BRODEUSE_SEMAINE) / cmd.heure_pcs)
            );
            onShowToast(
              `Commande N°${orderNumber} : ${num} brodeuses dispo ➔ ${pcsPerWeek} pcs/semaine réparties automatiquement.`
            );
          } else {
            onShowToast(
              `Commande N°${orderNumber} : ${num} brodeuses enregistrées.`
            );
          }
        }
      }
      setEditingFixed(null);
      return;
    }

    if (field === 'heure_pcs') {
      if (raw === 'TBC' || raw === '' || raw === '?') {
        onUpdateCommande(cmdId, { heure_pcs: null, heure_pcs_tbc: 1 });
      } else {
        const num = parseFloat(raw.replace(',', '.'));
        if (!Number.isNaN(num) && num >= 0) {
          onUpdateCommande(cmdId, { heure_pcs: num, heure_pcs_tbc: 0 });
        }
      }
    } else {
      const num = parseFloat(raw.replace(',', '.'));
      if (!Number.isNaN(num) && num >= 0) {
        onUpdateCommande(cmdId, { [field]: num });
      }
    }
    setEditingFixed(null);
  };

  // Gestion édition Effectif
  const commitEditEffectif = (semId: number) => {
    const num = parseFloat(tempEffectifVal.replace(',', '.'));
    if (!Number.isNaN(num) && num >= 0) {
      onSetEffectifDispo(semId, num);
    }
    setEditingEffectifSemId(null);
  };

  // Couleur de fond d'une cellule CLIENT / MODELE (selon l'état de la commande ou son row_color)
  const getRowLabelStyle = (cmd: CommandeCalculated) => {
    if (cmd.isCompletedOnTime || cmd.row_color === 'termine' || cmd.resteAFaire <= 0) {
      return 'bg-emerald-100 text-emerald-950 font-bold'; // Vert : Commande soldée (opaque)
    }
    if (cmd.row_color === 'sst') {
      return 'bg-slate-200 text-slate-900 font-semibold'; // Gris : SST (opaque)
    }
    if (cmd.isGlissement || cmd.row_color === 'glissement') {
      return 'bg-amber-100 text-slate-950 font-semibold border-l-4 border-l-amber-500'; // Glissement vs Planning (opaque)
    }
    return 'bg-white text-slate-900';
  };

  /**
   * Statut d'une cellule de semaine pour le Macro-Planning (Broderie)
   */
  const resolveEffectiveWeekCellState = (
    cmd: CommandeCalculated,
    weekIdx: number,
    cell: PlanningCell | undefined,
    semCode?: string
  ): {
    effectiveStatut: CellStatut;
    isLaunchWeek: boolean;
    isInitialDeadlineWeek: boolean;
    isGlissementWindow: boolean;
    isNewGlissementDeadline: boolean;
    isCompletedGreenSpan: boolean;
  } => {
    const isLaunchWeek =
      (semCode && cmd.saCode ? semCode.toUpperCase().trim() === cmd.saCode.toUpperCase().trim() : false) ||
      cell?.statut === 'lancement' ||
      (cmd.saIdx >= 0 && weekIdx === cmd.saIdx);

    const isInitialDeadlineWeek =
      (semCode && cmd.sbCode ? semCode.toUpperCase().trim() === cmd.sbCode.toUpperCase().trim() : false) ||
      cell?.statut === 'limite_client' ||
      (cmd.sbIdx >= 0 && weekIdx === cmd.sbIdx);
    const isGlissementWindow =
      cmd.isGlissement &&
      cmd.glissementStartIdx >= 0 &&
      weekIdx >= cmd.glissementStartIdx &&
      weekIdx <= cmd.glissementEndIdx;
    const isNewGlissementDeadline =
      cmd.isGlissement &&
      cmd.effectiveDeadlineIdx >= 0 &&
      weekIdx === cmd.effectiveDeadlineIdx;

    let effectiveStatut: CellStatut = cell?.statut || 'normal';
    if (effectiveStatut === 'normal') {
      if (isGlissementWindow) {
        effectiveStatut = 'glissement';
      } else if (isInitialDeadlineWeek) {
        effectiveStatut = 'limite_client';
      } else if (isLaunchWeek) {
        effectiveStatut = 'lancement';
      }
    }

    const isCompletedGreenSpan =
      effectiveStatut === 'termine' ||
      (cmd.isCompletedOnTime && weekIdx <= (cmd.effectiveDeadlineIdx >= 0 ? cmd.effectiveDeadlineIdx : cmd.lastActiveWeekIdx));

    return {
      effectiveStatut,
      isLaunchWeek,
      isInitialDeadlineWeek,
      isGlissementWindow,
      isNewGlissementDeadline,
      isCompletedGreenSpan,
    };
  };

  return (
    <div className="flex flex-col space-y-2.5">
      {/* =========================================================================
          SECTION 1 : EN-TÊTE DE PRÉSENTATION & SÉLECTEUR DE MODE DE VUE
         ========================================================================= */}
      <div className="bg-white border border-slate-300 rounded-lg p-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Titre & Sous-titre */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  SUIVI PLANNING · Macro-Planning
                </h1>
                <span className="text-[10px] bg-indigo-100 text-indigo-900 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                  Broderie Traditionnelle
                </span>
                <span className="text-[10px] bg-amber-100 text-amber-950 font-bold px-2 py-0.5 rounded-full border border-amber-300">
                  Semaine active : {currentSemaineCode}
                </span>
              </div>
            </div>
          </div>

          {/* Switcher 3 Modes de visualisation & Guide */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-300 text-xs shadow-2xs">
              <button
                onClick={() => setViewMode('panoramic')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                  viewMode === 'panoramic'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/70'
                }`}
                title="Panneau gauche d'identification ancré + Frise défilante à droite"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Panoramique (Double-Volet)</span>
              </button>

              <button
                onClick={() => setViewMode('identification_only')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                  viewMode === 'identification_only'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/70'
                }`}
                title="Tableau complet des commandes sans calendrier (0 défilement horizontal)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Fiche Dossier Seule</span>
              </button>

              <button
                onClick={() => setViewMode('compact_frise')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                  viewMode === 'compact_frise'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/70'
                }`}
                title="Identification compacte et frise chronologique étendue"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Frise Synthétique</span>
              </button>
            </div>

            <button
              onClick={() => setShowInfoGuide(!showInfoGuide)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                showInfoGuide
                  ? 'bg-amber-100 text-amber-950 border-amber-400'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <Info className="w-3.5 h-3.5 text-amber-600" />
              <span>Guide &amp; Légende</span>
            </button>
          </div>
        </div>

        {/* GUIDE & LÉGENDE DÉPLIABLE */}
        {showInfoGuide && (
          <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50/80 p-3 rounded-lg border border-slate-200">
            <div className="space-y-1.5">
              <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-800" />
                VOLET 1 : DOSSIER COMMANDES &amp; IDENTIFICATION (10 COLONNES FIXES)
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Reste toujours <strong>100% visible et opaque</strong> à gauche lors du défilement horizontal :
                <strong> N°</strong>, <strong>Client</strong>, <strong>Modèle</strong>, <strong>Qté Commande</strong>, <strong>Unité</strong>, <strong>Heure/Pcs</strong>, <strong>Qté Finie</strong>, <strong>Reste à faire</strong>, <strong>Brod. Dispo</strong> et <strong>Pièces Programmées</strong>.
              </p>
              <p className="text-slate-500 text-[10px]">
                Astuce : Cliquez sur <em>Qté Commande</em>, <em>Heure/Pcs</em>, <em>Qté Finie</em> ou <em>Brod. Dispo</em> pour modifier directement la valeur.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-600" />
                VOLET 2 : CALENDRIER ANNUEL NORMAL (S01 ➔ S52) &amp; JALONS
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="px-1.5 py-0.5 rounded bg-[#FFFF00] text-slate-950 font-bold border border-slate-400">
                  Jaune : Semaine en cours ({currentSemaineCode})
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold border border-emerald-300">
                  Vert : Commande soldée (Reste = 0)
                </span>
                <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-900 font-bold border border-indigo-200">
                  Bleu : Pièces &amp; Brodeuses planifiées
                </span>
                <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-900 font-bold border border-slate-300">
                  Gris : Sous-traitance (SST)
                </span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Une frontière verticale marquée (bordure foncée + ombre) sépare physiquement l'identification et la frise pour empêcher tout chevauchement.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          BARRE DE CONTRÔLE : FILTRES, RECHERCHE, PINCEAU & NOUVELLE COMMANDE
         ========================================================================= */}
      <div className="bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Gauche : Recherche + Filtre Client + Plage de semaines */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Recherche */}
          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrer N°, client, modèle..."
              className="w-full pl-8 pr-6 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:outline-none focus:bg-white focus:border-indigo-600"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Sélecteur Client */}
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
          >
            <option value="ALL">Tous les clients ({commandes.length} commandes)</option>
            {uniqueClients.map((cl) => (
              <option key={cl} value={cl}>
                {cl}
              </option>
            ))}
          </select>

          {/* Plage de semaines & Filtres Trimestres (seulement si frise affichée) */}
          {viewMode !== 'identification_only' && (
            <div className="flex items-center flex-wrap bg-slate-100 p-0.5 rounded border border-slate-300 text-xs gap-0.5">
              <button
                onClick={() => setWeekRangeFilter('ALL')}
                className={`px-2 py-1 rounded font-semibold transition cursor-pointer ${
                  weekRangeFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Afficher l'année complète (52 semaines : S01 à S52)"
              >
                52 Semaines (S01 ➔ S52)
              </button>
              <button
                onClick={() => setWeekRangeFilter('T1')}
                className={`px-1.5 py-1 rounded font-medium transition cursor-pointer ${
                  weekRangeFilter === 'T1'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title="Trimestre 1 : S01 à S13"
              >
                T1 (S01-S13)
              </button>
              <button
                onClick={() => setWeekRangeFilter('T2')}
                className={`px-1.5 py-1 rounded font-medium transition cursor-pointer ${
                  weekRangeFilter === 'T2'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title="Trimestre 2 : S14 à S26"
              >
                T2 (S14-S26)
              </button>
              <button
                onClick={() => setWeekRangeFilter('T3')}
                className={`px-1.5 py-1 rounded font-medium transition cursor-pointer ${
                  weekRangeFilter === 'T3'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title="Trimestre 3 : S27 à S39"
              >
                T3 (S27-S39)
              </button>
              <button
                onClick={() => setWeekRangeFilter('T4')}
                className={`px-1.5 py-1 rounded font-medium transition cursor-pointer ${
                  weekRangeFilter === 'T4'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title="Trimestre 4 : S40 à S52"
              >
                T4 (S40-S52)
              </button>
              <button
                onClick={() => {
                  const realCode = getCurrentCalendarWeekCode();
                  onSetCurrentSemaine(realCode);
                  scrollToWeek(realCode);
                  onShowToast(`Synchronisé avec la date du jour réelle : ${realCode}`);
                }}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 text-[11px] font-medium transition cursor-pointer"
                title="Synchroniser automatiquement la semaine active avec la date du jour réelle du calendrier"
              >
                <Calendar className="w-3 h-3 text-emerald-600" />
                <span>Aujourd'hui</span>
              </button>
            </div>
          )}
        </div>

        {/* Droite : Pinceau Couleurs + Nouvelle Commande */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pinceau de statut officiel Excel */}
          <div className="flex items-center flex-wrap gap-1 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs">
            <Paintbrush className="w-3.5 h-3.5 text-slate-500 mr-0.5" />
            <span className="text-slate-700 font-bold mr-1 text-[11px]">Fonctions Excel :</span>
            <button
              onClick={() => setActiveBrush(activeBrush === 'lancement' ? null : 'lancement')}
              className={`px-2 py-0.5 rounded font-bold border transition cursor-pointer text-[10.5px] flex items-center gap-1 ${
                activeBrush === 'lancement'
                  ? 'bg-[#ED7D31] text-white border-slate-900 ring-2 ring-orange-500 shadow-xs'
                  : 'bg-[#F8CBAD]/80 text-[#C55A11] border-[#ED7D31] hover:bg-[#F8CBAD]'
              }`}
              title="Marquer la Semaine de Lancement (Sa - Orange)"
            >
              <span>🟧 Sa Lancement</span>
            </button>
            <button
              onClick={() => setActiveBrush(activeBrush === 'limite_client' ? null : 'limite_client')}
              className={`px-2 py-0.5 rounded font-bold border transition cursor-pointer text-[10.5px] flex items-center gap-1 ${
                activeBrush === 'limite_client'
                  ? 'bg-[#C00000] text-white border-slate-900 ring-2 ring-red-500 shadow-xs'
                  : 'bg-rose-100 text-[#C00000] border-[#C00000] hover:bg-rose-200'
              }`}
              title="Marquer la Date Limite Client (Sb - Rouge)"
            >
              <span>🟥 Sb Limite</span>
            </button>
            <button
              onClick={() => setActiveBrush(activeBrush === 'glissement' ? null : 'glissement')}
              className={`px-2 py-0.5 rounded font-bold border transition cursor-pointer text-[10.5px] flex items-center gap-1 ${
                activeBrush === 'glissement'
                  ? 'bg-[#2E75B6] text-white border-slate-900 ring-2 ring-blue-500 shadow-xs'
                  : 'bg-[#BDD7EE] text-[#1B4F82] border-[#2E75B6] hover:bg-[#A9CCE3]'
              }`}
              title="Marquer en Glissement vs Planning (Bleu comme dans l'Excel)"
            >
              <span>🟦 Glissement</span>
            </button>
            <button
              onClick={() => setActiveBrush(activeBrush === 'sst' ? null : 'sst')}
              className={`px-2 py-0.5 rounded font-bold border transition cursor-pointer text-[10.5px] flex items-center gap-1 ${
                activeBrush === 'sst'
                  ? 'bg-slate-700 text-white border-slate-900 ring-2 ring-slate-500 shadow-xs'
                  : 'bg-slate-200 text-slate-800 border-slate-400 hover:bg-slate-300'
              }`}
              title="Marquer en SST / Sous-traitance (Gris comme dans l'Excel)"
            >
              <span>⬜ SST</span>
            </button>
            <button
              onClick={() => setActiveBrush(activeBrush === 'termine' ? null : 'termine')}
              className={`px-2 py-0.5 rounded font-bold border transition cursor-pointer text-[10.5px] flex items-center gap-1 ${
                activeBrush === 'termine'
                  ? 'bg-emerald-600 text-white border-slate-900 ring-2 ring-emerald-500 shadow-xs'
                  : 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200'
              }`}
              title="Marquer en Soldé / Terminé (Vert comme dans l'Excel)"
            >
              <span>🟩 Terminé</span>
            </button>
            <button
              onClick={() => setActiveBrush(activeBrush === 'normal' ? null : 'normal')}
              className={`px-2 py-0.5 rounded font-medium border transition cursor-pointer text-[10.5px] ${
                activeBrush === 'normal'
                  ? 'bg-white text-slate-900 border-slate-900 ring-2 ring-slate-400'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
              }`}
              title="Effacer le marquage d'une cellule"
            >
              Effacer
            </button>
            {activeBrush !== null && (
              <button
                onClick={() => setActiveBrush(null)}
                className="ml-1 text-rose-600 hover:text-rose-800 font-bold px-1 cursor-pointer"
                title="Désactiver le pinceau"
              >
                ✕
              </button>
            )}
          </div>

          {/* Ajouter une commande */}
          <button
            onClick={onAddCommande}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Nouvelle Commande</span>
          </button>
        </div>
      </div>

      {/* BANDEAU D'AIDE PINCEAU ACTIF */}
      {activeBrush !== null && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg px-3.5 py-1.5 text-xs text-amber-950 flex items-center justify-between">
          <span>
            <strong>Mode Pinceau manuel actif ({activeBrush.toUpperCase()}) :</strong> Cliquez sur
            n'importe quelle case de semaine (ou sur le Client / Modèle) pour appliquer ou modifier
            manuellement la couleur.
          </span>
          <button
            onClick={() => setActiveBrush(null)}
            className="px-2.5 py-0.5 bg-amber-900 text-white rounded font-semibold text-[11px] cursor-pointer"
          >
            Quitter le mode pinceau
          </button>
        </div>
      )}

      {/* =========================================================================
          MODE 2 : FICHE DOSSIER COMMANDES SEULE (SANS DÉFILEMENT HORIZONTAL)
         ========================================================================= */}
      {viewMode === 'identification_only' ? (
        <div className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs uppercase tracking-wider">
                DOSSIER DE PRODUCTION DES COMMANDES (Macro-Planning)
              </span>
              <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                {filteredCommandes.length} commandes affichées
              </span>
            </div>
            <span className="text-[11px] text-slate-300">
              Vue aérée sans calendrier · Affichage 100% largeur avec synthèse de charge et statut
            </span>
          </div>

          <div className="overflow-x-auto max-h-[calc(100vh-230px)]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-800 text-[11px] font-bold sticky top-0 z-20 border-b-2 border-slate-300">
                <tr>
                  <th className="py-2 px-2 text-center w-12 border-r border-slate-300">N°</th>
                  <th className="py-2 px-3 border-r border-slate-300">CLIENT</th>
                  <th className="py-2 px-3 border-r border-slate-300">MODÈLE</th>
                  <th className="py-2 px-2 text-right border-r border-slate-300">QTÉ COMMANDE</th>
                  <th className="py-2 px-2 text-center border-r border-slate-300">UNITÉ</th>
                  <th className="py-2 px-2 text-right border-r border-slate-300">HEURE/PCS</th>
                  <th className="py-2 px-2 text-right border-r border-slate-300 bg-emerald-50">QTÉ FINIE</th>
                  <th className="py-2 px-2 text-right border-r border-slate-300 bg-amber-50">RESTE À FAIRE</th>
                  <th className="py-2 px-2 text-center border-r border-slate-300 bg-indigo-50">BROD. DISPO</th>
                  <th className="py-2 px-2 text-center border-r border-slate-300">LANCEMENT (Sa)</th>
                  <th className="py-2 px-2 text-center border-r border-slate-300">LIMITE (Sb)</th>
                  <th className="py-2 px-3 border-r border-slate-300">PROGRESSION</th>
                  <th className="py-2 px-2 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCommandes.map((cmd, idx) => {
                  const orderNumber = idx + 1;
                  const pct = cmd.qte_commande > 0 ? Math.min(100, Math.round(((cmd.qte_finie || 0) / cmd.qte_commande) * 100)) : 0;
                  const rowLabelClass = getRowLabelStyle(cmd);

                  return (
                    <tr key={cmd.id} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="py-1.5 px-2 text-center font-mono font-bold border-r border-slate-300 bg-slate-50">
                        {orderNumber}
                      </td>
                      <td className={`py-1.5 px-3 font-semibold border-r border-slate-300 ${rowLabelClass}`}>
                        {cmd.client}
                      </td>
                      <td className={`py-1.5 px-3 border-r border-slate-300 ${rowLabelClass}`}>
                        <div className="font-bold">{cmd.modele}</div>
                      </td>
                      <td
                        onClick={() => startEditFixed(cmd, 'qte_commande')}
                        className="py-1.5 px-2 text-right font-mono font-bold border-r border-slate-300 cursor-pointer hover:bg-amber-50"
                      >
                        {editingFixed?.cmdId === cmd.id && editingFixed.field === 'qte_commande' ? (
                          <input
                            type="text"
                            autoFocus
                            value={tempFixedVal}
                            onChange={(e) => setTempFixedVal(e.target.value)}
                            onBlur={() => commitEditFixed(cmd, orderNumber)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitEditFixed(cmd, orderNumber);
                              if (e.key === 'Escape') setEditingFixed(null);
                            }}
                            className="w-full text-right font-mono text-xs bg-amber-100 border border-indigo-600 rounded px-1 outline-none"
                          />
                        ) : (
                          cmd.qte_commande
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-center font-mono text-slate-500 border-r border-slate-300">
                        {cmd.unite || 'PCS'}
                      </td>
                      <td
                        onClick={() => startEditFixed(cmd, 'heure_pcs')}
                        className="py-1.5 px-2 text-right font-mono border-r border-slate-300 cursor-pointer hover:bg-amber-50"
                      >
                        {editingFixed?.cmdId === cmd.id && editingFixed.field === 'heure_pcs' ? (
                          <input
                            type="text"
                            autoFocus
                            value={tempFixedVal}
                            onChange={(e) => setTempFixedVal(e.target.value)}
                            onBlur={() => commitEditFixed(cmd, orderNumber)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitEditFixed(cmd, orderNumber);
                              if (e.key === 'Escape') setEditingFixed(null);
                            }}
                            className="w-full text-right font-mono text-xs bg-amber-100 border border-indigo-600 rounded px-1 outline-none"
                          />
                        ) : cmd.heure_pcs_tbc ? (
                          <span className="text-amber-700 font-bold">TBC</span>
                        ) : cmd.heure_pcs !== null ? (
                          Number(cmd.heure_pcs).toFixed(2)
                        ) : (
                          '-'
                        )}
                      </td>
                      <td
                        onClick={() => startEditFixed(cmd, 'qte_finie')}
                        className="py-1.5 px-2 text-right font-mono font-bold text-emerald-800 bg-emerald-50/50 border-r border-slate-300 cursor-pointer hover:bg-emerald-100"
                      >
                        {editingFixed?.cmdId === cmd.id && editingFixed.field === 'qte_finie' ? (
                          <input
                            type="text"
                            autoFocus
                            value={tempFixedVal}
                            onChange={(e) => setTempFixedVal(e.target.value)}
                            onBlur={() => commitEditFixed(cmd, orderNumber)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitEditFixed(cmd, orderNumber);
                              if (e.key === 'Escape') setEditingFixed(null);
                            }}
                            className="w-full text-right font-mono text-xs bg-emerald-100 border border-indigo-600 rounded px-1 outline-none"
                          />
                        ) : (
                          cmd.qte_finie
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold text-amber-900 bg-amber-50/50 border-r border-slate-300">
                        {cmd.resteAFaire}
                      </td>
                      <td
                        onClick={() => startEditFixed(cmd, 'nb_brodeuses_dispo')}
                        className="py-1.5 px-2 text-center font-mono font-bold text-indigo-950 bg-indigo-50/60 border-r border-slate-300 cursor-pointer hover:bg-indigo-100"
                      >
                        {editingFixed?.cmdId === cmd.id && editingFixed.field === 'nb_brodeuses_dispo' ? (
                          <input
                            type="text"
                            autoFocus
                            placeholder="Nb B"
                            value={tempFixedVal}
                            onChange={(e) => setTempFixedVal(e.target.value)}
                            onBlur={() => commitEditFixed(cmd, orderNumber)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitEditFixed(cmd, orderNumber);
                              if (e.key === 'Escape') setEditingFixed(null);
                            }}
                            className="w-full text-center font-mono text-xs bg-amber-100 border border-indigo-600 rounded px-0.5 outline-none font-bold"
                          />
                        ) : cmd.nb_brodeuses_dispo ? (
                          <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-[10px]">
                            {cmd.nb_brodeuses_dispo} B
                          </span>
                        ) : cmd.brodeusesActives !== null ? (
                          <span className="text-indigo-800">{cmd.brodeusesActives} B</span>
                        ) : (
                          <span className="text-[10px] text-indigo-500 hover:underline">+ Saisir B</span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-center font-mono font-bold border-r border-slate-300">
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                          {cmd.saCode || '-'}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-center font-mono font-bold border-r border-slate-300">
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-300">
                          {cmd.sbCode || '-'}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-300">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                pct >= 100
                                  ? 'bg-[#70AD47]'
                                  : cmd.isGlissement
                                  ? 'bg-[#2E75B6]'
                                  : 'bg-indigo-600'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] font-bold text-slate-700 w-8 text-right">
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onAutoDispatch(cmd.id, currentSemaineCode, 4)}
                            className="p-1 rounded bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white transition"
                            title="Étaler automatiquement sur la frise"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditCommandeModal(cmd)}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-700 text-slate-700 hover:text-white transition"
                            title="Modifier"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDuplicateCommande(cmd.id)}
                            className="p-1 rounded bg-slate-100 hover:bg-sky-600 text-slate-700 hover:text-white transition"
                            title="Dupliquer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteCommande(cmd.id)}
                            className="p-1 rounded bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white transition"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* =========================================================================
            MODES 1 & 3 : TABLEAU AVEC FRISE (PANORAMIQUE OU SYNTHÉTIQUE)
            - PANEL GAUCHE FIXE 100% OPAQUE (VOLET 1)
            - SÉPARATION MARQUÉE (BORDER ÉPAISSE + OMBRE)
            - CALENDRIER DES SEMAINES DÉFILANT À DROITE (VOLET 2)
           ========================================================================= */
        <div
          ref={tableContainerRef}
          className="bg-white border border-slate-400 rounded-lg shadow-sm overflow-auto max-h-[calc(100vh-145px)] relative select-none"
        >
          <table className="border-collapse text-[11px] font-sans w-max min-w-full table-fixed">
            {/* STRICT COLUMN WIDTH DEFINITIONS TO PREVENT ANY OVERLAP OR SHIFT */}
            <colgroup>
              {viewMode === 'compact_frise' ? (
                <>
                  <col style={{ width: '38px', minWidth: '38px', maxWidth: '38px' }} />
                  <col style={{ width: '160px', minWidth: '160px', maxWidth: '160px' }} />
                  <col style={{ width: '64px', minWidth: '64px', maxWidth: '64px' }} />
                </>
              ) : (
                <>
                  <col style={{ width: '38px', minWidth: '38px', maxWidth: '38px' }} />
                  <col style={{ width: '135px', minWidth: '135px', maxWidth: '135px' }} />
                  <col style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }} />
                  <col style={{ width: '70px', minWidth: '70px', maxWidth: '70px' }} />
                  <col style={{ width: '44px', minWidth: '44px', maxWidth: '44px' }} />
                  <col style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }} />
                  <col style={{ width: '56px', minWidth: '56px', maxWidth: '56px' }} />
                  <col style={{ width: '64px', minWidth: '64px', maxWidth: '64px' }} />
                  <col style={{ width: '66px', minWidth: '66px', maxWidth: '66px' }} />
                  <col style={{ width: '62px', minWidth: '62px', maxWidth: '62px' }} />
                  <col style={{ width: '62px', minWidth: '62px', maxWidth: '62px' }} />
                </>
              )}
              {visibleSemaines.map((s) => (
                <col
                  key={`col-${s.id}`}
                  style={{ width: '106px', minWidth: '106px', maxWidth: '106px' }}
                />
              ))}
            </colgroup>

            {/* =====================================================================
                EN-TÊTE DU TABLEAU AVEC DOUBLE-BANDEAU CLAIREMENT DÉFINI
               ===================================================================== */}
            <thead className="sticky top-0 z-40 shadow-sm">
              {/* LIGNE 1 : SÉPARATION MAJEURE DES DEUX VOLETS */}
              <tr className="border-b border-slate-700">
                <th
                  colSpan={viewMode === 'compact_frise' ? 3 : 11}
                  className="sticky left-0 z-50 bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider py-2 px-3 text-left border-r-4 border-slate-950 shadow-[4px_0_12px_rgba(0,0,0,0.22)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block" />
                      VOLET 1 : DOSSIER COMMANDES &amp; IDENTIFICATION {viewMode === 'compact_frise' ? '(COMPACT)' : '(11 COLONNES FIXES)'}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 font-normal">
                      PANNEAU GAUCHE FIXE
                    </span>
                  </div>
                </th>
                <th
                  colSpan={visibleSemaines.length}
                  className="bg-amber-600 text-white font-extrabold text-[11px] uppercase tracking-wider py-2 px-3 text-center"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-amber-200 font-normal">
                      PANNEAU DROIT DÉFILANT ➔
                    </span>
                    <span className="flex items-center gap-1.5 mx-auto">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-300 inline-block" />
                      VOLET 2 : FRISE CHRONOLOGIQUE ANNUELLE (S01 ➔ S52)
                    </span>
                    <span className="text-[10px] bg-amber-700 text-amber-100 font-bold px-2 py-0.5 rounded">
                      Semaine Active : {currentSemaineCode}
                    </span>
                  </div>
                </th>
              </tr>

              {/* LIGNE 2 : SEMAINE EN COURS & JAUGE DE CHARGE HEBDOMADAIRE */}
              <tr className="border-b border-slate-300">
                <td
                  colSpan={viewMode === 'compact_frise' ? 3 : 11}
                  className="sticky left-0 z-50 bg-slate-800 text-white border-r-4 border-slate-950 px-3 py-1.5 text-xs shadow-[4px_0_12px_rgba(0,0,0,0.22)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[11px] text-slate-300">Semaine en cours :</span>
                      <select
                        value={currentSemaineCode}
                        onChange={(e) => onSetCurrentSemaine(e.target.value)}
                        className="bg-[#FFFF00] text-slate-950 font-mono font-extrabold text-xs px-2 py-0.5 rounded border border-amber-500 cursor-pointer shadow-xs"
                        title="Changer la semaine de référence en cours"
                      >
                        {semaines.map((sem) => (
                          <option key={sem.code} value={sem.code}>
                            {formatWeekCaption(
                              sem.code,
                              sem.date_label || sem.date_debut,
                              isoWeekEnd(sem.date_debut),
                              sem.code === currentSemaineCode
                            )}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="hidden lg:flex items-center gap-2 text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-[#FFFF00] text-slate-950 font-bold border border-amber-400">Jaune En cours</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold border border-emerald-300">Vert Soldé</span>
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-900 font-bold border border-indigo-200">Bleu Planifié</span>
                    </div>
                  </div>
                </td>

                {/* Jauges de charge sur chaque semaine */}
                {visibleSemaines.map((s) => {
                  const ratioLoad =
                    s.effectifDispo > 0
                      ? Math.min(100, Math.round((s.totalBrodeuses / s.effectifDispo) * 100))
                      : 0;
                  const isOverloaded = s.totalBrodeuses > s.effectifDispo;
                  return (
                    <td
                      key={`r2-${s.id}`}
                      className={`border-r-2 border-slate-400 px-1.5 py-0.5 w-[106px] min-w-[106px] max-w-[106px] ${
                        s.isCourante ? 'bg-[#FFFF00]' : s.isPast ? 'bg-slate-100' : 'bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-600 mb-0.5">
                        <span>{s.isPast ? 'Passé' : s.isCourante ? 'Active' : 'Plan.'}</span>
                        <span
                          className={
                            isOverloaded
                              ? 'text-rose-700 font-extrabold'
                              : s.totalBrodeuses > 0
                              ? 'text-emerald-700 font-extrabold'
                              : 'text-slate-400'
                          }
                        >
                          {s.totalBrodeuses}/{s.effectifDispo}B
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            isOverloaded
                              ? 'bg-rose-600'
                              : s.totalBrodeuses > 0
                              ? 'bg-emerald-600'
                              : 'bg-transparent'
                          }`}
                          style={{ width: `${ratioLoad}%` }}
                        />
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* LIGNE 3 : DATES DE DÉBUT DE SEMAINE */}
              <tr className="border-b border-slate-300">
                <td
                  colSpan={viewMode === 'compact_frise' ? 3 : 11}
                  className="sticky left-0 z-50 bg-slate-100 border-r-4 border-slate-700 px-3 py-1 text-right text-[10px] font-bold text-slate-700 shadow-[4px_0_12px_rgba(0,0,0,0.22)]"
                >
                  DATE DÉBUT DE SEMAINE (FRISE) ➔
                </td>
                {visibleSemaines.map((s) => (
                  <td
                    key={`r3-${s.id}`}
                    className={`border-r-2 border-slate-400 px-1 py-1 text-center font-mono text-[11px] font-semibold w-[106px] min-w-[106px] max-w-[106px] ${
                      s.isCourante
                        ? 'bg-[#FFFF00] text-slate-950 font-bold'
                        : s.isPast
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-white text-slate-800'
                    }`}
                  >
                    {formatDay(s.date_label || s.date_debut)}
                  </td>
                ))}
              </tr>

              {/* LIGNE 4 : CODES SEMAINES S29 ➔ S51 */}
              <tr className="border-b border-slate-400">
                <td
                  colSpan={viewMode === 'compact_frise' ? 3 : 11}
                  className="sticky left-0 z-50 bg-slate-200 border-r-4 border-slate-700 px-3 py-1.5 text-right text-[10px] font-extrabold text-slate-800 shadow-[4px_0_12px_rgba(0,0,0,0.22)]"
                >
                  SEMAINES DU MACRO-PLANNING ➔
                </td>
                {visibleSemaines.map((s, idx) => (
                  <th
                    key={`r4-${s.id}`}
                    data-week-header={s.code}
                    onClick={() => onSetCurrentSemaine(s.code)}
                    title={`Cliquer pour définir ${s.code} comme semaine en cours`}
                    className={`border-r-2 border-slate-400 px-1 py-1 text-center font-mono text-xs font-extrabold cursor-pointer transition relative w-[106px] min-w-[106px] max-w-[106px] ${
                      s.isCourante
                        ? 'bg-[#FFFF00] text-slate-950'
                        : s.isPast
                        ? 'bg-slate-200 text-slate-700 hover:bg-amber-100'
                        : 'bg-slate-100 text-slate-900 hover:bg-amber-100'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>{s.code}</span>
                      {idx < visibleSemaines.length - 1 && (
                        <span className="text-slate-400 font-normal text-[10px]">➔</span>
                      )}
                    </div>
                    {(() => {
                      const saC = saCountByWeek.get(s.code.toUpperCase()) || 0;
                      const sbC = sbCountByWeek.get(s.code.toUpperCase()) || 0;
                      if (saC === 0 && sbC === 0) return null;
                      return (
                        <div className="flex items-center justify-center gap-1 mt-0.5 text-[8.5px] font-sans font-black">
                          {saC > 0 && (
                            <span
                              className="bg-[#ED7D31] text-white px-1 py-0.2 rounded shadow-2xs"
                              title={`${saC} commande(s) avec lancement Sa en ${s.code}`}
                            >
                              Sa:{saC}
                            </span>
                          )}
                          {sbC > 0 && (
                            <span
                              className="bg-[#C00000] text-white px-1 py-0.2 rounded shadow-2xs"
                              title={`${sbC} commande(s) avec limite client Sb en ${s.code}`}
                            >
                              Sb:{sbC}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </th>
                ))}
              </tr>

              {/* LIGNE 5 : COLONNES D'IDENTIFICATION & COLONNES DE SEMAINE */}
              <tr className="bg-slate-100 border-b-2 border-slate-600 text-[10px] font-bold text-slate-800">
                {viewMode === 'compact_frise' ? (
                  <>
                    <th className="sticky left-0 z-50 bg-slate-200 border-r border-slate-400 w-[38px] min-w-[38px] max-w-[38px] py-1.5 text-center font-mono">
                      N°
                    </th>
                    <th className="sticky left-[38px] z-50 bg-slate-100 border-r border-slate-300 w-[160px] min-w-[160px] max-w-[160px] px-2 py-1.5 text-left">
                      MODÈLE / CLIENT
                    </th>
                    <th className="sticky left-[198px] z-50 bg-slate-100 border-r-4 border-slate-700 w-[64px] min-w-[64px] max-w-[64px] px-1 py-1.5 text-center leading-tight shadow-[4px_0_12px_rgba(0,0,0,0.22)]">
                      RESTE
                      <br />À FAIRE
                    </th>
                  </>
                ) : (
                  <>
                    {/* Col 0 : N° (38px, left-0) */}
                    <th className="sticky left-0 z-50 bg-slate-200 border-r border-slate-400 w-[38px] min-w-[38px] max-w-[38px] py-1.5 text-center font-mono">
                      N°
                    </th>
                    {/* Col 1 : CLIENT (135px, left-[38px]) */}
                    <th className="sticky left-[38px] z-50 bg-slate-100 border-r border-slate-300 w-[135px] min-w-[135px] max-w-[135px] px-2 py-1.5 text-left">
                      CLIENT
                    </th>
                    {/* Col 2 : MODELE (200px, left-[173px]) */}
                    <th className="sticky left-[173px] z-50 bg-slate-100 border-r border-slate-300 w-[200px] min-w-[200px] max-w-[200px] px-2 py-1.5 text-left">
                      MODÈLE
                    </th>
                    {/* Col 3 : QTE COMMANDE (70px, left-[373px]) */}
                    <th className="sticky left-[373px] z-50 bg-slate-100 border-r border-slate-300 w-[70px] min-w-[70px] max-w-[70px] px-1 py-1.5 text-center leading-tight">
                      QTÉ EN
                      <br />
                      COMMANDE
                    </th>
                    {/* Col 4 : UNITE (44px, left-[443px]) */}
                    <th className="sticky left-[443px] z-50 bg-slate-100 border-r border-slate-300 w-[44px] min-w-[44px] max-w-[44px] px-1 py-1.5 text-center">
                      UNITÉ
                    </th>
                    {/* Col 5 : HEURE / PCS (60px, left-[487px]) */}
                    <th className="sticky left-[487px] z-50 bg-slate-100 border-r border-slate-300 w-[60px] min-w-[60px] max-w-[60px] px-1 py-1.5 text-center leading-tight">
                      HEURE /
                      <br />
                      PCS
                    </th>
                    {/* Col 6 : QTE FINIE (56px, left-[547px]) */}
                    <th className="sticky left-[547px] z-50 bg-slate-100 border-r border-slate-300 w-[56px] min-w-[56px] max-w-[56px] px-1 py-1.5 text-center leading-tight">
                      QTÉ
                      <br />
                      FINIE
                    </th>
                    {/* Col 7 : RESTE A FAIRE (64px, left-[603px]) */}
                    <th className="sticky left-[603px] z-50 bg-slate-100 border-r border-slate-300 w-[64px] min-w-[64px] max-w-[64px] px-1 py-1.5 text-center leading-tight">
                      RESTE
                      <br />À FAIRE
                    </th>
                    {/* Col 8 : BROD. DISPO (66px, left-[667px]) */}
                    <th
                      className="sticky left-[667px] z-50 bg-indigo-100 border-r border-indigo-300 w-[66px] min-w-[66px] max-w-[66px] px-1 py-1.5 text-center leading-tight text-indigo-950 font-extrabold"
                      title="Nombre de brodeuses disponibles pour traiter la commande"
                    >
                      BROD.
                      <br />
                      DISPO
                    </th>
                    {/* Col 9 : Sa LANCEMENT (62px, left-[733px]) */}
                    <th
                      className="sticky left-[733px] z-50 bg-[#FCE6D5] border-r border-[#ED7D31] w-[62px] min-w-[62px] max-w-[62px] px-1 py-1.5 text-center leading-tight text-[#C55A11] font-black"
                      title="Semaine de Lancement Sa (Orange Excel)"
                    >
                      Sa
                      <br />
                      LANCEM.
                    </th>
                    {/* Col 10 : Sb LIMITE (62px, left-[795px]) - BORDURE DROITE DU VOLET FIXE */}
                    <th
                      className="sticky left-[795px] z-50 bg-[#FFEAEA] border-r-4 border-slate-700 w-[62px] min-w-[62px] max-w-[62px] px-1 py-1.5 text-center leading-tight text-[#C00000] font-black shadow-[4px_0_12px_rgba(0,0,0,0.22)]"
                      title="Semaine Limite Livraison Client Sb (Rouge Excel)"
                    >
                      Sb
                      <br />
                      LIMITE
                    </th>
                  </>
                )}

                {/* En-têtes des semaines */}
                {visibleSemaines.map((s) => (
                  <th
                    key={`r5-compact-${s.id}`}
                    className={`border-r-2 border-slate-400 w-[106px] min-w-[106px] max-w-[106px] px-1 py-1.5 text-center leading-tight ${
                      s.isCourante
                        ? 'bg-[#FFFF00] text-slate-950 font-extrabold'
                        : 'bg-[#DAE3F3]/70 text-slate-800'
                    }`}
                  >
                    Frise {s.code}
                    <br />
                    <span className="font-normal text-[9px] text-slate-600">
                      Pièces · Brod. · Heures
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            {/* =====================================================================
                CORPS DU TABLEAU : COMMANDES (AVEC CELLULES FIXES 100% OPAQUES)
               ===================================================================== */}
            <tbody className="divide-y divide-slate-200">
              {filteredCommandes.map((cmd, index) => {
                const orderNumber = index + 1;
                const isBlankTbc =
                  cmd.heure_pcs_tbc === 1 && cmd.totalProgramme === 0 && (cmd.qte_finie || 0) === 0;
                const rowLabelClass = getRowLabelStyle(cmd);

                // Calcul du maximum de pièces sur une semaine pour la commande
                let maxWeeklyPiecesForCmd = 1;
                visibleSemaines.forEach((s) => {
                  const p = planningMap.get(`${cmd.id}_${s.id}`);
                  if (p && p.nb_pieces > maxWeeklyPiecesForCmd) {
                    maxWeeklyPiecesForCmd = p.nb_pieces;
                  }
                });

                return (
                  <tr key={cmd.id} className="hover:bg-indigo-50/30 transition-colors group">
                    {/* MODE COMPACT */}
                    {viewMode === 'compact_frise' ? (
                      <>
                        <td
                          className={`sticky left-0 z-30 border-r border-slate-400 text-center font-mono text-[11px] font-bold py-1 w-[38px] min-w-[38px] max-w-[38px] ${
                            cmd.isCompletedOnTime
                              ? 'bg-[#70AD47] text-slate-950'
                              : 'bg-white text-slate-700'
                          }`}
                        >
                          {orderNumber}
                        </td>
                        <td
                          className={`sticky left-[38px] z-30 border-r border-slate-300 px-2 py-1 truncate w-[160px] min-w-[160px] max-w-[160px] ${rowLabelClass}`}
                        >
                          <div className="truncate font-bold text-xs">{cmd.modele}</div>
                          <div className="text-[10px] text-slate-500 truncate">{cmd.client}</div>
                        </td>
                        <td className="sticky left-[198px] z-30 border-r-4 border-slate-700 px-1 py-1 text-right font-mono font-bold w-[64px] min-w-[64px] max-w-[64px] bg-white text-amber-900 shadow-[4px_0_12px_rgba(0,0,0,0.22)]">
                          {cmd.resteAFaire}
                        </td>
                      </>
                    ) : (
                      /* MODE PANORAMIQUE (12 COLONNES FIXES COMPLÈTES) */
                      <>
                        {/* 0. N° Commande */}
                        <td
                          className={`sticky left-0 z-30 border-r border-slate-400 text-center font-mono text-[11px] font-bold py-1 w-[38px] min-w-[38px] max-w-[38px] ${
                            cmd.isCompletedOnTime
                              ? 'bg-[#70AD47] text-slate-950 font-extrabold'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {orderNumber}
                        </td>

                        {/* 1. CLIENT */}
                        <td
                          onClick={() => {
                            if (activeBrush !== null) {
                              onSetRowColor(cmd.id, activeBrush);
                            }
                          }}
                          className={`sticky left-[38px] z-30 border-r border-slate-300 px-2 py-1 truncate w-[135px] min-w-[135px] max-w-[135px] ${rowLabelClass} ${
                            activeBrush !== null ? 'cursor-pointer hover:opacity-80' : ''
                          }`}
                          title={`Commande N°${orderNumber} — ${cmd.client}${
                            cmd.saCode ? ` | Lancement Sa: ${cmd.saCode}` : ''
                          }${cmd.sbCode ? ` | Limite Sb: ${cmd.sbCode}` : ''}${
                            cmd.isGlissement
                              ? ` | GLISSEMENT ➔ Nouvelle limite Sb+4: ${cmd.effectiveDeadlineCode}`
                              : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate">{cmd.client}</span>
                          </div>
                        </td>

                        {/* 2. MODELE + Actions */}
                        <td
                          onClick={() => {
                            if (activeBrush !== null) {
                              onSetRowColor(cmd.id, activeBrush);
                            }
                          }}
                          className={`sticky left-[173px] z-30 border-r border-slate-300 px-2 py-1 w-[200px] min-w-[200px] max-w-[200px] ${rowLabelClass} ${
                            activeBrush !== null ? 'cursor-pointer hover:opacity-80' : ''
                          }`}
                          title={`${cmd.modele}`}
                        >
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="truncate font-semibold">{cmd.modele}</span>
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAutoDispatch(cmd.id, currentSemaineCode, 4);
                                    onShowToast(
                                      `Commande N°${orderNumber} (${cmd.modele}) : Reste à faire (${cmd.resteAFaire} pcs) étalé.`
                                    );
                                  }}
                                  className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-indigo-600/15 hover:bg-indigo-600 text-indigo-900 hover:text-white border border-indigo-400/40 text-[9px] font-bold transition cursor-pointer"
                                  title={`✨ Étaler automatiquement le reste à faire (${cmd.resteAFaire} pcs) sur la frise`}
                                >
                                  <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5 text-[8.5px] flex-wrap">
                              {cmd.sbCode ? (
                                <span
                                  className="bg-slate-900 text-amber-300 px-1.5 py-0.2 rounded font-mono font-bold tracking-tight"
                                  title={`Date Limite Client (Sb) : Semaine ${cmd.sbCode} ${cmd.date_limite_client ? `(${formatFullDate(cmd.date_limite_client)})` : ''}`}
                                >
                                  Sb: {cmd.sbCode}
                                </span>
                              ) : null}
                              {cmd.isGlissement ? (
                                <span
                                  className="bg-red-800 text-white px-1 py-0.2 rounded font-black tracking-tight flex items-center gap-0.5"
                                  title={`Glissement vs Planning ! Dépassement de la date limite client Sb (${cmd.sbCode || 'Sb'}). Nouvelle limite projetée : ${cmd.effectiveDeadlineCode || 'Sb+4'}`}
                                >
                                  <span>⚠️ GLISSEMENT</span>
                                  {cmd.effectiveDeadlineCode ? (
                                    <span className="text-amber-200 font-mono">➔ {cmd.effectiveDeadlineCode}</span>
                                  ) : null}
                                </span>
                              ) : null}
                              {cmd.saCode ? (
                                <span
                                  className="bg-slate-200 text-slate-700 px-1 py-0.2 rounded font-mono"
                                  title={`Semaine de lancement (Sa) : Semaine ${cmd.saCode}`}
                                >
                                  Sa: {cmd.saCode}
                                </span>
                              ) : null}
                            </div>
                          </div>
                              <div className="hidden group-hover:flex items-center gap-0.5 bg-slate-900 text-white rounded px-1 py-0.5 shadow-sm">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onShiftOrderWeeks(cmd.id, -1);
                                    onShowToast(`Frise "${cmd.modele}" décalée de -1 semaine.`);
                                  }}
                                  className="p-0.5 hover:text-amber-300 cursor-pointer"
                                  title="Décaler de -1 semaine vers la gauche"
                                >
                                  <ChevronLeft className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onShiftOrderWeeks(cmd.id, 1);
                                    onShowToast(`Frise "${cmd.modele}" décalée de +1 semaine.`);
                                  }}
                                  className="p-0.5 hover:text-amber-300 cursor-pointer"
                                  title="Décaler de +1 semaine vers la droite"
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditCommandeModal(cmd);
                                  }}
                                  className="p-0.5 hover:text-indigo-300 cursor-pointer"
                                  title="Modifier la commande"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDuplicateCommande(cmd.id);
                                    onShowToast(`Commande N°${orderNumber} dupliquée.`);
                                  }}
                                  className="p-0.5 hover:text-sky-300 cursor-pointer"
                                  title="Dupliquer"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteCommande(cmd.id);
                                    onShowToast(`Commande N°${orderNumber} supprimée.`);
                                  }}
                                  className="p-0.5 hover:text-rose-400 cursor-pointer"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                          </td>

                        {/* 3. QTE EN COMMANDE */}
                        <td
                          onClick={() => startEditFixed(cmd, 'qte_commande')}
                          className={`sticky left-[373px] z-30 border-r border-slate-300 px-1.5 py-1 text-right font-mono tabular-nums font-semibold cursor-pointer hover:bg-indigo-50 w-[70px] min-w-[70px] max-w-[70px] ${
                            cmd.isCompletedOnTime
                              ? 'bg-[#70AD47] text-slate-950 font-bold'
                              : 'bg-white text-slate-900'
                          }`}
                          title="Cliquer pour modifier la quantité commandée"
                        >
                          {editingFixed?.cmdId === cmd.id && editingFixed.field === 'qte_commande' ? (
                            <input
                              type="text"
                              autoFocus
                              value={tempFixedVal}
                              onChange={(e) => setTempFixedVal(e.target.value)}
                              onBlur={() => commitEditFixed(cmd, orderNumber)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitEditFixed(cmd, orderNumber);
                                if (e.key === 'Escape') setEditingFixed(null);
                              }}
                              className="w-full text-right font-mono text-xs bg-amber-50 border border-indigo-600 rounded px-1 outline-none"
                            />
                          ) : (
                            cmd.qte_commande
                          )}
                        </td>

                        {/* 4. UNITE */}
                        <td
                          className={`sticky left-[443px] z-30 border-r border-slate-300 px-1 py-1 text-center font-mono text-[10px] w-[44px] min-w-[44px] max-w-[44px] ${
                            cmd.isCompletedOnTime
                              ? 'bg-[#70AD47] text-slate-950 font-bold'
                              : 'bg-white text-slate-600'
                          }`}
                        >
                          {cmd.unite || 'PCS'}
                        </td>

                        {/* 5. HEURE / PCS */}
                        <td
                          onClick={() => startEditFixed(cmd, 'heure_pcs')}
                          className={`sticky left-[487px] z-30 border-r border-slate-300 px-1.5 py-1 text-right font-mono tabular-nums cursor-pointer hover:bg-indigo-50 w-[60px] min-w-[60px] max-w-[60px] ${
                            cmd.isCompletedOnTime
                              ? 'bg-[#70AD47] text-slate-950 font-bold'
                              : cmd.heure_pcs_tbc
                              ? 'bg-white text-amber-700 font-bold text-center'
                              : 'bg-white text-slate-800'
                          }`}
                          title="Cliquer pour modifier le temps unitaire (ou taper TBC)"
                        >
                          {editingFixed?.cmdId === cmd.id && editingFixed.field === 'heure_pcs' ? (
                            <input
                              type="text"
                              autoFocus
                              value={tempFixedVal}
                              onChange={(e) => setTempFixedVal(e.target.value)}
                              onBlur={() => commitEditFixed(cmd, orderNumber)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitEditFixed(cmd, orderNumber);
                                if (e.key === 'Escape') setEditingFixed(null);
                              }}
                              className="w-full text-right font-mono text-xs bg-amber-50 border border-indigo-600 rounded px-1 outline-none"
                            />
                          ) : cmd.heure_pcs_tbc ? (
                            'TBC'
                          ) : cmd.heure_pcs !== null ? (
                            Number(cmd.heure_pcs).toFixed(2)
                          ) : (
                            ''
                          )}
                        </td>

                        {/* 6. QTE FINIE */}
                        <td
                          onClick={() => startEditFixed(cmd, 'qte_finie')}
                          className={`sticky left-[547px] z-30 border-r border-slate-300 px-1.5 py-1 text-right font-mono tabular-nums cursor-pointer hover:bg-indigo-50 w-[56px] min-w-[56px] max-w-[56px] ${
                            cmd.isCompletedOnTime
                              ? 'bg-[#70AD47] text-slate-950 font-extrabold'
                              : 'bg-white text-emerald-800 font-bold'
                          }`}
                          title="Quantité finie"
                        >
                          {editingFixed?.cmdId === cmd.id && editingFixed.field === 'qte_finie' ? (
                            <input
                              type="text"
                              autoFocus
                              value={tempFixedVal}
                              onChange={(e) => setTempFixedVal(e.target.value)}
                              onBlur={() => commitEditFixed(cmd, orderNumber)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitEditFixed(cmd, orderNumber);
                                if (e.key === 'Escape') setEditingFixed(null);
                              }}
                              className="w-full text-right font-mono text-xs bg-amber-50 border border-indigo-600 rounded px-1 outline-none"
                            />
                          ) : isBlankTbc ? (
                            ''
                          ) : (
                            cmd.qte_finie
                          )}
                        </td>

                        {/* 7. RESTE A FAIRE */}
                        <td
                          className={`sticky left-[603px] z-30 border-r border-slate-300 px-1.5 py-1 text-right font-mono tabular-nums font-bold w-[64px] min-w-[64px] max-w-[64px] ${
                            cmd.isCompletedOnTime
                              ? 'bg-[#70AD47] text-slate-950 font-extrabold'
                              : 'bg-slate-50 text-slate-900'
                          }`}
                          title={`Reste à faire = ${cmd.qte_commande} - ${cmd.qte_finie} = ${cmd.resteAFaire}`}
                        >
                          {isBlankTbc ? '' : cmd.resteAFaire}
                        </td>

                        {/* 8. BROD. DISPO */}
                        <td
                          onClick={() => startEditFixed(cmd, 'nb_brodeuses_dispo')}
                          className={`sticky left-[667px] z-30 border-r border-indigo-200 px-1.5 py-1 text-center font-mono tabular-nums cursor-pointer hover:bg-indigo-100 transition w-[66px] min-w-[66px] max-w-[66px] ${
                            cmd.nb_brodeuses_dispo
                              ? 'bg-indigo-100 text-indigo-950 font-extrabold'
                              : cmd.brodeusesActives !== null
                              ? 'bg-indigo-50 text-indigo-900 font-semibold'
                              : 'bg-white text-slate-400'
                          }`}
                          title="Cliquer pour introduire le nombre de brodeuses disponibles"
                        >
                          {editingFixed?.cmdId === cmd.id &&
                          editingFixed.field === 'nb_brodeuses_dispo' ? (
                            <input
                              type="text"
                              autoFocus
                              placeholder="Nb B"
                              value={tempFixedVal}
                              onChange={(e) => setTempFixedVal(e.target.value)}
                              onBlur={() => commitEditFixed(cmd, orderNumber)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitEditFixed(cmd, orderNumber);
                                if (e.key === 'Escape') setEditingFixed(null);
                              }}
                              className="w-full text-center font-mono text-xs bg-amber-50 border border-indigo-600 rounded px-0.5 outline-none text-slate-950 font-bold"
                            />
                          ) : cmd.nb_brodeuses_dispo ? (
                            <span>{cmd.nb_brodeuses_dispo} B</span>
                          ) : cmd.brodeusesActives !== null ? (
                            <span>{cmd.brodeusesActives} B</span>
                          ) : (
                            <span className="text-[9px] text-indigo-500 hover:underline">+ Brod.</span>
                          )}
                        </td>

                        {/* 9. Sa LANCEMENT (Orange Excel) */}
                        <td
                          className="sticky left-[733px] z-30 border-r border-orange-200 px-1 py-1 text-center font-mono text-[10.5px] font-bold w-[62px] min-w-[62px] max-w-[62px] bg-[#FCE6D5] text-[#C55A11]"
                        >
                          {editingFixed?.cmdId === cmd.id && editingFixed.field === 'semaine_lancement' ? (
                            <select
                              autoFocus
                              value={cmd.saCode || ''}
                              onChange={(e) => {
                                const val = e.target.value || null;
                                onUpdateCommande(cmd.id, { semaine_lancement: val });
                                if (val) scrollToWeek(val);
                                setEditingFixed(null);
                                onShowToast(
                                  val
                                    ? `Sa Lancement définie sur ${val} et repérée sur la frise.`
                                    : 'Sa Lancement effacée.'
                                );
                              }}
                              onBlur={() => setEditingFixed(null)}
                              className="w-full text-center font-mono text-[10px] font-bold bg-white border border-[#ED7D31] rounded p-0 text-[#C55A11] focus:ring-1 focus:ring-orange-500"
                            >
                              <option value="">—</option>
                              {semaines.map((s) => (
                                <option key={`sa_sel_${s.code}`} value={s.code}>
                                  {s.code} ({formatDay(s.date_label || s.date_debut)})
                                </option>
                              ))}
                            </select>
                          ) : cmd.saCode ? (
                            <div className="flex items-center justify-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  if (cmd.saCode) {
                                    scrollToWeek(cmd.saCode);
                                    onShowToast(
                                      `Frise calée sur la semaine de lancement Sa : ${cmd.saCode} (${cmd.client} - ${cmd.modele})`
                                    );
                                  }
                                }}
                                className="px-1.5 py-0.5 rounded bg-[#ED7D31] hover:bg-[#C55A11] text-white text-[9.5px] font-black shadow-2xs cursor-pointer flex items-center justify-center gap-0.5 transition-transform active:scale-95"
                                title={`Cliquer pour faire défiler la frise vers Sa (${cmd.saCode})`}
                              >
                                <span>{cmd.saCode}</span>
                                <ArrowRight className="w-2.5 h-2.5 opacity-70" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditFixed(cmd, 'semaine_lancement');
                                }}
                                className="text-[#C55A11] hover:text-[#8C3B00] text-[9px] p-0.5 hover:bg-orange-100 rounded cursor-pointer"
                                title="Modifier la semaine Sa"
                              >
                                ✎
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEditFixed(cmd, 'semaine_lancement')}
                              className="text-slate-400 text-[10px] hover:text-[#C55A11] hover:underline cursor-pointer"
                              title="Définir la semaine de lancement Sa"
                            >
                              + Sa
                            </button>
                          )}
                        </td>

                        {/* 10. Sb LIMITE CLIENT (Rouge Excel) - BORDURE DROITE DU VOLET FIXE */}
                        <td
                          className="sticky left-[795px] z-30 border-r-4 border-slate-700 px-1 py-1 text-center font-mono text-[10.5px] font-bold w-[62px] min-w-[62px] max-w-[62px] bg-[#FFEAEA] text-[#C00000] shadow-[4px_0_12px_rgba(0,0,0,0.22)]"
                        >
                          {editingFixed?.cmdId === cmd.id && editingFixed.field === 'semaine_limite_client' ? (
                            <select
                              autoFocus
                              value={cmd.sbCode || ''}
                              onChange={(e) => {
                                const val = e.target.value || null;
                                onUpdateCommande(cmd.id, { semaine_limite_client: val });
                                if (val) scrollToWeek(val);
                                setEditingFixed(null);
                                onShowToast(
                                  val
                                    ? `Sb Limite Client définie sur ${val} et repérée sur la frise.`
                                    : 'Sb Limite Client effacée.'
                                );
                              }}
                              onBlur={() => setEditingFixed(null)}
                              className="w-full text-center font-mono text-[10px] font-bold bg-white border border-[#C00000] rounded p-0 text-[#C00000] focus:ring-1 focus:ring-red-500"
                            >
                              <option value="">—</option>
                              {semaines.map((s) => (
                                <option key={`sb_sel_${s.code}`} value={s.code}>
                                  {s.code} ({formatDay(s.date_label || s.date_debut)})
                                </option>
                              ))}
                            </select>
                          ) : cmd.sbCode ? (
                            <div className="flex items-center justify-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  if (cmd.sbCode) {
                                    scrollToWeek(cmd.sbCode);
                                    onShowToast(
                                      `Frise calée sur la date limite client Sb : ${cmd.sbCode} (${cmd.client} - ${cmd.modele})`
                                    );
                                  }
                                }}
                                className="px-1.5 py-0.5 rounded bg-[#C00000] hover:bg-[#900000] text-white text-[9.5px] font-black shadow-2xs cursor-pointer flex items-center justify-center gap-0.5 transition-transform active:scale-95"
                                title={`Cliquer pour faire défiler la frise vers Sb (${cmd.sbCode})`}
                              >
                                <span>{cmd.sbCode}</span>
                                <ArrowRight className="w-2.5 h-2.5 opacity-70" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditFixed(cmd, 'semaine_limite_client');
                                }}
                                className="text-[#C00000] hover:text-[#800000] text-[9px] p-0.5 hover:bg-rose-100 rounded cursor-pointer"
                                title="Modifier la semaine Sb"
                              >
                                ✎
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEditFixed(cmd, 'semaine_limite_client')}
                              className="text-slate-400 text-[10px] hover:text-[#C00000] hover:underline cursor-pointer"
                              title="Définir la semaine limite client Sb"
                            >
                              + Sb
                            </button>
                          )}
                        </td>
                      </>
                    )}

                    {/* ===============================================================
                        CELLULES DES SEMAINES DE LA FRISE CHRONOLOGIQUE
                       =============================================================== */}
                    {visibleSemaines.map((sem) => {
                      const weekIdx = sem.ordre;
                      const cell = planningMap.get(`${cmd.id}_${sem.id}`);
                      const pieces = cell?.nb_pieces || 0;
                      const hasPieces = pieces > 0;
                      const isCurrentWeek = sem.code === currentSemaineCode;

                      const {
                        effectiveStatut,
                        isLaunchWeek,
                        isInitialDeadlineWeek,
                        isGlissementWindow,
                        isNewGlissementDeadline,
                        isCompletedGreenSpan,
                      } = resolveEffectiveWeekCellState(cmd, weekIdx, cell, sem.code);

                      const heures = nbHeuresExact(pieces, cmd.heure_pcs, cmd.heure_pcs_tbc);
                      const brodeusesExact = nbBrodeusesExact(heures, cell?.manual_brodeuses);
                      const brodeusesRounded =
                        brodeusesExact !== null ? Math.round(brodeusesExact * 10) / 10 : null;

                      // Style de fond de la cellule
                      let bgStyle = 'bg-white text-slate-400';
                      if (effectiveStatut === 'termine' || cmd.isCompletedOnTime) {
                        bgStyle = 'bg-emerald-100 text-emerald-950 font-bold';
                      } else if (effectiveStatut === 'sst') {
                        bgStyle = 'bg-slate-200 text-slate-900 font-semibold';
                      } else if (isCurrentWeek) {
                        bgStyle = 'bg-[#FFFF00] text-slate-950 font-bold ring-1 ring-amber-500';
                      } else if (isLaunchWeek && isInitialDeadlineWeek) {
                        bgStyle =
                          'bg-gradient-to-r from-[#FCE6D5] to-[#FFEAEA] text-slate-950 font-black ring-2 ring-red-600';
                      } else if (isLaunchWeek) {
                        bgStyle = hasPieces
                          ? 'bg-[#FCE6D5] text-[#C55A11] font-black ring-2 ring-[#ED7D31]'
                          : 'bg-[#FFF3E8] text-[#C55A11] font-bold border border-[#ED7D31]/50';
                      } else if (isInitialDeadlineWeek) {
                        bgStyle = hasPieces
                          ? 'bg-[#FFEAEA] text-[#C00000] font-black ring-2 ring-[#C00000]'
                          : 'bg-[#FFF0F0] text-[#C00000] font-bold border border-[#C00000]/50';
                      } else if (isGlissementWindow) {
                        bgStyle = hasPieces
                          ? 'bg-amber-100/90 text-slate-950 font-bold border-l-2 border-r-2 border-amber-600'
                          : 'bg-amber-50/70 text-amber-900 font-medium';
                      } else if (hasPieces) {
                        bgStyle = 'bg-indigo-50/70 text-slate-950 font-bold';
                      }

                      // Bordure continue colorée en haut de la case
                      let borderTopClass = 'border-t border-slate-200';
                      if (cmd.isCompletedOnTime) {
                        borderTopClass = 'border-t-2 border-emerald-500';
                      } else if (isInitialDeadlineWeek) {
                        borderTopClass = 'border-t-2 border-[#C00000]';
                      } else if (isLaunchWeek) {
                        borderTopClass = 'border-t-2 border-[#ED7D31]';
                      } else if (isGlissementWindow) {
                        borderTopClass = 'border-t-2 border-amber-600';
                      }

                      const isEditing =
                        editingCell?.cmdId === cmd.id && editingCell.semId === sem.id;
                      const barPct =
                        maxWeeklyPiecesForCmd > 0
                          ? Math.min(100, Math.round((pieces / maxWeeklyPiecesForCmd) * 100))
                          : 0;

                      return (
                        <td
                          key={sem.id}
                          onClick={() => {
                            if (activeBrush !== null) {
                              onSetStatut(cmd.id, sem.id, activeBrush);
                            } else {
                              startEditWeekCell(cmd, sem.id, pieces, brodeusesExact, 'pieces');
                            }
                          }}
                          className={`border-r-2 border-slate-400 px-1 py-1 text-center align-middle relative transition-colors cursor-pointer w-[106px] min-w-[106px] max-w-[106px] ${borderTopClass} ${bgStyle} ${
                            activeBrush !== null ? 'hover:ring-2 hover:ring-amber-500' : ''
                          }`}
                          title={`Semaine ${sem.code} (${formatDay(sem.date_label || sem.code)}) · ${pieces} pcs | ${
                            brodeusesRounded !== null ? brodeusesRounded + ' B' : ''
                          } | ${heures !== null ? formatExcelNumber(heures) + ' h' : ''}${
                            isLaunchWeek ? ` | Semaine de Lancement (Sa: ${sem.code} · ${formatDay(sem.date_label || sem.code)})` : ''
                          }${
                            isInitialDeadlineWeek ? ` | Date Limite Client (Sb: ${sem.code} · ${formatDay(sem.date_label || sem.code)})` : ''
                          }${isGlissementWindow ? ` | GLISSEMENT vs Planning (Sb+${weekIdx - cmd.sbIdx})` : ''}`}
                        >
                          {/* Badges de repères chronologiques */}
                          {isLaunchWeek && (
                            <span
                              className="absolute -top-1.5 -left-1 z-10 bg-[#ED7D31] text-white text-[7.5px] font-black px-1 rounded shadow-xs border border-orange-600"
                              title={`Semaine de Lancement Sa (${sem.code} · ${formatDay(sem.date_label || sem.code)})`}
                            >
                              Sa 🚀
                            </span>
                          )}
                          {isInitialDeadlineWeek && (
                            <span
                              className="absolute -top-1.5 -right-1 z-10 bg-[#C00000] text-white text-[7.5px] font-black px-1 rounded shadow-xs border border-rose-300"
                              title={`Date Limite Client Initiale Sb (${sem.code} · ${formatDay(sem.date_label || sem.code)})`}
                            >
                              Sb ⚑
                            </span>
                          )}
                          {isNewGlissementDeadline && (
                            <span
                              className="absolute -top-1.5 -right-1 z-10 bg-red-700 text-white text-[7.5px] font-black px-1 rounded shadow-xs"
                              title={`Nouvelle limite client après glissement (Sb+4: ${sem.code})`}
                            >
                              Sb+4 ⚠️
                            </span>
                          )}
                          {isEditing ? (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="flex flex-col gap-0.5 bg-white text-slate-950 p-1 rounded border border-indigo-600 shadow-md z-30 relative"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[9px] font-bold text-slate-600">Pcs:</span>
                                <input
                                  type="text"
                                  autoFocus={editingCell?.focusField === 'pieces'}
                                  value={tempValPieces}
                                  onChange={(e) => handleTempPiecesChange(e.target.value, cmd)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') commitEditWeekCell(cmd);
                                    if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                  placeholder="0"
                                  className="w-12 text-right font-mono text-[11px] font-bold bg-slate-50 border border-slate-300 rounded px-1 py-0 outline-none focus:border-indigo-600"
                                />
                              </div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[9px] font-bold text-indigo-700">Brod:</span>
                                <input
                                  type="text"
                                  autoFocus={editingCell?.focusField === 'brodeuses'}
                                  value={tempValBrod}
                                  onChange={(e) => handleTempBrodChange(e.target.value, cmd)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') commitEditWeekCell(cmd);
                                    if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                  placeholder="Nb B"
                                  className="w-12 text-right font-mono text-[11px] font-bold bg-indigo-50 border border-indigo-300 rounded px-1 py-0 outline-none focus:border-indigo-600 text-indigo-950"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => commitEditWeekCell(cmd)}
                                className="mt-0.5 w-full bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-bold py-0.5 rounded cursor-pointer"
                              >
                                Valider ↵
                              </button>
                            </div>
                          ) : hasPieces ? (
                            <div className="flex flex-col">
                              {/* Barre de frise Gantt horizontale */}
                              <div className="w-full h-4 bg-black/10 rounded-xs overflow-hidden relative flex items-center justify-between px-1">
                                <div
                                  className={`absolute inset-y-0 left-0 ${
                                    effectiveStatut === 'termine' || cmd.isCompletedOnTime
                                      ? 'bg-emerald-600/30'
                                      : effectiveStatut === 'sst'
                                      ? 'bg-slate-600/30'
                                      : sem.isCourante
                                      ? 'bg-amber-500/50'
                                      : sem.isPast
                                      ? 'bg-slate-400/40'
                                      : 'bg-indigo-600/25'
                                  }`}
                                  style={{ width: `${barPct}%` }}
                                />
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditWeekCell(
                                      cmd,
                                      sem.id,
                                      pieces,
                                      brodeusesExact,
                                      'pieces'
                                    );
                                  }}
                                  className="relative z-10 font-mono font-extrabold text-[11px] hover:underline"
                                  title="Cliquer pour modifier les pièces"
                                >
                                  {pieces}p
                                </span>
                                {brodeusesRounded !== null && (
                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEditWeekCell(
                                        cmd,
                                        sem.id,
                                        pieces,
                                        brodeusesExact,
                                        'brodeuses'
                                      );
                                    }}
                                    className="relative z-10 font-mono text-[9px] opacity-95 hover:underline px-0.5 rounded bg-black/10"
                                    title="Cliquer pour modifier les brodeuses"
                                  >
                                    {brodeusesRounded}B
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between text-[8.5px] font-mono leading-none mt-0.5">
                                <span className="font-bold uppercase tracking-tighter">
                                  {effectiveStatut === 'sst'
                                    ? 'SST'
                                    : effectiveStatut === 'termine' || cmd.isCompletedOnTime
                                    ? '✓ FINI'
                                    : isGlissementWindow
                                    ? `GLISS ${cmd.sbIdx >= 0 ? `+${weekIdx - cmd.sbIdx}s` : ''}`
                                    : isLaunchWeek && isInitialDeadlineWeek
                                    ? 'Sa/Sb 🚀⚑'
                                    : isLaunchWeek
                                    ? 'Sa 🚀'
                                    : isInitialDeadlineWeek
                                    ? 'Sb ⚑'
                                    : ''}
                                </span>
                                {heures !== null && (
                                  <span className="opacity-85">{formatExcelNumber(heures)}h</span>
                                )}
                              </div>
                            </div>
                          ) : effectiveStatut === 'sst' ? (
                            <div className="w-full h-4 flex items-center justify-center font-mono font-bold text-[9px] text-slate-700">
                              SST
                            </div>
                          ) : effectiveStatut === 'termine' ? (
                            <div className="w-full h-4 flex items-center justify-center font-mono font-bold text-[9px] text-emerald-800">
                              ✓ FINI
                            </div>
                          ) : isLaunchWeek && isInitialDeadlineWeek ? (
                            <div className="w-full py-0.5 flex flex-col items-center justify-center font-mono font-black text-[7px] bg-white/95 rounded shadow-2xs border border-red-500 leading-tight">
                              <span className="text-[#C55A11]">Sa 🚀 ({formatDay(sem.date_label || sem.code)})</span>
                              <span className="text-[#C00000]">Sb ⚑ ({formatDay(sem.date_label || sem.code)})</span>
                            </div>
                          ) : isLaunchWeek ? (
                            <div className="w-full py-0.5 flex flex-col items-center justify-center font-mono font-black text-[7.5px] bg-[#FCE6D5] text-[#C55A11] rounded shadow-2xs border border-[#ED7D31] leading-tight">
                              <span>Sa 🚀 LANCEM.</span>
                              <span className="text-[7px] font-semibold text-slate-700">{formatDay(sem.date_label || sem.code)}</span>
                            </div>
                          ) : isInitialDeadlineWeek ? (
                            <div className="w-full py-0.5 flex flex-col items-center justify-center font-mono font-black text-[7.5px] bg-[#FFEAEA] text-[#C00000] rounded shadow-2xs border border-[#C00000] leading-tight">
                              <span>Sb ⚑ LIMITE</span>
                              <span className="text-[7px] font-semibold text-slate-700">{formatDay(sem.date_label || sem.code)}</span>
                            </div>
                          ) : isGlissementWindow ? (
                            <div className="w-full h-4 flex items-center justify-center font-mono font-bold text-[7.5px] bg-amber-100 text-amber-950 rounded border border-dashed border-amber-400">
                              Gliss {cmd.sbIdx >= 0 ? `+${weekIdx - cmd.sbIdx}s` : ''}
                            </div>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* =====================================================================
                  LIGNE VIDE DE SÉPARATION
                 ===================================================================== */}
              <tr className="bg-slate-100 h-5 border-t-2 border-slate-400">
                <td
                  colSpan={viewMode === 'compact_frise' ? 3 : 11}
                  className="sticky left-0 z-30 bg-slate-100 border-r-4 border-slate-700 shadow-[4px_0_12px_rgba(0,0,0,0.22)]"
                />
                {visibleSemaines.map((s) => (
                  <td key={`r50-${s.id}`} className="border-r-2 border-slate-300 bg-slate-100" />
                ))}
              </tr>

              {/* =====================================================================
                  TOTAUX BESOIN PAR SEMAINE (SUM Brodeuses, SUM Heures, SUM Pièces)
                 ===================================================================== */}
              <tr className="bg-slate-200 font-mono font-bold text-slate-950 border-t-2 border-slate-500">
                <td
                  colSpan={viewMode === 'compact_frise' ? 3 : 11}
                  className="sticky left-0 z-30 bg-slate-200 border-r-4 border-slate-700 px-3 py-1.5 text-right font-sans text-xs font-extrabold text-slate-900 shadow-[4px_0_12px_rgba(0,0,0,0.22)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-600 font-mono">
                      SYNTHÈSE ATELIER ({filteredCommandes.length} CMDS)
                    </span>
                    <span>TOTAL BESOIN HEBDOMADAIRE ➔</span>
                  </div>
                </td>
                {visibleSemaines.map((s) => (
                  <td
                    key={`r51-compact-${s.id}`}
                    className={`border-r-2 border-slate-400 px-1.5 py-1.5 text-right tabular-nums w-[106px] min-w-[106px] max-w-[106px] ${
                      s.isCourante ? 'bg-[#FFFF00]' : 'bg-slate-200'
                    }`}
                    title={`Semaine ${s.code} — Total Brodeuses : ${s.totalBrodeuses} (${s.totalBrodeusesExact}) | Total Heures : ${s.totalHeures} h | Total Pièces : ${s.totalPieces}`}
                  >
                    <div className="text-[11px] font-extrabold">{s.totalBrodeuses} brod.</div>
                    <div className="text-[10px] font-normal text-slate-700">
                      {formatExcelNumber(s.totalHeures)} h
                    </div>
                  </td>
                ))}
              </tr>

              {/* =====================================================================
                  EFFECTIF DISPONIBLE (42) & ÉCART D'HEURES (= Heures - 42*40)
                 ===================================================================== */}
              <tr className="bg-white font-mono font-bold border-t border-slate-300">
                <td
                  colSpan={viewMode === 'compact_frise' ? 3 : 11}
                  className="sticky left-0 z-30 bg-white border-r-4 border-slate-700 px-3 py-1.5 text-right font-sans text-xs font-bold text-slate-800 shadow-[4px_0_12px_rgba(0,0,0,0.22)]"
                >
                  EFFECTIF ATELIER DISPO (42 Brod. = 1680h/sem) &amp; ÉCART D'HEURES ➔
                </td>
                {visibleSemaines.map((s) => (
                  <td
                    key={`r52-compact-${s.id}`}
                    onClick={() => {
                      setEditingEffectifSemId(s.id);
                      setTempEffectifVal(String(s.effectifDispo));
                    }}
                    className={`border-r-2 border-slate-400 px-1.5 py-1 text-right tabular-nums text-[10px] cursor-pointer hover:ring-1 hover:ring-indigo-500 w-[106px] min-w-[106px] max-w-[106px] ${
                      s.ecartHeuresCapacite > 0
                        ? 'bg-rose-50 text-rose-700 font-extrabold'
                        : 'bg-emerald-50 text-emerald-800'
                    }`}
                    title={`Effectif disponible : ${s.effectifDispo} brodeuses (cliquer pour modifier) | Écart d'heures = ${s.ecartHeuresCapacite} h`}
                  >
                    {editingEffectifSemId === s.id ? (
                      <input
                        type="text"
                        autoFocus
                        value={tempEffectifVal}
                        onChange={(e) => setTempEffectifVal(e.target.value)}
                        onBlur={() => commitEditEffectif(s.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEditEffectif(s.id);
                          if (e.key === 'Escape') setEditingEffectifSemId(null);
                        }}
                        className="w-full text-right font-mono text-xs bg-amber-50 border border-indigo-600 rounded px-0.5 outline-none"
                      />
                    ) : (
                      <>
                        <div>Dispo: {s.effectifDispo}B</div>
                        <div>
                          {s.ecartHeuresCapacite > 0 ? '+' : ''}
                          {formatExcelNumber(s.ecartHeuresCapacite)}h
                        </div>
                      </>
                    )}
                  </td>
                ))}
              </tr>

              {/* =====================================================================
                  LIGNES DE LÉGENDE EXCEL OFFICIELLES (LIGNES 53 À 57 DU MACRO.XLSX)
                 ===================================================================== */}

              {/* LIGNE 53 EXCEL : GLISSEMENT VS PLANNING (Bleu) */}
              <tr className="bg-white border-t border-slate-300 font-mono">
                <td
                  colSpan={viewMode === 'compact_frise' ? 3 : 11}
                  className="sticky left-0 z-30 bg-white border-r-4 border-slate-700 px-3 py-1 shadow-[4px_0_12px_rgba(0,0,0,0.22)]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        onClick={() => setActiveBrush(activeBrush === 'glissement' ? null : 'glissement')}
                        className={`px-2 py-0.5 rounded text-[10.5px] font-black cursor-pointer transition flex items-center gap-1 ${
                          activeBrush === 'glissement'
                            ? 'bg-[#2E75B6] text-white ring-2 ring-blue-500 shadow-xs'
                            : 'bg-[#BDD7EE] text-[#1B4F82] border border-[#2E75B6] hover:bg-[#A9CCE3]'
                        }`}
                        title="Activer le pinceau Glissement vs Planning (Bleu Excel)"
                      >
                        🟦 GLISSEMENT VS PLANNING
                      </span>
                    </div>
                    <span className="font-sans text-[10px] text-slate-500">
                      Ligne 53 Excel · Report automatique sur Sb+1..Sb+4 en cas de retard ➔
                    </span>
                  </div>
                </td>
                {visibleSemaines.map((s) => (
                  <td
                    key={`r53-gliss-${s.id}`}
                    className="border-r-2 border-slate-300 bg-[#BDD7EE]/40 text-center text-[9px] font-mono text-[#1B4F82] font-bold"
                  >
                    {s.code}
                  </td>
                ))}
              </tr>

              {/* LIGNE 54 EXCEL : SEMAINE EN COURS & DEMI-CHARGE (Jaune) */}
              <tr className="bg-white border-t border-slate-300 font-mono">
                <td
                  colSpan={viewMode === 'compact_frise' ? 3 : 11}
                  className="sticky left-0 z-30 bg-white border-r-4 border-slate-700 px-3 py-1 shadow-[4px_0_12px_rgba(0,0,0,0.22)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-[#FFFF00] text-slate-950 font-sans font-black text-[10.5px] border border-amber-400">
                      ★ Semaine en cours ({currentSemaineCode})
                    </span>
                    <span className="font-sans text-[10px] text-slate-600">
                      Ligne 54 Excel · Indicateur Demi-Charge (= Total Brodeuses / 2) ➔
                    </span>
                  </div>
                </td>
                {visibleSemaines.map((s) => (
                  <td
                    key={`r54-compact-${s.id}`}
                    className={`border-r-2 border-slate-300 px-1.5 py-1 text-right font-bold tabular-nums w-[106px] min-w-[106px] max-w-[106px] ${
                      s.isCourante
                        ? 'bg-[#FFFF00] text-slate-950 font-black'
                        : s.ordre <= 12 || s.demiChargeBrodeuses > 0
                        ? 'bg-[#70AD47] text-slate-950'
                        : 'bg-white text-slate-400'
                    }`}
                  >
                    {s.demiChargeBrodeuses > 0 ? s.demiChargeBrodeuses : ''}
                  </td>
                ))}
              </tr>

              {/* LIGNE 55 EXCEL : SEMAINE DE LANCEMENT (Orange) */}
              <tr className="bg-white border-t border-slate-300 font-mono">
                <td
                  colSpan={viewMode === 'compact_frise' ? 3 : 11}
                  className="sticky left-0 z-30 bg-white border-r-4 border-slate-700 px-3 py-1 shadow-[4px_0_12px_rgba(0,0,0,0.22)]"
                >
                  <div className="flex items-center justify-between">
                    <span
                      onClick={() => setActiveBrush(activeBrush === 'lancement' ? null : 'lancement')}
                      className={`px-2 py-0.5 rounded text-[10.5px] font-black cursor-pointer transition flex items-center gap-1 ${
                        activeBrush === 'lancement'
                          ? 'bg-[#ED7D31] text-white ring-2 ring-orange-500 shadow-xs'
                          : 'bg-[#F8CBAD] text-[#C55A11] border border-[#ED7D31] hover:bg-[#F4B084]'
                      }`}
                      title="Activer le pinceau Semaine de Lancement Sa (Orange Excel)"
                    >
                      🟧 Semaine De Lancement (Sa)
                    </span>
                    <span className="font-sans text-[10px] text-slate-500">
                      Ligne 55 Excel · Démarrage de la confection/broderie ➔
                    </span>
                  </div>
                </td>
                {visibleSemaines.map((s) => {
                  const saCount = saCountByWeek.get(s.code.toUpperCase().trim()) || 0;
                  return (
                    <td
                      key={`r55-lanc-${s.id}`}
                      className={`border-r-2 border-slate-300 text-center text-[9px] font-mono transition-colors w-[106px] min-w-[106px] max-w-[106px] ${
                        saCount > 0
                          ? 'bg-[#ED7D31] text-white font-black ring-1 ring-orange-600 shadow-xs'
                          : 'bg-[#F8CBAD]/30 text-[#C55A11] font-bold'
                      }`}
                      title={`Semaine ${s.code} (${formatDay(s.date_label || s.code)}) : ${saCount} commande(s) avec lancement Sa`}
                    >
                      {saCount > 0 ? (
                        <div className="flex flex-col items-center leading-tight py-0.5">
                          <span className="font-extrabold">{saCount} Sa 🚀</span>
                          <span className="text-[7.5px] opacity-90">{formatDay(s.date_label || s.code)}</span>
                        </div>
                      ) : (
                        s.code
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* LIGNE 56 EXCEL : LIMITE LIVRAISON CLIENT (Rouge) */}
              <tr className="bg-white border-t border-slate-300 font-mono">
                <td
                  colSpan={viewMode === 'compact_frise' ? 3 : 11}
                  className="sticky left-0 z-30 bg-white border-r-4 border-slate-700 px-3 py-1 shadow-[4px_0_12px_rgba(0,0,0,0.22)]"
                >
                  <div className="flex items-center justify-between">
                    <span
                      onClick={() => setActiveBrush(activeBrush === 'limite_client' ? null : 'limite_client')}
                      className={`px-2 py-0.5 rounded text-[10.5px] font-black cursor-pointer transition flex items-center gap-1 ${
                        activeBrush === 'limite_client'
                          ? 'bg-[#C00000] text-white ring-2 ring-red-500 shadow-xs'
                          : 'bg-[#FFD9D9] text-[#C00000] border border-[#C00000] hover:bg-rose-200'
                      }`}
                      title="Activer le pinceau Limite Livraison Client Sb (Rouge Excel)"
                    >
                      🟥 Limite Livraison Client (Sb)
                    </span>
                    <span className="font-sans text-[10px] text-slate-500">
                      Ligne 56 Excel · Date limite contractuelle client ➔
                    </span>
                  </div>
                </td>
                {visibleSemaines.map((s) => {
                  const sbCount = sbCountByWeek.get(s.code.toUpperCase().trim()) || 0;
                  return (
                    <td
                      key={`r56-lim-${s.id}`}
                      className={`border-r-2 border-slate-300 text-center text-[9px] font-mono transition-colors w-[106px] min-w-[106px] max-w-[106px] ${
                        sbCount > 0
                          ? 'bg-[#C00000] text-white font-black ring-1 ring-red-700 shadow-xs'
                          : 'bg-[#FFD9D9]/30 text-[#C00000] font-bold'
                      }`}
                      title={`Semaine ${s.code} (${formatDay(s.date_label || s.code)}) : ${sbCount} commande(s) avec limite client Sb`}
                    >
                      {sbCount > 0 ? (
                        <div className="flex flex-col items-center leading-tight py-0.5">
                          <span className="font-extrabold">{sbCount} Sb ⚑</span>
                          <span className="text-[7.5px] opacity-90">{formatDay(s.date_label || s.code)}</span>
                        </div>
                      ) : (
                        s.code
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* LIGNE 57 EXCEL : SST - SOUS-TRAITANCE (Gris) */}
              <tr className="bg-white border-t border-slate-300 font-mono">
                <td
                  colSpan={viewMode === 'compact_frise' ? 3 : 11}
                  className="sticky left-0 z-30 bg-white border-r-4 border-slate-700 px-3 py-1 shadow-[4px_0_12px_rgba(0,0,0,0.22)]"
                >
                  <div className="flex items-center justify-between">
                    <span
                      onClick={() => setActiveBrush(activeBrush === 'sst' ? null : 'sst')}
                      className={`px-2 py-0.5 rounded text-[10.5px] font-black cursor-pointer transition flex items-center gap-1 ${
                        activeBrush === 'sst'
                          ? 'bg-slate-700 text-white ring-2 ring-slate-500 shadow-xs'
                          : 'bg-[#D9D9D9] text-slate-900 border border-slate-400 hover:bg-slate-300'
                      }`}
                      title="Activer le pinceau SST - Sous-traitance (Gris Excel)"
                    >
                      ⬜ SST (Sous-traitance)
                    </span>
                    <span className="font-sans text-[10px] text-slate-500">
                      Ligne 57 Excel · Atelier externe ou sous-traitance ➔
                    </span>
                  </div>
                </td>
                {visibleSemaines.map((s) => (
                  <td
                    key={`r57-sst-${s.id}`}
                    className="border-r-2 border-slate-300 bg-[#D9D9D9]/30 text-center text-[9px] font-mono text-slate-600 font-bold"
                  >
                    {s.code}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
