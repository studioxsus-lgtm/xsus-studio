import {renderVector} from './vector-canvas.mjs?v=graphic3';
export async function exportLogo(document,{format='svg',scale=1,quality=.92,background='#ffffff',dom=globalThis.document}={}){
 const svg=renderVector(document,dom);
 if(format==='svg-text'){const {editableType}=await import('./graphic-v3/font-assets.mjs');await editableType(svg,document)}
 const source=new XMLSerializer().serializeToString(svg);
 const vector=new Blob([source],{type:'image/svg+xml'});
 if(format==='svg'||format==='svg-text')return vector;
 if(format==='zip'){const {zipBrand}=await import('./graphic-v3/zip.mjs');const enc=new TextEncoder();return new Blob([zipBrand([{name:'artwork.svg',bytes:enc.encode(source)},{name:'editable.json',bytes:enc.encode(JSON.stringify(document))}])],{type:'application/zip'})}
 if(format==='pdf'){
  if(document.layers.some(l=>l.strokeAlignment&&l.strokeAlignment!=='center'))throw Error('pdf_stroke_alignment_requires_svg');
  if(document.layers.some(l=>l.gradient?.stops.some(s=>(s.opacity??1)!==1)))throw Error('pdf_gradient_opacity_requires_svg');
  const {pdf}=await import('./graphic-v3/pdf-tools.mjs');
  const host=dom.createElement('div');host.style.cssText='position:fixed;left:-20000px;top:0';host.append(svg);dom.body.append(host);
  try{return await pdf(svg,document.width,document.height)}finally{host.remove()}
 }
 if(format==='json')return new Blob([JSON.stringify(document,null,2)],{type:'application/json'});
 const mime={png:'image/png',jpeg:'image/jpeg',webp:'image/webp'}[format];
 if(!mime||!['png','jpeg','webp'].includes(format))throw Error('unsupported_format');
 if(!Number.isFinite(scale)||scale<=0||scale>4||!Number.isFinite(quality)||quality<0||quality>1||!/^#[0-9a-f]{6}$/i.test(background))throw Error('invalid_export_options');
 const width=Math.round(document.width*scale),height=Math.round(document.height*scale);
 if(width<1||height<1||width>8192||height>8192||width*height>16000000)throw Error('export_size_limit');
 const canvas=dom.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('canvas_unavailable');
 const url=URL.createObjectURL(vector);
 try{
 const image=new Image();
 await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('image_decode_failed'));image.src=url});
 if(format==='jpeg'){ctx.fillStyle=background;ctx.fillRect(0,0,width,height)}
 ctx.drawImage(image,0,0,width,height);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,mime,quality));
 if(!blob||blob.type!==mime)throw Error('format_unavailable');
 return blob;
 }finally{URL.revokeObjectURL(url);canvas.width=0;canvas.height=0}
}
export async function downloadLogo(document,{name='logo',format='svg',...options}={}){
 const blob=await exportLogo(document,{format,...options});
 const safe=String(name).normalize('NFKC').replace(/[^\p{L}\p{N}_-]+/gu,'-').slice(0,80)||'logo';
 const url=URL.createObjectURL(blob),a=globalThis.document.createElement('a');
 try{a.href=url;a.download=safe+'.'+(format==='jpeg'?'jpg':format==='svg-text'?'svg':format);globalThis.document.body.append(a);a.click()}
 finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
}
