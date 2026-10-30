import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MicroPlanningData,
  MicroDailyRow,
  MicroJob,
  MicroTimelineDay,
} from '../data/microPlanningTypes';
import { INITIAL_MICRO_PLANNING_DATA } from '../data/microPlanningInitialData';
import { exportMicroPlanningToXLSX } from './microExcel';
import { getModelColor, normalizeModelKey } from './modelColorUtils';

const STORAGE_KEY = 'micro_planning_data_v5';

// Helper to accurately match daily tracking rows with simulation styles
export function matchStyleWithModel(
  jobStyle: string,
  rowModel: string,
  rowChaine?: string
): boolean {
  if (!jobStyle || !rowModel) return false;
  const js = jobStyle.trim().toUpperCase();
  const rm = rowModel.trim().toUpperCase();

  // 1. Exact match
  if (js === rm) return true;

  // 2. Exact distinction for Bliova Orange vs Bliova Black/Ecru on Marguerite 1
  // In sheet 12-10: "BLIOVA BURNT ORANGE..." -> In SIMULATION: "BLIOVA ORANGE" (OF 73p, active 28/09-05/10)
  if (rm.includes('BURNT ORANGE') || (rm.includes('ORANGE') && !rm.includes('BLACK') && !rm.includes('ECRU'))) {
    return js === 'BLIOVA ORANGE';
  }

  // In sheet 12-10: "BLIOVA ECRU BLACK...", "BLIOVA BLACK SS", "BLIOVA ECRU SS"
  // -> In SIMULATION on Marguerite 1: "BLIOVA BLACK / ECRU" (OF 224p, active 06/10-20/10)
  if (
    rm.includes('ECRU BLACK') ||
    rm.includes('BLACK SS') ||
    (rm.includes('BLIOVA') && rm.includes('ECRU') && !rm.includes('BURNT'))
  ) {
    if (rowChaine && rowChaine.toUpperCase().includes('SIEGE')) {
      return js.includes('BLIOVA ECRU SS');
    }
    return js === 'BLIOVA BLACK / ECRU';
  }

  // 3. Exact distinction for Baya Natural sub-OFs on Dhalia (US1, US2, US3, US4, etc.)
  if (rm.includes('BAYA') && js.includes('BAYA')) {
    for (const tag of ['US1', 'US2', 'US3', 'US4', 'FR1', 'FR2', 'FR3', 'FR4', 'OF1', 'OF2']) {
      if (rm.includes(tag)) return js.includes(tag);
    }
    return js === 'BAYA OF1' || js.includes('BAYA NAT');
  }

  // 4. Praia on Rose
  if (rm.includes('PRAIA') && js.includes('PRAIA')) return true;

  // 5. Normalized alphanumeric fallback
  const s1 = js.replace(/[^A-Z0-9]/g, '');
  const s2 = rm.replace(/[^A-Z0-9]/g, '');
  return s1 === s2;
}

export function useMicroPlanning() {
  const [data, setData] = useState<MicroPlanningData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed.timelineDays &&
          parsed.timelineDays.length > 100 &&
          parsed.jobs &&
          parsed.dailyTracking
        ) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not parse saved micro planning data', e);
    }
    return INITIAL_MICRO_PLANNING_DATA;
  });

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save micro planning data to localStorage', e);
    }
  }, [data]);

  // Current active date key (e.g. '12-10')
  const currentDateKey = data.currentDateKey || '12-10';
  const currentColIdx = data.currentColIdx || 267; // 12-10 in SIMULATION

  const currentDailyRows = useMemo(() => {
    return data.dailyTracking[currentDateKey] || [];
  }, [data.dailyTracking, currentDateKey]);

  // Switch active date (e.g. '12-10', '10-10', or new day)
  const setDateKey = useCallback((newDateKey: string) => {
    setData((prev) => {
      let tracking = prev.dailyTracking[newDateKey];
      if (!tracking) {
        const latestRows = prev.dailyTracking[prev.currentDateKey] || [];
        tracking = latestRows.map((r) => ({
          ...r,
          id: `mp_daily_${newDateKey}_${r.modele.replace(/\s+/g, '_')}`,
          date: newDateKey,
          cumulJ1: r.cumulPacking || 0,
          realPacking: 0,
          prodCoupe: 0,
          remarque: '',
        }));
      }

      // Find matching timeline colIdx if date exists
      const foundDay = prev.timelineDays.find(
        (td) => td.dateLabel === newDateKey.replace('-', '/')
      );
      const nextColIdx = foundDay ? foundDay.colIdx : prev.currentColIdx;

      return {
        ...prev,
        currentDateKey: newDateKey,
        currentColIdx: nextColIdx,
        dailyTracking: {
          ...prev.dailyTracking,
          [newDateKey]: tracking,
        },
      };
    });
  }, []);

  // Update a field in the daily tracking table (Point du Jour) with live bidirectional sync to simulation!
  const updateDailyField = useCallback(
    (id: string, field: keyof MicroDailyRow, value: any) => {
      setData((prev) => {
        const rows = prev.dailyTracking[prev.currentDateKey] || [];
        let updatedRowTarget: MicroDailyRow | null = null;

        const nextRows = rows.map((r) => {
          if (r.id !== id) return r;
          const updated = { ...r, [field]: value };

          // Automatically recalculate cumulPacking and pctCoupe when quantities change
          if (field === 'realPacking' || field === 'cumulJ1') {
            const real = field === 'realPacking' ? Number(value) || 0 : r.realPacking;
            const j1 = field === 'cumulJ1' ? Number(value) || 0 : r.cumulJ1;
            updated.cumulPacking = j1 + real;
            updated.cumulCarton = updated.cumulPacking;
          }
          if (field === 'prodCoupe') {
            const prod = Number(value) || 0;
            updated.cumulCoupe = (r.cumulCoupe || 0) + prod;
          }
          if (field === 'of' || field === 'cumulCoupe') {
            const ofVal = field === 'of' ? Number(value) || 1 : r.of || 1;
            const coupeVal = field === 'cumulCoupe' ? Number(value) || 0 : r.cumulCoupe || 0;
            updated.pctCoupe = ofVal > 0 ? Math.min(1, coupeVal / ofVal) : 0;
          }

          updatedRowTarget = updated;
          return updated;
        });

        // Bidirectional sync: if realPacking was edited, update corresponding job cell in simulation!
        let nextJobs = prev.jobs;
        if (field === 'realPacking' && updatedRowTarget) {
          const row = updatedRowTarget as MicroDailyRow;
          const colIdx = prev.currentColIdx;

          nextJobs = prev.jobs.map((job) => {
            const chainMatch =
              job.chaine.toLowerCase().includes(row.chaine.toLowerCase()) ||
              row.chaine.toLowerCase().includes(job.chaine.toLowerCase());
            const styleMatch = matchStyleWithModel(job.style, row.modele);

            if (chainMatch && styleMatch && job.jours && job.jours[colIdx] !== undefined) {
              const updatedJours = { ...job.jours };
              updatedJours[colIdx] = {
                ...updatedJours[colIdx],
                real: Number(value) || 0,
              };
              return {
                ...job,
                jours: updatedJours,
              };
            }
            return job;
          });
        }

        return {
          ...prev,
          jobs: nextJobs,
          dailyTracking: {
            ...prev.dailyTracking,
            [prev.currentDateKey]: nextRows,
          },
        };
      });
    },
    []
  );

  // Add a new row to daily tracking
  const addDailyRow = useCallback(
    (newRow: Omit<MicroDailyRow, 'id' | 'date'>) => {
      setData((prev) => {
        const rows = prev.dailyTracking[prev.currentDateKey] || [];
        const id = 'mp_daily_' + Date.now();
        const rowToAdd: MicroDailyRow = {
          ...newRow,
          id,
          date: prev.currentDateKey,
          cumulPacking: (newRow.cumulJ1 || 0) + (newRow.realPacking || 0),
          cumulCarton: (newRow.cumulJ1 || 0) + (newRow.realPacking || 0),
          pctCoupe: newRow.of > 0 ? (newRow.cumulCoupe || 0) / newRow.of : 0,
        };

        return {
          ...prev,
          dailyTracking: {
            ...prev.dailyTracking,
            [prev.currentDateKey]: [rowToAdd, ...rows],
          },
        };
      });
    },
    []
  );

  // Delete a row from daily tracking
  const deleteDailyRow = useCallback((id: string) => {
    setData((prev) => {
      const rows = prev.dailyTracking[prev.currentDateKey] || [];
      return {
        ...prev,
        dailyTracking: {
          ...prev.dailyTracking,
          [prev.currentDateKey]: rows.filter((r) => r.id !== id),
        },
      };
    });
  }, []);

  // Update a day cell in the multi-chain simulation timeline
  const updateJobDayCell = useCallback(
    (jobId: string, colIdx: number, realValue: number, targetValue?: number) => {
      setData((prev) => {
        let changedJob: MicroJob | null = null;

        const nextJobs = prev.jobs.map((job) => {
          if (job.id !== jobId) return job;

          const updatedJours = { ...job.jours };
          const existing = updatedJours[colIdx] || { real: 0, cumul: 0 };
          const newReal = Math.max(0, realValue);

          updatedJours[colIdx] = {
            ...existing,
            real: newReal,
            target: targetValue !== undefined ? targetValue : existing.target || job.objJour,
          };

          // Recalculate cumuls sequentially across all scheduled days
          const sortedCols = Object.keys(updatedJours)
            .map(Number)
            .sort((a, b) => a - b);
          let runningCumul = 0;
          sortedCols.forEach((c) => {
            runningCumul += updatedJours[c].real || 0;
            updatedJours[c].cumul = runningCumul;
          });

          changedJob = {
            ...job,
            jours: updatedJours,
            cumulRealise: runningCumul,
          };
          return changedJob;
        });

        // If updated cell is current date colIdx, also update dailyTracking row!
        let nextDailyTracking = prev.dailyTracking;
        if (colIdx === prev.currentColIdx && changedJob) {
          const cJob = changedJob as MicroJob;
          const currentRows = prev.dailyTracking[prev.currentDateKey] || [];
          const updatedRows = currentRows.map((r) => {
            const chainMatch =
              cJob.chaine.toLowerCase().includes(r.chaine.toLowerCase()) ||
              r.chaine.toLowerCase().includes(cJob.chaine.toLowerCase());
            const styleMatch = matchStyleWithModel(cJob.style, r.modele);
            if (chainMatch && styleMatch) {
              const real = Math.max(0, realValue);
              const cumulPacking = (r.cumulJ1 || 0) + real;
              return {
                ...r,
                realPacking: real,
                cumulPacking,
                cumulCarton: cumulPacking,
              };
            }
            return r;
          });

          nextDailyTracking = {
            ...prev.dailyTracking,
            [prev.currentDateKey]: updatedRows,
          };
        }

        return {
          ...prev,
          jobs: nextJobs,
          dailyTracking: nextDailyTracking,
        };
      });
    },
    []
  );

  // Update any of the 4 manual simulation fields: 'coupe' | 'alim' | 'real' | 'cumul' | 'target'
  const updateJobDayField = useCallback(
    (
      jobId: string,
      colIdx: number,
      field: 'coupe' | 'alim' | 'real' | 'cumul' | 'target',
      value: number
    ) => {
      setData((prev) => {
        let changedJob: MicroJob | null = null;
        const valNum = Math.max(0, Number(value) || 0);

        const nextJobs = prev.jobs.map((job) => {
          if (job.id !== jobId) return job;

          const updatedJours = { ...job.jours };
          const existing = updatedJours[colIdx] || { real: 0, cumul: 0, alim: 0, coupe: 0 };

          updatedJours[colIdx] = {
            ...existing,
            [field]: valNum,
          };

          // If target is updated, check if we also update job.objJour if this is the current day
          let nextObjJour = job.objJour;
          if (field === 'target' && colIdx <= prev.currentColIdx) {
            nextObjJour = valNum;
          }

          // If real is updated, recompute job's total cumulRealise
          let nextCumulRealise = job.cumulRealise;
          if (field === 'real') {
            const sortedCols = Object.keys(updatedJours).map(Number).sort((a, b) => a - b);
            let running = 0;
            sortedCols.forEach((c) => {
              running += updatedJours[c].real || 0;
              // If cumul wasn't manually set or was equal to running cumul, update it
              if (!updatedJours[c].cumul || updatedJours[c].cumul === 0) {
                updatedJours[c].cumul = running;
              }
            });
            nextCumulRealise = running;
          } else if (field === 'cumul') {
            nextCumulRealise = Math.max(nextCumulRealise, valNum);
          }

          changedJob = {
            ...job,
            objJour: nextObjJour,
            jours: updatedJours,
            cumulRealise: nextCumulRealise,
          };
          return changedJob;
        });

        // Live bidirectional sync: if updated cell is current date (e.g. 12-10), update dailyTracking
        let nextDailyTracking = prev.dailyTracking;
        if (colIdx === prev.currentColIdx && changedJob) {
          const cJob = changedJob as MicroJob;
          const currentRows = prev.dailyTracking[prev.currentDateKey] || [];
          const updatedRows = currentRows.map((r) => {
            const chainMatch =
              cJob.chaine.toLowerCase().includes(r.chaine.toLowerCase().split(' ')[0].toLowerCase()) ||
              r.chaine.toLowerCase().includes(cJob.chaine.toLowerCase().split(' ')[0].toLowerCase());
            const styleMatch = matchStyleWithModel(cJob.style, r.modele, r.chaine);
            if (chainMatch && styleMatch) {
              if (field === 'real') {
                const real = valNum;
                const cumulPacking = (r.cumulJ1 || 0) + real;
                return {
                  ...r,
                  realPacking: real,
                  cumulPacking,
                  cumulCarton: cumulPacking,
                };
              } else if (field === 'cumul') {
                return {
                  ...r,
                  cumulPacking: valNum,
                  cumulCarton: valNum,
                };
              } else if (field === 'alim') {
                return {
                  ...r,
                  alimChaine: valNum,
                };
              } else if (field === 'coupe') {
                return {
                  ...r,
                  cumulCoupe: valNum,
                  pctCoupe: r.of > 0 ? Math.min(1, valNum / r.of) : 0,
                };
              }
            }
            return r;
          });

          nextDailyTracking = {
            ...prev.dailyTracking,
            [prev.currentDateKey]: updatedRows,
          };
        }

        return {
          ...prev,
          jobs: nextJobs,
          dailyTracking: nextDailyTracking,
        };
      });
    },
    []
  );

  // Update target (OBJ/J) with optional propagation to subsequent days
  const updateJobTarget = useCallback(
    (
      jobId: string,
      newTarget: number,
      colIdx?: number,
      applyToSubsequentDays: boolean = true
    ) => {
      setData((prev) => {
        const targetNum = Math.max(0, Number(newTarget) || 0);
        const nextJobs = prev.jobs.map((job) => {
          if (job.id !== jobId) return job;

          const updatedJours = { ...job.jours };

          if (colIdx !== undefined) {
            if (applyToSubsequentDays) {
              // Apply target to this colIdx and all subsequent days
              Object.keys(updatedJours).forEach((key) => {
                const c = Number(key);
                if (c >= colIdx) {
                  updatedJours[c] = {
                    ...updatedJours[c],
                    target: targetNum,
                  };
                }
              });
              return {
                ...job,
                objJour: targetNum,
                jours: updatedJours,
              };
            } else {
              // Apply only to this specific day
              updatedJours[colIdx] = {
                ...updatedJours[colIdx],
                target: targetNum,
              };
              return {
                ...job,
                jours: updatedJours,
              };
            }
          } else {
            // Apply globally
            Object.keys(updatedJours).forEach((key) => {
              const c = Number(key);
              updatedJours[c] = {
                ...updatedJours[c],
                target: targetNum,
              };
            });
            return {
              ...job,
              objJour: targetNum,
              jours: updatedJours,
            };
          }
        });

        return {
          ...prev,
          jobs: nextJobs,
        };
      });
    },
    []
  );

  // Add a new job / model to simulation
  const addJob = useCallback(
    (newJob: Omit<MicroJob, 'id' | 'cumulRealise'>) => {
      setData((prev) => {
        const id = 'job_' + Date.now();
        const jobToAdd: MicroJob = {
          ...newJob,
          id,
          cumulRealise: 0,
        };
        return {
          ...prev,
          jobs: [jobToAdd, ...prev.jobs],
        };
      });
    },
    []
  );

  // Update job properties
  const updateJob = useCallback(
    (jobId: string, updates: Partial<MicroJob>) => {
      setData((prev) => {
        const nextJobs = prev.jobs.map((job) => (job.id === jobId ? { ...job, ...updates } : job));
        return { ...prev, jobs: nextJobs };
      });
    },
    []
  );

  // Delete a job
  const deleteJob = useCallback((jobId: string) => {
    setData((prev) => ({
      ...prev,
      jobs: prev.jobs.filter((j) => j.id !== jobId),
    }));
  }, []);

  // Reset to original factory reference from MICRO-PLANNING MAJ du 12-10.xlsx
  const resetToOriginal = useCallback(() => {
    setData(INITIAL_MICRO_PLANNING_DATA);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Export to Excel
  const exportData = useCallback(() => {
    exportMicroPlanningToXLSX(data);
  }, [data]);

  // Import from Excel
  const importData = useCallback((partial: Partial<MicroPlanningData>) => {
    setData((prev) => ({
      ...prev,
      ...partial,
      dailyTracking: {
        ...prev.dailyTracking,
        ...(partial.dailyTracking || {}),
      },
    }));
  }, []);

  // Calculate live summary metrics
  const metrics = useMemo(() => {
    const rows = currentDailyRows;
    let totalOf = 0;
    let totalRealPacking = 0;
    let totalCumulPacking = 0;
    let totalProdCoupe = 0;
    let totalCumulCoupe = 0;
    let totalAlimChaine = 0;

    rows.forEach((r) => {
      totalOf += r.of || 0;
      totalRealPacking += r.realPacking || 0;
      totalCumulPacking += r.cumulPacking || 0;
      totalProdCoupe += r.prodCoupe || 0;
      totalCumulCoupe += r.cumulCoupe || 0;
      totalAlimChaine += r.alimChaine || 0;
    });

    const resteAFaire = Math.max(0, totalOf - totalCumulPacking);
    const pctAvancement = totalOf > 0 ? (totalCumulPacking / totalOf) * 100 : 0;

    const distinctChains = Array.from(
      new Set([
        ...rows.map((r) => r.chaine).filter(Boolean),
        ...data.jobs.map((j) => j.chaine).filter(Boolean),
      ])
    );

    return {
      totalOf,
      totalRealPacking,
      totalCumulPacking,
      totalProdCoupe,
      totalCumulCoupe,
      totalAlimChaine,
      resteAFaire,
      pctAvancement,
      chainsCount: distinctChains.length,
      distinctChains,
      availableDates: Object.keys(data.dailyTracking),
    };
  }, [currentDailyRows, data.jobs, data.dailyTracking]);

  // Assign a custom color to a model/style
  const setModelColor = useCallback((modelName: string, color: string) => {
    setData((prev) => {
      const normKey = normalizeModelKey(modelName);
      const nextColors = {
        ...(prev.modelColors || {}),
        [normKey]: color,
      };

      // Also update jobs matching this model
      const nextJobs = prev.jobs.map((j) => {
        if (
          normalizeModelKey(j.style) === normKey ||
          j.style.toLowerCase().includes(modelName.toLowerCase()) ||
          modelName.toLowerCase().includes(j.style.toLowerCase())
        ) {
          return { ...j, color };
        }
        return j;
      });

      // Also update daily rows matching this model
      const nextDaily = { ...prev.dailyTracking };
      Object.keys(nextDaily).forEach((dateKey) => {
        nextDaily[dateKey] = nextDaily[dateKey].map((r) => {
          if (
            normalizeModelKey(r.modele) === normKey ||
            r.modele.toLowerCase().includes(modelName.toLowerCase()) ||
            modelName.toLowerCase().includes(r.modele.toLowerCase())
          ) {
            return { ...r, color };
          }
          return r;
        });
      });

      return {
        ...prev,
        modelColors: nextColors,
        jobs: nextJobs,
        dailyTracking: nextDaily,
      };
    });
  }, []);

  const getModelColorFor = useCallback(
    (name: string, jobColor?: string) => {
      return getModelColor(name, data.modelColors, jobColor);
    },
    [data.modelColors]
  );

  return {
    data,
    currentDateKey,
    currentColIdx,
    currentDailyRows,
    timelineDays: data.timelineDays,
    jobs: data.jobs,
    modelColors: data.modelColors || {},
    setModelColor,
    getModelColorFor,
    metrics,
    setDateKey,
    updateDailyField,
    addDailyRow,
    deleteDailyRow,
    updateJobDayCell,
    updateJobDayField,
    updateJobTarget,
    addJob,
    updateJob,
    deleteJob,
    resetToOriginal,
    exportData,
    importData,
  };
}
