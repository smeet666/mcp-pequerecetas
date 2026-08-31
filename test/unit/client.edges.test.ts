/**
 * What the reading layer does with what it cannot read.
 *
 * The store, the refusals and the taxonomies set aside are each stated here,
 * because these are the paths on which a server most easily starts saying
 * something the site never said.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLogger, loadConfig } from "../../src/config.js";
import { PequerecetasClient } from "../../src/pequerecetas/client.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
const load = (name: string) => readFileSync(join(fixtures, name), "utf8");

function client(answers: Array<{ body: string; status?: number }>) {
  const asked: string[] = [];
  const impl = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
    asked.push(String(input));
    const answer = answers.shift() ?? { body: "", status: 404 };
    return new Response(answer.body, { status: answer.status ?? 200 });
  });
  return {
    client: new PequerecetasClient({
      config: { ...loadConfig({}), maxRetries: 0 },
      logger: createLogger("silent"),
      fetchImpl: impl as unknown as typeof fetch,
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

async function settle<T>(promise: Promise<T>): Promise<T> {
  const result = promise;
  await vi.runAllTimersAsync();
  return await result;
}

describe("what the store spares the site", () => {
  it("asks once for a search asked for twice", async () => {
    const { client: pequerecetas, asked } = client([{ body: load("search-results.html") }]);
    await settle(pequerecetas.searchRecipes("arroz"));
    const second = await settle(pequerecetas.searchRecipes("arroz"));
    expect(second.cached).toBe(true);
    expect(asked).toHaveLength(1);
  });

  it("asks once for a page of a facet read twice", async () => {
    const { client: pequerecetas, asked } = client([{ body: load("listing-page-1.html") }]);
    await settle(pequerecetas.browseRecipes("ingrediente", "arroz", 1));
    const second = await settle(pequerecetas.browseRecipes("ingrediente", "arroz", 1));
    expect(second.cached).toBe(true);
    expect(asked).toHaveLength(1);
  });

  it("asks once for a taxonomy listed twice, and says the answer was held", async () => {
    const { client: pequerecetas, asked } = client([{ body: load("sitemap-dieta.xml") }]);
    await settle(pequerecetas.listFacets("dieta"));
    const second = await settle(pequerecetas.listFacets("dieta"));
    expect(second.cached).toBe(true);
    expect(asked).toHaveLength(1);
  });
});

describe("what the reading layer refuses before it asks", () => {
  it("refuses a facet value of nothing but spaces", async () => {
    const { client: pequerecetas, asked } = client([]);
    await expect(settle(pequerecetas.browseRecipes("dieta", "   ", 1))).rejects.toMatchObject({
      code: "invalid_input",
    });
    expect(asked).toEqual([]);
  });

  it("names the taxonomies it does browse by when it refuses one", async () => {
    const { client: pequerecetas } = client([]);
    await expect(settle(pequerecetas.browseRecipes("categoria", "arroz", 1))).rejects.toMatchObject(
      {
        details: { hint: expect.stringContaining("tipo-plato") },
      },
    );
  });
});

describe("a taxonomy that could not be read", () => {
  it("is named rather than passed over in silence", async () => {
    const { client: pequerecetas } = client([{ body: "", status: 404 }]);
    const read = await settle(pequerecetas.listFacets("dieta"));
    expect(read.data).toEqual([]);
    expect(read.skipped?.[0]).toMatch(/^dieta: /);
  });

  it("leaves the answer marked as held when nothing fresh came back", async () => {
    const { client: pequerecetas } = client([{ body: "", status: 404 }]);
    const read = await settle(pequerecetas.listFacets("dieta"));
    expect(read.cached).toBe(true);
  });
});
