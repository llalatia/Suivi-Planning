import React, { useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  RotateCcw,
  Calendar,
  Layers,
  BarChart3,
  Clock,
} from 'lucide-react';
import { parseXLSXFile } from '../utils/macroExcel';
import { PlanningData } from '../data/initialData';
import { getCalendarWeek } from '../utils/calendarUtils';

export type PlanningPage = 'macro' | 'micro';

interface NavbarProps {
  activePage: PlanningPage;
  onSelectPage: (page: PlanningPage) => void;
  currentWeek: string;
  allWeeks: string[];
  onSelectWeek: (week: string) => void;
  onExportExcel: () => void;
  onImportData: (data: Partial<PlanningData>) => void;
  onResetS34: () => void;
  totalCommandes: number;
  totalPiecesCommandees: number;
  totalPiecesFinies: number;
  totalResteAFaire: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
  onSelectPage,
  currentWeek,
  allWeeks,
  onSelectWeek,
  onExportExcel,
  onImportData,
  onResetS34,
  totalCommandes,
  totalPiecesCommandees,
  totalPiecesFinies,
  totalResteAFaire,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseXLSXFile(file);
      onImportData(parsed);
    } catch (err: any) {
      console.error('Import error:', err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
      <div className="w-full px-4 py-2 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Page Navigation Switcher */}
        <div className="flex items-center flex-wrap gap-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center font-bold text-white shadow-xs shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-white uppercase">
                  SUIVI PLANNING
                </h1>
                <span className="text-slate-500">·</span>
                <span className="text-xs font-semibold text-indigo-300">
                  {activePage === 'macro' ? 'Macro-Planning' : 'Micro-Planning'}
                </span>
              </div>
            </div>
          </div>

          {/* Core Page Switcher Tabs */}
          <nav className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs shadow-inner">
            <button
              onClick={() => onSelectPage('macro')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                activePage === 'macro'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Macro-Planning</span>
              <span className="text-[10px] bg-indigo-900/60 text-indigo-200 px-1.5 py-0.2 rounded-full font-mono">
                Broderie
              </span>
            </button>

            <button
              onClick={() => onSelectPage('micro')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                activePage === 'micro'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Micro-Planning</span>
              <span className="text-[10px] bg-emerald-900/60 text-emerald-200 px-1.5 py-0.2 rounded-full font-mono">
                Ateliers & Chaînes
              </span>
            </button>
          </nav>
        </div>

        {/* Right Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {activePage === 'macro' ? (
            <>
              {/* Semaine en cours (Macro) */}
              <div className="flex items-center bg-slate-800 rounded px-2.5 py-1 border border-slate-700">
                <Calendar className="w-3.5 h-3.5 text-amber-400 mr-1.5" />
                <span className="text-xs text-slate-300 mr-1.5">Semaine en cours :</span>
                <select
                  value={currentWeek}
                  onChange={(e) => onSelectWeek(e.target.value)}
                  className="bg-[#FFFF00] text-slate-950 text-xs font-extrabold font-mono px-2 py-0.5 rounded focus:outline-none cursor-pointer"
                >
                  {allWeeks.map((code) => {
                    const cal = getCalendarWeek(code);
                    return (
                      <option key={code} value={code}>
                        {code} {cal ? `(${cal.date_label})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls"
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                title="Importer un fichier Excel (.xlsx)"
                className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded text-xs font-medium border border-slate-700 transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-sky-400" />
                <span>Importer .xlsx</span>
              </button>

              <button
                onClick={onExportExcel}
                title="Exporter le planning au format Excel original"
                className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-semibold transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exporter .xlsx</span>
              </button>

              <button
                onClick={onResetS34}
                title="Réinitialiser à l'état exact du fichier original MACRO-PLANNING BROD TRADI S34.xlsx"
                className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-slate-700 rounded text-xs font-medium transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Réinitialiser S34</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                MICRO-PLANNING MAJ du 12-10
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
