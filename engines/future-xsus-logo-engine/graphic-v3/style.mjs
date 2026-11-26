// Per-family creative direction: proportion, slant, outline width, tracking,
// suggested wordmark, palette and default layout. Treatments change geometry.
const rules=`
minimalist .91 0 0 .13 sans-serif 243442 vertical
modern 1.10 0 0 .04 sans-serif 245ea8 horizontal
futuristic 1.13 .17 1 .15 monospace 5444cc diagonal
technological .94 .08 2 .11 monospace 15618c modular
luxury .87 0 .8 .20 serif 976d2f central
elegant .82 .08 .6 .15 serif 6e4558 vertical
classic .91 0 1 .06 serif 344665 central
vintage .98 -.08 2 .07 serif 895731 emblem
retro 1.16 -.12 2.5 .04 sans-serif b95234 diagonal
geometric 1 0 1.5 .12 sans-serif 3b589d modular
abstract 1.19 .24 0 .08 sans-serif 7850ab asymmetric
organic .91 -.10 0 .04 serif 487358 vertical
industrial 1.07 0 3 .08 monospace 4a5761 modular
artistic 1.12 -.20 1 .03 serif 9b4766 asymmetric
typographic 1.04 0 0 .02 serif 353443 typographic
monogram .85 .05 1 .14 serif 725154 central
emblem 1 0 3 .09 serif 455875 emblem
mascot 1.08 .05 4 .02 sans-serif b35123 central
line-art .95 .04 1.2 .10 sans-serif 466569 vertical
flat 1.08 0 0 .03 sans-serif 22697b horizontal
outline .97 0 2.7 .12 sans-serif 344880 vertical
gradient 1.03 .05 0 .06 sans-serif 6a44a5 diagonal
monochrome .92 0 0 .08 sans-serif 28292c vertical
bauhaus 1.12 0 2 .05 sans-serif b33524 modular
art-deco .79 0 1.8 .18 serif 876634 radial
art-nouveau .86 -.09 1.1 .08 serif 556747 circular
cyberpunk 1.2 .22 2 .16 monospace 8233a2 diagonal
sport 1.18 .25 2 .02 sans-serif a63634 horizontal
corporate 1.02 0 0 .05 sans-serif 24527a horizontal
editorial .86 0 .6 .03 serif 36323b asymmetric
dynamic 1.13 .29 0 .06 sans-serif a64135 diagonal
friendly 1.07 -.04 1 .035 sans-serif 397973 central
ecological .90 -.06 1.4 .07 serif 3d7049 vertical
premium .88 .02 .75 .17 serif 795736 emblem
experimental 1.22 -.25 2.1 .12 monospace 773893 asymmetric`.trim();
export const styles=Object.fromEntries(rules.split('\n').map(row=>{
 const [id,ratio,slant,stroke,tracking,font,ink,layout]=row.split(' ');
 return [id,{id,ratio:+ratio,slant:+slant,stroke:+stroke,tracking:+tracking,font,ink:'#'+ink,layout}];
}));
export const treatments=['compact','balanced','expansive'];
export function direction(names,treatment='balanced'){
 if(!Array.isArray(names)||names.length<1||names.length>3||names.some(s=>!Object.hasOwn(styles,s))||!treatments.includes(treatment))throw TypeError('invalid_style');
 const chosen=[...new Set(names)].map(s=>styles[s]),first=chosen[0];
 const blend=key=>chosen.reduce((n,s,i)=>n+s[key]*(i===0?2:1),0)/(chosen.length+1);
 const factor={compact:.84,balanced:1,expansive:1.16}[treatment];
 return {...first,ratio:blend('ratio')*factor,slant:blend('slant'),stroke:blend('stroke')*factor,tracking:blend('tracking')*factor,
  monochrome:names.includes('monochrome'),hollow:names.includes('outline')||names.includes('line-art'),factor};
}
const aliases=`minimaliste minimalist minimaliste|minimalist
modern moderne moderne|modern
futurist futuriste futuristik|futuristic
teknologjik technologique tech|technological
luksoz luksoze luxe luxueux|luxury
elegant élégante|elegant
klasik classique|classic
organik organique|organic
gjeometrik géométrique|geometric
abstrakt abstrait|abstract
industrial industriel|industrial
artistik artistique|artistic
tipografik typographique|typographic
monogramme monogramë|monogram
emblemë emblème|emblem
maskotë mascotte|mascot
monokrom monochromatique|monochrome
sportiv sportif sportive|sport
korporativ entreprise|corporate
editorial éditorial|editorial
dinamik dynamique|dynamic
miqësor amical|friendly
ekologjik écologique|ecological
eksperimental expérimental|experimental`;
const normalize=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[-_]/g,' ');
export function detectStyles(text){
 const positive=normalize(text).replace(/\b(?:without|avoid|no|sans|pa|shmang)\s+[^.,;]+/g,'');
 const tokens=Object.entries(styles).map(([id])=>[normalize(id),id]);
 for(const row of aliases.split('\n')){const [words,id]=row.split('|');for(const word of words.split(' '))tokens.push([normalize(word),id])}
 const hits=tokens.map(([word,id])=>({id,index:(' '+positive+' ').search(new RegExp('\\b'+word+'\\b'))})).filter(v=>v.index>=0).sort((a,b)=>a.index-b.index);
 return [...new Set(hits.map(v=>v.id))].slice(0,3);
}
