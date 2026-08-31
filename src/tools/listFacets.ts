/**
 * The tool that publishes the slugs the site browses by.
 *
 * The site writes its own slugs and answers one built by hand with a page it
 * does not hold, so nothing is guessed: every value here was read from the
 * sitemap the site publishes for that taxonomy. A taxonomy that could not be
 * read is named in the notes rather than passed over, because a listing short
 * of one taxonomy reads exactly like a site that has seven.
 */

import { z } from "zod";
import { PequerecetasError } from "../errors.js";
import type { PequerecetasClient } from "../pequerecetas/client.js";
import { FACET_NAMES } from "../pequerecetas/urls.js";
import type { FacetListing } from "../types.js";
import { strictInput } from "./arguments.js";
import { ok, type ToolResult, toToolError } from "./shared.js";

export const listFacetsDescription =
  `List the values the site browses its recipes by. The taxonomies are ${FACET_NAMES.join(", ")}: ` +
  "diet, the age of whoever eats it, main ingredient, occasion, moment of the day, appliance, " +
  "cuisine and kind of dish. Call this before browse_recipes rather than spelling a value " +
  "yourself. Pass 'facet' for one taxonomy, or leave it out for all eight, which costs one " +
  "request per taxonomy.";

export const listFacetsInput = {
  facet: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(`One taxonomy: ${FACET_NAMES.join(", ")}. All eight when left out.`),
} as const;

export const listFacetsArgs = strictInput(listFacetsInput);
export type ListFacetsArgs = z.infer<typeof listFacetsArgs>;

export const listFacetsOutputShape = {
  facets: z.array(
    z.object({
      name: z.string().describe("The taxonomy, as browse_recipes takes it."),
      value_count: z.number().int().describe("Values this taxonomy publishes."),
      values: z.array(
        z.object({
          value: z.string().describe("The slug browse_recipes takes."),
          url: z.string(),
        }),
      ),
    }),
  ),
  cached: z.boolean(),
  notes: z.array(z.string()),
} as const;

const ORDER_NOTE =
  "The values are in the order the site publishes them, which is not alphabetical. A value is what browse_recipes takes: the site writes these slugs itself, so one built by hand reaches a page it does not hold.";

function render(facets: FacetListing[]): string {
  return facets
    .map(
      (facet) =>
        `${facet.name} (${facet.values.length}): ${facet.values.map((v) => v.value).join(", ")}`,
    )
    .join("\n");
}

export async function runListFacets(
  client: PequerecetasClient,
  args: ListFacetsArgs,
): Promise<ToolResult> {
  const parsed = listFacetsArgs.safeParse(args);
  if (!parsed.success) {
    return toToolError(
      new PequerecetasError(
        "invalid_input",
        parsed.error.issues.map((issue) => issue.message).join(" "),
      ),
    );
  }

  try {
    const read =
      parsed.data.facet === undefined
        ? await client.listFacets()
        : await client.listFacets(parsed.data.facet);

    const notes = [
      ORDER_NOTE,
      ...(read.skipped ?? []).map(
        (reason) => `One taxonomy could not be read and is missing from this listing: ${reason}`,
      ),
    ];

    return ok(
      {
        facets: read.data.map((facet) => ({
          name: facet.name,
          value_count: facet.values.length,
          values: facet.values,
        })),
        cached: read.cached,
        notes,
      },
      render(read.data),
      { notes },
    );
  } catch (error) {
    return toToolError(error);
  }
}
