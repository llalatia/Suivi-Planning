import React, { useState } from 'react';
import { getPythonScriptContent, downloadPythonScript } from '../utils/pythonScriptGenerator';
import { downloadExcelTemplate } from '../utils/excelHandler';
import {
  Code2,
  Download,
  Copy,
  Check,
  Terminal,
  FileSpreadsheet,
  Cpu,
  CheckCircle2,
  Sparkles,
  Layers,
} from 'lucide-react';

export const PythonScriptTab: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const scriptContent = getPythonScriptContent();

  const handleCopyCode = () => {
    navigator.clipboard.writeText(scriptContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" /> Python 3.8+ / Pandas / OpenPyXL
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                100% Hors-ligne
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight mt-2 text-white">
              Automatisation Python du Planning de Production
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Ce script Python prêt à l'emploi traite automatiquement vos fichiers <strong>.xlsx</strong>, calcule les cadences, optimise le dispatch journalier/hebdomadaire pour éliminer les retards clients, et génère des classeurs Excel multi-onglets mis en forme avec rapports.
            </p>
          </div>

          {/* Action Downloads */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => downloadPythonScript()}
              className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger production_planner.py</span>
            </button>

            <button
              onClick={() => downloadExcelTemplate()}
              className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl transition flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Modèle Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* 4 Steps Process */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[11px]">1</span>
              <span>Lecture XLSX (Pandas)</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Lit n'importe quel fichier Excel même avec des en-têtes variés (OF, Client, Cadence, Deadline...).
            </p>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[11px]">2</span>
              <span>Calcul des Cadences</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Heures requises = Reste à faire / (Cadence × Rendement machine OEE).
            </p>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px]">3</span>
              <span>Dispatch Anti-Retard</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Séquençage intelligent (Earliest Due Date + Priorités P1/P2/P3) pour respecter la date promise au client.
            </p>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-[11px]">4</span>
              <span>Export Stylisé (OpenPyXL)</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Génère le .xlsx avec couleurs d'alerte, largeurs auto et onglet rapport de cadence.
            </p>
          </div>
        </div>
      </div>

      {/* CLI Command & Usage Guide */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-slate-700" />
          <span>Comment l'exécuter sur votre machine locale</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Step 1: Install deps */}
          <div className="bg-slate-950 rounded-xl p-3 text-white font-mono text-xs flex items-center justify-between">
            <div>
              <span className="text-slate-500"># 1. Installer les dépendances</span>
              <p className="text-emerald-400 font-semibold mt-1">pip install pandas openpyxl</p>
            </div>
            <button
              onClick={() => handleCopyCommand('pip install pandas openpyxl')}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              title="Copier la commande"
            >
              {copiedCommand ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Step 2: Run script */}
          <div className="bg-slate-950 rounded-xl p-3 text-white font-mono text-xs flex items-center justify-between">
            <div>
              <span className="text-slate-500"># 2. Exécuter l'automatisation</span>
              <p className="text-cyan-400 font-semibold mt-1">python production_planner.py --input mon_fichier.xlsx</p>
            </div>
            <button
              onClick={() => handleCopyCommand('python production_planner.py --input mon_fichier.xlsx')}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              title="Copier la commande"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Code Viewer */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            <span className="ml-2 font-mono text-xs text-slate-300 font-bold">production_planner.py</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copié dans le presse-papier !</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copier tout le code Python</span>
                </>
              )}
            </button>

            <button
              onClick={() => downloadPythonScript()}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger .py</span>
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="p-4 overflow-x-auto max-h-[550px] overflow-y-auto font-mono text-xs leading-relaxed text-slate-300 select-all">
          <pre>{scriptContent}</pre>
        </div>
      </div>
    </div>
  );
};
