import { describe, expect, it } from "vitest";
import {
  formatAmount,
  leadingWord,
  parseIngredient,
  parseLeadingQuantity,
  parseLeadingRange,
  takeUnit,
} from "../../src/recipe/quantity.js";

describe("parseLeadingQuantity", () => {
  it("reads a whole number", () => {
    expect(parseLeadingQuantity("400 g de arroz")).toMatchObject({ amount: 400 });
  });

  it("reads the comma a Spanish recipe writes a decimal with", () => {
    expect(parseLeadingQuantity("1,5 l de caldo")).toMatchObject({ amount: 1.5 });
  });

  it("reads a written fraction", () => {
    expect(parseLeadingQuantity("1/2 taza de leche")?.amount).toBe(0.5);
  });

  it("reads a whole number followed by a fraction", () => {
    expect(parseLeadingQuantity("1 1/2 tazas")?.amount).toBe(1.5);
  });

  it("reads a vulgar fraction glyph", () => {
    expect(parseLeadingQuantity("½ cucharadita")?.amount).toBe(0.5);
  });

  it("reads a whole number against a glyph", () => {
    expect(parseLeadingQuantity("3 ¼ tazas")?.amount).toBe(3.25);
  });

  it("refuses a denominator of zero rather than reading the numerator alone", () => {
    expect(parseLeadingQuantity("1/0 taza")).toBeNull();
  });

  it("returns null for a line that opens on a word", () => {
    expect(parseLeadingQuantity("sal al gusto")).toBeNull();
  });
});

describe("parseLeadingRange", () => {
  it("reads the range word Spanish writes between two bounds", () => {
    expect(parseLeadingRange("2 a 3 tomates")).toMatchObject({
      amount: 2,
      max: 3,
      separator: "a",
    });
  });

  it("reads the other word Spanish offers a cook", () => {
    expect(parseLeadingRange("5 o 6 huevos")).toMatchObject({ amount: 5, max: 6, separator: "o" });
  });

  it("reads a dash between two bounds", () => {
    expect(parseLeadingRange("3-4 dientes")).toMatchObject({ amount: 3, max: 4 });
  });

  it("refuses a descending pair, which is two amounts rather than a range", () => {
    expect(parseLeadingRange("3 a 2 tomates")).toBeNull();
  });

  it("returns null when nothing follows the first bound", () => {
    expect(parseLeadingRange("5 huevos")).toBeNull();
  });

  it("returns null when the line opens on no number at all", () => {
    expect(parseLeadingRange("sal")).toBeNull();
  });
});

describe("takeUnit", () => {
  it("takes the measure standing against the figure", () => {
    const taken = takeUnit("cucharadas de aceite de oliva");
    expect(taken.unit?.canonical).toBe("cucharada");
    expect(taken.rest).toBe("aceite de oliva");
  });

  it("takes a measure written behind the word introducing it", () => {
    const taken = takeUnit("de taza de leche");
    expect(taken.unit?.canonical).toBe("taza");
    expect(taken.rest).toBe("leche");
  });

  it("strips the contracted article Spanish writes before a masculine noun", () => {
    expect(takeUnit("g del arroz redondo").rest).toBe("arroz redondo");
  });

  it("leaves a line naming no measure with all its words", () => {
    const taken = takeUnit("cebollas medianas");
    expect(taken.unit).toBeNull();
    expect(taken.rest).toBe("cebollas medianas");
  });
});

describe("parseIngredient", () => {
  it("reads a figure, a measure and what is measured", () => {
    expect(parseIngredient("400 g de arroz redondo")).toMatchObject({
      amount: 400,
      unit: { canonical: "g" },
      item: "arroz redondo",
    });
  });

  it("reads a range and keeps both bounds", () => {
    expect(parseIngredient("2 a 3 tomates maduros")).toMatchObject({
      amount: 2,
      amountMax: 3,
      rangeSeparator: "a",
      item: "tomates maduros",
    });
  });

  it("reads the article that stands for a number in front of a measure", () => {
    expect(parseIngredient("una pizca de sal")).toMatchObject({
      amount: 1,
      articleWord: "una",
      unit: { canonical: "pizca" },
      item: "sal",
    });
  });

  it("takes the vague article a cook reads as a few", () => {
    expect(parseIngredient("unas gotas de limón")).toMatchObject({
      amount: 3,
      articleWord: "unas",
      unit: { canonical: "gota" },
    });
  });

  it("leaves an article used as a determiner alone, because it counts nothing", () => {
    expect(parseIngredient("una cebolla grande")).toMatchObject({
      amount: null,
      unit: null,
      item: "una cebolla grande",
    });
  });

  it("reports no quantity for a line that carries none", () => {
    expect(parseIngredient("Sal al gusto")).toMatchObject({
      amount: null,
      unit: null,
      item: "Sal al gusto",
    });
  });
});

describe("formatAmount", () => {
  it("writes a whole number plainly", () => {
    expect(formatAmount(4)).toBe("4");
  });

  it("writes a kitchen fraction as a fraction", () => {
    expect(formatAmount(0.5)).toBe("1/2");
  });

  it("writes a whole number and a fraction together", () => {
    expect(formatAmount(2.25)).toBe("2 1/4");
  });

  it("writes a mass as a decimal, with the comma Spanish uses", () => {
    expect(formatAmount(8.33, { fractions: false })).toBe("8,33");
  });

  it("keeps a very small amount from rounding away to nothing", () => {
    expect(formatAmount(0.0004, { fractions: false })).toBe("0,0004");
  });

  it("writes nothing for a value that is not a number", () => {
    expect(formatAmount(Number.NaN)).toBe("");
  });
});

describe("leadingWord", () => {
  it("returns the first word of a line", () => {
    expect(leadingWord("cucharadas de aceite")).toBe("cucharadas");
  });

  it("returns null for a line of a single word", () => {
    expect(leadingWord("sal")).toBeNull();
  });
});
