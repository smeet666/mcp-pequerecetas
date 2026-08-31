/**
 * The shapes every layer agrees on.
 *
 * A read carries whether it came from the store, so a caller can tell a fresh
 * answer from a repeated one without asking the site again.
 */

/** The envelope every read returns. */
export interface Read<T> {
  data: T;
  cached: boolean;
  /** Rows the server declined to render, and why, when any were dropped. */
  skipped?: string[];
}

/** What was done to a quantity, and how exact the result is. */
export type Scaling = "scaled" | "rounded" | "unscaled";

/**
 * One line of an ingredient list.
 *
 * `scaling` carries the whole honesty of the shape. `scaled` means the
 * arithmetic landed exactly. `rounded` means the value moved, because a
 * countable thing was taken to the smallest share a cook can measure out or a
 * measurement was demoted to a smaller unit to stay usable. `unscaled` means the
 * line carries nothing that can be multiplied, so it was left as published.
 */
export interface ScaledIngredient {
  /** The line as it now reads. */
  text: string;
  /** The line as the site published it. */
  original: string;
  scaling: Scaling;
  amount: number | null;
  /** The upper end of a published range, such as "2 a 3 tazas". */
  amount_max: number | null;
  unit: string | null;
  /**
   * True for a line the page prints as a heading inside the list, such as
   * "Para el relleno:". It names the part that follows and holds no quantity.
   */
  is_heading: boolean;
  /**
   * True for a line naming a tool rather than something eaten.
   *
   * The site writes equipment among the ingredients, so a line reading
   * "Freidora de aire" arrives in the same list as the chicken. Multiplying it
   * would order six air fryers, so it is marked and left alone.
   */
  is_equipment: boolean;
  /**
   * Why the line was rounded, clamped or left alone.
   *
   * Absent when the arithmetic landed exactly and there is nothing to qualify:
   * a note beside every line would read as decoration rather than as the
   * warning it is.
   */
  note?: string;
}

/** How many the recipe was written for, and how many were asked for. */
export interface RecipeYield {
  /** The number the page printed, when its wording carries one. */
  original_count: number | null;
  /** The page's own wording, which is the claim it actually made. */
  original_text: string | null;
  /** What the caller asked for, or null when they asked for nothing. */
  requested: number | null;
  /** The site's own word for what it counts, such as "raciones". */
  unit: string | null;
  /** What the quantities were multiplied by. 1 when nothing was asked. */
  factor: number;
}

/** The rating the site publishes, on the scale the site publishes it against. */
export interface Rating {
  value: number;
  /** Ratings counted, which is what the page prints beside the stars. */
  count: number;
  /** The top of the scale, as published, so a value is never read against a guess. */
  scale: number;
  /** The bottom of the scale, as published. */
  worst: number;
}

/**
 * The energy figure the page prints, in the words it prints it with.
 *
 * The site publishes a single figure and no serving size, so nothing here is
 * converted or divided: an amount per serving would be arithmetic the page
 * never showed.
 */
export interface Nutrition {
  /** The figure as published, such as "90 Kcal". */
  text: string;
  calories: number | null;
}

/**
 * Which reading answered for a recipe.
 *
 * The site publishes some recipes with their ingredients inside the structured
 * block its pages carry, and writes the rest into the body of the article
 * instead. Both are read, and the answer says which one it was, because the two
 * carry different fields: the structured block names the steps one by one,
 * while the body groups them under headings of its own.
 */
export type SourceShape = "structured" | "article";

/** One step, with the heading the page grouped it under when it grouped it. */
export interface RecipeStep {
  text: string;
  /** The page's own heading for the group this step belongs to. */
  group: string | null;
  /** The anchor the structured block gives a step, when it gives one. */
  url: string | null;
  image: string | null;
}

/** One value of a taxonomy, as its sitemap publishes it. */
export interface FacetValue {
  /** The slug, which is what browse takes back. */
  value: string;
  url: string;
}

/** A taxonomy the site browses its recipes by. */
export interface FacetListing {
  /** The taxonomy name as the site's own addresses spell it, such as "tecnica". */
  name: string;
  values: FacetValue[];
}

/**
 * One recipe, as the reading layer establishes it.
 *
 * Quantities are carried as published. Rescaling belongs above the seam, so a
 * program importing this layer as a library reads what the site wrote.
 */
export interface RecipeCore {
  id: string;
  title: string;
  url: string;
  description: string | null;
  published_at: string | null;
  modified_at: string | null;

  source_shape: SourceShape;

  /** The page's own wording for how many it serves, such as "4 rac.". */
  yield_text: string | null;
  /** The ingredient lines as published, equipment included. */
  ingredients: string[];
  steps: RecipeStep[];

  /** Null when the page prints no such figure. A zero is never invented. */
  prep_minutes: number | null;
  cook_minutes: number | null;
  total_minutes: number | null;

  /**
   * The rubric labels the page publishes, split on the commas it writes them
   * with.
   *
   * These are the only classification a recipe page carries. The taxonomy links
   * printed around it belong to the site's navigation and stand identically on
   * every page, so they say nothing about the recipe and are not read: the slug
   * a facet browses by is published on the facet's own listing, in the other
   * direction.
   */
  categories: string[];
  cuisines: string[];
  keywords: string[];

  author: string | null;
  author_url: string | null;
  rating: Rating | null;
  nutrition: Nutrition | null;
  images: string[];
}

/** One recipe as a tool renders it, with quantities taken to what was asked. */
export interface Recipe extends Omit<RecipeCore, "ingredients" | "yield_text"> {
  yield: RecipeYield;
  ingredients: ScaledIngredient[];
}

/** One row of a listing: enough to choose, without the article behind it. */
export interface ListingRow {
  id: string;
  title: string;
  url: string;
  image_url: string | null;
}

/**
 * An article that gathers recipes rather than being one.
 *
 * The site publishes these at the same addresses as its recipes and describes
 * them with the same structured type, so telling them apart is the reader's
 * job. Rendering one as a recipe would offer a dish nobody can cook.
 */
export interface CollectionCore {
  id: string;
  title: string;
  url: string;
  description: string | null;
  published_at: string | null;
  modified_at: string | null;
  /** The headings the article is built from, in the order it prints them. */
  headings: string[];
  /** The recipes it points at. */
  recipes: ListingRow[];
  images: string[];
}

/** What a page of a listing carries, and whether the site holds more. */
export interface Listing {
  rows: ListingRow[];
  /** The page the site actually served, which a request past the end never is. */
  page_served: number;
  /** True when the site's own pagination offers a page after this one. */
  has_more: boolean;
}
