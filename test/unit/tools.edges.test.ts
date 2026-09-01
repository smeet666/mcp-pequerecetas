/**
 * What each tool does at the edges of its contract.
 *
 * A refusal, an empty page and a listing the site could not serve whole are as
 * much part of what a tool promises as its ordinary answer, and each is stated
 * here rather than left to whatever the code happens to do.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { settle } from "../support/settle.js";
import { createLogger, loadConfig } from "../../src/config.js";
import { PequerecetasClient } from "../../src/pequerecetas/client.js";
import { runBrowseRecipes } from "../../src/tools/browseRecipes.js";
import { runGetRecipe } from "../../src/tools/getRecipe.js";
import { runListFacets } from "../../src/tools/listFacets.js";
import { runScaleIngredients } from "../../src/tools/scaleIngredients.js";
import { runSearchRecipes } from "../../src/tools/searchRecipes.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
const load = (name: string) => readFileSync(join(fixtures, name), "utf8");

function client(answers: Array<{ body: string; status?: number }>) {
  const impl = vi.fn(async () => {
    const answer = answers.shift() ?? { body: "", status: 404 };
    return new Response(answer.body, { status: answer.status ?? 200 });
  });
  return new PequerecetasClient({
    config: { ...loadConfig({}), maxRetries: 0 },
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

const structured = (record: Record<string, unknown> | undefined) => record ?? {};
const text = (result: { content: Array<{ text: string }> }) => result.content[0]?.text ?? "";

describe("browse_recipes at its edges", () => {
  it("renders a page the site served with nothing on it", async () => {
    const result = await settle(
      runBrowseRecipes(client([{ body: load("listing-empty.html") }]), {
        facet: "dieta",
        value: "keto",
      }),
    );
    expect(structured(result.structuredContent)["result_count"]).toBe(0);
    expect(text(result)).toMatch(/No recipes on page 1/);
    expect((structured(result.structuredContent)["notes"] as string[]).join(" ")).toMatch(
      /no recipes on it/,
    );
  });

  it("reports a value the site does not hold as an absence rather than an empty page", async () => {
    const result = await settle(
      runBrowseRecipes(client([{ body: "", status: 404 }]), {
        facet: "dieta",
        value: "inventada",
      }),
    );
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/\[not_found]/);
  });

  it("refuses a page number outside what it declares", async () => {
    const result = await settle(
      runBrowseRecipes(client([]), { facet: "dieta", value: "keto", page: 0 }),
    );
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/\[invalid_input]/);
  });

  it("names the argument a caller most plausibly meant", async () => {
    const result = await settle(
      runBrowseRecipes(client([]), { facet: "dieta", value: "keto", pages: 2 } as never),
    );
    expect(text(result)).toMatch(/'pages'/);
    expect(text(result)).toMatch(/did you mean 'page'/);
  });
});

describe("list_facets at its edges", () => {
  it("refuses a taxonomy the site publishes nothing for", async () => {
    const result = await settle(runListFacets(client([]), { facet: "categoria" }));
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/\[invalid_input]/);
  });

  it("renders a taxonomy whose sitemap lists no value", async () => {
    const result = await settle(
      runListFacets(client([{ body: load("sitemap-empty.xml") }]), { facet: "dieta" }),
    );
    const facets = structured(result.structuredContent)["facets"] as Record<string, unknown>[];
    expect(facets[0]?.["value_count"]).toBe(0);
  });

  it("says the values are in the site's own order rather than alphabetical", async () => {
    const result = await settle(
      runListFacets(client([{ body: load("sitemap-dieta.xml") }]), { facet: "dieta" }),
    );
    expect((structured(result.structuredContent)["notes"] as string[]).join(" ")).toMatch(
      /not alphabetical/,
    );
  });
});

describe("search_recipes at its edges", () => {
  it("refuses a query of nothing but spaces", async () => {
    const result = await settle(runSearchRecipes(client([]), { query: "   " }));
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/\[invalid_input]/);
  });

  it("stops claiming these are all the rows once a limit has cut them", async () => {
    const result = await settle(
      runSearchRecipes(client([{ body: load("search-results.html") }]), {
        query: "arroz",
        limit: 1,
      }),
    );
    const notes = (structured(result.structuredContent)["notes"] as string[]).join(" ");
    expect(notes).not.toMatch(/all the rows/);
    expect(notes).toMatch(/one page/);
  });

  it("says the rows come in the site's own order rather than by relevance", async () => {
    const result = await settle(
      runSearchRecipes(client([{ body: load("search-results.html") }]), { query: "arroz" }),
    );
    expect((structured(result.structuredContent)["notes"] as string[]).join(" ")).toMatch(
      /order the site serves them in/,
    );
  });

  it("says rows were left out when more were served than were asked for", async () => {
    const result = await settle(
      runSearchRecipes(client([{ body: load("search-results.html") }]), {
        query: "arroz",
        limit: 1,
      }),
    );
    expect((structured(result.structuredContent)["notes"] as string[]).join(" ")).toMatch(
      /left out/,
    );
  });

  it("reports a site that could not be reached as a failure rather than as nothing found", async () => {
    const result = await settle(
      runSearchRecipes(client([{ body: "", status: 500 }]), { query: "arroz" }),
    );
    expect(result.isError).toBe(true);
    expect(text(result)).not.toMatch(/Nothing came back/);
  });
});

describe("get_recipe at its edges", () => {
  it("renders a recipe the page publishes no rating or time for", async () => {
    const result = await settle(
      runGetRecipe(client([{ body: load("recipe-article-bare.html") }]), {
        id: "tortilla-acelgas-inventada",
      }),
    );
    const recipe = structured(result.structuredContent)["recipe"] as Record<string, unknown>;
    expect(recipe["total_minutes"]).toBe(25);
    expect(text(result)).toMatch(/Tortilla de acelgas inventada/);
  });

  it("refuses an identifier of nothing but spaces", async () => {
    const result = await settle(runGetRecipe(client([]), { id: "   " }));
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/\[invalid_input]/);
  });

  it("carries the collection's own headings and links", async () => {
    const result = await settle(
      runGetRecipe(client([{ body: load("collection.html") }]), { id: "12-pures-inventados" }),
    );
    const collection = structured(result.structuredContent)["collection"] as Record<
      string,
      unknown
    >;
    expect((collection["headings"] as string[]).length).toBe(2);
    expect(text(result)).toMatch(/gathers 3 recipe\(s\)/);
  });
});

describe("scale_ingredients at its edges", () => {
  it("says a factor of one changes nothing", () => {
    const result = runScaleIngredients({ ingredients: ["400 g de arroz"], factor: 1 });
    expect((structured(result.structuredContent)["notes"] as string[]).join(" ")).toMatch(
      /factor of 1 changes nothing/,
    );
  });

  it("counts the lines it could not scale", () => {
    const result = runScaleIngredients({ ingredients: ["Sal al gusto"], factor: 2 });
    expect(structured(result.structuredContent)["unscaled_count"]).toBe(1);
    expect((structured(result.structuredContent)["notes"] as string[]).join(" ")).toMatch(
      /carries no quantity/,
    );
  });

  it("counts the lines whose value had to move", () => {
    const result = runScaleIngredients({ ingredients: ["3 huevos"], factor: 0.5 });
    expect(structured(result.structuredContent)["rounded_count"]).toBe(1);
    expect((structured(result.structuredContent)["notes"] as string[]).join(" ")).toMatch(
      /no longer holds the exact product/,
    );
  });

  it("refuses a call that names no way of scaling at all", () => {
    expect(() => runScaleIngredients({ ingredients: ["400 g de arroz"] })).toThrowError(
      /invalid_input/,
    );
  });

  it("refuses an argument it does not declare", () => {
    expect(() =>
      runScaleIngredients({ ingredients: ["400 g"], factor: 2, unit_system: "metric" } as never),
    ).toThrowError(/invalid_input/);
  });

  it("refuses a list with nothing in it", () => {
    expect(() => runScaleIngredients({ ingredients: [], factor: 2 })).toThrowError(/invalid_input/);
  });
});
