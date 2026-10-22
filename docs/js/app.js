(() => {
  const { sections, reviews, pamphlets, philo = [], dates = [], dateGroups = [], expos = [], riddles = [], tf = [] } = window.SITE;
  const app = document.getElementById("app");
  document.getElementById("year").textContent = new Date().getFullYear();
  const fl = document.getElementById("frise-link"); if (fl) fl.hidden = false;

  const esc = s => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const paras = t => t.trim().split(/\n\s*\n/).map(p => `<p>${esc(p).replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/\n/g, "<br>")}</p>`).join("");
  const plain = t => t.replace(/\s+/g, " ").trim();

  // note de l'utilisateur : modifiable, mémorisée dans le navigateur
  const getRating = r => {
    try { const v = localStorage.getItem("rating:" + r.id); if (v) return +v; } catch (e) {}
    return r.rating;
  };
  const setRating = (r, v) => { try { localStorage.setItem("rating:" + r.id, v); } catch (e) {} };

  const stars = (n, input) => Array.from({ length: 5 }, (_, i) =>
    `<button type="button" class="star ${i < n ? "on" : ""}" ${input ? `data-v="${i + 1}" aria-label="${i + 1} sur 5"` : "tabindex='-1' aria-hidden='true'"}>★</button>`
  ).join("");

  const home = () => `
    <p class="eyebrow">Littérature</p>
    <h1>Sola Scriptura</h1>
    <p class="lead">Un lieu simple pour rassembler tout ce que j'écris : lectures, réflexions, textes.</p>
    ${streakHtml()}
    <div class="sections">
      ${sections.map(s => `
        <${s.soon ? "div" : "a"} class="tile ${s.soon ? "soon" : ""}" ${s.soon ? "" : `href="${s.href}"`}>
          ${s.soon ? '<p class="eyebrow">Bientôt</p>' : ""}
          <h2>${esc(s.title)}</h2><p>${esc(s.blurb)}</p>
        </${s.soon ? "div" : "a"}>`).join("")}
    </div>`;

  const norm = s => s.replace(/œ/g, "oe").replace(/æ/g, "ae").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  // "Août 2025" -> { month: 8, year: 2025 }
  const parseDate = d => ({
    month: MONTHS.findIndex(m => norm(m) === norm((d.match(/[A-Za-zÀ-ÿ]+/) || [""])[0])) + 1,
    year: +((d.match(/\d{4}/) || [0])[0])
  });
  reviews.forEach(r => Object.assign(r, parseDate(r.date)));

  const reviewRows = list => list.length ? list.map(r => `
        <a class="entry compact" href="#/carnet/${r.id}">
          <h3>${esc(r.title)}</h3>
          <p class="by">${[r.author && `<em>${esc(r.author)}</em>`, r.date && esc(r.date)].filter(Boolean).join(" · ")}</p>
        </a>`).join("") : `<p class="empty"><em>Aucun commentaire trouvé.</em></p>`;

  const monthOpts = [...new Set(reviews.map(r => r.month).filter(Boolean))].sort((x, y) => x - y)
    .map(m => `<option value="${m}">${MONTHS[m - 1]}</option>`).join("");
  const yearOpts = [...new Set(reviews.map(r => r.year).filter(Boolean))].sort((x, y) => y - x)
    .map(y => `<option value="${y}">${y}</option>`).join("");

  // ---------- Test ta mémoire ----------
  const LEVELS = ["Facile", "Assez facile", "Moyen", "Difficile", "Très difficile"];
  const lev = (a, b) => {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  };
  const tokens = s => norm(s).replace(/(\d)\s+(?=\d)/g, "$1").split(/[^a-z0-9]+/).filter(Boolean);
  // bonne réponse = tous les mots d'un groupe sont présents (à une faute de frappe près)
  const isRight = (answer, q) => {
    const toks = tokens(answer);
    const has = k => /^\d+$/.test(k)
      ? toks.some(t => t.replace(/[a-z]+$/, "") === k)
      : toks.some(t => lev(t, k) <= (k.length >= 8 ? 2 : k.length >= 5 ? 1 : 0));
    return q.k.some(group => group.every(w => has(norm(w))));
  };
  const todayKey = () => { const t = new Date(); return t.getFullYear() + "-" + (t.getMonth() + 1) + "-" + t.getDate(); };
  // ---------- Série de jours consécutifs ----------
  const STREAK_KEY = "streak:days";
  const dayIdx = key => { const [y, m, d] = key.split("-").map(Number); return Math.floor(Date.UTC(y, m - 1, d) / 864e5); };
  const todayIdx = () => dayIdx(todayKey());
  const playedDays = () => { try { return new Set((JSON.parse(localStorage.getItem(STREAK_KEY)) || []).map(dayIdx)); } catch (e) { return new Set(); } };
  const MILESTONES = [3, 7, 14, 30, 60, 100, 200, 365];
  const streakInfo = () => {
    const set = playedDays(), t = todayIdx();
    const today = set.has(t);
    let cur = 0, i = today ? t : t - 1;
    while (set.has(i)) { cur++; i--; }
    const all = [...set].sort((a, b) => a - b);
    let best = 0, run = 0, prev = null;
    all.forEach(d => { run = prev !== null && d === prev + 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; });
    const last7 = Array.from({ length: 7 }, (_, n) => { const d = t - 6 + n; return { played: set.has(d), today: d === t, label: ["D", "L", "M", "M", "J", "V", "S"][new Date(d * 864e5).getUTCDay()] }; });
    const next = MILESTONES.find(m => m > cur) || cur + 100, prevM = [0, ...MILESTONES].filter(m => m <= cur).pop();
    return { cur, best: Math.max(best, cur), today, last7, next, pct: Math.round(100 * (cur - prevM) / (next - prevM)), total: set.size };
  };
  const streakHtml = () => {
    const x = streakInfo();
    const title = x.cur === 0 ? "Lance ta série !" : `${x.cur} jour${x.cur > 1 ? "s" : ""} de suite`;
    const sub = x.today ? "✓ Série prolongée aujourd'hui" : x.cur ? "Joue aujourd'hui pour ne pas la perdre !" : "Un jeu aujourd'hui, et ta série commence.";
    return `<div class="streak" aria-label="Série de jours consécutifs">
      <div class="streak-main"><span class="flame" aria-hidden="true">${x.cur ? "🔥" : "✦"}</span>
        <div><strong>${title}</strong><span>${sub}</span></div>
        <div class="days" aria-hidden="true">${x.last7.map(d => `<i class="${d.played ? "on" : ""} ${d.today ? "today" : ""}" title="${d.label}"><b>${d.label}</b></i>`).join("")}</div></div>
      <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${x.next}" aria-valuenow="${x.cur}"><i style="width:${x.pct}%"></i></div>
      <p>Prochain palier : <b>${x.next} jours</b> · Record : <b>${x.best}</b> · ${x.total} jour${x.total > 1 ? "s" : ""} joué${x.total > 1 ? "s" : ""} au total</p></div>`;
  };
  const refreshStreak = () => document.querySelectorAll(".streak").forEach(el => { el.outerHTML = streakHtml(); });
  const markPlayed = () => {
    try {
      const days = JSON.parse(localStorage.getItem(STREAK_KEY)) || [], k = todayKey();
      if (!days.includes(k)) { days.push(k); localStorage.setItem(STREAK_KEY, JSON.stringify(days.slice(-800))); }
    } catch (e) {}
    refreshStreak();
  };

  const dayBook = () => {
    const pool = reviews.filter(r => (r.quiz || []).length >= 5);
    if (!pool.length) return null;
    const t = new Date();
    return pool[Math.floor(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / 864e5) % pool.length];
  };
  const sentences = r => r.text.replace(/\*/g, "").split(/\n\s*\n/).flatMap(p => p.split(/(?<=[.!?…])\s+(?=[A-ZÉÈÀÂ«])/))
    .map(s => s.trim()).filter(s => s.length >= 45 && s.length <= 300);

  // Dans la citation du jeu bonus, le titre du livre et les noms propres du titre (Dormillouse, Aigoual,
  // Hiver Solidaire…) sont remplacés par « ... ». On peut ajouter des mots à masquer avec `hide: [...]` dans les données.
  const fold = s => Array.from(s, c => (c.normalize("NFD")[0] || c).toLowerCase()).join("").replace(/[’‘`]/g, "'");
  const STOP = new Set("le la les un une des du de au aux ont est pas qui que et en dans par pour sur ce cette son ses mon ma mes nos vos avec sans sous mais ou où".split(" "));
  const hideCache = new Map();
  const hiddenTerms = r => {
    if (hideCache.has(r.id)) return hideCache.get(r.id);
    const text = r.text.replace(/\*/g, ""), f = fold(text);
    const words = [...new Set(fold(r.title).split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !STOP.has(w)))];
    // un mot du titre est masqué s'il s'écrit avec une majuscule en milieu de phrase (nom propre)
    const proper = words.filter(w => {
      for (const m of f.matchAll(new RegExp("(?<![a-z0-9])" + w, "g"))) {
        const prev = text.slice(0, m.index).trimEnd().slice(-1);
        if (prev && !/[.!?…]/.test(prev) && text[m.index] !== text[m.index].toLowerCase()) return true;
      }
      return false;
    });
    const terms = [fold(r.title), ...proper, ...(r.hide || []).map(fold)];
    hideCache.set(r.id, terms);
    return terms;
  };
  const maskSentence = (r, s) => {
    const f = fold(s), spans = [];
    hiddenTerms(r).forEach(t => {
      const re = new RegExp("(?<![a-z0-9])" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+") + "(?:s|x)?(?![a-z0-9])", "g");
      for (const m of f.matchAll(re)) spans.push([m.index, m.index + m[0].length]);
    });
    spans.sort((x, y) => x[0] - y[0]);
    const merged = [];
    spans.forEach(sp => {
      const last = merged[merged.length - 1];
      if (last && sp[0] <= last[1] + 1 && /^[\s-]*$/.test(s.slice(last[1], sp[0]))) last[1] = Math.max(last[1], sp[1]);
      else if (!last || sp[0] >= last[1]) merged.push([...sp]);
    });
    let out = "", at = 0;
    merged.forEach(([i, j]) => { out += s.slice(at, i) + "..."; at = j; });
    return out + s.slice(at);
  };

  // Tirage du jeu bonus : toutes les phrases de tous les commentaires sont mélangées dans un « sac ».
  // Un commentaire long contient plus de phrases, donc sort plus souvent (pondération par la longueur),
  // mais une phrase ne revient qu'une fois le sac vidé. Le sac est mémorisé entre deux parties.
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pickBonus = () => {
    const all = reviews.flatMap(r => sentences(r).map((s, i) => ({ key: r.id + "|" + i, r, s })));
    if (!all.length) return null;
    const byKey = new Map(all.map(x => [x.key, x]));
    // Le sac est reconstruit si la liste des phrases n'a jamais été mémorisée (première visite avec cette version) ;
    // ensuite, les phrases ajoutées plus tard (nouveau livre) sont glissées au hasard dans le sac en cours.
    const known = store.get("bonus:sknown", null);
    let bag = known ? store.get("bonus:sbag", []).filter(k => byKey.has(k)) : [];
    if (known) {
      const seen = new Set(known);
      [...byKey.keys()].filter(k => !seen.has(k)).forEach(k => bag.splice(Math.floor(Math.random() * (bag.length + 1)), 0, k));
    }
    store.set("bonus:sknown", [...byKey.keys()]);
    if (!bag.length) {
      const last = store.get("bonus:slast", "");
      bag = shuffle([...byKey.keys()]);
      if (bag.length > 1 && bag[0] === last) bag.push(bag.shift());
    }
    const key = bag.shift();
    store.set("bonus:sbag", bag); store.set("bonus:slast", key);
    return byKey.get(key);
  };

  // Score du jour (null tant que les 5 questions n'ont pas été faites aujourd'hui).
  let scoreToday = null;
  const doneToday = () => {
    if (scoreToday !== null) return scoreToday;
    try { const v = localStorage.getItem("quiz:" + todayKey()); if (v !== null) return +v; } catch (e) {}
    return null;
  };
  const bannerHtml = () => {
    const book = dayBook(), done = doneToday();
    return `<button type="button" class="quiz-banner" id="quiz-start">
        <span class="spark">✦</span>
        <span class="qtxt"><strong>Test ta mémoire !</strong>
        <em>${done === null ? `Aujourd'hui, ${esc(book.title)} !` : `Fait aujourd'hui : ${done} / 5 — le jeu bonus reste ouvert`}</em></span>
        <span class="go">${done === null ? "Jouer →" : "Jeu bonus →"}</span>
      </button>`;
  };
  const quizHtml = () => dayBook() ? `<section class="quiz" id="quiz" aria-live="polite">${bannerHtml()}</section>` : "";

  function initQuiz() {
    const box = document.getElementById("quiz");
    if (!box) return;
    const book = dayBook();
    const start = () => { box.querySelector("#quiz-start").onclick = () => doneToday() === null ? askQuestion(0, []) : bonus(0, 0); };
    start();

    const frame = inner => { box.innerHTML = `<div class="quiz-card">${inner}</div>`; };

    function askQuestion(i, answers) {
      const q = book.quiz[i];
      frame(`
        <div class="quiz-top"><span class="eyebrow">Livre du jour : <em>${esc(book.title)}</em></span>
          <button type="button" class="link" id="quiz-close">Fermer</button></div>
        <div class="dots">${book.quiz.slice(0, 5).map((_, n) => `<i class="${n < i ? "done" : n === i ? "now" : ""}"></i>`).join("")}</div>
        <p class="level">Question ${i + 1} / 5 · ${LEVELS[i]}</p>
        <h2 class="qtitle">${esc(q.q)}</h2>
        <form id="quiz-form"><input id="quiz-answer" type="text" autocomplete="off" autocapitalize="off" placeholder="Ta réponse…" aria-label="Ta réponse">
        <button type="submit" class="btn">${i === 4 ? "Voir mon score" : "Valider"}</button></form>`);
      box.querySelector("#quiz-close").onclick = reset;
      const input = box.querySelector("#quiz-answer"); input.focus();
      box.querySelector("#quiz-form").onsubmit = e => {
        e.preventDefault();
        const next = [...answers, input.value.trim()];
        i < 4 ? askQuestion(i + 1, next) : showScore(next);
      };
    }

    function showScore(answers) {
      const res = book.quiz.slice(0, 5).map((q, n) => ({ q, a: answers[n], ok: isRight(answers[n], q) }));
      const score = res.filter(x => x.ok).length;
      scoreToday = score;
      try { localStorage.setItem("quiz:" + todayKey(), score); } catch (e) {}
      markPlayed();
      const msg = ["Il faut relire tes commentaires !", "Aïe… relis-moi ça.", "Pas mal, mais tu peux mieux faire.", "Bien joué, la mémoire est là.", "Très bien, presque parfait !", "Sans faute, mémoire d'éléphant !"][score];
      frame(`
        <div class="quiz-top"><span class="eyebrow">Livre du jour : <em>${esc(book.title)}</em></span>
          <button type="button" class="link" id="quiz-close">Fermer</button></div>
        <p class="level">Ton score</p>
        <div class="bigscore">${score}<small> / 5</small></div>
        <p class="msg"><em>${msg}</em></p>
        <ol class="recap">${res.map(x => `
          <li class="${x.ok ? "ok" : "ko"}"><span class="mark">${x.ok ? "✓" : "✗"}</span>
            <div><strong>${esc(x.q.q)}</strong>
            <span>Ta réponse : <em>${x.a ? esc(x.a) : "—"}</em></span>
            ${x.ok ? "" : `<span>Bonne réponse : <b>${esc(x.q.r)}</b></span>`}</div></li>`).join("")}</ol>
        <button type="button" class="btn" id="quiz-bonus">Jeu bonus →</button>`);
      box.querySelector("#quiz-close").onclick = reset;
      box.querySelector("#quiz-bonus").onclick = () => bonus(0, 0);
    }

    // jeu bonus : une phrase tirée au hasard dans tous les commentaires
    function bonus(played, won, last) {
      const pick = pickBonus();
      if (!pick) return reset();
      frame(`
        <div class="quiz-top"><span class="eyebrow">Jeu bonus · <em>Devine le livre</em></span>
          <button type="button" class="link" id="quiz-close">Terminer</button></div>
        ${last ? `<p class="last ${last.good ? "ok" : "ko"}">${last.good ? "✓ Bravo, c'était bien « " : "✗ Raté, c'était « "}${esc(last.title)} »</p>` : ""}
        <p class="level">De quel commentaire vient cette phrase ?</p>
        <blockquote class="guess">« ${esc(maskSentence(pick.r, pick.s))} »</blockquote>
        <form class="guess-search" id="guess-form" autocomplete="off">
          <input id="guess-input" type="search" placeholder="Cherche le livre (titre ou auteur), puis Entrée…" aria-label="Cherche le livre">
          <ul class="suggest" id="guess-list" hidden></ul>
        </form>
        ${played ? `<p class="tally">Bonus : ${won} / ${played}</p>` : ""}`);
      box.querySelector("#quiz-close").onclick = reset;
      const input = box.querySelector("#guess-input"), list = box.querySelector("#guess-list");
      input.focus();
      let matches = [];

      // on valide la réponse et on enchaîne tout de suite sur la citation suivante
      const answer = r => {
        const good = r.id === pick.r.id;
        markPlayed();
        bonus(played + 1, won + (good ? 1 : 0), { good, title: pick.r.title });
      };

      input.addEventListener("input", () => {
        const q = norm(input.value.trim());
        matches = q ? reviews.filter(r => norm(r.title + " " + r.author).includes(q)) : [];
        // un titre écrit en entier passe en premier
        matches.sort((x, y) => (norm(y.title) === q) - (norm(x.title) === q));
        list.hidden = !q;
        list.innerHTML = matches.length
          ? matches.map((r, n) => `<li><button type="button" data-n="${n}"><strong>${esc(r.title)}</strong>${r.author ? `<em>${esc(r.author)}</em>` : ""}</button></li>`).join("")
          : `<li class="none"><em>Aucun livre trouvé.</em></li>`;
      });
      list.addEventListener("click", e => {
        const b = e.target.closest("button"); if (b) answer(matches[+b.dataset.n]);
      });
      box.querySelector("#guess-form").onsubmit = e => { e.preventDefault(); if (matches.length) answer(matches[0]); };
    }

    function reset() { box.innerHTML = bannerHtml(); start(); }
  }

  const carnet = () => `
    <a class="back" href="#/">← Accueil</a>
    <h1>Carnet II</h1>
    <p class="lead">Août 2025 - Aujourd'hui</p>
    ${streakHtml()}
    ${chronoBoxHtml()}
    ${quizHtml()}
    ${riddles.length >= 3 ? `<section class="quiz" id="riddle-game" aria-live="polite">${riddleBanner()}</section>` : ""}
    ${tf.length >= 10 ? `<section class="quiz" id="tf-game" aria-live="polite">${tfBanner()}</section>` : ""}
    <div class="filters">
      <input class="search" id="search" type="search" placeholder="Rechercher un titre, un mot…" aria-label="Rechercher un commentaire" autocomplete="off">
      <select id="f-month" aria-label="Mois"><option value="">Mois</option>${monthOpts}</select>
      <select id="f-year" aria-label="Année"><option value="">Année</option>${yearOpts}</select>
      <input class="author" id="f-author" type="search" placeholder="Auteur…" aria-label="Auteur : un prénom ou un nom" autocomplete="off">
    </div>
    <div class="list" id="results">${reviewRows(reviews)}</div>`;

  // ---------- Frise chronologique ----------
  const bookOf = id => reviews.find(r => r.id === id);
  const sortedDates = () => [...dates].sort((a, b) => a.y - b.y);
  const centuryLabel = y => { const c = Math.floor((y - 1) / 100) + 1; return ["", "Ier", "IIe", "IIIe", "IVe", "Ve", "VIe", "VIIe", "VIIIe", "IXe", "Xe", "XIe", "XIIe", "XIIIe", "XIVe", "XVe", "XVIe", "XVIIe", "XVIIIe", "XIXe", "XXe", "XXIe"][c] + " siècle"; };
  const shownYear = d => d.show || Math.floor(d.y);
  // Frise unique : seulement les dates issues des notes, regroupées par période sous des accolades
  const BRACE = '<svg class="brace" viewBox="0 0 100 14" preserveAspectRatio="none" aria-hidden="true"><path d="M1,13 C1,6 8,8 38,8 C46,8 48,5 50,1 C52,5 54,8 62,8 C92,8 99,6 99,13" fill="none" stroke="currentColor" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>';
  const friseHtml = () => {
    const notes = dates.filter(d => d.src === "notes").sort((a, b) => a.y - b.y);
    const groups = dateGroups.map(g => ({ ...g, items: notes.filter(d => d.g === g.id) })).filter(g => g.items.length);
    const cols = groups.map(g => `minmax(${Math.max(250, g.items.length * 92)}px, 1fr)`).join(" ");
    const list = g => `<ul class="tlg-list">${g.items.map(d => {
      const b = bookOf(d.b);
      return `<li><span class="tlg-y">${esc(String(shownYear(d)))}</span><div>${esc(d.e)}${b ? `<a href="#/carnet/${b.id}"><em>${esc(b.title)}</em></a>` : ""}</div></li>`;
    }).join("")}</ul>`;
    const cells = groups.map((g, i) => {
      const up = i % 2 === 0, col = i + 1;
      const top = up ? `<div class="tlg-cell tlg-top" style="grid-column:${col}"><h3>${esc(g.t)}</h3>${list(g)}${BRACE}</div>` : `<div style="grid-column:${col};grid-row:1"></div>`;
      const axis = `<div class="tlg-axis" style="grid-column:${col}">${g.items.map(d => `<span class="tk"><b>${esc(String(shownYear(d)))}</b><i></i></span>`).join("")}</div>`;
      const bot = up ? `<div style="grid-column:${col};grid-row:3"></div>` : `<div class="tlg-cell tlg-bot" style="grid-column:${col}">${BRACE}${list(g)}<h3>${esc(g.t)}</h3></div>`;
      return `${top}${axis}${bot}`;
    }).join("");
    return `<a class="back" href="#/">← Accueil</a>
    <h1>Frise chronologique</h1>
    <p class="lead">Toutes les dates de mes notes, sur une seule frise : les périodes rapprochées sont regroupées sous des accolades.</p>
    <p class="hint">Fais défiler la frise vers la droite →</p>
    <div class="tlh-wrap"><div class="tlh" style="grid-template-columns:${cols}">${cells}</div></div>
`;
  };
  const seeded = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const shuffleWith = (arr, rand) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // ---------- Qui suis-je ? et Vrai ou faux piégé (contenu tiré de mes notes, niveau difficile) ----------
  const dayNum = () => { const t = new Date(); return Math.floor(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / 864e5); };
  const dayScore = k => { try { const v = localStorage.getItem(k + ":" + todayKey()); return v === null ? null : +v; } catch (e) { return null; } };
  const saveDay = (k, v) => { try { localStorage.setItem(k + ":" + todayKey(), v); } catch (e) {} };
  const riddleBanner = () => { const d = dayScore("riddle"); return `<button type="button" class="quiz-banner" id="riddle-start">
      <span class="spark">?</span>
      <span class="qtxt"><strong>Qui suis-je ?</strong><em>${d === null ? "Trois énigmes, des indices qui se précisent" : `Fait aujourd'hui : ${d} points — rejouer avec d'autres énigmes`}</em></span>
      <span class="go">Jouer →</span></button>`; };
  const tfBanner = () => { const d = dayScore("tf"); return `<button type="button" class="quiz-banner" id="tf-start">
      <span class="spark">≠</span>
      <span class="qtxt"><strong>Vrai ou faux piégé</strong><em>${d === null ? "Dix affirmations, un détail truqué" : `Fait aujourd'hui : ${d} / 10 — rejouer avec d'autres affirmations`}</em></span>
      <span class="go">Jouer →</span></button>`; };
  const titleOf = id => { const r = reviews.find(x => x.id === id); if (r) return r.title; const e = expos.find(x => x.id === id); return e ? `${e.title} · ${e.place || "exposition"}` : ""; };

  function initRiddle() {
    const box = document.getElementById("riddle-game");
    if (!box) return;
    const start = () => { box.querySelector("#riddle-start").onclick = () => play(dayScore("riddle") === null); };
    start();
    const reset = () => { box.innerHTML = riddleBanner(); start(); };
    function play(daily) {
      const rand = daily ? seeded(dayNum() * 2654435 + 11) : Math.random;
      const rounds = shuffleWith(riddles, rand).slice(0, 3);
      let total = 0; const results = [];
      const frame = inner => { box.innerHTML = `<div class="quiz-card"><div class="quiz-top"><span class="eyebrow">Qui suis-je ? · <em>${daily ? "du jour" : "bonus"}</em></span>
        <button type="button" class="link" id="riddle-close">Fermer</button></div>${inner}</div>`; box.querySelector("#riddle-close").onclick = reset; };
      function ask(i, step) {
        const r = rounds[i], max = r.hints.length;
        frame(`<div class="dots">${rounds.map((_, n) => `<i class="${n < i ? "done" : n === i ? "now" : ""}"></i>`).join("")}</div>
          <p class="level">Énigme ${i + 1} / 3 · indice ${step + 1} / ${max} · <b>${max - step} point${max - step > 1 ? "s" : ""}</b> si tu trouves maintenant</p>
          <ol class="hints">${r.hints.slice(0, step + 1).map(h => `<li>${esc(h)}</li>`).join("")}</ol>
          <form id="riddle-form" autocomplete="off"><input id="riddle-answer" type="text" placeholder="Qui, ou quoi, suis-je ?" aria-label="Ta réponse">
            <button type="submit" class="btn">Valider</button>
            <button type="button" class="link" id="riddle-next">${step === max - 1 ? "Je donne ma langue au chat" : "Indice suivant →"}</button></form>
          <p class="gate-msg" id="riddle-msg"></p>`);
        const input = box.querySelector("#riddle-answer"); input.focus();
        const more = () => step === max - 1 ? reveal(i, 0) : ask(i, step + 1);
        box.querySelector("#riddle-next").onclick = more;
        box.querySelector("#riddle-form").onsubmit = e => {
          e.preventDefault();
          const a = input.value.trim();
          if (a && isRight(a, { k: r.k })) return reveal(i, max - step);
          box.querySelector("#riddle-msg").textContent = a ? "Non… un indice de plus (−1 point)." : "";
          if (a) setTimeout(more, 800);
        };
      }
      function reveal(i, pts) {
        const r = rounds[i]; total += pts; results.push({ r, pts });
        const last = i === rounds.length - 1;
        frame(`<p class="level">${pts ? `✓ Bravo, +${pts} point${pts > 1 ? "s" : ""}` : "✗ Raté, +0 point"}</p>
          <p class="riddle-ans"><strong>${esc(r.a)}</strong> <em>· ${esc(titleOf(r.b))}</em></p>
          <ol class="hints done">${r.hints.map(h => `<li>${esc(h)}</li>`).join("")}</ol>
          <div class="reflect-actions"><button type="button" class="btn" id="riddle-go">${last ? "Voir mon score" : "Énigme suivante →"}</button></div>`);
        box.querySelector("#riddle-go").onclick = () => last ? finish() : ask(i + 1, 0);
      }
      function finish() {
        markPlayed(); if (daily) saveDay("riddle", total);
        frame(`<p class="level">Ton score</p><div class="bigscore">${total}<small> / ${rounds.reduce((s, r) => s + r.hints.length, 0)}</small></div>
          <ol class="recap">${results.map(x => `<li class="${x.pts ? "ok" : "ko"}"><span class="mark">${x.pts}</span><div><strong>${esc(x.r.a)}</strong><span>${esc(titleOf(x.r.b))}</span></div></li>`).join("")}</ol>
          <div class="reflect-actions"><button type="button" class="btn" id="riddle-again">Trois autres énigmes</button></div>`);
        box.querySelector("#riddle-again").onclick = () => play(false);
      }
      ask(0, 0);
    }
  }

  function initTf() {
    const box = document.getElementById("tf-game");
    if (!box) return;
    const start = () => { box.querySelector("#tf-start").onclick = () => play(dayScore("tf") === null); };
    start();
    const reset = () => { box.innerHTML = tfBanner(); start(); };
    function play(daily) {
      const rand = daily ? seeded(dayNum() * 7368787 + 5) : Math.random;
      // une affirmation par fait : on évite de montrer la version vraie et la version truquée du même fait dans la même partie
      const pool = shuffleWith(tf, rand), seen = new Set(), picks = [];
      for (const x of pool) { if (!seen.has(x.g)) { seen.add(x.g); picks.push(x); } if (picks.length === 10) break; }
      const answers = [];
      const frame = inner => { box.innerHTML = `<div class="quiz-card"><div class="quiz-top"><span class="eyebrow">Vrai ou faux piégé · <em>${daily ? "du jour" : "bonus"}</em></span>
        <button type="button" class="link" id="tf-close">Fermer</button></div>${inner}</div>`; box.querySelector("#tf-close").onclick = reset; };
      function ask(i) {
        const x = picks[i];
        frame(`<div class="dots">${picks.map((_, n) => `<i class="${n < i ? "done" : n === i ? "now" : ""}"></i>`).join("")}</div>
          <p class="level">Affirmation ${i + 1} / ${picks.length} · lis bien chaque détail</p>
          <h2 class="qtitle">${esc(x.s)}</h2>
          <div class="reflect-actions"><button type="button" class="btn" data-v="1">Vrai</button><button type="button" class="btn alt" data-v="0">Faux</button></div>`);
        box.querySelectorAll("[data-v]").forEach(b => b.onclick = () => verdict(i, b.dataset.v === "1"));
      }
      function verdict(i, said) {
        const x = picks[i], ok = said === x.v; answers.push(ok);
        const last = i === picks.length - 1;
        frame(`<p class="level ${ok ? "ok" : "ko"}">${ok ? "✓ Bien vu" : "✗ Piégé !"} — c'était <b>${x.v ? "vrai" : "faux"}</b></p>
          <h2 class="qtitle">${esc(x.s)}</h2>
          <p class="tf-why">${esc(x.why)} <em>· ${esc(titleOf(x.b))}</em></p>
          <div class="reflect-actions"><button type="button" class="btn" id="tf-go">${last ? "Voir mon score" : "Suivante →"}</button></div>`);
        box.querySelector("#tf-go").onclick = () => last ? finish() : ask(i + 1);
      }
      function finish() {
        const sc = answers.filter(Boolean).length;
        markPlayed(); if (daily) saveDay("tf", sc);
        frame(`<p class="level">Ton score</p><div class="bigscore">${sc}<small> / ${picks.length}</small></div>
          <ol class="recap">${picks.map((x, n) => `<li class="${answers[n] ? "ok" : "ko"}"><span class="mark">${answers[n] ? "✓" : "✗"}</span><div><strong>${esc(x.s)}</strong><span>${x.v ? "Vrai" : "Faux"} — ${esc(x.why)}</span></div></li>`).join("")}</ol>
          <div class="reflect-actions"><button type="button" class="btn" id="tf-again">Dix autres affirmations</button></div>`);
        box.querySelector("#tf-again").onclick = () => play(false);
      }
      ask(0);
    }
  }


  // ---------- Défi chrono : les 3 jeux enchaînés en 2 minutes, note sur 30 ----------
  const CHRONO_SECONDS = 120;
  const chronoReady = () => dayBook() && riddles.length >= 3 && tf.length >= 10;
  const chronoBoxHtml = () => chronoReady() ? `<section class="quiz" id="chrono-game" aria-live="polite">${chronoBanner()}</section>` : "";
  const bestChrono = () => { try { const v = localStorage.getItem("chrono:best"); return v === null ? null : +v; } catch (e) { return null; } };
  const chronoBanner = () => {
    const best = bestChrono(), d = dayScore("chrono");
    return `<button type="button" class="quiz-banner" id="chrono-start">
      <span class="spark">⏱</span>
      <span class="qtxt"><strong>Défi chrono · 2 minutes</strong>
        <em>${d === null ? "Qui suis-je ?, Test ta mémoire et Vrai ou faux, notés sur 30" : `Aujourd'hui : ${d} / 30`}${best !== null ? ` · meilleur : ${best} / 30` : ""}</em></span>
      <span class="go">Relever le défi →</span></button>`;
  };
  function initChrono() {
    const box = document.getElementById("chrono-game");
    if (!box) return;
    const start = () => { box.querySelector("#chrono-start").onclick = intro; };
    start();
    const reset = () => { box.innerHTML = chronoBanner(); start(); };
    const mmss = ms => { const t = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"); };

    function intro() {
      box.innerHTML = `<div class="quiz-card">
        <div class="quiz-top"><span class="eyebrow">Défi chrono</span><button type="button" class="link" id="chrono-close">Fermer</button></div>
        <h2 class="qtitle">Trois jeux, 18 questions, ${CHRONO_SECONDS / 60} minutes.</h2>
        <ol class="hints"><li><b>Qui suis-je ?</b> · 3 énigmes · 15 points (5 à 1 point selon l'indice)</li>
          <li><b>Test ta mémoire</b> · 5 questions · 5 points</li>
          <li><b>Vrai ou faux piégé</b> · 10 affirmations · 10 points</li></ol>
        <p class="hint">Les questions sans réponse quand le temps est écoulé comptent zéro. Le chrono démarre au clic.</p>
        <div class="reflect-actions"><button type="button" class="btn" id="chrono-go">Lancer le chrono</button></div></div>`;
      box.querySelector("#chrono-close").onclick = reset;
      box.querySelector("#chrono-go").onclick = () => run(dayScore("chrono") === null);
    }

    function run(daily) {
      const rand = daily ? seeded(dayNum() * 48271 + 29) : Math.random;
      const book = dayBook();
      const items = [
        ...shuffleWith(riddles, rand).slice(0, 3).map(r => ({ type: "riddle", r })),
        ...book.quiz.slice(0, 5).map(q => ({ type: "quiz", q })),
        ...(() => { const seen = new Set(), out = []; for (const x of shuffleWith(tf, rand)) { if (!seen.has(x.g)) { seen.add(x.g); out.push({ type: "tf", x }); } if (out.length === 10) break; } return out; })()
      ];
      const res = items.map(() => ({ pts: 0, answered: false }));
      let i = 0, step = 0, over = false;
      const t0 = Date.now(), deadline = t0 + CHRONO_SECONDS * 1000;
      let timer = null;

      box.innerHTML = `<div class="quiz-card">
        <div class="chrono" id="chrono-bar"><span class="t" id="chrono-t">${mmss(CHRONO_SECONDS * 1000)}</span><div class="cbar"><i id="chrono-fill"></i></div><span class="n" id="chrono-n"></span></div>
        <div id="chrono-body"></div></div>`;
      const body = box.querySelector("#chrono-body"), tEl = box.querySelector("#chrono-t"), fill = box.querySelector("#chrono-fill"), bar = box.querySelector("#chrono-bar"), nEl = box.querySelector("#chrono-n");

      const tick = () => {
        const left = deadline - Date.now();
        tEl.textContent = mmss(left);
        fill.style.width = Math.max(0, 100 * left / (CHRONO_SECONDS * 1000)) + "%";
        bar.classList.toggle("warn", left < 30000); bar.classList.toggle("crit", left < 10000);
        if (left <= 0) finish();
      };
      timer = setInterval(tick, 200);

      const advance = () => { i++; step = 0; i >= items.length ? finish() : show(); };
      function show() {
        if (over) return;
        const it = items[i];
        nEl.textContent = `${i + 1} / ${items.length}`;
        if (it.type === "riddle") {
          const r = it.r, max = r.hints.length;
          body.innerHTML = `<p class="level">Qui suis-je ? · <b>${max - step} point${max - step > 1 ? "s" : ""}</b></p>
            <ol class="hints">${r.hints.slice(0, step + 1).map(h => `<li>${esc(h)}</li>`).join("")}</ol>
            <form id="c-form" autocomplete="off"><input id="c-in" type="text" placeholder="Qui, ou quoi, suis-je ?" aria-label="Ta réponse"><button type="submit" class="btn">Valider</button>
              <button type="button" class="link" id="c-next">${step === max - 1 ? "Passer" : "Indice suivant →"}</button></form>`;
          const input = body.querySelector("#c-in"); input.focus();
          const more = () => { if (step === max - 1) { res[i].answered = true; advance(); } else { step++; show(); } };
          body.querySelector("#c-next").onclick = more;
          body.querySelector("#c-form").onsubmit = e => { e.preventDefault(); const a = input.value.trim(); if (a && isRight(a, { k: r.k })) { res[i] = { pts: max - step, answered: true, a }; advance(); } else if (a) more(); };
        } else if (it.type === "quiz") {
          body.innerHTML = `<p class="level">Test ta mémoire · ${esc(book.title)}</p><h2 class="qtitle">${esc(it.q.q)}</h2>
            <form id="c-form" autocomplete="off"><input id="c-in" type="text" placeholder="Ta réponse…" aria-label="Ta réponse"><button type="submit" class="btn">Valider</button></form>`;
          const input = body.querySelector("#c-in"); input.focus();
          body.querySelector("#c-form").onsubmit = e => { e.preventDefault(); const a = input.value.trim(); res[i] = { pts: a && isRight(a, it.q) ? 1 : 0, answered: true, a }; advance(); };
        } else {
          body.innerHTML = `<p class="level">Vrai ou faux piégé · lis bien chaque détail</p><h2 class="qtitle">${esc(it.x.s)}</h2>
            <div class="reflect-actions"><button type="button" class="btn" data-v="1">Vrai</button><button type="button" class="btn alt" data-v="0">Faux</button></div>`;
          body.querySelectorAll("[data-v]").forEach(b => b.onclick = () => { const said = b.dataset.v === "1"; res[i] = { pts: said === it.x.v ? 1 : 0, answered: true, said }; advance(); });
        }
      }

      function finish() {
        if (over) return; over = true; clearInterval(timer);
        const used = Math.min(CHRONO_SECONDS * 1000, Date.now() - t0), left = Math.max(0, deadline - Date.now());
        const sum = type => res.reduce((s, r, n) => s + (items[n].type === type ? r.pts : 0), 0);
        const sR = sum("riddle"), sQ = sum("quiz"), sT = sum("tf"), total = sR + sQ + sT;
        const done = res.filter(r => r.answered).length;
        markPlayed();
        if (daily) saveDay("chrono", total);
        let isBest = false;
        try { const b = bestChrono(); if (b === null || total > b) { localStorage.setItem("chrono:best", total); isBest = true; } } catch (e) {}
        const msg = total >= 26 ? "Mémoire d'exception !" : total >= 20 ? "Très solide." : total >= 14 ? "Bonne base, encore un effort." : total >= 8 ? "Il faut relire tes notes !" : "Courage, ça viendra avec la pratique.";
        const line = (n, label) => `<li class="${items[n].type}">${label}</li>`;
        const recap = items.map((it, n) => {
          const r = res[n], mark = !r.answered ? "—" : (it.type === "riddle" ? r.pts : r.pts ? "✓" : "✗"), ok = r.pts > 0;
          const label = it.type === "riddle" ? `<strong>${esc(it.r.a)}</strong><span>Qui suis-je ? · ${esc(titleOf(it.r.b))}${r.a ? ` · ta réponse : <em>${esc(r.a)}</em>` : ""}</span>`
            : it.type === "quiz" ? `<strong>${esc(it.q.q)}</strong><span>Réponse : <b>${esc(it.q.r)}</b>${r.a ? ` · la tienne : <em>${esc(r.a)}</em>` : ""}</span>`
            : `<strong>${esc(it.x.s)}</strong><span>${it.x.v ? "Vrai" : "Faux"} — ${esc(it.x.why)}</span>`;
          return `<li class="${!r.answered ? "skip" : ok ? "ok" : "ko"}"><span class="mark">${mark}</span><div>${label}</div></li>`;
        }).join("");
        box.innerHTML = `<div class="quiz-card">
          <div class="quiz-top"><span class="eyebrow">Défi chrono · <em>${daily ? "du jour" : "bonus"}</em></span><button type="button" class="link" id="chrono-close">Fermer</button></div>
          <p class="level">${left <= 0 ? "⏱ Temps écoulé" : `Terminé avec ${mmss(left)} d'avance`} · ${done} / ${items.length} questions traitées</p>
          <div class="bigscore">${total}<small> / 30</small></div>
          <p class="msg"><em>${msg}${isBest ? " Nouveau record !" : ""}</em></p>
          <div class="chrono-split"><div><b>${sR}</b><span>/ 15<br>Qui suis-je ?</span></div><div><b>${sQ}</b><span>/ 5<br>Test ta mémoire</span></div><div><b>${sT}</b><span>/ 10<br>Vrai ou faux</span></div></div>
          <ol class="recap">${recap}</ol>
          <div class="reflect-actions"><button type="button" class="btn" id="chrono-again">Rejouer avec d'autres questions</button></div></div>`;
        box.querySelector("#chrono-close").onclick = reset;
        box.querySelector("#chrono-again").onclick = intro;
      }
      box.querySelector("#chrono-bar");
      show();
    }
  }


  // ---------- Expositions ----------
  const STOPW = new Set("le la les un une des du de au aux et en dans par pour sur sous avec sans est ses son sa the of a an and der die das el los las il".split(" "));
  // les photos d'une exposition sont chiffrées dans docs/vault/expo-<id>.json et chargées à l'ouverture de la page
  const unb64 = t => Uint8Array.from(atob(t), c => c.charCodeAt(0));
  const dataUri = f => `data:${f.mime};base64,${f.data}`;
  const loadExpo = async e => {
    if (e._loaded || !(e.works || []).length) return;
    const r = await fetch(`vault/expo-${e.id}.json?v=${encodeURIComponent((window.VAULT || {}).iv || "")}`);
    if (!r.ok) throw new Error("expo " + e.id);
    const o = await r.json();
    const files = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(o.iv) }, window.VAULT_KEY, unb64(o.ct))));
    e.works.forEach(w => { if (files[w.img]) w.src = dataUri(files[w.img]); w.moreSrc = (w.more || []).map(m => files[m]).filter(Boolean).map(dataUri); });
    e._loaded = true;
  };
  const loadAllExpos = () => Promise.all(expos.map(loadExpo));
  const exposPending = () => expos.some(e => (e.works || []).length && !e._loaded);
  const allWorks = () => expos.flatMap(e => (e.works || []).filter(w => w.src).map(w => ({ ...w, expo: e })));
  // mots-clés acceptés : champ `k` s'il existe, sinon chaque mot significatif du titre / le nom de famille de l'artiste
  const titleK = w => w.k || norm(w.title).split(/[^a-z0-9]+/).filter(t => t.length >= 3 && !STOPW.has(t)).map(t => [t]);
  const artistK = w => w.ak || [[norm(w.artist).split(/[^a-z0-9]+/).filter(Boolean).pop() || ""]];
  const exposHtml = () => {
    const works = allWorks();
    const list = expos.map(e => `
      <article class="expo">
        <h2>${esc(e.title)}</h2>
        <p class="by">${[e.with ? `<mark class="with">${esc(e.with)}</mark>` : "", ...[e.place, e.date].filter(Boolean).map(esc)].filter(Boolean).join(" · ")}</p>
        ${e.notes ? `<div class="expo-notes">${paras(e.notes)}</div>` : ""}
        <div class="gallery">${(e.works || []).filter(w => w.src).map(w => `
          <figure><img src="${w.src}" alt="${esc(w.title)}" loading="lazy">
            <figcaption><strong>${esc(w.title)}</strong><em>${esc(w.artist)}${w.year ? ` · ${esc(String(w.year))}` : ""}</em>${w.note ? `<span>${esc(w.note)}</span>` : ""}</figcaption></figure>${(w.moreSrc || []).map(m => `<figure class="more"><img src="${m}" alt="${esc(w.title)} (détail)" loading="lazy"><figcaption><em>${esc(w.title)} · détail</em></figcaption></figure>`).join("")}`).join("")}</div>
      </article>`).join("");
    return `<a class="back" href="#/">← Accueil</a>
    <h1>Expositions</h1>
    <p class="lead">Mes notes d'exposition et les toiles que j'ai aimées, à retrouver en jouant.</p>
    ${works.length >= 3 ? `<section class="quiz" id="expo-game" aria-live="polite">${expoBanner()}</section>
    <section class="quiz" id="zoom-game" aria-live="polite">${zoomBanner()}</section>` : ""}
    ${exposPending() ? `<p class="empty"><em>Chargement des photos…</em></p>` : ""}
    ${expos.length ? list : `<p class="empty"><em>La première exposition arrive bientôt…</em></p>`}`;
  };
  const expoDone = () => { try { const v = localStorage.getItem("expo:" + todayKey()); return v === null ? null : +v; } catch (e) { return null; } };
  const expoBanner = () => {
    const d = expoDone();
    return `<button type="button" class="quiz-banner" id="expo-start">
        <span class="spark">🖼</span>
        <span class="qtxt"><strong>Trois toiles du jour</strong>
        <em>${d === null ? "Retrouve l'artiste et un mot du titre" : `Fait aujourd'hui : ${d} / 6 — rejouer avec d'autres toiles`}</em></span>
        <span class="go">Jouer →</span></button>`;
  };
  function initExpos() {
    const box = document.getElementById("expo-game");
    if (!box) return;
    const works = allWorks();
    const dayNo = () => { const t = new Date(); return Math.floor(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / 864e5); };
    const start = () => { box.querySelector("#expo-start").onclick = () => play(expoDone() === null); };
    start();
    const reset = () => { box.innerHTML = expoBanner(); start(); };
    function play(daily) {
      const picks = shuffleWith(works, daily ? seeded(dayNo() * 104729 + 7) : Math.random).slice(0, 3);
      box.innerHTML = `<div class="quiz-card">
        <div class="quiz-top"><span class="eyebrow">Trois toiles · <em>${daily ? "du jour" : "bonus"}</em></span>
          <button type="button" class="link" id="expo-close">Fermer</button></div>
        <p class="level">Pour chaque toile : le nom de l'artiste et un mot du titre.</p>
        <form id="expo-form" autocomplete="off">
          <div class="expo-picks">${picks.map((w, n) => `
            <div class="expo-pick"><img src="${w.src}" alt="Toile ${n + 1}">
              <input data-n="${n}" data-f="a" type="text" placeholder="Artiste" aria-label="Artiste de la toile ${n + 1}">
              <input data-n="${n}" data-f="t" type="text" placeholder="Un mot du titre" aria-label="Un mot du titre de la toile ${n + 1}"></div>`).join("")}</div>
          <div class="reflect-actions"><button type="submit" class="btn">Valider</button></div>
        </form></div>`;
      box.querySelector("#expo-close").onclick = reset;
      box.querySelector('input').focus();
      box.querySelector("#expo-form").onsubmit = e => { e.preventDefault(); show(daily, picks, [...box.querySelectorAll("input")].map(i => i.value.trim())); };
    }
    function show(daily, picks, ans) {
      markPlayed();
      const res = picks.map((w, n) => ({ w, a: ans[2 * n], t: ans[2 * n + 1],
        okA: !!ans[2 * n] && isRight(ans[2 * n], { k: artistK(w) }), okT: !!ans[2 * n + 1] && isRight(ans[2 * n + 1], { k: titleK(w) }) }));
      const score = res.reduce((s, x) => s + x.okA + x.okT, 0);
      if (daily) { try { localStorage.setItem("expo:" + todayKey(), score); } catch (e) {} }
      box.innerHTML = `<div class="quiz-card">
        <div class="quiz-top"><span class="eyebrow">Trois toiles · <em>${daily ? "du jour" : "bonus"}</em></span>
          <button type="button" class="link" id="expo-close">Fermer</button></div>
        <p class="level">Ton score</p><div class="bigscore">${score}<small> / 6</small></div>
        <div class="expo-picks">${res.map(x => `
          <div class="expo-pick"><img src="${x.w.src}" alt="${esc(x.w.title)}">
            <p class="${x.okA ? "ok" : "ko"}">${x.okA ? "✓" : "✗"} <b>${esc(x.w.artist)}</b>${x.okA ? "" : `<br><small>Ta réponse : ${x.a ? esc(x.a) : "—"}</small>`}</p>
            <p class="${x.okT ? "ok" : "ko"}">${x.okT ? "✓" : "✗"} <b>${esc(x.w.title)}</b>${x.okT ? "" : `<br><small>Ta réponse : ${x.t ? esc(x.t) : "—"}</small>`}</p>
            <small class="muted">${esc(x.w.expo.title)}</small></div>`).join("")}</div>
        <div class="reflect-actions"><button type="button" class="btn" id="expo-again">Trois autres toiles</button></div></div>`;
      box.querySelector("#expo-close").onclick = reset;
      box.querySelector("#expo-again").onclick = () => play(false);
    }
  }


  // ----- Zoom mystère : une toile très agrandie qui se dévoile en 4 étapes (4, 3, 2 puis 1 point) -----
  const ZOOMS = [8, 4, 2, 1];
  const zoomDone = () => { try { const v = localStorage.getItem("zoom:" + todayKey()); return v === null ? null : +v; } catch (e) { return null; } };
  const zoomBanner = () => {
    const d = zoomDone();
    return `<button type="button" class="quiz-banner" id="zoom-start">
        <span class="spark">🔍</span>
        <span class="qtxt"><strong>Zoom mystère</strong>
        <em>${d === null ? "Reconnais la toile avant qu'elle se dévoile" : `Fait aujourd'hui : ${d} / 12 — rejouer avec d'autres toiles`}</em></span>
        <span class="go">Jouer →</span></button>`;
  };
  function initZoom() {
    const box = document.getElementById("zoom-game");
    if (!box) return;
    const works = allWorks();
    const dayNo = () => { const t = new Date(); return Math.floor(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / 864e5); };
    const start = () => { box.querySelector("#zoom-start").onclick = () => play(zoomDone() === null); };
    start();
    const reset = () => { box.innerHTML = zoomBanner(); start(); };
    function play(daily) {
      const rand = daily ? seeded(dayNo() * 15485863 + 3) : Math.random;
      const rounds = shuffleWith(works, rand).slice(0, 3).map(w => ({ w, x: 25 + rand() * 50, y: 25 + rand() * 50 }));
      let score = 0;
      const results = [];
      const frame = inner => { box.innerHTML = `<div class="quiz-card">
        <div class="quiz-top"><span class="eyebrow">Zoom mystère · <em>${daily ? "du jour" : "bonus"}</em></span>
          <button type="button" class="link" id="zoom-close">Fermer</button></div>${inner}</div>`; box.querySelector("#zoom-close").onclick = reset; };
      const view = (r, step, full) => `<div class="zoom-box ${full ? "full" : ""}"><img src="${r.w.src}" alt="Toile mystère"
          style="${full ? "" : `transform:scale(${ZOOMS[step]});transform-origin:${r.x}% ${r.y}%`}"></div>`;

      function ask(i, step) {
        const r = rounds[i];
        frame(`<div class="dots">${rounds.map((_, n) => `<i class="${n < i ? "done" : n === i ? "now" : ""}"></i>`).join("")}</div>
          <p class="level">Toile ${i + 1} / 3 · étape ${step + 1} / 4 · <b>${4 - step} point${4 - step > 1 ? "s" : ""}</b> si tu trouves maintenant</p>
          ${view(r, step, step === 3)}
          <form id="zoom-form" autocomplete="off"><input id="zoom-answer" type="text" placeholder="L'artiste ou un mot du titre…" aria-label="Ta réponse">
            <button type="submit" class="btn">Valider</button>
            <button type="button" class="link" id="zoom-skip">${step === 3 ? "Je ne sais pas" : "Dézoomer →"}</button></form>
          <p class="gate-msg" id="zoom-msg"></p>`);
        const input = box.querySelector("#zoom-answer"); input.focus();
        const next = () => step === 3 ? reveal(i, 0) : ask(i, step + 1);
        box.querySelector("#zoom-skip").onclick = next;
        box.querySelector("#zoom-form").onsubmit = e => {
          e.preventDefault();
          const a = input.value.trim();
          if (a && (isRight(a, { k: artistK(r.w) }) || isRight(a, { k: titleK(r.w) }))) return reveal(i, 4 - step);
          box.querySelector("#zoom-msg").textContent = a ? "Ce n'est pas ça…" : "";
          input.select();
          if (a) setTimeout(next, 700);
        };
      }
      function reveal(i, pts) {
        const r = rounds[i];
        score += pts; results.push({ r, pts });
        const last = i === rounds.length - 1;
        frame(`<p class="level">${pts ? `✓ Bravo, +${pts} point${pts > 1 ? "s" : ""}` : "✗ Raté, +0 point"}</p>
          ${view(r, 3, true)}
          <p class="zoom-ans"><strong>${esc(r.w.title)}</strong> · <em>${esc(r.w.artist)}${r.w.year ? ` · ${esc(String(r.w.year))}` : ""}</em></p>
          <div class="reflect-actions"><button type="button" class="btn" id="zoom-next">${last ? "Voir mon score" : "Toile suivante →"}</button></div>`);
        box.querySelector("#zoom-next").onclick = () => last ? finish() : ask(i + 1, 0);
      }
      function finish() {
        markPlayed(); if (daily) { try { localStorage.setItem("zoom:" + todayKey(), score); } catch (e) {} }
        frame(`<p class="level">Ton score</p><div class="bigscore">${score}<small> / 12</small></div>
          <ol class="recap">${results.map(x => `<li class="${x.pts ? "ok" : "ko"}"><span class="mark">${x.pts}</span><div><strong>${esc(x.r.w.title)}</strong><span>${esc(x.r.w.artist)}</span></div></li>`).join("")}</ol>
          <div class="reflect-actions"><button type="button" class="btn" id="zoom-again">Trois autres toiles</button></div>`);
        box.querySelector("#zoom-again").onclick = () => play(false);
      }
      ask(0, 0);
    }
  }


  const pamphletList = () => `
    <a class="back" href="#/">← Accueil</a>
    <h1>Pamphlets ironiques</h1>
    <p class="lead">Mes piques, mes humeurs, mon ironie — sans filtre, mais avec style.</p>
    <div class="list">
      ${pamphlets.length ? pamphlets.map(p => `
        <a class="entry" href="#/pamphlets/${p.id}">
          <h3>${esc(p.title)}</h3>
          <p class="excerpt">${esc(plain(p.text))}</p>
          <div class="meta"><span>${esc(p.date)}</span></div>
        </a>`).join("") : `<p class="empty"><em>Le premier pamphlet arrive bientôt…</em></p>`}
    </div>`;

  const pamphlet = p => `
    <a class="back" href="#/pamphlets">← Pamphlets ironiques</a>
    <article>
      <header class="plain-head">
        <p class="eyebrow">Pamphlet</p>
        <h1>${esc(p.title)}</h1>
        <p class="byline">${esc(p.date)}</p>
      </header>
      <div class="ornament" aria-hidden="true">✦</div>
      <div class="review-text">${paras(p.text)}</div>
    </article>`;

  const inline = s => esc(s).replace(/\*(.+?)\*/g, "<em>$1</em>");
  const KIND = { idee: "Idée clé", fait: "Repère", verdict: "Avis" };

  // texte du commentaire : les extraits cités par les bulles sont surlignés et numérotés
  const richText = r => {
    let html = paras(r.text);
    (r.notes || []).forEach((n, i) => {
      const q = esc(n.quote).replace(/\*(.+?)\*/g, "<em>$1</em>");
      html = html.replace(q, `<mark class="hl k-${n.kind}" data-n="${i}">${q}<sup>${i + 1}</sup></mark>`);
    });
    return html;
  };

  const notesHtml = r => (r.notes || []).map((n, i) => `
      <aside class="note k-${n.kind}" data-n="${i}">
        <span class="tag"><b>${i + 1}</b>${KIND[n.kind] || ""}</span>
        <strong>${inline(n.title)}</strong>
        ${n.plus ? `<p class="plus"><span>＋</span> ${inline(n.plus)}</p>` : ""}
      </aside>`).join("");

  // en grand écran : bulles à droite, à hauteur de l'extrait ; sinon : sous le paragraphe
  const layoutNotes = () => {
    const body = document.getElementById("rbody");
    if (!body) return;
    const col = body.querySelector(".notes");
    const notes = [...col.querySelectorAll(".note"), ...body.querySelectorAll(".review-text .note")]
      .sort((x, y) => x.dataset.n - y.dataset.n);
    if (window.matchMedia("(min-width: 1020px)").matches) {
      col.classList.add("abs");
      notes.forEach(n => col.appendChild(n));
      const base = body.getBoundingClientRect().top;
      let y = 0;
      notes.forEach(n => {
        const m = body.querySelector(`mark[data-n="${n.dataset.n}"]`);
        if (!m) { n.style.display = "none"; return; }
        const top = Math.max(m.getBoundingClientRect().top - base - 6, y);
        n.style.top = top + "px";
        y = top + n.offsetHeight + 14;
      });
      col.style.height = y + "px";
    } else {
      col.classList.remove("abs");
      col.style.height = "";
      const last = new Map();
      notes.forEach(n => {
        n.style.top = "";
        const mk = body.querySelector(`mark[data-n="${n.dataset.n}"]`);
        if (!mk) { n.style.display = "none"; return; }
        const p = mk.closest("p");
        (last.get(p) || p).after(n);
        last.set(p, n);
      });
    }
  };
  window.addEventListener("resize", layoutNotes);

  // ---------- Carte (Leaflet chargé à la demande) ----------
  // chaque type de carte a plusieurs fonds : si le premier ne charge pas, on passe au suivant
  const OSM = { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", sub: "abc", max: 19, attr: "© contributeurs OpenStreetMap" };
  const TOPO = { url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", sub: "abc", max: 17,
    attr: "© contributeurs OpenStreetMap · carte © OpenTopoMap (CC-BY-SA)" };
  const TILES = { topo: [TOPO, OSM], light: [TOPO, OSM] };
  let leafletReady;
  const loadLeaflet = () => leafletReady || (leafletReady = new Promise((ok, ko) => {
    if (window.L) return ok();
    const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "vendor/leaflet/leaflet.css"; document.head.appendChild(css);
    const s = document.createElement("script"); s.src = "vendor/leaflet/leaflet.js"; s.onload = ok; s.onerror = ko; document.head.appendChild(s);
  }));
  let mapInstances = [];
  const addTiles = (map, kind) => {
    const sources = TILES[kind] || TILES.topo;
    const useSource = i => {
      const t = sources[i];
      let ok = 0, ko = 0;
      const layer = L.tileLayer(t.url, { subdomains: t.sub, maxZoom: t.max, attribution: t.attr }).addTo(map);
      layer.on("tileload", () => { ok++; });
      layer.on("tileerror", () => {
        if (++ko >= 3 && !ok && i + 1 < sources.length && !layer._gone) { layer._gone = true; map.removeLayer(layer); useSource(i + 1); }
      });
    };
    useSource(0);
  };
  const drawMap = (el, cfg) => {
    mapInstances.forEach(m => m.remove());
    mapInstances = [];
    const old = el.parentNode.querySelector(".map-insets"); if (old) old.remove();

    const map = L.map(el, { scrollWheelZoom: false, maxZoom: cfg.maxZoom || 12 });
    mapInstances.push(map);
    addTiles(map, cfg.tiles);
    if (cfg.route) L.polyline(cfg.route, { color: "#c4573a", weight: 3, dashArray: "7 9", opacity: .85 }).addTo(map);
    cfg.points.forEach(p => {
      if (p.approx) L.circle([p.lat, p.lon], { radius: p.r || 3000, color: "#e3b21b", weight: 1.5, dashArray: "4 5", fillColor: "#e3b21b", fillOpacity: .15 }).addTo(map);
      L.circleMarker([p.lat, p.lon], { radius: p.main ? 9 : 6, color: "#fff", weight: 2.5, fillColor: p.main ? "#e3b21b" : "#2f7f79", fillOpacity: 1 })
        .bindTooltip(p.name, { permanent: true, direction: p.dir || "right", offset: { right: [9, 0], left: [-9, 0], top: [0, -9], bottom: [0, 9] }[p.dir || "right"], className: "map-label" }).addTo(map);
    });
    map.fitBounds(L.latLngBounds(cfg.bounds || cfg.points.map(p => [p.lat, p.lon])), { padding: [60, 60], maxZoom: cfg.maxZoom || 12 });

    // gros plans : une petite carte par lieu, sous la carte principale
    if (cfg.insets && cfg.insets.length) {
      const row = document.createElement("div");
      row.className = "map-insets";
      row.innerHTML = cfg.insets.map(() => '<div class="mini"></div>').join("");
      el.after(row);
      cfg.insets.forEach((p, i) => {
        const mini = L.map(row.children[i], { scrollWheelZoom: false, maxZoom: 14 }).setView([p.lat, p.lon], p.zoom || 9);
        mapInstances.push(mini);
        addTiles(mini, cfg.tiles);
        L.circleMarker([p.lat, p.lon], { radius: 8, color: "#fff", weight: 2.5, fillColor: "#e3b21b", fillOpacity: 1 })
          .bindTooltip(p.name, { permanent: true, direction: "top", offset: [0, -8], className: "map-label" }).addTo(mini);
      });
    }
  };

  const cover = r => r.cover
    ? `<img class="cover" src="${esc(r.cover)}" alt="Couverture de ${esc(r.title)}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'cover ph',innerHTML:'<em>${esc(r.title)}</em>'}))">`
    : `<div class="cover ph"><em>${esc(r.title)}</em><span>${esc(r.author)}</span></div>`;

  const review = r => `
    <a class="back" href="#/carnet">← Carnet II</a>
    <article>
      <header class="review-head">
        ${cover(r)}
        ${(r.notes || []).length || r.map ? `<div class="kp-actions">
          ${r.map ? `<button type="button" class="kp-btn" id="map-btn" aria-expanded="false" aria-controls="map-panel"><svg class="kp-pin" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.500a2.500 2.500 0 0 1 0 5z" fill="currentColor"/></svg>Carte<span class="kp-chev">›</span></button>` : ""}
          ${(r.notes || []).length ? `<button type="button" class="kp-btn" id="kp-btn" aria-expanded="false" aria-controls="rbody"><span class="kp-ico">✦</span>Points clés<span class="kp-chev">›</span></button>` : ""}
        </div>` : ""}
        <div>
          <p class="eyebrow">Commentaire de lecture</p>
          <h1>${esc(r.title)}</h1>
          <p class="byline">${[r.author && `<em>${esc(r.author)}</em>`, r.date && esc(r.date)].filter(Boolean).join(" · ")}</p>
          <section class="rate" aria-label="Ma note">
            <div class="stars input" id="stars">${stars(getRating(r), true)}</div>
            <div class="hint" id="rate-hint">Ma note — cliquer pour la modifier (enregistrée sur cet appareil).</div>
          </section>
        </div>
      </header>
      ${r.map ? `<section class="map-panel" id="map-panel" hidden><div class="map" id="map" role="img" aria-label="Carte : ${esc(r.title)}"></div><p class="map-cap"><em>${esc(r.map.caption)}</em></p></section>` : ""}
      <div class="ornament" aria-hidden="true">✦</div>
      <div class="review-body" id="rbody">
        <div class="review-text">${richText(r)}</div>
        ${(r.notes || []).length ? `<div class="notes" aria-label="Points clés"><p class="notes-title">Points clés</p>${notesHtml(r)}</div>` : ""}
      </div>
    </article>`;

  const notFound = () => `<a class="back" href="#/">← Accueil</a><h1>Page introuvable</h1>`;

  function render() {
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    let html, title = "Sola Scriptura";
    if (!parts.length) html = home();
    else if (parts[0] === "carnet" && !parts[1]) { html = carnet(); title = "Carnet II — Sola Scriptura"; }
    else if (parts[0] === "carnet") {
      const r = reviews.find(x => x.id === parts[1]);
      html = r ? review(r) : notFound();
      if (r) title = r.title + " — Sola Scriptura";
    } else if (parts[0] === "expositions") { html = exposHtml(); title = "Expositions — Sola Scriptura"; }
    else if (parts[0] === "frise") { html = friseHtml(); title = "Frise chronologique — Sola Scriptura"; }
    else if (parts[0] === "pamphlets" && !parts[1]) { html = pamphletList(); title = "Pamphlets ironiques — Sola Scriptura"; }
    else if (parts[0] === "pamphlets") {
      const p = pamphlets.find(x => x.id === parts[1]);
      html = p ? pamphlet(p) : notFound();
      if (p) title = p.title + " — Sola Scriptura";
    } else html = notFound();

    app.innerHTML = html;
    app.classList.toggle("wide", parts[0] === "carnet" && !!parts[1]);
    document.title = title;
    window.scrollTo(0, 0);

    initQuiz();
    initChrono();
    initRiddle();
    initTf();
    initExpos();
    initZoom();
    if (parts[0] === "expositions" && exposPending()) {
      loadAllExpos().then(() => { if (location.hash.startsWith("#/expositions")) { app.innerHTML = exposHtml(); initExpos(); initZoom(); } })
        .catch(() => { const m = app.querySelector(".empty em"); if (m) m.textContent = "Photos indisponibles pour le moment (connexion ?)."; });
    }

    const mapBtn = document.getElementById("map-btn");
    if (mapBtn) {
      const r = reviews.find(x => x.id === parts[1]), panel = document.getElementById("map-panel");
      mapInstances = [];
      mapBtn.addEventListener("click", () => {
        const open = panel.hidden;
        panel.hidden = !open;
        mapBtn.setAttribute("aria-expanded", open);
        mapBtn.classList.toggle("open", open);
        if (!open) return;
        loadLeaflet().then(() => drawMap(document.getElementById("map"), r.map))
          .catch(() => { document.getElementById("map").innerHTML = '<p class="empty"><em>Carte indisponible hors connexion.</em></p>'; });
      });
    }

    if (document.getElementById("rbody")) {
      const body = document.getElementById("rbody");
      const kp = document.getElementById("kp-btn");
      if (kp) kp.addEventListener("click", () => {
        const open = body.classList.toggle("kp-open");
        kp.setAttribute("aria-expanded", open);
        kp.classList.toggle("open", open);
        if (open) layoutNotes();
      });
      body.addEventListener("mouseover", e => {
        const el = e.target.closest("mark, .note"); if (!el) return;
        body.querySelectorAll(`[data-n="${el.dataset.n}"]`).forEach(x => x.classList.add("on"));
      });
      body.addEventListener("mouseout", () => body.querySelectorAll(".on").forEach(x => x.classList.remove("on")));
    }

    const search = document.getElementById("search");
    if (search) {
      const fMonth = document.getElementById("f-month"), fYear = document.getElementById("f-year"), fAuthor = document.getElementById("f-author");
      const apply = () => {
        const q = norm(search.value.trim());
        const au = norm(fAuthor.value);
        document.getElementById("results").innerHTML = reviewRows(reviews.filter(r =>
          norm([r.title, r.author, r.date, r.text].join(" ")).includes(q) &&
          (!fMonth.value || r.month === +fMonth.value) &&
          (!fYear.value || r.year === +fYear.value) &&
          (!au || norm(r.author).split(/[\s-]+/).some(w => w.startsWith(au)))));
      };
      // l'auteur se cherche par un seul mot : prénom OU nom
      fAuthor.addEventListener("input", () => { fAuthor.value = fAuthor.value.replace(/\s+/g, ""); apply(); });
      [search, fMonth, fYear].forEach(el => el.addEventListener("input", apply));
    }

    const box = document.getElementById("stars");
    if (box) {
      const r = reviews.find(x => x.id === parts[1]);
      box.addEventListener("click", e => {
        const b = e.target.closest(".star"); if (!b) return;
        setRating(r, +b.dataset.v);
        box.innerHTML = stars(+b.dataset.v, true);
        document.getElementById("rate-hint").textContent = "Note enregistrée : " + b.dataset.v + " / 5.";
      });
    }
  }
  window.addEventListener("hashchange", render);
  render();
})();
