import { describe, expect, test } from "vitest";

import {
RESPONSE_SOURCE_VERIFIER_VERSION,
SOURCE_VERIFICATION_VERSION,
SOURCE_VERIFICATION_STATUSES,
SOURCE_VERIFICATION_ERRORS,
verifyResponseSource,
verifyResponseSources
} from "../../src/core/response-source-verifier.js";

describe("XSUS Response Source Verification Engine", () => {
test("ka versionin e pritshëm dhe alias-in e përputhshëm", () => {
expect(RESPONSE_SOURCE_VERIFIER_VERSION).toBe("1.0.0");
expect(SOURCE_VERIFICATION_VERSION).toBe("1.0.0");
expect(SOURCE_VERIFICATION_VERSION).toBe(
RESPONSE_SOURCE_VERIFIER_VERSION
);
});

test("ekspozon statuse dhe kode gabimesh të pandryshueshme", () => {
expect(SOURCE_VERIFICATION_STATUSES).toEqual({
INVALID: "invalid",
UNVERIFIED: "unverified",
STRUCTURALLY_VALID: "structurally_valid"
});

expect(SOURCE_VERIFICATION_ERRORS).toMatchObject({
  INVALID_SOURCE: "INVALID_SOURCE",
  EMPTY_SOURCE: "EMPTY_SOURCE",
  INVALID_URL: "INVALID_URL",
  UNSUPPORTED_URL_PROTOCOL: "UNSUPPORTED_URL_PROTOCOL",
  MISSING_TITLE: "MISSING_TITLE",
  MISSING_CONTENT: "MISSING_CONTENT",
  MISSING_URL: "MISSING_URL"
});

expect(Object.isFrozen(SOURCE_VERIFICATION_STATUSES)).toBe(true);
expect(Object.isFrozen(SOURCE_VERIFICATION_ERRORS)).toBe(true);

});

test("pranon një burim me strukturë dhe URL të vlefshme", () => {
const result = verifyResponseSource({
title: "AI Introduction",
content: "Artificial intelligence research.",
url: "https://example.com/ai"
});

expect(result.version).toBe("1.0.0");
expect(result.valid).toBe(true);
expect(result.structurallyValid).toBe(true);
expect(result.status).toBe(
  SOURCE_VERIFICATION_STATUSES.STRUCTURALLY_VALID
);
expect(result.title).toBe("AI Introduction");
expect(result.contentLength).toBe(
  "Artificial intelligence research.".length
);
expect(result.url.valid).toBe(true);
expect(result.url.protocol).toBe("https:");
expect(result.url.hostname).toBe("example.com");
expect(result.errors).toEqual([]);
expect(result.verified).toBe(false);
expect(result.trustEstablished).toBe(false);

});

test("pranon URL me protokollin HTTP", () => {
const result = verifyResponseSource({
title: "Documentation",
content: "Technical documentation content.",
url: "http://example.com/docs"
});

expect(result.valid).toBe(true);
expect(result.url.valid).toBe(true);
expect(result.url.protocol).toBe("http:");
expect(result.url.hostname).toBe("example.com");

});

test("normalizon hapësirat në titull, përmbajtje dhe URL", () => {
const result = verifyResponseSource({
title: "  AI Introduction  ",
content: "  Artificial intelligence research.  ",
url: "  https://example.com/ai  "
});

expect(result.title).toBe("AI Introduction");
expect(result.contentLength).toBe(
  "Artificial intelligence research.".length
);
expect(result.url.valid).toBe(true);
expect(result.url.hostname).toBe("example.com");
expect(result.errors).toEqual([]);

});

test("nuk e ngatërron validimin strukturor me besueshmërinë", () => {
const result = verifyResponseSource({
title: "Example source",
content: "Example content.",
url: "https://example.com"
});

expect(result.valid).toBe(true);
expect(result.structurallyValid).toBe(true);
expect(result.verified).toBe(false);
expect(result.trustEstablished).toBe(false);

});

test("refuzon burimin bosh", () => {
const result = verifyResponseSource("");

expect(result.valid).toBe(false);
expect(result.structurallyValid).toBe(false);
expect(result.status).toBe(
  SOURCE_VERIFICATION_STATUSES.INVALID
);
expect(result.errors).toContain(
  SOURCE_VERIFICATION_ERRORS.EMPTY_SOURCE
);

});

test("refuzon vargun që përmban vetëm hapësira", () => {
const result = verifyResponseSource("   \n\t ");

expect(result.valid).toBe(false);
expect(result.status).toBe(
  SOURCE_VERIFICATION_STATUSES.INVALID
);
expect(result.errors).toContain(
  SOURCE_VERIFICATION_ERRORS.EMPTY_SOURCE
);

});

test("identifikon titullin që mungon", () => {
const result = verifyResponseSource({
content: "Source content.",
url: "https://example.com"
});

expect(result.valid).toBe(false);
expect(result.structurallyValid).toBe(false);
expect(result.errors).toContain(
  SOURCE_VERIFICATION_ERRORS.MISSING_TITLE
);

});

test("identifikon përmbajtjen që mungon", () => {
const result = verifyResponseSource({
title: "Example source",
content: "   ",
url: "https://example.com"
});

expect(result.valid).toBe(false);
expect(result.structurallyValid).toBe(false);
expect(result.errors).toContain(
  SOURCE_VERIFICATION_ERRORS.MISSING_CONTENT
);

});

test("raporton metadata dhe URL që mungojnë", () => {
const result = verifyResponseSource({});

expect(result.valid).toBe(false);
expect(result.status).toBe(
  SOURCE_VERIFICATION_STATUSES.INVALID
);
expect(result.errors).toContain(
  SOURCE_VERIFICATION_ERRORS.MISSING_TITLE
);
expect(result.errors).toContain(
  SOURCE_VERIFICATION_ERRORS.MISSING_CONTENT
);
expect(result.errors).toContain(
  SOURCE_VERIFICATION_ERRORS.MISSING_URL
);

});

test("identifikon URL të pavlefshme", () => {
const result = verifyResponseSource({
title: "Example source",
content: "Source content.",
url: "not-a-valid-url"
});

expect(result.valid).toBe(false);
expect(result.structurallyValid).toBe(true);
expect(result.status).toBe(
  SOURCE_VERIFICATION_STATUSES.UNVERIFIED
);
expect(result.url.valid).toBe(false);
expect(result.url.error).toBe(
  SOURCE_VERIFICATION_ERRORS.INVALID_URL
);
expect(result.errors).toContain(
  SOURCE_VERIFICATION_ERRORS.INVALID_URL
);

});

test("refuzon protokollet e pambështetura", () => {
const result = verifyResponseSource({
title: "Example source",
content: "Source content.",
url: "ftp://example.com/file"
});

expect(result.valid).toBe(false);
expect(result.url.protocol).toBe("ftp:");
expect(result.errors).toContain(
  SOURCE_VERIFICATION_ERRORS.UNSUPPORTED_URL_PROTOCOL
);

});

test("identifikon URL me kredenciale të integruara", () => {
const result = verifyResponseSource({
title: "Example source",
content: "Source content.",
url: "https://user:password@example.com/private"
});

expect(result.valid).toBe(false);
expect(result.url.valid).toBe(false);
expect(result.errors).toContain(
  SOURCE_VERIFICATION_ERRORS.INVALID_URL
);

});

test("refuzon URL që mungon ose është bosh", () => {
for (const url of [undefined, null, "", "   "]) {
const result = verifyResponseSource({
title: "Example source",
content: "Source content.",
url
});

  expect(result.valid).toBe(false);
  expect(result.url.present).toBe(false);
  expect(result.url.error).toBe(
    SOURCE_VERIFICATION_ERRORS.MISSING_URL
  );
  expect(result.errors).toContain(
    SOURCE_VERIFICATION_ERRORS.MISSING_URL
  );
}

});

test("nuk i konsideron vargjet tekstuale si burime të verifikuara", () => {
const result = verifyResponseSource(
"Artificial intelligence research."
);

expect(result.valid).toBe(false);
expect(result.structurallyValid).toBe(true);
expect(result.status).toBe(
  SOURCE_VERIFICATION_STATUSES.UNVERIFIED
);
expect(result.verified).toBe(false);
expect(result.trustEstablished).toBe(false);
expect(result.errors).toContain(
  SOURCE_VERIFICATION_ERRORS.MISSING_URL
);

});

test("refuzon vargjet tekstuale që tejkalojnë kufirin maksimal", () => {
const result = verifyResponseSource("x".repeat(50001));

expect(result.valid).toBe(false);
expect(result.structurallyValid).toBe(false);
expect(result.status).toBe(
  SOURCE_VERIFICATION_STATUSES.UNVERIFIED
);
expect(result.contentLength).toBe(50001);
expect(result.errors).toContain(
  SOURCE_VERIFICATION_ERRORS.INVALID_SOURCE
);
expect(result.errors).toContain(
  SOURCE_VERIFICATION_ERRORS.MISSING_URL
);

});

test.each([
null,
undefined,
42,
true,
[],
["source"]
])("refuzon burimin që nuk është objekt i thjeshtë: %j", (source) => {
const result = verifyResponseSource(source);

expect(result.valid).toBe(false);
expect(result.structurallyValid).toBe(false);
expect(result.status).toBe(
  SOURCE_VERIFICATION_STATUSES.INVALID
);
expect(result.errors).toContain(
  SOURCE_VERIFICATION_ERRORS.INVALID_SOURCE
);

});

test("refuzon objektin që nuk ka prototip të thjeshtë", () => {
const source = new Date();

const result = verifyResponseSource(source);

expect(result.valid).toBe(false);
expect(result.status).toBe(
  SOURCE_VERIFICATION_STATUSES.INVALID
);
expect(result.errors).toContain(
  SOURCE_VERIFICATION_ERRORS.INVALID_SOURCE
);

});

test("refuzon përmbajtjen që tejkalon kufirin maksimal", () => {
const result = verifyResponseSource({
title: "Long source",
content: "x".repeat(50001),
url: "https://example.com"
});

expect(result.valid).toBe(false);
expect(result.structurallyValid).toBe(false);
expect(result.status).toBe(
  SOURCE_VERIFICATION_STATUSES.INVALID
);
expect(result.contentLength).toBe(50001);
expect(result.errors).toContain(
  SOURCE_VERIFICATION_ERRORS.INVALID_SOURCE
);

});

test("pranon përmbajtjen në kufirin maksimal", () => {
const result = verifyResponseSource({
title: "Boundary source",
content: "x".repeat(50000),
url: "https://example.com"
});

expect(result.valid).toBe(true);
expect(result.structurallyValid).toBe(true);
expect(result.contentLength).toBe(50000);
expect(result.errors).toEqual([]);

});

test("kthen rezultat të pandryshueshëm", () => {
const result = verifyResponseSource({
title: "AI Introduction",
content: "Artificial intelligence research.",
url: "https://example.com/ai"
});

expect(Object.isFrozen(result)).toBe(true);
expect(Object.isFrozen(result.url)).toBe(true);
expect(Object.isFrozen(result.errors)).toBe(true);

});

test("kontrollon disa burime dhe përmbledh rezultatet", () => {
const result = verifyResponseSources([
{
title: "Valid source",
content: "Source content.",
url: "https://example.com/valid"
},
{
title: "Missing URL",
content: "Another source."
},
null
]);

expect(result.version).toBe("1.0.0");
expect(result.total).toBe(3);
expect(result.validCount).toBe(1);
expect(result.structurallyValidCount).toBe(2);
expect(result.invalidCount).toBe(1);
expect(result.unverifiedCount).toBe(1);
expect(result.verifiedCount).toBe(0);
expect(result.trustEstablishedCount).toBe(0);
expect(result.results).toHaveLength(3);
expect(Object.isFrozen(result)).toBe(true);
expect(Object.isFrozen(result.results)).toBe(true);

});

test("verifikon saktë koleksionin bosh", () => {
const result = verifyResponseSources([]);

expect(result.total).toBe(0);
expect(result.validCount).toBe(0);
expect(result.structurallyValidCount).toBe(0);
expect(result.invalidCount).toBe(0);
expect(result.unverifiedCount).toBe(0);
expect(result.verifiedCount).toBe(0);
expect(result.trustEstablishedCount).toBe(0);
expect(result.results).toEqual([]);

});

test("hedh TypeError kur koleksioni nuk është varg", () => {
expect(() => verifyResponseSources(null)).toThrow(TypeError);
expect(() => verifyResponseSources({})).toThrow(TypeError);
expect(() => verifyResponseSources("source")).toThrow(TypeError);
});

test("ruan statusin individual për çdo burim në koleksion", () => {
const result = verifyResponseSources([
{
title: "Valid source",
content: "Source content.",
url: "https://example.com"
},
{
title: "Missing URL",
content: "Source content."
},
{}
]);

expect(result.results[0].status).toBe(
  SOURCE_VERIFICATION_STATUSES.STRUCTURALLY_VALID
);
expect(result.results[1].status).toBe(
  SOURCE_VERIFICATION_STATUSES.UNVERIFIED
);
expect(result.results[2].status).toBe(
  SOURCE_VERIFICATION_STATUSES.INVALID
);

});

test("kthen rezultate të pandryshueshme për koleksionin", () => {
const result = verifyResponseSources([
{
title: "Example source",
content: "Example content.",
url: "https://example.com"
}
]);

expect(Object.isFrozen(result)).toBe(true);
expect(Object.isFrozen(result.results)).toBe(true);
expect(Object.isFrozen(result.results[0])).toBe(true);
expect(Object.isFrozen(result.results[0].url)).toBe(true);
expect(Object.isFrozen(result.results[0].errors)).toBe(true);

});
});
