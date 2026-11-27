import {Resvg} from '@resvg/resvg-js';
import {validateTimeline,frameSVG} from './animation.mjs';
function crc32(b){let c=0xffffffff;for(const x of b){c^=x;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type),b=Buffer.alloc(data.length+12);b.writeUInt32BE(data.length);t.copy(b,4);data.copy(b,8);b.writeUInt32BE(crc32(b.subarray(4,b.length-4)),b.length-4);return b;}
function pngParts(p){const parts=[];for(let i=8;i<p.length;){const n=p.readUInt32BE(i),type=p.toString('ascii',i+4,i+8);if(i+n+12>p.length)throw Error('Invalid PNG');parts.push({type,data:p.subarray(i+8,i+8+n)});i+=n+12;}return parts;}
export function animatedPNG(doc,timeline,{fps=12,width=512,loop=true}={}){
 validateTimeline(doc,timeline);if(!Number.isInteger(fps)||fps<1||fps>30||!Number.isInteger(width)||width<32||width>1024||typeof loop!=='boolean')throw RangeError('Invalid APNG options');
 const count=Math.max(2,Math.ceil(timeline.duration*fps)),height=Math.ceil(doc.height/doc.width*width);if(count>120||height>1024||count*width*height>32000000)throw RangeError('APNG pixel budget');
 const out=[Buffer.from([137,80,78,71,13,10,26,10])];let seq=0,header,total=8;
 const add=(type,data)=>{const b=chunk(type,data);total+=b.length;if(total>16000000)throw RangeError('APNG byte budget');out.push(b);};
 for(let i=0;i<count;i++){
 const p=pngParts(Buffer.from(new Resvg(frameSVG(doc,timeline,timeline.duration*i/(count-1)),{fitTo:{mode:'width',value:width}}).render().asPng()));
 const h=p.find(x=>x.type==='IHDR').data;
 if(i===0){header=h;add('IHDR',h);const a=Buffer.alloc(8);a.writeUInt32BE(count);a.writeUInt32BE(loop?0:1,4);add('acTL',a);}else if(!h.equals(header))throw Error('Inconsistent PNG frame');
 const f=Buffer.alloc(26);f.writeUInt32BE(seq++);h.copy(f,4,0,8);f.writeUInt16BE(Math.max(1,Math.round(timeline.duration*1000/count)),20);f.writeUInt16BE(1000,22);add('fcTL',f);
 for(const {data} of p.filter(x=>x.type==='IDAT')){if(i===0)add('IDAT',data);else{const n=Buffer.alloc(4);n.writeUInt32BE(seq++);add('fdAT',Buffer.concat([n,data]));}}
 }add('IEND',Buffer.alloc(0));return Buffer.concat(out);
}
