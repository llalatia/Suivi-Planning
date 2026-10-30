import { Commande, Semaine, PlanningCell, PlanningData, CellStatut } from '../data/initialData';

export const HEURES_PAR_BRODEUSE_SEMAINE = 40.0;
export const DEFAULT_EFFECTIF_BRODEUSES = 42;

/**
 * Convertit un index de colonne (0-based) en lettre Excel (0 -> A, 25 -> Z, 26 -> AA, etc.)
 */
export function getExcelColumnLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export function qteResteAFaire(qteCommande: number, qteFinie: number): number {
  return Math.max(0, Math.round(((qteCommande || 0) - (qteFinie || 0)) * 100) / 100);
}

export function nbHeuresExact(
  nbPieces: number | null | undefined,
  heurePcs: number | null | undefined,
  isTbc?: boolean | number
): number | null {
  if (isTbc || heurePcs === null || heurePcs === undefined || nbPieces === null || nbPieces === undefined) {
    return null;
  }
  return Math.round(nbPieces * heurePcs * 100) / 100;
}

export function nbHeures(
  nbPieces: number | null | undefined,
  heurePcs: number | null | undefined,
  isTbc?: boolean | number
): number | null {
  return nbHeuresExact(nbPieces, heurePcs, isTbc);
}

export function nbBrodeusesExact(
  heures: number | null | undefined,
  manualBrodeuses?: number | null
): number | null {
  if (manualBrodeuses !== null && manualBrodeuses !== undefined) {
    return manualBrodeuses;
  }
  if (heures === null || heures === undefined) {
    return null;
  }
  return heures / HEURES_PAR_BRODEUSE_SEMAINE;
}

export function nbBrodeuses(
  heures: number | null | undefined,
  manualBrodeuses?: number | null
): number | null {
  const exact = nbBrodeusesExact(heures, manualBrodeuses);
  if (exact === null) return null;
  return Math.round(exact * 100) / 100;
}

export function formatExcelNumber(val: number | null | undefined, decimals: number = 2): string {
  if (val === null || val === undefined || Number.isNaN(val)) return '';
  if (decimals === 0) return String(Math.round(val));
  const rounded = Math.round(val * 100) / 100;
  return String(rounded);
}

/**
 * Trouve l'index de la semaine correspondant soit à un code ('S34'), soit à une date ISO ('2026-08-17')
 */
export function resolveWeekIndexFromCodeOrDate(
  semaines: Semaine[],
  weekCode?: string | null,
  isoDate?: string | null
): number {
  if (!semaines || semaines.length === 0) return -1;
  if (weekCode) {
    const clean = weekCode.trim().toUpperCase();
    const idx = semaines.findIndex((s) => s.code.toUpperCase() === clean);
    if (idx !== -1) return idx;
  }
  if (isoDate) {
    const targetTime = new Date(isoDate).getTime();
    if (!Number.isNaN(targetTime)) {
      for (let i = 0; i < semaines.length; i++) {
        const start = new Date(semaines[i].date_debut).getTime();
        if (!Number.isNaN(start)) {
          const end = start + 7 * 24 * 3600 * 1000;
          if (targetTime >= start && targetTime < end) {
            return i;
          }
        }
      }
    }
  }
  return -1;
}

// Semaine où le cumul des pièces programmées solde la commande (à défaut, dernière semaine programmée)
function resolvePlannedFinishWeekIdx(
  semaines: Semaine[],
  cPlanning: PlanningCell[],
  resteAFaire: number,
  totalProgramme: number
): number {
  const target = resteAFaire > 0 ? resteAFaire : totalProgramme;
  if (target <= 0) return -1;

  let finishIdx = -1;
  let lastActiveIdx = -1;
  let cumul = 0;

  for (let idx = 0; idx < semaines.length; idx++) {
    const pcs = cPlanning.find((p) => p.semaine_id === semaines[idx].id)?.nb_pieces || 0;
    if (pcs <= 0) continue;
    lastActiveIdx = idx;
    cumul += pcs;
    if (finishIdx === -1 && cumul >= target) finishIdx = idx;
  }

  return finishIdx !== -1 ? finishIdx : lastActiveIdx;
}

export type CommandeStatut = 'ok' | 'sous_planifie' | 'termine' | 'tbc' | 'glissement';
export interface CommandeCalculated extends Commande {
  excelRowNumber: number;
  resteAFaire: number;
  totalProgramme: number;
  programmeAPartirCourante: number;
  ecart: number;
  statut: CommandeStatut;
  manquant: number;
  firstActiveWeekIdx: number;
  lastActiveWeekIdx: number;
  saIdx: number; // Index de la semaine de lancement (Sa)
  sbIdx: number; // Index de la semaine date limite client initiale (Sb)
  saCode: string | null;
  sbCode: string | null;
  isGlissement: boolean; // True si Sb est dépassée alors qu'il reste des pièces (ou pièces après Sb)
  glissementStartIdx: number; // Sb + 1
  glissementEndIdx: number; // Sb + 4 (nouvelle date limite client)
  effectiveDeadlineIdx: number; // Sb (ou Sb + 4 si glissement)
  effectiveDeadlineCode: string | null;
  isCompletedOnTime: boolean; // True si resteAFaire <= 0 sans dépasser la date limite (Sb ou Sb+4)
  spanStartIdx: number; // Début du trait continu en haut des cases
  spanEndIdx: number; // Fin du trait continu en haut des cases
  brodeusesActives: number | null; // Nombre de brodeuses configuré ou calculé sur la commande
}

export function calculateCommande(
  c: Commande,
  planning: PlanningCell[],
  semaines: Semaine[] = [],
  semaineCouranteCode: string = 'S34',
  rowIndex: number = 0
): CommandeCalculated {
  const cPlanning = planning.filter((p) => p.commande_id === c.id);
  const totalProgramme = cPlanning.reduce((sum, p) => sum + (p.nb_pieces || 0), 0);
  const resteAFaire = qteResteAFaire(c.qte_commande, c.qte_finie);

  let firstActiveWeekIdx = -1;
  let lastActiveWeekIdx = -1;
  let cellLancementIdx = -1;
  let cellLimiteIdx = -1;
  let hasManualGlissementCell = false;
  let programmeAPartirCourante = totalProgramme;
  let currentWeekBrodeuses: number | null = null;
  let maxActiveBrodeuses: number | null = null;

  const currentIdx = semaines.findIndex((s) => s.code === (semaineCouranteCode || 'S34'));

  if (semaines.length > 0) {
    programmeAPartirCourante = 0;

    semaines.forEach((s, idx) => {
      const cell = cPlanning.find((p) => p.semaine_id === s.id);
      const pcs = cell?.nb_pieces || 0;
      if (pcs > 0) {
        if (firstActiveWeekIdx === -1) firstActiveWeekIdx = idx;
        lastActiveWeekIdx = idx;
        if (!c.heure_pcs_tbc && c.heure_pcs) {
          const b =
            cell?.manual_brodeuses !== null && cell?.manual_brodeuses !== undefined
              ? cell.manual_brodeuses
              : Math.round((pcs * c.heure_pcs) / HEURES_PAR_BRODEUSE_SEMAINE);
          if (idx === currentIdx) {
            currentWeekBrodeuses = b;
          }
          if (maxActiveBrodeuses === null || b > maxActiveBrodeuses) {
            maxActiveBrodeuses = b;
          }
        }
      }
      if (cell?.statut === 'lancement' && cellLancementIdx === -1) {
        cellLancementIdx = idx;
      }
      if (cell?.statut === 'limite_client') {
        cellLimiteIdx = idx;
      }
      if (cell?.statut === 'glissement') {
        hasManualGlissementCell = true;
      }
      if (currentIdx === -1 || idx >= currentIdx) {
        programmeAPartirCourante += pcs;
      }
    });
  }

  // 1. Déterminer Sa (Semaine de Lancement) : renseignée sur la commande, puis peinte sur la
  // frise, sinon automatiquement la première semaine programmée
  let saIdx = resolveWeekIndexFromCodeOrDate(semaines, c.semaine_lancement, c.date_lancement);
  if (saIdx === -1 && cellLancementIdx !== -1) saIdx = cellLancementIdx;
  if (saIdx === -1) saIdx = firstActiveWeekIdx;

  // 2. Déterminer Sb (Semaine Date Limite Client initiale) : renseignée sur la commande, puis
  // peinte sur la frise, sinon automatiquement la semaine où le cumul programmé solde le reste à faire
  let sbIdx = resolveWeekIndexFromCodeOrDate(
    semaines,
    c.semaine_limite_client,
    c.date_limite_client
  );
  if (sbIdx === -1 && cellLimiteIdx !== -1) sbIdx = cellLimiteIdx;
  // Un Sb dérivé du programme sert à l'affichage uniquement : les alertes de glissement
  // restent déclenchées par une date limite réellement saisie (commande, cellule ou ligne)
  const sbSaisi = sbIdx !== -1;
  if (sbIdx === -1) sbIdx = resolvePlannedFinishWeekIdx(semaines, cPlanning, resteAFaire, totalProgramme);

  // Assurer que Sb >= Sa si les deux existent
  if (saIdx !== -1 && sbIdx !== -1 && sbIdx < saIdx) {
    sbIdx = saIdx;
  }

  // Macro-Planning pure logic:
  // Statut de la commande basé sur les pièces finies et le reste à faire
  const isCompletedOnTime = (resteAFaire <= 0 && c.qte_commande > 0) || c.row_color === 'termine';

  const spanStartIdx = firstActiveWeekIdx;
  const spanEndIdx = lastActiveWeekIdx;

  const ciblePlanning = totalProgramme >= c.qte_commande ? c.qte_commande : resteAFaire;
  const manquant = Math.max(
    0,
    Math.min(
      Math.round((c.qte_commande - totalProgramme) * 100) / 100,
      Math.round((resteAFaire - programmeAPartirCourante) * 100) / 100
    )
  );
  const ecart = Math.round((totalProgramme - ciblePlanning) * 100) / 100;

  let statut: CommandeStatut = 'ok';
  if (isCompletedOnTime) {
    statut = 'termine';
  } else if (c.heure_pcs_tbc) {
    statut = 'tbc';
  } else if (manquant > 0) {
    statut = 'sous_planifie';
  }

  // Glissement vs Planning :
  // Déclenché si Sb est dépassée (production au-delà de Sb ou semaine courante passée avec reste à faire)
  // ou si la commande / ligne est annotée en glissement
  let isGlissement = false;
  let glissementStartIdx = -1;
  let glissementEndIdx = -1;
  let effectiveDeadlineIdx = sbIdx;

  if (sbSaisi && sbIdx >= 0) {
    const hasOverduePieces = lastActiveWeekIdx > sbIdx;
    const isOverdueWithRemaining = currentIdx > sbIdx && resteAFaire > 0;
    if (hasOverduePieces || isOverdueWithRemaining || c.row_color === 'glissement' || hasManualGlissementCell) {
      isGlissement = true;
      glissementStartIdx = sbIdx + 1;
      glissementEndIdx = Math.min(semaines.length - 1, sbIdx + 4);
      effectiveDeadlineIdx = glissementEndIdx;
    }
  } else if (c.row_color === 'glissement' || hasManualGlissementCell) {
    isGlissement = true;
  }

  if (isGlissement && statut !== 'termine') {
    statut = 'glissement';
  }

  const brodeusesActives =
    c.nb_brodeuses_dispo !== null && c.nb_brodeuses_dispo !== undefined
      ? c.nb_brodeuses_dispo
      : currentWeekBrodeuses !== null
      ? currentWeekBrodeuses
      : maxActiveBrodeuses;

  return {
    ...c,
    excelRowNumber: rowIndex + 6,
    resteAFaire,
    totalProgramme,
    programmeAPartirCourante,
    ecart,
    statut,
    manquant,
    firstActiveWeekIdx,
    lastActiveWeekIdx,
    saIdx,
    sbIdx,
    saCode: saIdx >= 0 && semaines[saIdx] ? semaines[saIdx].code : c.semaine_lancement || null,
    sbCode: sbIdx >= 0 && semaines[sbIdx] ? semaines[sbIdx].code : c.semaine_limite_client || null,
    isGlissement,
    glissementStartIdx,
    glissementEndIdx,
    effectiveDeadlineIdx,
    effectiveDeadlineCode:
      effectiveDeadlineIdx >= 0 && semaines[effectiveDeadlineIdx]
        ? semaines[effectiveDeadlineIdx].code
        : null,
    isCompletedOnTime,
    spanStartIdx,
    spanEndIdx,
    brodeusesActives,
  };
}

export interface SemaineCalculated extends Semaine {
  colLetterBrodeuses: string;
  colLetterHeures: string;
  colLetterPieces: string;
  totalPieces: number;
  totalHeures: number;
  totalBrodeusesExact: number;
  totalBrodeuses: number;
  effectifDispo: number;
  ecartHeuresCapacite: number;
  demiChargeBrodeuses: number;
  isCourante: boolean;
  isPast: boolean;
  activeOrdersCount: number;
}

export function calculateSemaines(
  semaines: Semaine[],
  commandes: Commande[],
  planning: PlanningCell[],
  semaineCouranteCode: string
): SemaineCalculated[] {
  const cmdMap = new Map<number, Commande>();
  commandes.forEach((c) => cmdMap.set(c.id, c));

  const currentIdx = semaines.findIndex((s) => s.code === semaineCouranteCode);

  return semaines.map((s, idx) => {
    const startCol = 8 + idx * 3;
    const colLetterBrodeuses = getExcelColumnLetter(startCol);
    const colLetterHeures = getExcelColumnLetter(startCol + 1);
    const colLetterPieces = getExcelColumnLetter(startCol + 2);

    const sPlanning = planning.filter((p) => p.semaine_id === s.id && (p.nb_pieces || 0) > 0);
    let totalPieces = 0;
    let totalHeures = 0;
    let totalBrodeusesExact = 0;

    sPlanning.forEach((p) => {
      const c = cmdMap.get(p.commande_id);
      if (c) {
        const pcs = p.nb_pieces || 0;
        totalPieces += pcs;
        if (!c.heure_pcs_tbc && c.heure_pcs) {
          const h = pcs * c.heure_pcs;
          totalHeures += h;
          const b =
            p.manual_brodeuses !== null && p.manual_brodeuses !== undefined
              ? p.manual_brodeuses
              : h / HEURES_PAR_BRODEUSE_SEMAINE;
          totalBrodeusesExact += b;
        }
      }
    });

    totalHeures = Math.round(totalHeures * 100) / 100;
    const totalBrodeuses = Math.round(totalBrodeusesExact);
    const effectifDispo = s.effectif_dispo ?? DEFAULT_EFFECTIF_BRODEUSES;
    const ecartHeuresCapacite = Math.round(
      (totalHeures - effectifDispo * HEURES_PAR_BRODEUSE_SEMAINE) * 100
    ) / 100;
    const demiChargeBrodeuses = Math.round(totalBrodeusesExact / 2);

    return {
      ...s,
      colLetterBrodeuses,
      colLetterHeures,
      colLetterPieces,
      totalPieces,
      totalHeures,
      totalBrodeusesExact: Math.round(totalBrodeusesExact * 100) / 100,
      totalBrodeuses,
      effectifDispo,
      ecartHeuresCapacite,
      demiChargeBrodeuses,
      isCourante: s.code === semaineCouranteCode,
      isPast: currentIdx >= 0 && idx < currentIdx,
      activeOrdersCount: sPlanning.length,
    };
  });
}

/**
 * Planifie automatiquement une commande semaine par semaine à partir du NOMBRE DE BRODEUSES DISPONIBLES
 * pour traiter la commande :
 * - Cadence hebdomadaire = (nbBrodeusesDispo * 40h) / heure_pcs
 * - Démarre à la semaine de lancement Sa (si définie), sinon à la semaine en cours (S34)
 * - Si les pièces dépassent Sb, cela déclenche automatiquement le Glissement vs Planning (Sb+1..Sb+4 en bleu)
 */
export function dispatchByBrodeusesDispo(
  commande: Commande,
  planning: PlanningCell[],
  semaines: Semaine[],
  semaineCouranteCode: string,
  nbBrodeusesDispo: number
): PlanningCell[] {
  if (
    !nbBrodeusesDispo ||
    nbBrodeusesDispo <= 0 ||
    commande.heure_pcs_tbc ||
    !commande.heure_pcs ||
    commande.heure_pcs <= 0
  ) {
    return planning;
  }

  const reste = qteResteAFaire(commande.qte_commande, commande.qte_finie);
  if (reste <= 0) return planning;

  const saIdx = resolveWeekIndexFromCodeOrDate(
    semaines,
    commande.semaine_lancement,
    commande.date_lancement
  );
  const currIdx = Math.max(
    0,
    semaines.findIndex((s) => s.code === (semaineCouranteCode || 'S34'))
  );

  // Semaine de départ : Sa si définie, sinon semaine en cours
  const startIdx = saIdx >= 0 ? saIdx : currIdx;

  // Pièces réalisables par semaine avec nbBrodeusesDispo (1 brodeuse = 40h/sem)
  const weeklyPieces = Math.max(
    1,
    Math.round((nbBrodeusesDispo * HEURES_PAR_BRODEUSE_SEMAINE) / commande.heure_pcs)
  );

  const targetSemIds = new Set(semaines.slice(startIdx).map((s) => s.id));

  // Remettre à 0 les pièces sur la plage >= startIdx pour cette commande
  const newPlanning = planning.map((p) => {
    if (p.commande_id === commande.id && targetSemIds.has(p.semaine_id)) {
      return { ...p, nb_pieces: 0, manual_brodeuses: null };
    }
    return p;
  });

  let remaining = reste;
  for (let i = startIdx; i < semaines.length && remaining > 0; i++) {
    const sem = semaines[i];
    const pcs = Math.min(remaining, weeklyPieces);
    remaining = Math.round((remaining - pcs) * 100) / 100;

    const existingIdx = newPlanning.findIndex(
      (p) => p.commande_id === commande.id && p.semaine_id === sem.id
    );
    if (existingIdx >= 0) {
      newPlanning[existingIdx] = {
        ...newPlanning[existingIdx],
        nb_pieces: pcs,
        manual_brodeuses: null,
      };
    } else {
      newPlanning.push({
        id: Date.now() + i + Math.floor(Math.random() * 100000),
        commande_id: commande.id,
        semaine_id: sem.id,
        nb_pieces: pcs,
        statut: 'normal',
      });
    }
  }

  return newPlanning;
}

/**
 * Calcul automatique de dispatch sur la frise chronologique (de Sa à Sb, ou selon nb_brodeuses_dispo, ou sur N semaines)
 */
export function autoDispatchMissing(
  commandeId: number,
  planningData: PlanningData,
  startSemaineCode?: string,
  nbWeeksToSpread: number = 4
): PlanningCell[] {
  const commande = planningData.commandes.find((c) => c.id === commandeId);
  if (!commande) return planningData.planning;

  // Si la commande a un nombre de brodeuses disponibles défini, utiliser directement cette cadence !
  if (
    commande.nb_brodeuses_dispo &&
    commande.nb_brodeuses_dispo > 0 &&
    !commande.heure_pcs_tbc &&
    commande.heure_pcs &&
    commande.heure_pcs > 0
  ) {
    return dispatchByBrodeusesDispo(
      commande,
      planningData.planning,
      planningData.semaines,
      startSemaineCode || planningData.config.semaine_courante,
      commande.nb_brodeuses_dispo
    );
  }

  const reste = qteResteAFaire(commande.qte_commande, commande.qte_finie);
  if (reste <= 0) return planningData.planning;

  const saIdx = resolveWeekIndexFromCodeOrDate(
    planningData.semaines,
    commande.semaine_lancement,
    commande.date_lancement
  );
  const sbIdx = resolveWeekIndexFromCodeOrDate(
    planningData.semaines,
    commande.semaine_limite_client,
    commande.date_limite_client
  );
  const currIdx = Math.max(
    0,
    planningData.semaines.findIndex(
      (s) => s.code === (startSemaineCode || planningData.config.semaine_courante)
    )
  );

  // Si Sa et Sb définissent une fenêtre valide, on étale entre Sa (ou currIdx) et Sb
  const startIdx = saIdx >= 0 ? saIdx : currIdx;
  const endIdx =
    sbIdx >= startIdx
      ? sbIdx
      : Math.min(planningData.semaines.length - 1, startIdx + Math.max(1, nbWeeksToSpread) - 1);

  const targetSemaines = planningData.semaines.slice(startIdx, endIdx + 1);
  if (targetSemaines.length === 0) return planningData.planning;

  const futureSemIds = new Set(planningData.semaines.slice(startIdx).map((s) => s.id));
  const newPlanning = planningData.planning.map((p) => {
    if (p.commande_id === commandeId && futureSemIds.has(p.semaine_id)) {
      return { ...p, nb_pieces: 0, manual_brodeuses: null };
    }
    return p;
  });

  const basePerWeek = Math.floor(reste / targetSemaines.length);
  let remainder = Math.round(reste - basePerWeek * targetSemaines.length);

  targetSemaines.forEach((sem) => {
    const pieces = basePerWeek + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;

    const existingIdx = newPlanning.findIndex(
      (p) => p.commande_id === commandeId && p.semaine_id === sem.id
    );
    if (existingIdx >= 0) {
      newPlanning[existingIdx] = {
        ...newPlanning[existingIdx],
        nb_pieces: pieces,
        manual_brodeuses: null,
      };
    } else {
      newPlanning.push({
        id: Date.now() + Math.floor(Math.random() * 100000),
        commande_id: commandeId,
        semaine_id: sem.id,
        nb_pieces: pieces,
        statut: 'normal',
      });
    }
  });

  return newPlanning;
}
