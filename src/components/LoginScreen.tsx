import React, { useState } from 'react';
import {
  Lock,
  User,
  Shield,
  Eye,
  EyeOff,
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileSpreadsheet,
  Clock,
  Sparkles,
} from 'lucide-react';
import { authenticate, AuthUser, USERS, UserRole } from '../utils/auth';

interface LoginScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [prenom, setPrenom] = useState('');
  const [poste, setPoste] = useState<UserRole>('resp planning');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      const result = authenticate(prenom, poste, password);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setErrorMessage(result.error || 'Identifiants invalides.');
      }
      setIsLoading(false);
    }, 250);
  };

  const handleQuickLogin = (accountPrenom: string, accountPoste: UserRole, accountPass: string) => {
    setPrenom(accountPrenom);
    setPoste(accountPoste);
    setPassword(accountPass);
    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      const result = authenticate(accountPrenom, accountPoste, accountPass);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setErrorMessage(result.error || 'Erreur de connexion.');
      }
      setIsLoading(false);
    }, 200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background ambient decorative shapes */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-72 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header Badge */}
        <div className="bg-gradient-to-r from-indigo-900/60 via-slate-800/80 to-indigo-950/60 px-6 py-5 border-b border-slate-800 text-center relative">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 mb-2">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-wide uppercase">
            SUIVI PLANNING
          </h1>
          <p className="text-xs text-indigo-300 font-medium mt-0.5">
            Macro &amp; Micro-Planning d'Ateliers · Authentification
          </p>
          <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full bg-slate-950/70 border border-indigo-500/30 text-[10.5px] font-mono text-slate-300">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span>Accès sécurisé réservé à l'équipe</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5 animate-in shake">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Champ 1 : Prénom */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Prénom
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={prenom}
                  onChange={(e) => {
                    setPrenom(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Ex: Jacquis ou Akash"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950/70 border border-slate-700 rounded-lg text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            {/* Champ 2 : Poste */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Poste
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPoste('resp planning');
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-left transition cursor-pointer ${
                    poste === 'resp planning'
                      ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Resp. Planning</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5">resp planning</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPoste('direction');
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-left transition cursor-pointer ${
                    poste === 'direction'
                      ? 'bg-amber-950/80 border-amber-500 text-white shadow-sm ring-1 ring-amber-500'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                    <span>Direction</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5">direction</span>
                </button>
              </div>
            </div>

            {/* Champ 3 : Mot de passe */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Votre mot de passe"
                  className="w-full pl-9 pr-10 py-2 bg-slate-950/70 border border-slate-700 rounded-lg text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  title={showPassword ? 'Masquer' : 'Afficher'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-sm rounded-lg shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Se connecter</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Login Shortcuts */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Accès direct configuré
              </span>
              <span className="text-[10px] text-slate-500">1 clic</span>
            </div>

            <div className="space-y-2">
              {USERS.map((user) => (
                <button
                  key={user.prenom}
                  type="button"
                  onClick={() => handleQuickLogin(user.prenom, user.poste, user.password)}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 text-left transition group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs ${
                        user.poste === 'direction'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}
                    >
                      {user.prenom.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition">
                        {user.prenom}
                      </div>
                      <div className="text-[10px] text-slate-400">{user.posteLabel}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-medium text-slate-400 group-hover:text-slate-200 px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                    Connexion ➔
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <span>Application Atelier PWA</span>
          <span className="font-mono text-[10px] text-slate-500">Session locale chiffrée</span>
        </div>
      </div>
    </div>
  );
};
