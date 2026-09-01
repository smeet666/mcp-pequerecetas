/**
 * Cooking measures, and what scaling means for each.
 *
 * What matters about a measure is how far its number divides before it stops
 * naming something a cook can produce. Doubling "200 g" gives "400 g", to the
 * tenth of a gram. Doubling "1 pizca" gives "2 pizcas", which is the whole of
 * what a pinch can say: the count carries the quantity, and the size of one
 * pinch is the hand's business.
 */

const COMBINING_MARK = /[̀-ͯ]/g;
const BRACKETED_PLURAL = /\((?:s|es)\)/g;
const ABBREVIATION_DOT = /\./g;
const WHITESPACE = /\s+/g;
/** A noun standing between the amount and the "de" that introduces the food. */
const HEAD_BEFORE_DE = /^\s*(\p{L}+)\s+(?=de\s)/u;
const SPOON_OR_CUP = /^(?:cucharada|cucharadita|taza)$/;
const VOWEL_ENDING = /[aeiou]$/i;
const Z_ENDING = /z$/i;
const CES_ENDING = /ces$/i;
const ES_ENDING = /es$/i;
/**
 * A word whose written accent falls on its last syllable, before -n or -s.
 *
 * Spanish writes that accent because the stress is where the rule would not put
 * it. Adding a syllable moves the stress back to where the rule expects it, so
 * the accent is no longer written: limón becomes limones, jamón jamones.
 */
const FINAL_STRESS = /([áéíóú])([ns])$/i;
const UNSTRESSED_ENDING: Record<string, string> = {
  á: "a",
  é: "e",
  í: "i",
  ó: "o",
  ú: "u",
};
/** The same pair, seen from the plural: -ones, -anes, -eses. */
const RESTORES_ACCENT = /([aeiou])([ns])es$/i;
const ACCENTED_VOWEL: Record<string, string> = {
  a: "á",
  e: "é",
  i: "í",
  o: "ó",
  u: "ú",
};
const TRAILING_S = /s$/i;
/**
 * A word whose singular already carries the -s that its plural repeats.
 *
 * Spanish leaves these unchanged: "crisis" and "análisis" are one and several.
 * The ending is what decides, since "tazas" also ends in a vowel and an -s
 * while being a plain plural.
 */
const UNCHANGED_PLURAL = /(?:is|us)$/i;

export type UnitKind =
  /** Mass or volume: scales continuously and cleanly. */
  | "measured"
  /** Spoons, cups, cloves, sachets: scales, but only to sensible fractions. */
  | "portioned"
  /**
   * Pizcas, puñados, chorritos: a real amount, held to no better than the hand
   * that produces it. The count is multiplied and lands on a whole one, and the
   * line says the measure is approximate.
   */
  | "approximate";

export type UnitSystem = "metric" | "imperial" | "none";

export interface UnitInfo {
  /** Canonical singular form, used when rewriting the ingredient line. */
  canonical: string;
  kind: UnitKind;
  system: UnitSystem;
  /** Plural form when the Spanish rule would get it wrong. */
  plural?: string;
  /** A symbol such as "g" or "ml", which never takes a plural mark. */
  symbol?: true;
}

/**
 * The vocabulary, keyed lowercased and accent-stripped, so one entry covers
 * "puñado", "punado" and "Puñados".
 */
const UNITS: Record<string, UnitInfo> = {
  mg: { canonical: "mg", kind: "measured", system: "metric", symbol: true },
  miligramo: { canonical: "mg", kind: "measured", system: "metric", symbol: true },
  miligramos: { canonical: "mg", kind: "measured", system: "metric", symbol: true },
  g: { canonical: "g", kind: "measured", system: "metric", symbol: true },
  gr: { canonical: "g", kind: "measured", system: "metric", symbol: true },
  grs: { canonical: "g", kind: "measured", system: "metric", symbol: true },
  gramo: { canonical: "g", kind: "measured", system: "metric", symbol: true },
  gramos: { canonical: "g", kind: "measured", system: "metric", symbol: true },
  kg: { canonical: "kg", kind: "measured", system: "metric", symbol: true },
  kilo: { canonical: "kg", kind: "measured", system: "metric", symbol: true },
  kilos: { canonical: "kg", kind: "measured", system: "metric", symbol: true },
  kilogramo: { canonical: "kg", kind: "measured", system: "metric", symbol: true },
  kilogramos: { canonical: "kg", kind: "measured", system: "metric", symbol: true },
  ml: { canonical: "ml", kind: "measured", system: "metric", symbol: true },
  mililitro: { canonical: "ml", kind: "measured", system: "metric", symbol: true },
  mililitros: { canonical: "ml", kind: "measured", system: "metric", symbol: true },
  cl: { canonical: "cl", kind: "measured", system: "metric", symbol: true },
  centilitro: { canonical: "cl", kind: "measured", system: "metric", symbol: true },
  centilitros: { canonical: "cl", kind: "measured", system: "metric", symbol: true },
  dl: { canonical: "dl", kind: "measured", system: "metric", symbol: true },
  decilitro: { canonical: "dl", kind: "measured", system: "metric", symbol: true },
  decilitros: { canonical: "dl", kind: "measured", system: "metric", symbol: true },
  l: { canonical: "l", kind: "measured", system: "metric", symbol: true },
  lt: { canonical: "l", kind: "measured", system: "metric", symbol: true },
  litro: { canonical: "l", kind: "measured", system: "metric", symbol: true },
  litros: { canonical: "l", kind: "measured", system: "metric", symbol: true },

  // A page glossing a weight for readers who buy by the pound names the libra
  // or the onza. Each keeps its own system, because restating it in grams would
  // change what the page said.
  libra: { canonical: "libra", kind: "measured", system: "imperial", plural: "libras" },
  libras: { canonical: "libra", kind: "measured", system: "imperial", plural: "libras" },
  onza: { canonical: "onza", kind: "measured", system: "imperial", plural: "onzas" },
  onzas: { canonical: "onza", kind: "measured", system: "imperial", plural: "onzas" },

  // Spoons and cups: real measures, in sensible fractions.
  cucharada: { canonical: "cucharada", kind: "portioned", system: "none", plural: "cucharadas" },
  cucharadas: { canonical: "cucharada", kind: "portioned", system: "none", plural: "cucharadas" },
  "cucharada sopera": {
    canonical: "cucharada",
    kind: "portioned",
    system: "none",
    plural: "cucharadas",
  },
  "cucharadas soperas": {
    canonical: "cucharada",
    kind: "portioned",
    system: "none",
    plural: "cucharadas",
  },
  cda: { canonical: "cucharada", kind: "portioned", system: "none", plural: "cucharadas" },
  cdas: { canonical: "cucharada", kind: "portioned", system: "none", plural: "cucharadas" },
  cucharadita: {
    canonical: "cucharadita",
    kind: "portioned",
    system: "none",
    plural: "cucharaditas",
  },
  cucharaditas: {
    canonical: "cucharadita",
    kind: "portioned",
    system: "none",
    plural: "cucharaditas",
  },
  "cucharadita de postre": {
    canonical: "cucharadita",
    kind: "portioned",
    system: "none",
    plural: "cucharaditas",
  },
  cdta: { canonical: "cucharadita", kind: "portioned", system: "none", plural: "cucharaditas" },
  cdtas: { canonical: "cucharadita", kind: "portioned", system: "none", plural: "cucharaditas" },
  taza: { canonical: "taza", kind: "portioned", system: "none", plural: "tazas" },
  tazas: { canonical: "taza", kind: "portioned", system: "none", plural: "tazas" },
  vaso: { canonical: "vaso", kind: "portioned", system: "none", plural: "vasos" },
  vasos: { canonical: "vaso", kind: "portioned", system: "none", plural: "vasos" },

  // Counted things a kitchen halves without thinking about it.
  diente: { canonical: "diente", kind: "portioned", system: "none", plural: "dientes" },
  dientes: { canonical: "diente", kind: "portioned", system: "none", plural: "dientes" },
  sobre: { canonical: "sobre", kind: "portioned", system: "none", plural: "sobres" },
  sobres: { canonical: "sobre", kind: "portioned", system: "none", plural: "sobres" },
  lata: { canonical: "lata", kind: "portioned", system: "none", plural: "latas" },
  latas: { canonical: "lata", kind: "portioned", system: "none", plural: "latas" },
  bote: { canonical: "bote", kind: "portioned", system: "none", plural: "botes" },
  botes: { canonical: "bote", kind: "portioned", system: "none", plural: "botes" },
  botella: { canonical: "botella", kind: "portioned", system: "none", plural: "botellas" },
  botellas: { canonical: "botella", kind: "portioned", system: "none", plural: "botellas" },
  tarro: { canonical: "tarro", kind: "portioned", system: "none", plural: "tarros" },
  tarros: { canonical: "tarro", kind: "portioned", system: "none", plural: "tarros" },
  tableta: { canonical: "tableta", kind: "portioned", system: "none", plural: "tabletas" },
  tabletas: { canonical: "tableta", kind: "portioned", system: "none", plural: "tabletas" },
  paquete: { canonical: "paquete", kind: "portioned", system: "none", plural: "paquetes" },
  paquetes: { canonical: "paquete", kind: "portioned", system: "none", plural: "paquetes" },
  bolsa: { canonical: "bolsa", kind: "portioned", system: "none", plural: "bolsas" },
  bolsas: { canonical: "bolsa", kind: "portioned", system: "none", plural: "bolsas" },
  rama: { canonical: "rama", kind: "portioned", system: "none", plural: "ramas" },
  ramas: { canonical: "rama", kind: "portioned", system: "none", plural: "ramas" },
  hoja: { canonical: "hoja", kind: "portioned", system: "none", plural: "hojas" },
  hojas: { canonical: "hoja", kind: "portioned", system: "none", plural: "hojas" },
  loncha: { canonical: "loncha", kind: "portioned", system: "none", plural: "lonchas" },
  lonchas: { canonical: "loncha", kind: "portioned", system: "none", plural: "lonchas" },
  rodaja: { canonical: "rodaja", kind: "portioned", system: "none", plural: "rodajas" },
  rodajas: { canonical: "rodaja", kind: "portioned", system: "none", plural: "rodajas" },
  rebanada: { canonical: "rebanada", kind: "portioned", system: "none", plural: "rebanadas" },
  rebanadas: { canonical: "rebanada", kind: "portioned", system: "none", plural: "rebanadas" },
  cubito: { canonical: "cubito", kind: "portioned", system: "none", plural: "cubitos" },
  cubitos: { canonical: "cubito", kind: "portioned", system: "none", plural: "cubitos" },
  unidad: { canonical: "unidad", kind: "portioned", system: "none", plural: "unidades" },
  unidades: { canonical: "unidad", kind: "portioned", system: "none", plural: "unidades" },

  // Gestures: the hand decides the size, the count carries the quantity.
  pizca: { canonical: "pizca", kind: "approximate", system: "none", plural: "pizcas" },
  pizcas: { canonical: "pizca", kind: "approximate", system: "none", plural: "pizcas" },
  pellizco: { canonical: "pellizco", kind: "approximate", system: "none", plural: "pellizcos" },
  pellizcos: { canonical: "pellizco", kind: "approximate", system: "none", plural: "pellizcos" },
  punado: { canonical: "puñado", kind: "approximate", system: "none", plural: "puñados" },
  punados: { canonical: "puñado", kind: "approximate", system: "none", plural: "puñados" },
  chorro: { canonical: "chorro", kind: "approximate", system: "none", plural: "chorros" },
  chorros: { canonical: "chorro", kind: "approximate", system: "none", plural: "chorros" },
  chorrito: { canonical: "chorrito", kind: "approximate", system: "none", plural: "chorritos" },
  chorritos: { canonical: "chorrito", kind: "approximate", system: "none", plural: "chorritos" },
  gota: { canonical: "gota", kind: "approximate", system: "none", plural: "gotas" },
  gotas: { canonical: "gota", kind: "approximate", system: "none", plural: "gotas" },
  toque: { canonical: "toque", kind: "approximate", system: "none", plural: "toques" },
  toques: { canonical: "toque", kind: "approximate", system: "none", plural: "toques" },
  manojo: { canonical: "manojo", kind: "approximate", system: "none", plural: "manojos" },
  manojos: { canonical: "manojo", kind: "approximate", system: "none", plural: "manojos" },
  cucharon: { canonical: "cucharón", kind: "approximate", system: "none", plural: "cucharones" },
  cucharones: { canonical: "cucharón", kind: "approximate", system: "none", plural: "cucharones" },
  // A nut of butter, whose plural changes the consonant.
  nuez: { canonical: "nuez", kind: "approximate", system: "none", plural: "nueces" },
  nueces: { canonical: "nuez", kind: "approximate", system: "none", plural: "nueces" },
};

/**
 * Lowercase, strip accents and drop abbreviation dots, so a lookup survives the
 * spellings a recipe actually uses.
 *
 * Recipes write "cdta." as readily as the full word, and an unrecognised
 * measure is worse than a wrong one: the amount falls through to the countable
 * branch and gets rounded as though a spoonful were an indivisible object.
 *
 * A page that does not know how many it will be writes the plural mark in
 * brackets, as in "4 cucharada(s)". The measure is the word without it.
 */
export function normalizeUnitKey(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_MARK, "")
    .replace(ABBREVIATION_DOT, " ")
    .replace(BRACKETED_PLURAL, "")
    .replace(WHITESPACE, " ")
    .trim();
}

/** Longest keys first, so "cucharada sopera" wins over "cucharada". */
const UNIT_KEYS: string[] = Object.keys(UNITS).sort(
  (a, b) => b.split(" ").length - a.split(" ").length || b.length - a.length,
);

export const unitKeys = (): string[] => UNIT_KEYS;

export function lookupUnit(text: string): UnitInfo | null {
  return UNITS[normalizeUnitKey(text)] ?? null;
}

/**
 * A number followed by a measure, anywhere in a piece of text.
 *
 * It spots a quantity the reader did not take, such as the second half of
 * "1 cucharada de azúcar o 2 cucharaditas de miel", which would otherwise sit
 * in a rewritten line still saying what the page said.
 *
 * A quantity keeps the same shape whether the measure stands against the figure
 * or behind the word introducing it: "3/4 taza" and "3/4 de taza" are one
 * quantity written twice. The digits and the whitespace are kept in pieces that
 * cannot both match a space, because letting them overlap makes the engine try
 * every way of splitting a run of spaces, which turns a long line into seconds
 * of work for an answer that was always going to be no.
 */
const EMBEDDED = new RegExp(
  `\\d[\\d.,/]*\\s*(?:de\\s+)?(?:${UNIT_KEYS.map((key) => key.replace(/ /g, "\\s+")).join("|")})\\b`,
  "i",
);

/** The text is normalized first, because the vocabulary is keyed without accents. */
export function hasEmbeddedMeasure(text: string): boolean {
  return EMBEDDED.test(normalizeUnitKey(text));
}

/**
 * A second count the line adds to the first, carrying no measure of its own.
 *
 * A page writes "2 ramas de romero y otras 2 para decorar", and the second two
 * is as much a quantity as the first even though no unit follows it. Only a
 * figure a word of addition introduces is read this way: a number standing on
 * its own belongs to the name of the thing, as in "harina 000", and reading it
 * as a quantity would qualify a line nothing is wrong with.
 */
const ADDED_QUANTITY = /\b(?:y|e|mas|ademas|otro|otra|otros|otras)\s+(?:otr[ao]s?\s+)?\d/i;

export function hasAddedQuantity(text: string): boolean {
  return ADDED_QUANTITY.test(normalizeUnitKey(text));
}

/**
 * Words that stand where a measure would and name no container.
 *
 * "un poco de sal" states that there is some salt, and multiplying it says
 * nothing.
 */
const NOT_A_MEASURE = new Set([
  "poco",
  "poquito",
  "mucho",
  "mas",
  "menos",
  "bastante",
  "resto",
  "mitad",
  "cuarto",
  "tercio",
  "mezcla",
  "conjunto",
  // These name a part of the food rather than something that holds it. A line
  // asking for "1 zumo de limón" counts lemons, and "1 pechuga de pollo" counts
  // pieces of the bird: reading either as a measure would hand the question of
  // how far one divides to a word that names no vessel.
  "zumo",
  "jugo",
  "ralladura",
  "cascara",
  "corteza",
  "clara",
  "claras",
  "yema",
  "yemas",
  // What a butcher cut, and the offal sold beside it. A line reading "3 hígados
  // de pollo" counts livers, and the grammar it is written with is the grammar
  // of "3 vasitos de yogur": without this list the liver would be read as the
  // vessel and the answer would call it an approximate measure.
  "pechuga",
  "pechugas",
  "muslo",
  "muslos",
  "contramuslo",
  "contramuslos",
  "higado",
  "higados",
  "corazon",
  "corazones",
  "molleja",
  "mollejas",
  "rinon",
  "rinones",
  "lengua",
  "lenguas",
  "ala",
  "alas",
  "alita",
  "alitas",
  "pata",
  "patas",
  "costilla",
  "costillas",
  "chuleta",
  "chuletas",
  "solomillo",
  "solomillos",
  "lomo",
  "lomos",
  "carrillera",
  "carrilleras",
  "rabo",
  "rabos",
  "oreja",
  "orejas",
  "morro",
  "morros",
  "cola",
  "colas",
]);

/**
 * Read a measure named with a container or a gesture the vocabulary has no
 * entry for.
 *
 * What makes a measure approximate is that its size belongs to whoever pours
 * it: a ramillete, a vasito, a cazo hold what they hold, and the recipe's
 * proportion lives in how many are asked for. Spanish marks that grammatically,
 * by placing the noun between the amount and the "de" that introduces the thing
 * measured: "un ramillete de perejil", "2 vasitos de yogur". A noun in that
 * position measures whatever follows it, so a container nobody thought to list
 * is read by the same rule as the ones that are, and the vocabulary only has to
 * carry the words whose plural or spelling the rule would get wrong.
 *
 * The amount has to come first. A line opening on the noun, as in "perejil
 * fresco", carries no quantity, and inventing one from the grammar would put a
 * number where the recipe wrote none.
 */
export function readPartitiveMeasure(text: string): { unit: UnitInfo; rest: string } | null {
  const match = HEAD_BEFORE_DE.exec(text);
  if (match === null) {
    return null;
  }

  /* v8 ignore next -- the pattern that matched carries its group. */
  const word = match[1] ?? "";
  if (word.length < 3 || NOT_A_MEASURE.has(normalizeUnitKey(word)) || lookupUnit(word) !== null) {
    return null;
  }

  const canonical = spanishSingular(word);
  return {
    unit: { canonical, kind: "approximate", system: "none", plural: spanishPlural(canonical) },
    rest: text.slice(match[0].length),
  };
}

/**
 * The singular of a noun a line wrote in the plural, so the rewrite can put it
 * back in either number.
 *
 * "crisis" and "análisis" carry their -s in the singular, so the ending before
 * it decides rather than the last letter alone.
 */
export function spanishSingular(word: string): string {
  if (CES_ENDING.test(word)) {
    return `${word.slice(0, -3)}z`;
  }
  const stressed = RESTORES_ACCENT.exec(word);
  if (stressed !== null && word.length > 5) {
    /* v8 ignore next -- the pattern captured the vowel it matched on. */
    const matched = stressed[1] ?? "";
    /* v8 ignore next -- and the consonant that followed it. */
    const ending = stressed[2] ?? "";
    /* v8 ignore next -- the vowel matched is one of the five in the table. */
    const vowel = ACCENTED_VOWEL[matched.toLowerCase()] ?? "";
    return `${word.slice(0, -4)}${vowel}${ending}`;
  }
  if (UNCHANGED_PLURAL.test(word)) {
    return word;
  }
  if (ES_ENDING.test(word) && word.length > 4) {
    return word.slice(0, -2);
  }
  if (TRAILING_S.test(word) && word.length > 3) {
    return word.slice(0, -1);
  }
  return word;
}

/** The plural Spanish writes for a noun. */
export function spanishPlural(word: string): string {
  if (UNCHANGED_PLURAL.test(word)) {
    return word;
  }
  if (Z_ENDING.test(word)) {
    return `${word.slice(0, -1)}ces`;
  }
  const stressed = FINAL_STRESS.exec(word);
  if (stressed !== null) {
    /* v8 ignore next -- the pattern captured the accented vowel. */
    const matched = stressed[1] ?? "";
    /* v8 ignore next -- and the consonant that followed it. */
    const ending = stressed[2] ?? "";
    /* v8 ignore next -- the vowel matched is one of the five in the table. */
    const vowel = UNSTRESSED_ENDING[matched.toLowerCase()] ?? "";
    return `${word.slice(0, -2)}${vowel}${ending}es`;
  }
  if (VOWEL_ENDING.test(word)) {
    return `${word}s`;
  }
  return `${word}es`;
}

/**
 * What a kitchen usually takes each approximate measure to be.
 *
 * Offered as words for a note, never as the quantity: writing "2 cucharaditas"
 * where the page wrote "4 pizcas" puts a figure on the page it never claimed,
 * and the cook is the one holding the pinch.
 */
const APPROXIMATE_EQUIVALENT: Record<string, string> = {
  pizca: "commonly taken as about half a teaspoon",
  pellizco: "commonly taken as about half a teaspoon",
  punado: "commonly taken as about a quarter of a cup",
  chorro: "commonly taken as a short pour from the bottle",
  chorrito: "commonly taken as about a teaspoon poured in a thin line",
  gota: "commonly taken as a single drop",
  nuez: "commonly taken as about a tablespoon of butter",
  cucharon: "commonly taken as about half a cup",
  manojo: "commonly taken as what one hand holds of a leafy herb",
  toque: "commonly taken as the smallest amount a spoon tip carries",
};

/** The everyday equivalence for an approximate measure, when there is a settled one. */
export function approximateEquivalent(unit: UnitInfo): string | null {
  return APPROXIMATE_EQUIVALENT[normalizeUnitKey(unit.canonical)] ?? null;
}

/**
 * Ladders, used to keep a scaled amount at a human size.
 *
 * Multiplying a recipe by thirty is arithmetically fine and practically poor:
 * "8335 g de azúcar" is correct, and nobody weighs eight thousand grams. Each
 * measured unit therefore knows the unit above and below it, so a large amount
 * climbs the ladder and a small one comes back down. Each system keeps its own
 * ladder, because converting between them changes what the recipe said.
 */
interface UnitStep {
  /** Unit to switch to, and how many of the current unit it holds. */
  to: string;
  per: number;
}

const PROMOTIONS: Record<string, UnitStep> = {
  mg: { to: "g", per: 1000 },
  g: { to: "kg", per: 1000 },
  ml: { to: "l", per: 1000 },
  cl: { to: "l", per: 100 },
  dl: { to: "l", per: 10 },
};

const DEMOTIONS: Record<string, UnitStep> = {
  // Spoons and cups hold a fixed volume, so a share of one is stated in the
  // smaller spoon rather than as a fraction no measuring set carries.
  taza: { to: "cucharada", per: 16 },
  cucharada: { to: "cucharadita", per: 3 },

  kg: { to: "g", per: 1000 },
  g: { to: "mg", per: 1000 },
  l: { to: "cl", per: 100 },
  dl: { to: "cl", per: 10 },
  cl: { to: "ml", per: 10 },
};

/**
 * The unit one step down the ladder, with how many of it fit in one of the
 * current unit. Null at the bottom of a ladder, where there is nothing smaller
 * to express the amount in.
 */
export function demoteUnit(unit: UnitInfo): { unit: UnitInfo; per: number } | null {
  const step = DEMOTIONS[normalizeUnitKey(unit.canonical)];
  if (step === undefined) {
    return null;
  }
  const target = lookupUnit(step.to);
  /* v8 ignore next -- every ladder names a unit the vocabulary holds. */
  return target === null ? null : { unit: target, per: step.per };
}

/**
 * Spoons and cups: a portion, and at the same time a fixed volume. The volume
 * is what lets a share of one be restated in a smaller spoon.
 */
export function isSpoonMeasure(unit: UnitInfo): boolean {
  return SPOON_OR_CUP.test(unit.canonical);
}

/** How finely a kitchen can divide one of a counted thing. */
export type Divisibility =
  /** A huevo: half of one is not something a cook takes out of the shell. */
  | "whole"
  /** A diente, a lata, a sobre: half of it is a quantity a kitchen can take. */
  | "half"
  /** A cebolla, a manzana: a knife takes it to quarters. */
  | "quarter";

/**
 * Measures a cook takes a quarter of.
 *
 * The half is as far as the criterion goes on its own, because that is the
 * share most measures give up by eye. These answer the size question
 * differently. A bote, a botella and a tarro hold enough that a quarter is
 * still a portion someone serves and the rest still keeps. A loncha and a
 * rebanada are already cut off something larger, and the board that produced
 * one takes a corner off it in the same gesture.
 *
 * The pattern is exported because any of these words can stand where the
 * measure goes or inside the name of what is counted, and both readings answer
 * to the same list.
 */
export const QUARTERED_MEASURE =
  /(?:^|[^\p{L}])(?:botes?|botellas?|tarros?|bloques?|tabletas?|lonchas?|rebanadas?|barras?)(?![\p{L}])/iu;

/**
 * How far one of a measure divides.
 *
 * A measure divides as far as half of what it holds stays a quantity a kitchen
 * can take out. Almost always it does: what a lata, a bote, a sobre or a
 * paquete holds is poured, weighed or spooned, so half a lata de tomate is half
 * a lata de tomate and the rest keeps in the fridge. A hoja de gelatina and a
 * rama de canela are cut with a knife.
 *
 * What does not divide is what has no half a cook can measure out. A huevo is
 * the case: half of one means beating it and weighing the result, which no
 * recipe asks for, and the same holds for a yema and a clara on their own. That
 * is a fact about the contents, so it is decided where the item is named rather
 * than here.
 *
 * A gesture keeps its own answer. A pizca is the amount a hand produces in one
 * go, and there is no half of a hand: the size of one is the cook's and the
 * count is the whole of what the measure can say, so the count lands on a whole
 * and the line reports that it moved.
 */
export function unitDivisibility(unit: UnitInfo): Divisibility {
  if (unit.kind === "approximate") {
    return "whole";
  }
  return QUARTERED_MEASURE.test(unit.canonical) ? "quarter" : "half";
}

export interface ChosenUnit {
  unit: UnitInfo;
  /** What to multiply an amount in the original unit by to express it in this one. */
  ratio: number;
}

/**
 * Choose the unit a cook would actually write a quantity in, and say how to get
 * there.
 *
 * A ratio rather than a converted number, because a range has two bounds and
 * they have to end up in the same unit: converting each on its own gives the
 * unreadable "450 g a 1 kg". The caller picks one bound to choose from, then
 * applies the ratio to both.
 *
 * Demotion repeats while the amount is under one, so a quantity divided a
 * thousandfold walks all the way down its ladder instead of rounding away.
 * Promotion takes one step, at a full unit of the step above, so 999 g stays
 * grams and 1000 g becomes a kilo.
 *
 * Both directions ask whether the unit can hold the figure. A kitchen reads two
 * decimals and no more, so 2468 g written in kilos is 2,47 and the eight grams
 * are gone. A quantity the bigger unit cannot state stays where the page wrote
 * it, and a quantity the page's own unit cannot state walks down to the one
 * that can, so the same mass comes out the same however the page spelled it.
 */
export function chooseReadableUnit(unit: UnitInfo, amount: number): ChosenUnit {
  if (unit.kind !== "measured" || !Number.isFinite(amount) || amount <= 0) {
    return { unit, ratio: 1 };
  }

  let current = unit;
  let ratio = 1;

  while (amount * ratio < 1) {
    const step = demoteUnit(current);
    if (step === null) {
      break;
    }
    ratio *= step.per;
    current = step.unit;
  }

  // The climb asks only that a full unit above has been reached. A figure that
  // unit cannot state to the gram is still the better reading at that size:
  // 15625 g claims a precision on fifteen kilos of rice that no kitchen holds,
  // and what is dropped by writing 15,63 kg is said by the line's own scaling.
  const up = PROMOTIONS[normalizeUnitKey(current.canonical)];
  if (up !== undefined && amount * ratio >= up.per) {
    const target = lookupUnit(up.to);
    /* v8 ignore next -- every ladder names a unit the vocabulary holds. */
    if (target !== null) {
      // The climb is final. What the bigger unit cannot state to the gram is
      // rounded there and reported, which costs less than writing fifteen
      // kilos of rice as a five-figure number of grams. Walking back down here
      // would undo the climb for every figure that is not round.
      return { unit: target, ratio: ratio / up.per };
    }
  }

  // Below ten, the step a kitchen rounds to is a tenth of the unit, so a value
  // the unit cannot write loses a real share of itself: 1,234 kg rounded where
  // it stands is 1,2 kg, and thirty-four grams are gone. From ten upwards the
  // step is one or five, which is what a scale shows anyway, so the value is
  // rounded rather than restated in a smaller unit nobody weighs in.
  while (amount * ratio < ROUND_RATHER_THAN_DEMOTE && !writesExactly(amount * ratio)) {
    const step = demoteUnit(current);
    if (step === null) {
      break;
    }
    ratio *= step.per;
    current = step.unit;
  }

  return { unit: current, ratio };
}

/** At and above this, rounding costs less than restating the value further down. */
const ROUND_RATHER_THAN_DEMOTE = 10;

/** Whether a figure survives being written with the two decimals a kitchen reads. */
function writesExactly(value: number): boolean {
  return Math.abs(value * 100 - Math.round(value * 100)) < 1e-9;
}

/**
 * Render a measure for a given amount, choosing singular or plural.
 *
 * A kitchen says "media cucharadita" and "un cuarto de cucharadita", so a share
 * of one keeps the singular; the plural starts above one, which is why 1,5 takes
 * it: "1,5 cucharadas".
 */
export function formatUnit(unit: UnitInfo, amount: number): string {
  if (unit.symbol === true || amount <= 1) {
    return unit.canonical;
  }
  return unit.plural ?? spanishPlural(unit.canonical);
}
