import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseFacetSitemap } from "../../src/pequerecetas/parseFacets.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
const load = (name: string) => readFileSync(join(fixtures, name), "utf8");

describe("parseFacetSitemap", () => {
  it("reads the values a taxonomy publishes, in the order the sitemap lists them", () => {
    const values = parseFacetSitemap(load("sitemap-dieta.xml"), "dieta");
    expect(values.map((value) => value.value)).toEqual(["sin-gluten", "vegetarianas", "veganas"]);
  });

  it("carries the address each value is browsed at", () => {
    const [first] = parseFacetSitemap(load("sitemap-dieta.xml"), "dieta");
    expect(first?.url).toBe("https://www.pequerecetas.com/dieta/sin-gluten/");
  });

  it("reads another taxonomy the same way", () => {
    expect(parseFacetSitemap(load("sitemap-tecnica.xml"), "tecnica").map((v) => v.value)).toEqual([
      "thermomix",
      "horno",
    ]);
  });

  it("answers no values for a sitemap that lists none", () => {
    expect(parseFacetSitemap(load("sitemap-empty.xml"), "dieta")).toEqual([]);
  });

  it("leaves out an address belonging to another taxonomy", () => {
    const xml =
      "<urlset><url><loc>https://www.pequerecetas.com/tecnica/horno/</loc></url></urlset>";
    expect(parseFacetSitemap(xml, "dieta")).toEqual([]);
  });

  it("leaves out the index of the taxonomy, which is no value", () => {
    const xml = "<urlset><url><loc>https://www.pequerecetas.com/dieta/</loc></url></urlset>";
    expect(parseFacetSitemap(xml, "dieta")).toEqual([]);
  });

  it("reads a value once even where the sitemap lists it twice", () => {
    const xml = `<urlset>
      <url><loc>https://www.pequerecetas.com/dieta/keto/</loc></url>
      <url><loc>https://www.pequerecetas.com/dieta/keto/</loc></url>
    </urlset>`;
    expect(parseFacetSitemap(xml, "dieta")).toHaveLength(1);
  });

  it("decodes a value the sitemap escaped", () => {
    const xml =
      "<urlset><url><loc>https://www.pequerecetas.com/dieta/az%C3%BAcar/</loc></url></urlset>";
    expect(parseFacetSitemap(xml, "dieta")[0]?.value).toBe("azúcar");
  });
});
