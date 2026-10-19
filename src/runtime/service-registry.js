
const services = new Map();

export function registerService(name, service) {
  if (typeof name !== 'string' || !name.trim()) {
    throw new TypeError(
      'Emri i shërbimit duhet të jetë tekst.'
    );
  }

  if (typeof service !== 'function') {
    throw new TypeError(
      `Shërbimi "${name}" duhet të jetë funksion.`
    );
  }

  const key = name.trim();

  if (services.has(key)) {
    throw new Error(
      `Shërbimi "${key}" është regjistruar tashmë.`
    );
  }

  services.set(key, service);

  return () => {
    if (services.get(key) === service) {
      services.delete(key);
    }
  };
}

export function getService(name) {
  return services.get(name) ?? null;
}

export function hasService(name) {
  return services.has(name);
}

export function listServices() {
  return [...services.keys()];
}

export function unregisterService(name) {
  return services.delete(name);
}

export function clearServices() {
  services.clear();
}
