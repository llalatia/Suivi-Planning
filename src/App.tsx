import React, { useState, useCallback } from 'react';
import { useMacroPlanning } from './utils/useMacroPlanning';
import { Navbar, PlanningPage } from './components/Navbar';
import { TableauFriseChronologique } from './components/TableauFriseChronologique';
import { CommandeModal } from './components/CommandeModal';
import { MicroPlanningView } from './components/MicroPlanning/MicroPlanningView';
import { LoginScreen } from './components/LoginScreen';
import { Commande } from './data/initialData';
import { AuthUser, getStoredSession, clearSession } from './utils/auth';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getStoredSession());

  // Active page: 'macro' (Macro-Planning Broderie) or 'micro' (Micro-Planning Confection & Pose)
  const [activePage, setActivePage] = useState<PlanningPage>(() => {
    try {
      const saved = localStorage.getItem('suivi_planning_active_page');
      if (saved === 'macro' || saved === 'micro') return saved;
    } catch (e) {
      // ignore
    }
    return 'micro'; // default to micro as requested by user in this prompt
  });

  const handleSelectPage = (page: PlanningPage) => {
    setActivePage(page);
    try {
      localStorage.setItem('suivi_planning_active_page', page);
    } catch (e) {
      // ignore
    }
  };

  // Macro Planning state & hooks
  const {
    data,
    calculatedCommandes,
    calculatedSemaines,
    metrics,
    setSemaineCourante,
    setPieces,
    setBrodeusesDispoCommande,
    setCellStatut,
    setRowColor,
    setEffectifDispo,
    shiftOrderWeeks,
    addCommande,
    updateCommande,
    duplicateCommande,
    deleteCommande,
    autoDispatch,
    importData,
    exportData,
  } = useMacroPlanning();

  // Modals & Notifications
  const [isCommandeModalOpen, setIsCommandeModalOpen] = useState(false);
  const [editingCommande, setEditingCommande] = useState<Commande | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const handleOpenAdd = () => {
    setEditingCommande(null);
    setIsCommandeModalOpen(true);
  };

  const handleOpenEdit = (cmd: Commande) => {
    setEditingCommande(cmd);
    setIsCommandeModalOpen(true);
  };

  const handleSaveCommande = (formData: Omit<Commande, 'id' | 'ordre' | 'archive'>) => {
    if (editingCommande) {
      updateCommande(editingCommande.id, formData);
      showToast(`Ligne "${formData.client} - ${formData.modele}" mise à jour.`);
    } else {
      addCommande(formData);
      showToast(`Nouvelle ligne "${formData.client} - ${formData.modele}" ajoutée.`);
    }
  };

  // Drag and drop XLSX support
  const handleDropXlsx = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
        try {
          if (file.name.toUpperCase().includes('MICRO') || activePage === 'micro') {
            const { parseMicroXLSXFile } = await import('./utils/microExcel');
            await parseMicroXLSXFile(file);
            showToast(`Fichier Micro-Planning "${file.name}" importé.`);
          } else {
            const { parseXLSXFile } = await import('./utils/macroExcel');
            const parsed = await parseXLSXFile(file);
            importData(parsed);
            showToast(
              `Fichier "${file.name}" importé (${parsed.commandes?.length || 0} commandes).`
            );
          }
        } catch (err: any) {
          showToast(`Erreur d'import : ${err.message || err}`);
        }
      }
    },
    [importData, activePage]
  );

  const handleLogout = () => {
    clearSession();
    setCurrentUser(null);
    showToast('Vous avez été déconnecté avec succès.');
  };

  const allWeekCodes = data.semaines.map((s) => s.code);

  // Écran de connexion si non authentifié
  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          showToast(`Bienvenue ${user.prenom} (${user.posteLabel}) !`);
        }}
      />
    );
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDropXlsx}
      className="min-h-screen bg-slate-100 flex flex-col text-slate-900"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-14 right-4 z-50 bg-slate-900 text-white border border-emerald-500/50 rounded-lg px-3.5 py-2 text-xs font-medium shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Navbar with Macro / Micro Switcher */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        activePage={activePage}
        onSelectPage={handleSelectPage}
        currentWeek={data.config.semaine_courante}
        allWeeks={allWeekCodes}
        onSelectWeek={(code) => {
          setSemaineCourante(code);
          showToast(`Semaine en cours (B2) définie sur : ${code}`);
        }}
        onExportExcel={() => {
          exportData();
          showToast('Fichier Excel exporté (Format MACRO-PLANNING BROD TRADI).');
        }}
        onImportData={(parsed) => {
          importData(parsed);
          showToast(`Import terminé (${parsed.commandes?.length || 0} commandes chargées).`);
        }}
        totalCommandes={metrics.totalCommandes}
        totalPiecesCommandees={metrics.totalPiecesCommandees}
        totalPiecesFinies={metrics.totalPiecesFinies}
        totalResteAFaire={metrics.totalResteAFaire}
      />

      {/* Main Container */}
      <main className="flex-1 w-full px-3 py-2.5">
        {activePage === 'macro' ? (
          /* PAGE 1 : Macro-Planning (Broderie Traditionnelle) */
          <TableauFriseChronologique
            semaines={calculatedSemaines}
            commandes={calculatedCommandes}
            planning={data.planning}
            currentSemaineCode={data.config.semaine_courante}
            onSetCurrentSemaine={(code) => {
              setSemaineCourante(code);
              showToast(`Semaine en cours définie sur : ${code}`);
            }}
            onSetPieces={setPieces}
            onSetBrodeusesDispoCommande={setBrodeusesDispoCommande}
            onSetStatut={setCellStatut}
            onSetRowColor={setRowColor}
            onSetEffectifDispo={setEffectifDispo}
            onShiftOrderWeeks={shiftOrderWeeks}
            onAutoDispatch={autoDispatch}
            onUpdateCommande={updateCommande}
            onAddCommande={handleOpenAdd}
            onEditCommandeModal={handleOpenEdit}
            onDuplicateCommande={duplicateCommande}
            onDeleteCommande={deleteCommande}
            onShowToast={showToast}
          />
        ) : (
          /* PAGE 2 : Micro-Planning (Ateliers Confection & Pose · MAJ du 12-10 & Simulation) */
          <MicroPlanningView onShowToast={showToast} />
        )}
      </main>

      {/* Add/Edit Commande Modal for Macro-Planning */}
      <CommandeModal
        isOpen={isCommandeModalOpen}
        onClose={() => setIsCommandeModalOpen(false)}
        onSave={handleSaveCommande}
        initialData={editingCommande}
      />
    </div>
  );
}
