import { MONTH_SHORT_FR } from './calendarUtils';

/**
 * Forme unique d'affichage des dates et semaines du micro-planning.
 * Les clés internes (feuilles de suivi, identifiants localStorage) restent en `jour-mois`
 * non zéroté côté mois ('29-9', '12-10') : elles ne doivent pas être présentées telles quelles.
 */

const pad2 = (n: number) => String(n).padStart(2, '0');

const MONTH_INDEX: Record<string, number> = MONTH_SHORT_FR.reduce((acc, short, i) => {
  acc[short.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')] = i + 1;
  return acc;
}, {} as Record<string, number>);

/** Retourne `[jour, mois]` depuis `12/10`, `12-10`, `2026-10-12` ou `17-Oct`, sinon null. */
export function parseDay(value: string | null | undefined): [number, number] | null {
  if (!value) return null;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:T|$)/.exec(value.trim());
  if (iso) return [Number(iso[3]), Number(iso[2])];

  const parts = value.trim().split(/[-/.]/).filter(Boolean);
  if (parts.length !== 2) return null;
  const a = Number(parts[0]);
  const b = Number(parts[1]);
  if (Number.isFinite(a) && Number.isFinite(b)) return [a, b];

  const month = MONTH_INDEX[parts[1].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')];
  return month ? [a, month] : null;
}

/** `12-10`, `2026-10-12` ou `17-Oct` -> `12/10`. */
export function formatDay(value: string | null | undefined): string {
  const parsed = parseDay(value);
  return parsed ? `${pad2(parsed[0])}/${pad2(parsed[1])}` : (value || '—');
}

/** `Lun 12/10` (jour de semaine raccourci + date). */
export function formatDayWithName(dayName: string | null | undefined, value: string | null | undefined): string {
  const day = formatDay(value);
  return dayName ? `${dayName} ${day}` : day;
}

/** `S41 · 12/10` : semaine toujours affichée zérotée, suivie du jour pivot. */
export function formatWeekDay(week: string | null | undefined, value: string | null | undefined): string {
  const day = formatDay(value);
  return week && week !== '—' ? `${week} · ${day}` : day;
}

/** Clé de feuille de suivi (`29-9`) correspondant à une date du calendrier, en restant dans l'existant. */
export function trackingKeyFor(value: string | null | undefined, knownKeys: string[] = []): string {
  const parsed = parseDay(value);
  if (!parsed) return value || '';
  const [day, month] = parsed;
  const match = knownKeys.find((k) => {
    const known = parseDay(k);
    return !!known && known[0] === day && known[1] === month;
  });
  return match || `${pad2(day)}-${month}`;
}

/** Vrai si deux représentations (clé ou libellé) désignent le même jour. */
export function isSameDay(a: string | null | undefined, b: string | null | undefined): boolean {
  const pa = parseDay(a);
  const pb = parseDay(b);
  return !!pa && !!pb && pa[0] === pb[0] && pa[1] === pb[1];
}

/** `2026-08-17` -> `17/08/2026` (dates absolues du macro-planning, année comprise). */
export function formatFullDate(value: string | null | undefined): string {
  if (!value) return '—';
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value.trim());
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const parts = value.trim().split(/[-/.]/).filter(Boolean);
  if (parts.length === 3) {
    const [a, b, c] = parts.map((p) => Number(p));
    if ([a, b, c].every(Number.isFinite)) return `${pad2(a)}/${pad2(b)}/${c}`;
  }
  return value;
}

const WEEKDAY_SHORT_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

/** `2026-01-05` (ou `05/01`) -> `Lun` : même abréviation que la frise micro. */
export function formatWeekdayShort(value: string | null | undefined): string {
  if (!value) return '';
  const parsed = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value.trim());
  if (!parsed) return '';
  const d = new Date(`${parsed[1]}-${parsed[2]}-${parsed[3]}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? '' : WEEKDAY_SHORT_FR[d.getUTCDay()];
}

/** `2026-01-05` -> `Lun 05/01/2026` : même jour court que la frise micro, année comprise. */
export function formatFullDateWithName(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value.trim());
  if (!parsed) return formatFullDate(value);
  const d = new Date(`${parsed[1]}-${parsed[2]}-${parsed[3]}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return formatFullDate(value);
  return `${WEEKDAY_SHORT_FR[d.getUTCDay()]} ${formatFullDate(value)}`;
}

/** `2026-10-12` + 3 -> `2026-10-15` (UTC, sans dérive de fuseau). */
export function isoAddDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Dimanche de la semaine qui commence le lundi ISO donné ; null si la valeur n'est pas une date ISO. */
export function isoWeekEnd(dateDebut: string | null | undefined): string | null {
  const iso = (dateDebut || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? isoAddDays(iso, 6) : null;
}

/**
 * Libellé d'une semaine : `S41 [12/10 → 16/10]`, suivi de ` ★ actif` quand elle porte le jour pointé.
 * Utilisé par toutes les listes de semaines pour éviter les variantes (`S41 ★ (12/10 - Active) [..] · Oct`).
 */
export function formatWeekCaption(
  weekCode: string,
  firstDay: string | null | undefined,
  lastDay: string | null | undefined,
  isActive: boolean
): string {
  const range = firstDay && lastDay ? ` [${formatDay(firstDay)} → ${formatDay(lastDay)}]` : '';
  return `${weekCode}${range}${isActive ? ' ★ actif' : ''}`;
}
