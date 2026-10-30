# Macro-Planning Broderie — Outil hors-ligne

Application de bureau (Python + interface graphique Tkinter) pour gérer le
macro-planning de production broderie, à partir du fichier
`MACRO-PLANNING_BROD_TRADI_S34.xlsx`.

**100 % hors-ligne** : aucune donnée n'est envoyée sur internet. Tout est
stocké localement dans un fichier `planning.db` (base SQLite) à côté du
programme.

---

## 1. Installation

Prérequis : **Python 3.9 ou supérieur** (Windows, Mac ou Linux).

1. Vérifiez que Python est installé :
   ```
   python --version
   ```
   (sous Mac/Linux, utilisez parfois `python3` à la place de `python`)

2. Installez la seule dépendance externe (`openpyxl`, pour lire/écrire les
   fichiers Excel) :
   ```
   pip install -r requirements.txt
   ```
   ou directement :
   ```
   pip install openpyxl
   ```

   > `tkinter` (l'interface graphique) est fourni avec Python sur
   > Windows/Mac. Sous Linux (Ubuntu/Debian), si l'application ne démarre
   > pas, installez-le avec : `sudo apt-get install python3-tk`

3. Le dossier contient déjà une base **`planning.db` pré-remplie** avec les
   données du fichier `MACRO-PLANNING_BROD_TRADI_S34.xlsx` que vous avez
   fourni (44 commandes, 23 semaines S29 à S51, semaine courante = S34).

## 2. Lancement

```
python main.py
```

Une fenêtre s'ouvre avec 4 onglets.

## 3. Les 4 onglets

### 🟦 Commandes
Liste de toutes les commandes (client, modèle, quantités, heure/pièce...).
- **+ Ajouter** : créer une nouvelle commande.
- **Modifier** : éditer les infos d'une commande sélectionnée.
- **Dupliquer** : copier une commande (pratique pour un nouveau coloris).
- **Supprimer** : retirer une commande et tout son planning.
- **Planifier ➜** (ou double-clic) : ouvre la vue détaillée
  semaine-par-semaine de cette commande.
- Une ligne **rose** = commande sous-planifiée (le planning actuel ne
  couvre pas le reste à faire). Une ligne **verte** = commande terminée.
  Une ligne **jaune pâle** = heure/pièce non confirmée (TBC).

### 🟩 Vue par semaine
Sélectionnez une semaine (ex. S34) dans le menu déroulant : vous voyez
toutes les commandes avec leur **nombre de pièces prévues cette semaine**
(double-cliquez pour éditer), le nombre d'heures et de brodeuses nécessaires
calculés automatiquement. Les totaux de la semaine s'affichent en bas.
- **Définir comme semaine en cours** : marque cette semaine comme la
  semaine active (surbrillance jaune, utilisée aussi à l'export Excel).
- Double-cliquez sur **Statut cellule** pour marquer une case comme
  "Semaine de lancement" (orange) ou "Limite livraison client" (rouge),
  comme dans le fichier Excel d'origine.

### 🟨 Vue par commande
Sélectionnez une commande : vous voyez tout son planning sur les 23
semaines (ou plus), avec les mêmes possibilités d'édition et de statut.
Pratique pour étaler la production d'un modèle sur plusieurs semaines.

### 🟥 Résumé / Alertes
- Tableau de charge : total pièces / heures / brodeuses nécessaires,
  semaine par semaine (pour anticiper les besoins en personnel).
- Liste des commandes à surveiller : sous-planifiées (retard potentiel)
  ou avec une heure/pièce encore "TBC" à confirmer.

## 4. Calculs automatiques (identiques au fichier Excel d'origine)

- **Qté reste à faire** = Qté en commande − Qté finie
- **Nb heures (semaine)** = Nb pièces prévues × Heure/pièce
- **Nb brodeuses nécessaires** = Nb heures ÷ 40 (base 40h/semaine/brodeuse)
- **Total programmé** = somme des pièces prévues sur toutes les semaines
- Une commande est **sous-planifiée** si le total programmé est inférieur
  au reste à faire.

## 5. Import / Export Excel

Menu **Fichier** :
- **Importer un fichier Excel existant…** : relit un fichier au même
  format que `MACRO-PLANNING_BROD_TRADI_Sxx.xlsx` et **ajoute** ses
  commandes/semaines à la base actuelle (rien n'est écrasé).
- **Exporter le planning en Excel…** : régénère un fichier `.xlsx` avec
  la même mise en page que l'original (dates, semaines, couleurs légende)
  à partir des données actuelles de l'application — pratique pour
  partager un planning à jour par e-mail ou l'imprimer.

  > Note : contrairement au fichier Excel d'origine, l'export contient des
  > **valeurs déjà calculées** (pas de formules Excel), car tous les calculs
  > sont faits par l'application elle-même. Si vous modifiez une valeur dans
  > le fichier exporté, elle ne se recalculera pas automatiquement — modifiez
  > plutôt les données dans l'application, puis ré-exportez.

## 6. Ajouter une nouvelle semaine

Menu **Semaines ▸ Ajouter une semaine…**, indiquez le code (ex. `S52`) et
la date du lundi de cette semaine (format `AAAA-MM-JJ`).

## 7. Sauvegarde des données

Toutes vos modifications sont enregistrées **immédiatement et
automatiquement** dans `planning.db` (pas de bouton "Enregistrer" à
penser). Pour sauvegarder/archiver une version, il suffit de copier ce
fichier `planning.db` ailleurs. Pour repartir de zéro, supprimez-le : il
sera recréé vide au prochain lancement.

## 8. Structure des fichiers du projet

```
planning_app/
├── main.py            → lancer l'application (python main.py)
├── gui.py              → interface graphique (les 4 onglets)
├── db.py                → accès à la base de données locale (SQLite)
├── logic.py             → règles de calcul (heures, brodeuses, retards)
├── excel_import.py    → import d'un fichier Excel existant
├── excel_export.py    → génération d'un rapport Excel formaté
├── planning.db          → vos données (créé/rempli automatiquement)
├── requirements.txt   → dépendances (openpyxl)
└── README.md            → ce document
```

## 9. Questions fréquentes

**L'application ne démarre pas / erreur `tkinter`.**
Sous Linux : `sudo apt-get install python3-tk`. Sous Windows/Mac,
réinstallez Python depuis python.org en cochant l'option tcl/tk lors de
l'installation.

**Puis-je utiliser l'application sur plusieurs ordinateurs ?**
Oui, copiez tout le dossier `planning_app` (avec `planning.db`) sur une clé
USB ou un dossier partagé. Attention : si deux personnes modifient le même
`planning.db` en même temps depuis deux ordinateurs différents, la dernière
sauvegarde écrasera l'autre (pas de fusion automatique).

**Comment revenir au fichier Excel d'origine ?**
Le fichier `MACRO-PLANNING_BROD_TRADI_S34.xlsx` que vous avez fourni n'est
pas modifié par l'application. Vous pouvez toujours l'ouvrir normalement
dans Excel.
