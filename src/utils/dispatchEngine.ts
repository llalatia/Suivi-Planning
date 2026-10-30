import {
  ProductionOrder,
  ProductionLine,
  ProductionSettings,
  DispatchSlot,
  BottleneckAlert,
  SolutionOption,
  ProductionReportKPI,
  ShiftType,
} from '../types';

/**
 * Calcule les métriques de base pour chaque ordre :
 * - Quantité restante
 * - Heures requises selon cadence nominale et rendement ligne
 * - Date d'achèvement projetée
 * - Statut de ponctualité (on_time, at_risk, delayed, completed)
 */
export function recalculateOrderMetrics(
  orders: ProductionOrder[],
  lines: ProductionLine[],
  settings: ProductionSettings
): ProductionOrder[] {
  const lineMap = new Map(lines.map((l) => [l.id, l]));

  return orders.map((order) => {
    const line = lineMap.get(order.lineId);
    const efficiency = line?.efficiencyRate || 0.9;
    const dailyCapHours = line?.capacityHoursPerDay || (settings.shiftsPerDay * settings.dailyShiftHours);
    
    const remainingQty = Math.max(0, order.quantity - order.produced);
    const cadence = order.cadencePerHour > 0 ? order.cadencePerHour : (line?.defaultCadence || 50);
    
    // Heures nécessaires = Reste / (cadence * rendement)
    const estimatedHours = remainingQty === 0 ? 0 : Math.round((remainingQty / (cadence * efficiency)) * 10) / 10;
    
    // Calcul de la date d'achèvement estimée
    const start = new Date(order.startDate);
    const daysNeeded = Math.ceil(estimatedHours / Math.max(1, dailyCapHours));
    const estimatedEnd = new Date(start);
    estimatedEnd.setDate(estimatedEnd.getDate() + Math.max(0, daysNeeded - 1));
    const estimatedEndDate = estimatedEnd.toISOString().split('T')[0];

    const deadline = new Date(order.deadlineDate);
    const diffMs = deadline.getTime() - estimatedEnd.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    let status = order.status;
    let delayDays = 0;

    if (remainingQty === 0) {
      status = 'completed';
    } else if (diffDays < 0) {
      status = 'delayed';
      delayDays = Math.abs(diffDays);
    } else if (diffDays <= 1) {
      status = 'at_risk';
    } else {
      status = 'on_time';
    }

    return {
      ...order,
      remainingQty,
      cadencePerHour: cadence,
      estimatedHours,
      estimatedEndDate,
      delayDays,
      status,
    };
  });
}

/**
 * Optimisation du Dispatch (Anti-Retard) :
 * Réordonne les tâches par ligne selon la règle EDD (Earliest Due Date) combinée à la priorité
 * pour minimiser et éliminer les retards clients.
 */
export function optimizeDispatch(
  orders: ProductionOrder[],
  lines: ProductionLine[],
  settings: ProductionSettings
): ProductionOrder[] {
  const lineMap = new Map(lines.map((l) => [l.id, l]));
  const ordersByLine = new Map<string, ProductionOrder[]>();

  // Grouper par ligne
  for (const order of orders) {
    if (order.status === 'completed') continue;
    const list = ordersByLine.get(order.lineId) || [];
    list.push({ ...order });
    ordersByLine.set(order.lineId, list);
  }

  const updatedOrders: ProductionOrder[] = [];
  const completedOrders = orders.filter((o) => o.status === 'completed');

  // Pour chaque ligne, appliquer l'ordonnancement anti-retard
  ordersByLine.forEach((lineOrders, lineId) => {
    const line = lineMap.get(lineId);
    const dailyCapHours = line?.capacityHoursPerDay || (settings.shiftsPerDay * settings.dailyShiftHours);
    const efficiency = line?.efficiencyRate || 0.9;

    // Trier selon priorité (P1 > P2 > P3) puis Earliest Due Date
    lineOrders.sort((a, b) => {
      const pScore = { P1: 1, P2: 2, P3: 3 };
      if (pScore[a.priority] !== pScore[b.priority]) {
        return pScore[a.priority] - pScore[b.priority];
      }
      return new Date(a.deadlineDate).getTime() - new Date(b.deadlineDate).getTime();
    });

    // Recalculer les dates séquentielles de début et de fin
    let cursorDate = new Date();
    cursorDate.setHours(0, 0, 0, 0);

    for (const ord of lineOrders) {
      const remainingQty = Math.max(0, ord.quantity - ord.produced);
      const cadence = ord.cadencePerHour || line?.defaultCadence || 50;
      const hoursNeeded = Math.round((remainingQty / (cadence * efficiency)) * 10) / 10;
      const daysNeeded = Math.max(1, Math.ceil(hoursNeeded / dailyCapHours));

      ord.startDate = cursorDate.toISOString().split('T')[0];
      const endDate = new Date(cursorDate);
      endDate.setDate(endDate.getDate() + (daysNeeded - 1));
      ord.estimatedEndDate = endDate.toISOString().split('T')[0];
      ord.estimatedHours = hoursNeeded;

      // Avancer le curseur pour la commande suivante
      cursorDate = new Date(endDate);
      cursorDate.setDate(cursorDate.getDate() + 1);

      // Calcul statut de retard
      const deadline = new Date(ord.deadlineDate);
      const diffDays = Math.round((deadline.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));

      if (remainingQty === 0) {
        ord.status = 'completed';
        ord.delayDays = 0;
      } else if (diffDays < 0) {
        ord.status = 'delayed';
        ord.delayDays = Math.abs(diffDays);
      } else if (diffDays <= 1) {
        ord.status = 'at_risk';
        ord.delayDays = 0;
      } else {
        ord.status = 'on_time';
        ord.delayDays = 0;
      }

      updatedOrders.push(ord);
    }
  });

  return [...completedOrders, ...updatedOrders];
}

/**
 * Détection des goulots d'étranglement et génération des propositions d'actions
 */
export function generateBottleneckAlerts(
  orders: ProductionOrder[],
  lines: ProductionLine[],
  settings: ProductionSettings
): BottleneckAlert[] {
  const alerts: BottleneckAlert[] = [];
  const lineMap = new Map(lines.map((l) => [l.id, l]));

  // 1. Détection des retards clients
  const delayedOrders = orders.filter((o) => o.status === 'delayed');
  for (const ord of delayedOrders) {
    const line = lineMap.get(ord.lineId);
    const lineName = line?.name || ord.lineId;
    const delay = ord.delayDays || 1;

    // Trouver une ligne alternative éventuelle
    const alternativeLines = lines.filter((l) => l.id !== ord.lineId && l.category === line?.category);

    const solutions: SolutionOption[] = [
      {
        id: `sol-ot-${ord.id}`,
        title: 'Ajouter des Heures Supplémentaires (Shift Week-end / Nuit)',
        description: `Activer 1 shift supplémentaire (+8h) sur ${lineName} pour absorber le retard de ${delay} jour(s).`,
        actionType: 'add_overtime',
        targetOrderId: ord.id,
        targetLineId: ord.lineId,
        gainHoursOrDays: 'Gain estimé : 8h (-1 jour de retard)',
      },
      {
        id: `sol-boost-${ord.id}`,
        title: 'Booster la Cadence (+15% cadence cible)',
        description: `Passer la cadence de ${ord.cadencePerHour} pcs/h à ${Math.round(ord.cadencePerHour * 1.15)} pcs/h via optimisation des montages.`,
        actionType: 'boost_cadence',
        targetOrderId: ord.id,
        targetLineId: ord.lineId,
        gainHoursOrDays: 'Gain : réduit la durée de fabrication',
      },
      {
        id: `sol-prio-${ord.id}`,
        title: 'Repasser en Priorité P1 Immédiate',
        description: `Passer cette commande client (${ord.client}) en tête de file sur ${lineName}.`,
        actionType: 'prioritize_order',
        targetOrderId: ord.id,
        targetLineId: ord.lineId,
        gainHoursOrDays: 'Démarrage prioritaire le jour même',
      },
    ];

    if (alternativeLines.length > 0) {
      solutions.push({
        id: `sol-switch-${ord.id}`,
        title: `Basculer sur ${alternativeLines[0].name}`,
        description: `Transférer la commande sur la ligne alternative ${alternativeLines[0].name} moins chargée.`,
        actionType: 'switch_line',
        targetOrderId: ord.id,
        targetLineId: alternativeLines[0].id,
        gainHoursOrDays: 'Répartition équilibrée de la charge',
      });
    }

    alerts.push({
      id: `alert-delay-${ord.id}`,
      type: 'delay',
      severity: 'critical',
      orderId: ord.id,
      orderCode: ord.code,
      client: ord.client,
      lineId: ord.lineId,
      lineName,
      message: `Retard client critique prévu : ${delay} jour(s) de dérive`,
      impact: `Le client ${ord.client} risque de ne pas être livré à temps (Deadline : ${ord.deadlineDate}, Fin estimée : ${ord.estimatedEndDate})`,
      suggestedSolutions: solutions,
    });
  }

  // 2. Détection des lignes surchargées (charge totale > 100% de la capacité sur 5 jours)
  for (const line of lines) {
    const activeLineOrders = orders.filter((o) => o.lineId === line.id && o.status !== 'completed');
    const totalHoursRequired = activeLineOrders.reduce((acc, o) => acc + (o.estimatedHours || 0), 0);
    const weeklyLineCapacity = line.capacityHoursPerDay * settings.workingDaysPerWeek;
    const loadPercent = Math.round((totalHoursRequired / Math.max(1, weeklyLineCapacity)) * 100);

    if (loadPercent > 105) {
      alerts.push({
        id: `alert-overload-${line.id}`,
        type: 'overload',
        severity: 'warning',
        lineId: line.id,
        lineName: line.name,
        message: `Surcharge machine détectée (${loadPercent}% de capacité hebdo)`,
        impact: `${totalHoursRequired}h requises vs ${weeklyLineCapacity}h disponibles sur la semaine.`,
        suggestedSolutions: [
          {
            id: `sol-overload-shift-${line.id}`,
            title: 'Passer la ligne en 3x8 (Ajouter équipe de nuit)',
            description: `Augmenter la capacité journalière de ${line.capacityHoursPerDay}h à 24h/jour.`,
            actionType: 'add_overtime',
            targetLineId: line.id,
            gainHoursOrDays: `+${8 * settings.workingDaysPerWeek}h de capacité hebdomadaire`,
          },
        ],
      });
    }
  }

  return alerts;
}

/**
 * Applique une solution préconisée en 1 clic
 */
export function applySolution(
  solution: SolutionOption,
  orders: ProductionOrder[],
  lines: ProductionLine[],
  settings: ProductionSettings
): { updatedOrders: ProductionOrder[]; updatedLines: ProductionLine[] } {
  let updatedOrders = [...orders];
  let updatedLines = [...lines];

  if (solution.actionType === 'add_overtime' && solution.targetLineId) {
    // Augmente la capacité journalière de la ligne
    updatedLines = updatedLines.map((l) => {
      if (l.id === solution.targetLineId) {
        return {
          ...l,
          capacityHoursPerDay: Math.min(24, l.capacityHoursPerDay + 4),
        };
      }
      return l;
    });
    // Recalcule les métriques
    updatedOrders = recalculateOrderMetrics(updatedOrders, updatedLines, settings);
  } else if (solution.actionType === 'boost_cadence' && solution.targetOrderId) {
    // Augmente la cadence de l'ordre de 15%
    updatedOrders = updatedOrders.map((o) => {
      if (o.id === solution.targetOrderId) {
        const newCadence = Math.round(o.cadencePerHour * 1.15);
        return { ...o, cadencePerHour: newCadence };
      }
      return o;
    });
    updatedOrders = recalculateOrderMetrics(updatedOrders, updatedLines, settings);
  } else if (solution.actionType === 'prioritize_order' && solution.targetOrderId) {
    // Place l'ordre en P1 et avance sa date de début à aujourd'hui
    updatedOrders = updatedOrders.map((o) => {
      if (o.id === solution.targetOrderId) {
        return {
          ...o,
          priority: 'P1' as const,
          startDate: new Date().toISOString().split('T')[0],
        };
      }
      return o;
    });
    updatedOrders = optimizeDispatch(updatedOrders, updatedLines, settings);
  } else if (solution.actionType === 'switch_line' && solution.targetOrderId && solution.targetLineId) {
    // Transfère la commande sur une autre ligne
    updatedOrders = updatedOrders.map((o) => {
      if (o.id === solution.targetOrderId) {
        return { ...o, lineId: solution.targetLineId! };
      }
      return o;
    });
    updatedOrders = recalculateOrderMetrics(updatedOrders, updatedLines, settings);
  }

  return { updatedOrders, updatedLines };
}

/**
 * Calcule le dispatch journalier ventilé par shift (Matin, Après-midi, Nuit)
 */
export function calculateDailyDispatch(
  orders: ProductionOrder[],
  lines: ProductionLine[],
  targetDateStr?: string
): { [lineId: string]: { [shift in ShiftType]?: DispatchSlot[] } } {
  const result: { [lineId: string]: { [shift in ShiftType]?: DispatchSlot[] } } = {};
  const today = targetDateStr || new Date().toISOString().split('T')[0];

  for (const line of lines) {
    result[line.id] = {
      morning: [],
      afternoon: [],
      night: [],
    };

    const activeOrders = orders.filter(
      (o) => o.lineId === line.id && o.status !== 'completed' && o.startDate <= today && (o.estimatedEndDate || today) >= today
    );

    let remainingShiftHours = 8;
    const shifts: ShiftType[] = ['morning', 'afternoon'];
    if (line.capacityHoursPerDay >= 24) shifts.push('night');

    let currentShiftIdx = 0;

    for (const ord of activeOrders) {
      if (currentShiftIdx >= shifts.length) break;

      const currentShift = shifts[currentShiftIdx];
      const hoursToAllocate = Math.min(remainingShiftHours, ord.estimatedHours || 4);
      const cadence = ord.cadencePerHour || line.defaultCadence;
      const plannedPieces = Math.round(hoursToAllocate * cadence * line.efficiencyRate);

      result[line.id][currentShift]!.push({
        orderId: ord.id,
        orderCode: ord.code,
        client: ord.client,
        product: ord.product,
        lineId: line.id,
        date: today,
        shift: currentShift,
        allocatedHours: hoursToAllocate,
        plannedPieces,
      });

      remainingShiftHours -= hoursToAllocate;
      if (remainingShiftHours <= 0) {
        currentShiftIdx++;
        remainingShiftHours = 8;
      }
    }
  }

  return result;
}

/**
 * Calcule les KPI globaux pour le rapport de production
 */
export function calculateKPIs(orders: ProductionOrder[], lines: ProductionLine[]): ProductionReportKPI {
  const totalOrders = orders.length;
  const completedOrders = orders.filter((o) => o.status === 'completed').length;
  const onTimeOrders = orders.filter((o) => o.status === 'on_time').length;
  const atRiskOrders = orders.filter((o) => o.status === 'at_risk').length;
  const delayedOrders = orders.filter((o) => o.status === 'delayed').length;

  const activeOrders = orders.filter((o) => o.status !== 'completed');
  const onTimeDeliveryRate = totalOrders > 0 ? Math.round(((totalOrders - delayedOrders) / totalOrders) * 100) : 100;

  const totalPlannedPieces = orders.reduce((acc, o) => acc + o.quantity, 0);
  const totalProducedPieces = orders.reduce((acc, o) => acc + o.produced, 0);
  const totalRequiredHours = activeOrders.reduce((acc, o) => acc + (o.estimatedHours || 0), 0);

  const avgCadence = orders.length > 0 
    ? Math.round(orders.reduce((acc, o) => acc + o.cadencePerHour, 0) / orders.length)
    : 0;

  const avgOEE = lines.length > 0
    ? Math.round((lines.reduce((acc, l) => acc + l.efficiencyRate, 0) / lines.length) * 100)
    : 85;

  return {
    totalOrders,
    completedOrders,
    onTimeOrders,
    atRiskOrders,
    delayedOrders,
    onTimeDeliveryRate,
    totalPlannedPieces,
    totalProducedPieces,
    totalRequiredHours: Math.round(totalRequiredHours * 10) / 10,
    averageCadence: avgCadence,
    overallOEE: avgOEE,
  };
}
