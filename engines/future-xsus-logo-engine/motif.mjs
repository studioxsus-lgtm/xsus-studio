// Coordinates use a 512-unit design grid. Each component is independently editable.
export function readMotif(prompt, name) {
  const brief = prompt.normalize('NFC');
  const letter = brief.match(/(?:\b(?:letter|lettre|initial|monogram|shkronj[ëe](?:n|s)?)\s+)[“"'«]?([\p{L}])(?=[”"'»\s.,;:!?)]|$)/iu)?.[1];
  const network = /neural|neuronal|nervor|neuron|\bnetwork\b|\brrjet|réseau/iu.test(brief);
  const circuit = /circuit|\bqark|\bqarqe/iu.test(brief);
  if (!letter && !network && !circuit && !/monogram/iu.test(brief)) return null;
  const initial = letter || name.match(/[\p{L}\p{N}]/u)?.[0];
  return initial ? {initial:initial.toUpperCase(), network, circuit} : null;
}

export function motifVariants({initial, network, circuit}, primary, secondary) {
  const polygon = (points, fill=primary) => ({type:'polygon', points, fill});
  const dot = ([cx,cy],r,fill) => ({type:'circle',cx,cy,r,fill});
  function line([x,y],[u,v],width) {
    const length=Math.hypot(u-x,v-y);
    const dx=(v-y)*width/(2*length), dy=(x-u)*width/(2*length);
    return polygon([[x+dx,y+dy],[u+dx,v+dy],[u-dx,v-dy],[x-dx,y-dy]]);
  }
  const glyph = (size,y,fill=primary) => ({type:'text',text:initial,x:256,y,fontSize:size,fill});
  const arms = [polygon([[124,330],[234,88],[256,88],[256,138],[165,330]]),
                polygon([[256,88],[278,88],[388,330],[347,330],[256,138]])];
  const bar = polygon([[193,238],[319,238],[332,266],[180,266]]);
  const letter = () => initial==='A' ? [...arms,bar] : [glyph(270,326)];
  function connections(points,edges) {
    return [...edges.map(([a,b])=>line(points[a],points[b],8)),
            ...points.flatMap(p=>[dot(p,13,primary),dot(p,6,secondary)])];
  }
  const crest = [[256,56],[94,345],[418,345]];
  // The inner contour winds opposite to the outer triangle, leaving an A-shaped aperture.
  const aperture = {type:'path',fill:primary,commands:[
    ['M',256,56],['L',418,345],['L',94,345],['Z'],
    ['M',160,316],['L',194,316],['L',214,275],['L',298,275],
    ['L',318,316],['L',352,316],['L',256,119],['Z'],
    ['M',256,184],['L',283,244],['L',229,244],['Z']
  ]};
  const nodeMark = letter();
  if(network) nodeMark.push(...connections([[256,110],[183,250],[326,250],[260,202],[312,168]],[[0,3],[1,3],[2,3],[3,4],[4,2]]));
  if(circuit && !network) nodeMark.push(...connections([[165,282],[123,282],[95,253]],[[0,1],[1,2]]));
  const crestMark = initial==='A' ? [aperture] : [polygon(crest),glyph(150,305,secondary)];
  if(network || circuit) crestMark.push(...connections(crest,[[0,1],[1,2],[2,0]]));
  const traceMark = letter();
  const trace = [[318,254],[365,254],[390,229],[420,229],[161,290],[113,290],[92,311]];
  if(circuit) traceMark.push(...connections(trace,[[0,1],[1,2],[2,3],[4,5],[5,6]]));
  else if(network) traceMark.push(...connections([[145,307],[109,228],[168,184],[202,232]],[[0,1],[1,2],[2,3],[0,3],[1,3]]));
  else traceMark.push(line([142,354],[370,354],12));
  return [['monogram',nodeMark],['triangular-monogram',crestMark],['linear-monogram',traceMark]].map(
    ([symbol,layers])=>({symbol,document:{version:'1.0.0',width:512,height:512,layers}})
  );
}
