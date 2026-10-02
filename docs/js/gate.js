// Porte d'entrée : le contenu du site est chiffré dans vault.js ; il n'est déchiffré qu'ici, dans le navigateur.
(() => {
  const app = document.getElementById("app");
  const V = window.VAULT;
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const KEY = "vault:key";

  const read = k => { try { return sessionStorage.getItem(k) || localStorage.getItem(k); } catch (e) { return null; } };
  const keep = (jwk, forever) => {
    try { sessionStorage.setItem(KEY, jwk); if (forever) localStorage.setItem(KEY, jwk); } catch (e) {}
  };
  const forget = () => { try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch (e) {} };

  const deriveKey = async pw => {
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw.normalize("NFC")), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64(V.salt), iterations: V.iter, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, true, ["decrypt"]);
  };

  const open = async key => {
    const buf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(V.iv) }, key, b64(V.ct));
    const { site, files } = JSON.parse(new TextDecoder().decode(buf));
    site.reviews.forEach(r => {
      const f = r.cover && files[r.cover];
      if (f) r.cover = `data:${f.mime};base64,${f.data}`;
    });
    window.SITE = site;
    const s = document.createElement("script");
    s.src = "js/app.js";
    document.body.appendChild(s);
  };

  const form = () => {
    app.innerHTML = `
      <section class="gate">
        <p class="eyebrow">Accès privé</p>
        <h1>Mes écrits</h1>
        <p class="lead">Entre le mot de passe pour lire.</p>
        <form id="gate-form" autocomplete="on">
          <input id="gate-pw" type="password" placeholder="Mot de passe" autocomplete="current-password" aria-label="Mot de passe" required>
          <button type="submit" class="btn">Entrer</button>
        </form>
        <label class="remember"><input type="checkbox" id="gate-remember"> Se souvenir de moi sur cet appareil</label>
        <p class="gate-msg" id="gate-msg" role="alert"></p>
      </section>`;
    const pw = document.getElementById("gate-pw"), msg = document.getElementById("gate-msg");
    pw.focus();
    document.getElementById("gate-form").onsubmit = async e => {
      e.preventDefault();
      msg.textContent = "Vérification…";
      try {
        const key = await deriveKey(pw.value);
        await open(key);
        keep(JSON.stringify(await crypto.subtle.exportKey("jwk", key)), document.getElementById("gate-remember").checked);
      } catch (err) {
        msg.textContent = "Mot de passe incorrect.";
        pw.select();
      }
    };
  };

  if (!window.crypto || !crypto.subtle) {
    app.innerHTML = '<section class="gate"><h1>Mes écrits</h1><p class="lead">Ce navigateur ne permet pas le déchiffrement (il faut une connexion sécurisée, https).</p></section>';
    return;
  }
  const saved = read(KEY);
  if (saved) {
    crypto.subtle.importKey("jwk", JSON.parse(saved), { name: "AES-GCM" }, false, ["decrypt"])
      .then(open).catch(() => { forget(); form(); });
  } else form();
})();
