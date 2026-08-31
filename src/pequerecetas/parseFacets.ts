/**
 * Reading the values of a taxonomy.
 *
 * Each taxonomy publishes a sitemap of its own, which is the only place the
 * site states its slugs. A page browsed by a slug that was guessed rather than
 * read comes back as a page that does not exist, so nothing here builds one.
 */

import type { FacetValue } from "../types.js";
import { BASE_URL } from "./urls.js";

const LOCATION = /<loc>([^<]+)<\/loc>/gi;
const TRAILING_SLASH = /\/$/;

/**
 * The values a taxonomy's sitemap lists, in the order it lists them.
 *
 * The order is the site's own and is kept, because a sitemap often puts the
 * most used value first, which is worth more to a reader than the alphabet.
 */
export function parseFacetSitemap(xml: string, name: string): FacetValue[] {
  const prefix = `${BASE_URL}/${name}/`;
  const values = new Map<string, FacetValue>();

  for (const match of xml.matchAll(LOCATION)) {
    /* v8 ignore next -- the pattern that matched carries this group. */
    const address = (match[1] ?? "").trim();
    if (!address.startsWith(prefix)) {
      continue;
    }
    const slug = address.slice(prefix.length).replace(TRAILING_SLASH, "");
    if (slug === "" || slug.includes("/")) {
      continue;
    }
    const value = decodeURIComponent(slug);
    if (!values.has(value)) {
      values.set(value, { value, url: address });
    }
  }

  return [...values.values()];
}
