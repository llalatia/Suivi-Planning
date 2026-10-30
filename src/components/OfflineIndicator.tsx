import React from 'react';
import { useOnlineStatus } from '../hooks/usePWAInstall';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2 text-xs font-medium text-emerald-400 shadow-xl">
      <WifiOff className="w-4 h-4 text-amber-400" />
      <span>Mode Hors-ligne Actif — Toutes les modifications sont stockées en local</span>
    </div>
  );
};
