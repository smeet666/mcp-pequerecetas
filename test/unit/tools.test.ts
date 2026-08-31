import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLogger, loadConfig } from "../../src/config.js";
import { PequerecetasClient } from "../../src/pequerecetas/client.js";
import { runBrowseRecipes } from "../../src/tools/browseRecipes.js";
import { runGetRecipe } from "../../src/tools/getRecipe.js";
import { runListFacets } from "../../src/tools/listFacets.js";
import { runSearchRecipes } from "../../src/tools/searchRecipes.js";
import { runScaleIngredients } from "../../src/tools/scaleIngredients.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
const load = (name: string) => readFileSync(join(fixtures, name), "utf8");

function client(answers: Array<{ body: string; status?: number }>) {
  const impl = vi.fn(async () => {
    const answer = answers.shift() ?? { body: "", status: 404 };
    return new Response(answer.body, { status: answer.status ?? 200 });
  });
  return new PequerecetasClient({
    config: loadConfig({}),
    logger: createLogger("silent"),
    fetchImpl: impl as unknown as typeof fetch,
  });
}

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-08-31T12:00:00Z") });
});
afterEach(() => {
  vi.useRealTimers();
});

async function settle<T>(promise: Promise<T>): Promise<T> {
  const result = promise;
  await vi.runAllTimersAsync();
  return await result;
}

const structured = (record: Record<string, unknown> | undefined) => record ?? {};

describe("get_recipe", () => {
  it("renders a recipe with its ingredients and its steps", async () => {
    const result = await settle(
      runGetRecipe(client([{ body: load("recipe-structured.html") }]), {
        id: "arroz-caldoso-tia-nube",
      }),
    );
    const data = structured(result.structuredContent);
    expect(data["kind"]).toBe("recipe");
    expect(result.content[0]?.text).toMatch(/Arroz caldoso de la tía Nube/);
    expect(result.content[0]?.text).toMatch(/Source: Pequerecetas/);
  });

  it("says which reading answered, because the two carry different fields", async () => {
    const result = await settle(
      runGetRecipe(client([{ body: load("recipe-article.html") }]), {
        id: "crema-calabaza-inventada",
      }),
    );
    const recipe = structured(result.structuredContent)["recipe"] as Record<string, unknown>;
    expect(recipe["source_shape"]).toBe("article");
  });

  it("scales the quantities when a number of servings is asked for", async () => {
    const result = await settle(
      runGetRecipe(client([{ body: load("recipe-structured.html") }]), {
        id: "arroz-caldoso-tia-nube",
        servings: 8,
      }),
    );
    const recipe = structured(result.structuredContent)["recipe"] as Record<string, unknown>;
    const lines = recipe["ingredients"] as Record<string, unknown>[];
    expect(lines[0]?.["text"]).toBe("800 g de arroz redondo");
    expect((recipe["yield"] as Record<string, unknown>)["factor"]).toBe(2);
  });

  it("leaves the equipment written among the ingredients alone", async () => {
    const result = await settle(
      runGetRecipe(client([{ body: load("recipe-structured.html") }]), {
        id: "arroz-caldoso-tia-nube",
        servings: 8,
      }),
    );
    const recipe = structured(result.structuredContent)["recipe"] as Record<string, unknown>;
    const lines = recipe["ingredients"] as Record<string, unknown>[];
    const pot = lines.find((line) => String(line["original"]).startsWith("Olla"));
    expect(pot?.["is_equipment"]).toBe(true);
    expect(pot?.["text"]).toBe("Olla de barro");
  });

  it("says a recipe with no published servings cannot be scaled", async () => {
    const result = await settle(
      runGetRecipe(client([{ body: load("recipe-article-bare.html") }]), {
        id: "tortilla-acelgas-inventada",
        servings: 8,
      }),
    );
    const recipe = structured(result.structuredContent)["recipe"] as Record<string, unknown>;
    expect((recipe["yield"] as Record<string, unknown>)["factor"]).toBe(1);
    expect(result.content[0]?.text).toMatch(/how many it serves/i);
  });

  it("renders an article that gathers recipes as a collection rather than a dish", async () => {
    const result = await settle(
      runGetRecipe(client([{ body: load("collection.html") }]), { id: "12-pures-inventados" }),
    );
    const data = structured(result.structuredContent);
    expect(data["kind"]).toBe("collection");
    expect(result.content[0]?.text).toMatch(/gathers/i);
  });

  it("refuses an unknown argument by the code a caller branches on", async () => {
    const result = await settle(runGetRecipe(client([]), { id: "arroz", portions: 4 } as never));
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/\[invalid_input]/);
    expect(result.content[0]?.text).toMatch(/servings/);
  });
});

describe("search_recipes", () => {
  it("renders the rows the site served", async () => {
    const result = await settle(
      runSearchRecipes(client([{ body: load("search-results.html") }]), { query: "arroz" }),
    );
    const data = structured(result.structuredContent);
    expect(data["result_count"]).toBe(2);
    expect(result.content[0]?.text).toMatch(/Arroz caldoso/);
  });

  it("counts what it served rather than claiming a total the site never published", async () => {
    const result = await settle(
      runSearchRecipes(client([{ body: load("search-results.html") }]), { query: "arroz" }),
    );
    const data = structured(result.structuredContent);
    expect(data["total_available"]).toBeNull();
    expect((data["notes"] as string[]).join(" ")).toMatch(/one page/i);
  });

  it("answers an honest absence rather than a failure", async () => {
    const result = await settle(
      runSearchRecipes(client([{ body: load("search-empty.html") }]), { query: "zzzqxwv" }),
    );
    expect(result.isError).toBeUndefined();
    expect(structured(result.structuredContent)["result_count"]).toBe(0);
    expect(result.content[0]?.text).toMatch(/nothing/i);
  });

  it("keeps at most the number of rows asked for", async () => {
    const result = await settle(
      runSearchRecipes(client([{ body: load("search-results.html") }]), {
        query: "arroz",
        limit: 1,
      }),
    );
    expect(structured(result.structuredContent)["result_count"]).toBe(1);
  });
});

describe("browse_recipes", () => {
  it("renders a page of a facet and says whether more follows", async () => {
    const result = await settle(
      runBrowseRecipes(client([{ body: load("listing-page-1.html") }]), {
        facet: "ingrediente",
        value: "arroz",
      }),
    );
    const data = structured(result.structuredContent);
    expect(data["has_more"]).toBe(true);
    expect(data["page_served"]).toBe(1);
    expect((data["results"] as unknown[]).length).toBe(3);
  });

  it("reports the page the site served rather than the one asked for", async () => {
    const result = await settle(
      runBrowseRecipes(client([{ body: load("listing-last-page.html") }]), {
        facet: "ingrediente",
        value: "arroz",
        page: 3,
      }),
    );
    expect(structured(result.structuredContent)["page_served"]).toBe(3);
  });

  it("refuses a taxonomy the site publishes nothing for, and names the ones it has", async () => {
    const result = await settle(
      runBrowseRecipes(client([]), { facet: "categoria", value: "arroz" }),
    );
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/\[invalid_input]/);
    expect(result.content[0]?.text).toMatch(/tecnica/);
  });

  it("publishes no total, because the site counts nothing on these pages", async () => {
    const result = await settle(
      runBrowseRecipes(client([{ body: load("listing-page-1.html") }]), {
        facet: "ingrediente",
        value: "arroz",
      }),
    );
    expect(structured(result.structuredContent)["total_available"]).toBeNull();
  });
});

describe("list_facets", () => {
  it("renders the values a taxonomy publishes", async () => {
    const result = await settle(
      runListFacets(client([{ body: load("sitemap-dieta.xml") }]), { facet: "dieta" }),
    );
    const data = structured(result.structuredContent);
    const facets = data["facets"] as Record<string, unknown>[];
    expect(facets[0]?.["name"]).toBe("dieta");
    expect(facets[0]?.["value_count"]).toBe(3);
    expect(result.content[0]?.text).toMatch(/veganas/);
  });

  it("reads every taxonomy when none is named", async () => {
    const answers = Array.from({ length: 8 }, () => ({ body: load("sitemap-dieta.xml") }));
    const result = await settle(runListFacets(client(answers), {}));
    expect((structured(result.structuredContent)["facets"] as unknown[]).length).toBe(8);
  });

  it("says which taxonomy it could not read rather than passing over it in silence", async () => {
    const answers: Array<{ body: string; status?: number }> = Array.from({ length: 8 }, () => ({
      body: load("sitemap-dieta.xml"),
    }));
    answers[2] = { body: "", status: 404 };
    const result = await settle(runListFacets(client(answers), {}));
    expect((structured(result.structuredContent)["notes"] as string[]).join(" ")).toMatch(
      /ingrediente/,
    );
  });
});

describe("scale_ingredients", () => {
  it("scales a list a caller already holds, without reaching the site", () => {
    const result = runScaleIngredients({
      ingredients: ["400 g de arroz", "1 pizca de sal"],
      factor: 2,
    });
    const data = structured(result.structuredContent);
    expect(data["scaled_count"]).toBe(2);
    expect((data["ingredients"] as Record<string, unknown>[])[0]?.["text"]).toBe("800 g de arroz");
  });

  it("marks a tool and says why it was left alone", () => {
    const result = runScaleIngredients({ ingredients: ["Freidora de aire"], factor: 6 });
    const lines = structured(result.structuredContent)["ingredients"] as Record<string, unknown>[];
    expect(lines[0]?.["is_equipment"]).toBe(true);
    expect(result.content[0]?.text).toMatch(/\[equipment]/);
  });

  it("works out the factor from two servings counts", () => {
    const result = runScaleIngredients({
      ingredients: ["400 g de arroz"],
      from_servings: 4,
      to_servings: 6,
    });
    expect(structured(result.structuredContent)["factor"]).toBe(1.5);
  });

  it("refuses both ways of asking at once rather than choosing one", () => {
    expect(() =>
      runScaleIngredients({ ingredients: ["400 g"], factor: 2, from_servings: 4, to_servings: 8 }),
    ).toThrowError(/invalid_input/);
  });
});
