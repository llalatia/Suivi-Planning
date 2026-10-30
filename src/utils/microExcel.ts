import * as XLSX from 'xlsx';
import {
  MicroPlanningData,
  MicroDailyRow,
  MicroJob,
  MicroTimelineDay,
} from '../data/microPlanningTypes';

/**
 * Export Micro-Planning to XLSX with both SIMULATION and Daily Tracking sheets
 */
export function exportMicroPlanningToXLSX(data: MicroPlanningData, filename?: string) {
  const dateKey = data.currentDateKey || '12-10';
  const fname = filename || `MICRO-PLANNING_MAJ_${dateKey}.xlsx`;
  const wb = XLSX.utils.book_new();

  // 1. Create Daily Tracking Sheet (e.g. '12-10')
  const dailyRows = data.dailyTracking[dateKey] || [];
  const wsDailyData: (string | number | null)[][] = [];

  // Header row
  wsDailyData.push([
    'CHAINE / LINE',
    'MODELE / STYLE',
    'OF',
    'REAL PACKING / PACKING QTY ',
    'CUMUL PACKING J-1',
    'CUMUL PACKING',
    'CUMUL MIS EN CARTON / CUMUL PACKED IN CARTON',
    'ALIMENTATION CHAINE / CUTTING QTY AVAILABLE ',
    'PRODUCTION COUPE / CUTTING PRODUCTION',
    'CUMUL QTE COUPE / CUMULATIVE CUTTING QTY ',
    '% COUPE PAR RAPPORT OF',
    'REMARQUE',
  ]);

  dailyRows.forEach((r) => {
    wsDailyData.push([
      r.chaine,
      r.modele,
      r.of,
      r.realPacking || null,
      r.cumulJ1 || null,
      r.cumulPacking || null,
      r.cumulCarton || null,
      r.alimChaine || null,
      r.prodCoupe || null,
      r.cumulCoupe || null,
      r.pctCoupe || null,
      r.remarque || null,
    ]);
  });

  const wsDaily = XLSX.utils.aoa_to_sheet(wsDailyData);
  XLSX.utils.book_append_sheet(wb, wsDaily, dateKey);

  // 2. Create SIMULATION Sheet
  const wsSimData: (string | number | null)[][] = [];

  // Row 0: Weeks
  const rowWeeks: (string | number | null)[] = [null, null, null];
  data.timelineDays.forEach((td) => {
    rowWeeks.push(td.week);
  });
  wsSimData.push(rowWeeks);

  // Row 1: Dates
  const rowDates: (string | number | null)[] = [null, null, null];
  data.timelineDays.forEach((td) => {
    rowDates.push(td.dateLabel);
  });
  wsSimData.push(rowDates);

  // Group jobs by chain
  const chainMap = new Map<string, MicroJob[]>();
  data.jobs.forEach((j) => {
    if (!chainMap.has(j.chaine)) chainMap.set(j.chaine, []);
    chainMap.get(j.chaine)!.push(j);
  });

  chainMap.forEach((jobs, chain) => {
    // 8 rows per chain block
    const rClient: (string | number | null)[] = ['SITE 1', chain, 'CLIENT / BUYER'];
    const rStyle: (string | number | null)[] = [null, null, 'REF / STYLE'];
    const rQty: (string | number | null)[] = [null, null, 'QTE / QTY'];
    const rObj: (string | number | null)[] = [null, null, 'OBJ/J / TARGET'];
    const rReal: (string | number | null)[] = [null, null, 'REAL PACK / Achieved qty '];
    const rCumul: (string | number | null)[] = [null, null, 'CUMUL PACK / Cumulative qty '];
    const rAlim: (string | number | null)[] = [null, null, 'ALIMENTATION  / cutting qty available'];
    const rCoupe: (string | number | null)[] = [null, null, 'CUMUL COUPE / Cumulative cutting qty'];

    data.timelineDays.forEach((td) => {
      // Find matching job for this day
      const job = jobs.find((j) => j.jours && j.jours[td.colIdx] !== undefined);
      if (job) {
        const jData = job.jours[td.colIdx];
        rClient.push(job.client);
        rStyle.push(job.style);
        rQty.push(job.qtyTotal ? `${job.qtyTotal}pcs` : null);
        rObj.push(job.objJour ? `${job.objJour}pcs` : null);
        rReal.push(jData?.real ?? null);
        rCumul.push(jData?.cumul ?? null);
        rAlim.push(null);
        rCoupe.push(null);
      } else {
        rClient.push(null);
        rStyle.push(null);
        rQty.push(null);
        rObj.push(null);
        rReal.push(null);
        rCumul.push(null);
        rAlim.push(null);
        rCoupe.push(null);
      }
    });

    wsSimData.push(rClient, rStyle, rQty, rObj, rReal, rCumul, rAlim, rCoupe);
  });

  const wsSim = XLSX.utils.aoa_to_sheet(wsSimData);
  XLSX.utils.book_append_sheet(wb, wsSim, 'SIMULATION');

  XLSX.writeFile(wb, fname);
}

/**
 * Parse an imported Micro-Planning XLSX file
 */
export async function parseMicroXLSXFile(file: File): Promise<Partial<MicroPlanningData>> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  let parsedDailyRows: MicroDailyRow[] = [];
  let detectedDateKey = '12-10';

  // Find a daily sheet (e.g. '12-10', '10-10' or anything matching dd-mm)
  const dailySheetName = wb.SheetNames.find(
    (name) => /^\d{1,2}-\d{1,2}$/.test(name) || name.toUpperCase() !== 'SIMULATION'
  );

  if (dailySheetName && wb.Sheets[dailySheetName]) {
    detectedDateKey = dailySheetName;
    const rawData = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[dailySheetName], { header: 1 });
    let curChain = 'MARGUERITE 1';

    for (let i = 1; i < rawData.length; i++) {
      const r = rawData[i];
      if (!r || r.length === 0 || (!r[1] && !r[2])) continue;
      if (r[0] && r[0].toString().trim()) {
        curChain = r[0].toString().trim();
      }
      const ofVal = typeof r[2] === 'number' ? r[2] : parseFloat(r[2]) || 0;
      const realP = typeof r[3] === 'number' ? r[3] : parseFloat(r[3]) || 0;
      const cumulJ1 = typeof r[4] === 'number' ? r[4] : parseFloat(r[4]) || 0;
      const cumulP = typeof r[5] === 'number' ? r[5] : parseFloat(r[5]) || cumulJ1 + realP;
      const cumulCarton = typeof r[6] === 'number' ? r[6] : parseFloat(r[6]) || cumulP;
      const alimChaine = typeof r[7] === 'number' ? r[7] : parseFloat(r[7]) || 0;
      const prodCoupe = typeof r[8] === 'number' ? r[8] : parseFloat(r[8]) || 0;
      const cumulCoupe = typeof r[9] === 'number' ? r[9] : parseFloat(r[9]) || 0;
      const pctCoupe = typeof r[10] === 'number' ? r[10] : parseFloat(r[10]) || (ofVal > 0 ? cumulCoupe / ofVal : 0);
      const remarque = (r[11] || '').toString().trim();

      parsedDailyRows.push({
        id: 'mp_import_' + i,
        chaine: curChain,
        modele: (r[1] || '').toString().trim(),
        of: ofVal,
        realPacking: realP,
        cumulJ1: cumulJ1,
        cumulPacking: cumulP,
        cumulCarton: cumulCarton,
        alimChaine: alimChaine,
        prodCoupe: prodCoupe,
        cumulCoupe: cumulCoupe,
        pctCoupe: pctCoupe,
        remarque: remarque,
        date: detectedDateKey,
      });
    }
  }

  return {
    dailyTracking: {
      [detectedDateKey]: parsedDailyRows,
    },
    currentDateKey: detectedDateKey,
  };
}
