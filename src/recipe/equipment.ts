/**
 * Telling a tool from something eaten.
 *
 * The site writes what a recipe is cooked with inside the list it writes the
 * ingredients in, so "Freidora de aire", "Papel de hornear" and "Brocha de
 * silicona" arrive in the same list as the chicken. Multiplying one of those by
 * six orders six air fryers, so a line naming a tool is carried as published
 * and marked.
 *
 * The reading is by the noun the line opens with, because that is what the line
 * names. A word appearing later belongs to the description: "papel de arroz" is
 * eaten and "papel de hornear" is not, and both carry the same first word,
 * which is why the qualifier is read too.
 */

const COMBINING_MARK = /[̀-ͯ]/g;
const LEADING_QUANTITY = /^[\d\s.,/¼½¾⅓⅔]+/;
const ARTICLE = /^(?:un|una|unos|unas|el|la|los|las)\s+/i;
/** What separates the head noun of a line from the rest of it. */
const WORD_BREAK = /[\s,]+/;

/**
 * Tools a kitchen owns rather than buys by the recipe.
 *
 * Each is the head noun of a line, so the list holds singulars and the plural
 * is taken off before the lookup.
 */
const TOOLS = new Set([
  "freidora",
  "airfryer",
  "batidora",
  "licuadora",
  "amasadora",
  "thermomix",
  "robot",
  "olla",
  "paellera",
  "paella",
  "cazuela",
  "cazo",
  "sarten",
  "sartenes",
  "bandeja",
  "molde",
  "moldes",
  "fuente",
  "rejilla",
  "brocha",
  "pincel",
  "espatula",
  "varillas",
  "varilla",
  "colador",
  "escurridor",
  "tamiz",
  "mortero",
  "rodillo",
  "manga",
  "boquilla",
  "termometro",
  "temporizador",
  "microondas",
  "horno",
  "vaporera",
  "parrilla",
  "plancha",
  "tabla",
  "cuchillo",
  "pelador",
  "rallador",
  "exprimidor",
  "cuchara",
  "cucharon",
  "pinza",
  "pinzas",
  "bol",
  "bols",
  "cuenco",
  "recipiente",
  "tarrina",
  "vaso",
  "batidor",
  "prensa",
  "papel",
  "film",
  "aluminio",
  "palillos",
  "palillo",
  "brochetas",
  "brocheta",
]);

/**
 * Qualifiers that make an otherwise edible head a tool.
 *
 * "papel" is eaten as "papel de arroz" and lines a tin as "papel de hornear",
 * so the head alone cannot answer. A head on this list is a tool only when one
 * of its qualifiers follows.
 */
const TOOL_QUALIFIERS: Record<string, RegExp> = {
  // Spanish names the dish and the pan it is cooked in with the same word, so
  // the pan is the reading only where the line sizes it or names its metal.
  paella: /\b(?:paellera|cm|acero|hierro|esmaltada|pulido|inducci[oó]n)\b/,
  papel: /\b(?:hornear|horno|aluminio|film|vegetal|absorbente|cocina)\b/,
  vaso: /\b(?:medidor|batidora|thermomix)\b/,
  cuchara: /\b(?:madera|silicona|helado)\b/,
  manga: /\b(?:pastelera)\b/,
  tabla: /\b(?:cortar|madera)\b/,
  plancha: /\b(?:electrica|hierro)\b/,
  horno: /\b(?:precalentado)\b/,
};

/** Lowercase and strip accents, so "sartén" and "sarten" hit the same entry. */
function fold(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(COMBINING_MARK, "");
}

/** The plural mark Spanish adds, taken back off for the lookup. */
function singular(word: string): string {
  if (word.endsWith("es") && word.length > 4) {
    return word.slice(0, -2);
  }
  if (word.endsWith("s") && word.length > 3) {
    return word.slice(0, -1);
  }
  return word;
}

/**
 * Whether a line names a tool.
 *
 * A quantity in front changes nothing: "2 moldes de 20 cm" counts tins, and a
 * recipe made for twice as many people uses the same two tins.
 */
export function isEquipmentLine(line: string): boolean {
  const folded = fold(line).replace(LEADING_QUANTITY, "").replace(ARTICLE, "").trim();
  /* v8 ignore next -- splitting a string always yields a first piece. */
  const head = folded.split(WORD_BREAK)[0] ?? "";
  const key = TOOLS.has(head) ? head : singular(head);
  if (!TOOLS.has(key)) {
    return false;
  }
  const qualifier = TOOL_QUALIFIERS[key] ?? TOOL_QUALIFIERS[head];
  return qualifier === undefined || qualifier.test(folded);
}
