import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { settle } from "../support/settle.js";
import { loadConfig } from "../../src/config.js";
import { createLogger } from "../../src/config.js";
import type { PequerecetasError } from "../../src/errors.js";
import { PequerecetasClient } from "../../src/pequerecetas/client.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
const load = (name: string) => readFileSync(join(fixtures, name), "utf8");

/** A fetch that answers from the corpus, and records what was asked of it. */
function stubFetch(answers: Array<{ body: string; status?: number; url?: string }>) {
  const asked: string[] = [];
  const impl = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
    const url = String(input);
    asked.push(url);
    const answer = answers.shift() ?? { body: "", status: 404 };
    return new Response(answer.body, {
      status: answer.status ?? 200,
      headers: { "content-type": "text/html" },
    });
  });
  return { impl: impl as unknown as typeof fetch, asked };
}

function client(answers: Array<{ body: string; status?: number }>) {
  const { impl, asked } = stubFetch(answers);
  const config = { ...loadConfig({}), minIntervalMs: 3000 };
  return {
    client: new PequerecetasClient({
      config,
      logger: createLogger("silent"),
      fetchImpl: impl,
    }),
    asked,
  };
}

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-08-31T12:00:00Z") });
});

afterEach(() => {
  vi.useRealTimers();
});

/** Run a read to completion, letting the spacing between requests elapse. */
describe("getRecipe", () => {
  it("reads a recipe and says it came fresh", async () => {
    const { client: pequerecetas } = client([{ body: load("recipe-structured.html") }]);
    const read = await settle(pequerecetas.getRecipe("arroz-caldoso-tia-nube"));
    expect(read.cached).toBe(false);
    expect(read.data.kind).toBe("recipe");
  });

  it("asks the site once for a recipe asked for twice", async () => {
    const { client: pequerecetas, asked } = client([{ body: load("recipe-structured.html") }]);
    await settle(pequerecetas.getRecipe("arroz-caldoso-tia-nube"));
    const second = await settle(pequerecetas.getRecipe("arroz-caldoso-tia-nube"));
    expect(second.cached).toBe(true);
    expect(asked).toHaveLength(1);
  });

  it("refuses an empty identifier without asking the site", async () => {
    const { client: pequerecetas, asked } = client([]);
    await expect(settle(pequerecetas.getRecipe("  "))).rejects.toMatchObject({
      code: "invalid_input",
    });
    expect(asked).toEqual([]);
  });

  it("reports a recipe the site does not hold as an absence", async () => {
    const { client: pequerecetas } = client([{ body: "", status: 404 }]);
    await expect(settle(pequerecetas.getRecipe("no-existe"))).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("never stores a page it could not read", async () => {
    const { client: pequerecetas, asked } = client([
      { body: load("recipe-no-structured.html") },
      { body: load("recipe-structured.html") },
    ]);
    await expect(settle(pequerecetas.getRecipe("sin-bloque"))).rejects.toMatchObject({
      code: "parse_failure",
    });
    await settle(pequerecetas.getRecipe("sin-bloque"));
    expect(asked).toHaveLength(2);
  });

  it("carries an article that gathers recipes as what it is", async () => {
    const { client: pequerecetas } = client([{ body: load("collection.html") }]);
    const read = await settle(pequerecetas.getRecipe("12-pures-inventados"));
    expect(read.data.kind).toBe("collection");
  });
});

describe("searchRecipes", () => {
  it("asks the site's own search and reads the rows", async () => {
    const { client: pequerecetas, asked } = client([{ body: load("search-results.html") }]);
    const read = await settle(pequerecetas.searchRecipes("arroz"));
    expect(asked[0]).toBe("https://www.pequerecetas.com/?s=arroz");
    expect(read.data.rows).toHaveLength(2);
  });

  it("escapes a query rather than letting it build an address of its own", async () => {
    const { client: pequerecetas, asked } = client([{ body: load("search-results.html") }]);
    await settle(pequerecetas.searchRecipes("pollo & arroz"));
    expect(asked[0]).toBe("https://www.pequerecetas.com/?s=pollo+%26+arroz");
  });

  it("answers no rows for a query the site matched nothing with", async () => {
    const { client: pequerecetas } = client([{ body: load("search-empty.html") }]);
    const read = await settle(pequerecetas.searchRecipes("zzzqxwv"));
    expect(read.data.rows).toEqual([]);
  });

  it("refuses a blank query without asking the site", async () => {
    const { client: pequerecetas, asked } = client([]);
    await expect(settle(pequerecetas.searchRecipes("   "))).rejects.toMatchObject({
      code: "invalid_input",
    });
    expect(asked).toEqual([]);
  });
});

describe("browseRecipes", () => {
  it("reads a page of a facet", async () => {
    const { client: pequerecetas, asked } = client([{ body: load("listing-page-1.html") }]);
    const read = await settle(pequerecetas.browseRecipes("ingrediente", "arroz", 1));
    expect(asked[0]).toBe("https://www.pequerecetas.com/ingrediente/arroz/");
    expect(read.data.rows).toHaveLength(3);
    expect(read.data.has_more).toBe(true);
  });

  it("asks for a later page the way the site's pagination writes it", async () => {
    const { client: pequerecetas, asked } = client([{ body: load("listing-last-page.html") }]);
    await settle(pequerecetas.browseRecipes("ingrediente", "arroz", 3));
    expect(asked[0]).toBe("https://www.pequerecetas.com/ingrediente/arroz/page/3/");
  });

  it("refuses a taxonomy the site publishes nothing for, without asking it", async () => {
    const { client: pequerecetas, asked } = client([]);
    await expect(settle(pequerecetas.browseRecipes("categoria", "arroz", 1))).rejects.toMatchObject(
      { code: "invalid_input" },
    );
    expect(asked).toEqual([]);
  });

  it("reports a facet value the site does not hold as an absence", async () => {
    const { client: pequerecetas } = client([{ body: "", status: 404 }]);
    await expect(settle(pequerecetas.browseRecipes("dieta", "inventada", 1))).rejects.toMatchObject(
      { code: "not_found" },
    );
  });
});

describe("listFacets", () => {
  it("reads the values of one taxonomy from its own sitemap", async () => {
    const { client: pequerecetas, asked } = client([{ body: load("sitemap-dieta.xml") }]);
    const read = await settle(pequerecetas.listFacets("dieta"));
    expect(asked[0]).toBe("https://www.pequerecetas.com/dieta-sitemap.xml");
    expect(read.data).toHaveLength(1);
    expect(read.data[0]?.values.map((value) => value.value)).toContain("veganas");
  });

  it("reads every taxonomy when none is named", async () => {
    const { client: pequerecetas, asked } = client(
      Array.from({ length: 8 }, () => ({ body: load("sitemap-dieta.xml") })),
    );
    const read = await settle(pequerecetas.listFacets());
    expect(read.data).toHaveLength(8);
    expect(asked).toHaveLength(8);
  });

  it("refuses a taxonomy the site publishes nothing for", async () => {
    const { client: pequerecetas, asked } = client([]);
    await expect(settle(pequerecetas.listFacets("categoria"))).rejects.toMatchObject({
      code: "invalid_input",
    });
    expect(asked).toEqual([]);
  });

  it("carries on with the other taxonomies when one cannot be read", async () => {
    const answers: Array<{ body: string; status?: number }> = Array.from({ length: 8 }, () => ({
      body: load("sitemap-dieta.xml"),
    }));
    // The third taxonomy in the fixed order is the one set aside.
    answers[2] = { body: "", status: 404 };
    const { client: pequerecetas } = client(answers);
    const read = await settle(pequerecetas.listFacets());
    expect(read.data).toHaveLength(7);
    expect(read.data.map((listing) => listing.name)).not.toContain("ingrediente");
    expect(read.skipped?.[0]).toMatch(/ingrediente/);
  });
});

describe("the pace the client keeps", () => {
  it("reports the spacing in force rather than a figure of its own", () => {
    const { client: pequerecetas } = client([]);
    expect(pequerecetas.currentIntervalMs).toBe(3000);
  });

  it("makes one request at a time, spaced out", async () => {
    const { client: pequerecetas, asked } = client([
      { body: load("recipe-structured.html") },
      { body: load("recipe-article.html") },
    ]);
    const both = Promise.all([
      pequerecetas.getRecipe("arroz-caldoso-tia-nube"),
      pequerecetas.getRecipe("crema-calabaza-inventada"),
    ]);
    await vi.advanceTimersByTimeAsync(0);
    expect(asked).toHaveLength(1);
    await settle(both);
    expect(asked).toHaveLength(2);
  });
});

describe("what the client refuses to guess", () => {
  it("names the failing argument when a facet is refused", async () => {
    const { client: pequerecetas } = client([]);
    try {
      await settle(pequerecetas.listFacets("categoria"));
      expect.unreachable("the taxonomy does not exist and should have been refused");
    } catch (error) {
      expect((error as PequerecetasError).message).toMatch(/categoria/);
    }
  });
});
