
const services = new Map();

function normalizeServiceName(name) {
  if (typeof name !== "string" || !name.trim()) {
    throw new TypeError(
      "Emri i shërbimit duhet të jetë tekst jo bosh."
    );
  }

  return name.trim();
}

export function registerService(name, service) {
  const key = normalizeServiceName(name);

  if (typeof service !== "function") {
    throw new TypeError(
      `Shërbimi "${key}" duhet të jetë funksion.`
    );
  }

  if (services.has(key)) {
    throw new Error(
      `Shërbimi "${key}" është regjistruar tashmë.`
    );
  }

  services.set(key, service);

  // Lejon çregjistrimin vetëm të këtij regjistrimi.
  return () => {
    if (services.get(key) === service) {
      return services.delete(key);
    }

    return false;
  };
}

export function getService(name) {
  if (typeof name !== "string" || !name.trim()) {
    return null;
  }

  return services.get(name.trim()) ?? null;
}

export function hasService(name) {
  if (typeof name !== "string" || !name.trim()) {
    return false;
  }

  return services.has(name.trim());
}

export function listServices() {
  return [...services.keys()];
}

export function unregisterService(name) {
  if (typeof name !== "string" || !name.trim()) {
    return false;
  }

  return services.delete(name.trim());
}

export function clearServices() {
  services.clear();
}
