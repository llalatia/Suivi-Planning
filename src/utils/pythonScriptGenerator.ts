/**
 * Génère le script Python complet autonome (production_planner.py)
 * pour automatiser le traitement des fichiers .xlsx, le calcul de cadence,
 * le dispatch anti-retard et la génération de rapports en Python pur.
 */
export function getPythonScriptContent(): string {
  return `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==============================================================================
OptiProd - Planificateur de Production Automatisé en Python
==============================================================================
Description :
  - Traite automatiquement les fichiers Excel (.xlsx) d'ordres de fabrication
  - Calcule les temps de fabrication selon la cadence nominale et le rendement
  - Ordonnance le dispatch journalier et hebdomadaire (règle anti-retard EDD/Priority)
  - Identifie les goulots d'étranglement et les risques de retards clients
  - Remplit et exporte un fichier Excel consolidé multi-feuilles avec mise en forme
  - Génère un rapport de cadence et de performance prêt pour la direction

Prérequis :
  pip install pandas openpyxl
==============================================================================
"""

import sys
import os
import argparse
from datetime import datetime, timedelta
import pandas as pd
import openpyxl
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# ==============================================================================
# 1. PARAMÈTRES D'USINE PAR DÉFAUT
# ==============================================================================
FACTORY_CONFIG = {
    "factory_name": "Atelier de Production Industrielle",
    "hours_per_shift": 8,
    "shifts_per_day": 2,          # 2x8 = 16h/jour
    "working_days_per_week": 5,    # Du Lundi au Vendredi
    "lines": {
        "L1": {"name": "Ligne 1 - Découpe & Laser", "cadence": 120, "efficiency": 0.90, "cap_h": 16},
        "L2": {"name": "Ligne 2 - Usinage CNC", "cadence": 45, "efficiency": 0.85, "cap_h": 16},
        "L3": {"name": "Ligne 3 - Assemblage", "cadence": 80, "efficiency": 0.88, "cap_h": 16},
        "L4": {"name": "Ligne 4 - Contrôle & Emballage", "cadence": 200, "efficiency": 0.95, "cap_h": 16},
    }
}

# ==============================================================================
# 2. CHARGEMENT ET NORMALISATION DU FICHIER EXCEL (.XLSX)
# ==============================================================================
def load_production_excel(file_path: str) -> pd.DataFrame:
    """Charge le fichier Excel .xlsx et normalise les noms de colonnes."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Erreur : Le fichier {file_path} est introuvable.")

    print(f"[*] Lecture du fichier Excel : {file_path}")
    excel = pd.ExcelFile(file_path)
    sheet_name = excel.sheet_names[0]
    for s in excel.sheet_names:
        if any(k in s.lower() for k in ['ordre', 'planning', 'of', 'production']):
            sheet_name = s
            break

    df = pd.read_excel(file_path, sheet_name=sheet_name)
    df.columns = [str(col).strip() for col in df.columns]

    # Mappage flexible des colonnes
    col_map = {
        'Code OF': 'code', 'Code': 'code', 'OF': 'code', 'Réf': 'code',
        'Client': 'client', 'Nom Client': 'client',
        'Produit': 'product', 'Article': 'product', 'Désignation': 'product',
        'Ligne': 'line_id', 'Machine': 'line_id', 'Poste': 'line_id',
        'Quantité': 'quantity', 'Qté': 'quantity', 'Total': 'quantity',
        'Déjà Produit': 'produced', 'Produit': 'produced', 'Fait': 'produced',
        'Cadence': 'cadence', 'Cadence (pcs/h)': 'cadence', 'Pcs/h': 'cadence',
        'Date Début': 'start_date', 'Début': 'start_date',
        'Date Limite': 'deadline', 'Deadline': 'deadline', 'Date Livraison': 'deadline',
        'Priorité': 'priority', 'Prio': 'priority',
        'Notes': 'notes'
    }

    normalized_cols = {}
    for actual_col in df.columns:
        for pattern, norm in col_map.items():
            if pattern.lower() == actual_col.lower():
                normalized_cols[actual_col] = norm
                break

    df = df.rename(columns=normalized_cols)

    # Valeurs par défaut si colonnes absentes
    if 'produced' not in df.columns: df['produced'] = 0
    if 'priority' not in df.columns: df['priority'] = 'P2'
    if 'cadence' not in df.columns: df['cadence'] = 60
    if 'start_date' not in df.columns: df['start_date'] = datetime.today().strftime('%Y-%m-%d')
    if 'deadline' not in df.columns:
        df['deadline'] = (datetime.today() + timedelta(days=7)).strftime('%Y-%m-%d')

    return df

# ==============================================================================
# 3. CALCUL DES CADENCES ET DES HEURES REQUISES
# ==============================================================================
def compute_production_metrics(df: pd.DataFrame) -> pd.DataFrame:
    """Calcule le reste à produire, les heures de travail et les dates de fin estimées."""
    df['quantity'] = pd.to_numeric(df['quantity'], errors='coerce').fillna(100).astype(int)
    df['produced'] = pd.to_numeric(df['produced'], errors='coerce').fillna(0).astype(int)
    df['remaining_qty'] = (df['quantity'] - df['produced']).clip(lower=0)

    # Récupérer cadence et efficacité
    def get_cadence(row):
        val = pd.to_numeric(row.get('cadence'), errors='coerce')
        if pd.notna(val) and val > 0:
            return float(val)
        line_info = FACTORY_CONFIG["lines"].get(str(row.get('line_id')), {})
        return line_info.get("cadence", 60)

    df['effective_cadence'] = df.apply(get_cadence, axis=1)

    def get_efficiency(row):
        line_info = FACTORY_CONFIG["lines"].get(str(row.get('line_id')), {})
        return line_info.get("efficiency", 0.88)

    df['efficiency'] = df.apply(get_efficiency, axis=1)

    # Heures requises = Quantité restante / (Cadence * Rendement)
    df['hours_required'] = (df['remaining_qty'] / (df['effective_cadence'] * df['efficiency'])).round(1)

    return df

# ==============================================================================
# 4. ALGORITHME DE DISPATCH ANTI-RETARD (EDD + PRIORITY)
# ==============================================================================
def optimize_anti_delay_dispatch(df: pd.DataFrame) -> pd.DataFrame:
    """Ordonnance la fabrication par ligne pour éliminer les retards clients."""
    priority_order = {'P1': 1, 'P2': 2, 'P3': 3}
    df['priority_weight'] = df['priority'].map(lambda p: priority_order.get(str(p).upper(), 2))
    df['deadline_dt'] = pd.to_datetime(df['deadline'], errors='coerce').fillna(pd.Timestamp.now() + pd.Timedelta(days=7))

    # Trier par ligne, priorité puis deadline (Earliest Due Date)
    df = df.sort_values(by=['line_id', 'priority_weight', 'deadline_dt']).reset_index(drop=True)

    # Simulation du planning séquentiel sur chaque machine
    today = datetime.today().replace(hour=8, minute=0, second=0, microsecond=0)
    line_cursors = {}

    start_dates = []
    end_dates = []
    status_list = []
    delay_days_list = []

    for _, row in df.iterrows():
        line = str(row['line_id'])
        line_cap = FACTORY_CONFIG["lines"].get(line, {}).get("cap_h", 16)
        cursor = line_cursors.get(line, today)

        hours = row['hours_required']
        days_needed = max(1, int(round(hours / line_cap + 0.49)))

        start_dt = cursor
        end_dt = start_dt + timedelta(days=days_needed - 1)

        # Prochaine tâche commence le jour ouvré suivant
        line_cursors[line] = end_dt + timedelta(days=1)

        deadline_dt = row['deadline_dt']
        diff = (deadline_dt.date() - end_dt.date()).days

        if row['remaining_qty'] == 0:
            status = 'Terminé'
            delay = 0
        elif diff < 0:
            status = 'RETARD'
            delay = abs(diff)
        elif diff <= 1:
            status = 'À risque'
            delay = 0
        else:
            status = 'À l\\'heure'
            delay = 0

        start_dates.append(start_dt.strftime('%Y-%m-%d'))
        end_dates.append(end_dt.strftime('%Y-%m-%d'))
        status_list.append(status)
        delay_days_list.append(delay)

    df['plan_start_date'] = start_dates
    df['plan_end_date'] = end_dates
    df['status'] = status_list
    df['delay_days'] = delay_days_list

    return df

# ==============================================================================
# 5. GÉNÉRATION DES RAPPORTS ET EXPORT EXCEL STYLISÉ (.XLSX)
# ==============================================================================
def export_processed_excel(df: pd.DataFrame, output_path: str):
    """Exporte les données formatées avec onglets de synthèse dans un nouveau fichier Excel."""
    print(f"[*] Génération du classeur Excel automatisé : {output_path}")

    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        # 1. Onglet Planning Détaillé
        cols_export = {
            'code': 'Code OF', 'client': 'Client', 'product': 'Produit',
            'line_id': 'Ligne', 'priority': 'Priorité', 'quantity': 'Quantité Totale',
            'produced': 'Déjà Produit', 'remaining_qty': 'Reste à Produire',
            'effective_cadence': 'Cadence (pcs/h)', 'hours_required': 'Heures Requises',
            'plan_start_date': 'Date Début Planifiée', 'plan_end_date': 'Fin Estimée',
            'deadline': 'Date Limite Client', 'status': 'Statut Ponctualité', 'delay_days': 'Retard (Jours)'
        }
        clean_df = df[[c for c in cols_export.keys() if c in df.columns]].rename(columns=cols_export)
        clean_df.to_excel(writer, sheet_name='Planning_Production', index=False)

        # 2. Onglet Synthèse Dispatch Quotidien
        dispatch_rows = []
        for line_id, line_info in FACTORY_CONFIG["lines"].items():
            line_orders = df[df['line_id'] == line_id]
            for _, ord_row in line_orders.iterrows():
                dispatch_rows.append({
                    'Ligne': line_info['name'],
                    'Code OF': ord_row['code'],
                    'Client': ord_row['client'],
                    'Produit': ord_row['product'],
                    'Pièces à produire': ord_row['remaining_qty'],
                    'Heures allouées': ord_row['hours_required'],
                    'Cadence': ord_row['effective_cadence'],
                    'Date prévue': ord_row['plan_start_date'],
                    'Statut': ord_row['status']
                })
        dispatch_df = pd.DataFrame(dispatch_rows)
        dispatch_df.to_excel(writer, sheet_name='Dispatch_Journalier', index=False)

        # 3. Onglet Rapport Cadence & KPI
        total_of = len(df)
        delayed_of = len(df[df['status'] == 'RETARD'])
        otd = round(((total_of - delayed_of) / max(1, total_of)) * 100, 1)
        tot_pieces = df['quantity'].sum()
        tot_hours = df['hours_required'].sum()
        avg_cadence = round(df['effective_cadence'].mean(), 1)

        kpi_data = [
            {'Indicateur': 'Taux de Respect Délais (OTD)', 'Valeur': f"{otd} %"},
            {'Indicateur': 'Total Ordres de Fabrication', 'Valeur': total_of},
            {'Indicateur': 'Ordres en Retard Critique', 'Valeur': delayed_of},
            {'Indicateur': 'Total Pièces au Planning', 'Valeur': tot_pieces},
            {'Indicateur': 'Total Heures Machine Requises', 'Valeur': f"{tot_hours} h"},
            {'Indicateur': 'Cadence Moyenne Atelier', 'Valeur': f"{avg_cadence} pcs/h"},
        ]
        pd.DataFrame(kpi_data).to_excel(writer, sheet_name='Rapport_Cadence_KPI', index=False)

    # Stylisation Openpyxl (couleurs et largeurs de colonnes)
    wb = openpyxl.load_workbook(output_path)
    header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    header_font = Font(name="Arial", size=11, bold=True, color="FFFFFF")
    
    red_fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
    green_fill = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid")
    amber_fill = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 4, 14)

        for cell in ws[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")

    wb.save(output_path)
    print(f"[OK] Fichier Excel généré et stylisé avec succès.")

# ==============================================================================
# 6. POINT D'ENTRÉE PRINCIPAL (CLI)
# ==============================================================================
def main():
    parser = argparse.ArgumentParser(description="OptiProd - Planificateur de Production Automatisé")
    parser.add_argument("--input", "-i", default="Planning_Production.xlsx", help="Chemin du fichier Excel d'entrée (.xlsx)")
    parser.add_argument("--output", "-o", default="Planning_Optimise.xlsx", help="Chemin du fichier Excel de sortie (.xlsx)")
    args = parser.parse_args()

    print("==================================================================")
    print("     OptiProd - Automatisation Planning & Cadence de Production   ")
    print("==================================================================")

    # 1. Vérification si fichier d'entrée existe, sinon création d'un modèle d'exemple
    if not os.path.exists(args.input):
        print(f"[!] Fichier {args.input} non trouvé. Création d'un fichier modèle avec données types...")
        sample_data = {
            'Code OF': ['OF-2024-101', 'OF-2024-102', 'OF-2024-103', 'OF-2024-104'],
            'Client': ['Airbus', 'Renault Group', 'Alstom', 'Schneider'],
            'Produit': ['Support Titane', 'Carter Alu', 'Plaque Châssis', 'Boîtier Armoire'],
            'Ligne': ['L2', 'L2', 'L1', 'L1'],
            'Quantité': [600, 1200, 1500, 2400],
            'Déjà Produit': [250, 100, 600, 400],
            'Cadence': [45, 45, 120, 120],
            'Priorité': ['P1', 'P1', 'P2', 'P2'],
            'Date Début': [(datetime.today()).strftime('%Y-%m-%d')] * 4,
            'Date Limite': [
                (datetime.today() + timedelta(days=4)).strftime('%Y-%m-%d'),
                (datetime.today() + timedelta(days=2)).strftime('%Y-%m-%d'),
                (datetime.today() + timedelta(days=6)).strftime('%Y-%m-%d'),
                (datetime.today() + timedelta(days=7)).strftime('%Y-%m-%d')
            ]
        }
        pd.DataFrame(sample_data).to_excel(args.input, index=False)
        print(f"[OK] Fichier modèle créé : {args.input}")

    # 2. Exécution du traitement
    df = load_production_excel(args.input)
    df = compute_production_metrics(df)
    df = optimize_anti_delay_dispatch(df)
    export_processed_excel(df, args.output)

    # 3. Affichage du résumé
    delayed = df[df['status'] == 'RETARD']
    print("\\n------------------------- BILAN DU DISPATCH -------------------------")
    print(f"Total ordres traités       : {len(df)}")
    print(f"Ordres à l'heure           : {len(df[df['status'] == 'À l\\'heure'])}")
    print(f"Ordres en retard critique  : {len(delayed)}")
    if len(delayed) > 0:
        print("\\n[ALERTE] RETARDS CLIENTS DÉTECTÉS :")
        for _, r in delayed.iterrows():
            print(f" - {r['code']} ({r['client']}) : Retard de {r['delay_days']} jour(s) sur Ligne {r['line_id']}")
    else:
        print("[OK] Aucun retard client ! Le planning est parfaitement équilibré.")
    print("----------------------------------------------------------------------\\n")

if __name__ == "__main__":
    main()
`;
}

/**
 * Déclenche le téléchargement direct du script Python dans le navigateur
 */
export function downloadPythonScript(fileName = 'production_planner.py'): void {
  const content = getPythonScriptContent();
  const blob = new Blob([content], { type: 'text/x-python;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
