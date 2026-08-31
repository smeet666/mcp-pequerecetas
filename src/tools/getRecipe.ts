/**
 * The tool that reads one page of the recipe section.
 *
 * The section serves recipes and articles that gather recipes at the same kind
 * of address, and the site describes both alike. The answer says which one came
 * back, because a collection offers no dish to cook and a caller has to be able
 * to tell.
 */

import { z } from "zod";
import { PequerecetasError } from "../errors.js";
import { scaleLines } from "../recipe/scale.js";
import type { CollectionCore, Recipe, RecipeCore, ScaledIngredient } from "../types.js";
import type { PequerecetasClient } from "../pequerecetas/client.js";
import type { ParsedPage } from "../pequerecetas/parseRecipe.js";
import { strictInput } from "./arguments.js";
import { lineMarker, ok, type ToolResult, toToolError } from "./shared.js";

export const getRecipeDescription =
  "Read one page of the recipe section by the slug in its address, such as 'paella-de-marisco'. " +
  "'kind' says what the page turned out to be: a 'recipe', or a 'collection', which is an article " +
  "gathering other recipes and carries no ingredients of its own. A recipe says under " +
  "'source_shape' where its ingredients were read: 'structured' from the block the page publishes " +
  "for search engines, 'article' from the body of the page, which is where most of this site's " +
  "recipes keep them. Pass 'servings' to rescale the quantities; a recipe whose page states no " +
  "number of servings comes back unscaled and says so. A line naming a tool rather than an " +
  "ingredient is marked and never multiplied.";

const MAX_SERVINGS = 200;

export const getRecipeInput = {
  id: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .describe("The slug in a recipe's address, from search_recipes or browse_recipes."),
  servings: z
    .number()
    .int()
    .positive()
    .max(MAX_SERVINGS)
    .optional()
    .describe("Rescale the quantities to this many. Left out, the recipe comes back as published."),
} as const;

export const getRecipeArgs = strictInput(getRecipeInput);
export type GetRecipeArgs = z.infer<typeof getRecipeArgs>;

const scaledIngredientSchema = z.object({
  text: z.string(),
  original: z.string(),
  scaling: z.enum(["scaled", "rounded", "unscaled"]),
  amount: z.number().nullable(),
  amount_max: z.number().nullable(),
  unit: z.string().nullable(),
  is_heading: z.boolean(),
  is_equipment: z.boolean().describe("True for a line naming a tool rather than something eaten."),
  note: z.string().optional(),
});

const stepSchema = z.object({
  text: z.string(),
  group: z.string().nullable().describe("The page's own heading for the group this step is under."),
  url: z.string().nullable(),
  image: z.string().nullable(),
});

const ratingSchema = z.object({
  value: z.number(),
  count: z.number().int(),
  scale: z.number().describe("The top of the scale, as published."),
  worst: z.number(),
});

const recipeSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  description: z.string().nullable(),
  published_at: z.string().nullable(),
  modified_at: z.string().nullable(),
  source_shape: z.enum(["structured", "article"]),
  yield: z.object({
    original_count: z.number().nullable(),
    original_text: z.string().nullable(),
    requested: z.number().nullable(),
    unit: z.string().nullable(),
    factor: z.number(),
  }),
  ingredients: z.array(scaledIngredientSchema),
  steps: z.array(stepSchema),
  prep_minutes: z.number().nullable(),
  cook_minutes: z.number().nullable(),
  total_minutes: z.number().nullable(),
  categories: z.array(z.string()),
  cuisines: z.array(z.string()),
  keywords: z.array(z.string()),
  author: z.string().nullable(),
  author_url: z.string().nullable(),
  rating: ratingSchema.nullable(),
  nutrition: z.object({ text: z.string(), calories: z.number().nullable() }).nullable(),
  images: z.array(z.string()),
});

const collectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  description: z.string().nullable(),
  published_at: z.string().nullable(),
  modified_at: z.string().nullable(),
  headings: z.array(z.string()),
  recipes: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      url: z.string(),
      image_url: z.string().nullable(),
    }),
  ),
  images: z.array(z.string()),
});

/**
 * The two shapes a page comes back in, declared as a union.
 *
 * A collection carries a fraction of what a recipe carries, so one optimistic
 * schema describing both would announce fields that half the answers never
 * hold.
 */
export const getRecipeOutputShape = {
  kind: z.enum(["recipe", "collection"]),
  recipe: recipeSchema.optional(),
  collection: collectionSchema.optional(),
  cached: z.boolean(),
  notes: z.array(z.string()),
} as const;

/** The figure a wording such as "4 rac." opens with. */
const LEADING_FIGURE = /(\d+)/;
/** That figure, to be taken off so the site's own word for a serving is left. */
const FIGURE_AND_SPACE = /^\d+\s*/;

/** How many the page said it serves, read out of its own wording. */
function servingsIn(text: string | null): number | null {
  if (text === null) {
    return null;
  }
  const figure = LEADING_FIGURE.exec(text)?.[1];
  return figure === undefined ? null : Number(figure);
}

const UNSCALABLE_NOTE =
  "This recipe was left as published: its page does not state how many it serves, so there is nothing to scale from.";
const COLLECTION_NOTE =
  "This page gathers other recipes rather than being one. It carries no ingredients and no steps of its own; read one of the recipes it points at.";
const ARTICLE_NOTE =
  "The ingredients and steps were read from the body of the page, which is where this site writes most of them. The steps carry the page's own headings under 'group'.";
const EQUIPMENT_NOTE =
  "Lines marked 'is_equipment' name tools rather than ingredients: the site writes them in the same list, and they are never multiplied.";

function renderRecipe(recipe: Recipe): string {
  const lines: string[] = [recipe.title];
  if (recipe.description !== null) {
    lines.push(recipe.description);
  }

  const badges: string[] = [];
  if (recipe.total_minutes !== null) {
    badges.push(`${recipe.total_minutes} min`);
  }
  if (recipe.yield.original_text !== null) {
    badges.push(recipe.yield.original_text);
  }
  if (recipe.rating !== null) {
    badges.push(`${recipe.rating.value}/${recipe.rating.scale} (${recipe.rating.count})`);
  }
  if (badges.length > 0) {
    lines.push(badges.join(" · "));
  }

  lines.push("", "Ingredientes:");
  for (const line of recipe.ingredients) {
    lines.push(`- ${line.text}${lineMarker(line)}`);
  }

  if (recipe.steps.length > 0) {
    lines.push("", "Pasos:");
    let group: string | null = null;
    for (const [index, step] of recipe.steps.entries()) {
      if (step.group !== null && step.group !== group) {
        group = step.group;
        lines.push(`  ${group}`);
      }
      lines.push(`${index + 1}. ${step.text}`);
    }
  }

  lines.push("", recipe.url);
  return lines.join("\n");
}

function renderCollection(collection: CollectionCore): string {
  const lines: string[] = [collection.title];
  if (collection.description !== null) {
    lines.push(collection.description);
  }
  lines.push("", `This page gathers ${collection.recipes.length} recipe(s):`);
  for (const row of collection.recipes) {
    lines.push(`- ${row.title} (${row.id})`);
  }
  lines.push("", collection.url);
  return lines.join("\n");
}

/** The recipe with its quantities taken to what was asked for. */
function scaleRecipe(core: RecipeCore, servings: number | undefined): Recipe {
  const published = servingsIn(core.yield_text);
  const factor =
    servings === undefined || published === null || published <= 0 ? 1 : servings / published;

  const ingredients: ScaledIngredient[] = scaleLines(
    core.ingredients.map((text) => ({ text, is_heading: false })),
    { factor },
  );

  const { ingredients: _lines, yield_text, ...rest } = core;
  return {
    ...rest,
    yield: {
      original_count: published,
      original_text: yield_text,
      requested: servings ?? null,
      // The site prints "4 rac.", which is its own abbreviation for a serving.
      unit: yield_text === null ? null : yield_text.replace(FIGURE_AND_SPACE, "").trim() || null,
      factor,
    },
    ingredients,
  };
}

function notesFor(page: ParsedPage, recipe: Recipe | null, asked: number | undefined): string[] {
  if (page.kind === "collection") {
    return [COLLECTION_NOTE];
  }
  /* v8 ignore next -- a page read as a recipe always brings one. */
  if (recipe === null) {
    return [];
  }
  const notes: string[] = [];
  if (recipe.source_shape === "article") {
    notes.push(ARTICLE_NOTE);
  }
  if (asked !== undefined && recipe.yield.factor === 1 && recipe.yield.original_count === null) {
    notes.push(UNSCALABLE_NOTE);
  }
  if (recipe.ingredients.some((line) => line.is_equipment)) {
    notes.push(EQUIPMENT_NOTE);
  }
  return notes;
}

export async function runGetRecipe(
  client: PequerecetasClient,
  args: GetRecipeArgs,
): Promise<ToolResult> {
  const parsed = getRecipeArgs.safeParse(args);
  if (!parsed.success) {
    return toToolError(
      new PequerecetasError(
        "invalid_input",
        parsed.error.issues.map((issue) => issue.message).join(" "),
      ),
    );
  }

  try {
    const read = await client.getRecipe(parsed.data.id);

    if (read.data.kind === "collection") {
      const notes = notesFor(read.data, null, parsed.data.servings);
      return ok(
        {
          kind: "collection",
          collection: read.data.collection,
          cached: read.cached,
          notes,
        },
        renderCollection(read.data.collection),
        { notes },
      );
    }

    const recipe = scaleRecipe(read.data.recipe, parsed.data.servings);
    const notes = notesFor(read.data, recipe, parsed.data.servings);
    return ok({ kind: "recipe", recipe, cached: read.cached, notes }, renderRecipe(recipe), {
      notes,
    });
  } catch (error) {
    return toToolError(error);
  }
}
