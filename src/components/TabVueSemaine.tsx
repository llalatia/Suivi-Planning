import React, { useState, useMemo } from 'react';
import { Semaine, Commande, PlanningCell } from '../data/initialData';
import { SemaineCalculated, nbHeures, nbBrodeuses } from '../utils/macroLogic';
import {
  Calendar,
  Star,
  Search,
  Check,
  Flag,
  AlertCircle,
  HelpCircle,
  Users,
  Clock,
  Layers,
} from 'lucide-react';

interface TabVueSemaineProps {
  semaines: SemaineCalculated[];
  commandes: Commande[];
  planning: PlanningCell[];
  currentSemaineCode: string;
  onSetCurrentSemaine: (code: string) => void;
  onSetPieces: (commandeId: number, semaineId: number, pieces: number, statut?: 'normal' | 'lancement' | 'limite_client') => void;
  onSetStatut: (commandeId: number, semaineId: number, statut: 'normal' | 'lancement' | 'limite_client') => void;
  onPlanifierCommande: (commandeId: number) => void;
}

export const TabVueSemaine: React.FC<TabVueSemaineProps> = ({
  semaines,
  commandes,
  planning,
  currentSemaineCode,
  onSetCurrentSemaine,
  onSetPieces,
  onSetStatut,
  onPlanifierCommande,
}) => {
  const [selectedWeekCode, setSelectedWeekCode] = useState<string>(currentSemaineCode || 'S34');
  const [filterQuery, setFilterQuery] = useState('');
  const [editingCellId, setEditingCellId] = useState<number | null>(null);
  const [tempPieces, setTempPieces] = useState<string>('');

  const activeSemaine = useMemo(() => {
    return semaines.find((s) => s.code === selectedWeekCode) || semaines[0];
  }, [semaines, selectedWeekCode]);

  // Planning for this week
  const planningMap = useMemo(() => {
    const map = new Map<number, PlanningCell>();
    if (!activeSemaine) return map;
    planning
      .filter((p) => p.semaine_id === activeSemaine.id)
      .forEach((p) => map.set(p.commande_id, p));
    return map;
  }, [planning, activeSemaine]);

  // Filter orders
  const filteredCommandes = useMemo(() => {
    return commandes.filter((c) => {
      if (!filterQuery.trim()) return true;
      const q = filterQuery.toLowerCase().trim();
      return c.client.toLowerCase().includes(q) || c.modele.toLowerCase().includes(q);
    });
  }, [commandes, filterQuery]);

  // Calculate totals for this week
  const weekTotals = useMemo(() => {
    let piecesTotal = 0;
    let heuresTotal = 0;

    commandes.forEach((c) => {
      const p = planningMap.get(c.id);
      const pcs = p?.nb_pieces || 0;
      if (pcs > 0) {
        piecesTotal += pcs;
        if (!c.heure_pcs_tbc && c.heure_pcs) {
          heuresTotal += pcs * c.heure_pcs;
        }
      }
    });

    heuresTotal = Math.round(heuresTotal * 100) / 100;
    const brodeusesTotal = Math.round((heuresTotal / 40.0) * 100) / 100;

    return {
      piecesTotal,
      heuresTotal,
      brodeusesTotal,
    };
  }, [commandes, planningMap]);

  const handleSavePieces = (commandeId: number) => {
    if (!activeSemaine) return;
    const parsed = parseFloat(tempPieces.replace(',', '.'));
    const val = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    onSetPieces(commandeId, activeSemaine.id, val);
    setEditingCellId(null);
  };

  return (
    <div className="space-y-4">
      {/* Control bar matching gui.py */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-700">Semaine :</span>
            <select
              value={selectedWeekCode}
              onChange={(e) => setSelectedWeekCode(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold font-mono px-3 py-1.5 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {semaines.map((s) => (
                <option key={s.id} value={s.code}>
                  {s.code} — {s.date_debut} {s.code === currentSemaineCode ? '(Courante)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => onSetCurrentSemaine(selectedWeekCode)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
              selectedWeekCode === currentSemaineCode
                ? 'bg-amber-100 text-amber-900 border-amber-300 cursor-default'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
            }`}
          >
            <Star
              className={`w-3.5 h-3.5 ${
                selectedWeekCode === currentSemaineCode ? 'text-amber-500 fill-amber-500' : 'text-slate-400'
              }`}
            />
            <span>
              {selectedWeekCode === currentSemaineCode
                ? '★ Semaine en cours'
                : 'Définir comme semaine en cours'}
            </span>
          </button>
        </div>

        {/* Filter search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filtrer client ou modèle..."
            className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg w-52 sm:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Table of commands for this week */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[580px]">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-300">
              <tr>
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[180px]">Client</th>
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[240px]">Modèle</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-right w-24">Heure / pcs</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-right min-w-[150px] bg-indigo-50/50 text-indigo-950 font-bold">
                  Nb pièces (Éditable)
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-right w-28">Nb d'heures</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-right w-28">Nb brodeuses</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-center min-w-[180px]">
                  Statut cellule
                </th>
                <th className="py-2.5 px-2 text-center w-12">Détail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {filteredCommandes.map((c) => {
                const cell = planningMap.get(c.id);
                const pieces = cell?.nb_pieces || 0;
                const statut = cell?.statut || 'normal';

                const heures =
                  pieces > 0 && !c.heure_pcs_tbc && c.heure_pcs
                    ? nbHeures(pieces, c.heure_pcs)
                    : null;
                const brodeuses = heures ? nbBrodeuses(heures) : null;

                const isEditing = editingCellId === c.id;

                // Cell color highlighting matching original Tkinter & Excel:
                // - Lancement: Orange (#FFD9A0)
                // - Limite client: Rouge (#FF9999)
                // - TBC: Jaune (#FFF2CC)
                let statusBgClass = '';
                if (statut === 'lancement') {
                  statusBgClass = 'bg-amber-100 border-amber-300 text-amber-900';
                } else if (statut === 'limite_client') {
                  statusBgClass = 'bg-rose-100 border-rose-300 text-rose-900';
                }

                return (
                  <tr
                    key={c.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      pieces > 0 ? 'font-medium' : 'text-slate-500'
                    }`}
                  >
                    <td className="py-2 px-3 font-semibold text-slate-900 font-sans border-r border-slate-100">
                      {c.client}
                    </td>

                    <td className="py-2 px-3 text-slate-800 font-sans border-r border-slate-100">
                      {c.modele}
                    </td>

                    <td className="py-2 px-3 text-right border-r border-slate-100">
                      {c.heure_pcs_tbc ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-bold">
                          TBC
                        </span>
                      ) : (
                        <span>{c.heure_pcs ?? '-'}</span>
                      )}
                    </td>

                    {/* Editable pieces cell */}
                    <td className="py-1.5 px-3 text-right bg-indigo-50/20 border-r border-slate-100 font-sans">
                      {isEditing ? (
                        <div className="flex items-center justify-end space-x-1">
                          <input
                            type="number"
                            step="any"
                            autoFocus
                            value={tempPieces}
                            onChange={(e) => setTempPieces(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSavePieces(c.id);
                              if (e.key === 'Escape') setEditingCellId(null);
                            }}
                            className="w-20 px-2 py-1 text-xs border-2 border-indigo-600 rounded bg-white text-right font-mono font-bold focus:outline-none"
                          />
                          <button
                            onClick={() => handleSavePieces(c.id)}
                            className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingCellId(c.id);
                            setTempPieces(pieces > 0 ? String(pieces) : '');
                          }}
                          className={`w-full text-right py-1 px-2 rounded hover:bg-indigo-100 transition font-mono ${
                            pieces > 0 ? 'font-bold text-indigo-900 text-sm' : 'text-slate-300'
                          }`}
                        >
                          {pieces > 0 ? pieces : '—'}
                        </button>
                      )}
                    </td>

                    <td className="py-2 px-3 text-right text-slate-700 border-r border-slate-100">
                      {heures !== null ? heures : c.heure_pcs_tbc && pieces > 0 ? 'TBC' : '—'}
                    </td>

                    <td className="py-2 px-3 text-right font-bold text-slate-800 border-r border-slate-100">
                      {brodeuses !== null ? brodeuses : c.heure_pcs_tbc && pieces > 0 ? 'TBC' : '—'}
                    </td>

                    {/* Cell status badge / switcher */}
                    <td className="py-2 px-3 text-center border-r border-slate-100 font-sans">
                      <div className="flex items-center justify-center space-x-1">
                        <select
                          value={statut}
                          onChange={(e) =>
                            onSetStatut(
                              c.id,
                              activeSemaine.id,
                              e.target.value as 'normal' | 'lancement' | 'limite_client'
                            )
                          }
                          className={`text-xs px-2 py-1 rounded font-medium border focus:outline-none cursor-pointer transition ${
                            statut === 'lancement'
                              ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                              : statut === 'limite_client'
                              ? 'bg-rose-100 border-rose-300 text-rose-900 font-bold'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <option value="normal">Normal</option>
                          <option value="lancement">🟠 Lancement</option>
                          <option value="limite_client">🔴 Limite client</option>
                        </select>
                      </div>
                    </td>

                    <td className="py-2 px-2 text-center font-sans">
                      <button
                        onClick={() => onPlanifierCommande(c.id)}
                        title="Voir tout le planning de cette commande"
                        className="text-slate-400 hover:text-indigo-600 p-1 rounded"
                      >
                        <Layers className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Summary Banner matching gui.py */}
        <div className="bg-slate-900 text-white px-6 py-3.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
              TOTAUX {activeSemaine.code}
            </span>
            <span className="text-xs text-slate-400">({activeSemaine.date_debut})</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-mono text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 font-sans">Pièces prévues :</span>
              <span className="text-sm font-bold text-white bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700">
                {weekTotals.piecesTotal}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400 font-sans">Total heures :</span>
              <span className="text-sm font-bold text-white bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700">
                {weekTotals.heuresTotal} h
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400 font-sans">Brodeuses nécessaires :</span>
              <span className="text-sm font-bold text-emerald-300 bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700">
                {weekTotals.brodeusesTotal}
              </span>
              <span className="text-[11px] text-slate-400 font-sans">(Base 40h/semaine)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Legend & quick helper */}
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-slate-700">Légende cellule :</span>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-amber-200 border border-amber-300 inline-block" />
            <span>Semaine de lancement</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-rose-200 border border-rose-300 inline-block" />
            <span>Limite livraison client</span>
          </div>
        </div>
        <p className="italic text-slate-500">
          Astuce : Cliquez directement sur le chiffre dans la colonne "Nb pièces" pour modifier la valeur.
        </p>
      </div>
    </div>
  );
};
