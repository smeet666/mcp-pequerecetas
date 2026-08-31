# Privacy

`mcp-pequerecetas` collects nothing about you.

## What it does

The server runs on your machine, over stdio, started by your MCP client. When a
tool is called it makes an HTTPS request to `www.pequerecetas.com` and reads the
page that comes back. That is the whole of what it does on a network.

## What it sends

Each request carries a `User-Agent` naming this project, its version and the
address of its repository, so the site can reach a person about traffic it did
not expect. Setting `PQR_USER_AGENT` prefixes your own identifier to that line,
and the project's own identifier stays appended.

The words you search for travel to the site, because that is what a search is.
Nothing else about you is sent: no identifier, no account, no key. The site asks
for none, and the server holds none.

## What it keeps

Answers are held in memory, in a bounded store, for fifteen minutes by default.
`PQR_CACHE_TTL_MS` changes that lifetime and `0` turns the store off;
`PQR_CACHE_MAX_ENTRIES` bounds how many answers it holds. The store lives in the
process and goes when the process goes.

Nothing is written to disk. The server has no log file, no database and no
temporary file.

## What it prints

Diagnostics go to stderr, at the level `PQR_LOG_LEVEL` sets, which is `error` by
default. Nothing is written to stdout, because stdout carries the protocol.

## Third parties

The only host contacted is `www.pequerecetas.com`. No analytics, no telemetry,
no error reporting service. Reading a page means the site sees a request from
your network, as it would if you opened the page in a browser.

## Questions

Open an issue at
[github.com/smeet666/mcp-pequerecetas/issues](https://github.com/smeet666/mcp-pequerecetas/issues).

---

# Confidentialité

`mcp-pequerecetas` ne collecte rien sur vous.

## Ce qu'il fait

Le serveur tourne sur votre machine, en stdio, lancé par votre client MCP. Quand
un outil est appelé, il fait une requête HTTPS vers `www.pequerecetas.com` et lit
la page qui revient. C'est tout ce qu'il fait sur un réseau.

## Ce qu'il envoie

Chaque requête porte un `User-Agent` qui nomme ce projet, sa version et l'adresse
de son dépôt, pour que le site puisse joindre une personne à propos d'un trafic
qu'il n'attendait pas. Définir `PQR_USER_AGENT` préfixe votre propre identifiant
à cette ligne, et l'identifiant du projet y reste ajouté.

Les mots que vous cherchez voyagent vers le site, puisque c'est ce qu'est une
recherche. Rien d'autre vous concernant n'est envoyé : aucun identifiant, aucun
compte, aucune clé. Le site n'en demande aucun, et le serveur n'en porte aucun.

## Ce qu'il garde

Les réponses sont gardées en mémoire, dans un cache borné, quinze minutes par
défaut. `PQR_CACHE_TTL_MS` change cette durée et `0` éteint le cache ;
`PQR_CACHE_MAX_ENTRIES` borne le nombre de réponses gardées. Le cache vit dans le
processus et disparaît avec lui.

Rien n'est écrit sur disque. Le serveur n'a ni fichier de journal, ni base de
données, ni fichier temporaire.

## Ce qu'il imprime

Les diagnostics partent sur stderr, au niveau que fixe `PQR_LOG_LEVEL`, qui vaut
`error` par défaut. Rien n'est écrit sur stdout, parce que stdout porte le
protocole.

## Tiers

Le seul hôte joint est `www.pequerecetas.com`. Aucune mesure d'audience, aucune
télémétrie, aucun service de remontée d'erreurs. Lire une page signifie que le
site voit une requête venant de votre réseau, comme si vous ouvriez la page dans
un navigateur.

## Questions

Ouvrir une issue sur
[github.com/smeet666/mcp-pequerecetas/issues](https://github.com/smeet666/mcp-pequerecetas/issues).
