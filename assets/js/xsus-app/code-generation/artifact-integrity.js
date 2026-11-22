// SHA-256 checksums detect accidental or deliberate changes; they do not authenticate a publisher.
const NAMES = ['index.html','styles.css','app.js'];
export async function sha256Hex(content) {
  if (!globalThis.crypto?.subtle) throw new Error('SHA-256 requires a secure browser context.');
  const bytes = new TextEncoder().encode(content);
  const digest = await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(digest), b=>b.toString(16).padStart(2,'0')).join('');
}
export async function createIntegrityRecords(files) {
  return Promise.all(NAMES.map(async name => ({
    name,
    bytes:new TextEncoder().encode(files[name]).length,
    sha256:await sha256Hex(files[name])
  })));
}
export async function verifyBuildArtifacts(artifacts) {
  let manifest;
  try { manifest=JSON.parse(artifacts?.['xsus-build-manifest.json']); }
  catch { return {ok:false,errors:['Missing or invalid build manifest']}; }
  if (manifest?.schemaVersion!==2 || !Array.isArray(manifest.files) ||
      manifest.files.length!==NAMES.length || manifest.hashAlgorithm!=='SHA-256')
    return {ok:false,errors:['Unsupported manifest format']};
  const errors=[];
  for (const name of NAMES) {
    const record=manifest.files.find(item=>item?.name===name);
    if (!record || typeof artifacts[name]!=='string' || !/^[a-f0-9]{64}$/.test(record.sha256)) {
      errors.push(name+': missing file or checksum'); continue;
    }
    if (new TextEncoder().encode(artifacts[name]).length!==record.bytes ||
        await sha256Hex(artifacts[name])!==record.sha256) errors.push(name+': checksum mismatch');
  }
  return {ok:errors.length===0,errors};
}
