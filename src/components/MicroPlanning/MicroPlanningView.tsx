import React, { useState, useRef, useMemo } from 'react';
import { useMicroPlanning } from '../../utils/useMicroPlanning';
import { TableauMicroUnifie } from './TableauMicroUnifie';
import { TableauMicroSuiviJournalier } from './TableauMicroSuiviJournalier';
import { TableauMicroSimulationFrise } from './TableauMicroSimulationFrise';
import { MicroPlanningModal } from './MicroPlanningModal';
import { FicheEtatModeleModal } from './FicheEtatModeleModal';
import { VueGlobaleModelesModal } from './VueGlobaleModelesModal';
import { MicroJob } from '../../data/microPlanningTypes';
import { formatDay, trackingKeyFor } from '../../utils/dateDisplay';
import {
  Calendar,
  Layers,
  Table as TableIcon,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  Activity,
  ChevronLeft,
  ChevronRight,
  Palette,
} from 'lucide-react';

interface MicroPlanningViewProps {
  onShowToast: (msg: string) => void;
}

export const MicroPlanningView: React.FC<MicroPlanningViewProps> = ({ onShowToast }) => {
  const {
    data,
    currentDateKey,
    currentColIdx,
    currentDailyRows,
    timelineDays,
    jobs,
    modelColors,
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
  } = useMicroPlanning();

  // Mode: 'unifie' (Default: Unified Suivi + Simulation Frise) | 'suivi' (Point du jour seul) | 'simulation' (Frise seule)
  const [activeSubView, setActiveSubView] = useState<'unifie' | 'suivi' | 'simulation'>('unifie');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGlobalModelsModalOpen, setIsGlobalModelsModalOpen] = useState(false);
  const [selectedQuickModelJob, setSelectedQuickModelJob] = useState<MicroJob | null>(null);
  const [newDateInput, setNewDateInput] = useState('');
  const [isAddingDate, setIsAddingDate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Find current day in timeline to allow prev/next navigation
  const currentDayIndex = useMemo(
    () => timelineDays.findIndex((d) => d.colIdx === currentColIdx),
    [timelineDays, currentColIdx]
  );
  const prevDay = currentDayIndex > 0 ? timelineDays[currentDayIndex - 1] : null;
  const nextDay =
    currentDayIndex >= 0 && currentDayIndex < timelineDays.length - 1
      ? timelineDays[currentDayIndex + 1]
      : null;

  // Next planned days from the timeline (e.g. 13/10, 14/10, 15/10, 16/10...)
  const upcomingTimelineDates = useMemo(() => {
    return timelineDays
      .filter((d) => d.colIdx > currentColIdx && d.colIdx <= currentColIdx + 20)
      .map((d) => ({
        key: trackingKeyFor(d.dateLabel, metrics.availableDates),
        label: `${formatDay(d.dateLabel)} (${d.dayName} ${d.week})`,
      }));
  }, [timelineDays, currentColIdx, metrics.availableDates]);

  const handleExport = () => {
    exportData();
    onShowToast(`Fichier exporté : MICRO-PLANNING_MAJ_${currentDateKey}.xlsx`);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { parseMicroXLSXFile } = await import('../../utils/microExcel');
      const parsed = await parseMicroXLSXFile(file);
      importData(parsed);
      onShowToast(`Fichier "${file.name}" importé avec succès en Micro-Planning.`);
    } catch (err: any) {
      onShowToast(`Erreur d'import : ${err.message || err}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateNewDate = () => {
    if (!newDateInput.trim()) return;
    const formatted = trackingKeyFor(newDateInput.trim(), metrics.availableDates);
    setDateKey(formatted);
    setIsAddingDate(false);
    setNewDateInput('');
    onShowToast(`Nouveau point journalier créé pour le ${formatDay(formatted)}.`);
  };

  return (
    <div className="space-y-3">
      {/* Top Controls & KPI Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* View Mode Switcher */}
          <div className="flex items-center flex-wrap gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-300">
            {/* Unified Mode (Default) */}
            <button
              onClick={() => setActiveSubView('unifie')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                activeSubView === 'unifie'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-300" />
              <span>Tableau Unifié (Suivi + Frise Simulation)</span>
              <span className="bg-slate-800 text-slate-200 text-[10px] px-1.5 py-0.2 rounded font-sans uppercase font-extrabold">
                Tout en 1
              </span>
            </button>

            {/* Suivi Concentré */}
            <button
              onClick={() => setActiveSubView('suivi')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                activeSubView === 'suivi'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Suivi Atelier Seul</span>
              <span className="bg-[#FFFF00] text-slate-950 text-[10px] px-1.5 py-0.2 rounded font-mono font-black border border-amber-400">
                MAJ {formatDay(currentDateKey)}
              </span>
            </button>

            {/* Frise Chronologique */}
            <button
              onClick={() => setActiveSubView('simulation')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                activeSubView === 'simulation'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Frise Multi-Chaînes Seule</span>
              <span className="bg-slate-200 text-slate-900 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold">
                {jobs.length} OF
              </span>
            </button>

            {/* Vue Globale & Couleurs des Modèles */}
            <button
              onClick={() => setIsGlobalModelsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer bg-slate-900 hover:bg-black text-white shadow-xs border border-slate-700"
              title="Ouvrir la vue globale des modèles et assigner leurs couleurs"
            >
              <Palette className="w-3.5 h-3.5 text-amber-300" />
              <span>Modèles & Couleurs</span>
              <span className="bg-slate-700 text-amber-300 text-[10px] px-1.5 py-0.2 rounded font-mono font-black">
                {jobs.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick 360° Model Health View Selector */}
            <div className="flex items-center bg-slate-100 border border-slate-300 rounded px-2.5 py-1 text-xs">
              <Activity className="w-3.5 h-3.5 text-slate-700 mr-1.5 shrink-0" />
              <span className="text-slate-900 font-bold mr-1.5 shrink-0">Vue Modèle 360° :</span>
              <select
                value={selectedQuickModelJob?.id || ''}
                onChange={(e) => {
                  const j = jobs.find((x) => x.id === e.target.value);
                  if (j) setSelectedQuickModelJob(j);
                }}
                className="bg-white text-slate-950 font-bold border border-slate-300 rounded px-1.5 py-0.5 text-xs focus:outline-none cursor-pointer max-w-[200px] truncate"
              >
                <option value="">Consulter un modèle...</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.style} ({j.chaine.split(' ')[0]})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Selector for Daily Tracking - JAUNE POUR LA DATE EN COURS */}
            <div className="flex items-center bg-[#FFFF00]/20 border border-amber-400 rounded px-1.5 py-1 text-xs gap-1">
              {/* Previous Day Button */}
              {prevDay && (
                <button
                  onClick={() => {
                    const k = trackingKeyFor(prevDay.dateLabel, metrics.availableDates);
                    setDateKey(k);
                    onShowToast(`Point de suivi : ${formatDay(k)}`);
                  }}
                  className="p-1 text-slate-800 hover:text-slate-950 hover:bg-amber-300 rounded cursor-pointer transition"
                  title={`Jour précédent : ${formatDay(prevDay.dateLabel)}`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              )}

              <Calendar className="w-3.5 h-3.5 text-slate-950 ml-0.5" />
              <span className="text-slate-950 font-black whitespace-nowrap">Date MAJ :</span>
              <select
                value={currentDateKey}
                onChange={(e) => {
                  setDateKey(e.target.value);
                  onShowToast(`Affichage du point journalier : ${formatDay(e.target.value)}`);
                }}
                className="bg-[#FFFF00] text-slate-950 font-black font-mono px-2 py-0.5 rounded cursor-pointer border border-amber-400 focus:outline-none shadow-2xs"
              >
                <optgroup label="Historique réalisé">
                  {metrics.availableDates.map((d) => (
                    <option key={d} value={d}>
                      {formatDay(d)}
                      {d === currentDateKey ? ' ★ actif' : ''}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={`Jours suivants (+${timelineDays[currentDayIndex]?.week || 'Sxx'} / prévisions)`}>
                  {upcomingTimelineDates.map((u) => (
                    <option key={u.key} value={u.key}>
                      {u.label}
                    </option>
                  ))}
                </optgroup>
              </select>

              {/* Next Day Button (+1j) */}
              {nextDay && (
                <button
                  onClick={() => {
                    const k = trackingKeyFor(nextDay.dateLabel, metrics.availableDates);
                    setDateKey(k);
                    onShowToast(`Point de suivi : ${formatDay(k)}`);
                  }}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold text-slate-900 hover:text-slate-950 bg-amber-300/80 hover:bg-amber-300 rounded cursor-pointer transition shadow-2xs border border-amber-400"
                  title={`Avancer au jour suivant (+1j) : ${formatDay(nextDay.dateLabel)}`}
                >
                  <span>+1j</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {isAddingDate ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="ex: 13/10"
                  value={newDateInput}
                  onChange={(e) => setNewDateInput(e.target.value)}
                  className="w-20 text-xs border border-slate-400 rounded px-2 py-1 focus:outline-none"
                />
                <button
                  onClick={handleCreateNewDate}
                  className="px-2 py-1 bg-slate-900 text-white rounded text-xs font-bold"
                >
                  OK
                </button>
                <button
                  onClick={() => setIsAddingDate(false)}
                  className="px-1.5 py-1 text-slate-500 text-xs"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingDate(true)}
                className="px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 border border-slate-300 rounded font-medium transition cursor-pointer"
                title="Saisir manuellement une date libre de MAJ journalière"
              >
                + Autre date
              </button>
            )}

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFile}
              accept=".xlsx,.xls"
              className="hidden"
            />

            {/* Export & Import buttons */}
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 hover:bg-black text-white rounded text-xs font-semibold shadow-2xs transition cursor-pointer"
              title="Exporter au format Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .xlsx</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold shadow-2xs transition cursor-pointer"
              title="Importer un fichier Micro-Planning Excel (.xlsx)"
            >
              <Upload className="w-3.5 h-3.5 text-slate-300" />
              <span>Import .xlsx</span>
            </button>

            <button
              onClick={() => {
                if (
                  confirm(
                    'Voulez-vous restaurer les données exactes du fichier "MICRO-PLANNING MAJ du 12-10" ?'
                  )
                ) {
                  resetToOriginal();
                  onShowToast('Données réinitialisées à la référence usine "MICRO-PLANNING MAJ du 12-10".');
                }
              }}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition cursor-pointer"
              title="Restaurer la référence usine"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main View Area */}
      {activeSubView === 'unifie' ? (
        /* VUE 1 (DÉFAUT) : Tableau Unifié réunissant Suivi Opérationnel & Frise Chronologique Simulation */
        <TableauMicroUnifie
          rows={currentDailyRows}
          jobs={jobs}
          timelineDays={timelineDays}
          currentDateKey={currentDateKey}
          currentColIdx={currentColIdx}
          onUpdateDailyField={updateDailyField}
          onDeleteDailyRow={(id) => {
            deleteDailyRow(id);
            onShowToast('Ligne supprimée du suivi.');
          }}
          onAddDailyRowModal={() => setIsModalOpen(true)}
          onUpdateJobDayCell={(jobId, colIdx, realVal, targetVal) => {
            updateJobDayCell(jobId, colIdx, realVal, targetVal);
            onShowToast('Frise simulation mise à jour.');
          }}
          onUpdateJobDayField={(jobId, colIdx, field, val) => {
            updateJobDayField(jobId, colIdx, field, val);
            onShowToast('Case simulation mise à jour.');
          }}
          onUpdateJobTarget={(jobId, newTarget, colIdx, applySub) => {
            updateJobTarget(jobId, newTarget, colIdx, applySub);
            onShowToast('Objectif journalier (OBJ/J) mis à jour.');
          }}
          availableChains={metrics.distinctChains}
          modelColors={modelColors}
          onSetModelColor={setModelColor}
        />
      ) : activeSubView === 'suivi' ? (
        /* VUE 2 : Suivi Opérationnel d'Atelier seul */
        <TableauMicroSuiviJournalier
          rows={currentDailyRows}
          timelineDays={timelineDays}
          jobs={jobs}
          currentDateKey={currentDateKey}
          onUpdateField={updateDailyField}
          onDeleteRow={(id) => {
            deleteDailyRow(id);
            onShowToast('Ligne supprimée du suivi journalier.');
          }}
          onAddRowModal={() => setIsModalOpen(true)}
          onUpdateJobDayCell={(jobId, colIdx, realVal, targetVal) => {
            updateJobDayCell(jobId, colIdx, realVal, targetVal);
            onShowToast('Simulation mise à jour.');
          }}
          onUpdateJob={updateJob}
          availableChains={metrics.distinctChains}
          modelColors={modelColors}
          onSetModelColor={setModelColor}
          onShowToast={onShowToast}
        />
      ) : (
        /* VUE 3 : Simulation Frise Multi-Chaînes seule */
        <TableauMicroSimulationFrise
          jobs={jobs}
          timelineDays={timelineDays}
          currentDailyRows={currentDailyRows}
          currentDateKey={currentDateKey}
          currentColIdx={currentColIdx}
          onUpdateJobDayCell={(jobId, colIdx, realVal, targetVal) => {
            updateJobDayCell(jobId, colIdx, realVal, targetVal);
            onShowToast('Simulation mise à jour.');
          }}
          onUpdateJobDayField={(jobId, colIdx, field, val) => {
            updateJobDayField(jobId, colIdx, field, val);
            onShowToast('Case simulation mise à jour.');
          }}
          onUpdateJobTarget={(jobId, newTarget, colIdx, applySub) => {
            updateJobTarget(jobId, newTarget, colIdx, applySub);
            onShowToast('Objectif journalier (OBJ/J) mis à jour.');
          }}
          availableChains={metrics.distinctChains}
          modelColors={modelColors}
          onSetModelColor={setModelColor}
        />
      )}

      {/* Add New Line / OF Modal */}
      <MicroPlanningModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(newRow) => {
          addDailyRow(newRow);
          onShowToast(`Modèle "${newRow.modele}" ajouté au suivi.`);
        }}
        availableChains={metrics.distinctChains}
      />

      {/* Quick Model 360° Health Modal (opened from top selector) */}
      <FicheEtatModeleModal
        isOpen={selectedQuickModelJob !== null}
        onClose={() => setSelectedQuickModelJob(null)}
        job={selectedQuickModelJob}
        rows={currentDailyRows}
        timelineDays={timelineDays}
        currentDateKey={currentDateKey}
        currentColIdx={currentColIdx}
        modelColors={modelColors}
        onSetModelColor={setModelColor}
        onUpdateJobTarget={(jobId, newTarget, colIdx, applySub) => {
          updateJobTarget(jobId, newTarget, colIdx, applySub);
          onShowToast('Objectif journalier (OBJ/J) mis à jour.');
        }}
        onUpdateJobDayField={(jobId, colIdx, field, val) => {
          updateJobDayField(jobId, colIdx, field, val);
          onShowToast('Case simulation mise à jour.');
        }}
      />

      {/* Vue Globale & Couleurs des Modèles Modal */}
      <VueGlobaleModelesModal
        isOpen={isGlobalModelsModalOpen}
        onClose={() => setIsGlobalModelsModalOpen(false)}
        jobs={jobs}
        rows={currentDailyRows}
        modelColors={modelColors}
        onSetModelColor={(model, color) => {
          setModelColor(model, color);
          onShowToast(`Couleur assignée pour le modèle "${model}".`);
        }}
        onOpenModel360={(j) => setSelectedQuickModelJob(j)}
        onAddNewJob={(newJob) => {
          addJob({
            style: newJob.style,
            client: newJob.client,
            chaine: newJob.chaine,
            qtyTotal: newJob.qtyTotal,
            objJour: newJob.objJour,
            color: newJob.color,
            jours: {},
          });
          onShowToast(`Nouveau modèle "${newJob.style}" créé dans la simulation.`);
        }}
        availableChains={metrics.distinctChains}
      />
    </div>
  );
};
