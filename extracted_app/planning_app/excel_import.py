# -*- coding: utf-8 -*-
"""
excel_import.py — Importe un fichier "MACRO-PLANNING_BROD_...xlsx" existant
(au format de la feuille "MAJ Sxx") dans la base SQLite locale.

Repère dynamiquement :
  - la ligne des dates (contient des objets date)
  - la ligne des codes semaine ('Sxx')
  - la ligne d'en-têtes de colonnes ('Nb brodeuses' / "Nb d'heures" / 'Nb pièces ')
  - les lignes de données (Client / Modèle / ... ) jusqu'à la première ligne vide
"""

import re
import datetime
import openpyxl

import db


def _to_number(value):
    """Convertit une valeur de cellule (déjà résolue par data_only=True) en
    nombre si possible, sinon retourne None (ex: 'TBC')."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        v = value.strip().replace(",", ".")
        try:
            return float(v)
        except ValueError:
            return None
    return None


def _is_tbc(value):
    return isinstance(value, str) and value.strip().upper() in ("TBC", "TBD", "?")


def import_xlsx(path, sheet_name=None):
    """
    Importe le fichier Excel `path` dans la base. Retourne un résumé (dict).
    Utilise deux lectures : une avec formules (data_only=False), une avec
    valeurs calculées en cache (data_only=True) — cf. bonnes pratiques openpyxl.
    """
    wb_formulas = openpyxl.load_workbook(path, data_only=False)
    wb_values = openpyxl.load_workbook(path, data_only=True)

    sheet_name = sheet_name or wb_values.sheetnames[0]
    ws_f = wb_formulas[sheet_name]
    ws_v = wb_values[sheet_name]

    max_col = ws_v.max_column
    max_row = ws_v.max_row

    # 1. Repérer la ligne des dates et la ligne des codes semaine (S..)
    date_row = None
    week_code_row = None
    for r in range(1, min(10, max_row) + 1):
        row_vals = [ws_v.cell(row=r, column=c).value for c in range(1, max_col + 1)]
        if any(isinstance(v, (datetime.date, datetime.datetime)) for v in row_vals):
            date_row = r
        if any(isinstance(v, str) and re.fullmatch(r"S\d{1,2}", v.strip()) for v in row_vals if v):
            week_code_row = r
    if week_code_row is None:
        raise ValueError("Impossible de trouver la ligne des codes semaine (ex: 'S34').")

    # 2. Repérer la ligne d'en-têtes de colonnes ('Nb brodeuses' etc.)
    header_row = None
    for r in range(week_code_row, min(week_code_row + 4, max_row) + 1):
        row_vals = [ws_v.cell(row=r, column=c).value for c in range(1, max_col + 1)]
        if any(isinstance(v, str) and "brodeuses" in v.lower() for v in row_vals if v):
            header_row = r
            break
    if header_row is None:
        raise ValueError("Impossible de trouver la ligne d'en-têtes ('Nb brodeuses'...).")

    # 3. Construire la liste des semaines : pour chaque colonne du header_row
    #    qui vaut 'Nb brodeuses', la semaine associée = valeur en week_code_row
    #    de cette même colonne, la date = date_row de cette même colonne.
    semaines_cols = []  # (col_brodeuses, col_heures, col_pieces, code, date)
    for c in range(1, max_col + 1):
        label = ws_v.cell(row=header_row, column=c).value
        if isinstance(label, str) and "brodeuses" in label.lower():
            code = ws_v.cell(row=week_code_row, column=c).value
            date_val = ws_v.cell(row=date_row, column=c).value if date_row else None
            if isinstance(code, str) and re.fullmatch(r"S\d{1,2}", code.strip()):
                date_iso = None
                if isinstance(date_val, (datetime.date, datetime.datetime)):
                    date_iso = date_val.strftime("%Y-%m-%d")
                semaines_cols.append({
                    "code": code.strip(),
                    "date": date_iso,
                    "col_brodeuses": c,
                    "col_heures": c + 1,
                    "col_pieces": c + 2,
                })

    # 4. Repérer les colonnes fixes (Client, Modèle, Qté commande, Unité,
    #    Heure/pcs, Qté finie) en cherchant les libellés sur header_row.
    fixed_cols = {}
    for c in range(1, max_col + 1):
        label = ws_v.cell(row=header_row, column=c).value
        if not isinstance(label, str):
            continue
        low = label.lower().replace("\n", " ")
        if "client" in low:
            fixed_cols["client"] = c
        elif "modele" in low or "modèle" in low:
            fixed_cols["modele"] = c
        elif "commande" in low:
            fixed_cols["qte_commande"] = c
        elif low.strip() == "unite" or low.strip() == "unité":
            fixed_cols["unite"] = c
        elif "heure" in low and "pcs" in low:
            fixed_cols["heure_pcs"] = c
        elif "finie" in low:
            fixed_cols["qte_finie"] = c

    required = ["client", "modele", "qte_commande"]
    missing = [k for k in required if k not in fixed_cols]
    if missing:
        raise ValueError(f"Colonnes obligatoires introuvables dans le fichier : {missing}")

    # 5. Insérer les semaines dans la DB
    db.init_db()
    semaine_id_by_col = {}
    for i, sc in enumerate(semaines_cols):
        date_iso = sc["date"] or "2000-01-01"
        sem_id = db.add_semaine(sc["code"], date_iso, ordre=i)
        semaine_id_by_col[sc["col_pieces"]] = sem_id

    # 6. Parcourir les lignes de données jusqu'à la première ligne totalement vide
    data_start = header_row + 1
    n_commandes = 0
    n_planning = 0
    ordre = 0
    for r in range(data_start, max_row + 1):
        client = ws_v.cell(row=r, column=fixed_cols["client"]).value
        modele = ws_v.cell(row=r, column=fixed_cols["modele"]).value
        if not client and not modele:
            # ligne vide -> fin du tableau de données (ou ligne de séparation)
            # on continue un peu au cas où il y ait un trou, mais on s'arrête
            # après 2 lignes vides consécutives
            next_client = ws_v.cell(row=r + 1, column=fixed_cols["client"]).value if r + 1 <= max_row else None
            next_modele = ws_v.cell(row=r + 1, column=fixed_cols["modele"]).value if r + 1 <= max_row else None
            if not next_client and not next_modele:
                break
            else:
                continue

        qte_commande = _to_number(ws_v.cell(row=r, column=fixed_cols["qte_commande"]).value) or 0
        unite = ws_v.cell(row=r, column=fixed_cols.get("unite", 0)).value if "unite" in fixed_cols else "PCS"
        heure_raw = ws_v.cell(row=r, column=fixed_cols.get("heure_pcs", 0)).value if "heure_pcs" in fixed_cols else None
        heure_tbc = 1 if _is_tbc(heure_raw) else 0
        heure_pcs = _to_number(heure_raw)
        qte_finie = _to_number(ws_v.cell(row=r, column=fixed_cols.get("qte_finie", 0)).value) if "qte_finie" in fixed_cols else 0

        commande_id = db.add_commande({
            "client": str(client) if client else "",
            "modele": str(modele) if modele else "",
            "qte_commande": qte_commande,
            "unite": unite or "PCS",
            "heure_pcs": heure_pcs,
            "heure_pcs_tbc": heure_tbc,
            "qte_finie": qte_finie or 0,
            "date_limite_client": None,
            "date_lancement": None,
            "notes": None,
            "ordre": ordre,
        })
        ordre += 1
        n_commandes += 1

        for sc in semaines_cols:
            pieces = _to_number(ws_v.cell(row=r, column=sc["col_pieces"]).value)
            if pieces:
                sem_id = semaine_id_by_col[sc["col_pieces"]]
                db.set_pieces(commande_id, sem_id, pieces)
                n_planning += 1

    return {
        "sheet": sheet_name,
        "semaines_importees": len(semaines_cols),
        "commandes_importees": n_commandes,
        "lignes_planning_importees": n_planning,
    }


if __name__ == "__main__":
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else None
    if not path:
        print("Usage: python excel_import.py chemin_vers_fichier.xlsx")
        sys.exit(1)
    resume = import_xlsx(path)
    print("Import terminé :", resume)
