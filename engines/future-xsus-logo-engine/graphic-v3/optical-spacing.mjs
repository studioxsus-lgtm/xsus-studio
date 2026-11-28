// Conservative bounding-box spacing, in em units, after native kerning.
export function opticalSpacing(glyphs,advances,tracking){
 return glyphs.map(({g,font},i)=>{
 if(i===glyphs.length-1)return 0;
 const next=glyphs[i+1];
 if(!g.getBoundingBox||!next.g.getBoundingBox)return tracking;
 const a=g.getBoundingBox(),b=next.g.getBoundingBox();
 if(a.x2<=a.x1||b.x2<=b.x1)return tracking;
 const gap=advances[i]-a.x2/font.unitsPerEm+b.x1/next.font.unitsPerEm+tracking;
 if(!Number.isFinite(gap))return tracking;
 const correction=Math.max(-.025,Math.min(.045,(.065-gap)*.45));
 return tracking+correction;
 });
}
