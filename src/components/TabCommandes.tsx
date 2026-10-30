import React, { useState, useMemo } from 'react';
import { CommandeCalculated } from '../utils/macroLogic';
import { Commande } from '../data/initialData';
import {
  Plus,
  Edit2,
  Copy,
  Trash2,
  Calendar,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface TabCommandesProps {
  commandes: CommandeCalculated[];
  onAdd: () => void;
  onEdit: (cmd: Commande) => void;
  onDuplicate: (id: number) => void;
  onDelete: (id: number) => void;
  onPlanifier: (id: number) => void;
}

export const TabCommandes: React.FC<TabCommandesProps> = ({
  commandes,
  onAdd,
  onEdit,
  onDuplicate,
  onDelete,
  onPlanifier,
}) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sous_planifie' | 'termine' | 'tbc'>('all');

  // Filtered orders
  const filteredCommandes = useMemo(() => {
    return commandes.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || c.client.toLowerCase().includes(q) || c.modele.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (statusFilter === 'sous_planifie') return c.statut === 'sous_planifie';
      if (statusFilter === 'termine') return c.statut === 'termine';
      if (statusFilter === 'tbc') return c.heure_pcs_tbc === 1;

      return true;
    });
  }, [commandes, searchQuery, statusFilter]);

  const selectedCmd = useMemo(() => {
    return commandes.find((c) => c.id === selectedId) || null;
  }, [commandes, selectedId]);

  return (
    <div className="space-y-4">
      {/* Action Toolbar matching gui.py */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Left: action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onAdd}
            className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Ajouter</span>
          </button>

          <button
            onClick={() => selectedCmd && onEdit(selectedCmd)}
            disabled={!selectedCmd}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition ${
              selectedCmd
                ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
            }`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Modifier</span>
          </button>

          <button
            onClick={() => selectedId !== null && onDuplicate(selectedId)}
            disabled={!selectedCmd}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition ${
              selectedCmd
                ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Dupliquer</span>
          </button>

          <button
            onClick={() => {
              if (selectedId !== null && window.confirm("Supprimer définitivement cette commande et son planning associé ?")) {
                onDelete(selectedId);
                setSelectedId(null);
              }
            }}
            disabled={!selectedCmd}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition ${
              selectedCmd
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Supprimer</span>
          </button>

          <div className="h-6 w-px bg-slate-200 mx-1" />

          <button
            onClick={() => selectedId !== null && onPlanifier(selectedId)}
            disabled={!selectedCmd}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold transition shadow-sm ${
              selectedCmd
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Planifier ➜</span>
          </button>
        </div>

        {/* Right: Search & filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter Chips */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                statusFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tous ({commandes.length})
            </button>
            <button
              onClick={() => setStatusFilter('sous_planifie')}
              className={`px-2.5 py-1 rounded-md font-medium transition flex items-center space-x-1 ${
                statusFilter === 'sous_planifie' ? 'bg-rose-100 text-rose-800 shadow-sm font-semibold' : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              <span>Sous-planifiés</span>
            </button>
            <button
              onClick={() => setStatusFilter('termine')}
              className={`px-2.5 py-1 rounded-md font-medium transition flex items-center space-x-1 ${
                statusFilter === 'termine' ? 'bg-emerald-100 text-emerald-800 shadow-sm font-semibold' : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>Terminés</span>
            </button>
            <button
              onClick={() => setStatusFilter('tbc')}
              className={`px-2.5 py-1 rounded-md font-medium transition flex items-center space-x-1 ${
                statusFilter === 'tbc' ? 'bg-amber-100 text-amber-800 shadow-sm font-semibold' : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              <span>TBC</span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer client ou modèle..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg w-48 sm:w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Orders Table matching original layout & styling */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[620px]">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-300">
              <tr>
                <th className="py-2.5 px-3 border-r border-slate-200 w-10 text-center">#</th>
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[170px]">Client</th>
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[220px]">Modèle</th>
                <th className="py-2.5 px-2.5 border-r border-slate-200 text-right">Qté Commande</th>
                <th className="py-2.5 px-2 border-r border-slate-200 text-center">Unité</th>
                <th className="py-2.5 px-2.5 border-r border-slate-200 text-right">Heure/Pcs</th>
                <th className="py-2.5 px-2.5 border-r border-slate-200 text-right">Qté Finie</th>
                <th className="py-2.5 px-2.5 border-r border-slate-200 text-right bg-slate-200/50">Reste à faire</th>
                <th className="py-2.5 px-2.5 border-r border-slate-200 text-right bg-slate-200/50">Total Programmé</th>
                <th className="py-2.5 px-2.5 border-r border-slate-200 text-right">Écart</th>
                <th className="py-2.5 px-3 text-center min-w-[130px]">Statut</th>
                <th className="py-2.5 px-2 text-center w-12">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {filteredCommandes.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-500 font-sans">
                    Aucune commande trouvée pour ces critères de recherche.
                  </td>
                </tr>
              ) : (
                filteredCommandes.map((c) => {
                  const isSelected = c.id === selectedId;

                  // Row background colors identical to original app:
                  // - Under-planned: Rose clair (#FFC7CE)
                  // - Completed: Vert clair (#C6EFCE)
                  // - TBC: Jaune clair (#FFF2CC)
                  let rowColorClass = 'hover:bg-indigo-50/50';
                  if (isSelected) {
                    rowColorClass = 'bg-indigo-100/70 ring-1 ring-indigo-500';
                  } else if (c.statut === 'sous_planifie') {
                    rowColorClass = 'bg-rose-50/70 hover:bg-rose-100/60';
                  } else if (c.statut === 'termine') {
                    rowColorClass = 'bg-emerald-50/70 hover:bg-emerald-100/60';
                  } else if (c.heure_pcs_tbc) {
                    rowColorClass = 'bg-amber-50/70 hover:bg-amber-100/60';
                  }

                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      onDoubleClick={() => onPlanifier(c.id)}
                      className={`cursor-pointer transition-colors ${rowColorClass}`}
                    >
                      <td className="py-2 px-3 text-center text-slate-400 font-sans text-[11px] border-r border-slate-100">
                        {c.id}
                      </td>

                      <td className="py-2 px-3 font-semibold text-slate-900 font-sans border-r border-slate-100">
                        {c.client}
                      </td>

                      <td className="py-2 px-3 text-slate-800 font-sans font-medium border-r border-slate-100">
                        {c.modele}
                      </td>

                      <td className="py-2 px-2.5 text-right font-bold text-slate-800 border-r border-slate-100">
                        {c.qte_commande}
                      </td>

                      <td className="py-2 px-2 text-center text-slate-500 font-sans border-r border-slate-100">
                        {c.unite}
                      </td>

                      <td className="py-2 px-2.5 text-right border-r border-slate-100">
                        {c.heure_pcs_tbc ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-bold">
                            TBC
                          </span>
                        ) : (
                          <span>{c.heure_pcs ?? '-'}</span>
                        )}
                      </td>

                      <td className="py-2 px-2.5 text-right text-slate-600 border-r border-slate-100">
                        {c.qte_finie}
                      </td>

                      <td className="py-2 px-2.5 text-right font-bold text-indigo-900 bg-slate-50/40 border-r border-slate-100">
                        {c.resteAFaire}
                      </td>

                      <td className="py-2 px-2.5 text-right font-bold text-slate-900 bg-slate-50/40 border-r border-slate-100">
                        {c.totalProgramme}
                      </td>

                      <td className="py-2 px-2.5 text-right border-r border-slate-100">
                        <span
                          className={`font-semibold ${
                            c.ecart < 0
                              ? 'text-rose-600 font-bold'
                              : c.ecart > 0
                              ? 'text-indigo-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {c.ecart > 0 ? `+${c.ecart}` : c.ecart}
                        </span>
                      </td>

                      <td className="py-2 px-3 text-center border-r border-slate-100 font-sans">
                        {c.statut === 'sous_planifie' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-200 text-rose-900 border border-rose-300">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Sous-planifié
                          </span>
                        )}
                        {c.statut === 'termine' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-200 text-emerald-900 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Terminé
                          </span>
                        )}
                        {c.statut === 'ok' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            OK
                          </span>
                        )}
                      </td>

                      <td className="py-2 px-2 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlanifier(c.id);
                          }}
                          title="Ouvrir le planning détaillé"
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer legend identical to Python README */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-semibold text-slate-700">Légende :</span>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-rose-200 border border-rose-300 inline-block" />
              <span>Rose : Sous-planifié (Reste à faire &gt; Total programmé)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-emerald-200 border border-emerald-300 inline-block" />
              <span>Vert : Commande terminée</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-amber-200 border border-amber-300 inline-block" />
              <span>Jaune : Heure / pièce TBC (à confirmer)</span>
            </div>
          </div>
          <div className="text-slate-500 italic">
            Astuce : Double-cliquez sur une ligne pour ouvrir sa vue de planification.
          </div>
        </div>
      </div>
    </div>
  );
};
