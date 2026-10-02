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

Le mot de passe n'est écrit dans aucun fichier.
