# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses
[semantic versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-09-01

The reading is settled: what a recipe page states, what it leaves out, and what
this server is allowed to say about either. Every figure a caller reads is now
one the page wrote or one this server qualifies in the same breath.

### Changed

- **A recipe now takes up to 1000 servings, where it stopped at 200.** The same
  figure bounds `scale_ingredients`, so a count one tool refuses is no longer
  one the other quietly accepts.
- **The floor is Node 24.20.0.** The 24 line stays supported and the older
  patches of it leave.
- **A quantity is written to the precision the kitchen it is made in can hold.**
  From five units up the step is the whole unit, so oil reads `6 g` rather than
  `6,3 g`. A mass reaching the unit above climbs to it and says the figure
  moved, so rice for two hundred and fifty reads `15,63 kg` rather than
  `15625 g`.
- **The amount reported is the figure the line shows.** A mass climbing a ladder
  could read `15,63 kg` while the field carried `15.625`.
- **Search says what it is showing.** The note claiming the rows returned were
  all the site offers is gone once a limit has cut them, a second note states
  that the order is the site's own rather than by relevance, and the note about
  rows left out says they were cut in that order.

### Fixed

- **A chicken liver was called an approximate measure.** The rule reading a
  vessel out of "noun + de + food" took the liver for the vessel; offal and the
  cuts a butcher makes now sit with the words naming part of the food.
- **A figure read out of an article is qualified whatever the factor.** A line
  reading "Unas hojas de menta fresca" came back with `amount: 3` and nothing
  saying where the three came from.
- **The pan a paella is cooked in is marked as a tool**, where it arrived among
  the ingredients carrying "no quantity given; adjust to taste".
- **A note no longer says a figure was rounded from itself.** It adds digits
  until the two read apart, so `15,63 kg` reads as rounded from `15,625`.
- **A second quantity in the same line is stated**, including a bare count such
  as the "otras 2 para decorar" a page adds after the rosemary it measured.
- **Offal is halved rather than quartered**, since a quarter of a liver is not a
  share anyone takes.
- **A measure keeps the singular under one**, and a noun stressed on its last
  syllable loses its written accent in the plural: `1/4 cucharadita`, and
  `limón` makes `limones`.
- **An adjective is agreed even where the page closes on an aside in brackets**,
  as in "1 pollo pequeño (aprox. 1,25 kg)".
- **The time, the servings and the energy the theme prints above an article are
  read.** The servings carry the site's own wording, and an energy figure the
  page prints is no longer lost.
- **The reading layer builds with no arguments**, which is what its
  documentation shows, and publishes `loadConfig` and `createLogger`.

## [0.1.0] - 2026-08-31

First release.

### Added

- `get_recipe` reads one page of the recipe section. `kind` tells a recipe from
  a collection, which is an article gathering other recipes, and `source_shape`
  says whether the ingredients came from the structured block a page publishes or
  from the body of the article. Pass `servings` to rescale the quantities.
- `search_recipes` searches the site for a dish or an ingredient.
- `list_facets` lists the values each of the eight taxonomies publishes, read
  from the sitemap the site serves for it.
- `browse_recipes` reads one page of a taxonomy, reporting the page the site
  served and whether another follows.
- `scale_ingredients` rescales any Spanish ingredient list offline, marking each
  line `scaled`, `rounded` or `unscaled`.
- A line naming a tool rather than something eaten is marked `is_equipment` and
  is never multiplied.
- The reading layer is published under the `./client` subpath, with its pacing,
  its store and its error vocabulary, and no protocol attached.

[1.0.0]: https://github.com/smeet666/mcp-pequerecetas/releases/tag/v1.0.0
[0.1.0]: https://github.com/smeet666/mcp-pequerecetas/releases/tag/v0.1.0
