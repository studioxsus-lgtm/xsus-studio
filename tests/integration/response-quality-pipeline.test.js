import { describe, expect, test } from "vitest";

import {
createResponseQualityPipeline,
RESPONSE_QUALITY_PIPELINE_VERSION
} from "../../src/core/response-quality-pipeline.js";

describe("XSUS AI Core — Response Quality Pipeline", () => {
test("ka versionin e pritshëm", () => {
expect(RESPONSE_QUALITY_PIPELINE_VERSION).toBe("1.0.0");
});

test("kthen rezultat të strukturuar për një përgjigje", () => {
const pipeline = createResponseQualityPipeline();

const result = pipeline.evaluate({
  answer: "Parisi është kryeqyteti i Francës.",
  expectedLanguage: "sq",
  sources: []
});

expect(result).toHaveProperty("version", "1.0.0");
expect(result).toHaveProperty("quality");
expect(result).toHaveProperty("sourceVerification");
expect(result).toHaveProperty("report");
expect(result).toHaveProperty("errors");
expect(Array.isArray(result.errors)).toBe(true);

});

test("ruan rezultatet e cilësisë dhe raportit", () => {
const pipeline = createResponseQualityPipeline();

const result = pipeline.evaluate({
  answer: "Uji përbëhet nga hidrogjeni dhe oksigjeni.",
  expectedLanguage: "sq",
  sources: []
});

expect(result.quality).toBeDefined();
expect(result.report).toBeDefined();
expect(result.report).toHaveProperty("dimensions");
expect(result.report).toHaveProperty("recommendations");

});

test("nuk pretendon se burimet janë verifikuar pa prova", () => {
const pipeline = createResponseQualityPipeline();

const result = pipeline.evaluate({
  answer: "Një përgjigje provë.",
  expectedLanguage: "sq",
  sources: [
    {
      title: "Burim prove",
      content: "Përmbajtje prove pa verifikim të pavarur."
    }
  ]
});

expect(result.sourceVerification).toBeDefined();

if (Array.isArray(result.sourceVerification.results)) {
  for (const source of result.sourceVerification.results) {
    expect(source.verified).not.toBe(true);
    expect(source.trustEstablished).not.toBe(true);
  }
}

});

test("raporton gabim për përgjigjen bosh", () => {
const pipeline = createResponseQualityPipeline();

const result = pipeline.evaluate({
  answer: "",
  expectedLanguage: "sq",
  sources: []
});

expect(Array.isArray(result.errors)).toBe(true);
expect(result.errors).toContainEqual({
  code: "EMPTY_ANSWER",
  message: "Përgjigjja është bosh."
});

});

test("refuzon hyrjen null me gabim të standardizuar", () => {
const pipeline = createResponseQualityPipeline();

const result = pipeline.evaluate(null);

expect(result).toEqual({
  version: "1.0.0",
  quality: null,
  sourceVerification: null,
  report: null,
  errors: [
    {
      code: "INVALID_INPUT",
      message: "Hyrja duhet të jetë objekt."
    }
  ]
});

});

test("refuzon vargun si hyrje të pavlefshme", () => {
const pipeline = createResponseQualityPipeline();

const result = pipeline.evaluate([
  {
    answer: "Kjo nuk duhet të pranohet si objekt kërkese."
  }
]);

expect(result.version).toBe("1.0.0");
expect(result.quality).toBeNull();
expect(result.sourceVerification).toBeNull();
expect(result.report).toBeNull();
expect(result.errors[0].code).toBe("INVALID_INPUT");

});

test("refuzon numrat dhe vlerat primitive si hyrje", () => {
const pipeline = createResponseQualityPipeline();

for (const input of [42, "tekst", true]) {
  const result = pipeline.evaluate(input);

  expect(result.errors).toContainEqual({
    code: "INVALID_INPUT",
    message: "Hyrja duhet të jetë objekt."
  });

  expect(result.quality).toBeNull();
  expect(result.sourceVerification).toBeNull();
  expect(result.report).toBeNull();
}

});

test("pranon objekt bosh, por raporton përgjigjen e munguar", () => {
const pipeline = createResponseQualityPipeline();

const result = pipeline.evaluate({});

expect(result.version).toBe("1.0.0");
expect(result.errors).toContainEqual({
  code: "EMPTY_ANSWER",
  message: "Përgjigjja është bosh."
});

});

test("e trajton përgjigjen me vetëm hapësira si përgjigje bosh", () => {
const pipeline = createResponseQualityPipeline();

const result = pipeline.evaluate({
  answer: "   \n\t  ",
  expectedLanguage: "sq",
  sources: []
});

expect(result.errors).toContainEqual({
  code: "EMPTY_ANSWER",
  message: "Përgjigjja është bosh."
});

});

test("pranon requestedLanguage kur expectedLanguage mungon", () => {
const pipeline = createResponseQualityPipeline();

const result = pipeline.evaluate({
  query: "Çfarë është uji?",
  answer: "Uji është një përbërje kimike.",
  requestedLanguage: "sq",
  sources: []
});

expect(result.version).toBe("1.0.0");
expect(result.quality).not.toBeNull();
expect(result.errors).not.toContainEqual(
  expect.objectContaining({
    code: "INVALID_INPUT"
  })
);

});

test("normalizon sources të pavlefshme pa e refuzuar kërkesën", () => {
const pipeline = createResponseQualityPipeline();

const result = pipeline.evaluate({
  answer: "Një përgjigje prove.",
  expectedLanguage: "sq",
  sources: "burim i pavlefshëm"
});

expect(result.version).toBe("1.0.0");
expect(result.sourceVerification).not.toBeNull();
expect(result.errors).not.toContainEqual(
  expect.objectContaining({
    code: "INVALID_INPUT"
  })
);

});

test("ekspozon një objekt pipeline të pandryshueshëm", () => {
const pipeline = createResponseQualityPipeline();

expect(Object.isFrozen(pipeline)).toBe(true);
expect(typeof pipeline.evaluate).toBe("function");

});

test("nuk ndryshon versionin ndërmjet thirrjeve", () => {
const pipeline = createResponseQualityPipeline();

const first = pipeline.evaluate({
  answer: "Përgjigjja e parë.",
  expectedLanguage: "sq",
  sources: []
});

const second = pipeline.evaluate({
  answer: "Përgjigjja e dytë.",
  expectedLanguage: "en",
  sources: []
});

expect(first.version).toBe("1.0.0");
expect(second.version).toBe("1.0.0");

});
});
