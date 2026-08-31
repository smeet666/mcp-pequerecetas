import { describe, expect, it } from "vitest";
import {
  approximateEquivalent,
  chooseReadableUnit,
  demoteUnit,
  formatUnit,
  isSpoonMeasure,
  lookupUnit,
  hasEmbeddedMeasure,
  normalizeUnitKey,
  readPartitiveMeasure,
  spanishPlural,
  spanishSingular,
  unitDivisibility,
  unitKeys,
} from "../../src/recipe/units.js";

describe("normalizeUnitKey", () => {
  it("lowercases, strips accents and drops abbreviation dots", () => {
    expect(normalizeUnitKey("Cdta.")).toBe("cdta");
  });

  it("drops a bracketed plural mark a page writes when it does not know the count", () => {
    expect(normalizeUnitKey("cucharada(s)")).toBe("cucharada");
  });

  it("collapses runs of whitespace", () => {
    expect(normalizeUnitKey("  cucharada   sopera ")).toBe("cucharada sopera");
  });
});

describe("lookupUnit", () => {
  it("reads a metric symbol", () => {
    expect(lookupUnit("g")).toMatchObject({ canonical: "g", kind: "measured", system: "metric" });
  });

  it("reads a metric measure spelled out in Spanish", () => {
    expect(lookupUnit("gramos")).toMatchObject({ canonical: "g", kind: "measured" });
  });

  it("reads the spoon a Spanish recipe measures with", () => {
    expect(lookupUnit("cucharadas")).toMatchObject({
      canonical: "cucharada",
      kind: "portioned",
      plural: "cucharadas",
    });
  });

  it("tells the small spoon from the large one", () => {
    expect(lookupUnit("cucharadita")?.canonical).toBe("cucharadita");
    expect(lookupUnit("cucharada")?.canonical).toBe("cucharada");
  });

  it("reads the abbreviations a page writes instead of the words", () => {
    expect(lookupUnit("cda")?.canonical).toBe("cucharada");
    expect(lookupUnit("cdta")?.canonical).toBe("cucharadita");
  });

  it("reads a clove of garlic as something a kitchen halves", () => {
    expect(lookupUnit("dientes")).toMatchObject({ canonical: "diente", kind: "portioned" });
  });

  it("reads a pinch as a gesture rather than a measure", () => {
    expect(lookupUnit("pizca")).toMatchObject({ canonical: "pizca", kind: "approximate" });
  });

  it("keeps the pound in its own system rather than restating it in grams", () => {
    expect(lookupUnit("libra")).toMatchObject({ canonical: "libra", system: "imperial" });
  });

  it("returns null for a word that measures nothing", () => {
    expect(lookupUnit("berenjena")).toBeNull();
  });

  it("holds its keys longest first, so a two-word measure wins over its first word", () => {
    const keys = unitKeys();
    expect(keys.indexOf("cucharada sopera")).toBeLessThan(keys.indexOf("cucharada"));
  });
});

describe("hasEmbeddedMeasure", () => {
  it("spots a second quantity further along a line", () => {
    expect(hasEmbeddedMeasure("1 cucharada de azúcar o 2 cucharaditas de miel")).toBe(true);
  });

  it("spots a quantity written with the partitive the measure takes", () => {
    expect(hasEmbeddedMeasure("3/4 de taza de leche")).toBe(true);
  });

  it("says no when the line carries only words", () => {
    expect(hasEmbeddedMeasure("sal al gusto")).toBe(false);
  });
});

describe("spanishSingular and spanishPlural", () => {
  it("adds -s to a word ending in a vowel", () => {
    expect(spanishPlural("taza")).toBe("tazas");
  });

  it("adds -es to a word ending in a consonant", () => {
    expect(spanishPlural("tenedor")).toBe("tenedores");
  });

  it("turns a final z into -ces", () => {
    expect(spanishPlural("nuez")).toBe("nueces");
  });

  it("leaves a word whose plural is spelled like its singular", () => {
    expect(spanishPlural("crisis")).toBe("crisis");
  });

  it("takes -es back off a plural", () => {
    expect(spanishSingular("tenedores")).toBe("tenedor");
  });

  it("takes -ces back to a z", () => {
    expect(spanishSingular("nueces")).toBe("nuez");
  });

  it("takes a plain -s back off", () => {
    expect(spanishSingular("tazas")).toBe("taza");
  });

  it("leaves a short word alone rather than cutting it to nothing", () => {
    expect(spanishSingular("mes")).toBe("mes");
  });
});

describe("readPartitiveMeasure", () => {
  it("reads a container the vocabulary has no entry for", () => {
    const read = readPartitiveMeasure("ramillete de perejil");
    expect(read?.unit).toMatchObject({ canonical: "ramillete", kind: "approximate" });
    expect(read?.rest.trim()).toBe("de perejil");
  });

  it("gives that container the plural Spanish writes for it", () => {
    expect(readPartitiveMeasure("cazo de leche")?.unit.plural).toBe("cazos");
  });

  it("reads a container written in the plural back to its singular", () => {
    expect(readPartitiveMeasure("vasitos de yogur")?.unit.canonical).toBe("vasito");
  });

  it("refuses a word that names a quantity without holding one", () => {
    expect(readPartitiveMeasure("poco de sal")).toBeNull();
  });

  it("refuses a word that names part of the food rather than a vessel", () => {
    expect(readPartitiveMeasure("zumo de limón")).toBeNull();
  });

  it("refuses a measure the vocabulary already holds, which is read there", () => {
    expect(readPartitiveMeasure("cucharada de azúcar")).toBeNull();
  });

  it("refuses a word too short to be a container", () => {
    expect(readPartitiveMeasure("kg de harina")).toBeNull();
  });

  it("refuses a line that does not open on the noun", () => {
    expect(readPartitiveMeasure("perejil fresco")).toBeNull();
  });
});

describe("unitDivisibility", () => {
  it("halves a measure whose half a kitchen can take out", () => {
    expect(unitDivisibility(lookupUnit("lata")!)).toBe("half");
  });

  it("quarters a measure large enough that a quarter is still a portion", () => {
    expect(unitDivisibility(lookupUnit("botella")!)).toBe("quarter");
  });

  it("keeps a gesture whole, because there is no half of a hand", () => {
    expect(unitDivisibility(lookupUnit("puñado")!)).toBe("whole");
  });
});

describe("demoteUnit", () => {
  it("steps a kilo down to grams", () => {
    expect(demoteUnit(lookupUnit("kg")!)).toMatchObject({ per: 1000 });
    expect(demoteUnit(lookupUnit("kg")!)?.unit.canonical).toBe("g");
  });

  it("states a share of a cup in the spoon a kitchen owns", () => {
    expect(demoteUnit(lookupUnit("taza")!)).toMatchObject({ per: 16 });
    expect(demoteUnit(lookupUnit("taza")!)?.unit.canonical).toBe("cucharada");
  });

  it("states a share of a spoon in the smaller spoon", () => {
    expect(demoteUnit(lookupUnit("cucharada")!)?.unit.canonical).toBe("cucharadita");
  });

  it("has nothing below the smallest measure of a ladder", () => {
    expect(demoteUnit(lookupUnit("mg")!)).toBeNull();
  });
});

describe("isSpoonMeasure", () => {
  it("recognises the measures that hold a fixed volume", () => {
    expect(isSpoonMeasure(lookupUnit("cucharada")!)).toBe(true);
    expect(isSpoonMeasure(lookupUnit("taza")!)).toBe(true);
  });

  it("says no to a clove, which holds whatever it holds", () => {
    expect(isSpoonMeasure(lookupUnit("diente")!)).toBe(false);
  });
});

describe("chooseReadableUnit", () => {
  it("climbs to the larger unit once a full one is reached", () => {
    const chosen = chooseReadableUnit(lookupUnit("g")!, 2000);
    expect(chosen.unit.canonical).toBe("kg");
    expect(2000 * chosen.ratio).toBe(2);
  });

  it("stays put just below a full larger unit", () => {
    expect(chooseReadableUnit(lookupUnit("g")!, 999).unit.canonical).toBe("g");
  });

  it("walks down so a quantity under one never rounds away", () => {
    const chosen = chooseReadableUnit(lookupUnit("g")!, 0.002);
    expect(chosen.unit.canonical).toBe("mg");
    expect(0.002 * chosen.ratio).toBe(2);
  });

  it("keeps a figure the larger unit could not state where the page wrote it", () => {
    expect(chooseReadableUnit(lookupUnit("g")!, 2468).unit.canonical).toBe("g");
  });

  it("leaves a counted thing in the unit the page wrote", () => {
    expect(chooseReadableUnit(lookupUnit("diente")!, 12).unit.canonical).toBe("diente");
  });

  it("leaves an amount that is not a number where it is", () => {
    expect(chooseReadableUnit(lookupUnit("g")!, Number.NaN).ratio).toBe(1);
  });
});

describe("formatUnit", () => {
  it("leaves a symbol unmarked whatever the count", () => {
    expect(formatUnit(lookupUnit("g")!, 400)).toBe("g");
  });

  it("writes the singular for exactly one", () => {
    expect(formatUnit(lookupUnit("cucharada")!, 1)).toBe("cucharada");
  });

  it("writes the plural for anything else, which is what Spanish does with a half", () => {
    expect(formatUnit(lookupUnit("cucharada")!, 1.5)).toBe("cucharadas");
    expect(formatUnit(lookupUnit("cucharada")!, 3)).toBe("cucharadas");
  });

  it("uses the plural the vocabulary carries when the rule would get it wrong", () => {
    expect(formatUnit(lookupUnit("nuez")!, 2)).toBe("nueces");
  });
});

describe("approximateEquivalent", () => {
  it("offers the everyday equivalence of a pinch as words", () => {
    expect(approximateEquivalent(lookupUnit("pizca")!)).toMatch(/teaspoon/);
  });

  it("has nothing to say about a measure with no settled equivalence", () => {
    expect(approximateEquivalent(lookupUnit("g")!)).toBeNull();
  });
});
