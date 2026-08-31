import { readFileSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../../src/config.js";
import { createServer, INSTRUCTIONS } from "../../src/server.js";

/**
 * Nothing here waits, but the clock and Math.random are pinned all the same:
 * building a server must not depend on the machine's time or on a draw.
 */
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  vi.spyOn(Math, "random").mockReturnValue(0);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/** Any attempt to reach the network while a tool is not called is a failure. */
const forbiddenFetch: typeof fetch = () => {
  throw new Error("the network was touched while building or listing");
};

async function connected(): Promise<Client> {
  const server = createServer({ fetchImpl: forbiddenFetch });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "contract-test", version: "0.0.0" });
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  return client;
}

function packageVersion(): string {
  const raw = readFileSync(new URL("../../package.json", import.meta.url), "utf8");
  const parsed = JSON.parse(raw) as { version: string };
  return parsed.version;
}

const TOOLS = [
  "get_recipe",
  "search_recipes",
  "list_facets",
  "browse_recipes",
  "scale_ingredients",
];

describe("createServer", () => {
  it("announces itself as mcp-pequerecetas with the released version", async () => {
    const client = await connected();
    const info = client.getServerVersion();

    expect(info?.name).toBe("mcp-pequerecetas");
    expect(info?.version).toBe(packageVersion());
  });

  it("registers every tool it means to publish, and nothing else", async () => {
    const client = await connected();
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name)).toEqual(TOOLS);
  });

  it("lists the tools of two separately built servers in the same order", async () => {
    const first = await (await connected()).listTools();
    const second = await (await connected()).listTools();
    expect(first.tools.map((tool) => tool.name)).toEqual(second.tools.map((tool) => tool.name));
  });

  it("gives every tool a description, an output schema and read-only annotations", async () => {
    const client = await connected();
    const { tools } = await client.listTools();

    for (const tool of tools) {
      expect((tool.description ?? "").length).toBeGreaterThan(0);
      expect(tool.outputSchema, `${tool.name} declares no output schema`).toBeDefined();
      expect(tool.annotations?.readOnlyHint).toBe(true);
      expect(tool.annotations?.idempotentHint).toBe(true);
      expect(tool.annotations?.destructiveHint).not.toBe(true);
    }
  });

  it("declares input schemas that refuse an argument they do not know", async () => {
    const client = await connected();
    const { tools } = await client.listTools();

    for (const tool of tools) {
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.inputSchema.additionalProperties, `${tool.name} accepts unknown arguments`).toBe(
        false,
      );
    }
  });

  it("hands the instructions to the client", async () => {
    const client = await connected();
    expect(client.getInstructions()).toBe(INSTRUCTIONS);
  });

  it("touches no network while building and listing", async () => {
    const client = await connected();
    await expect(client.listTools()).resolves.toBeDefined();
  });
});

describe("what the instructions tell a model", () => {
  it("says the site is read in Spanish", () => {
    expect(INSTRUCTIONS).toMatch(/Spanish/);
  });

  it("says a recipe is addressed by the slug in its address", () => {
    expect(INSTRUCTIONS).toMatch(/slug/);
  });

  it("warns that the section serves collections as well as recipes", () => {
    expect(INSTRUCTIONS).toMatch(/collection/);
  });

  it("says where the ingredients were read from", () => {
    expect(INSTRUCTIONS).toMatch(/source_shape/);
  });

  it("says equipment is written among the ingredients", () => {
    expect(INSTRUCTIONS).toMatch(/is_equipment/);
  });

  it("says no total is ever published, because the site prints none", () => {
    expect(INSTRUCTIONS).toMatch(/total_available' is null/);
  });

  it("says the taxonomies cannot be combined", () => {
    expect(INSTRUCTIONS).toMatch(/cannot be combined/);
  });

  it("says a time the page does not publish is null rather than zero", () => {
    expect(INSTRUCTIONS).toMatch(/null rather than zero/);
  });

  it("asks for the site to be credited", () => {
    expect(INSTRUCTIONS).toMatch(/credit Pequerecetas/);
  });
});

describe("a tool reached through the protocol", () => {
  it("reads through the fetch it was handed, and answers a tool error when that read fails", async () => {
    // No retries here: what is under test is that the failure comes back as a
    // tool error, and repeating the attempt only adds waiting to that.
    const server = createServer({
      config: { ...loadConfig({}), maxRetries: 0 },
      fetchImpl: (() => {
        throw new Error("the site could not be reached");
      }) as unknown as typeof fetch,
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "contract-test", version: "0.0.0" });
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

    const result = await client.callTool({
      name: "search_recipes",
      arguments: { query: "arroz" },
    });
    expect(result.isError).toBe(true);
  });

  it("answers scale_ingredients without touching the network at all", async () => {
    const client = await connected();
    const result = await client.callTool({
      name: "scale_ingredients",
      arguments: { ingredients: ["400 g de arroz"], factor: 2 },
    });
    expect(result.isError).toBeUndefined();
  });

  it("refuses an argument it does not declare, with the code a caller branches on", async () => {
    const client = await connected();
    const result = await client.callTool({
      name: "scale_ingredients",
      arguments: { ingredients: ["400 g de arroz"], factor: 2, rounding: "up" },
    });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toMatch(/\[invalid_input]/);
  });
});

describe("every tool answers through the protocol", () => {
  /** A server whose fetch answers from the corpus, one page per call. */
  async function servedBy(bodies: string[]): Promise<Client> {
    const answers = [...bodies];
    const server = createServer({
      config: { ...loadConfig({}), maxRetries: 0, minIntervalMs: 3000 },
      fetchImpl: (async () =>
        new Response(answers.shift() ?? "", { status: 200 })) as unknown as typeof fetch,
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "contract-test", version: "0.0.0" });
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
    return client;
  }

  const fixture = (name: string) =>
    readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8");

  it("answers get_recipe", async () => {
    const client = await servedBy([fixture("recipe-structured.html")]);
    const call = client.callTool({ name: "get_recipe", arguments: { id: "arroz" } });
    await vi.runAllTimersAsync();
    expect((await call).isError).toBeUndefined();
  });

  it("answers search_recipes", async () => {
    const client = await servedBy([fixture("search-results.html")]);
    const call = client.callTool({ name: "search_recipes", arguments: { query: "arroz" } });
    await vi.runAllTimersAsync();
    expect((await call).isError).toBeUndefined();
  });

  it("answers list_facets", async () => {
    const client = await servedBy([fixture("sitemap-dieta.xml")]);
    const call = client.callTool({ name: "list_facets", arguments: { facet: "dieta" } });
    await vi.runAllTimersAsync();
    expect((await call).isError).toBeUndefined();
  });

  it("answers browse_recipes", async () => {
    const client = await servedBy([fixture("listing-page-1.html")]);
    const call = client.callTool({
      name: "browse_recipes",
      arguments: { facet: "ingrediente", value: "arroz" },
    });
    await vi.runAllTimersAsync();
    expect((await call).isError).toBeUndefined();
  });

  it("answers a tool error rather than failing the call when a tool throws", async () => {
    const client = await servedBy([]);
    const call = client.callTool({
      name: "scale_ingredients",
      arguments: { ingredients: ["400 g"], factor: 2, from_servings: 4, to_servings: 8 },
    });
    await vi.runAllTimersAsync();
    expect((await call).isError).toBe(true);
  });
});
