export const ENGINE_VERSION = '1.0.0';
export const CONTRACT_VERSION = '1.0.0';
export function createProject({name, pages = ['index.html']} = {}) {
  if (typeof name !== 'string' || !name.trim() || name.length > 120) throw new TypeError('Invalid project name');
  if (!Array.isArray(pages) || !pages.length || pages.length > 100) throw new TypeError('Invalid pages');
  const seen = new Set();
  for (const page of pages) {
    if (typeof page !== 'string' || page.length > 200 || !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.html$/.test(page) || seen.has(page.toLowerCase())) throw new TypeError('Invalid or duplicate page');
    seen.add(page.toLowerCase());
  }
  return {contractVersion: CONTRACT_VERSION, name:name.trim(), pages:pages.map(path=>({path})), status:'draft', executable:false};
}
