const hex=c=>{if(typeof c!=='string'||!/^#[0-9a-f]{6}$/i.test(c))throw TypeError('Invalid color');return c.toLowerCase()};
function luminance(c){return [1,3,5].map(i=>parseInt(hex(c).slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0)}
export function contrastRatio(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
function readable(c,b){return contrastRatio(c,b)>=4.5?c:contrastRatio('#000000',b)>=contrastRatio('#ffffff',b)?'#000000':'#ffffff'}
export function createBrandTokens({primary,background='#ffffff',foreground='#111827',radius=12,spacing=16,font='system'}={}){
 primary=hex(primary);background=hex(background);foreground=hex(foreground);
 if(!Number.isInteger(radius)||radius<0||radius>32||!Number.isInteger(spacing)||spacing<4||spacing>40||!['system','serif','mono'].includes(font))throw TypeError('Invalid design tokens');
 const text=readable(foreground,background),onPrimary=readable('#ffffff',primary),link=readable(primary,background);
 const tokens={primary,background,text,onPrimary,link,radius,spacing,font};
 const corrections=[];if(text!==foreground)corrections.push('foreground');if(link!==primary)corrections.push('link');if(onPrimary!=='#ffffff')corrections.push('onPrimary');
 const css=':root{--brand-primary:'+primary+';--brand-background:'+background+';--brand-text:'+text+';--brand-on-primary:'+onPrimary+';--brand-link:'+link+';--brand-radius:'+radius+'px;--brand-spacing:'+spacing+'px;--brand-font:'+({system:'system-ui,sans-serif',serif:'Georgia,serif',mono:'monospace'}[font])+'}';
 return {tokens:Object.freeze(tokens),css,corrections,contrast:{text:contrastRatio(text,background),link:contrastRatio(link,background),button:contrastRatio(onPrimary,primary)},visualVerified:false};
}
export function exportBrandSystem(input){const brand=createBrandTokens(input);return {files:{'brand.css':brand.css,'brand.json':JSON.stringify(brand.tokens,null,2)},...brand,publicationAuthorized:false}}
