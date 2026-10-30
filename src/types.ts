export type OrderStatus = 'on_time' | 'at_risk' | 'delayed' | 'completed';
export type OrderPriority = 'P1' | 'P2' | 'P3';
export type ShiftType = 'morning' | 'afternoon' | 'night';

export interface ProductionOrder {
  id: string;
  code: string;               // Ex: CMD-2024-001
  client: string;             // Ex: Renault, Airbus, Sanofi...
  product: string;            // Ex: Pièce Usinée X-42
  lineId: string;             // Ex: LIGNE-1
  quantity: number;           // Quantité totale
  produced: number;           // Déjà produit
  cadencePerHour: number;     // Cadence en pièces / heure
  deadlineDate: string;       // Date limite de livraison client (YYYY-MM-DD)
  startDate: string;          // Date de début planifiée (YYYY-MM-DD)
  priority: OrderPriority;
  status: OrderStatus;
  notes?: string;
  
  // Calculés automatiquement
  remainingQty?: number;      // quantity - produced
  estimatedHours?: number;    // remainingQty / cadencePerHour
  estimatedEndDate?: string;  // Date estimée de fin selon capacité
  delayDays?: number;         // > 0 si retard par rapport à la deadline
}

export interface ProductionLine {
  id: string;
  name: string;               // Ex: Ligne 1 - Découpe & Poinçonnage
  category: string;           // Ex: Découpe, Usinage, Assemblage, Peinture
  defaultCadence: number;     // Cadence nominale pièces/heure
  capacityHoursPerDay: number;// Ex: 16h (2x8) ou 24h (3x8)
  efficiencyRate: number;     // Rendement / OEE (ex: 85%)
  color: string;              // Code couleur pour l'affichage visuel
}

export interface DispatchSlot {
  orderId: string;
  orderCode: string;
  client: string;
  product: string;
  lineId: string;
  date: string;               // YYYY-MM-DD
  shift: ShiftType;
  allocatedHours: number;
  plannedPieces: number;
  isOvertime?: boolean;
}

export interface BottleneckAlert {
  id: string;
  type: 'delay' | 'overload' | 'cadence_drop';
  severity: 'critical' | 'warning' | 'info';
  orderId?: string;
  orderCode?: string;
  client?: string;
  lineId: string;
  lineName: string;
  message: string;
  impact: string;
  suggestedSolutions: SolutionOption[];
}

export interface SolutionOption {
  id: string;
  title: string;
  description: string;
  actionType: 'add_overtime' | 'switch_line' | 'boost_cadence' | 'prioritize_order' | 'split_batch';
  targetOrderId?: string;
  targetLineId?: string;
  gainHoursOrDays: string;
}

export interface ProductionSettings {
  factoryName: string;
  workingDaysPerWeek: number; // 5 ou 6 jours
  shiftsPerDay: number;       // 1, 2 ou 3 shifts (8h chacun)
  dailyShiftHours: number;    // 8h par shift
  autoDispatchEnabled: boolean;
  algorithmMode: 'EDD' | 'SPT' | 'PRIORITY'; // Earliest Due Date, Shortest Processing Time, Priority
}

export interface ProductionReportKPI {
  totalOrders: number;
  completedOrders: number;
  onTimeOrders: number;
  atRiskOrders: number;
  delayedOrders: number;
  onTimeDeliveryRate: number; // OTD%
  totalPlannedPieces: number;
  totalProducedPieces: number;
  totalRequiredHours: number;
  averageCadence: number;
  overallOEE: number;
}
