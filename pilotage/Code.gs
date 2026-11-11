/**
 * LakayRent — Pilotage (tableau de bord privé)
 * ---------------------------------------------------------------
 * Projet Apps Script SÉPARÉ du site. Il lit la feuille « LakayRent — données »
 * et calcule les indicateurs clés. Déployé en Application Web :
 *   Exécuter en tant que : Moi    Qui a accès : Moi uniquement
 * Personne d'autre que le propriétaire du compte ne peut l'ouvrir.
 */
const SHEET_ID = "1fuj4FocX6aXWW3h4QWCavc02qQLpgrkU2xBAUCeBZqc";
const SITE_URL = "https://dokceles.github.io/lakayrent/";
const HAITI_TZ = "America/Port-au-Prince";
const PAGE_NAMES = { home: "accueil", annonces: "liste des annonces", carte: "carte des prix", connexion: "connexion", espace: "espace membre", apropos: "à propos / contact", confidentialite: "confidentialité" };

function doGet() {
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("LakayRent — Pilotage")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setFaviconUrl("https://dokceles.github.io/lakayrent/assets/img/favicon.svg");
}

function read_(ss, name) {
  const sh = ss.getSheetByName(name);
  if (!sh) return [];
  const v = sh.getDataRange().getDisplayValues();
  const head = v.shift() || [];
  return v.filter(function (r) { return r.join("") !== ""; }).map(function (r) {
    const o = {}; head.forEach(function (h, i) { o[h] = r[i]; }); return o;
  });
}
function t_(d) { const x = Date.parse(d); return isNaN(x) ? 0 : x; }
function dayKey_(ms) { return Utilities.formatDate(new Date(ms), HAITI_TZ, "yyyy-MM-dd"); }
function count_(arr, fn) { const m = {}; arr.forEach(function (x) { const k = fn(x); if (k) m[k] = (m[k] || 0) + 1; }); return m; }
function top_(m, n) { return Object.keys(m).map(function (k) { return [k, m[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, n); }
function median_(a) { if (!a.length) return 0; const s = a.slice().sort(function (x, y) { return x - y; }); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
function pct_(a, b) { return b ? a / b : null; }

/** Indicateurs pour les `days` derniers jours, comparés à la période précédente de même durée. */
function getData(days) {
  days = Number(days) || 30;
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const now = Date.now(), start = now - days * 864e5, prevStart = start - days * 864e5;
  const hits = read_(ss, "Visites").map(function (h) { h.ms = t_(h.date); return h; });
  const ann = read_(ss, "Annonces"), users = read_(ss, "Utilisateurs"), favs = read_(ss, "Favoris"),
        reqs = read_(ss, "Demandes"), msgs = read_(ss, "Messages");

  function periodStats(from, to) {
    const H = hits.filter(function (h) { return h.ms >= from && h.ms < to; });
    const pv = H.filter(function (h) { return h.type === "pageview"; });
    const vis = {}; pv.forEach(function (h) { vis[h.visiteur] = 1; });
    const ses = {}; pv.forEach(function (h) { ses[h.session] = (ses[h.session] || 0) + 1; });
    const nSes = Object.keys(ses).length;
    const bounce = Object.keys(ses).filter(function (k) { return ses[k] === 1; }).length;
    const detailViews = pv.filter(function (h) { return h.annonce_id; }).length;
    const wa = H.filter(function (h) { return h.type === "whatsapp"; }).length;
    const dem = H.filter(function (h) { return h.type === "demande"; }).length;
    const mob = pv.filter(function (h) { return h.appareil === "mobile"; }).length;
    const ht = pv.filter(function (h) { return h.fuseau === HAITI_TZ; }).length;
    return {
      pageviews: pv.length, visitors: Object.keys(vis).length, sessions: nSes,
      pagesPerSession: nSes ? pv.length / nSes : 0, bounceRate: pct_(bounce, nSes),
      detailViews: detailViews, whatsapp: wa, demandes: dem,
      contactRate: pct_(wa + dem, detailViews),
      favoris: H.filter(function (h) { return h.type === "favori"; }).length,
      recherches: H.filter(function (h) { return h.type === "recherche"; }).length,
      publications: H.filter(function (h) { return h.type === "publication"; }).length,
      connexions: H.filter(function (h) { return h.type === "connexion"; }).length,
      erreurs: H.filter(function (h) { return h.type === "erreur"; }).length,
      mobileShare: pct_(mob, pv.length), haitiShare: pct_(ht, pv.length),
      newUsers: users.filter(function (u) { const x = t_(u.date); return x >= from && x < to; }).length,
      newListings: ann.filter(function (a) { const x = t_(a.date); return a.exemple !== "oui" && x >= from && x < to; }).length,
      _H: H, _pv: pv
    };
  }
  const cur = periodStats(start, now + 1), prev = periodStats(prevStart, start);

  // Séries par jour
  const series = [];
  for (let d = days - 1; d >= 0; d--) {
    const k = dayKey_(now - d * 864e5);
    series.push({ day: k, pageviews: 0, visitors: 0, contacts: 0, _v: {} });
  }
  const idx = {}; series.forEach(function (s, i) { idx[s.day] = i; });
  cur._H.forEach(function (h) {
    const i = idx[dayKey_(h.ms)]; if (i == null) return;
    if (h.type === "pageview") { series[i].pageviews++; series[i]._v[h.visiteur] = 1; }
    if (h.type === "whatsapp" || h.type === "demande") series[i].contacts++;
  });
  series.forEach(function (s) { s.visitors = Object.keys(s._v).length; delete s._v; });

  // Annonces
  const byId = {}; ann.forEach(function (a) { byId[a.id] = a; });
  const active = ann.filter(function (a) { return a.statut === "active"; });
  const real = active.filter(function (a) { return a.exemple !== "oui"; });
  const views = count_(cur._pv.filter(function (h) { return h.annonce_id; }), function (h) { return h.annonce_id; });
  const contactsBy = count_(cur._H.filter(function (h) { return (h.type === "whatsapp" || h.type === "demande") && h.annonce_id; }), function (h) { return h.annonce_id; });
  const topListings = top_(views, 10).map(function (p) {
    const a = byId[p[0]] || {};
    return { id: p[0], titre: a.titre || "(annonce supprimée)", ville: a.ville || "", prix: a.prix ? "$" + a.prix + " / " + (a.periode || "mois") : "", exemple: a.exemple === "oui", vues: p[1], contacts: contactsBy[p[0]] || 0 };
  });
  const cityViews = {};
  Object.keys(views).forEach(function (id) { const a = byId[id]; if (a) cityViews[a.ville] = (cityViews[a.ville] || 0) + views[id]; });
  const supplyByCity = count_(active, function (a) { return a.ville; });
  const cityTable = Object.keys(Object.assign({}, cityViews, supplyByCity)).map(function (v) {
    const prices = active.filter(function (a) { return a.ville === v && a.periode === "mois"; }).map(function (a) { return Number(a.prix) || 0; });
    return { ville: v, annonces: supplyByCity[v] || 0, vues: cityViews[v] || 0, medianeMois: median_(prices) };
  }).sort(function (a, b) { return b.vues - a.vues || b.annonces - a.annonces; });

  // Pays approximatif d'après le fuseau horaire du navigateur
  const TZ = { "America/Port-au-Prince": "Haïti", "America/New_York": "États-Unis (Est)", "America/Chicago": "États-Unis (Centre)", "America/Los_Angeles": "États-Unis (Ouest)", "America/Toronto": "Canada", "America/Montreal": "Canada", "Europe/Paris": "France", "America/Santo_Domingo": "Rép. dominicaine", "America/Sao_Paulo": "Brésil", "America/Santiago": "Chili", "Europe/Brussels": "Belgique", "Europe/Zurich": "Suisse", "America/Martinique": "Martinique", "America/Guadeloupe": "Guadeloupe", "America/Cayenne": "Guyane" };
  const origins = top_(count_(cur._pv, function (h) { return TZ[h.fuseau] || (h.fuseau ? "Autre (" + h.fuseau.split("/")[0] + ")" : "Inconnu"); }), 8);

  // Santé technique
  let drive = null;
  try { drive = { used: DriveApp.getStorageUsed(), limit: DriveApp.getStorageLimit() }; } catch (e) {}
  let mailLeft = null; try { mailLeft = MailApp.getRemainingDailyQuota(); } catch (e) {}
  let cells = 0; ss.getSheets().forEach(function (sh) { cells += sh.getMaxRows() * sh.getMaxColumns(); });
  const errors = cur._H.filter(function (h) { return h.type === "erreur"; }).slice(-15).reverse().map(function (h) { return { date: h.date, page: h.page, detail: h.detail }; });
  const noPhoto = real.filter(function (a) { return !a.photos; }).length;

  // Alertes
  const alerts = [];
  if (cur.erreurs > 0) alerts.push({ level: cur.erreurs > 20 ? "critical" : "warning", text: cur.erreurs + " erreur(s) enregistrée(s) sur la période. Voir le détail plus bas." });
  if (mailLeft != null && mailLeft < 20) alerts.push({ level: "warning", text: "Plus que " + mailLeft + " e-mails d'alerte disponibles aujourd'hui." });
  if (drive && drive.limit && drive.used / drive.limit > 0.8) alerts.push({ level: "warning", text: "Google Drive est rempli à " + Math.round(drive.used / drive.limit * 100) + " %." });
  if (cells > 8e6) alerts.push({ level: "warning", text: "La feuille approche de la limite de 10 millions de cellules. Pensez à archiver l'onglet Visites." });
  if (hits.length > 150000) alerts.push({ level: "warning", text: hits.length.toLocaleString("fr-FR") + " lignes de visites : le tableau de bord va ralentir. Archivez les plus anciennes." });
  if (noPhoto > 0) alerts.push({ level: "info", text: noPhoto + " annonce(s) réelle(s) sans photo." });
  if (active.length - real.length > 0) alerts.push({ level: "info", text: (active.length - real.length) + " annonces d'exemple sont encore en ligne." });
  if (!hits.length) alerts.push({ level: "info", text: "Aucune visite enregistrée pour l'instant. Les mesures commencent dès la première visite du site." });

  const strip = function (o) { const c = Object.assign({}, o); delete c._H; delete c._pv; return c; };
  const recent = hits.filter(function (h) { return h.type === "pageview" && h.ms > now - 30 * 60 * 1000; });
  const live = {}; recent.forEach(function (h) { live[h.visiteur] = 1; });

  return {
    generated: new Date().toISOString(), days: days, siteUrl: SITE_URL, sheetUrl: ss.getUrl(),
    cur: strip(cur), prev: strip(prev), liveVisitors: Object.keys(live).length,
    series: series,
    sources: top_(count_(cur._pv, function (h) { return h.source || "direct"; }), 8),
    pages: top_(count_(cur._pv, function (h) { return h.annonce_id ? "fiche annonce" : (PAGE_NAMES[h.page] || h.page); }), 8),
    devices: top_(count_(cur._pv, function (h) { return h.appareil; }), 3),
    origins: origins,
    searches: top_(count_(cur._H.filter(function (h) { return h.type === "recherche"; }), function (h) { return h.detail; }), 8),
    topListings: topListings, cities: cityTable.slice(0, 12),
    supply: {
      active: active.length, real: real.length, examples: active.length - real.length,
      hidden: ann.filter(function (a) { return a.statut === "masquee"; }).length,
      nuit: active.filter(function (a) { return a.periode === "nuit"; }).length,
      medianMois: median_(active.filter(function (a) { return a.periode === "mois"; }).map(function (a) { return Number(a.prix) || 0; })),
      medianNuit: median_(active.filter(function (a) { return a.periode === "nuit"; }).map(function (a) { return Number(a.prix) || 0; }))
    },
    community: {
      users: users.length,
      owners: users.filter(function (u) { return u.role === "proprietaire"; }).length,
      tenants: users.filter(function (u) { return u.role === "locataire"; }).length,
      favoris: favs.length, demandes: reqs.length, messages: msgs.length,
      lastMessages: msgs.slice(-5).reverse().map(function (m) { return { date: m.date, nom: m.nom, message: String(m.message).slice(0, 140) }; })
    },
    health: { drive: drive, mailLeft: mailLeft, cells: cells, hitRows: hits.length, errors: errors },
    alerts: alerts
  };
}
