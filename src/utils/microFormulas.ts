import { MicroJob } from '../data/microPlanningTypes';

const sortedCols = (job: MicroJob) => Object.keys(job.jours || {}).map(Number).sort((a, b) => a - b);

/**
 * Cumul de la veille pour le jour `colIdx` : le dernier cumul réellement enregistré
 * avant ce jour. Les jours de prévision portent cumul = 0 et ne doivent pas effacer
 * la valeur de la veille.
 */
export function prevCumulBefore(job: MicroJob, colIdx: number): number {
  const earlier = sortedCols(job).filter((c) => c < colIdx);
  for (let i = earlier.length - 1; i >= 0; i--) {
    const cumul = job.jours[earlier[i]].cumul || 0;
    if (cumul > 0) return cumul;
  }

  // Premier jour enregistré du modèle : il reporte un cumul antérieur à la frise
  // (ex: 807 pcs déjà emballées avant la 1ère colonne), retrouvé via cumul - real.
  const self = job.jours?.[colIdx];
  return self ? Math.max(0, (self.cumul || 0) - (self.real || 0)) : 0;
}

/**
 * C(n) = C(n-1) + R(n), propagé du jour saisi vers les jours suivants, sans jamais
 * écrire au-delà de `limitColIdx` (le jour courant). Avec `keepFilledCumuls`, la
 * propagation ne remplit que les cases encore vides : un cumul déjà tapé à la main
 * reste la valeur de l'opérateur, exactement comme dans la SIMULATION d'Excel.
 */
export function applyCumulFrom(
  job: MicroJob,
  fromColIdx: number,
  limitColIdx = Number.POSITIVE_INFINITY,
  keepFilledCumuls = false
): MicroJob {
  const jours = { ...job.jours };
  const stopCol = Math.max(fromColIdx, limitColIdx);
  const targets = sortedCols(job).filter((c) => c >= fromColIdx && c <= stopCol);
  let prev = prevCumulBefore(job, fromColIdx);

  targets.forEach((c) => {
    const dejaSaisi = jours[c].cumul || 0;
    const value = keepFilledCumuls && dejaSaisi > 0 ? dejaSaisi : prev + (jours[c].real || 0);
    jours[c] = { ...jours[c], cumul: value };
    prev = value;
  });

  return {
    ...job,
    jours,
    cumulRealise: targets.length > 0 ? prev : job.cumulRealise,
  };
}

/** Reste à faire au début du jour : OF - dernier cumul enregistré. */
export function withReste(job: MicroJob): MicroJob {
  const cols = sortedCols(job);
  const jours = { ...job.jours };
  let prev = cols.length > 0 ? prevCumulBefore(job, cols[0]) : 0;

  cols.forEach((c) => {
    jours[c] = { ...jours[c], reste: Math.max(0, (job.qtyTotal || 0) - prev) };
    const cumul = jours[c].cumul || 0;
    if (cumul > 0) prev = cumul;
  });

  return { ...job, jours };
}

export const normalizeJobs = (jobs: MicroJob[]): MicroJob[] => jobs.map(withReste);
