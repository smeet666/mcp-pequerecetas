/**
 * Reading Pequerecetas, with no protocol attached.
 *
 * This layer is published on its own, so a program can import it as an ordinary
 * library and get the pace, the store and the error vocabulary without the
 * server around it. Nothing here knows what a tool is.
 *
 * An argument that cannot become an address is refused before a request is
 * made. The site answers an address it does not hold with a 404, and reporting
 * that as an absence would state something about the catalogue that a mistyped
 * argument caused.
 */

import type { Config, Logger } from "../config.js";
import { invalidInput } from "../errors.js";
import type { FacetListing, Listing, Read } from "../types.js";
import { Cache } from "./cache.js";
import { fetchPage } from "./http.js";
import { parseFacetSitemap } from "./parseFacets.js";
import { parseListing } from "./parseListing.js";
import { type ParsedPage, parseRecipePage } from "./parseRecipe.js";
import { RateLimiter } from "./rateLimiter.js";
import {
  facetSitemapUrl,
  facetUrl,
  FACET_NAMES,
  isFacetName,
  recipeUrl,
  searchUrl,
} from "./urls.js";

export interface ClientOptions {
  config: Config;
  logger: Logger;
  fetchImpl?: typeof fetch;
}

export class PequerecetasClient {
  private readonly config: Config;
  private readonly logger: Logger;
  private readonly fetchImpl: typeof fetch | undefined;
  private readonly limiter: RateLimiter;
  private readonly pages: Cache<ParsedPage>;
  private readonly listings: Cache<Listing>;
  private readonly facets: Cache<FacetListing>;

  constructor(options: ClientOptions) {
    this.config = options.config;
    this.logger = options.logger;
    this.fetchImpl = options.fetchImpl;
    this.limiter = new RateLimiter({ intervalMs: options.config.minIntervalMs });
    this.pages = new Cache<ParsedPage>(options.config.cacheTtlMs, options.config.cacheMaxEntries);
    this.listings = new Cache<Listing>(options.config.cacheTtlMs, options.config.cacheMaxEntries);
    this.facets = new Cache<FacetListing>(
      options.config.cacheTtlMs,
      options.config.cacheMaxEntries,
    );
  }

  /**
   * Read one page of the recipe section.
   *
   * What comes back says whether the page turned out to be a recipe or an
   * article gathering other recipes, because the site publishes both at this
   * kind of address and describes them alike.
   */
  async getRecipe(id: string): Promise<Read<ParsedPage>> {
    const named = id.trim();
    if (named === "") {
      throw invalidInput(
        "A recipe identifier is needed.",
        "An identifier is the last part of a recipe's address, such as 'paella-de-marisco' in /receta/paella-de-marisco/. Take one from search_recipes or browse_recipes.",
      );
    }

    const url = recipeUrl(named);
    const stored = this.pages.get(url);
    if (stored !== undefined) {
      this.logger.debug(`served from the store: ${url}`);
      return { data: stored, cached: true };
    }

    const page = await this.limiter.schedule(() => this.get(url));
    // Parsed before it is stored, so a page nobody could read is never served
    // back for the rest of the entry's lifetime.
    const parsed = parseRecipePage(page.body, named);
    this.pages.set(url, parsed);
    return { data: parsed, cached: false };
  }

  /**
   * Ask the site's own search.
   *
   * The site serves one page of results and answers a request for a second with
   * the first again, so nothing here pages: what comes back is what the search
   * matched, and the count is of the rows served.
   */
  async searchRecipes(query: string): Promise<Read<Listing>> {
    const asked = query.trim();
    if (asked === "") {
      throw invalidInput(
        "A query is needed to search.",
        "Pass a dish or an ingredient, such as 'paella' or 'calabacín'.",
      );
    }
    return await this.readListing(searchUrl(asked));
  }

  /** Read one page of a taxonomy's recipes. */
  async browseRecipes(facet: string, value: string, page: number): Promise<Read<Listing>> {
    const name = facet.trim();
    if (!isFacetName(name)) {
      throw invalidInput(
        `"${name}" is not a taxonomy this site browses by.`,
        `The taxonomies are ${FACET_NAMES.join(", ")}. Take a value from list_facets.`,
      );
    }
    const slug = value.trim();
    if (slug === "") {
      throw invalidInput(
        `A value is needed to browse "${name}".`,
        "Take one from list_facets: the site writes its own slugs, so one built by hand reaches a page it does not hold.",
      );
    }
    return await this.readListing(facetUrl(name, slug, page));
  }

  /**
   * Read the values one taxonomy publishes, or every taxonomy's.
   *
   * A taxonomy that cannot be read is set aside and named, rather than failing
   * the whole answer: seven listings and a note about the eighth is worth more
   * than nothing at all.
   */
  async listFacets(facet?: string): Promise<Read<FacetListing[]>> {
    const wanted = facet === undefined ? [...FACET_NAMES] : [facet.trim()];
    for (const name of wanted) {
      if (!isFacetName(name)) {
        throw invalidInput(
          `"${name}" is not a taxonomy this site publishes.`,
          `The taxonomies are ${FACET_NAMES.join(", ")}.`,
        );
      }
    }

    const listings: FacetListing[] = [];
    const skipped: string[] = [];
    let anyFresh = false;

    for (const name of wanted) {
      const url = facetSitemapUrl(name);
      const stored = this.facets.get(url);
      if (stored !== undefined) {
        listings.push(stored);
        continue;
      }
      try {
        const page = await this.limiter.schedule(() => this.get(url));
        const listing: FacetListing = { name, values: parseFacetSitemap(page.body, name) };
        this.facets.set(url, listing);
        listings.push(listing);
        anyFresh = true;
      } catch (error) {
        /* v8 ignore next -- every failure below this point is raised as an Error. */
        const reason = error instanceof Error ? error.message : "the read failed";
        this.logger.warn(`could not read the values of "${name}": ${reason}`);
        skipped.push(`${name}: ${reason}`);
      }
    }

    const read: Read<FacetListing[]> = { data: listings, cached: !anyFresh };
    return skipped.length > 0 ? { ...read, skipped } : read;
  }

  /** The spacing in force, reported rather than guessed. */
  get currentIntervalMs(): number {
    return this.limiter.currentIntervalMs;
  }

  private async readListing(url: string): Promise<Read<Listing>> {
    const stored = this.listings.get(url);
    if (stored !== undefined) {
      this.logger.debug(`served from the store: ${url}`);
      return { data: stored, cached: true };
    }
    const page = await this.limiter.schedule(() => this.get(url));
    const listing = parseListing(page.body);
    this.listings.set(url, listing);
    return { data: listing, cached: false };
  }

  private get(url: string) {
    return fetchPage({
      url,
      userAgent: this.config.userAgent,
      timeoutMs: this.config.timeoutMs,
      maxRetries: this.config.maxRetries,
      limiter: this.limiter,
      logger: this.logger,
      ...(this.fetchImpl === undefined ? {} : { fetchImpl: this.fetchImpl }),
    });
  }
}
