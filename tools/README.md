# Contenu chiffré

Le site est public mais son contenu (textes, bulles, quiz, cartes, couvertures) est chiffré dans `docs/vault.js`
(AES-256-GCM, clé dérivée du mot de passe par PBKDF2-SHA256, 600 000 itérations). Il est déchiffré dans le navigateur
par `docs/js/gate.js` quand on saisit le mot de passe.

Pour modifier le contenu :

```
VAULT_PASSWORD='…' node tools/vault.mjs decrypt   # recrée private/ (jamais versionné)
# modifier private/site.json et/ou private/img/
VAULT_PASSWORD='…' node tools/vault.mjs encrypt   # réécrit docs/vault.js
```

Le mot de passe est lu dans la variable d'environnement `VAULT_PASSWORD` (réglée dans l'environnement de la session,
jamais écrite dans un fichier ni dans la conversation).

Changer de mot de passe : définir `VAULT_OLD_PASSWORD` (ancien) et `VAULT_PASSWORD` (nouveau), puis `decrypt` (utilise l'ancien)
et `encrypt` (utilise le nouveau).
