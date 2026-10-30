/**
 * Utilitaires de calendrier annuel standard (52 Semaines : S01 à S52)
 * Synchronisation automatique entre dates calendrier normal et semaines industrielles.
 */

export interface CalendarWeekInfo {
  id: number;
  code: string; // 'S01' .. 'S52'
  weekNumber: number; // 1 .. 52
  date_debut: string; // 'YYYY-MM-DD' (Lundi)
  date_fin: string; // 'YYYY-MM-DD' (Dimanche)
  date_friday: string; // 'YYYY-MM-DD' (Vendredi)
  date_label: string; // '05-Jan'
  full_label: string; // 'S01 · 05-Jan au 11-Jan'
  mois_nom: string; // 'Janvier' .. 'Décembre'
  mois_short: string; // 'Jan' .. 'Déc'
  trimestre: 'T1' | 'T2' | 'T3' | 'T4';
  ordre: number; // 0 .. 51
  capacite_brodeuses?: number | null;
  effectif_dispo: number; // 42 brodeuses par défaut
}

// Base 2026 : S34 = Lundi 2026-08-17 (ISO-8601 standard)
const S34_DATE_TIMESTAMP = new Date('2026-08-17T00:00:00Z').getTime();

export const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export const MONTH_SHORT_FR = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'
];

/**
 * Génération rigoureuse des 52 semaines de l'année normale (S01 à S52)
 */
export function generateAnnual52Weeks(): CalendarWeekInfo[] {
  const weeks: CalendarWeekInfo[] = [];

  for (let w = 1; w <= 52; w++) {
    const diffWeeks = w - 34;
    const mondayTime = S34_DATE_TIMESTAMP + diffWeeks * 7 * 24 * 3600 * 1000;
    const fridayTime = mondayTime + 4 * 24 * 3600 * 1000;
    const sundayTime = mondayTime + 6 * 24 * 3600 * 1000;

    const monday = new Date(mondayTime);
    const friday = new Date(fridayTime);
    const sunday = new Date(sundayTime);

    const isoStart = monday.toISOString().split('T')[0];
    const isoFriday = friday.toISOString().split('T')[0];
    const isoEnd = sunday.toISOString().split('T')[0];

    const code = 'S' + (w < 10 ? '0' + w : w);
    const day = String(monday.getUTCDate()).padStart(2, '0');
    const monthIdx = monday.getUTCMonth();
    const date_label = `${day}-${MONTH_SHORT_FR[monthIdx]}`;

    const endDay = String(sunday.getUTCDate()).padStart(2, '0');
    const endMonthIdx = sunday.getUTCMonth();
    const full_label = `${code} (${day}-${MONTH_SHORT_FR[monthIdx]} au ${endDay}-${MONTH_SHORT_FR[endMonthIdx]})`;

    let trimestre: 'T1' | 'T2' | 'T3' | 'T4' = 'T1';
    if (w >= 14 && w <= 26) trimestre = 'T2';
    else if (w >= 27 && w <= 39) trimestre = 'T3';
    else if (w >= 40) trimestre = 'T4';

    weeks.push({
      id: w,
      code,
      weekNumber: w,
      date_debut: isoStart,
      date_fin: isoEnd,
      date_friday: isoFriday,
      date_label,
      full_label,
      mois_nom: MONTH_NAMES_FR[monthIdx],
      mois_short: MONTH_SHORT_FR[monthIdx],
      trimestre,
      ordre: w - 1,
      capacite_brodeuses: w === 34 ? 1845 : null,
      effectif_dispo: 42,
    });
  }

  return weeks;
}

export const CALENDAR_52_WEEKS: CalendarWeekInfo[] = generateAnnual52Weeks();

export const CALENDAR_WEEKS_BY_CODE = new Map<string, CalendarWeekInfo>(
  CALENDAR_52_WEEKS.map((w) => [w.code.toUpperCase(), w])
);

/**
 * Trimestres de l'année standard
 */
export const CALENDAR_QUARTERS = [
  { id: 'T1', name: 'Trimestre 1 (S01 - S13)', startWeek: 'S01', endWeek: 'S13', weeks: CALENDAR_52_WEEKS.slice(0, 13) },
  { id: 'T2', name: 'Trimestre 2 (S14 - S26)', startWeek: 'S14', endWeek: 'S26', weeks: CALENDAR_52_WEEKS.slice(13, 26) },
  { id: 'T3', name: 'Trimestre 3 (S27 - S39)', startWeek: 'S27', endWeek: 'S39', weeks: CALENDAR_52_WEEKS.slice(26, 39) },
  { id: 'T4', name: 'Trimestre 4 (S40 - S52)', startWeek: 'S40', endWeek: 'S52', weeks: CALENDAR_52_WEEKS.slice(39, 52) },
] as const;

/**
 * Mois de l'année avec leurs semaines correspondantes
 */
export const CALENDAR_MONTHS = MONTH_NAMES_FR.map((name, idx) => {
  const short = MONTH_SHORT_FR[idx];
  // Semaines appartenant principalement à ce mois
  const weeksInMonth = CALENDAR_52_WEEKS.filter((w) => w.mois_nom === name);
  return {
    index: idx,
    name,
    short,
    startWeek: weeksInMonth[0]?.code || 'S01',
    endWeek: weeksInMonth[weeksInMonth.length - 1]?.code || 'S52',
    weeksCount: weeksInMonth.length,
    weeks: weeksInMonth,
  };
});

/**
 * Obtenir l'objet semaine par code S01..S52
 */
export function getCalendarWeek(weekCode: string | null | undefined): CalendarWeekInfo | undefined {
  if (!weekCode) return undefined;
  return CALENDAR_WEEKS_BY_CODE.get(weekCode.trim().toUpperCase());
}

/**
 * Résout le code de semaine 'S01'..'S52' à partir d'une date (chaîne ISO 'YYYY-MM-DD' ou objet Date)
 */
export function getWeekCodeFromDate(dateInput: string | Date | null | undefined): string | null {
  if (!dateInput) return null;
  const time = typeof dateInput === 'string' ? new Date(dateInput).getTime() : dateInput.getTime();
  if (Number.isNaN(time)) return null;

  for (const w of CALENDAR_52_WEEKS) {
    const start = new Date(w.date_debut).getTime();
    const end = start + 7 * 24 * 3600 * 1000;
    if (time >= start && time < end) {
      return w.code;
    }
  }

  // Si la date est avant S01, retourner S01
  if (time < new Date(CALENDAR_52_WEEKS[0].date_debut).getTime()) {
    return 'S01';
  }
  // Si après S52, retourner S52
  return 'S52';
}

/**
 * Retourne la date de début (Lundi) ou de fin (Vendredi/Dimanche) pour un code de semaine donné
 */
export function getDateFromWeekCode(
  weekCode: string | null | undefined,
  position: 'start' | 'friday' | 'end' = 'start'
): string | null {
  if (!weekCode) return null;
  const clean = weekCode.trim().toUpperCase();
  const found = CALENDAR_WEEKS_BY_CODE.get(clean);
  if (!found) return null;

  if (position === 'start') return found.date_debut;
  if (position === 'friday') return found.date_friday;
  return found.date_fin;
}

/**
 * Calcule la semaine réelle du calendrier actuel pour l'automatisation en direct
 */
export function getCurrentCalendarWeekCode(): string {
  const now = new Date();
  const code = getWeekCodeFromDate(now);
  return code || 'S42';
}

/**
 * Calcule le nombre de semaines d'écart entre deux codes de semaines (ex: S34 à S38 -> 4 semaines)
 */
export function calculateWeekSpan(startWeek: string, endWeek: string): number {
  const w1 = CALENDAR_WEEKS_BY_CODE.get(startWeek.trim().toUpperCase());
  const w2 = CALENDAR_WEEKS_BY_CODE.get(endWeek.trim().toUpperCase());
  if (!w1 || !w2) return 0;
  return Math.max(0, w2.weekNumber - w1.weekNumber);
}

/**
 * Ajoute ou soustrait des semaines à un code S01..S52 en bornant entre S01 et S52
 */
export function addWeeksToCode(startWeek: string, deltaWeeks: number): string {
  const w = CALENDAR_WEEKS_BY_CODE.get(startWeek.trim().toUpperCase());
  if (!w) return 'S01';
  const targetNum = Math.max(1, Math.min(52, w.weekNumber + deltaWeeks));
  return 'S' + (targetNum < 10 ? '0' + targetNum : targetNum);
}

/**
 * Liste ordonnée standard des 52 semaines
 */
export const ALL_52_WEEK_CODES: string[] = CALENDAR_52_WEEKS.map((w) => w.code);

