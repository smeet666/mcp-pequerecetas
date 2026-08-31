/**
 * The tool that reads one page of a taxonomy.
 *
 * This is where the site's own way of filing recipes is read: by diet, by
 * ingredient, by occasion, by the age of whoever eats it, by the appliance it
 * is cooked in. A page past the last one is answered by the site with a 404,
 * which comes back as an absence rather than as an empty page of results.
 */

import { z } from "zod";
import { PequerecetasError } from "../errors.js";
import type { PequerecetasClient } from "../pequerecetas/client.js";
import { FACET_NAMES } from "../pequerecetas/urls.js";
import type { Listing } from "../types.js";
import { strictInput } from "./arguments.js";
import { ok, type ToolResult, toToolError } from "./shared.js";

export const browseRecipesDescription =
  "Browse the recipes a taxonomy holds, one page at a time. 'facet' is one of " +
  `${FACET_NAMES.join(", ")}, and 'value' is a slug from list_facets: the site writes its own ` +
  "slugs and answers one built by hand with a page it does not hold. Read 'page_served' rather " +
  "than assuming the page asked for, and 'has_more' to know whether the site offers another. " +
  "'total_available' is null because the site prints no count on these pages. The taxonomies " +
  "cannot be combined: this site offers no way to ask for two at once.";

const MAX_PAGE = 200;

export const browseRecipesInput = {
  facet: z
    .string()
    .trim()
    .min(1)
    .describe(`The taxonomy to browse: ${FACET_NAMES.join(", ")}.`),
  value: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .describe("A slug from list_facets, such as 'thermomix'."),
  page: z
    .number()
    .int()
    .positive()
    .max(MAX_PAGE)
    .optional()
    .describe("Which page to read. The first when left out."),
} as const;

export const browseRecipesArgs = strictInput(browseRecipesInput);
export type BrowseRecipesArgs = z.infer<typeof browseRecipesArgs>;

const rowSchema = z.object({
  id: z.string().describe("The slug get_recipe takes."),
  title: z.string(),
  url: z.string(),
  image_url: z.string().nullable(),
});

export const browseRecipesOutputShape = {
  facet: z.string(),
  value: z.string(),
  page_served: z.number().int().describe("The page the site actually served."),
  results: z.array(rowSchema),
  result_count: z.number().int(),
  has_more: z.boolean().describe("Whether the site's own pagination offers a page after this one."),
  total_available: z.null().describe("Always null: the site prints no count on these pages."),
  cached: z.boolean(),
  notes: z.array(z.string()),
} as const;

const NO_TOTAL_NOTE =
  "The site prints no count of how many recipes a taxonomy holds, so none is stated here. Read 'has_more' to know whether another page follows.";
const EMPTY_NOTE = "The site served this page with no recipes on it.";

function render(facet: string, value: string, listing: Listing): string {
  if (listing.rows.length === 0) {
    return `No recipes on page ${listing.page_served} of ${facet}/${value}.`;
  }
  return [
    `${facet}/${value}, page ${listing.page_served}:`,
    ...listing.rows.map((row) => `- ${row.title} (${row.id})`),
  ].join("\n");
}

export async function runBrowseRecipes(
  client: PequerecetasClient,
  args: BrowseRecipesArgs,
): Promise<ToolResult> {
  const parsed = browseRecipesArgs.safeParse(args);
  if (!parsed.success) {
    return toToolError(
      new PequerecetasError(
        "invalid_input",
        parsed.error.issues.map((issue) => issue.message).join(" "),
      ),
    );
  }

  try {
    const page = parsed.data.page ?? 1;
    const read = await client.browseRecipes(parsed.data.facet, parsed.data.value, page);
    const notes = [NO_TOTAL_NOTE, ...(read.data.rows.length === 0 ? [EMPTY_NOTE] : [])];

    return ok(
      {
        facet: parsed.data.facet,
        value: parsed.data.value,
        page_served: read.data.page_served,
        results: read.data.rows,
        result_count: read.data.rows.length,
        has_more: read.data.has_more,
        total_available: null,
        cached: read.cached,
        notes,
      },
      render(parsed.data.facet, parsed.data.value, read.data),
      { notes },
    );
  } catch (error) {
    return toToolError(error);
  }
}
