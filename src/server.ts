/**
 * MCP server wiring.
 *
 * One client, one rate limiter and one store are shared by every tool, so
 * pacing applies to the server as a whole rather than per tool. Tools are
 * registered in a fixed order, which is what lets a client cache the listing.
 *
 * A tool that reads the site renders its own failures, so its handler passes
 * the call straight through. scale_ingredients raises on a call that names no
 * way of scaling, which is what its handler turns into a tool error.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config, Logger } from "./config.js";
import { createLogger, loadConfig } from "./config.js";
import { PequerecetasClient } from "./pequerecetas/client.js";
import { FACET_NAMES } from "./pequerecetas/urls.js";
import type { BrowseRecipesArgs } from "./tools/browseRecipes.js";
import {
  browseRecipesArgs,
  browseRecipesDescription,
  browseRecipesOutputShape,
  runBrowseRecipes,
} from "./tools/browseRecipes.js";
import type { GetRecipeArgs } from "./tools/getRecipe.js";
import {
  getRecipeArgs,
  getRecipeDescription,
  getRecipeOutputShape,
  runGetRecipe,
} from "./tools/getRecipe.js";
import type { ListFacetsArgs } from "./tools/listFacets.js";
import {
  listFacetsArgs,
  listFacetsDescription,
  listFacetsOutputShape,
  runListFacets,
} from "./tools/listFacets.js";
import type { ScaleIngredientsArgs } from "./tools/scaleIngredients.js";
import {
  runScaleIngredients,
  scaleIngredientsArgs,
  scaleIngredientsDescription,
  scaleIngredientsOutputShape,
} from "./tools/scaleIngredients.js";
import type { SearchRecipesArgs } from "./tools/searchRecipes.js";
import {
  runSearchRecipes,
  searchRecipesArgs,
  searchRecipesDescription,
  searchRecipesOutputShape,
} from "./tools/searchRecipes.js";
import { toToolError } from "./tools/shared.js";
import { PKG_VERSION } from "./version.js";

export interface CreateServerOptions {
  config?: Config;
  logger?: Logger;
  fetchImpl?: typeof fetch;
}

/** This server only reads, so every tool is read-only. */
const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

export const INSTRUCTIONS = [
  "Tools for reading recipes on Pequerecetas, a Spanish home-cooking site. No API key and no account are needed.",
  "Everything on this site is written in Spanish, and its search matches the words a page was written with: ask in Spanish, because a dish named in another language finds little or nothing.",
  "A recipe is addressed by the slug in its address, such as 'paella-de-marisco' in /receta/paella-de-marisco/. Take one from search_recipes or browse_recipes rather than writing it by hand.",
  "The recipe section serves two different things at that kind of address, and get_recipe says which came back under 'kind': a 'recipe', or a 'collection', which is an article gathering other recipes and carries no ingredients of its own.",
  "A recipe also says under 'source_shape' where its ingredients were read. 'structured' means the block the page publishes for search engines carried them; 'article' means they were read from the body of the page, which is where most of this site's recipes keep them. Both are the site's own words.",
  "The site writes equipment among the ingredients, so a line reading 'Freidora de aire' arrives in the same list as the chicken. Such a line is marked 'is_equipment' and is never multiplied.",
  `Recipes are browsed by eight taxonomies: ${FACET_NAMES.join(", ")}. Two of them have no equivalent elsewhere: 'edad' files a recipe by the age of whoever eats it, from six months up, and 'tecnica' by the appliance it is cooked in.`,
  "Call list_facets before browse_recipes. The site writes its own slugs and answers one built by hand with a page it does not hold.",
  "The taxonomies cannot be combined: the site offers no way to ask for two at once, and a request that names two would answer for one of them.",
  "No total is ever published. The site prints no count of what a search matched or of what a taxonomy holds, so 'total_available' is null everywhere and 'has_more' says whether another page follows.",
  "Search is served on a single page: the site answers a request for a second page with the first again, so what search_recipes returns is every row it offers for that query.",
  "Times come back in minutes, and a time the page does not publish is null rather than zero. Most recipes publish only a total.",
  "Quantities come back as published; pass 'servings' to get_recipe to rescale them, or use scale_ingredients on a list you already hold. A recipe whose page states no number of servings cannot be scaled, and the answer says so instead of guessing.",
  "Every rescaled line says what was done to it: 'scaled' when the arithmetic landed exactly, 'rounded' when the value had to move to stay an amount a kitchen can measure out, and 'unscaled' when the line carries no quantity.",
  "Nothing is converted between unit systems, and an approximate measure such as a pizca keeps the size the cook gives it.",
  "This server paces itself, and a rate_limited error means the site asked it to slow down, never that nothing matched.",
  "When you show a recipe to a user, credit Pequerecetas and link the page.",
].join(" ");

export function createServer(options: CreateServerOptions = {}): McpServer {
  const config = options.config ?? loadConfig();
  const logger = options.logger ?? createLogger(config.logLevel);
  const client = new PequerecetasClient({
    config,
    logger,
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
  });

  const server = new McpServer(
    { name: "mcp-pequerecetas", version: PKG_VERSION },
    { instructions: INSTRUCTIONS },
  );

  server.registerTool(
    "get_recipe",
    {
      title: "Read one recipe",
      description: getRecipeDescription,
      inputSchema: getRecipeArgs,
      outputSchema: z.object(getRecipeOutputShape),
      annotations: READ_ONLY,
    },
    async (args) => await runGetRecipe(client, args as GetRecipeArgs),
  );

  server.registerTool(
    "search_recipes",
    {
      title: "Search the recipes",
      description: searchRecipesDescription,
      inputSchema: searchRecipesArgs,
      outputSchema: z.object(searchRecipesOutputShape),
      annotations: READ_ONLY,
    },
    async (args) => await runSearchRecipes(client, args as SearchRecipesArgs),
  );

  server.registerTool(
    "list_facets",
    {
      title: "List the taxonomies recipes are browsed by",
      description: listFacetsDescription,
      inputSchema: listFacetsArgs,
      outputSchema: z.object(listFacetsOutputShape),
      annotations: READ_ONLY,
    },
    async (args) => await runListFacets(client, args as ListFacetsArgs),
  );

  server.registerTool(
    "browse_recipes",
    {
      title: "Read one taxonomy's recipes",
      description: browseRecipesDescription,
      inputSchema: browseRecipesArgs,
      outputSchema: z.object(browseRecipesOutputShape),
      annotations: READ_ONLY,
    },
    async (args) => await runBrowseRecipes(client, args as BrowseRecipesArgs),
  );

  server.registerTool(
    "scale_ingredients",
    {
      title: "Rescale a list of ingredients",
      description: scaleIngredientsDescription,
      inputSchema: scaleIngredientsArgs,
      outputSchema: z.object(scaleIngredientsOutputShape),
      annotations: READ_ONLY,
    },
    (args) => {
      try {
        return runScaleIngredients(args as ScaleIngredientsArgs);
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  logger.info(
    `ready: user-agent="${config.userAgent}", min interval ${config.minIntervalMs}ms, cache ${config.cacheTtlMs}ms`,
  );

  return server;
}
