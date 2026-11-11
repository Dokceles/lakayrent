/* LakayRent — logique commune : icônes, CSV, session Google, API, en-tête, pied de page, cartes. */
(function () {
  "use strict";
  const CFG = window.LAKAY_CONFIG || {};
  const DEMO = !CFG.API_URL;
  const L = (window.Lakay = {});
  L.cfg = CFG;
  L.demo = DEMO;

  /* ================= utilitaires ================= */
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  L.$ = $; L.$$ = $$; L.esc = esc;
  L.param = (k) => new URLSearchParams(location.search).get(k) || "";
  L.money = (n) => "$" + Math.round(Number(n) || 0).toLocaleString("en-US");
  L.periodLabel = (p) => (p === "nuit" ? "nuit" : "mois");
  L.monthly = (l) => (l.periode === "nuit" ? l.prix * 30 : l.prix);
  L.dateFr = (d) => { try { return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }); } catch (_) { return d; } };
  L.toast = function (msg) {
    let t = $("#toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 3200);
  };

  L.VILLES = ["Port-au-Prince", "Delmas", "Pétion-Ville", "Tabarre", "Croix-des-Bouquets", "Carrefour", "Kenscoff", "Jacmel", "Cap-Haïtien", "Les Cayes", "Port-Salut", "Côte des Arcadins", "Saint-Marc", "Gonaïves", "Jérémie", "Hinche", "Île-à-Vache"];
  L.TYPES = [
    { v: "Maison", pl: "Maisons", icon: "house" },
    { v: "Appartement", pl: "Appartements", icon: "building" },
    { v: "Villa", pl: "Villas", icon: "villa" },
    { v: "Bungalow", pl: "Bungalows", icon: "bungalow" },
    { v: "Studio", pl: "Studios", icon: "sofa" },
    { v: "Terrain", pl: "Terrains", icon: "trees" }
  ];

  /* ================= icônes ================= */
  const P = {
    house: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
    building: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3"/>',
    villa: '<path d="M2 11 12 4l10 7"/><path d="M4 10v11h16V10"/><path d="M8 21v-5h3v5M14 13h3v3h-3z"/><path d="M2 21h20"/>',
    bungalow: '<path d="M3 11c3-5 15-5 18 0"/><path d="M5 10.5V17h14v-6.5"/><path d="M10 17v-3.5h4V17"/><path d="M6 17v3M18 17v3M3 20h18"/>',
    sofa: '<path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"/><path d="M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v4H2z"/><path d="M5 17v2M19 17v2"/>',
    trees: '<path d="M8 3 4 11h3l-3 5h8l-3-5h3z"/><path d="M8 16v5"/><path d="M17 6l-3 6h2l-2 4h6l-2-4h2z"/><path d="M17 16v5"/>',
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    heart: '<path d="M12 20s-7.5-4.6-9.2-9.3C1.7 7.5 3.8 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.2 0 5.3 3 4.2 6.2C19.5 15.4 12 20 12 20z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.8"/><path d="M16.5 14c3 .2 5 2.3 5 5.5"/>',
    login: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 16l4-4-4-4M14 12H3"/>',
    logout: '<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="M16 16l4-4-4-4M20 12H9"/>',
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    bed: '<path d="M3 18V6M3 13h18v5M21 13v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="10" r="2"/>',
    bath: '<path d="M4 12h17v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M6 12V5a2 2 0 0 1 3.5-1.3M7 20l-1 2M17 20l1 2"/>',
    ruler: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 3v4M13 3v3M18 3v4M3 8h4M3 13h3M3 18h4"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    handshake: '<path d="m11 17 2 2a1.4 1.4 0 0 0 2-2"/><path d="m14 14 2.5 2.5a1.4 1.4 0 0 0 2-2l-3.9-3.9a2 2 0 0 0-2.8 0l-.9.9a1.4 1.4 0 0 1-2-2l2.8-2.8a4 4 0 0 1 4.6-.8l.4.2a2 2 0 0 0 1.5.1L21 6"/><path d="m21 3 1 11h-2M3 3 2 14l6.5 6.5a1.4 1.4 0 0 0 2-2M3 4h8"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    check: '<path d="m5 12 5 5L20 7"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 9.2-9.2M17 6l3 3M14 9l2 2"/>',
    inbox: '<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5 5h14l2 8v6H3v-6z"/>',
    send: '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/>',
    swap: '<path d="M7 7h13l-4-4M17 17H4l4 4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    whatsapp: 'FILL<path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.5-.3z"/>',
    facebook: 'FILL<path d="M14 8V6.5c0-.7.5-1 1-1h2V2h-3c-2.8 0-4 2-4 4.3V8H8v3.5h2V22h4V11.5h2.8L17.5 8z"/>',
    youtube: 'FILL<path d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.6 2.6 0 0 0 2.4 7.2 27 27 0 0 0 2 12a27 27 0 0 0 .4 4.8 2.6 2.6 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8A27 27 0 0 0 22 12a27 27 0 0 0-.4-4.8zM10 15V9l5.2 3z"/>'
  };
  L.icon = function (name, cls) {
    const p = P[name] || P.home;
    if (p.startsWith("FILL")) return `<svg class="icon fill ${cls || ""}" viewBox="0 0 24 24" aria-hidden="true">${p.slice(4)}</svg>`;
    return `<svg class="icon ${cls || ""}" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
  };
  L.flag = '<svg class="flag" viewBox="0 0 30 20" aria-label="Drapeau d\'Haïti" role="img"><rect width="30" height="10" fill="#00209F"/><rect y="10" width="30" height="10" fill="#D21034"/><rect x="10.5" y="6.5" width="9" height="7" fill="#fff"/><path d="M15 7.6v3.2" stroke="#2F7D3A" stroke-width="1.2"/><path d="M12.2 12.6h5.6" stroke="#2F7D3A" stroke-width="1"/><circle cx="15" cy="7.8" r="1" fill="#2F7D3A"/></svg>';
  L.logoMark = '<svg class="logo-mark" viewBox="0 0 64 64" aria-hidden="true"><path d="M9 30 32 11l23 19" fill="none" stroke="#13296B" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 27v26h34V27" fill="none" stroke="#13296B" stroke-width="5" stroke-linejoin="round"/><path d="M19 30 32 19.5 45 30v20H19z" fill="#F7A81B"/><rect x="28" y="37" width="8" height="13" fill="#13296B"/><path d="M14 53V20" stroke="#13296B" stroke-width="3.2" stroke-linecap="round"/><path d="M14 20c-4-6-9-6-12-4 4-1 7 0 9 3-4-2-8 0-10 3 4-2 8-2 11 0-1-4 1-8 5-9-3 3-3 5-3 7" fill="#2F5BD3"/><path d="M14 20c3-6 9-7 12-5-4 0-7 1-9 4 4-2 8-1 10 2-4-1-8-1-11 1" fill="#2F5BD3"/></svg>';

  /* ================= CSV ================= */
  L.parseCSV = function (text) {
    const rows = []; let row = [], field = "", i = 0, q = false;
    text = String(text || "").replace(/^﻿/, "");
    while (i < text.length) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
        else field += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(field); rows.push(row); row = []; field = ""; }
      else field += c;
      i++;
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    const head = (rows.shift() || []).map((h) => h.trim());
    return rows.filter((r) => r.some((v) => v !== "")).map((r) => Object.fromEntries(head.map((h, k) => [h, (r[k] || "").trim()])));
  };
  function normalize(r) {
    const n = (v) => { const x = Number(String(v).replace(",", ".")); return isFinite(x) ? x : 0; };
    return {
      id: r.id, titre: r.titre, type: r.type || "Maison", ville: r.ville, quartier: r.quartier || "",
      prix: n(r.prix), periode: r.periode === "nuit" ? "nuit" : "mois",
      chambres: n(r.chambres), sdb: n(r.sdb), surface: n(r.surface), voyageurs: n(r.voyageurs),
      description: r.description || "", whatsapp: r.whatsapp || "",
      photos: String(r.photos || "").split("|").map((s) => s.trim()).filter(Boolean),
      proprietaire_nom: r.proprietaire_nom || "", proprietaire_id: r.proprietaire_id || "",
      statut: r.statut || "active", exemple: String(r.exemple).toLowerCase() === "oui" || r.exemple === "true" || r.exemple === true,
      date: r.date || ""
    };
  }
  L.normalize = normalize;
  L.photoOf = (l) => (l.photos && l.photos[0]) || "assets/img/photos/a4.jpg";
  // Vignette légère pour les cartes (les photos du site existent en deux tailles)
  L.thumb = (u) => (/^assets\/img\/photos\/[^/]+\.jpg$/.test(u) ? u.replace("assets/img/photos/", "assets/img/photos/sm/") : u);

  /* ================= stockage local (session + démo) ================= */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("lakay_" + k); return v ? JSON.parse(v) : d; } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem("lakay_" + k, JSON.stringify(v)); return true; } catch (_) { return false; } },
    del(k) { try { localStorage.removeItem("lakay_" + k); } catch (_) {} }
  };
  L.store = store;

  /* ================= session ================= */
  L.session = () => store.get("session", null);
  L.saveSession = (s) => store.set("session", s);
  L.logout = function () {
    store.del("session"); store.del("favs");
    try { window.google && google.accounts && google.accounts.id.disableAutoSelect(); } catch (_) {}
    location.href = "index.html";
  };
  L.tokenValid = (s) => s && (s.mode === "demo" || (s.idToken && s.exp * 1000 > Date.now() + 30000));
  function decodeJwt(t) {
    const b = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(atob(b).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join(""));
    return JSON.parse(json);
  }
  L.loadGoogle = function () {
    if (L._gis) return L._gis;
    L._gis = new Promise((res, rej) => {
      if (window.google && google.accounts) return res();
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client"; s.async = true; s.defer = true;
      s.onload = () => res(); s.onerror = () => rej(new Error("Impossible de charger Google"));
      document.head.appendChild(s);
    });
    return L._gis;
  };
  /** Affiche le bouton « Se connecter avec Google » ; onDone(session) après connexion réussie. */
  L.renderGoogleButton = async function (el, getRole, onDone, onError) {
    if (!CFG.GOOGLE_CLIENT_ID) { el.innerHTML = '<div class="notice info">La connexion Google sera active dès que l\'ID client sera ajouté dans <code>assets/js/config.js</code>. En attendant, utilisez le mode démo ci-dessous.</div>'; return; }
    try { await L.loadGoogle(); } catch (e) { el.innerHTML = '<div class="notice err">Google ne répond pas. Vérifiez votre connexion puis rechargez la page.</div>'; return; }
    google.accounts.id.initialize({
      client_id: CFG.GOOGLE_CLIENT_ID,
      ux_mode: "popup",
      callback: async (resp) => {
        try {
          const p = decodeJwt(resp.credential);
          const s = { mode: "google", idToken: resp.credential, exp: p.exp, id: p.sub, email: p.email, name: p.name || p.email, picture: p.picture || "", role: "" };
          L.saveSession(s);
          const out = await L.api("login", { role: getRole ? getRole() : "" });
          s.role = (out.user && out.user.role) || "";
          L.saveSession(s);
          onDone && onDone(s);
        } catch (e) { onError ? onError(e) : L.toast(e.message); }
      }
    });
    el.innerHTML = "";
    google.accounts.id.renderButton(el, { theme: "outline", size: "large", shape: "pill", text: "continue_with", locale: "fr", width: Math.min(360, el.clientWidth || 360) });
  };
  L.demoLogin = async function (name, email, role) {
    const id = "demo-" + Array.from(email).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36);
    const s = { mode: "demo", id, email, name, picture: "", role: role || "" };
    L.saveSession(s);
    await L.api("login", { role });
    return s;
  };
  /** Oblige à être connecté ; renvoie la session ou redirige. */
  L.requireLogin = function (msg) {
    const s = L.session();
    if (!s) { location.href = "connexion.html?next=" + encodeURIComponent(location.pathname.split("/").pop() + location.search + location.hash) + (msg ? "&msg=" + encodeURIComponent(msg) : ""); return null; }
    return s;
  };

  /* ================= API ================= */
  let listingsCache = null;
  L.getListings = async function (force) {
    if (listingsCache && !force) return listingsCache;
    let rows;
    if (!DEMO) {
      const r = await fetch(CFG.API_URL + "?action=annonces&t=" + Date.now());
      if (!r.ok) throw new Error("Les annonces ne sont pas joignables (" + r.status + ").");
      rows = L.parseCSV(await r.text()).map(normalize);
    } else {
      const r = await fetch("data/annonces.csv", { cache: "no-store" });
      rows = r.ok ? L.parseCSV(await r.text()).map(normalize) : [];
      const deleted = store.get("demo_deleted", []);
      const patches = store.get("demo_patches", {});
      rows = rows.filter((l) => !deleted.includes(l.id)).map((l) => Object.assign(l, patches[l.id] || {}));
      rows = rows.concat(store.get("demo_listings", []).map(normalize));
    }
    listingsCache = rows.filter((l) => l.id && l.titre && l.statut !== "masquee" && l.statut !== "supprimee");
    return listingsCache;
  };
  L.getAllForOwner = async function () { listingsCache = null; return L.getListings(true); };

  L.api = async function (action, data) {
    const s = L.session();
    if (DEMO) return demoApi(action, data || {}, s);
    const isPublic = action === "contact";
    if (isPublic) {
      const r = await fetch(CFG.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ action }, data || {})) });
      const out = await r.json().catch(() => ({ ok: false, error: "Réponse illisible du serveur." }));
      if (!out.ok) throw new Error(out.error || "Erreur inconnue.");
      return out;
    }
    if (!s) throw Object.assign(new Error("Connectez-vous pour continuer."), { code: "auth" });
    if (!L.tokenValid(s)) throw Object.assign(new Error("Votre session Google a expiré. Reconnectez-vous."), { code: "reauth" });
    const r = await fetch(CFG.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ action, idToken: s.idToken }, data || {})) });
    let out; try { out = await r.json(); } catch (_) { throw new Error("Réponse illisible du serveur. Vérifiez l'URL API_URL."); }
    if (!out.ok) throw Object.assign(new Error(out.error || "Erreur inconnue."), { code: out.code || "" });
    if (/Listing|createListing|deleteListing|updateListing/.test(action)) listingsCache = null;
    return out;
  };

  /* --- mode démo : imite le script Google Apps Script dans le navigateur --- */
  function demoApi(action, d, s) {
    const need = () => { if (!s) throw Object.assign(new Error("Connectez-vous pour continuer."), { code: "auth" }); return s; };
    const users = store.get("demo_users", {});
    const now = new Date().toISOString();
    switch (action) {
      case "login": {
        need(); const u = users[s.id] || { id: s.id, email: s.email, nom: s.name, role: "", date: now };
        if (d.role && !u.role) u.role = d.role; users[s.id] = u; store.set("demo_users", users); return { ok: true, user: u };
      }
      case "setRole": { need(); const u = users[s.id] || { id: s.id, email: s.email, nom: s.name }; u.role = d.role; users[s.id] = u; store.set("demo_users", users); return { ok: true, user: u }; }
      case "createListing": {
        need(); const list = store.get("demo_listings", []);
        const l = Object.assign({}, d.listing, { id: "d" + Date.now().toString(36), proprietaire_id: s.id, proprietaire_nom: s.name, statut: "active", exemple: "", date: now, photos: (d.photos || []).join("|") });
        list.push(l);
        if (!store.set("demo_listings", list)) { l.photos = ""; list[list.length - 1] = l; store.set("demo_listings", list); }
        listingsCache = null; return { ok: true, id: l.id };
      }
      case "updateListing": {
        need(); const list = store.get("demo_listings", []); const l = list.find((x) => x.id === d.id);
        if (l) { if (l.proprietaire_id !== s.id) throw new Error("Cette annonce ne vous appartient pas."); Object.assign(l, d.fields); store.set("demo_listings", list); }
        listingsCache = null; return { ok: true };
      }
      case "deleteListing": {
        need(); let list = store.get("demo_listings", []); const l = list.find((x) => x.id === d.id);
        if (l && l.proprietaire_id !== s.id) throw new Error("Cette annonce ne vous appartient pas.");
        store.set("demo_listings", list.filter((x) => x.id !== d.id)); listingsCache = null; return { ok: true };
      }
      case "myListings": {
        need(); return { ok: true, csv: null, listings: store.get("demo_listings", []).filter((x) => x.proprietaire_id === s.id) };
      }
      case "toggleFavorite": {
        need(); const f = store.get("demo_favs_" + s.id, []); const i = f.indexOf(d.annonceId);
        if (i >= 0) f.splice(i, 1); else f.push(d.annonceId); store.set("demo_favs_" + s.id, f); return { ok: true, favorite: i < 0, favorites: f };
      }
      case "myFavorites": { need(); return { ok: true, favorites: store.get("demo_favs_" + s.id, []) }; }
      case "sendRequest": {
        need(); const all = store.get("demo_requests", []);
        all.push({ id: "r" + Date.now().toString(36), annonce_id: d.annonceId, annonce_titre: d.annonceTitre || "", proprietaire_id: d.proprietaireId || "", locataire_id: s.id, locataire_nom: s.name, locataire_email: s.email, telephone: d.telephone || "", date_souhaitee: d.date || "", message: d.message || "", date: now, statut: "nouvelle" });
        store.set("demo_requests", all); return { ok: true };
      }
      case "myRequests": {
        need(); const all = store.get("demo_requests", []);
        return { ok: true, received: all.filter((r) => r.proprietaire_id === s.id), sent: all.filter((r) => r.locataire_id === s.id) };
      }
      case "contact": { const m = store.get("demo_messages", []); m.push(Object.assign({ date: now }, d)); store.set("demo_messages", m); return { ok: true }; }
      default: throw new Error("Action inconnue : " + action);
    }
  }

  /* ================= favoris ================= */
  L.favs = () => store.get("favs", []);
  L.loadFavs = async function () {
    const s = L.session(); if (!s) return [];
    try { const o = await L.api("myFavorites"); store.set("favs", o.favorites || []); return o.favorites || []; } catch (_) { return L.favs(); }
  };
  L.toggleFav = async function (id, btn) {
    const s = L.session();
    if (!s) { location.href = "connexion.html?msg=" + encodeURIComponent("Connectez-vous pour enregistrer vos maisons préférées.") + "&next=" + encodeURIComponent(location.pathname.split("/").pop() + location.search); return; }
    const cur = L.favs(); const on = !cur.includes(id);
    store.set("favs", on ? cur.concat(id) : cur.filter((x) => x !== id));
    if (btn) btn.setAttribute("aria-pressed", on);
    try { const o = await L.api("toggleFavorite", { annonceId: id }); store.set("favs", o.favorites || L.favs()); L.toast(on ? "Ajoutée à vos favoris" : "Retirée de vos favoris"); }
    catch (e) { store.set("favs", cur); if (btn) btn.setAttribute("aria-pressed", !on); L.handleError(e); }
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-fav]"); if (!b) return;
    e.preventDefault(); e.stopPropagation(); L.toggleFav(b.dataset.fav, b);
  });

  L.handleError = function (e) {
    if (e && (e.code === "reauth" || e.code === "auth")) {
      L.modal(`<h3>Reconnexion nécessaire</h3><p>${esc(e.message)}</p><a class="btn btn-primary" href="connexion.html?next=${encodeURIComponent(location.pathname.split("/").pop() + location.search)}">Se reconnecter</a>`);
    } else L.toast((e && e.message) || "Une erreur est survenue.");
  };
  L.modal = function (html) {
    let m = $("#modal");
    if (!m) { m = document.createElement("div"); m.id = "modal"; m.className = "modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); document.body.appendChild(m); m.addEventListener("click", (e) => { if (e.target === m || e.target.closest("[data-close]")) m.classList.remove("open"); }); }
    m.innerHTML = `<div class="modal-box">${html}<button class="btn btn-ghost" data-close type="button">Fermer</button></div>`;
    m.classList.add("open");
    return m;
  };
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { const m = $("#modal"); m && m.classList.remove("open"); } });

  /* ================= cartes ================= */
  L.card = function (l, opt) {
    opt = opt || {};
    const favOn = L.favs().includes(l.id);
    const where = [l.quartier, l.ville].filter(Boolean).join(", ");
    return `<article class="card">
      <div class="card-media">
        <img src="${esc(L.thumb(L.photoOf(l)))}" alt="${esc(l.type)} à ${esc(l.ville)}" loading="lazy" decoding="async">
        <div class="card-badges"><span class="badge badge-green">À louer</span>${l.exemple ? '<span class="badge badge-dark">Exemple</span>' : ""}</div>
        <button class="fav" type="button" data-fav="${esc(l.id)}" aria-pressed="${favOn}" aria-label="Ajouter aux favoris">${L.icon("heart")}</button>
        ${opt.rank ? `<span class="badge badge-sun rank num">N° ${opt.rank} des prix les plus bas</span>` : ""}
      </div>
      <div class="card-body">
        <h3 class="card-title"><a href="annonce.html?id=${encodeURIComponent(l.id)}">${esc(l.titre)}</a></h3>
        <div class="loc">${L.icon("pin")}${esc(where)}, HT</div>
        <div class="price num">${L.money(l.prix)} <small>/ ${L.periodLabel(l.periode)}</small></div>
        <div class="specs num">
          ${l.type === "Terrain" ? "" : `<span>${L.icon("bed")}${l.chambres} ch.</span><span>${L.icon("bath")}${l.sdb} sdb</span>`}
          ${l.surface ? `<span>${L.icon("ruler")}${l.surface} m²</span>` : ""}
        </div>
        <div class="card-foot"><a class="btn btn-primary btn-sm" href="annonce.html?id=${encodeURIComponent(l.id)}">Voir détails ${L.icon("arrow")}</a></div>
      </div>
    </article>`;
  };

  /* ================= en-tête & pied de page ================= */
  function header() {
    const page = document.body.dataset.page || "";
    const s = L.session();
    const cur = (p) => (page === p ? ' aria-current="page"' : "");
    const userBlock = s
      ? `<a class="user-chip" href="espace.html" title="Mon espace">${s.picture ? `<img class="avatar" src="${esc(s.picture)}" alt="" referrerpolicy="no-referrer">` : `<span class="avatar">${esc((s.name || "?")[0].toUpperCase())}</span>`}<span class="hide-sm">${esc((s.name || "").split(" ")[0])}</span></a>`
      : `<a class="btn btn-primary" href="connexion.html">${L.icon("login")}<span>Se connecter</span></a>`;
    return `<div class="container"><div class="header-bar">
      <a class="logo" href="index.html" aria-label="LakayRent, accueil">${L.logoMark}<span><span class="logo-name">Lakay<span>Rent</span></span><span class="logo-tag">Louez malin, vivez mieux</span></span></a>
      <nav class="main-nav" id="mainNav" aria-label="Navigation principale">
        <a class="nav-link" href="index.html"${cur("home")}>${L.icon("home")}Accueil</a>
        <div class="dropdown" id="ddMaisons">
          <button class="nav-link" type="button" aria-expanded="false"${cur("annonces")}>${L.icon("house")}Maisons ${L.icon("chevron")}</button>
          <div class="dropdown-menu">
            <a href="annonces.html">${L.icon("search")}Toutes les annonces</a>
            ${L.TYPES.map((t) => `<a href="annonces.html?type=${encodeURIComponent(t.v)}">${L.icon(t.icon)}${t.pl}</a>`).join("")}
          </div>
        </div>
        <a class="nav-link" href="a-propos.html"${cur("apropos")}>${L.icon("info")}À propos</a>
        <a class="nav-link" href="carte.html"${cur("carte")}>${L.icon("map")}Carte des prix</a>
        <a class="nav-link" href="a-propos.html#contact">${L.icon("mail")}Contact</a>
        <a class="nav-link mobile-only" href="espace.html#favoris">${L.icon("heart")}Mes favoris</a>
        <a class="nav-link mobile-only" href="${s ? "espace.html" : "connexion.html?role=proprietaire"}">${L.icon("key")}Espace Propriétaire</a>
      </nav>
      <div class="header-actions">
        <a class="icon-btn hide-sm" href="espace.html#favoris" aria-label="Mes favoris">${L.icon("heart")}</a>
        <a class="btn btn-outline hide-sm" href="${s ? "espace.html" : "connexion.html?role=proprietaire"}">${L.icon("user")}Espace Propriétaire</a>
        ${userBlock}
        <button class="icon-btn burger" type="button" id="burger" aria-label="Ouvrir le menu" aria-expanded="false">${L.icon("menu")}</button>
      </div>
    </div></div>`;
  }
  function footer() {
    const soc = [["facebook", CFG.FACEBOOK_URL, "Facebook"], ["youtube", CFG.YOUTUBE_URL, "YouTube"], ["whatsapp", CFG.WHATSAPP_URL, "WhatsApp"]].filter((x) => x[1]);
    return `<svg class="wave" viewBox="0 0 1440 40" preserveAspectRatio="none" aria-hidden="true"><path d="M0 40V22C180 2 360 0 540 14s360 26 540 12 270-24 360-20v34z" fill="#13296B"/></svg>
    <div class="container">
      <div class="footer-top"><div class="tagline">LakayRent, plus qu'un site… une solution pour tous !</div>
        <div class="socials">${soc.map(([i, u, n]) => `<a href="${esc(u)}" aria-label="${n}" rel="noopener" target="_blank">${L.icon(i)}</a>`).join("")}${L.flag}</div></div>
      <div class="footer-cols">
        <div><h4>LakayRent</h4><p>Des propriétaires en Haïti louent leurs maisons, appartements, villas et terrains à des locataires du monde entier. Les annonces sont classées du loyer le plus bas au plus élevé.</p></div>
        <div><h4>Louer</h4><a href="annonces.html">Toutes les annonces</a><a href="annonces.html?periode=mois">Location au mois</a><a href="annonces.html?periode=nuit">Location à la nuit</a><a href="carte.html">Carte des prix</a></div>
        <div><h4>Propriétaires</h4><a href="connexion.html?role=proprietaire">Créer mon compte</a><a href="espace.html#publier">Publier une annonce</a><a href="a-propos.html#aide">Conseils</a></div>
        <div><h4>Aide</h4><a href="a-propos.html#aide">Questions fréquentes</a><a href="a-propos.html#contact">Nous contacter</a><a href="a-propos.html">À propos</a><a href="confidentialite.html">Confidentialité</a></div>
      </div>
      <svg class="skyline" viewBox="0 0 1200 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 60V40l60-14 50 10 70-22 60 18 40-8 20-10 10-14h4l2-8 2 8h4l10 14 20 10 40 8 30-10 50 6 60-20 80 18 70-12 60 10 80-16 70 14 60-6 70 10 80-18 60 16 40-6v52z" fill="#fff"/></svg>
      <div class="copy"><span>© ${new Date().getFullYear()} LakayRent · Haïti · Photos : <a href="https://unsplash.com" target="_blank" rel="noopener" style="color:inherit">Unsplash</a></span><span>${DEMO ? "Mode démo : les données restent dans votre navigateur" : "Connexion sécurisée avec Google"}</span></div>
    </div>`;
  }
  function mountChrome() {
    const h = $("#site-header"); if (h) { h.className = "site-header"; h.innerHTML = header(); }
    const f = $("#site-footer"); if (f) { f.className = "site-footer"; f.innerHTML = footer(); }
    const dd = $("#ddMaisons");
    if (dd) {
      const b = dd.querySelector("button");
      b.addEventListener("click", (e) => { e.stopPropagation(); const o = dd.classList.toggle("open"); b.setAttribute("aria-expanded", o); });
      document.addEventListener("click", () => { dd.classList.remove("open"); b.setAttribute("aria-expanded", "false"); });
    }
    const burger = $("#burger");
    if (burger) burger.addEventListener("click", () => { const o = $("#mainNav").classList.toggle("open"); burger.setAttribute("aria-expanded", o); });
  }
  L.refreshHeader = mountChrome;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountChrome); else mountChrome();
})();
