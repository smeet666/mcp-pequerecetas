/**
 * The paths the ordinary tests never take.
 *
 * A server built without a fetch of its own, a listing whose wording carries no
 * figure, and a refusal raised by the declaration rather than by the code: each
 * is part of the contract and none of them is exercised by a normal read.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { settle } from "../support/settle.js";
import { createLogger, loadConfig } from "../../src/config.js";
import { PequerecetasClient } from "../../src/pequerecetas/client.js";
import { createServer } from "../../src/server.js";
import { runGetRecipe } from "../../src/tools/getRecipe.js";
import { runListFacets } from "../../src/tools/listFacets.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
const load = (name: string) => readFileSync(join(fixtures, name), "utf8");

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-08-31T12:00:00Z") });
});
afterEach(() => {
  vi.useRealTimers();
});

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

describe("a server built without a fetch of its own", () => {
  it("builds, and reaches for the runtime's own", () => {
    expect(() => createServer()).not.toThrow();
  });

  it("builds a reading layer the same way", () => {
    expect(
      () => new PequerecetasClient({ config: loadConfig({}), logger: createLogger("silent") }),
    ).not.toThrow();
  });
});

describe("a wording that carries no figure", () => {
  it("leaves a recipe unscalable when its page states servings in words alone", async () => {
    const html = `<html><head><script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org/",
      "@type": "Recipe",
      name: "Para toda la familia",
      recipeIngredient: ["400 g de arroz"],
      recipeYield: "para toda la familia",
    })}</script></head><body><div class="post-content"></div></body></html>`;

    const result = await settle(
      runGetRecipe(client([{ body: html }]), { id: "para-la-familia", servings: 8 }),
    );
    const recipe = result.structuredContent?.["recipe"] as Record<string, unknown>;
    const served = recipe["yield"] as Record<string, unknown>;
    expect(served["original_count"]).toBeNull();
    expect(served["factor"]).toBe(1);
    expect(served["unit"]).toBe("para toda la familia");
  });

  it("reports no unit when the wording is a bare figure", async () => {
    const html = `<html><head><script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org/",
      "@type": "Recipe",
      name: "Cuatro",
      recipeIngredient: ["400 g de arroz"],
      recipeYield: "4",
    })}</script></head><body><div class="post-content"></div></body></html>`;

    const result = await settle(runGetRecipe(client([{ body: html }]), { id: "cuatro" }));
    const recipe = result.structuredContent?.["recipe"] as Record<string, unknown>;
    expect((recipe["yield"] as Record<string, unknown>)["unit"]).toBeNull();
  });
});

describe("a refusal raised by the declaration", () => {
  it("comes back from list_facets with the code a caller branches on", async () => {
    const result = await settle(runListFacets(client([]), { taxonomy: "dieta" } as never));
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/\[invalid_input]/);
    expect(result.content[0]?.text).toMatch(/'taxonomy'/);
  });
});

describe("a read that fails under a tool", () => {
  it("comes back from get_recipe as a tool error rather than as a throw", async () => {
    const result = await settle(runGetRecipe(client([{ body: "", status: 500 }]), { id: "arroz" }));
    expect(result.isError).toBe(true);
  });

  it("comes back from list_facets the same way when the site refuses outright", async () => {
    const result = await settle(runListFacets(client([{ body: load("sitemap-empty.xml") }]), {}));
    expect(result.isError).toBeUndefined();
  });
});
