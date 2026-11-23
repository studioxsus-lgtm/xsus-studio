import {reservationFiles} from './reservation-preview.js';
import {createProjectArchitecture} from "../../../src/xsus-app-build-engine/architecture/project-architect.js";
import {generateStaticApp} from "../../../src/xsus-app-build-engine/generator/code-generator.js";
import {validateBuildManifest} from "../../../src/xsus-app-build-engine/build/build-manifest.js";
const SAFE=/^[a-z][a-z0-9-]{1,47}$/;
const escapeSlug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,45);
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const categories=[
 {match:/task|todo|project|detyr|projekt|kanban/i,type:"tasks",heading:"Task Manager",description:"Organize projects and track your team's work.",fields:["Task name","Project","Due date"]},
 {match:/book|appoint|reserv|takim|rezerv/i,type:"booking",heading:"Booking Manager",description:"Manage appointments and customer reservations.",fields:["Customer name","Service","Date"]},
 {match:/shop|store|commerce|product|dyqan|produkt/i,type:"store",heading:"Store Manager",description:"Organize products and inventory.",fields:["Product name","Category","Price"]},
 {match:/expense|budget|finance|shpenz|buxhet/i,type:"budget",heading:"Budget Tracker",description:"Track expenses and budgets.",fields:["Description","Category","Amount"]}
];
function makeGoalFiles(name){
 const brief=/^\[XSUS (booking|store|budget|tasks)( search)?\](?:\s|$)/.exec(name);
 const planned=brief && categories.find(category=>category.type===brief[1]);
 const category=planned||categories.find(c=>c.match.test(name))||{type:"general",heading:"My Application",description:"Create and manage your records.",fields:["Name","Category","Details"]};
 const title=escapeHtml(category.heading),description=escapeHtml(category.description);
 const inputs=category.fields.map((field,i)=>'<label>'+escapeHtml(field)+'<input name="field'+i+'" '+(i===0?'required ':'')+'maxlength="120" placeholder="'+escapeHtml(field)+'"></label>').join("");
 const search=brief?.[2] ? '<label>Search records<input id="record-search" type="search"></label>' : '';
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><link rel="stylesheet" href="./styles.css"></head><body><main><header><span class="brand">XSUS APP</span><h1>'+title+'</h1><p>'+description+'</p></header><section class="stats"><article><strong id="total">0</strong><span>Total records</span></article><article><strong id="latest">—</strong><span>Latest record</span></article></section><section class="panel"><h2>Add new</h2><form id="entry-form">'+inputs+'<button type="submit">Add record</button></form></section><section class="panel"><h2>Records</h2>'+search+'<ul id="records" aria-live="polite"></ul><p id="empty">No records yet. Add your first one above.</p></section></main><script src="./main.js"></script></body></html>';
 const css=':root{font-family:system-ui,sans-serif;color:#17233b;background:#f1f5fb}*{box-sizing:border-box}body{margin:0}main{max-width:1000px;margin:0 auto;padding:24px}header{background:linear-gradient(120deg,#172d58,#344bc7);color:white;border-radius:20px;padding:32px}.brand{font-size:12px;letter-spacing:.2em;color:#9de7ff}h1{font-size:clamp(28px,5vw,46px);margin:16px 0 8px}p{line-height:1.5}.stats{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin:20px 0}.stats article,.panel{background:white;border:1px solid #e1e7f0;border-radius:16px;padding:22px}.stats strong{display:block;font-size:30px}.stats span{color:#62708a}form{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;align-items:end}label{display:grid;gap:7px;font-size:13px;font-weight:600}input{padding:12px;border:1px solid #cbd5e1;border-radius:9px;min-width:0}button{background:#3159cf;color:white;border:0;border-radius:9px;padding:13px;cursor:pointer}li{display:flex;justify-content:space-between;gap:10px;padding:12px;border-bottom:1px solid #e1e7f0;overflow-wrap:anywhere}li button{background:#e6ecf8;color:#253c73;padding:6px 10px}ul{padding:0;list-style:none}@media(max-width:520px){main{padding:12px}header{padding:22px}.stats{gap:8px}}';
 const js='const form=document.getElementById("entry-form"),list=document.getElementById("records"),empty=document.getElementById("empty");const search=document.getElementById("record-search");search?.addEventListener("input",render);let records=[];function render(){list.replaceChildren();records.forEach((item,index)=>{if(search && !item.join(" ").toLowerCase().includes(search.value.trim().toLowerCase()))return;const li=document.createElement("li"),span=document.createElement("span"),button=document.createElement("button");span.textContent=item.join(" · ");button.type="button";button.textContent="Remove";button.addEventListener("click",()=>{records.splice(index,1);render()});li.append(span,button);list.append(li)});document.getElementById("total").textContent=String(records.length);document.getElementById("latest").textContent=records.length?records[records.length-1][0]:"—";empty.hidden=records.length>0}form.addEventListener("submit",event=>{event.preventDefault();const values=Array.from(new FormData(form).values()).map(String);if(!values[0].trim())return;records.push(values);form.reset();render()});render();';
 return [{path:"index.html",content:html},{path:"styles.css",content:css},{path:"main.js",content:js}];
}
export function generateWorkerStaticPreview({name,appSpec}={}){
 if(typeof name!=="string"||!name.trim()||name.length>100)throw new TypeError("Invalid preview name");
 const slug=escapeSlug(name);
 const project=SAFE.test(slug)?slug:"xsus-preview";
 const architecture=createProjectArchitecture({name,slug:project,modules:[{id:"home",kind:"page"}],routes:[{id:"home",path:"/",moduleId:"home"}]});
 const baseline=validateBuildManifest(generateStaticApp(architecture));
 const files=appSpec===undefined ? makeGoalFiles(name) : reservationFiles(appSpec);
 const manifest=validateBuildManifest({...baseline,files});
 return Object.freeze({project:manifest.project,files:manifest.files.map(({path,content})=>({path,content})),kind:"static-preview",requiresReview:true});
}
