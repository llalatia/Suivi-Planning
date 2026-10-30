import { ProductionOrder, ProductionLine, ProductionSettings } from '../types';

export const DEFAULT_PRODUCTION_LINES: ProductionLine[] = [
  {
    id: 'L1',
    name: 'Ligne 1 - Découpe & Laser',
    category: 'Découpe',
    defaultCadence: 120, // 120 pcs/h
    capacityHoursPerDay: 16, // 2x8
    efficiencyRate: 0.90,
    color: '#3b82f6', // blue
  },
  {
    id: 'L2',
    name: 'Ligne 2 - Usinage CNC Haute Précision',
    category: 'Usinage',
    defaultCadence: 45, // 45 pcs/h
    capacityHoursPerDay: 16, // 2x8
    efficiencyRate: 0.85,
    color: '#8b5cf6', // purple
  },
  {
    id: 'L3',
    name: 'Ligne 3 - Soudure & Assemblage',
    category: 'Assemblage',
    defaultCadence: 80, // 80 pcs/h
    capacityHoursPerDay: 16, // 2x8
    efficiencyRate: 0.88,
    color: '#10b981', // emerald
  },
  {
    id: 'L4',
    name: 'Ligne 4 - Finition, Contrôle & Emballage',
    category: 'Finition',
    defaultCadence: 200, // 200 pcs/h
    capacityHoursPerDay: 16, // 2x8
    efficiencyRate: 0.95,
    color: '#f59e0b', // amber
  },
];

export const DEFAULT_SETTINGS: ProductionSettings = {
  factoryName: 'Atelier de Production Mécanique & Plasturgie',
  workingDaysPerWeek: 5,
  shiftsPerDay: 2,
  dailyShiftHours: 8,
  autoDispatchEnabled: true,
  algorithmMode: 'EDD',
};

// Obtenir la date d'aujourd'hui et des dates relatives au format YYYY-MM-DD
export function getRelativeDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().split('T')[0];
}

export const INITIAL_ORDERS: ProductionOrder[] = [
  {
    id: 'ord-1',
    code: 'OF-2024-101',
    client: 'Airbus Industrie',
    product: 'Support Titane A350',
    lineId: 'L2',
    quantity: 600,
    produced: 250,
    cadencePerHour: 45,
    startDate: getRelativeDate(0),
    deadlineDate: getRelativeDate(3),
    priority: 'P1',
    status: 'on_time',
    notes: 'Contrôle qualité CMM requis après chaque lot',
  },
  {
    id: 'ord-2',
    code: 'OF-2024-102',
    client: 'Renault Group',
    product: 'Carter Différentiel Alu',
    lineId: 'L2',
    quantity: 1200,
    produced: 100,
    cadencePerHour: 45,
    startDate: getRelativeDate(1),
    deadlineDate: getRelativeDate(2), // Surcharge / Risque de retard !
    priority: 'P1',
    status: 'delayed',
    notes: 'Priorité ligne haute - Pénalité de retard contractuelle',
  },
  {
    id: 'ord-3',
    code: 'OF-2024-103',
    client: 'Alstom Transport',
    product: 'Plaque Châssis TGV M',
    lineId: 'L1',
    quantity: 1500,
    produced: 600,
    cadencePerHour: 120,
    startDate: getRelativeDate(0),
    deadlineDate: getRelativeDate(4),
    priority: 'P2',
    status: 'on_time',
    notes: 'Tôle acier 8mm certifiée',
  },
  {
    id: 'ord-4',
    code: 'OF-2024-104',
    client: 'Schneider Electric',
    product: 'Boîtier Armoire Tertiaire',
    lineId: 'L1',
    quantity: 2400,
    produced: 400,
    cadencePerHour: 120,
    startDate: getRelativeDate(2),
    deadlineDate: getRelativeDate(5),
    priority: 'P2',
    status: 'at_risk',
    notes: 'Série standard - Cadence stable',
  },
  {
    id: 'ord-5',
    code: 'OF-2024-105',
    client: 'Safran Nacelles',
    product: 'Bride Inconel Moteur',
    lineId: 'L3',
    quantity: 450,
    produced: 150,
    cadencePerHour: 80,
    startDate: getRelativeDate(0),
    deadlineDate: getRelativeDate(3),
    priority: 'P1',
    status: 'on_time',
    notes: 'Soudure TIG certifiée aéronautique',
  },
  {
    id: 'ord-6',
    code: 'OF-2024-106',
    client: 'Decathlon Cycles',
    product: 'Patte Fixation Dérailleur',
    lineId: 'L4',
    quantity: 3500,
    produced: 1200,
    cadencePerHour: 200,
    startDate: getRelativeDate(1),
    deadlineDate: getRelativeDate(6),
    priority: 'P3',
    status: 'on_time',
    notes: 'Emballage carton recyclé x50',
  },
  {
    id: 'ord-7',
    code: 'OF-2024-107',
    client: 'BioMérieux Labs',
    product: 'Châssis Analyseur Sang',
    lineId: 'L3',
    quantity: 800,
    produced: 0,
    cadencePerHour: 75,
    startDate: getRelativeDate(2),
    deadlineDate: getRelativeDate(4),
    priority: 'P2',
    status: 'at_risk',
    notes: 'Tolérances strictes ISO 13485',
  },
];

const STORAGE_KEYS = {
  ORDERS: 'optiprod_orders_v1',
  LINES: 'optiprod_lines_v1',
  SETTINGS: 'optiprod_settings_v1',
  LAST_SYNC: 'optiprod_last_sync_v1',
};

export function loadSavedOrders(): ProductionOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading orders from localStorage:', e);
  }
  return INITIAL_ORDERS;
}

export function saveOrders(orders: ProductionOrder[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  } catch (e) {
    console.error('Error saving orders to localStorage:', e);
  }
}

export function loadSavedLines(): ProductionLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LINES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading lines from localStorage:', e);
  }
  return DEFAULT_PRODUCTION_LINES;
}

export function saveLines(lines: ProductionLine[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LINES, JSON.stringify(lines));
  } catch (e) {
    console.error('Error saving lines to localStorage:', e);
  }
}

export function loadSavedSettings(): ProductionSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Error loading settings from localStorage:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: ProductionSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings to localStorage:', e);
  }
}

export function resetToDefaults(): { orders: ProductionOrder[]; lines: ProductionLine[]; settings: ProductionSettings } {
  localStorage.removeItem(STORAGE_KEYS.ORDERS);
  localStorage.removeItem(STORAGE_KEYS.LINES);
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
  return {
    orders: INITIAL_ORDERS,
    lines: DEFAULT_PRODUCTION_LINES,
    settings: DEFAULT_SETTINGS,
  };
}
