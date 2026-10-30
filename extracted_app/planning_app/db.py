# -*- coding: utf-8 -*-
"""
db.py — Couche d'accès aux données (SQLite) pour l'outil de Macro-Planning Broderie.

Toutes les données sont stockées localement dans un fichier planning.db
(aucune connexion internet requise : c'est un outil 100% hors-ligne).
"""

import sqlite3
import os
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "planning.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS config (
    cle   TEXT PRIMARY KEY,
    valeur TEXT
);

CREATE TABLE IF NOT EXISTS semaines (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    code        TEXT UNIQUE NOT NULL,      -- ex: 'S34'
    date_debut  TEXT NOT NULL,             -- ISO 'YYYY-MM-DD' (lundi de la semaine)
    ordre       INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS commandes (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    client              TEXT NOT NULL,
    modele              TEXT NOT NULL,
    qte_commande        REAL NOT NULL DEFAULT 0,
    unite               TEXT DEFAULT 'PCS',
    heure_pcs           REAL,               -- NULL si TBC (à confirmer)
    heure_pcs_tbc       INTEGER DEFAULT 0,  -- 1 si "TBC"
    qte_finie           REAL DEFAULT 0,
    date_limite_client  TEXT,               -- ISO date, optionnel
    date_lancement      TEXT,               -- ISO date, optionnel
    notes               TEXT,
    ordre               INTEGER DEFAULT 0,
    archive             INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS planning (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    commande_id   INTEGER NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
    semaine_id    INTEGER NOT NULL REFERENCES semaines(id) ON DELETE CASCADE,
    nb_pieces     REAL DEFAULT 0,
    statut        TEXT DEFAULT 'normal',   -- 'normal' | 'lancement' | 'limite_client'
    UNIQUE(commande_id, semaine_id)
);
"""


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_conn() as conn:
        conn.executescript(SCHEMA)


# ---------------------------------------------------------------- config ---

def get_config(cle, defaut=None):
    with get_conn() as conn:
        row = conn.execute("SELECT valeur FROM config WHERE cle=?", (cle,)).fetchone()
        return row["valeur"] if row else defaut


def set_config(cle, valeur):
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO config(cle, valeur) VALUES(?,?) "
            "ON CONFLICT(cle) DO UPDATE SET valeur=excluded.valeur",
            (cle, str(valeur)),
        )


# --------------------------------------------------------------- semaines --

def list_semaines():
    with get_conn() as conn:
        return conn.execute(
            "SELECT * FROM semaines ORDER BY ordre ASC"
        ).fetchall()


def add_semaine(code, date_debut, ordre=None):
    with get_conn() as conn:
        if ordre is None:
            row = conn.execute("SELECT MAX(ordre) AS m FROM semaines").fetchone()
            ordre = (row["m"] + 1) if row["m"] is not None else 0
        conn.execute(
            "INSERT OR IGNORE INTO semaines(code, date_debut, ordre) VALUES(?,?,?)",
            (code, date_debut, ordre),
        )
        return conn.execute(
            "SELECT id FROM semaines WHERE code=?", (code,)
        ).fetchone()["id"]


def get_semaine_by_code(code):
    with get_conn() as conn:
        return conn.execute(
            "SELECT * FROM semaines WHERE code=?", (code,)
        ).fetchone()


def delete_semaine(semaine_id):
    with get_conn() as conn:
        conn.execute("DELETE FROM semaines WHERE id=?", (semaine_id,))


# -------------------------------------------------------------- commandes --

def list_commandes(include_archived=False):
    with get_conn() as conn:
        if include_archived:
            q = "SELECT * FROM commandes ORDER BY ordre ASC, id ASC"
        else:
            q = "SELECT * FROM commandes WHERE archive=0 ORDER BY ordre ASC, id ASC"
        return conn.execute(q).fetchall()


def get_commande(commande_id):
    with get_conn() as conn:
        return conn.execute(
            "SELECT * FROM commandes WHERE id=?", (commande_id,)
        ).fetchone()


def add_commande(data):
    """data: dict avec les clés des colonnes (sauf id)."""
    cols = ["client", "modele", "qte_commande", "unite", "heure_pcs",
            "heure_pcs_tbc", "qte_finie", "date_limite_client",
            "date_lancement", "notes", "ordre"]
    values = [data.get(c) for c in cols]
    with get_conn() as conn:
        row = conn.execute("SELECT MAX(ordre) AS m FROM commandes").fetchone()
        if data.get("ordre") is None:
            values[cols.index("ordre")] = (row["m"] + 1) if row["m"] is not None else 0
        cur = conn.execute(
            f"INSERT INTO commandes ({','.join(cols)}) VALUES ({','.join('?' * len(cols))})",
            values,
        )
        return cur.lastrowid


def update_commande(commande_id, data):
    if not data:
        return
    cols = list(data.keys())
    values = [data[c] for c in cols] + [commande_id]
    with get_conn() as conn:
        conn.execute(
            f"UPDATE commandes SET {','.join(c + '=?' for c in cols)} WHERE id=?",
            values,
        )


def delete_commande(commande_id):
    with get_conn() as conn:
        conn.execute("DELETE FROM commandes WHERE id=?", (commande_id,))


def archive_commande(commande_id, archived=True):
    update_commande(commande_id, {"archive": 1 if archived else 0})


# --------------------------------------------------------------- planning --

def get_pieces(commande_id, semaine_id):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM planning WHERE commande_id=? AND semaine_id=?",
            (commande_id, semaine_id),
        ).fetchone()
        return row


def set_pieces(commande_id, semaine_id, nb_pieces, statut=None):
    with get_conn() as conn:
        existing = conn.execute(
            "SELECT id, statut FROM planning WHERE commande_id=? AND semaine_id=?",
            (commande_id, semaine_id),
        ).fetchone()
        if existing:
            new_statut = statut if statut is not None else existing["statut"]
            conn.execute(
                "UPDATE planning SET nb_pieces=?, statut=? WHERE id=?",
                (nb_pieces, new_statut, existing["id"]),
            )
        else:
            conn.execute(
                "INSERT INTO planning(commande_id, semaine_id, nb_pieces, statut) "
                "VALUES (?,?,?,?)",
                (commande_id, semaine_id, nb_pieces, statut or "normal"),
            )


def set_statut(commande_id, semaine_id, statut):
    with get_conn() as conn:
        existing = conn.execute(
            "SELECT id FROM planning WHERE commande_id=? AND semaine_id=?",
            (commande_id, semaine_id),
        ).fetchone()
        if existing:
            conn.execute("UPDATE planning SET statut=? WHERE id=?", (statut, existing["id"]))
        else:
            conn.execute(
                "INSERT INTO planning(commande_id, semaine_id, nb_pieces, statut) "
                "VALUES (?,0,?)",
                (commande_id, semaine_id, statut),
            )


def planning_for_commande(commande_id):
    """Retourne un dict {semaine_id: row} pour une commande."""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM planning WHERE commande_id=?", (commande_id,)
        ).fetchall()
        return {r["semaine_id"]: r for r in rows}


def planning_for_semaine(semaine_id):
    """Retourne un dict {commande_id: row} pour une semaine."""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM planning WHERE semaine_id=?", (semaine_id,)
        ).fetchall()
        return {r["commande_id"]: r for r in rows}


def total_pieces_commande(commande_id):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT COALESCE(SUM(nb_pieces),0) AS t FROM planning WHERE commande_id=?",
            (commande_id,),
        ).fetchone()
        return row["t"] or 0
