export const layouts=['horizontal','vertical','central','asymmetric','radial','diagonal','modular','circular','typographic','emblem','symbol','text','slogan','hierarchy'];
// Safe boxes, expressed in fractions of the artboard, contain both lockup elements.
const slots={
 horizontal:[.235,.50,.34,.70,.70,.54,.49],vertical:[.50,.38,.64,.54,.5,.79,.86],
 central:[.50,.43,.48,.48,.5,.76,.76],asymmetric:[.30,.32,.47,.46,.62,.78,.65],
 radial:[.5,.42,.47,.50,.5,.79,.70],diagonal:[.31,.30,.46,.46,.65,.74,.56],
 modular:[.245,.5,.34,.57,.70,.57,.48],circular:[.50,.42,.52,.49,.5,.80,.73],
 typographic:[.5,.27,.24,.31,.5,.68,.90],emblem:[.50,.38,.49,.46,.5,.73,.69],
 symbol:[.50,.50,.79,.79,.5,.85,.80],text:[.5,.25,.1,.1,.5,.54,.89],
 slogan:[.50,.32,.50,.44,.5,.70,.84],hierarchy:[.28,.32,.39,.43,.52,.70,.82]};
export function composition(layout,width,height,brand){
 if(!layouts.includes(layout)||![width,height].every(n=>Number.isInteger(n)&&n>=32&&n<=4096))throw RangeError('invalid_artboard');
 const [cx,cy,w,h,tx,ty,room]=slots[layout];
 return {cx:cx*width,cy:cy*height,w:w*width,h:h*height,x:tx*width,y:ty*height,room:room*width,
 size:Math.min(height*.115,room*width/Math.max(1,Array.from(brand).length)),sloganY:Math.min(.93,ty+.13)*height};
}
