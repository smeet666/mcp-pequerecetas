/**
 * The tool that asks the site's own search.
 *
 * The site answers a search on a single page and serves that same page for any
 * page asked of it, so there is one page of results and no more. What comes
 * back is counted for what it is: the rows served, never a total the site has
 * not published.
 */

import { z } from "zod";
import { PequerecetasError } from "../errors.js";
import type { PequerecetasClient } from "../pequerecetas/client.js";
import type { ListingRow } from "../types.js";
import { strictInput } from "./arguments.js";
import { ok, type ToolResult, toToolError } from "./shared.js";

export const searchRecipesDescription =
  "Search Pequerecetas for a dish or an ingredient, in Spanish. The site serves its search on one " +
  "page and offers no second page, so 'result_count' counts the rows served and 'total_available' " +
  "is null: the site publishes no count of what a search matched. The rows come in the site's own " +
  "order, which is not by how well they match, so a dish named in the query can sit well down the " +
  "page and 'limit' cuts in that order. A row carries the slug that get_recipe takes. Some rows are articles gathering recipes rather than recipes, which get_recipe " +
  "reports as a 'collection'. To narrow by diet, ingredient, technique or the age of the eater, use " +
  "list_facets and browse_recipes instead: this site's search takes no filters.";

const MAX_LIMIT = 60;

export const searchRecipesInput = {
  query: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .describe("What to search for, in Spanish: a dish, an ingredient, a technique."),
  limit: z
    .number()
    .int()
    .positive()
    .max(MAX_LIMIT)
    .optional()
    .describe(`Rows to return, at most ${MAX_LIMIT}. Left out, every row served comes back.`),
} as const;

export const searchRecipesArgs = strictInput(searchRecipesInput);
export type SearchRecipesArgs = z.infer<typeof searchRecipesArgs>;

const rowSchema = z.object({
  id: z.string().describe("The slug get_recipe takes."),
  title: z.string(),
  url: z.string(),
  image_url: z.string().nullable(),
});

export const searchRecipesOutputShape = {
  query: z.string(),
  results: z.array(rowSchema),
  result_count: z.number().int().describe("Rows returned."),
  total_available: z
    .null()
    .describe("Always null: the site publishes no count of what a search matched."),
  cached: z.boolean(),
  notes: z.array(z.string()),
} as const;

const WHOLE_PAGE_NOTE =
  "This site serves its search on one page and answers a request for a second with the first again, so these are all the rows it offers for this query. It publishes no count of what the query matched.";
const CUT_PAGE_NOTE =
  "This site serves its search on one page and answers a request for a second with the first again. It publishes no count of what the query matched.";
/**
 * What a caller has to know before reading a shortened list as an absence.
 *
 * The site orders its results its own way, and a dish named in the query can
 * come well down the page: a search for a Spanish omelette serves an unrelated
 * chilli first. A limit cuts in that order, so the rows left out are not the
 * least relevant ones.
 */
const TRIMMED_NOTE =
  "More rows were served than were asked for, and the rest were left out. They were cut in the order above, which is the site's own, so a dish missing from these rows may still be further down the page: ask again without a limit before reading this as an absence.";
const ORDER_NOTE =
  "The rows are in the order the site serves them in, which is not by how well they match the query.";
const NOTHING_NOTE =
  "The site matched nothing for this query. It searches the words of a page, so a dish spelled another way or named in another language may still be there.";

function render(query: string, rows: ListingRow[]): string {
  if (rows.length === 0) {
    return `Nothing came back for "${query}".`;
  }
  return [
    `${rows.length} result(s) for "${query}":`,
    ...rows.map((row) => `- ${row.title} (${row.id})`),
  ].join("\n");
}

export async function runSearchRecipes(
  client: PequerecetasClient,
  args: SearchRecipesArgs,
): Promise<ToolResult> {
  const parsed = searchRecipesArgs.safeParse(args);
  if (!parsed.success) {
    return toToolError(
      new PequerecetasError(
        "invalid_input",
        parsed.error.issues.map((issue) => issue.message).join(" "),
      ),
    );
  }

  try {
    const read = await client.searchRecipes(parsed.data.query);
    const served = read.data.rows;
    const rows = parsed.data.limit === undefined ? served : served.slice(0, parsed.data.limit);

    const cut = rows.length < served.length;
    const notes =
      rows.length === 0
        ? [NOTHING_NOTE]
        : [cut ? CUT_PAGE_NOTE : WHOLE_PAGE_NOTE, ORDER_NOTE, ...(cut ? [TRIMMED_NOTE] : [])];

    return ok(
      {
        query: parsed.data.query,
        results: rows,
        result_count: rows.length,
        total_available: null,
        cached: read.cached,
        notes,
      },
      render(parsed.data.query, rows),
      { notes },
    );
  } catch (error) {
    return toToolError(error);
  }
}
