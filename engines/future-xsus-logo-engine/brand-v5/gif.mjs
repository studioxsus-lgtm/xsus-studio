import {Resvg} from '@resvg/resvg-js';
import {validateTimeline,frameSVG} from './animation.mjs';
const word=n=>Buffer.from([n&255,n>>>8&255]);
const palette=Buffer.alloc(768);
for(let i=1;i<256;i++){const k=i-1;palette[i*3]=Math.round((k>>5)*255/7);palette[i*3+1]=Math.round((k>>2&7)*255/7);palette[i*3+2]=Math.round((k&3)*255/3);}
function encode(pixels){
 // Fixed nine-bit codes, reset before the dictionary grows to ten bits.
 const bytes=[];let bits=0,acc=0;const put=n=>{acc|=n<<bits;bits+=9;while(bits>=8){bytes.push(acc&255);acc>>>=8;bits-=8;}};
 for(let i=0;i<pixels.length;i+=200){put(256);for(let j=i;j<Math.min(i+200,pixels.length);j++)put(pixels[j]);}put(257);if(bits)bytes.push(acc&255);
 const blocks=[Buffer.from([8])];for(let i=0;i<bytes.length;i+=255){const b=Buffer.from(bytes.slice(i,i+255));blocks.push(Buffer.from([b.length]),b);}blocks.push(Buffer.from([0]));return Buffer.concat(blocks);
}
export function animatedGIF(doc,timeline,{fps=10,width=256,loop=true}={}){
 validateTimeline(doc,timeline);if(!Number.isInteger(fps)||fps<1||fps>25||!Number.isInteger(width)||width<32||width>512||typeof loop!=='boolean')throw RangeError('Invalid GIF options');
 const count=Math.max(2,Math.ceil(timeline.duration*fps)),height=Math.ceil(doc.height/doc.width*width);if(count>120||height>512||count*width*height>8000000)throw RangeError('GIF pixel budget');
 const parts=[];let total=0;const add=(...bs)=>{for(const b of bs){total+=b.length;if(total>12000000)throw RangeError('GIF byte budget');parts.push(b);}};
 for(let i=0;i<count;i++){
 const r=new Resvg(frameSVG(doc,timeline,timeline.duration*i/(count-1)),{fitTo:{mode:'width',value:width}}).render();
 if(i===0){add(Buffer.from('GIF89a'),word(r.width),word(r.height),Buffer.from([0xf7,0,0]),palette);if(loop)add(Buffer.from([0x21,0xff,11]),Buffer.from('NETSCAPE2.0'),Buffer.from([3,1,0,0,0]));}
 const raw=r.pixels;if(raw.length!==r.width*r.height*4)throw Error('Invalid raster');const indices=new Uint8Array(raw.length/4);
 for(let j=0;j<indices.length;j++){const k=j*4;if(raw[k+3]<128)continue;const q=(Math.round(raw[k]*7/255)<<5)|(Math.round(raw[k+1]*7/255)<<2)|Math.round(raw[k+2]*3/255);indices[j]=Math.min(255,q+1);}
 add(Buffer.from([0x21,0xf9,4,9]),word(Math.max(1,Math.round(timeline.duration*100/count))),Buffer.from([0,0,0x2c]),word(0),word(0),word(r.width),word(r.height),Buffer.from([0]),encode(indices));
 }add(Buffer.from([0x3b]));return Buffer.concat(parts);
}
