import * as XLSX from 'xlsx';
import { ProductionOrder, ProductionLine, ProductionSettings, ProductionReportKPI } from '../types';
import { recalculateOrderMetrics } from './dispatchEngine';

/**
 * Lit et parse un fichier .xlsx déposé ou sélectionné par l'utilisateur
 */
export async function parseExcelFile(
  file: File,
  lines: ProductionLine[],
  settings: ProductionSettings
): Promise<{ orders: ProductionOrder[]; importedCount: number; sheetNames: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetNames = workbook.SheetNames;

        if (sheetNames.length === 0) {
          throw new Error('Le classeur Excel ne contient aucune feuille de calcul.');
        }

        // Utiliser la première feuille ou celle nommée 'Ordres' / 'Planning'
        const targetSheetName =
          sheetNames.find((s) => /ordre|planning|production|of/i.test(s)) || sheetNames[0];
        const worksheet = workbook.Sheets[targetSheetName];

        // Convertir en JSON (lignes brutes)
        const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
          defval: '',
          raw: false,
        });

        if (rawRows.length === 0) {
          throw new Error('La feuille sélectionnée ne contient pas de lignes de données exploitables.');
        }

        const lineMap = new Map(lines.map((l) => [l.id.toLowerCase(), l.id]));
        lines.forEach((l) => lineMap.set(l.name.toLowerCase(), l.id));

        const parsedOrders: ProductionOrder[] = [];
        const todayStr = new Date().toISOString().split('T')[0];

        rawRows.forEach((row, index) => {
          // Détection intelligente des colonnes selon noms courants
          const code =
            row['Code'] ||
            row['Code OF'] ||
            row['OF'] ||
            row['Réf'] ||
            row['Référence'] ||
            row['Commande'] ||
            `OF-IMP-${100 + index}`;

          const client =
            row['Client'] || row['Nom Client'] || row['Destinataire'] || 'Client Industriel';

          const product =
            row['Produit'] || row['Article'] || row['Désignation'] || row['Pièce'] || 'Pièce Série';

          const rawLine = (row['Ligne'] || row['Machine'] || row['Poste'] || 'L1').toString().trim();
          const lineId = lineMap.get(rawLine.toLowerCase()) || lines[0]?.id || 'L1';

          const quantity = Math.max(1, parseInt(row['Quantité'] || row['Qté'] || row['Qte'] || row['Total'] || '100', 10));
          const produced = Math.max(0, parseInt(row['Produit'] || row['Fait'] || row['Déjà Produit'] || '0', 10));

          const cadence = Math.max(
            1,
            parseInt(row['Cadence'] || row['Cadence (pcs/h)'] || row['Pcs/h'] || '60', 10)
          );

          // Dates
          let deadline = row['Date Limite'] || row['Deadline'] || row['Date Livraison'] || row['Échéance'];
          let start = row['Date Début'] || row['Début'] || todayStr;

          // Normalisation date
          if (deadline instanceof Date) {
            deadline = deadline.toISOString().split('T')[0];
          } else if (typeof deadline === 'string' && deadline.includes('/')) {
            const parts = deadline.split('/');
            if (parts.length === 3) {
              deadline = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
          if (!deadline || typeof deadline !== 'string' || !deadline.includes('-')) {
            const d = new Date();
            d.setDate(d.getDate() + 5);
            deadline = d.toISOString().split('T')[0];
          }

          if (start instanceof Date) {
            start = start.toISOString().split('T')[0];
          } else if (typeof start === 'string' && start.includes('/')) {
            const parts = start.split('/');
            if (parts.length === 3) {
              start = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
          if (!start || typeof start !== 'string' || !start.includes('-')) {
            start = todayStr;
          }

          const rawPriority = (row['Priorité'] || row['Prio'] || 'P2').toString().toUpperCase();
          const priority = ['P1', 'P2', 'P3'].includes(rawPriority) ? (rawPriority as 'P1' | 'P2' | 'P3') : 'P2';

          parsedOrders.push({
            id: `imp-${Date.now()}-${index}`,
            code: String(code),
            client: String(client),
            product: String(product),
            lineId,
            quantity,
            produced,
            cadencePerHour: cadence,
            startDate: start,
            deadlineDate: deadline,
            priority,
            status: 'on_time',
            notes: row['Notes'] || row['Commentaire'] || '',
          });
        });

        // Recalcul des métriques
        const recalculated = recalculateOrderMetrics(parsedOrders, lines, settings);
        resolve({
          orders: recalculated,
          importedCount: recalculated.length,
          sheetNames,
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Exporte l'ensemble du planning de production, des cadences et du dispatch vers un fichier .xlsx complet et multi-feuilles
 */
export function exportProductionToExcel(
  orders: ProductionOrder[],
  lines: ProductionLine[],
  kpis: ProductionReportKPI,
  fileName = 'Planning_Production_OptiProd.xlsx'
): void {
  const lineMap = new Map(lines.map((l) => [l.id, l]));

  // Feuille 1 : Ordres de fabrication complets
  const sheet1Data = orders.map((o) => {
    const line = lineMap.get(o.lineId);
    return {
      'Code OF': o.code,
      'Client': o.client,
      'Produit / Référence': o.product,
      'Ligne de Production': line ? line.name : o.lineId,
      'Priorité': o.priority,
      'Quantité Totale': o.quantity,
      'Déjà Produit': o.produced,
      'Reste à Produire': o.remainingQty || Math.max(0, o.quantity - o.produced),
      'Cadence Nominale (pcs/h)': o.cadencePerHour,
      'Heures de Fabrication Requises': o.estimatedHours || 0,
      'Date Début': o.startDate,
      'Date Fin Estimée': o.estimatedEndDate || '',
      'Date Limite Client (Deadline)': o.deadlineDate,
      'Statut':
        o.status === 'on_time'
          ? 'À l\'heure'
          : o.status === 'delayed'
          ? `RETARD CRITIQUE (${o.delayDays}j)`
          : o.status === 'at_risk'
          ? 'À risque (vigilance)'
          : 'Terminé',
      'Notes & Instructions': o.notes || '',
    };
  });

  // Feuille 2 : Dispatch Quotidien & Hebdomadaire
  const sheet2Data: Record<string, any>[] = [];
  lines.forEach((line) => {
    const lineOrders = orders.filter((o) => o.lineId === line.id && o.status !== 'completed');
    let allocated = 0;
    lineOrders.forEach((o) => {
      sheet2Data.push({
        'Ligne': line.name,
        'Code Commande': o.code,
        'Client': o.client,
        'Produit': o.product,
        'Quantité à Fabriquer': o.remainingQty,
        'Cadence (pcs/h)': o.cadencePerHour,
        'Heures Assignées': o.estimatedHours,
        'Shift Recommandé': allocated < 8 ? 'Équipe Matin (06h - 14h)' : 'Équipe Après-midi (14h - 22h)',
        'Deadline Client': o.deadlineDate,
        'Risque': o.status === 'delayed' ? 'ALERTE RETARD' : 'OK',
      });
      allocated += (o.estimatedHours || 0);
    });
  });

  // Feuille 3 : Synthèse Capacitaire des Lignes
  const sheet3Data = lines.map((line) => {
    const lineOrders = orders.filter((o) => o.lineId === line.id && o.status !== 'completed');
    const totalHours = lineOrders.reduce((acc, o) => acc + (o.estimatedHours || 0), 0);
    const weeklyCapacity = line.capacityHoursPerDay * 5;
    const loadPercent = Math.round((totalHours / Math.max(1, weeklyCapacity)) * 100);

    return {
      'Code Ligne': line.id,
      'Nom de la Ligne': line.name,
      'Secteur / Atelier': line.category,
      'Cadence Standard (pcs/h)': line.defaultCadence,
      'Capacité Journalière (h/j)': line.capacityHoursPerDay,
      'Rendement TRS / OEE': `${Math.round(line.efficiencyRate * 100)}%`,
      'Charge Totale Planifiée (h)': Math.round(totalHours * 10) / 10,
      'Capacité Hebdomadaire (h)': weeklyCapacity,
      'Taux de Charge (%)': `${loadPercent}%`,
      'Diagnostic': loadPercent > 100 ? 'SURCHARGE - Goulot d\'étranglement' : loadPercent > 80 ? 'Optimal' : 'Sous-charge',
    };
  });

  // Feuille 4 : Synthèse KPI & Cadence
  const sheet4Data = [
    { 'Indicateur Clé (KPI)': 'Taux de Respect des Délais Clients (OTD)', 'Valeur': `${kpis.onTimeDeliveryRate}%` },
    { 'Indicateur Clé (KPI)': 'Total Ordres de Fabrication', 'Valeur': kpis.totalOrders },
    { 'Indicateur Clé (KPI)': 'Ordres à l\'heure', 'Valeur': kpis.onTimeOrders },
    { 'Indicateur Clé (KPI)': 'Ordres à Risque de Retard', 'Valeur': kpis.atRiskOrders },
    { 'Indicateur Clé (KPI)': 'Ordres en Retard Critique', 'Valeur': kpis.delayedOrders },
    { 'Indicateur Clé (KPI)': 'Volume Total de Pièces Planifiées', 'Valeur': kpis.totalPlannedPieces },
    { 'Indicateur Clé (KPI)': 'Volume Total Déjà Réalisé', 'Valeur': kpis.totalProducedPieces },
    { 'Indicateur Clé (KPI)': 'Heures de Fabrication Restantes', 'Valeur': `${kpis.totalRequiredHours} h` },
    { 'Indicateur Clé (KPI)': 'Cadence Moyenne de l\'Atelier', 'Valeur': `${kpis.averageCadence} pièces/h` },
    { 'Indicateur Clé (KPI)': 'Efficacité Globale Estimée (TRS)', 'Valeur': `${kpis.overallOEE}%` },
  ];

  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
  const ws2 = XLSX.utils.json_to_sheet(sheet2Data);
  const ws3 = XLSX.utils.json_to_sheet(sheet3Data);
  const ws4 = XLSX.utils.json_to_sheet(sheet4Data);

  // Largeurs de colonnes esthétiques
  ws1['!cols'] = [
    { wch: 14 }, { wch: 20 }, { wch: 26 }, { wch: 28 }, { wch: 10 },
    { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 24 }, { wch: 26 },
    { wch: 14 }, { wch: 16 }, { wch: 24 }, { wch: 24 }, { wch: 30 }
  ];

  XLSX.utils.book_append_sheet(wb, ws1, 'Ordres_Fabrication');
  XLSX.utils.book_append_sheet(wb, ws2, 'Dispatch_Equipes');
  XLSX.utils.book_append_sheet(wb, ws3, 'Capacite_Machines');
  XLSX.utils.book_append_sheet(wb, ws4, 'Rapport_Cadence_KPI');

  XLSX.writeFile(wb, fileName);
}

/**
 * Télécharge un modèle Excel vierge prêt à être rempli par le client
 */
export function downloadExcelTemplate(): void {
  const templateData = [
    {
      'Code OF': 'OF-2024-001',
      'Client': 'Client Exemple SAS',
      'Produit': 'Pièce Modèle A',
      'Ligne': 'L1',
      'Quantité': 1000,
      'Déjà Produit': 200,
      'Cadence': 100,
      'Date Début': new Date().toISOString().split('T')[0],
      'Date Limite': new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      'Priorité': 'P1',
      'Notes': 'Exemple à personnaliser',
    },
    {
      'Code OF': 'OF-2024-002',
      'Client': 'Client Exemple 2',
      'Produit': 'Sous-ensemble B',
      'Ligne': 'L2',
      'Quantité': 500,
      'Déjà Produit': 0,
      'Cadence': 50,
      'Date Début': new Date().toISOString().split('T')[0],
      'Date Limite': new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      'Priorité': 'P2',
      'Notes': 'Priorité normale',
    },
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(templateData);
  ws['!cols'] = [
    { wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 12 },
    { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 24 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Modele_Planning');
  XLSX.writeFile(wb, 'Modele_Planning_Production.xlsx');
}
