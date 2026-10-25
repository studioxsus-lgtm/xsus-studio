import { describe, expect, test } from "vitest";

import {
RESPONSE_SOURCE_VERIFIER_VERSION,
SOURCE_VERIFICATION_STATUSES,
SOURCE_VERIFICATION_ERRORS,
verifyResponseSource,
verifyResponseSources
} from "../../src/core/response-source-verifier.js";

describe("XSUS Response Source Verification Engine", () => {
test("ka versionin e pritshëm", () => {
expect(RESPONSE_SOURCE_VERIFIER_VERSION).toBe("1.0.0");
});

test("pranon një burim me strukturë dhe URL të vlefshme", () => {
const result = verifyResponseSource({
title: "AI Introduction",
content: "Artificial intelligence research.",
url: "https://example.com/ai"
});

expect(result.valid).toBe(true);
expect(result.structurallyValid).toBe(true);
expect(result.status).toBe(
  SOURCE_VERIFICATION_STATUSES.STRUCTURALLY_VALID
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
expect(result.url.protocol).toBe("http:");

});

test("refuzon burimin bosh", () => {
const result = verifyResponseSource("");

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
expect(result.errors).toContain(
  SOURCE_VERIFICATION_ERRORS.MISSING_CONTENT
);

});

test("identifikon URL të pavlefshme", () => {
const result = verifyResponseSource({
title: "Example source",
content: "Source content.",
url: "not-a-valid-url"
});

expect(result.valid).toBe(false);
expect(result.url.valid).toBe(false);
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
expect(result.errors).toContain(
  SOURCE_VERIFICATION_ERRORS.INVALID_URL
);

});

test("nuk i konsideron vargjet tekstuale si burime të verifikuara", () => {
const result = verifyResponseSource(
"Artificial intelligence research."
);

expect(result.valid).false;
expect(result.verified).toBe(false);
expect(result.trustEstablished).toBe(false);
expect(result.errors).toContain(
  SOURCE_VERIFICATION_ERRORS.MISSING_URL
);

});

test("refuzon burimet që nuk janë varg ose objekt i thjeshtë", () => {
const result = verifyResponseSource(42);

expect(result.valid).toBe(false);
expect(result.status).toBe(
  SOURCE_VERIFICATION_STATUSES.INVALID
);
expect(result.errors).toContain(
  SOURCE_VERIFICATION_ERRORS.INVALID_SOURCE
);

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

test("refuzon koleksionin që nuk është varg", () => {
expect(() => verifyResponseSources(null)).toThrow(
TypeError
);

expect(() => verifyResponseSources({})).toThrow(
  TypeError
);

});
});
