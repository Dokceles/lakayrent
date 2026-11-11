/**
 * LakayRent — back-end Google Apps Script (sans serveur, sans base de données)
 * ---------------------------------------------------------------------------
 * Les données vivent dans une feuille Google (un onglet par table) et le site
 * les relit au format CSV. Installation pas à pas : voir README.md.
 *
 * 1. Créez une feuille Google, puis Extensions > Apps Script.
 * 2. Collez ce fichier, remplacez CLIENT_ID ci-dessous.
 * 3. Exécutez setup() une fois (accepte les autorisations).
 * 4. Déployer > Nouveau déploiement > Application Web
 *      Exécuter en tant que : Moi    Accès : Tout le monde
 * 5. Copiez l'URL /exec dans assets/js/config.js (API_URL).
 */

// ID client OAuth Google : le même que GOOGLE_CLIENT_ID dans config.js
const CLIENT_ID = "626316783424-anm36mu7s73s1glj7thivsui6p1e603h.apps.googleusercontent.com";

// Recevoir un e-mail à chaque nouvelle demande de visite (propriétaire) et chaque message de contact (vous)
const NOTIFY_OWNERS = true;
const ADMIN_EMAIL = ""; // ex. "vous@gmail.com" pour recevoir les messages de contact

const MAX_PHOTOS = 6;
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

const SHEETS = {
  Annonces: ["id", "titre", "type", "ville", "quartier", "prix", "periode", "chambres", "sdb", "surface", "voyageurs", "description", "whatsapp", "photos", "proprietaire_nom", "proprietaire_id", "statut", "exemple", "date", "proprietaire_email"],
  Utilisateurs: ["id", "email", "nom", "photo", "role", "date", "derniere_connexion"],
  Favoris: ["user_id", "annonce_id", "date"],
  Demandes: ["id", "annonce_id", "annonce_titre", "proprietaire_id", "locataire_id", "locataire_nom", "locataire_email", "telephone", "date_souhaitee", "message", "date", "statut"],
  Messages: ["date", "nom", "email", "message"]
};
// Colonnes publiées dans le CSV public (jamais l'e-mail du propriétaire)
const PUBLIC_COLS = SHEETS.Annonces.filter(function (c) { return c !== "proprietaire_email"; });
const TYPES = ["Maison", "Appartement", "Villa", "Bungalow", "Studio", "Terrain"];

/* ======================= installation ======================= */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS).forEach(function (name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.appendRow(SHEETS[name]);
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, SHEETS[name].length).setFontWeight("bold");
    }
    // Tout en texte brut : les dates, prix et numéros restent exactement comme le site les envoie
    sh.getRange(1, 1, sh.getMaxRows(), SHEETS[name].length).setNumberFormat("@");
  });
  photoFolder_();
  Logger.log("LakayRent est prêt. Déployez maintenant en Application Web.");
}

/* ======================= points d'entrée ======================= */
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "";
  if (action === "annonces") {
    const rows = readAll_("Annonces").filter(function (r) { return r.statut === "active"; });
    return ContentService.createTextOutput(toCSV_(PUBLIC_COLS, rows)).setMimeType(ContentService.MimeType.CSV);
  }
  return ContentService.createTextOutput("LakayRent API OK").setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: "Requête invalide." }); }
  const action = body.action;
  try {
    if (action === "contact") return json_(contact_(body));
    const user = verify_(body.idToken);
    const handlers = {
      login: login_, setRole: setRole_, createListing: createListing_, updateListing: updateListing_,
      deleteListing: deleteListing_, myListings: myListings_, toggleFavorite: toggleFavorite_,
      myFavorites: myFavorites_, sendRequest: sendRequest_, myRequests: myRequests_
    };
    if (!handlers[action]) return json_({ ok: false, error: "Action inconnue." });
    return json_(handlers[action](user, body));
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err), code: err.code || "" });
  }
}

/* ======================= sécurité : vérification du jeton Google ======================= */
function verify_(idToken) {
  if (!idToken) throw codeErr_("Connectez-vous pour continuer.", "auth");
  const cache = CacheService.getScriptCache();
  const key = "tok_" + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, idToken)).slice(0, 40);
  const hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  const res = UrlFetchApp.fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw codeErr_("Votre session Google a expiré. Reconnectez-vous.", "reauth");
  const t = JSON.parse(res.getContentText());
  const okIss = t.iss === "accounts.google.com" || t.iss === "https://accounts.google.com";
  if (t.aud !== CLIENT_ID || !okIss) throw codeErr_("Jeton Google refusé (ID client différent).", "auth");
  if (String(t.email_verified) !== "true") throw codeErr_("Adresse Google non vérifiée.", "auth");
  if (Number(t.exp) * 1000 < Date.now()) throw codeErr_("Votre session Google a expiré. Reconnectez-vous.", "reauth");
  const user = { id: t.sub, email: t.email, name: t.name || t.email, picture: t.picture || "" };
  const ttl = Math.max(60, Math.min(3000, Number(t.exp) - Math.floor(Date.now() / 1000) - 30));
  cache.put(key, JSON.stringify(user), ttl);
  return user;
}

/* ======================= comptes ======================= */
function login_(u, b) {
  return withLock_(function () {
    const sh = sheet_("Utilisateurs");
    const found = findRow_(sh, "id", u.id);
    const now = new Date().toISOString();
    if (found) {
      const r = found.obj;
      if (!r.role && validRole_(b.role)) setCell_(sh, found.row, "role", b.role);
      setCell_(sh, found.row, "derniere_connexion", now);
      setCell_(sh, found.row, "nom", u.name);
      setCell_(sh, found.row, "photo", u.picture);
      return { ok: true, user: { id: u.id, email: u.email, nom: u.name, role: r.role || (validRole_(b.role) ? b.role : "") } };
    }
    const role = validRole_(b.role) ? b.role : "";
    appendObj_(sh, { id: u.id, email: u.email, nom: u.name, photo: u.picture, role: role, date: now, derniere_connexion: now });
    return { ok: true, user: { id: u.id, email: u.email, nom: u.name, role: role } };
  });
}
function setRole_(u, b) {
  if (!validRole_(b.role)) throw new Error("Type de compte inconnu.");
  return withLock_(function () {
    const sh = sheet_("Utilisateurs");
    const found = findRow_(sh, "id", u.id);
    if (!found) appendObj_(sh, { id: u.id, email: u.email, nom: u.name, photo: u.picture, role: b.role, date: new Date().toISOString() });
    else setCell_(sh, found.row, "role", b.role);
    return { ok: true, user: { id: u.id, role: b.role } };
  });
}
function roleOf_(u) {
  const f = findRow_(sheet_("Utilisateurs"), "id", u.id);
  return f ? f.obj.role : "";
}

/* ======================= annonces ======================= */
function createListing_(u, b) {
  if (roleOf_(u) !== "proprietaire") throw new Error("Seuls les comptes propriétaires peuvent publier.");
  const l = b.listing || {};
  const titre = clean_(l.titre, 80), ville = clean_(l.ville, 60), whatsapp = clean_(l.whatsapp, 30);
  const prix = Math.round(Number(l.prix));
  if (!titre || !ville || !whatsapp || !(prix > 0) || prix > 1000000) throw new Error("Titre, ville, loyer et WhatsApp sont obligatoires.");
  const photos = (b.photos || []).slice(0, MAX_PHOTOS).map(function (d, i) { return savePhoto_(d, titre + " " + (i + 1)); }).filter(String);
  const row = {
    id: "L" + Utilities.getUuid().replace(/-/g, "").slice(0, 10),
    titre: titre, type: TYPES.indexOf(l.type) >= 0 ? l.type : "Maison", ville: ville, quartier: clean_(l.quartier, 60),
    prix: prix, periode: l.periode === "nuit" ? "nuit" : "mois",
    chambres: num_(l.chambres, 0, 50), sdb: num_(l.sdb, 0, 50), surface: num_(l.surface, 0, 1000000), voyageurs: num_(l.voyageurs, 0, 100),
    description: clean_(l.description, 1500), whatsapp: whatsapp, photos: photos.join("|"),
    proprietaire_nom: u.name, proprietaire_id: u.id, statut: "active", exemple: "", date: new Date().toISOString(), proprietaire_email: u.email
  };
  withLock_(function () { appendObj_(sheet_("Annonces"), row); });
  return { ok: true, id: row.id };
}
function updateListing_(u, b) {
  return withLock_(function () {
    const sh = sheet_("Annonces");
    const f = findRow_(sh, "id", b.id);
    if (!f) throw new Error("Annonce introuvable.");
    if (f.obj.proprietaire_id !== u.id) throw new Error("Cette annonce ne vous appartient pas.");
    const fields = b.fields || {};
    if (fields.statut === "active" || fields.statut === "masquee") setCell_(sh, f.row, "statut", fields.statut);
    if (fields.prix != null && Number(fields.prix) > 0) setCell_(sh, f.row, "prix", Math.round(Number(fields.prix)));
    if (fields.description != null) setCell_(sh, f.row, "description", clean_(fields.description, 1500));
    return { ok: true };
  });
}
function deleteListing_(u, b) {
  return withLock_(function () {
    const sh = sheet_("Annonces");
    const f = findRow_(sh, "id", b.id);
    if (!f) return { ok: true };
    if (f.obj.proprietaire_id !== u.id) throw new Error("Cette annonce ne vous appartient pas.");
    String(f.obj.photos || "").split("|").forEach(function (url) {
      const m = /\/d\/([A-Za-z0-9_-]+)/.exec(url);
      if (m) { try { DriveApp.getFileById(m[1]).setTrashed(true); } catch (e) {} }
    });
    sh.deleteRow(f.row);
    return { ok: true };
  });
}
function myListings_(u) {
  const rows = readAll_("Annonces").filter(function (r) { return r.proprietaire_id === u.id; });
  rows.forEach(function (r) { delete r.proprietaire_email; });
  return { ok: true, listings: rows };
}

/* ======================= favoris ======================= */
function toggleFavorite_(u, b) {
  if (!b.annonceId) throw new Error("Annonce manquante.");
  return withLock_(function () {
    const sh = sheet_("Favoris");
    const data = sh.getDataRange().getValues();
    let removed = false;
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][0]) === u.id && String(data[i][1]) === String(b.annonceId)) { sh.deleteRow(i + 1); removed = true; }
    }
    if (!removed) sh.appendRow([u.id, String(b.annonceId), new Date().toISOString()]);
    return { ok: true, favorite: !removed, favorites: favIds_(u) };
  });
}
function myFavorites_(u) { return { ok: true, favorites: favIds_(u) }; }
function favIds_(u) {
  return readAll_("Favoris").filter(function (r) { return r.user_id === u.id; }).map(function (r) { return r.annonce_id; });
}

/* ======================= demandes de visite ======================= */
function sendRequest_(u, b) {
  const listing = findRow_(sheet_("Annonces"), "id", b.annonceId);
  if (!listing || listing.obj.statut !== "active") throw new Error("Cette annonce n'est plus disponible.");
  if (listing.obj.proprietaire_id === u.id) throw new Error("Vous ne pouvez pas demander la visite de votre propre annonce.");
  const tel = clean_(b.telephone, 30);
  if (!tel) throw new Error("Ajoutez un numéro pour que le propriétaire puisse vous répondre.");
  const r = {
    id: "R" + Utilities.getUuid().replace(/-/g, "").slice(0, 10), annonce_id: listing.obj.id, annonce_titre: listing.obj.titre,
    proprietaire_id: listing.obj.proprietaire_id, locataire_id: u.id, locataire_nom: u.name, locataire_email: u.email,
    telephone: tel, date_souhaitee: clean_(b.date, 10), message: clean_(b.message, 800), date: new Date().toISOString(), statut: "nouvelle"
  };
  withLock_(function () { appendObj_(sheet_("Demandes"), r); });
  if (NOTIFY_OWNERS && listing.obj.proprietaire_email) {
    try {
      MailApp.sendEmail({
        to: listing.obj.proprietaire_email,
        subject: "LakayRent : nouvelle demande pour « " + listing.obj.titre + " »",
        body: "Bonjour,\n\n" + u.name + " souhaite visiter votre logement « " + listing.obj.titre + " ».\n\n" +
          (r.date_souhaitee ? "Date souhaitée : " + r.date_souhaitee + "\n" : "") + "Téléphone / WhatsApp : " + tel + "\nE-mail : " + u.email + "\n\n" +
          (r.message ? "Message :\n" + r.message + "\n\n" : "") + "Retrouvez toutes vos demandes dans votre espace LakayRent.\n"
      });
    } catch (e) {}
  }
  return { ok: true };
}
function myRequests_(u) {
  const all = readAll_("Demandes");
  return {
    ok: true,
    received: all.filter(function (r) { return r.proprietaire_id === u.id; }),
    sent: all.filter(function (r) { return r.locataire_id === u.id; }).map(function (r) { return { id: r.id, annonce_id: r.annonce_id, annonce_titre: r.annonce_titre, telephone: r.telephone, date_souhaitee: r.date_souhaitee, message: r.message, date: r.date, statut: r.statut }; })
  };
}

/* ======================= contact ======================= */
function contact_(b) {
  const nom = clean_(b.nom, 80), email = clean_(b.email, 120), message = clean_(b.message, 2000);
  if (!nom || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !message) throw new Error("Nom, e-mail valide et message sont obligatoires.");
  withLock_(function () { appendObj_(sheet_("Messages"), { date: new Date().toISOString(), nom: nom, email: email, message: message }); });
  if (ADMIN_EMAIL) { try { MailApp.sendEmail(ADMIN_EMAIL, "LakayRent : message de " + nom, message + "\n\nRépondre à : " + email); } catch (e) {} }
  return { ok: true };
}

/* ======================= photos (Google Drive) ======================= */
function photoFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty("PHOTO_FOLDER_ID");
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const folder = DriveApp.createFolder("LakayRent — photos des annonces");
  props.setProperty("PHOTO_FOLDER_ID", folder.getId());
  return folder;
}
function savePhoto_(dataUrl, name) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(String(dataUrl || ""));
  if (!m) return "";
  const bytes = Utilities.base64Decode(m[2]);
  if (bytes.length > MAX_PHOTO_BYTES) return "";
  const file = photoFolder_().createFile(Utilities.newBlob(bytes, m[1], name.replace(/[^\w\- ]/g, "") + ".jpg"));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return "https://lh3.googleusercontent.com/d/" + file.getId();
}

/* ======================= outils feuille ======================= */
function sheet_(name) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error("Onglet « " + name + " » manquant : exécutez setup().");
  return sh;
}
function readAll_(name) {
  const values = sheet_(name).getDataRange().getDisplayValues();
  const head = values.shift() || [];
  return values.filter(function (r) { return r.join("") !== ""; }).map(function (r) {
    const o = {}; head.forEach(function (h, i) { o[h] = r[i]; }); return o;
  });
}
function findRow_(sh, col, value) {
  const values = sh.getDataRange().getDisplayValues();
  const head = values[0] || [];
  const c = head.indexOf(col);
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][c]) === String(value)) {
      const o = {}; head.forEach(function (h, k) { o[h] = values[i][k]; });
      return { row: i + 1, obj: o };
    }
  }
  return null;
}
function appendObj_(sh, obj) {
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  sh.appendRow(head.map(function (h) { return safe_(obj[h]); }));
}
function setCell_(sh, row, col, value) {
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const c = head.indexOf(col);
  if (c >= 0) sh.getRange(row, c + 1).setValue(safe_(value));
}
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}
function toCSV_(cols, rows) {
  const q = function (v) { const s = String(v == null ? "" : v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return [cols.join(",")].concat(rows.map(function (r) { return cols.map(function (c) { return q(r[c]); }).join(","); })).join("\n");
}
// Empêche qu'un texte saisi soit interprété comme une formule dans la feuille
function safe_(v) { if (typeof v === "string" && /^[=+\-@]/.test(v)) return "'" + v; return v == null ? "" : v; }
function clean_(v, max) { return String(v == null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max); }
function num_(v, min, max) { const n = Math.round(Number(v)); return isFinite(n) ? Math.max(min, Math.min(max, n)) : 0; }
function validRole_(r) { return r === "proprietaire" || r === "locataire"; }
function codeErr_(msg, code) { const e = new Error(msg); e.code = code; return e; }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
