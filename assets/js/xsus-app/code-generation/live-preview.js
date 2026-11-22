// Sandboxed preview of reviewed source files. Never grants same-origin access.
export function composeSourcePreview(files) {
  if (!files || !['index.html','styles.css','app.js'].every(name => typeof files[name] === 'string')) {
    throw new TypeError('A complete source bundle is required.');
  }
  const html = files['index.html'];
  if (!/<\/head>/i.test(html) || !/<\/body>/i.test(html)) {
    throw new TypeError('Invalid source HTML.');
  }
  // Keep the preview fully self-contained; no remote resources or parent access.
  const style = files['styles.css'].replace(/<\/style/gi, '<\\/style');
  const script = files['app.js'].replace(/<\/script/gi, '<\\/script');
  return html
    .replace(/<meta\s+http-equiv="Content-Security-Policy"[^>]*>/i, '')
    .replace(/<link\s+rel="stylesheet"\s+href="styles\.css"\s*\/?\s*>/i, '')
    .replace(/<script\s+src="app\.js"\s+defer\s*><\/script>/i, '')
    .replace(/<\/head>/i, '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; script-src \'unsafe-inline\'; img-src data:; base-uri \'none\'; form-action \'none\'; connect-src \'none\'"><style>' + style + '</style></head>')
    .replace(/<\/body>/i, '<script>' + script + '</script></body>');
}
