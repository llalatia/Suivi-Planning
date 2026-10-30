import * as XLSX from 'xlsx';
import { PlanningData, Commande, Semaine, PlanningCell } from '../data/initialData';
import { qteResteAFaire, nbHeuresExact, nbBrodeusesExact, HEURES_PAR_BRODEUSE_SEMAINE } from './macroLogic';

/**
 * Export to XLSX matching exactly MACRO-PLANNING BROD TRADI S34.xlsx structure (Rows 1 to 57)
 */
export function exportPlanningToXLSX(data: PlanningData, filename?: string) {
  const currentWeek = data.config.semaine_courante || 'S34';
  const fname = filename || `MACRO-PLANNING_BROD_TRADI_${currentWeek}.xlsx`;

  const wb = XLSX.utils.book_new();
  const wsData: (string | number | null)[][] = [];

  // Row 1 (Index 0): Title
  const row1: (string | number | null)[] = [null, 'Planning BRODERIE TRADITIONNELLE'];
  wsData.push(row1);

  // Row 2 (Index 1): Current week
  const row2: (string | number | null)[] = [null, currentWeek];
  wsData.push(row2);

  // Row 3 (Index 2): Dates per week (each week spans 3 columns: brodeuses, heures, pieces)
  const row3: (string | number | null)[] = [null, ' ', null, null, null, null, null, null];
  data.semaines.forEach((s) => {
    row3.push(s.date_label || s.date_debut, null, null);
  });
  wsData.push(row3);

  // Row 4 (Index 3): Week codes
  const row4: (string | number | null)[] = [null, null, null, null, null, null, null, null];
  data.semaines.forEach((s) => {
    row4.push(s.code, null, null);
  });
  wsData.push(row4);

  // Row 5 (Index 4): Headers
  const row5: (string | number | null)[] = [
    'CLIENT',
    'MODELE',
    'QTE EN \r\nCOMMANDE',
    'UNITE',
    'HEURE / PCS',
    'QTE FINIE',
    'QTE RESTE\r\n A FAIRE',
    'PIECES PROGRAMMES DANS LE PLANNING',
  ];
  data.semaines.forEach(() => {
    row5.push('Nb brodeuses', "Nb d'heures", 'Nb pièces ');
  });
  wsData.push(row5);

  // Planning map: [cmdId_semId] -> cell
  const planningMap = new Map<string, PlanningCell>();
  data.planning.forEach((p) => {
    planningMap.set(`${p.commande_id}_${p.semaine_id}`, p);
  });

  // Rows 6 to 49 Data rows
  data.commandes.forEach((c) => {
    const reste = qteResteAFaire(c.qte_commande, c.qte_finie);

    let totalPlanned = 0;
    const weekCells: (number | null)[] = [];

    data.semaines.forEach((s) => {
      const p = planningMap.get(`${c.id}_${s.id}`);
      const pieces = p && p.nb_pieces ? p.nb_pieces : 0;
      totalPlanned += pieces;

      const heures =
        pieces > 0 && !c.heure_pcs_tbc && c.heure_pcs
          ? nbHeuresExact(pieces, c.heure_pcs)
          : null;
      const brodeusesExact =
        heures !== null ? nbBrodeusesExact(heures, p?.manual_brodeuses) : null;
      const brodeusesDisplay =
        brodeusesExact !== null ? Math.round(brodeusesExact) : null;

      weekCells.push(brodeusesDisplay, heures, pieces > 0 ? pieces : null);
    });

    const isBlankTbc = c.heure_pcs_tbc === 1 && totalPlanned === 0 && (c.qte_finie || 0) === 0;

    const row: (string | number | null)[] = [
      c.client,
      c.modele,
      c.qte_commande,
      c.unite || 'PCS',
      c.heure_pcs_tbc ? 'TBC' : c.heure_pcs,
      isBlankTbc ? null : c.qte_finie || 0,
      isBlankTbc ? null : reste,
      isBlankTbc ? null : totalPlanned,
      ...weekCells,
    ];
    wsData.push(row);
  });

  // Row 50: Empty separator row
  wsData.push([]);

  // Row 51: Totals row (SUM Brodeuses, SUM Heures, SUM Pièces)
  const row51: (string | number | null)[] = [null, null, null, null, null, null, null, null];
  // Row 52: Capacité 42 & Écart Heures
  const row52: (string | number | null)[] = [null, null, null, null, null, null, null, null];
  // Row 53: GLISSEMEMENT VS PLANNING
  const row53: (string | number | null)[] = [null, 'GLISSEMEMENT VS PLANNING'];
  // Row 54: Semaine en cours & Demi-charge (/2)
  const row54: (string | number | null)[] = [null, 'Semaine en cours', null, null, null, null, null, null];

  data.semaines.forEach((s) => {
    let semPieces = 0;
    let semHeures = 0;
    let semBrodeusesExact = 0;

    data.commandes.forEach((c) => {
      const p = planningMap.get(`${c.id}_${s.id}`);
      const pieces = p && p.nb_pieces ? p.nb_pieces : 0;
      semPieces += pieces;
      if (pieces > 0 && !c.heure_pcs_tbc && c.heure_pcs) {
        const h = pieces * c.heure_pcs;
        semHeures += h;
        const b =
          p?.manual_brodeuses !== null && p?.manual_brodeuses !== undefined
            ? p.manual_brodeuses
            : h / HEURES_PAR_BRODEUSE_SEMAINE;
        semBrodeusesExact += b;
      }
    });

    const effectif = s.effectif_dispo ?? 42;
    const ecartHeures = Math.round((semHeures - effectif * HEURES_PAR_BRODEUSE_SEMAINE) * 100) / 100;

    row51.push(
      Math.round(semBrodeusesExact),
      Math.round(semHeures * 100) / 100,
      semPieces > 0 ? semPieces : null
    );
    row52.push(effectif, ecartHeures, null);
    row54.push(Math.round(semBrodeusesExact / 2), null, null);
  });

  wsData.push(row51);
  wsData.push(row52);
  wsData.push(row53);
  wsData.push(row54);
  wsData.push([null, 'Semaine De Lancement']);
  wsData.push([null, 'Limite Livraison Client']);
  wsData.push([null, 'SST']);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Define merges
  ws['!merges'] = [{ s: { r: 0, c: 1 }, e: { r: 0, c: 4 } }];
  data.semaines.forEach((_, idx) => {
    const startCol = 8 + idx * 3;
    ws['!merges']!.push({ s: { r: 2, c: startCol }, e: { r: 2, c: startCol + 2 } });
    ws['!merges']!.push({ s: { r: 3, c: startCol }, e: { r: 3, c: startCol + 2 } });
  });

  const colWidths = [
    { wch: 24 }, // A: CLIENT
    { wch: 34 }, // B: MODELE
    { wch: 13 }, // C: QTE EN COMMANDE
    { wch: 8 },  // D: UNITE
    { wch: 12 }, // E: HEURE / PCS
    { wch: 10 }, // F: QTE FINIE
    { wch: 13 }, // G: RESTE A FAIRE
    { wch: 16 }, // H: PROGRAMMES
  ];
  data.semaines.forEach(() => {
    colWidths.push({ wch: 11 }, { wch: 11 }, { wch: 11 });
  });
  ws['!cols'] = colWidths;

  const sheetName = `MAJ ${currentWeek}`.substring(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  XLSX.writeFile(wb, fname);
}

/**
 * Parse an uploaded .xlsx file
 */
export async function parseXLSXFile(file: File): Promise<Partial<PlanningData>> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  const jsonData = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: false });
  if (!jsonData || jsonData.length < 5) {
    throw new Error("Le fichier Excel ne contient pas suffisamment de lignes pour un Macro-Planning.");
  }

  let weekRowIdx = -1;
  let dateRowIdx = -1;
  for (let r = 0; r < Math.min(10, jsonData.length); r++) {
    const row = jsonData[r];
    if (row && row.some((val: any) => typeof val === 'string' && /^S\d{1,2}$/i.test(val.trim()))) {
      weekRowIdx = r;
      if (r > 0) dateRowIdx = r - 1;
      break;
    }
  }

  if (weekRowIdx === -1) {
    throw new Error("Impossible de détecter les codes de semaines (ex: 'S34') dans les 10 premières lignes.");
  }

  let headerRowIdx = -1;
  for (let r = weekRowIdx; r < Math.min(weekRowIdx + 4, jsonData.length); r++) {
    const row = jsonData[r];
    if (row && row.some((val: any) => typeof val === 'string' && val.toLowerCase().includes('brodeuse'))) {
      headerRowIdx = r;
      break;
    }
  }

  if (headerRowIdx === -1) {
    headerRowIdx = weekRowIdx + 1;
  }

  const headerRow = jsonData[headerRowIdx] || [];
  const weekRow = jsonData[weekRowIdx] || [];
  const dateRow = dateRowIdx >= 0 ? jsonData[dateRowIdx] || [] : [];

  const parsedSemaines: Semaine[] = [];
  const weekColMap: { colPieces: number; semaineId: number }[] = [];

  for (let c = 0; c < headerRow.length; c++) {
    const lbl = String(headerRow[c] || '').toLowerCase();
    if (lbl.includes('pièce') || lbl.includes('piece')) {
      const codeVal = weekRow[c - 2] || weekRow[c - 1] || weekRow[c];
      const dateVal = dateRow[c - 2] || dateRow[c - 1] || dateRow[c] || '';
      const code = String(codeVal || `S${parsedSemaines.length + 29}`).trim();

      const semId = parsedSemaines.length + 1;
      parsedSemaines.push({
        id: semId,
        code,
        date_debut: String(dateVal).trim() || `2026-S${semId}`,
        date_label: String(dateVal).trim(),
        ordre: parsedSemaines.length,
        effectif_dispo: 42,
      });
      weekColMap.push({ colPieces: c, semaineId: semId });
    }
  }

  const fixedCols: { [key: string]: number } = {
    client: 0,
    modele: 1,
    qte_commande: 2,
    unite: 3,
    heure_pcs: 4,
    qte_finie: 5,
  };

  for (let c = 0; c < Math.min(10, headerRow.length); c++) {
    const txt = String(headerRow[c] || '').toLowerCase();
    if (txt.includes('client')) fixedCols.client = c;
    if (txt.includes('model') || txt.includes('modèle')) fixedCols.modele = c;
    if (txt.includes('commande')) fixedCols.qte_commande = c;
    if (txt.includes('unit')) fixedCols.unite = c;
    if (txt.includes('heure')) fixedCols.heure_pcs = c;
    if (txt.includes('finie')) fixedCols.qte_finie = c;
  }

  const parsedCommandes: Commande[] = [];
  const parsedPlanning: PlanningCell[] = [];
  let cellId = 1;

  for (let r = headerRowIdx + 1; r < jsonData.length; r++) {
    const row = jsonData[r];
    if (!row) continue;

    const client = String(row[fixedCols.client] || '').trim();
    const modele = String(row[fixedCols.modele] || '').trim();

    if (!client && !modele) continue;
    if (
      client.toLowerCase().includes('totaux') ||
      modele.toLowerCase().includes('totaux') ||
      modele.toLowerCase().includes('glissement') ||
      modele.toLowerCase().includes('glissemement')
    ) {
      break;
    }

    const qteCommande = parseFloat(String(row[fixedCols.qte_commande] || '0').replace(',', '.')) || 0;
    const unite = String(row[fixedCols.unite] || 'PCS').trim() || 'PCS';
    const heureRaw = String(row[fixedCols.heure_pcs] || '').trim().toUpperCase();
    const isTbc = heureRaw.includes('TBC') || heureRaw === '?';
    const heurePcs = isTbc ? null : parseFloat(heureRaw.replace(',', '.')) || null;
    const qteFinie = parseFloat(String(row[fixedCols.qte_finie] || '0').replace(',', '.')) || 0;

    const cmdId = parsedCommandes.length + 1;
    parsedCommandes.push({
      id: cmdId,
      client,
      modele,
      qte_commande: qteCommande,
      unite,
      heure_pcs: heurePcs,
      heure_pcs_tbc: isTbc ? 1 : 0,
      qte_finie: qteFinie,
      date_limite_client: null,
      date_lancement: null,
      notes: null,
      ordre: parsedCommandes.length,
      archive: 0,
      row_color: 'normal',
    });

    weekColMap.forEach((wc) => {
      const val = row[wc.colPieces];
      if (val !== undefined && val !== null && val !== '') {
        const pieces = parseFloat(String(val).replace(',', '.')) || 0;
        if (pieces > 0) {
          parsedPlanning.push({
            id: cellId++,
            commande_id: cmdId,
            semaine_id: wc.semaineId,
            nb_pieces: pieces,
            statut: 'normal',
          });
        }
      }
    });
  }

  return {
    semaines: parsedSemaines.length > 0 ? parsedSemaines : undefined,
    commandes: parsedCommandes,
    planning: parsedPlanning,
    config: {
      semaine_courante: parsedSemaines[5]?.code || parsedSemaines[0]?.code || 'S34',
    },
  };
}
