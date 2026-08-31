/**
 * Reading a page of results.
 *
 * The hard part is telling the results from the furniture. The site prints the
 * same menu, the same carousel and the same block of suggestions on every page,
 * all built out of links of exactly the shape a result has, so a reader taking
 * the whole document hands back the same recipes whatever was asked for.
 *
 * Two readings answer, in this order. A facet listing wraps its results in a
 * grid, which is the narrowest and surest boundary the theme offers. Search is
 * built without that grid, so its page is read after the furniture has been
 * taken out of it. The theme's own class names are generated per page and
 * cannot be relied on; what is stable is the structure WordPress writes the
 * menu with and the wrapper the carousel needs to work.
 */

import type { Listing, ListingRow } from "../types.js";
import { textOf, withoutLeadingPictogram } from "./html.js";
import { BASE_URL, recipeIdFromUrl, recipeUrl } from "./urls.js";

/** The parts of a page that stand identically on every other page. */
const FURNITURE: RegExp[] = [
  /<head\b[\s\S]*?<\/head>/gi,
  /<header\b[\s\S]*?<\/header>/gi,
  /<footer\b[\s\S]*?<\/footer>/gi,
  /<nav\b[\s\S]*?<\/nav>/gi,
  /<aside\b[\s\S]*?<\/aside>/gi,
  /<li[^>]*class="[^"]*menu-item[^"]*"[^>]*>[\s\S]*?<\/li>/gi,
  /<div[^>]*class="[^"]*splide[^"]*"[^>]*>[\s\S]*?<div class="splide__list">[\s\S]*?<\/div>/gi,
  /<div[^>]*class="[^"]*jet-listing-grid[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
];

const RESULTS_GRID = /class="[^"]*brx-grid[^"]*"/i;
/** Where a grid of results ends: the pagination the theme prints under it. */
const AFTER_RESULTS = /class="[^"]*bricks-pagination|<footer\b/i;

const PAGINATION_BLOCK = /class="[^"]*bricks-pagination[^"]*"[^>]*>([\s\S]*?)<\/div>/i;
const CURRENT_PAGE = /aria-current="page"[^>]*>\s*([\d.,]+)\s*</i;
const PAGE_LINK = /class="page-numbers"[^>]*href="[^"]*\/page\/(\d+)\//gi;

/** One row, read from the piece of markup that links it. */
const RECIPE_LINK = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
/**
 * The picture, taken from where the theme puts it.
 *
 * A lazily loaded image carries a blank placeholder in `src` and its real
 * address in `data-src`, so reading `src` alone hands back a blank square for
 * every row.
 */
const IMAGE_TAG = /<img\b[^>]*>/gi;
const DEFERRED_SOURCE = /\bdata-src="([^"]+)"/i;
const SOURCE = /\bsrc="([^"]+)"/i;
const PLACEHOLDER = /^data:/i;

export function parseListing(html: string): Listing {
  const withoutFurniture = strip(html);
  const results = grid(withoutFurniture) ?? withoutFurniture;

  return {
    rows: rowsOf(results),
    ...pagination(html),
  };
}

function strip(html: string): string {
  let stripped = html;
  for (const pattern of FURNITURE) {
    stripped = stripped.replace(pattern, " ");
  }
  return stripped;
}

/** The grid of results, when the page is one the theme builds with one. */
function grid(html: string): string | null {
  const opening = RESULTS_GRID.exec(html);
  if (opening === null) {
    return null;
  }
  const after = html.slice(opening.index);
  const end = AFTER_RESULTS.exec(after);
  return end === null ? after : after.slice(0, end.index);
}

/**
 * The rows, each read once.
 *
 * A card links the same recipe from its picture and from its title, so the
 * first link opens the row and the second adds nothing. The picture is looked
 * for in the whole card rather than in one link, because the theme puts the two
 * in separate elements.
 */
function rowsOf(results: string): ListingRow[] {
  const rows = new Map<string, { title: string; image: string | null }>();
  const matches = [...results.matchAll(RECIPE_LINK)];

  for (const [index, match] of matches.entries()) {
    /* v8 ignore next -- the pattern that matched carries this group. */
    const href = match[1] ?? "";
    const id = recipeIdFromUrl(href.startsWith("/") ? `${BASE_URL}${href}` : href);
    if (id === null) {
      continue;
    }

    /* v8 ignore next -- the pattern that matched carries this group. */
    const inner = match[2] ?? "";
    const title = withoutLeadingPictogram(textOf(inner));
    const nextAt = matches[index + 1]?.index ?? results.length;
    const image =
      pictureIn(inner) ??
      pictureIn(results.slice(match.index, nextAt)) ??
      pictureBefore(results, match.index);

    const held = rows.get(id);
    if (held === undefined) {
      rows.set(id, { title, image });
      continue;
    }
    // A card links its picture before its title, so the second link is usually
    // the one carrying words. Whichever link carried them is kept.
    rows.set(id, {
      title: held.title === "" ? title : held.title,
      image: held.image ?? image,
    });
  }

  return [...rows.entries()]
    .filter(([, row]) => row.title !== "")
    .map(([id, row]) => ({
      id,
      title: row.title,
      url: recipeUrl(id),
      image_url: row.image,
    }));
}

/**
 * The first address in a piece of markup that is a picture rather than a blank.
 *
 * Each tag is read whole before its attributes are picked out, because a lazily
 * loaded image carries both: taking the first of the two that appears would
 * always take the placeholder, which the theme writes first.
 */
function pictureIn(markup: string): string | null {
  /* v8 ignore next -- a match that found no tag is answered by the loop below. */
  for (const tag of markup.match(IMAGE_TAG) ?? []) {
    const source = DEFERRED_SOURCE.exec(tag)?.[1] ?? SOURCE.exec(tag)?.[1] ?? "";
    if (source !== "" && !PLACEHOLDER.test(source)) {
      return source;
    }
  }
  return null;
}

/** The picture of a card whose title link stands after the picture element. */
function pictureBefore(results: string, at: number): string | null {
  const opening = results.lastIndexOf("<img", at);
  return opening === -1 ? null : pictureIn(results.slice(opening, at));
}

/**
 * The page the site served, and whether it offers one after it.
 *
 * Read from the site's own pagination rather than from the page that was asked
 * for: a request past the last page is answered with the last page on some
 * paths and with a 404 on others, and only the page itself says which happened.
 */
function pagination(html: string): { page_served: number; has_more: boolean } {
  const block = PAGINATION_BLOCK.exec(html)?.[1];
  if (block === undefined) {
    return { page_served: 1, has_more: false };
  }
  const current = Number(CURRENT_PAGE.exec(block)?.[1] ?? 1);
  const offered = [...block.matchAll(PAGE_LINK)].map((match) => Number(match[1]));
  return {
    page_served: Number.isFinite(current) && current > 0 ? current : 1,
    has_more: offered.some((page) => page > current),
  };
}
