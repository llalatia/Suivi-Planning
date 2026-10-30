import React, { useState } from 'react';
import { X, Download, Code2, Terminal, FileSpreadsheet, Check, Copy } from 'lucide-react';

interface PythonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PYTHON_FILES: { [key: string]: string } = {
  'main.py': `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Application de Macro-Planning Broderie Traditionnelle.
"""
from db import init_db
from gui import PlanningApp

def main():
    init_db()
    app = PlanningApp()
    app.mainloop()

if __name__ == '__main__':
    main()
`,
  'logic.py': `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Logique métier du Macro-Planning Broderie Traditionnelle.
"""

def qte_reste_a_faire(qte_commande: float, qte_finie: float) -> float:
    return max(0.0, (qte_commande or 0.0) - (qte_finie or 0.0))

def nb_heures(nb_pieces: float, heure_pcs: float) -> float:
    if nb_pieces is None or heure_pcs is None:
        return 0.0
    return round(float(nb_pieces) * float(heure_pcs), 2)

def nb_brodeuses(total_heures: float, heures_par_semaine: float = 40.0) -> float:
    if not total_heures or not heures_par_semaine:
        return 0.0
    return round(float(total_heures) / float(heures_par_semaine), 2)

def evaluer_statut(qte_commande, qte_finie, total_programme):
    reste = qte_reste_a_faire(qte_commande, qte_finie)
    if reste == 0 and (qte_finie or 0) > 0:
        return 'termine'
    if total_programme < reste:
        return 'sous_planifie'
    return 'ok'
`,
  'db.py': `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gestion de la base de données SQLite pour l'application Macro-Planning.
Fichier : planning.db
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "planning.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    conn = get_connection()
    cur = conn.cursor()
    # Initialise les tables config, semaines, commandes, planning
    conn.commit()
    conn.close()
`,
};

export const PythonModal: React.FC<PythonModalProps> = ({ isOpen, onClose }) => {
  const [activeFile, setActiveFile] = useState<string>('main.py');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(PYTHON_FILES[activeFile] || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Code2 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold">Code Python & Téléchargements Hors-Ligne</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Downloads bar */}
        <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
              Fichiers sources complets prêts à l'emploi
            </h3>
            <p className="text-xs text-indigo-700">
              L'application Python fonctionne avec Tkinter (inclus de base dans Python) et openpyxl.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <a
              href="/planning_app.zip"
              download="planning_app.zip"
              className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger planning_app.zip</span>
            </a>

            <a
              href="/MACRO-PLANNING_BROD_TRADI_S34.xlsx"
              download="MACRO-PLANNING_BROD_TRADI_S34.xlsx"
              className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Fichier Excel S34</span>
            </a>
          </div>
        </div>

        {/* How to run instructions */}
        <div className="px-6 py-3 bg-slate-100 border-b border-slate-200 text-xs text-slate-700 flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-slate-500" />
          <span>Pour lancer l'application en Python localement :</span>
          <code className="bg-white px-2 py-0.5 rounded border border-slate-300 font-mono font-bold text-indigo-700">
            pip install openpyxl && python main.py
          </code>
        </div>

        {/* Code explorer */}
        <div className="flex flex-1 overflow-hidden">
          {/* File list */}
          <div className="w-44 bg-slate-900 border-r border-slate-800 p-2 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 block">
              Fichiers Python
            </span>
            {Object.keys(PYTHON_FILES).map((fileName) => (
              <button
                key={fileName}
                onClick={() => setActiveFile(fileName)}
                className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-mono transition flex items-center justify-between ${
                  activeFile === fileName
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>{fileName}</span>
              </button>
            ))}
          </div>

          {/* Code preview */}
          <div className="flex-1 bg-slate-950 p-4 overflow-y-auto relative font-mono text-xs text-slate-200">
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans border border-slate-700 transition"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copié !' : 'Copier'}</span>
            </button>
            <pre className="overflow-x-auto">{PYTHON_FILES[activeFile]}</pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
