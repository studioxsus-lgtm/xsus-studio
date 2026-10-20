
/**
 * XSUS AI — Knowledge Domain Registry
 * Version: 1.0.0
 *
 * Regjistri qendror i fushave të njohurive.
 */

export const KNOWLEDGE_DOMAIN_REGISTRY_VERSION = "1.0.0";

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

const registry = new Map(
  DOMAIN_DEFINITIONS.map(domain => [
    domain.id,
    Object.freeze({
      ...domain,
      name: Object.freeze({ ...domain.name })
    })
  ])
);

export function listKnowledgeDomains() {
  return [...registry.values()];
}

export function getKnowledgeDomain(domainId) {
  if (typeof domainId !== "string") return null;

  return registry.get(domainId.trim().toLowerCase()) || null;
}

export function hasKnowledgeDomain(domainId) {
  return getKnowledgeDomain(domainId) !== null;
}

export function registerKnowledgeDomain(domain) {
  if (!domain || typeof domain !== "object" || Array.isArray(domain)) {
    throw new TypeError("Fusha e njohurive duhet të jetë objekt.");
  }

  if (typeof domain.id !== "string" || !domain.id.trim()) {
    throw new TypeError("Fusha duhet të ketë një ID.");
  }

  const id = domain.id.trim().toLowerCase();

  if (!/^[a-z][a-z0-9-]*$/u.test(id)) {
    throw new TypeError("ID e fushës nuk është e vlefshme.");
  }

  if (registry.has(id)) {
    throw new Error(`Fusha "${id}" ekziston tashmë.`);
  }

  if (
    !domain.name ||
    typeof domain.name !== "object" ||
    typeof domain.name.sq !== "string" ||
    typeof domain.name.en !== "string"
  ) {
    throw new TypeError(
      "Fusha duhet të ketë emra në shqip dhe anglisht."
    );
  }

  const normalized = Object.freeze({
    id,
    name: Object.freeze({
      sq: domain.name.sq.trim(),
      en: domain.name.en.trim()
    }),
    description: typeof domain.description === "string"
      ? domain.description.trim()
      : ""
  });

  if (!normalized.name.sq || !normalized.name.en) {
    throw new TypeError("Emrat e fushës nuk mund të jenë bosh.");
  }

  registry.set(id, normalized);

  return () => {
    // Fushat bazë nuk hiqen nga regjistri.
    if (
      registry.get(id) === normalized &&
      !DOMAIN_DEFINITIONS.some(item => item.id === id)
    ) {
      registry.delete(id);
    }
  };
}
