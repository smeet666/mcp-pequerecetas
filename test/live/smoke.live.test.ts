/**
 * One request per route, against the site itself.
 *
 * It runs behind an environment variable and as a nightly canary, because it is
 * the only thing that notices the day the site changes how it answers. The
 * assertions state the shape rather than the content: a recipe's rating moves on
 * its own, and a suite that pinned it would fail on a vote rather than on a
 * change worth knowing about.
 */

import process from "node:process";
import { describe, expect, it } from "vitest";
import { createLogger, loadConfig } from "../../src/config.js";
import { PequerecetasClient } from "../../src/pequerecetas/client.js";

const enabled = process.env["PQR_LIVE"] === "1";
const live = enabled ? describe : describe.skip;

const client = new PequerecetasClient({
  config: loadConfig(),
  logger: createLogger("silent"),
});

live("against Pequerecetas itself", () => {
  it("reads a recipe whose ingredients the structured block carries", async () => {
    const read = await client.getRecipe("pollo-asado-freidora-aire");
    expect(read.data.kind).toBe("recipe");

    if (read.data.kind !== "recipe") {
      return;
    }
    const recipe = read.data.recipe;
    expect(recipe.source_shape).toBe("structured");
    expect(recipe.title.length).toBeGreaterThan(0);
    expect(recipe.ingredients.length).toBeGreaterThan(0);
    expect(recipe.steps.length).toBeGreaterThan(0);
    expect(recipe.url).toContain("/receta/pollo-asado-freidora-aire/");
  });

  it("reads a recipe whose ingredients live in the body of the article", async () => {
    const read = await client.getRecipe("crema-brocoli-queso");
    expect(read.data.kind).toBe("recipe");

    if (read.data.kind !== "recipe") {
      return;
    }
    const recipe = read.data.recipe;
    expect(recipe.source_shape).toBe("article");
    expect(recipe.ingredients.length).toBeGreaterThan(0);
    expect(recipe.steps.length).toBeGreaterThan(0);
  });

  it("reads an article that gathers recipes as a collection", async () => {
    const read = await client.getRecipe("11-pures-bebes");
    expect(read.data.kind).toBe("collection");

    if (read.data.kind !== "collection") {
      return;
    }
    expect(read.data.collection.recipes.length).toBeGreaterThan(0);
  });

  it("answers a slug the site does not hold with not_found", async () => {
    await expect(client.getRecipe("no-existe-esta-receta-xyz")).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("searches for a dish and returns rows carrying a slug", async () => {
    const read = await client.searchRecipes("tortilla");
    expect(read.data.rows.length).toBeGreaterThan(0);

    const [row] = read.data.rows;
    expect(row?.id).toMatch(/^[\w%-]+$/);
    expect(row?.url).toContain("/receta/");
  });

  it("answers a search the site matches nothing with by no rows at all", async () => {
    const read = await client.searchRecipes("zzzqxwvbnm");
    expect(read.data.rows).toEqual([]);
  });

  it("lists the values a taxonomy publishes", async () => {
    const read = await client.listFacets("tecnica");
    const [listing] = read.data;

    expect(listing?.name).toBe("tecnica");
    expect(listing?.values.length).toBeGreaterThan(0);
    expect(listing?.values.map((value) => value.value)).toContain("thermomix");
  });

  it("browses a taxonomy and reports the page the site served", async () => {
    const read = await client.browseRecipes("ingrediente", "arroz", 1);

    expect(read.data.rows.length).toBeGreaterThan(0);
    expect(read.data.page_served).toBe(1);
    expect(read.data.has_more).toBe(true);
  });

  it("reads a later page of that same taxonomy", async () => {
    const read = await client.browseRecipes("ingrediente", "arroz", 2);
    expect(read.data.page_served).toBe(2);
  });

  it("answers a facet value the site does not hold with not_found", async () => {
    await expect(client.browseRecipes("dieta", "inventada-xyz", 1)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("refuses a taxonomy the site publishes nothing for without asking it", async () => {
    await expect(client.browseRecipes("categoria", "arroz", 1)).rejects.toMatchObject({
      code: "invalid_input",
    });
  });
});
