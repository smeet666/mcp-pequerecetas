/**
 * What a listing page does when the theme writes it differently.
 *
 * The site builds these pages with a visual editor, so the same listing arrives
 * with its picture before or after the words, with a link written host and all
 * or without it, and sometimes with no pagination at all.
 */

import { describe, expect, it } from "vitest";
import { parseListing } from "../../src/pequerecetas/parseListing.js";

const grid = (inner: string, pagination = "") =>
  `<html><body><div class="brx-grid">${inner}</div>${pagination}</body></html>`;

describe("the addresses a card can be written with", () => {
  it("reads a link written without its host", () => {
    const listing = parseListing(grid(`<a href="/receta/arroz-relativo/">Arroz relativo</a>`));
    expect(listing.rows[0]).toMatchObject({
      id: "arroz-relativo",
      url: "https://www.pequerecetas.com/receta/arroz-relativo/",
    });
  });

  it("leaves out a link that points outside the recipe section", () => {
    const listing = parseListing(
      grid(`<a href="https://www.pequerecetas.com/contacto/">Contacto</a>
            <a href="/receta/arroz/">Arroz</a>`),
    );
    expect(listing.rows.map((row) => row.id)).toEqual(["arroz"]);
  });
});

describe("where the theme puts the picture of a card", () => {
  it("takes it from the element standing before the words", () => {
    const listing = parseListing(
      grid(`<figure><img data-src="https://www.pequerecetas.com/foto.jpg" /></figure>
            <a href="/receta/arroz/">Arroz</a>`),
    );
    expect(listing.rows[0]?.image_url).toBe("https://www.pequerecetas.com/foto.jpg");
  });

  it("takes the ordinary source when the theme loads the picture at once", () => {
    const listing = parseListing(
      grid(`<a href="/receta/arroz/"><img src="https://www.pequerecetas.com/foto.jpg" />Arroz</a>`),
    );
    expect(listing.rows[0]?.image_url).toBe("https://www.pequerecetas.com/foto.jpg");
  });

  it("reports no picture for a card that carries none", () => {
    const listing = parseListing(grid(`<a href="/receta/arroz/">Arroz</a>`));
    expect(listing.rows[0]?.image_url).toBeNull();
  });

  it("keeps the picture of the first link when the second carries none", () => {
    const listing = parseListing(
      grid(`<a href="/receta/arroz/"><img data-src="https://www.pequerecetas.com/foto.jpg" /></a>
            <a href="/receta/arroz/">Arroz caldoso</a>`),
    );
    expect(listing.rows).toHaveLength(1);
    expect(listing.rows[0]).toMatchObject({
      title: "Arroz caldoso",
      image_url: "https://www.pequerecetas.com/foto.jpg",
    });
  });

  it("ignores a placeholder the theme writes in place of a picture", () => {
    const listing = parseListing(
      grid(
        `<a href="/receta/arroz/"><img src="data:image/svg+xml,%3Csvg%3E%3C/svg%3E" />Arroz</a>`,
      ),
    );
    expect(listing.rows[0]?.image_url).toBeNull();
  });
});

describe("what the pagination says about the page served", () => {
  it("falls back to the first page when the block marks no current one", () => {
    const listing = parseListing(
      grid(
        `<a href="/receta/arroz/">Arroz</a>`,
        `<div class="bricks-pagination"><a class="page-numbers" href="/ingrediente/arroz/page/2/">2</a></div>`,
      ),
    );
    expect(listing.page_served).toBe(1);
    expect(listing.has_more).toBe(true);
  });

  it("falls back to the first page when the mark is not a number", () => {
    const listing = parseListing(
      grid(
        `<a href="/receta/arroz/">Arroz</a>`,
        `<div class="bricks-pagination"><span aria-current="page" class="page-numbers current">…</span></div>`,
      ),
    );
    expect(listing.page_served).toBe(1);
  });

  it("says nothing follows when every page offered comes before this one", () => {
    const listing = parseListing(
      grid(
        `<a href="/receta/arroz/">Arroz</a>`,
        `<div class="bricks-pagination"><span aria-current="page" class="page-numbers current">3</span>
         <a class="page-numbers" href="/ingrediente/arroz/page/2/">2</a></div>`,
      ),
    );
    expect(listing.page_served).toBe(3);
    expect(listing.has_more).toBe(false);
  });
});
