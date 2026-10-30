import React, { useState, useMemo } from 'react';
import { MicroJob, MicroDailyRow } from '../../data/microPlanningTypes';
import { ColorPickerPopover } from './ColorPickerPopover';
import {
  X,
  Palette,
  Search,
  Filter,
  Layers,
  Activity,
  CheckCircle2,
  Clock,
  Package,
  TrendingUp,
  Plus,
  Sliders,
  Calendar,
} from 'lucide-react';

interface VueGlobaleModelesModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: MicroJob[];
  rows: MicroDailyRow[];
  modelColors: Record<string, string>;
  onSetModelColor: (modelName: string, color: string) => void;
  onOpenModel360: (job: MicroJob) => void;
  onAddNewJob?: (newJob: {
    chaine: string;
    client: string;
    style: string;
    qtyTotal: number;
    objJour: number;
    color?: string;
  }) => void;
  availableChains: string[];
}

export const VueGlobaleModelesModal: React.FC<VueGlobaleModelesModalProps> = ({
  isOpen,
  onClose,
  jobs,
  rows,
  modelColors,
  onSetModelColor,
  onOpenModel360,
  onAddNewJob,
  availableChains,
}) => {
  const [search, setSearch] = useState('');
  const [chainFilter, setChainFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DONE'>('ALL');
  const [isAddingNew, setIsAddingNew] = useState(false);

  // New model form state
  const [newStyle, setNewStyle] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newChain, setNewChain] = useState(availableChains[0] || 'MARGUERITE 1');
  const [newQty, setNewQty] = useState(100);
  const [newTarget, setNewTarget] = useState(20);
  const [newColor, setNewColor] = useState('#2563EB');

  // Aggregated models view (unique models by style and chain)
  const aggregatedModels = useMemo(() => {
    return jobs.map((job) => {
      // Find matching row in daily tracking if any
      const matchingRow = rows.find(
        (r) =>
          r.modele.toLowerCase().trim() === job.style.toLowerCase().trim() ||
          job.style.toLowerCase().includes(r.modele.toLowerCase().trim())
      );

      const ofQty = job.qtyTotal || matchingRow?.of || 0;
      const realizedQty = matchingRow?.cumulPacking ?? job.cumulRealise ?? 0;
      const remainingQty = Math.max(0, ofQty - realizedQty);
      const progressPct = ofQty > 0 ? Math.min(100, Math.round((realizedQty / ofQty) * 100)) : 0;
      const isDone = ofQty > 0 && realizedQty >= ofQty;

      return {
        job,
        style: job.style,
        client: job.client || matchingRow?.client || '—',
        chaine: job.chaine || matchingRow?.chaine || '—',
        qtyTotal: ofQty,
        cumulRealise: realizedQty,
        remainingQty,
        progressPct,
        isDone,
        objJour: job.objJour || 20,
        color: job.color || modelColors[job.style.trim().toUpperCase()] || '#2563EB',
      };
    });
  }, [jobs, rows, modelColors]);

  // Filtered list
  const filtered = useMemo(() => {
    return aggregatedModels.filter((m) => {
      const matchSearch =
        !search ||
        m.style.toLowerCase().includes(search.toLowerCase()) ||
        m.client.toLowerCase().includes(search.toLowerCase()) ||
        m.chaine.toLowerCase().includes(search.toLowerCase());
      const matchChain = chainFilter === 'ALL' || m.chaine.toLowerCase().includes(chainFilter.toLowerCase());
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'DONE' && m.isDone) ||
        (statusFilter === 'ACTIVE' && !m.isDone);
      return matchSearch && matchChain && matchStatus;
    });
  }, [aggregatedModels, search, chainFilter, statusFilter]);

  // Global KPIs
  const totalOf = useMemo(
    () => aggregatedModels.reduce((acc, m) => acc + m.qtyTotal, 0),
    [aggregatedModels]
  );
  const totalRealized = useMemo(
    () => aggregatedModels.reduce((acc, m) => acc + m.cumulRealise, 0),
    [aggregatedModels]
  );
  const globalProgress = totalOf > 0 ? Math.round((totalRealized / totalOf) * 100) : 0;

  if (!isOpen) return null;

  const handleCreateNewJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStyle.trim()) return;
    if (onAddNewJob) {
      onAddNewJob({
        style: newStyle.trim(),
        client: newClient.trim() || 'CLIENT',
        chaine: newChain,
        qtyTotal: Number(newQty) || 100,
        objJour: Number(newTarget) || 20,
        color: newColor,
      });
    }
    onSetModelColor(newStyle.trim(), newColor);
    setIsAddingNew(false);
    setNewStyle('');
    setNewClient('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-300 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg border border-slate-700">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-wide text-white uppercase">
                  Vue Globale & Couleurs des Modèles
                </h2>
                <span className="bg-[#FFFF00] text-slate-950 text-[10px] px-2 py-0.5 rounded font-black">
                  {jobs.length} Modèles OF
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Assignez une couleur distincte à chaque modèle pour les repérer instantanément dans la simulation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Summary KPI Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs shrink-0">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Modèles</span>
              <p className="text-base font-black text-slate-900">{aggregatedModels.length}</p>
            </div>
            <div className="border-l border-slate-300 pl-6">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Volume OF Total</span>
              <p className="text-base font-black text-slate-900">{totalOf.toLocaleString()} pcs</p>
            </div>
            <div className="border-l border-slate-300 pl-6">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Cumul Emballé</span>
              <p className="text-base font-black text-slate-900">
                {totalRealized.toLocaleString()} pcs
              </p>
            </div>
            <div className="border-l border-slate-300 pl-6">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Avancement Moyen</span>
              <p className="text-base font-black text-slate-900">{globalProgress}%</p>
            </div>
          </div>

          {/* Quick Action: Add New Model */}
          {onAddNewJob && (
            <button
              onClick={() => setIsAddingNew(!isAddingNew)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Nouveau Modèle / OF</span>
            </button>
          )}
        </div>

        {/* Add New Model Drawer */}
        {isAddingNew && (
          <form
            onSubmit={handleCreateNewJob}
            className="bg-slate-50 border-b border-slate-300 p-4 shrink-0 grid grid-cols-1 md:grid-cols-6 gap-3 items-end text-xs animate-in slide-in-from-top duration-150"
          >
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Nom du Modèle / Style *
              </label>
              <input
                type="text"
                required
                placeholder="ex: BLIOVA ORANGE"
                value={newStyle}
                onChange={(e) => setNewStyle(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Client</label>
              <input
                type="text"
                placeholder="ex: BULGARI"
                value={newClient}
                onChange={(e) => setNewClient(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Chaîne</label>
              <select
                value={newChain}
                onChange={(e) => setNewChain(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900"
              >
                {availableChains.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">OF (pcs)</label>
              <input
                type="number"
                min="1"
                value={newQty}
                onChange={(e) => setNewQty(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 text-xs font-mono font-bold focus:outline-none focus:border-slate-900"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Couleur</label>
                <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-md px-2 py-1">
                  <ColorPickerPopover
                    currentColor={newColor}
                    onChangeColor={setNewColor}
                    size="sm"
                  />
                  <span className="font-mono text-[10px] font-bold truncate">{newColor}</span>
                </div>
              </div>
              <button
                type="submit"
                className="px-3 py-2 bg-slate-900 text-white rounded-md text-xs font-bold hover:bg-black transition cursor-pointer shrink-0 mt-5"
              >
                Créer
              </button>
            </div>
          </form>
        )}

        {/* Filters and Search Bar */}
        <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher modèle, client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs w-56 focus:outline-none focus:border-slate-900"
              />
            </div>

            {/* Chain Filter */}
            <select
              value={chainFilter}
              onChange={(e) => setChainFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-slate-900 cursor-pointer"
            >
              <option value="ALL">Toutes les chaînes ({jobs.length})</option>
              {availableChains.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-300 text-xs">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-900 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-slate-900 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                En cours
              </button>
              <button
                onClick={() => setStatusFilter('DONE')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                  statusFilter === 'DONE'
                    ? 'bg-slate-900 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Soldés / Terminés
              </button>
            </div>
          </div>

          <span className="text-xs text-slate-500 font-mono">
            {filtered.length} modèle(s) affiché(s)
          </span>
        </div>

        {/* Models Grid / List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p>Aucun modèle ne correspond à vos filtres.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((m) => (
                <div
                  key={`${m.job.id}_${m.style}`}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs hover:shadow-md transition-shadow relative flex flex-col justify-between overflow-hidden"
                  style={{
                    borderLeft: `5px solid ${m.color}`,
                  }}
                >
                  <div>
                    {/* Top line: Color picker + Style + Status */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <ColorPickerPopover
                          currentColor={m.color}
                          onChangeColor={(newCol) => onSetModelColor(m.style, newCol)}
                          title={`Changer la couleur du modèle ${m.style}`}
                          size="md"
                        />
                        <div className="min-w-0">
                          <h3
                            className="font-black text-slate-900 text-xs truncate cursor-pointer hover:underline"
                            onClick={() => onOpenModel360(m.job)}
                            title={m.style}
                          >
                            {m.style}
                          </h3>
                          <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 font-medium">
                            <span>{m.client}</span>
                            <span>•</span>
                            <span className="truncate">{m.chaine.split(' ')[0]}</span>
                          </div>
                        </div>
                      </div>

                      {m.isDone ? (
                        <span className="bg-slate-100 text-slate-800 text-[9.5px] font-black uppercase px-1.5 py-0.5 rounded border border-slate-300 shrink-0">
                          Soldé
                        </span>
                      ) : (
                        <span className="bg-slate-900 text-white text-[9.5px] font-bold px-1.5 py-0.5 rounded shrink-0">
                          {m.objJour}p/j
                        </span>
                      )}
                    </div>

                    {/* Progress Bar with Model Color */}
                    <div className="space-y-1 my-2">
                      <div className="flex items-center justify-between text-[10.5px] font-mono">
                        <span className="text-slate-600">
                          {m.cumulRealise} / {m.qtyTotal} pcs
                        </span>
                        <span className="font-bold text-slate-900">{m.progressPct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${m.progressPct}%`,
                            backgroundColor: m.color,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] mt-2">
                    <span className="text-slate-500 font-medium">
                      Reste : <b className="text-slate-800 font-mono">{m.remainingQty} pcs</b>
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenModel360(m.job)}
                      className="flex items-center gap-1 font-bold text-slate-900 hover:text-black hover:underline cursor-pointer"
                    >
                      <span>Fiche 360°</span>
                      <Activity className="w-3 h-3 text-slate-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-300 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFFF00] border border-amber-400" />
            La date du jour ({jobs[0] ? '12/10' : ''}) et la semaine active (S41) conservent le jaune vif d'imposition
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-black text-white font-bold rounded-lg cursor-pointer transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
