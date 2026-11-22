// UUID contract for persisted XSUS App projects (public.xsus_builder_projects.id).
// Legacy deployment draft IDs are NOT silently converted into database IDs.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isPersistedBuilderProjectId(value) {
 return typeof value==='string' && UUID.test(value);
}
export function requirePersistedBuilderProjectId(value) {
 if(!isPersistedBuilderProjectId(value)) throw new TypeError('A saved XSUS App project UUID is required');
 return value;
}
