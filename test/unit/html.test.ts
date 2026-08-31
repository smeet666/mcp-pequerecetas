import { describe, expect, it } from "vitest";
import {
  decode,
  firstBlock,
  textOf,
  withoutLeadingPictogram,
} from "../../src/pequerecetas/html.js";

describe("decode", () => {
  it("resolves the entities markup reserves", () => {
    expect(decode("arroz &amp; pollo")).toBe("arroz & pollo");
  });

  it("resolves the accented letters a Spanish page spells out", () => {
    expect(decode("calabac&iacute;n con a&ntilde;os")).toBe("calabacín con años");
  });

  it("resolves the mark Spanish opens a question with", () => {
    expect(decode("&iquest;Cu&aacute;nto?")).toBe("¿Cuánto?");
  });

  it("resolves a numeric entity", () => {
    expect(decode("caf&#233;")).toBe("café");
  });

  it("resolves a hexadecimal entity", () => {
    expect(decode("caf&#xE9;")).toBe("café");
  });

  it("leaves an entity it does not know exactly as published", () => {
    expect(decode("&inventada;")).toBe("&inventada;");
  });

  it("leaves a code point past the end of Unicode as published", () => {
    expect(decode("&#1114112;")).toBe("&#1114112;");
  });
});

describe("textOf", () => {
  it("drops the tags and keeps the words apart", () => {
    expect(textOf("<h2>Crema <em>de</em> calabaza</h2>")).toBe("Crema de calabaza");
  });

  it("closes the gap a dropped tag left in front of a comma", () => {
    expect(textOf("<b>arroz</b>, caldoso")).toBe("arroz, caldoso");
  });

  it("closes it in front of the marks Spanish writes tight", () => {
    expect(textOf("<b>arroz</b>: caldoso")).toBe("arroz: caldoso");
  });

  it("cannot turn an escaped angle bracket into markup", () => {
    expect(textOf("&lt;b&gt;arroz&lt;/b&gt;")).toBe("<b>arroz</b>");
  });
});

describe("withoutLeadingPictogram", () => {
  it("takes off the pictogram the site sets before a title", () => {
    expect(withoutLeadingPictogram("🥘 Arroz caldoso")).toBe("Arroz caldoso");
  });

  it("keeps a title that opens on a letter", () => {
    expect(withoutLeadingPictogram("Arroz caldoso")).toBe("Arroz caldoso");
  });

  it("keeps the mark Spanish opens an exclamation with", () => {
    expect(withoutLeadingPictogram("¡Qué rico!")).toBe("¡Qué rico!");
  });

  it("keeps the plus sign a heading counts recipes with", () => {
    expect(withoutLeadingPictogram("+50 recetas")).toBe("+50 recetas");
  });
});

describe("firstBlock", () => {
  it("returns the contents of the first element of a kind", () => {
    expect(firstBlock('<ul class="a"><li>uno</li></ul>', /<ul[^>]*>/, "</ul>")).toBe(
      "<li>uno</li>",
    );
  });

  it("returns null when the page holds no such element", () => {
    expect(firstBlock("<p>nada</p>", /<ul[^>]*>/, "</ul>")).toBeNull();
  });

  it("returns what is left when the element is never closed", () => {
    expect(firstBlock("<ul><li>uno", /<ul[^>]*>/, "</ul>")).toBe("<li>uno");
  });
});
