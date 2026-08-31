/**
 * Every address this server reads, built in one place.
 *
 * A slug arrives from a listing the site published, and it is escaped all the
 * same: a value carrying a slash would otherwise address a different section of
 * the site than the one the caller asked about.
 */

export const BASE_URL = "https://www.pequerecetas.com";

/**
 * The taxonomies the site publishes a sitemap of values for.
 *
 * Held in alphabetical order because a listing of facets is rendered from it,
 * and a client caching that listing compares it between calls.
 */
export const FACET_NAMES = [
  "dieta",
  "edad",
  "ingrediente",
  "ocasion",
  "recetas-de",
  "tecnica",
  "tipo-de-cocina",
  "tipo-plato",
] as const;

export type FacetName = (typeof FACET_NAMES)[number];

export function isFacetName(value: string): value is FacetName {
  return (FACET_NAMES as readonly string[]).includes(value);
}

/** The shape of a recipe address, whose last part is the slug. */
const RECIPE_PATH = /^\/receta\/([^/]+)\/?$/;

export function recipeUrl(id: string): string {
  return `${BASE_URL}/receta/${encodeURIComponent(id)}/`;
}

/**
 * The slug inside an address the site published, or null.
 *
 * Null covers three different things a caller does not have to tell apart here:
 * an address on another host, a page outside the recipe section, and the index
 * of that section, which lists recipes without being one.
 */
export function recipeIdFromUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.origin !== BASE_URL) {
    return null;
  }
  const match = RECIPE_PATH.exec(parsed.pathname);
  if (!match?.[1]) {
    return null;
  }
  return decodeURIComponent(match[1]);
}

export function facetUrl(name: string, value: string, page: number): string {
  const base = `${BASE_URL}/${name}/${encodeURIComponent(value)}/`;
  return page <= 1 ? base : `${base}page/${page}/`;
}

export function facetSitemapUrl(name: string): string {
  return `${BASE_URL}/${name}-sitemap.xml`;
}

export function searchUrl(query: string): string {
  const params = new URLSearchParams({ s: query });
  return `${BASE_URL}/?${params.toString()}`;
}

export function feedUrl(): string {
  return `${BASE_URL}/receta/feed/`;
}
