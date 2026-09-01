/**
 * How precise a quantity is allowed to look.
 *
 * A figure states a precision by the way it is written, so "6,3 g" claims a
 * tenth of a gram of an oil nobody weighs that finely, and "15625 g" claims the
 * gram on fifteen kilos of rice. Each case here fixes what a kitchen can
 * actually measure at that size.
 */

import { describe, expect, it } from "vitest";
import { scaleLine } from "../../src/recipe/scale.js";

const by = (factor: number) => ({ factor });

describe("a small mass, where the tenth of a gram stops meaning anything", () => {
  it("rounds to the gram from five grams up", () => {
    expect(scaleLine("25 g de aceite de oliva virgen extra", by(0.25))).toMatchObject({
      text: "6 g de aceite de oliva virgen extra",
      scaling: "rounded",
    });
  });

  it("keeps the tenth below five grams, where it is a real share of the amount", () => {
    expect(scaleLine("10 g de levadura", by(0.25)).text).toBe("2,5 g de levadura");
  });

  it("keeps a whole number where the arithmetic put one", () => {
    expect(scaleLine("24 g de sal", by(0.25)).text).toBe("6 g de sal");
  });
});

describe("a mass large enough that its own unit overstates the precision", () => {
  it("climbs to kilos once a full one is reached", () => {
    expect(scaleLine("250 g de arroz D.O. Valencia", by(62.5))).toMatchObject({
      text: "15,63 kg de arroz D.O. Valencia",
      unit: "kg",
    });
  });

  it("climbs even where the kilo cannot state the figure to the gram", () => {
    expect(scaleLine("25 g de aceite de oliva", by(62.5))).toMatchObject({
      text: "1,57 kg de aceite de oliva",
      unit: "kg",
    });
  });

  it("says the figure moved, since kilos no longer carry every gram", () => {
    expect(scaleLine("250 g de arroz", by(62.5)).scaling).toBe("rounded");
  });

  it("stays in grams below a full kilo", () => {
    expect(scaleLine("25 g de aceite", by(38.75)).unit).toBe("g");
  });

  it("climbs to litres the same way", () => {
    expect(scaleLine("40 ml de nata", by(62.5)).text).toBe("2,5 l de nata");
  });
});

describe("offal, which a knife halves rather than quarters", () => {
  it("takes a share of a liver to the half", () => {
    expect(scaleLine("3 hígados de pollo", by(0.25))).toMatchObject({ amount: 0.5 });
  });

  it("counts whole livers when the recipe grows", () => {
    expect(scaleLine("3 hígados de pollo", by(62.5))).toMatchObject({ amount: 187.5 });
  });
});

describe("what a note about rounding has to show", () => {
  it("writes the figure it started from with enough digits to differ", () => {
    const scaled = scaleLine("250 g de arroz", by(62.5));
    expect(scaled.text).toBe("15,63 kg de arroz");
    expect(scaled.note).toBe("Rounded up from 15,625.");
  });

  it("keeps the ordinary wording where two decimals already tell them apart", () => {
    expect(scaleLine("25 g de aceite", by(0.25)).note).toBe("Rounded down from 6,25.");
  });

  it("never says a figure was rounded from itself", () => {
    for (const factor of [0.25, 3, 38.75, 62.5, 250]) {
      const note = scaleLine("250 g de arroz", by(factor)).note ?? "";
      const shown = scaleLine("250 g de arroz", by(factor)).text.split(" ")[0];
      expect(note).not.toContain(`from ${shown}.`);
    }
  });
});
