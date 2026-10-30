import { CALENDAR_52_WEEKS } from '../utils/calendarUtils';
export type CellStatut = 'normal' | 'lancement' | 'limite_client' | 'glissement' | 'sst' | 'termine';

export interface Semaine {
  id: number;
  code: string;
  date_debut: string;
  date_label?: string;
  ordre: number;
  capacite_brodeuses?: number | null;
  effectif_dispo?: number;
}

export interface Commande {
  id: number;
  client: string;
  modele: string;
  qte_commande: number;
  unite: string;
  heure_pcs: number | null;
  heure_pcs_tbc: number;
  qte_finie: number;
  nb_brodeuses_dispo?: number | null;
  date_limite_client: string | null;
  date_lancement: string | null;
  semaine_lancement?: string | null;
  semaine_limite_client?: string | null;
  notes: string | null;
  ordre: number;
  archive: number;
  row_color?: CellStatut;
}

export interface PlanningCell {
  id: number;
  commande_id: number;
  semaine_id: number;
  nb_pieces: number;
  statut: CellStatut;
  manual_brodeuses?: number | null;
  manual_statut?: boolean;
}

export interface PlanningData {
  config: { semaine_courante: string; [key: string]: string };
  semaines: Semaine[];
  commandes: Commande[];
  planning: PlanningCell[];
}

export const INITIAL_PLANNING_DATA: PlanningData = {
  "config": {
    "semaine_courante": "S34"
  },
  "semaines": CALENDAR_52_WEEKS,
  "commandes": [
    {
      "id": 1,
      "client": "ZIMMERMANN C27",
      "modele": "SMALL FRINGE NATUREL",
      "qte_commande": 344,
      "unite": "PCS",
      "heure_pcs": 22,
      "heure_pcs_tbc": 0,
      "qte_finie": 61,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 0,
      "archive": 0,
      "row_color": "normal",
      "semaine_lancement": null,
      "semaine_limite_client": null,
      "nb_brodeuses_dispo": null
    },
    {
      "id": 2,
      "client": "ZIMMERMANN C27",
      "modele": "SMALL FRINGE NATUREL V2",
      "qte_commande": 30,
      "unite": "PCS",
      "heure_pcs": 22,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 1,
      "archive": 0,
      "row_color": "normal",
      "semaine_lancement": null,
      "semaine_limite_client": null,
      "nb_brodeuses_dispo": null
    },
    {
      "id": 3,
      "client": "ZIMMERMANN C27",
      "modele": "SMALL FRINGE PEACH",
      "qte_commande": 222,
      "unite": "PCS",
      "heure_pcs": 22,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 2,
      "archive": 0,
      "row_color": "normal",
      "semaine_lancement": null,
      "semaine_limite_client": null,
      "nb_brodeuses_dispo": null
    },
    {
      "id": 4,
      "client": "ZIMMERMANN C27",
      "modele": "SMALL FRINGE LEMON",
      "qte_commande": 120,
      "unite": "PCS",
      "heure_pcs": 22,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 3,
      "archive": 0,
      "row_color": "normal",
      "semaine_lancement": null,
      "semaine_limite_client": null,
      "nb_brodeuses_dispo": null
    },
    {
      "id": 5,
      "client": "ZIMMERMANN C27",
      "modele": "SMALL SHELL NATUREL / MULTI",
      "qte_commande": 410,
      "unite": "PCS",
      "heure_pcs": 22,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 4,
      "archive": 0,
      "row_color": "normal",
      "semaine_lancement": null,
      "semaine_limite_client": null,
      "nb_brodeuses_dispo": null
    },
    {
      "id": 6,
      "client": "ZIMMERMANN C27",
      "modele": "MEDIUM FRINGE NATUREL",
      "qte_commande": 73,
      "unite": "PCS",
      "heure_pcs": 29,
      "heure_pcs_tbc": 0,
      "qte_finie": 8,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 5,
      "archive": 0,
      "row_color": "normal",
      "semaine_lancement": null,
      "semaine_limite_client": null,
      "nb_brodeuses_dispo": null
    },
    {
      "id": 7,
      "client": "ZIMMERMANN C27",
      "modele": "MEDIUM FRINGE LEMON",
      "qte_commande": 80,
      "unite": "PCS",
      "heure_pcs": 29,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 6,
      "archive": 0,
      "row_color": "normal",
      "semaine_lancement": null,
      "semaine_limite_client": null,
      "nb_brodeuses_dispo": null
    },
    {
      "id": 8,
      "client": "ZIMMERMANN C27",
      "modele": "MEDIUM FRINGE PEACH",
      "qte_commande": 80,
      "unite": "PCS",
      "heure_pcs": 29,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 7,
      "archive": 0,
      "row_color": "normal",
      "semaine_lancement": null,
      "semaine_limite_client": null,
      "nb_brodeuses_dispo": null
    },
    {
      "id": 9,
      "client": "ZIMMERMANN C27",
      "modele": "MEDIUM SHELL NATUREL / MULTI",
      "qte_commande": 330,
      "unite": "PCS",
      "heure_pcs": 29,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 8,
      "archive": 0,
      "row_color": "normal",
      "semaine_lancement": null,
      "semaine_limite_client": null,
      "nb_brodeuses_dispo": null
    },
    {
      "id": 10,
      "client": "ZIMMERMANN C27",
      "modele": "BANANA HOBO FRINGE NATUREL",
      "qte_commande": 550,
      "unite": "PCS",
      "heure_pcs": 15.7,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 9,
      "archive": 0,
      "row_color": "normal",
      "semaine_lancement": null,
      "semaine_limite_client": null,
      "nb_brodeuses_dispo": null
    },
    {
      "id": 11,
      "client": "ZIMMERMANN C27",
      "modele": "BANANA HOBO FRINGE PEACH",
      "qte_commande": 100,
      "unite": "PCS",
      "heure_pcs": 15.7,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 10,
      "archive": 0,
      "row_color": "normal",
      "semaine_lancement": null,
      "semaine_limite_client": null,
      "nb_brodeuses_dispo": null
    },
    {
      "id": 12,
      "client": "ZIMMERMANN C27",
      "modele": "BANANA HOBO SHELL NATUREL/MULTI",
      "qte_commande": 150,
      "unite": "PCS",
      "heure_pcs": 15.7,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 11,
      "archive": 0,
      "row_color": "normal",
      "semaine_lancement": null,
      "semaine_limite_client": null,
      "nb_brodeuses_dispo": null
    },
    {
      "id": 13,
      "client": "ZIMMERMANN C27",
      "modele": "MEDIUM RUFFLE NATUREL",
      "qte_commande": 500,
      "unite": "PCS",
      "heure_pcs": 38,
      "heure_pcs_tbc": 0,
      "qte_finie": 229,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 12,
      "archive": 0,
      "row_color": "normal",
      "semaine_lancement": null,
      "semaine_limite_client": null,
      "nb_brodeuses_dispo": null
    },
    {
      "id": 14,
      "client": "ZIMMERMANN C27",
      "modele": "SMALL RUFFLE NATUREL v1",
      "qte_commande": 120,
      "unite": "PCS",
      "heure_pcs": 22,
      "heure_pcs_tbc": 0,
      "qte_finie": 60,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 13,
      "archive": 0,
      "row_color": "normal",
      "semaine_lancement": null,
      "semaine_limite_client": null,
      "nb_brodeuses_dispo": null
    },
    {
      "id": 15,
      "client": "ZIMMERMANN C27",
      "modele": "SMALL RUFFLE NATUREL v2",
      "qte_commande": 130,
      "unite": "PCS",
      "heure_pcs": 22,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 14,
      "archive": 0,
      "row_color": "normal",
      "semaine_lancement": null,
      "semaine_limite_client": null,
      "nb_brodeuses_dispo": null
    },
    {
      "id": 16,
      "client": "ZIMMERMANN SS27",
      "modele": "SMALL SHELL BLACK WHITE",
      "qte_commande": 480,
      "unite": "PCS",
      "heure_pcs": null,
      "heure_pcs_tbc": 1,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 15,
      "archive": 0,
      "row_color": "glissement",
      "semaine_lancement": null,
      "semaine_limite_client": null,
      "nb_brodeuses_dispo": null
    },
    {
      "id": 17,
      "client": "ZIMMERMANN SS27",
      "modele": "MEDIUM SHELL BLACK WHITE",
      "qte_commande": 250,
      "unite": "PCS",
      "heure_pcs": null,
      "heure_pcs_tbc": 1,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 16,
      "archive": 0,
      "row_color": "glissement",
      "semaine_lancement": null,
      "semaine_limite_client": null,
      "nb_brodeuses_dispo": null
    },
    {
      "id": 18,
      "client": "ZIMMERMANN SS27",
      "modele": "SMALL RUFFLE NATUREL",
      "qte_commande": 230,
      "unite": "PCS",
      "heure_pcs": null,
      "heure_pcs_tbc": 1,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 17,
      "archive": 0,
      "row_color": "glissement",
      "semaine_lancement": null,
      "semaine_limite_client": null,
      "nb_brodeuses_dispo": null
    },
    {
      "id": 19,
      "client": "ZIMMERMANN SS27",
      "modele": "MEDIUM SHELL CHOCO",
      "qte_commande": 100,
      "unite": "PCS",
      "heure_pcs": null,
      "heure_pcs_tbc": 1,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 18,
      "archive": 0,
      "row_color": "glissement",
      "semaine_lancement": null,
      "semaine_limite_client": null,
      "nb_brodeuses_dispo": null
    },
    {
      "id": 20,
      "client": "ZIMMERMANN SS27",
      "modele": "SMALL SHELL CHOCO",
      "qte_commande": 180,
      "unite": "PCS",
      "heure_pcs": null,
      "heure_pcs_tbc": 1,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 19,
      "archive": 0,
      "row_color": "glissement",
      "semaine_lancement": null,
      "semaine_limite_client": null,
      "nb_brodeuses_dispo": null
    },
    {
      "id": 21,
      "client": "ZIMMERMANN SS27",
      "modele": "SMALL FLOWER NATUREL",
      "qte_commande": 550,
      "unite": "PCS",
      "heure_pcs": null,
      "heure_pcs_tbc": 1,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 20,
      "archive": 0,
      "row_color": "glissement",
      "semaine_lancement": null,
      "semaine_limite_client": null,
      "nb_brodeuses_dispo": null
    },
    {
      "id": 22,
      "client": "ZIMMERMANN SS27",
      "modele": "MEDIUM FLOWER NATUREL",
      "qte_commande": 120,
      "unite": "PCS",
      "heure_pcs": null,
      "heure_pcs_tbc": 1,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 21,
      "archive": 0,
      "row_color": "glissement",
      "semaine_lancement": null,
      "semaine_limite_client": null,
      "nb_brodeuses_dispo": null
    },
    {
      "id": 23,
      "client": "ZIMMERMANN SS27",
      "modele": "MEDIUM SHELL NATUREL",
      "qte_commande": 780,
      "unite": "PCS",
      "heure_pcs": null,
      "heure_pcs_tbc": 1,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 22,
      "archive": 0,
      "row_color": "glissement",
      "semaine_lancement": null,
      "semaine_limite_client": null,
      "nb_brodeuses_dispo": null
    },
    {
      "id": 24,
      "client": "ZIMMERMANN SS27",
      "modele": "SMALL SHELL NATUREL",
      "qte_commande": 1020,
      "unite": "PCS",
      "heure_pcs": null,
      "heure_pcs_tbc": 1,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 23,
      "archive": 0,
      "row_color": "glissement",
      "semaine_lancement": null,
      "semaine_limite_client": null,
      "nb_brodeuses_dispo": null
    },
    {
      "id": 25,
      "client": "ISABEL MARANT",
      "modele": "BAYA NATUREL",
      "qte_commande": 165,
      "unite": "PCS",
      "heure_pcs": 12,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 24,
      "archive": 0,
      "row_color": "normal",
      "semaine_lancement": null,
      "semaine_limite_client": "S38",
      "nb_brodeuses_dispo": null
    },
    {
      "id": 26,
      "client": "ISABEL MARANT",
      "modele": "BAYA STRIPE",
      "qte_commande": 324,
      "unite": "PCS",
      "heure_pcs": 12.25,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 25,
      "archive": 0,
      "row_color": "normal",
      "semaine_lancement": null,
      "semaine_limite_client": "S38",
      "nb_brodeuses_dispo": null
    },
    {
      "id": 27,
      "client": "ISABEL MARANT",
      "modele": "MINI-BAYA NATUREL",
      "qte_commande": 150,
      "unite": "PCS",
      "heure_pcs": 6,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 26,
      "archive": 0,
      "row_color": "normal",
      "semaine_lancement": null,
      "semaine_limite_client": "S38",
      "nb_brodeuses_dispo": null
    },
    {
      "id": 28,
      "client": "ISABEL MARANT",
      "modele": "MINI-BAYA STRIPE",
      "qte_commande": 176,
      "unite": "PCS",
      "heure_pcs": 6,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 27,
      "archive": 0,
      "row_color": "normal",
      "semaine_lancement": null,
      "semaine_limite_client": "S38",
      "nb_brodeuses_dispo": null
    },
    {
      "id": 29,
      "client": "ISABEL MARANT",
      "modele": "PRAIA STRIPE",
      "qte_commande": 434,
      "unite": "PCS",
      "heure_pcs": 18,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 28,
      "archive": 0,
      "row_color": "normal",
      "semaine_lancement": null,
      "semaine_limite_client": "S38",
      "nb_brodeuses_dispo": null
    },
    {
      "id": 30,
      "client": "WESTWOOD",
      "modele": "RAFFIA BUCKET YELLOW",
      "qte_commande": 58,
      "unite": "PCS",
      "heure_pcs": 11.5,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 29,
      "archive": 0,
      "row_color": "normal",
      "semaine_lancement": null,
      "semaine_limite_client": "S38",
      "nb_brodeuses_dispo": null
    },
    {
      "id": 31,
      "client": "WESTWOOD",
      "modele": "RAFFIA BUCKET MINT",
      "qte_commande": 25,
      "unite": "PCS",
      "heure_pcs": 11.5,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 30,
      "archive": 0,
      "row_color": "normal",
      "semaine_lancement": null,
      "semaine_limite_client": "S38",
      "nb_brodeuses_dispo": null
    },
    {
      "id": 32,
      "client": "WESTWOOD",
      "modele": "RAFFIA VISOR YELLOW",
      "qte_commande": 16,
      "unite": "PCS",
      "heure_pcs": 5.5,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 31,
      "archive": 0,
      "row_color": "normal",
      "semaine_lancement": null,
      "semaine_limite_client": "S38",
      "nb_brodeuses_dispo": null
    },
    {
      "id": 33,
      "client": "JACQUEMUS V1",
      "modele": "PETIT CARRE NOIR",
      "qte_commande": 250,
      "unite": "PCS",
      "heure_pcs": 10,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 32,
      "archive": 0,
      "row_color": "normal",
      "semaine_lancement": null,
      "semaine_limite_client": "S38",
      "nb_brodeuses_dispo": null
    },
    {
      "id": 34,
      "client": "JACQUEMUS V1",
      "modele": "PETIT ROND NATUREL",
      "qte_commande": 250,
      "unite": "PCS",
      "heure_pcs": 9,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 33,
      "archive": 0,
      "row_color": "normal",
      "semaine_lancement": null,
      "semaine_limite_client": "S38",
      "nb_brodeuses_dispo": null
    },
    {
      "id": 35,
      "client": "JACQUEMUS V2",
      "modele": "PETIT CARRE NOIR ",
      "qte_commande": 69,
      "unite": "PCS",
      "heure_pcs": 10,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 34,
      "archive": 0,
      "row_color": "normal",
      "semaine_lancement": null,
      "semaine_limite_client": "S38",
      "nb_brodeuses_dispo": null
    },
    {
      "id": 36,
      "client": "JACQUEMUS V2",
      "modele": "PETIT ROND NATUREL",
      "qte_commande": 279,
      "unite": "PCS",
      "heure_pcs": 9,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 35,
      "archive": 0,
      "row_color": "normal",
      "semaine_lancement": null,
      "semaine_limite_client": "S38",
      "nb_brodeuses_dispo": null
    },
    {
      "id": 37,
      "client": "JACQUEMUS V2",
      "modele": "PETIT ROND NOIR ",
      "qte_commande": 300,
      "unite": "PCS",
      "heure_pcs": 9,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 36,
      "archive": 0,
      "row_color": "normal",
      "semaine_lancement": null,
      "semaine_limite_client": "S38",
      "nb_brodeuses_dispo": null
    },
    {
      "id": 38,
      "client": "JACQUEMUS V2",
      "modele": "PETIT ROND ZEBRE",
      "qte_commande": 150,
      "unite": "PCS",
      "heure_pcs": 11,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 37,
      "archive": 0,
      "row_color": "normal",
      "semaine_lancement": null,
      "semaine_limite_client": "S38",
      "nb_brodeuses_dispo": null
    },
    {
      "id": 39,
      "client": "JACQUEMUS E27",
      "modele": "PETIT ROND ZEBRE",
      "qte_commande": 379,
      "unite": "PCS",
      "heure_pcs": 10,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 38,
      "archive": 0,
      "row_color": "lancement",
      "semaine_lancement": "S37",
      "semaine_limite_client": "S46",
      "nb_brodeuses_dispo": null
    },
    {
      "id": 40,
      "client": "JACQUEMUS E27",
      "modele": "LE PETIT ROND SPIAGGIA BLACK",
      "qte_commande": 416,
      "unite": "PCS",
      "heure_pcs": 9,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 39,
      "archive": 0,
      "row_color": "lancement",
      "semaine_lancement": "S37",
      "semaine_limite_client": "S46",
      "nb_brodeuses_dispo": null
    },
    {
      "id": 41,
      "client": "JACQUEMUS E27",
      "modele": "LE PETIT ROND SPIAGGIA NATUREL",
      "qte_commande": 459,
      "unite": "PCS",
      "heure_pcs": 9,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 40,
      "archive": 0,
      "row_color": "lancement",
      "semaine_lancement": "S37",
      "semaine_limite_client": "S46",
      "nb_brodeuses_dispo": null
    },
    {
      "id": 42,
      "client": "JACQUEMUS E27",
      "modele": "LE SPIAGGIA CŒUR BLACK",
      "qte_commande": 527,
      "unite": "PCS",
      "heure_pcs": 8,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 41,
      "archive": 0,
      "row_color": "lancement",
      "semaine_lancement": "S37",
      "semaine_limite_client": "S46",
      "nb_brodeuses_dispo": null
    },
    {
      "id": 43,
      "client": "JACQUEMUS E27",
      "modele": "LE SPIAGGIA CŒUR RED ",
      "qte_commande": 593,
      "unite": "PCS",
      "heure_pcs": 8,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 42,
      "archive": 0,
      "row_color": "lancement",
      "semaine_lancement": "S37",
      "semaine_limite_client": "S46",
      "nb_brodeuses_dispo": null
    },
    {
      "id": 44,
      "client": "JACQUEMUS E27",
      "modele": "LE SPIAGGIA CŒUR PINK",
      "qte_commande": 548,
      "unite": "PCS",
      "heure_pcs": 8,
      "heure_pcs_tbc": 0,
      "qte_finie": 0,
      "date_limite_client": null,
      "date_lancement": null,
      "notes": null,
      "ordre": 43,
      "archive": 0,
      "row_color": "lancement",
      "semaine_lancement": "S37",
      "semaine_limite_client": "S46",
      "nb_brodeuses_dispo": null
    }
  ],
  "planning": [
    {
      "id": 1,
      "commande_id": 1,
      "semaine_id": 29,
      "nb_pieces": 57,
      "statut": "normal",
      "manual_brodeuses": 8
    },
    {
      "id": 2,
      "commande_id": 1,
      "semaine_id": 30,
      "nb_pieces": 3,
      "statut": "normal",
      "manual_brodeuses": 8
    },
    {
      "id": 3,
      "commande_id": 1,
      "semaine_id": 31,
      "nb_pieces": 1,
      "statut": "normal"
    },
    {
      "id": 4,
      "commande_id": 1,
      "semaine_id": 34,
      "nb_pieces": 283,
      "statut": "normal"
    },
    {
      "id": 5,
      "commande_id": 2,
      "semaine_id": 34,
      "nb_pieces": 30,
      "statut": "normal"
    },
    {
      "id": 6,
      "commande_id": 3,
      "semaine_id": 34,
      "nb_pieces": 222,
      "statut": "normal"
    },
    {
      "id": 7,
      "commande_id": 4,
      "semaine_id": 34,
      "nb_pieces": 120,
      "statut": "normal"
    },
    {
      "id": 8,
      "commande_id": 5,
      "semaine_id": 34,
      "nb_pieces": 410,
      "statut": "normal"
    },
    {
      "id": 9,
      "commande_id": 6,
      "semaine_id": 30,
      "nb_pieces": 7,
      "statut": "normal",
      "manual_brodeuses": 8
    },
    {
      "id": 10,
      "commande_id": 6,
      "semaine_id": 31,
      "nb_pieces": 1,
      "statut": "normal"
    },
    {
      "id": 11,
      "commande_id": 6,
      "semaine_id": 34,
      "nb_pieces": 65,
      "statut": "normal"
    },
    {
      "id": 12,
      "commande_id": 7,
      "semaine_id": 34,
      "nb_pieces": 80,
      "statut": "normal"
    },
    {
      "id": 13,
      "commande_id": 8,
      "semaine_id": 34,
      "nb_pieces": 80,
      "statut": "normal"
    },
    {
      "id": 14,
      "commande_id": 9,
      "semaine_id": 34,
      "nb_pieces": 330,
      "statut": "normal"
    },
    {
      "id": 15,
      "commande_id": 10,
      "semaine_id": 34,
      "nb_pieces": 550,
      "statut": "normal"
    },
    {
      "id": 16,
      "commande_id": 11,
      "semaine_id": 34,
      "nb_pieces": 100,
      "statut": "normal"
    },
    {
      "id": 17,
      "commande_id": 12,
      "semaine_id": 34,
      "nb_pieces": 150,
      "statut": "normal"
    },
    {
      "id": 18,
      "commande_id": 13,
      "semaine_id": 32,
      "nb_pieces": 120,
      "statut": "normal"
    },
    {
      "id": 19,
      "commande_id": 13,
      "semaine_id": 33,
      "nb_pieces": 109,
      "statut": "normal"
    },
    {
      "id": 20,
      "commande_id": 13,
      "semaine_id": 34,
      "nb_pieces": 271,
      "statut": "normal"
    },
    {
      "id": 21,
      "commande_id": 14,
      "semaine_id": 32,
      "nb_pieces": 60,
      "statut": "normal"
    },
    {
      "id": 22,
      "commande_id": 14,
      "semaine_id": 34,
      "nb_pieces": 60,
      "statut": "normal"
    },
    {
      "id": 23,
      "commande_id": 15,
      "semaine_id": 34,
      "nb_pieces": 130,
      "statut": "normal"
    },
    {
      "id": 24,
      "commande_id": 25,
      "semaine_id": 34,
      "nb_pieces": 41,
      "statut": "normal"
    },
    {
      "id": 25,
      "commande_id": 25,
      "semaine_id": 35,
      "nb_pieces": 41,
      "statut": "normal"
    },
    {
      "id": 26,
      "commande_id": 25,
      "semaine_id": 36,
      "nb_pieces": 42,
      "statut": "normal"
    },
    {
      "id": 27,
      "commande_id": 25,
      "semaine_id": 37,
      "nb_pieces": 41,
      "statut": "normal"
    },
    {
      "id": 28,
      "commande_id": 26,
      "semaine_id": 34,
      "nb_pieces": 81,
      "statut": "normal"
    },
    {
      "id": 29,
      "commande_id": 26,
      "semaine_id": 35,
      "nb_pieces": 81,
      "statut": "normal"
    },
    {
      "id": 30,
      "commande_id": 26,
      "semaine_id": 36,
      "nb_pieces": 81,
      "statut": "normal"
    },
    {
      "id": 31,
      "commande_id": 26,
      "semaine_id": 37,
      "nb_pieces": 81,
      "statut": "normal"
    },
    {
      "id": 32,
      "commande_id": 27,
      "semaine_id": 34,
      "nb_pieces": 37,
      "statut": "normal"
    },
    {
      "id": 33,
      "commande_id": 27,
      "semaine_id": 35,
      "nb_pieces": 38,
      "statut": "normal"
    },
    {
      "id": 34,
      "commande_id": 27,
      "semaine_id": 36,
      "nb_pieces": 38,
      "statut": "normal"
    },
    {
      "id": 35,
      "commande_id": 27,
      "semaine_id": 37,
      "nb_pieces": 37,
      "statut": "normal"
    },
    {
      "id": 36,
      "commande_id": 28,
      "semaine_id": 34,
      "nb_pieces": 44,
      "statut": "normal"
    },
    {
      "id": 37,
      "commande_id": 28,
      "semaine_id": 35,
      "nb_pieces": 44,
      "statut": "normal"
    },
    {
      "id": 38,
      "commande_id": 28,
      "semaine_id": 36,
      "nb_pieces": 44,
      "statut": "normal"
    },
    {
      "id": 39,
      "commande_id": 28,
      "semaine_id": 37,
      "nb_pieces": 44,
      "statut": "normal"
    },
    {
      "id": 40,
      "commande_id": 29,
      "semaine_id": 34,
      "nb_pieces": 108,
      "statut": "normal"
    },
    {
      "id": 41,
      "commande_id": 29,
      "semaine_id": 35,
      "nb_pieces": 109,
      "statut": "normal"
    },
    {
      "id": 42,
      "commande_id": 29,
      "semaine_id": 36,
      "nb_pieces": 109,
      "statut": "normal"
    },
    {
      "id": 43,
      "commande_id": 29,
      "semaine_id": 37,
      "nb_pieces": 108,
      "statut": "normal"
    },
    {
      "id": 44,
      "commande_id": 30,
      "semaine_id": 34,
      "nb_pieces": 14,
      "statut": "normal"
    },
    {
      "id": 45,
      "commande_id": 30,
      "semaine_id": 35,
      "nb_pieces": 15,
      "statut": "normal"
    },
    {
      "id": 46,
      "commande_id": 30,
      "semaine_id": 36,
      "nb_pieces": 15,
      "statut": "normal"
    },
    {
      "id": 47,
      "commande_id": 30,
      "semaine_id": 37,
      "nb_pieces": 14,
      "statut": "normal"
    },
    {
      "id": 48,
      "commande_id": 31,
      "semaine_id": 34,
      "nb_pieces": 6,
      "statut": "normal"
    },
    {
      "id": 49,
      "commande_id": 31,
      "semaine_id": 35,
      "nb_pieces": 6,
      "statut": "normal"
    },
    {
      "id": 50,
      "commande_id": 31,
      "semaine_id": 36,
      "nb_pieces": 7,
      "statut": "normal"
    },
    {
      "id": 51,
      "commande_id": 31,
      "semaine_id": 37,
      "nb_pieces": 6,
      "statut": "normal"
    },
    {
      "id": 52,
      "commande_id": 32,
      "semaine_id": 34,
      "nb_pieces": 4,
      "statut": "normal"
    },
    {
      "id": 53,
      "commande_id": 32,
      "semaine_id": 35,
      "nb_pieces": 4,
      "statut": "normal"
    },
    {
      "id": 54,
      "commande_id": 32,
      "semaine_id": 36,
      "nb_pieces": 4,
      "statut": "normal"
    },
    {
      "id": 55,
      "commande_id": 32,
      "semaine_id": 37,
      "nb_pieces": 4,
      "statut": "normal"
    },
    {
      "id": 56,
      "commande_id": 33,
      "semaine_id": 34,
      "nb_pieces": 63,
      "statut": "normal"
    },
    {
      "id": 57,
      "commande_id": 33,
      "semaine_id": 35,
      "nb_pieces": 62,
      "statut": "normal"
    },
    {
      "id": 58,
      "commande_id": 33,
      "semaine_id": 36,
      "nb_pieces": 62,
      "statut": "normal"
    },
    {
      "id": 59,
      "commande_id": 33,
      "semaine_id": 37,
      "nb_pieces": 63,
      "statut": "normal"
    },
    {
      "id": 60,
      "commande_id": 34,
      "semaine_id": 34,
      "nb_pieces": 60,
      "statut": "normal"
    },
    {
      "id": 61,
      "commande_id": 34,
      "semaine_id": 35,
      "nb_pieces": 60,
      "statut": "normal"
    },
    {
      "id": 62,
      "commande_id": 34,
      "semaine_id": 36,
      "nb_pieces": 65,
      "statut": "normal"
    },
    {
      "id": 63,
      "commande_id": 34,
      "semaine_id": 37,
      "nb_pieces": 65,
      "statut": "normal"
    },
    {
      "id": 64,
      "commande_id": 35,
      "semaine_id": 34,
      "nb_pieces": 17,
      "statut": "normal"
    },
    {
      "id": 65,
      "commande_id": 35,
      "semaine_id": 35,
      "nb_pieces": 17,
      "statut": "normal"
    },
    {
      "id": 66,
      "commande_id": 35,
      "semaine_id": 36,
      "nb_pieces": 17,
      "statut": "normal"
    },
    {
      "id": 67,
      "commande_id": 35,
      "semaine_id": 37,
      "nb_pieces": 18,
      "statut": "normal"
    },
    {
      "id": 68,
      "commande_id": 36,
      "semaine_id": 34,
      "nb_pieces": 69,
      "statut": "normal"
    },
    {
      "id": 69,
      "commande_id": 36,
      "semaine_id": 35,
      "nb_pieces": 70,
      "statut": "normal"
    },
    {
      "id": 70,
      "commande_id": 36,
      "semaine_id": 36,
      "nb_pieces": 70,
      "statut": "normal"
    },
    {
      "id": 71,
      "commande_id": 36,
      "semaine_id": 37,
      "nb_pieces": 70,
      "statut": "normal"
    },
    {
      "id": 72,
      "commande_id": 37,
      "semaine_id": 34,
      "nb_pieces": 75,
      "statut": "normal"
    },
    {
      "id": 73,
      "commande_id": 37,
      "semaine_id": 35,
      "nb_pieces": 75,
      "statut": "normal"
    },
    {
      "id": 74,
      "commande_id": 37,
      "semaine_id": 36,
      "nb_pieces": 75,
      "statut": "normal"
    },
    {
      "id": 75,
      "commande_id": 37,
      "semaine_id": 37,
      "nb_pieces": 75,
      "statut": "normal"
    },
    {
      "id": 76,
      "commande_id": 38,
      "semaine_id": 34,
      "nb_pieces": 38,
      "statut": "normal"
    },
    {
      "id": 77,
      "commande_id": 38,
      "semaine_id": 35,
      "nb_pieces": 38,
      "statut": "normal"
    },
    {
      "id": 78,
      "commande_id": 38,
      "semaine_id": 36,
      "nb_pieces": 37,
      "statut": "normal"
    },
    {
      "id": 79,
      "commande_id": 38,
      "semaine_id": 37,
      "nb_pieces": 37,
      "statut": "normal"
    },
    {
      "id": 80,
      "commande_id": 39,
      "semaine_id": 37,
      "nb_pieces": 95,
      "statut": "normal"
    },
    {
      "id": 81,
      "commande_id": 39,
      "semaine_id": 38,
      "nb_pieces": 95,
      "statut": "normal"
    },
    {
      "id": 82,
      "commande_id": 39,
      "semaine_id": 39,
      "nb_pieces": 95,
      "statut": "normal"
    },
    {
      "id": 83,
      "commande_id": 39,
      "semaine_id": 40,
      "nb_pieces": 94,
      "statut": "normal"
    },
    {
      "id": 84,
      "commande_id": 40,
      "semaine_id": 37,
      "nb_pieces": 104,
      "statut": "normal"
    },
    {
      "id": 85,
      "commande_id": 40,
      "semaine_id": 38,
      "nb_pieces": 104,
      "statut": "normal"
    },
    {
      "id": 86,
      "commande_id": 40,
      "semaine_id": 39,
      "nb_pieces": 104,
      "statut": "normal"
    },
    {
      "id": 87,
      "commande_id": 40,
      "semaine_id": 40,
      "nb_pieces": 104,
      "statut": "normal"
    },
    {
      "id": 88,
      "commande_id": 41,
      "semaine_id": 37,
      "nb_pieces": 115,
      "statut": "normal"
    },
    {
      "id": 89,
      "commande_id": 41,
      "semaine_id": 38,
      "nb_pieces": 115,
      "statut": "normal"
    },
    {
      "id": 90,
      "commande_id": 41,
      "semaine_id": 39,
      "nb_pieces": 114,
      "statut": "normal"
    },
    {
      "id": 91,
      "commande_id": 41,
      "semaine_id": 40,
      "nb_pieces": 115,
      "statut": "normal"
    },
    {
      "id": 92,
      "commande_id": 42,
      "semaine_id": 37,
      "nb_pieces": 131,
      "statut": "normal"
    },
    {
      "id": 93,
      "commande_id": 42,
      "semaine_id": 38,
      "nb_pieces": 131,
      "statut": "normal"
    },
    {
      "id": 94,
      "commande_id": 42,
      "semaine_id": 39,
      "nb_pieces": 132,
      "statut": "normal"
    },
    {
      "id": 95,
      "commande_id": 42,
      "semaine_id": 40,
      "nb_pieces": 132,
      "statut": "normal"
    },
    {
      "id": 96,
      "commande_id": 43,
      "semaine_id": 37,
      "nb_pieces": 149,
      "statut": "normal"
    },
    {
      "id": 97,
      "commande_id": 43,
      "semaine_id": 38,
      "nb_pieces": 148,
      "statut": "normal"
    },
    {
      "id": 98,
      "commande_id": 43,
      "semaine_id": 39,
      "nb_pieces": 148,
      "statut": "normal"
    },
    {
      "id": 99,
      "commande_id": 43,
      "semaine_id": 40,
      "nb_pieces": 148,
      "statut": "normal"
    },
    {
      "id": 100,
      "commande_id": 44,
      "semaine_id": 37,
      "nb_pieces": 137,
      "statut": "normal"
    },
    {
      "id": 101,
      "commande_id": 44,
      "semaine_id": 38,
      "nb_pieces": 137,
      "statut": "normal"
    },
    {
      "id": 102,
      "commande_id": 44,
      "semaine_id": 39,
      "nb_pieces": 137,
      "statut": "normal"
    },
    {
      "id": 103,
      "commande_id": 44,
      "semaine_id": 40,
      "nb_pieces": 137,
      "statut": "normal"
    },
    {
      "id": 104,
      "commande_id": 25,
      "semaine_id": 38,
      "nb_pieces": 0,
      "statut": "limite_client"
    },
    {
      "id": 105,
      "commande_id": 26,
      "semaine_id": 38,
      "nb_pieces": 0,
      "statut": "limite_client"
    },
    {
      "id": 106,
      "commande_id": 27,
      "semaine_id": 38,
      "nb_pieces": 0,
      "statut": "limite_client"
    },
    {
      "id": 107,
      "commande_id": 28,
      "semaine_id": 38,
      "nb_pieces": 0,
      "statut": "limite_client"
    },
    {
      "id": 108,
      "commande_id": 29,
      "semaine_id": 38,
      "nb_pieces": 0,
      "statut": "limite_client"
    },
    {
      "id": 109,
      "commande_id": 30,
      "semaine_id": 38,
      "nb_pieces": 0,
      "statut": "limite_client"
    },
    {
      "id": 110,
      "commande_id": 31,
      "semaine_id": 38,
      "nb_pieces": 0,
      "statut": "limite_client"
    },
    {
      "id": 111,
      "commande_id": 32,
      "semaine_id": 38,
      "nb_pieces": 0,
      "statut": "limite_client"
    },
    {
      "id": 112,
      "commande_id": 33,
      "semaine_id": 38,
      "nb_pieces": 0,
      "statut": "limite_client"
    },
    {
      "id": 113,
      "commande_id": 34,
      "semaine_id": 38,
      "nb_pieces": 0,
      "statut": "limite_client"
    },
    {
      "id": 114,
      "commande_id": 35,
      "semaine_id": 38,
      "nb_pieces": 0,
      "statut": "limite_client"
    },
    {
      "id": 115,
      "commande_id": 36,
      "semaine_id": 38,
      "nb_pieces": 0,
      "statut": "limite_client"
    },
    {
      "id": 116,
      "commande_id": 37,
      "semaine_id": 38,
      "nb_pieces": 0,
      "statut": "limite_client"
    },
    {
      "id": 117,
      "commande_id": 38,
      "semaine_id": 38,
      "nb_pieces": 0,
      "statut": "limite_client"
    },
    {
      "id": 118,
      "commande_id": 39,
      "semaine_id": 46,
      "nb_pieces": 0,
      "statut": "limite_client"
    },
    {
      "id": 119,
      "commande_id": 40,
      "semaine_id": 46,
      "nb_pieces": 0,
      "statut": "limite_client"
    },
    {
      "id": 120,
      "commande_id": 41,
      "semaine_id": 46,
      "nb_pieces": 0,
      "statut": "limite_client"
    },
    {
      "id": 121,
      "commande_id": 42,
      "semaine_id": 46,
      "nb_pieces": 0,
      "statut": "limite_client"
    },
    {
      "id": 122,
      "commande_id": 43,
      "semaine_id": 46,
      "nb_pieces": 0,
      "statut": "limite_client"
    },
    {
      "id": 123,
      "commande_id": 44,
      "semaine_id": 46,
      "nb_pieces": 0,
      "statut": "limite_client"
    }
  ]
};
