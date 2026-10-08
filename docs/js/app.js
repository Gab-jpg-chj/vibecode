(() => {
  const { sections, reviews, pamphlets, philo = [], dates = [], dateGroups = [] } = window.SITE;
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
    <h1>Mes écrits</h1>
    <p class="lead">Un lieu simple pour rassembler tout ce que j'écris : lectures, réflexions, textes.</p>
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
  const reflectDone = () => { try { return localStorage.getItem("reflect:" + todayKey()) !== null; } catch (e) { return false; } };
  const dayPhilo = () => {
    if (!philo.length) return null;
    const t = new Date();
    return philo[Math.floor(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / 864e5) % philo.length];
  };
  // Deux questions ouvertes sur le livre du jour (données `open`, sinon questions génériques) + une question philosophique.
  const reflectItems = book => {
    const own = book.open || [];
    const items = [
      own[0] || { t: "avis", q: "Quel est l'argument central de l'auteur ? Formule-le avec tes mots, sans relire.", pistes: (book.notes || []).map(n => n.title) },
      own[1] || { t: "avis", q: "Es-tu d'accord avec l'auteur ? Qu'est-ce qui te résiste dans ce livre ?", pistes: [] }
    ];
    const ph = dayPhilo();
    if (ph) items.push({ t: "philo", theme: ph.theme, q: ph.q, pistes: ph.pistes || [], livres: ph.livres || [] });
    return items;
  };
  const bannerHtml = () => {
    const book = dayBook(), done = doneToday();
    return `<button type="button" class="quiz-banner" id="quiz-start">
        <span class="spark">✦</span>
        <span class="qtxt"><strong>Test ta mémoire !</strong>
        <em>${done === null ? `Aujourd'hui, ${esc(book.title)} !` : `Fait aujourd'hui : ${done} / 5 — ${reflectDone() ? "le jeu bonus reste ouvert" : "à toi de réfléchir, puis jeu bonus"}`}</em></span>
        <span class="go">${done === null ? "Jouer →" : reflectDone() ? "Jeu bonus →" : "Réfléchir →"}</span>
      </button>`;
  };
  const quizHtml = () => dayBook() ? `<section class="quiz" id="quiz" aria-live="polite">${bannerHtml()}</section>` : "";

  function initQuiz() {
    const box = document.getElementById("quiz");
    if (!box) return;
    const book = dayBook();
    const start = () => { box.querySelector("#quiz-start").onclick = () => doneToday() === null ? askQuestion(0, []) : reflectDone() ? bonus(0, 0) : reflect(0); };
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
        <button type="button" class="btn" id="quiz-bonus">Réfléchir →</button>`);
      box.querySelector("#quiz-close").onclick = reset;
      box.querySelector("#quiz-bonus").onclick = () => reflect(0);
    }

    // questions ouvertes : 2 sur le livre du jour, puis 1 question philosophique ; la réponse s'écrit avant de voir les pistes
    const REFLECT_LABEL = { pourquoi: "Pourquoi ?", compare: "Compare", avis: "Ton avis", philo: "Question philosophique" };
    function reflect(i) {
      const items = reflectItems(book), it = items[i], last = i === items.length - 1;
      frame(`
        <div class="quiz-top"><span class="eyebrow">Réfléchir · <em>${it.t === "philo" ? esc(it.theme) : esc(book.title)}</em></span>
          <button type="button" class="link" id="quiz-close">Fermer</button></div>
        <div class="dots">${items.map((_, n) => `<i class="${n < i ? "done" : n === i ? "now" : ""}"></i>`).join("")}</div>
        <p class="level">${REFLECT_LABEL[it.t] || "Question"} · ${i + 1} / ${items.length}</p>
        <h2 class="qtitle">${esc(it.q)}</h2>
        <form id="reflect-form">
          <textarea id="reflect-answer" rows="6" placeholder="Réponds avec tes mots : une thèse, deux arguments, une objection…" aria-label="Ta réponse"></textarea>
          ${it.t === "philo" ? `<label class="reflect-book"><span class="level">Quel livre lu utiliserais-tu pour y répondre ?</span>
            <input id="reflect-book" type="text" list="reflect-books" autocomplete="off" placeholder="Un titre de ton carnet…" aria-label="Livre utilisé pour répondre">
            <datalist id="reflect-books">${reviews.map(r => `<option value="${esc(r.title)}"></option>`).join("")}</datalist></label>` : ""}
          <div class="reflect-actions"><button type="submit" class="btn">Valider ma réponse</button>
          <button type="button" class="link" id="reflect-skip">${last ? "Passer · jeu bonus →" : "Passer →"}</button></div>
        </form>`);
      box.querySelector("#quiz-close").onclick = reset;
      const area = box.querySelector("#reflect-answer"); area.focus();
      const next = () => last ? finish() : reflect(i + 1);
      const finish = () => { try { localStorage.setItem("reflect:" + todayKey(), "1"); } catch (e) {} bonus(0, 0); };
      box.querySelector("#reflect-skip").onclick = next;
      box.querySelector("#reflect-form").onsubmit = e => {
        e.preventDefault();
        const a = area.value.trim();
        if (!a) return next();
        const bookIn = box.querySelector("#reflect-book"), chosen = bookIn ? bookIn.value.trim() : "";
        const hist = store.get("reflect:history", []);
        hist.push({ d: todayKey(), book: it.t === "philo" ? null : book.id, t: it.t, q: it.q, a, ...(chosen ? { used: chosen } : {}) });
        store.set("reflect:history", hist.slice(-300));
        showPistes(i, it, a, last, next, chosen);
      };
    }

    function showPistes(i, it, answer, last, next, chosen) {
      frame(`
        <div class="quiz-top"><span class="eyebrow">Réfléchir · <em>${it.t === "philo" ? esc(it.theme) : esc(book.title)}</em></span>
          <button type="button" class="link" id="quiz-close">Fermer</button></div>
        <h2 class="qtitle">${esc(it.q)}</h2>
        <p class="level">Ta réponse</p>
        <blockquote class="myanswer">${esc(answer).replace(/\n/g, "<br>")}</blockquote>
        ${it.pistes && it.pistes.length ? `<p class="level">Pistes de réflexion</p>
        <ul class="pistes">${it.pistes.map(p => `<li>${esc(p)}</li>`).join("")}</ul>
        <p class="hint"><em>Compare : as-tu une thèse nette, des arguments, une objection, un exemple tiré de tes lectures ?</em></p>` : ""}
        ${it.livres && it.livres.length ? `<p class="level">Quel livre lu utiliserais-tu pour y répondre ?</p>
        ${chosen ? `<p class="hint">Ton choix : <em>${esc(chosen)}</em></p>` : ""}
        <ul class="livres">${it.livres.map(l => { const b = bookOf(l.b); if (!b) return "";
          const mine = chosen && norm(b.title).includes(norm(chosen)) || chosen && norm(chosen).includes(norm(b.title));
          return `<li class="${mine ? "mine" : ""}"><a href="#/carnet/${b.id}"><strong>${esc(b.title)}</strong>${b.author ? ` <em>· ${esc(b.author)}</em>` : ""}</a>
            <span>${esc(l.these)}</span></li>`; }).join("")}</ul>
        <p class="hint"><em>Thèses tirées de tes notes sur chaque livre.</em></p>` : ""}
        <div class="reflect-actions"><button type="button" class="btn" id="reflect-next">${last ? "Jeu bonus →" : "Question suivante →"}</button>
        <button type="button" class="link" id="reflect-copy">Copier ma réponse</button></div>`);
      box.querySelector("#quiz-close").onclick = reset;
      box.querySelector("#reflect-next").onclick = next;
      box.querySelector("#reflect-copy").onclick = e => {
        const txt = it.q + "\n\n" + answer;
        (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => { e.target.textContent = "Copié ✓"; }, () => { e.target.textContent = "Copie impossible"; });
      };
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
    ${quizHtml()}
    ${friseBoxHtml()}
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
    ${dates.length >= 5 ? `<p class="hint"><a href="#/carnet">Le jeu « Frise chrono » du jour t'attend sur la page du Carnet : retrouve les événements sans regarder ici !</a></p>` : ""}`;
  };
  const friseDoneToday = () => { try { const v = localStorage.getItem("frise:" + todayKey()); return v === null ? null : +v; } catch (e) { return null; } };
  const friseBoxHtml = () => dates.length >= 5 ? `<section class="quiz frise" id="frise" aria-live="polite">${friseBanner()}</section>` : "";
  const friseBanner = () => {
    const done = friseDoneToday();
    return `<button type="button" class="quiz-banner" id="frise-start">
        <span class="spark">⟷</span>
        <span class="qtxt"><strong>Frise chrono</strong>
        <em>${done === null ? "5 dates du jour à replacer sur la frise" : `Fait aujourd'hui : ${done} / 5 — rejouer avec d'autres dates`}</em></span>
        <span class="go">Jouer →</span></button>`;
  };
  const seeded = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const shuffleWith = (arr, rand) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // 5 dates tirées au hasard, plutôt difficiles : jusqu'à 3 issues de recherches (moins connues) et le reste de mes notes,
  // de livres et d'années différents autant que possible
  const pickFrise = rand => {
    const years = new Set(), books = new Set(), out = [];
    const yr = d => Math.floor(d.y);
    const take = (list, max, strict) => {
      for (const d of list) {
        if (out.length >= 5 || max <= 0) break;
        if (years.has(yr(d)) || (strict && books.has(d.b)) || out.includes(d)) continue;
        years.add(yr(d)); books.add(d.b); out.push(d); max--;
      }
    };
    const web = shuffleWith(dates.filter(d => d.src === "web"), rand), notes = shuffleWith(dates.filter(d => d.src !== "web"), rand);
    take(web, 3, true); take(notes, 5, true); take(web, 5, true);
    take(notes, 5, false); take(web, 5, false);
    return out;
  };

  function initFrise() {
    const box = document.getElementById("frise");
    if (!box) return;
    const dayNo = () => { const t = new Date(); return Math.floor(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / 864e5); };
    const start = () => { box.querySelector("#frise-start").onclick = () => play(friseDoneToday() === null); };
    start();
    const reset = () => { box.innerHTML = friseBanner(); start(); };

    // on ne voit que les dates : c'est à toi de retrouver l'événement lié à chacune
    function play(daily) {
      const rand = daily ? seeded(dayNo() * 7919 + 13) : Math.random;
      const slots = pickFrise(rand).sort((a, b) => a.y - b.y);
      box.innerHTML = `<div class="quiz-card">
        <div class="quiz-top"><span class="eyebrow">Frise chrono · <em>${daily ? "5 dates du jour" : "5 dates bonus"}</em></span>
          <button type="button" class="link" id="frise-close">Fermer</button></div>
        <p class="level">Quel événement se cache derrière chaque date ? Écris-le en quelques mots.</p>
        <form id="frise-form" autocomplete="off">
          <div class="tl">${slots.map((d, n) => `
            <label class="tl-slot"><span class="tl-year">${esc(String(shownYear(d)))}</span>
              <input class="tl-input" data-n="${n}" type="text" placeholder="Que s'est-il passé ?" aria-label="Événement de ${esc(String(shownYear(d)))}"></label>`).join("")}</div>
          <div class="reflect-actions"><button type="submit" class="btn">Valider la frise</button></div>
        </form></div>`;
      box.querySelector("#frise-close").onclick = reset;
      const inputs = [...box.querySelectorAll(".tl-input")]; inputs[0].focus();
      box.querySelector("#frise-form").onsubmit = e => { e.preventDefault(); show(daily, slots, inputs.map(i => i.value.trim())); };
    }

    function show(daily, slots, answers) {
      const res = slots.map((d, n) => ({ d, a: answers[n], ok: !!(d.k && answers[n] && isRight(answers[n], d)) }));
      const score = res.filter(x => x.ok).length;
      if (daily) { try { localStorage.setItem("frise:" + todayKey(), score); } catch (e) {} }
      box.innerHTML = `<div class="quiz-card">
        <div class="quiz-top"><span class="eyebrow">Frise chrono · <em>${daily ? "5 dates du jour" : "5 dates bonus"}</em></span>
          <button type="button" class="link" id="frise-close">Fermer</button></div>
        <p class="level">Ton résultat</p>
        <div class="bigscore">${score}<small> / 5</small></div>
        <ol class="recap">${res.map(x => { const b = bookOf(x.d.b); return `
          <li class="${x.ok ? "ok" : "ko"}"><span class="mark">${esc(String(shownYear(x.d)))}</span>
            <div><strong>${esc(x.d.e)}</strong>
            ${b ? `<span><em>${esc(b.title)}</em> · ${x.d.src === "web" ? "recherche" : "tes notes"}</span>` : ""}
            <span>Ta réponse : <em>${x.a ? esc(x.a) : "—"}</em></span></div></li>`; }).join("")}</ol>
        <div class="reflect-actions"><button type="button" class="btn" id="frise-again">Une autre frise</button><a class="link" href="#/frise">Voir toute la frise</a></div></div>`;
      box.querySelector("#frise-close").onclick = reset;
      box.querySelector("#frise-again").onclick = () => play(false);
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
    let html, title = "Mes écrits";
    if (!parts.length) html = home();
    else if (parts[0] === "carnet" && !parts[1]) { html = carnet(); title = "Carnet II — Mes écrits"; }
    else if (parts[0] === "carnet") {
      const r = reviews.find(x => x.id === parts[1]);
      html = r ? review(r) : notFound();
      if (r) title = r.title + " — Mes écrits";
    } else if (parts[0] === "frise") { html = friseHtml(); title = "Frise chronologique — Mes écrits"; }
    else if (parts[0] === "pamphlets" && !parts[1]) { html = pamphletList(); title = "Pamphlets ironiques — Mes écrits"; }
    else if (parts[0] === "pamphlets") {
      const p = pamphlets.find(x => x.id === parts[1]);
      html = p ? pamphlet(p) : notFound();
      if (p) title = p.title + " — Mes écrits";
    } else html = notFound();

    app.innerHTML = html;
    app.classList.toggle("wide", parts[0] === "carnet" && !!parts[1]);
    document.title = title;
    window.scrollTo(0, 0);

    initQuiz();
    initFrise();

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
