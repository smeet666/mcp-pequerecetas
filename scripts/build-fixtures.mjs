#!/usr/bin/env node
/**
 * Writes the corpus the unit suite reads.
 *
 * Every dish, cook and measurement named here is invented. The shapes come from
 * what the site publishes, and none of its wording is stored in this
 * repository. A page the site has never served gets written just as easily,
 * which is the other reason the corpus is written rather than captured.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "test", "fixtures");
mkdirSync(out, { recursive: true });

const BASE = "https://www.pequerecetas.com";

/**
 * The navigation the site prints on every page.
 *
 * It carries links of the very shape a listing row has, and the same recipes
 * appear in it whatever the page is about. A reader that took the whole
 * document would publish this furniture as results, so the corpus puts it where
 * the site puts it and every listing fixture inherits it.
 */
const chrome = `
<header class="site-header">
  <nav class="mega-menu">
    <ul>
      <li class="menu-item menu-item-type-taxonomy"><a href="${BASE}/ingrediente/pollo/">Pollo</a></li>
      <li class="menu-item menu-item-type-taxonomy"><a href="${BASE}/tecnica/thermomix/">Thermomix</a></li>
      <li class="menu-item menu-item-type-post_type"><a href="${BASE}/receta/bizcocho-de-avena-del-domingo/">Bizcocho de avena del domingo</a></li>
    </ul>
  </nav>
</header>
<div class="brxe-slider splide">
  <div class="splide__track"><div class="splide__list">
    <a href="${BASE}/receta/sopa-de-estrellas-inventada/">Sopa de estrellas inventada</a>
    <a href="${BASE}/receta/galletas-de-anis-de-la-abuela/">Galletas de anís de la abuela</a>
  </div></div>
</div>
<div class="brxe-jet-listing-grid jet-listing-grid">
  <a href="${BASE}/receta/tarta-de-la-vecina-inventada/">Tarta de la vecina inventada</a>
</div>`;

const footer = `
<footer class="site-footer">
  <a href="${BASE}/contacto/">Contacto</a>
</footer>`;

/** The blocks the theme prints above an article: time, servings, energy. */
function dynamicFields(values) {
  return values
    .map(
      (value) =>
        `<div class="brxe-jet-engine-listing-dynamic-field"><div class="jet-listing jet-listing-dynamic-field display-inline"><div class="jet-listing-dynamic-field__content" >${value}</div></div></div>`,
    )
    .join("\n    ");
}

/**
 * One page, with the theme's own header above the words of the article.
 *
 * The time, the servings and the energy are printed in that header, outside the
 * container the article's words sit in, which is where the site prints them.
 */
function page({ title, head = "", header = "", body }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${title}</title>
${head}
</head>
<body>
${chrome}
<main>
<div class="brxe-container article-header">
${header}
</div>
<div class="brxe-container post-content">
${body}
</div>
</main>
${footer}
</body>
</html>
`;
}

function ldJson(nodes) {
  return `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org/", "@graph": nodes })}</script>`;
}

/** The nodes the site prints beside every recipe, which are not the recipe. */
function surroundingNodes(slug, title) {
  return [
    { "@type": "Organization", name: "Sitio inventado", url: BASE },
    { "@type": "WebSite", name: "Sitio inventado", url: BASE },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: BASE },
        { "@type": "ListItem", position: 2, name: title, item: `${BASE}/receta/${slug}/` },
      ],
    },
    { "@type": "Person", name: "Marta Ejemplo", url: `${BASE}/autor/marta-ejemplo/` },
  ];
}

// ---------------------------------------------------------------------------
// A recipe whose ingredients and steps live in the structured block.
// ---------------------------------------------------------------------------

const structuredRecipe = {
  "@type": "Recipe",
  name: "Arroz caldoso de la tía Nube",
  image: [`${BASE}/wp-content/uploads/2026/01/arroz-caldoso-inventado.jpg`, "", ""],
  author: { "@type": "Person", name: "Marta Ejemplo", url: `${BASE}/autor/marta-ejemplo/` },
  publisher: { "@type": "Organization", name: "Sitio inventado", url: BASE },
  description: "Un arroz caldoso inventado para la suite de pruebas.",
  prepTime: "PT15M",
  cookTime: "PT45M",
  totalTime: "PT1H",
  recipeYield: "4",
  keywords: "arroz, caldoso, invento",
  recipeCategory: " Recetas de comidas caseras fáciles",
  recipeCuisine: " Recetas Inventadas, Recetas Imaginarias",
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.32",
    ratingCount: "103",
    bestRating: "5",
    worstRating: "1",
  },
  nutrition: { "@type": "NutritionInformation", calories: "320 kcal" },
  recipeIngredient: [
    "400 g de arroz redondo",
    "2 cebollas medianas",
    "1 diente de ajo",
    "2 cucharadas de aceite de oliva",
    "1 pizca de azafrán inventado",
    "1,5 l de caldo de verduras",
    "2 a 3 tomates maduros",
    "Sal al gusto",
    "Olla de barro",
    "Cuchara de madera",
  ],
  datePublished: "2026-01-04T09:30:00+01:00",
  dateModified: "2026-02-11T18:05:00+01:00",
  recipeInstructions: [
    {
      "@type": "HowToStep",
      text: "Sofreímos la cebolla y el ajo en la olla de barro hasta que estén transparentes.",
      name: "Paso 1",
      url: `${BASE}/receta/arroz-caldoso-tia-nube/#paso-1`,
      image: `${BASE}/wp-content/uploads/2026/01/paso-1-inventado.jpg`,
    },
    {
      "@type": "HowToStep",
      text: "Añadimos el arroz y lo removemos un minuto con la cuchara de madera.",
      name: "Paso 2",
      url: `${BASE}/receta/arroz-caldoso-tia-nube/#paso-2`,
    },
    {
      "@type": "HowToStep",
      text: "Vertemos el caldo caliente y cocemos a fuego suave durante veinte minutos.",
      name: "Paso 3",
    },
  ],
};

writeFileSync(
  join(out, "recipe-structured.html"),
  page({
    title: "Arroz caldoso de la tía Nube",
    head: ldJson([
      ...surroundingNodes("arroz-caldoso-tia-nube", "Arroz caldoso de la tía Nube"),
      structuredRecipe,
    ]),
    header: `<h1>Arroz caldoso de la tía Nube</h1>
  <div class="brxe-block">
    ${dynamicFields(["60 min.", "4 rac.", "320 Kcal", "Un arroz caldoso inventado para la suite de pruebas."])}
  </div>`,
    body: `
<article>
  <p class="wp-block-paragraph">Una receta inventada que no existe en ninguna cocina.</p>
</article>`,
  }),
);

// ---------------------------------------------------------------------------
// A recipe the structured block describes without its ingredients: the body
// carries them, under headings the page writes itself.
// ---------------------------------------------------------------------------

const articleRecipeNode = {
  "@type": "Recipe",
  name: "Crema de calabaza con nueces inventada",
  image: [`${BASE}/wp-content/uploads/2026/03/crema-calabaza-inventada.jpg`],
  author: { "@type": "Person", name: "Lucas Ficticio", url: `${BASE}/autor/lucas-ficticio/` },
  publisher: { "@type": "Organization", name: "Sitio inventado", url: BASE },
  description: "Una crema inventada, espesa y sin ninguna pretensión.",
  totalTime: "PT30M",
  recipeCategory: "Cenas rápidas y fáciles",
  keywords: "calabaza, crema",
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.7",
    ratingCount: "18",
    bestRating: "5",
    worstRating: "1",
  },
  datePublished: "2026-03-02T11:00:00+01:00",
  dateModified: "2026-03-09T08:20:00+01:00",
};

writeFileSync(
  join(out, "recipe-article.html"),
  page({
    title: "Crema de calabaza con nueces inventada",
    head: ldJson([
      ...surroundingNodes("crema-calabaza-inventada", "Crema de calabaza con nueces inventada"),
      articleRecipeNode,
    ]),
    header: `<h1>Crema de calabaza con nueces inventada</h1>
  <div class="brxe-block">
    ${dynamicFields(["30 min.", "6 rac.", "180 Kcal", ""])}
  </div>`,
    body: `
<article>
  <p class="wp-block-paragraph">Una crema inventada que se hace en una sola olla.</p>
  <div id="toc_container" class="no_bullets"><ul class="toc_list"><li><a href="#Ingredientes">Ingredientes</a></li></ul></div>
  <h2 class="wp-block-heading"><span id="Receta">Receta de crema de calabaza</span></h2>
  <h3 class="wp-block-heading"><span id="Ingredientes">Ingredientes</span></h3>
  <ul class="wp-block-list">
    <li>800 g de calabaza inventada</li>
    <li>1 cebolla grande</li>
    <li>2 cucharadas de aceite de oliva</li>
    <li>500 ml de caldo de verduras</li>
    <li>1 pizca de nuez moscada</li>
    <li>Un puñado de nueces peladas</li>
    <li>Batidora de mano</li>
  </ul>
  <h2 class="wp-block-heading"><span id="Como_hacer">Cómo hacer la crema de calabaza</span></h2>
  <h3 class="wp-block-heading"><span id="Sofreimos">Sofreímos la cebolla</span></h3>
  <ul class="wp-block-list">
    <li>Pelamos y picamos la cebolla en dados pequeños.</li>
    <li>La sofreímos con el aceite a fuego suave hasta que quede transparente.</li>
  </ul>
  <h3 class="wp-block-heading"><span id="Cocemos">Cocemos y trituramos</span></h3>
  <ul class="wp-block-list">
    <li>Añadimos la calabaza troceada y el caldo, y cocemos veinte minutos.</li>
    <li>Trituramos con la batidora de mano hasta que no queden grumos.</li>
  </ul>
  <h2 class="wp-block-heading"><span id="Acompanar">Cómo acompañar esta crema</span></h2>
  <p class="wp-block-paragraph">Con pan tostado, o con nada en absoluto.</p>
</article>`,
  }),
);

// ---------------------------------------------------------------------------
// A recipe written into the body with no headings at all: the lists themselves
// are what tells the ingredients from the steps.
// ---------------------------------------------------------------------------

writeFileSync(
  join(out, "recipe-article-bare.html"),
  page({
    title: "Tortilla de acelgas inventada",
    head: ldJson([
      ...surroundingNodes("tortilla-acelgas-inventada", "Tortilla de acelgas inventada"),
      {
        "@type": "Recipe",
        name: "Tortilla de acelgas inventada",
        image: [`${BASE}/wp-content/uploads/2026/04/tortilla-inventada.jpg`],
        author: { "@type": "Person", name: "Lucas Ficticio" },
        publisher: { "@type": "Organization", name: "Sitio inventado", url: BASE },
        description: "Una tortilla inventada de acelgas.",
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4",
          ratingCount: "7",
          bestRating: "5",
          worstRating: "1",
        },
        datePublished: "2026-04-01T10:00:00+02:00",
        dateModified: "2026-04-01T10:00:00+02:00",
      },
    ]),
    header: `<h1>Tortilla de acelgas inventada</h1>
  <div class="brxe-block">${dynamicFields(["25 min.", ""])}</div>`,
    body: `
<article>
  <ul class="wp-block-list">
    <li>6 huevos</li>
    <li>1 manojo de acelgas</li>
    <li>2 dientes de ajo</li>
    <li>Sal y pimienta</li>
  </ul>
  <ul class="wp-block-list">
    <li>Lavamos las acelgas y las cocemos en agua con sal durante diez minutos, hasta que estén tiernas.</li>
    <li>Batimos los huevos con la sal y añadimos las acelgas escurridas y el ajo picado muy fino.</li>
    <li>Cuajamos la tortilla en una sartén a fuego medio, dándole la vuelta con la ayuda de un plato.</li>
  </ul>
  <ul class="wp-block-list">
    <li><a href="${BASE}/receta/tortilla-de-patatas-inventada/">Tortilla de patatas inventada</a></li>
    <li><a href="${BASE}/receta/tortilla-de-calabacin-inventada/">Tortilla de calabacín inventada</a></li>
  </ul>
</article>`,
  }),
);

// ---------------------------------------------------------------------------
// An article that gathers recipes and is described as a recipe all the same.
// ---------------------------------------------------------------------------

writeFileSync(
  join(out, "collection.html"),
  page({
    title: "12 purés inventados para bebés",
    head: ldJson([
      ...surroundingNodes("12-pures-inventados", "12 purés inventados para bebés"),
      {
        "@type": "Recipe",
        name: "12 purés inventados para bebés",
        image: [`${BASE}/wp-content/uploads/2026/05/pures-inventados.jpg`],
        author: { "@type": "Person", name: "Marta Ejemplo" },
        publisher: { "@type": "Organization", name: "Sitio inventado", url: BASE },
        description: "Una selección inventada de purés para la suite de pruebas.",
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.5",
          ratingCount: "31",
          bestRating: "5",
          worstRating: "1",
        },
        datePublished: "2026-05-06T09:00:00+02:00",
        dateModified: "2026-05-20T09:00:00+02:00",
      },
    ]),
    header: `<h1>12 purés inventados para bebés</h1>
  <div class="brxe-block">${dynamicFields(["Una selección inventada de purés para la suite de pruebas."])}</div>`,
    body: `
<article>
  <p class="wp-block-paragraph">Doce purés que nadie ha cocinado nunca.</p>
  <h2 class="wp-block-heading"><span id="Verduras">Purés de verduras inventados</span></h2>
  <p class="wp-block-paragraph">Empezamos por los más suaves.</p>
  <a href="${BASE}/receta/pure-de-calabacin-inventado/">Puré de calabacín inventado</a>
  <a href="${BASE}/receta/pure-de-zanahoria-inventado/">Puré de zanahoria inventado</a>
  <h2 class="wp-block-heading"><span id="Legumbres">Purés de legumbres inventados</span></h2>
  <a href="${BASE}/receta/pure-de-lentejas-inventado/">Puré de lentejas inventado</a>
</article>`,
  }),
);

// ---------------------------------------------------------------------------
// The pages that cannot be read, each broken in one way.
// ---------------------------------------------------------------------------

writeFileSync(
  join(out, "recipe-no-structured.html"),
  page({
    title: "Página sin bloque estructurado",
    body: "<article><h1>Página sin bloque estructurado</h1><p>Sin datos.</p></article>",
  }),
);

writeFileSync(
  join(out, "recipe-broken-structured.html"),
  page({
    title: "Bloque estructurado ilegible",
    head: `<script type="application/ld+json">{ "@context": "https://schema.org/", "@graph": [ {"@type": "Recipe", </script>`,
    body: "<article><h1>Bloque estructurado ilegible</h1></article>",
  }),
);

writeFileSync(
  join(out, "recipe-not-a-recipe.html"),
  page({
    title: "Una página que no es una receta",
    head: ldJson([
      { "@type": "Organization", name: "Sitio inventado", url: BASE },
      { "@type": "WebPage", name: "Una página que no es una receta" },
    ]),
    body: "<article><h1>Una página que no es una receta</h1></article>",
  }),
);

// ---------------------------------------------------------------------------
// Listings: a taxonomy page with a page after it, and the last one.
// ---------------------------------------------------------------------------

/**
 * One card, with the picture left where the theme leaves it.
 *
 * The theme serves a placeholder in `src` and the real address in `data-src`,
 * so a reader taking `src` would hand back a blank square for every row.
 */
function listingRow(slug, title, image) {
  return `
  <div class="brxe-block">
    <a href="${BASE}/receta/${slug}/">
      <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E"
           class="bricks-lazy-hidden" alt="${title}"
           data-src="${BASE}/wp-content/uploads/2026/06/${image}" />
    </a>
    <div class="brxe-heading"><a href="${BASE}/receta/${slug}/">${title}</a></div>
  </div>`;
}

const rowsPageOne = [
  ["arroz-caldoso-tia-nube", "Arroz caldoso de la tía Nube", "arroz-inventado.jpg"],
  ["crema-calabaza-inventada", "Crema de calabaza con nueces inventada", "crema-inventada.jpg"],
  ["tortilla-acelgas-inventada", "Tortilla de acelgas inventada", "tortilla-inventada.jpg"],
];

writeFileSync(
  join(out, "listing-page-1.html"),
  page({
    title: "Recetas con arroz",
    body: `
<h1>Recetas con arroz</h1>
<div class="brxe-container brx-grid">
${rowsPageOne.map((row) => listingRow(...row)).join("\n")}
</div>
<div class="brxe-pagination"><div class="bricks-pagination">
  <span aria-current="page" class="page-numbers current">1</span>
  <a class="page-numbers" href="${BASE}/ingrediente/arroz/page/2/">2</a>
  <a class="page-numbers" href="${BASE}/ingrediente/arroz/page/3/">3</a>
</div></div>`,
  }),
);

writeFileSync(
  join(out, "listing-last-page.html"),
  page({
    title: "Recetas con arroz",
    body: `
<h1>Recetas con arroz</h1>
<div class="brxe-container brx-grid">
${listingRow("paella-imaginaria", "Paella imaginaria de los martes", "paella-inventada.jpg")}
</div>
<div class="brxe-pagination"><div class="bricks-pagination">
  <a class="page-numbers" href="${BASE}/ingrediente/arroz/page/2/">2</a>
  <span aria-current="page" class="page-numbers current">3</span>
</div></div>`,
  }),
);

writeFileSync(
  join(out, "listing-empty.html"),
  page({
    title: "Sin resultados",
    body: `<h1>Sin resultados</h1><div class="brxe-container brx-grid"></div><p>No se ha encontrado nada.</p>`,
  }),
);

// ---------------------------------------------------------------------------
// Search: the site serves one page and no more, whatever is asked of it.
// ---------------------------------------------------------------------------

writeFileSync(
  join(out, "search-results.html"),
  page({
    title: "Resultados de búsqueda",
    body: `
<h1>Resultados para "arroz"</h1>
<div class="brxe-container">
${listingRow("arroz-caldoso-tia-nube", "Arroz caldoso de la tía Nube", "arroz-inventado.jpg")}
${listingRow("arroz-con-leche-inventado", "Arroz con leche inventado", "arroz-leche-inventado.jpg")}
</div>`,
  }),
);

writeFileSync(
  join(out, "search-empty.html"),
  page({
    title: "Resultados de búsqueda",
    body: `<h1>Resultados para "zzzqxwv"</h1><p>No hay resultados.</p>`,
  }),
);

// ---------------------------------------------------------------------------
// The sitemaps the facets are read from.
// ---------------------------------------------------------------------------

function sitemap(urls) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}
</urlset>
`;
}

writeFileSync(
  join(out, "sitemap-dieta.xml"),
  sitemap([`${BASE}/dieta/sin-gluten/`, `${BASE}/dieta/vegetarianas/`, `${BASE}/dieta/veganas/`]),
);

writeFileSync(
  join(out, "sitemap-tecnica.xml"),
  sitemap([`${BASE}/tecnica/thermomix/`, `${BASE}/tecnica/horno/`]),
);

writeFileSync(
  join(out, "sitemap-empty.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>
`,
);

process.stdout.write(`fixtures written to ${out}\n`);
