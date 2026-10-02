// Chiffre / déchiffre le contenu du site (textes, bulles, quiz, cartes, couvertures).
//   VAULT_PASSWORD=… node tools/vault.mjs encrypt   private/site.json + private/img/*  ->  docs/vault.js
//   VAULT_PASSWORD=… node tools/vault.mjs decrypt   docs/vault.js  ->  private/site.json + private/img/*
// Le dossier private/ n'est jamais versionné ; le mot de passe n'est écrit nulle part.
import { webcrypto as crypto, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ITER = 600000;
// Mot de passe lu dans l'environnement (jamais écrit dans un fichier). Pour changer de mot de passe :
// VAULT_OLD_PASSWORD sert à déchiffrer, VAULT_PASSWORD à rechiffrer.
const cmd = process.argv[2];
const pw = ((cmd === "decrypt" && process.env.VAULT_OLD_PASSWORD) || process.env.VAULT_PASSWORD || "").normalize("NFC");
if (!pw) { console.error("VAULT_PASSWORD manquant"); process.exit(1); }
const b64 = u8 => Buffer.from(u8).toString("base64");
const unb64 = s => new Uint8Array(Buffer.from(s, "base64"));
const key = async salt => {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
};
const walk = d => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : [];
const MIME = { ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif" };

if (cmd === "encrypt") {
  const site = JSON.parse(fs.readFileSync("private/site.json", "utf8"));
  const files = {};
  for (const f of walk("private/img")) files[path.relative("private", f).split(path.sep).join("/")] = { mime: MIME[path.extname(f).toLowerCase()] || "application/octet-stream", data: fs.readFileSync(f).toString("base64") };
  const salt = randomBytes(16), iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(salt), new TextEncoder().encode(JSON.stringify({ site, files })));
  fs.writeFileSync("docs/vault.js", "window.VAULT=" + JSON.stringify({ v: 1, iter: ITER, salt: b64(salt), iv: b64(iv), ct: b64(new Uint8Array(ct)) }) + ";\n");
  console.log("docs/vault.js écrit —", Object.keys(files).length, "image(s),", site.reviews.length, "livre(s)");
} else if (cmd === "decrypt") {
  const src = fs.readFileSync("docs/vault.js", "utf8");
  const V = JSON.parse(src.slice(src.indexOf("{"), src.lastIndexOf("}") + 1));
  const buf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(V.iv) }, await key(unb64(V.salt)), unb64(V.ct));
  const { site, files } = JSON.parse(new TextDecoder().decode(buf));
  fs.mkdirSync("private", { recursive: true });
  fs.writeFileSync("private/site.json", JSON.stringify(site, null, 2));
  for (const [p, f] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join("private", p)), { recursive: true }); fs.writeFileSync(path.join("private", p), Buffer.from(f.data, "base64")); }
  console.log("private/ restauré —", Object.keys(files).length, "image(s),", site.reviews.length, "livre(s)");
} else { console.error("usage : encrypt | decrypt"); process.exit(1); }
