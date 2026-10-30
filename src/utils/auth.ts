export type UserRole = 'resp planning' | 'direction';

export interface UserAccount {
  prenom: string;
  poste: UserRole;
  posteLabel: string;
  password: string;
  description: string;
  badgeColor: {
    bg: string;
    text: string;
    border: string;
  };
}

export interface AuthUser {
  prenom: string;
  poste: UserRole;
  posteLabel: string;
  loginAt: string;
}

export const USERS: UserAccount[] = [
  {
    prenom: 'Jacquis',
    poste: 'resp planning',
    posteLabel: 'Responsable Planning',
    password: 'jacquis',
    description: 'Gestion opérationnelle, ordonnancement atelier, dispatch et suivi de production',
    badgeColor: {
      bg: 'bg-indigo-950/80',
      text: 'text-indigo-300',
      border: 'border-indigo-500/40',
    },
  },
  {
    prenom: 'Akash',
    poste: 'direction',
    posteLabel: 'Direction',
    password: 'akash',
    description: 'Supervision stratégique, validation des capacités, arbitrages et indicateurs clés',
    badgeColor: {
      bg: 'bg-amber-950/80',
      text: 'text-amber-300',
      border: 'border-amber-500/40',
    },
  },
];

const AUTH_STORAGE_KEY = 'suivi_planning_user_session';

export function getStoredSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.prenom && parsed.poste) {
      return parsed as AuthUser;
    }
  } catch (e) {
    console.error('Erreur lecture session:', e);
  }
  return null;
}

export function saveSession(user: AuthUser): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Erreur sauvegarde session:', e);
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (e) {
    console.error('Erreur effacement session:', e);
  }
}

export function authenticate(
  prenomInput: string,
  posteInput: string,
  passwordInput: string
): { success: boolean; user?: AuthUser; error?: string } {
  const cleanPrenom = prenomInput.trim().toLowerCase();
  const cleanPoste = posteInput.trim().toLowerCase();
  const cleanPassword = passwordInput.trim();

  if (!cleanPrenom) {
    return { success: false, error: 'Veuillez saisir votre prénom.' };
  }
  if (!cleanPoste) {
    return { success: false, error: 'Veuillez sélectionner votre poste.' };
  }
  if (!cleanPassword) {
    return { success: false, error: 'Veuillez renseigner votre mot de passe.' };
  }

  // Chercher l'utilisateur par prénom
  const account = USERS.find((u) => u.prenom.toLowerCase() === cleanPrenom);

  if (!account) {
    return {
      success: false,
      error: `Aucun utilisateur trouvé avec le prénom "${prenomInput}". (Comptes configurés : Jacquis, Akash)`,
    };
  }

  // Vérifier le poste
  const accountPoste = account.poste.toLowerCase();
  const matchesPoste =
    cleanPoste === accountPoste ||
    (accountPoste === 'resp planning' &&
      (cleanPoste.includes('plan') || cleanPoste.includes('resp'))) ||
    (accountPoste === 'direction' && cleanPoste.includes('dir'));

  if (!matchesPoste) {
    return {
      success: false,
      error: `Poste incorrect pour ${account.prenom}. Le poste assigné est "${account.posteLabel}".`,
    };
  }

  // Vérifier le mot de passe (insensible ou sensible)
  if (account.password !== cleanPassword && account.password.toLowerCase() !== cleanPassword.toLowerCase()) {
    return {
      success: false,
      error: 'Mot de passe incorrect. Veuillez réessayer.',
    };
  }

  const user: AuthUser = {
    prenom: account.prenom,
    poste: account.poste,
    posteLabel: account.posteLabel,
    loginAt: new Date().toISOString(),
  };

  saveSession(user);
  return { success: true, user };
}
