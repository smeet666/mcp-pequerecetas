import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseListing } from "../../src/pequerecetas/parseListing.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
const load = (name: string) => readFileSync(join(fixtures, name), "utf8");

describe("parseListing, a page of a facet", () => {
  it("reads the rows the page serves", () => {
    const listing = parseListing(load("listing-page-1.html"));
    expect(listing.rows).toHaveLength(3);
    expect(listing.rows[0]).toMatchObject({
      id: "arroz-caldoso-tia-nube",
      title: "Arroz caldoso de la tía Nube",
      url: "https://www.pequerecetas.com/receta/arroz-caldoso-tia-nube/",
    });
  });

  it("takes the picture from where the theme leaves it, not from the placeholder", () => {
    const listing = parseListing(load("listing-page-1.html"));
    expect(listing.rows[0]?.image_url).toBe(
      "https://www.pequerecetas.com/wp-content/uploads/2026/06/arroz-inventado.jpg",
    );
  });

  it("leaves out the recipes the navigation links on every page", () => {
    const ids = parseListing(load("listing-page-1.html")).rows.map((row) => row.id);
    expect(ids).not.toContain("bizcocho-de-avena-del-domingo");
  });

  it("leaves out the recipes a carousel rolls past on every page", () => {
    const ids = parseListing(load("listing-page-1.html")).rows.map((row) => row.id);
    expect(ids).not.toContain("sopa-de-estrellas-inventada");
    expect(ids).not.toContain("galletas-de-anis-de-la-abuela");
  });

  it("leaves out the block of recipes the theme suggests beside the results", () => {
    const ids = parseListing(load("listing-page-1.html")).rows.map((row) => row.id);
    expect(ids).not.toContain("tarta-de-la-vecina-inventada");
  });

  it("counts a recipe once even where the card links it twice", () => {
    const ids = parseListing(load("listing-page-1.html")).rows.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("reads the page the site actually served", () => {
    expect(parseListing(load("listing-page-1.html")).page_served).toBe(1);
  });

  it("says the site offers a page after this one", () => {
    expect(parseListing(load("listing-page-1.html")).has_more).toBe(true);
  });
});

describe("parseListing, the last page", () => {
  it("reads the page the site served rather than the one asked for", () => {
    expect(parseListing(load("listing-last-page.html")).page_served).toBe(3);
  });

  it("says the site offers nothing after it", () => {
    expect(parseListing(load("listing-last-page.html")).has_more).toBe(false);
  });
});

describe("parseListing, a page with nothing on it", () => {
  it("answers no rows, which is an absence rather than a failure", () => {
    const listing = parseListing(load("listing-empty.html"));
    expect(listing.rows).toEqual([]);
    expect(listing.has_more).toBe(false);
  });

  it("reports the first page when the site prints no pagination", () => {
    expect(parseListing(load("listing-empty.html")).page_served).toBe(1);
  });
});

describe("parseListing, a page of search results", () => {
  it("reads the rows even though the site builds this page without its grid", () => {
    const listing = parseListing(load("search-results.html"));
    expect(listing.rows.map((row) => row.id)).toEqual([
      "arroz-caldoso-tia-nube",
      "arroz-con-leche-inventado",
    ]);
  });

  it("leaves out the navigation here too", () => {
    const ids = parseListing(load("search-results.html")).rows.map((row) => row.id);
    expect(ids).not.toContain("bizcocho-de-avena-del-domingo");
  });

  it("answers no rows for a search the site matched nothing with", () => {
    expect(parseListing(load("search-empty.html")).rows).toEqual([]);
  });

  it("never claims a further page, because this site serves search on one page", () => {
    expect(parseListing(load("search-results.html")).has_more).toBe(false);
  });
});
