import { describe, expect, it } from "vitest";
import {
  BASE_URL,
  facetSitemapUrl,
  facetUrl,
  FACET_NAMES,
  feedUrl,
  isFacetName,
  recipeIdFromUrl,
  recipeUrl,
  searchUrl,
} from "../../src/pequerecetas/urls.js";

describe("recipeUrl", () => {
  it("addresses a recipe by the slug a listing carried", () => {
    expect(recipeUrl("arroz-caldoso-tia-nube")).toBe(
      "https://www.pequerecetas.com/receta/arroz-caldoso-tia-nube/",
    );
  });

  it("escapes a slug rather than letting it reach into another path", () => {
    expect(recipeUrl("../../wp-admin")).toBe(
      "https://www.pequerecetas.com/receta/..%2F..%2Fwp-admin/",
    );
  });

  it("keeps the accented characters a Spanish slug may carry", () => {
    expect(recipeUrl("crema-de-calabacín")).toBe(
      "https://www.pequerecetas.com/receta/crema-de-calabac%C3%ADn/",
    );
  });
});

describe("recipeIdFromUrl", () => {
  it("reads the slug back out of an address the site published", () => {
    expect(recipeIdFromUrl("https://www.pequerecetas.com/receta/paella-imaginaria/")).toBe(
      "paella-imaginaria",
    );
  });

  it("reads an address written without its trailing slash", () => {
    expect(recipeIdFromUrl("https://www.pequerecetas.com/receta/paella-imaginaria")).toBe(
      "paella-imaginaria",
    );
  });

  it("decodes an escaped slug back to what the site spells", () => {
    expect(recipeIdFromUrl("https://www.pequerecetas.com/receta/crema-de-calabac%C3%ADn/")).toBe(
      "crema-de-calabacín",
    );
  });

  it("returns null for the index of the recipe section, which is no recipe", () => {
    expect(recipeIdFromUrl("https://www.pequerecetas.com/receta/")).toBeNull();
  });

  it("returns null for a page outside the recipe section", () => {
    expect(recipeIdFromUrl("https://www.pequerecetas.com/ingrediente/arroz/")).toBeNull();
  });

  it("returns null for an address on another host", () => {
    expect(recipeIdFromUrl("https://example.invalid/receta/arroz/")).toBeNull();
  });

  it("returns null for text that is not an address at all", () => {
    expect(recipeIdFromUrl("arroz caldoso")).toBeNull();
  });
});

describe("facetUrl", () => {
  it("addresses the first page of a facet without a page segment", () => {
    expect(facetUrl("ingrediente", "arroz", 1)).toBe(
      "https://www.pequerecetas.com/ingrediente/arroz/",
    );
  });

  it("addresses a later page the way the site's own pagination writes it", () => {
    expect(facetUrl("tecnica", "thermomix", 3)).toBe(
      "https://www.pequerecetas.com/tecnica/thermomix/page/3/",
    );
  });

  it("escapes the value rather than letting it reach into another path", () => {
    expect(facetUrl("dieta", "../etc", 1)).toBe("https://www.pequerecetas.com/dieta/..%2Fetc/");
  });
});

describe("facetSitemapUrl", () => {
  it("addresses the sitemap that publishes a facet's values", () => {
    expect(facetSitemapUrl("tipo-plato")).toBe(
      "https://www.pequerecetas.com/tipo-plato-sitemap.xml",
    );
  });
});

describe("searchUrl", () => {
  it("asks the site's own search with the query in its query string", () => {
    expect(searchUrl("arroz caldoso")).toBe("https://www.pequerecetas.com/?s=arroz+caldoso");
  });

  it("escapes a query that carries characters of its own", () => {
    expect(searchUrl("pollo & arroz")).toBe("https://www.pequerecetas.com/?s=pollo+%26+arroz");
  });
});

describe("feedUrl", () => {
  it("addresses the feed of recently published recipes", () => {
    expect(feedUrl()).toBe("https://www.pequerecetas.com/receta/feed/");
  });
});

describe("FACET_NAMES", () => {
  it("names the eight taxonomies the site publishes a sitemap for", () => {
    expect([...FACET_NAMES]).toEqual([
      "dieta",
      "edad",
      "ingrediente",
      "ocasion",
      "recetas-de",
      "tecnica",
      "tipo-de-cocina",
      "tipo-plato",
    ]);
  });

  it("is in a fixed order, so a listing of facets never shuffles between calls", () => {
    expect([...FACET_NAMES]).toEqual([...FACET_NAMES].sort());
  });

  it("recognises a name the site publishes", () => {
    expect(isFacetName("edad")).toBe(true);
  });

  it("refuses a name the site publishes nothing for", () => {
    expect(isFacetName("categoria")).toBe(false);
  });
});

describe("BASE_URL", () => {
  it("is the only host this server reads", () => {
    expect(BASE_URL).toBe("https://www.pequerecetas.com");
  });
});
