import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PlanningData,
  INITIAL_PLANNING_DATA,
  Commande,
  Semaine,
  PlanningCell,
  CellStatut,
} from '../data/initialData';
import {
  CALENDAR_52_WEEKS,
  getWeekCodeFromDate,
  getDateFromWeekCode,
  getCurrentCalendarWeekCode,
} from './calendarUtils';
import {
  calculateCommande,
  calculateSemaines,
  autoDispatchMissing,
  dispatchByBrodeusesDispo,
  CommandeCalculated,
  SemaineCalculated,
} from './macroLogic';
import { exportPlanningToXLSX } from './macroExcel';

const STORAGE_KEY = 'macro_planning_brod_data_v6';

function migrateMacroDataTo52Weeks(parsed: any): PlanningData {
  if (!parsed || !parsed.commandes) return INITIAL_PLANNING_DATA;
  if (Array.isArray(parsed.semaines) && parsed.semaines.length === 52 && parsed.semaines[0]?.code === 'S01') {
    return parsed as PlanningData;
  }

  const oldSemIdToCode = new Map<number, string>();
  if (Array.isArray(parsed.semaines)) {
    parsed.semaines.forEach((s: any) => oldSemIdToCode.set(s.id, s.code));
  }
  const codeToNewId = new Map<string, number>();
  CALENDAR_52_WEEKS.forEach((s) => codeToNewId.set(s.code, s.id));

  const migratedPlanning: PlanningCell[] = (parsed.planning || []).map((p: any) => {
    const code = oldSemIdToCode.get(p.semaine_id);
    if (code && codeToNewId.has(code)) {
      return { ...p, semaine_id: codeToNewId.get(code)! };
    }
    if (p.semaine_id >= 1 && p.semaine_id <= 23) {
      return { ...p, semaine_id: p.semaine_id + 28 };
    }
    return p;
  });

  return {
    config: {
      ...parsed.config,
      semaine_courante: parsed.config?.semaine_courante || 'S34',
    },
    semaines: CALENDAR_52_WEEKS,
    commandes: parsed.commandes || INITIAL_PLANNING_DATA.commandes,
    planning: migratedPlanning,
  };
}

export function useMacroPlanning() {
  const [data, setData] = useState<PlanningData>(() => {
    try {
      const savedV6 = localStorage.getItem(STORAGE_KEY);
      if (savedV6) {
        return migrateMacroDataTo52Weeks(JSON.parse(savedV6));
      }
      const savedV5 = localStorage.getItem('macro_planning_brod_data_v5');
      if (savedV5) {
        return migrateMacroDataTo52Weeks(JSON.parse(savedV5));
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using initial S01-S52 dataset', e);
    }
    return INITIAL_PLANNING_DATA;
  });

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving to localStorage', e);
    }
  }, [data]);

  // Set current week
  const setSemaineCourante = useCallback((code: string) => {
    setData((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        semaine_courante: code,
      },
    }));
  }, []);

  // Update or insert pieces (and optional manual_brodeuses) for a command & week
  const setPieces = useCallback(
    (
      commandeId: number,
      semaineId: number,
      nbPieces: number,
      statut?: CellStatut,
      manualBrodeuses?: number | null
    ) => {
      setData((prev) => {
        const existingIdx = prev.planning.findIndex(
          (p) => p.commande_id === commandeId && p.semaine_id === semaineId
        );

        const updatedPlanning = [...prev.planning];
        if (existingIdx >= 0) {
          updatedPlanning[existingIdx] = {
            ...updatedPlanning[existingIdx],
            nb_pieces: nbPieces,
            manual_brodeuses: manualBrodeuses !== undefined ? manualBrodeuses : null,
            statut: statut !== undefined ? statut : updatedPlanning[existingIdx].statut,
          };
        } else {
          updatedPlanning.push({
            id: Date.now() + Math.floor(Math.random() * 10000),
            commande_id: commandeId,
            semaine_id: semaineId,
            nb_pieces: nbPieces,
            manual_brodeuses: manualBrodeuses !== undefined ? manualBrodeuses : null,
            statut: statut || 'normal',
          });
        }

        return {
          ...prev,
          planning: updatedPlanning,
        };
      });
    },
    []
  );

  // Set number of available brodeuses to process a command & auto-calculate weekly pieces on the timeline
  const setBrodeusesDispoCommande = useCallback(
    (commandeId: number, nbBrodeusesDispo: number | null) => {
      setData((prev) => {
        const targetCmd = prev.commandes.find((c) => c.id === commandeId);
        if (!targetCmd) return prev;

        const updatedCmd: Commande = {
          ...targetCmd,
          nb_brodeuses_dispo: nbBrodeusesDispo,
        };

        const updatedCommandes = prev.commandes.map((c) =>
          c.id === commandeId ? updatedCmd : c
        );

        let updatedPlanning = prev.planning;
        if (
          nbBrodeusesDispo !== null &&
          nbBrodeusesDispo > 0 &&
          !updatedCmd.heure_pcs_tbc &&
          updatedCmd.heure_pcs &&
          updatedCmd.heure_pcs > 0
        ) {
          updatedPlanning = dispatchByBrodeusesDispo(
            updatedCmd,
            prev.planning,
            prev.semaines,
            prev.config.semaine_courante,
            nbBrodeusesDispo
          );
        }

        return {
          ...prev,
          commandes: updatedCommandes,
          planning: updatedPlanning,
        };
      });
    },
    []
  );

  // Update cell status ('normal' | 'lancement' | 'limite_client' | 'glissement' | 'sst' | 'termine')
  const setCellStatut = useCallback(
    (commandeId: number, semaineId: number, statut: CellStatut) => {
      setData((prev) => {
        const targetSem = prev.semaines.find((s) => s.id === semaineId);
        const semCode = targetSem?.code || null;

        let updatedCommandes = prev.commandes;
        if (semCode) {
          updatedCommandes = prev.commandes.map((c) => {
            if (c.id !== commandeId) return c;
            if (statut === 'lancement') {
              return { ...c, semaine_lancement: semCode };
            }
            if (statut === 'limite_client') {
              return { ...c, semaine_limite_client: semCode };
            }
            if (statut === 'normal') {
              return {
                ...c,
                semaine_lancement: c.semaine_lancement === semCode ? null : c.semaine_lancement,
                semaine_limite_client:
                  c.semaine_limite_client === semCode ? null : c.semaine_limite_client,
              };
            }
            return c;
          });
        }

        const existingIdx = prev.planning.findIndex(
          (p) => p.commande_id === commandeId && p.semaine_id === semaineId
        );

        let updatedPlanning = [...prev.planning];
        if (statut === 'lancement' || statut === 'limite_client') {
          updatedPlanning = updatedPlanning.map((p) =>
            p.commande_id === commandeId && p.statut === statut && p.semaine_id !== semaineId
              ? { ...p, statut: 'normal', manual_statut: false }
              : p
          );
        }

        if (existingIdx >= 0) {
          updatedPlanning[existingIdx] = {
            ...updatedPlanning[existingIdx],
            statut,
            manual_statut: true,
          };
        } else {
          updatedPlanning.push({
            id: Date.now() + Math.floor(Math.random() * 10000),
            commande_id: commandeId,
            semaine_id: semaineId,
            nb_pieces: 0,
            statut,
            manual_statut: true,
          });
        }

        return {
          ...prev,
          commandes: updatedCommandes,
          planning: updatedPlanning,
        };
      });
    },
    []
  );

  // Update row color ('normal' | 'glissement' | 'lancement' | 'limite_client' | 'sst' | 'termine')
  const setRowColor = useCallback((commandeId: number, rowColor: CellStatut) => {
    setData((prev) => ({
      ...prev,
      commandes: prev.commandes.map((c) =>
        c.id === commandeId ? { ...c, row_color: rowColor } : c
      ),
    }));
  }, []);

  // Update available workforce (Ligne 52 : 42 brodeuses)
  const setEffectifDispo = useCallback((semaineId: number | 'all', effectif: number) => {
    setData((prev) => ({
      ...prev,
      semaines: prev.semaines.map((s) =>
        semaineId === 'all' || s.id === semaineId
          ? { ...s, effectif_dispo: Math.max(0, effectif) }
          : s
      ),
    }));
  }, []);

  // Shift an order's future/active timeline by deltaWeeks (-1 or +1)
  const shiftOrderWeeks = useCallback((commandeId: number, deltaWeeks: number) => {
    if (deltaWeeks === 0) return;
    setData((prev) => {
      const semOrderMap = new Map<number, number>();
      const orderToSemIdMap = new Map<number, number>();
      prev.semaines.forEach((s, idx) => {
        semOrderMap.set(s.id, idx);
        orderToSemIdMap.set(idx, s.id);
      });

      const currentWeekIdx = Math.max(
        0,
        prev.semaines.findIndex((s) => s.code === prev.config.semaine_courante)
      );

      const otherCells = prev.planning.filter(
        (p) =>
          p.commande_id !== commandeId ||
          (semOrderMap.get(p.semaine_id) ?? 0) < currentWeekIdx
      );
      const movableCells = prev.planning.filter(
        (p) =>
          p.commande_id === commandeId &&
          (semOrderMap.get(p.semaine_id) ?? 0) >= currentWeekIdx &&
          (p.nb_pieces > 0 || p.statut !== 'normal')
      );

      const shiftedCells: PlanningCell[] = [];
      movableCells.forEach((cell) => {
        const oldIdx = semOrderMap.get(cell.semaine_id) ?? currentWeekIdx;
        const newIdx = Math.min(
          prev.semaines.length - 1,
          Math.max(currentWeekIdx, oldIdx + deltaWeeks)
        );
        const targetSemId = orderToSemIdMap.get(newIdx);
        if (!targetSemId) return;

        const existingTarget = shiftedCells.find((c) => c.semaine_id === targetSemId);
        if (existingTarget) {
          existingTarget.nb_pieces += cell.nb_pieces;
          if (cell.statut !== 'normal') existingTarget.statut = cell.statut;
        } else {
          shiftedCells.push({
            ...cell,
            semaine_id: targetSemId,
            manual_brodeuses: null,
          });
        }
      });

      return {
        ...prev,
        planning: [...otherCells, ...shiftedCells],
      };
    });
  }, []);

  // Add order (and automatically dispatch if nb_brodeuses_dispo > 0)
  const addCommande = useCallback((newCmd: Omit<Commande, 'id' | 'ordre' | 'archive'>) => {
    setData((prev) => {
      // Auto-synchronize dates and weeks
      const finalCmd = { ...newCmd };
      if (finalCmd.date_lancement && !finalCmd.semaine_lancement) {
        finalCmd.semaine_lancement = getWeekCodeFromDate(finalCmd.date_lancement) || null;
      } else if (finalCmd.semaine_lancement && !finalCmd.date_lancement) {
        finalCmd.date_lancement = getDateFromWeekCode(finalCmd.semaine_lancement, 'start') || null;
      }

      if (finalCmd.date_limite_client && !finalCmd.semaine_limite_client) {
        finalCmd.semaine_limite_client = getWeekCodeFromDate(finalCmd.date_limite_client) || null;
      } else if (finalCmd.semaine_limite_client && !finalCmd.date_limite_client) {
        finalCmd.date_limite_client = getDateFromWeekCode(finalCmd.semaine_limite_client, 'friday') || null;
      }

      const nextId =
        prev.commandes.length > 0 ? Math.max(...prev.commandes.map((c) => c.id)) + 1 : 1;
      const cmd: Commande = {
        ...finalCmd,
        id: nextId,
        ordre: prev.commandes.length,
        archive: 0,
      };

      let updatedPlanning = prev.planning;
      if (
        cmd.nb_brodeuses_dispo &&
        cmd.nb_brodeuses_dispo > 0 &&
        !cmd.heure_pcs_tbc &&
        cmd.heure_pcs &&
        cmd.heure_pcs > 0
      ) {
        updatedPlanning = dispatchByBrodeusesDispo(
          cmd,
          prev.planning,
          prev.semaines,
          prev.config.semaine_courante,
          cmd.nb_brodeuses_dispo
        );
      }

      return {
        ...prev,
        commandes: [...prev.commandes, cmd],
        planning: updatedPlanning,
      };
    });
  }, []);

  // Update order (and re-dispatch if nb_brodeuses_dispo is set and updated)
  const updateCommande = useCallback((id: number, updates: Partial<Commande>) => {
    setData((prev) => {
      const existing = prev.commandes.find((c) => c.id === id);
      if (!existing) return prev;

      // Auto-synchronize dates and weeks
      const finalUpdates = { ...updates };
      if (finalUpdates.date_lancement !== undefined && finalUpdates.semaine_lancement === undefined) {
        finalUpdates.semaine_lancement = getWeekCodeFromDate(finalUpdates.date_lancement) || null;
      } else if (finalUpdates.semaine_lancement !== undefined && finalUpdates.date_lancement === undefined) {
        finalUpdates.date_lancement = getDateFromWeekCode(finalUpdates.semaine_lancement, 'start') || null;
      }

      if (finalUpdates.date_limite_client !== undefined && finalUpdates.semaine_limite_client === undefined) {
        finalUpdates.semaine_limite_client = getWeekCodeFromDate(finalUpdates.date_limite_client) || null;
      } else if (finalUpdates.semaine_limite_client !== undefined && finalUpdates.date_limite_client === undefined) {
        finalUpdates.date_limite_client = getDateFromWeekCode(finalUpdates.semaine_limite_client, 'friday') || null;
      }

      const updatedCmd: Commande = { ...existing, ...finalUpdates };
      const updatedCommandes = prev.commandes.map((c) => (c.id === id ? updatedCmd : c));

      let updatedPlanning = prev.planning;

      // Link Sa: If semaine_lancement is updated, sync planning cell statut 'lancement'
      if (finalUpdates.semaine_lancement !== undefined) {
        const targetSaCode = finalUpdates.semaine_lancement ? finalUpdates.semaine_lancement.toUpperCase().trim() : null;
        const targetSem = targetSaCode ? prev.semaines.find((s) => s.code.toUpperCase() === targetSaCode) : null;

        // Remove 'lancement' from other cells of this command
        updatedPlanning = updatedPlanning.map((p) => {
          if (p.commande_id === id && p.statut === 'lancement') {
            return { ...p, statut: 'normal', manual_statut: false };
          }
          return p;
        });

        // Set 'lancement' on target week
        if (targetSem) {
          const existingIdx = updatedPlanning.findIndex((p) => p.commande_id === id && p.semaine_id === targetSem.id);
          if (existingIdx >= 0) {
            updatedPlanning[existingIdx] = { ...updatedPlanning[existingIdx], statut: 'lancement', manual_statut: true };
          } else {
            updatedPlanning.push({
              id: Date.now() + Math.floor(Math.random() * 100000),
              commande_id: id,
              semaine_id: targetSem.id,
              nb_pieces: 0,
              statut: 'lancement',
              manual_statut: true,
            });
          }
        }
      }

      // Link Sb: If semaine_limite_client is updated, sync planning cell statut 'limite_client'
      if (finalUpdates.semaine_limite_client !== undefined) {
        const targetSbCode = finalUpdates.semaine_limite_client ? finalUpdates.semaine_limite_client.toUpperCase().trim() : null;
        const targetSem = targetSbCode ? prev.semaines.find((s) => s.code.toUpperCase() === targetSbCode) : null;

        // Remove 'limite_client' from other cells of this command
        updatedPlanning = updatedPlanning.map((p) => {
          if (p.commande_id === id && p.statut === 'limite_client') {
            return { ...p, statut: 'normal', manual_statut: false };
          }
          return p;
        });

        // Set 'limite_client' on target week
        if (targetSem) {
          const existingIdx = updatedPlanning.findIndex((p) => p.commande_id === id && p.semaine_id === targetSem.id);
          if (existingIdx >= 0) {
            updatedPlanning[existingIdx] = { ...updatedPlanning[existingIdx], statut: 'limite_client', manual_statut: true };
          } else {
            updatedPlanning.push({
              id: Date.now() + 1 + Math.floor(Math.random() * 100000),
              commande_id: id,
              semaine_id: targetSem.id,
              nb_pieces: 0,
              statut: 'limite_client',
              manual_statut: true,
            });
          }
        }
      }

      // Si l'utilisateur a renseigné/modifié le nombre de brodeuses disponibles (ou heure_pcs / qte avec brodeuses dispo actif)
      const brodChanged =
        updates.nb_brodeuses_dispo !== undefined &&
        updates.nb_brodeuses_dispo !== null &&
        updates.nb_brodeuses_dispo > 0;
      const cadenceOrQtyChangedWithBrod =
        (updates.heure_pcs !== undefined ||
          updates.qte_commande !== undefined ||
          updates.qte_finie !== undefined ||
          updates.semaine_lancement !== undefined) &&
        updatedCmd.nb_brodeuses_dispo &&
        updatedCmd.nb_brodeuses_dispo > 0;

      if (
        (brodChanged || cadenceOrQtyChangedWithBrod) &&
        !updatedCmd.heure_pcs_tbc &&
        updatedCmd.heure_pcs &&
        updatedCmd.heure_pcs > 0 &&
        updatedCmd.nb_brodeuses_dispo
      ) {
        updatedPlanning = dispatchByBrodeusesDispo(
          updatedCmd,
          prev.planning,
          prev.semaines,
          prev.config.semaine_courante,
          updatedCmd.nb_brodeuses_dispo
        );
      }

      return {
        ...prev,
        commandes: updatedCommandes,
        planning: updatedPlanning,
      };
    });
  }, []);

  // Duplicate order
  const duplicateCommande = useCallback((id: number) => {
    setData((prev) => {
      const source = prev.commandes.find((c) => c.id === id);
      if (!source) return prev;
      const nextId = Math.max(...prev.commandes.map((c) => c.id)) + 1;
      const duplicated: Commande = {
        ...source,
        id: nextId,
        modele: `${source.modele} (copie)`,
        ordre: prev.commandes.length,
      };
      const sourcePlanning = prev.planning
        .filter((p) => p.commande_id === id)
        .map((p, idx) => ({
          ...p,
          id: Date.now() + idx + Math.floor(Math.random() * 10000),
          commande_id: nextId,
        }));
      return {
        ...prev,
        commandes: [...prev.commandes, duplicated],
        planning: [...prev.planning, ...sourcePlanning],
      };
    });
  }, []);

  // Delete order
  const deleteCommande = useCallback((id: number) => {
    setData((prev) => ({
      ...prev,
      commandes: prev.commandes.filter((c) => c.id !== id),
      planning: prev.planning.filter((p) => p.commande_id !== id),
    }));
  }, []);

  // Add week
  const addSemaine = useCallback((code: string, dateDebut: string) => {
    setData((prev) => {
      if (prev.semaines.some((s) => s.code.toLowerCase() === code.toLowerCase())) {
        return prev;
      }
      const nextId = Math.max(...prev.semaines.map((s) => s.id)) + 1;
      const newSem: Semaine = {
        id: nextId,
        code: code.toUpperCase(),
        date_debut: dateDebut,
        date_label: dateDebut,
        ordre: prev.semaines.length,
        effectif_dispo: 42,
      };
      return {
        ...prev,
        semaines: [...prev.semaines, newSem],
      };
    });
  }, []);

  // Auto-dispatch / spread across weeks
  const autoDispatch = useCallback(
    (commandeId: number, startSemaineCode?: string, nbWeeksToSpread = 4) => {
      setData((prev) => {
        const newPlanning = autoDispatchMissing(
          commandeId,
          prev,
          startSemaineCode,
          nbWeeksToSpread
        );
        return {
          ...prev,
          planning: newPlanning,
        };
      });
    },
    []
  );

  // Reset to original S34
  const resetToS34Reference = useCallback(() => {
    setData(INITIAL_PLANNING_DATA);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Import from Excel
  const importData = useCallback((imported: Partial<PlanningData>) => {
    setData((prev) => {
      const newSemaines = imported.semaines || prev.semaines;
      const newCommandes =
        imported.commandes && imported.commandes.length > 0
          ? imported.commandes
          : prev.commandes;
      const newPlanning =
        imported.planning && imported.planning.length > 0
          ? imported.planning
          : prev.planning;
      const newConfig = imported.config || prev.config;

      return {
        config: newConfig,
        semaines: newSemaines,
        commandes: newCommandes,
        planning: newPlanning,
      };
    });
  }, []);

  // Export to Excel
  const exportData = useCallback(
    (filename?: string) => {
      exportPlanningToXLSX(data, filename);
    },
    [data]
  );

  // Computed values
  const calculatedCommandes: CommandeCalculated[] = useMemo(() => {
    return data.commandes.map((c, idx) =>
      calculateCommande(c, data.planning, data.semaines, data.config.semaine_courante, idx)
    );
  }, [data.commandes, data.planning, data.semaines, data.config.semaine_courante]);

  const calculatedSemaines: SemaineCalculated[] = useMemo(() => {
    return calculateSemaines(
      data.semaines,
      data.commandes,
      data.planning,
      data.config.semaine_courante
    );
  }, [data.semaines, data.commandes, data.planning, data.config.semaine_courante]);

  // Global metrics
  const metrics = useMemo(() => {
    const totalCommandes = calculatedCommandes.length;
    const terminees = calculatedCommandes.filter((c) => c.statut === 'termine').length;
    const sousPlanifiees = calculatedCommandes.filter((c) => c.statut === 'sous_planifie').length;
    const tbcCount = calculatedCommandes.filter((c) => c.heure_pcs_tbc === 1).length;
    const totalPiecesCommandees = calculatedCommandes.reduce((sum, c) => sum + c.qte_commande, 0);
    const totalPiecesFinies = calculatedCommandes.reduce((sum, c) => sum + c.qte_finie, 0);
    const totalResteAFaire = calculatedCommandes.reduce((sum, c) => sum + c.resteAFaire, 0);
    const totalProgramme = calculatedCommandes.reduce((sum, c) => sum + c.totalProgramme, 0);

    const currentSem = calculatedSemaines.find((s) => s.isCourante);
    const currentWeekPieces = currentSem?.totalPieces || 0;
    const currentWeekHeures = currentSem?.totalHeures || 0;
    const currentWeekBrodeuses = currentSem?.totalBrodeuses || 0;

    return {
      totalCommandes,
      terminees,
      sousPlanifiees,
      tbcCount,
      totalPiecesCommandees,
      totalPiecesFinies,
      totalResteAFaire,
      totalProgramme,
      currentWeekCode: data.config.semaine_courante,
      currentWeekPieces,
      currentWeekHeures,
      currentWeekBrodeuses,
    };
  }, [calculatedCommandes, calculatedSemaines, data.config.semaine_courante]);

  return {
    data,
    calculatedCommandes,
    calculatedSemaines,
    metrics,
    setSemaineCourante,
    setPieces,
    setBrodeusesDispoCommande,
    setCellStatut,
    setRowColor,
    setEffectifDispo,
    shiftOrderWeeks,
    addCommande,
    updateCommande,
    duplicateCommande,
    deleteCommande,
    addSemaine,
    autoDispatch,
    resetToS34Reference,
    importData,
    exportData,
  };
}
