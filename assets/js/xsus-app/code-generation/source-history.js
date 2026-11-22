// Bounded, user-controlled source revision history stored with each XSUS project.
export const SOURCE_HISTORY_LIMIT = 10;
const FILES = ['index.html', 'styles.css', 'app.js'];
export function validSourceFiles(files) {
  return !!files && FILES.every(name => typeof files[name] === 'string' && files[name].length <= 500000);
}
export function appendSourceRevision(history, files, date = new Date().toISOString()) {
  if (!validSourceFiles(files)) throw new TypeError('Invalid source files');
  const previous = Array.isArray(history) ? history.filter(entry => validSourceFiles(entry?.files)).slice(-SOURCE_HISTORY_LIMIT) : [];
  const snapshot = Object.fromEntries(FILES.map(name => [name, files[name]]));
  if (previous.length && FILES.every(name => previous.at(-1).files[name] === snapshot[name])) return previous;
  return [...previous, {id:crypto.randomUUID(),createdAt:date,files:snapshot}].slice(-SOURCE_HISTORY_LIMIT);
}
