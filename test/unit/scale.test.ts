import { describe, expect, it } from "vitest";
import { agreeWithAmount, scaleLine, scaleLines } from "../../src/recipe/scale.js";

const by = (factor: number) => ({ factor });

describe("scaleLine, exact arithmetic", () => {
  it("doubles a mass and says the figure is the product itself", () => {
    expect(scaleLine("400 g de arroz redondo", by(2))).toMatchObject({
      text: "800 g de arroz redondo",
      scaling: "scaled",
      amount: 800,
      unit: "g",
    });
  });

  it("keeps the line as published when nothing was asked of it", () => {
    expect(scaleLine("400 g de arroz", by(1))).toMatchObject({
      text: "400 g de arroz",
      scaling: "scaled",
      amount: 400,
    });
  });

  it("carries both ends of a range through the arithmetic", () => {
    expect(scaleLine("2 a 3 tomates maduros", by(2))).toMatchObject({
      text: "4 a 6 tomates maduros",
      amount: 4,
      amount_max: 6,
      scaling: "scaled",
    });
  });

  it("keeps a dash against the numbers the way the page wrote it", () => {
    expect(scaleLine("3-4 dientes de ajo", by(2)).text).toBe("6-8 dientes de ajo");
  });
});

describe("scaleLine, units that stay readable", () => {
  it("climbs to the larger unit rather than printing thousands", () => {
    expect(scaleLine("500 g de harina", by(4))).toMatchObject({ text: "2 kg de harina" });
  });

  it("walks down so a small share never rounds away to nothing", () => {
    expect(scaleLine("2 g de levadura", by(0.1))).toMatchObject({
      text: "200 mg de levadura",
      scaling: "scaled",
    });
  });

  it("states a share of a cup in the spoon a kitchen owns", () => {
    expect(scaleLine("1 taza de leche", by(0.25)).text).toBe("4 cucharadas de leche");
  });
});

describe("scaleLine, counted things", () => {
  it("leaves an egg whole, because half of one is not something a cook measures", () => {
    const scaled = scaleLine("3 huevos", by(0.5));
    expect(scaled.amount).toBe(2);
    expect(scaled.scaling).toBe("rounded");
    expect(scaled.note).toMatch(/Rounded up/);
  });

  it("halves a clove of garlic, which a knife divides", () => {
    expect(scaleLine("3 dientes de ajo", by(0.5))).toMatchObject({
      text: "1 1/2 dientes de ajo",
      scaling: "scaled",
    });
  });

  it("quarters an onion, which a knife takes further", () => {
    expect(scaleLine("1 cebolla grande", by(0.25))).toMatchObject({ amount: 0.25 });
  });

  it("agrees the noun with the number counting it", () => {
    expect(scaleLine("1 cebolla grande", by(3)).text).toBe("3 cebollas grandes");
  });

  it("keeps a mass noun in the singular whatever the count", () => {
    expect(scaleLine("1 pizca de sal", by(4)).text).toBe("4 pizcas de sal");
  });

  it("clamps up rather than shrinking an ingredient out of the recipe", () => {
    const scaled = scaleLine("1 huevo", by(0.2));
    expect(scaled.amount).toBe(1);
    expect(scaled.note).toMatch(/no longer holds its share/);
    expect(scaled.scaling).toBe("rounded");
  });
});

describe("scaleLine, gestures", () => {
  it("multiplies the count of a pinch and says the size is the cook's", () => {
    const scaled = scaleLine("1 pizca de azafrán", by(6));
    expect(scaled.text).toBe("6 pizcas de azafrán");
    expect(scaled.note).toMatch(/approximate measure/);
    expect(scaled.note).toMatch(/teaspoon/);
  });

  it("lands a gesture on a whole one, because there is no half of a hand", () => {
    const scaled = scaleLine("3 puñados de nueces", by(0.5));
    expect(scaled.amount).toBe(2);
    expect(scaled.scaling).toBe("rounded");
  });
});

describe("scaleLine, lines that carry no quantity", () => {
  it("leaves a line with nothing to multiply as published, and says so", () => {
    expect(scaleLine("Sal al gusto", by(4))).toMatchObject({
      text: "Sal al gusto",
      scaling: "unscaled",
      amount: null,
      note: "No quantity given; adjust to taste.",
    });
  });

  it("scales the first quantity only, and says the rest reads as published", () => {
    const scaled = scaleLine("1 cucharada de azúcar o 2 cucharaditas de miel", by(2));
    expect(scaled.note).toMatch(/further quantity/);
  });
});

describe("scaleLine, equipment written among the ingredients", () => {
  it("leaves a tool alone rather than ordering six of it", () => {
    expect(scaleLine("Freidora de aire", by(6))).toMatchObject({
      text: "Freidora de aire",
      scaling: "unscaled",
      is_equipment: true,
      amount: null,
    });
  });

  it("says why the line was left alone", () => {
    expect(scaleLine("Brocha de silicona", by(6)).note).toMatch(/tool rather than an ingredient/);
  });

  it("leaves a tool alone even where it carries a number", () => {
    expect(scaleLine("2 moldes de 20 cm", by(3))).toMatchObject({
      text: "2 moldes de 20 cm",
      is_equipment: true,
      scaling: "unscaled",
    });
  });

  it("does not mistake food for a tool because a word looks alike", () => {
    expect(scaleLine("200 g de papel de arroz", by(2)).is_equipment).toBe(false);
  });
});

describe("scaleLine, what a kitchen cannot measure", () => {
  it("warns when the product falls under what a scale shows at the foot of the ladder", () => {
    expect(scaleLine("1 mg de sal", by(0.01)).note).toMatch(/smaller than a kitchen scale/);
  });

  it("walks down the ladder rather than warning, while a smaller unit can hold it", () => {
    expect(scaleLine("1 g de sal", by(0.01))).toMatchObject({
      text: "10 mg de sal",
      scaling: "scaled",
    });
  });

  it("says so when both ends of a range meet at this size", () => {
    const scaled = scaleLine("2 a 3 huevos", by(0.4));
    expect(scaled.amount_max).toBeNull();
    expect(scaled.note).toMatch(/both ends come to the same amount/);
  });
});

describe("agreeWithAmount", () => {
  it("marks the head of the phrase for the plural", () => {
    expect(agreeWithAmount("cebolla grande", 3)).toBe("cebollas grandes");
  });

  it("takes a phrase back to the singular for one", () => {
    expect(agreeWithAmount("cebollas grandes", 1)).toBe("cebolla grande");
  });

  it("leaves the words between the head and the adjective exactly as published", () => {
    expect(agreeWithAmount("pimiento rojo de Padrón entero", 2)).toBe(
      "pimientos rojo de Padrón enteros",
    );
  });

  it("leaves an unknown trailing word alone rather than inventing an ending", () => {
    expect(agreeWithAmount("queso Idiazábal", 3)).toBe("quesos Idiazábal");
  });

  it("leaves a mass noun unmarked", () => {
    expect(agreeWithAmount("harina", 4)).toBe("harina");
  });

  it("returns nothing for an empty phrase", () => {
    expect(agreeWithAmount("", 2)).toBe("");
  });
});

describe("scaleLines", () => {
  it("carries a heading untouched and says it holds no quantity", () => {
    const [heading] = scaleLines([{ text: "Para el relleno:", is_heading: true }], by(2));
    expect(heading).toMatchObject({
      text: "Para el relleno:",
      is_heading: true,
      scaling: "unscaled",
      amount: null,
    });
  });

  it("scales the lines that are not headings", () => {
    const scaled = scaleLines(
      [
        { text: "Para la masa:", is_heading: true },
        { text: "200 g de harina", is_heading: false },
      ],
      by(2),
    );
    expect(scaled[1]).toMatchObject({ text: "400 g de harina", is_heading: false });
  });
});
