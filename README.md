# LakayRent — Louez malin, vivez mieux

Site de location de maisons en Haïti. Des propriétaires publient leurs logements (au mois ou à la nuit), des locataires du monde entier les trouvent **classés du moins cher au plus cher**, sur une liste ou sur une **carte des prix**.

🌐 **En ligne : https://dokceles.github.io/lakayrent/**

| Brique | Outil | Coût |
|---|---|---|
| Hébergement du site | GitHub Pages (dépôt `Dokceles/lakayrent`) | Gratuit |
| Comptes | Connexion Google (projet Google Cloud « LakayRent ») | Gratuit |
| Données | Feuille Google « LakayRent — données », lue par le site en CSV | Gratuit |
| Back-end | Google Apps Script « LakayRent API » (application Web) | Gratuit |
| Photos des propriétaires | Dossier Google Drive « LakayRent — photos des annonces » | Gratuit (15 Go) |
| Carte | Leaflet + OpenStreetMap | Gratuit |
| Photos d'illustration | Unsplash (licence libre, usage commercial autorisé) | Gratuit |

Tous les services Google sont rattachés au compte **euler5025@gmail.com**.

---

## Pages

| Page | Contenu |
|---|---|
| `index.html` | Accueil : recherche (lieu, type, prix max), catégories, offres à la une, « Lakay se lakay » (photos d'Haïti), bandeau « Byenvini lakay ou », villes populaires |
| `annonces.html` | Toutes les annonces, filtres (ville, type, durée, prix, chambres), tri par prix. Les prix à la nuit sont comparés sur 30 nuits |
| `annonce.html?id=…` | Détail : galerie photos, caractéristiques, WhatsApp, favoris, demande de visite |
| `carte.html` | Carte des prix : loyer médian par ville (bulles colorées), « Grand Port-au-Prince » regroupé à l'échelle du pays, prix de chaque annonce en zoomant, classement des villes |
| `connexion.html` | Connexion Google, choix Locataire / Propriétaire |
| `espace.html` | **Propriétaire** : mes annonces (masquer, supprimer), publier (jusqu'à 6 photos), demandes reçues. **Locataire** : favoris, demandes envoyées. Changement de rôle |
| `a-propos.html` | À propos, aide (FAQ), contact (formulaire, e-mail et WhatsApp) |
| `confidentialite.html` | Politique de confidentialité (exigée par Google pour la connexion) |

## Données (la feuille Google)

Un onglet par table. Chacun se télécharge en CSV avec **Fichier → Télécharger → CSV**.

| Onglet | Contenu |
|---|---|
| `Annonces` | Une ligne par annonce. Colonne `statut` : `active` ou `masquee`. Colonne `exemple` : `oui` pour les annonces de démonstration |
| `Utilisateurs` | Comptes Google (id, e-mail, nom, rôle, dates) |
| `Favoris` | Couples utilisateur / annonce |
| `Demandes` | Demandes de visite (locataire, téléphone, date souhaitée, message) |
| `Messages` | Messages de la page Contact (copie envoyée par e-mail) |

Le CSV public des annonces actives est servi par `API_URL?action=annonces`. Il ne contient **jamais** l'e-mail des propriétaires.

### Annonces d'exemple
Le site contient **100 annonces d'exemple** (11 de départ et 89 générées) réparties dans 17 villes, avec des prix simulés et des numéros WhatsApp factices. Chacune porte le badge « Exemple ».
- Elles viennent de `data/annonces.csv` et ont été copiées dans la feuille par la fonction `importerExemples()` du script.
- **Pour les retirer** : dans l'onglet `Annonces`, supprimez les lignes dont la colonne `exemple` vaut `oui`.
- **Pour les remettre** : dans Apps Script, choisissez `importerExemples` puis cliquez sur **Exécuter**. Les annonces déjà présentes ne sont pas dupliquées.

## Photos

- `assets/img/photos/` contient les grandes images (1800 px, et 4K pour l'accueil). `assets/img/photos/sm/` contient les vignettes des cartes (720 px).
- La liste des photos est dans `assets/img/photos.txt` (`nom identifiant-unsplash`). **Pour ajouter ou changer une photo**, modifiez ce fichier et poussez-le : le workflow GitHub Actions `.github/workflows/photos.yml` télécharge les images dans les deux tailles et les ajoute au dépôt automatiquement.
- Les photos publiées par les propriétaires sont réduites dans le navigateur, puis enregistrées dans le dossier Drive.

---

## Configuration (déjà faite)

### `assets/js/config.js`
```js
GOOGLE_CLIENT_ID: "626316783424-….apps.googleusercontent.com", // ID client OAuth
API_URL: "https://script.google.com/macros/s/AKfy…/exec",       // application Web Apps Script
CONTACT_EMAIL: "euler5025@gmail.com",
CONTACT_WHATSAPP: "+33 7 53 15 10 16",
WHATSAPP_URL: "https://wa.me/33753151016"
```
Si `API_URL` est vide, le site repasse en **mode démo** : les annonces viennent de `data/annonces.csv` et tout reste dans le navigateur.

### Google Cloud (projet « LakayRent »)
- Écran de connexion : application **externe**, **en production**, avec seulement le nom, l'e-mail et la photo. Aucune validation Google n'est nécessaire.
- Page d'accueil `https://dokceles.github.io/lakayrent/`, confidentialité `…/confidentialite.html`, domaine autorisé `dokceles.github.io`.
- ID client « LakayRent site », origine JavaScript autorisée `https://dokceles.github.io`. Pour tester en local, ajoutez `http://localhost:8000`.

### Apps Script (« LakayRent API »)
- Code : `apps-script/Code.gs`. Il est autonome : `setup()` crée la feuille et le dossier photos, puis garde leurs identifiants dans les propriétés du script.
- Déploiement : application Web, exécutée en tant que **Moi**, accessible à **Tout le monde**.
- `ADMIN_EMAIL` reçoit les messages de contact. Avec `NOTIFY_OWNERS`, les propriétaires reçoivent un e-mail à chaque demande de visite.

> ⚠️ **Après toute modification du script** : **Déployer → Gérer les déploiements → ✏️ → Version : Nouvelle version → Déployer**. Sinon le site continue d'utiliser l'ancienne version. L'URL ne change pas.

### Mettre le site à jour
Chaque push sur `main` republie le site sur GitHub Pages en une à deux minutes. Si un navigateur garde l'ancienne version, augmentez le numéro `?v=` des fichiers CSS et JS dans les pages HTML.

Pour tester en local : `python3 -m http.server 8000` dans ce dossier, puis ouvrez http://localhost:8000.

---

## Sécurité
- Le script **vérifie chaque jeton Google** auprès de Google (`tokeninfo`) et contrôle que l'ID client est bien celui de LakayRent.
- Un propriétaire ne peut modifier ou supprimer **que ses propres annonces**. Le propriétaire d'une demande de visite est retrouvé côté serveur, pas fourni par le navigateur.
- L'e-mail d'un locataire n'est visible que par le propriétaire qu'il contacte.
- Le texte saisi ne peut pas devenir une formule dans la feuille.
- Sur la carte, les annonces sont placées autour du centre de leur ville, pas à l'adresse exacte.

## Limites de la version gratuite (estimations)
| Ressource | Limite | Ce que ça représente |
|---|---|---|
| Vitesse de la feuille | Le script relit l'onglet à chaque action | Confortable jusqu'à environ 5 000 annonces et 20 000 utilisateurs |
| Google Drive | 15 Go partagés avec Gmail | Environ 5 000 à 7 000 annonces avec 6 photos |
| Vérification des connexions | Environ 20 000 par jour | Plusieurs milliers d'utilisateurs actifs par jour |
| Exécutions simultanées | Environ 30 | Un très gros pic de trafic ralentit le site |
| E-mails d'alerte | Environ 100 par jour | Au-delà, les demandes restent visibles dans l'espace du propriétaire |
| GitHub Pages | Environ 100 Go par mois | 50 000 à 100 000 pages vues par mois |
| Fond de carte OpenStreetMap | Usage raisonnable | Pour un trafic important, passer à MapTiler ou Stadia (offres gratuites) |

Au-delà, il faudra migrer vers une base de données (Firebase ou Supabase).

## Pistes pour la suite
- **Revenus** : annonces mises en avant payantes, puis réservation en ligne avec acompte et frais de service pour les locations à la nuit (modèle Leboncoin). Paiement par carte (Stripe) pour la diaspora, et par MonCash en Haïti. À faire valider juridiquement avant d'encaisser pour le compte de tiers.
- **Position exacte** : permettre au propriétaire de placer sa maison sur la carte.
- **Nom de domaine** : par exemple `lakayrent.com`, à relier à GitHub Pages.
- **Mesure d'audience** : Google Analytics, par exemple.

## Structure
```
index.html  annonces.html  annonce.html  carte.html  connexion.html
espace.html  a-propos.html  confidentialite.html
assets/css/style.css          styles communs
assets/js/config.js           ID client Google, URL du script, contacts
assets/js/core.js             CSV, session Google, API, en-tête, pied de page, cartes, icônes
assets/img/photos/            photos (grandes) — photos/sm/ : vignettes
assets/img/photos.txt         liste des photos Unsplash à télécharger
data/annonces.csv             100 annonces d'exemple
apps-script/Code.gs           back-end Google Apps Script
.github/workflows/photos.yml  téléchargement automatique des photos
```
