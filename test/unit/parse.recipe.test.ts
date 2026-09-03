import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PequerecetasError } from "../../src/errors.js";
import { parseRecipePage } from "../../src/pequerecetas/parseRecipe.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
const load = (name: string) => readFileSync(join(fixtures, name), "utf8");

const structured = () => parseRecipePage(load("recipe-structured.html"), "arroz-caldoso-tia-nube");
const article = () => parseRecipePage(load("recipe-article.html"), "crema-calabaza-inventada");
const bare = () => parseRecipePage(load("recipe-article-bare.html"), "tortilla-acelgas-inventada");
const collection = () => parseRecipePage(load("collection.html"), "12-pures-inventados");

describe("parseRecipePage, a recipe carried by the structured block", () => {
  it("says which reading answered", () => {
    const page = structured();
    expect(page.kind).toBe("recipe");
    expect(page.kind === "recipe" && page.recipe.source_shape).toBe("structured");
  });

  it("reads the title and the address", () => {
    const page = structured();
    expect(page.kind === "recipe" && page.recipe.title).toBe("Arroz caldoso de la tía Nube");
    expect(page.kind === "recipe" && page.recipe.url).toBe(
      "https://www.pequerecetas.com/receta/arroz-caldoso-tia-nube/",
    );
  });

  it("reads the ingredient lines as published, equipment included", () => {
    const page = structured();
    const lines = page.kind === "recipe" ? page.recipe.ingredients : [];
    expect(lines[0]).toBe("400 g de arroz redondo");
    expect(lines).toContain("Olla de barro");
    expect(lines).toHaveLength(10);
  });

  it("reads the steps with the anchor and the picture each carries", () => {
    const page = structured();
    const steps = page.kind === "recipe" ? page.recipe.steps : [];
    expect(steps).toHaveLength(3);
    expect(steps[0]).toMatchObject({
      text: "Sofreímos la cebolla y el ajo en la olla de barro hasta que estén transparentes.",
      url: "https://www.pequerecetas.com/receta/arroz-caldoso-tia-nube/#paso-1",
      image: "https://www.pequerecetas.com/wp-content/uploads/2026/01/paso-1-inventado.jpg",
    });
    expect(steps[2]).toMatchObject({ url: null, image: null });
  });

  it("turns the published durations into minutes", () => {
    const page = structured();
    expect(page.kind === "recipe" && page.recipe.prep_minutes).toBe(15);
    expect(page.kind === "recipe" && page.recipe.cook_minutes).toBe(45);
    expect(page.kind === "recipe" && page.recipe.total_minutes).toBe(60);
  });

  it("keeps the site's own wording for how many it serves", () => {
    const page = structured();
    expect(page.kind === "recipe" && page.recipe.yield_text).toBe("4 rac.");
  });

  it("reads the rating against the scale the page published it on", () => {
    const page = structured();
    expect(page.kind === "recipe" && page.recipe.rating).toEqual({
      value: 4.32,
      count: 103,
      scale: 5,
      worst: 1,
    });
  });

  it("drops the empty strings the site pads its picture list with", () => {
    const page = structured();
    expect(page.kind === "recipe" && page.recipe.images).toEqual([
      "https://www.pequerecetas.com/wp-content/uploads/2026/01/arroz-caldoso-inventado.jpg",
    ]);
  });

  it("splits the rubric labels on the commas the page writes them with", () => {
    const page = structured();
    expect(page.kind === "recipe" && page.recipe.categories).toEqual([
      "Recetas de comidas caseras fáciles",
    ]);
    expect(page.kind === "recipe" && page.recipe.cuisines).toEqual([
      "Recetas Inventadas",
      "Recetas Imaginarias",
    ]);
    expect(page.kind === "recipe" && page.recipe.keywords).toEqual(["arroz", "caldoso", "invento"]);
  });

  it("reads the author and the page the site links them to", () => {
    const page = structured();
    expect(page.kind === "recipe" && page.recipe.author).toBe("Marta Ejemplo");
    expect(page.kind === "recipe" && page.recipe.author_url).toBe(
      "https://www.pequerecetas.com/autor/marta-ejemplo/",
    );
  });

  it("carries the energy figure in the words the page printed it with", () => {
    const page = structured();
    expect(page.kind === "recipe" && page.recipe.nutrition).toEqual({
      text: "320 kcal",
      calories: 320,
    });
  });

  it("reads the dates the page published", () => {
    const page = structured();
    expect(page.kind === "recipe" && page.recipe.published_at).toBe("2026-01-04T09:30:00+01:00");
    expect(page.kind === "recipe" && page.recipe.modified_at).toBe("2026-02-11T18:05:00+01:00");
  });
});

describe("parseRecipePage, a recipe written into the body", () => {
  it("says the body answered rather than the structured block", () => {
    const page = article();
    expect(page.kind === "recipe" && page.recipe.source_shape).toBe("article");
  });

  it("reads the ingredients from the list under the heading naming them", () => {
    const page = article();
    const lines = page.kind === "recipe" ? page.recipe.ingredients : [];
    expect(lines[0]).toBe("800 g de calabaza inventada");
    expect(lines).toContain("Batidora de mano");
    expect(lines).toHaveLength(7);
  });

  it("keeps the heading the page grouped each step under", () => {
    const page = article();
    const steps = page.kind === "recipe" ? page.recipe.steps : [];
    expect(steps).toHaveLength(4);
    expect(steps[0]).toMatchObject({
      text: "Pelamos y picamos la cebolla en dados pequeños.",
      group: "Sofreímos la cebolla",
    });
    expect(steps[3]?.group).toBe("Cocemos y trituramos");
  });

  it("gives a step from the body no anchor, because the page prints none", () => {
    const page = article();
    expect(page.kind === "recipe" && page.recipe.steps[0]).toMatchObject({
      url: null,
      image: null,
    });
  });

  it("reads the time and the servings the theme prints above the article", () => {
    const page = article();
    expect(page.kind === "recipe" && page.recipe.total_minutes).toBe(30);
    expect(page.kind === "recipe" && page.recipe.yield_text).toBe("6 rac.");
  });

  it("reports no prep or cook time, because the page publishes neither", () => {
    const page = article();
    expect(page.kind === "recipe" && page.recipe.prep_minutes).toBeNull();
    expect(page.kind === "recipe" && page.recipe.cook_minutes).toBeNull();
  });

  it("leaves out the prose the page prints outside its lists", () => {
    const page = article();
    const steps = page.kind === "recipe" ? page.recipe.steps.map((step) => step.text) : [];
    expect(steps.join(" ")).not.toMatch(/pan tostado/);
  });
});

describe("parseRecipePage, a recipe whose body carries no headings", () => {
  it("reads the first list as the ingredients", () => {
    const page = bare();
    const lines = page.kind === "recipe" ? page.recipe.ingredients : [];
    expect(lines).toEqual([
      "6 huevos",
      "1 manojo de acelgas",
      "2 dientes de ajo",
      "Sal y pimienta",
    ]);
  });

  it("reads the list of sentences that follows as the steps", () => {
    const page = bare();
    const steps = page.kind === "recipe" ? page.recipe.steps : [];
    expect(steps).toHaveLength(3);
    expect(steps[0]?.group).toBeNull();
  });

  it("leaves out the list of links to other recipes", () => {
    const page = bare();
    const steps = page.kind === "recipe" ? page.recipe.steps.map((step) => step.text) : [];
    expect(steps.join(" ")).not.toMatch(/Tortilla de patatas/);
  });
});

describe("parseRecipePage, an article that gathers recipes", () => {
  it("refuses to call it a recipe", () => {
    expect(collection().kind).toBe("collection");
  });

  it("reads the recipes it points at", () => {
    const page = collection();
    const rows = page.kind === "collection" ? page.collection.recipes : [];
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      id: "pure-de-calabacin-inventado",
      title: "Puré de calabacín inventado",
      url: "https://www.pequerecetas.com/receta/pure-de-calabacin-inventado/",
    });
  });

  it("leaves out the recipes the navigation links on every page", () => {
    const page = collection();
    const ids = page.kind === "collection" ? page.collection.recipes.map((row) => row.id) : [];
    expect(ids).not.toContain("bizcocho-de-avena-del-domingo");
  });

  it("reads the headings the article is built from", () => {
    const page = collection();
    expect(page.kind === "collection" && page.collection.headings).toEqual([
      "Purés de verduras inventados",
      "Purés de legumbres inventados",
    ]);
  });

  it("carries the title and the dates the page published", () => {
    const page = collection();
    expect(page.kind === "collection" && page.collection.title).toBe(
      "12 purés inventados para bebés",
    );
    expect(page.kind === "collection" && page.collection.modified_at).toBe(
      "2026-05-20T09:00:00+02:00",
    );
  });
});

describe("parseRecipePage, pages that cannot be read", () => {
  it("refuses a page with no structured block rather than answering an empty recipe", () => {
    expect(() => parseRecipePage(load("recipe-no-structured.html"), "sin-bloque")).toThrowError(
      PequerecetasError,
    );
  });

  it("names the failure a parse failure, which is not an absence", () => {
    try {
      parseRecipePage(load("recipe-no-structured.html"), "sin-bloque");
      expect.unreachable("the page carries no recipe and should have been refused");
    } catch (error) {
      expect((error as PequerecetasError).code).toBe("parse_failure");
    }
  });

  it("steps over a structured block it cannot read, and refuses the page", () => {
    try {
      parseRecipePage(load("recipe-broken-structured.html"), "ilegible");
      expect.unreachable("the block does not parse and the page should have been refused");
    } catch (error) {
      expect((error as PequerecetasError).code).toBe("parse_failure");
      expect((error as PequerecetasError).message).toMatch(/no recipe this server can read/);
    }
  });

  it("refuses a page whose structured block describes something else", () => {
    expect(() => parseRecipePage(load("recipe-not-a-recipe.html"), "no-receta")).toThrowError(
      PequerecetasError,
    );
  });
});

/**
 * The comment form the theme prints under an article.
 *
 * It sits inside the same container the article's own words are in, and it
 * carries a heading and links of its own. Read past it, an article comes back
 * built from a heading nobody wrote about the dish and pointing at whatever a
 * reader linked underneath, and a recipe takes a step from a stranger.
 */
describe("what a reader wrote underneath", () => {
  it("is no heading of the article", () => {
    const page = collection();
    const headings = page.kind === "collection" ? page.collection.headings : [];

    expect(headings).not.toContain("Deja el primer comentario cancelar respuesta");
    expect(headings.some((heading) => /comentario|También te puede interesar/i.test(heading))).toBe(
      false,
    );
  });

  it("is no recipe the article points at", () => {
    const page = collection();
    const ids = page.kind === "collection" ? page.collection.recipes.map((row) => row.id) : [];

    expect(ids).not.toContain("tarta-de-comentario-inventada");
  });

  it("leaves an article free to name the same recipe twice", () => {
    // A page names a recipe in its prose and again in a card underneath. Both
    // point at one recipe, and the listing holds it once.
    const page = collection();
    const ids = page.kind === "collection" ? page.collection.recipes.map((row) => row.id) : [];

    expect(ids).toEqual([...new Set(ids)]);
    expect(ids).toContain("pure-de-calabacin-inventado");
  });

  it("is no part of a recipe either", () => {
    const page = article();
    const recipe = page.kind === "recipe" ? page.recipe : null;

    expect(JSON.stringify(recipe)).not.toMatch(/comentario/i);
  });
});
