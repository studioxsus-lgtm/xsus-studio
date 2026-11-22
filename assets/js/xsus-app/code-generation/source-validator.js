// Static preflight only: never executes user code or claims full JS/CSS compilation.
const NAMES = ['index.html', 'styles.css', 'app.js'];
export function validateSourceFiles(files) {
  const issues = [];
  const add = (level, file, message) => issues.push({level,file,message});
  for (const name of NAMES) {
    if (typeof files?.[name] !== 'string') add('error',name,'Required source file is missing.');
    else if (files[name].length > 500000) add('error',name,'File exceeds 500,000 characters.');
    else if (!files[name].trim()) add('error',name,'File is empty.');
  }
  if (issues.some(item => item.level === 'error')) return {ok:false,issues};
  const html = files['index.html'];
  const css = files['styles.css'];
  const js = files['app.js'];
  if (!/<html(?:\s|>)/i.test(html) || !/<head(?:\s|>)/i.test(html) || !/<body(?:\s|>)/i.test(html))
    add('error','index.html','Missing html, head, or body element.');
  if (!/<\/head\s*>/i.test(html) || !/<\/body\s*>/i.test(html) || !/<\/html\s*>/i.test(html))
    add('error','index.html','Missing closing document element.');
  if (!/name\s*=\s*["']viewport["']/i.test(html)) add('warning','index.html','Viewport meta tag not found.');
  if (!/href\s*=\s*["']styles\.css["']/i.test(html)) add('warning','index.html','Expected styles.css link not found.');
  if (!/src\s*=\s*["']app\.js["']/i.test(html)) add('warning','index.html','Expected app.js script tag not found.');
  if (/<script\b[^>]*>\s*[^\s<]/i.test(html)) add('warning','index.html','Inline scripts may be blocked by the exported Content Security Policy.');
  if ((css.match(/\{/g)||[]).length !== (css.match(/\}/g)||[]).length)
    add('warning','styles.css','CSS braces appear unbalanced; check syntax manually.');
  if (/(?:^|\n)\s*(?:import|export)\s/m.test(js))
    add('warning','app.js','ES module syntax may require a module script tag.');
  add('info','app.js','JavaScript syntax and runtime behavior are not verified by this static check.');
  return {ok:!issues.some(item => item.level === 'error'),issues};
}
