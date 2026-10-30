import React, { useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  Zap,
  RotateCcw,
  Sliders,
  FileText,
  HardDrive,
  Code2,
  Calendar,
  Layers,
  Table as TableIcon,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface HeaderProps {
  activeTab: 'table' | 'daily' | 'weekly' | 'python';
  setActiveTab: (tab: 'table' | 'daily' | 'weekly' | 'python') => void;
  onImportExcel: (file: File) => void;
  onExportExcel: () => void;
  onOptimizeDispatch: () => void;
  onOpenReport: () => void;
  onOpenSettings: () => void;
  onResetData: () => void;
  isOptimizing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onImportExcel,
  onExportExcel,
  onOptimizeDispatch,
  onOpenReport,
  onOpenSettings,
  onResetData,
  isOptimizing,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isInstallable, install } = usePWAInstall();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportExcel(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      {/* Top Banner: Logo & Primary Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Logo & App Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-bold text-xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">OptiProd</h1>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <HardDrive className="w-3 h-3" /> Hors-ligne & Local
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Planning de production, calcul de cadence & dispatch anti-retard
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Hidden Excel File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx, .xls"
              className="hidden"
              id="excel-file-upload-input"
            />

            <button
              id="btn-import-excel"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition flex items-center gap-1.5 shadow-sm"
              title="Importer un fichier Excel existant (.xlsx)"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Importer .xlsx</span>
            </button>

            <button
              id="btn-export-excel"
              onClick={onExportExcel}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition flex items-center gap-1.5 shadow-sm"
              title="Télécharger le fichier Excel complet avec feuilles de dispatch"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exporter .xlsx</span>
            </button>

            <button
              id="btn-optimize-dispatch"
              onClick={onOptimizeDispatch}
              disabled={isOptimizing}
              className="px-3.5 py-1.5 text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
              title="Réordonne la séquence de production pour annuler les retards clients"
            >
              <Zap className={`w-3.5 h-3.5 text-amber-300 ${isOptimizing ? 'animate-spin' : ''}`} />
              <span>{isOptimizing ? 'Calcul...' : 'Optimiser le Dispatch'}</span>
            </button>

            <button
              id="btn-open-report"
              onClick={onOpenReport}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition flex items-center gap-1.5 shadow-sm"
              title="Afficher le rapport de production et de cadence"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Rapport Cadence</span>
            </button>

            {isInstallable && (
              <button
                id="btn-pwa-install"
                onClick={install}
                className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition flex items-center gap-1.5"
              >
                Installer l'App
              </button>
            )}

            <button
              id="btn-open-settings"
              onClick={onOpenSettings}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
              title="Paramètres d'usine (Capacités, Shifts, Horaires)"
            >
              <Sliders className="w-4 h-4" />
            </button>

            <button
              id="btn-reset-data"
              onClick={onResetData}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
              title="Réinitialiser avec les données d'exemple"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 mt-3 border-t border-slate-800 pt-2">
          <button
            id="tab-table"
            onClick={() => setActiveTab('table')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-2 transition ${
              activeTab === 'table'
                ? 'bg-slate-800 text-white font-semibold border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tableur Excel Léger</span>
          </button>

          <button
            id="tab-daily"
            onClick={() => setActiveTab('daily')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-2 transition ${
              activeTab === 'daily'
                ? 'bg-slate-800 text-white font-semibold border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>Dispatch Journalier (Shifts)</span>
          </button>

          <button
            id="tab-weekly"
            onClick={() => setActiveTab('weekly')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-2 transition ${
              activeTab === 'weekly'
                ? 'bg-slate-800 text-white font-semibold border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>Charge Hebdomadaire & Lignes</span>
          </button>

          <button
            id="tab-python"
            onClick={() => setActiveTab('python')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-2 transition ${
              activeTab === 'python'
                ? 'bg-slate-800 text-white font-semibold border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Script Python & Automatisation</span>
          </button>
        </div>
      </div>
    </header>
  );
};
