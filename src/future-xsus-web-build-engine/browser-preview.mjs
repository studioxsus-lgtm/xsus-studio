export function createBrowserPreview({document,container,files}={}){
 if(!document||!container||!files||typeof files!=='object')throw TypeError('Invalid preview configuration');
 const pages=Object.keys(files).filter(p=>/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.html$/.test(p)).sort();
 if(!pages.includes('index.html')||pages.length>100)throw TypeError('Invalid preview pages');
 const widths={desktop:1280,tablet:768,mobile:390};
 const frame=document.createElement('iframe');
 frame.setAttribute('sandbox','');frame.setAttribute('referrerpolicy','no-referrer');frame.setAttribute('title','Website preview');
 frame.style.maxWidth='100%';frame.style.height='720px';frame.style.border='0';
 let page='index.html',device='desktop',disposed=false;
 function render(){
 if(disposed)throw Error('Preview disposed');
 const html=files[page];if(typeof html!=='string'||html.length>250000)throw TypeError('Invalid page source');
 const parser=new document.defaultView.DOMParser();
 const parsed=parser.parseFromString(html,'text/html');
 for(const node of parsed.querySelectorAll('script,iframe,frame,object,embed,base,meta,link,form'))node.remove();
 for(const node of parsed.querySelectorAll('*'))for(const attr of Array.from(node.attributes))if(/^on/i.test(attr.name)||['src','srcset','href','action','formaction','ping','background','poster','srcdoc'].includes(attr.name.toLowerCase()))node.removeAttribute(attr.name);
 const css=Object.entries(files).filter(([p,v])=>p.endsWith('.css')&&typeof v==='string').map(([,v])=>v).join('\n');
 if(css.length>1000000)throw TypeError('Preview CSS too large');
 const policy=parsed.createElement('meta');policy.httpEquiv='Content-Security-Policy';policy.content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'";parsed.head.prepend(policy);
 const style=parsed.createElement('style');style.textContent=css.replace(/<\/style/gi,'');parsed.head.append(style);
 frame.style.width=widths[device]+'px';frame.srcdoc='<!doctype html>'+parsed.documentElement.outerHTML;
 return {page,device,width:widths[device],pages:[...pages],interactive:false};
 }
 const initial=render();container.append(frame);
 return Object.freeze({initial,select(path){if(!pages.includes(path))throw TypeError('Unknown page');page=path;return render()},resize(value){if(!Object.hasOwn(widths,value))throw TypeError('Unknown device');device=value;return render()},dispose(){disposed=true;frame.remove()}});
}
