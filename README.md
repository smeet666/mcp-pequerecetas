<img src="assets/icon-128.png" alt="" width="96" align="right">

# mcp-pequerecetas

[![npm](https://img.shields.io/npm/v/mcp-pequerecetas.svg)](https://www.npmjs.com/package/mcp-pequerecetas)
[![CI](https://github.com/smeet666/mcp-pequerecetas/actions/workflows/ci.yml/badge.svg)](https://github.com/smeet666/mcp-pequerecetas/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/mcp-pequerecetas.svg)](./LICENSE)
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-listed-6E56CF)](https://registry.modelcontextprotocol.io/v0/servers?search=io.github.smeet666/mcp-pequerecetas)
[![Glama](https://glama.ai/mcp/servers/smeet666/mcp-pequerecetas/badges/score.svg)](https://glama.ai/mcp/servers/smeet666/mcp-pequerecetas)
[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=pequerecetas&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIm1jcC1wZXF1ZXJlY2V0YXMiXX0=)
[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?style=flat&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=pequerecetas&config=%7B%22name%22%3A%22pequerecetas%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22mcp-pequerecetas%22%5D%7D)

[Pequerecetas](https://www.pequerecetas.com) is a Spanish home-cooking site
written for families. It holds a few thousand recipes with their ingredients,
their steps and their photographs, and files each one under the diet it suits,
the appliance it is cooked in, the occasion it is made for and the age of whoever
eats it, from six months up.

This server connects a chat client to that site. You can search its recipes, read
one with its quantities rescaled to the number of people at your table, list the
values each taxonomy publishes, walk a taxonomy page by page, and rescale any
Spanish ingredient list you already hold. It needs no API key and no account.

_[Version française](#mcp-pequerecetas-français)_

---

## Install

**One-click install**

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=pequerecetas&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIm1jcC1wZXF1ZXJlY2V0YXMiXX0=)
[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?style=flat&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=pequerecetas&config=%7B%22name%22%3A%22pequerecetas%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22mcp-pequerecetas%22%5D%7D)

**Claude Code**

```bash
claude mcp add pequerecetas -- npx -y mcp-pequerecetas
```

**Claude Desktop, Cursor, and any client using the standard config format**

```json
{
  "mcpServers": {
    "pequerecetas": {
      "command": "npx",
      "args": ["-y", "mcp-pequerecetas"]
    }
  }
}
```

Node 24 or later is required, and no environment variable has to be set.

### With Docker

```json
{
  "mcpServers": {
    "pequerecetas": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "ghcr.io/smeet666/mcp-pequerecetas:1.0.1"]
    }
  }
}
```

`-i` keeps stdin open, which is where the protocol travels, and `-t` is left out
because a TTY rewrites the stream. The container needs outbound HTTPS to
`www.pequerecetas.com`, and nothing else: no volume, no port, no credential.

### Bundle, without npm

Download `mcp-pequerecetas-1.0.1.mcpb` from
[the latest release](https://github.com/smeet666/mcp-pequerecetas/releases/latest)
and open it. A client that supports MCP bundles installs it on its own, with no
npm and no configuration file to edit. The bundle carries its dependencies, so
nothing is fetched at install time.

## What you can ask

- « Búscame una receta de paella de marisco. »
- "Read me that recipe for eight people."
- "What can I cook in an air fryer on this site?"
- "Show me the purées it files under six months."
- "Scale this Spanish ingredient list by three."

Pequerecetas is written in Spanish and its search matches the words a page was
written with, so recipes are found in Spanish. The ordinary path runs from a
search or a taxonomy to a recipe: a row carries an `id`, and `get_recipe` takes
that id.

## Tools

| Tool                | What it does                                                       |
| ------------------- | ------------------------------------------------------------------ |
| `get_recipe`        | Reads one page of the recipe section, rescaled on request.         |
| `search_recipes`    | Finds recipes by dish or by ingredient.                            |
| `list_facets`       | Lists the values each taxonomy publishes.                          |
| `browse_recipes`    | Reads one taxonomy, page by page.                                  |
| `scale_ingredients` | Rescales any Spanish ingredient list, with no request to the site. |

### `get_recipe`

Reads one page of the recipe section, and rescales its quantities when a number
of servings is given.

| Argument   | Type                        | Required | What it does                                         |
| ---------- | --------------------------- | -------- | ---------------------------------------------------- |
| `id`       | string, 1 to 200 characters | yes      | The slug in a recipe's address, as a row carries it. |
| `servings` | integer, 1 to 1000          | no       | Rescale the quantities to this many.                 |

**In return:** `kind`, which reads `recipe` or `collection`. The site publishes
both at this kind of address and describes them alike, so this is what tells them
apart: a collection is an article gathering other recipes, and it comes back with
`headings` and `recipes`, the rows it points at, in place of a recipe's fields.

A recipe carries `source_shape`, reading `structured` when the block the page
publishes for search engines held its ingredients and `article` when they were
read from the body of the page, which is where most of this site's recipes keep
them. Then come `title`, `url`, `description`, `published_at`, `modified_at`,
`prep_minutes`, `cook_minutes`, `total_minutes`, `categories`, `cuisines`,
`keywords`, `author`, `author_url`, `rating`, `nutrition` and `images`, each
`null` or empty where the page states nothing. `yield` says what the recipe was
written for and what it was rescaled to; a page stating no number of servings
comes back with `factor` at 1 and a note saying why. Each line of `ingredients`
carries `scaling`, reading `scaled`, `rounded` or `unscaled`, and `is_equipment`,
which marks a line naming a tool rather than something eaten.

### `search_recipes`

Searches the recipes for a dish or an ingredient.

| Argument | Type                        | Required | What it does                         |
| -------- | --------------------------- | -------- | ------------------------------------ |
| `query`  | string, 1 to 120 characters | yes      | A dish or an ingredient, in Spanish. |
| `limit`  | integer, 1 to 60            | no       | Rows to return.                      |

**In return:** rows carrying `id`, which `get_recipe` takes, `title`, `url` and
`image_url`. Alongside come `result_count` for the rows returned and
`total_available`, which is always `null`: the site publishes no count of what a
search matched. The site serves its search on a single page and answers a request
for a second with the first again, so these are all the rows it offers for a
query. Some rows are articles gathering recipes, which `get_recipe` reports as a
`collection`.

### `list_facets`

Lists the values the site browses its recipes by, read from the sitemap each
taxonomy publishes.

| Argument | Type                       | Required | What it does                           |
| -------- | -------------------------- | -------- | -------------------------------------- |
| `facet`  | string, 1 character and up | no       | One taxonomy. All eight when left out. |

The taxonomies are `dieta`, `edad`, `ingrediente`, `ocasion`, `recetas-de`,
`tecnica`, `tipo-de-cocina` and `tipo-plato`: diet, the age of whoever eats it,
main ingredient, occasion, moment of the day, appliance, cuisine and kind of
dish.

**In return:** `facets`, each carrying `name`, `value_count` and `values`, whose
`value` is the slug `browse_recipes` takes. The values keep the order the site
publishes them in. Reading all eight costs one request per taxonomy. A taxonomy
that could not be read is named in `notes` and left out of `facets`, so a
listing short of one never reads like a site that has seven.

### `browse_recipes`

Reads one page of a taxonomy's recipes.

| Argument | Type                        | Required | What it does                                    |
| -------- | --------------------------- | -------- | ----------------------------------------------- |
| `facet`  | string, 1 character and up  | yes      | The taxonomy to browse.                         |
| `value`  | string, 1 to 120 characters | yes      | A slug from `list_facets`, such as `thermomix`. |
| `page`   | integer, 1 to 200           | no       | Which page to read, the first by default.       |

**In return:** rows of the same shape `search_recipes` returns, with
`page_served` for the page the site actually served, `has_more` for whether its
own pagination offers another, and `total_available`, always `null` because the
site prints no count on these pages. The site writes its own slugs, so one built
by hand reaches a page it does not hold and comes back as `not_found`. The
taxonomies cannot be combined: the site offers no way to ask for two at once.

### `scale_ingredients`

Rescales a list of Spanish ingredient lines. It reaches no site.

| Argument        | Type                              | Required | What it does                        |
| --------------- | --------------------------------- | -------- | ----------------------------------- |
| `ingredients`   | array of 1 to 200 strings         | yes      | The lines to rescale, as written.   |
| `factor`        | number, greater than 0 up to 1000 | one of   | What to multiply the quantities by. |
| `from_servings` | integer, 1 to 1000                | one of   | How many the list was written for.  |
| `to_servings`   | integer, 1 to 1000                | one of   | How many it should serve.           |

Give `factor`, or `from_servings` and `to_servings` together. Naming both ways at
once is refused, because they can ask for different things.

**In return:** each line with `text` as it now reads, `original` as it was given,
`amount`, `amount_max`, `unit`, and `scaling`, which carries the honesty of the
answer: `scaled` when the arithmetic landed exactly, `rounded` when the value
moved to stay something a kitchen can measure out, `unscaled` when the line
carries no quantity. `is_equipment` marks a line naming a tool. Alongside come
`scaled_count`, `rounded_count` and `unscaled_count`. Nothing is converted
between unit systems, and an approximate measure such as a `pizca` keeps the size
the cook gives it.

## Configuration

| Variable                | Default  | Bounds                     | What it does                                       |
| ----------------------- | -------- | -------------------------- | -------------------------------------------------- |
| `PQR_USER_AGENT`        | unset    |                            | Prefixed to this server's own User-Agent.          |
| `PQR_MIN_INTERVAL_MS`   | `3000`   | 3000 to 60000              | Milliseconds between two requests.                 |
| `PQR_TIMEOUT_MS`        | `20000`  | 1000 to 120000             | How long one request may take.                     |
| `PQR_MAX_RETRIES`       | `3`      | 0 to 8                     | Attempts at a request the site did not answer.     |
| `PQR_CACHE_TTL_MS`      | `900000` | 0 to 86400000              | How long a read is held. Zero turns the store off. |
| `PQR_CACHE_MAX_ENTRIES` | `200`    | 1 to 5000                  | Reads held at once.                                |
| `PQR_LOG_LEVEL`         | `error`  | silent, error, info, debug | What goes to stderr.                               |

The interval has a floor of 3000 milliseconds. A value below it is refused and
the default stands, which is stated on stderr rather than applied in silence.

## Errors

| Code            | What it means                               | What to do                                            |
| --------------- | ------------------------------------------- | ----------------------------------------------------- |
| `not_found`     | The site holds nothing at that address.     | Check the slug against `search_recipes`.              |
| `invalid_input` | The arguments cannot produce a request.     | The message names the argument.                       |
| `rate_limited`  | The site asked this client to slow down.    | Wait and ask again. The thing asked for still exists. |
| `parse_failure` | A page arrived in a shape this cannot read. | Report it; the site may have changed.                 |
| `network_error` | The request could not be completed.         | Try again.                                            |
| `timeout`       | No answer arrived in time.                  | Try again, or raise `PQR_TIMEOUT_MS`.                 |

## As a library

The reading layer is published on its own, with its pacing, its store and its
error vocabulary, and no protocol attached.

```ts
import { PequerecetasClient } from "mcp-pequerecetas/client";

const client = new PequerecetasClient();
const read = await client.getRecipe("paella-de-marisco");
```

Built with nothing, it takes its settings from the environment and sends its
diagnostics to stderr. `loadConfig` and `createLogger` come from the same entry
point for a caller who would rather set them in code:

```ts
import { createLogger, loadConfig, PequerecetasClient } from "mcp-pequerecetas/client";

const client = new PequerecetasClient({
  config: { ...loadConfig(), minIntervalMs: 5000 },
  logger: createLogger("debug"),
});
```

Every read returns `{ data, cached }`, and `cached` says whether the answer came
from the store rather than from the site.

## Pacing and attribution

One request at a time, three seconds apart, and the interval widens when the site
pushes back. The User-Agent carries the project's name, its version and an
address where a person can be reached.

Pequerecetas is free to read and pays for its own hosting. When you show a recipe
to someone, credit the site and link the page it came from.

This server is not affiliated with Pequerecetas.

## Privacy

Nothing is collected. The server reads `www.pequerecetas.com` and no other host,
keeps what it read in memory for fifteen minutes by default, writes nothing to
disk, and sends its diagnostics to stderr. It carries no credential, because the
site asks for none. See [PRIVACY.md](./PRIVACY.md).

## Development

```bash
npm install
npm run build:fixtures
npm test
npm run coverage
npm run check
```

The corpus the suite reads is written by `scripts/build-fixtures.mjs` and holds
invented recipes, so no third-party content is stored here. A live suite runs
behind `PQR_LIVE=1`, one request per route.

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT. See [LICENSE](./LICENSE).

---

<a name="mcp-pequerecetas-français"></a>

# mcp-pequerecetas (français)

_[English version](#mcp-pequerecetas)_

[Pequerecetas](https://www.pequerecetas.com) est un site espagnol de cuisine
familiale. Il tient quelques milliers de recettes avec leurs ingrédients, leurs
étapes et leurs photographies, et range chacune sous le régime auquel elle
convient, l'appareil qui la cuit, l'occasion pour laquelle on la fait et l'âge de
celui qui la mange, à partir de six mois.

Ce serveur relie un client de conversation à ce site. On peut chercher ses
recettes, en lire une avec ses quantités mises à l'échelle du nombre de personnes
à table, lister les valeurs que publie chaque taxonomie, parcourir une taxonomie
page par page, et mettre à l'échelle n'importe quelle liste d'ingrédients
espagnole qu'on a déjà. Il ne demande ni clé d'API ni compte.

## Installation

**Installation en un clic**

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=pequerecetas&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIm1jcC1wZXF1ZXJlY2V0YXMiXX0=)
[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install-0098FF?style=flat&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=pequerecetas&config=%7B%22name%22%3A%22pequerecetas%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22mcp-pequerecetas%22%5D%7D)

**Claude Code**

```bash
claude mcp add pequerecetas -- npx -y mcp-pequerecetas
```

**Claude Desktop, Cursor, et tout client au format de configuration standard**

```json
{
  "mcpServers": {
    "pequerecetas": {
      "command": "npx",
      "args": ["-y", "mcp-pequerecetas"]
    }
  }
}
```

Node 24 ou plus récent est requis, et aucune variable d'environnement n'est à
définir.

### Avec Docker

```json
{
  "mcpServers": {
    "pequerecetas": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "ghcr.io/smeet666/mcp-pequerecetas:1.0.1"]
    }
  }
}
```

`-i` garde stdin ouvert, où passe le protocole, et `-t` est laissé de côté parce
qu'un TTY réécrit le flux. Le conteneur a besoin de joindre
`www.pequerecetas.com` en HTTPS sortant, et de rien d'autre : aucun volume, aucun
port, aucun identifiant.

### Bundle, sans npm

Télécharger `mcp-pequerecetas-1.0.1.mcpb` depuis
[la dernière publication](https://github.com/smeet666/mcp-pequerecetas/releases/latest)
et l'ouvrir. Un client qui gère les bundles MCP l'installe seul, sans npm et sans
fichier de configuration à modifier. Le bundle emporte ses dépendances, donc rien
n'est téléchargé à l'installation.

## Ce qu'on peut demander

- « Búscame una receta de paella de marisco. »
- « Lis-moi cette recette pour huit personnes. »
- « Qu'est-ce que je peux cuisiner à la friteuse à air sur ce site ? »
- « Montre-moi les purées qu'il range sous six mois. »
- « Multiplie cette liste d'ingrédients espagnole par trois. »

Pequerecetas est écrit en espagnol et sa recherche compare les mots dont une page
est faite, donc les recettes se trouvent en espagnol. Le chemin ordinaire va
d'une recherche ou d'une taxonomie vers une recette : une ligne porte un `id`, et
`get_recipe` prend cet id.

## Les outils

| Outil               | Ce qu'il fait                                                          |
| ------------------- | ---------------------------------------------------------------------- |
| `get_recipe`        | Lit une page de la section des recettes, mise à l'échelle sur demande. |
| `search_recipes`    | Trouve des recettes par plat ou par ingrédient.                        |
| `list_facets`       | Liste les valeurs que publie chaque taxonomie.                         |
| `browse_recipes`    | Lit une taxonomie, page par page.                                      |
| `scale_ingredients` | Met à l'échelle une liste d'ingrédients espagnole, sans requête.       |

### `get_recipe`

Lit une page de la section des recettes, et met ses quantités à l'échelle quand
un nombre de parts est donné.

| Argument   | Type                       | Requis | Ce qu'il fait                               |
| ---------- | -------------------------- | ------ | ------------------------------------------- |
| `id`       | chaîne, 1 à 200 caractères | oui    | Le slug dans l'adresse d'une recette.       |
| `servings` | entier, 1 à 1000           | non    | Met les quantités à l'échelle de ce nombre. |

**En retour :** `kind`, qui vaut `recipe` ou `collection`. Le site publie les deux
à ce genre d'adresse et les décrit pareillement, donc c'est ce qui les distingue :
une collection est un article qui rassemble d'autres recettes, et elle revient
avec `headings` et `recipes`, les lignes qu'elle désigne, à la place des champs
d'une recette.

Une recette porte `source_shape`, qui vaut `structured` quand le bloc que la page
publie pour les moteurs de recherche portait ses ingrédients, et `article` quand
ils ont été lus dans le corps de la page, où la plupart des recettes de ce site
les gardent. Viennent ensuite `title`, `url`, `description`, `published_at`,
`modified_at`, `prep_minutes`, `cook_minutes`, `total_minutes`, `categories`,
`cuisines`, `keywords`, `author`, `author_url`, `rating`, `nutrition` et
`images`, chacun `null` ou vide là où la page n'énonce rien. `yield` dit pour
combien la recette a été écrite et vers combien elle a été portée ; une page qui
n'énonce aucun nombre de parts revient avec `factor` à 1 et une note qui le dit.
Chaque ligne d'`ingredients` porte `scaling`, qui vaut `scaled`, `rounded` ou
`unscaled`, et `is_equipment`, qui marque une ligne nommant un ustensile plutôt
que quelque chose qui se mange.

### `search_recipes`

Cherche les recettes par plat ou par ingrédient.

| Argument | Type                       | Requis | Ce qu'il fait                          |
| -------- | -------------------------- | ------ | -------------------------------------- |
| `query`  | chaîne, 1 à 120 caractères | oui    | Un plat ou un ingrédient, en espagnol. |
| `limit`  | entier, 1 à 60             | non    | Lignes à rendre.                       |

**En retour :** des lignes portant `id`, que prend `get_recipe`, `title`, `url` et
`image_url`. À côté viennent `result_count` pour les lignes rendues et
`total_available`, toujours `null` : le site ne publie aucun compte de ce qu'une
recherche a trouvé. Le site sert sa recherche sur une seule page et répond à une
demande de deuxième page par la première à l'identique, donc ce sont là toutes
les lignes qu'il offre pour cette requête. Certaines lignes sont des articles qui
rassemblent des recettes, ce que `get_recipe` rend comme une `collection`.

### `list_facets`

Liste les valeurs par lesquelles le site parcourt ses recettes, lues dans le plan
de site que chaque taxonomie publie.

| Argument | Type                        | Requis | Ce qu'il fait                            |
| -------- | --------------------------- | ------ | ---------------------------------------- |
| `facet`  | chaîne, 1 caractère et plus | non    | Une taxonomie. Les huit quand il manque. |

Les taxonomies sont `dieta`, `edad`, `ingrediente`, `ocasion`, `recetas-de`,
`tecnica`, `tipo-de-cocina` et `tipo-plato` : le régime, l'âge de celui qui
mange, l'ingrédient principal, l'occasion, le moment de la journée, l'appareil,
la cuisine et le type de plat.

**En retour :** `facets`, portant chacune `name`, `value_count` et `values`, dont
`value` est le slug que prend `browse_recipes`. Les valeurs gardent l'ordre dans
lequel le site les publie. Lire les huit coûte une requête par taxonomie. Une
taxonomie qui n'a pas pu être lue est nommée dans `notes` et laissée hors de
`facets`, pour qu'une liste amputée d'une taxonomie ne se lise pas comme un site
qui en aurait sept.

### `browse_recipes`

Lit une page des recettes d'une taxonomie.

| Argument | Type                        | Requis | Ce qu'il fait                                |
| -------- | --------------------------- | ------ | -------------------------------------------- |
| `facet`  | chaîne, 1 caractère et plus | oui    | La taxonomie à parcourir.                    |
| `value`  | chaîne, 1 à 120 caractères  | oui    | Un slug de `list_facets`, comme `thermomix`. |
| `page`   | entier, 1 à 200             | non    | La page à lire, la première par défaut.      |

**En retour :** des lignes de la forme que rend `search_recipes`, avec
`page_served` pour la page que le site a servie, `has_more` pour savoir si sa
pagination en offre une autre, et `total_available`, toujours `null` parce que le
site n'imprime aucun compte sur ces pages. Le site écrit ses propres slugs, donc
un slug construit à la main atteint une page qu'il ne tient pas et revient en
`not_found`. Les taxonomies ne se croisent pas : le site n'offre aucun moyen d'en
demander deux à la fois.

### `scale_ingredients`

Met à l'échelle une liste de lignes d'ingrédients espagnoles. Il ne joint aucun
site.

| Argument        | Type                               | Requis | Ce qu'il fait                         |
| --------------- | ---------------------------------- | ------ | ------------------------------------- |
| `ingredients`   | tableau de 1 à 200 chaînes         | oui    | Les lignes à mettre à l'échelle.      |
| `factor`        | nombre, supérieur à 0 jusqu'à 1000 | l'un   | Ce par quoi multiplier les quantités. |
| `from_servings` | entier, 1 à 1000                   | l'un   | Pour combien la liste a été écrite.   |
| `to_servings`   | entier, 1 à 1000                   | l'un   | Pour combien elle doit servir.        |

Donner `factor`, ou `from_servings` et `to_servings` ensemble. Nommer les deux
manières à la fois est refusé, parce qu'elles peuvent demander deux choses
différentes.

**En retour :** chaque ligne avec `text` telle qu'elle se lit maintenant,
`original` telle qu'elle a été donnée, `amount`, `amount_max`, `unit`, et
`scaling`, qui porte l'honnêteté de la réponse : `scaled` quand l'arithmétique
est tombée juste, `rounded` quand la valeur a bougé pour rester une quantité
qu'une cuisine mesure, `unscaled` quand la ligne ne porte aucune quantité.
`is_equipment` marque une ligne qui nomme un ustensile. À côté viennent
`scaled_count`, `rounded_count` et `unscaled_count`. Rien n'est converti d'un
système d'unités à un autre, et une mesure approximative comme une `pizca` garde
la taille que lui donne le cuisinier.

## Configuration

| Variable                | Défaut     | Bornes                     | Ce qu'elle fait                                            |
| ----------------------- | ---------- | -------------------------- | ---------------------------------------------------------- |
| `PQR_USER_AGENT`        | non défini |                            | Préfixé au User-Agent du serveur.                          |
| `PQR_MIN_INTERVAL_MS`   | `3000`     | 3000 à 60000               | Millisecondes entre deux requêtes.                         |
| `PQR_TIMEOUT_MS`        | `20000`    | 1000 à 120000              | Durée maximale d'une requête.                              |
| `PQR_MAX_RETRIES`       | `3`        | 0 à 8                      | Tentatives sur une requête sans réponse.                   |
| `PQR_CACHE_TTL_MS`      | `900000`   | 0 à 86400000               | Durée de conservation d'une lecture. Zéro éteint le cache. |
| `PQR_CACHE_MAX_ENTRIES` | `200`      | 1 à 5000                   | Lectures gardées à la fois.                                |
| `PQR_LOG_LEVEL`         | `error`    | silent, error, info, debug | Ce qui part sur stderr.                                    |

L'intervalle a un plancher de 3000 millisecondes. Une valeur en dessous est
refusée et le défaut s'applique, ce qui est dit sur stderr plutôt qu'appliqué en
silence.

## Erreurs

| Code            | Ce que ça veut dire                               | Le geste suivant                                           |
| --------------- | ------------------------------------------------- | ---------------------------------------------------------- |
| `not_found`     | Le site ne tient rien à cette adresse.            | Vérifier le slug avec `search_recipes`.                    |
| `invalid_input` | Les arguments ne peuvent pas produire de requête. | Le message nomme l'argument.                               |
| `rate_limited`  | Le site a demandé de ralentir.                    | Attendre et redemander. La chose demandée existe toujours. |
| `parse_failure` | Une page est arrivée sous une forme illisible.    | Le signaler ; le site a pu changer.                        |
| `network_error` | La requête n'a pas abouti.                        | Réessayer.                                                 |
| `timeout`       | Aucune réponse n'est arrivée à temps.             | Réessayer, ou élargir `PQR_TIMEOUT_MS`.                    |

## Comme bibliothèque

La couche de lecture est publiée seule, avec son rythme, son cache et son
vocabulaire d'erreurs, sans protocole attaché.

```ts
import { PequerecetasClient } from "mcp-pequerecetas/client";

const client = new PequerecetasClient();
const read = await client.getRecipe("paella-de-marisco");
```

Construit sans rien, il prend ses réglages dans l'environnement et envoie ses
diagnostics sur stderr. `loadConfig` et `createLogger` viennent du même point
d'entrée pour qui préfère les fixer dans le code :

```ts
import { createLogger, loadConfig, PequerecetasClient } from "mcp-pequerecetas/client";

const client = new PequerecetasClient({
  config: { ...loadConfig(), minIntervalMs: 5000 },
  logger: createLogger("debug"),
});
```

Toute lecture rend `{ data, cached }`, et `cached` dit si la réponse vient du
cache plutôt que du site.

## Rythme et attribution

Une requête à la fois, trois secondes d'écart, et l'intervalle s'élargit quand le
site demande de la place. Le User-Agent porte le nom du projet, sa version et une
adresse où joindre une personne.

Pequerecetas se lit gratuitement et paie son hébergement. Quand on montre une
recette à quelqu'un, on crédite le site et on lie la page d'où elle vient.

Ce serveur n'est pas affilié à Pequerecetas.

## Confidentialité

Rien n'est collecté. Le serveur lit `www.pequerecetas.com` et aucun autre hôte,
garde ce qu'il a lu en mémoire quinze minutes par défaut, n'écrit rien sur
disque, et envoie ses diagnostics sur stderr. Il ne porte aucun identifiant,
puisque le site n'en demande aucun. Voir [PRIVACY.md](./PRIVACY.md).

## Développement

```bash
npm install
npm run build:fixtures
npm test
npm run coverage
npm run check
```

Le corpus que lit la suite est écrit par `scripts/build-fixtures.mjs` et tient
des recettes inventées, donc aucun contenu tiers n'est stocké ici. Une suite en
direct tourne derrière `PQR_LIVE=1`, une requête par route.

## Contribuer

Les issues et les pull requests sont bienvenues. Voir
[CONTRIBUTING.md](./CONTRIBUTING.md).

## Licence

MIT. Voir [LICENSE](./LICENSE).
