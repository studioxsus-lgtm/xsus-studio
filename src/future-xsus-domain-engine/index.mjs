import { domainToASCII } from 'node:url';
import { Resolver } from 'node:dns/promises';
import { isIP } from 'node:net';

export const VERSION = '1.0.0';
export function normalizeDomain(input) {
  if (typeof input !== 'string' || input.length > 1024) throw new TypeError('Invalid domain');
  const raw = input.trim().replace(/\.$/, '');
  if (!raw || /[\s\/:@?#%\\]/u.test(raw)) throw new TypeError('Invalid domain');
  const name = domainToASCII(raw).toLowerCase();
  const labels = name.split('.');
  if (!name || name.length > 253 || labels.length < 2 || isIP(name) ||
      !labels.every(x => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x)) ||
      !/[a-z]/.test(labels.at(-1))) throw new TypeError('Invalid domain');
  return name;
}
const TYPES = Object.freeze(['A','AAAA','MX','NS','TXT','CAA','CNAME','SOA']);
export async function inspectDNS(input, { resolver = new Resolver({timeout: 2000, tries: 2}), types = TYPES } = {}) {
  const domain = normalizeDomain(input);
  if (!Array.isArray(types) || !types.length || types.length > TYPES.length || types.some(t => !TYPES.includes(t))) throw new TypeError('Unsupported record type');
  const records = Object.fromEntries(await Promise.all([...new Set(types)].map(async type => {
    try { return [type, {status:'resolved', values:await resolver.resolve(domain, type)}]; }
    catch (error) { return [type, {status: error.code === 'ENODATA' ? 'no_data' : error.code === 'ENOTFOUND' ? 'not_found' : 'unknown', code: String(error.code || 'ERROR')}]; }
  })));
  return {version:VERSION, domain, records, checkedAt:new Date().toISOString(), registrationAvailability:'unknown'};
}
