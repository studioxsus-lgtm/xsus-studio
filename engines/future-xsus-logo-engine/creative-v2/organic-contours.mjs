// Sample a closed parametric silhouette in artboard coordinates.
export function petal(radius,width,angle=0){
 const points=Array.from({length:48},(_,i)=>{const t=2*Math.PI*i/48,x=width*Math.sin(t)*(0.75+0.25*Math.cos(t)),y=-radius*(0.55+0.45*Math.cos(t));return [x*Math.cos(angle)-y*Math.sin(angle),x*Math.sin(angle)+y*Math.cos(angle)];});
 return points;
}
export function oval(rx,ry,cx=0,cy=0){
 return Array.from({length:48},(_,i)=>{const t=2*Math.PI*i/48;return [cx+rx*Math.cos(t),cy+ry*Math.sin(t)];});
}
