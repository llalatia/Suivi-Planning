import React, { useState } from 'react';
import { X, Plus, Save, Layers, Package, Target, Scissors, Building2 } from 'lucide-react';
import { MicroDailyRow } from '../../data/microPlanningTypes';

interface MicroPlanningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (row: Omit<MicroDailyRow, 'id' | 'date'>) => void;
  availableChains: string[];
}

export const MicroPlanningModal: React.FC<MicroPlanningModalProps> = ({
  isOpen,
  onClose,
  onSave,
  availableChains,
}) => {
  const [chaine, setChaine] = useState(availableChains[0] || 'MARGUERITE 1');
  const [customChaine, setCustomChaine] = useState('');
  const [modele, setModele] = useState('');
  const [of, setOf] = useState<number>(25);
  const [cumulJ1, setCumulJ1] = useState<number>(0);
  const [realPacking, setRealPacking] = useState<number>(0);
  const [alimChaine, setAlimChaine] = useState<number>(0);
  const [prodCoupe, setProdCoupe] = useState<number>(0);
  const [cumulCoupe, setCumulCoupe] = useState<number>(0);
  const [remarque, setRemarque] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modele.trim()) return;

    const finalChain = chaine === 'AUTRE' ? customChaine.trim() || 'CHAINE 1' : chaine;

    onSave({
      chaine: finalChain,
      modele: modele.trim(),
      of: Number(of) || 0,
      realPacking: Number(realPacking) || 0,
      cumulJ1: Number(cumulJ1) || 0,
      cumulPacking: (Number(cumulJ1) || 0) + (Number(realPacking) || 0),
      cumulCarton: (Number(cumulJ1) || 0) + (Number(realPacking) || 0),
      alimChaine: Number(alimChaine) || 0,
      prodCoupe: Number(prodCoupe) || 0,
      cumulCoupe: Number(cumulCoupe) || 0,
      pctCoupe: Number(of) > 0 ? (Number(cumulCoupe) || 0) / Number(of) : 0,
      remarque: remarque.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden text-slate-800">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold tracking-tight">
              Ajouter un Modèle / Ligne d'OF — Micro-Planning
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Chaîne & Modèle */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                Chaîne / Ligne de production
              </label>
              <select
                value={chaine}
                onChange={(e) => setChaine(e.target.value)}
                className="w-full text-xs font-medium border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
              >
                {availableChains.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="AUTRE">+ Nouvelle chaîne...</option>
              </select>
              {chaine === 'AUTRE' && (
                <input
                  type="text"
                  placeholder="Nom de la chaîne..."
                  value={customChaine}
                  onChange={(e) => setCustomChaine(e.target.value)}
                  className="mt-1.5 w-full text-xs border border-indigo-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-indigo-600" />
                Modèle / Style / Référence
              </label>
              <input
                type="text"
                placeholder="Ex: BLIOVA BURNT ORANGE FR1"
                value={modele}
                onChange={(e) => setModele(e.target.value)}
                className="w-full text-xs font-medium border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          {/* Quantités OF & Réalisations */}
          <div className="grid grid-cols-3 gap-3.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Target className="w-3 h-3 text-slate-500" />
                OF (Quantité Totale)
              </label>
              <input
                type="number"
                min="1"
                value={of}
                onChange={(e) => setOf(Number(e.target.value))}
                className="w-full text-xs font-bold text-slate-900 border border-slate-300 rounded px-2 py-1 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Cumul J-1 (Veille)
              </label>
              <input
                type="number"
                min="0"
                value={cumulJ1}
                onChange={(e) => setCumulJ1(Number(e.target.value))}
                className="w-full text-xs font-medium text-slate-800 border border-slate-300 rounded px-2 py-1 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-emerald-700 mb-1">
                Réalisé Jour J
              </label>
              <input
                type="number"
                min="0"
                value={realPacking}
                onChange={(e) => setRealPacking(Number(e.target.value))}
                className="w-full text-xs font-bold text-emerald-800 border border-emerald-300 bg-emerald-50/50 rounded px-2 py-1"
              />
            </div>
          </div>

          {/* Coupe & Alimentation */}
          <div className="grid grid-cols-3 gap-3.5 bg-sky-50/50 p-3 rounded-lg border border-sky-100">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1 flex items-center gap-1">
                <Scissors className="w-3 h-3 text-sky-600" />
                Alim. Chaîne (Dispo)
              </label>
              <input
                type="number"
                min="0"
                value={alimChaine}
                onChange={(e) => setAlimChaine(Number(e.target.value))}
                className="w-full text-xs border border-slate-300 rounded px-2 py-1 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Production Coupe Jour
              </label>
              <input
                type="number"
                min="0"
                value={prodCoupe}
                onChange={(e) => setProdCoupe(Number(e.target.value))}
                className="w-full text-xs border border-slate-300 rounded px-2 py-1 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Cumul Quantité Coupée
              </label>
              <input
                type="number"
                min="0"
                value={cumulCoupe}
                onChange={(e) => setCumulCoupe(Number(e.target.value))}
                className="w-full text-xs border border-slate-300 rounded px-2 py-1 bg-white"
              />
            </div>
          </div>

          {/* Remarque */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Remarque / Note d'atelier
            </label>
            <input
              type="text"
              placeholder="Ex: En attente composants, validation échantillon..."
              value={remarque}
              onChange={(e) => setRemarque(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Enregistrer le Modèle</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
