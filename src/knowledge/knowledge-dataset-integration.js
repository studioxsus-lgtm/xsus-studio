/**

* XSUS AI — Knowledge Dataset Integration
* Version: 1.2.1
* 
* Përgjegjësitë:
* - Integrimi i dataset-eve me Knowledge Service.
* - Mbështetja e registry-t dhe pipeline-it.
* - Normalizimi i rezultateve.
* - Ruajtja e identitetit të burimit.
* - Çregjistrimi i sigurt i integrimit.
    */

import {
registerKnowledgeSource,
hasKnowledgeSource
} from "./knowledge-service.js";

const SOURCE_NAME = "xsus-knowledge-datasets";
const ENGINE_NAME = "xsus-knowledge-dataset-integration";
const ENGINE_VERSION = "1.2.1";

function isPlainObject(value) {
if (
value === null ||
typeof value !== "object" ||
Array.isArray(value)
) {
return false;
}

const prototype = Object.getPrototypeOf(value);

return (
prototype === Object.prototype ||
prototype === null
);
}

function normalizeSourceName(value) {
if (typeof value !== "string" || !value.trim()) {
return SOURCE_NAME;
}

return value.trim();
}

function normalizeEntries(response, sourceName) {
const entries = Array.isArray(response)
? response
: Array.isArray(response?.results)
? response.results
: [];

return entries
.filter(
entry =>
isPlainObject(entry) &&
typeof entry.content === "string" &&
entry.content.trim().length > 0
)
.map(entry => ({
...entry,
source: sourceName
}));
}

function createSearchFunction(registry) {
// Pipeline-i tashmë ofron kërkim të gatshëm.
if (typeof registry.search === "function") {
return (query, options) =>
registry.search(query, options);
}

// Registry i drejtpërdrejtë nuk ofron search().
// Prandaj kërkojmë dataset-et përmes API-së së tij publike.
if (
typeof registry.listDatasets === "function" &&
typeof registry.getDataset === "function"
) {
return (query, options = {}) => {
const normalizedQuery =
typeof query === "string"
? query.trim().toLowerCase()
: "";

  const language =
    typeof options.language === "string"
      ? options.language.split(/[-_]/u)[0].toLowerCase()
      : "";

  const domain =
    typeof options.domain === "string"
      ? options.domain.trim().toLowerCase()
      : "";

  const summaries = registry.listDatasets();

  if (!Array.isArray(summaries)) {
    return {
      success: false,
      results: [],
      error: "Registry nuk ktheu listë të vlefshme dataset-esh."
    };
  }

  const results = [];

  for (const summary of summaries) {
    if (!summary || typeof summary.id !== "string") {
      continue;
    }

    const dataset = registry.getDataset(summary.id);

    if (!dataset) {
      continue;
    }

    const entries = Array.isArray(dataset.collection)
      ? dataset.collection
      : Array.isArray(dataset.entries)
        ? dataset.entries
        : [];

    for (const entry of entries) {
      if (
        !isPlainObject(entry) ||
        typeof entry.content !== "string" ||
        !entry.content.trim()
      ) {
        continue;
      }

      if (
        language &&
        typeof entry.language === "string" &&
        entry.language.split(/[-_]/u)[0].toLowerCase() !== language
      ) {
        continue;
      }

      if (
        domain &&
        typeof entry.domain === "string" &&
        entry.domain.trim().toLowerCase() !== domain
      ) {
        continue;
      }

      const searchable = [
        entry.id,
        entry.title,
        entry.content,
        ...(Array.isArray(entry.keywords) ? entry.keywords : []),
        ...(Array.isArray(entry.tags) ? entry.tags : [])
      ]
        .filter(value => typeof value === "string")
        .join(" ")
        .toLowerCase();

      if (
        normalizedQuery &&
        !searchable.includes(normalizedQuery) &&
        !normalizedQuery
          .split(/\s+/u)
          .filter(Boolean)
          .some(token => searchable.includes(token))
      ) {
        continue;
      }

      results.push({
        ...entry,
        datasetId: summary.id
      });
    }
  }

  const limit = Number.isFinite(Number(options.limit))
    ? Math.max(1, Math.min(Math.floor(Number(options.limit)), 50))
    : 10;

  return {
    success: true,
    results: results.slice(0, limit),
    metadata: {
      engine: ENGINE_NAME,
      version: ENGINE_VERSION,
      datasetCount: summaries.length,
      resultCount: Math.min(results.length, limit)
    }
  };
};

}

throw new TypeError(
"Registry duhet të ofrojë search(query, options), ose listDatasets() dhe getDataset()."
);
}

/**

* Regjistron integrimin me Knowledge Service.
  */
  export function registerKnowledgeDatasetIntegration({
  registry,
  sourceName = SOURCE_NAME
  } = {}) {
  if (!registry || typeof registry !== "object") {
  throw new TypeError(
  "Duhet të jepet një registry ose pipeline i vlefshëm."
  );
  }

const resolvedSourceName = normalizeSourceName(sourceName);
const search = createSearchFunction(registry);

if (hasKnowledgeSource(resolvedSourceName)) {
return {
success: false,
source: resolvedSourceName,
engine: ENGINE_NAME,
version: ENGINE_VERSION,
error: "Burimi "${resolvedSourceName}" është regjistruar tashmë.",
close() {
return false;
},
unregister() {
return false;
}
};
}

const provider = async (query, options = {}) => {
try {
const safeOptions = isPlainObject(options)
? options
: {};

  const response = await search(query, {
    language: safeOptions.language,
    domain: safeOptions.domain,
    limit: safeOptions.limit
  });

  if (response?.success === false) {
    return {
      success: false,
      results: [],
      error:
        typeof response.error === "string"
          ? response.error
          : "Kërkimi në knowledge datasets dështoi."
    };
  }

  return {
    success: true,
    results: normalizeEntries(
      response,
      resolvedSourceName
    ),
    metadata: {
      ...(isPlainObject(response?.metadata)
        ? response.metadata
        : {}),
      engine: ENGINE_NAME,
      version: ENGINE_VERSION,
      source: resolvedSourceName
    }
  };
} catch (error) {
  return {
    success: false,
    results: [],
    error:
      error instanceof Error
        ? error.message
        : "Ndodhi një gabim gjatë kërkimit në datasets."
  };
}

};

const unregisterSource = registerKnowledgeSource(
resolvedSourceName,
provider
);

let closed = false;

function close() {
if (closed) {
return false;
}

closed = true;
unregisterSource();
return true;

}

return {
success: true,
source: resolvedSourceName,
engine: ENGINE_NAME,
version: ENGINE_VERSION,
close,
unregister: close
};
}

export {
SOURCE_NAME as KNOWLEDGE_DATASET_SOURCE_NAME
};

export default registerKnowledgeDatasetIntegration;
