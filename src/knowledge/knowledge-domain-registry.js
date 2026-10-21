/**
 * XSUS AI — Knowledge Domain Registry
 * Version: 1.1.0
 *
 * Regjistri qendror i fushave të njohurive.
 */

export const KNOWLEDGE_DOMAIN_REGISTRY_VERSION = "1.1.0";

const DOMAIN_DEFINITIONS = [
  {
    id: "general",
    name: { sq: "Njohuri të përgjithshme", en: "General knowledge" },
    description: "Njohuri të përgjithshme dhe pyetje të përditshme."
  },
  {
    id: "programming",
    name: { sq: "Programim", en: "Programming" },
    description: "Gjuhë programimi, algoritme, arkitekturë dhe zhvillim software."
  },
  {
    id: "mathematics",
    name: { sq: "Matematikë", en: "Mathematics" },
    description: "Numra, algjebër, gjeometri, statistikë dhe logjikë matematikore."
  },
  {
    id: "science",
    name: { sq: "Shkencë", en: "Science" },
    description: "Fizikë, kimi, biologji dhe metoda shkencore."
  },
  {
    id: "technology",
    name: { sq: "Teknologji", en: "Technology" },
    description: "Infrastrukturë, sisteme kompjuterike dhe teknologji digjitale."
  },
  {
    id: "history",
    name: { sq: "Histori", en: "History" },
    description: "Ngjarje historike, periudha, dokumente dhe figura historike."
  },
  {
    id: "geography",
    name: { sq: "Gjeografi", en: "Geography" },
    description: "Vende, rajone, mjedis dhe gjeografi fizike e njerëzore."
  },
  {
    id: "economics",
    name: { sq: "Ekonomi", en: "Economics" },
    description: "Ekonomi, tregje, financa dhe koncepte ekonomike."
  },
  {
    id: "law",
    name: { sq: "Juridik", en: "Law" },
    description: "Koncepte ligjore dhe informacion juridik sipas juridiksionit."
  },
  {
    id: "health",
    name: { sq: "Shëndetësi", en: "Health" },
    description: "Informacion shëndetësor dhe shkenca mjekësore."
  },
  {
    id: "education",
    name: { sq: "Arsim", en: "Education" },
    description: "Mësimdhënie, të nxënë dhe materiale edukative."
  },
  {
    id: "culture",
    name: { sq: "Kulturë", en: "Culture" },
    description: "Letërsi, art, tradita dhe kulturë."
  },
  {
    id: "language",
    name: { sq: "Gjuhësi", en: "Language" },
    description: "Gjuhë, gramatikë, përkthim dhe analizë gjuhësore."
  }
];

const BASE_DOMAIN_IDS = new Set(
  DOMAIN_DEFINITIONS.map(domain => domain.id)
);

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
    !domain ||
    typeof domain !== "object" ||
    Array.isArray(domain)
  ) {
    throw new TypeError(
      "Fusha e njohurive duhet të jetë objekt."
    );
  }

  const id = normalizeDomainId(domain.id);

  if (!id) {
    throw new TypeError("Fusha duhet të ketë një ID.");
  }

  if (!/^[a-z][a-z0-9-]*$/u.test(id)) {
    throw new TypeError("ID e fushës nuk është e vlefshme.");
  }

  if (
    !domain.name ||
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
    description: typeof domain.description === "string"
      ? domain.description.trim()
      : ""
  };
}

const registry = new Map(
  DOMAIN_DEFINITIONS.map(domain => [
    domain.id,
    createDomainSnapshot(domain)
  ])
);

/**
 * Kthen një listë të fushave pa ekspozuar objektet
 * e brendshme të regjistrit.
 */
export function listKnowledgeDomains() {
  return [...registry.values()].map(domain =>
    createDomainSnapshot(domain)
  );
}

/**
 * Kthen një kopje të fushës ose null.
 */
export function getKnowledgeDomain(domainId) {
  const id = normalizeDomainId(domainId);

  if (!id) return null;

  const domain = registry.get(id);

  return domain ? createDomainSnapshot(domain) : null;
}

/**
 * Kontrollon nëse një fushë ekziston.
 */
export function hasKnowledgeDomain(domainId) {
  const id = normalizeDomainId(domainId);

  return id !== "" && registry.has(id);
}

/**
 * Regjistron një fushë të re.
 *
 * Kthen një funksion për çregjistrimin e fushës.
 * Fushat bazë nuk mund të hiqen.
 */
export function registerKnowledgeDomain(domain) {
  const normalized = validateDomain(domain);
  const { id } = normalized;

  if (registry.has(id)) {
    throw new Error(`Fusha "${id}" ekziston tashmë.`);
  }

  const snapshot = createDomainSnapshot(normalized);

  registry.set(id, snapshot);

  let unregistered = false;

  return () => {
    if (unregistered) return false;

    unregistered = true;

    if (BASE_DOMAIN_IDS.has(id)) {
      return false;
    }

    if (registry.get(id) !== snapshot) {
      return false;
    }

    return registry.delete(id);
  };
}
