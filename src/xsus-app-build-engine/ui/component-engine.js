export const UI_ENGINE_VERSION="0.1.0";
const TYPES=new Set(["heading","paragraph","button","input","card","stack"]);
const ID=/^[a-z][a-zA-Z0-9_-]{0,63}$/;
function escapeHtml(value){return String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function validate(node,depth,seen){
  if(depth>12)throw new RangeError("UI nesting too deep");
  if(!node||typeof node!=="object"||Array.isArray(node)||!TYPES.has(node.type)||typeof node.id!=="string"||!ID.test(node.id)||seen.has(node.id))throw new TypeError("Invalid or duplicate UI component");
  seen.add(node.id);
  const text=node.text??"";
  if(typeof text!=="string"||text.length>4000)throw new TypeError("Invalid UI text");
  const children=node.children??[];
  if(!Array.isArray(children)||children.length>100)throw new TypeError("Invalid UI children");
  if(!["card","stack"].includes(node.type)&&children.length)throw new TypeError("Leaf UI components cannot have children");
  if(node.type==="input"&&node.inputType!==undefined&&!["text","email","number","password"].includes(node.inputType))throw new TypeError("Unsupported input type");
  return Object.freeze({id:node.id,type:node.type,text, inputType:node.type==="input"?(node.inputType??"text"):null,children:Object.freeze(children.map(child=>validate(child,depth+1,seen)))});
}
export function validateComponentTree(root){
  const seen=new Set();const tree=validate(root,0,seen);
  if(seen.size>500)throw new RangeError("Too many UI components");
  return tree;
}
function render(node){
  const text=escapeHtml(node.text);
  const id=escapeHtml(node.id);
  const children=node.children.map(render).join("");
  switch(node.type){
    case "heading":return `<h2 id="${id}">${text}</h2>`;
    case "paragraph":return `<p id="${id}">${text}</p>`;
    case "button":return `<button id="${id}" type="button">${text}</button>`;
    case "input":return `<label for="${id}">${text}</label><input id="${id}" type="${node.inputType}" />`;
    case "card":return `<section id="${id}" class="xsus-card">${children}</section>`;
    case "stack":return `<div id="${id}" class="xsus-stack">${children}</div>`;
    default:throw new TypeError("Unsupported UI component");
  }
}
export function renderComponentTree(root){
  return Object.freeze({version:UI_ENGINE_VERSION,html:render(validateComponentTree(root)),css:".xsus-card{padding:1rem;border:1px solid #888;border-radius:.75rem}.xsus-stack{display:flex;flex-direction:column;gap:1rem}input,button{max-width:100%;font:inherit}"});
}
