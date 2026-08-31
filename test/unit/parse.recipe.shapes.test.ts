/**
 * The shapes a structured block arrives in.
 *
 * schema.org allows a field to be a string, an object or a list of either, and
 * this site uses several of those spellings for the same field. Each is read
 * here from a block written on purpose, because the corpus carries the shapes
 * the site serves today and these are the ones it is allowed to serve tomorrow.
 */

import { describe, expect, it } from "vitest";
import { parseRecipePage } from "../../src/pequerecetas/parseRecipe.js";

const BASE = "https://www.pequerecetas.com";

/** A page carrying one structured block, written from the fields given. */
function page(node: Record<string, unknown>, body = ""): string {
  const block = JSON.stringify({ "@context": "https://schema.org/", ...node });
  return `<html><head><script type="application/ld+json">${block}</script></head>
<body><div class="post-content">${body}</div></body></html>`;
}

const recipeOf = (html: string, id = "prueba") => {
  const parsed = parseRecipePage(html, id);
  if (parsed.kind !== "recipe") {
    throw new Error("expected a recipe");
  }
  return parsed.recipe;
};

describe("the shapes a type can be written in", () => {
  it("reads a node whose type is a list rather than a single word", () => {
    const html = page({
      "@type": ["Recipe", "Article"],
      name: "Receta con dos tipos",
      recipeIngredient: ["1 huevo"],
    });
    expect(recipeOf(html).title).toBe("Receta con dos tipos");
  });

  it("reads a block written as a bare list of nodes", () => {
    const block = JSON.stringify([
      { "@type": "WebPage", name: "Otra cosa" },
      { "@type": "Recipe", name: "Receta en lista", recipeIngredient: ["1 huevo"] },
    ]);
    const html = `<html><head><script type="application/ld+json">${block}</script></head><body></body></html>`;
    expect(recipeOf(html).title).toBe("Receta en lista");
  });

  it("steps over a node that is not an object at all", () => {
    const block = JSON.stringify([
      "una cadena suelta",
      { "@type": "Recipe", name: "Receta detrás de una cadena", recipeIngredient: ["1 huevo"] },
    ]);
    const html = `<html><head><script type="application/ld+json">${block}</script></head><body></body></html>`;
    expect(recipeOf(html).title).toBe("Receta detrás de una cadena");
  });
});

describe("the shapes a field can be written in", () => {
  it("reads a picture written as one address rather than as a list", () => {
    const html = page({
      "@type": "Recipe",
      name: "Con una foto",
      image: `${BASE}/foto.jpg`,
      recipeIngredient: ["1 huevo"],
    });
    expect(recipeOf(html).images).toEqual([`${BASE}/foto.jpg`]);
  });

  it("reads no picture from a field holding an empty string", () => {
    const html = page({
      "@type": "Recipe",
      name: "Sin foto",
      image: "",
      recipeIngredient: ["1 huevo"],
    });
    expect(recipeOf(html).images).toEqual([]);
  });

  it("reads an author written as a name rather than as a person", () => {
    const html = page({
      "@type": "Recipe",
      name: "Con autor",
      author: "Marta Ejemplo",
      recipeIngredient: ["1 huevo"],
    });
    expect(recipeOf(html)).toMatchObject({ author: "Marta Ejemplo", author_url: null });
  });

  it("reports no author for a field holding neither a name nor a person", () => {
    const html = page({
      "@type": "Recipe",
      name: "Sin autor",
      author: 42,
      recipeIngredient: ["1 huevo"],
    });
    expect(recipeOf(html).author).toBeNull();
  });

  it("reads a step written as a bare sentence", () => {
    const html = page({
      "@type": "Recipe",
      name: "Pasos en texto",
      recipeIngredient: ["1 huevo"],
      recipeInstructions: ["Batimos el huevo.", ""],
    });
    expect(recipeOf(html).steps).toEqual([
      { text: "Batimos el huevo.", group: null, url: null, image: null },
    ]);
  });

  it("steps over an instruction that is neither a sentence nor a step", () => {
    const html = page({
      "@type": "Recipe",
      name: "Pasos raros",
      recipeIngredient: ["1 huevo"],
      recipeInstructions: [42, { "@type": "HowToStep" }],
    });
    expect(recipeOf(html).steps).toEqual([]);
  });

  it("reads no steps from a field that is not a list", () => {
    const html = page({
      "@type": "Recipe",
      name: "Pasos en una cadena",
      recipeIngredient: ["1 huevo"],
      recipeInstructions: "Todo en un párrafo.",
    });
    expect(recipeOf(html).steps).toEqual([]);
  });

  it("reads rubric labels written as a list rather than as one string", () => {
    const html = page({
      "@type": "Recipe",
      name: "Con etiquetas",
      recipeIngredient: ["1 huevo"],
      recipeCategory: ["Postres", "Meriendas"],
    });
    expect(recipeOf(html).categories).toEqual(["Postres", "Meriendas"]);
  });

  it("reads how many it serves from the structured block when the page prints none", () => {
    const html = page({
      "@type": "Recipe",
      name: "Con raciones",
      recipeIngredient: ["1 huevo"],
      recipeYield: "6",
    });
    expect(recipeOf(html).yield_text).toBe("6");
  });

  it("reports no servings when neither the block nor the page states any", () => {
    const html = page({ "@type": "Recipe", name: "Sin raciones", recipeIngredient: ["1 huevo"] });
    expect(recipeOf(html).yield_text).toBeNull();
  });
});

describe("figures a page fills in without meaning them", () => {
  it("reads a duration of nothing as no duration at all", () => {
    const html = page({
      "@type": "Recipe",
      name: "Sin tiempo",
      recipeIngredient: ["1 huevo"],
      totalTime: "PT0M",
    });
    expect(recipeOf(html).total_minutes).toBeNull();
  });

  it("reads a duration written in days and hours", () => {
    const html = page({
      "@type": "Recipe",
      name: "Con reposo",
      recipeIngredient: ["1 huevo"],
      totalTime: "P1DT2H30M",
    });
    expect(recipeOf(html).total_minutes).toBe(1590);
  });

  it("reads no duration from a wording that is not one", () => {
    const html = page({
      "@type": "Recipe",
      name: "Tiempo en palabras",
      recipeIngredient: ["1 huevo"],
      totalTime: "media hora",
    });
    expect(recipeOf(html).total_minutes).toBeNull();
  });

  it("reports no rating when the block gives a value without a count", () => {
    const html = page({
      "@type": "Recipe",
      name: "Sin votos",
      recipeIngredient: ["1 huevo"],
      aggregateRating: { "@type": "AggregateRating", ratingValue: "5" },
    });
    expect(recipeOf(html).rating).toBeNull();
  });

  it("reports no rating when the field is not an object", () => {
    const html = page({
      "@type": "Recipe",
      name: "Nota rara",
      recipeIngredient: ["1 huevo"],
      aggregateRating: "5 estrellas",
    });
    expect(recipeOf(html).rating).toBeNull();
  });

  it("falls back to the usual scale when the block publishes none", () => {
    const html = page({
      "@type": "Recipe",
      name: "Sin escala",
      recipeIngredient: ["1 huevo"],
      aggregateRating: { "@type": "AggregateRating", ratingValue: 4, ratingCount: 2 },
    });
    expect(recipeOf(html).rating).toEqual({ value: 4, count: 2, scale: 5, worst: 0 });
  });

  it("reads a figure the block wrote with a comma", () => {
    const html = page({
      "@type": "Recipe",
      name: "Nota con coma",
      recipeIngredient: ["1 huevo"],
      aggregateRating: { "@type": "AggregateRating", ratingValue: "4,5", ratingCount: "10" },
    });
    expect(recipeOf(html).rating?.value).toBe(4.5);
  });

  it("reads no figure from a value that is not a number", () => {
    const html = page({
      "@type": "Recipe",
      name: "Nota en palabras",
      recipeIngredient: ["1 huevo"],
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "excelente",
        ratingCount: "diez",
      },
    });
    expect(recipeOf(html).rating).toBeNull();
  });

  it("reads no figure from an infinite number", () => {
    const html = page({
      "@type": "Recipe",
      name: "Nota infinita",
      recipeIngredient: ["1 huevo"],
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: Number.POSITIVE_INFINITY,
        ratingCount: 3,
      },
    });
    expect(recipeOf(html).rating).toBeNull();
  });

  it("carries an energy figure the block states without a number in it", () => {
    const html = page({
      "@type": "Recipe",
      name: "Energía en palabras",
      recipeIngredient: ["1 huevo"],
      nutrition: { "@type": "NutritionInformation", calories: "pocas calorías" },
    });
    expect(recipeOf(html).nutrition).toEqual({ text: "pocas calorías", calories: null });
  });

  it("reports no energy figure when the block holds one that is not an object", () => {
    const html = page({
      "@type": "Recipe",
      name: "Nutrición rara",
      recipeIngredient: ["1 huevo"],
      nutrition: "320 kcal",
    });
    expect(recipeOf(html).nutrition).toBeNull();
  });
});

describe("reading the body when the structured block leaves it to it", () => {
  it("takes an article with a list too short to be ingredients as a collection", () => {
    const html = page(
      { "@type": "Recipe", name: "Casi nada" },
      `<ul class="wp-block-list"><li>Uno</li></ul>`,
    );
    expect(parseRecipePage(html, "casi-nada").kind).toBe("collection");
  });

  it("takes an article whose first list is already instructions as a collection", () => {
    const long = "Una frase larga que describe un paso entero de la receta con todo detalle.";
    const html = page(
      { "@type": "Recipe", name: "Solo pasos" },
      `<ul class="wp-block-list"><li>${long}</li><li>${long}</li></ul>`,
    );
    expect(parseRecipePage(html, "solo-pasos").kind).toBe("collection");
  });

  it("takes an article with no list at all as a collection", () => {
    const html = page({ "@type": "Recipe", name: "Sin listas" }, "<p>Solo prosa.</p>");
    expect(parseRecipePage(html, "sin-listas").kind).toBe("collection");
  });

  it("reads an article whose body the theme never wrapped as a collection with nothing in it", () => {
    const block = JSON.stringify({ "@type": "Recipe", name: "Sin contenedor" });
    const html = `<html><head><script type="application/ld+json">${block}</script></head><body><ul class="wp-block-list"><li>1 huevo</li><li>2 huevos</li></ul></body></html>`;
    const parsed = parseRecipePage(html, "sin-contenedor");
    expect(parsed.kind).toBe("collection");
    expect(parsed.kind === "collection" && parsed.collection.recipes).toEqual([]);
  });

  it("groups the steps under the headings that follow the one opening them", () => {
    const long = "Una frase larga que describe un paso entero de la receta con todo detalle.";
    const html = page(
      { "@type": "Recipe", name: "Con grupos" },
      `<h3 class="wp-block-heading">Ingredientes</h3>
       <ul class="wp-block-list"><li>1 huevo</li><li>2 tomates</li></ul>
       <h2 class="wp-block-heading">Cómo hacer la receta</h2>
       <ul class="wp-block-list"><li>${long}</li></ul>
       <h3 class="wp-block-heading">Terminamos</h3>
       <ul class="wp-block-list"><li>${long}</li></ul>`,
    );
    const recipe = recipeOf(html, "con-grupos");
    expect(recipe.steps.map((step) => step.group)).toEqual([null, "Terminamos"]);
  });

  it("stops the steps at a heading of the same level that opens something else", () => {
    const long = "Una frase larga que describe un paso entero de la receta con todo detalle.";
    const html = page(
      { "@type": "Recipe", name: "Con final" },
      `<h3 class="wp-block-heading">Ingredientes</h3>
       <ul class="wp-block-list"><li>1 huevo</li><li>2 tomates</li></ul>
       <h2 class="wp-block-heading">Cómo hacer la receta</h2>
       <ul class="wp-block-list"><li>${long}</li></ul>
       <h2 class="wp-block-heading">Con qué acompañarla</h2>
       <ul class="wp-block-list"><li>${long}</li></ul>`,
    );
    expect(recipeOf(html, "con-final").steps).toHaveLength(1);
  });

  it("reads the steps from every list of sentences when no heading opens them", () => {
    const long = "Una frase larga que describe un paso entero de la receta con todo detalle.";
    const html = page(
      { "@type": "Recipe", name: "Sin encabezado de pasos" },
      `<h3 class="wp-block-heading">Ingredientes</h3>
       <ul class="wp-block-list"><li>1 huevo</li><li>2 tomates</li></ul>
       <h3 class="wp-block-heading">Preparación</h3>
       <ul class="wp-block-list"><li>${long}</li></ul>`,
    );
    const recipe = recipeOf(html, "sin-encabezado");
    expect(recipe.steps).toHaveLength(1);
    expect(recipe.steps[0]?.group).toBe("Preparación");
  });

  it("leaves out a list whose items are empty", () => {
    const html = page(
      { "@type": "Recipe", name: "Lista vacía" },
      `<ul class="wp-block-list"><li></li></ul>
       <h3 class="wp-block-heading">Ingredientes</h3>
       <ul class="wp-block-list"><li>1 huevo</li><li>2 tomates</li></ul>`,
    );
    expect(recipeOf(html, "lista-vacia").ingredients).toEqual(["1 huevo", "2 tomates"]);
  });
});

describe("a collection's own reading", () => {
  it("leaves out a link whose words are empty", () => {
    const html = page(
      { "@type": "Recipe", name: "Colección con un enlace mudo" },
      `<p>Prosa</p><a href="${BASE}/receta/muda/"><img src="x.jpg" /></a>
       <a href="${BASE}/receta/con-titulo/">Con título</a>`,
    );
    const parsed = parseRecipePage(html, "coleccion");
    expect(parsed.kind === "collection" && parsed.collection.recipes.map((row) => row.id)).toEqual([
      "con-titulo",
    ]);
  });

  it("reads a link written without its host", () => {
    const html = page(
      { "@type": "Recipe", name: "Colección relativa" },
      `<p>Prosa</p><a href="/receta/relativa/">Relativa</a>`,
    );
    const parsed = parseRecipePage(html, "coleccion");
    expect(parsed.kind === "collection" && parsed.collection.recipes[0]?.id).toBe("relativa");
  });

  it("carries the picture a card links beside its title", () => {
    const html = page(
      { "@type": "Recipe", name: "Colección con foto" },
      `<p>Prosa</p><a href="${BASE}/receta/con-foto/"><img src="${BASE}/foto.jpg" />Con foto</a>`,
    );
    const parsed = parseRecipePage(html, "coleccion");
    expect(parsed.kind === "collection" && parsed.collection.recipes[0]?.image_url).toBe(
      `${BASE}/foto.jpg`,
    );
  });
});
