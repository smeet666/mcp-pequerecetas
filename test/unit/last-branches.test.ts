/**
 * The last few paths, each reached on purpose.
 *
 * These are answers the contract makes and an ordinary read never asks for: a
 * measure walked all the way down its ladder, a card whose first link carried
 * the words, a retry that gives up, and a client left to the runtime's own
 * fetch.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { settle } from "../support/settle.js";
import { createLogger, loadConfig } from "../../src/config.js";
import { PequerecetasClient } from "../../src/pequerecetas/client.js";
import { parseListing } from "../../src/pequerecetas/parseListing.js";
import { parseRecipePage } from "../../src/pequerecetas/parseRecipe.js";
import { chooseReadableUnit, lookupUnit } from "../../src/recipe/units.js";
import { agreeWithAmount } from "../../src/recipe/scale.js";
import { runGetRecipe } from "../../src/tools/getRecipe.js";

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-08-31T12:00:00Z") });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("a measure walked down its ladder to stay exact", () => {
  it("restates a value its own unit cannot write in the unit below it", () => {
    const chosen = chooseReadableUnit(lookupUnit("l")!, 1.234);
    expect(chosen.unit.canonical).toBe("cl");
    expect(Math.round(1.234 * chosen.ratio)).toBe(123);
  });

  it("stops at the foot of the ladder rather than looking further down", () => {
    const chosen = chooseReadableUnit(lookupUnit("mg")!, 1.234);
    expect(chosen.unit.canonical).toBe("mg");
  });
});

describe("an adjective the closed list holds in the plural", () => {
  it("is left alone when the count already asks for the plural", () => {
    expect(agreeWithAmount("pimientos rojos", 3)).toBe("pimientos rojos");
  });
});

describe("a card whose first link carried the words", () => {
  it("keeps those words when a later link to the same recipe carries none", () => {
    const listing = parseListing(
      `<html><body><div class="brx-grid">
        <a href="/receta/arroz/">Arroz caldoso</a>
        <a href="/receta/arroz/"><img data-src="https://www.pequerecetas.com/foto.jpg" /></a>
      </div></body></html>`,
    );
    expect(listing.rows).toEqual([
      {
        id: "arroz",
        title: "Arroz caldoso",
        url: "https://www.pequerecetas.com/receta/arroz/",
        image_url: "https://www.pequerecetas.com/foto.jpg",
      },
    ]);
  });
});

describe("what a page leaves out entirely", () => {
  it("reads a recipe whose structured block states no name", () => {
    const block = JSON.stringify({
      "@context": "https://schema.org/",
      "@type": "Recipe",
      recipeIngredient: ["1 huevo"],
    });
    const html = `<html><head><script type="application/ld+json">${block}</script></head><body><div class="post-content"></div></body></html>`;
    const parsed = parseRecipePage(html, "sin-nombre");
    expect(parsed.kind === "recipe" && parsed.recipe.title).toBe("");
  });

  it("reads a list the page prints with no heading above it", () => {
    const block = JSON.stringify({
      "@context": "https://schema.org/",
      "@type": "Recipe",
      name: "Sin encabezados",
    });
    const long = "Una frase larga que describe un paso entero de la receta con todo detalle.";
    const html = `<html><head><script type="application/ld+json">${block}</script></head><body><div class="post-content">
      <ul class="wp-block-list"><li>1 huevo</li><li>2 tomates</li></ul>
      <ul class="wp-block-list"><li>${long}</li></ul>
    </div></body></html>`;
    const parsed = parseRecipePage(html, "sin-encabezados");
    expect(parsed.kind === "recipe" && parsed.recipe.steps[0]?.group).toBeNull();
  });
});

describe("a pagination that marks a page of nothing", () => {
  it("falls back to the first page rather than reporting page zero", () => {
    const listing = parseListing(
      `<html><body><div class="brx-grid"><a href="/receta/arroz/">Arroz</a></div>
       <div class="bricks-pagination"><span aria-current="page" class="page-numbers current">0</span></div></body></html>`,
    );
    expect(listing.page_served).toBe(1);
  });
});

describe("an adjective that already reads as the count asks", () => {
  it("is left exactly as the page wrote it", () => {
    expect(agreeWithAmount("pimiento rojo", 1)).toBe("pimiento rojo");
  });
});

describe("a page that prints its badges in another order, or not at all", () => {
  it("reads the time past a field that carries something else", () => {
    const block = JSON.stringify({
      "@context": "https://schema.org/",
      "@type": "Recipe",
      name: "Con raciones primero",
      recipeIngredient: ["1 huevo"],
    });
    const field = (value: string) =>
      `<div class="jet-listing-dynamic-field__content" >${value}</div>`;
    const html = `<html><head><script type="application/ld+json">${block}</script></head><body>${field("8 rac.")}${field("45 min.")}<div class="post-content"></div></body></html>`;
    const parsed = parseRecipePage(html, "raciones-primero");
    expect(parsed.kind === "recipe" && parsed.recipe.total_minutes).toBe(45);
  });

  it("reports no time when no field carries one", () => {
    const block = JSON.stringify({
      "@context": "https://schema.org/",
      "@type": "Recipe",
      name: "Sin tiempo",
      recipeIngredient: ["1 huevo"],
    });
    const html = `<html><head><script type="application/ld+json">${block}</script></head><body><div class="jet-listing-dynamic-field__content" >8 rac.</div><div class="post-content"></div></body></html>`;
    const parsed = parseRecipePage(html, "sin-tiempo");
    expect(parsed.kind === "recipe" && parsed.recipe.total_minutes).toBeNull();
  });
});

describe("what a rendering leaves out when the page published nothing", () => {
  it("prints no badge line for a recipe with no time, servings or rating", async () => {
    const block = JSON.stringify({
      "@context": "https://schema.org/",
      "@type": "Recipe",
      name: "Escueta",
      recipeIngredient: ["1 huevo"],
    });
    const html = `<html><head><script type="application/ld+json">${block}</script></head><body><div class="post-content"></div></body></html>`;
    const client = new PequerecetasClient({
      config: { ...loadConfig({}), maxRetries: 0 },
      logger: createLogger("silent"),
      fetchImpl: (async () => new Response(html, { status: 200 })) as unknown as typeof fetch,
    });
    const result = await settle(runGetRecipe(client, { id: "escueta" }));
    expect(result.content[0]?.text).toMatch(/Escueta\n\nIngredientes:/);
  });

  it("prints no description for a collection the page gave none", async () => {
    const block = JSON.stringify({
      "@context": "https://schema.org/",
      "@type": "Recipe",
      name: "Colección escueta",
    });
    const html = `<html><head><script type="application/ld+json">${block}</script></head><body><div class="post-content"><p>Prosa</p><a href="/receta/una/">Una</a></div></body></html>`;
    const client = new PequerecetasClient({
      config: { ...loadConfig({}), maxRetries: 0 },
      logger: createLogger("silent"),
      fetchImpl: (async () => new Response(html, { status: 200 })) as unknown as typeof fetch,
    });
    const result = await settle(runGetRecipe(client, { id: "coleccion-escueta" }));
    expect(result.content[0]?.text).toMatch(/Colección escueta\n\nThis page gathers/);
  });
});

describe("the reading layer imported as an ordinary library", () => {
  it("builds with nothing at all, the way its own documentation shows", () => {
    expect(() => new PequerecetasClient()).not.toThrow();
  });

  it("takes its settings from the environment when none are given", () => {
    const client = new PequerecetasClient();
    expect(client.currentIntervalMs).toBe(3000);
  });

  it("still takes a configuration when one is handed to it", () => {
    const client = new PequerecetasClient({
      config: { ...loadConfig({}), minIntervalMs: 5000 },
    });
    expect(client.currentIntervalMs).toBe(5000);
  });
});

describe("a client left to the runtime's own fetch", () => {
  it("reads through it, which is what an ordinary installation does", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<urlset></urlset>", { status: 200 })),
    );
    const client = new PequerecetasClient({
      config: loadConfig({}),
      logger: createLogger("silent"),
    });
    const read = await settle(client.listFacets("dieta"));
    expect(read.data[0]?.values).toEqual([]);
  });
});

describe("a read that never answers", () => {
  it("gives up after the attempts it was allowed, and says the site could not be reached", async () => {
    const client = new PequerecetasClient({
      config: { ...loadConfig({}), maxRetries: 2 },
      logger: createLogger("silent"),
      fetchImpl: (() => Promise.reject(new Error("socket hung up"))) as unknown as typeof fetch,
    });
    await expect(settle(client.searchRecipes("arroz"))).rejects.toMatchObject({
      code: "network_error",
    });
  });
});
