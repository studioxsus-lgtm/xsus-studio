import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Resvg} from '@resvg/resvg-js';
import {validateTimeline,frameSVG} from './animation.mjs';
export function videoOptions(doc,timeline,{format='mp4',fps=12,width=512}={}){
 validateTimeline(doc,timeline);
 if(!['mp4','webm'].includes(format)||!Number.isInteger(fps)||fps<1||fps>30||!Number.isInteger(width)||width<32||width>1024)throw RangeError('Invalid video options');
 const count=Math.max(2,Math.ceil(timeline.duration*fps)),height=Math.ceil(doc.height/doc.width*width);
 if(count>180||height>1024||count*width*height>48000000)throw RangeError('Video pixel budget');
 return {format,fps,width,count,height};
}
export function videoArgs(o,dir){
 return ['-nostdin','-hide_banner','-loglevel','error','-y','-framerate',String(o.fps),'-i',join(dir,'frame-%04d.png'),'-an','-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2:0:0:white',... (o.format==='mp4'?['-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart']:['-c:v','libvpx-vp9','-pix_fmt','yuv420p','-b:v','0','-crf','32']),'-threads','2',join(dir,'output.'+o.format)];
}
function execute(args){return new Promise((resolve,reject)=>{const p=spawn('ffmpeg',args,{shell:false,stdio:['ignore','ignore','pipe']});let err='';const timer=setTimeout(()=>{p.kill('SIGKILL');reject(Error('Video encoder timeout'));},60000);p.stderr.on('data',b=>{if(err.length<2048)err+=b.toString().slice(0,2048-err.length);});p.once('error',e=>{clearTimeout(timer);reject(Error('Video encoder unavailable: '+e.code));});p.once('close',code=>{clearTimeout(timer);if(code===0)resolve();else reject(Error('Video encoder failed: '+code+' '+err));});});}
export async function animatedVideo(doc,timeline,options){
 const o=videoOptions(doc,timeline,options),dir=await mkdtemp(join(tmpdir(),'xsus-video-'));
 try{let total=0;for(let i=0;i<o.count;i++){const png=new Resvg(frameSVG(doc,timeline,timeline.duration*i/(o.count-1)),{background:'#ffffff',fitTo:{mode:'width',value:o.width}}).render().asPng();total+=png.length;if(total>64000000)throw RangeError('Video input byte budget');await writeFile(join(dir,'frame-'+String(i).padStart(4,'0')+'.png'),png);}
 await execute(videoArgs(o,dir));const path=join(dir,'output.'+o.format),info=await stat(path);if(info.size<12||info.size>32000000)throw RangeError('Video output byte budget');const bytes=await readFile(path);if(o.format==='mp4'?bytes.toString('ascii',4,8)!=='ftyp':bytes.readUInt32BE(0)!==0x1a45dfa3)throw Error('Invalid video container');return {format:o.format,mime:o.format==='mp4'?'video/mp4':'video/webm',bytes};}finally{await rm(dir,{recursive:true,force:true});}
}
