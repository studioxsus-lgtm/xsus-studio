/**
 * XSUS AI — Knowledge Domain Registry
 * Version: 1.1.1
 *
 * Regjistri qendror i fushave të njohurive.
 * Mbështet kërkimin, validimin dhe regjistrimin dinamik
 * të fushave të reja.
 */

export const KNOWLEDGE_DOMAIN_REGISTRY_VERSION = "1.1.1";

const DOMAIN_DEFINITIONS = [
  {
    id: "general",
    name: { sq: "Njohuri të përgjithshme", en: "General knowledge" },
    description: "Njohuri të përgjithshme dhe pyetje të përditshme."
  },
  {
    id: "programming",
    name: { sq: "Programim", en: "Programming" },
    description: "Gjuhë programimi, algoritme dhe arkitekturë software."
  },
  {
    id: "mathematics",
    name: { sq: "Matematikë", en: "Mathematics" },
    description: "Algjebër, gjeometri, statistikë dhe logjikë."
  },
  {
    id: "science",
    name: { sq: "Shkencë", en: "Science" },
    description: "Fizikë, kimi, biologji dhe metoda shkencore."
  },
  {
    id: "technology",
    name: { sq: "Teknologji", en: "Technology" },
    description: "Sisteme kompjuterike dhe teknologji digjitale."
  },
  {
    id: "history",
    name: { sq: "Histori", en: "History" },
    description: "Ngjarje, periudha dhe figura historike."
  },
  {
    id: "geography",
    name: { sq: "Gjeografi", en: "Geography" },
    description: "Vende, rajone dhe mjedis."
  },
  {
    id: "economics",
    name: { sq: "Ekonomi", en: "Economics" },
    description: "Ekonomi, tregje dhe koncepte financiare."
  },
  {
    id: "law",
    name: { sq: "Juridik", en: "Law" },
    description: "Informacion juridik sipas juridiksionit."
  },
  {
    id: "health",
    name: { sq: "Shëndetësi", en: "Health" },
    description: "Informacion shëndetësor dhe shkenca mjekësore."
  },
  {
    id: "education",
    name: { sq: "Arsim", en: "Education" },
    description: "Mësimdhënie dhe materiale edukative."
  },
  {
    id: "culture",
    name: { sq: "Kulturë", en: "Culture" },
    description: "Letërsi, art, tradita dhe kulturë."
  },
  {
    id: "language",
    name: { sq: "Gjuhësi", en: "Language" },
    description: "Gjuhë, gramatikë dhe përkthim."
  }
];

const BASE_DOMAIN_IDS = new Set(
  DOMAIN_DEFINITIONS.map((domain) => domain.id)
);

const registry = new Map();

function normalizeDomainId(value) {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

function createDomainSnapshot(domain) {
  return Object.freeze({
    id: domain.id,
    name: Object.freeze({
      sq: domain.name.sq,
      en: domain.name.en
    }),
    description: domain.description
  });
}

function validateDomain(domain) {
  if (
    domain === null ||
    typeof domain !== "object" ||
    Array.isArray(domain)
  ) {
    throw new TypeError(
      "Fusha e njohurive duhet të jetë objekt."
    );
  }

  const id = normalizeDomainId(domain.id);

  if (!/^[a-z][a-z0-9-]*$/u.test(id)) {
    throw new TypeError(
      "ID e fushës nuk është e vlefshme."
    );
  }

  if (
    domain.name === null ||
    typeof domain.name !== "object" ||
    Array.isArray(domain.name) ||
    typeof domain.name.sq !== "string" ||
    typeof domain.name.en !== "string"
  ) {
    throw new TypeError(
      "Fusha duhet të ketë emra në shqip dhe anglisht."
    );
  }

  const sq = domain.name.sq.trim();
  const en = domain.name.en.trim();

  if (!sq || !en) {
    throw new TypeError(
      "Emrat e fushës nuk mund të jenë bosh."
    );
  }

  if (
    domain.description !== undefined &&
    typeof domain.description !== "string"
  ) {
    throw new TypeError(
      "Përshkrimi i fushës duhet të jetë tekst."
    );
  }

  return {
    id,
    name: { sq, en },
    description:
      typeof domain.description === "string"
        ? domain.description.trim()
        : ""
  };
}

// Regjistrimi fillestar i fushave bazë.
for (const definition of DOMAIN_DEFINITIONS) {
  registry.set(
    definition.id,
    createDomainSnapshot(definition)
  );
}

/**
 * Kthen të gjitha fushat si kopje të sigurta.
 */
export function listKnowledgeDomains() {
  return [...registry.values()].map(createDomainSnapshot);
}

/**
 * Kthen një fushë sipas ID-së ose null.
 */
export function getKnowledgeDomain(domainId) {
  const id = normalizeDomainId(domainId);

  if (!id) {
    return null;
  }

  const domain = registry.get(id);

  return domain ? createDomainSnapshot(domain) : null;
}

/**
 * Kontrollon nëse një fushë është e regjistruar.
 */
export function hasKnowledgeDomain(domainId) {
  const id = normalizeDomainId(domainId);

  return id !== "" && registry.has(id);
}

/**
 * Regjistron një fushë të re.
 * Kthen një funksion për çregjistrimin e saj.
 */
export function registerKnowledgeDomain(domain) {
  const normalized = validateDomain(domain);
  const { id } = normalized;

  if (registry.has(id)) {
    throw new Error(
      `Fusha "${id}" ekziston tashmë.`
    );
  }

  const snapshot = createDomainSnapshot(normalized);

  registry.set(id, snapshot);

  let unregistered = false;

  return function unregisterKnowledgeDomain() {
    if (unregistered) {
      return false;
    }

    unregistered = true;

    // Fushat bazë nuk mund të hiqen.
    if (BASE_DOMAIN_IDS.has(id)) {
      return false;
    }

    // Mos hiq një hyrje që është zëvendësuar.
    if (registry.get(id) !== snapshot) {
      return false;
    }

    return registry.delete(id);
  };
}
