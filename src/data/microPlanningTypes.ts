export interface MicroTimelineDay {
  colIdx: number;
  colLetter?: string;
  week: string; // e.g. 'S41', 'S42', etc.
  excelDate: number;
  dateLabel: string; // e.g. '12/10'
  dayName: string; // 'Lun', 'Mar', 'Mer', etc.
  fullDate: string; // '2026-10-12'
  isToday?: boolean;
  isActualite?: boolean; // Past and current days with real production
  isPrevision?: boolean; // Future forecast days
}

export interface MicroJobDayData {
  real: number;
  cumul: number;
  target?: number;
  week?: string;
  dateLabel?: string;
  isActualite?: boolean;
  isPrevision?: boolean;
  alim?: number;
  coupe?: number;
}

export interface MicroJob {
  id: string;
  chaine: string; // e.g. 'MARGUERITE 1 CONFECTION', 'TANA 1 CONFECTION', 'SS SIEGE', 'ROSE - POSE CUIR', 'DHALIA - POSE CUIR'
  client: string; // e.g. 'BULGARI', 'JAC', 'SANA', 'ZIMMERMANN', 'IM'
  style: string; // e.g. 'BLIOVA BLACK / ECRU', 'PRAIA', 'BAYA NAT US2'
  qtyTotal: number; // Quantité totale OF
  objJour: number; // Objectif journalier en pcs
  cumulRealise: number; // Dernier cumul de réalisation
  launchColIdx?: number;
  deadlineColIdx?: number;
  launchWeek?: string;
  deadlineWeek?: string;
  jours: Record<number, MicroJobDayData>; // colIdx -> { real, cumul, target, alim, coupe }
  color?: string; // Hex color code assigned to this model/job
}

export interface MicroDailyRow {
  id: string;
  chaine: string; // 'MARGUERITE 1', 'DHALIA - POSE CUIR', etc.
  modele: string;
  of: number; // OF Quantité
  realPacking: number; // Réalisé aujourd'hui
  cumulJ1: number; // Cumul la veille
  cumulPacking: number; // Cumul à ce jour
  cumulCarton: number; // Cumul mis en carton
  alimChaine: number; // Alimentation chaîne / coupe disponible
  prodCoupe: number; // Production coupe du jour
  cumulCoupe: number; // Cumul quantité coupée
  pctCoupe: number; // % coupe par rapport à OF (0..1)
  semaineLancement?: string; // Sa
  semaineLimite?: string; // Sb
  remarque: string;
  date: string; // e.g. '12-10'
  client?: string; // Optional matched client e.g. 'IM', 'ZIM'
  color?: string; // Optional color
}

export interface MicroPlanningData {
  timelineDays: MicroTimelineDay[];
  jobs: MicroJob[];
  dailyTracking: Record<string, MicroDailyRow[]>; // dateKey ('12-10', '10-10') -> rows
  currentDateKey: string;
  currentColIdx: number;
  modelColors?: Record<string, string>; // Normalized model style -> Hex color
}
