# -*- coding: utf-8 -*-
"""
logic.py — Règles de calcul métier du planning broderie.

Règles (identiques au fichier Excel d'origine) :
  - Qté reste à faire   = Qté commande - Qté finie
  - Nb heures (semaine) = Nb pièces (semaine) * Heure/pcs
  - Nb brodeuses        = Nb heures / 40   (base 40h/semaine par brodeuse)
  - Total programmé     = somme des Nb pièces sur toutes les semaines
  - Écart vs besoin     = Total programmé - Qté reste à faire
"""

HEURES_PAR_BRODEUSE_SEMAINE = 40.0


def qte_reste_a_faire(qte_commande, qte_finie):
    try:
        return round((qte_commande or 0) - (qte_finie or 0), 2)
    except TypeError:
        return None


def nb_heures(nb_pieces, heure_pcs):
    if heure_pcs is None or nb_pieces is None:
        return None
    try:
        return round(nb_pieces * heure_pcs, 2)
    except TypeError:
        return None


def nb_brodeuses(heures):
    if heures is None:
        return None
    return round(heures / HEURES_PAR_BRODEUSE_SEMAINE, 2)


def statut_commande(qte_commande, qte_finie, total_programme):
    """Retourne 'ok', 'sous_planifie' ou 'termine'."""
    reste = qte_reste_a_faire(qte_commande, qte_finie)
    if reste is not None and reste <= 0:
        return "termine"
    if total_programme is None:
        total_programme = 0
    if reste is not None and total_programme < reste:
        return "sous_planifie"
    return "ok"


def semaine_courante_code(semaines, aujourdhui):
    """
    Détermine quelle semaine (parmi la liste `semaines`, triée par date_debut)
    correspond à `aujourdhui` (objet date). Une semaine dure du date_debut
    (lundi) inclus au date_debut+6 jours inclus.
    Retourne le code de semaine ou None si hors plage.
    """
    from datetime import datetime, timedelta

    for i, s in enumerate(semaines):
        d0 = datetime.strptime(s["date_debut"], "%Y-%m-%d").date()
        d1 = d0 + timedelta(days=6)
        if d0 <= aujourdhui <= d1:
            return s["code"]
    return None
