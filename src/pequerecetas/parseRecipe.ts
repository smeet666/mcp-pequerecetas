/**
 * Reading one page of the recipe section.
 *
 * The section serves three different things at the same kind of address, and
 * the site describes all three with the same structured type. A recipe may
 * carry its ingredients inside that block or leave them in the body of the
 * article, and an article that merely gathers recipes carries neither. Telling
 * them apart is this reader's work, because rendering the third as a recipe
 * would offer a dish nobody can cook, and reading only the first would answer
 * for a fraction of the section with an empty ingredient list.
 */

import { parseFailure } from "../errors.js";
import type {
  CollectionCore,
  ListingRow,
  Nutrition,
  Rating,
  RecipeCore,
  RecipeStep,
} from "../types.js";
import { textOf, withoutLeadingPictogram } from "./html.js";
import { BASE_URL, recipeIdFromUrl, recipeUrl } from "./urls.js";

const LD_JSON_BLOCK = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
/** The container the theme prints an article's own words inside. */
const POST_CONTENT = /<(?:div|article|main)[^>]*class="[^"]*post-content[^"]*"[^>]*>/i;
const HEADING = /<h([23])[^>]*>([\s\S]*?)<\/h\1>/gi;
const LIST = /<(ul|ol)[^>]*class="[^"]*wp-block-list[^"]*"[^>]*>([\s\S]*?)<\/\1>/gi;
const LIST_ITEM = /<li[^>]*>([\s\S]*?)<\/li>/gi;
const DYNAMIC_FIELD = /jet-listing-dynamic-field__content"\s*>([\s\S]*?)<\/div>/gi;
const LINK = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
const IMAGE_SRC = /<img[^>]*src="([^"]+)"/i;
const TABLE_OF_CONTENTS = /<div[^>]*id="toc_container"[^>]*>[\s\S]*?<\/div>/gi;
/**
 * Where the article stops and the comment form begins.
 *
 * The theme prints the form inside the same container the article's own words
 * are in, and it carries a heading and links of its own: an article read past
 * this point comes back built from "Deja el primer comentario" and pointing at
 * whatever a reader linked underneath.
 */
const COMMENTS =
  /<div[^>]*(?:id="comments"|class="[^"]*(?:brxe-post-comments|comment-respond)[^"]*")/i;

/** ISO 8601 durations, which is how the structured block states a time. */
const ISO_DURATION = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/i;
/** "30 min.", the way the theme prints a duration above an article. */
const PRINTED_MINUTES = /^(\d+)\s*min\.?$/i;
/** "4 rac.", the way it prints how many the recipe serves. */
const PRINTED_SERVINGS = /^\d+\s*(?:rac\.?|raciones|personas|comensales)$/i;
/** "90 Kcal", the way it prints the energy figure. */
const PRINTED_ENERGY = /^([\d.,]+)\s*k?cal/i;

const INGREDIENT_HEADING = /ingrediente/i;
const STEPS_HEADING = /^(?:como|c[oó]mo)\s+(?:hacer|preparar|cocinar|elaborar)/i;
const COMBINING_MARK = /[̀-ͯ]/g;

/**
 * How long a line has to be before it reads as an instruction.
 *
 * An ingredient line names a thing and a quantity, and a step is a sentence
 * about what to do with it. Where the page writes no heading, the length is
 * what separates the two lists, and a threshold is used rather than the mere
 * order of the lists because a page sometimes closes with a list of links to
 * other recipes.
 */
const STEP_MIN_LENGTH = 60;
/** Below this a list is furniture rather than the ingredients of a recipe. */
const INGREDIENTS_MIN_ITEMS = 2;

interface JsonObject {
  [key: string]: unknown;
}

export type ParsedPage =
  | { kind: "recipe"; recipe: RecipeCore }
  | { kind: "collection"; collection: CollectionCore };

/**
 * Read one page of the recipe section.
 *
 * A page whose structured block is missing, unreadable or about something other
 * than a recipe is a failure to read rather than a recipe with nothing in it.
 */
export function parseRecipePage(html: string, id: string): ParsedPage {
  const node = findRecipeNode(html, id);
  const body = postContent(html);
  const fields = headerFields(html);

  const common = {
    id,
    title: withoutLeadingPictogram(textOf(stringOf(node.name) ?? "")),
    url: recipeUrl(id),
    description: stringOf(node.description),
    published_at: stringOf(node.datePublished),
    modified_at: stringOf(node.dateModified),
    images: imagesOf(node.image),
  };

  const structuredIngredients = stringsOf(node.recipeIngredient);
  if (structuredIngredients.length > 0) {
    return {
      kind: "recipe",
      recipe: {
        ...common,
        source_shape: "structured",
        yield_text: yieldTextOf(node, fields),
        ingredients: structuredIngredients,
        steps: structuredSteps(node.recipeInstructions),
        prep_minutes: minutesOf(node.prepTime),
        cook_minutes: minutesOf(node.cookTime),
        total_minutes: minutesOf(node.totalTime) ?? printedMinutes(fields),
        ...rubrics(node),
        ...authorOf(node.author),
        rating: ratingOf(node.aggregateRating),
        nutrition: nutritionOf(node.nutrition, fields),
      },
    };
  }

  const fromBody = readBody(body);
  if (fromBody === null) {
    return {
      kind: "collection",
      collection: {
        ...common,
        headings: headingsOf(body),
        recipes: linkedRecipes(body),
      },
    };
  }

  return {
    kind: "recipe",
    recipe: {
      ...common,
      source_shape: "article",
      yield_text: yieldTextOf(node, fields),
      ingredients: fromBody.ingredients,
      steps: fromBody.steps,
      prep_minutes: minutesOf(node.prepTime),
      cook_minutes: minutesOf(node.cookTime),
      total_minutes: minutesOf(node.totalTime) ?? printedMinutes(fields),
      ...rubrics(node),
      ...authorOf(node.author),
      rating: ratingOf(node.aggregateRating),
      nutrition: nutritionOf(node.nutrition, fields),
    },
  };
}

/* -------------------------------------------------------------------------- */
/* The structured block                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The recipe node among everything else the page describes.
 *
 * A page carries several blocks and each block several nodes, describing the
 * site, the author and the trail of links as well as the recipe. A block that
 * does not parse is stepped over rather than failing the read, because the
 * recipe may well be in the next one.
 */
function findRecipeNode(html: string, id: string): JsonObject {
  let sawBlock = false;
  for (const match of html.matchAll(LD_JSON_BLOCK)) {
    sawBlock = true;
    let parsed: unknown;
    try {
      /* v8 ignore next -- the pattern that matched carries this group. */
      parsed = JSON.parse(match[1] ?? "");
    } catch {
      continue;
    }
    for (const node of nodesOf(parsed)) {
      if (typeIncludes(node["@type"], "Recipe")) {
        return node;
      }
    }
  }
  throw parseFailure(
    sawBlock
      ? `The page for "${id}" carries no recipe this server can read.`
      : `The page for "${id}" carries no structured block.`,
    { url: recipeUrl(id) },
  );
}

/** Every object a block holds, whether it is one node, a list or a graph. */
function nodesOf(parsed: unknown): JsonObject[] {
  if (Array.isArray(parsed)) {
    return parsed.flatMap(nodesOf);
  }
  if (!isObject(parsed)) {
    return [];
  }
  const graph = parsed["@graph"];
  return graph === undefined ? [parsed] : nodesOf(graph);
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A node's type, which the site writes as a string or as a list of them. */
function typeIncludes(value: unknown, wanted: string): boolean {
  if (typeof value === "string") {
    return value === wanted;
  }
  return Array.isArray(value) && value.some((entry) => entry === wanted);
}

const stringOf = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : null;

/** A number the site writes as a string, as it does with every figure. */
function numberOf(value: unknown): number | null {
  if (typeof value === "number") {
    /* v8 ignore next -- JSON carries no infinity, so a parsed number is finite. */
    return Number.isFinite(value) ? value : null;
  }
  const text = stringOf(value);
  if (text === null) {
    return null;
  }
  const parsed = Number(text.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function stringsOf(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => stringOf(entry)).filter((entry): entry is string => entry !== null);
}

/**
 * The pictures, with the empty strings taken out.
 *
 * The site pads its picture list to a fixed length, so a recipe with one
 * photograph publishes it beside two empty strings. Rendering those would offer
 * addresses that lead nowhere.
 */
function imagesOf(value: unknown): string[] {
  if (typeof value === "string") {
    const single = stringOf(value);
    return single === null ? [] : [single];
  }
  return stringsOf(value);
}

/** Minutes from an ISO 8601 duration, or null when the page published none. */
function minutesOf(value: unknown): number | null {
  const text = stringOf(value);
  if (text === null) {
    return null;
  }
  const match = ISO_DURATION.exec(text);
  if (match === null) {
    return null;
  }
  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  const total = days * 1440 + hours * 60 + minutes;
  // A duration of nothing is a field the page filled with a zero, which says no
  // more than leaving it out would have.
  return total > 0 ? total : null;
}

/** The steps the structured block names, one by one. */
function structuredSteps(value: unknown): RecipeStep[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry): RecipeStep[] => {
    if (typeof entry === "string") {
      const text = stringOf(entry);
      return text === null ? [] : [{ text, group: null, url: null, image: null }];
    }
    if (!isObject(entry)) {
      return [];
    }
    const text = stringOf(entry.text);
    return text === null
      ? []
      : [
          {
            text: textOf(text),
            group: null,
            url: stringOf(entry.url),
            image: stringOf(entry.image),
          },
        ];
  });
}

function ratingOf(value: unknown): Rating | null {
  if (!isObject(value)) {
    return null;
  }
  const rating = numberOf(value.ratingValue);
  const count = numberOf(value.ratingCount);
  if (rating === null || count === null) {
    return null;
  }
  return {
    value: rating,
    count,
    // The scale is read rather than assumed, because a value means nothing
    // without the top it was measured against.
    scale: numberOf(value.bestRating) ?? 5,
    worst: numberOf(value.worstRating) ?? 0,
  };
}

/**
 * The energy figure, from the structured block or from what the theme printed.
 *
 * The site publishes no serving size beside it, so the figure is carried in the
 * words it was written with and nothing is divided.
 */
function nutritionOf(value: unknown, fields: string[]): Nutrition | null {
  const fromBlock = isObject(value) ? stringOf(value.calories) : null;
  const text = fromBlock ?? fields.find((field) => PRINTED_ENERGY.test(field)) ?? null;
  if (text === null) {
    return null;
  }
  const figure = PRINTED_ENERGY.exec(text)?.[1] ?? null;
  return { text, calories: figure === null ? null : numberOf(figure) };
}

function authorOf(value: unknown): { author: string | null; author_url: string | null } {
  if (typeof value === "string") {
    return { author: stringOf(value), author_url: null };
  }
  if (!isObject(value)) {
    return { author: null, author_url: null };
  }
  return { author: stringOf(value.name), author_url: stringOf(value.url) };
}

/**
 * The rubric labels, split on the commas the site writes them with.
 *
 * The site writes several labels into one string and often opens it with a
 * space, so the pieces are trimmed. These are display labels: the slug a facet
 * browses by is published on the facet's own listing.
 */
function rubrics(node: JsonObject): {
  categories: string[];
  cuisines: string[];
  keywords: string[];
} {
  return {
    categories: labels(node.recipeCategory),
    cuisines: labels(node.recipeCuisine),
    keywords: labels(node.keywords),
  };
}

function labels(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => labels(entry));
  }
  const text = stringOf(value);
  if (text === null) {
    return [];
  }
  return text
    .split(",")
    .map((piece) => piece.trim())
    .filter((piece) => piece !== "");
}

/** How many the page says it serves: its own wording, from either place. */
function yieldTextOf(node: JsonObject, fields: string[]): string | null {
  const printed = fields.find((field) => PRINTED_SERVINGS.test(field));
  if (printed !== undefined) {
    return printed;
  }
  const published = stringOf(node.recipeYield);
  return published ?? null;
}

/* -------------------------------------------------------------------------- */
/* The body of the article                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The words the article itself carries.
 *
 * Everything outside this container is navigation, and it stands identically on
 * every page: reading the whole document would gather the same menu of recipes
 * whatever was asked for. A page whose container cannot be found is read from
 * nothing rather than from the furniture.
 */
function postContent(html: string): string {
  const match = POST_CONTENT.exec(html);
  if (match === null) {
    return "";
  }
  const body = html.slice(match.index + match[0].length);
  // What a reader wrote underneath is not what the page says about the dish.
  const comments = COMMENTS.exec(body);
  return comments === null ? body : body.slice(0, comments.index);
}

/**
 * The values the theme prints above an article: a time, a count, an energy.
 *
 * They sit in the header, outside the container the article's own words are in,
 * so they are read from what comes before it. Reading the whole document would
 * take the same fields from the cards the page suggests underneath, and report
 * another recipe's time as this one's.
 */
function headerFields(html: string): string[] {
  const opening = POST_CONTENT.exec(html);
  const header = opening === null ? html : html.slice(0, opening.index);
  return [...header.matchAll(DYNAMIC_FIELD)]
    .map((match) => {
      /* v8 ignore next -- the pattern that matched carries this group. */
      const inner = match[1] ?? "";
      return textOf(inner);
    })
    .filter((value) => value !== "");
}

function printedMinutes(fields: string[]): number | null {
  for (const field of fields) {
    const match = PRINTED_MINUTES.exec(field);
    if (match !== null) {
      return Number(match[1]);
    }
  }
  return null;
}

interface BodyReading {
  ingredients: string[];
  steps: RecipeStep[];
}

interface Section {
  /** The heading standing above the list, or null when none does. */
  heading: string | null;
  level: number;
  items: string[];
}

/**
 * Read the ingredients and the steps out of the body.
 *
 * Null when the body carries no ingredient list, which is what an article
 * gathering other recipes looks like.
 */
function readBody(body: string): BodyReading | null {
  const sections = listSections(body);
  if (sections.length === 0) {
    return null;
  }

  const named = sections.filter(
    (section) => section.heading !== null && INGREDIENT_HEADING.test(section.heading),
  );
  if (named.length > 0) {
    return { ingredients: named.flatMap((section) => section.items), steps: stepsFrom(sections) };
  }

  // With no heading naming them, the ingredients are the first list of short
  // lines, and the sentences that follow are the steps.
  const [first, ...rest] = sections;
  /* v8 ignore next -- the list was checked for emptiness above. */
  if (first === undefined || first.items.length < INGREDIENTS_MIN_ITEMS || isStepList(first)) {
    return null;
  }
  return {
    ingredients: first.items,
    steps: rest.filter(isStepList).flatMap((section) => stepsOf(section, null)),
  };
}

/** The steps, taken from the sections that follow the heading naming them. */
function stepsFrom(sections: Section[]): RecipeStep[] {
  const opening = sections.findIndex(
    (section) => section.heading !== null && STEPS_HEADING.test(fold(section.heading)),
  );
  if (opening === -1) {
    return sections.filter(isStepList).flatMap((section) => stepsOf(section, section.heading));
  }

  const steps: RecipeStep[] = [];
  /* v8 ignore next -- the index came from finding a section in this very list. */
  const openingLevel = sections[opening]?.level ?? 2;
  for (const section of sections.slice(opening)) {
    // A heading at the level of the one that opened the steps closes them: the
    // page carries on with what to serve the dish with, which is not a step.
    const closes =
      section.heading !== null &&
      section.level <= openingLevel &&
      !STEPS_HEADING.test(fold(section.heading));
    if (closes) {
      break;
    }
    const group =
      section.heading !== null && STEPS_HEADING.test(fold(section.heading))
        ? null
        : section.heading;
    steps.push(...stepsOf(section, group));
  }
  return steps;
}

function stepsOf(section: Section, group: string | null): RecipeStep[] {
  return section.items.map((text) => ({ text, group, url: null, image: null }));
}

/**
 * Whether a list reads as instructions.
 *
 * A page often closes with a list of links to other recipes, whose lines are as
 * short as an ingredient's and which belong to neither list.
 */
function isStepList(section: Section): boolean {
  return section.items.some((item) => item.length >= STEP_MIN_LENGTH);
}

/**
 * The lists of the body, each with the heading standing above it.
 *
 * The table of contents is dropped first: the theme prints it as a list of
 * links to the very headings this reads, so it would otherwise arrive as a
 * list of ingredients named after the section that follows it.
 */
function listSections(body: string): Section[] {
  const cleaned = body.replace(TABLE_OF_CONTENTS, "");
  const headings = [...cleaned.matchAll(HEADING)].map((match) => ({
    at: match.index,
    level: Number(match[1]),
    /* v8 ignore next -- the pattern that matched carries this group. */
    text: textOf(match[2] ?? ""),
  }));

  const sections: Section[] = [];
  for (const match of cleaned.matchAll(LIST)) {
    /* v8 ignore next -- the pattern that matched carries this group. */
    const items = [...(match[2] ?? "").matchAll(LIST_ITEM)]
      /* v8 ignore next -- the pattern that matched carries this group. */
      .map((item) => textOf(item[1] ?? ""))
      .filter((item) => item !== "");
    if (items.length === 0) {
      continue;
    }
    const above = headings.filter((heading) => heading.at < match.index).at(-1);
    sections.push({
      heading: above?.text ?? null,
      level: above?.level ?? 2,
      items,
    });
  }
  return sections;
}

/** Lowercase and strip accents, so "Como" and "Cómo" read alike. */
function fold(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(COMBINING_MARK, "");
}

function headingsOf(body: string): string[] {
  return [...body.replace(TABLE_OF_CONTENTS, "").matchAll(HEADING)]
    .map((match) => {
      /* v8 ignore next -- the pattern that matched carries this group. */
      const inner = match[2] ?? "";
      return textOf(inner);
    })
    .filter((text) => text !== "");
}

/**
 * The recipes an article points at.
 *
 * Read from the body alone, so the recipes the navigation links on every page
 * stay out of the answer.
 */
function linkedRecipes(body: string): ListingRow[] {
  const rows = new Map<string, ListingRow>();
  for (const match of body.matchAll(LINK)) {
    /* v8 ignore next -- the pattern that matched carries this group. */
    const href = match[1] ?? "";
    const id = recipeIdFromUrl(href.startsWith("/") ? `${BASE_URL}${href}` : href);
    if (id === null || rows.has(id)) {
      continue;
    }
    /* v8 ignore next -- the pattern that matched carries this group. */
    const inner = match[2] ?? "";
    const title = withoutLeadingPictogram(textOf(inner));
    if (title === "") {
      continue;
    }
    rows.set(id, {
      id,
      title,
      url: recipeUrl(id),
      image_url: IMAGE_SRC.exec(inner)?.[1] ?? null,
    });
  }
  return [...rows.values()];
}
