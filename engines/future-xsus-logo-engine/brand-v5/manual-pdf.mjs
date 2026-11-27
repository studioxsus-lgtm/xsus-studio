import {deflateSync} from 'node:zlib';
import {Resvg} from '@resvg/resvg-js';
import {brandManual} from './materials.mjs';
import {renderEditor} from '../editor.mjs';
const labels={en:['Original','Black','White','Clear space recommendation','Minimum size requires visual proof','CMYK approximate; no print profile','Recommended typography'],fr:['Original','Noir','Blanc','Espace de protection recommande','Taille minimale a verifier','CMJN approximatif; sans profil','Typographie recommandee'],sq:['Origjinale','E zeze','E bardhe','Hapesira e rekomanduar','Madhesia minimale kerkon verifikim','CMYK i perafert; pa profil','Tipografia e rekomanduar']};
const literal=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e]/g,'?').replace(/[\\()]/g,c=>'\\'+c);
export function brandGuidelinesPDF(doc,options){
 const m=brandManual(doc,options),g=m.identity.guidelines,l=labels[m.language],objects=[null,null,null,Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')],pages=[];
 const add=x=>{objects.push(Buffer.isBuffer(x)?x:Buffer.from(x));return objects.length;};
 const stream=(dict,b)=>Buffer.concat([Buffer.from('<< '+dict+' /Length '+b.length+' >>\nstream\n'),b,Buffer.from('\nendstream')]);
 function page(lines,images=[]){let commands='0.09 0.13 0.20 rg\n';for(const [x,y,size,t] of lines)commands+='BT /F1 '+size+' Tf '+x+' '+y+' Td ('+literal(t)+') Tj ET\n';const refs=[];
 for(const [i,v] of images.entries()){const bg=v.kind==='white'?'#222222':'#ffffff',scale=Math.min(480/doc.width,120/doc.height);const r=new Resvg(renderEditor(v.document),{background:bg,fitTo:{mode:'width',value:Math.max(1,Math.floor(doc.width*scale))}}).render();const rgb=Buffer.alloc(r.width*r.height*3);for(let j=0;j<r.width*r.height;j++){rgb[j*3]=r.pixels[j*4];rgb[j*3+1]=r.pixels[j*4+1];rgb[j*3+2]=r.pixels[j*4+2];}const id=add(stream('/Type /XObject /Subtype /Image /Width '+r.width+' /Height '+r.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode',deflateSync(rgb)));refs.push('/Im'+i+' '+id+' 0 R');commands+='q '+r.width+' 0 0 '+r.height+' 56 '+(590-i*185)+' cm /Im'+i+' Do Q\n';}
 const c=add(stream('',Buffer.from(commands)));pages.push(add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> /XObject << '+refs.join(' ')+' >> >> /Contents '+c+' 0 R >>'));}
 page([[48,790,24,m.name],[48,750,18,m.sections[0]],...l.slice(0,3).map((t,i)=>[56,720-i*185,12,t])],m.identity.variants);
 const colors=g.colors;for(let i=0;i<Math.max(1,colors.length);i+=24){page([[48,790,20,m.sections[1]],...colors.slice(i,i+24).map((c,j)=>[48,750-j*26,11,c.hex+'   RGB '+c.rgb.join('/')+'   HSL '+c.hsl.join('/')+'   CMYK '+c.cmykApprox.join('/')]),[48,80,10,l[5]]]);}
 page([[48,790,20,m.sections[2]],[48,750,14,l[6]+': '+m.typography.family],[48,690,20,m.sections[3]],[48,650,12,l[3]+': '+g.usage.clearSpaceRecommendation],[48,620,12,l[4]]]);
 objects[1]=Buffer.from('<< /Type /Catalog /Pages 2 0 R >>');objects[2]=Buffer.from('<< /Type /Pages /Count '+pages.length+' /Kids ['+pages.map(p=>p+' 0 R').join(' ')+'] >>');
 const parts=[Buffer.from('%PDF-1.4\n')],offsets=[0];let pos=parts[0].length;for(let i=1;i<objects.length;i++){offsets.push(pos);const b=Buffer.concat([Buffer.from(i+' 0 obj\n'),objects[i],Buffer.from('\nendobj\n')]);parts.push(b);pos+=b.length;if(pos>16000000)throw RangeError('PDF budget');}parts.push(Buffer.from('xref\n0 '+objects.length+'\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+objects.length+' /Root 1 0 R >>\nstartxref\n'+pos+'\n%%EOF\n'));return Buffer.concat(parts);
}
