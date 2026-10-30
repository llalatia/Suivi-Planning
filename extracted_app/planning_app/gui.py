# -*- coding: utf-8 -*-
"""
gui.py — Interface graphique (Tkinter) de l'outil de Macro-Planning Broderie.

100% hors-ligne : aucune connexion réseau n'est utilisée.
"""

import tkinter as tk
from tkinter import ttk, messagebox, filedialog, simpledialog
import datetime

import db
import logic
import excel_import
import excel_export

APP_TITLE = "Macro-Planning Broderie — Gestion hors-ligne"

COLOR_OK = "#FFFFFF"
COLOR_RETARD = "#FFC7CE"
COLOR_TERMINE = "#C6EFCE"
COLOR_TBC = "#FFF2CC"
COLOR_COURANTE = "#FFFACD"
COLOR_LANCEMENT = "#FFD9A0"
COLOR_LIMITE = "#FF9999"


def fmt(v, decimals=2):
    if v is None:
        return ""
    if isinstance(v, float):
        if v == int(v):
            return str(int(v))
        return f"{v:.{decimals}f}"
    return str(v)


# =========================================================================
# Boîte de dialogue : Ajouter / Modifier une commande
# =========================================================================
class CommandeDialog(tk.Toplevel):
    def __init__(self, parent, commande=None):
        super().__init__(parent)
        self.title("Commande" if commande is None else "Modifier la commande")
        self.resizable(False, False)
        self.result = None
        self.commande = commande

        fields = [
            ("client", "Client *"),
            ("modele", "Modèle *"),
            ("qte_commande", "Qté en commande *"),
            ("unite", "Unité"),
            ("heure_pcs", "Heure / pcs (laisser vide si TBC)"),
            ("qte_finie", "Qté finie"),
            ("date_limite_client", "Date limite client (AAAA-MM-JJ)"),
            ("date_lancement", "Date de lancement (AAAA-MM-JJ)"),
            ("notes", "Notes"),
        ]
        self.vars = {}
        frm = ttk.Frame(self, padding=15)
        frm.grid(row=0, column=0)

        for i, (key, label) in enumerate(fields):
            ttk.Label(frm, text=label).grid(row=i, column=0, sticky="w", pady=3)
            var = tk.StringVar()
            ent = ttk.Entry(frm, textvariable=var, width=40)
            ent.grid(row=i, column=1, pady=3, padx=(8, 0))
            self.vars[key] = var

        self.tbc_var = tk.BooleanVar()
        ttk.Checkbutton(frm, text="Heure/pcs = TBC (à confirmer)",
                         variable=self.tbc_var).grid(row=len(fields), column=1, sticky="w")

        if commande:
            c = dict(commande)
            self.vars["client"].set(c.get("client") or "")
            self.vars["modele"].set(c.get("modele") or "")
            self.vars["qte_commande"].set(fmt(c.get("qte_commande")))
            self.vars["unite"].set(c.get("unite") or "PCS")
            self.vars["heure_pcs"].set(fmt(c.get("heure_pcs")) if not c.get("heure_pcs_tbc") else "")
            self.vars["qte_finie"].set(fmt(c.get("qte_finie")))
            self.vars["date_limite_client"].set(c.get("date_limite_client") or "")
            self.vars["date_lancement"].set(c.get("date_lancement") or "")
            self.vars["notes"].set(c.get("notes") or "")
            self.tbc_var.set(bool(c.get("heure_pcs_tbc")))
        else:
            self.vars["unite"].set("PCS")
            self.vars["qte_finie"].set("0")

        btns = ttk.Frame(frm)
        btns.grid(row=len(fields) + 1, column=0, columnspan=2, pady=(15, 0))
        ttk.Button(btns, text="Annuler", command=self.destroy).pack(side="right", padx=5)
        ttk.Button(btns, text="Enregistrer", command=self._on_save).pack(side="right")

        self.transient(parent)
        self.grab_set()
        self.wait_window(self)

    def _on_save(self):
        try:
            client = self.vars["client"].get().strip()
            modele = self.vars["modele"].get().strip()
            if not client or not modele:
                messagebox.showerror("Champs requis", "Client et Modèle sont obligatoires.", parent=self)
                return
            qte_commande = float(self.vars["qte_commande"].get().replace(",", ".") or 0)
            qte_finie = float(self.vars["qte_finie"].get().replace(",", ".") or 0)
            heure_raw = self.vars["heure_pcs"].get().strip()
            tbc = self.tbc_var.get() or (heure_raw == "")
            heure_pcs = None
            if not tbc and heure_raw:
                heure_pcs = float(heure_raw.replace(",", "."))

            def clean_date(s):
                s = s.strip()
                if not s:
                    return None
                datetime.datetime.strptime(s, "%Y-%m-%d")  # validation
                return s

            data = {
                "client": client,
                "modele": modele,
                "qte_commande": qte_commande,
                "unite": self.vars["unite"].get().strip() or "PCS",
                "heure_pcs": heure_pcs,
                "heure_pcs_tbc": 1 if tbc else 0,
                "qte_finie": qte_finie,
                "date_limite_client": clean_date(self.vars["date_limite_client"].get()),
                "date_lancement": clean_date(self.vars["date_lancement"].get()),
                "notes": self.vars["notes"].get().strip() or None,
            }
        except ValueError as e:
            messagebox.showerror("Valeur invalide",
                                  f"Vérifiez les champs numériques / dates.\n({e})", parent=self)
            return

        self.result = data
        self.destroy()


# =========================================================================
# Onglet : Commandes
# =========================================================================
class OngletCommandes(ttk.Frame):
    def __init__(self, parent, app):
        super().__init__(parent)
        self.app = app
        self._build()
        self.refresh()

    def _build(self):
        toolbar = ttk.Frame(self)
        toolbar.pack(fill="x", padx=8, pady=8)
        ttk.Button(toolbar, text="+ Ajouter", command=self.on_add).pack(side="left")
        ttk.Button(toolbar, text="Modifier", command=self.on_edit).pack(side="left", padx=5)
        ttk.Button(toolbar, text="Dupliquer", command=self.on_duplicate).pack(side="left")
        ttk.Button(toolbar, text="Supprimer", command=self.on_delete).pack(side="left", padx=5)
        ttk.Button(toolbar, text="Planifier ➜", command=self.on_plan).pack(side="left", padx=15)

        ttk.Label(toolbar, text="Filtrer client :").pack(side="left", padx=(30, 4))
        self.filter_var = tk.StringVar()
        ent = ttk.Entry(toolbar, textvariable=self.filter_var, width=20)
        ent.pack(side="left")
        ent.bind("<KeyRelease>", lambda e: self.refresh())

        cols = ("client", "modele", "qte_commande", "unite", "heure_pcs",
                "qte_finie", "reste", "programme", "ecart", "statut")
        headers = ["Client", "Modèle", "Qté commande", "Unité", "Heure/pcs",
                   "Qté finie", "Reste à faire", "Total programmé", "Écart", "Statut"]
        self.tree = ttk.Treeview(self, columns=cols, show="headings", selectmode="browse")
        for c, h in zip(cols, headers):
            self.tree.heading(c, text=h)
            width = 200 if c in ("client", "modele") else 110
            self.tree.column(c, width=width, anchor="center" if c not in ("client", "modele") else "w")
        self.tree.pack(fill="both", expand=True, padx=8, pady=(0, 8))
        self.tree.bind("<Double-1>", lambda e: self.on_plan())

        vsb = ttk.Scrollbar(self.tree, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=vsb.set)

        self.tree.tag_configure("retard", background=COLOR_RETARD)
        self.tree.tag_configure("termine", background=COLOR_TERMINE)
        self.tree.tag_configure("tbc", background=COLOR_TBC)

    def refresh(self):
        self.tree.delete(*self.tree.get_children())
        filt = self.filter_var.get().strip().lower()
        for c in db.list_commandes():
            c = dict(c)
            if filt and filt not in c["client"].lower() and filt not in c["modele"].lower():
                continue
            reste = logic.qte_reste_a_faire(c["qte_commande"], c["qte_finie"])
            total_prog = db.total_pieces_commande(c["id"])
            ecart = round((total_prog or 0) - (reste or 0), 2)
            statut = logic.statut_commande(c["qte_commande"], c["qte_finie"], total_prog)
            tag = ""
            if statut == "termine":
                tag = "termine"
            elif statut == "sous_planifie":
                tag = "retard"
            elif c["heure_pcs_tbc"]:
                tag = "tbc"

            statut_label = {"ok": "OK", "termine": "Terminé",
                             "sous_planifie": "⚠ Sous-planifié"}[statut]
            heure_display = "TBC" if c["heure_pcs_tbc"] else fmt(c["heure_pcs"])

            self.tree.insert("", "end", iid=str(c["id"]), values=(
                c["client"], c["modele"], fmt(c["qte_commande"]), c["unite"],
                heure_display, fmt(c["qte_finie"]), fmt(reste), fmt(total_prog),
                fmt(ecart), statut_label,
            ), tags=(tag,))

    def _selected_id(self):
        sel = self.tree.selection()
        if not sel:
            messagebox.showinfo("Sélection", "Sélectionnez d'abord une commande.")
            return None
        return int(sel[0])

    def on_add(self):
        dlg = CommandeDialog(self)
        if dlg.result:
            db.add_commande(dlg.result)
            self.refresh()
            self.app.refresh_all()

    def on_edit(self):
        cid = self._selected_id()
        if cid is None:
            return
        commande = db.get_commande(cid)
        dlg = CommandeDialog(self, commande=commande)
        if dlg.result:
            db.update_commande(cid, dlg.result)
            self.refresh()
            self.app.refresh_all()

    def on_duplicate(self):
        cid = self._selected_id()
        if cid is None:
            return
        c = dict(db.get_commande(cid))
        c.pop("id")
        c["modele"] = c["modele"] + " (copie)"
        db.add_commande(c)
        self.refresh()
        self.app.refresh_all()

    def on_delete(self):
        cid = self._selected_id()
        if cid is None:
            return
        if messagebox.askyesno("Confirmer", "Supprimer définitivement cette commande "
                                             "et son planning associé ?"):
            db.delete_commande(cid)
            self.refresh()
            self.app.refresh_all()

    def on_plan(self):
        cid = self._selected_id()
        if cid is None:
            return
        self.app.open_plan_for_commande(cid)


# =========================================================================
# Onglet : Vue Semaine (édition pivot par semaine)
# =========================================================================
class OngletVueSemaine(ttk.Frame):
    def __init__(self, parent, app):
        super().__init__(parent)
        self.app = app
        self._build()
        self.refresh()

    def _build(self):
        toolbar = ttk.Frame(self)
        toolbar.pack(fill="x", padx=8, pady=8)
        ttk.Label(toolbar, text="Semaine :").pack(side="left")
        self.semaine_var = tk.StringVar()
        self.combo = ttk.Combobox(toolbar, textvariable=self.semaine_var, state="readonly", width=25)
        self.combo.pack(side="left", padx=6)
        self.combo.bind("<<ComboboxSelected>>", lambda e: self.load_semaine())
        ttk.Button(toolbar, text="Définir comme semaine en cours",
                   command=self.set_as_current).pack(side="left", padx=15)
        self.lbl_courante = ttk.Label(toolbar, text="", foreground="#996600")
        self.lbl_courante.pack(side="left", padx=10)

        cols = ("client", "modele", "heure_pcs", "pieces", "heures", "brodeuses", "statut")
        headers = ["Client", "Modèle", "Heure/pcs", "Nb pièces (éditable)",
                   "Nb heures", "Nb brodeuses", "Statut cellule"]
        self.tree = ttk.Treeview(self, columns=cols, show="headings", selectmode="browse")
        for c, h in zip(cols, headers):
            self.tree.heading(c, text=h)
            self.tree.column(c, width=150 if c in ("client", "modele") else 110,
                              anchor="w" if c in ("client", "modele") else "center")
        self.tree.pack(fill="both", expand=True, padx=8, pady=8)
        self.tree.bind("<Double-1>", self.on_double_click)

        footer = ttk.Frame(self)
        footer.pack(fill="x", padx=8, pady=(0, 8))
        self.lbl_totaux = ttk.Label(footer, text="", font=("Calibri", 10, "bold"))
        self.lbl_totaux.pack(side="left")

        help_lbl = ttk.Label(self, foreground="#666666",
                              text="Double-cliquez sur 'Nb pièces' pour saisir la production planifiée. "
                                   "Double-cliquez sur 'Statut cellule' pour marquer "
                                   "Lancement / Limite client.")
        help_lbl.pack(anchor="w", padx=8, pady=(0, 6))

        self.tree.tag_configure("lancement", background=COLOR_LANCEMENT)
        self.tree.tag_configure("limite_client", background=COLOR_LIMITE)
        self.tree.tag_configure("tbc", background=COLOR_TBC)

    def refresh(self):
        semaines = db.list_semaines()
        codes = [s["code"] for s in semaines]
        self.combo["values"] = codes
        if codes and self.semaine_var.get() not in codes:
            courante = db.get_config("semaine_courante")
            self.semaine_var.set(courante if courante in codes else codes[0])
        self.load_semaine()

    def load_semaine(self):
        self.tree.delete(*self.tree.get_children())
        code = self.semaine_var.get()
        if not code:
            return
        sem = db.get_semaine_by_code(code)
        if not sem:
            return
        courante = db.get_config("semaine_courante")
        self.lbl_courante.config(
            text="★ Semaine en cours" if code == courante else "")

        planning = db.planning_for_semaine(sem["id"])
        total_pieces = 0
        total_heures = 0
        for c in db.list_commandes():
            c = dict(c)
            p = planning.get(c["id"])
            pieces = p["nb_pieces"] if p else None
            statut = p["statut"] if p else "normal"
            heures = None
            if not c["heure_pcs_tbc"]:
                heures = logic.nb_heures(pieces or 0, c["heure_pcs"])
            brodeuses = logic.nb_brodeuses(heures) if heures is not None else None

            if pieces:
                total_pieces += pieces
                if heures:
                    total_heures += heures

            tag = ""
            if statut == "lancement":
                tag = "lancement"
            elif statut == "limite_client":
                tag = "limite_client"
            elif c["heure_pcs_tbc"]:
                tag = "tbc"

            statut_label = {"normal": "", "lancement": "Lancement",
                             "limite_client": "Limite client"}.get(statut, "")

            self.tree.insert("", "end", iid=f"{c['id']}", values=(
                c["client"], c["modele"],
                "TBC" if c["heure_pcs_tbc"] else fmt(c["heure_pcs"]),
                fmt(pieces) if pieces else "",
                fmt(heures) if heures else "",
                fmt(brodeuses) if brodeuses else "",
                statut_label,
            ), tags=(tag,))

        total_brodeuses = logic.nb_brodeuses(total_heures)
        self.lbl_totaux.config(
            text=f"TOTAUX {code} — Pièces : {fmt(total_pieces)}   |   "
                 f"Heures : {fmt(round(total_heures, 2))}   |   "
                 f"Brodeuses nécessaires : {fmt(total_brodeuses)}"
        )

    def on_double_click(self, event):
        item = self.tree.identify_row(event.y)
        col = self.tree.identify_column(event.x)
        if not item:
            return
        commande_id = int(item)
        sem = db.get_semaine_by_code(self.semaine_var.get())
        if not sem:
            return

        if col == "#4":  # Nb pièces
            self._edit_pieces(commande_id, sem["id"])
        elif col == "#7":  # Statut cellule
            self._edit_statut(commande_id, sem["id"])

    def _edit_pieces(self, commande_id, semaine_id):
        current = db.get_pieces(commande_id, semaine_id)
        val = simpledialog.askstring(
            "Nb pièces",
            "Nombre de pièces prévues cette semaine :",
            initialvalue=fmt(current["nb_pieces"]) if current else "0",
            parent=self,
        )
        if val is None:
            return
        try:
            nb = float(val.replace(",", "."))
        except ValueError:
            messagebox.showerror("Valeur invalide", "Entrez un nombre.", parent=self)
            return
        db.set_pieces(commande_id, semaine_id, nb)
        self.load_semaine()
        self.app.refresh_all(skip=self)

    def _edit_statut(self, commande_id, semaine_id):
        win = tk.Toplevel(self)
        win.title("Statut de la cellule")
        win.resizable(False, False)
        ttk.Label(win, text="Choisir le statut :").pack(padx=15, pady=(15, 5))
        choix = tk.StringVar(value="normal")
        for val, label in [("normal", "Normal"), ("lancement", "Semaine de lancement"),
                            ("limite_client", "Limite livraison client")]:
            ttk.Radiobutton(win, text=label, variable=choix, value=val).pack(anchor="w", padx=25)

        def valider():
            db.set_statut(commande_id, semaine_id, choix.get())
            win.destroy()
            self.load_semaine()

        ttk.Button(win, text="Valider", command=valider).pack(pady=10)
        win.transient(self)
        win.grab_set()

    def set_as_current(self):
        code = self.semaine_var.get()
        if code:
            db.set_config("semaine_courante", code)
            self.app.refresh_all()


# =========================================================================
# Onglet : Vue Commande (planning détaillé multi-semaines pour 1 commande)
# =========================================================================
class OngletVueCommande(ttk.Frame):
    def __init__(self, parent, app):
        super().__init__(parent)
        self.app = app
        self.current_commande_id = None
        self._build()

    def _build(self):
        top = ttk.Frame(self)
        top.pack(fill="x", padx=8, pady=8)
        ttk.Label(top, text="Commande :").pack(side="left")
        self.combo_var = tk.StringVar()
        self.combo = ttk.Combobox(top, textvariable=self.combo_var, state="readonly", width=60)
        self.combo.pack(side="left", padx=6)
        self.combo.bind("<<ComboboxSelected>>", lambda e: self.load_commande())

        self.info_lbl = ttk.Label(self, text="", font=("Calibri", 10, "bold"))
        self.info_lbl.pack(anchor="w", padx=8)

        cols = ("semaine", "date", "pieces", "heures", "brodeuses", "statut")
        headers = ["Semaine", "Date", "Nb pièces (éditable)", "Nb heures",
                   "Nb brodeuses", "Statut"]
        self.tree = ttk.Treeview(self, columns=cols, show="headings", selectmode="browse")
        for c, h in zip(cols, headers):
            self.tree.heading(c, text=h)
            self.tree.column(c, width=130, anchor="center")
        self.tree.pack(fill="both", expand=True, padx=8, pady=8)
        self.tree.bind("<Double-1>", self.on_double_click)

        self.tree.tag_configure("lancement", background=COLOR_LANCEMENT)
        self.tree.tag_configure("limite_client", background=COLOR_LIMITE)
        self.tree.tag_configure("courante", background=COLOR_COURANTE)

        help_lbl = ttk.Label(self, foreground="#666666",
                              text="Double-cliquez sur 'Nb pièces' pour éditer, "
                                   "ou sur 'Statut' pour marquer Lancement / Limite client.")
        help_lbl.pack(anchor="w", padx=8, pady=(0, 6))

    def refresh(self):
        commandes = db.list_commandes()
        self._map = {f'{c["client"]} — {c["modele"]} (#{c["id"]})': c["id"] for c in commandes}
        self.combo["values"] = list(self._map.keys())
        if self.current_commande_id:
            for label, cid in self._map.items():
                if cid == self.current_commande_id:
                    self.combo_var.set(label)
                    break
        self.load_commande()

    def select_commande(self, commande_id):
        self.current_commande_id = commande_id
        self.refresh()

    def load_commande(self):
        label = self.combo_var.get()
        cid = self._map.get(label) if hasattr(self, "_map") else None
        if cid is None:
            self.tree.delete(*self.tree.get_children())
            self.info_lbl.config(text="")
            return
        self.current_commande_id = cid
        c = dict(db.get_commande(cid))
        reste = logic.qte_reste_a_faire(c["qte_commande"], c["qte_finie"])
        total_prog = db.total_pieces_commande(cid)
        statut = logic.statut_commande(c["qte_commande"], c["qte_finie"], total_prog)
        statut_txt = {"ok": "OK", "termine": "Terminé ✅",
                      "sous_planifie": "⚠ SOUS-PLANIFIÉ (planning insuffisant)"}[statut]
        heure_txt = "TBC (à confirmer)" if c["heure_pcs_tbc"] else f"{fmt(c['heure_pcs'])} h/pièce"

        self.info_lbl.config(
            text=f"Qté commande : {fmt(c['qte_commande'])} {c['unite']}   |   "
                 f"Qté finie : {fmt(c['qte_finie'])}   |   Reste à faire : {fmt(reste)}   |   "
                 f"{heure_txt}   |   Total programmé : {fmt(total_prog)}   |   Statut : {statut_txt}"
        )

        self.tree.delete(*self.tree.get_children())
        planning = db.planning_for_commande(cid)
        courante = db.get_config("semaine_courante")
        for s in db.list_semaines():
            p = planning.get(s["id"])
            pieces = p["nb_pieces"] if p else None
            statut_cell = p["statut"] if p else "normal"
            heures = logic.nb_heures(pieces or 0, c["heure_pcs"]) if not c["heure_pcs_tbc"] else None
            brodeuses = logic.nb_brodeuses(heures) if heures is not None else None

            tag = ""
            if statut_cell == "lancement":
                tag = "lancement"
            elif statut_cell == "limite_client":
                tag = "limite_client"
            elif s["code"] == courante:
                tag = "courante"

            statut_label = {"normal": "", "lancement": "Lancement",
                             "limite_client": "Limite client"}.get(statut_cell, "")

            self.tree.insert("", "end", iid=str(s["id"]), values=(
                s["code"], s["date_debut"], fmt(pieces) if pieces else "",
                fmt(heures) if heures else "", fmt(brodeuses) if brodeuses else "",
                statut_label,
            ), tags=(tag,))

    def on_double_click(self, event):
        item = self.tree.identify_row(event.y)
        col = self.tree.identify_column(event.x)
        if not item or self.current_commande_id is None:
            return
        semaine_id = int(item)
        if col == "#3":
            current = db.get_pieces(self.current_commande_id, semaine_id)
            val = simpledialog.askstring(
                "Nb pièces", "Nombre de pièces prévues :",
                initialvalue=fmt(current["nb_pieces"]) if current else "0", parent=self)
            if val is None:
                return
            try:
                nb = float(val.replace(",", "."))
            except ValueError:
                messagebox.showerror("Valeur invalide", "Entrez un nombre.", parent=self)
                return
            db.set_pieces(self.current_commande_id, semaine_id, nb)
            self.load_commande()
            self.app.refresh_all(skip=self)
        elif col == "#6":
            win = tk.Toplevel(self)
            win.title("Statut")
            win.resizable(False, False)
            ttk.Label(win, text="Choisir le statut :").pack(padx=15, pady=(15, 5))
            choix = tk.StringVar(value="normal")
            for val, label in [("normal", "Normal"), ("lancement", "Semaine de lancement"),
                                ("limite_client", "Limite livraison client")]:
                ttk.Radiobutton(win, text=label, variable=choix, value=val).pack(anchor="w", padx=25)

            def valider():
                db.set_statut(self.current_commande_id, semaine_id, choix.get())
                win.destroy()
                self.load_commande()

            ttk.Button(win, text="Valider", command=valider).pack(pady=10)
            win.transient(self)
            win.grab_set()


# =========================================================================
# Onglet : Résumé / Dashboard
# =========================================================================
class OngletResume(ttk.Frame):
    def __init__(self, parent, app):
        super().__init__(parent)
        self.app = app
        self._build()

    def _build(self):
        ttk.Label(self, text="Charge de travail par semaine", font=("Calibri", 11, "bold")).pack(
            anchor="w", padx=8, pady=(8, 4))
        cols = ("semaine", "date", "pieces", "heures", "brodeuses")
        headers = ["Semaine", "Date", "Total pièces", "Total heures", "Brodeuses nécessaires"]
        self.tree_semaines = ttk.Treeview(self, columns=cols, show="headings", height=10)
        for c, h in zip(cols, headers):
            self.tree_semaines.heading(c, text=h)
            self.tree_semaines.column(c, width=140, anchor="center")
        self.tree_semaines.pack(fill="x", padx=8, pady=(0, 10))
        self.tree_semaines.tag_configure("courante", background=COLOR_COURANTE)

        ttk.Label(self, text="Commandes à surveiller (sous-planifiées ou TBC)",
                  font=("Calibri", 11, "bold")).pack(anchor="w", padx=8, pady=(8, 4))
        cols2 = ("client", "modele", "reste", "programme", "manque", "heure_pcs")
        headers2 = ["Client", "Modèle", "Reste à faire", "Programmé", "Manquant", "Heure/pcs"]
        self.tree_alertes = ttk.Treeview(self, columns=cols2, show="headings", height=12)
        for c, h in zip(cols2, headers2):
            self.tree_alertes.heading(c, text=h)
            self.tree_alertes.column(c, width=150 if c in ("client", "modele") else 110,
                                      anchor="w" if c in ("client", "modele") else "center")
        self.tree_alertes.pack(fill="both", expand=True, padx=8, pady=(0, 8))
        self.tree_alertes.tag_configure("retard", background=COLOR_RETARD)
        self.tree_alertes.tag_configure("tbc", background=COLOR_TBC)

    def refresh(self):
        self.tree_semaines.delete(*self.tree_semaines.get_children())
        courante = db.get_config("semaine_courante")
        for s in db.list_semaines():
            planning = db.planning_for_semaine(s["id"])
            total_pieces = 0
            total_heures = 0
            for c in db.list_commandes():
                c = dict(c)
                p = planning.get(c["id"])
                if not p or not p["nb_pieces"]:
                    continue
                total_pieces += p["nb_pieces"]
                if not c["heure_pcs_tbc"] and c["heure_pcs"]:
                    total_heures += p["nb_pieces"] * c["heure_pcs"]
            total_brodeuses = logic.nb_brodeuses(total_heures)
            tag = "courante" if s["code"] == courante else ""
            self.tree_semaines.insert("", "end", values=(
                s["code"], s["date_debut"], fmt(total_pieces),
                fmt(round(total_heures, 2)), fmt(total_brodeuses)), tags=(tag,))

        self.tree_alertes.delete(*self.tree_alertes.get_children())
        for c in db.list_commandes():
            c = dict(c)
            reste = logic.qte_reste_a_faire(c["qte_commande"], c["qte_finie"])
            total_prog = db.total_pieces_commande(c["id"])
            statut = logic.statut_commande(c["qte_commande"], c["qte_finie"], total_prog)
            if statut == "sous_planifie" or c["heure_pcs_tbc"]:
                manquant = round((reste or 0) - (total_prog or 0), 2)
                tag = "retard" if statut == "sous_planifie" else "tbc"
                self.tree_alertes.insert("", "end", values=(
                    c["client"], c["modele"], fmt(reste), fmt(total_prog),
                    fmt(manquant) if manquant > 0 else "-",
                    "TBC" if c["heure_pcs_tbc"] else fmt(c["heure_pcs"]),
                ), tags=(tag,))


# =========================================================================
# Application principale
# =========================================================================
class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title(APP_TITLE)
        self.geometry("1250x700")

        db.init_db()

        self._build_menu()

        self.notebook = ttk.Notebook(self)
        self.notebook.pack(fill="both", expand=True)

        self.tab_commandes = OngletCommandes(self.notebook, self)
        self.tab_semaine = OngletVueSemaine(self.notebook, self)
        self.tab_commande_detail = OngletVueCommande(self.notebook, self)
        self.tab_resume = OngletResume(self.notebook, self)

        self.notebook.add(self.tab_commandes, text="  Commandes  ")
        self.notebook.add(self.tab_semaine, text="  Vue par semaine  ")
        self.notebook.add(self.tab_commande_detail, text="  Vue par commande  ")
        self.notebook.add(self.tab_resume, text="  Résumé / Alertes  ")

        self.notebook.bind("<<NotebookTabChanged>>", lambda e: self.refresh_all())

        self.tab_commande_detail.refresh()
        self.tab_resume.refresh()

    def _build_menu(self):
        menubar = tk.Menu(self)

        m_fichier = tk.Menu(menubar, tearoff=0)
        m_fichier.add_command(label="Importer un fichier Excel existant…",
                               command=self.on_import_excel)
        m_fichier.add_command(label="Exporter le planning en Excel…",
                               command=self.on_export_excel)
        m_fichier.add_separator()
        m_fichier.add_command(label="Quitter", command=self.destroy)
        menubar.add_cascade(label="Fichier", menu=m_fichier)

        m_semaines = tk.Menu(menubar, tearoff=0)
        m_semaines.add_command(label="Ajouter une semaine…", command=self.on_add_semaine)
        menubar.add_cascade(label="Semaines", menu=m_semaines)

        m_aide = tk.Menu(menubar, tearoff=0)
        m_aide.add_command(label="À propos", command=self.on_about)
        menubar.add_cascade(label="Aide", menu=m_aide)

        self.config(menu=menubar)

    def refresh_all(self, skip=None):
        if skip is not self.tab_commandes:
            self.tab_commandes.refresh()
        if skip is not self.tab_semaine:
            self.tab_semaine.refresh()
        if skip is not self.tab_commande_detail:
            self.tab_commande_detail.refresh()
        if skip is not self.tab_resume:
            self.tab_resume.refresh()

    def open_plan_for_commande(self, commande_id):
        self.tab_commande_detail.select_commande(commande_id)
        self.notebook.select(self.tab_commande_detail)

    def on_import_excel(self):
        path = filedialog.askopenfilename(
            title="Choisir le fichier Excel à importer",
            filetypes=[("Fichiers Excel", "*.xlsx")])
        if not path:
            return
        if not messagebox.askyesno(
                "Confirmer l'import",
                "L'import va AJOUTER les commandes et semaines du fichier choisi "
                "à la base actuelle (les commandes existantes ne sont pas supprimées).\n\n"
                "Continuer ?"):
            return
        try:
            resume = excel_import.import_xlsx(path)
        except Exception as e:
            messagebox.showerror("Erreur d'import", str(e))
            return
        messagebox.showinfo(
            "Import terminé",
            f"{resume['commandes_importees']} commande(s) et "
            f"{resume['semaines_importees']} semaine(s) importées "
            f"({resume['lignes_planning_importees']} lignes de planning).")
        self.refresh_all()

    def on_export_excel(self):
        code_courante = db.get_config("semaine_courante")
        path = filedialog.asksaveasfilename(
            title="Enregistrer le planning au format Excel",
            defaultextension=".xlsx",
            initialfile=f"MACRO-PLANNING_BROD_TRADI_{code_courante or ''}.xlsx",
            filetypes=[("Fichiers Excel", "*.xlsx")])
        if not path:
            return
        try:
            excel_export.export_xlsx(path, semaine_courante_code=code_courante)
        except Exception as e:
            messagebox.showerror("Erreur d'export", str(e))
            return
        messagebox.showinfo("Export terminé", f"Fichier enregistré :\n{path}")

    def on_add_semaine(self):
        code = simpledialog.askstring("Nouvelle semaine", "Code semaine (ex: S52) :", parent=self)
        if not code:
            return
        date_str = simpledialog.askstring(
            "Nouvelle semaine", "Date de début (lundi, AAAA-MM-JJ) :", parent=self)
        if not date_str:
            return
        try:
            datetime.datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            messagebox.showerror("Date invalide", "Format attendu : AAAA-MM-JJ")
            return
        db.add_semaine(code.strip(), date_str.strip())
        self.refresh_all()

    def on_about(self):
        messagebox.showinfo(
            "À propos",
            f"{APP_TITLE}\n\n"
            "Outil 100% hors-ligne de gestion du macro-planning de broderie.\n"
            "Toutes les données sont stockées localement (planning.db).\n\n"
            "Développé sur mesure à partir du fichier "
            "MACRO-PLANNING_BROD_TRADI.xlsx.")


def main():
    app = App()
    app.mainloop()


if __name__ == "__main__":
    main()
