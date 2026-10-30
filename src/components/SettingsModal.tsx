import React, { useState } from 'react';
import { ProductionSettings, ProductionLine } from '../types';
import { Sliders, X, Building2, Check, RotateCcw } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ProductionSettings;
  lines: ProductionLine[];
  onSave: (updatedSettings: ProductionSettings, updatedLines: ProductionLine[]) => void;
  onResetToDefaults: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  lines,
  onSave,
  onResetToDefaults,
}) => {
  const [formData, setFormData] = useState<ProductionSettings>({ ...settings });
  const [linesData, setLinesData] = useState<ProductionLine[]>([...lines]);

  if (!isOpen) return null;

  const handleLineChange = (index: number, field: keyof ProductionLine, value: any) => {
    const updated = [...linesData];
    updated[index] = { ...updated[index], [field]: value };
    setLinesData(updated);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData, linesData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-600" />
            <span>Paramètres de Production & Capacités Machines</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="mt-4 space-y-4 text-xs">
          {/* Usine & Régime de Travail */}
          <div>
            <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Régime d'Atelier</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nom de l'Usine / Atelier</label>
                <input
                  type="text"
                  value={formData.factoryName}
                  onChange={(e) => setFormData({ ...formData, factoryName: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Jours Ouvrés / Semaine</label>
                <select
                  value={formData.workingDaysPerWeek}
                  onChange={(e) => setFormData({ ...formData, workingDaysPerWeek: parseInt(e.target.value) })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500"
                >
                  <option value={5}>5 jours (Lundi au Vendredi)</option>
                  <option value={6}>6 jours (Lundi au Samedi)</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Équipes (Shifts / jour)</label>
                <select
                  value={formData.shiftsPerDay}
                  onChange={(e) => {
                    const shifts = parseInt(e.target.value);
                    setFormData({ ...formData, shiftsPerDay: shifts });
                    // Mettre à jour capacité des lignes en conséquence
                    setLinesData(linesData.map((l) => ({ ...l, capacityHoursPerDay: shifts * 8 })));
                  }}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500"
                >
                  <option value={1}>1x8 (8h / jour)</option>
                  <option value={2}>2x8 (16h / jour - Matin / Après-midi)</option>
                  <option value={3}>3x8 (24h / jour - Nuit comprise)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Configuration des Lignes & Cadences */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="font-bold text-slate-800 mb-2">
              Lignes de Production (Cadences Nominales & Rendements)
            </h4>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {linesData.map((line, idx) => (
                <div
                  key={line.id}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-12 gap-2 items-center text-xs"
                >
                  <div className="col-span-5">
                    <span className="text-[10px] text-slate-400 block">Nom de la ligne</span>
                    <input
                      type="text"
                      value={line.name}
                      onChange={(e) => handleLineChange(idx, 'name', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-slate-800"
                    />
                  </div>

                  <div className="col-span-3">
                    <span className="text-[10px] text-slate-400 block">Cadence (pcs/h)</span>
                    <input
                      type="number"
                      min="1"
                      value={line.defaultCadence}
                      onChange={(e) => handleLineChange(idx, 'defaultCadence', parseInt(e.target.value) || 1)}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-mono"
                    />
                  </div>

                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 block">Rendement TRS</span>
                    <input
                      type="number"
                      min="50"
                      max="100"
                      value={Math.round(line.efficiencyRate * 100)}
                      onChange={(e) => handleLineChange(idx, 'efficiencyRate', (parseInt(e.target.value) || 85) / 100)}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-mono"
                    />
                  </div>

                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 block">Capacité (h/j)</span>
                    <input
                      type="number"
                      min="8"
                      max="24"
                      value={line.capacityHoursPerDay}
                      onChange={(e) => handleLineChange(idx, 'capacityHoursPerDay', parseInt(e.target.value) || 16)}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (confirm('Voulez-vous réinitialiser toutes les données aux valeurs par défaut ?')) {
                  onResetToDefaults();
                  onClose();
                }
              }}
              className="text-rose-600 hover:text-rose-700 text-xs font-medium flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réinitialiser Usine & Données</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Enregistrer les paramètres</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
