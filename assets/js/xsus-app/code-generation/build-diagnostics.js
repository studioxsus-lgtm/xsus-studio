import { validateSourceFiles } from './source-validator.js';

export function inspectBuildReadiness(files) {
  const validation = validateSourceFiles(files);
  const html = typeof files?.['index.html'] === 'string' ? files['index.html'] : '';
  const css = typeof files?.['styles.css'] === 'string' ? files['styles.css'] : '';
  const js = typeof files?.['app.js'] === 'string' ? files['app.js'] : '';
  const checks = [
    {id:'source',label:'Required source files and document structure',passed:validation.ok,blocking:true},
    {id:'viewport',label:'Responsive viewport declaration',passed:/<meta\b[^>]*name\s*=\s*["']viewport["']/i.test(html),blocking:false},
    {id:'title',label:'Page title',passed:/<title\b[^>]*>\s*[^<\s][\s\S]*?<\/title>/i.test(html),blocking:false},
    {id:'stylesheet',label:'Local stylesheet reference',passed:/<link\b[^>]*href\s*=\s*["']styles\.css["']/i.test(html),blocking:false},
    {id:'script',label:'Local application script reference',passed:/<script\b[^>]*src\s*=\s*["']app\.js["']/i.test(html),blocking:false},
    {id:'content',label:'Non-empty source files',passed:[html,css,js].every(s=>s.trim().length>0),blocking:true}
  ];
  const failed = checks.filter(check=>!check.passed);
  return {
    status:validation.ok && !failed.length ? 'preflight-ready' : validation.ok ? 'review-recommended' : 'blocked',
    canBuild:validation.ok,
    checks,
    issues:validation.issues,
    limitations:['Static checks only; no JavaScript execution or compilation','No security audit, accessibility audit, or production deployment verification']
  };
}
