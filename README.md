# LakayRent — Louez malin, vivez mieux

Site de location de maisons en Haïti. Les propriétaires publient leurs logements (au mois ou à la nuit), les locataires du monde entier les trouvent **classés du moins cher au plus cher**.

- **Hébergement** : GitHub Pages (gratuit, fichiers statiques)
- **Comptes** : connexion avec Google, en tant que **propriétaire** ou **locataire**
- **Données** : une feuille Google qui sert de « fichiers CSV » (un onglet par table), lue par le site au format CSV. Il n'y a ni serveur ni base de données.
- **Photos** : enregistrées dans un dossier Google Drive

## Ce que fait le site

| Page | Rôle |
|---|---|
| `index.html` | Accueil : recherche (lieu, type, prix max), catégories, offres à la une, villes |
| `annonces.html` | Toutes les annonces, filtres, tri par prix (au mois et à la nuit comparés sur 30 nuits) |
| `annonce.html?id=…` | Détail : photos, caractéristiques, WhatsApp, favoris, demande de visite |
| `connexion.html` | Connexion Google et choix Locataire / Propriétaire |
| `espace.html` | **Propriétaire** : mes annonces, publier, masquer, supprimer, demandes reçues. **Locataire** : favoris, demandes envoyées. Changement de rôle |
| `a-propos.html` | À propos, aide (FAQ), contact |

## Mode démo (fonctionne tout de suite)

Tant que `GOOGLE_CLIENT_ID` et `API_URL` sont vides dans `assets/js/config.js`, le site tourne en **mode démo** :
- les annonces viennent de `data/annonces.csv` (11 exemples marqués « Exemple ») ;
- la connexion se fait avec un nom et un e-mail fictifs ;
- ce que vous publiez reste **dans votre navigateur** (localStorage).

Pour tester en local : `python3 -m http.server 8000` dans ce dossier, puis ouvrez http://localhost:8000.

---

## Mise en ligne

### 1. GitHub Pages
1. Poussez ce dossier sur un dépôt GitHub (par ex. `lakayrent`).
2. Dans le dépôt, allez dans **Settings → Pages** et choisissez **Source : Deploy from a branch**, puis **Branch : main / (root)**.
3. Après une minute, le site est en ligne sur `https://VOTRE-NOM.github.io/lakayrent/`.

### 2. Identifiant Google (connexion)
1. Allez sur https://console.cloud.google.com et créez un projet « LakayRent ».
2. Dans **API et services → Écran de consentement OAuth**, choisissez Externe et remplissez le nom de l'app et votre e-mail. Ajoutez votre propre compte en utilisateur test, ou publiez l'app.
3. Dans **API et services → Identifiants → Créer des identifiants → ID client OAuth**, choisissez **Application Web**.
4. Dans **Origines JavaScript autorisées**, ajoutez :
   - `https://VOTRE-NOM.github.io`
   - `http://localhost:8000` (pour tester en local)
5. Copiez l'**ID client** (`….apps.googleusercontent.com`).

### 3. Feuille Google et script (vos « CSV »)
1. Créez une feuille Google vide nommée **LakayRent — données**.
2. Ouvrez **Extensions → Apps Script**, supprimez le contenu et collez `apps-script/Code.gs`.
3. En haut du script, remplacez `CLIENT_ID` par l'ID client de l'étape 2. Vous pouvez aussi renseigner `ADMIN_EMAIL`.
4. Choisissez la fonction **setup** et cliquez sur **Exécuter**. Acceptez les autorisations (Feuilles, Drive, envoi d'e-mails, requêtes externes). Les onglets `Annonces`, `Utilisateurs`, `Favoris`, `Demandes` et `Messages` sont créés.
5. Cliquez sur **Déployer → Nouveau déploiement**, type **Application Web** :
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
6. Copiez l'URL qui se termine par `/exec`.

> Après chaque modification du script : **Déployer → Gérer les déploiements → Modifier → Nouvelle version**. L'URL reste la même.

### 4. Relier le site
Dans `assets/js/config.js` :
```js
GOOGLE_CLIENT_ID: "1234…apps.googleusercontent.com",
API_URL: "https://script.google.com/macros/s/…/exec",
```
Poussez sur GitHub : le mode démo disparaît et les vraies annonces s'affichent.

**Garder les annonces d'exemple ?** Ouvrez l'onglet `Annonces`, puis **Fichier → Importer → `data/annonces.csv` → Ajouter à la feuille actuelle**. Les colonnes sont dans le même ordre.

**Télécharger vos données en CSV** : pour chaque onglet, **Fichier → Télécharger → CSV**. L'URL `API_URL?action=annonces` renvoie aussi le CSV public des annonces actives.

---

## Sécurité, en bref
- Le script **vérifie chaque jeton Google** auprès de Google (`tokeninfo`) et contrôle que l'ID client est le vôtre. On ne peut donc pas se faire passer pour quelqu'un d'autre.
- Un propriétaire ne peut modifier ou supprimer **que ses propres annonces**. Le propriétaire d'une demande de visite est retrouvé côté serveur.
- Le CSV public ne contient **jamais** l'e-mail des propriétaires. L'e-mail d'un locataire n'est visible que par le propriétaire qu'il contacte.
- Le texte saisi ne peut pas devenir une formule dans la feuille.
- Les jetons Google durent environ une heure. Ensuite, le site demande de se reconnecter avant une action.

## Limites à connaître
- Google Apps Script convient bien pour quelques milliers d'annonces et quelques dizaines de visiteurs simultanés. Au-delà, il faudra passer à une vraie base de données (Firebase, Supabase).
- La première réponse du script peut prendre 1 à 2 secondes (démarrage à froid).
- Les images d'exemple sont des illustrations. Remplacez `assets/img/hero.jpg` par une vraie photo (1920 × 1000) pour la page d'accueil.

## Structure
```
index.html  annonces.html  annonce.html  connexion.html  espace.html  a-propos.html
assets/css/style.css        styles communs
assets/js/config.js         à remplir (ID client Google, URL du script)
assets/js/core.js           CSV, session Google, API, en-tête, pied de page, cartes
assets/img/                 logo, illustrations
data/annonces.csv           annonces d'exemple (mode démo)
apps-script/Code.gs         back-end Google Apps Script
```
