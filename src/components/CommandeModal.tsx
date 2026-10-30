import React, { useState, useEffect, useMemo } from 'react';
import { Commande, Semaine, INITIAL_PLANNING_DATA } from '../data/initialData';
import { resolveWeekIndexFromCodeOrDate, HEURES_PAR_BRODEUSE_SEMAINE } from '../utils/macroLogic';
import { getDateFromWeekCode, getCalendarWeek } from '../utils/calendarUtils';
import { X, Check, Users } from 'lucide-react';

interface CommandeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Commande, 'id' | 'ordre' | 'archive'>) => void;
  initialData?: Commande | null;
  semaines?: Semaine[];
}

export const CommandeModal: React.FC<CommandeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  semaines = INITIAL_PLANNING_DATA.semaines,
}) => {
  const [client, setClient] = useState('');
  const [modele, setModele] = useState('');
  const [qteCommande, setQteCommande] = useState('');
  const [unite, setUnite] = useState('PCS');
  const [heurePcs, setHeurePcs] = useState('');
  const [isTbc, setIsTbc] = useState(false);
  const [qteFinie, setQteFinie] = useState('0');
  const [nbBrodeusesDispo, setNbBrodeusesDispo] = useState('');
  const [semaineLancement, setSemaineLancement] = useState('S34');
  const [semaineLimiteClient, setSemaineLimiteClient] = useState('S38');
  const [dateLancement, setDateLancement] = useState('');
  const [dateLimiteClient, setDateLimiteClient] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setErrorMsg(null);
    if (initialData) {
      setClient(initialData.client || '');
      setModele(initialData.modele || '');
      setQteCommande(String(initialData.qte_commande || ''));
      setUnite(initialData.unite || 'PCS');
      setHeurePcs(initialData.heure_pcs !== null ? String(initialData.heure_pcs) : '');
      setIsTbc(Boolean(initialData.heure_pcs_tbc));
      setQteFinie(String(initialData.qte_finie || 0));
      setNbBrodeusesDispo(
        initialData.nb_brodeuses_dispo !== null && initialData.nb_brodeuses_dispo !== undefined
          ? String(initialData.nb_brodeuses_dispo)
          : ''
      );
      setSemaineLancement(initialData.semaine_lancement || '');
      setSemaineLimiteClient(initialData.semaine_limite_client || '');
      setDateLancement(initialData.date_lancement || '');
      setDateLimiteClient(initialData.date_limite_client || '');
      setNotes(initialData.notes || '');
    } else {
      setClient('');
      setModele('');
      setQteCommande('');
      setUnite('PCS');
      setHeurePcs('');
      setIsTbc(false);
      setQteFinie('0');
      setNbBrodeusesDispo('10');
      setSemaineLancement('S34');
      setSemaineLimiteClient('S38');
      setDateLancement('');
      setDateLimiteClient('');
      setNotes('');
    }
  }, [initialData, isOpen]);

  // Aperçu en direct de la cadence selon le nombre de brodeuses disponibles
  const simulationPreview = useMemo(() => {
    const qte = parseFloat(qteCommande.replace(',', '.')) || 0;
    const finie = parseFloat(qteFinie.replace(',', '.')) || 0;
    const reste = Math.max(0, qte - finie);
    const hp = isTbc ? 0 : parseFloat(heurePcs.replace(',', '.')) || 0;
    const brod = parseFloat(nbBrodeusesDispo.replace(',', '.')) || 0;

    if (reste <= 0 || hp <= 0 || brod <= 0) return null;

    const heuresTotales = Math.round(reste * hp * 10) / 10;
    const heuresHebdo = Math.round(brod * HEURES_PAR_BRODEUSE_SEMAINE * 10) / 10;
    const piecesParSemaine = Math.max(1, Math.round(heuresHebdo / hp));
    const nbSemainesNecessaires = Math.ceil(reste / piecesParSemaine);

    const saIdx = resolveWeekIndexFromCodeOrDate(semaines, semaineLancement, dateLancement);
    const sbIdx = resolveWeekIndexFromCodeOrDate(semaines, semaineLimiteClient, dateLimiteClient);
    const startIdx = saIdx >= 0 ? saIdx : 5; // S34 par défaut
    const endIdx = Math.min(semaines.length - 1, startIdx + nbSemainesNecessaires - 1);
    const endWeekCode = semaines[endIdx]?.code || 'S51';
    const exceedsSb = sbIdx >= 0 && endIdx > sbIdx;

    return {
      reste,
      heuresTotales,
      heuresHebdo,
      piecesParSemaine,
      nbSemainesNecessaires,
      endWeekCode,
      exceedsSb,
    };
  }, [
    qteCommande,
    qteFinie,
    heurePcs,
    isTbc,
    nbBrodeusesDispo,
    semaineLancement,
    semaineLimiteClient,
    dateLancement,
    dateLimiteClient,
    semaines,
  ]);

  if (!isOpen) return null;

  const handleDateLancementChange = (val: string) => {
    setDateLancement(val);
    const idx = resolveWeekIndexFromCodeOrDate(semaines, null, val);
    if (idx !== -1 && semaines[idx]) {
      setSemaineLancement(semaines[idx].code);
    }
  };

  const handleSemaineLancementChange = (val: string) => {
    setSemaineLancement(val);
    if (val) {
      const date = getDateFromWeekCode(val, 'start');
      if (date) setDateLancement(date);
    } else {
      setDateLancement('');
    }
  };

  const handleDateLimiteChange = (val: string) => {
    setDateLimiteClient(val);
    const idx = resolveWeekIndexFromCodeOrDate(semaines, null, val);
    if (idx !== -1 && semaines[idx]) {
      setSemaineLimiteClient(semaines[idx].code);
    }
  };

  const handleSemaineLimiteChange = (val: string) => {
    setSemaineLimiteClient(val);
    if (val) {
      const date = getDateFromWeekCode(val, 'friday');
      if (date) setDateLimiteClient(date);
    } else {
      setDateLimiteClient('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!client.trim() || !modele.trim() || !qteCommande.trim()) {
      setErrorMsg('Veuillez renseigner au minimum le Client, le Modèle et la Quantité commandée.');
      return;
    }

    const qte = parseFloat(qteCommande.replace(',', '.'));
    if (Number.isNaN(qte) || qte < 0) {
      setErrorMsg('Quantité commandée invalide.');
      return;
    }

    const finie = parseFloat(qteFinie.replace(',', '.')) || 0;
    const hp = isTbc || !heurePcs.trim() ? null : parseFloat(heurePcs.replace(',', '.'));
    const brodDispo = !nbBrodeusesDispo.trim()
      ? null
      : parseFloat(nbBrodeusesDispo.replace(',', '.'));

    onSave({
      client: client.trim(),
      modele: modele.trim(),
      qte_commande: qte,
      unite: unite.trim() || 'PCS',
      heure_pcs: isTbc ? null : hp,
      heure_pcs_tbc: isTbc ? 1 : 0,
      qte_finie: finie,
      nb_brodeuses_dispo: brodDispo && !Number.isNaN(brodDispo) && brodDispo > 0 ? brodDispo : null,
      date_limite_client: dateLimiteClient.trim() || null,
      date_lancement: dateLancement.trim() || null,
      semaine_lancement: semaineLancement || null,
      semaine_limite_client: semaineLimiteClient || null,
      notes: notes.trim() || null,
      row_color: initialData?.row_color || 'normal',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white">
          <h2 className="text-base font-bold">
            {initialData ? 'Modifier la commande' : 'Ajouter une commande sur la Frise'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-lg">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3.5">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Client <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="Ex: ZIMMERMANN C27"
                required
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Modèle <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={modele}
                onChange={(e) => setModele(e.target.value)}
                placeholder="Ex: SMALL FRINGE NATUREL"
                required
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Qté commandée <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                value={qteCommande}
                onChange={(e) => setQteCommande(e.target.value)}
                placeholder="Ex: 344"
                required
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Unité</label>
              <input
                type="text"
                value={unite}
                onChange={(e) => setUnite(e.target.value)}
                placeholder="PCS"
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Qté déjà finie
              </label>
              <input
                type="number"
                step="any"
                value={qteFinie}
                onChange={(e) => setQteFinie(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Heure / pcs & Nombre de Brodeuses Disponibles pour traiter la commande */}
          <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-lg space-y-2.5">
            <div className="grid grid-cols-2 gap-3.5">
              {/* Heure / pcs */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800">Heure / Pièce</label>
                  <label className="flex items-center space-x-1 text-[11px] font-medium text-amber-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isTbc}
                      onChange={(e) => setIsTbc(e.target.checked)}
                      className="rounded text-amber-600"
                    />
                    <span>TBC</span>
                  </label>
                </div>
                {!isTbc ? (
                  <input
                    type="number"
                    step="0.01"
                    value={heurePcs}
                    onChange={(e) => setHeurePcs(e.target.value)}
                    placeholder="Ex: 22.0 h/pcs"
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-mono"
                  />
                ) : (
                  <div className="px-3 py-1.5 text-xs font-mono font-bold text-amber-700 bg-amber-50 border border-amber-300 rounded-lg text-center">
                    TBC (À confirmer)
                  </div>
                )}
              </div>

              {/* Nombre de brodeuses disponibles pour traiter la commande */}
              <div>
                <label className="flex items-center gap-1 text-xs font-bold text-indigo-950 mb-1">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Nb Brodeuses dispo (commande)</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={nbBrodeusesDispo}
                  onChange={(e) => setNbBrodeusesDispo(e.target.value)}
                  placeholder="Ex: 10 brodeuses"
                  className="w-full px-3 py-1.5 text-sm border border-indigo-400 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white font-mono font-bold text-indigo-950"
                />
              </div>
            </div>

            {/* Aperçu automatique de la répartition */}
            {simulationPreview && (
              <div
                className={`p-2 rounded text-[11px] font-mono border ${
                  simulationPreview.exceedsSb
                    ? 'bg-[#2E75B6]/15 border-[#2E75B6] text-slate-900'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                }`}
              >
                <div>
                  <strong>Calcul auto :</strong> {nbBrodeusesDispo} brod. × 40h ={' '}
                  <strong>{simulationPreview.heuresHebdo}h/sem</strong> ➔{' '}
                  <strong>{simulationPreview.piecesParSemaine} pcs/semaine</strong>
                </div>
                <div>
                  Étirement sur <strong>{simulationPreview.nbSemainesNecessaires} sem.</strong> (fin
                  estimée en <strong>{simulationPreview.endWeekCode}</strong>) —{' '}
                  {simulationPreview.exceedsSb ? (
                    <span className="text-[#1B4F82] font-bold">
                      Dépasse Sb ({semaineLimiteClient}) ➔ Glissement vs Planning automatique !
                    </span>
                  ) : (
                    <span className="text-emerald-800 font-bold">
                      Dans les délais (≤ {semaineLimiteClient || 'Sb'}) ✓
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Semaine de Lancement (Sa - Rouille) & Semaine Date Limite Client (Sb - Rouge) */}
          <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg space-y-2.5">
            <div className="text-xs font-bold text-slate-800">
              Jalons automatiques sur la Frise Chronologique :
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              {/* Lancement Sa (Rouille) */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#C55A11]">
                  🟧 Semaine de Lancement (Sa)
                </label>
                <select
                  value={semaineLancement}
                  onChange={(e) => handleSemaineLancementChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-[#ED7D31]/20 border border-[#ED7D31] rounded text-slate-900"
                >
                  <option value="">-- Non définie --</option>
                  {semaines.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} ({s.date_label || s.date_debut})
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={dateLancement}
                  onChange={(e) => handleDateLancementChange(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-600"
                  title="Choisir une date sélectionne automatiquement la semaine Sa"
                />
              </div>

              {/* Date Limite Client Sb (Rouge) */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#C00000]">
                  🟥 Semaine Limite Client (Sb)
                </label>
                <select
                  value={semaineLimiteClient}
                  onChange={(e) => handleSemaineLimiteChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-[#FF0000]/15 border border-[#FF0000] rounded text-slate-900"
                >
                  <option value="">-- Non définie --</option>
                  {semaines.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} ({s.date_label || s.date_debut})
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={dateLimiteClient}
                  onChange={(e) => handleDateLimiteChange(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-600"
                  title="Choisir une date sélectionne automatiquement la semaine Sb"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes & Commentaires
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Instructions particulières, matières, etc."
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2.5 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex items-center space-x-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{initialData ? 'Enregistrer' : 'Ajouter la commande'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
