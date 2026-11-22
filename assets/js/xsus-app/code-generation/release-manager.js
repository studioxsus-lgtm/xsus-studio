// Release records are local project metadata, not proof of external deployment.
export const RELEASE_LIMIT = 20;
export function appendBuildRelease(history, manifest, date = new Date().toISOString()) {
  if (manifest?.schemaVersion !== 2 || !Array.isArray(manifest.files) ||
      manifest.files.length !== 3 || !manifest.files.every(file =>
        typeof file.name === 'string' && /^[a-f0-9]{64}$/.test(file.sha256))) {
    throw new TypeError('Verified build manifest required.');
  }
  const previous = Array.isArray(history) ? history.filter(entry => entry && typeof entry === 'object').slice(-RELEASE_LIMIT) : [];
  const nextNumber = Math.max(0,...previous.map(item => Number.isSafeInteger(item.number) ? item.number : 0)) + 1;
  const release = {
    id:crypto.randomUUID(),number:nextNumber,createdAt:date,
    status:'prepared-not-deployed',
    files:manifest.files.map(({name,bytes,sha256})=>({name,bytes,sha256}))
  };
  return [...previous,release].slice(-RELEASE_LIMIT);
}
