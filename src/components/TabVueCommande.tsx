import React, { useState, useMemo } from 'react';
import { Commande, Semaine, PlanningCell } from '../data/initialData';
import { CommandeCalculated, nbHeures, nbBrodeuses } from '../utils/macroLogic';
import {
  Calendar,
  Layers,
  Sparkles,
  Check,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

interface TabVueCommandeProps {
  commandes: CommandeCalculated[];
  semaines: Semaine[];
  planning: PlanningCell[];
  currentSemaineCode: string;
  selectedCommandeId: number | null;
  onSelectCommandeId: (id: number) => void;
  onSetPieces: (commandeId: number, semaineId: number, pieces: number) => void;
  onSetStatut: (commandeId: number, semaineId: number, statut: 'normal' | 'lancement' | 'limite_client') => void;
  onAutoDispatch: (commandeId: number) => void;
}

export const TabVueCommande: React.FC<TabVueCommandeProps> = ({
  commandes,
  semaines,
  planning,
  currentSemaineCode,
  selectedCommandeId,
  onSelectCommandeId,
  onSetPieces,
  onSetStatut,
  onAutoDispatch,
}) => {
  const [editingSemaineId, setEditingSemaineId] = useState<number | null>(null);
  const [tempPieces, setTempPieces] = useState<string>('');

  const activeCmd = useMemo(() => {
    if (selectedCommandeId) {
      const found = commandes.find((c) => c.id === selectedCommandeId);
      if (found) return found;
    }
    return commandes[0] || null;
  }, [commandes, selectedCommandeId]);

  // Map of planning for this command
  const planningMap = useMemo(() => {
    const map = new Map<number, PlanningCell>();
    if (!activeCmd) return map;
    planning
      .filter((p) => p.commande_id === activeCmd.id)
      .forEach((p) => map.set(p.semaine_id, p));
    return map;
  }, [planning, activeCmd]);

  const handleSavePieces = (semaineId: number) => {
    if (!activeCmd) return;
    const parsed = parseFloat(tempPieces.replace(',', '.'));
    const val = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    onSetPieces(activeCmd.id, semaineId, val);
    setEditingSemaineId(null);
  };

  if (!activeCmd) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        Aucune commande disponible.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selector & Top Actions */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Commande :</span>
          <select
            value={activeCmd.id}
            onChange={(e) => onSelectCommandeId(Number(e.target.value))}
            className="bg-slate-50 border border-slate-300 text-slate-900 text-xs font-semibold px-3 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none w-full sm:w-[480px]"
          >
            {commandes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.client} — {c.modele} (#{c.id}) [Reste: {c.resteAFaire} {c.unite}]
              </option>
            ))}
          </select>
        </div>

        {activeCmd.statut === 'sous_planifie' && (
          <button
            onClick={() => onAutoDispatch(activeCmd.id)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 rounded-lg text-xs font-bold shadow-sm transition"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>Auto-Dispatch manquant (+{activeCmd.manquant} pcs)</span>
          </button>
        )}
      </div>

      {/* KPI Information Banner matching gui.py */}
      <div
        className={`p-4 rounded-xl border shadow-sm flex flex-wrap items-center justify-between gap-4 ${
          activeCmd.statut === 'sous_planifie'
            ? 'bg-rose-50/80 border-rose-200 text-rose-950'
            : activeCmd.statut === 'termine'
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
            : 'bg-indigo-50/60 border-indigo-200 text-indigo-950'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold tracking-tight">
              {activeCmd.client} — {activeCmd.modele}
            </h2>
            <span className="text-xs px-2 py-0.5 rounded font-mono font-medium bg-white/70 border border-slate-200">
              #{activeCmd.id}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span>
              Cadence standard :{' '}
              <strong className="font-mono">
                {activeCmd.heure_pcs_tbc ? 'TBC (À confirmer)' : `${activeCmd.heure_pcs} h / pièce`}
              </strong>
            </span>
            {activeCmd.date_lancement && (
              <span>
                Lancement : <strong className="font-mono">{activeCmd.date_lancement}</strong>
              </span>
            )}
            {activeCmd.date_limite_client && (
              <span className="text-rose-700 font-medium">
                Limite client : <strong className="font-mono">{activeCmd.date_limite_client}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Quantities bar */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-slate-500 font-sans block text-[10px]">Qté commande</span>
            <span className="font-bold text-slate-800 text-sm">
              {activeCmd.qte_commande} {activeCmd.unite}
            </span>
          </div>

          <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-slate-500 font-sans block text-[10px]">Qté finie</span>
            <span className="font-bold text-slate-600 text-sm">{activeCmd.qte_finie}</span>
          </div>

          <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-slate-500 font-sans block text-[10px]">Reste à faire</span>
            <span className="font-bold text-indigo-700 text-sm">{activeCmd.resteAFaire}</span>
          </div>

          <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-slate-500 font-sans block text-[10px]">Total programmé</span>
            <span className="font-bold text-slate-900 text-sm">{activeCmd.totalProgramme}</span>
          </div>

          <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-slate-500 font-sans block text-[10px]">Écart</span>
            <span
              className={`font-bold text-sm ${
                activeCmd.ecart < 0
                  ? 'text-rose-600'
                  : activeCmd.ecart > 0
                  ? 'text-indigo-600'
                  : 'text-emerald-600'
              }`}
            >
              {activeCmd.ecart > 0 ? `+${activeCmd.ecart}` : activeCmd.ecart}
            </span>
          </div>

          <div className="pl-2">
            {activeCmd.statut === 'sous_planifie' && (
              <span className="px-3 py-1.5 rounded-lg font-sans text-xs font-bold bg-rose-200 text-rose-900 border border-rose-300 inline-flex items-center">
                <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-700" />
                Sous-planifié (Manque {activeCmd.manquant} pcs)
              </span>
            )}
            {activeCmd.statut === 'termine' && (
              <span className="px-3 py-1.5 rounded-lg font-sans text-xs font-bold bg-emerald-200 text-emerald-900 border border-emerald-300 inline-flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                Terminé ✅
              </span>
            )}
            {activeCmd.statut === 'ok' && (
              <span className="px-3 py-1.5 rounded-lg font-sans text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300 inline-flex items-center">
                Planning Complet
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 23-week schedule table matching gui.py */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[580px]">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-300">
              <tr>
                <th className="py-2.5 px-4 border-r border-slate-200 w-28 text-center">Semaine</th>
                <th className="py-2.5 px-4 border-r border-slate-200 w-36 text-center">Date début</th>
                <th className="py-2.5 px-4 border-r border-slate-200 text-right min-w-[160px] bg-indigo-50/50 text-indigo-950 font-bold">
                  Nb pièces (Éditable)
                </th>
                <th className="py-2.5 px-4 border-r border-slate-200 text-right w-36">Nb d'heures</th>
                <th className="py-2.5 px-4 border-r border-slate-200 text-right w-36">
                  Nb brodeuses
                </th>
                <th className="py-2.5 px-4 text-center min-w-[180px]">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {semaines.map((s) => {
                const cell = planningMap.get(s.id);
                const pieces = cell?.nb_pieces || 0;
                const statut = cell?.statut || 'normal';
                const isCourante = s.code === currentSemaineCode;

                const heures =
                  pieces > 0 && !activeCmd.heure_pcs_tbc && activeCmd.heure_pcs
                    ? nbHeures(pieces, activeCmd.heure_pcs)
                    : null;
                const brodeuses = heures ? nbBrodeuses(heures) : null;

                const isEditing = editingSemaineId === s.id;

                // Row background colors:
                // - Current week: Jaune clair (#FFFACD)
                // - Lancement: Orange (#FFD9A0)
                // - Limite client: Rouge (#FF9999)
                let rowBgClass = 'hover:bg-slate-50';
                if (statut === 'lancement') {
                  rowBgClass = 'bg-amber-50/80 hover:bg-amber-100/70';
                } else if (statut === 'limite_client') {
                  rowBgClass = 'bg-rose-50/80 hover:bg-rose-100/70';
                } else if (isCourante) {
                  rowBgClass = 'bg-amber-50/40 hover:bg-amber-100/50';
                }

                return (
                  <tr key={s.id} className={`transition-colors ${rowBgClass}`}>
                    <td className="py-2 px-4 text-center border-r border-slate-100">
                      <div className="flex items-center justify-center space-x-1">
                        <span className="font-bold text-slate-900">{s.code}</span>
                        {isCourante && (
                          <span
                            title="Semaine active"
                            className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-bold font-sans"
                          >
                            Courante
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2 px-4 text-center text-slate-600 border-r border-slate-100">
                      {s.date_debut}
                    </td>

                    {/* Editable pieces cell */}
                    <td className="py-1.5 px-4 text-right bg-indigo-50/20 border-r border-slate-100 font-sans">
                      {isEditing ? (
                        <div className="flex items-center justify-end space-x-1">
                          <input
                            type="number"
                            step="any"
                            autoFocus
                            value={tempPieces}
                            onChange={(e) => setTempPieces(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSavePieces(s.id);
                              if (e.key === 'Escape') setEditingSemaineId(null);
                            }}
                            className="w-24 px-2 py-1 text-xs border-2 border-indigo-600 rounded bg-white text-right font-mono font-bold focus:outline-none"
                          />
                          <button
                            onClick={() => handleSavePieces(s.id)}
                            className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingSemaineId(s.id);
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

                    <td className="py-2 px-4 text-right text-slate-700 border-r border-slate-100">
                      {heures !== null ? heures : activeCmd.heure_pcs_tbc && pieces > 0 ? 'TBC' : '—'}
                    </td>

                    <td className="py-2 px-4 text-right font-bold text-slate-800 border-r border-slate-100">
                      {brodeuses !== null ? brodeuses : activeCmd.heure_pcs_tbc && pieces > 0 ? 'TBC' : '—'}
                    </td>

                    {/* Statut selector */}
                    <td className="py-2 px-4 text-center font-sans">
                      <select
                        value={statut}
                        onChange={(e) =>
                          onSetStatut(
                            activeCmd.id,
                            s.id,
                            e.target.value as 'normal' | 'lancement' | 'limite_client'
                          )
                        }
                        className={`text-xs px-2.5 py-1 rounded font-medium border focus:outline-none cursor-pointer transition ${
                          statut === 'lancement'
                            ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                            : statut === 'limite_client'
                            ? 'bg-rose-100 border-rose-300 text-rose-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <option value="normal">Normal</option>
                        <option value="lancement">🟠 Semaine de lancement</option>
                        <option value="limite_client">🔴 Limite livraison client</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
