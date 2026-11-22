import {validateBuildManifest} from "../build/build-manifest.js";
export const PREVIEW_DOCUMENT_VERSION="0.1.0";
const escapeAttr=value=>String(value).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
export function createPreviewDocument(input){
  const manifest=validateBuildManifest(input);
  const files=new Map(manifest.files.map(file=>[file.path,file.content]));
  const html=files.get("index.html");
  const styles=files.get("styles.css")??"";
  const script=files.get("main.js")??"";
  // This is a display-only preview. Never execute project JavaScript in the host document.
  const safeHtml=html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,"").replace(/<script\b[^>]*\/\s*>/gi,"");
  const csp="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; form-action 'none'; base-uri 'none'; frame-ancestors 'none'";
  const stylesheet=styles.replace(/<\/style/gi,"<\\/style");
  const document=`<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${escapeAttr(csp)}"><style>${stylesheet}</style></head><body><div id="xsus-preview-root">${safeHtml}</div></body></html>`;
  return Object.freeze({version:PREVIEW_DOCUMENT_VERSION,project:manifest.project,html:document,scriptIncluded:false,requiresSandbox:true,previewMode:"static"});
}
