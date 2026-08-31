# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses
[semantic versioning](https://semver.org/spec/v2.0.0.html).

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

[0.1.0]: https://github.com/smeet666/mcp-pequerecetas/releases/tag/v0.1.0
