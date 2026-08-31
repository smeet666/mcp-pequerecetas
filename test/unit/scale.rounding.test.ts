/**
 * Where the arithmetic stops being arithmetic.
 *
 * Every case here is a size at which the exact product stops naming something a
 * cook can produce, and each states what the line is allowed to say about
 * itself once it has moved.
 */

import { describe, expect, it } from "vitest";
import { scaleLine } from "../../src/recipe/scale.js";

const by = (factor: number) => ({ factor });

describe("the step a mass is rounded to grows with the mass", () => {
  it("rounds a large mass to the five a scale shows", () => {
    expect(scaleLine("33,4 g de harina", by(3))).toMatchObject({
      text: "100 g de harina",
      scaling: "rounded",
    });
  });

  it("rounds a middling mass to the whole unit", () => {
    expect(scaleLine("11 g de sal", by(1.5))).toMatchObject({ text: "17 g de sal" });
  });

  it("rounds a small mass to a tenth, which is what it costs to lose one", () => {
    expect(scaleLine("3 g de levadura", by(1.11))).toMatchObject({ text: "3,3 g de levadura" });
  });

  it("leaves a whole number where the arithmetic put it", () => {
    expect(scaleLine("1234 g de harina", by(2))).toMatchObject({
      text: "2468 g de harina",
      scaling: "scaled",
    });
  });
});

describe("a countable thing lands where a kitchen can take it", () => {
  it("takes a share of a vegetable to the quarter a knife cuts", () => {
    expect(scaleLine("1 cebolla", by(0.2))).toMatchObject({ amount: 0.25 });
  });

  it("takes a share of a vegetable to a third, which a knife also gives", () => {
    expect(scaleLine("1 cebolla", by(0.33))).toMatchObject({ amount: 0.33 });
  });

  it("rounds a count of more than one to the whole a cook puts in the pan", () => {
    expect(scaleLine("2 cebollas", by(0.6))).toMatchObject({ amount: 1, scaling: "rounded" });
  });

  it("keeps a shrinking recipe from asking for more than it started with", () => {
    const scaled = scaleLine("1 lata de tomate", by(0.9));
    expect(scaled.amount).toBeLessThanOrEqual(1);
  });

  it("rounds a large count to the whole one a cook puts in the pan", () => {
    expect(scaleLine("4 huevos", by(2.3))).toMatchObject({ amount: 9, scaling: "rounded" });
  });

  it("answers nothing for a quantity of nothing", () => {
    expect(scaleLine("0 huevos", by(2))).toMatchObject({ amount: 0 });
  });
});

describe("a spoon is measured out in halves and in quarters", () => {
  it("halves a spoonful", () => {
    expect(scaleLine("1 cucharada de azúcar", by(0.5))).toMatchObject({
      text: "1/2 cucharadas de azúcar",
    });
  });

  it("states a quarter of a spoonful in the smaller spoon", () => {
    expect(scaleLine("1 cucharada de azúcar", by(0.25)).text).toMatch(/cucharaditas?/);
  });

  it("states a share of a spoonful in the smaller spoon rather than as a fraction", () => {
    expect(scaleLine("1 cucharada de aceite", by(0.9))).toMatchObject({
      text: "2,7 cucharaditas de aceite",
      unit: "cucharadita",
    });
  });

  it("answers nothing for a spoonful of nothing", () => {
    expect(scaleLine("0 cucharadas de aceite", by(3))).toMatchObject({ amount: 0 });
  });

  it("rounds a large number of spoonfuls to the half", () => {
    expect(scaleLine("3 cucharadas de aceite", by(1.1))).toMatchObject({ amount: 3.5 });
  });
});

describe("both ends of a range are taken to one unit", () => {
  it("states both bounds in the unit the smaller one asks for", () => {
    expect(scaleLine("1 a 2 kg de patatas", by(0.4)).text).toBe("400 a 800 g de patatas");
  });

  it("carries a range of counted things through the rounding", () => {
    expect(scaleLine("2 a 4 huevos", by(1.5))).toMatchObject({ amount: 3, amount_max: 6 });
  });

  it("keeps a range whose lower bound is nothing readable", () => {
    expect(scaleLine("0 a 2 huevos", by(2))).toMatchObject({ amount: 0, amount_max: 4 });
  });
});

describe("what a line says about a thing it names rather than measures", () => {
  it("keeps a piece carved off a bird to the half a knife gives", () => {
    expect(scaleLine("1 muslo de pollo", by(0.4))).toMatchObject({ amount: 0.5 });
  });

  it("keeps a juice to the half a squeezed fruit gives", () => {
    expect(scaleLine("2 zumos de limón", by(0.6))).toMatchObject({ amount: 1 });
  });

  it("keeps something already a portion whole", () => {
    expect(scaleLine("12 gambas", by(0.55))).toMatchObject({ amount: 7 });
  });

  it("halves what the lists say nothing about", () => {
    expect(scaleLine("2 flanes inventados", by(0.75))).toMatchObject({ amount: 1.5 });
  });

  it("quarters what is sold in a jar", () => {
    expect(scaleLine("1 tarro de miel", by(0.22))).toMatchObject({ amount: 0.25 });
  });
});

describe("agreement once the number has moved", () => {
  it("marks an adjective for the plural the new count asks for", () => {
    expect(scaleLine("1 pimiento entero", by(3)).text).toBe("3 pimientos enteros");
  });

  it("leaves an adjective alone when the count keeps its number", () => {
    expect(scaleLine("2 pimientos enteros", by(2)).text).toBe("4 pimientos enteros");
  });

  it("takes an adjective back to the singular for one", () => {
    expect(scaleLine("4 pimientos rojos", by(0.25)).text).toBe("1 pimiento rojo");
  });
});
