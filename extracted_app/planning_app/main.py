# -*- coding: utf-8 -*-
"""
main.py — Point d'entrée de l'application Macro-Planning Broderie.

Lancement :
    python main.py

Aucune connexion internet n'est nécessaire pour utiliser l'application.
Toutes les données sont stockées localement dans le fichier planning.db
(créé automatiquement au premier lancement à côté de ce fichier).
"""

import sys

try:
    import tkinter  # noqa: F401
except ImportError:
    print("ERREUR : le module 'tkinter' n'est pas installé.\n"
          "- Windows/Mac : réinstallez Python depuis python.org en cochant 'tcl/tk'.\n"
          "- Linux (Debian/Ubuntu) : sudo apt-get install python3-tk")
    sys.exit(1)

import db
import gui


def main():
    db.init_db()
    app = gui.App()
    app.mainloop()


if __name__ == "__main__":
    main()
