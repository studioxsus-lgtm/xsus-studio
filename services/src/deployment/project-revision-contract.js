// XSUS App optimistic revision comparison. Only trusted server reads may
// provide these values; request-body revisions are not authoritative.
const TOKEN=/^[a-zA-Z0-9_-]{16,128}$/;
export function inspectStableProjectRevision(before,after) {
 const valid=typeof before==='string' && typeof after==='string' &&
  TOKEN.test(before) && TOKEN.test(after);
 return Object.freeze({stable:valid && before===after,
  reason:!valid?'UNVERIFIED_PROJECT_REVISION':
   before===after?'REVISION_UNCHANGED':'PROJECT_REVISION_CHANGED',
  deployable:false});
}
