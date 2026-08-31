/**
 * The corners of the vocabulary and of the refusals.
 *
 * A measure with no ladder left, a phrase that is only an adjective, and a name
 * a caller mistyped past recognition: each has one right answer, and none of
 * them comes up in an ordinary read.
 */

import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  chooseReadableUnit,
  formatUnit,
  lookupUnit,
  spanishSingular,
} from "../../src/recipe/units.js";
import { agreeWithAmount, scaleLine } from "../../src/recipe/scale.js";
import { strictInput } from "../../src/tools/arguments.js";

describe("the vocabulary at its corners", () => {
  it("leaves a word whose plural is spelled like its singular", () => {
    expect(spanishSingular("analisis")).toBe("analisis");
  });

  it("walks a spoon down its ladder to keep a small share readable", () => {
    const chosen = chooseReadableUnit(lookupUnit("cucharada")!, 0.5);
    expect(chosen.unit.canonical).toBe("cucharada");
  });

  it("keeps a measure with nothing below it where the page wrote it", () => {
    const chosen = chooseReadableUnit(lookupUnit("mg")!, 0.0001);
    expect(chosen.unit.canonical).toBe("mg");
  });

  it("builds the plural of a measure the vocabulary spells only once", () => {
    expect(formatUnit({ canonical: "vasito", kind: "approximate", system: "none" }, 3)).toBe(
      "vasitos",
    );
  });
});

describe("agreement where the phrase is unusual", () => {
  it("leaves a lone adjective alone, because there is no noun for it to follow", () => {
    expect(agreeWithAmount("entero", 1)).toBe("entero");
  });

  it("marks a lone word for the plural when the count asks for it", () => {
    expect(agreeWithAmount("entero", 2)).toBe("enteros");
  });

  it("writes a measure with nothing after it as the page wrote it", () => {
    expect(scaleLine("2 cucharadas", { factor: 2 }).text).toBe("4 cucharadas");
  });

  it("says what an article was read as", () => {
    expect(scaleLine("una pizca de sal", { factor: 4 }).note).toMatch(/"una" read as 1/);
  });
});

describe("naming the argument a caller meant", () => {
  const schema = strictInput({ page: z.number().optional(), value: z.string().optional() });
  const refusal = (args: Record<string, unknown>) =>
    schema
      .safeParse(args)
      .error?.issues.map((issue) => issue.message)
      .join(" ") ?? "";

  it("names several unknown arguments in the plural", () => {
    const message = refusal({ pagina: 1, valor: "arroz" });
    expect(message).toMatch(/Unknown arguments/);
  });

  it("names one in the singular", () => {
    expect(refusal({ pagina: 1 })).toMatch(/Unknown argument /);
  });

  it("offers the declared name written another way", () => {
    expect(refusal({ Page: 1 })).toMatch(/did you mean 'page'/);
  });

  it("offers a declared name the given one opens with", () => {
    expect(refusal({ page_number: 1 })).toMatch(/did you mean 'page'/);
  });

  it("offers a declared name a typing slip away", () => {
    expect(refusal({ valu: "arroz" })).toMatch(/did you mean 'value'/);
  });

  it("offers nothing for a name that resembles none of them", () => {
    const message = refusal({ zzzqxwvbnm: 1 });
    expect(message).toMatch(/'zzzqxwvbnm'/);
    expect(message).not.toMatch(/did you mean/);
  });

  it("offers nothing for a name made of nothing a reader can compare", () => {
    const message = refusal({ "!!!": 1 });
    expect(message).toMatch(/Unknown argument/);
    expect(message).not.toMatch(/did you mean/);
  });

  it("opens every refusal with the code a caller branches on", () => {
    expect(refusal({ pagina: 1 })).toMatch(/^\[invalid_input]/);
  });

  it("opens a refusal from a bound with that same code", () => {
    const bounded = strictInput({ page: z.number().int().positive() });
    const message = bounded.safeParse({ page: 0 }).error?.issues[0]?.message ?? "";
    expect(message).toMatch(/^\[invalid_input]/);
  });
});
