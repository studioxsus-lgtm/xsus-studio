import { describe, expect, test } from "vitest";

import {
  normalizeText,
  normalizeForSearch,
  tokenizeText,
  normalizeLanguageCode,
  getBaseLanguage
} from "../../src/language/normalization.js";

describe("XSUS Text Normalization", () => {
  test("ruan ë dhe ç në tekstin origjinal", () => {
    expect(normalizeText("  Përshëndetje, çfarë bën?  "))
      .toBe("Përshëndetje, çfarë bën?");
  });

  test("normalizon hapësirat e tepërta", () => {
    expect(normalizeText("  Përshëndetje   XSUS \n AI  "))
      .toBe("Përshëndetje XSUS AI");
  });

  test("normalizon apostrofët dhe thonjëzat", () => {
    expect(normalizeText("‘Hello’ — “XSUS”"))
      .toBe("'Hello' - \"XSUS\"");
  });

  test("kthen tekst bosh për vlera të pavlefshme", () => {
    expect(normalizeText(null)).toBe("");
    expect(normalizeText(123)).toBe("");
  });

  test("normalizon tekstin për kërkim", () => {
    expect(normalizeForSearch("PËRSHËNDETJE, XSUS!"))
      .toBe("përshëndetje xsus");
  });

  test("ndan tekstin në fjalë", () => {
    expect(tokenizeText("Përshëndetje, XSUS AI!"))
      .toEqual(["përshëndetje", "xsus", "ai"]);
  });

  test("trajton tekstin bosh gjatë ndarjes", () => {
    expect(tokenizeText("   ")).toEqual([]);
  });

  test("standardizon kodet e gjuhëve", () => {
    expect(normalizeLanguageCode("sq")).toBe("sq");
    expect(normalizeLanguageCode("en-us")).toBe("en-US");
    expect(normalizeLanguageCode("fr-FR")).toBe("fr-FR");
  });

  test("kthen auto për kod të pavlefshëm", () => {
    expect(normalizeLanguageCode("en_US")).toBe("auto");
    expect(normalizeLanguageCode(null)).toBe("auto");
  });

  test("identifikon gjuhën bazë", () => {
    expect(getBaseLanguage("en-US")).toBe("en");
    expect(getBaseLanguage("fr-FR")).toBe("fr");
    expect(getBaseLanguage("sq")).toBe("sq");
    expect(getBaseLanguage("auto")).toBe("auto");
  });
});
