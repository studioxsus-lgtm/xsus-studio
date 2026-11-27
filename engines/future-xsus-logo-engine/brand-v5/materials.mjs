import {brandIdentity,contrastRatio} from './guidelines.mjs';
import {renderEditor} from '../editor.mjs';
const labels={en:['Brand identity','Color palette','Typography','Usage rules'],fr:['Identité de marque','Palette de couleurs','Typographie','Règles d’utilisation'],sq:['Identiteti i markës','Paleta e ngjyrave','Tipografia','Rregullat e përdorimit']};
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function safeText(s,max=160){if(typeof s!=='string'||!s.trim()||s.length>max||/[\u0000-\u001f]/.test(s))throw TypeError('Invalid brand text');return s.trim()}
export function brandManual(document,{name,language='en'}={}){
 name=safeText(name);if(!Object.hasOwn(labels,language))throw TypeError('Unsupported language');
 const identity=brandIdentity(document),g=identity.guidelines;
 const family=g.fonts[0]??'sans-serif';
 return {version:'5.0.0',name,language,sections:labels[language],identity,typography:{family,roles:[{role:'heading',size:32,weight:700,lineHeight:1.2},{role:'subheading',size:22,weight:600,lineHeight:1.3},{role:'body',size:16,weight:400,lineHeight:1.5}],status:'recommended; font weight availability not verified'}};
}
export function manualHTML(document,options){
 const m=brandManual(document,options),g=m.identity.guidelines;
 const rows=g.colors.map(c=>'<tr><td>'+escape(c.hex)+'</td><td>'+c.rgb.join(', ')+'</td><td>'+c.hsl.join(', ')+'</td><td>'+c.cmykApprox.join(', ')+'</td></tr>').join('');
 const variants=m.identity.variants.map((v,i)=>'<figure style="background:'+(v.kind==='white'?'#222222':'#ffffff')+'"><figcaption>'+escape(v.kind)+'</figcaption>'+renderEditor(v.document).replace(/\bid="art-/g,'id="variant'+i+'-').replace(/url\(#art-/g,'url(#variant'+i+'-')+'</figure>').join('');
 return '<!doctype html><html lang="'+m.language+'"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>'+escape(m.name)+'</title><style>body{font:16px sans-serif;max-width:960px;margin:40px auto;padding:24px;color:#172033}svg{max-width:100%;height:auto;max-height:240px}figure{padding:20px;border:1px solid #ccc}table{border-collapse:collapse}td,th{padding:10px;border:1px solid #ccc}@media print{figure{break-inside:avoid}}</style><h1>'+escape(m.name)+' — '+m.sections[0]+'</h1>'+variants+'<h2>'+m.sections[1]+'</h2><table><tr><th>HEX</th><th>RGB</th><th>HSL</th><th>CMYK approx.</th></tr>'+rows+'</table><h2>'+m.sections[2]+'</h2><p>'+escape(m.typography.family)+'</p><h2>'+m.sections[3]+'</h2><p>Clear space recommendation: '+g.usage.clearSpaceRecommendation+' source units. Minimum size: requires visual proof.</p><p>'+escape(g.limitations.join('; '))+'</p></html>';
}
export const materialFormats=Object.freeze({businessCard:[900,500],letterhead:[840,1188],envelope:[880,440],socialSquare:[1080,1080],socialBanner:[1500,500],poster:[840,1188],idCard:[540,860],presentation:[1600,900]});
export function brandMaterial(document,{kind,name,subtitle}={}){
 renderEditor(document);name=safeText(name);if(subtitle!==undefined)subtitle=safeText(subtitle);
 if(!Object.hasOwn(materialFormats,kind))throw TypeError('Unsupported material');
 const [width,height]=materialFormats[kind],g=brandIdentity(document).guidelines;
 const accent=g.colors[0]?.hex??'#172033',bg='#ffffff',ink=contrastRatio(accent,bg)>=4.5?accent:'#172033';
 const scale=Math.min(width*.65/document.width,height*.48/document.height),dx=(width-document.width*scale)/2,dy=height*.08;
 const layers=document.layers.map((l,i)=>{const a=structuredClone(l),[x,y,z,w,e,f]=a.matrix??[1,0,0,1,0,0];return {...a,id:'logo-'+i,...(a.group?{group:'logo-'+a.group.slice(0,60)}:{}),matrix:[x*scale,y*scale,z*scale,w*scale,e*scale+dx,f*scale+dy]}});
 const rect=(id,x,y,w,h,fill)=>({id,type:'polygon',fill,points:[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]});
 const text=(id,value,y,size)=>({id,type:'text',text:value,x:width/2,y,fontSize:size,fontFamily:'sans-serif',fill:ink});
 const out={version:'1.0.0',graphic:{version:'3.0.0'},width,height,layers:[rect('background',0,0,width,height,bg),rect('accent',0,height*.96,width,height*.04,accent),...layers,text('material-name',name,height*.72,Math.min(width*.065,height*.08, width/(name.length*.8))),...(subtitle?[text('material-subtitle',subtitle,height*.84,Math.min(width*.035,height*.045,width/(subtitle.length*.8)))]:[])]};
 renderEditor(out);return out;
}
